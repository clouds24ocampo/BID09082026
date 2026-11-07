import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Tenant } from '../types';
import { SyncEngine, emptyState, type StateStore, type SyncState } from './engine';
import { BrowserLocal } from './localAdapter';
import { installStorageTracker, onStorageWrite, onVaultEvent, rawStorage } from './hooks';
import {
  SupabaseRemote, getClient, getSyncConfig, saveSyncConfig, validateConfig, type SyncConfig,
} from './supabaseRemote';

export type SyncStatus = 'unconfigured' | 'signed-out' | 'offline' | 'syncing' | 'synced' | 'pending' | 'error';
type Result = { success: boolean; error?: string };

export interface SyncContextValue {
  configured: boolean;
  linked: boolean;
  email?: string;
  status: SyncStatus;
  pending: number;
  lastSyncAt?: number;
  error?: string;
  tooLarge: number;
  /** Remote changes were applied to local storage; reload to show them. */
  needsReload: boolean;
  saveConfig: (cfg: SyncConfig | null) => string | null;
  connect: (email: string, password: string, mode: 'signin' | 'signup') => Promise<Result>;
  restoreFromCloud: (email: string, password: string) => Promise<Result>;
  disconnect: () => Promise<void>;
  syncNow: () => Promise<void>;
  deleteCloudCopy: () => Promise<Result>;
  reload: () => void;
}

/** Used when no provider is mounted (tests, isolated screens): sync reads as "not set up" and does nothing. */
const DISABLED: SyncContextValue = {
  configured: false,
  linked: false,
  status: 'unconfigured',
  pending: 0,
  tooLarge: 0,
  needsReload: false,
  saveConfig: () => 'Online sync is not available here.',
  connect: async () => ({ success: false, error: 'Online sync is not available here.' }),
  restoreFromCloud: async () => ({ success: false, error: 'Online sync is not available here.' }),
  disconnect: async () => undefined,
  syncNow: async () => undefined,
  deleteCloudCopy: async () => ({ success: false, error: 'Online sync is not available here.' }),
  reload: () => undefined,
};

const Ctx = createContext<SyncContextValue>(DISABLED);

const linkKey = (tenantId: string) => `bidocs_sync_link_${tenantId}`;
const stateKey = (tenantId: string) => `bidocs_sync_state_${tenantId}`;
const SYNC_INTERVAL_MS = 60_000;
const DEBOUNCE_MS = 2_500;
const MAX_BACKOFF_MS = 10 * 60_000;

installStorageTracker();

const readLink = (tenantId: string): { email: string } | null => {
  try {
    const v = JSON.parse(localStorage.getItem(linkKey(tenantId)) || 'null');
    return v?.email ? v : null;
  } catch {
    return null;
  }
};

const stateStore = (tenantId: string): StateStore => ({
  load(): SyncState {
    try {
      const s = JSON.parse(localStorage.getItem(stateKey(tenantId)) || 'null');
      return s && typeof s.cursor === 'number' ? { ...emptyState(), ...s } : emptyState();
    } catch {
      return emptyState();
    }
  },
  save(s) {
    try {
      rawStorage.set(stateKey(tenantId), JSON.stringify(s));
    } catch {
      /* storage full: the queue stays in memory for this session */
    }
  },
});

const friendly = (e: unknown): string => {
  const msg = e instanceof Error ? e.message : String(e);
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(msg)) return 'No connection to the online service.';
  return msg;
};
const isAuthError = (e: unknown) => /not authenticated|jwt|invalid refresh|401|refresh token/i.test(e instanceof Error ? e.message : String(e));

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const tenantId = auth.currentTenant?.id;

  const [cfg, setCfg] = useState<SyncConfig | null>(() => getSyncConfig());
  const [link, setLink] = useState<{ email: string } | null>(() => (tenantId ? readLink(tenantId) : null));
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [syncing, setSyncing] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<number | undefined>();
  const [tooLarge, setTooLarge] = useState(0);
  const [needsReload, setNeedsReload] = useState(false);

  const engineRef = useRef<SyncEngine | null>(null);
  const failures = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => setLink(tenantId ? readLink(tenantId) : null), [tenantId]);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const refreshStatus = useCallback(() => {
    const st = engineRef.current?.status();
    if (!st) return;
    setPending(st.pending);
    setLastSyncAt(st.lastSyncAt);
    setTooLarge(st.tooLarge.length);
  }, []);

  const runSync = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || !navigator.onLine) return;
    setSyncing(true);
    try {
      const res = await engine.sync();
      failures.current = 0;
      setError(undefined);
      setSignedOut(false);
      if (res.applied > 0) setNeedsReload(true);
    } catch (e) {
      failures.current++;
      if (isAuthError(e)) setSignedOut(true);
      else setError(friendly(e));
      // exponential backoff retry; the local queue is untouched
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void runSync(), Math.min(30_000 * 2 ** (failures.current - 1), MAX_BACKOFF_MS));
    } finally {
      setSyncing(false);
      refreshStatus();
    }
  }, [refreshStatus]);

  const schedule = useCallback(() => {
    refreshStatus();
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void runSync(), DEBOUNCE_MS);
  }, [refreshStatus, runSync]);

  // Engine lifecycle: exists while this company is linked to an online account and this tab is the leader.
  useEffect(() => {
    engineRef.current = null;
    if (!tenantId || !link || !cfg) return;
    let cancelled = false;
    let releaseLock: (() => void) | undefined;
    const cleanups: (() => void)[] = [];

    const start = async () => {
      const adapter = new BrowserLocal(tenantId);
      await adapter.init();
      if (cancelled) return;
      const engine = new SyncEngine(tenantId, new SupabaseRemote(getClient(cfg)), adapter.local, stateStore(tenantId));
      engineRef.current = engine;
      const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(`bidocs-sync-${tenantId}`) : null;

      const track = (keys: string[]) => {
        if (!keys.length) return;
        keys.forEach((k) => engine.track(k));
        channel?.postMessage({ keys }); // other tabs mirror the change into the leader's queue
        schedule();
      };
      cleanups.push(onStorageWrite((k) => track(adapter.keysForStorageWrite(k))));
      cleanups.push(onVaultEvent((e) => track(adapter.keysForVaultEvent(e))));
      if (channel) {
        channel.onmessage = (m) => {
          const keys: string[] = m.data?.keys ?? [];
          keys.forEach((k) => engine.track(k));
          if (keys.length) schedule();
        };
        cleanups.push(() => channel.close());
      }
      const onVisible = () => document.visibilityState === 'visible' && void runSync();
      document.addEventListener('visibilitychange', onVisible);
      cleanups.push(() => document.removeEventListener('visibilitychange', onVisible));
      const iv = window.setInterval(() => void runSync(), SYNC_INTERVAL_MS);
      cleanups.push(() => window.clearInterval(iv));

      refreshStatus();
      void runSync();
    };

    // Only one tab per company runs the engine (Web Locks); the rest just forward their changes.
    if (navigator.locks) {
      void navigator.locks.request(`bidocs-sync-leader-${tenantId}`, () =>
        cancelled
          ? undefined
          : new Promise<void>((resolve) => {
              releaseLock = resolve;
              void start();
            }),
      );
    } else {
      void start();
    }

    return () => {
      cancelled = true;
      cleanups.forEach((c) => c());
      releaseLock?.();
      window.clearTimeout(timer.current);
      engineRef.current = null;
    };
  }, [tenantId, link, cfg, schedule, runSync, refreshStatus]);

  // Come back online: sync immediately.
  useEffect(() => {
    if (online && engineRef.current) void runSync();
  }, [online, runSync]);

  const withClient = <T,>(fn: (remote: SupabaseRemote, client: ReturnType<typeof getClient>) => Promise<T>) => {
    if (!cfg) throw new Error('Online sync is not configured.');
    const client = getClient(cfg);
    return fn(new SupabaseRemote(client), client);
  };

  const connect: SyncContextValue['connect'] = async (email, password, mode) => {
    if (!tenantId || !auth.currentTenant) return { success: false, error: 'Sign in to a company first.' };
    if (!cfg) return { success: false, error: 'Enter the online project URL and key first.' };
    try {
      return await withClient(async (remote, client) => {
        const cleanEmail = email.trim().toLowerCase();
        if (mode === 'signup') {
          const { data, error: err } = await client.auth.signUp({
            email: cleanEmail, password, options: { data: { full_name: auth.currentUser?.fullName ?? '' } },
          });
          if (err) return { success: false, error: friendly(err) };
          if (!data.session) return { success: false, error: 'Account created. Confirm your email, then choose "Sign in".' };
        } else {
          const { error: err } = await client.auth.signInWithPassword({ email: cleanEmail, password });
          if (err) return { success: false, error: friendly(err) };
        }
        // One online account = one company: refuse to mix data from different companies.
        const tenants = (await remote.listTenantRecords()).filter((t) => !t.deleted);
        if (tenants.some((t) => t.id !== tenantId)) {
          await client.auth.signOut();
          return { success: false, error: 'This online account already belongs to a different company.' };
        }
        const local = new BrowserLocal(tenantId);
        await local.init();
        const engine = new SyncEngine(tenantId, remote, local.local, stateStore(tenantId));
        engine.enqueueExisting(await local.enumerate());
        rawStorage.set(linkKey(tenantId), JSON.stringify({ email: cleanEmail, linkedAt: Date.now() }));
        setLink({ email: cleanEmail });
        setSignedOut(false);
        return { success: true };
      });
    } catch (e) {
      return { success: false, error: friendly(e) };
    }
  };

  const restoreFromCloud: SyncContextValue['restoreFromCloud'] = async (email, password) => {
    if (!cfg) return { success: false, error: 'Enter the online project URL and key first.' };
    try {
      return await withClient(async (remote, client) => {
        const cleanEmail = email.trim().toLowerCase();
        const { data, error: err } = await client.auth.signInWithPassword({ email: cleanEmail, password });
        if (err) return { success: false, error: friendly(err) };
        const tenants = (await remote.listTenantRecords()).filter((t) => !t.deleted && t.payload);
        if (tenants.length !== 1) {
          await client.auth.signOut();
          return { success: false, error: 'No company data was found in this online account.' };
        }
        const tenant = tenants[0].payload as Tenant;
        const fullName = String(data.user?.user_metadata?.full_name || cleanEmail);
        rawStorage.set(linkKey(tenant.id), JSON.stringify({ email: cleanEmail, linkedAt: Date.now() }));
        const res = await auth.importCloudCompany(tenant, { email: cleanEmail, fullName, password });
        if (!res.success) await client.auth.signOut();
        return res;
      });
    } catch (e) {
      return { success: false, error: friendly(e) };
    }
  };

  const disconnect = async () => {
    if (cfg) await getClient(cfg).auth.signOut().catch(() => undefined);
    if (tenantId) {
      rawStorage.remove(linkKey(tenantId));
      rawStorage.remove(stateKey(tenantId));
    }
    setLink(null);
    setPending(0);
    setError(undefined);
  };

  const deleteCloudCopy: SyncContextValue['deleteCloudCopy'] = async () => {
    try {
      await withClient((remote) => remote.deleteAll());
      if (tenantId) rawStorage.remove(stateKey(tenantId));
      await disconnect();
      return { success: true };
    } catch (e) {
      return { success: false, error: friendly(e) };
    }
  };

  const status: SyncStatus = !cfg
    ? 'unconfigured'
    : !link
      ? 'signed-out'
      : signedOut
        ? 'signed-out'
        : !online
          ? 'offline'
          : syncing
            ? 'syncing'
            : error
              ? 'error'
              : pending > 0
                ? 'pending'
                : 'synced';

  const value = useMemo<SyncContextValue>(
    () => ({
      configured: !!cfg,
      linked: !!link,
      email: link?.email,
      status,
      pending,
      lastSyncAt,
      error,
      tooLarge,
      needsReload,
      saveConfig: (c) => {
        if (c) {
          const problem = validateConfig(c);
          if (problem) return problem;
        }
        saveSyncConfig(c);
        setCfg(getSyncConfig());
        return null;
      },
      connect,
      restoreFromCloud,
      disconnect,
      syncNow: runSync,
      deleteCloudCopy,
      reload: () => window.location.reload(),
    }),
    [cfg, link, status, pending, lastSyncAt, error, tooLarge, needsReload, tenantId, auth.currentTenant, auth.currentUser, runSync],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useSync = (): SyncContextValue => useContext(Ctx);

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isApproverRole, type Tenant } from '../types';
import { SyncEngine, emptyState, type StateStore, type SyncState } from './engine';
import { BrowserLocal } from './localAdapter';
import { installStorageTracker, onStorageWrite, onVaultEvent, rawStorage } from './hooks';
import {
  SupabaseRemote, getClient, getSyncConfig, hostOf, saveSyncConfig, validateConfig, type SyncConfig,
} from './supabaseRemote';

export type SyncStatus = 'unconfigured' | 'signed-out' | 'offline' | 'syncing' | 'synced' | 'pending' | 'error';
type Result = { success: boolean; error?: string };

export interface SyncContextValue {
  configured: boolean;
  /** Host of the online project data is sent to (shown wherever credentials are entered). */
  host?: string;
  linked: boolean;
  /** Only a company owner or manager may connect, disconnect, or change the online project. */
  canManage: boolean;
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
  /** `cfgOverride` is used for this attempt only and saved only if the restore succeeds. */
  restoreFromCloud: (email: string, password: string, cfgOverride?: SyncConfig) => Promise<Result>;
  disconnect: () => Promise<void>;
  syncNow: () => Promise<void>;
  deleteCloudCopy: () => Promise<Result>;
  reload: () => void;
}

/** Used when no provider is mounted (tests, isolated screens): sync reads as "not set up" and does nothing. */
const DISABLED: SyncContextValue = {
  configured: false,
  linked: false,
  canManage: false,
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

type Link = { email: string; userId?: string; host?: string };

const readLink = (tenantId: string): Link | null => {
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
  const [storedLink, setLink] = useState<Link | null>(() => (tenantId ? readLink(tenantId) : null));
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [syncing, setSyncing] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<number | undefined>();
  const [tooLarge, setTooLarge] = useState(0);
  const [needsReload, setNeedsReload] = useState(false);

  // A link belongs to the project it was made with; if the device's project changed, the company counts as not connected.
  const link = storedLink && (!storedLink.host || storedLink.host === hostOf(cfg)) ? storedLink : null;

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
      const engine = new SyncEngine(tenantId, new SupabaseRemote(getClient(cfg, tenantId), link.userId), adapter.local, stateStore(tenantId));
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

  const canManage = isApproverRole(auth.currentUser?.role);
  const denied: Result = { success: false, error: 'Only a company owner or manager can change online sync settings.' };

  const connect: SyncContextValue['connect'] = async (email, password, mode) => {
    if (!tenantId || !auth.currentTenant) return { success: false, error: 'Sign in to a company first.' };
    if (!canManage) return denied;
    if (!cfg) return { success: false, error: 'Enter the online project URL and key first.' };
    const client = getClient(cfg, tenantId); // this company's own online session
    try {
      const cleanEmail = email.trim().toLowerCase();
      let userId: string | undefined;
      if (mode === 'signup') {
        const { data, error: err } = await client.auth.signUp({
          email: cleanEmail, password, options: { data: { full_name: auth.currentUser?.fullName ?? '' } },
        });
        if (err) return { success: false, error: friendly(err) };
        if (!data.session) return { success: false, error: 'Account created. Confirm your email, then choose "Sign in".' };
        userId = data.session.user.id;
      } else {
        const { data, error: err } = await client.auth.signInWithPassword({ email: cleanEmail, password });
        if (err) return { success: false, error: friendly(err) };
        userId = data.session?.user.id;
      }
      if (!userId) return { success: false, error: 'Sign-in did not return an account.' };
      const remote = new SupabaseRemote(client, userId);
      // One online account = one company: refuse to mix data from different companies.
      const tenants = (await remote.listTenantRecords()).filter((t) => !t.deleted);
      if (tenants.some((t) => t.id !== tenantId)) {
        await client.auth.signOut({ scope: 'local' });
        return { success: false, error: 'This online account already belongs to a different company.' };
      }
      const local = new BrowserLocal(tenantId);
      await local.init();
      const engine = new SyncEngine(tenantId, remote, local.local, stateStore(tenantId));
      engine.enqueueExisting(await local.enumerate());
      const host = hostOf(cfg);
      rawStorage.set(linkKey(tenantId), JSON.stringify({ email: cleanEmail, userId, host, linkedAt: Date.now() }));
      setLink({ email: cleanEmail, userId, host });
      setSignedOut(false);
      return { success: true };
    } catch (e) {
      return { success: false, error: friendly(e) };
    }
  };

  const restoreFromCloud: SyncContextValue['restoreFromCloud'] = async (email, password, cfgOverride) => {
    const config = cfgOverride ?? cfg;
    if (!config) return { success: false, error: 'Enter the online project URL and key first.' };
    const problem = validateConfig(config);
    if (problem) return { success: false, error: problem };
    const temp = getClient(config, null); // throwaway: nothing is stored unless the restore succeeds
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error: err } = await temp.auth.signInWithPassword({ email: cleanEmail, password });
      if (err) return { success: false, error: friendly(err) };
      const session = data.session;
      const userId = data.user?.id;
      if (!session || !userId) return { success: false, error: 'Sign-in did not return an account.' };
      const tenants = (await new SupabaseRemote(temp, userId).listTenantRecords()).filter((t) => !t.deleted && t.payload);
      if (tenants.length !== 1) return { success: false, error: 'No company data was found in this online account.' };
      const tenant = tenants[0].payload as Tenant;
      // Nothing below may touch an existing company's session or link: refuse before any of it is created.
      if (auth.companyExistsOnDevice(tenant?.id, cleanEmail)) {
        return { success: false, error: 'This company or email already exists on this device. Use Log in with your local password.' };
      }

      // Bind a per-company session and link first (the engine starts once the company exists); undone on any failure.
      const tenantClient = getClient(config, tenant.id);
      const linkRecord = JSON.stringify({ email: cleanEmail, userId, host: hostOf(config), linkedAt: Date.now() });
      let restored = false;
      try {
        const { error: sErr } = await tenantClient.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
        if (sErr) return { success: false, error: friendly(sErr) };
        rawStorage.set(linkKey(tenant.id), linkRecord);
        const fullName = String(data.user?.user_metadata?.full_name || cleanEmail);
        const res = await auth.importCloudCompany(tenant, { email: cleanEmail, fullName, password });
        restored = res.success;
        if (!res.success) return res;
        if (cfgOverride) saveSyncConfig(cfgOverride); // persisted only now that the restore worked
        setCfg(getSyncConfig());
        return res;
      } finally {
        if (!restored) {
          rawStorage.remove(linkKey(tenant.id));
          await tenantClient.auth.signOut({ scope: 'local' }).catch(() => undefined);
        }
      }
    } catch (e) {
      return { success: false, error: friendly(e) };
    } finally {
      await temp.auth.signOut({ scope: 'local' }).catch(() => undefined);
    }
  };

  const disconnect = async () => {
    if (!canManage || !tenantId) return;
    if (cfg) await getClient(cfg, tenantId).auth.signOut({ scope: 'local' }).catch(() => undefined);
    rawStorage.remove(linkKey(tenantId));
    rawStorage.remove(stateKey(tenantId));
    setLink(null);
    setPending(0);
    setError(undefined);
  };

  const deleteCloudCopy: SyncContextValue['deleteCloudCopy'] = async () => {
    if (!canManage || !tenantId || !cfg) return denied;
    try {
      // The remote is bound to the account this company was linked with; a different session is refused.
      await new SupabaseRemote(getClient(cfg, tenantId), link?.userId).deleteAll();
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
      host: hostOf(cfg),
      canManage,
      linked: !!link,
      email: link?.email,
      status,
      pending,
      lastSyncAt,
      error,
      tooLarge,
      needsReload,
      saveConfig: (c) => {
        if (tenantId && !canManage) return denied.error!;
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
    [cfg, link, status, pending, lastSyncAt, error, tooLarge, needsReload, tenantId, canManage, auth.currentTenant, auth.currentUser, runSync],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useSync = (): SyncContextValue => useContext(Ctx);

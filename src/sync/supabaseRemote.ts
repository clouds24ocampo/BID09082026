import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Remote, RemoteRecord, SyncRecord } from './engine';
import { rawStorage } from './hooks';

export interface SyncConfig {
  url: string;
  anonKey: string;
}

const CONFIG_KEY = 'bidocs_sync_config';
const BUCKET = 'vault';

/** Build-time config (VITE_SUPABASE_*) wins; otherwise the URL/key saved from Settings (re-validated on every read). */
export function getSyncConfig(): SyncConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (url && anonKey) return { url, anonKey };
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as SyncConfig;
    return c?.url && c?.anonKey && validateConfig(c) === null ? c : null;
  } catch {
    return null;
  }
}

export function saveSyncConfig(cfg: SyncConfig | null): void {
  if (!cfg) rawStorage.remove(CONFIG_KEY);
  else rawStorage.set(CONFIG_KEY, JSON.stringify(cfg));
}

/**
 * The anon key is public by design (row level security protects the data). The URL decides where credentials and
 * company data are sent, so it must be https and a Supabase project host. Self-hosting sets
 * VITE_ALLOW_CUSTOM_SYNC_HOST=true at build time (which also permits http://localhost for development).
 */
export function validateConfig(cfg: SyncConfig): string | null {
  const custom = import.meta.env.VITE_ALLOW_CUSTOM_SYNC_HOST === 'true';
  try {
    const u = new URL(cfg.url);
    const local = custom && (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
    if (u.protocol !== 'https:' && !local) return 'The project URL must start with https://';
    if (!custom && !/\.supabase\.(co|in)$/i.test(u.hostname)) {
      return 'Only Supabase project URLs (for example https://abcd1234.supabase.co) are accepted.';
    }
  } catch {
    return 'Enter a valid project URL, for example https://abcd1234.supabase.co';
  }
  if (cfg.anonKey.trim().length < 20) return 'Enter the project anon (public) key.';
  return null;
}

export const hostOf = (cfg: SyncConfig | null): string | undefined => {
  try {
    return cfg ? new URL(cfg.url).host : undefined;
  } catch {
    return undefined;
  }
};

const clients = new Map<string, SupabaseClient>();

/**
 * One client (and one stored login session) per company, so signing a company into its online account can never
 * reuse another company's session. `scope: null` gives a throwaway in-memory client (used while restoring).
 */
export function getClient(cfg: SyncConfig, scope: string | null): SupabaseClient {
  const key = `${cfg.url}|${cfg.anonKey}|${scope}`;
  let c = clients.get(key);
  if (!c) {
    c = createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: scope !== null,
        autoRefreshToken: scope !== null,
        detectSessionInUrl: false,
        // project host + company: a stored session can never be loaded by, or sent to, a different project
        storageKey: `sb-bidocs-${hostOf(cfg) ?? 'unknown'}-${scope ?? 'restore'}`,
      },
    });
    clients.set(key, c);
  }
  return c;
}

// ---- binary helpers (no fetch(data:) because the page CSP does not allow data: in connect-src) ----

const dataUrlToBytes = (dataUrl: string): { bytes: Uint8Array; mime: string } => {
  const comma = dataUrl.indexOf(',');
  const meta = dataUrl.slice(5, comma); // after "data:"
  const bin = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, mime: meta.replace(/;base64$/, '') || 'application/octet-stream' };
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

const encodeId = (id: string) =>
  btoa(unescape(encodeURIComponent(id))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

interface Row {
  key: string;
  tenant_id: string;
  deleted: boolean;
  payload: unknown;
  client_updated_ms: number;
  server_seq: number;
}

export class SupabaseRemote implements Remote {
  /** `expectedUserId` binds this remote to the online account the company was linked with. */
  constructor(private readonly client: SupabaseClient, private readonly expectedUserId?: string) {}

  private async userId(): Promise<string> {
    const { data } = await this.client.auth.getSession();
    const id = data.session?.user.id;
    if (!id || (this.expectedUserId && id !== this.expectedUserId)) throw new Error('not authenticated');
    return id;
  }

  private async path(tenantId: string, id: string) {
    return `${await this.userId()}/${tenantId}/${encodeId(id)}`;
  }

  async push(records: SyncRecord[]): Promise<void> {
    await this.userId();
    const { error } = await this.client.rpc('sync_push', {
      records: records.map((r) => ({
        key: r.key,
        tenant_id: r.tenantId,
        deleted: r.deleted,
        payload: r.payload ?? null,
        client_updated_ms: r.updatedAt,
      })),
    });
    if (error) throw new Error(error.message);
  }

  async pull(afterSeq: number, limit: number): Promise<RemoteRecord[]> {
    await this.userId();
    const { data, error } = await this.client
      .from('sync_records')
      .select('key, tenant_id, deleted, payload, client_updated_ms, server_seq')
      .gt('server_seq', afterSeq)
      .order('server_seq', { ascending: true })
      .limit(limit);
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map((r) => ({
      key: r.key,
      tenantId: r.tenant_id,
      deleted: r.deleted,
      payload: r.payload,
      updatedAt: Number(r.client_updated_ms),
      seq: Number(r.server_seq),
    }));
  }

  /** Tenant profile records of this account (used to bind an online account to exactly one company). */
  async listTenantRecords(): Promise<{ id: string; payload: unknown; deleted: boolean }[]> {
    await this.userId();
    const { data, error } = await this.client
      .from('sync_records')
      .select('key, payload, deleted')
      .like('key', 'tenant:%');
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: { key: string; payload: unknown; deleted: boolean }) => ({
      id: r.key.slice('tenant:'.length),
      payload: r.payload,
      deleted: r.deleted,
    }));
  }

  async uploadBlob(tenantId: string, id: string, dataUrl: string): Promise<void> {
    const { bytes, mime } = dataUrlToBytes(dataUrl);
    const { error } = await this.client.storage
      .from(BUCKET)
      .upload(await this.path(tenantId, id), bytes, { upsert: true, contentType: mime });
    if (error) throw new Error(error.message);
  }

  async downloadBlob(tenantId: string, id: string): Promise<string | null> {
    const { data, error } = await this.client.storage.from(BUCKET).download(await this.path(tenantId, id));
    if (error || !data) return null;
    return blobToDataUrl(data);
  }

  async deleteBlob(tenantId: string, id: string): Promise<void> {
    const { error } = await this.client.storage.from(BUCKET).remove([await this.path(tenantId, id)]);
    if (error) throw new Error(error.message);
  }

  /**
   * Permanently remove this account's synced data (files first, then records, so a failed run can simply be retried).
   * Throws on any error; nothing is reported as deleted unless it was.
   */
  async deleteAll(): Promise<void> {
    const uid = await this.userId();
    const bucket = this.client.storage.from(BUCKET);
    const PAGE = 100;
    const listAll = async (prefix: string) => {
      const names: string[] = [];
      for (let offset = 0; ; offset += PAGE) {
        const { data, error } = await bucket.list(prefix, { limit: PAGE, offset });
        if (error) throw new Error(error.message);
        names.push(...(data ?? []).map((f) => f.name));
        if ((data?.length ?? 0) < PAGE) return names;
      }
    };
    for (const folder of await listAll(uid)) {
      const files = await listAll(`${uid}/${folder}`);
      for (let i = 0; i < files.length; i += PAGE) {
        const { error } = await bucket.remove(files.slice(i, i + PAGE).map((f) => `${uid}/${folder}/${f}`));
        if (error) throw new Error(error.message);
      }
    }
    const { error } = await this.client.from('sync_records').delete().eq('user_id', uid);
    if (error) throw new Error(error.message);
  }
}

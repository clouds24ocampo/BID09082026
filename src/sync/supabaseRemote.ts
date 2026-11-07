import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Remote, RemoteRecord, SyncRecord } from './engine';
import { rawStorage } from './hooks';

export interface SyncConfig {
  url: string;
  anonKey: string;
}

const CONFIG_KEY = 'bidocs_sync_config';
const BUCKET = 'vault';

/** Build-time config (VITE_SUPABASE_*) wins; otherwise the URL/key a user entered in Settings. */
export function getSyncConfig(): SyncConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (url && anonKey) return { url, anonKey };
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as SyncConfig;
    return c?.url && c?.anonKey ? c : null;
  } catch {
    return null;
  }
}

export function saveSyncConfig(cfg: SyncConfig | null): void {
  if (!cfg) rawStorage.remove(CONFIG_KEY);
  else rawStorage.set(CONFIG_KEY, JSON.stringify(cfg));
  clientCache = null;
}

/** The anon key is public by design (row level security protects the data) but the URL must be https. */
export function validateConfig(cfg: SyncConfig): string | null {
  try {
    const u = new URL(cfg.url);
    if (u.protocol !== 'https:') return 'The project URL must start with https://';
  } catch {
    return 'Enter a valid project URL, for example https://abcd1234.supabase.co';
  }
  if (cfg.anonKey.trim().length < 20) return 'Enter the project anon (public) key.';
  return null;
}

let clientCache: { key: string; client: SupabaseClient } | null = null;

export function getClient(cfg: SyncConfig): SupabaseClient {
  const key = `${cfg.url}|${cfg.anonKey}`;
  if (!clientCache || clientCache.key !== key) {
    clientCache = {
      key,
      client: createClient(cfg.url, cfg.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'sb-bidocs-auth' },
      }),
    };
  }
  return clientCache.client;
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
  constructor(private readonly client: SupabaseClient) {}

  private async userId(): Promise<string> {
    const { data } = await this.client.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error('not authenticated');
    return id;
  }

  private async path(tenantId: string, id: string) {
    return `${await this.userId()}/${tenantId}/${encodeId(id)}`;
  }

  async push(records: SyncRecord[]): Promise<void> {
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

  /** Permanently remove this account's synced data from the cloud (records and files). */
  async deleteAll(): Promise<void> {
    const uid = await this.userId();
    const { error } = await this.client.from('sync_records').delete().eq('user_id', uid);
    if (error) throw new Error(error.message);
    const { data: tenants } = await this.client.storage.from(BUCKET).list(uid);
    for (const folder of tenants ?? []) {
      const { data: files } = await this.client.storage.from(BUCKET).list(`${uid}/${folder.name}`, { limit: 1000 });
      const paths = (files ?? []).map((f) => `${uid}/${folder.name}/${f.name}`);
      if (paths.length) await this.client.storage.from(BUCKET).remove(paths);
    }
  }
}

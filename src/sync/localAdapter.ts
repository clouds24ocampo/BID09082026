import type { Local, LocalSnapshot, RemoteRecord } from './engine';
import { rawStorage, runUntracked, type VaultEvent } from './hooks';
import {
  loadVaultItems, upsertVaultItem, deleteVaultItem, savePdfData, loadPdfData, deletePdfData, listPdfKeys,
} from '../utils/vaultIndexedDB';

/** Sync-key namespaces. */
export const LS = 'ls:';
export const VI = 'vi:';
export const BLOB = 'blob:';
export const TENANT = 'tenant:';

/** Never leave the device: credentials, sessions, lockout counters and the sync bookkeeping itself. */
const EXCLUDED = [
  /^bidocs_sync_/,
  /^bidocs_users$/,
  /^bidocs_tenants$/,
  /^bidocs_login_attempts$/,
  /^bidocs_must_change_password_/,
  /^bidocs_user_password_/,
  /^bidocs_session/,
  /^bidocs_vault_items_/, // mirror of the IndexedDB vault list, which syncs as vi: records
];

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const parseList = (raw: string | null): any[] => {
  try {
    const v = JSON.parse(raw || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

/** Browser storage side of sync for one company (localStorage, IndexedDB vault, tenant profile). */
export class BrowserLocal {
  private vaultIds = new Set<string>();
  private lastTenantJson: string | null = null;

  constructor(readonly tenantId: string) {
    this.lastTenantJson = this.tenantJson();
  }

  /** Load what the diffing helpers need. Call once before use. */
  async init(): Promise<void> {
    try {
      this.vaultIds = new Set((await loadVaultItems(this.tenantId)).map((i) => i.id));
    } catch {
      this.vaultIds = new Set();
    }
  }

  private tenantJson(): string | null {
    const t = parseList(read('bidocs_tenants')).find((x) => x?.id === this.tenantId);
    return t ? JSON.stringify(t) : null;
  }

  private belongsToLs(key: string): boolean {
    return key.startsWith('bidocs_') && key.includes(this.tenantId) && !EXCLUDED.some((r) => r.test(key));
  }

  /** Binary files belong to this company by embedded id, vault item id, or one of its opportunities. */
  private belongsToBlob(id: string): boolean {
    if (id.includes(this.tenantId) || this.vaultIds.has(id)) return true;
    return parseList(read(`bidocs_opportunities_${this.tenantId}`)).some(
      (o) => o?.id && (id.startsWith(`op_pdf_${o.id}`) || id.startsWith(`op_att_${o.id}_`)),
    );
  }

  /** Sync keys affected by a localStorage write (empty when it is not synced data). */
  keysForStorageWrite(key: string): string[] {
    if (key === 'bidocs_tenants') {
      const now = this.tenantJson();
      if (now && now !== this.lastTenantJson) {
        this.lastTenantJson = now;
        return [TENANT + this.tenantId];
      }
      return [];
    }
    return this.belongsToLs(key) ? [LS + key] : [];
  }

  /** Sync keys affected by a vault/IndexedDB event. */
  keysForVaultEvent(e: VaultEvent): string[] {
    switch (e.type) {
      case 'item':
        if (e.item.tenantId !== this.tenantId) return [];
        this.vaultIds.add(e.item.id);
        return [VI + e.item.id];
      case 'item-deleted': {
        const mine = e.tenantId === this.tenantId || (e.tenantId === undefined && this.vaultIds.has(e.id));
        if (!mine) return [];
        this.vaultIds.delete(e.id);
        return [VI + e.id];
      }
      case 'replaced': {
        if (e.tenantId !== this.tenantId) return [];
        const incoming = new Set(e.ids);
        const keys = e.ids.map((id) => VI + id);
        for (const id of this.vaultIds) {
          if (!incoming.has(id)) keys.push(VI + id, BLOB + id);
        }
        this.vaultIds = incoming;
        return keys;
      }
      case 'blob-saved':
      case 'blob-deleted':
        return this.belongsToBlob(e.id) ? [BLOB + e.id] : [];
    }
  }

  /** Every syncable key that exists on this device right now (used when sync is first enabled). */
  async enumerate(): Promise<string[]> {
    const keys: string[] = [];
    if (this.tenantJson()) keys.push(TENANT + this.tenantId);
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && this.belongsToLs(k)) keys.push(LS + k);
    }
    for (const item of await loadVaultItems(this.tenantId).catch(() => [])) keys.push(VI + item.id);
    for (const id of await listPdfKeys().catch(() => [])) if (this.belongsToBlob(id)) keys.push(BLOB + id);
    return keys;
  }

  readonly local: Local = {
    snapshot: async (key: string): Promise<LocalSnapshot> => {
      if (key.startsWith(LS)) {
        const v = read(key.slice(LS.length));
        return v === null ? { exists: false } : { exists: true, payload: { v } };
      }
      if (key.startsWith(TENANT)) {
        const t = parseList(read('bidocs_tenants')).find((x) => x?.id === key.slice(TENANT.length));
        return t ? { exists: true, payload: t } : { exists: false };
      }
      if (key.startsWith(VI)) {
        const item = (await loadVaultItems(this.tenantId)).find((i) => i.id === key.slice(VI.length));
        return item ? { exists: true, payload: item } : { exists: false };
      }
      if (key.startsWith(BLOB)) {
        const data = await loadPdfData(key.slice(BLOB.length));
        return typeof data === 'string' ? { exists: true, blob: data } : { exists: false };
      }
      return { exists: false };
    },

    // ponytail: the untracked window is global, so a user edit made during the few ms of an apply is not queued.
    // Per-key suppression if that ever shows up.
    apply: (rec: RemoteRecord, blob: string | null) =>
      runUntracked(async () => {
        const { key } = rec;
        if (key.startsWith(LS)) {
          const lsKey = key.slice(LS.length);
          if (!this.belongsToLs(lsKey)) return; // a server record can never write outside synced keys
          if (rec.deleted) rawStorage.remove(lsKey);
          else rawStorage.set(lsKey, String((rec.payload as { v?: string })?.v ?? ''));
        } else if (key.startsWith(TENANT)) {
          if (rec.deleted || !rec.payload) return; // a company is never deleted by sync
          const id = key.slice(TENANT.length);
          if (id !== this.tenantId) return;
          const list = parseList(read('bidocs_tenants')).filter((t) => t?.id !== id);
          list.push(rec.payload);
          rawStorage.set('bidocs_tenants', JSON.stringify(list));
          this.lastTenantJson = JSON.stringify(rec.payload);
          window.dispatchEvent(new CustomEvent('bidocs:tenants-updated'));
        } else if (key.startsWith(VI)) {
          const id = key.slice(VI.length);
          if (rec.deleted) {
            this.vaultIds.delete(id);
            await deleteVaultItem(id, this.tenantId);
          } else {
            const item = rec.payload as { id: string; tenantId?: string };
            if (item?.tenantId !== this.tenantId) return;
            this.vaultIds.add(id);
            await upsertVaultItem(item);
          }
        } else if (key.startsWith(BLOB)) {
          const id = key.slice(BLOB.length);
          if (rec.deleted) await deletePdfData(id);
          else if (blob !== null) await savePdfData(id, blob);
        }
      }),
  };
}

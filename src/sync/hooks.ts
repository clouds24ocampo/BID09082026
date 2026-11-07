/**
 * Change tracking for the sync engine. Dependency-free so low-level storage code (IndexedDB vault)
 * can import it without cycles.
 *
 *  - localStorage writes are observed by patching Storage.prototype once (`installStorageTracker`).
 *  - Vault/IndexedDB changes are reported explicitly through `syncHooks`.
 *  - Remote changes are applied inside `runUntracked` so they are not echoed back to the server.
 */

type StorageListener = (key: string, value: string | null) => void;
export type VaultEvent =
  | { type: 'item'; item: { id: string; tenantId?: string } }
  | { type: 'item-deleted'; id: string; tenantId?: string }
  | { type: 'replaced'; tenantId?: string; ids: string[] }
  | { type: 'blob-saved'; id: string }
  | { type: 'blob-deleted'; id: string };
type VaultListener = (e: VaultEvent) => void;

const storageListeners = new Set<StorageListener>();
const vaultListeners = new Set<VaultListener>();
let untracked = 0;
let installed = false;

const hasStorage = typeof Storage !== 'undefined';
const rawSetItem = hasStorage ? Storage.prototype.setItem : undefined;
const rawRemoveItem = hasStorage ? Storage.prototype.removeItem : undefined;

export const isTracking = () => untracked === 0;

/** Run `fn` without reporting any storage or vault change (used to apply remote data and to delete a company locally). */
export async function runUntracked<T>(fn: () => Promise<T> | T): Promise<T> {
  untracked++;
  try {
    return await fn();
  } finally {
    untracked--;
  }
}

/** localStorage access that bypasses tracking. */
export const rawStorage = {
  set(key: string, value: string) {
    rawSetItem!.call(localStorage, key, value);
  },
  remove(key: string) {
    rawRemoveItem!.call(localStorage, key);
  },
};

export function installStorageTracker(): void {
  if (installed || !hasStorage || !rawSetItem || !rawRemoveItem) return;
  installed = true;
  const emit = (key: string, value: string | null) => {
    if (!isTracking()) return;
    for (const l of storageListeners) {
      try {
        l(key, value);
      } catch {
        /* a listener must never break a storage write */
      }
    }
  };
  const isLocal = (s: Storage) => {
    try {
      return s === window.localStorage;
    } catch {
      return false;
    }
  };
  Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
    rawSetItem.call(this, key, value);
    if (isLocal(this)) emit(String(key), String(value));
  };
  Storage.prototype.removeItem = function (this: Storage, key: string) {
    rawRemoveItem.call(this, key);
    if (isLocal(this)) emit(String(key), null);
  };
}

export function onStorageWrite(cb: StorageListener): () => void {
  storageListeners.add(cb);
  return () => storageListeners.delete(cb);
}

export function onVaultEvent(cb: VaultListener): () => void {
  vaultListeners.add(cb);
  return () => vaultListeners.delete(cb);
}

const emitVault = (e: VaultEvent) => {
  if (!isTracking()) return;
  for (const l of vaultListeners) {
    try {
      l(e);
    } catch {
      /* ignore */
    }
  }
};

/** Called by vaultIndexedDB after the corresponding write has completed. */
export const syncHooks = {
  vaultItem: (item: { id: string; tenantId?: string }) => emitVault({ type: 'item', item }),
  vaultItemDeleted: (id: string, tenantId?: string) => emitVault({ type: 'item-deleted', id, tenantId }),
  vaultReplaced: (ids: string[], tenantId?: string) => emitVault({ type: 'replaced', ids, tenantId }),
  blobSaved: (id: string) => emitVault({ type: 'blob-saved', id }),
  blobDeleted: (id: string) => emitVault({ type: 'blob-deleted', id }),
};

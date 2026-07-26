/**
 * vaultIndexedDB.ts
 * 
 * IndexedDB-based storage engine for Document Vault.
 * Replaces localStorage to support 200MB+ of PDF data storage.
 * 
 * Browser IndexedDB quota is typically 50% of available disk space,
 * so 200MB is well within limits on any modern machine.
 */

const DB_NAME = 'BiDOCS_VaultDB';
const DB_VERSION = 1;

// Object store names
const STORE_VAULT_ITEMS = 'vaultItems';       // metadata (no PDF binary)
const STORE_PDF_BLOBS = 'pdfBlobs';           // PDF binary data keyed by item ID

/** Open (or create) the IndexedDB database */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_VAULT_ITEMS)) {
        db.createObjectStore(STORE_VAULT_ITEMS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PDF_BLOBS)) {
        db.createObjectStore(STORE_PDF_BLOBS);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Vault Item Metadata ────────────────────────────────────────────────

/** Save all vault items (metadata only, no fileDataUrl) */
export async function saveVaultItems(items: any[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_VAULT_ITEMS, 'readwrite');
  const store = tx.objectStore(STORE_VAULT_ITEMS);

  // Clear old entries and write fresh
  store.clear();

  for (const item of items) {
    // Strip fileDataUrl from item and previous versions before storing metadata
    const { fileDataUrl, previousVersions, ...rest } = item;
    const cleanVersions = (previousVersions || []).map((v: any) => {
      const { fileDataUrl: _fd, ...vRest } = v;
      return vRest;
    });
    store.put({ ...rest, previousVersions: cleanVersions });
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Load all vault items (metadata only) */
export async function loadVaultItems(): Promise<any[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_VAULT_ITEMS, 'readonly');
  const store = tx.objectStore(STORE_VAULT_ITEMS);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => { db.close(); resolve(request.result || []); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

// ─── PDF Binary Data ────────────────────────────────────────────────────

/** Store a PDF data URL blob by item ID (supports 200MB+ total) */
export async function savePdfData(itemId: string, dataUrl: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_PDF_BLOBS, 'readwrite');
  const store = tx.objectStore(STORE_PDF_BLOBS);
  store.put(dataUrl, itemId);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Retrieve a PDF data URL blob by item ID */
export async function loadPdfData(itemId: string): Promise<string | undefined> {
  const db = await openDB();
  const tx = db.transaction(STORE_PDF_BLOBS, 'readonly');
  const store = tx.objectStore(STORE_PDF_BLOBS);
  const request = store.get(itemId);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => { db.close(); resolve(request.result || undefined); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

/** Delete a specific PDF blob */
export async function deletePdfData(itemId: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_PDF_BLOBS, 'readwrite');
  const store = tx.objectStore(STORE_PDF_BLOBS);
  store.delete(itemId);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Clear all PDF blobs */
export async function clearAllPdfData(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_PDF_BLOBS, 'readwrite');
  const store = tx.objectStore(STORE_PDF_BLOBS);
  store.clear();

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Clear ALL vault data (items + PDFs) */
export async function clearAllVaultData(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([STORE_VAULT_ITEMS, STORE_PDF_BLOBS], 'readwrite');
  tx.objectStore(STORE_VAULT_ITEMS).clear();
  tx.objectStore(STORE_PDF_BLOBS).clear();

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/**
 * Migrate existing localStorage data into IndexedDB (one-time).
 * After migration, removes the old localStorage key.
 */
export async function migrateFromLocalStorage(): Promise<any[]> {
  const key = 'bidocs_vault_items';
  const raw = localStorage.getItem(key);
  if (!raw) return [];

  try {
    const items = JSON.parse(raw);
    if (Array.isArray(items) && items.length > 0) {
      await saveVaultItems(items);
      localStorage.removeItem(key);
      console.log(`[VaultDB] Migrated ${items.length} items from localStorage → IndexedDB`);
      return items;
    }
  } catch (e) {
    console.error('[VaultDB] Migration from localStorage failed:', e);
  }

  return [];
}

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

// In-memory hot caches for 0ms instant data retrieval
const memoryPdfCache = new Map<string, string>();
const absentPdfCache = new Set<string>();
const memoryVaultItemsCache = new Map<string, any[]>();

let cachedDB: IDBDatabase | null = null;


/** Open (or get cached) IndexedDB database connection */
function openDB(): Promise<IDBDatabase> {
  if (cachedDB) {
    try {
      // Test if connection is still active
      cachedDB.transaction(STORE_VAULT_ITEMS, 'readonly');
      return Promise.resolve(cachedDB);
    } catch (_) {
      cachedDB = null;
    }
  }

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

    request.onsuccess = () => {
      cachedDB = request.result;
      cachedDB.onclose = () => { cachedDB = null; };
      cachedDB.onversionchange = () => { cachedDB?.close(); cachedDB = null; };
      resolve(cachedDB);
    };
    request.onerror = () => reject(request.error);
  });
}

// ─── Vault Item Metadata ────────────────────────────────────────────────

/** Save vault items for a specific tenant or all items (metadata only, no fileDataUrl) */
export async function saveVaultItems(items: any[], tenantId?: string): Promise<void> {
  // Update memory cache immediately for instantaneous UI response
  if (tenantId) {
    memoryVaultItemsCache.set(tenantId, items);
  } else {
    memoryVaultItemsCache.set('all', items);
  }

  const db = await openDB();

  // If tenantId is specified, read items in a separate readonly transaction first
  let finalItemsToWrite = items;
  if (tenantId) {
    const readTx = db.transaction(STORE_VAULT_ITEMS, 'readonly');
    const readStore = readTx.objectStore(STORE_VAULT_ITEMS);
    const getAllReq = readStore.getAll();

    const existing: any[] = await new Promise((resolve, reject) => {
      getAllReq.onsuccess = () => resolve(getAllReq.result || []);
      getAllReq.onerror = () => reject(getAllReq.error);
    });

    const otherTenantsItems = existing.filter(item => item.tenantId && item.tenantId !== tenantId);
    finalItemsToWrite = [...otherTenantsItems, ...items];
  }

  // Open readwrite transaction and execute synchronous writes
  const tx = db.transaction(STORE_VAULT_ITEMS, 'readwrite');
  const store = tx.objectStore(STORE_VAULT_ITEMS);
  store.clear();

  for (const item of finalItemsToWrite) {
    // Strip fileDataUrl from item and previous versions before storing metadata
    const { fileDataUrl, previousVersions, ...rest } = item;
    const cleanVersions = (previousVersions || []).map((v: any) => {
      const { fileDataUrl: _fd, ...vRest } = v;
      return vRest;
    });
    store.put({ ...rest, previousVersions: cleanVersions });
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Load vault items (metadata only), optionally filtered by tenantId */
export async function loadVaultItems(tenantId?: string): Promise<any[]> {
  const cacheKey = tenantId || 'all';
  if (memoryVaultItemsCache.has(cacheKey)) {
    return memoryVaultItemsCache.get(cacheKey)!;
  }

  const db = await openDB();
  const tx = db.transaction(STORE_VAULT_ITEMS, 'readonly');
  const store = tx.objectStore(STORE_VAULT_ITEMS);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const allItems: any[] = request.result || [];
      const result = tenantId ? allItems.filter(item => item.tenantId === tenantId) : allItems;
      memoryVaultItemsCache.set(cacheKey, result);
      resolve(result);
    };
    request.onerror = () => reject(request.error);
  });
}

// ─── PDF Binary Data ────────────────────────────────────────────────────

/** Store a PDF data URL blob by item ID (supports 200MB+ total) */
export async function savePdfData(itemId: string, dataUrl: string): Promise<void> {
  // Populate memory cache instantly & clear from absent cache
  absentPdfCache.delete(itemId);
  memoryPdfCache.set(itemId, dataUrl);

  const db = await openDB();
  const tx = db.transaction(STORE_PDF_BLOBS, 'readwrite');
  const store = tx.objectStore(STORE_PDF_BLOBS);
  store.put(dataUrl, itemId);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Retrieve a PDF data URL blob by item ID */
export async function loadPdfData(itemId: string): Promise<string | undefined> {
  // 0ms instant retrieval from in-memory cache if present
  if (memoryPdfCache.has(itemId)) {
    return memoryPdfCache.get(itemId);
  }
  if (absentPdfCache.has(itemId)) {
    return undefined;
  }

  const db = await openDB();
  const tx = db.transaction(STORE_PDF_BLOBS, 'readonly');
  const store = tx.objectStore(STORE_PDF_BLOBS);
  const request = store.get(itemId);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const result = request.result || undefined;
      if (result) {
        memoryPdfCache.set(itemId, result);
      } else {
        absentPdfCache.add(itemId);
      }
      resolve(result);
    };
    request.onerror = () => reject(request.error);
  });
}

/** Retrieve multiple PDF data URL blobs concurrently */
export async function loadMultiplePdfData(itemIds: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const toFetch: string[] = [];

  for (const id of itemIds) {
    if (memoryPdfCache.has(id)) {
      result[id] = memoryPdfCache.get(id)!;
    } else if (!absentPdfCache.has(id)) {
      toFetch.push(id);
    }
  }

  if (toFetch.length === 0) return result;

  await Promise.all(
    toFetch.map(async (id) => {
      const data = await loadPdfData(id);
      if (data) result[id] = data;
    })
  );

  return result;
}

/** Delete a specific PDF blob */
export async function deletePdfData(itemId: string): Promise<void> {
  memoryPdfCache.delete(itemId);
  absentPdfCache.add(itemId);

  const db = await openDB();
  const tx = db.transaction(STORE_PDF_BLOBS, 'readwrite');
  const store = tx.objectStore(STORE_PDF_BLOBS);
  store.delete(itemId);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Clear all PDF blobs */
export async function clearAllPdfData(): Promise<void> {
  memoryPdfCache.clear();
  absentPdfCache.clear();
  memoryVaultItemsCache.clear();
  const db = await openDB();
  const tx = db.transaction(STORE_PDF_BLOBS, 'readwrite');
  const store = tx.objectStore(STORE_PDF_BLOBS);
  store.clear();

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}


/** Clear ALL vault data (items + PDFs) — USE WITH CAUTION: destroys all tenants */
export async function clearAllVaultData(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([STORE_VAULT_ITEMS, STORE_PDF_BLOBS], 'readwrite');
  tx.objectStore(STORE_VAULT_ITEMS).clear();
  tx.objectStore(STORE_PDF_BLOBS).clear();

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Clear vault data for a SPECIFIC tenant only (items + associated PDFs). Other tenants' data is preserved. */
export async function clearVaultDataForTenant(tenantId: string): Promise<void> {
  const db = await openDB();

  // 1. Read all items, identify which belong to this tenant
  const readTx = db.transaction(STORE_VAULT_ITEMS, 'readonly');
  const readStore = readTx.objectStore(STORE_VAULT_ITEMS);
  const getAllReq = readStore.getAll();

  const tenantItemIds: string[] = await new Promise((resolve, reject) => {
    getAllReq.onsuccess = () => {
      const allItems: any[] = getAllReq.result || [];
      const ids = allItems.filter(item => item.tenantId === tenantId).map(item => item.id);
      resolve(ids);
    };
    getAllReq.onerror = () => reject(getAllReq.error);
  });

  // 2. Delete tenant's items and their associated PDF blobs
  const writeTx = db.transaction([STORE_VAULT_ITEMS, STORE_PDF_BLOBS], 'readwrite');
  const itemStore = writeTx.objectStore(STORE_VAULT_ITEMS);
  const blobStore = writeTx.objectStore(STORE_PDF_BLOBS);

  for (const id of tenantItemIds) {
    itemStore.delete(id);
    blobStore.delete(id);
  }

  return new Promise((resolve, reject) => {
    writeTx.oncomplete = () => resolve();
    writeTx.onerror = () => reject(writeTx.error);
  });
}

/**
 * Migrate existing localStorage data into IndexedDB (one-time).
 * After migration, removes the old localStorage key.
 */
export async function migrateFromLocalStorage(): Promise<any[]> {
  const key = 'bidocs_vault_items';
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
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

/**
 * Completely flush all localStorage, sessionStorage, and IndexedDB data
 */
export async function purgeEntireApplicationStorage(): Promise<void> {
  // 1. Clear Web Storages
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (_) {}

  // 2. Clear Vault IndexedDB
  await clearAllVaultData();

  // 3. Delete BiDOCS Database completely
  try {
    indexedDB.deleteDatabase(DB_NAME);
  } catch (_) {}

  console.log('[BiDOCS] Entire database and storage flushed successfully.');
}

// Expose on window for easy developer/user console access
if (typeof window !== 'undefined') {
  (window as any).flushBiDocsDatabase = purgeEntireApplicationStorage;
}

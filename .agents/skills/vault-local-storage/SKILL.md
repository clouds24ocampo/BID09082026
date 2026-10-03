---
name: vault-local-storage
description: Use when touching BiDOCS client storage - IndexedDB vault (src/utils/vaultIndexedDB.ts), SafeStorage (safeStorage.ts), LRU cache (lruCache.ts), tenant/project isolation, or merged package persistence. Triggers - quota errors, blank previews, data leaking between tenants or projects.
---

# Vault & Local Storage

## Layers
| Data | Store | Module |
|---|---|---|
| PDF binaries (data URLs) | IndexedDB `BiDOCS_VaultDB` v2, store `pdfBlobs` (key = item id) | `savePdfData / loadPdfData / loadMultiplePdfData / deletePdfData` |
| Item metadata (no binary) | IndexedDB store `vaultItems`, indexes `by_tenant`, `by_tenant_category`, `by_updated` | `upsertVaultItem(s) / loadVaultItems(tenantId) / saveVaultItems / deleteVaultItem` |
| Small config/JSON | localStorage via `safeSetItem / safeGetItem / safeSetJson / safeGetJson / safeRemoveItem` | `safeStorage.ts` |
| RAM buffer | `LRUCache` max 25 entries / 64MB in `vaultIndexedDB.ts` | `lruCache.ts` |
| Merged packages | `mergedBidPackages.ts` (`ORIGINAL / COPY_1 / COPY_2`) | |

## Rules
1. Never write base64/binary into localStorage. `sanitizeItemForStorage` strips `fileDataUrl` before metadata save.
2. Use `safeStorage` wrappers, never raw `localStorage` (quota + private mode throw).
3. Every read/write is scoped by `tenantId`; project data also by project ref (`getProjectStorageKey`). Pass `tenantId` to `loadVaultItems`/`upsertVaultItems`/`clearVaultDataForTenant`.
4. Bump `DB_VERSION` and add migration in `onupgradeneeded` for any schema change. Never drop stores silently.
5. `vacuumOrphanedBlobs()` removes blobs without metadata; `purgeEntireApplicationStorage()` is destructive, confirm first.
6. Tests: `src/utils/__tests__/vaultIndexedDB.test.ts`, `safeStorage.test.ts`, `scalabilityFramework.test.ts`, `mergedDocumentsRetention.test.ts`.

Note: Supabase is not wired into `src/`. Cloud sync is design-only; `server.js` is a small Express mock API.

/**
 * mergedBidPackages.ts
 * 
 * Manages storage, retrieval, and live synchronization of compiled merged PDF packages
 * per project and tenant. Backed by localStorage for metadata and IndexedDB for heavy PDF blobs.
 */

import { savePdfData, loadPdfData, deletePdfData } from './vaultIndexedDB';

export type FolderCopyType = 'ORIGINAL' | 'COPY_1' | 'COPY_2';

export interface MergedBidPackageRecord {
  id: string;
  tenantId: string;
  projectRefNo: string;
  projectTitle: string;
  envelope: 'ENVELOPE_1' | 'ENVELOPE_2' | 'ALL_ENVELOPES';
  folderCopy: FolderCopyType;
  fileName: string;
  fileSizeBytes: number;
  pageCount?: number;
  mergedAt: string;
  documentCount: number;
  scope: 'CURRENT_FOLDER' | 'ALL_ENVELOPES';
}

function getStorageKey(tenantId: string, projectRefOrId: string): string {
  const cleanRef = (projectRefOrId || 'default').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanTenant = (tenantId || 'default').trim();
  return `bidocs_merged_packages_${cleanTenant}_${cleanRef}`;
}

/**
 * Retrieve all merged bid package records for a project
 */
export function getProjectMergedPackages(tenantId: string, projectRefOrId: string): MergedBidPackageRecord[] {
  if (!projectRefOrId) return [];
  try {
    const key = getStorageKey(tenantId, projectRefOrId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.error('[mergedBidPackages] Failed to load merged packages:', e);
  }
  return [];
}

/**
 * Save or update a merged bid package record and optionally its binary PDF dataUrl into IndexedDB
 */
export async function saveProjectMergedPackage(
  tenantId: string,
  projectRefOrId: string,
  record: MergedBidPackageRecord,
  pdfDataUrl?: string
): Promise<void> {
  if (!projectRefOrId || !record.id) return;

  try {
    // 1. If PDF binary data is provided, persist it in IndexedDB
    if (pdfDataUrl) {
      await savePdfData(record.id, pdfDataUrl);
    }

    // 2. Save metadata in localStorage
    const key = getStorageKey(tenantId, projectRefOrId);
    const existing = getProjectMergedPackages(tenantId, projectRefOrId);
    const filtered = existing.filter(p => p.id !== record.id);
    const updated = [record, ...filtered];

    localStorage.setItem(key, JSON.stringify(updated));

    // 3. Broadcast live update across components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('bidocs:merged_packages_updated', {
          detail: { tenantId, projectRefNo: projectRefOrId, record }
        })
      );
    }
  } catch (e) {
    console.error('[mergedBidPackages] Failed to save merged package:', e);
  }
}

/**
 * Load the binary PDF data URL for a specific merged package from IndexedDB
 */
export async function loadMergedPackagePdf(packageId: string): Promise<string | undefined> {
  if (!packageId) return undefined;
  return await loadPdfData(packageId);
}

/**
 * Delete a specific merged package record and purge its binary blob from IndexedDB
 */
export async function deleteProjectMergedPackage(
  tenantId: string,
  projectRefOrId: string,
  packageId: string
): Promise<void> {
  if (!projectRefOrId || !packageId) return;

  try {
    // 1. Delete PDF blob from IndexedDB
    await deletePdfData(packageId);

    // 2. Remove metadata from localStorage
    const key = getStorageKey(tenantId, projectRefOrId);
    const existing = getProjectMergedPackages(tenantId, projectRefOrId);
    const updated = existing.filter(p => p.id !== packageId);

    localStorage.setItem(key, JSON.stringify(updated));

    // 3. Broadcast live update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('bidocs:merged_packages_updated', {
          detail: { tenantId, projectRefNo: projectRefOrId, deletedId: packageId }
        })
      );
    }
  } catch (e) {
    console.error('[mergedBidPackages] Failed to delete merged package:', e);
  }
}

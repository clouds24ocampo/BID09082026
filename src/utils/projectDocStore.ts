// Project-scoped document slots (win docs, final-payment docs, statutory forms).
// Same localStorage keys and IndexedDB blob keys the Project Status view already uses,
// so both views read and write the same data.
import { savePdfData, loadPdfData, deletePdfData } from './vaultIndexedDB';
import type { ProjectDocAttachment } from '../components/projects/ProjectProfileView';

export type ProjectDocCategory = 'WIN_DOCS' | 'FINAL_PAYMENT' | 'STATUTORY';
export type ProjectDocMeta = Record<string, ProjectDocAttachment>;

const META_PREFIX: Record<ProjectDocCategory, string> = {
  WIN_DOCS: 'bidocs_win_docs',
  FINAL_PAYMENT: 'bidocs_final_payment_docs',
  STATUTORY: 'bidocs_statutory_docs',
};

export const projectDocMetaKey = (cat: ProjectDocCategory, tenantId: string, scope: string) =>
  `${META_PREFIX[cat]}_${tenantId}_${scope}`;

export const projectDocBlobKey = (cat: ProjectDocCategory, tenantId: string, scope: string, slot: string) =>
  `proj_${cat.toLowerCase()}_${tenantId}_${scope}_${slot}`;

export const loadProjectDocMeta = (cat: ProjectDocCategory, tenantId: string, scope: string): ProjectDocMeta => {
  if (!tenantId || !scope) return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(projectDocMetaKey(cat, tenantId, scope)) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const writeMeta = (cat: ProjectDocCategory, tenantId: string, scope: string, meta: ProjectDocMeta) => {
  const clean: ProjectDocMeta = {};
  Object.keys(meta).forEach((k) => (clean[k] = { ...meta[k], fileDataUrl: undefined }));
  localStorage.setItem(projectDocMetaKey(cat, tenantId, scope), JSON.stringify(clean));
};

export const saveProjectDoc = async (
  cat: ProjectDocCategory,
  tenantId: string,
  scope: string,
  slotKey: string,
  slotTitle: string,
  file: { dataUrl: string; fileName: string; sizeBytes: number },
): Promise<ProjectDocMeta> => {
  await savePdfData(projectDocBlobKey(cat, tenantId, scope, slotKey), file.dataUrl);
  const meta = loadProjectDocMeta(cat, tenantId, scope);
  meta[slotKey] = {
    slotKey,
    slotTitle,
    category: cat,
    fileName: file.fileName,
    fileSizeBytes: file.sizeBytes,
    uploadedAt: new Date().toISOString(),
  };
  writeMeta(cat, tenantId, scope, meta);
  return meta;
};

export const deleteProjectDoc = async (
  cat: ProjectDocCategory,
  tenantId: string,
  scope: string,
  slotKey: string,
): Promise<ProjectDocMeta> => {
  try {
    await deletePdfData(projectDocBlobKey(cat, tenantId, scope, slotKey));
  } catch {}
  const meta = loadProjectDocMeta(cat, tenantId, scope);
  delete meta[slotKey];
  writeMeta(cat, tenantId, scope, meta);
  return meta;
};

export const loadProjectDocBlob = async (
  cat: ProjectDocCategory,
  tenantId: string,
  scope: string,
  slotKey: string,
): Promise<string | undefined> => {
  try {
    return await loadPdfData(projectDocBlobKey(cat, tenantId, scope, slotKey));
  } catch {
    return undefined;
  }
};

export const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Circle, Download, Eye, FileText, Trash2, Upload, X, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isProjectBidMergeDone, parseOpportunityList } from '../../utils/opportunityProjects';
import {
  deleteProjectDoc, loadProjectDocBlob, loadProjectDocMeta, ProjectDocCategory, ProjectDocMeta, readFileAsDataUrl, saveProjectDoc,
} from '../../utils/projectDocStore';
import { PAYMENT_DOC_ROWS, PAYMENT_SECTIONS, PaymentDocRow, PaymentSection } from '../../utils/paymentDocsCatalog';
import { FINAL_PAYMENT_DOC_SLOTS, STATUTORY_DOCUMENT_SLOTS } from '../projects/ProjectProfileView';
import { StatutoryModalHost } from '../vault/templates/StatutoryModalHost';

const WIN_SLOT_TITLES: Record<string, string> = {
  dole_cert: 'DOLE Certification / CSHP',
  performance_bond: 'Performance Security: PSD / Performance Bond',
};

type Metas = Record<ProjectDocCategory, ProjectDocMeta>;
const NO_METAS: Metas = { WIN_DOCS: {}, FINAL_PAYMENT: {}, STATUTORY: {} };

/** Where a checklist row's attachment lives. */
const locate = (row: PaymentDocRow): { cat: ProjectDocCategory; slot: string } =>
  row.source.kind === 'template'
    ? { cat: 'STATUTORY', slot: row.source.type.toLowerCase() }
    : { cat: row.source.category, slot: row.source.slot };

const slotTitle = (row: PaymentDocRow): string => {
  const { cat, slot } = locate(row);
  if (cat === 'STATUTORY') return STATUTORY_DOCUMENT_SLOTS.find((s) => s.key === slot)?.name || row.label;
  if (cat === 'FINAL_PAYMENT') return FINAL_PAYMENT_DOC_SLOTS.find((s) => s.key === slot)?.title || row.label;
  return WIN_SLOT_TITLES[slot] || row.label;
};

// Templates whose slot is upload-only (their modal is a file picker, not a form).
const isUploadOnlyTemplate = (row: PaymentDocRow): boolean =>
  row.source.kind === 'template' && !!STATUTORY_DOCUMENT_SLOTS.find((s) => s.key === locate(row).slot)?.isUploadOnly;

export const PaymentDocumentsView: React.FC = () => {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id || '';

  const [projects, setProjects] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [metas, setMetas] = useState<Metas>(NO_METAS);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ title: string; fileName: string; dataUrl: string } | null>(null);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const pendingUpload = useRef<PaymentDocRow | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    const all = parseOpportunityList(localStorage.getItem(`bidocs_opportunities_${tenantId}`));
    const won = all.filter((p) => isProjectBidMergeDone(tenantId, p));
    setProjects(won);
    setSelectedId((cur) => (won.some((p) => p.id === cur) ? cur : won[0]?.id || ''));
  }, [tenantId]);

  const project = projects.find((p) => p.id === selectedId) || null;
  const scope: string = project ? project.projectReferenceNumber || project.philgepsRefNo || '' : '';

  const reload = useCallback(() => {
    if (!tenantId || !scope) { setMetas(NO_METAS); return; }
    setMetas({
      WIN_DOCS: loadProjectDocMeta('WIN_DOCS', tenantId, scope),
      FINAL_PAYMENT: loadProjectDocMeta('FINAL_PAYMENT', tenantId, scope),
      STATUTORY: loadProjectDocMeta('STATUTORY', tenantId, scope),
    });
  }, [tenantId, scope]);
  useEffect(reload, [reload]);

  const attached = (row: PaymentDocRow): ProjectDocMeta[string] | undefined => {
    const { cat, slot } = locate(row);
    return metas[cat][slot];
  };

  const sections = useMemo(() => {
    const out = {} as Record<PaymentSection, { rows: PaymentDocRow[]; done: number }>;
    (Object.keys(PAYMENT_SECTIONS) as PaymentSection[]).forEach((s) => {
      const rows = PAYMENT_DOC_ROWS.filter((r) => r.section === s);
      out[s] = { rows, done: rows.filter((r) => attached(r)).length };
    });
    return out;
  }, [metas]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = PAYMENT_DOC_ROWS.length;
  const doneCount = PAYMENT_DOC_ROWS.filter((r) => attached(r)).length;

  const handleSaveTemplate = async (slotKey: string, dataUrl?: string, name?: string) => {
    setActiveModal(null);
    if (!dataUrl || !scope) return;
    try {
      const title = STATUTORY_DOCUMENT_SLOTS.find((s) => s.key === slotKey)?.name || name || slotKey.toUpperCase();
      await saveProjectDoc('STATUTORY', tenantId, scope, slotKey, title, {
        dataUrl,
        fileName: `${(name || slotKey).toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
        sizeBytes: Math.round((dataUrl.length * 3) / 4),
      });
    } catch (e) {
      setError('Could not save the document. Browser storage may be full.');
    }
    reload();
  };

  const handleFile = async (file: File | undefined) => {
    const row = pendingUpload.current;
    pendingUpload.current = null;
    if (!file || !row || !scope) return;
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name);
    if (!isPdf && !isImage) { setError('Please upload a PDF or an image (PNG, JPG, WEBP).'); return; }
    const { cat, slot } = locate(row);
    setBusyKey(row.key); setError('');
    try {
      await saveProjectDoc(cat, tenantId, scope, slot, slotTitle(row), { dataUrl: await readFileAsDataUrl(file), fileName: file.name, sizeBytes: file.size });
    } catch {
      setError('Could not save the file. Browser storage may be full.');
    }
    setBusyKey(''); reload();
  };

  const openPreview = async (row: PaymentDocRow) => {
    const { cat, slot } = locate(row);
    const dataUrl = await loadProjectDocBlob(cat, tenantId, scope, slot);
    if (!dataUrl) { setError('The saved file could not be found. Please upload or generate it again.'); return; }
    setPreview({ title: slotTitle(row), fileName: attached(row)?.fileName || `${slotTitle(row)}.pdf`, dataUrl });
  };

  const remove = async (row: PaymentDocRow) => {
    if (!confirm(`Remove "${slotTitle(row)}" from this project?`)) return;
    const { cat, slot } = locate(row);
    await deleteProjectDoc(cat, tenantId, scope, slot);
    reload();
  };

  const act = 'px-2.5 py-1 rounded-lg text-[11px] font-bold border transition flex items-center gap-1 cursor-pointer';

  return (
    <div className="space-y-6 animate-fadeIn">
      <input
        ref={fileInput} type="file" accept="application/pdf,image/*" className="hidden"
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
      />

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"><Wallet className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-black text-white">Payment Documents</h1>
            <p className="text-xs text-slate-400">Final-payment package checklist: generate the forms, attach the agency documents, and keep every number consistent.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            aria-label="Project"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono max-w-xs truncate"
          >
            {projects.length === 0 && <option value="">No awarded projects yet</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>[{p.projectReferenceNumber || p.philgepsRefNo}] {p.title}</option>
            ))}
          </select>
          <span className="px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 text-xs font-mono font-bold whitespace-nowrap">
            {doneCount} / {total} READY
          </span>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/40 text-red-200 text-xs px-4 py-2.5 flex justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {!project ? (
        <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-400">
          Payment documents are prepared for awarded projects. Mark a bid as won in Project Status, then return here.
        </div>
      ) : (
        (Object.keys(PAYMENT_SECTIONS) as PaymentSection[]).map((s) => (
          <section key={s} className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <header className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h2 className="text-sm font-bold text-white"><span className="text-emerald-400 font-mono mr-2">{s}.</span>{PAYMENT_SECTIONS[s]}</h2>
              <span className="text-[11px] font-mono text-slate-400">{sections[s].done} / {sections[s].rows.length}</span>
            </header>
            <ul className="divide-y divide-slate-800">
              {sections[s].rows.map((row) => {
                const meta = attached(row);
                const isTemplate = row.source.kind === 'template';
                const uploadOnly = isUploadOnlyTemplate(row);
                return (
                  <li key={row.key} className="px-5 py-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {meta ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /> : <Circle className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-100">{row.label}</p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">
                          {meta ? `${meta.fileName || 'Attached'} • ${meta.uploadedAt ? new Date(meta.uploadedAt).toLocaleDateString('en-PH') : ''}` : isTemplate && !uploadOnly ? 'Form not generated yet' : 'Not uploaded yet'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isTemplate && (
                        <button
                          onClick={() => setActiveModal((row.source as { type: string }).type)}
                          className={`${act} ${meta ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-blue-600 border-blue-500 text-white'}`}
                        >
                          {uploadOnly ? <Upload className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                          {meta ? 'Edit' : uploadOnly ? 'Upload' : 'Fill form'}
                        </button>
                      )}
                      {!isTemplate && (
                        <button
                          disabled={busyKey === row.key}
                          onClick={() => { pendingUpload.current = row; fileInput.current?.click(); }}
                          className={`${act} ${meta ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-blue-600 border-blue-500 text-white'} disabled:opacity-50`}
                        >
                          <Upload className="w-3 h-3" /> {busyKey === row.key ? 'Saving…' : meta ? 'Replace' : 'Upload'}
                        </button>
                      )}
                      {meta && (
                        <>
                          <button onClick={() => openPreview(row)} className={`${act} bg-slate-800 border-slate-700 text-slate-200`} aria-label={`Preview ${row.label}`}><Eye className="w-3 h-3" /></button>
                          <button onClick={() => remove(row)} className={`${act} bg-red-950/50 border-red-800/60 text-red-300`} aria-label={`Remove ${row.label}`}><Trash2 className="w-3 h-3" /></button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <StatutoryModalHost
        type={activeModal}
        tenant={currentTenant}
        project={project}
        onSave={handleSaveTemplate}
        onClose={() => { setActiveModal(null); reload(); }}
      />

      {preview && (
        <div className="fixed inset-0 z-200 bg-black/90 flex flex-col p-4 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl max-w-6xl mx-auto w-full">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-white">{preview.title}</h3>
                <p className="text-xs text-slate-400 font-mono">{preview.fileName}</p>
              </div>
              <div className="flex items-center gap-2">
                <a href={preview.dataUrl} download={preview.fileName} className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
                <button onClick={() => setPreview(null)} aria-label="Close preview" className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="flex-1 bg-slate-950 p-2 overflow-auto flex items-center justify-center">
              {preview.dataUrl.startsWith('data:image/') ? (
                <img src={preview.dataUrl} alt={preview.title} className="max-w-full max-h-full object-contain" />
              ) : (
                <object type="application/pdf" data={preview.dataUrl} className="w-full h-full min-h-125 border-none bg-slate-900 rounded-xl" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentDocumentsView;

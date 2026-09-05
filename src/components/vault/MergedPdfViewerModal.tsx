import React, { useState } from 'react';
import { DocumentVaultItem, Tenant } from '../../types';
import { DocumentCoverPage } from './DocumentCoverPage';
import { exportMergedThreeLayerPdf, ExportDocumentUnit } from '../../utils/pdfExportEngine';
import { 
  X, 
  Layers, 
  Printer, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2, 
  FileText, 
  GripVertical,
  ShieldCheck,
  Plus,
  FolderPlus,
  Trash2,
  SlidersHorizontal,
  Download
} from 'lucide-react';

interface MergedPdfViewerModalProps {
  selectedItems: DocumentVaultItem[];
  tenant: Tenant | null;
  onClose: () => void;
}

export const MergedPdfViewerModal: React.FC<MergedPdfViewerModalProps> = ({ selectedItems, tenant, onClose }) => {
  // Bundle Organization State: Record of bundleId -> DocumentVaultItem[]
  const [bundles, setBundles] = useState<Record<string, DocumentVaultItem[]>>({
    'Bundle 1': selectedItems,
    'Bundle 2': [],
    'Bundle 3': []
  });

  const [activeBundle, setActiveBundle] = useState<string>('Bundle 1');
  const [activeTab, setActiveTab] = useState<'ORGANIZER' | 'PREVIEW'>('ORGANIZER');

  const moveItemInBundle = (bundleName: string, index: number, direction: 'UP' | 'DOWN') => {
    const list = [...(bundles[bundleName] || [])];
    if (direction === 'UP' && index === 0) return;
    if (direction === 'DOWN' && index === list.length - 1) return;

    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    setBundles(prev => ({ ...prev, [bundleName]: list }));
  };

  const moveItemToBundle = (item: DocumentVaultItem, fromBundle: string, toBundle: string) => {
    if (fromBundle === toBundle) return;
    setBundles(prev => {
      const fromList = (prev[fromBundle] || []).filter(i => i.id !== item.id);
      const toList = [...(prev[toBundle] || []), item];
      return {
        ...prev,
        [fromBundle]: fromList,
        [toBundle]: toList
      };
    });
  };

  const addNewBundle = () => {
    const nextNum = Object.keys(bundles).length + 1;
    const newName = `Bundle ${nextNum}`;
    setBundles(prev => ({ ...prev, [newName]: [] }));
    setActiveBundle(newName);
  };

  const handlePrintBundle = () => {
    window.print();
  };

  const handleExportBundle = async () => {
    const items = bundles[activeBundle] || [];
    if (items.length === 0) return;

    const coverElements = Array.from(document.querySelectorAll('.print-document-sheet')) as HTMLElement[];

    const units: ExportDocumentUnit[] = items.map((doc, idx) => ({
      title: doc.documentName,
      coverElement: coverElements[idx] || null,
      fileDataUrl: doc.fileDataUrl,
      documentName: doc.documentName
    }));

    const today = new Date().toISOString().split('T')[0];
    const activeRef = items[0]?.philgepsRefNo || 'PACKAGE';
    const fileName = `${activeRef}_${activeBundle.replace(/\s+/g, '_')}_${today}.pdf`;

    await exportMergedThreeLayerPdf(units, fileName);
  };

  const currentBundleItems = bundles[activeBundle] || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[95vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/95 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight flex items-center gap-2">
                <span>Document Bundle Organizer & Merged PDF Compiler</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Organize documents into bundles (Bundle 1, Bundle 2, Bundle 3), set custom order, and compile into Legal (8.5" × 13") merged PDF packages.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('ORGANIZER')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === 'ORGANIZER' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Bundle Organizer
              </button>
              <button
                onClick={() => setActiveTab('PREVIEW')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === 'PREVIEW' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Preview Merged {activeBundle}
              </button>
            </div>

            <button
              onClick={handleExportBundle}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Export {activeBundle} to PDF</span>
            </button>

            <button
              onClick={handlePrintBundle}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print {activeBundle} (Legal 13" × 8.5")</span>
            </button>

            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BUNDLE SELECTION TABS BAR */}
        <div className="p-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-2">
            {Object.keys(bundles).map((bName) => (
              <button
                key={bName}
                onClick={() => setActiveBundle(bName)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition flex items-center gap-2 ${
                  activeBundle === bName 
                    ? 'bg-blue-600 text-white shadow-md border border-blue-400' 
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>{bName}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/60 font-bold">
                  {bundles[bName]?.length || 0}
                </span>
              </button>
            ))}

            <button
              onClick={addNewBundle}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600/20 border border-blue-500/30 transition flex items-center gap-1"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Add Bundle</span>
            </button>
          </div>

          <span className="text-slate-400 text-xs font-mono shrink-0">
            Active Bundle: <strong className="text-white">{activeBundle}</strong> ({currentBundleItems.length} Docs)
          </span>
        </div>

        {/* TAB 1: BUNDLE ORGANIZER & REORDERING */}
        {activeTab === 'ORGANIZER' && (
          <div className="p-6 overflow-y-auto flex-1 bg-slate-950 space-y-4">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Assign documents to <strong className="text-white font-mono">Bundle 1, Bundle 2, or Bundle 3</strong> and set the exact compilation order using the <strong className="text-white font-mono">Move Up / Move Down</strong> controls. Each document prepends a Legal (8.5" × 13") Front Cover Page.</span>
              </div>
            </div>

            {currentBundleItems.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/50 space-y-2">
                <Layers className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-white">No documents assigned to {activeBundle}</h4>
                <p className="text-xs text-slate-400">Select another bundle or move documents into {activeBundle} using the dropdown selectors below.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentBundleItems.map((doc, idx) => (
                  <div 
                    key={doc.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4 text-xs hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 font-mono font-bold flex items-center justify-center border border-blue-500/30">
                        #{idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-white text-sm">{doc.documentName}</h4>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {doc.documentNumber ? `No: ${doc.documentNumber} • ` : ''}
                          Category: {doc.category.replace('_', ' ')} • v{doc.versionNumber}.0
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Bundle Assign Dropdown */}
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-500 font-mono">Move to:</span>
                        <select
                          value={activeBundle}
                          onChange={(e) => moveItemToBundle(doc, activeBundle, e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-xs font-mono focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          {Object.keys(bundles).map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>

                      {/* Move Up / Move Down Sequence Controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveItemInBundle(activeBundle, idx, 'UP')}
                          disabled={idx === 0}
                          className={`p-2 rounded-lg border transition ${
                            idx === 0 
                              ? 'bg-slate-950 text-slate-700 border-slate-900 cursor-not-allowed' 
                              : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700'
                          }`}
                          title="Move Up in Sequence"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => moveItemInBundle(activeBundle, idx, 'DOWN')}
                          disabled={idx === currentBundleItems.length - 1}
                          className={`p-2 rounded-lg border transition ${
                            idx === currentBundleItems.length - 1 
                              ? 'bg-slate-950 text-slate-700 border-slate-900 cursor-not-allowed' 
                              : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700'
                          }`}
                          title="Move Down in Sequence"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 text-right">
              <button
                onClick={() => setActiveTab('PREVIEW')}
                disabled={currentBundleItems.length === 0}
                className={`px-5 py-2.5 rounded-xl text-xs font-semibold text-white transition shadow-xl ${
                  currentBundleItems.length === 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                Proceed to Preview Merged {activeBundle} →
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: PREVIEW MERGED PACKAGE FOR ACTIVE BUNDLE */}
        {activeTab === 'PREVIEW' && (
          <div className="p-6 overflow-y-auto flex-1 bg-slate-950 space-y-12 text-center">
            {currentBundleItems.map((doc, idx) => (
              <div key={doc.id} className="space-y-6 max-w-[1180px] mx-auto border-b-2 border-slate-800 pb-12">
                <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-blue-400 bg-blue-900/40 px-4 py-1.5 rounded-full border border-blue-500/30">
                  <span>{activeBundle.toUpperCase()} — DOCUMENT #{idx + 1}: {doc.documentName}</span>
                </div>
                
                {/* Page 1: Front Cover Page (Legal 13" x 8.5") */}
                <DocumentCoverPage item={doc} tenant={tenant} incrementNumber={idx + 1} />

                {/* Page 2+: Content Page (Legal 13" x 8.5" Fit-to-Page) */}
                <div className="space-y-2 pt-2">
                  <div className="text-[11px] font-mono text-slate-400">
                    <span>DOCUMENT CONTENT STREAM — Legal (8.5" × 13") Fit-to-Page</span>
                  </div>
                  {doc.fileDataUrl ? (
                    <div className="single-page-paper w-full min-h-[760px] aspect-[13/8.5] rounded-2xl overflow-hidden border-2 border-slate-800 bg-slate-900 shadow-2xl mx-auto p-2">
                      <iframe
                        src={doc.fileDataUrl}
                        title={doc.documentName}
                        className="w-full h-full border-none object-contain"
                      />
                    </div>
                  ) : (
                    <div className="single-page-paper w-full aspect-[13/8.5] min-h-[760px] border-2 border-dashed border-slate-800 rounded-2xl bg-white text-slate-900 p-8 flex flex-col items-center justify-center space-y-4 shadow-2xl mx-auto">
                      <FileText className="w-16 h-16 text-blue-900 opacity-90 mx-auto" />
                      <div className="space-y-2 text-center">
                        <h4 className="text-base font-black uppercase text-slate-950">{doc.documentName} Content Active</h4>
                        <p className="text-xs font-mono text-slate-700 leading-relaxed max-w-md mx-auto">
                          Document content auto-scaled to Legal size (13" × 8.5") landscape without margin cut-offs or grid shifting.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 flex items-center justify-between bg-slate-900/95 text-xs text-slate-400 sticky bottom-0 z-10 shrink-0">
          <span className="font-mono text-[11px]">
            {activeBundle}: <strong className="text-white">{currentBundleItems.length} Documents Compiled</strong>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
          >
            Close Bundle Organizer
          </button>
        </div>

      </div>
    </div>
  );
};

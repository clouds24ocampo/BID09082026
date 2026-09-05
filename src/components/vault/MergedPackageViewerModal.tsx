import React, { useState, useEffect, useRef } from 'react';
import { PackageItem, FolderCopyType } from '../bids/bidpackage';
import { DocumentVaultItem, Tenant } from '../../types';
import { DocumentCoverPage } from './DocumentCoverPage';
import { 
  buildMergedThreeLayerPdfDataUrl, 
  exportMergedThreeLayerPdf, 
  ExportDocumentUnit 
} from '../../utils/pdfExportEngine';
import { loadPdfData } from '../../utils/vaultIndexedDB';
import { PDFDocument } from 'pdf-lib';
import { 
  X, 
  Folder, 
  FolderOpen, 
  Download, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  Layers, 
  Eye, 
  Printer, 
  FileStack, 
  Sparkles, 
  Copy,
  ChevronRight,
  ShieldCheck,
  Maximize2
} from 'lucide-react';
import DocumentQrCode from '../common/DocumentQrCode';

interface MergedPackageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: PackageItem[];
  vaultDocs: DocumentVaultItem[];
  tenant: Tenant | null;
  activeProject: any;
  projectRefNo: string;
  projectTitle: string;
  procuringEntity: string;
  activeEnvelope: 'ENVELOPE_1' | 'ENVELOPE_2';
  initialFolderCopy?: FolderCopyType;
}

export const MergedPackageViewerModal: React.FC<MergedPackageViewerModalProps> = ({
  isOpen,
  onClose,
  items,
  vaultDocs,
  tenant,
  activeProject,
  projectRefNo,
  projectTitle,
  procuringEntity,
  activeEnvelope,
  initialFolderCopy = 'ORIGINAL'
}) => {
  const [activeFolder, setActiveFolder] = useState<FolderCopyType>(initialFolderCopy);
  const [compiledPdfs, setCompiledPdfs] = useState<Record<FolderCopyType, string | null>>({
    ORIGINAL: null,
    COPY_1: null,
    COPY_2: null
  });
  const [isCompiling, setIsCompiling] = useState<Record<FolderCopyType, boolean>>({
    ORIGINAL: false,
    COPY_1: false,
    COPY_2: false
  });
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [compileProgress, setCompileProgress] = useState<{
    percent: number;
    status: string;
    currentDoc: number;
    totalDocs: number;
  }>({
    percent: 0,
    status: '',
    currentDoc: 0,
    totalDocs: 0
  });
  const [isExportingAll, setIsExportingAll] = useState<boolean>(false);
  const [docPageCounts, setDocPageCounts] = useState<Record<string, number>>({});

  const tenantId = tenant?.id || '';
  const projectScopeKey = activeProject?.refNo || projectRefNo || 'PRJ-2026';
  const cleanRef = projectScopeKey.replace(/[^a-zA-Z0-9]/g, '_');
  const envTag = activeEnvelope === 'ENVELOPE_1' ? 'TECHNICAL_LEGAL' : 'FINANCIAL';

  // Folders configuration
  const folderTabs: { id: FolderCopyType; title: string; badge: string; desc: string; color: string }[] = [
    {
      id: 'ORIGINAL',
      title: 'ORIGINAL BID FILE',
      badge: 'Main Submission',
      desc: 'Official Original Sealed Copy',
      color: 'blue'
    },
    {
      id: 'COPY_1',
      title: 'COPY 1 BID FILE',
      badge: 'Duplicate Copy',
      desc: 'Certified True Copy 1',
      color: 'emerald'
    },
    {
      id: 'COPY_2',
      title: 'COPY 2 BID FILE',
      badge: 'Triplicate Copy',
      desc: 'Certified True Copy 2',
      color: 'purple'
    }
  ];

  // Helper to compute exact page range for each document item in the merged bundle
  const getDocumentPageRange = (itemIndex: number) => {
    // Page 1 is always the Table of Contents
    let startPage = 2;
    for (let i = 0; i < itemIndex; i++) {
      const pastItem = items[i];
      const attachedPages = docPageCounts[pastItem.id] || 1;
      // 1 Cover Page + attachedPages
      const totalPagesForPastItem = 1 + attachedPages;
      startPage += totalPagesForPastItem;
    }
    const currentItem = items[itemIndex];
    const currentAttachedPages = currentItem ? (docPageCounts[currentItem.id] || 1) : 1;
    const endPage = startPage + (1 + currentAttachedPages) - 1;
    return {
      startPage,
      endPage,
      pageText: startPage === endPage ? `Page ${startPage}` : `Page ${startPage} to ${endPage}`
    };
  };

  // Comprehensive Resolver for Attached Document Streams (Section VII, Section VI, BSD, OSS, Vault & Templates)
  const resolveAttachmentForDoc = async (doc: PackageItem): Promise<string | null> => {
    const dName = (doc.documentName || '').toLowerCase();
    
    // 1. Direct Vault Item match by ID
    if (doc.vaultDocId) {
      const linked = vaultDocs.find(v => v.id === doc.vaultDocId);
      if (linked?.fileDataUrl) return linked.fileDataUrl;
      try {
        const data = await loadPdfData(doc.vaultDocId);
        if (data) return data;
      } catch (_) {}
    }

    // 2. Direct match by doc.id
    if (doc.id) {
      try {
        const data = await loadPdfData(doc.id);
        if (data) return data;
      } catch (_) {}
    }

    // 3. Vault Item match by Name
    const matchedVault = vaultDocs.find(v => {
      const vName = (v.documentName || '').toLowerCase();
      return vName === dName || vName.includes(dName) || dName.includes(vName);
    });
    if (matchedVault?.fileDataUrl) return matchedVault.fileDataUrl;
    if (matchedVault?.id) {
      try {
        const data = await loadPdfData(matchedVault.id);
        if (data) return data;
      } catch (_) {}
    }

    // 4. Check completed notarized & statutory forms in localStorage
    try {
      const raw = localStorage.getItem(`bidocs_completed_notarized_${tenantId || 'default'}`);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const found = parsed.find(f => {
            const fTitle = (f.title || '').toLowerCase();
            const fCode = (f.formCode || '').toUpperCase();
            if (f.id === doc.vaultDocId || f.id === doc.id) return true;
            if (fTitle === dName || fTitle.includes(dName) || dName.includes(fTitle)) return true;

            if ((dName.includes('section vii') || dName.includes('technical specifications') || dName.includes('tech spec')) &&
                (fCode === 'SEC-VII' || fTitle.includes('section vii') || fTitle.includes('technical specifications'))) {
              return true;
            }
            if ((dName.includes('section vi') || dName.includes('schedule of requirements')) &&
                (fCode === 'SEC-VI' || fTitle.includes('section vi') || fTitle.includes('schedule of requirements'))) {
              return true;
            }
            if ((dName.includes('omnibus') || dName.includes('oss')) && (fCode === 'GPPB-OSS-2025' || fTitle.includes('omnibus'))) return true;
            if ((dName.includes('bid securing') || dName.includes('bsd')) && (fCode === 'GPPB-BSD-2025' || fTitle.includes('bid securing'))) return true;
            if (dName.includes('slcc') && (fCode.includes('SLCC') || fTitle.includes('slcc'))) return true;
            if (dName.includes('ongoing') && (fCode.includes('ONGOING') || fTitle.includes('ongoing'))) return true;
            if (dName.includes('nfcc') && (fCode.includes('NFCC') || fTitle.includes('nfcc'))) return true;
            if (dName.includes('framework') && (fCode.includes('FAL') || fTitle.includes('framework'))) return true;
            return false;
          });

          if (found) {
            if (found.fileDataUrl) return found.fileDataUrl;
            if (found.id) {
              const data = await loadPdfData(found.id);
              if (data) return data;
            }
          }
        }
      }
    } catch (_) {}

    // 5. Check project-scoped indexedDB keys
    const candidateKeys = [
      `tech_specs_${tenantId}_${projectScopeKey}`,
      `tech_specs_${tenantId}_${projectRefNo}`,
      `sec_vi_${tenantId}_${projectScopeKey}`,
      `fal_${tenantId}_${projectScopeKey}`,
      `nfcc_${tenantId}_${projectScopeKey}`,
      `slcc_${tenantId}_${projectScopeKey}`,
      `ongoing_${tenantId}_${projectScopeKey}`,
      `bsd_${tenantId}_${projectScopeKey}`,
      `oss_${tenantId}_${projectScopeKey}`,
      `priceschedule_${tenantId}_${projectScopeKey}`,
      `bidform_${tenantId}_${projectScopeKey}`,
      `boq_${tenantId}_${projectScopeKey}`,
      `estimates_${tenantId}_${projectScopeKey}`,
      `cashflow_${tenantId}_${projectScopeKey}`,
      `summarybid_${tenantId}_${projectScopeKey}`
    ];

    const idbResults = await Promise.all(
      candidateKeys.map(async (k) => {
        try {
          const data = await loadPdfData(k);
          if (data) return data;
        } catch (_) {}
        return null;
      })
    );
    const foundData = idbResults.find(res => Boolean(res));
    if (foundData) return foundData;

    return null;
  };

  // Helper to compile a specific folder copy into a merged PDF Data URL
  const compileFolderPdf = async (folderCopy: FolderCopyType): Promise<string | null> => {
    if (items.length === 0) return null;

    setIsCompiling(prev => ({ ...prev, [folderCopy]: true }));
    setStatusMessage(`Compiling ${folderCopy} package...`);

    try {
      const units: ExportDocumentUnit[] = [];

      // 1. FIRST PAGE: Table of Contents & Statutory Checklist for this Folder Copy
      const tocElem = document.getElementById(`preview-toc-${folderCopy}`) as HTMLElement | null;
      if (tocElem) {
        units.push({
          title: `Table of Contents (${folderCopy})`,
          coverElement: tocElem,
          fileDataUrl: null,
          documentName: `Table of Contents — ${folderCopy}`
        });
      }

      // Pre-resolve all attachments in parallel
      const resolvedAttachments = await Promise.all(
        items.map(doc => resolveAttachmentForDoc(doc))
      );

      // 2. Subsequent Pages: Included Documents with Cover Separators and Attached PDF Streams
      for (let i = 0; i < items.length; i++) {
        const doc = items[i];
        const fileDataUrl = resolvedAttachments[i];

        // Cover Page Element rendered specifically for this folder copy
        const coverElem = document.getElementById(`preview-cover-${folderCopy}-${doc.id}`) as HTMLElement | null;

        units.push({
          title: doc.documentName,
          coverElement: coverElem || null,
          fileDataUrl: fileDataUrl || null,
          documentName: doc.documentName
        });
      }

      setCompileProgress(prev => ({
        ...prev,
        percent: 85,
        status: `Stamping "Page X of Y" pagination on ${folderCopy} package...`
      }));
      setStatusMessage(`Stamping "Page X of Y" pagination on ${folderCopy} package...`);
      
      const outputFileName = `${cleanRef}_${folderCopy}_${envTag}_MERGED_PACKAGE.pdf`;
      const dataUrl = await buildMergedThreeLayerPdfDataUrl(
        units,
        outputFileName,
        (progress) => {
          setCompileProgress(progress);
          setStatusMessage(progress.status);
        }
      );

      setCompiledPdfs(prev => ({ ...prev, [folderCopy]: dataUrl }));
      setStatusMessage(`Merged ${folderCopy} package ready.`);
      return dataUrl;
    } catch (err) {
      console.error(`Error compiling ${folderCopy} package:`, err);
      setStatusMessage(`Error compiling ${folderCopy} package.`);
      return null;
    } finally {
      setIsCompiling(prev => ({ ...prev, [folderCopy]: false }));
    }
  };

  // Compile on-demand ONLY for the currently active folder copy
  useEffect(() => {
    if (!isOpen) return;

    if (!compiledPdfs[activeFolder] && !isCompiling[activeFolder]) {
      compileFolderPdf(activeFolder);
    }
  }, [isOpen, activeFolder]);

  if (!isOpen) return null;

  // Single Download Trigger
  const handleDownloadCopy = async (folderCopy: FolderCopyType) => {
    let dataUrl = compiledPdfs[folderCopy];
    if (!dataUrl) {
      dataUrl = await compileFolderPdf(folderCopy);
    }
    if (!dataUrl) return;

    const outputFileName = `${cleanRef}_${folderCopy}_${envTag}_MERGED_PACKAGE.pdf`;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = outputFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Batch Download All 3 Copies
  const handleDownloadAllThreeCopies = async () => {
    setIsExportingAll(true);
    const copies: FolderCopyType[] = ['ORIGINAL', 'COPY_1', 'COPY_2'];
    for (const copy of copies) {
      await handleDownloadCopy(copy);
      // Small pause between downloads to let browser handle files cleanly
      await new Promise(r => setTimeout(r, 600));
    }
    setIsExportingAll(false);
  };

  const currentPdfDataUrl = compiledPdfs[activeFolder];
  const isCurrentCompiling = isCompiling[activeFolder];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col">
        
        {/* TOP HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/95 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <FileStack className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white leading-tight">
                  Merged Bid Packages Folder
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  {activeEnvelope === 'ENVELOPE_1' ? 'Envelope 1 (Legal & Technical)' : 'Envelope 2 (Financial)'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xl">
                Project: <span className="text-slate-200 font-medium">{projectTitle || activeProject?.title}</span> ({projectScopeKey})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Download This Copy Button */}
            <button
              onClick={() => handleDownloadCopy(activeFolder)}
              disabled={isCurrentCompiling}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title={`Download ${activeFolder} merged package`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {activeFolder} PDF</span>
            </button>

            {/* Download All 3 Copies Button */}
            <button
              onClick={handleDownloadAllThreeCopies}
              disabled={isExportingAll || isCurrentCompiling}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition shadow-lg shadow-purple-950/40 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border border-purple-400/30"
              title="Download all 3 copies (ORIGINAL, COPY 1, COPY 2)"
            >
              {isExportingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-200" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-purple-200" />
              )}
              <span>Download All 3 Copies</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3 FOLDERS NAVIGATION TABS */}
        <div className="px-4 sm:px-6 py-3 bg-slate-950/80 border-b border-slate-800 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {folderTabs.map((tab) => {
              const isSelected = activeFolder === tab.id;
              const isReady = !!compiledPdfs[tab.id];
              const isLoading = isCompiling[tab.id];

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFolder(tab.id)}
                  className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? tab.id === 'ORIGINAL'
                        ? 'bg-blue-950/50 border-blue-500/80 ring-1 ring-blue-500/60 shadow-lg'
                        : tab.id === 'COPY_1'
                          ? 'bg-emerald-950/50 border-emerald-500/80 ring-1 ring-emerald-500/60 shadow-lg'
                          : 'bg-purple-950/50 border-purple-500/80 ring-1 ring-purple-500/60 shadow-lg'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-lg ${
                      isSelected 
                        ? 'bg-white/10 text-white' 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isSelected ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">{tab.title}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {tab.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">{tab.desc}</p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {isLoading ? (
                      <div className="flex items-center gap-1 text-[10px] text-purple-400 font-mono">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Compiling</span>
                      </div>
                    ) : isReady ? (
                      <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Ready</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500">Pending</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* MAIN BODY: SPLIT VIEW (DOCUMENTS SEQUENCE ON LEFT, INTERACTIVE PDF VIEWER ON RIGHT) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-[550px]">
          
          {/* LEFT SIDEBAR: Arranged Documents Checklist */}
          <div className="lg:col-span-4 border-r border-slate-800 bg-slate-950/50 p-4 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300">
                Package Contents ({items.length} Documents)
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Exact Arranged Sequence
              </span>
            </div>

            <div className="space-y-2">
              {items.map((doc, idx) => (
                <div
                  key={doc.id}
                  className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5"
                >
                  <span className="w-5 h-5 rounded bg-slate-800 text-blue-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{doc.documentName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                        doc.category === 'LEGAL'
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                          : doc.category === 'TECHNICAL'
                            ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {doc.category}
                      </span>
                      <span className="text-[9px] text-slate-400">Cover Separator + Attached File</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 text-[11px] text-blue-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Automatic 100% Synchronization</span>
              </p>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                All 3 copies (Original, Copy 1, Copy 2) share the identical document list and order, each cleanly formatted with their official copy file designation and page-of-pages pagination.
              </p>
            </div>
          </div>

          {/* RIGHT VIEWPORT: Interactive Full PDF Previewer */}
          <div className="lg:col-span-8 bg-slate-950 flex flex-col items-center justify-center p-3 relative overflow-hidden">
            {isCurrentCompiling ? (
              <div className="w-full max-w-md p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl space-y-5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 animate-pulse">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white leading-tight">
                        Merging {activeFolder} Package...
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {compileProgress.currentDoc > 0 
                          ? `Document ${compileProgress.currentDoc} of ${compileProgress.totalDocs || items.length}` 
                          : 'Preparing documents & cover sheets...'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black font-mono text-purple-400">
                      {Math.min(100, Math.max(0, compileProgress.percent))}%
                    </span>
                  </div>
                </div>

                {/* ANIMATED GLOWING PROGRESS BAR */}
                <div className="space-y-1.5">
                  <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5 relative shadow-inner">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-300 ease-out shadow-[0_0_12px_rgba(168,85,247,0.6)]"
                      style={{ width: `${Math.min(100, Math.max(5, compileProgress.percent))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>PDF Merging Engine</span>
                    <span>Legal 8.5" × 13" High-Speed</span>
                  </div>
                </div>

                {/* CURRENT ACTIVE STEP STATUS */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2.5 text-xs font-mono text-slate-300">
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
                  <span className="truncate">{compileProgress.status || statusMessage || 'Processing documents...'}</span>
                </div>
              </div>
            ) : currentPdfDataUrl ? (
              <div className="w-full h-full flex flex-col rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
                {/* Viewport Top Bar */}
                <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300 font-medium">
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    <span>Live PDF Preview: <strong className="text-white">{activeFolder} COPY</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={currentPdfDataUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 flex items-center gap-1.5 transition"
                      title="Open PDF in new browser tab"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Open in Tab</span>
                    </a>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      ✓ Complete 8.5" × 13" Legal Bundle
                    </span>
                  </div>
                </div>

                {/* Embedded PDF Viewer */}
                <div className="flex-1 w-full bg-slate-900 relative min-h-[500px]">
                  <iframe
                    src={`${currentPdfDataUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                    className="w-full h-full border-none bg-slate-900"
                    title={`Merged PDF Preview for ${activeFolder}`}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3 p-8 text-slate-500">
                <FileText className="w-12 h-12 mx-auto text-slate-600" />
                <p className="text-xs">No preview ready yet. Click compile or select a folder tab.</p>
                <button
                  onClick={() => compileFolderPdf(activeFolder)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition shadow"
                >
                  Compile {activeFolder} Now
                </button>
              </div>
            )}
          </div>

        </div>

        {/* OFF-SCREEN HIDDEN CONTAINER FOR RENDERING FOLDER-SPECIFIC COVER PAGES */}
        <div 
          className="fixed left-0 top-0 pointer-events-none opacity-0 overflow-hidden" 
          style={{ width: '816px', zIndex: -9999 }}
          aria-hidden="true"
        >
          {(['ORIGINAL', 'COPY_1', 'COPY_2'] as FolderCopyType[]).map((fCopy) => (
            <div key={`hidden-group-${fCopy}`}>
              {/* Table of Contents DOM element for this folder copy */}
              <div
                id={`preview-toc-${fCopy}`}
                style={{ width: '800px', minHeight: '1100px' }}
                className="bg-white text-black p-8 border-4 border-black font-sans flex flex-col justify-between"
              >
                <div>
                  {/* Company Header */}
                  <div className="text-center border-b-2 border-black pb-3 space-y-1">
                    <h1 className="text-2xl font-black uppercase tracking-wider text-black">
                      {tenant?.companyName || 'BIDDING ENTERPRISE CORPORATION'}
                    </h1>
                    <p className="text-xs text-slate-700 font-medium">
                      {tenant?.address || 'Metro Manila, Philippines'} • TIN: <span className="font-mono font-bold">{tenant?.tin || '000-000-000-000'}</span> • PhilGEPS: <span className="font-bold text-blue-950">{tenant?.philgepsPlatinumNo || 'PLAT-2026-ACTIVE'}</span>
                    </p>
                  </div>

                  {/* TOC Banner */}
                  <div className="my-4 space-y-2">
                    <div className="p-3 border-2 border-black bg-slate-900 text-white rounded-xl flex items-center justify-between gap-3 text-left">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-black uppercase tracking-wider text-amber-300">
                            TABLE OF CONTENTS & STATUTORY CHECKLIST
                          </h2>
                          <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[11px] font-mono font-black uppercase">
                            ★ {fCopy === 'ORIGINAL' ? 'ORIGINAL COPY' : fCopy === 'COPY_1' ? 'COPY 1 (DUPLICATE)' : 'COPY 2 (TRIPLICATE)'}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-300 font-medium">
                          {activeEnvelope === 'ENVELOPE_1' ? 'ENVELOPE 1: ELIGIBILITY & TECHNICAL COMPONENT' : 'ENVELOPE 2: FINANCIAL BID PROPOSAL'}
                        </p>
                      </div>
                      <div className="text-right text-[11px] font-mono text-slate-300">
                        <div><strong>PhilGEPS Ref:</strong> {projectRefNo}</div>
                        <div><strong className="text-emerald-400">ABC:</strong> {activeProject?.abc || '₱0.00'}</div>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="border-2 border-black overflow-hidden rounded-xl">
                      <table className="w-full text-left text-xs border-collapse font-sans">
                        <thead>
                          <tr className="bg-black text-white font-mono font-bold text-[11px]">
                            <th className="p-2 border-r border-slate-700 w-16 text-center">Tab #</th>
                            <th className="p-2 border-r border-slate-700">Document Title / Statutory Specification</th>
                            <th className="p-2 border-r border-slate-700 w-28 text-center">Category</th>
                            <th className="p-2 border-r border-slate-700 w-28 text-center">Copy</th>
                            <th className="p-2 w-36 text-center">Page Range in Bundle</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                                (No documents attached)
                              </td>
                            </tr>
                          ) : (
                            items.map((doc, idx) => {
                              const range = getDocumentPageRange(idx);
                              return (
                                <tr key={doc.id} className="border-t border-slate-300 text-[11px]">
                                  <td className="p-2 border-r border-slate-300 text-center font-mono font-bold bg-slate-100">
                                    TAB {idx + 1}
                                  </td>
                                  <td className="p-2 border-r border-slate-300 font-bold text-slate-950">
                                    {doc.documentName}
                                  </td>
                                  <td className="p-2 border-r border-slate-300 text-center font-mono text-[10px] text-slate-700 font-semibold">
                                    {doc.category}
                                  </td>
                                  <td className="p-2 border-r border-slate-300 text-center font-mono text-[10px] font-bold text-slate-950 bg-slate-50">
                                    {fCopy === 'ORIGINAL' ? 'ORIGINAL COPY' : fCopy === 'COPY_1' ? 'COPY 1' : 'COPY 2'}
                                  </td>
                                  <td className="p-2 text-center font-mono font-black text-slate-950 text-[10.5px] bg-amber-50/50">
                                    <span className="px-2 py-0.5 rounded border border-black/40 bg-white shadow-xs">
                                      {range.pageText}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t-2 border-black pt-3 flex items-center justify-between text-xs mt-6">
                  <div className="space-y-0.5 text-left">
                    <p className="text-[10px] font-mono font-bold uppercase text-slate-600">
                      Table of Contents Certified Correct ({fCopy === 'ORIGINAL' ? 'ORIGINAL' : fCopy === 'COPY_1' ? 'COPY 1' : 'COPY 2'}) By:
                    </p>
                    <p className="text-sm font-black uppercase underline text-black tracking-wide">
                      {tenant?.authorizedSignatory?.name || 'AUTHORIZED MANAGING OFFICER'}
                    </p>
                    <p className="text-[11px] text-slate-700 font-medium">
                      {tenant?.authorizedSignatory?.title || 'President'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <DocumentQrCode
                      details={{
                        documentNumber: projectRefNo || 'PhilGEPS-2026-001',
                        documentName: `${fCopy} Table of Contents — ${activeEnvelope}`,
                        projectName: projectTitle,
                        dateTimeSubmitted: activeProject?.dateTimeSubmitted || (activeProject as any)?.submissionDeadline,
                        companyName: tenant?.companyName,
                        solicitationNo: activeProject?.solicitationNo || (activeProject as any)?.solicitationNumber || 'SOL-2026-001'
                      }}
                      size={60}
                      className="border-2 border-black p-0.5 bg-white shrink-0"
                    />
                  </div>
                </div>
              </div>

              {items.map((doc, idx) => {
                const linkedVaultDoc = vaultDocs.find(v => v.id === doc.vaultDocId) ||
                  vaultDocs.find(v => {
                    const vName = (v.documentName || '').toLowerCase();
                    const dName = doc.documentName.toLowerCase();
                    return vName.includes(dName) || dName.includes(vName);
                  });

                return (
                  <div
                    key={`preview-cover-${fCopy}-${doc.id}`}
                    id={`preview-cover-${fCopy}-${doc.id}`}
                    style={{ width: '800px' }}
                  >
                    <DocumentCoverPage
                      item={{
                        id: doc.id,
                        tenantId: tenantId,
                        documentName: doc.documentName,
                        documentNumber: linkedVaultDoc?.documentNumber || doc.documentNumber || projectRefNo,
                        category: (doc.category as any) || (linkedVaultDoc?.category as any) || 'LEGAL',
                        procurementApplicability: ['Infrastructure'],
                        legalBasisReference: 'RA 12009 NGPA / RA 9184 Standard',
                        versionNumber: linkedVaultDoc?.versionNumber || 1,
                        fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                        fileSizeBytes: doc.fileSizeBytes || 1048576,
                        fileName: linkedVaultDoc?.fileName || `${doc.documentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
                        uploadedByName: tenant?.authorizedSignatory?.name || 'Authorized Managing Officer',
                        isOptional: false,
                        requiresIssueDate: !!linkedVaultDoc?.issuedDate,
                        requiresExpiryDate: !!linkedVaultDoc?.expiryDate,
                        issuedDate: linkedVaultDoc?.issuedDate,
                        expiryDate: linkedVaultDoc?.expiryDate,
                        status: 'ACTIVE',
                        projectTitle: activeProject?.title || projectTitle || 'Target Bidding Project',
                        philgepsRefNo: activeProject?.refNo || projectRefNo || 'PhilGEPS-2026-001',
                        procuringEntity: activeProject?.procuringEntity || procuringEntity || 'Department of Information & Communications Technology',
                        approvedBudget: activeProject?.abc || (activeProject as any)?.approvedBudget,
                        preBidConferenceDate: (activeProject as any)?.preBidConferenceDate || 'August 15, 2026 at 10:00 AM',
                        submissionDeadline: activeProject?.dateTimeSubmitted || (activeProject as any)?.submissionDeadline || 'August 30, 2026 at 02:00 PM',
                        previousVersions: []
                      }}
                      tenant={tenant}
                      folderCopy={fCopy}
                      envelopeName={doc.envelope === 'ENVELOPE_1' ? 'ENVELOPE 1: TECHNICAL & ELIGIBILITY COMPONENT' : 'ENVELOPE 2: FINANCIAL BID PROPOSAL'}
                      incrementNumber={idx + 1}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
export default MergedPackageViewerModal;

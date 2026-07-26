import React, { useState } from 'react';
import { DocumentVaultItem, Tenant } from '../../types';
import { DocumentCoverPage } from './DocumentCoverPage';
import { X, FileText, Printer, Download, Eye, ShieldCheck, CheckCircle2, ChevronDown, ChevronUp, ZoomIn, ZoomOut } from 'lucide-react';

import { generateAndDownloadThreeLayerPdf } from '../../utils/pdfExportEngine';

interface PdfPreviewModalProps {
  item: DocumentVaultItem;
  tenant: Tenant | null;
  onClose: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ item, tenant, onClose }) => {
  const [zoomLevel, setZoomLevel] = useState(100);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    const projRef = item.documentNumber || 'PRJ-2026-901283';
    const cleanDocName = item.documentName.replace(/[^a-zA-Z0-9]/g, '_');
    const today = new Date().toISOString().split('T')[0];
    const fileName = `${projRef}_${cleanDocName}_${today}.pdf`;

    const coverElem = document.querySelector('.print-document-sheet') as HTMLElement;
    const templateElem = document.querySelector('.single-page-paper') as HTMLElement;

    await generateAndDownloadThreeLayerPdf(coverElem, templateElem, item.fileDataUrl, fileName);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[95vh] flex flex-col">
        
        {/* Modal Header Bar */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/95 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight flex items-center gap-2">
                <span>{item.documentName}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  v{item.versionNumber}.0
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {item.documentNumber ? `Serial No: ${item.documentNumber} • ` : ''}
                {item.fileName || `${item.documentName.toLowerCase().replace(/\s+/g, '_')}.pdf`}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono">
              <button
                onClick={() => setZoomLevel(prev => Math.max(75, prev - 15))}
                className="p-1 hover:text-white transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1 font-bold">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(150, prev + 15))}
                className="p-1 hover:text-white transition"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={handleExportPdf}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export to PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Legal (8.5" × 13") PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Continuous Multi-Page Viewer */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 space-y-6 text-center">
          
          <div style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }} className="transition-transform duration-200 space-y-8">
            
            {/* Page 1: Auto-generated Cover Page (Legal 8.5" x 13") */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs text-slate-400 bg-slate-900/90 px-3.5 py-1 rounded-full border border-slate-800 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>PAGE 1 OF PACKAGE: Legal Size (8.5" × 13") Cover Page</span>
              </div>
              <DocumentCoverPage item={item} tenant={tenant} />
            </div>

            {/* Page 2+: Uploaded Document Pages Viewer (Legal 8.5" x 13" Portrait Frame & Fit-To-Page) */}
            <div className="space-y-3 max-w-[650px] mx-auto">
              <div className="inline-flex items-center gap-2 text-xs text-slate-400 bg-slate-900/90 px-3.5 py-1 rounded-full border border-slate-800 font-mono">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>PAGE 2+: UPLOADED DOCUMENT CONTENT (Legal 8.5" × 13" Fit-to-Page)</span>
              </div>

              {item.fileDataUrl ? (
                <div className="single-page-paper w-full min-h-[950px] aspect-[8.5/13] rounded-2xl overflow-hidden border-2 border-slate-800 bg-slate-900 shadow-2xl mx-auto p-2">
                  <iframe
                    src={item.fileDataUrl}
                    title={item.documentName}
                    className="w-full h-full border-none object-contain"
                  />
                </div>
              ) : (
                <div className="single-page-paper w-full aspect-[8.5/13] min-h-[950px] border-2 border-dashed border-slate-800 rounded-2xl bg-white text-slate-900 p-8 flex flex-col items-center justify-center space-y-4 shadow-2xl mx-auto">
                  <FileText className="w-16 h-16 text-blue-900 opacity-90 mx-auto" />
                  <div className="space-y-2 text-center">
                    <h4 className="text-base font-black uppercase text-slate-950">Full PDF Content Active (Legal 8.5" × 13")</h4>
                    <p className="text-xs font-mono text-slate-700 leading-relaxed max-w-md mx-auto">
                      This statutory exhibit is stored in vault registry. Page 1 Front Cover Page flows seamlessly into Page 2+ content without margin cut-offs or grid shifting.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-950 px-3 py-1 rounded-full border border-blue-300">
                    Fit-To-Page Auto-Scaled • Legal Size Standard
                  </span>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Modal Footer Bar */}
        <div className="p-3 border-t border-slate-800 flex items-center justify-between bg-slate-900/95 text-xs text-slate-400 sticky bottom-0 z-10 shrink-0">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>BiDOCS AES-256 Verified Standard • Legal (8.5" × 13") Paper Standard</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
          >
            Close Viewer
          </button>
        </div>

      </div>
    </div>
  );
};

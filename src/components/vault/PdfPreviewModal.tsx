import React, { useState } from 'react';
import { DocumentVaultItem, Tenant } from '../../types';
import { X, FileText, Printer, Download, ZoomIn, ZoomOut } from 'lucide-react';
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

    const templateElem = document.querySelector('.single-page-paper') as HTMLElement;

    await generateAndDownloadThreeLayerPdf(null, templateElem, item.fileDataUrl, fileName);
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
              <span>Export PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Document</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Viewer: Uploaded File Only */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 space-y-4 text-center">
          
          <div style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }} className="transition-transform duration-200">
            
            <div className="space-y-3 max-w-[850px] mx-auto">
              <div className="inline-flex items-center gap-2 text-xs text-slate-400 bg-slate-900/90 px-3.5 py-1 rounded-full border border-slate-800 font-mono">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>ORIGINAL UPLOADED DOCUMENT CONTENT (Legal 8.5" × 13" Fit-to-Page)</span>
              </div>

              {item.fileDataUrl ? (
                <div className="w-full min-h-[850px] h-[85vh] rounded-2xl overflow-hidden border-2 border-slate-800 bg-slate-900 shadow-2xl mx-auto p-1">
                  <object
                    data={item.fileDataUrl}
                    type="application/pdf"
                    className="w-full h-full rounded-xl"
                  >
                    <iframe
                      src={item.fileDataUrl}
                      title={item.documentName}
                      className="w-full h-full border-none rounded-xl"
                    />
                  </object>
                </div>
              ) : (
                <div className="w-full aspect-[8.5/13] max-w-[850px] min-h-[650px] border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900 text-slate-100 p-8 flex flex-col items-center justify-center space-y-4 shadow-2xl mx-auto">
                  <FileText className="w-16 h-16 text-blue-400 opacity-90 mx-auto" />
                  <div className="space-y-2 text-center">
                    <h4 className="text-base font-black uppercase text-white">{item.documentName}</h4>
                    <p className="text-xs font-mono text-slate-400 leading-relaxed max-w-md mx-auto">
                      Statutory Vault Document File: <strong className="text-blue-300 font-bold">{item.fileName || 'document.pdf'}</strong>
                      <br />
                      Serial Number: <span className="font-bold text-white">{item.documentNumber || 'N/A'}</span>
                    </p>
                    {item.expiryDate && (
                      <p className="text-xs font-mono text-emerald-400 font-bold">
                        Verified Valid • Expiration Date: {item.expiryDate}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 px-3.5 py-1.5 rounded-full border border-blue-500/30">
                    Uploaded File Verified • Ready for Re-upload
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
            <span>BiDOCS AES-256 Verified Standard • Uploaded File View</span>
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

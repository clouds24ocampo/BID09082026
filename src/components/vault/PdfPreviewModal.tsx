import React, { useState, useMemo } from 'react';
import { DocumentVaultItem, Tenant } from '../../types';
import { X, FileText, Printer, Download, ZoomIn, ZoomOut, ExternalLink } from 'lucide-react';
import { generateAndDownloadThreeLayerPdf } from '../../utils/pdfExportEngine';

interface PdfPreviewModalProps {
  item: DocumentVaultItem;
  tenant: Tenant | null;
  onClose: () => void;
  pdfDataUrl?: string; // In-memory PDF data URL (takes priority over item.fileDataUrl)
  hidePrintExport?: boolean; // Set to true for Document Vault tab to restrict to View only
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ item, tenant, onClose, pdfDataUrl, hidePrintExport = false }) => {
  const [zoomLevel, setZoomLevel] = useState(100);

  // Use the in-memory pdfDataUrl first, then fall back to the item's stored value
  const effectiveDataUrl = pdfDataUrl || item.fileDataUrl;

  const pdfBlobUrl = useMemo(() => {
    if (!effectiveDataUrl) return null;
    if (effectiveDataUrl.startsWith('data:image/')) return null;
    if (effectiveDataUrl.startsWith('blob:')) return effectiveDataUrl;
    try {
      const arr = effectiveDataUrl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      return URL.createObjectURL(blob);
    } catch (e) {
      return effectiveDataUrl;
    }
  }, [effectiveDataUrl]);

  const isImage = effectiveDataUrl?.startsWith('data:image/');

  const handlePrint = () => {
    if (pdfBlobUrl) {
      const w = window.open(pdfBlobUrl, '_blank');
      if (w) {
        w.print();
        return;
      }
    }
    window.print();
  };

  const handleExportPdf = async () => {
    const projRef = item.philgepsRefNo || item.documentNumber || 'DOCUMENT';
    const cleanDocName = item.documentName.replace(/[^a-zA-Z0-9]/g, '_');
    const today = new Date().toISOString().split('T')[0];
    const fileName = `${projRef}_${cleanDocName}_${today}.pdf`;

    const templateElem = document.querySelector('.single-page-paper') as HTMLElement;

    await generateAndDownloadThreeLayerPdf(null, templateElem, effectiveDataUrl, fileName);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[95vh] flex flex-col">
        
        {/* Modal Header Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-900 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white leading-tight flex items-center gap-2 truncate">
                <span className="truncate">{item.documentName}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold shrink-0">
                  v{item.versionNumber}.0
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                {item.documentNumber ? `Serial No: ${item.documentNumber} • ` : ''}
                {item.fileName || `${item.documentName.toLowerCase().replace(/\s+/g, '_')}.pdf`}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono">
              <button
                onClick={() => setZoomLevel(prev => Math.max(75, prev - 15))}
                className="p-1 hover:text-white transition cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1 font-bold">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(150, prev + 15))}
                className="p-1 hover:text-white transition cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {pdfBlobUrl && (
              <a
                href={pdfBlobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition border border-slate-700 flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Open PDF file directly in new browser tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open PDF</span>
              </a>
            )}

            <button
              onClick={() => {
                if (pdfBlobUrl) {
                  const link = document.createElement('a');
                  link.href = pdfBlobUrl;
                  link.download = item.fileName || `${item.documentName.toLowerCase().replace(/\s+/g, '_')}.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } else {
                  handleExportPdf();
                }
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Download PDF File"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Print PDF Document"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
              title="Close Preview"
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
                <span>ORIGINAL UPLOADED DOCUMENT CONTENT (Legal 13" × 8.5" Fit-to-Page)</span>
              </div>

              {effectiveDataUrl ? (
                isImage ? (
                  <div className="w-full max-w-[850px] mx-auto rounded-2xl overflow-hidden border-2 border-slate-800 bg-white shadow-2xl p-3">
                    <img
                      src={effectiveDataUrl}
                      alt={item.documentName}
                      className="w-full h-auto object-contain rounded-xl mx-auto"
                    />
                  </div>
                ) : (
                  <div className="w-full min-h-[760px] h-[82vh] rounded-2xl overflow-hidden border-2 border-slate-800 bg-slate-900 shadow-2xl mx-auto p-1 relative flex flex-col">
                    <object
                      data={`${effectiveDataUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                      type="application/pdf"
                      className="w-full h-full min-h-[760px] border-none rounded-xl bg-slate-900"
                    >
                      <iframe
                        src={`${effectiveDataUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                        title={item.documentName}
                        className="w-full h-full min-h-[760px] border-none rounded-xl bg-slate-900"
                      >
                        <div className="p-8 text-center text-slate-300 space-y-4">
                          <p className="text-sm font-bold text-white">Document PDF Ready</p>
                          <a
                            href={effectiveDataUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>Open PDF in New Window</span>
                          </a>
                        </div>
                      </iframe>
                    </object>
                  </div>
                )
              ) : (
                <div className="w-full aspect-[13/8.5] max-w-[1150px] min-h-[760px] border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900 text-slate-100 p-6 flex flex-col items-center justify-center space-y-4 shadow-2xl mx-auto">
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

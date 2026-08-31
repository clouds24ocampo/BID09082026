import React, { useState, useEffect } from 'react';
import { generateQrCodeDataUrl, formatQrPayload, QrCodeDetails } from '../../utils/qrCodeGenerator';
import { debugLog } from '../../utils/debugLog';

export interface DocumentQrCodeProps {
  details: QrCodeDetails;
  size?: number; // Width/Height in px
  className?: string;
  showCaption?: boolean;
}

export const DocumentQrCode: React.FC<DocumentQrCodeProps> = ({
  details,
  size = 72,
  className = '',
  showCaption = true
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [showTextModal, setShowTextModal] = useState(false);

  // Guarantee minimum physical dimension of at least 64px for phone camera & scanner sensor resolution
  const displaySize = Math.max(64, size);

  useEffect(() => {
    let isMounted = true;

    generateQrCodeDataUrl(details).then((url) => {
      if (isMounted) {
        setDataUrl(url);
        // #region agent log
        debugLog('DocumentQrCode.tsx:effect', 'QR code generated', {
          documentNumber: details.documentNumber,
          hasDataUrl: !!url,
          dataUrlLength: url.length
        }, 'C');
        // #endregion
      }
    });

    return () => {
      isMounted = false;
    };
  }, [
    details.projectTitle,
    details.projectName,
    details.projectRefNo,
    details.dateTimeSubmitted,
    details.submissionDate,
    details.documentName,
    details.documentNumber,
    details.companyName,
    details.procuringEntity,
    details.solicitationNo,
    details.logoUrl,
    details.documentCategory,
    details.generatedBy,
    details.folderCopy
  ]);

  if (!dataUrl) {
    return (
      <div
        className={`bg-white border border-slate-300 rounded flex items-center justify-center text-[9px] text-slate-400 font-mono ${className}`}
        style={{ width: displaySize, height: displaySize }}
      >
        Generating QR...
      </div>
    );
  }

  return (
    <>
      <div 
        className={`flex flex-col items-center justify-center cursor-pointer group ${className}`}
        onClick={() => setShowTextModal(true)}
        title="Click to view QR Code encoded verification data"
      >
        <div className="bg-white p-1 rounded-sm border-2 border-black shadow-sm group-hover:ring-2 group-hover:ring-blue-500 transition">
          <img
            src={dataUrl}
            alt="Scannable Document Verification QR Code"
            style={{ width: displaySize, height: displaySize }}
            className="block object-contain"
          />
        </div>
        {showCaption && (
          <span className="text-[7.5pt] font-mono font-bold text-black uppercase mt-0.5 tracking-tight">
            SCAN TO VERIFY
          </span>
        )}
      </div>

      {/* QR Data Preview Modal on Click */}
      {showTextModal && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setShowTextModal(false);
          }}
        >
          <div 
            className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4 text-left animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Scannable QR Code Data</span>
              </h4>
              <button 
                onClick={() => setShowTextModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex justify-center p-3 bg-white rounded-xl">
              <img
                src={dataUrl}
                alt="Enlarged QR Code"
                style={{ width: 180, height: 180 }}
                className="block object-contain"
              />
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5 whitespace-pre-line">
              {formatQrPayload(details)}
            </div>

            <div className="text-center">
              <span className="text-[11px] text-emerald-400 font-mono font-bold">
                ✓ 100% Scannable with any Camera or QR Reader
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentQrCode;
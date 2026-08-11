import React, { useState, useEffect } from 'react';
import { generateQrCodeDataUrl, QrCodeDetails } from '../../utils/qrCodeGenerator';
import { debugLog } from '../../utils/debugLog';

export interface DocumentQrCodeProps {
  details: QrCodeDetails;
  size?: number; // Width/Height in px
  className?: string;
  showCaption?: boolean;
}

export const DocumentQrCode: React.FC<DocumentQrCodeProps> = ({
  details,
  size = 110,
  className = '',
  showCaption = true
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');

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
    details.projectRefNo,
    details.dateTimeSubmitted,
    details.documentName,
    details.documentNumber,
    details.companyName,
    details.procuringEntity,
    details.solicitationNo,
    details.logoUrl,
    details.documentCategory,
    details.generatedBy
  ]);

  if (!dataUrl) {
    return (
      <div
        className={`bg-slate-100 border border-slate-300 rounded flex items-center justify-center text-[10px] text-slate-400 font-mono ${className}`}
        style={{ width: size, height: size }}
      >
        Loading QR...
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="bg-white p-1 rounded border border-slate-400 shadow-sm">
        <img
          src={dataUrl}
          alt="Scannable Document Verification QR Code"
          style={{ width: size, height: size, imageRendering: 'pixelated' }}
          className="block object-contain"
        />
      </div>
      {showCaption && (
        <span className="text-[8px] font-mono font-bold text-black uppercase mt-1 tracking-tight">
          SCAN TO VERIFY DOCUMENT
        </span>
      )}
    </div>
  );
};

export default DocumentQrCode;
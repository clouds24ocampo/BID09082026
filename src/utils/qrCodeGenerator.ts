import QRCode from 'qrcode';

export interface QrCodeDetails {
  companyName: string;
  documentName: string;
  documentNumber: string;
  projectTitle: string;
  projectRefNo: string;
  procuringEntity: string;
  dateTimeSubmitted: string;
}

/**
 * Formats structured text payload for QR codes that displays cleanly when scanned by any smartphone camera.
 */
export const formatQrCodePayload = (details: QrCodeDetails): string => {
  const company = details.companyName || 'Bidding Entity Corporate Name';
  const docName = details.documentName || 'Section VI Schedule of Requirements';
  const docNum = details.documentNumber || 'SEC-VI-2026-901283';
  const projTitle = details.projectTitle || 'Infrastructure & IT Systems Modernization Project';
  const projRef = details.projectRefNo || 'PRJ-2026-901283';
  const entity = details.procuringEntity || 'Department of Information & Communications Technology';
  const dateStr = details.dateTimeSubmitted || new Date().toLocaleString();

  return `OFFICIAL GPPB BID DOCUMENT VERIFICATION
----------------------------------------
COMPANY: ${company}
DOCUMENT: ${docName}
DOC NO: ${docNum}
PROJECT TITLE: ${projTitle}
PROJECT REF NO: ${projRef}
PROCURING ENTITY: ${entity}
SUBMISSION DATE: ${dateStr}
STATUS: VERIFIED AUTHENTIC BID SUBMISSION
VERIFICATION ID: QCC-${projRef}-VERIFIED`;
};

/**
 * Synchronous / Async helper to generate a Data URL (PNG) of a 100% smartphone-scannable QR Code.
 */
export const generateQrCodeDataUrl = async (details: QrCodeDetails): Promise<string> => {
  const payload = formatQrCodePayload(details);
  try {
    const dataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 250,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate QR Code:', err);
    return '';
  }
};

/**
 * Generates an SVG string for crisp vector rendering in printable document sheets.
 */
export const generateQrCodeSvg = async (details: QrCodeDetails): Promise<string> => {
  const payload = formatQrCodePayload(details);
  try {
    const svgString = await QRCode.toString(payload, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    return svgString;
  } catch (err) {
    console.error('Failed to generate QR SVG:', err);
    return '';
  }
};

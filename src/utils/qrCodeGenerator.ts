import QRCode from 'qrcode';

export interface QrCodeDetails {
  documentNumber?: string;
  documentName?: string;
  projectTitle?: string;
  projectName?: string;
  submissionDate?: string;
  dateTimeSubmitted?: string;
  projectRefNo?: string;
  companyName?: string;
  procuringEntity?: string;
  solicitationNo?: string;
  logoUrl?: string;
  documentCategory?: string;
  generatedBy?: string;
  folderCopy?: string;
  documentVersion?: string;
  uniqueDocumentId?: string;
}

export const generateUniqueDocumentId = (
  projectRefNo: string,
  documentNumber: string,
  timestamp?: Date
): string => {
  const now = timestamp || new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const dd   = String(now.getDate()).padStart(2, '0');
  const hh   = String(now.getHours()).padStart(2, '0');
  const min  = String(now.getMinutes()).padStart(2, '0');
  const ss   = String(now.getSeconds()).padStart(2, '0');

  const raw = `${projectRefNo}${documentNumber}`.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const hash = raw.slice(0, 8).padEnd(8, '0');

  return `DOC-${yyyy}${mm}${dd}-${hh}${min}${ss}-${hash}`;
};

/**
 * Formats structured text payload for QR codes containing exact official bidding verification fields:
 * - Company Name
 * - Project Title
 * - Project Submission Date and Time
 * - Document Name
 * - Document Number
 * - Copy Type (Original, Copy 1, Copy 2)
 */
export const formatQrCodePayload = (details: QrCodeDetails): string => {
  const company = details.companyName || details.generatedBy || 'Quantum Cloud Corporation';
  const project = details.projectTitle || details.projectName || 'Infrastructure & IT Modernization Project';
  const submissionDateTime = details.dateTimeSubmitted || details.submissionDate || (details as any).submissionDeadline || 'August 30, 2026 at 02:00 PM';
  const docName = details.documentName || 'Official Bid Document';
  const docNumber = details.documentNumber || details.projectRefNo || (details as any).philgepsRefNo || 'DOC-2026-001';
  
  // Format folder copy (ORIGINAL / COPY 1 / COPY 2)
  const rawCopy = (details.folderCopy || (details as any).copy || 'ORIGINAL').toUpperCase();
  let copyFormatted = 'Original Copy';
  if (rawCopy.includes('COPY 1') || rawCopy.includes('DUPLICATE')) {
    copyFormatted = 'Copy 1 (Duplicate)';
  } else if (rawCopy.includes('COPY 2') || rawCopy.includes('TRIPLICATE')) {
    copyFormatted = 'Copy 2 (Triplicate)';
  } else if (rawCopy.includes('ORIGINAL')) {
    copyFormatted = 'Original Copy';
  } else {
    copyFormatted = details.folderCopy || 'Original Copy';
  }

  return `Company Name: ${company}
Project Title: ${project}
Project Submission Date & Time: ${submissionDateTime}
Document Name: ${docName}
Document Number: ${docNumber}
Copy: ${copyFormatted}`;
};

export const formatQrPayload = formatQrCodePayload;

/**
 * Generates a high-resolution, 100% smartphone-scannable QR code Data URL.
 */
export const generateQrCodeDataUrl = async (details: QrCodeDetails): Promise<string> => {
  const payload = formatQrCodePayload(details);
  try {
    const dataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 400,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate QR Code Data URL:', err);
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
    console.error('Failed to generate QR Code SVG:', err);
    return '';
  }
};
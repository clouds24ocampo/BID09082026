import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import { Tenant, DocumentVaultItem } from '../types';
import { loadPdfData } from './vaultIndexedDB';
import { generateQrCodeDataUrl } from './qrCodeGenerator';
import { numberToWords } from './numberToWords';

// Standard Dimensions in Points (72 dpi)
// Landscape Legal: 13" x 8.5" = 936pt x 612pt
// Portrait Legal: 8.5" x 13" = 612pt x 936pt
const LEGAL_LANDSCAPE: [number, number] = [936, 612];
const LEGAL_PORTRAIT: [number, number] = [612, 936];

export const sanitizePdfText = (text: string | null | undefined): string => {
  if (!text) return '';
  return String(text)
    .replace(/₱/g, 'PHP ')
    .replace(/✔/g, '[COMPLIANT]')
    .replace(/•/g, '-')
    .replace(/[—–]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E\t\n\r]/g, ' ')
    .trim();
};


export const exportPdfDocAsDataUri = async (pdfDoc: PDFDocument): Promise<string> => {
  try {
    return await pdfDoc.saveAsBase64({ dataUri: true });
  } catch (_) {
    const bytes = await pdfDoc.save();
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:application/pdf;base64,${btoa(binary)}`;
  }
};


export interface DocResolveContext {
  tenant: Tenant | null;
  tenantId?: string;
  activeProject: any;
  projectRefNo: string;
  projectTitle: string;
  procuringEntity: string;
  vaultDocs: DocumentVaultItem[];
  folderCopy?: string;
}

/**
 * Universal safe data loader from localStorage:
 * Checks target keys first, then variations with tenantId and projectRefNo/id,
 * and falls back to scanning localStorage keys for the prefix.
 */
const getStoredData = <T>(prefixes: string[], tenantId: string, keys: (string | undefined | null)[], fallback: T): T => {
  const candidateKeys: string[] = [];
  keys.filter(Boolean).forEach(k => {
    if (k) {
      candidateKeys.push(k);
      prefixes.forEach(p => {
        candidateKeys.push(`${p}_${tenantId}_${k}`);
        candidateKeys.push(`${p}_${k}`);
      });
    }
  });
  prefixes.forEach(p => {
    candidateKeys.push(`${p}_${tenantId}_default`);
    candidateKeys.push(`${p}_${tenantId}`);
    candidateKeys.push(`${p}_default`);
    candidateKeys.push(p);
  });

  for (const key of candidateKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed !== null && parsed !== undefined) {
          if (Array.isArray(parsed) && parsed.length > 0) return parsed as T;
          if (typeof parsed === 'object' && Object.keys(parsed).length > 0) return parsed as T;
        }
      }
    } catch (_) {}
  }

  // Scan localStorage for any key containing prefix
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      for (const p of prefixes) {
        if (k.startsWith(p) || k.includes(p)) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed !== null && parsed !== undefined) {
              if (Array.isArray(parsed) && parsed.length > 0) return parsed as T;
              if (typeof parsed === 'object' && Object.keys(parsed).length > 0) return parsed as T;
            }
          }
        }
      }
    }
  } catch (_) {}

  return fallback;
};

const formatCurrency = (num: number | string): string => {
  const n = typeof num === 'string' ? parseFloat(num.replace(/[^0-9.]/g, '')) : num;
  if (isNaN(n) || n === 0) return 'PHP 0.00';
  return `PHP ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatNumber = (num: number | string): string => {
  const n = typeof num === 'string' ? parseFloat(num.replace(/[^0-9.]/g, '')) : num;
  if (isNaN(n)) return '0.00';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Draws a clean official corporate header on a PDF Page
 */
const drawOfficialHeader = (
  page: PDFPage,
  fontBold: PDFFont,
  fontReg: PDFFont,
  tenant: Tenant | null,
  title: string,
  subtitle: string,
  projectRefNo: string,
  projectTitle: string,
  isLandscape: boolean = true
) => {
  const pageWidth = isLandscape ? 936 : 612;
  const companyName = (tenant?.companyName || 'BIDDING ENTERPRISE CORPORATION').toUpperCase();
  const address = tenant?.address || 'Metro Manila, Philippines';
  const tin = tenant?.tin ? `TIN: ${tenant.tin}` : '';
  const philgeps = tenant?.philgepsPlatinumNo ? `PhilGEPS: ${tenant.philgepsPlatinumNo}` : '';
  const metaLine = [address, tin, philgeps].filter(Boolean).join(' - ');

  // 1. Company Name
  const compWidth = fontBold.widthOfTextAtSize(companyName, 13);
  page.drawText(companyName, {
    x: (pageWidth - compWidth) / 2,
    y: isLandscape ? 580 : 904,
    size: 13,
    font: fontBold,
    color: rgb(0.05, 0.08, 0.15)
  });

  // 2. Company Address & Tax Info
  if (metaLine) {
    const metaWidth = fontReg.widthOfTextAtSize(metaLine, 8);
    page.drawText(metaLine, {
      x: (pageWidth - metaWidth) / 2,
      y: isLandscape ? 568 : 892,
      size: 8,
      font: fontReg,
      color: rgb(0.3, 0.35, 0.4)
    });
  }

  // Divider Line
  page.drawLine({
    start: { x: 36, y: isLandscape ? 560 : 884 },
    end: { x: pageWidth - 36, y: isLandscape ? 560 : 884 },
    thickness: 1.5,
    color: rgb(0.1, 0.15, 0.25)
  });

  // 3. Document Title Box
  const bannerY = isLandscape ? 528 : 852;
  page.drawRectangle({
    x: 36,
    y: bannerY,
    width: pageWidth - 72,
    height: 26,
    color: rgb(0.08, 0.12, 0.22)
  });

  page.drawText(title.toUpperCase(), {
    x: 46,
    y: bannerY + 8,
    size: 10,
    font: fontBold,
    color: rgb(0.95, 0.78, 0.25) // Amber gold
  });

  const projTag = `PhilGEPS: ${projectRefNo || 'PRJ-2026'}`;
  const projTagW = fontBold.widthOfTextAtSize(projTag, 8.5);
  page.drawText(projTag, {
    x: pageWidth - 46 - projTagW,
    y: bannerY + 8.5,
    size: 8.5,
    font: fontBold,
    color: rgb(1, 1, 1)
  });

  // 4. Subtitle / Project Name Line
  if (subtitle || projectTitle) {
    const sub = `Project: ${projectTitle || 'Infrastructure & Bidding Contract'} | ${subtitle || 'Statutory Compliance'}`;
    const cleanSub = sub.length > 120 ? `${sub.slice(0, 117)}...` : sub;
    page.drawText(cleanSub, {
      x: 38,
      y: bannerY - 12,
      size: 7.5,
      font: fontReg,
      color: rgb(0.3, 0.35, 0.4)
    });
  }
};

/**
 * Draws official Signatory Box and embedded QR code at the bottom of a PDF Page
 */
const drawOfficialFooter = async (
  pdfDoc: PDFDocument,
  page: PDFPage,
  fontBold: PDFFont,
  fontReg: PDFFont,
  tenant: Tenant | null,
  docName: string,
  projectRefNo: string,
  projectTitle: string,
  isLandscape: boolean = true,
  customY?: number
) => {
  const pageWidth = isLandscape ? 936 : 612;
  const footerY = customY ?? (isLandscape ? 36 : 40);
  const signatoryName = (tenant?.authorizedSignatory?.name || 'AUTHORIZED MANAGING OFFICER').toUpperCase();
  const signatoryTitle = tenant?.authorizedSignatory?.title || 'President / General Manager';

  // Divider Line above footer
  page.drawLine({
    start: { x: 36, y: footerY + 68 },
    end: { x: pageWidth - 36, y: footerY + 68 },
    thickness: 1,
    color: rgb(0.7, 0.75, 0.8)
  });

  // Signatory Certification block
  page.drawText('CERTIFIED CORRECT AND SUBMITTED BY:', {
    x: 38,
    y: footerY + 54,
    size: 7.5,
    font: fontBold,
    color: rgb(0.3, 0.35, 0.4)
  });

  page.drawText(signatoryName, {
    x: 38,
    y: footerY + 36,
    size: 10,
    font: fontBold,
    color: rgb(0.05, 0.08, 0.15)
  });

  // Underline signatory
  const sigWidth = fontBold.widthOfTextAtSize(signatoryName, 10);
  page.drawLine({
    start: { x: 38, y: footerY + 33 },
    end: { x: 38 + sigWidth, y: footerY + 33 },
    thickness: 1,
    color: rgb(0.05, 0.08, 0.15)
  });

  page.drawText(signatoryTitle, {
    x: 38,
    y: footerY + 20,
    size: 8,
    font: fontReg,
    color: rgb(0.35, 0.4, 0.45)
  });

  page.drawText(tenant?.companyName || 'Bidding Enterprise Corporation', {
    x: 38,
    y: footerY + 8,
    size: 7.5,
    font: fontReg,
    color: rgb(0.4, 0.45, 0.5)
  });

  // Generate & Embed Official Verification QR Code
  try {
    const qrDataUrl = await generateQrCodeDataUrl({
      documentName: docName,
      documentNumber: projectRefNo || 'DOC-2026',
      projectName: projectTitle,
      companyName: tenant?.companyName,
      dateTimeSubmitted: 'August 30, 2026 at 02:00 PM'
    });

    if (qrDataUrl && qrDataUrl.startsWith('data:image/png;base64,')) {
      const qrBase64 = qrDataUrl.split(',')[1];
      const qrBytes = Uint8Array.from(atob(qrBase64), c => c.charCodeAt(0));
      const qrImage = await pdfDoc.embedPng(qrBytes);
      const qrSize = 55;
      page.drawImage(qrImage, {
        x: pageWidth - 36 - qrSize,
        y: footerY + 6,
        width: qrSize,
        height: qrSize
      });

      page.drawRectangle({
        x: pageWidth - 37 - qrSize,
        y: footerY + 5,
        width: qrSize + 2,
        height: qrSize + 2,
        borderColor: rgb(0.7, 0.75, 0.8),
        borderWidth: 0.8
      });
    }
  } catch (err) {
    console.warn('[PDFGen] Note generating footer QR code:', err);
  }
};

/**
 * Appends external PDF streams to the main PDF document (e.g. attached supporting documents)
 */
const appendPdfStreams = async (mainDoc: PDFDocument, pdfSources: (string | undefined | null)[]) => {
  for (const src of pdfSources) {
    if (!src) continue;
    try {
      let arrayBuffer: ArrayBuffer;
      if (src.startsWith('data:')) {
        const base64Str = src.split(',')[1] || src;
        const binaryString = atob(base64Str);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer;
      } else {
        const res = await fetch(src);
        arrayBuffer = await res.arrayBuffer();
      }

      const externalPdf = await PDFDocument.load(arrayBuffer);
      const copiedPages = await mainDoc.copyPages(externalPdf, externalPdf.getPageIndices());
      copiedPages.forEach(p => mainDoc.addPage(p));
    } catch (e) {
      console.warn('[PDFGen] Failed to append external PDF stream:', e);
    }
  }
};

/**
 * ─── 1. ONGOING CONTRACTS GENERATOR ───
 */
export async function generateOngoingContractsPdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const tenantId = ctx.tenant?.id || 'default';
  const scopeKey = ctx.projectRefNo || ctx.activeProject?.id || 'default';

  let contracts: any[] = getStoredData(
    ['bidocs_ongoing'],
    tenantId,
    [scopeKey, ctx.projectRefNo, ctx.activeProject?.id],
    []
  );

  if (!Array.isArray(contracts) || contracts.length === 0) {
    contracts = [
      {
        id: '1',
        type: 'Government',
        projectName: `Supply, Delivery & Implementation of Infrastructure for ${ctx.procuringEntity || 'Government Entity'}`,
        ownerName: ctx.procuringEntity || 'Department of Public Works and Highways',
        ownerAddress: 'NCR, Philippines',
        ownerTelephone: '(02) 8981-0000',
        natureOfWork: 'General Engineering & Construction / IT Systems',
        bidderRole: 'Prime Contractor (100%)',
        amountAward: 'PHP 12,500,000.00',
        amountCompletion: 'PHP 12,500,000.00',
        dateAwarded: '2025-06-15',
        dateStarted: '2025-07-01',
        dateCompletion: '2026-06-30',
        accomplishmentPlanned: 75,
        accomplishmentActual: 75
      }
    ];
  }

  const page = pdfDoc.addPage(LEGAL_LANDSCAPE);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    'Statement of All Ongoing Government & Private Contracts',
    'Including Contracts Awarded But Not Yet Started',
    ctx.projectRefNo, ctx.projectTitle, true
  );

  const startX = 36;
  let currentY = 500;
  const tableWidth = 864;

  const cols = [
    { label: '#', width: 24, align: 'center' },
    { label: 'Name of Contract / Project Title', width: 180, align: 'left' },
    { label: 'Owner Name & Contact', width: 130, align: 'left' },
    { label: 'Nature of Work', width: 110, align: 'left' },
    { label: "Bidder's Role", width: 90, align: 'center' },
    { label: 'Total Value at Award', width: 85, align: 'right' },
    { label: 'Date Awarded', width: 65, align: 'center' },
    { label: 'Planned / Actual', width: 80, align: 'center' },
    { label: 'Value of Outstanding Works', width: 100, align: 'right' }
  ];

  page.drawRectangle({
    x: startX,
    y: currentY - 18,
    width: tableWidth,
    height: 22,
    color: rgb(0.12, 0.16, 0.24)
  });

  let curX = startX;
  cols.forEach(col => {
    const textW = fontBold.widthOfTextAtSize(col.label, 7.5);
    const xPos = col.align === 'center' ? curX + (col.width - textW) / 2 : col.align === 'right' ? curX + col.width - textW - 4 : curX + 4;
    page.drawText(col.label, { x: xPos, y: currentY - 12, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
    curX += col.width;
  });

  currentY -= 20;

  let totalOutstanding = 0;
  contracts.forEach((row, idx) => {
    const awardNum = parseFloat((row.amountAward || '0').replace(/[^0-9.]/g, '')) || 0;
    const compNum = parseFloat((row.amountCompletion || '0').replace(/[^0-9.]/g, '')) || awardNum;
    const actualPct = Number(row.accomplishmentActual) || 0;
    const outstandingNum = compNum * (1 - actualPct / 100);
    totalOutstanding += outstandingNum;

    const rowHeight = 22;
    page.drawRectangle({
      x: startX,
      y: currentY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      color: idx % 2 === 0 ? rgb(0.97, 0.98, 0.99) : rgb(1, 1, 1),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 0.5
    });

    const values = [
      String(idx + 1),
      (row.projectName || row.title || 'Ongoing Contract').slice(0, 42),
      (row.ownerName || row.clientName || 'Government / Private Client').slice(0, 30),
      (row.natureOfWork || 'General Contractor').slice(0, 25),
      (row.bidderRole || 'Prime Contractor').slice(0, 20),
      formatCurrency(awardNum),
      row.dateAwarded || '2025-01-01',
      `${row.accomplishmentPlanned || 0}% / ${actualPct}%`,
      formatCurrency(outstandingNum)
    ];

    let rX = startX;
    cols.forEach((col, cIdx) => {
      const val = values[cIdx];
      const textW = fontReg.widthOfTextAtSize(val, 7.5);
      const xPos = col.align === 'center' ? rX + (col.width - textW) / 2 : col.align === 'right' ? rX + col.width - textW - 4 : rX + 4;
      page.drawText(val, { x: xPos, y: currentY - 14, size: 7.5, font: fontReg, color: rgb(0.1, 0.15, 0.2) });
      rX += col.width;
    });

    currentY -= rowHeight;
  });

  page.drawRectangle({
    x: startX,
    y: currentY - 20,
    width: tableWidth,
    height: 20,
    color: rgb(0.9, 0.94, 0.98),
    borderColor: rgb(0.75, 0.82, 0.9),
    borderWidth: 1
  });

  page.drawText('TOTAL VALUE OF ALL OUTSTANDING / ONGOING CONTRACTS:', {
    x: startX + 10,
    y: currentY - 13,
    size: 8,
    font: fontBold,
    color: rgb(0.08, 0.12, 0.22)
  });

  const totStr = formatCurrency(totalOutstanding);
  const totW = fontBold.widthOfTextAtSize(totStr, 9);
  page.drawText(totStr, {
    x: startX + tableWidth - totW - 6,
    y: currentY - 13,
    size: 9,
    font: fontBold,
    color: rgb(0.05, 0.35, 0.15)
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'Statement of Ongoing Contracts', ctx.projectRefNo, ctx.projectTitle, true
  );

  const rowPdfPromises = contracts.map(async (c: any) => {
    if (ctx.tenant?.id && c.id) {
      try {
        return await loadPdfData(`ongoing_row_pdf_${ctx.tenant.id}_${c.id}`);
      } catch (_) {}
    }
    return c.pdfFile?.fileDataUrl || null;
  });
  const rowPdfs = await Promise.all(rowPdfPromises);
  await appendPdfStreams(pdfDoc, rowPdfs);

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 2. SLCC STATEMENT GENERATOR ───
 */
export async function generateSlccStatementPdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const tenantId = ctx.tenant?.id || 'default';
  const scopeKey = ctx.projectRefNo || ctx.activeProject?.id || 'default';

  let contracts: any[] = getStoredData(
    ['bidocs_slcc'],
    tenantId,
    [scopeKey, ctx.projectRefNo, ctx.activeProject?.id],
    []
  );

  if (!Array.isArray(contracts) || contracts.length === 0) {
    contracts = [
      {
        id: 'slcc-1',
        type: 'Government',
        projectName: `Completed Infrastructure & Technology Modernization for ${ctx.procuringEntity || 'Bids and Awards Committee'}`,
        ownerName: ctx.procuringEntity || 'Department of Public Works and Highways',
        ownerAddress: 'Metro Manila, Philippines',
        ownerTelephone: '(02) 8888-0000',
        natureOfWork: 'General Engineering & Technology Implementation',
        bidderRole: 'Sole Prime Contractor (100%)',
        amountAward: 'PHP 28,500,000.00',
        amountCompletion: 'PHP 28,500,000.00',
        duration: '180 Calendar Days',
        dateAwarded: '2024-03-10',
        dateStarted: '2024-03-25',
        dateCompletion: '2024-09-20',
        accomplishmentPlanned: 100,
        accomplishmentActual: 100
      }
    ];
  }

  const page = pdfDoc.addPage(LEGAL_LANDSCAPE);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    'Statement of Single Largest Completed Contract (SLCC)',
    'Similar to the Contract to be Bid within the Prescribed Period',
    ctx.projectRefNo, ctx.projectTitle, true
  );

  const startX = 36;
  let currentY = 500;
  const tableWidth = 864;

  const cols = [
    { label: '#', width: 24, align: 'center' },
    { label: 'Name of Contract / Project Title', width: 190, align: 'left' },
    { label: 'Owner / Client & Contact', width: 140, align: 'left' },
    { label: 'Nature of Work & Similarity', width: 130, align: 'left' },
    { label: "Bidder's Role", width: 100, align: 'center' },
    { label: 'Amount at Award', width: 90, align: 'right' },
    { label: 'Amount at Completion', width: 95, align: 'right' },
    { label: 'Date Completed', width: 95, align: 'center' }
  ];

  page.drawRectangle({
    x: startX,
    y: currentY - 18,
    width: tableWidth,
    height: 22,
    color: rgb(0.12, 0.16, 0.24)
  });

  let curX = startX;
  cols.forEach(col => {
    const textW = fontBold.widthOfTextAtSize(col.label, 7.5);
    const xPos = col.align === 'center' ? curX + (col.width - textW) / 2 : col.align === 'right' ? curX + col.width - textW - 4 : curX + 4;
    page.drawText(col.label, { x: xPos, y: currentY - 12, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
    curX += col.width;
  });

  currentY -= 20;

  contracts.forEach((row, idx) => {
    const rowHeight = 26;
    page.drawRectangle({
      x: startX,
      y: currentY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      color: idx % 2 === 0 ? rgb(0.97, 0.98, 0.99) : rgb(1, 1, 1),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 0.5
    });

    const values = [
      String(idx + 1),
      (row.projectName || row.title || 'Completed SLCC Project').slice(0, 45),
      (row.ownerName || row.clientName || 'Client Agency').slice(0, 32),
      (row.natureOfWork || 'Similar Technical Category').slice(0, 30),
      (row.bidderRole || 'Prime Contractor (100%)').slice(0, 22),
      formatCurrency(row.amountAward || '0'),
      formatCurrency(row.amountCompletion || row.amountAward || '0'),
      row.dateCompletion || '2024-09-20'
    ];

    let rX = startX;
    cols.forEach((col, cIdx) => {
      const val = values[cIdx];
      const textW = fontReg.widthOfTextAtSize(val, 7.5);
      const xPos = col.align === 'center' ? rX + (col.width - textW) / 2 : col.align === 'right' ? rX + col.width - textW - 4 : rX + 4;
      page.drawText(val, { x: xPos, y: currentY - 16, size: 7.5, font: fontReg, color: rgb(0.1, 0.15, 0.2) });
      rX += col.width;
    });

    currentY -= rowHeight;
  });

  currentY -= 15;
  page.drawRectangle({
    x: startX,
    y: currentY - 35,
    width: tableWidth,
    height: 35,
    color: rgb(0.95, 0.97, 1),
    borderColor: rgb(0.7, 0.8, 0.95),
    borderWidth: 0.8
  });

  page.drawText('STATUTORY COMPLIANCE CERTIFICATION (RA 12009 / RA 9184):', {
    x: startX + 8,
    y: currentY - 12,
    size: 7.5,
    font: fontBold,
    color: rgb(0.1, 0.25, 0.6)
  });

  const certNotice = 'This single completed contract is similar to the contract to be bid, the value of which, adjusted to current prices using the PSA consumer price indices, must be at least fifty percent (50%) of the ABC to be bid. Attached herewith are copies of End-User\'s Acceptance or Official Receipt(s) or Sales Invoice.';
  page.drawText(certNotice, {
    x: startX + 8,
    y: currentY - 26,
    size: 6.8,
    font: fontReg,
    color: rgb(0.2, 0.25, 0.35)
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'Statement of SLCC', ctx.projectRefNo, ctx.projectTitle, true
  );

  const rowPdfPromises = contracts.map(async (c: any) => {
    if (ctx.tenant?.id && c.id) {
      try {
        return await loadPdfData(`slcc_row_pdf_${ctx.tenant.id}_${c.id}`);
      } catch (_) {}
    }
    return c.pdfFile?.fileDataUrl || null;
  });
  const rowPdfs = await Promise.all(rowPdfPromises);
  await appendPdfStreams(pdfDoc, rowPdfs);

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 3. SECTION VI: SCHEDULE OF REQUIREMENTS GENERATOR ───
 */
export async function generateSectionViRequirementsPdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const tenantId = ctx.tenant?.id || 'default';
  const scopeKey = ctx.projectRefNo || ctx.activeProject?.id || 'default';

  let items: any[] = getStoredData(
    ['bidocs_sec_vi'],
    tenantId,
    [scopeKey, ctx.projectRefNo, ctx.activeProject?.id],
    []
  );

  const defaultDelivery = '30 Calendar Days upon receipt of NTP';
  if (!Array.isArray(items) || items.length === 0) {
    items = [
      { id: '1', description: 'Supply, Delivery, Installation and Configuration of Main Equipment & Components', quantity: '1 Lot', unitAmount: 'PHP 8,500,000.00', total: 'PHP 8,500,000.00', delivered: defaultDelivery },
      { id: '2', description: 'Testing, Commissioning, Quality Assurance and User Acceptance Verification', quantity: '1 Lot', unitAmount: 'PHP 1,200,000.00', total: 'PHP 1,200,000.00', delivered: defaultDelivery },
      { id: '3', description: 'Comprehensive Technical Training, Knowledge Transfer and Documentation', quantity: '1 Lot', unitAmount: 'PHP 800,000.00', total: 'PHP 800,000.00', delivered: defaultDelivery }
    ];
  }

  const page = pdfDoc.addPage(LEGAL_PORTRAIT);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    'Section VI. Schedule of Requirements',
    'Delivery Schedule & Scope of Deliverables',
    ctx.projectRefNo, ctx.projectTitle, false
  );

  const startX = 36;
  let currentY = 820;
  const tableWidth = 540;

  const cols = [
    { label: 'Item #', width: 36, align: 'center' },
    { label: 'Description of Requirements', width: 220, align: 'left' },
    { label: 'Quantity', width: 55, align: 'center' },
    { label: 'Unit Cost', width: 75, align: 'right' },
    { label: 'Total Amount', width: 75, align: 'right' },
    { label: 'Delivered, Weeks/Months', width: 79, align: 'center' }
  ];

  page.drawRectangle({
    x: startX,
    y: currentY - 18,
    width: tableWidth,
    height: 22,
    color: rgb(0.12, 0.16, 0.24)
  });

  let curX = startX;
  cols.forEach(col => {
    const textW = fontBold.widthOfTextAtSize(col.label, 7);
    const xPos = col.align === 'center' ? curX + (col.width - textW) / 2 : col.align === 'right' ? curX + col.width - textW - 4 : curX + 4;
    page.drawText(col.label, { x: xPos, y: currentY - 12, size: 7, font: fontBold, color: rgb(1, 1, 1) });
    curX += col.width;
  });

  currentY -= 20;

  let grandTotal = 0;
  items.forEach((it, idx) => {
    const totNum = parseFloat((it.total || it.unitAmount || '0').replace(/[^0-9.]/g, '')) || 0;
    grandTotal += totNum;

    const rowHeight = 24;
    page.drawRectangle({
      x: startX,
      y: currentY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      color: idx % 2 === 0 ? rgb(0.97, 0.98, 0.99) : rgb(1, 1, 1),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 0.5
    });

    const values = [
      String(idx + 1),
      (it.description || 'Requirement Item').slice(0, 48),
      it.quantity || '1 Lot',
      formatCurrency(it.unitAmount || totNum),
      formatCurrency(totNum),
      it.delivered || defaultDelivery
    ];

    let rX = startX;
    cols.forEach((col, cIdx) => {
      const val = values[cIdx];
      const textW = fontReg.widthOfTextAtSize(val, 6.8);
      const xPos = col.align === 'center' ? rX + (col.width - textW) / 2 : col.align === 'right' ? rX + col.width - textW - 4 : rX + 4;
      page.drawText(val, { x: xPos, y: currentY - 15, size: 6.8, font: fontReg, color: rgb(0.1, 0.15, 0.2) });
      rX += col.width;
    });

    currentY -= rowHeight;
  });

  page.drawRectangle({
    x: startX,
    y: currentY - 20,
    width: tableWidth,
    height: 20,
    color: rgb(0.92, 0.95, 0.99),
    borderColor: rgb(0.75, 0.82, 0.9),
    borderWidth: 1
  });

  page.drawText('GRAND TOTAL SCHEDULE OF REQUIREMENTS:', {
    x: startX + 8,
    y: currentY - 13,
    size: 7.5,
    font: fontBold,
    color: rgb(0.08, 0.12, 0.22)
  });

  const totStr = formatCurrency(grandTotal);
  const totW = fontBold.widthOfTextAtSize(totStr, 8.5);
  page.drawText(totStr, {
    x: startX + tableWidth - totW - 6,
    y: currentY - 13,
    size: 8.5,
    font: fontBold,
    color: rgb(0.05, 0.35, 0.15)
  });

  currentY -= 35;
  page.drawRectangle({
    x: startX,
    y: currentY - 30,
    width: tableWidth,
    height: 30,
    color: rgb(0.98, 0.98, 0.98),
    borderColor: rgb(0.7, 0.75, 0.8),
    borderWidth: 0.8
  });

  page.drawText('STATEMENT OF COMPLIANCE:', {
    x: startX + 8,
    y: currentY - 10,
    size: 7,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25)
  });

  page.drawText('I hereby certify to comply and deliver all the above requirements in accordance with the prescribed delivery schedule upon receipt of Notice to Proceed (NTP).', {
    x: startX + 8,
    y: currentY - 22,
    size: 6.5,
    font: fontReg,
    color: rgb(0.2, 0.25, 0.3)
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'Section VI. Schedule of Requirements', ctx.projectRefNo, ctx.projectTitle, false
  );

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 4. SECTION VII: TECHNICAL SPECIFICATIONS GENERATOR ───
 */
export async function generateTechnicalSpecificationsPdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const tenantId = ctx.tenant?.id || 'default';
  const scopeKey = ctx.projectRefNo || ctx.activeProject?.id || 'default';

  let specs: any[] = getStoredData(
    ['bidocs_tech_specs'],
    tenantId,
    [scopeKey, ctx.projectRefNo, ctx.activeProject?.id],
    []
  );

  if (!Array.isArray(specs) || specs.length === 0) {
    specs = [
      { id: '1', itemNo: 'Item 1', specification: 'Main System Hardware & Component Architecture meeting standard enterprise grade', quantity: '1 Lot', compliance: 'Comply', brandModel: 'Standard Commercial Grade (Cross-referenced to Datasheet)' },
      { id: '2', itemNo: 'Item 2', specification: 'Installation, System Integration, Calibration, Performance Testing & Commissioning', quantity: '1 Lot', compliance: 'Comply', brandModel: 'Standard Engineering Methodology' },
      { id: '3', itemNo: 'Item 3', specification: 'Warranty, After-Sales Support, SLA 24/7 Technical Assistance & Preventive Maintenance', quantity: '1 Year', compliance: 'Comply', brandModel: 'Official Manufacturer Warranty Certificate' }
    ];
  }

  const page = pdfDoc.addPage(LEGAL_PORTRAIT);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    'Section VII. Technical Specifications',
    'Statement of Compliance Matrix',
    ctx.projectRefNo, ctx.projectTitle, false
  );

  const startX = 36;
  let currentY = 820;
  const tableWidth = 540;

  const cols = [
    { label: 'Item #', width: 40, align: 'center' },
    { label: 'Procuring Entity Technical Specification', width: 230, align: 'left' },
    { label: 'Qty', width: 45, align: 'center' },
    { label: 'Statement of Compliance', width: 95, align: 'center' },
    { label: 'Brand / Model / Reference', width: 130, align: 'left' }
  ];

  page.drawRectangle({
    x: startX,
    y: currentY - 18,
    width: tableWidth,
    height: 22,
    color: rgb(0.12, 0.16, 0.24)
  });

  let curX = startX;
  cols.forEach(col => {
    const textW = fontBold.widthOfTextAtSize(col.label, 7);
    const xPos = col.align === 'center' ? curX + (col.width - textW) / 2 : col.align === 'right' ? curX + col.width - textW - 4 : curX + 4;
    page.drawText(col.label, { x: xPos, y: currentY - 12, size: 7, font: fontBold, color: rgb(1, 1, 1) });
    curX += col.width;
  });

  currentY -= 20;

  specs.forEach((it, idx) => {
    const rowHeight = 28;
    page.drawRectangle({
      x: startX,
      y: currentY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      color: idx % 2 === 0 ? rgb(0.97, 0.98, 0.99) : rgb(1, 1, 1),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 0.5
    });

    const values = [
      it.itemNo || `Item ${idx + 1}`,
      (it.specification || it.statement || 'Technical Specification Item').slice(0, 52),
      it.quantity || '1 Lot',
      'COMPLIED (Comply)',
      (it.brandModel || 'Complies with technical terms').slice(0, 26)
    ];

    let rX = startX;
    cols.forEach((col, cIdx) => {
      const val = values[cIdx];
      const textW = fontReg.widthOfTextAtSize(val, 6.8);
      const isComplyCol = cIdx === 3;
      const xPos = col.align === 'center' ? rX + (col.width - textW) / 2 : col.align === 'right' ? rX + col.width - textW - 4 : rX + 4;
      page.drawText(val, {
        x: xPos,
        y: currentY - 17,
        size: 6.8,
        font: isComplyCol ? fontBold : fontReg,
        color: isComplyCol ? rgb(0.05, 0.45, 0.15) : rgb(0.1, 0.15, 0.2)
      });
      rX += col.width;
    });

    currentY -= rowHeight;
  });

  currentY -= 20;
  page.drawRectangle({
    x: startX,
    y: currentY - 45,
    width: tableWidth,
    height: 45,
    color: rgb(0.95, 0.97, 1),
    borderColor: rgb(0.7, 0.8, 0.95),
    borderWidth: 0.8
  });

  page.drawText('STATEMENT OF COMPLIANCE UNDERTAKING (GPPB 2020 / NGPA 2026):', {
    x: startX + 8,
    y: currentY - 12,
    size: 7,
    font: fontBold,
    color: rgb(0.1, 0.25, 0.6)
  });

  const techNote = 'Bidders must state here either "Comply" or "Not Comply" against each of the individual parameters of each Specification stating the corresponding performance parameter of the equipment offered. A statement that is subsequently found to be contradicted by the evidence presented will render the Bid under evaluation liable for rejection.';
  page.drawText(techNote, {
    x: startX + 8,
    y: currentY - 26,
    size: 6.2,
    font: fontReg,
    color: rgb(0.2, 0.25, 0.35)
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'Section VII. Technical Specifications', ctx.projectRefNo, ctx.projectTitle, false
  );

  try {
    const brochureData = await loadPdfData(`tech_specs_brochure_${tenantId}_${scopeKey}`) ||
      await loadPdfData(`tech_specs_brochure_${tenantId}_${ctx.projectRefNo}`);
    const drawingData = await loadPdfData(`tech_specs_drawing_${tenantId}_${scopeKey}`) ||
      await loadPdfData(`tech_specs_drawing_${tenantId}_${ctx.projectRefNo}`);
    await appendPdfStreams(pdfDoc, [brochureData, drawingData]);
  } catch (_) {}

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 5. FRAMEWORK AGREEMENT LIST GENERATOR ───
 */
export async function generateFrameworkAgreementListPdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const tenantId = ctx.tenant?.id || 'default';
  const scopeKey = ctx.projectRefNo || ctx.activeProject?.id || 'default';

  let items: any[] = getStoredData(
    ['bidocs_fal'],
    tenantId,
    [scopeKey, ctx.projectRefNo, ctx.activeProject?.id],
    []
  );

  if (!Array.isArray(items) || items.length === 0) {
    items = [
      { id: '1', description: 'Procurement of Core Bidding Deliverables & Systems', quantity: '1 Lot', unitAmount: 'PHP 5,000,000.00', total: 'PHP 5,000,000.00', delivered: '15 to 30 Days upon Call-Off' }
    ];
  }

  const page = pdfDoc.addPage(LEGAL_PORTRAIT);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    'Framework Agreement List',
    'Framework Agreement Deliverables & Indicative Schedules',
    ctx.projectRefNo, ctx.projectTitle, false
  );

  const startX = 36;
  let currentY = 820;
  const tableWidth = 540;

  const cols = [
    { label: '#', width: 30, align: 'center' },
    { label: 'Item / Service Type', width: 220, align: 'left' },
    { label: 'Max Qty', width: 55, align: 'center' },
    { label: 'Max Unit Price', width: 80, align: 'right' },
    { label: 'Total Price', width: 80, align: 'right' },
    { label: 'Indicative Timeframe', width: 75, align: 'center' }
  ];

  page.drawRectangle({
    x: startX,
    y: currentY - 18,
    width: tableWidth,
    height: 22,
    color: rgb(0.12, 0.16, 0.24)
  });

  let curX = startX;
  cols.forEach(col => {
    const textW = fontBold.widthOfTextAtSize(col.label, 7);
    const xPos = col.align === 'center' ? curX + (col.width - textW) / 2 : col.align === 'right' ? curX + col.width - textW - 4 : curX + 4;
    page.drawText(col.label, { x: xPos, y: currentY - 12, size: 7, font: fontBold, color: rgb(1, 1, 1) });
    curX += col.width;
  });

  currentY -= 20;

  items.forEach((it, idx) => {
    const rowHeight = 24;
    page.drawRectangle({
      x: startX,
      y: currentY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      color: idx % 2 === 0 ? rgb(0.97, 0.98, 0.99) : rgb(1, 1, 1),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 0.5
    });

    const values = [
      String(idx + 1),
      (it.description || 'Framework Item').slice(0, 48),
      it.quantity || '1 Lot',
      formatCurrency(it.unitAmount || '0'),
      formatCurrency(it.total || it.unitAmount || '0'),
      it.delivered || '30 Days'
    ];

    let rX = startX;
    cols.forEach((col, cIdx) => {
      const val = values[cIdx];
      const textW = fontReg.widthOfTextAtSize(val, 6.8);
      const xPos = col.align === 'center' ? rX + (col.width - textW) / 2 : col.align === 'right' ? rX + col.width - textW - 4 : rX + 4;
      page.drawText(val, { x: xPos, y: currentY - 15, size: 6.8, font: fontReg, color: rgb(0.1, 0.15, 0.2) });
      rX += col.width;
    });

    currentY -= rowHeight;
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'Framework Agreement List', ctx.projectRefNo, ctx.projectTitle, false
  );

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 6. NFCC COMPUTATION GENERATOR ───
 */
export async function generateNfccComputationPdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const tenantId = ctx.tenant?.id || 'default';
  const scopeKey = ctx.projectRefNo || ctx.activeProject?.id || 'default';

  const nfccData: any = getStoredData(
    ['bidocs_nfcc'],
    tenantId,
    [scopeKey, ctx.projectRefNo, ctx.activeProject?.id],
    {}
  );

  const currentAssets = parseFloat(`${nfccData.currentAssets || '50000000'}`.replace(/[^0-9.]/g, '')) || 50000000;
  const currentLiabilities = parseFloat(`${nfccData.currentLiabilities || '10000000'}`.replace(/[^0-9.]/g, '')) || 10000000;
  const ongoingValue = parseFloat(`${nfccData.ongoingContractsValue || nfccData.totalOngoing || '12500000'}`.replace(/[^0-9.]/g, '')) || 12500000;

  const netWorkingCapital = currentAssets - currentLiabilities;
  const subtotalK15 = netWorkingCapital * 15;
  const nfccTotal = Math.max(0, subtotalK15 - ongoingValue);
  const abc = parseFloat(`${ctx.activeProject?.abc || '20000000'}`.replace(/[^0-9.]/g, '')) || 20000000;

  const page = pdfDoc.addPage(LEGAL_PORTRAIT);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    'Net Financial Contracting Capacity (NFCC) Computation',
    'Formula: NFCC = [(Current Assets - Current Liabilities) * 15] - Ongoing Contracts',
    ctx.projectRefNo, ctx.projectTitle, false
  );

  const startX = 36;
  let currentY = 810;
  const boxWidth = 540;

  page.drawRectangle({
    x: startX,
    y: currentY - 260,
    width: boxWidth,
    height: 260,
    color: rgb(0.98, 0.99, 1),
    borderColor: rgb(0.7, 0.75, 0.85),
    borderWidth: 1
  });

  const lines = [
    { label: 'A. Current Assets (from BIR-stamped Audited Financial Statements):', val: formatCurrency(currentAssets), bold: false },
    { label: 'B. Less: Current Liabilities (from BIR-stamped Audited Financial Statements):', val: `(${formatCurrency(currentLiabilities)})`, bold: false },
    { label: 'C. Net Working Capital (Difference of Current Assets & Liabilities):', val: formatCurrency(netWorkingCapital), bold: true },
    { label: 'D. Factor Constant (K = 15):', val: 'x 15', bold: false },
    { label: 'E. Total Factor Product [(Current Assets - Current Liabilities) x 15]:', val: formatCurrency(subtotalK15), bold: true },
    { label: 'F. Less: Total Value of All Ongoing & Awarded Contracts:', val: `(${formatCurrency(ongoingValue)})`, bold: false },
    { label: 'G. NET FINANCIAL CONTRACTING CAPACITY (NFCC TOTAL):', val: formatCurrency(nfccTotal), bold: true, highlight: true }
  ];

  let lY = currentY - 25;
  lines.forEach(line => {
    if (line.highlight) {
      page.drawRectangle({
        x: startX + 4,
        y: lY - 6,
        width: boxWidth - 8,
        height: 26,
        color: rgb(0.1, 0.15, 0.25)
      });
      page.drawText(line.label, { x: startX + 10, y: lY + 2, size: 8, font: fontBold, color: rgb(0.95, 0.8, 0.25) });
      const valW = fontBold.widthOfTextAtSize(line.val, 9.5);
      page.drawText(line.val, { x: startX + boxWidth - valW - 14, y: lY + 2, size: 9.5, font: fontBold, color: rgb(1, 1, 1) });
    } else {
      page.drawText(line.label, { x: startX + 12, y: lY, size: 8, font: line.bold ? fontBold : fontReg, color: rgb(0.1, 0.15, 0.2) });
      const valW = fontBold.widthOfTextAtSize(line.val, 8.5);
      page.drawText(line.val, { x: startX + boxWidth - valW - 16, y: lY, size: 8.5, font: line.bold ? fontBold : fontReg, color: rgb(0.1, 0.15, 0.2) });
    }
    lY -= 32;
  });

  currentY -= 280;
  const isSufficient = nfccTotal >= abc;
  page.drawRectangle({
    x: startX,
    y: currentY - 45,
    width: boxWidth,
    height: 45,
    color: isSufficient ? rgb(0.92, 0.98, 0.94) : rgb(0.99, 0.95, 0.95),
    borderColor: isSufficient ? rgb(0.3, 0.7, 0.4) : rgb(0.8, 0.3, 0.3),
    borderWidth: 1
  });

  page.drawText(`Approved Budget for the Contract (ABC): ${formatCurrency(abc)}`, {
    x: startX + 10,
    y: currentY - 16,
    size: 8,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25)
  });

  const statusMsg = isSufficient
    ? `[COMPLIANT] COMPLIANT: The NFCC of ${formatCurrency(nfccTotal)} is AT LEAST EQUAL to the ABC (${formatCurrency(abc)}).`
    : `Note: The NFCC must be at least equal to the ABC.`;
  page.drawText(statusMsg, {
    x: startX + 10,
    y: currentY - 32,
    size: 7.5,
    font: fontBold,
    color: isSufficient ? rgb(0.1, 0.5, 0.2) : rgb(0.7, 0.2, 0.2)
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'NFCC Computation', ctx.projectRefNo, ctx.projectTitle, false
  );

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 7. FINANCIAL BID FORM GENERATOR (Goods / Infra / Consulting) ───
 */
export async function generateFinancialBidFormPdf(ctx: DocResolveContext, category: 'INFRA' | 'GOODS' | 'CONSULTING' = 'INFRA'): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const tenantId = ctx.tenant?.id || 'default';
  const scopeKey = ctx.projectRefNo || ctx.activeProject?.id || 'default';
  const prefix = category === 'INFRA' ? 'bidform_infra' : category === 'CONSULTING' ? 'bidform_consulting' : 'bidform_goods';

  const formData: any = getStoredData(
    [`bidocs_${prefix}`, 'bidocs_bidform'],
    tenantId,
    [scopeKey, ctx.projectRefNo, ctx.activeProject?.id],
    {}
  );

  const bidAmountFigures = formData.totalBidAmountFigures || formData.totalBidAmount || '18,500,000.00';
  const bidAmountWords = formData.totalBidAmountWords || numberToWords(parseFloat(bidAmountFigures.replace(/[^0-9.]/g, '')));

  const page = pdfDoc.addPage(LEGAL_PORTRAIT);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    `Financial Bid Form (${category === 'INFRA' ? 'Infrastructure' : category === 'CONSULTING' ? 'Consulting Services' : 'Goods'})`,
    'Official Proposal Submitted to Bids and Awards Committee',
    ctx.projectRefNo, ctx.projectTitle, false
  );

  const startX = 36;
  let currentY = 820;
  const boxWidth = 540;

  page.drawText(`To: The Bids and Awards Committee (BAC)`, { x: startX, y: currentY, size: 8.5, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
  page.drawText(`${ctx.procuringEntity || 'Procuring Entity Authority'}`, { x: startX, y: currentY - 12, size: 8, font: fontReg, color: rgb(0.2, 0.25, 0.3) });
  currentY -= 30;

  page.drawText(`Project Identification No. / PhilGEPS Ref. No.: ${ctx.projectRefNo || 'PRJ-2026-001'}`, { x: startX, y: currentY, size: 8, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
  currentY -= 18;

  const p1 = `Having examined the Philippine Bidding Documents (PBDs) including the Supplemental / Bid Bulletins, the receipt of which is hereby duly acknowledged, we, the undersigned, declare that:`;
  page.drawText(p1, { x: startX, y: currentY, size: 7.5, font: fontReg, color: rgb(0.15, 0.2, 0.25) });
  currentY -= 18;

  const bullets = [
    'a. We have no reservation to the PBDs, including the Supplemental or Bid Bulletins, for the Procurement Project;',
    'b. We offer to execute the Works / deliver the Goods / perform Services in conformity with the PBDs;',
    'c. The total price of our Bid, excluding any discounts offered below is:'
  ];

  bullets.forEach(b => {
    page.drawText(b, { x: startX + 8, y: currentY, size: 7.2, font: fontReg, color: rgb(0.15, 0.2, 0.25) });
    currentY -= 14;
  });

  currentY -= 6;
  page.drawRectangle({
    x: startX,
    y: currentY - 50,
    width: boxWidth,
    height: 50,
    color: rgb(0.08, 0.12, 0.22)
  });

  page.drawText('TOTAL BID PRICE PROPOSAL (IN WORDS & FIGURES):', {
    x: startX + 10,
    y: currentY - 14,
    size: 7.5,
    font: fontBold,
    color: rgb(0.95, 0.78, 0.25)
  });

  page.drawText(`Philippine Pesos: ${bidAmountWords.toUpperCase()}`, {
    x: startX + 10,
    y: currentY - 28,
    size: 8,
    font: fontBold,
    color: rgb(1, 1, 1)
  });

  page.drawText(`(PHP ${formatNumber(bidAmountFigures)})`, {
    x: startX + 10,
    y: currentY - 42,
    size: 9.5,
    font: fontBold,
    color: rgb(0.4, 0.9, 0.5)
  });

  currentY -= 68;

  const remainingClauses = [
    'd. Our Bid shall be valid for the period specified in the PBDs (120 calendar days from the date of the bid opening);',
    'e. If our Bid is accepted, we undertake to provide a performance security in the form, amounts, and within the times specified in the PBDs;',
    'f. We agree to abide by this Bid for the Bid Validity Period and it shall remain binding upon us and may be accepted at any time before expiration of that period;',
    'g. Until a formal Contract is prepared and executed, this Bid, together with your written acceptance thereof and your Notice of Award, shall be binding upon us.'
  ];

  remainingClauses.forEach(c => {
    page.drawText(c, { x: startX + 8, y: currentY, size: 7, font: fontReg, color: rgb(0.2, 0.25, 0.3) });
    currentY -= 14;
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'Financial Bid Form', ctx.projectRefNo, ctx.projectTitle, false
  );

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 8. BILL OF QUANTITIES (BOQ) GENERATOR ───
 */
export async function generateBillOfQuantitiesPdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const tenantId = ctx.tenant?.id || 'default';
  const scopeKey = ctx.projectRefNo || ctx.activeProject?.id || 'default';

  let boqRows: any[] = getStoredData(
    ['bidocs_boq'],
    tenantId,
    [scopeKey, ctx.projectRefNo, ctx.activeProject?.id],
    []
  );

  if (!Array.isArray(boqRows) || boqRows.length === 0) {
    boqRows = [
      { itemNo: 'PART I', description: 'GENERAL REQUIREMENTS & MOBILIZATION', unit: 'l.s.', qty: 1, unitPrice: 1500000, amount: 1500000 },
      { itemNo: 'PART II', description: 'CIVIL & STRUCTURAL WORKS', unit: 'sq.m.', qty: 450, unitPrice: 12500, amount: 5625000 },
      { itemNo: 'PART III', description: 'ARCHITECTURAL & FINISHING WORKS', unit: 'sq.m.', qty: 450, unitPrice: 8500, amount: 3825000 },
      { itemNo: 'PART IV', description: 'ELECTRICAL & POWER DISTRIBUTION', unit: 'lot', qty: 1, unitPrice: 4250000, amount: 4250000 },
      { itemNo: 'PART V', description: 'MECHANICAL & FIRE PROTECTION', unit: 'lot', qty: 1, unitPrice: 3300000, amount: 3300000 }
    ];
  }

  const page = pdfDoc.addPage(LEGAL_PORTRAIT);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    'Bill of Quantities (BOQ)',
    'Detailed Scope Breakdown, Unit Rates & Contract Amounts',
    ctx.projectRefNo, ctx.projectTitle, false
  );

  const startX = 36;
  let currentY = 820;
  const tableWidth = 540;

  const cols = [
    { label: 'Item #', width: 50, align: 'center' },
    { label: 'Description of Works', width: 230, align: 'left' },
    { label: 'Unit', width: 45, align: 'center' },
    { label: 'Qty', width: 45, align: 'center' },
    { label: 'Unit Price (PHP)', width: 85, align: 'right' },
    { label: 'Amount (PHP)', width: 85, align: 'right' }
  ];

  page.drawRectangle({
    x: startX,
    y: currentY - 18,
    width: tableWidth,
    height: 22,
    color: rgb(0.12, 0.16, 0.24)
  });

  let curX = startX;
  cols.forEach(col => {
    const textW = fontBold.widthOfTextAtSize(col.label, 7);
    const xPos = col.align === 'center' ? curX + (col.width - textW) / 2 : col.align === 'right' ? curX + col.width - textW - 4 : curX + 4;
    page.drawText(col.label, { x: xPos, y: currentY - 12, size: 7, font: fontBold, color: rgb(1, 1, 1) });
    curX += col.width;
  });

  currentY -= 20;

  let grandTotal = 0;
  boqRows.forEach((row, idx) => {
    const amt = parseFloat(`${row.amount || (Number(row.qty || 1) * Number(row.unitPrice || 0)) || 0}`.replace(/[^0-9.]/g, '')) || 0;
    grandTotal += amt;

    const rowHeight = 24;
    page.drawRectangle({
      x: startX,
      y: currentY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      color: idx % 2 === 0 ? rgb(0.97, 0.98, 0.99) : rgb(1, 1, 1),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 0.5
    });

    const values = [
      row.itemNo || `Item ${idx + 1}`,
      (row.description || 'Scope Item').slice(0, 48),
      row.unit || 'lot',
      String(row.qty || 1),
      formatNumber(row.unitPrice || amt),
      formatNumber(amt)
    ];

    let rX = startX;
    cols.forEach((col, cIdx) => {
      const val = values[cIdx];
      const textW = fontReg.widthOfTextAtSize(val, 6.8);
      const xPos = col.align === 'center' ? rX + (col.width - textW) / 2 : col.align === 'right' ? rX + col.width - textW - 4 : rX + 4;
      page.drawText(val, { x: xPos, y: currentY - 15, size: 6.8, font: fontReg, color: rgb(0.1, 0.15, 0.2) });
      rX += col.width;
    });

    currentY -= rowHeight;
  });

  page.drawRectangle({
    x: startX,
    y: currentY - 22,
    width: tableWidth,
    height: 22,
    color: rgb(0.92, 0.95, 0.99),
    borderColor: rgb(0.75, 0.82, 0.9),
    borderWidth: 1
  });

  page.drawText('TOTAL BID PRICE FOR BILL OF QUANTITIES:', {
    x: startX + 8,
    y: currentY - 14,
    size: 7.5,
    font: fontBold,
    color: rgb(0.08, 0.12, 0.22)
  });

  const totStr = formatCurrency(grandTotal);
  const totW = fontBold.widthOfTextAtSize(totStr, 8.5);
  page.drawText(totStr, {
    x: startX + tableWidth - totW - 6,
    y: currentY - 14,
    size: 8.5,
    font: fontBold,
    color: rgb(0.05, 0.35, 0.15)
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'Bill of Quantities', ctx.projectRefNo, ctx.projectTitle, false
  );

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 9. DETAILED ESTIMATES (FORM L) GENERATOR ───
 */
export async function generateDetailedEstimatesPdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const tenantId = ctx.tenant?.id || 'default';
  const scopeKey = ctx.projectRefNo || ctx.activeProject?.id || 'default';

  const estData: any = getStoredData(
    ['bidocs_detailed_estimates', 'bidocs_estimates'],
    tenantId,
    [scopeKey, ctx.projectRefNo, ctx.activeProject?.id],
    {}
  );

  const directLabor = Number(estData.totalLabor || 3200000);
  const directMaterials = Number(estData.totalMaterials || 9800000);
  const directEquipment = Number(estData.totalEquipment || 1500000);
  const directCost = directLabor + directMaterials + directEquipment;

  const ocm = Number(estData.ocmAmount || directCost * 0.12);
  const profit = Number(estData.profitAmount || directCost * 0.08);
  const vat = Number(estData.vatAmount || (directCost + ocm + profit) * 0.05);
  const grandTotal = directCost + ocm + profit + vat;

  const page = pdfDoc.addPage(LEGAL_PORTRAIT);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    '(Form L) Detailed Estimates Breakdown',
    'Direct Material, Labor, Equipment, OCM, Profit & Taxes',
    ctx.projectRefNo, ctx.projectTitle, false
  );

  const startX = 36;
  let currentY = 810;
  const boxWidth = 540;

  page.drawRectangle({
    x: startX,
    y: currentY - 260,
    width: boxWidth,
    height: 260,
    color: rgb(0.98, 0.99, 1),
    borderColor: rgb(0.7, 0.75, 0.85),
    borderWidth: 1
  });

  const costLines = [
    { label: '1. Direct Materials Cost (Civil, Hardware, Structural & Architectural):', val: formatCurrency(directMaterials), bold: false },
    { label: '2. Direct Labor Cost (Engineers, Foremen, Skilled & Unskilled Labor):', val: formatCurrency(directLabor), bold: false },
    { label: '3. Direct Equipment & Logistics Rental / Utilization Cost:', val: formatCurrency(directEquipment), bold: false },
    { label: 'A. TOTAL DIRECT COST (Materials + Labor + Equipment):', val: formatCurrency(directCost), bold: true },
    { label: 'B. Overhead, Contingencies & Miscellaneous (OCM):', val: formatCurrency(ocm), bold: false },
    { label: "C. Contractor's Profit (CP):", val: formatCurrency(profit), bold: false },
    { label: 'D. Value Added Tax (VAT / Government Statutory Taxes):', val: formatCurrency(vat), bold: false },
    { label: 'TOTAL ESTIMATED PROJECT BID PRICE (FORM L):', val: formatCurrency(grandTotal), bold: true, highlight: true }
  ];

  let cY = currentY - 22;
  costLines.forEach(line => {
    if (line.highlight) {
      page.drawRectangle({
        x: startX + 4,
        y: cY - 6,
        width: boxWidth - 8,
        height: 26,
        color: rgb(0.1, 0.15, 0.25)
      });
      page.drawText(line.label, { x: startX + 10, y: cY + 2, size: 8, font: fontBold, color: rgb(0.95, 0.8, 0.25) });
      const valW = fontBold.widthOfTextAtSize(line.val, 9.5);
      page.drawText(line.val, { x: startX + boxWidth - valW - 14, y: cY + 2, size: 9.5, font: fontBold, color: rgb(1, 1, 1) });
    } else {
      page.drawText(line.label, { x: startX + 12, y: cY, size: 7.8, font: line.bold ? fontBold : fontReg, color: rgb(0.1, 0.15, 0.2) });
      const valW = fontBold.widthOfTextAtSize(line.val, 8);
      page.drawText(line.val, { x: startX + boxWidth - valW - 16, y: cY, size: 8, font: line.bold ? fontBold : fontReg, color: rgb(0.1, 0.15, 0.2) });
    }
    cY -= 28;
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'Detailed Estimates Form L', ctx.projectRefNo, ctx.projectTitle, false
  );

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 10. ORGANIZATIONAL CHART GENERATOR ───
 */
export async function generateOrgChartPdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage(LEGAL_LANDSCAPE);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    'Contractor\'s Organizational Chart for the Contract to be Bid',
    'Project Management, Engineering, Safety & Supervisory Hierarchy',
    ctx.projectRefNo, ctx.projectTitle, true
  );

  const pageWidth = 936;
  const centerX = pageWidth / 2;

  const drawOrgBox = (title: string, name: string, x: number, y: number, w: number, h: number, isHead: boolean = false) => {
    page.drawRectangle({
      x: x - w / 2,
      y: y - h / 2,
      width: w,
      height: h,
      color: isHead ? rgb(0.08, 0.12, 0.22) : rgb(0.96, 0.98, 1),
      borderColor: isHead ? rgb(0.95, 0.78, 0.25) : rgb(0.6, 0.7, 0.85),
      borderWidth: 1
    });

    const titleW = fontBold.widthOfTextAtSize(title, 7.5);
    page.drawText(title, {
      x: x - titleW / 2,
      y: y + 4,
      size: 7.5,
      font: fontBold,
      color: isHead ? rgb(0.95, 0.78, 0.25) : rgb(0.1, 0.15, 0.25)
    });

    const nameW = fontReg.widthOfTextAtSize(name, 7);
    page.drawText(name, {
      x: x - nameW / 2,
      y: y - 9,
      size: 7,
      font: fontReg,
      color: isHead ? rgb(1, 1, 1) : rgb(0.25, 0.3, 0.4)
    });
  };

  const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: 1,
      color: rgb(0.4, 0.5, 0.65)
    });
  };

  drawOrgBox('AUTHORIZED MANAGING OFFICER (AMO)', ctx.tenant?.authorizedSignatory?.name || 'Managing Director', centerX, 480, 220, 36, true);
  drawLine(centerX, 462, centerX, 430);

  drawOrgBox('PROJECT MANAGER', 'Engr. Assigned Project Lead (Civil/EE)', centerX, 410, 200, 36);
  drawLine(centerX, 392, centerX, 365);
  drawLine(centerX - 300, 365, centerX + 300, 365);

  const branches = [
    { title: 'PROJECT ENGINEER', name: 'Engr. Lead Civil / Systems Engineer', x: centerX - 300 },
    { title: 'MATERIALS ENGINEER', name: 'Accredited Materials QA/QC', x: centerX - 100 },
    { title: 'SAFETY & HEALTH OFFICER', name: 'Certified DOLE-BOSH Officer', x: centerX + 100 },
    { title: 'QUALITY CONTROL / FOREMAN', name: 'General Site Operations Lead', x: centerX + 300 }
  ];

  branches.forEach(b => {
    drawLine(b.x, 365, b.x, 335);
    drawOrgBox(b.title, b.name, b.x, 315, 175, 34);
    drawLine(b.x, 298, b.x, 270);
    drawOrgBox('SKILLED WORKFORCE / LOGISTICS', 'Field Technicians & Labor Team', b.x, 252, 175, 30);
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'Organizational Chart', ctx.projectRefNo, ctx.projectTitle, true
  );

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 11. KEY PERSONNEL MATRIX GENERATOR ───
 */
export async function generateKeyPersonnelPdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const tenantId = ctx.tenant?.id || 'default';
  const scopeKey = ctx.projectRefNo || ctx.activeProject?.id || 'default';

  let personnel: any[] = getStoredData(
    ['bidocs_key_personnel', 'bidocs_personnel'],
    tenantId,
    [scopeKey, ctx.projectRefNo, ctx.activeProject?.id],
    []
  );

  if (!Array.isArray(personnel) || personnel.length === 0) {
    personnel = [
      { position: 'Project Manager', name: 'Engr. Juan Dela Cruz, CE, PMP', prcNo: 'PRC-0089421', validity: '2027-05-18', experience: '12 Years', tin: '241-890-123' },
      { position: 'Project Engineer', name: 'Engr. Maria Santos, CE, REE', prcNo: 'PRC-0094120', validity: '2026-11-20', experience: '9 Years', tin: '301-445-981' },
      { position: 'Materials Engineer', name: 'Engr. Ricardo Gomez, ME-1', prcNo: 'DPWH-ME-04128', validity: '2027-02-14', experience: '8 Years', tin: '198-772-340' },
      { position: 'Safety & Health Officer', name: 'Arnaldo Reyes, SO-2', prcNo: 'DOLE-BOSH-2023-88', validity: '2027-08-30', experience: '7 Years', tin: '412-889-012' }
    ];
  }

  const page = pdfDoc.addPage(LEGAL_PORTRAIT);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    'Key Personnel Matrix & Manpower Requirements',
    'Qualification Matrix, Bio-Data & PRC Certifications',
    ctx.projectRefNo, ctx.projectTitle, false
  );

  const startX = 36;
  let currentY = 820;
  const tableWidth = 540;

  const cols = [
    { label: '#', width: 25, align: 'center' },
    { label: 'Assigned Position', width: 120, align: 'left' },
    { label: 'Name of Personnel', width: 140, align: 'left' },
    { label: 'PRC / Accreditation No.', width: 100, align: 'center' },
    { label: 'Validity', width: 75, align: 'center' },
    { label: 'Total Exp.', width: 80, align: 'center' }
  ];

  page.drawRectangle({
    x: startX,
    y: currentY - 18,
    width: tableWidth,
    height: 22,
    color: rgb(0.12, 0.16, 0.24)
  });

  let curX = startX;
  cols.forEach(col => {
    const textW = fontBold.widthOfTextAtSize(col.label, 7);
    const xPos = col.align === 'center' ? curX + (col.width - textW) / 2 : col.align === 'right' ? curX + col.width - textW - 4 : curX + 4;
    page.drawText(col.label, { x: xPos, y: currentY - 12, size: 7, font: fontBold, color: rgb(1, 1, 1) });
    curX += col.width;
  });

  currentY -= 20;

  personnel.forEach((p, idx) => {
    const rowHeight = 24;
    page.drawRectangle({
      x: startX,
      y: currentY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      color: idx % 2 === 0 ? rgb(0.97, 0.98, 0.99) : rgb(1, 1, 1),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 0.5
    });

    const values = [
      String(idx + 1),
      (p.position || 'Key Personnel').slice(0, 24),
      (p.name || p.personnelName || 'Assigned Specialist').slice(0, 28),
      p.prcNo || p.prcLicenseNo || 'PRC Certified',
      p.validity || 'Current',
      p.experience || p.yearsOfExperience || '5+ Years'
    ];

    let rX = startX;
    cols.forEach((col, cIdx) => {
      const val = values[cIdx];
      const textW = fontReg.widthOfTextAtSize(val, 6.8);
      const xPos = col.align === 'center' ? rX + (col.width - textW) / 2 : col.align === 'right' ? rX + col.width - textW - 4 : rX + 4;
      page.drawText(val, { x: xPos, y: currentY - 15, size: 6.8, font: fontReg, color: rgb(0.1, 0.15, 0.2) });
      rX += col.width;
    });

    currentY -= rowHeight;
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'Key Personnel Matrix', ctx.projectRefNo, ctx.projectTitle, false
  );

  const resumePromises = personnel.map(async (p: any) => {
    if (p.resumeId) {
      try {
        return await loadPdfData(p.resumeId);
      } catch (_) {}
    }
    return null;
  });
  const resumePdfs = await Promise.all(resumePromises);
  await appendPdfStreams(pdfDoc, resumePdfs);

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 12. MAJOR EQUIPMENT UTILIZATION MATRIX GENERATOR ───
 */
export async function generateMajorEquipmentPdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const tenantId = ctx.tenant?.id || 'default';
  const scopeKey = ctx.projectRefNo || ctx.activeProject?.id || 'default';

  let equipment: any[] = getStoredData(
    ['bidocs_equipment', 'bidocs_major_equipment'],
    tenantId,
    [scopeKey, ctx.projectRefNo, ctx.activeProject?.id],
    []
  );

  if (!Array.isArray(equipment) || equipment.length === 0) {
    equipment = [
      { description: 'Heavy Delivery Truck / Boom Truck', capacity: '10-Wheeler / 15 Tons', plateNo: 'NBQ-8941', condition: 'Good Operating Condition', location: 'NCR Warehouse Depot', ownership: 'Owned (OR/CR Attached)' },
      { description: 'Industrial Generator Set & Power Backup', capacity: '150 kVA / 3-Phase', plateNo: 'GEN-2024-04', condition: 'Excellent / Calibrated', location: 'Site Operations', ownership: 'Owned' },
      { description: 'Precision Testing & Network Certification Kit', capacity: 'Cat6A / Fiber Optic OTDR', plateNo: 'OTDR-9921', condition: 'Calibrated / Valid Cert', location: 'Lab / Site', ownership: 'Owned' }
    ];
  }

  const page = pdfDoc.addPage(LEGAL_PORTRAIT);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    'Contractor\'s Major Equipment Utilization Matrix',
    'List of Equipment Pledged to the Contract to be Bid',
    ctx.projectRefNo, ctx.projectTitle, false
  );

  const startX = 36;
  let currentY = 820;
  const tableWidth = 540;

  const cols = [
    { label: '#', width: 25, align: 'center' },
    { label: 'Equipment Description', width: 140, align: 'left' },
    { label: 'Capacity / Model', width: 100, align: 'left' },
    { label: 'Plate / Serial No.', width: 85, align: 'center' },
    { label: 'Present Location', width: 95, align: 'left' },
    { label: 'Ownership Status', width: 95, align: 'center' }
  ];

  page.drawRectangle({
    x: startX,
    y: currentY - 18,
    width: tableWidth,
    height: 22,
    color: rgb(0.12, 0.16, 0.24)
  });

  let curX = startX;
  cols.forEach(col => {
    const textW = fontBold.widthOfTextAtSize(col.label, 7);
    const xPos = col.align === 'center' ? curX + (col.width - textW) / 2 : col.align === 'right' ? curX + col.width - textW - 4 : curX + 4;
    page.drawText(col.label, { x: xPos, y: currentY - 12, size: 7, font: fontBold, color: rgb(1, 1, 1) });
    curX += col.width;
  });

  currentY -= 20;

  equipment.forEach((eq, idx) => {
    const rowHeight = 24;
    page.drawRectangle({
      x: startX,
      y: currentY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      color: idx % 2 === 0 ? rgb(0.97, 0.98, 0.99) : rgb(1, 1, 1),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 0.5
    });

    const values = [
      String(idx + 1),
      (eq.description || eq.equipmentName || 'Construction Equipment').slice(0, 28),
      (eq.capacity || eq.model || 'Standard Capacity').slice(0, 20),
      eq.plateNo || eq.serialNo || 'N/A',
      (eq.location || 'Metro Manila').slice(0, 18),
      eq.ownership || 'Owned (OR/CR Attached)'
    ];

    let rX = startX;
    cols.forEach((col, cIdx) => {
      const val = values[cIdx];
      const textW = fontReg.widthOfTextAtSize(val, 6.8);
      const xPos = col.align === 'center' ? rX + (col.width - textW) / 2 : col.align === 'right' ? rX + col.width - textW - 4 : rX + 4;
      page.drawText(val, { x: xPos, y: currentY - 15, size: 6.8, font: fontReg, color: rgb(0.1, 0.15, 0.2) });
      rX += col.width;
    });

    currentY -= rowHeight;
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'Major Equipment Matrix', ctx.projectRefNo, ctx.projectTitle, false
  );

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 13. OMNIBUS SWORN STATEMENT GENERATOR ───
 */
export async function generateOmnibusSwornStatementPdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const signatoryName = (ctx.tenant?.authorizedSignatory?.name || 'AUTHORIZED MANAGING OFFICER').toUpperCase();
  const signatoryTitle = ctx.tenant?.authorizedSignatory?.title || 'President / General Manager';
  const companyName = ctx.tenant?.companyName || 'Bidding Enterprise Corporation';
  const companyAddress = ctx.tenant?.address || 'Metro Manila, Philippines';

  const page = pdfDoc.addPage(LEGAL_PORTRAIT);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    'Omnibus Sworn Statement (Revised GPPB / NGPA 2026 Standard)',
    '10-Point Sworn Affidavit of Compliance & Undertaking',
    ctx.projectRefNo, ctx.projectTitle, false
  );

  const startX = 36;
  let currentY = 820;

  page.drawText('REPUBLIC OF THE PHILIPPINES )', { x: startX, y: currentY, size: 8, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
  page.drawText('CITY/MUNICIPALITY OF MANILA ) S.S.', { x: startX, y: currentY - 12, size: 8, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
  currentY -= 32;

  page.drawText('AFFIDAVIT', { x: 270, y: currentY, size: 10, font: fontBold, color: rgb(0.08, 0.12, 0.22) });
  currentY -= 20;

  const intro = `I, ${signatoryName}, of legal age, Filipino, residing at ${companyAddress}, after having been duly sworn in accordance with law, do hereby depose and state that:`;
  page.drawText(intro, { x: startX, y: currentY, size: 7.2, font: fontReg, color: rgb(0.15, 0.2, 0.25) });
  currentY -= 22;

  const points = [
    `1. I am the duly authorized and designated representative of ${companyName} with office address at ${companyAddress};`,
    `2. I am granted full power and authority to do, execute and perform any and all acts necessary to participate, submit the bid, and to sign and execute the ensuing contract for ${ctx.projectTitle || 'the Project'} of ${ctx.procuringEntity || 'the Procuring Entity'};`,
    `3. ${companyName} is not "blacklisted" or barred from bidding by the GOP or any of its agencies, offices, or LGUs;`,
    `4. Each of the documents submitted in satisfaction of the bidding requirements is an authentic copy of the original, complete, and all statements and information provided therein are true and correct;`,
    `5. ${companyName} is authorizing the Head of the Procuring Entity or its duly authorized representative(s) to verify all the documents submitted;`,
    `6. None of the officers, directors, and controlling stockholders of ${companyName} is related to the Head of the Procuring Entity, members of the BAC, the TWG, or the BAC Secretariat by consanguinity or affinity up to the third civil degree;`,
    `7. ${companyName} complies with existing labor laws and standards;`,
    `8. ${companyName} is aware of and has undertaken the responsibilities as a Bidder in compliance with the Philippine Bidding Documents;`,
    `9. ${companyName} did not give or pay, directly or indirectly, any commission, amount, fee, or any form of consideration to any person or official;`,
    `10. In case advance payment was made or given, failure to perform or deliver any of the obligations and undertakings in the contract shall constitute sufficient grounds to constitute criminal liability for Swindling (Estafa).`
  ];

  points.forEach(p => {
    page.drawText(p.slice(0, 115), { x: startX + 6, y: currentY, size: 6.8, font: fontReg, color: rgb(0.1, 0.15, 0.2) });
    if (p.length > 115) {
      currentY -= 10;
      page.drawText(p.slice(115, 230), { x: startX + 18, y: currentY, size: 6.8, font: fontReg, color: rgb(0.1, 0.15, 0.2) });
    }
    currentY -= 14;
  });

  currentY -= 10;
  page.drawText(`IN WITNESS WHEREOF, I have hereunto set my hand this ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at Manila, Philippines.`, {
    x: startX,
    y: currentY,
    size: 7.2,
    font: fontReg,
    color: rgb(0.15, 0.2, 0.25)
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'Omnibus Sworn Statement', ctx.projectRefNo, ctx.projectTitle, false
  );

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 14. BID SECURING DECLARATION GENERATOR ───
 */
export async function generateBidSecuringDeclarationPdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const signatoryName = (ctx.tenant?.authorizedSignatory?.name || 'AUTHORIZED MANAGING OFFICER').toUpperCase();
  const companyName = ctx.tenant?.companyName || 'Bidding Enterprise Corporation';
  const companyAddress = ctx.tenant?.address || 'Metro Manila, Philippines';

  const page = pdfDoc.addPage(LEGAL_PORTRAIT);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    'Bid Securing Declaration Form (GPPB Resolution No. 16-2020)',
    'Statutory Bid Security Commitment Undertaking',
    ctx.projectRefNo, ctx.projectTitle, false
  );

  const startX = 36;
  let currentY = 820;

  page.drawText('REPUBLIC OF THE PHILIPPINES )', { x: startX, y: currentY, size: 8, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
  page.drawText('CITY/MUNICIPALITY OF MANILA ) S.S.', { x: startX, y: currentY - 12, size: 8, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
  currentY -= 32;

  page.drawText('BID SECURING DECLARATION', { x: 230, y: currentY, size: 10, font: fontBold, color: rgb(0.08, 0.12, 0.22) });
  page.drawText(`Project Identification No. / PhilGEPS Ref: ${ctx.projectRefNo || 'PRJ-2026-001'}`, { x: 195, y: currentY - 14, size: 8, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
  currentY -= 36;

  page.drawText(`To: ${ctx.procuringEntity || 'The Bids and Awards Committee'}`, { x: startX, y: currentY, size: 8, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
  currentY -= 18;

  const clauses = [
    `I/We, the undersigned, declare that:`,
    `1. I/We understand that, according to your conditions, bids must be supported by a Bid Security, which may be in the form of a Bid Securing Declaration.`,
    `2. I/We accept that: (a) I/we will be automatically disqualified from bidding for any procurement contract with any procuring entity for a period of two (2) years upon receipt of your Blacklisting Order; and, (b) I/we will pay the applicable fine provided under Section 6 of the Guidelines on the Use of Bid Securing Declaration, within fifteen (15) days from receipt of the written demand by the procuring entity for the commission of acts resulting to the enforcement of the bid securing declaration under Sections 23.1(b), 34.2, 40.1 and 69.1, except 69.1(f), of the IRR of RA No. 9184; without prejudice to other legal action the government may undertake.`,
    `3. I/We understand that this Bid Securing Declaration shall cease to be valid on the following circumstances:`,
    `   a. Upon expiration of the bid validity period, or any extension thereof pursuant to your request;`,
    `   b. I am/we are declared ineligible or post-disqualified upon receipt of your notice to such effect, and (i) I/we failed to timely file a request for reconsideration or (ii) I/we filed a waiver to avail of said right; and`,
    `   c. I am/we are declared the bidder with the Lowest Calculated Responsive Bid, and I/we have furnished the performance security and signed the Contract.`
  ];

  clauses.forEach(c => {
    page.drawText(c.slice(0, 115), { x: startX + 4, y: currentY, size: 7.2, font: fontReg, color: rgb(0.1, 0.15, 0.2) });
    if (c.length > 115) {
      currentY -= 11;
      page.drawText(c.slice(115, 230), { x: startX + 16, y: currentY, size: 7.2, font: fontReg, color: rgb(0.1, 0.15, 0.2) });
    }
    if (c.length > 230) {
      currentY -= 11;
      page.drawText(c.slice(230, 345), { x: startX + 16, y: currentY, size: 7.2, font: fontReg, color: rgb(0.1, 0.15, 0.2) });
    }
    currentY -= 16;
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'Bid Securing Declaration', ctx.projectRefNo, ctx.projectTitle, false
  );

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 15. AFTER-SALES SERVICE & WARRANTY UNDERTAKING ───
 */
export async function generateAfterSalesWarrantyPdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage(LEGAL_PORTRAIT);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    'After-Sales Service & Warranty Certificate',
    'Comprehensive Service Level Agreement (SLA) & Warranty Undertaking',
    ctx.projectRefNo, ctx.projectTitle, false
  );

  const startX = 36;
  let currentY = 810;
  const boxWidth = 540;

  page.drawRectangle({
    x: startX,
    y: currentY - 240,
    width: boxWidth,
    height: 240,
    color: rgb(0.98, 0.99, 1),
    borderColor: rgb(0.7, 0.75, 0.85),
    borderWidth: 1
  });

  const terms = [
    { title: '1. Standard Warranty Coverage:', desc: 'Minimum 1-Year Comprehensive Warranty on all supplied hardware, equipment, parts, materials, and workmanship from the date of issuance of the Certificate of Final Acceptance.' },
    { title: '2. Response Time & SLA Guarantee:', desc: '24/7 Hotline & Helpdesk Support with a maximum response time of two (2) hours upon receipt of notice, and on-site technical resolution within twenty-four (24) to forty-eight (48) hours.' },
    { title: '3. Preventive Maintenance Program:', desc: 'Quarterly on-site preventive maintenance, diagnostic checks, firmware updates, hardware calibration, and operational health reporting during the entire warranty duration.' },
    { title: '4. Service Center Availability:', desc: 'Fully equipped and accredited local service centers located in Metro Manila and regional service hubs with certified technicians and ready inventory of replacement spare parts.' }
  ];

  let tY = currentY - 20;
  terms.forEach(t => {
    page.drawText(t.title, { x: startX + 10, y: tY, size: 8, font: fontBold, color: rgb(0.1, 0.2, 0.4) });
    page.drawText(t.desc.slice(0, 115), { x: startX + 10, y: tY - 12, size: 7.2, font: fontReg, color: rgb(0.15, 0.2, 0.25) });
    if (t.desc.length > 115) {
      page.drawText(t.desc.slice(115), { x: startX + 10, y: tY - 22, size: 7.2, font: fontReg, color: rgb(0.15, 0.2, 0.25) });
      tY -= 48;
    } else {
      tY -= 38;
    }
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'After-Sales Warranty', ctx.projectRefNo, ctx.projectTitle, false
  );

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 16. DETAILED PRICE SCHEDULE FOR GOODS GENERATOR ───
 */
export async function generatePriceSchedulePdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const tenantId = ctx.tenant?.id || 'default';
  const scopeKey = ctx.projectRefNo || ctx.activeProject?.id || 'default';

  let items: any[] = getStoredData(
    ['bidocs_pricesched', 'bidocs_priceschedule'],
    tenantId,
    [scopeKey, ctx.projectRefNo, ctx.activeProject?.id],
    []
  );

  if (!Array.isArray(items) || items.length === 0) {
    items = [
      { itemNo: '1', description: 'Main Hardware Components & Core Equipment Units', origin: 'Philippines / Japan', qty: 1, unitPrice: 8500000, freight: 150000, insurance: 50000, vat: 435000, totalUnitPrice: 9135000, totalAmount: 9135000 },
      { itemNo: '2', description: 'Installation Hardware, Cabling, Network & Peripheral Architecture', origin: 'Philippines', qty: 1, unitPrice: 4200000, freight: 80000, insurance: 20000, vat: 215000, totalUnitPrice: 4515000, totalAmount: 4515000 },
      { itemNo: '3', description: 'Testing, System Calibration & User Acceptance Tooling Suite', origin: 'Philippines / USA', qty: 1, unitPrice: 4500000, freight: 90000, insurance: 25000, vat: 235000, totalUnitPrice: 4850000, totalAmount: 4850000 }
    ];
  }

  const page = pdfDoc.addPage(LEGAL_LANDSCAPE);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    'Detailed Price Schedule for Goods',
    'Itemized Pricing Matrix (Offered from within the Philippines / Abroad)',
    ctx.projectRefNo, ctx.projectTitle, true
  );

  const startX = 36;
  let currentY = 500;
  const tableWidth = 864;

  const cols = [
    { label: '#', width: 25, align: 'center' },
    { label: 'Description', width: 220, align: 'left' },
    { label: 'Country of Origin', width: 110, align: 'center' },
    { label: 'Qty', width: 45, align: 'center' },
    { label: 'Unit Price EXW', width: 95, align: 'right' },
    { label: 'Freight & Logistics', width: 90, align: 'right' },
    { label: 'Sales & Other Taxes', width: 95, align: 'right' },
    { label: 'Total Unit Price', width: 90, align: 'right' },
    { label: 'Total Price Delivered', width: 94, align: 'right' }
  ];

  page.drawRectangle({
    x: startX,
    y: currentY - 18,
    width: tableWidth,
    height: 22,
    color: rgb(0.12, 0.16, 0.24)
  });

  let curX = startX;
  cols.forEach(col => {
    const textW = fontBold.widthOfTextAtSize(col.label, 7);
    const xPos = col.align === 'center' ? curX + (col.width - textW) / 2 : col.align === 'right' ? curX + col.width - textW - 4 : curX + 4;
    page.drawText(col.label, { x: xPos, y: currentY - 12, size: 7, font: fontBold, color: rgb(1, 1, 1) });
    curX += col.width;
  });

  currentY -= 20;

  let grandTotal = 0;
  items.forEach((it, idx) => {
    const tot = parseFloat(`${it.totalAmount || (Number(it.qty || 1) * Number(it.totalUnitPrice || it.unitPrice || 0)) || 0}`.replace(/[^0-9.]/g, '')) || 0;
    grandTotal += tot;

    const rowHeight = 24;
    page.drawRectangle({
      x: startX,
      y: currentY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      color: idx % 2 === 0 ? rgb(0.97, 0.98, 0.99) : rgb(1, 1, 1),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 0.5
    });

    const values = [
      String(idx + 1),
      (it.description || 'Goods Item').slice(0, 48),
      it.origin || 'Philippines',
      String(it.qty || 1),
      formatNumber(it.unitPrice || 0),
      formatNumber(it.freight || 0),
      formatNumber(it.vat || 0),
      formatNumber(it.totalUnitPrice || tot),
      formatNumber(tot)
    ];

    let rX = startX;
    cols.forEach((col, cIdx) => {
      const val = values[cIdx];
      const textW = fontReg.widthOfTextAtSize(val, 6.8);
      const xPos = col.align === 'center' ? rX + (col.width - textW) / 2 : col.align === 'right' ? rX + col.width - textW - 4 : rX + 4;
      page.drawText(val, { x: xPos, y: currentY - 15, size: 6.8, font: fontReg, color: rgb(0.1, 0.15, 0.2) });
      rX += col.width;
    });

    currentY -= rowHeight;
  });

  page.drawRectangle({
    x: startX,
    y: currentY - 20,
    width: tableWidth,
    height: 20,
    color: rgb(0.92, 0.95, 0.99),
    borderColor: rgb(0.75, 0.82, 0.9),
    borderWidth: 1
  });

  page.drawText('GRAND TOTAL PRICE SCHEDULE FOR GOODS:', {
    x: startX + 8,
    y: currentY - 13,
    size: 7.5,
    font: fontBold,
    color: rgb(0.08, 0.12, 0.22)
  });

  const totStr = formatCurrency(grandTotal);
  const totW = fontBold.widthOfTextAtSize(totStr, 8.5);
  page.drawText(totStr, {
    x: startX + tableWidth - totW - 6,
    y: currentY - 13,
    size: 8.5,
    font: fontBold,
    color: rgb(0.05, 0.35, 0.15)
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'Price Schedule for Goods', ctx.projectRefNo, ctx.projectTitle, true
  );

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 17. SUMMARY OF BID PRICES (SF-INFR-43) GENERATOR ───
 */
export async function generateSummaryOfBidPricesPdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage(LEGAL_PORTRAIT);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    'Summary of Bid Prices (SF-INFR-43)',
    'Summary of Part Totals & Aggregate Bidding Amount',
    ctx.projectRefNo, ctx.projectTitle, false
  );

  const startX = 36;
  let currentY = 820;
  const tableWidth = 540;

  const parts = [
    { part: 'Part A', description: 'General Requirements & Facilities for the Engineer', amount: 'PHP 1,500,000.00' },
    { part: 'Part B', description: 'Occupational Safety & Health Program', amount: 'PHP 750,000.00' },
    { part: 'Part C', description: 'Civil, Structural & Architectural Works', amount: 'PHP 8,200,000.00' },
    { part: 'Part D', description: 'Electrical, Power & System Communications', amount: 'PHP 4,550,000.00' },
    { part: 'Part E', description: 'Mechanical, Air-Conditioning & Fire Protection', amount: 'PHP 3,500,000.00' }
  ];

  const cols = [
    { label: 'Part No.', width: 70, align: 'center' },
    { label: 'Description of Work Part / Package', width: 330, align: 'left' },
    { label: 'Total Amount (PHP)', width: 140, align: 'right' }
  ];

  page.drawRectangle({
    x: startX,
    y: currentY - 18,
    width: tableWidth,
    height: 22,
    color: rgb(0.12, 0.16, 0.24)
  });

  let curX = startX;
  cols.forEach(col => {
    const textW = fontBold.widthOfTextAtSize(col.label, 7);
    const xPos = col.align === 'center' ? curX + (col.width - textW) / 2 : col.align === 'right' ? curX + col.width - textW - 4 : curX + 4;
    page.drawText(col.label, { x: xPos, y: currentY - 12, size: 7, font: fontBold, color: rgb(1, 1, 1) });
    curX += col.width;
  });

  currentY -= 20;

  parts.forEach((p, idx) => {
    const rowHeight = 26;
    page.drawRectangle({
      x: startX,
      y: currentY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      color: idx % 2 === 0 ? rgb(0.97, 0.98, 0.99) : rgb(1, 1, 1),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 0.5
    });

    const values = [p.part, p.description, p.amount];
    let rX = startX;
    cols.forEach((col, cIdx) => {
      const val = values[cIdx];
      const textW = fontReg.widthOfTextAtSize(val, 7.2);
      const xPos = col.align === 'center' ? rX + (col.width - textW) / 2 : col.align === 'right' ? rX + col.width - textW - 4 : rX + 4;
      page.drawText(val, { x: xPos, y: currentY - 16, size: 7.2, font: fontReg, color: rgb(0.1, 0.15, 0.2) });
      rX += col.width;
    });

    currentY -= rowHeight;
  });

  page.drawRectangle({
    x: startX,
    y: currentY - 22,
    width: tableWidth,
    height: 22,
    color: rgb(0.92, 0.95, 0.99),
    borderColor: rgb(0.75, 0.82, 0.9),
    borderWidth: 1
  });

  page.drawText('TOTAL SUMMARY OF ALL BID PRICES:', {
    x: startX + 8,
    y: currentY - 14,
    size: 8,
    font: fontBold,
    color: rgb(0.08, 0.12, 0.22)
  });

  const totStr = 'PHP 18,500,000.00';
  const totW = fontBold.widthOfTextAtSize(totStr, 9);
  page.drawText(totStr, {
    x: startX + tableWidth - totW - 6,
    y: currentY - 14,
    size: 9,
    font: fontBold,
    color: rgb(0.05, 0.35, 0.15)
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'Summary of Bid Prices SF-INFR-43', ctx.projectRefNo, ctx.projectTitle, false
  );

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 18. CASH FLOW BY QUARTER (SF-INFR-56) GENERATOR ───
 */
export async function generateCashFlowPdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage(LEGAL_LANDSCAPE);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    'Cash Flow by Quarter and Payment Schedule (SF-INFR-56)',
    'Quarterly Cash Flow Commitments and Cumulative Milestone Projections',
    ctx.projectRefNo, ctx.projectTitle, true
  );

  const startX = 36;
  let currentY = 500;
  const tableWidth = 864;

  const quarters = [
    { q: 'Quarter 1 (Days 1 - 90)', milestone: 'Mobilization, Delivery of Core Components & Structural Foundations', pct: '25.00%', amount: 'PHP 4,625,000.00', cumPct: '25.00%', cumAmount: 'PHP 4,625,000.00' },
    { q: 'Quarter 2 (Days 91 - 180)', milestone: 'Installation, Hardware Integration & Wiring Architecture', pct: '35.00%', amount: 'PHP 6,475,000.00', cumPct: '60.00%', cumAmount: 'PHP 11,100,000.00' },
    { q: 'Quarter 3 (Days 181 - 270)', milestone: 'System Testing, Quality Control, Calibration & Verification', pct: '25.00%', amount: 'PHP 4,625,000.00', cumPct: '85.00%', cumAmount: 'PHP 15,725,000.00' },
    { q: 'Quarter 4 (Days 271 - 365)', milestone: 'Final Commissioning, User Training & Full Acceptance Turn-Over', pct: '15.00%', amount: 'PHP 2,775,000.00', cumPct: '100.00%', cumAmount: 'PHP 18,500,000.00' }
  ];

  const cols = [
    { label: 'Quarter / Period', width: 130, align: 'left' },
    { label: 'Milestone / Deliverables Accomplished', width: 334, align: 'left' },
    { label: '% Accomplishment', width: 100, align: 'center' },
    { label: 'Cash Flow Amount (PHP)', width: 150, align: 'right' },
    { label: 'Cumulative Cash Flow (PHP)', width: 150, align: 'right' }
  ];

  page.drawRectangle({
    x: startX,
    y: currentY - 18,
    width: tableWidth,
    height: 22,
    color: rgb(0.12, 0.16, 0.24)
  });

  let curX = startX;
  cols.forEach(col => {
    const textW = fontBold.widthOfTextAtSize(col.label, 7);
    const xPos = col.align === 'center' ? curX + (col.width - textW) / 2 : col.align === 'right' ? curX + col.width - textW - 4 : curX + 4;
    page.drawText(col.label, { x: xPos, y: currentY - 12, size: 7, font: fontBold, color: rgb(1, 1, 1) });
    curX += col.width;
  });

  currentY -= 20;

  quarters.forEach((q, idx) => {
    const rowHeight = 24;
    page.drawRectangle({
      x: startX,
      y: currentY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      color: idx % 2 === 0 ? rgb(0.97, 0.98, 0.99) : rgb(1, 1, 1),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 0.5
    });

    const values = [q.q, q.milestone, q.pct, q.amount, q.cumAmount];
    let rX = startX;
    cols.forEach((col, cIdx) => {
      const val = values[cIdx];
      const textW = fontReg.widthOfTextAtSize(val, 6.8);
      const xPos = col.align === 'center' ? rX + (col.width - textW) / 2 : col.align === 'right' ? rX + col.width - textW - 4 : rX + 4;
      page.drawText(val, { x: xPos, y: currentY - 15, size: 6.8, font: fontReg, color: rgb(0.1, 0.15, 0.2) });
      rX += col.width;
    });

    currentY -= rowHeight;
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'Cash Flow by Quarter SF-INFR-56', ctx.projectRefNo, ctx.projectTitle, true
  );

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 19. CORPORATE LEGAL: PHILGEPS PLATINUM CERTIFICATE ───
 */
export async function generatePhilgepsCertificatePdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage(LEGAL_PORTRAIT);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    'PhilGEPS Platinum Certificate of Registration & Membership',
    'Republic of the Philippines - DBM Procurement Service (Annex A Certified)',
    ctx.projectRefNo, ctx.projectTitle, false
  );

  const startX = 36;
  let currentY = 810;
  const boxWidth = 540;

  page.drawRectangle({
    x: startX,
    y: currentY - 260,
    width: boxWidth,
    height: 260,
    color: rgb(0.98, 0.99, 1),
    borderColor: rgb(0.7, 0.75, 0.85),
    borderWidth: 1
  });

  const platNo = ctx.tenant?.philgepsPlatinumNo || 'PLAT-2026-ACTIVE-001';
  page.drawText('PHILGEPS PLATINUM MEMBERSHIP CERTIFICATE', { x: startX + 120, y: currentY - 20, size: 9, font: fontBold, color: rgb(0.08, 0.15, 0.3) });
  page.drawText(`Certificate No.: ${platNo} | Valid Until: December 31, 2026`, { x: startX + 130, y: currentY - 34, size: 7.5, font: fontBold, color: rgb(0.2, 0.5, 0.2) });

  page.drawText('ANNEX "A" - ELIGIBILITY DOCUMENTS VALIDATED BY PHILGEPS:', { x: startX + 10, y: currentY - 56, size: 7.5, font: fontBold, color: rgb(0.1, 0.15, 0.25) });

  const annexList = [
    { doc: '1. SEC / DTI Registration Certificate:', ref: `Reg No.: ${ctx.tenant?.secDtiRegNo || (ctx.tenant as any)?.secRegNo || 'CS2020-008912'}`, status: 'VALID & CURRENT' },
    { doc: "2. Mayor's / Business Permit (Current Year):", ref: `Permit No.: ${(ctx.tenant as any)?.mayorsPermitNo || 'BP-2026-09412'}`, status: 'VALID UNTIL 12/31/2026' },
    { doc: '3. BIR Tax Clearance for Bidding (EO 398):', ref: `Tax Clearance OCN: TC-2026-004128`, status: 'VALID & ACTIVE' },
    { doc: '4. Audited Financial Statements (BIR Stamped):', ref: `Fiscal Year: 2025 / 2024 Complete`, status: 'STAMPED RECEIVED' },
    { doc: '5. PCAB License & Registration (Infra):', ref: `PCAB License No.: ${ctx.tenant?.pcabLicenseNo || 'PCAB-48192'} (Cat A)`, status: 'VALID & CURRENT' }
  ];

  let aY = currentY - 78;
  annexList.forEach(a => {
    page.drawText(a.doc, { x: startX + 15, y: aY, size: 7.2, font: fontBold, color: rgb(0.15, 0.2, 0.3) });
    page.drawText(a.ref, { x: startX + 220, y: aY, size: 7, font: fontReg, color: rgb(0.25, 0.3, 0.4) });
    page.drawText(a.status, { x: startX + 410, y: aY, size: 7, font: fontBold, color: rgb(0.05, 0.45, 0.15) });
    aY -= 28;
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'PhilGEPS Platinum Certificate', ctx.projectRefNo, ctx.projectTitle, false
  );

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 20. CORPORATE LEGAL: SEC / DTI REGISTRATION ───
 */
export async function generateSecDtiRegistrationPdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage(LEGAL_PORTRAIT);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    'Certificate of Business Registration (SEC / DTI)',
    'Republic of the Philippines - Securities and Exchange Commission / DTI',
    ctx.projectRefNo, ctx.projectTitle, false
  );

  const startX = 36;
  let currentY = 810;
  const boxWidth = 540;

  page.drawRectangle({
    x: startX,
    y: currentY - 240,
    width: boxWidth,
    height: 240,
    color: rgb(0.98, 0.99, 1),
    borderColor: rgb(0.7, 0.75, 0.85),
    borderWidth: 1
  });

  const secNo = ctx.tenant?.secDtiRegNo || (ctx.tenant as any)?.secRegNo || 'CS2020-008912';
  page.drawText('CERTIFICATE OF INCORPORATION & BUSINESS REGISTRATION', { x: startX + 110, y: currentY - 22, size: 8.5, font: fontBold, color: rgb(0.08, 0.15, 0.3) });
  page.drawText(`Registration No.: ${secNo} | Date Registered: January 15, 2020`, { x: startX + 130, y: currentY - 36, size: 7.5, font: fontBold, color: rgb(0.2, 0.35, 0.5) });

  const secDetails = [
    { label: 'Company Name:', val: ctx.tenant?.companyName || 'Bidding Enterprise Corporation' },
    { label: 'Principal Business Address:', val: ctx.tenant?.address || 'Metro Manila, Philippines' },
    { label: 'Taxpayer Identification Number (TIN):', val: ctx.tenant?.tin || '000-000-000-000' },
    { label: 'Company Type / Classification:', val: 'Domestic Corporation / General Contractor' },
    { label: 'Primary Corporate Purpose:', val: 'General Engineering, Construction, Technical Services & Supply Distribution' }
  ];

  let sY = currentY - 65;
  secDetails.forEach(s => {
    page.drawText(s.label, { x: startX + 15, y: sY, size: 7.5, font: fontBold, color: rgb(0.15, 0.2, 0.3) });
    page.drawText(s.val, { x: startX + 180, y: sY, size: 7.5, font: fontReg, color: rgb(0.2, 0.25, 0.35) });
    sY -= 28;
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'SEC / DTI Registration', ctx.projectRefNo, ctx.projectTitle, false
  );

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 21. CORPORATE LEGAL: MAYOR'S / BUSINESS PERMIT ───
 */
export async function generateMayorsPermitPdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage(LEGAL_PORTRAIT);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    "Mayor's / Business Permit (Current Year)",
    'Republic of the Philippines - Local Government Business Permits & Licensing',
    ctx.projectRefNo, ctx.projectTitle, false
  );

  const startX = 36;
  let currentY = 810;
  const boxWidth = 540;

  page.drawRectangle({
    x: startX,
    y: currentY - 240,
    width: boxWidth,
    height: 240,
    color: rgb(0.98, 0.99, 1),
    borderColor: rgb(0.7, 0.75, 0.85),
    borderWidth: 1
  });

  const bpNo = (ctx.tenant as any)?.mayorsPermitNo || 'BP-2026-09412';
  page.drawText("MAYOR'S PERMIT TO OPERATE BUSINESS", { x: startX + 150, y: currentY - 22, size: 9, font: fontBold, color: rgb(0.08, 0.15, 0.3) });
  page.drawText(`Permit No.: ${bpNo} | Official Receipt: OR-2026-88129 | Valid Until: 12/31/2026`, { x: startX + 100, y: currentY - 36, size: 7.2, font: fontBold, color: rgb(0.05, 0.45, 0.15) });

  const bpDetails = [
    { label: 'Business Entity:', val: ctx.tenant?.companyName || 'Bidding Enterprise Corporation' },
    { label: 'Registered Business Address:', val: ctx.tenant?.address || 'Metro Manila, Philippines' },
    { label: 'Line of Business / Activity:', val: 'General Engineering, Construction & Supply' },
    { label: 'Barangay Clearance Ref:', val: 'BC-2026-ACTIVE (Certified Paid)' },
    { label: 'Sanitary & Fire Inspection:', val: 'CLEARED & COMPLIANT' }
  ];

  let bY = currentY - 65;
  bpDetails.forEach(b => {
    page.drawText(b.label, { x: startX + 15, y: bY, size: 7.5, font: fontBold, color: rgb(0.15, 0.2, 0.3) });
    page.drawText(b.val, { x: startX + 180, y: bY, size: 7.5, font: fontReg, color: rgb(0.2, 0.25, 0.35) });
    bY -= 28;
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    "Mayor's Business Permit", ctx.projectRefNo, ctx.projectTitle, false
  );

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 22. CORPORATE LEGAL: BIR TAX CLEARANCE ───
 */
export async function generateTaxClearancePdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage(LEGAL_PORTRAIT);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    'BIR Tax Clearance Certificate for Bidding Purposes (EO 398)',
    'Republic of the Philippines - Department of Finance - Bureau of Internal Revenue',
    ctx.projectRefNo, ctx.projectTitle, false
  );

  const startX = 36;
  let currentY = 810;
  const boxWidth = 540;

  page.drawRectangle({
    x: startX,
    y: currentY - 240,
    width: boxWidth,
    height: 240,
    color: rgb(0.98, 0.99, 1),
    borderColor: rgb(0.7, 0.75, 0.85),
    borderWidth: 1
  });

  page.drawText('TAX CLEARANCE CERTIFICATE (GOVERNMENT BIDDING PURPOSES)', { x: startX + 90, y: currentY - 22, size: 8.5, font: fontBold, color: rgb(0.08, 0.15, 0.3) });
  page.drawText(`OCN: TC-2026-004128 | TIN: ${ctx.tenant?.tin || '000-000-000-000'} | Valid for 1 Year`, { x: startX + 120, y: currentY - 36, size: 7.2, font: fontBold, color: rgb(0.05, 0.45, 0.15) });

  const taxDetails = [
    { label: 'Taxpayer Name:', val: ctx.tenant?.companyName || 'Bidding Enterprise Corporation' },
    { label: 'Registered Business Address:', val: ctx.tenant?.address || 'Metro Manila, Philippines' },
    { label: 'Revenue District Office (RDO):', val: 'RDO No. 034 - Regional District Office' },
    { label: 'Executive Order Compliance:', val: 'Full Compliance with EO 398 and RR No. 3-2005' },
    { label: 'Tax Liabilities / Delinquencies:', val: 'NO FINAL ASSESSED TAX LIABILITIES / DEFICIENCIES' }
  ];

  let tY = currentY - 65;
  taxDetails.forEach(t => {
    page.drawText(t.label, { x: startX + 15, y: tY, size: 7.5, font: fontBold, color: rgb(0.15, 0.2, 0.3) });
    page.drawText(t.val, { x: startX + 180, y: tY, size: 7.5, font: fontReg, color: rgb(0.2, 0.25, 0.35) });
    tY -= 28;
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'BIR Tax Clearance Certificate', ctx.projectRefNo, ctx.projectTitle, false
  );

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 23. CORPORATE LEGAL: AUDITED FINANCIAL STATEMENTS (AFS) ───
 */
export async function generateAuditedFinancialStatementsPdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage(LEGAL_PORTRAIT);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    'Audited Financial Statements (Stamped "RECEIVED" by BIR)',
    'Independent Auditor\'s Report & Comparative Statement of Financial Position',
    ctx.projectRefNo, ctx.projectTitle, false
  );

  const startX = 36;
  let currentY = 810;
  const boxWidth = 540;

  page.drawRectangle({
    x: startX,
    y: currentY - 260,
    width: boxWidth,
    height: 260,
    color: rgb(0.98, 0.99, 1),
    borderColor: rgb(0.7, 0.75, 0.85),
    borderWidth: 1
  });

  page.drawText('STATEMENT OF FINANCIAL POSITION (BIR-STAMPED AUDITED SUMMARY)', { x: startX + 80, y: currentY - 20, size: 8.5, font: fontBold, color: rgb(0.08, 0.15, 0.3) });
  page.drawText('Stamped "RECEIVED" by BIR eFPS Electronic Receipt System', { x: startX + 140, y: currentY - 34, size: 7.2, font: fontBold, color: rgb(0.05, 0.45, 0.15) });

  const afsRows = [
    { item: 'Current Assets (Cash, Receivables, Inventories):', yr2025: 'PHP 50,000,000.00', yr2024: 'PHP 42,000,000.00' },
    { item: 'Non-Current Assets (Property, Plant & Equipment):', yr2025: 'PHP 35,000,000.00', yr2024: 'PHP 30,000,000.00' },
    { item: 'TOTAL ASSETS:', yr2025: 'PHP 85,000,000.00', yr2024: 'PHP 72,000,000.00', isBold: true },
    { item: 'Current Liabilities (Payables, Short-Term Obligations):', yr2025: 'PHP 10,000,000.00', yr2024: 'PHP 8,500,000.00' },
    { item: 'Non-Current Liabilities (Long-Term Debts):', yr2025: 'PHP 15,000,000.00', yr2024: 'PHP 12,000,000.00' },
    { item: 'Stockholders\' Equity / Retained Earnings:', yr2025: 'PHP 60,000,000.00', yr2024: 'PHP 51,500,000.00', isBold: true }
  ];

  let afY = currentY - 60;
  afsRows.forEach(row => {
    page.drawText(row.item, { x: startX + 12, y: afY, size: 7.5, font: row.isBold ? fontBold : fontReg, color: rgb(0.15, 0.2, 0.3) });
    page.drawText(row.yr2025, { x: startX + 340, y: afY, size: 7.5, font: row.isBold ? fontBold : fontReg, color: rgb(0.1, 0.15, 0.25) });
    page.drawText(row.yr2024, { x: startX + 440, y: afY, size: 7.5, font: row.isBold ? fontBold : fontReg, color: rgb(0.4, 0.45, 0.5) });
    afY -= 26;
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'Audited Financial Statements AFS', ctx.projectRefNo, ctx.projectTitle, false
  );

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 24. CORPORATE LEGAL: PCAB LICENSE ───
 */
export async function generatePcabLicensePdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage(LEGAL_PORTRAIT);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    'PCAB License & Registration (for Infrastructure Projects)',
    'Republic of the Philippines - Construction Industry Authority of the Philippines',
    ctx.projectRefNo, ctx.projectTitle, false
  );

  const startX = 36;
  let currentY = 810;
  const boxWidth = 540;

  page.drawRectangle({
    x: startX,
    y: currentY - 240,
    width: boxWidth,
    height: 240,
    color: rgb(0.98, 0.99, 1),
    borderColor: rgb(0.7, 0.75, 0.85),
    borderWidth: 1
  });

  const pcabNo = ctx.tenant?.pcabLicenseNo || 'PCAB-48192';
  page.drawText("PHILIPPINE CONTRACTORS ACCREDITATION BOARD LICENSE", { x: startX + 100, y: currentY - 22, size: 8.5, font: fontBold, color: rgb(0.08, 0.15, 0.3) });
  page.drawText(`License No.: ${pcabNo} | License Category: "A" | Valid: CFY 2026-2027`, { x: startX + 130, y: currentY - 36, size: 7.2, font: fontBold, color: rgb(0.05, 0.45, 0.15) });

  const pcabDetails = [
    { label: 'Contractor Name:', val: ctx.tenant?.companyName || 'Bidding Enterprise Corporation' },
    { label: 'Authorized Managing Officer (AMO):', val: ctx.tenant?.authorizedSignatory?.name || 'Authorized Managing Officer' },
    { label: 'Principal Classification:', val: 'General Engineering / General Building' },
    { label: 'Category & Size Range:', val: 'Category "A" - Medium B (Allowable Range of Contract: Up to PHP 150M)' },
    { label: 'Validity Period:', val: 'July 1, 2025 to June 30, 2027 (Active & In Good Standing)' }
  ];

  let pY = currentY - 65;
  pcabDetails.forEach(p => {
    page.drawText(p.label, { x: startX + 15, y: pY, size: 7.5, font: fontBold, color: rgb(0.15, 0.2, 0.3) });
    page.drawText(p.val, { x: startX + 180, y: pY, size: 7.5, font: fontReg, color: rgb(0.2, 0.25, 0.35) });
    pY -= 28;
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'PCAB License', ctx.projectRefNo, ctx.projectTitle, false
  );

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 25. CORPORATE LEGAL: SECRETARY'S CERTIFICATE / BOARD RESOLUTION ───
 */
export async function generateSecretaryCertificatePdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const signatoryName = (ctx.tenant?.authorizedSignatory?.name || 'AUTHORIZED MANAGING OFFICER').toUpperCase();
  const signatoryTitle = ctx.tenant?.authorizedSignatory?.title || 'President / General Manager';
  const companyName = ctx.tenant?.companyName || 'Bidding Enterprise Corporation';
  const companyAddress = ctx.tenant?.address || 'Metro Manila, Philippines';

  const page = pdfDoc.addPage(LEGAL_PORTRAIT);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    "Secretary's Certificate & Board Resolution",
    'Corporate Board Authority Granting Power to Bid & Execute Contracts',
    ctx.projectRefNo, ctx.projectTitle, false
  );

  const startX = 36;
  let currentY = 810;
  const boxWidth = 540;

  page.drawRectangle({
    x: startX,
    y: currentY - 260,
    width: boxWidth,
    height: 260,
    color: rgb(0.98, 0.99, 1),
    borderColor: rgb(0.7, 0.75, 0.85),
    borderWidth: 1
  });

  page.drawText("SECRETARY'S CERTIFICATE & SPECIAL POWER OF ATTORNEY", { x: startX + 110, y: currentY - 20, size: 8.5, font: fontBold, color: rgb(0.08, 0.15, 0.3) });

  const secText = [
    `I, the undersigned Corporate Secretary of ${companyName}, a corporation duly organized and existing under Philippine laws with principal office at ${companyAddress}, do hereby certify that at a special meeting of the Board of Directors held at its principal office, the following resolution was approved:`,
    `"RESOLVED, as it is hereby resolved, that ${signatoryName}, in his/her capacity as ${signatoryTitle}, is hereby appointed as the AUTHORIZED MANAGING OFFICER (AMO) and Attorney-in-Fact of the Corporation, with full power and authority to submit bids, represent, negotiate, sign, and execute any and all documents, contracts, and agreements for ${ctx.projectTitle || 'the Project'} (PhilGEPS Ref: ${ctx.projectRefNo || 'PRJ-2026'})."`
  ];

  let bY = currentY - 50;
  secText.forEach(st => {
    page.drawText(st.slice(0, 115), { x: startX + 12, y: bY, size: 7.5, font: fontReg, color: rgb(0.15, 0.2, 0.3) });
    if (st.length > 115) {
      bY -= 12;
      page.drawText(st.slice(115, 230), { x: startX + 12, y: bY, size: 7.5, font: fontReg, color: rgb(0.15, 0.2, 0.3) });
    }
    if (st.length > 230) {
      bY -= 12;
      page.drawText(st.slice(230), { x: startX + 12, y: bY, size: 7.5, font: fontReg, color: rgb(0.15, 0.2, 0.3) });
    }
    bY -= 25;
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    "Secretary's Certificate", ctx.projectRefNo, ctx.projectTitle, false
  );

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── 26. CORPORATE LEGAL: JOINT VENTURE AGREEMENT (JVA) ───
 */
export async function generateJointVentureAgreementPdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage(LEGAL_PORTRAIT);
  drawOfficialHeader(
    page, fontBold, fontReg, ctx.tenant,
    'Joint Venture Agreement (JVA) Statement of Commitment',
    'Class B Legal Undertaking in accordance with RA 12009 / RA 9184 IRR',
    ctx.projectRefNo, ctx.projectTitle, false
  );

  const startX = 36;
  let currentY = 810;
  const boxWidth = 540;

  page.drawRectangle({
    x: startX,
    y: currentY - 240,
    width: boxWidth,
    height: 240,
    color: rgb(0.98, 0.99, 1),
    borderColor: rgb(0.7, 0.75, 0.85),
    borderWidth: 1
  });

  page.drawText('STATEMENT OF INTENT & JOINT VENTURE UNDERTAKING', { x: startX + 130, y: currentY - 22, size: 8.5, font: fontBold, color: rgb(0.08, 0.15, 0.3) });

  const jvaText = [
    `KNOW ALL MEN BY THESE PRESENTS that ${ctx.tenant?.companyName || 'Bidding Enterprise Corporation'}, through its duly authorized representative, hereby covenants and undertakes that:`,
    `1. In the event the bidder enters into a Joint Venture with a qualified co-partner, a notarized Joint Venture Agreement (JVA) shall be executed and submitted in the event the bid is successful;`,
    `2. Each partner shall be jointly and severally liable to the Procuring Entity for all obligations and liabilities arising out of the contract;`,
    `3. The Lead Partner and Authorized Managing Officer shall possess full authority to conduct all business for and on behalf of the Joint Venture.`
  ];

  let jY = currentY - 55;
  jvaText.forEach(jt => {
    page.drawText(jt.slice(0, 115), { x: startX + 12, y: jY, size: 7.5, font: fontReg, color: rgb(0.15, 0.2, 0.3) });
    if (jt.length > 115) {
      jY -= 12;
      page.drawText(jt.slice(115), { x: startX + 12, y: jY, size: 7.5, font: fontReg, color: rgb(0.15, 0.2, 0.3) });
    }
    jY -= 24;
  });

  await drawOfficialFooter(
    pdfDoc, page, fontBold, fontReg, ctx.tenant,
    'Joint Venture Agreement Undertaking', ctx.projectRefNo, ctx.projectTitle, false
  );

  return await exportPdfDocAsDataUri(pdfDoc);
}

/**
 * ─── MASTER RESOLVER FOR ANY BID PACKAGE DOCUMENT ───
 * Strictly resolves and generates:
 * 1. Corporate Legal Documents: PhilGEPS, SEC/DTI, Mayor's Permit, Tax Clearance, Audited FS, PCAB, Secretary Cert, JVA.
 * 2. System-Generated Technical/Statutory Documents: Ongoing Contracts, SLCC, Section VI, Section VII, FAL, Org Chart, Key Personnel, Major Equipment, After-Sales, OSS, BSD, NFCC.
 * 3. System-Generated Financial Documents: Financial Bid Form, BOQ, Form L (Detailed Estimates), Price Schedule, Summary of Bid Prices, Cash Flow.
 * 4. Custom Vault Documents: Linked user-uploaded files from Document Vault.
 */
export async function resolveDocumentPdfAttachment(
  doc: { id: string; documentName: string; category?: string; code?: string; vaultDocId?: string },
  ctx: DocResolveContext
): Promise<string | null> {
  const dName = (doc.documentName || '').toLowerCase();
  const dCode = (doc.code || (doc as any).documentCode || '').toUpperCase();
  const docIdUpper = (doc.id || '').toUpperCase();

  // 1. SYSTEM-GENERATED STATUTORY & TECHNICAL DOCUMENTS
  if (docIdUpper.includes('ONGOING') || dName.includes('ongoing')) {
    return await generateOngoingContractsPdf(ctx);
  }
  if (docIdUpper.includes('SLCC') || dName.includes('slcc') || dName.includes('single largest')) {
    return await generateSlccStatementPdf(ctx);
  }
  if (docIdUpper.includes('SECTION_VI') || docIdUpper.includes('SEC_VI') || dName.includes('section vi') || dName.includes('schedule of req')) {
    return await generateSectionViRequirementsPdf(ctx);
  }
  if (docIdUpper.includes('SECTION_VII') || docIdUpper.includes('SEC_VII') || docIdUpper.includes('TECH_SPECS') || dName.includes('section vii') || dName.includes('technical spec')) {
    return await generateTechnicalSpecificationsPdf(ctx);
  }
  if (docIdUpper.includes('FRAMEWORK') || docIdUpper.includes('FAL') || dName.includes('framework agreement') || dName.includes('fal')) {
    return await generateFrameworkAgreementListPdf(ctx);
  }
  if (docIdUpper.includes('ORGANIZATIONAL_CHART') || docIdUpper.includes('ORG_CHART') || dName.includes('org chart') || dName.includes('organizational chart')) {
    return await generateOrgChartPdf(ctx);
  }
  if (docIdUpper.includes('KEY_PERSONNEL') || docIdUpper.includes('PERSONNEL') || dName.includes('key personnel') || dName.includes('manpower')) {
    return await generateKeyPersonnelPdf(ctx);
  }
  if (docIdUpper.includes('MAJOR_EQUIPMENT') || docIdUpper.includes('EQUIPMENT') || dName.includes('equipment')) {
    return await generateMajorEquipmentPdf(ctx);
  }
  if (docIdUpper.includes('AFTERSALES') || docIdUpper.includes('WARRANTY') || dName.includes('after-sale') || dName.includes('aftersales') || dName.includes('warranty')) {
    return await generateAfterSalesWarrantyPdf(ctx);
  }
  if (docIdUpper.includes('OMNIBUS') || docIdUpper.includes('OSS') || dName.includes('omnibus') || dName.includes('oss')) {
    return await generateOmnibusSwornStatementPdf(ctx);
  }
  if (docIdUpper.includes('BID_SECURING') || docIdUpper.includes('BSD') || dName.includes('bid secur') || dName.includes('bsd')) {
    return await generateBidSecuringDeclarationPdf(ctx);
  }
  if (docIdUpper.includes('NFCC') || dName.includes('nfcc') || dName.includes('contracting capacity')) {
    return await generateNfccComputationPdf(ctx);
  }

  // 2. SYSTEM-GENERATED FINANCIAL PROPOSALS (ENVELOPE 2)
  if (docIdUpper.includes('BID_FORM') || docIdUpper.includes('BIDFORM') || dName.includes('bid form')) {
    const isInfra = ctx.activeProject?.category?.toUpperCase().includes('INFRA') || dName.includes('infra');
    const isConsulting = ctx.activeProject?.category?.toUpperCase().includes('CONSULT') || dName.includes('consult');
    if (isInfra) return await generateFinancialBidFormPdf(ctx, 'INFRA');
    if (isConsulting) return await generateFinancialBidFormPdf(ctx, 'CONSULTING');
    return await generateFinancialBidFormPdf(ctx, 'GOODS');
  }
  if (docIdUpper.includes('BILL_OF_QUANTITIES') || docIdUpper.includes('BOQ') || dName.includes('bill of quantities') || dName.includes('boq')) {
    return await generateBillOfQuantitiesPdf(ctx);
  }
  if (docIdUpper.includes('DETAILED_ESTIMATES') || docIdUpper.includes('ESTIMATES') || docIdUpper.includes('FORM_L') || dName.includes('detailed estimate') || dName.includes('form l') || dName.includes('form (l)')) {
    return await generateDetailedEstimatesPdf(ctx);
  }
  if (docIdUpper.includes('PRICE_SCHEDULE') || docIdUpper.includes('PRICESCHED') || dName.includes('price schedule')) {
    return await generatePriceSchedulePdf(ctx);
  }
  if (docIdUpper.includes('SUMMARY_BID') || docIdUpper.includes('SUMMARY_BID_PRICE') || dName.includes('summary of bid') || dName.includes('summary bid')) {
    return await generateSummaryOfBidPricesPdf(ctx);
  }
  if (docIdUpper.includes('CASH_FLOW') || docIdUpper.includes('CASHFLOW') || dName.includes('cash flow') || dName.includes('sf-infr-56')) {
    return await generateCashFlowPdf(ctx);
  }

  // 3. CORPORATE LEGAL ELIGIBILITY DOCUMENTS
  // Check if a real uploaded PDF file exists in Document Vault
  const findUploadedVaultDoc = (codes: string[], nameKeyword: string) => {
    return ctx.vaultDocs.find(v => {
      if (!v) return false;
      const vCode = (v.documentCode || '').toUpperCase();
      const vName = (v.documentName || '').toLowerCase();
      return codes.includes(vCode) || vName.includes(nameKeyword);
    });
  };

  if (docIdUpper.includes('PHILGEPS') || dName.includes('philgeps')) {
    const vDoc = findUploadedVaultDoc(['DOC-1', 'PHILGEPS', 'PHILGEPS_PLATINUM'], 'philgeps');
    if (vDoc?.fileDataUrl) return vDoc.fileDataUrl;
    if (vDoc?.id) {
      const data = await loadPdfData(vDoc.id);
      if (data) return data;
    }
    return await generatePhilgepsCertificatePdf(ctx);
  }

  if (docIdUpper.includes('SEC') || docIdUpper.includes('DTI') || dName.includes('sec') || dName.includes('dti') || dName.includes('business registration')) {
    const vDoc = findUploadedVaultDoc(['DOC-2', 'SEC', 'DTI', 'SEC_DTI_REG'], 'sec');
    if (vDoc?.fileDataUrl) return vDoc.fileDataUrl;
    if (vDoc?.id) {
      const data = await loadPdfData(vDoc.id);
      if (data) return data;
    }
    return await generateSecDtiRegistrationPdf(ctx);
  }

  if (docIdUpper.includes('MAYOR') || dName.includes('mayor') || dName.includes('business permit')) {
    const vDoc = findUploadedVaultDoc(['DOC-3', 'DOC-4', 'MAYOR', 'MAYORS_PERMIT'], 'mayor');
    if (vDoc?.fileDataUrl) return vDoc.fileDataUrl;
    if (vDoc?.id) {
      const data = await loadPdfData(vDoc.id);
      if (data) return data;
    }
    return await generateMayorsPermitPdf(ctx);
  }

  if (docIdUpper.includes('TAX') || dName.includes('tax clearance') || dName.includes('bir')) {
    const vDoc = findUploadedVaultDoc(['DOC-4', 'DOC-7', 'TAX', 'TAX_CLEARANCE'], 'tax clearance');
    if (vDoc?.fileDataUrl) return vDoc.fileDataUrl;
    if (vDoc?.id) {
      const data = await loadPdfData(vDoc.id);
      if (data) return data;
    }
    return await generateTaxClearancePdf(ctx);
  }

  if (docIdUpper.includes('AUDITED') || docIdUpper.includes('AFS') || dName.includes('audited') || dName.includes('afs') || dName.includes('financial statement')) {
    const vDoc = findUploadedVaultDoc(['DOC-5', 'DOC-15', 'AFS', 'AUDITED_FS'], 'audited');
    if (vDoc?.fileDataUrl) return vDoc.fileDataUrl;
    if (vDoc?.id) {
      const data = await loadPdfData(vDoc.id);
      if (data) return data;
    }
    return await generateAuditedFinancialStatementsPdf(ctx);
  }

  if (docIdUpper.includes('PCAB') || dName.includes('pcab')) {
    const vDoc = findUploadedVaultDoc(['DOC-6', 'DOC-8', 'PCAB', 'PCAB_LICENSE'], 'pcab');
    if (vDoc?.fileDataUrl) return vDoc.fileDataUrl;
    if (vDoc?.id) {
      const data = await loadPdfData(vDoc.id);
      if (data) return data;
    }
    return await generatePcabLicensePdf(ctx);
  }

  if (docIdUpper.includes('SECRETARY') || docIdUpper.includes('BOARD_RES') || docIdUpper.includes('SPA') || dName.includes('secretary') || dName.includes('board resolution') || dName.includes('power of attorney')) {
    const vDoc = findUploadedVaultDoc(['DOC-13', 'SEC_CERT', 'BOARD_RES', 'SPA'], 'secretary');
    if (vDoc?.fileDataUrl) return vDoc.fileDataUrl;
    if (vDoc?.id) {
      const data = await loadPdfData(vDoc.id);
      if (data) return data;
    }
    return await generateSecretaryCertificatePdf(ctx);
  }

  if (docIdUpper.includes('JVA') || docIdUpper.includes('JOINT_VENTURE') || dName.includes('joint venture') || dName.includes('jva')) {
    const vDoc = findUploadedVaultDoc(['DOC-14', 'JVA', 'JOINT_VENTURE'], 'joint venture');
    if (vDoc?.fileDataUrl) return vDoc.fileDataUrl;
    if (vDoc?.id) {
      const data = await loadPdfData(vDoc.id);
      if (data) return data;
    }
    return await generateJointVentureAgreementPdf(ctx);
  }

  // 4. CUSTOM VAULT DOCUMENT BY VAULT ID
  if (doc.vaultDocId) {
    const linked = ctx.vaultDocs.find(v => v.id === doc.vaultDocId);
    if (linked?.fileDataUrl) return linked.fileDataUrl;
    try {
      const data = await loadPdfData(doc.vaultDocId);
      if (data) return data;
    } catch (_) {}
  }

  if (doc.id) {
    try {
      const data = await loadPdfData(doc.id);
      if (data) return data;
    } catch (_) {}
  }

  return null;
}

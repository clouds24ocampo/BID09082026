import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import html2canvas from 'html2canvas';
import { yieldToMain } from './storageScalability';
import { isFinancialEnvelopeDoc } from './envelopeClassification';

export type PdfAttachmentSource = string | ArrayBuffer | Uint8Array | Blob;

export interface ExportDocumentUnit {
  title: string;
  coverElement?: HTMLElement | null;
  formElement?: HTMLElement | HTMLElement[] | null;
  fileDataUrl?: string | null;
  fileSource?: PdfAttachmentSource | null;
  documentName?: string;
  documentCode?: string;
  fileName?: string;
  isPristineAttachment?: boolean;
}

/**
 * Checks if a document unit represents an official PhilGEPS Certificate.
 * Bidders upload their authentic government-issued PhilGEPS Platinum Certificate with official QR codes.
 * According to Philippine Government Procurement Act (RA 9184 / RA 12009), official PhilGEPS
 * verification QR codes must NEVER be scaled, clipped, overlaid with stamps, watermarked, or altered.
 */
export const isPhilgepsDocumentUnit = (unit: ExportDocumentUnit, docTitle?: string): boolean => {
  if (unit.isPristineAttachment) return true;
  const code = ((unit.documentCode || '') as string).toUpperCase();
  if (code === 'DOC-1' || code.includes('PHILGEPS')) return true;

  const t = (unit.title || '').toLowerCase();
  const d = (unit.documentName || '').toLowerCase();
  const dt = (docTitle || '').toLowerCase();
  const fn = (unit.fileName || '').toLowerCase();

  return (
    t.includes('philgeps') ||
    d.includes('philgeps') ||
    dt.includes('philgeps') ||
    fn.includes('philgeps') ||
    t.includes('phil-geps') ||
    d.includes('phil-geps') ||
    dt.includes('phil-geps') ||
    fn.includes('phil-geps') ||
    t.includes('platinum certificate') ||
    d.includes('platinum certificate') ||
    dt.includes('platinum certificate')
  );
};

export const blobToDataUrl = async (blob: Blob): Promise<string> => {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = typeof Buffer !== 'undefined' ? Buffer.from(arrayBuffer).toString('base64') : '';
  return `data:application/pdf;base64,${base64}`;
};

/** Formats a date string to date-only (strictly NO time component) for official BAC stamping */
export const formatDateOnly = (dateStr?: string | null): string => {
  if (!dateStr) return 'August 30, 2026';
  const raw = String(dateStr).trim();
  // Strip time suffixes like " at 02:00 PM", " at 10:00 AM", "T14:00:00", "T14:00", " 14:00", etc.
  const datePart = raw.replace(/\s+at\s+.*$/i, '').replace(/T.*$/, '').replace(/\s+\d{1,2}:\d{2}(:\d{2})?.*$/, '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [y, m, d] = datePart.split('-').map(Number);
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${months[m - 1]} ${d}, ${y}`;
    }
  }
  return datePart;
};

const normalizePdfSourceToArrayBuffer = async (source: PdfAttachmentSource): Promise<ArrayBuffer> => {
  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (trimmed.startsWith('data:')) {
      const commaIdx = trimmed.indexOf(',');
      const base64 = commaIdx !== -1 ? trimmed.substring(commaIdx + 1) : trimmed;
      const cleanBase64 = base64.replace(/\s+/g, '');
      const binaryString = atob(cleanBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    }

    // Check if it is a raw base64 string (e.g. starts with JVBERi0 or contains no protocol scheme)
    if (trimmed.startsWith('JVBERi0') || (!trimmed.includes('://') && !trimmed.startsWith('blob:') && trimmed.length > 50)) {
      try {
        const cleanBase64 = trimmed.replace(/\s+/g, '');
        const binaryString = atob(cleanBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      } catch (_) {
        // If atob fails, fall through to fetch
      }
    }

    try {
      const response = await fetch(trimmed);
      return await response.arrayBuffer();
    } catch (fetchErr) {
      console.error('[PDF] Failed to fetch PDF source:', fetchErr);
      throw fetchErr;
    }
  }

  if (source instanceof Blob) {
    return await source.arrayBuffer();
  }

  if (source instanceof Uint8Array) {
    return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength) as ArrayBuffer;
  }

  return source;
};

const processClonedDocForHtml2Canvas = (clonedDoc: Document) => {
  try {
    clonedDoc.querySelectorAll('input').forEach((input) => {
      input.setAttribute('value', input.value);
      const span = clonedDoc.createElement('span');
      span.textContent = input.value;
      span.className = input.className;
      span.style.cssText = window.getComputedStyle(input).cssText;
      span.style.display = 'inline-block';
      if (input.parentNode) {
        input.parentNode.replaceChild(span, input);
      }
    });

    clonedDoc.querySelectorAll('textarea').forEach((ta) => {
      ta.textContent = ta.value;
      const span = clonedDoc.createElement('span');
      span.textContent = ta.value;
      span.className = ta.className;
      span.style.cssText = window.getComputedStyle(ta).cssText;
      span.style.display = 'block';
      span.style.whiteSpace = 'pre-wrap';
      if (ta.parentNode) {
        ta.parentNode.replaceChild(span, ta);
      }
    });

    clonedDoc.querySelectorAll('select').forEach((sel) => {
      const selectedText = sel.options[sel.selectedIndex]?.text || sel.value;
      const span = clonedDoc.createElement('span');
      span.textContent = selectedText;
      span.className = sel.className;
      span.style.cssText = window.getComputedStyle(sel).cssText;
      span.style.display = 'inline-block';
      if (sel.parentNode) {
        sel.parentNode.replaceChild(span, sel);
      }
    });
  } catch (e) {
    console.warn('onclone input value sync note:', e);
  }
};

export interface PdfProgressInfo {
  percent: number;
  status: string;
  currentDoc: number;
  totalDocs: number;
}

export type StampColor = 'blue' | 'red' | 'purple' | 'black' | 'green';

export const getStampColorRgb = (color?: StampColor) => {
  switch (color) {
    case 'red':
      return rgb(0.82, 0.12, 0.12);
    case 'purple':
      return rgb(0.48, 0.12, 0.65);
    case 'black':
      return rgb(0.12, 0.12, 0.14);
    case 'green':
      return rgb(0.06, 0.48, 0.16);
    case 'blue':
    default:
      return rgb(0.08, 0.22, 0.55);
  }
};

export interface PdfExportOptions {
  folderCopy?: 'ORIGINAL' | 'COPY_1' | 'COPY_2';
  submissionDate?: string;
  companyName?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  projectRefNo?: string;
  projectTitle?: string;
  stampColor?: StampColor;
  includeCoverSeparators?: boolean;
}

// Standard Legal Size Dimensions in Points (72 dpi):
// Portrait Legal:  8.5" x 13" = 612pt x 936pt
// Landscape Legal: 13" x 8.5" = 936pt x 612pt
const LEGAL_LANDSCAPE: [number, number] = [936, 612];
const LEGAL_PORTRAIT: [number, number] = [612, 936];

async function drawVectorCoverSeparator(
  pdfDoc: PDFDocument,
  unit: ExportDocumentUnit,
  index: number,
  options?: PdfExportOptions
) {
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const coverPage = pdfDoc.addPage(LEGAL_PORTRAIT);
  const pageW = 612;
  const pageH = 936;

  // Outer border
  coverPage.drawRectangle({
    x: 24,
    y: 24,
    width: pageW - 48,
    height: pageH - 48,
    borderWidth: 2,
    borderColor: rgb(0.1, 0.15, 0.25),
    color: rgb(0.99, 0.99, 1)
  });

  // Inner border
  coverPage.drawRectangle({
    x: 28,
    y: 28,
    width: pageW - 56,
    height: pageH - 56,
    borderWidth: 0.75,
    borderColor: rgb(0.2, 0.25, 0.35)
  });

  const docCode = unit.documentCode || '';
  const docTitle = unit.title || unit.documentName || `Document ${index}`;
  const isFinancial = isFinancialEnvelopeDoc(docCode, docTitle);
  const envelopeLabel = isFinancial
    ? 'ENVELOPE 2: FINANCIAL BID PROPOSAL'
    : 'ENVELOPE 1: TECHNICAL & ELIGIBILITY COMPONENT';
  const folderCopyLabel = options?.folderCopy === 'ORIGINAL'
    ? 'ORIGINAL BID COPY'
    : options?.folderCopy === 'COPY_1'
      ? 'COPY 1 (DUPLICATE)'
      : options?.folderCopy === 'COPY_2'
        ? 'COPY 2 (TRIPLICATE)'
        : (options?.folderCopy || 'OFFICIAL COPY');

  // Header: Republic of the Philippines
  const repStr = 'REPUBLIC OF THE PHILIPPINES';
  const repW = fontBold.widthOfTextAtSize(repStr, 9);
  coverPage.drawText(repStr, {
    x: (pageW - repW) / 2,
    y: pageH - 70,
    size: 9,
    font: fontBold,
    color: rgb(0.3, 0.35, 0.45)
  });

  const procStr = 'GOVERNMENT PROCUREMENT BIDDING SUBMISSION';
  const procW = fontBold.widthOfTextAtSize(procStr, 11);
  coverPage.drawText(procStr, {
    x: (pageW - procW) / 2,
    y: pageH - 88,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25)
  });

  const refStr = `PhilGEPS Ref. No.: ${options?.projectRefNo || 'DOC-2026'}`;
  const refW = fontReg.widthOfTextAtSize(refStr, 9);
  coverPage.drawText(refStr, {
    x: (pageW - refW) / 2,
    y: pageH - 105,
    size: 9,
    font: fontReg,
    color: rgb(0.2, 0.25, 0.35)
  });

  // Envelope Badge Box
  const badgeColor = isFinancial ? rgb(0.08, 0.35, 0.2) : rgb(0.1, 0.25, 0.5);
  coverPage.drawRectangle({
    x: 45,
    y: pageH - 175,
    width: pageW - 90,
    height: 48,
    color: badgeColor,
    borderColor: rgb(0.9, 0.95, 1),
    borderWidth: 1
  });

  const envW = fontBold.widthOfTextAtSize(envelopeLabel, 12);
  coverPage.drawText(envelopeLabel, {
    x: (pageW - envW) / 2,
    y: pageH - 150,
    size: 12,
    font: fontBold,
    color: rgb(1, 1, 1)
  });

  const fCopyW = fontBold.widthOfTextAtSize(`[ ${folderCopyLabel} ]`, 9);
  coverPage.drawText(`[ ${folderCopyLabel} ]`, {
    x: (pageW - fCopyW) / 2,
    y: pageH - 166,
    size: 9,
    font: fontBold,
    color: rgb(0.9, 0.95, 1)
  });

  // Document Number & Tab Banner
  const tabStr = `DOCUMENT SEPARATOR #${index}`;
  const tabW = fontBold.widthOfTextAtSize(tabStr, 10);
  coverPage.drawText(tabStr, {
    x: (pageW - tabW) / 2,
    y: pageH - 240,
    size: 10,
    font: fontBold,
    color: rgb(0.4, 0.45, 0.55)
  });

  // Main Document Title in decorative framed box
  coverPage.drawRectangle({
    x: 55,
    y: pageH - 420,
    width: pageW - 110,
    height: 160,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.7, 0.75, 0.85),
    borderWidth: 1
  });

  // Multi-line Document Title wrapping
  const words = docTitle.toUpperCase().split(' ');
  const titleLines: string[] = [];
  let currLine = '';
  for (const w of words) {
    const testLine = currLine ? `${currLine} ${w}` : w;
    if (fontBold.widthOfTextAtSize(testLine, 14) > pageW - 140) {
      if (currLine) titleLines.push(currLine);
      currLine = w;
    } else {
      currLine = testLine;
    }
  }
  if (currLine) titleLines.push(currLine);

  let titleY = pageH - 330 + ((titleLines.length - 1) * 11);
  titleLines.forEach(line => {
    const lW = fontBold.widthOfTextAtSize(line, 14);
    coverPage.drawText(line, {
      x: (pageW - lW) / 2,
      y: titleY,
      size: 14,
      font: fontBold,
      color: rgb(0.08, 0.12, 0.22)
    });
    titleY -= 22;
  });

  const catStr = isFinancial
    ? 'Standard Financial Bid Form / Pricing Schedule (RA 9184 & RA 12009 NGPA)'
    : 'Mandatory Technical & Eligibility Document (RA 9184 & RA 12009 NGPA)';
  const catW = fontReg.widthOfTextAtSize(catStr, 8);
  coverPage.drawText(catStr, {
    x: (pageW - catW) / 2,
    y: pageH - 405,
    size: 8,
    font: fontReg,
    color: rgb(0.35, 0.4, 0.5)
  });

  // Project Information Box
  coverPage.drawRectangle({
    x: 55,
    y: pageH - 630,
    width: pageW - 110,
    height: 180,
    color: rgb(0.97, 0.98, 0.99),
    borderColor: rgb(0.8, 0.85, 0.9),
    borderWidth: 0.75
  });

  const details = [
    { label: 'PROJECT TITLE:', val: options?.projectTitle || 'Target Procurement Project' },
    { label: 'PHILGEPS REF. NO.:', val: options?.projectRefNo || 'DOC-2026-001' },
    { label: 'SUBMISSION DEADLINE:', val: options?.submissionDate || 'August 30, 2026 at 02:00 PM' },
    { label: 'BIDDER ENTITY:', val: options?.companyName || 'Bidding Enterprise Corporation' },
    { label: 'OFFICIAL COPY TYPE:', val: folderCopyLabel }
  ];

  let dY = pageH - 475;
  details.forEach(d => {
    coverPage.drawText(d.label, { x: 75, y: dY, size: 8, font: fontBold, color: rgb(0.15, 0.2, 0.3) });
    const valText = d.val.length > 50 ? `${d.val.slice(0, 48)}...` : d.val;
    coverPage.drawText(valText, { x: 215, y: dY, size: 8, font: fontReg, color: rgb(0.1, 0.15, 0.25) });
    dY -= 30;
  });

  // Signatory Box at Bottom
  const sigName = (options?.signatoryName || 'AUTHORIZED MANAGING OFFICER').toUpperCase();
  const sigTitle = options?.signatoryTitle || 'President / Authorized Managing Officer';
  const sW = fontBold.widthOfTextAtSize(sigName, 9.5);
  const stW = fontReg.widthOfTextAtSize(sigTitle, 8);

  coverPage.drawLine({
    start: { x: (pageW - 240) / 2, y: 130 },
    end: { x: (pageW + 240) / 2, y: 130 },
    thickness: 1,
    color: rgb(0.2, 0.25, 0.35)
  });

  coverPage.drawText(sigName, {
    x: (pageW - sW) / 2,
    y: 114,
    size: 9.5,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25)
  });

  coverPage.drawText(sigTitle, {
    x: (pageW - stW) / 2,
    y: 100,
    size: 8,
    font: fontReg,
    color: rgb(0.35, 0.4, 0.5)
  });

  const warnStr = 'OFFICIAL BID ENVELOPE SEPARATOR SHEET — MUST REMAIN IN PLACE DURING EVALUATION';
  const warnW = fontBold.widthOfTextAtSize(warnStr, 6.5);
  coverPage.drawText(warnStr, {
    x: (pageW - warnW) / 2,
    y: 50,
    size: 6.5,
    font: fontBold,
    color: rgb(0.5, 0.55, 0.65)
  });
}

/**
 * Senior PDF Rendering Engine
 * Preserves vector quality for uploaded PDFs using direct copyPages().
 * Strictly enforces Legal (13" x 8.5" landscape / 8.5" x 13" portrait) orientation.
 * Strict sequence: Cover Page → Uploaded PDF → Next Cover Page.
 */
export async function buildMergedThreeLayerPdfBytes(
  units: ExportDocumentUnit[],
  outputFileName: string = 'merged_document.pdf',
  onProgress?: (progress: PdfProgressInfo) => void,
  options?: PdfExportOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const untouchedPhilgepsPageIndices = new Set<number>();

  for (let index = 0; index < units.length; index++) {
    // Yield to keep UI responsive
    await new Promise((resolve) => setTimeout(resolve, 40));

    const unit = units[index];
    const currentDoc = index + 1;
    const totalDocs = units.length;
    const docTitle = unit.title || unit.documentName || `Document ${currentDoc}`;
    const initialPageCountForUnit = pdfDoc.getPageCount();

    onProgress?.({
      percent: Math.max(5, Math.round((index / totalDocs) * 85)),
      status: `Processing (${currentDoc}/${totalDocs}): ${docTitle}`,
      currentDoc,
      totalDocs
    });

    // â”€â”€ COVER PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (unit.coverElement) {
      onProgress?.({
        percent: Math.max(5, Math.round(((index + 0.3) / totalDocs) * 85)),
        status: `Generating cover separator for ${docTitle}...`,
        currentDoc,
        totalDocs
      });
      try {
        const isExplicitLandscapeElem =
          unit.coverElement.classList.contains('priceschedule-paper') ||
          unit.coverElement.classList.contains('landscape') ||
          unit.coverElement.classList.contains('aspect-[13/8.5]');

        const targetWindowWidth = isExplicitLandscapeElem ? 1248 : 816;

        const canvas = await html2canvas(unit.coverElement, {
          scale: 1.7,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          windowWidth: targetWindowWidth,
          onclone: processClonedDocForHtml2Canvas,
          ignoreElements: (element: Element) =>
            element.classList.contains('no-export') ||
            element.classList.contains('proof-column') ||
            element.classList.contains('actions-column') ||
            element.tagName === 'BUTTON'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const embeddedImage = await pdfDoc.embedJpg(imgData);

        // Immediately release canvas bitmap memory
        canvas.width = 1;
        canvas.height = 1;

        const isPortrait =
          !isExplicitLandscapeElem &&
          (unit.coverElement.classList.contains('portrait') ||
            unit.coverElement.classList.contains('aspect-[8.5/13]') ||
            unit.coverElement.offsetHeight >= unit.coverElement.offsetWidth);

        const pageSize: [number, number] = isPortrait ? LEGAL_PORTRAIT : LEGAL_LANDSCAPE;
        const coverPage = pdfDoc.addPage(pageSize);

        // Full-bleed fill â€” cover page is designed to fill the entire page
        coverPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: pageSize[0],
          height: pageSize[1]
        });
      } catch (err) {
        console.error(`[PDF] Error generating cover page for ${unit.title}:`, err);
        // Fallback to vector cover separator on error
        await drawVectorCoverSeparator(pdfDoc, unit, index, options);
      }
    } else if (options?.includeCoverSeparators && index > 0 && !docTitle.toLowerCase().includes('table of contents')) {
      // Fallback vector statutory cover separator if DOM element is absent and separators are explicitly enabled
      await drawVectorCoverSeparator(pdfDoc, unit, index, options);
    }

    // â”€â”€ FORM TEMPLATE PAGES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (unit.formElement) {
      let formElements: HTMLElement[] = [];
      if (Array.isArray(unit.formElement)) {
        formElements = unit.formElement.flatMap((el) => {
          if (!el) return [];
          const children = el.querySelectorAll('.single-page-paper, .print-document-sheet, .priceschedule-paper');
          return children.length > 0 ? (Array.from(children) as HTMLElement[]) : [el];
        });
      } else {
        const childPapers = unit.formElement.querySelectorAll('.single-page-paper, .print-document-sheet, .priceschedule-paper');
        formElements =
          childPapers.length > 0 ? (Array.from(childPapers) as HTMLElement[]) : [unit.formElement];
      }

      for (let elemIdx = 0; elemIdx < formElements.length; elemIdx++) {
        const elem = formElements[elemIdx];
        try {
          const isExplicitPortraitElem =
            elem.classList.contains('portrait') ||
            elem.classList.contains('aspect-[8.5/13]') ||
            elem.classList.contains('aspect-[8.5/11]');

          const isExplicitLandscapeElem =
            !isExplicitPortraitElem &&
            (elem.classList.contains('priceschedule-paper') ||
              elem.classList.contains('landscape') ||
              elem.classList.contains('aspect-[13/8.5]'));

          const targetWindowWidth = isExplicitLandscapeElem ? 1248 : 816;

          const canvas = await html2canvas(elem, {
            scale: 2.0,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0,
            windowWidth: targetWindowWidth,
            onclone: (clonedDoc) => {
              const papers = clonedDoc.querySelectorAll(
                '.single-page-paper, .print-document-sheet, .priceschedule-paper'
              );
              papers.forEach((p) => {
                const htmlP = p as HTMLElement;
                const isPortraitP =
                  htmlP.classList.contains('portrait') || htmlP.classList.contains('aspect-[8.5/13]');
                htmlP.style.width = isPortraitP ? '816px' : '1248px';
                htmlP.style.minHeight = isPortraitP ? '1248px' : '816px';
                htmlP.style.maxHeight = isPortraitP ? '1248px' : '816px';
                htmlP.style.height = isPortraitP ? '1248px' : '816px';
                htmlP.style.margin = '0';
                htmlP.style.overflow = 'hidden';
                htmlP.style.boxSizing = 'border-box';
              });
              processClonedDocForHtml2Canvas(clonedDoc);
            },
            ignoreElements: (element: Element) =>
              element.classList.contains('no-export') ||
              element.classList.contains('proof-column') ||
              element.classList.contains('actions-column') ||
              element.tagName === 'BUTTON'
          });

          const isPortrait =
            isExplicitPortraitElem || (!isExplicitLandscapeElem && canvas.height >= canvas.width);
          const pageSize: [number, number] = isPortrait ? LEGAL_PORTRAIT : LEGAL_LANDSCAPE;
          const targetCanvasPageHeight = Math.round(canvas.width * (pageSize[1] / pageSize[0]));

          const isPrePaginated =
            elem.classList.contains('single-page-paper') ||
            elem.classList.contains('priceschedule-paper') ||
            elem.classList.contains('summarybid-paper') ||
            elem.classList.contains('boq-paper') ||
            elem.classList.contains('cashflow-paper') ||
            elem.classList.contains('print-document-sheet');

          if (isPrePaginated) {
            const imgData = canvas.toDataURL('image/png');
            const pngImage = await pdfDoc.embedPng(imgData);
            const formPage = pdfDoc.addPage(pageSize);
            formPage.drawImage(pngImage, { x: 0, y: 0, width: pageSize[0], height: pageSize[1] });
          } else {
            // Adaptive row-aware canvas slicing for multi-page forms
            const elemRect = elem.getBoundingClientRect();
            const scaleFactor = elemRect.height > 0 ? canvas.height / elemRect.height : 1;

            const rowNodes = Array.from(
              elem.querySelectorAll('tr, .page-break-inside-avoid, .signatory-block, .border-b-2')
            );
            const rowBreakYCanvas: number[] = [];
            rowNodes.forEach((node) => {
              const rect = node.getBoundingClientRect();
              const topInCanvas = Math.round((rect.top - elemRect.top) * scaleFactor);
              const bottomInCanvas = Math.round((rect.bottom - elemRect.top) * scaleFactor);
              if (topInCanvas > 0) rowBreakYCanvas.push(topInCanvas);
              if (bottomInCanvas > 0) rowBreakYCanvas.push(bottomInCanvas);
            });
            rowBreakYCanvas.sort((a, b) => a - b);

            const slices: { startY: number; height: number }[] = [];
            let currentY = 0;

            while (currentY < canvas.height - 30) {
              const maxPossibleY = currentY + targetCanvasPageHeight;
              if (maxPossibleY >= canvas.height) {
                const remainingHeight = canvas.height - currentY;
                if (remainingHeight > 30) slices.push({ startY: currentY, height: remainingHeight });
                break;
              }

              let bestSplitY = maxPossibleY;
              const minAcceptableY = currentY + Math.round(targetCanvasPageHeight * 0.2);
              const candidates = rowBreakYCanvas.filter((y) => y > minAcceptableY && y <= maxPossibleY);
              if (candidates.length > 0) {
                const candidateSplitY = candidates[candidates.length - 1];
                const emptyGapRatio = (maxPossibleY - candidateSplitY) / targetCanvasPageHeight;
                if (emptyGapRatio <= 0.15) bestSplitY = candidateSplitY;
              }

              const sliceHeight = bestSplitY - currentY;
              if (sliceHeight <= 0) {
                slices.push({ startY: currentY, height: targetCanvasPageHeight });
                currentY += targetCanvasPageHeight;
              } else {
                slices.push({ startY: currentY, height: sliceHeight });
                currentY = bestSplitY;
              }
            }

            for (const { startY, height } of slices) {
              const sliceCanvas = document.createElement('canvas');
              sliceCanvas.width = canvas.width;
              sliceCanvas.height = targetCanvasPageHeight;
              const ctx = sliceCanvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
                ctx.drawImage(
                  canvas,
                  0, startY, canvas.width, Math.min(height, canvas.height - startY),
                  0, 0, canvas.width, Math.min(height, canvas.height - startY)
                );
              }
              const sliceImgData = sliceCanvas.toDataURL('image/png');
              const slicePngImage = await pdfDoc.embedPng(sliceImgData);
              const slicePage = pdfDoc.addPage(pageSize);
              slicePage.drawImage(slicePngImage, { x: 0, y: 0, width: pageSize[0], height: pageSize[1] });
            }
          }
        } catch (err) {
          console.error(`[PDF] Error generating form template page ${elemIdx + 1} for ${unit.title}:`, err);
        }
      }
    }

    // ── ATTACHED PDF / IMAGE FILE ─────────────────────────────────────────────
    const fileSource = unit.fileSource ?? unit.fileDataUrl;
    if (fileSource) {
      try {
        const pdfArrayBuffer = await normalizePdfSourceToArrayBuffer(fileSource);
        const isPhilgeps = isPhilgepsDocumentUnit(unit, docTitle);
        try {
          const externalPdfDoc = await PDFDocument.load(pdfArrayBuffer, { ignoreEncryption: true });
          const pageIndices = externalPdfDoc.getPageIndices();
          const copiedPages = await pdfDoc.copyPages(externalPdfDoc, pageIndices);

          if (isPhilgeps) {
            // ZERO-TOUCH PRESERVATION FOR OFFICIAL PHILGEPS CERTIFICATE & QR CODE:
            // Never scale, never translate, never resize, and never draw stamps/watermarks/pagination overlays.
            // Preserves the user's authentic PhilGEPS upload 100% untouched for PhilGEPS QR verification compliance.
            copiedPages.forEach((copiedPage) => {
              const pageIdxInDoc = pdfDoc.getPageCount();
              untouchedPhilgepsPageIndices.add(pageIdxInDoc);
              pdfDoc.addPage(copiedPage);
            });
          } else {
            const titleBlob = `${docTitle} ${unit.documentCode || ''} ${unit.fileName || ''} ${unit.documentName || ''}`.toLowerCase();
            const isLicenseScan = /pcab|mayor|business permit|tax clearance|license|bir|2303/.test(titleBlob);

            for (const copiedPage of copiedPages) {
              const origW = copiedPage.getWidth();
              const origH = copiedPage.getHeight();
              const origRot = ((copiedPage.getRotation().angle % 360) + 360) % 360;
              const visW = origRot === 90 || origRot === 270 ? origH : origW;
              const visH = origRot === 90 || origRot === 270 ? origW : origH;
              const isLandscape = visW >= visH;
              const targetSize: [number, number] = isLandscape ? LEGAL_LANDSCAPE : LEGAL_PORTRAIT;
              const targetW = targetSize[0];
              const targetH = targetSize[1];
              const sourceAspect = visW / visH;
              const targetAspect = targetW / targetH;
              const aspectDelta = Math.abs(sourceAspect - targetAspect) / targetAspect;

              // Standard non-clipping scale: fit inside Legal sheet margins without truncating headers/footers
              const sx = origW > 0 ? targetW / origW : 1;
              const sy = origH > 0 ? targetH / origH : 1;
              const fillScale = Math.min(sx, sy);

              copiedPage.scaleContent(fillScale, fillScale);
              if (fillScale > 0) {
                const scaledW = origW * fillScale;
                const scaledH = origH * fillScale;
                copiedPage.translateContent(
                  (targetW - scaledW) / 2 / fillScale,
                  (targetH - scaledH) / 2 / fillScale
                );
              }
              copiedPage.setMediaBox(0, 0, targetW, targetH);
              copiedPage.setCropBox(0, 0, targetW, targetH);
              copiedPage.setSize(targetW, targetH);
              pdfDoc.addPage(copiedPage);
            }
          }
        } catch (_pdfLoadErr) {
          // Not a PDF — try embedding as image
          try {
            let embeddedImage: any = null;
            if (typeof fileSource === 'string' && fileSource.includes('image/jpeg')) {
              embeddedImage = await pdfDoc.embedJpg(pdfArrayBuffer);
            } else {
              try {
                embeddedImage = await pdfDoc.embedPng(pdfArrayBuffer);
              } catch {
                embeddedImage = await pdfDoc.embedJpg(pdfArrayBuffer);
              }
            }
            if (embeddedImage) {
              const isLandscapeImg = embeddedImage.width > embeddedImage.height;
              const imgPageSize: [number, number] = isLandscapeImg
                ? LEGAL_LANDSCAPE
                : LEGAL_PORTRAIT;
              const targetW = imgPageSize[0];
              const targetH = imgPageSize[1];

              // Proportional containment: ensures PCAB licenses and scanned certificates
              // are 100% visible, centered, and look normal without any edge truncation.
              const scale = Math.min(targetW / embeddedImage.width, targetH / embeddedImage.height);
              const drawW = embeddedImage.width * scale;
              const drawH = embeddedImage.height * scale;
              const drawX = (targetW - drawW) / 2;
              const drawY = (targetH - drawH) / 2;

              const imgPage = pdfDoc.addPage(imgPageSize);
              if (isPhilgeps) {
                untouchedPhilgepsPageIndices.add(pdfDoc.getPageCount() - 1);
              }
              imgPage.drawImage(embeddedImage, { x: drawX, y: drawY, width: drawW, height: drawH });
            }
          } catch (imgErr) {
            console.error('[PDF] Failed to embed source as image:', imgErr);
          }
        }
      } catch (err) {
        console.error(`[PDF] Error loading attached file for ${unit.title}:`, err);
      }
    }

    // Zero-page guard: if no cover page, form element, or attachment produced a page for this unit,
    // generate a standard statutory document sheet so no document is ever omitted or missing from the merged bundle!
    if (pdfDoc.getPageCount() === initialPageCountForUnit) {
      const page = pdfDoc.addPage(LEGAL_PORTRAIT);
      try {
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const titleText = (unit.title || unit.documentName || `Document ${currentDoc}`).toUpperCase();

        page.drawRectangle({
          x: 36,
          y: 36,
          width: 540,
          height: 864,
          borderColor: rgb(0.12, 0.2, 0.35),
          borderWidth: 2
        });

        page.drawText(titleText.slice(0, 70), {
          x: 50,
          y: 840,
          size: 13,
          font: fontBold,
          color: rgb(0.1, 0.15, 0.3)
        });

        page.drawText('STATUTORY BIDDING DOCUMENT RECORD & COMPLIANCE SHEET', {
          x: 50,
          y: 820,
          size: 7.5,
          font: fontReg,
          color: rgb(0.35, 0.4, 0.48)
        });

        page.drawLine({
          start: { x: 50, y: 810 },
          end: { x: 562, y: 810 },
          thickness: 1,
          color: rgb(0.8, 0.85, 0.9)
        });

        page.drawText('This document is officially registered in the Philippine Government Procurement Bid Package.', {
          x: 50,
          y: 770,
          size: 9,
          font: fontReg,
          color: rgb(0.15, 0.2, 0.25)
        });

        page.drawText(`Document Title: ${unit.title || unit.documentName || `Document ${currentDoc}`}`, {
          x: 50,
          y: 745,
          size: 8.5,
          font: fontBold,
          color: rgb(0.1, 0.15, 0.3)
        });

        page.drawText('Standard Legal Basis: Republic Act 9184 / RA 12009 (New Government Procurement Act)', {
          x: 50,
          y: 725,
          size: 8,
          font: fontReg,
          color: rgb(0.3, 0.35, 0.4)
        });
      } catch (_) {}
    }
  }

  // â”€â”€ STAMP "Page X of Y" PAGINATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let allPages = pdfDoc.getPages();
  if (allPages.length === 0) {
    const fallbackPage = pdfDoc.addPage(LEGAL_PORTRAIT);
    try {
      const hFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      fallbackPage.drawText('Bid Package Submission Bundle', {
        x: 50,
        y: 880,
        size: 14,
        font: hFont,
        color: rgb(0.1, 0.15, 0.3)
      });
    } catch (_) {}
    allPages = pdfDoc.getPages();
  }

  const totalPageCount = allPages.length;
  if (totalPageCount > 0) {
    try {
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const effectiveFolderCopy = options?.folderCopy ||
        (outputFileName.includes('COPY_1') || outputFileName.includes('COPY 1') ? 'COPY_1' :
         outputFileName.includes('COPY_2') || outputFileName.includes('COPY 2') ? 'COPY_2' :
         outputFileName.includes('ORIGINAL') ? 'ORIGINAL' : undefined);

      const submissionDate = formatDateOnly(options?.submissionDate);
      const signatory = options?.signatoryName || 'Authorized Managing Officer';
      const refNo = options?.projectRefNo || 'PhilGEPS-2026';

      for (let pageIdx = 0; pageIdx < totalPageCount; pageIdx++) {
        if (pageIdx > 0 && pageIdx % 8 === 0) {
          await yieldToMain();
        }
        const page = allPages[pageIdx];
        const width = page.getWidth();
        const height = page.getHeight();
        const rotationAngle = page.getRotation().angle;

        const isUntouchedPhilgeps = untouchedPhilgepsPageIndices.has(pageIdx);

        // 1. DIAGONAL WATERMARK (3-LINE: STATUS, COMPANY NAME, PHILGEPS REF - STRICTLY CONSTRAINED INSIDE PAPER)
        if (effectiveFolderCopy && rotationAngle === 0 && !isUntouchedPhilgeps) {
          const statusText = effectiveFolderCopy === 'ORIGINAL'
            ? 'ORIGINAL BID DOCUMENT'
            : 'CERTIFIED TRUE COPY';
          const companyText = (options?.companyName || 'QUANTUM CLOUD CORPORATION').toUpperCase().slice(0, 42);
          const refText = `REF: ${refNo} • BAC COMPLIANT`;

          const wmAngleDeg = 30;
          const theta = (wmAngleDeg * Math.PI) / 180;
          const cosT = Math.cos(theta);
          const sinT = Math.sin(theta);

          const cx = width / 2;
          const cy = height / 2;

          const wmColor = rgb(0.70, 0.74, 0.83);
          const wmOpacity = 0.22;

          const lines = [
            { text: statusText, font: helveticaBold, size: width > 700 ? 22 : 18, offset: 16 },
            { text: companyText, font: helveticaBold, size: width > 700 ? 12.5 : 10.5, offset: -2 },
            { text: refText, font: helveticaFont, size: width > 700 ? 10 : 8.5, offset: -18 }
          ];

          for (const l of lines) {
            const lineW = l.font.widthOfTextAtSize(l.text, l.size);
            const lx = cx - (lineW / 2) * cosT - l.offset * sinT;
            const ly = cy - (lineW / 2) * sinT + l.offset * cosT;

            page.drawText(l.text, {
              x: lx,
              y: ly,
              size: l.size,
              font: l.font,
              color: wmColor,
              rotate: degrees(wmAngleDeg),
              opacity: wmOpacity
            });
          }
        }

        // 2. OFFICIAL GOVERNMENT RUBBER STAMP (FOR ORIGINAL, COPY_1, AND COPY_2)
        // Perfectly rectangular, straight (0 deg rotation), crisp aligned text with solid backing box to prevent illegible overlap
        // Strictly NEVER stamped over untouched PhilGEPS uploads to preserve government verification QR code
        if (effectiveFolderCopy && rotationAngle === 0 && !isUntouchedPhilgeps) {
          const isOrig = effectiveFolderCopy === 'ORIGINAL';
          const isCopy1 = effectiveFolderCopy === 'COPY_1';
          const scaleFactor = Math.max(1, width / 612);
          const stampW = Math.round(210 * scaleFactor);
          const stampH = Math.round(56 * scaleFactor);
          // Positioned directly at the top of the "Page X of Y" pagination pill
          const stampX = (width - stampW) / 2;
          const stampY = Math.round(24 * scaleFactor);

          const stampChosenColor = getStampColorRgb(options?.stampColor);
          const headerText = isOrig ? '* OFFICIAL ORIGINAL BID DOCUMENT *' : '* CERTIFIED TRUE COPY *';
          const subText = isOrig
            ? 'OFFICIAL SUBMISSION COPY'
            : isCopy1
            ? 'COPY 1 (FIRST CERTIFIED TRUE COPY)'
            : 'COPY 2 (SECOND CERTIFIED TRUE COPY)';

          const headerFontSize = Math.round(7.8 * scaleFactor * 10) / 10;
          const subTextFontSize = Math.round(6.4 * scaleFactor * 10) / 10;
          const metaFontSize = Math.round(5.8 * scaleFactor * 10) / 10;
          const refFontSize = Math.round(5.5 * scaleFactor * 10) / 10;
          const padX = Math.round(8 * scaleFactor);

          // Transparent rubber stamp border (NO solid white backing to keep underlying text fully readable)
          page.drawRectangle({
            x: stampX,
            y: stampY,
            width: stampW,
            height: stampH,
            borderColor: stampChosenColor,
            borderWidth: 1.4 * scaleFactor
          });

          // Inner neat stamp border
          page.drawRectangle({
            x: stampX + 2.5 * scaleFactor,
            y: stampY + 2.5 * scaleFactor,
            width: stampW - 5 * scaleFactor,
            height: stampH - 5 * scaleFactor,
            borderColor: stampChosenColor,
            borderWidth: 0.6 * scaleFactor
          });

          // Line 1: Header (Centered)
          const hW = helveticaBold.widthOfTextAtSize(headerText, headerFontSize);
          page.drawText(headerText, {
            x: stampX + (stampW - hW) / 2,
            y: stampY + stampH - Math.round(13 * scaleFactor),
            size: headerFontSize,
            font: helveticaBold,
            color: stampChosenColor
          });

          // Line 2: Copy Designation (Centered)
          const sW = helveticaBold.widthOfTextAtSize(subText, subTextFontSize);
          page.drawText(subText, {
            x: stampX + (stampW - sW) / 2,
            y: stampY + stampH - Math.round(22 * scaleFactor),
            size: subTextFontSize,
            font: helveticaBold,
            color: stampChosenColor
          });

          // Line 3: Date of Submission (Left padded)
          page.drawText(`Date of Submission: ${submissionDate}`, {
            x: stampX + padX,
            y: stampY + stampH - Math.round(32 * scaleFactor),
            size: metaFontSize,
            font: helveticaFont,
            color: stampChosenColor
          });

          // Line 4: Authorized Signatory (Left padded)
          page.drawText(`Signed by: ${signatory.slice(0, 36)}`, {
            x: stampX + padX,
            y: stampY + stampH - Math.round(40.5 * scaleFactor),
            size: metaFontSize,
            font: helveticaFont,
            color: stampChosenColor
          });

          // Line 5: Project Reference & BAC Compliance (Left padded)
          page.drawText(`Ref: ${refNo} • BAC COMPLIANT`, {
            x: stampX + padX,
            y: stampY + stampH - Math.round(49 * scaleFactor),
            size: refFontSize,
            font: helveticaBold,
            color: stampChosenColor
          });
        }

        // 3. PAGE X OF Y PAGINATION (AT BOTTOM CENTER WITH TRANSPARENT PILL)
        // Strictly transparent so underlying text is never obscured
        if (!isUntouchedPhilgeps) {
          const pageScale = Math.max(1, width / 612);
          const pageText = `Page ${pageIdx + 1} of ${totalPageCount}`;
          const fontSize = Math.round(7.5 * pageScale * 10) / 10;
          const textWidth = helveticaFont.widthOfTextAtSize(pageText, fontSize);
          const pillW = Math.round(textWidth + 18 * pageScale);
          const pillH = Math.round(14 * pageScale);

          if (rotationAngle === 0) {
            const pillX = (width - pillW) / 2;
            const pillY = Math.round(7 * pageScale);
            page.drawRectangle({
              x: pillX,
              y: pillY,
              width: pillW,
              height: pillH,
              borderColor: rgb(0.8, 0.82, 0.88),
              borderWidth: 0.6 * pageScale
            });
            page.drawText(pageText, {
              x: (width - textWidth) / 2,
              y: pillY + Math.round(3.5 * pageScale),
              size: fontSize,
              font: helveticaBold,
              color: rgb(0.12, 0.16, 0.25)
            });
          } else if (rotationAngle === 90) {
            const pillX = 7;
            const pillY = (height - pillW) / 2;
            page.drawRectangle({
              x: pillX,
              y: pillY,
              width: pillH,
              height: pillW,
              borderColor: rgb(0.8, 0.82, 0.88),
              borderWidth: 0.6
            });
            page.drawText(pageText, {
              x: pillX + 3.5,
              y: (height - textWidth) / 2,
              size: fontSize,
              font: helveticaBold,
              color: rgb(0.12, 0.16, 0.25),
              rotate: degrees(90)
            });
          } else if (rotationAngle === 180) {
            const pillX = (width - pillW) / 2;
            const pillY = height - 21;
            page.drawRectangle({
              x: pillX,
              y: pillY,
              width: pillW,
              height: pillH,
              borderColor: rgb(0.8, 0.82, 0.88),
              borderWidth: 0.6
            });
            page.drawText(pageText, {
              x: (width + textWidth) / 2,
              y: pillY + 10.5,
              size: fontSize,
              font: helveticaBold,
              color: rgb(0.12, 0.16, 0.25),
              rotate: degrees(180)
            });
          } else if (rotationAngle === 270) {
            const pillX = width - 21;
            const pillY = (height - pillW) / 2;
            page.drawRectangle({
              x: pillX,
              y: pillY,
              width: pillH,
              height: pillW,
              borderColor: rgb(0.8, 0.82, 0.88),
              borderWidth: 0.6
            });
            page.drawText(pageText, {
              x: pillX + 10.5,
              y: (height + textWidth) / 2,
              size: fontSize,
              font: helveticaBold,
              color: rgb(0.12, 0.16, 0.25),
              rotate: degrees(270)
            });
          }
        }
      }
    } catch (pageNumberErr) {
      console.warn('[PDF] Pagination stamping note:', pageNumberErr);
    }
  }

  onProgress?.({
    percent: 95,
    status: 'Finalizing and saving PDF...',
    currentDoc: units.length,
    totalDocs: units.length
  });

  const pdfBytes = await pdfDoc.save();

  onProgress?.({
    percent: 100,
    status: 'Merged Package Ready!',
    currentDoc: units.length,
    totalDocs: units.length
  });

  return pdfBytes;
}

/**
 * Builds merged PDF and returns a persistent Blob URL.
 * NOTE: Blob URLs persist until the tab is closed or URL.revokeObjectURL is explicitly called.
 * For embedded iframes/object viewers that need to survive re-renders, use buildMergedThreeLayerPdfDataUrl instead.
 */
export async function buildMergedThreeLayerPdfBlobUrl(
  units: ExportDocumentUnit[],
  outputFileName: string = 'merged_document.pdf',
  onProgress?: (progress: PdfProgressInfo) => void,
  options?: PdfExportOptions
): Promise<{ blobUrl: string; byteSize: number }> {
  const pdfBytes = await buildMergedThreeLayerPdfBytes(units, outputFileName, onProgress, options);
  const rawPdfBuffer = new ArrayBuffer(pdfBytes.length);
  new Uint8Array(rawPdfBuffer).set(pdfBytes);
  const blob = new Blob([rawPdfBuffer], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);
  return { blobUrl, byteSize: pdfBytes.length };
}

/**
 * Builds merged PDF and returns a true base64 data URL.
 * Preferred over blobUrl for embedded viewers — survives React re-renders without going blank.
 */
export async function buildMergedThreeLayerPdfDataUrl(
  units: ExportDocumentUnit[],
  outputFileName: string = 'merged_document.pdf',
  onProgress?: (progress: PdfProgressInfo) => void,
  options?: PdfExportOptions
): Promise<string> {
  const pdfBytes = await buildMergedThreeLayerPdfBytes(units, outputFileName, onProgress, options);
  // Convert to true base64 data URL — stable across re-renders
  const rawPdfBuffer = new ArrayBuffer(pdfBytes.length);
  new Uint8Array(rawPdfBuffer).set(pdfBytes);
  const blob = new Blob([rawPdfBuffer], { type: 'application/pdf' });
  return await blobToDataUrl(blob);
}

export async function exportMergedThreeLayerPdf(
  units: ExportDocumentUnit[],
  outputFileName: string = 'merged_document.pdf',
  onProgress?: (progress: PdfProgressInfo) => void,
  options?: PdfExportOptions
): Promise<void> {
  try {
    const pdfBytes = await buildMergedThreeLayerPdfBytes(units, outputFileName, onProgress, options);
    const rawPdfBuffer = new ArrayBuffer(pdfBytes.length);
    new Uint8Array(rawPdfBuffer).set(pdfBytes);
    const blob = new Blob([rawPdfBuffer], { type: 'application/pdf' });

    if (typeof document !== 'undefined') {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = outputFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    }
  } catch (globalErr) {
    console.error('[PDF] FATAL ERROR IN PDF EXPORT ENGINE:', globalErr);
    if (typeof window !== 'undefined') {
      window.print();
    }
  }
}

export async function generateAndDownloadThreeLayerPdf(
  coverElement: HTMLElement | null,
  templateElement: HTMLElement | HTMLElement[] | null,
  uploadedPdfDataUrl?: PdfAttachmentSource,
  outputFileName: string = 'document.pdf'
): Promise<void> {
  await exportMergedThreeLayerPdf(
    [
      {
        title: outputFileName.replace('.pdf', ''),
        coverElement,
        formElement: templateElement,
        fileSource: uploadedPdfDataUrl
      }
    ],
    outputFileName
  );
}

export async function generateThreeLayerPdfDataUrl(
  coverElement: HTMLElement | null,
  templateElement: HTMLElement | HTMLElement[] | null,
  uploadedPdfDataUrl?: PdfAttachmentSource,
  outputFileName: string = 'document.pdf'
): Promise<string> {
  return await buildMergedThreeLayerPdfDataUrl(
    [
      {
        title: outputFileName.replace('.pdf', ''),
        coverElement,
        formElement: templateElement,
        fileSource: uploadedPdfDataUrl
      }
    ],
    outputFileName
  );
}


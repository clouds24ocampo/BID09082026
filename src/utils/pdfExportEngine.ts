import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import html2canvas from 'html2canvas';
import { debugLog } from './debugLog';

export type PdfAttachmentSource = string | ArrayBuffer | Uint8Array | Blob;

export interface ExportDocumentUnit {
  title: string;
  coverElement?: HTMLElement | null;
  formElement?: HTMLElement | HTMLElement[] | null;
  fileDataUrl?: string | null;
  fileSource?: PdfAttachmentSource | null;
  documentName?: string;
}

const blobToDataUrl = async (blob: Blob): Promise<string> => {
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

export interface PdfExportOptions {
  folderCopy?: 'ORIGINAL' | 'COPY_1' | 'COPY_2';
  submissionDate?: string;
  companyName?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  projectRefNo?: string;
  projectTitle?: string;
}

// Standard Legal Size Dimensions in Points (72 dpi):
// Portrait Legal:  8.5" x 13" = 612pt x 936pt
// Landscape Legal: 13" x 8.5" = 936pt x 612pt
const LEGAL_LANDSCAPE: [number, number] = [936, 612];
const LEGAL_PORTRAIT: [number, number] = [612, 936];

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
  debugLog('pdfExportEngine.ts:start', 'PDF build starting', { unitCount: units.length, outputFileName }, 'C');

  const pdfDoc = await PDFDocument.create();

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

        debugLog('pdfExportEngine.ts:cover', `Cover page appended (${isPortrait ? 'Portrait' : 'Landscape'})`, { docTitle }, 'C');
      } catch (err) {
        console.error(`[PDF] Error generating cover page for ${unit.title}:`, err);
      }
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

    // â”€â”€ ATTACHED PDF / IMAGE FILE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const fileSource = unit.fileSource ?? unit.fileDataUrl;
    if (fileSource) {
      try {
        const pdfArrayBuffer = await normalizePdfSourceToArrayBuffer(fileSource);
        try {
          const externalPdfDoc = await PDFDocument.load(pdfArrayBuffer, { ignoreEncryption: true });
          const pageIndices = externalPdfDoc.getPageIndices();
          const copiedPages = await pdfDoc.copyPages(externalPdfDoc, pageIndices);
          copiedPages.forEach((copiedPage) => pdfDoc.addPage(copiedPage));
          debugLog('pdfExportEngine.ts:attach', `Appended ${pageIndices.length} PDF pages`, { docTitle }, 'C');
        } catch (_pdfLoadErr) {
          // Not a PDF â€” try embedding as image
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
              const isPortraitImg = embeddedImage.height > embeddedImage.width;
              const imgPageSize: [number, number] = isPortraitImg ? LEGAL_PORTRAIT : LEGAL_LANDSCAPE;
              const scale = Math.min(
                imgPageSize[0] / embeddedImage.width,
                imgPageSize[1] / embeddedImage.height
              );
              const drawW = embeddedImage.width * scale;
              const drawH = embeddedImage.height * scale;
              const drawX = (imgPageSize[0] - drawW) / 2;
              const drawY = imgPageSize[1] - drawH;
              const imgPage = pdfDoc.addPage(imgPageSize);
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

      const submissionDate = options?.submissionDate || 'August 30, 2026';
      const signatory = options?.signatoryName || 'Authorized Managing Officer';
      const refNo = options?.projectRefNo || 'PhilGEPS-2026';

      for (let pageIdx = 0; pageIdx < totalPageCount; pageIdx++) {
        const page = allPages[pageIdx];
        const width = page.getWidth();
        const height = page.getHeight();
        const rotationAngle = page.getRotation().angle;

        // 1. DIAGONAL WATERMARK (SUBTLE, UNOBTRUSIVE BAC COMPLIANT)
        if (effectiveFolderCopy && rotationAngle === 0) {
          const watermarkText = effectiveFolderCopy === 'ORIGINAL'
            ? 'ORIGINAL BID DOCUMENT'
            : effectiveFolderCopy === 'COPY_1'
            ? 'CERTIFIED TRUE COPY — COPY 1'
            : 'CERTIFIED TRUE COPY — COPY 2';

          const wmSize = width > 700 ? 36 : 28;
          const wmW = helveticaBold.widthOfTextAtSize(watermarkText, wmSize);

          page.drawText(watermarkText, {
            x: (width - wmW * 0.7) / 2,
            y: height / 2 - 30,
            size: wmSize,
            font: helveticaBold,
            color: rgb(0.85, 0.88, 0.93),
            rotate: degrees(36),
            opacity: 0.22
          });
        }

        // 2. CERTIFIED TRUE COPY OFFICIAL RUBBER STAMP (FOR COPY_1 AND COPY_2)
        if ((effectiveFolderCopy === 'COPY_1' || effectiveFolderCopy === 'COPY_2') && rotationAngle === 0) {
          const copyLabel = effectiveFolderCopy === 'COPY_1' ? 'COPY 1 (FIRST CERTIFIED TRUE COPY)' : 'COPY 2 (SECOND CERTIFIED TRUE COPY)';
          const stampW = 210;
          const stampH = 56;
          // Deterministic slight tilt angle (-5 to -8 deg) for realistic authentic government stamp feel
          const tiltDeg = -6 - (pageIdx % 3);
          const stampTilt = degrees(tiltDeg);
          const stampX = width - stampW - 20;
          const stampY = height - stampH - 22;

          // Double border stamp box in classic official ink blue
          page.drawRectangle({
            x: stampX,
            y: stampY,
            width: stampW,
            height: stampH,
            borderColor: rgb(0.08, 0.2, 0.5),
            borderWidth: 1.5,
            rotate: stampTilt
          });
          page.drawRectangle({
            x: stampX + 2,
            y: stampY + 2,
            width: stampW - 4,
            height: stampH - 4,
            borderColor: rgb(0.08, 0.2, 0.5),
            borderWidth: 0.5,
            rotate: stampTilt
          });

          // Header line
          page.drawText('* CERTIFIED TRUE COPY *', {
            x: stampX + 16,
            y: stampY + stampH - 13,
            size: 7.5,
            font: helveticaBold,
            color: rgb(0.08, 0.2, 0.5),
            rotate: stampTilt
          });
          page.drawText(copyLabel, {
            x: stampX + 16,
            y: stampY + stampH - 22,
            size: 6,
            font: helveticaBold,
            color: rgb(0.08, 0.2, 0.5),
            rotate: stampTilt
          });
          page.drawText(`Date of Submission: ${submissionDate}`, {
            x: stampX + 12,
            y: stampY + stampH - 32,
            size: 6,
            font: helveticaFont,
            color: rgb(0.12, 0.24, 0.54),
            rotate: stampTilt
          });
          page.drawText(`Authenticated: ${signatory.slice(0, 30)}`, {
            x: stampX + 12,
            y: stampY + stampH - 41,
            size: 5.5,
            font: helveticaFont,
            color: rgb(0.12, 0.24, 0.54),
            rotate: stampTilt
          });
          page.drawText(`Ref: ${refNo} - BAC COMPLIANT`, {
            x: stampX + 12,
            y: stampY + stampH - 50,
            size: 5,
            font: helveticaBold,
            color: rgb(0.16, 0.28, 0.58),
            rotate: stampTilt
          });
        } else if (effectiveFolderCopy === 'ORIGINAL' && rotationAngle === 0) {
          // Sleek official original submission banner badge at upper right
          const origTag = 'OFFICIAL ORIGINAL SUBMISSION COPY';
          const origTagW = helveticaBold.widthOfTextAtSize(origTag, 6.5);
          page.drawRectangle({
            x: width - origTagW - 32,
            y: height - 24,
            width: origTagW + 12,
            height: 14,
            color: rgb(0.08, 0.14, 0.25),
            borderColor: rgb(0.9, 0.75, 0.2),
            borderWidth: 0.8
          });
          page.drawText(origTag, {
            x: width - origTagW - 26,
            y: height - 19.5,
            size: 6.5,
            font: helveticaBold,
            color: rgb(1, 1, 1)
          });
        }

        // 3. PAGE X OF Y PAGINATION (AT BOTTOM CENTER)
        const pageText = `Page ${pageIdx + 1} of ${totalPageCount}`;
        const fontSize = 7.5;
        const textWidth = helveticaFont.widthOfTextAtSize(pageText, fontSize);

        if (rotationAngle === 0) {
          page.drawText(pageText, {
            x: (width - textWidth) / 2,
            y: 12,
            size: fontSize,
            font: helveticaFont,
            color: rgb(0.2, 0.2, 0.2)
          });
        } else if (rotationAngle === 90) {
          page.drawText(pageText, {
            x: 12,
            y: (height - textWidth) / 2,
            size: fontSize,
            font: helveticaFont,
            color: rgb(0.2, 0.2, 0.2),
            rotate: degrees(90)
          });
        } else if (rotationAngle === 180) {
          page.drawText(pageText, {
            x: (width + textWidth) / 2,
            y: height - 12,
            size: fontSize,
            font: helveticaFont,
            color: rgb(0.2, 0.2, 0.2),
            rotate: degrees(180)
          });
        } else if (rotationAngle === 270) {
          page.drawText(pageText, {
            x: width - 12,
            y: (height + textWidth) / 2,
            size: fontSize,
            font: helveticaFont,
            color: rgb(0.2, 0.2, 0.2),
            rotate: degrees(270)
          });
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

  debugLog('pdfExportEngine.ts:complete', 'PDF export completed', {
    outputFileName,
    byteSize: pdfBytes.length,
    unitCount: units.length,
    pageCount: totalPageCount
  }, 'C');

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
    debugLog('pdfExportEngine.ts:fatal', 'PDF export fatal error', { error: String(globalErr) }, 'C');
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


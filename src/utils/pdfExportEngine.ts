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
    const response = await fetch(source);
    return await response.arrayBuffer();
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

/**
 * Senior PDF Rendering Engine
 * Preserves vector quality for uploaded PDFs using direct copyPages().
 * Strictly enforces Landscape Legal (13" x 8.5") orientation for all generated pages.
 * Strictly enforces Cover Page -> Uploaded PDF -> Next Cover Page sequence.
 */
async function buildMergedThreeLayerPdfBytes(
  units: ExportDocumentUnit[],
  outputFileName: string = 'merged_document.pdf'
): Promise<Uint8Array> {
  console.log('=====================================================');
  console.log('🚀 SENIOR PDF RENDERING ENGINE: STARTING COMPILATION');
  console.log(`Total Document Units to Process: ${units.length}`);
  console.log('=====================================================');

  const pdfDoc = await PDFDocument.create();

  // Standard Legal Size Dimensions in Points (72 dpi):
  // Landscape Legal: 13" x 8.5" = 936pt x 612pt
  const legalLandscape: [number, number] = [936, 612];

  for (let index = 0; index < units.length; index++) {
    const unit = units[index];
    console.log(`\n--- [Unit ${index + 1}/${units.length}] Processing: ${unit.title} ---`);

    if (unit.coverElement) {
      console.log(`📸 Generating Cover Page for: ${unit.title}`);
      try {
        const qrImages = unit.coverElement.querySelectorAll('img[alt*="QR"], img[alt*="qr"]');
        const qrLoadingPlaceholders = unit.coverElement.querySelectorAll(':scope *');
        let loadingQrCount = 0;
        qrLoadingPlaceholders.forEach((el) => {
          if (el.textContent?.includes('Loading QR')) loadingQrCount++;
        });
        debugLog('pdfExportEngine.ts:cover', 'Cover page capture starting', {
          unitTitle: unit.title,
          qrImageCount: qrImages.length,
          loadingQrPlaceholders: loadingQrCount,
          coverWidth: unit.coverElement.offsetWidth,
          coverHeight: unit.coverElement.offsetHeight
        }, 'C');

        const isExplicitLandscapeElem = unit.coverElement.classList.contains('priceschedule-paper') ||
                                        unit.coverElement.classList.contains('landscape') ||
                                        unit.coverElement.classList.contains('aspect-[13/8.5]');

        const targetWindowWidth = isExplicitLandscapeElem ? 1248 : 816;

        const canvas = await html2canvas(unit.coverElement, {
          scale: 3,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          windowWidth: targetWindowWidth,
          onclone: processClonedDocForHtml2Canvas,
          ignoreElements: (element: Element) => {
            return (
              element.classList.contains('no-export') ||
              element.classList.contains('proof-column') ||
              element.classList.contains('actions-column') ||
              element.tagName === 'BUTTON'
            );
          }
        });
        const imgData = canvas.toDataURL('image/png');
        const pngImage = await pdfDoc.embedPng(imgData);

        const legalLandscape: [number, number] = [936, 612];
        const legalPortrait: [number, number] = [612, 936];

        const isPortrait = !isExplicitLandscapeElem && (
          canvas.height > canvas.width ||
          unit.coverElement.classList.contains('portrait') ||
          unit.coverElement.classList.contains('aspect-[8.5/13]')
        );

        const pageSize: [number, number] = isPortrait ? legalPortrait : legalLandscape;
        const coverPage = pdfDoc.addPage(pageSize);

        // Proportional aspect fit to guarantee 100% of cover page is rendered inside page bounds
        const scaleX = pageSize[0] / canvas.width;
        const scaleY = pageSize[1] / canvas.height;
        const fitScale = Math.min(scaleX, scaleY);
        const drawWidth = canvas.width * fitScale;
        const drawHeight = canvas.height * fitScale;
        const offsetX = (pageSize[0] - drawWidth) / 2;
        const offsetY = (pageSize[1] - drawHeight) / 2;

        coverPage.drawImage(pngImage, {
          x: offsetX,
          y: offsetY,
          width: drawWidth,
          height: drawHeight
        });
        console.log(`✅ Cover Page Appended (${isPortrait ? 'Portrait' : 'Landscape'}) for: ${unit.title}`);
        debugLog('pdfExportEngine.ts:cover', 'Cover page capture succeeded', {
          unitTitle: unit.title,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          isPortrait
        }, 'C');
      } catch (err) {
        console.error(`❌ Error generating cover page for ${unit.title}:`, err);
      }
    }

    if (unit.formElement) {
      let formElements: HTMLElement[] = [];
      if (Array.isArray(unit.formElement)) {
        formElements = unit.formElement.flatMap((el) => {
          if (!el) return [];
          const children = el.querySelectorAll('.single-page-paper, .print-document-sheet, .priceschedule-paper');
          return children.length > 0 ? (Array.from(children) as HTMLElement[]) : [el];
        });
      } else if (unit.formElement) {
        const childPapers = unit.formElement.querySelectorAll('.single-page-paper, .print-document-sheet, .priceschedule-paper');
        formElements = childPapers.length > 0
          ? (Array.from(childPapers) as HTMLElement[])
          : [unit.formElement];
      }

      for (let elemIdx = 0; elemIdx < formElements.length; elemIdx++) {
        const elem = formElements[elemIdx];
        console.log(`📸 Generating Form Template Page ${elemIdx + 1}/${formElements.length} for: ${unit.title}`);
        try {
          const isExplicitPortraitElem = elem.classList.contains('portrait') ||
                                         elem.classList.contains('aspect-[8.5/13]') ||
                                         elem.classList.contains('aspect-[8.5/11]');

          const isExplicitLandscapeElem = !isExplicitPortraitElem && (
                                          elem.classList.contains('priceschedule-paper') ||
                                          elem.classList.contains('landscape') ||
                                          elem.classList.contains('aspect-[13/8.5]')
                                        );

          const targetWindowWidth = isExplicitLandscapeElem ? 1248 : 816;

          const canvas = await html2canvas(elem, {
            scale: 3,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0,
            windowWidth: targetWindowWidth,
            onclone: processClonedDocForHtml2Canvas,
            ignoreElements: (element: Element) => {
              return (
                element.classList.contains('no-export') ||
                element.classList.contains('proof-column') ||
                element.classList.contains('actions-column') ||
                element.tagName === 'BUTTON'
              );
            }
          });

          const legalLandscape: [number, number] = [936, 612];
          const legalPortrait: [number, number] = [612, 936];

          const isPortrait = isExplicitPortraitElem || (!isExplicitLandscapeElem && canvas.height >= canvas.width);
          const pageSize: [number, number] = isPortrait ? legalPortrait : legalLandscape;
          const targetCanvasPageHeight = Math.round(canvas.width * (pageSize[1] / pageSize[0]));

          const elemRect = elem.getBoundingClientRect();
          const scaleFactor = elemRect.height > 0 ? (canvas.height / elemRect.height) : 1;

          const rowNodes = Array.from(elem.querySelectorAll('tr, .page-break-inside-avoid, .signatory-block, .border-b-2'));
          const rowBreakYCanvas: number[] = [];
          rowNodes.forEach((node) => {
            const rect = node.getBoundingClientRect();
            const topInCanvas = Math.round((rect.top - elemRect.top) * scaleFactor);
            const bottomInCanvas = Math.round((rect.bottom - elemRect.top) * scaleFactor);
            if (topInCanvas > 0) rowBreakYCanvas.push(topInCanvas);
            if (bottomInCanvas > 0) rowBreakYCanvas.push(bottomInCanvas);
          });
          rowBreakYCanvas.sort((a, b) => a - b);

          const isPrePaginated = elem.classList.contains('single-page-paper') ||
                                 elem.classList.contains('priceschedule-paper') ||
                                 elem.classList.contains('summarybid-paper') ||
                                 elem.classList.contains('boq-paper') ||
                                 elem.classList.contains('cashflow-paper') ||
                                 elem.classList.contains('print-document-sheet');

          if (isPrePaginated) {
            const imgData = canvas.toDataURL('image/png');
            const pngImage = await pdfDoc.embedPng(imgData);

            const formPage = pdfDoc.addPage(pageSize);
            // Proportional fit into page bounds (never overflow, never slice)
            const scaleX = pageSize[0] / canvas.width;
            const scaleY = pageSize[1] / canvas.height;
            const scale = Math.min(scaleX, scaleY);

            const drawWidth = canvas.width * scale;
            const drawHeight = canvas.height * scale;
            const drawX = (pageSize[0] - drawWidth) / 2;
            const drawY = pageSize[1] - drawHeight; // Top-aligned in PDF coordinate system

            formPage.drawImage(pngImage, {
              x: drawX,
              y: drawY,
              width: drawWidth,
              height: drawHeight
            });
            console.log(`✅ Pre-paginated Form Page ${elemIdx + 1}/${formElements.length} Appended (${isPortrait ? 'Portrait' : 'Landscape'} Legal) for: ${unit.title}`);
          } else {
            const slices: { startY: number; height: number }[] = [];
            let currentY = 0;

            while (currentY < canvas.height - 30) {
              const maxPossibleY = currentY + targetCanvasPageHeight;
              if (maxPossibleY >= canvas.height) {
                const remainingHeight = canvas.height - currentY;
                if (remainingHeight > 30) {
                  slices.push({ startY: currentY, height: remainingHeight });
                }
                break;
              }

              let bestSplitY = maxPossibleY;
              const minAcceptableY = currentY + Math.round(targetCanvasPageHeight * 0.2);
              const candidates = rowBreakYCanvas.filter((y) => y > minAcceptableY && y <= maxPossibleY);
              if (candidates.length > 0) {
                const candidateSplitY = candidates[candidates.length - 1];
                const emptyGapRatio = (maxPossibleY - candidateSplitY) / targetCanvasPageHeight;
                // Only accept row break if it leaves less than 15% empty whitespace on the page
                if (emptyGapRatio <= 0.15) {
                  bestSplitY = candidateSplitY;
                } else {
                  bestSplitY = maxPossibleY;
                }
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

            console.log(`✂️ Adaptive Row-Aware Canvas Slicing: ${canvas.height}px split into ${slices.length} pages.`);

            for (let sliceIndex = 0; sliceIndex < slices.length; sliceIndex++) {
              const { startY, height } = slices[sliceIndex];
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
              slicePage.drawImage(slicePngImage, {
                x: 0,
                y: 0,
                width: pageSize[0],
                height: pageSize[1]
              });
              console.log(`✅ Adaptive Slice ${sliceIndex + 1}/${slices.length} Appended (Landscape Legal) for: ${unit.title}`);
            }
          }
        } catch (err) {
          console.error(`❌ Error generating form template page ${elemIdx + 1} for ${unit.title}:`, err);
        }
      }
    }

    const fileSource = unit.fileSource ?? unit.fileDataUrl;
    if (fileSource) {
      console.log(`📑 Processing Attached File for: ${unit.title}`);
      let loadedAsPdf = false;
      try {
        const pdfArrayBuffer = await normalizePdfSourceToArrayBuffer(fileSource);
        try {
          const externalPdfDoc = await PDFDocument.load(pdfArrayBuffer);
          const pageIndices = externalPdfDoc.getPageIndices();

          console.log(`Copying ${pageIndices.length} native vector pages from uploaded PDF...`);
          const copiedPages = await pdfDoc.copyPages(externalPdfDoc, pageIndices);

          copiedPages.forEach((copiedPage) => {
            const width = copiedPage.getWidth();
            const height = copiedPage.getHeight();
            const rotation = copiedPage.getRotation().angle;
            console.log(`-> Page size: ${width.toFixed(0)}pt x ${height.toFixed(0)}pt (Preserved native rotation ${rotation}°)`);
            pdfDoc.addPage(copiedPage);
          });

          console.log(`✅ All ${pageIndices.length} Uploaded PDF Pages Appended for: ${unit.title}`);
          loadedAsPdf = true;
        } catch (pdfLoadErr) {
          // If not a PDF, check if it's an image (PNG or JPG)
          console.log(`ℹ️ Source is not a raw PDF stream, attempting image embedding for: ${unit.title}`);
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
              const imgPageSize: [number, number] = isPortraitImg ? [612, 936] : [936, 612];
              const scale = Math.min(imgPageSize[0] / embeddedImage.width, imgPageSize[1] / embeddedImage.height);
              const drawW = embeddedImage.width * scale;
              const drawH = embeddedImage.height * scale;
              const drawX = (imgPageSize[0] - drawW) / 2;
              const drawY = imgPageSize[1] - drawH;

              const imgPage = pdfDoc.addPage(imgPageSize);
              imgPage.drawImage(embeddedImage, {
                x: drawX,
                y: drawY,
                width: drawW,
                height: drawH
              });
              console.log(`✅ Embedded image page (${isPortraitImg ? 'Portrait' : 'Landscape'} Legal) for: ${unit.title}`);
              loadedAsPdf = true;
            }
          } catch (imgErr) {
            console.error(`❌ Failed to embed source as image:`, imgErr);
          }
        }
      } catch (err) {
        console.error(`❌ Error loading attached file for ${unit.title}:`, err);
      }
    } else {
      console.log(`ℹ️ No uploaded PDF file attached for: ${unit.title}`);
    }

    console.log(`🎉 Finished Unit ${index + 1}: ${unit.title}`);
  }

  // ─── STAMP "Page X of Y" PAGINATION AT THE BOTTOM OF EVERY PAGE ───
  const allPages = pdfDoc.getPages();
  const totalPageCount = allPages.length;
  if (totalPageCount > 0) {
    try {
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      for (let pageIdx = 0; pageIdx < totalPageCount; pageIdx++) {
        const page = allPages[pageIdx];
        const width = page.getWidth();
        const height = page.getHeight();
        const pageText = `Page ${pageIdx + 1} of ${totalPageCount}`;
        const fontSize = 7.5;
        const textWidth = helveticaFont.widthOfTextAtSize(pageText, fontSize);
        const rotationAngle = page.getRotation().angle;

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
      console.log(`🔢 Successfully stamped "Page X of ${totalPageCount}" on all ${totalPageCount} pages.`);
    } catch (pageNumberErr) {
      console.warn('Pagination stamping note:', pageNumberErr);
    }
  }

  console.log('\n💾 Compiling final PDF document byte stream...');
  const pdfBytes = await pdfDoc.save();
  console.log('=====================================================');
  console.log(`✨ PDF BUILD COMPLETE: "${outputFileName}" (${(pdfBytes.length / 1024).toFixed(1)} KB)`);
  console.log('=====================================================');
  debugLog('pdfExportEngine.ts:complete', 'PDF export completed', {
    outputFileName,
    byteSize: pdfBytes.length,
    unitCount: units.length
  }, 'C');

  return pdfBytes;
}

export async function buildMergedThreeLayerPdfDataUrl(
  units: ExportDocumentUnit[],
  outputFileName: string = 'merged_document.pdf'
): Promise<string> {
  const pdfBytes = await buildMergedThreeLayerPdfBytes(units, outputFileName);
  const rawPdfBuffer = new ArrayBuffer(pdfBytes.length);
  new Uint8Array(rawPdfBuffer).set(pdfBytes);
  const blob = new Blob([rawPdfBuffer], { type: 'application/pdf' });
  return await blobToDataUrl(blob);
}

export async function exportMergedThreeLayerPdf(
  units: ExportDocumentUnit[],
  outputFileName: string = 'merged_document.pdf'
): Promise<void> {
  try {
    const pdfBytes = await buildMergedThreeLayerPdfBytes(units, outputFileName);
    const rawPdfBuffer = new ArrayBuffer(pdfBytes.length);
    new Uint8Array(rawPdfBuffer).set(pdfBytes);
    const blob = new Blob([rawPdfBuffer], { type: 'application/pdf' });

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = outputFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (globalErr) {
    console.error('💥 FATAL ERROR IN PDF EXPORT ENGINE:', globalErr);
    debugLog('pdfExportEngine.ts:fatal', 'PDF export fatal error', {
      error: String(globalErr)
    }, 'C');
    window.print();
  }
}

export async function generateAndDownloadThreeLayerPdf(
  coverElement: HTMLElement | null,
  templateElement: HTMLElement | HTMLElement[] | null,
  uploadedPdfDataUrl?: PdfAttachmentSource,
  outputFileName: string = 'document.pdf'
): Promise<void> {
  await exportMergedThreeLayerPdf([
    {
      title: outputFileName.replace('.pdf', ''),
      coverElement,
      formElement: templateElement,
      fileSource: uploadedPdfDataUrl
    }
  ], outputFileName);
}

export async function generateThreeLayerPdfDataUrl(
  coverElement: HTMLElement | null,
  templateElement: HTMLElement | HTMLElement[] | null,
  uploadedPdfDataUrl?: PdfAttachmentSource,
  outputFileName: string = 'document.pdf'
): Promise<string> {
  return await buildMergedThreeLayerPdfDataUrl([
    {
      title: outputFileName.replace('.pdf', ''),
      coverElement,
      formElement: templateElement,
      fileSource: uploadedPdfDataUrl
    }
  ], outputFileName);
}

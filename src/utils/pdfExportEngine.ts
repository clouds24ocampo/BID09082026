import { PDFDocument } from 'pdf-lib';
import html2canvas from 'html2canvas';
import { debugLog } from './debugLog';

export interface ExportDocumentUnit {
  title: string;
  coverElement?: HTMLElement | null;
  formElement?: HTMLElement | HTMLElement[] | null;
  fileDataUrl?: string | null;
  documentName?: string;
}

/**
 * Senior PDF Rendering Engine
 * Preserves vector quality for uploaded PDFs using direct copyPages().
 * Detects and preserves original page orientation (Landscape vs Portrait).
 * Strictly enforces Cover Page -> Uploaded PDF -> Next Cover Page sequence.
 */
export async function exportMergedThreeLayerPdf(
  units: ExportDocumentUnit[],
  outputFileName: string = 'merged_document.pdf'
): Promise<void> {
  console.log('=====================================================');
  console.log('🚀 SENIOR PDF RENDERING ENGINE: STARTING COMPILATION');
  console.log(`Total Document Units to Process: ${units.length}`);
  console.log('=====================================================');

  try {
    const pdfDoc = await PDFDocument.create();

    // Standard Legal Size Dimensions in Points (72 dpi):
    // Portrait:  8.5" x 13" = 612pt x 936pt
    // Landscape: 13" x 8.5" = 936pt x 612pt
    const legalPortrait: [number, number] = [612, 936];
    const legalLandscape: [number, number] = [936, 612];

    for (let index = 0; index < units.length; index++) {
      const unit = units[index];
      console.log(`\n--- [Unit ${index + 1}/${units.length}] Processing: ${unit.title} ---`);

      // STEP 1: GENERATE & APPEND FRONT COVER PAGE (IF PRESENT)
      if (unit.coverElement) {
        console.log(`📸 Generating Cover Page for: ${unit.title}`);
        try {
          const qrImages = unit.coverElement.querySelectorAll('img[alt*="QR"], img[alt*="qr"]');
          const qrLoadingPlaceholders = unit.coverElement.querySelectorAll(':scope *');
          let loadingQrCount = 0;
          qrLoadingPlaceholders.forEach((el) => {
            if (el.textContent?.includes('Loading QR')) loadingQrCount++;
          });
          // #region agent log
          debugLog('pdfExportEngine.ts:cover', 'Cover page capture starting', {
            unitTitle: unit.title,
            qrImageCount: qrImages.length,
            loadingQrPlaceholders: loadingQrCount,
            coverWidth: unit.coverElement.offsetWidth,
            coverHeight: unit.coverElement.offsetHeight
          }, 'C');
          // #endregion
          const canvas = await html2canvas(unit.coverElement, {
            scale: 3, // High 300+ DPI render quality
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            ignoreElements: (element: Element) => {
              return (
                element.classList.contains('print:hidden') ||
                element.classList.contains('no-export') ||
                element.classList.contains('proof-column') ||
                element.classList.contains('actions-column') ||
                element.tagName === 'BUTTON'
              );
            }
          });
          const imgData = canvas.toDataURL('image/png');
          const pngImage = await pdfDoc.embedPng(imgData);

          const coverPage = pdfDoc.addPage(legalPortrait);
          coverPage.drawImage(pngImage, {
            x: 0,
            y: 0,
            width: legalPortrait[0],
            height: legalPortrait[1]
          });
          console.log(`✅ Cover Page Appended for: ${unit.title}`);
          // #region agent log
          debugLog('pdfExportEngine.ts:cover', 'Cover page capture succeeded', {
            unitTitle: unit.title,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height
          }, 'C');
          // #endregion
        } catch (err) {
          console.error(`❌ Error generating cover page for ${unit.title}:`, err);
        }
      }

      // STEP 2: GENERATE & APPEND FORM TEMPLATE(S) (IF PRESENT)
      if (unit.formElement) {
        let formElements: HTMLElement[] = [];
        if (Array.isArray(unit.formElement)) {
          formElements = unit.formElement;
        } else if (unit.formElement) {
          const childPapers = unit.formElement.querySelectorAll('.single-page-paper, .print-document-sheet');
          if (childPapers.length > 0) {
            formElements = Array.from(childPapers) as HTMLElement[];
          } else {
            formElements = [unit.formElement];
          }
        }

        for (let elemIdx = 0; elemIdx < formElements.length; elemIdx++) {
          const elem = formElements[elemIdx];
          console.log(`📸 Generating Form Template Page ${elemIdx + 1}/${formElements.length} for: ${unit.title}`);
          try {
            const canvas = await html2canvas(elem, {
              scale: 3,
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff',
              ignoreElements: (element: Element) => {
                return (
                  element.classList.contains('print:hidden') ||
                  element.classList.contains('no-export') ||
                  element.classList.contains('proof-column') ||
                  element.classList.contains('actions-column') ||
                  element.tagName === 'BUTTON'
                );
              }
            });

            const isLandscapeForm = canvas.width > canvas.height;
            const pageSize = isLandscapeForm ? legalLandscape : legalPortrait;

            // Compute target single-page canvas height based on paper aspect ratio
            const targetCanvasPageHeight = Math.round(canvas.width * (pageSize[1] / pageSize[0]));

            // Measure DOM elements relative to elem for intelligent row-aware splitting
            const elemRect = elem.getBoundingClientRect();
            const scaleFactor = elemRect.height > 0 ? (canvas.height / elemRect.height) : 1;

            const rowNodes = Array.from(elem.querySelectorAll('tr, .page-break-inside-avoid, .signatory-block, .border-b-2'));
            const rowBreakYCanvas: number[] = [];
            rowNodes.forEach((node) => {
              const r = node.getBoundingClientRect();
              const topInCanvas = Math.round((r.top - elemRect.top) * scaleFactor);
              const bottomInCanvas = Math.round((r.bottom - elemRect.top) * scaleFactor);
              if (topInCanvas > 0) rowBreakYCanvas.push(topInCanvas);
              if (bottomInCanvas > 0) rowBreakYCanvas.push(bottomInCanvas);
            });
            rowBreakYCanvas.sort((a, b) => a - b);

            // If canvas height fits within 105% of target page height, render as single page!
            if (canvas.height <= targetCanvasPageHeight * 1.05) {
              const imgData = canvas.toDataURL('image/png');
              const pngImage = await pdfDoc.embedPng(imgData);

              const formPage = pdfDoc.addPage(pageSize);
              formPage.drawImage(pngImage, {
                x: 0,
                y: 0,
                width: pageSize[0],
                height: pageSize[1]
              });
              console.log(`✅ Single-Page Adaptive Form Appended (${isLandscapeForm ? 'Landscape' : 'Portrait'}) for: ${unit.title}`);
            } else {
              // Multi-page content: perform adaptive row-aware canvas slicing!
              const slices: { startY: number; height: number }[] = [];
              let currentY = 0;

              while (currentY < canvas.height - 10) {
                const maxPossibleY = currentY + targetCanvasPageHeight;
                if (maxPossibleY >= canvas.height) {
                  slices.push({ startY: currentY, height: canvas.height - currentY });
                  break;
                }

                // Find highest row boundary below currentY + 0.2*targetPageHeight and <= maxPossibleY
                let bestSplitY = maxPossibleY;
                const minAcceptableY = currentY + (targetCanvasPageHeight * 0.2);
                const candidates = rowBreakYCanvas.filter(y => y > minAcceptableY && y <= maxPossibleY);
                if (candidates.length > 0) {
                  bestSplitY = candidates[candidates.length - 1];
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

              for (let sIdx = 0; sIdx < slices.length; sIdx++) {
                const { startY, height } = slices[sIdx];
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
                console.log(`✅ Adaptive Slice ${sIdx + 1}/${slices.length} Appended for: ${unit.title}`);
              }
            }
          } catch (err) {
            console.error(`❌ Error generating form template page ${elemIdx + 1} for ${unit.title}:`, err);
          }
        }
      }

      // STEP 3: APPEND ATTACHED UPLOADED PDF FILE (IF PRESENT)
      if (unit.fileDataUrl) {
        console.log(`📑 Processing Attached Vector PDF File for: ${unit.title}`);
        try {
          const res = await fetch(unit.fileDataUrl);
          const pdfArrayBuffer = await res.arrayBuffer();

          const externalPdfDoc = await PDFDocument.load(pdfArrayBuffer);
          const pageIndices = externalPdfDoc.getPageIndices();

          console.log(`Copying ${pageIndices.length} native vector pages from uploaded PDF...`);
          const copiedPages = await pdfDoc.copyPages(externalPdfDoc, pageIndices);

          copiedPages.forEach((copiedPage) => {
            const width = copiedPage.getWidth();
            const height = copiedPage.getHeight();
            console.log(`-> Page size: ${width.toFixed(0)}pt x ${height.toFixed(0)}pt (${width > height ? 'Landscape' : 'Portrait'})`);

            pdfDoc.addPage(copiedPage);
          });

          console.log(`✅ All ${pageIndices.length} Uploaded PDF Pages Appended for: ${unit.title}`);
        } catch (err) {
          console.error(`❌ Error loading/copying uploaded PDF pages for ${unit.title}:`, err);
        }
      } else {
        console.log(`ℹ️ No uploaded PDF file attached for: ${unit.title}`);
      }

      console.log(`🎉 Finished Unit ${index + 1}: ${unit.title}`);
    }

    // FINAL OUTPUT: SAVE & TRIGGER NATIVE DOWNLOAD
    console.log('\n💾 Compiling and saving final PDF document byte stream...');
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = outputFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

    console.log('=====================================================');
    console.log(`✨ PDF EXPORT COMPLETE: "${outputFileName}" (${(pdfBytes.length / 1024).toFixed(1)} KB)`);
    console.log('=====================================================');
    // #region agent log
    debugLog('pdfExportEngine.ts:complete', 'PDF export completed', {
      outputFileName,
      byteSize: pdfBytes.length,
      unitCount: units.length
    }, 'C');
    // #endregion
  } catch (globalErr) {
    console.error('💥 FATAL ERROR IN PDF EXPORT ENGINE:', globalErr);
    // #region agent log
    debugLog('pdfExportEngine.ts:fatal', 'PDF export fatal error', {
      error: String(globalErr)
    }, 'C');
    // #endregion
    window.print();
  }
}

// Backward compatibility helper wrapper
export async function generateAndDownloadThreeLayerPdf(
  coverElement: HTMLElement | null,
  templateElement: HTMLElement | HTMLElement[] | null,
  uploadedPdfDataUrl?: string,
  outputFileName: string = 'document.pdf'
): Promise<void> {
  await exportMergedThreeLayerPdf([
    {
      title: outputFileName.replace('.pdf', ''),
      coverElement,
      formElement: templateElement,
      fileDataUrl: uploadedPdfDataUrl
    }
  ], outputFileName);
}

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
        const formElements: HTMLElement[] = Array.isArray(unit.formElement)
          ? unit.formElement
          : [unit.formElement];

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
            const imgData = canvas.toDataURL('image/png');
            const pngImage = await pdfDoc.embedPng(imgData);

            const isLandscapeForm = canvas.width > canvas.height;
            const pageSize = isLandscapeForm ? legalLandscape : legalPortrait;

            const formPage = pdfDoc.addPage(pageSize);
            formPage.drawImage(pngImage, {
              x: 0,
              y: 0,
              width: pageSize[0],
              height: pageSize[1]
            });
            console.log(`✅ Form Template Page ${elemIdx + 1} Appended (${isLandscapeForm ? 'Landscape' : 'Portrait'}) for: ${unit.title}`);
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

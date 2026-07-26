import { PDFDocument } from 'pdf-lib';
import html2canvas from 'html2canvas';

export interface ExportDocumentUnit {
  title: string;
  coverElement?: HTMLElement | null;
  formElement?: HTMLElement | null;
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
        } catch (err) {
          console.error(`❌ Error generating cover page for ${unit.title}:`, err);
        }
      }

      // STEP 2: GENERATE & APPEND FORM TEMPLATE (IF PRESENT)
      if (unit.formElement) {
        console.log(`📸 Generating Form Template Page for: ${unit.title}`);
        try {
          const canvas = await html2canvas(unit.formElement, {
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
          console.log(`✅ Form Template Page Appended (${isLandscapeForm ? 'Landscape' : 'Portrait'}) for: ${unit.title}`);
        } catch (err) {
          console.error(`❌ Error generating form template for ${unit.title}:`, err);
        }
      }

      // STEP 3: COPY & APPEND ALL PAGES FROM UPLOADED PDF (PURE VECTOR PRESERVATION)
      if (unit.fileDataUrl) {
        console.log(`📁 Loading Uploaded PDF file for: ${unit.title}`);
        try {
          const base64Data = unit.fileDataUrl.split(',')[1] || unit.fileDataUrl;
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const srcDoc = await PDFDocument.load(bytes);
          const pageIndices = srcDoc.getPageIndices();
          console.log(`📄 Uploaded PDF Loaded. Total Pages Found: ${pageIndices.length}`);

          const copiedPages = await pdfDoc.copyPages(srcDoc, pageIndices);

          copiedPages.forEach((copiedPage, pIdx) => {
            const width = copiedPage.getWidth();
            const height = copiedPage.getHeight();
            const isLandscape = width > height;

            console.log(
              `   ➜ Page ${pIdx + 1}/${pageIndices.length}: ${
                isLandscape ? 'Landscape ↔️' : 'Portrait ↕️'
              } (${Math.round(width)}pt x ${Math.round(height)}pt) -> Copied (Vector Quality Preserved)`
            );

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
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = outputFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('=====================================================');
    console.log(`✨ PDF EXPORT COMPLETE: "${outputFileName}" (${(pdfBytes.length / 1024).toFixed(1)} KB)`);
    console.log('=====================================================');
  } catch (globalErr) {
    console.error('💥 FATAL ERROR IN PDF EXPORT ENGINE:', globalErr);
    window.print();
  }
}

// Backward compatibility helper wrapper
export async function generateAndDownloadThreeLayerPdf(
  coverElement: HTMLElement | null,
  templateElement: HTMLElement | null,
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

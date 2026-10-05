import { PDFDocument } from 'pdf-lib';
import html2canvas from 'html2canvas';
import { blobToDataUrl } from './pdfExportEngine';

// Philippine Legal portrait, 8.5" x 13" (PDF-2: module scope).
const LEGAL_PORTRAIT: [number, number] = [612, 936];

/** Capture each fixed 816x1248px element as one full Legal page and return the PDF as a base64 data URL. */
export async function legalPagesToPdfDataUrl(pages: HTMLElement[]): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  for (const el of pages) {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      windowWidth: 816,
    });
    const png = await pdfDoc.embedPng(canvas.toDataURL('image/png'));
    const page = pdfDoc.addPage(LEGAL_PORTRAIT);
    page.drawImage(png, { x: 0, y: 0, width: LEGAL_PORTRAIT[0], height: LEGAL_PORTRAIT[1] });
  }
  const bytes = await pdfDoc.save();
  return blobToDataUrl(new Blob([bytes as any], { type: 'application/pdf' }));
}

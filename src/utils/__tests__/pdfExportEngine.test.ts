import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildMergedThreeLayerPdfDataUrl, generateAndDownloadThreeLayerPdf } from '../pdfExportEngine';

describe('pdfExportEngine', () => {
  it('should be defined and callable', () => {
    expect(generateAndDownloadThreeLayerPdf).toBeDefined();
    expect(typeof generateAndDownloadThreeLayerPdf).toBe('function');
    expect(buildMergedThreeLayerPdfDataUrl).toBeDefined();
  });

  it('should merge vector pages into landscape legal PDF (936pt x 612pt)', async () => {
    // Create a dummy vector PDF
    const srcDoc = await PDFDocument.create();
    srcDoc.addPage([612, 936]); // Portrait page
    const srcBytes = await srcDoc.save();

    const dataUrl = await buildMergedThreeLayerPdfDataUrl([
      {
        title: 'Vector PDF Test',
        fileSource: srcBytes
      }
    ], 'landscape_vector_test.pdf');

    expect(dataUrl).toContain('data:application/pdf;base64,');

    const base64Data = dataUrl.split(',')[1];
    const pdfBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const pdfDoc = await PDFDocument.load(pdfBytes);

    expect(pdfDoc.getPageCount()).toBe(1);

    const firstPage = pdfDoc.getPage(0);
    // Page is portrait 612x936, but setRotation(90) makes its effective layout orientation Landscape
    const rotation = firstPage.getRotation().angle;
    expect(rotation % 180).not.toBe(0);
  });
});

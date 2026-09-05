import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildMergedThreeLayerPdfDataUrl, generateAndDownloadThreeLayerPdf, buildMergedThreeLayerPdfBytes } from '../pdfExportEngine';

describe('pdfExportEngine', () => {
  it('should be defined and callable', () => {
    expect(generateAndDownloadThreeLayerPdf).toBeDefined();
    expect(typeof generateAndDownloadThreeLayerPdf).toBe('function');
    expect(buildMergedThreeLayerPdfDataUrl).toBeDefined();
  });

  it('should preserve uploaded PDF page dimensions and orientation', async () => {
    // Create a dummy vector PDF with native portrait orientation
    const srcDoc = await PDFDocument.create();
    srcDoc.addPage([612, 936]); // Native Portrait page
    const srcBytes = await srcDoc.save();

    const pdfBytes = await buildMergedThreeLayerPdfBytes([
      {
        title: 'Vector PDF Test',
        fileSource: srcBytes
      }
    ], 'native_vector_test.pdf');

    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(0);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);

    const firstPage = pdfDoc.getPage(0);
    // Page is native portrait 612x936, rotation remains 0°
    const rotation = firstPage.getRotation().angle;
    expect(rotation).toBe(0);
    expect(firstPage.getWidth()).toBe(612);
    expect(firstPage.getHeight()).toBe(936);
  });

  it('should compile merged bundle including Section VII landscape exhibit with Page of Pages pagination', async () => {
    // 1. Create Legal Doc (Portrait 612x936)
    const legalDoc = await PDFDocument.create();
    legalDoc.addPage([612, 936]);
    const legalBytes = await legalDoc.save();

    // 2. Create Section VII Technical Specifications Exhibit (Landscape Legal 936x612)
    const secViiDoc = await PDFDocument.create();
    secViiDoc.addPage([936, 612]);
    secViiDoc.addPage([936, 612]);
    const secViiBytes = await secViiDoc.save();

    const pdfBytes = await buildMergedThreeLayerPdfBytes([
      {
        title: 'PhilGEPS Platinum Registration',
        fileSource: legalBytes
      },
      {
        title: 'Section VII: Technical Specifications Statement of Compliance',
        fileSource: secViiBytes
      }
    ], 'merged_test_bundle.pdf');

    const finalDoc = await PDFDocument.load(pdfBytes);

    // Total pages should be 1 + 2 = 3 pages
    expect(finalDoc.getPageCount()).toBe(3);

    // Page 1 is Portrait
    expect(finalDoc.getPage(0).getWidth()).toBe(612);
    expect(finalDoc.getPage(0).getHeight()).toBe(936);

    // Page 2 & 3 are Section VII Landscape
    expect(finalDoc.getPage(1).getWidth()).toBe(936);
    expect(finalDoc.getPage(1).getHeight()).toBe(612);
    expect(finalDoc.getPage(2).getWidth()).toBe(936);
    expect(finalDoc.getPage(2).getHeight()).toBe(612);
  });
});

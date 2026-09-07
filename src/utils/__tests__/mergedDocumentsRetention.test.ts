import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildMergedThreeLayerPdfBytes, ExportDocumentUnit } from '../pdfExportEngine';

describe('Bid Package Merged Documents Retention Proof', () => {
  it('should retain all uploaded and created documents during merging without omitting any file', async () => {
    // 1. Create a simulated uploaded PDF file (2 pages)
    const uploadedDoc = await PDFDocument.create();
    uploadedDoc.addPage([612, 936]);
    uploadedDoc.addPage([612, 936]);
    const uploadedPdfBytes = await uploadedDoc.save();

    // 2. Create a simulated statutory form PDF (1 page)
    const formDoc = await PDFDocument.create();
    formDoc.addPage([612, 936]);
    const formPdfBytes = await formDoc.save();

    // 3. Convert uploaded PDF to raw base64 string (without data: prefix) to test raw base64 resilience
    const binaryStr = Array.from(uploadedPdfBytes, byte => String.fromCharCode(byte)).join('');
    const rawBase64 = btoa(binaryStr);

    // 4. Convert form PDF to data URI
    const dataUri = `data:application/pdf;base64,${btoa(Array.from(formPdfBytes, byte => String.fromCharCode(byte)).join(''))}`;

    const units: ExportDocumentUnit[] = [
      {
        title: 'Document 1: PhilGEPS Platinum Certificate (Uploaded Raw Base64)',
        documentName: 'PhilGEPS Platinum Registration',
        fileDataUrl: rawBase64
      },
      {
        title: 'Document 2: Statement of All Ongoing Contracts (Created Form Data URI)',
        documentName: 'Statement of Ongoing Contracts',
        fileDataUrl: dataUri
      },
      {
        title: 'Document 3: Custom Statutory Exhibit (No Binary Fallback Sheet)',
        documentName: 'Special Power of Attorney Exhibit',
        fileDataUrl: null // Should trigger fallback statutory sheet, NEVER omitted!
      }
    ];

    // Compile ORIGINAL bundle
    const originalBytes = await buildMergedThreeLayerPdfBytes(units, 'ORIGINAL_TEST_PACKAGE.pdf', undefined, {
      folderCopy: 'ORIGINAL',
      submissionDate: 'September 08, 2026'
    });

    const origPdfDoc = await PDFDocument.load(originalBytes);
    // Page counts:
    // Doc 1: 2 pages
    // Doc 2: 1 page
    // Doc 3: 1 fallback sheet page
    // Total = 4 pages
    expect(origPdfDoc.getPageCount()).toBe(4);

    // Compile COPY_1 bundle with Certified True Copy stamp
    const copy1Bytes = await buildMergedThreeLayerPdfBytes(units, 'COPY_1_TEST_PACKAGE.pdf', undefined, {
      folderCopy: 'COPY_1',
      submissionDate: 'September 08, 2026',
      signatoryName: 'Engr. Ferdinand R. Valenzuela',
      signatoryTitle: 'Managing Director',
      projectRefNo: 'GOP-BAC-2026-IT-0089'
    });

    const copy1PdfDoc = await PDFDocument.load(copy1Bytes);
    expect(copy1PdfDoc.getPageCount()).toBe(4);

    // Compile COPY_2 bundle with Certified True Copy stamp
    const copy2Bytes = await buildMergedThreeLayerPdfBytes(units, 'COPY_2_TEST_PACKAGE.pdf', undefined, {
      folderCopy: 'COPY_2',
      submissionDate: 'September 08, 2026',
      signatoryName: 'Engr. Ferdinand R. Valenzuela',
      signatoryTitle: 'Managing Director',
      projectRefNo: 'GOP-BAC-2026-IT-0089'
    });

    const copy2PdfDoc = await PDFDocument.load(copy2Bytes);
    expect(copy2PdfDoc.getPageCount()).toBe(4);
  });
});

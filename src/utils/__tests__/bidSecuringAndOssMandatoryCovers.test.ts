import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildMergedThreeLayerPdfBytes, ExportDocumentUnit } from '../pdfExportEngine';

describe('Bid Securing Declaration & Omnibus Sworn Statement Mandatory Cover Pages', () => {
  it('should cleanly compile Bid Securing Declaration and Omnibus Sworn Statement cover pages into the merged package without an attached PDF body', async () => {
    // Simulate user workflow: User prints BSD and OSS cover pages upfront to attach wet-signed notarized documents
    const units: ExportDocumentUnit[] = [
      {
        title: 'Bid Securing Declaration / Bid Security or Surety Bond (BSD)',
        documentName: 'Bid Securing Declaration / Bid Security or Surety Bond (BSD)',
        fileDataUrl: null // No pre-uploaded scan yet - cover page acts as official separator
      },
      {
        title: 'Omnibus Sworn Statement (OSS)',
        documentName: 'Omnibus Sworn Statement (OSS)',
        fileDataUrl: null // No pre-uploaded scan yet - cover page acts as official separator
      }
    ];

    const pdfBytes = await buildMergedThreeLayerPdfBytes(units, 'TEST_STATUTORY_COVERS.pdf', undefined, {
      folderCopy: 'ORIGINAL',
      submissionDate: 'September 19, 2026',
      companyName: 'Quantum Cloud Corporation',
      signatoryName: 'Mark-Vin F. Ocampo',
      signatoryTitle: 'President',
      projectRefNo: 'PhilGEPS-2026-001',
      projectTitle: 'Procurement of CCTV System'
    });

    const pdfDoc = await PDFDocument.load(pdfBytes);
    // Each document without a file binary generates its official statutory separator/sheet
    expect(pdfDoc.getPageCount()).toBe(2);
  });
});

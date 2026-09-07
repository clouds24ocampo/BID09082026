import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildMergedThreeLayerPdfBytes, ExportDocumentUnit } from '../pdfExportEngine';
import { generateMajorEquipmentPdf } from '../systemDocumentPdfGenerator';

beforeAll(() => {
  if (typeof (globalThis as any).localStorage === 'undefined') {
    const store: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = String(v); },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); }
    };
  }
});

describe('All Documents and Files Merging Integrity Test', () => {
  it('should merge both Envelope 1 and Envelope 2 documents without omitting any document or file', async () => {
    // 1. Create dummy PDF pages for Envelope 1 (Legal, Technical)
    const philgepsDoc = await PDFDocument.create();
    philgepsDoc.addPage([612, 936]);
    const philgepsBytes = await philgepsDoc.save();

    const techDoc = await PDFDocument.create();
    techDoc.addPage([612, 936]);
    techDoc.addPage([612, 936]);
    const techBytes = await techDoc.save();

    // 2. Create dummy PDF pages for Envelope 2 (Financial)
    const bidFormDoc = await PDFDocument.create();
    bidFormDoc.addPage([612, 936]);
    const bidFormBytes = await bidFormDoc.save();

    const boqDoc = await PDFDocument.create();
    boqDoc.addPage([936, 612]); // Landscape BOQ
    const boqBytes = await boqDoc.save();

    const toDataUrl = (bytes: Uint8Array) =>
      `data:application/pdf;base64,${btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))}`;

    // 3. Units spanning both Envelope 1 and Envelope 2
    const allUnits: ExportDocumentUnit[] = [
      {
        title: 'Document 1: PhilGEPS Platinum Certificate (Env 1 - Legal)',
        documentName: 'PhilGEPS Platinum Registration',
        fileDataUrl: toDataUrl(philgepsBytes)
      },
      {
        title: 'Document 2: Section VII Technical Specs (Env 1 - Tech)',
        documentName: 'Technical Specifications',
        fileDataUrl: toDataUrl(techBytes)
      },
      {
        title: 'Document 3: Financial Bid Form (Env 2 - Financial)',
        documentName: 'Financial Bid Form',
        fileDataUrl: toDataUrl(bidFormBytes)
      },
      {
        title: 'Document 4: Bill of Quantities (Env 2 - Financial Landscape)',
        documentName: 'Bill of Quantities',
        fileDataUrl: toDataUrl(boqBytes)
      },
      {
        title: 'Document 5: Supplementary Exhibit without binary (Fallback Sheet)',
        documentName: 'Supplementary Technical Exhibit',
        fileDataUrl: null
      }
    ];

    // Merge ALL Envelopes into a single combined package
    const mergedAllBytes = await buildMergedThreeLayerPdfBytes(
      allUnits,
      'COMPLETE_BID_PACKAGE_ALL_ENVELOPES.pdf',
      undefined,
      {
        folderCopy: 'ORIGINAL',
        submissionDate: 'September 08, 2026',
        projectRefNo: 'GOP-2026-IT-ALL',
        projectTitle: 'Supply, Delivery & Commissioning of ICT Hardware'
      }
    );

    const mergedAllDoc = await PDFDocument.load(mergedAllBytes);
    // Expected pages:
    // Doc 1: 1 page
    // Doc 2: 2 pages
    // Doc 3: 1 page
    // Doc 4: 1 landscape page
    // Doc 5: 1 fallback sheet page
    // Total = 6 pages
    expect(mergedAllDoc.getPageCount()).toBe(6);

    // Verify landscape preservation on page 5 (0-indexed page 4)
    const boqPage = mergedAllDoc.getPage(4);
    expect(boqPage.getWidth()).toBe(936);
    expect(boqPage.getHeight()).toBe(612);

    // Verify portrait dimensions on page 1 (0-indexed page 0)
    const firstPage = mergedAllDoc.getPage(0);
    expect(firstPage.getWidth()).toBe(612);
    expect(firstPage.getHeight()).toBe(936);
  });

  it('should resolve copy 1 and copy 2 attachment IDs when prefixed with pkg-c1- or pkg-c2-', () => {
    const rawId = 'pkg-custom-1725700000000';
    const c1Id = `pkg-c1-${rawId}`;
    const c2Id = `pkg-c2-${rawId}`;

    const cleanId1 = c1Id.replace(/^pkg-c[12]-/, '');
    const cleanId2 = c2Id.replace(/^pkg-c[12]-/, '');

    expect(cleanId1).toBe(rawId);
    expect(cleanId2).toBe(rawId);
  });

  it('should include attached equipment proof PDFs inside major equipment generated document', async () => {
    // 1. Create a dummy OR/CR proof PDF
    const proofDoc = await PDFDocument.create();
    proofDoc.addPage([612, 936]);
    const proofBytes = await proofDoc.save();
    const proofDataUrl = `data:application/pdf;base64,${btoa(Array.from(proofBytes, b => String.fromCharCode(b)).join(''))}`;

    // 2. Set proof PDF in localStorage mock under attachedPdfId key
    const proofKey = 'equip_proof_test_item_123';
    localStorage.setItem(proofKey, proofDataUrl);

    // 3. Generate Major Equipment PDF with this item having attachedPdfId
    const equipPdfBytes = await generateMajorEquipmentPdf({
      equipmentList: [
        {
          id: 'test_item_123',
          description: 'Heavy Excavator Cat 320D',
          modelYear: '2022',
          capacity: '1.2 cu.m',
          plateNumber: 'ABC-1234',
          condition: 'EXCELLENT',
          ownershipType: 'OWNED',
          attachedPdfId: proofKey
        }
      ],
      projectTitle: 'Civil Works Road Construction Project',
      projectRefNo: 'DPWH-2026-CW-001',
      tenant: { companyName: 'BuildMax Corp', authorizedSignatory: { name: 'Juan Dela Cruz' } } as any
    } as any);

    const resultDoc = await PDFDocument.load(equipPdfBytes);
    // Page 1: Equipment Matrix Table (Portrait)
    // Page 2: Attached OR/CR Proof PDF
    expect(resultDoc.getPageCount()).toBeGreaterThanOrEqual(2);

    localStorage.removeItem(proofKey);
  });
});

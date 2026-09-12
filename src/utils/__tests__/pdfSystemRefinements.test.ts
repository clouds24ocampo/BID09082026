import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { resolveDocumentPdfAttachment, DocResolveContext } from '../systemDocumentPdfGenerator';
import { formatQrCodePayload } from '../qrCodeGenerator';
import { buildMergedThreeLayerPdfBytes } from '../pdfExportEngine';

describe('PDF System Refinements & Bug Fixes', () => {
  const dummyCtx: DocResolveContext = {
    tenant: {
      id: 'tenant-1',
      companyName: 'Quantum Cloud Corporation',
      businessType: 'CORPORATION',
      brandCode: 'QCC',
      authorizedSignatory: {
        name: 'Engr. Juan Dela Cruz',
        title: 'President / General Manager'
      }
    } as any,
    tenantId: 'tenant-1',
    activeProject: {
      id: 'proj-1',
      title: 'IT Modernization Project',
      refNo: 'PhilGEPS-13200679',
      procuringEntity: 'Department of Transportation'
    },
    projectRefNo: 'PhilGEPS-13200679',
    projectTitle: 'IT Modernization Project',
    procuringEntity: 'Department of Transportation',
    vaultDocs: []
  };

  it('BSD and OSS must return null attachment (cover page only for physical notarized attachment)', async () => {
    const bsdDoc = { id: 'BID_SECURING_DECLARATION', documentName: 'Bid Securing Declaration (BSD)' };
    const ossDoc = { id: 'OMNIBUS_SWORN_STATEMENT', documentName: 'Omnibus Sworn Statement (OSS)' };

    const bsdResult = await resolveDocumentPdfAttachment(bsdDoc, dummyCtx);
    const ossResult = await resolveDocumentPdfAttachment(ossDoc, dummyCtx);

    expect(bsdResult).toBeNull();
    expect(ossResult).toBeNull();
  });

  it('Section VII must never match Section VI files', async () => {
    const ctxWithSec6: DocResolveContext = {
      ...dummyCtx,
      vaultDocs: [
        {
          id: 'vault-sec-6',
          documentCode: 'SEC-VI',
          documentName: 'Section VI: Schedule of Requirements',
          fileDataUrl: 'data:application/pdf;base64,JVBERi0xLjQK'
        } as any
      ]
    };

    const sec7Doc = { id: 'TECH_SPECS_SECTION_VII', documentName: 'Section VII: Technical Specifications Statement of Compliance' };
    const resolved = await resolveDocumentPdfAttachment(sec7Doc, ctxWithSec6);

    // Should NOT return the SEC-VI attachment
    expect(resolved).not.toBe('data:application/pdf;base64,JVBERi0xLjQK');
  });

  it('PCAB License must never match DOC-6 (BIR Certificate of Registration)', async () => {
    const ctxWithBirCor: DocResolveContext = {
      ...dummyCtx,
      vaultDocs: [
        {
          id: 'vault-doc-6',
          documentCode: 'DOC-6',
          documentName: 'BIR Form 2303 Certificate of Registration',
          fileDataUrl: 'data:application/pdf;base64,JVBERi0xLjQK'
        } as any
      ]
    };

    const pcabDoc = { id: 'PCAB_LICENSE', documentName: 'PCAB License and Special License (for Infrastructure)', code: 'PCAB_LICENSE' };
    const resolved = await resolveDocumentPdfAttachment(pcabDoc, ctxWithBirCor);

    // Should NOT match the DOC-6 BIR COR file
    expect(resolved).not.toBe('data:application/pdf;base64,JVBERi0xLjQK');
  });

  it('Organizational Chart must not match Key Personnel files', async () => {
    const ctxWithPersonnel: DocResolveContext = {
      ...dummyCtx,
      vaultDocs: [
        {
          id: 'vault-fc-2025',
          documentCode: 'FC-2025',
          documentName: 'Project Requirements — Key Personnel, Equipment & Organizational Chart',
          fileDataUrl: 'data:application/pdf;base64,JVBERi0xLjQK'
        } as any
      ]
    };

    const orgChartDoc = { id: 'ORGANIZATIONAL_CHART', documentName: 'Organizational Chart for the Contract to be Bid', code: 'ORGANIZATIONAL_CHART' };
    const resolved = await resolveDocumentPdfAttachment(orgChartDoc, ctxWithPersonnel);

    // Should NOT match Key Personnel file
    expect(resolved).not.toBe('data:application/pdf;base64,JVBERi0xLjQK');
  });

  it('QR payload must format exact 4 lines: Company Name, Project Title, Date of Submission, Document Name', () => {
    const payload = formatQrCodePayload({
      companyName: 'Quantum Cloud Corporation',
      projectTitle: 'Smart Harbor Construction',
      submissionDate: 'September 30, 2026',
      documentName: 'Bill of Quantities'
    });

    const expected = `Company Name: Quantum Cloud Corporation\nProject Title: Smart Harbor Construction\nDate of Submission: September 30, 2026\nDocument Name: Bill of Quantities`;
    expect(payload).toBe(expected);
  });

  it('PDF engine successfully compiles packages for ORIGINAL, COPY_1, and COPY_2 with straight rubber stamp and white backing pill pagination', async () => {
    const testDoc = await PDFDocument.create();
    testDoc.addPage([612, 936]);
    const testBytes = await testDoc.save();

    for (const copy of ['ORIGINAL', 'COPY_1', 'COPY_2'] as const) {
      const mergedBytes = await buildMergedThreeLayerPdfBytes(
        [
          {
            title: 'Test Doc',
            fileSource: testBytes
          }
        ],
        `PRJ-2026_${copy}_PACKAGE.pdf`,
        undefined,
        {
          folderCopy: copy,
          submissionDate: 'August 30, 2026',
          signatoryName: 'Engr. Juan Dela Cruz',
          projectRefNo: 'PhilGEPS-13200679'
        }
      );

      expect(mergedBytes).toBeDefined();
      expect(mergedBytes.length).toBeGreaterThan(0);
      const loaded = await PDFDocument.load(mergedBytes);
      expect(loaded.getPageCount()).toBe(1);
    }
  });
});

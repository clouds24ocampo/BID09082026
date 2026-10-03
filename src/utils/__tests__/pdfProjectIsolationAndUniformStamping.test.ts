import { describe, it, expect, beforeEach } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildMergedThreeLayerPdfBytes, ExportDocumentUnit } from '../pdfExportEngine';
import { resolveDocumentPdfAttachment, DocResolveContext } from '../systemDocumentPdfGenerator';
import { DocumentVaultItem, Tenant } from '../../types';

describe('PDF Project Isolation & Uniform Rubber Stamping Verification', () => {
  const storageMap: Record<string, string> = {};
  const mockStorage = {
    getItem: (k: string) => storageMap[k] || null,
    setItem: (k: string, v: string) => { storageMap[k] = v; },
    removeItem: (k: string) => { delete storageMap[k]; },
    clear: () => { Object.keys(storageMap).forEach(k => delete storageMap[k]); }
  };

  beforeEach(() => {
    (globalThis as any).localStorage = mockStorage;
    mockStorage.clear();
  });

  const tenant: Tenant = {
    id: 'tenant-iso-test',
    companyName: 'Apex Infrastructure Technologies Corp.',
    brandCode: 'AIT',
    brandColor: '#003366',
    tin: '111-222-333-000',
    secDtiRegNo: 'CS202400192',
    philgepsPlatinumNo: '202401-998877-1234567890',
    address: 'Makati City, Metro Manila',
    preferredRegime: 'RA_12009_NGPA',
    primaryProcurementType: 'INFRASTRUCTURE',
    createdAt: new Date().toISOString(),
    authorizedSignatory: {
      name: 'Engr. Roberto D. Alcantara',
      title: 'Managing Officer',
      tin: '987-654-321-000'
    }
  };

  describe('1. Uniform Rubber Stamp Sizing & Proper Positioning Across Orientations', () => {
    it('should generate valid PDFs with stamps on Portrait (612x936) and Landscape (936x612) without crashing', async () => {
      // Create portrait and landscape pages
      const portraitDoc = await PDFDocument.create();
      portraitDoc.addPage([612, 936]);
      const portraitBytes = await portraitDoc.save();

      const landscapeDoc = await PDFDocument.create();
      landscapeDoc.addPage([936, 612]);
      const landscapeBytes = await landscapeDoc.save();

      const units: ExportDocumentUnit[] = [
        {
          title: 'Portrait Document',
          documentName: 'Technical Specifications (Portrait)',
          fileSource: portraitBytes
        },
        {
          title: 'Landscape Document',
          documentName: 'Bill of Quantities (Landscape)',
          fileSource: landscapeBytes
        }
      ];

      const pdfBytes = await buildMergedThreeLayerPdfBytes(units, 'UNIFORM_STAMP_TEST.pdf', undefined, {
        folderCopy: 'COPY_1',
        submissionDate: '2026-10-15',
        companyName: tenant.companyName,
        signatoryName: tenant.authorizedSignatory.name,
        projectRefNo: 'PHILGEPS-2026-STAMP-TEST',
        projectTitle: 'Substation Upgrade'
      });

      expect(pdfBytes).toBeDefined();
      const resultDoc = await PDFDocument.load(pdfBytes);
      expect(resultDoc.getPageCount()).toBe(2);

      const pages = resultDoc.getPages();
      expect(pages[0].getWidth()).toBe(612);
      expect(pages[0].getHeight()).toBe(936);
      expect(pages[1].getWidth()).toBe(936);
      expect(pages[1].getHeight()).toBe(612);
    });

    it('should cleanly stamp pages with non-zero rotations (90, 180, 270 degrees)', async () => {
      const rotDoc = await PDFDocument.create();
      const p90 = rotDoc.addPage([612, 936]);
      p90.setRotation({ type: 'degrees', angle: 90 } as any);
      const p180 = rotDoc.addPage([612, 936]);
      p180.setRotation({ type: 'degrees', angle: 180 } as any);
      const p270 = rotDoc.addPage([612, 936]);
      p270.setRotation({ type: 'degrees', angle: 270 } as any);
      const rotBytes = await rotDoc.save();

      const units: ExportDocumentUnit[] = [
        {
          title: 'Rotated Pages Document',
          documentName: 'Rotated Scanned Attachments',
          fileSource: rotBytes
        }
      ];

      const pdfBytes = await buildMergedThreeLayerPdfBytes(units, 'ROTATED_STAMP_TEST.pdf', undefined, {
        folderCopy: 'COPY_2',
        submissionDate: '2026-10-15',
        companyName: tenant.companyName,
        signatoryName: tenant.authorizedSignatory.name,
        projectRefNo: 'PHILGEPS-2026-ROT-TEST',
        projectTitle: 'Substation Upgrade'
      });

      expect(pdfBytes).toBeDefined();
      const resultDoc = await PDFDocument.load(pdfBytes);
      expect(resultDoc.getPageCount()).toBe(3);
    });
  });

  describe('2. Strict Multi-Project Data & PDF Isolation', () => {
    const projectA_Ref = 'PHILGEPS-2026-0001-ALPHA';
    const projectB_Ref = 'PHILGEPS-2026-0002-BETA';

    const dummyPdfProjectA_BOQ = 'data:application/pdf;base64,JVBERi0xLjQKJVRISVMgSVMgUFJPSkVDVCBBIEJPUT8=';
    const dummyPdfCorporatePhilgeps = 'data:application/pdf;base64,JVBERi0xLjQKJVRISVMgSVMgQ09SUE9SQVRFIFBISUxHRVBT...';

    const vaultDocs: DocumentVaultItem[] = [
      {
        id: 'vault-corp-philgeps',
        tenantId: tenant.id,
        documentName: 'PhilGEPS Platinum Certificate',
        documentCode: 'DOC-1',
        documentNumber: '202401-998877-1234567890',
        category: 'ELIGIBILITY_CLASS_A',
        procurementApplicability: ['INFRASTRUCTURE'],
        legalBasisReference: 'RA 9184',
        versionNumber: 1,
        fileHash: 'h-corp',
        fileSizeBytes: 1024,
        fileName: 'philgeps.pdf',
        uploadedByName: 'Roberto',
        isOptional: false,
        requiresIssueDate: true,
        requiresExpiryDate: true,
        status: 'ACTIVE',
        previousVersions: [],
        fileDataUrl: dummyPdfCorporatePhilgeps
      },
      {
        id: 'vault-projectA-boq',
        tenantId: tenant.id,
        documentName: 'Bill of Quantities for Project Alpha',
        documentCode: 'BOQ',
        documentNumber: projectA_Ref,
        philgepsRefNo: projectA_Ref,
        projectId: 'proj-alpha-id',
        projectTitle: 'Project Alpha Transmission Line',
        category: 'FINANCIAL',
        procurementApplicability: ['INFRASTRUCTURE'],
        legalBasisReference: 'BAC Form BOQ',
        versionNumber: 1,
        fileHash: 'h-boq-a',
        fileSizeBytes: 2048,
        fileName: 'boq_alpha.pdf',
        uploadedByName: 'Roberto',
        isOptional: false,
        requiresIssueDate: false,
        requiresExpiryDate: false,
        status: 'ACTIVE',
        previousVersions: [],
        fileDataUrl: dummyPdfProjectA_BOQ
      }
    ];

    it('should NEVER leak Project A BOQ into Project B, even if doc.vaultDocId references Project A item', async () => {
      const ctxProjectB: DocResolveContext = {
        tenant,
        tenantId: tenant.id,
        activeProject: { id: 'proj-beta-id', title: 'Project Beta Substation', refNo: projectB_Ref },
        projectRefNo: projectB_Ref,
        projectTitle: 'Project Beta Substation',
        procuringEntity: 'National Grid Corporation of the Philippines',
        vaultDocs
      };

      const boqDocInProjectB = {
        id: 'BILL_OF_QUANTITIES',
        documentName: 'Bill of Quantities',
        documentCode: 'BOQ',
        code: 'BOQ',
        // Stale or cross-project vaultDocId pointing to Project A's BOQ
        vaultDocId: 'vault-projectA-boq'
      };

      const resolved = await resolveDocumentPdfAttachment(boqDocInProjectB, ctxProjectB);
      // Must NOT return Project A's BOQ
      expect(resolved).not.toBe(dummyPdfProjectA_BOQ);
      // Must generate Project B's clean isolated BOQ
      expect(resolved).toBeTruthy();
      expect(resolved?.startsWith('data:application/pdf;base64,')).toBe(true);
    });

    it('should NEVER load un-scoped generic cleanDocId from IndexedDB for technical or financial documents', async () => {
      const ctxProjectB: DocResolveContext = {
        tenant,
        tenantId: tenant.id,
        activeProject: { id: 'proj-beta-id', title: 'Project Beta Substation', refNo: projectB_Ref },
        projectRefNo: projectB_Ref,
        projectTitle: 'Project Beta Substation',
        procuringEntity: 'National Grid Corporation of the Philippines',
        vaultDocs: []
      };

      const { savePdfData } = await import('../vaultIndexedDB');
      // Suppose an un-scoped generic key was written
      await savePdfData('SLCC_STATEMENT', 'data:application/pdf;base64,UNSCOPED_GENERIC_SLCC...');
      await savePdfData('slcc_statement', 'data:application/pdf;base64,UNSCOPED_GENERIC_SLCC...');

      const slccDoc = {
        id: 'SLCC_STATEMENT',
        documentName: 'Statement of Single Largest Completed Contract (SLCC)',
        documentCode: 'SLCC',
        code: 'SLCC'
      };

      const resolved = await resolveDocumentPdfAttachment(slccDoc, ctxProjectB);
      // Must NOT return the un-scoped generic SLCC
      expect(resolved).not.toBe('data:application/pdf;base64,UNSCOPED_GENERIC_SLCC...');
      // Must generate Project B's official statutory SLCC
      expect(resolved?.startsWith('data:application/pdf;base64,')).toBe(true);
    });

    it('should correctly allow corporate Class A documents (e.g. PhilGEPS Platinum) to be shared across projects', async () => {
      const ctxProjectB: DocResolveContext = {
        tenant,
        tenantId: tenant.id,
        activeProject: { id: 'proj-beta-id', title: 'Project Beta Substation', refNo: projectB_Ref },
        projectRefNo: projectB_Ref,
        projectTitle: 'Project Beta Substation',
        procuringEntity: 'National Grid Corporation of the Philippines',
        vaultDocs
      };

      const philgepsDoc = {
        id: 'PHILGEPS_PLATINUM',
        documentName: 'PhilGEPS Platinum Certificate of Registration (Annex A)',
        documentCode: 'DOC-1',
        code: 'DOC-1'
      };

      const resolved = await resolveDocumentPdfAttachment(philgepsDoc, ctxProjectB);
      // Corporate document is company-wide and should match
      expect(resolved).toBe(dummyPdfCorporatePhilgeps);
    });
  });
});

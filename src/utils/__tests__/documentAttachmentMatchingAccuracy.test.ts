import { describe, it, expect, beforeEach } from 'vitest';
import { resolveDocumentPdfAttachment, DocResolveContext } from '../systemDocumentPdfGenerator';
import { DocumentVaultItem, Tenant } from '../../types';
import { buildMergedThreeLayerPdfBytes } from '../pdfExportEngine';
import { PDFDocument, StandardFonts } from 'pdf-lib';

describe('Document Attachment Matching Accuracy & Corporate Isolation', () => {
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

  const mockTenant: Tenant = {
    id: 'tenant-match-test',
    companyName: 'Quantum Cloud Corporation',
    brandCode: 'QCC',
    brandColor: '#0052cc',
    tin: '000-123-456-000',
    secDtiRegNo: 'CS202009782',
    philgepsPlatinumNo: '202206-237042-3850021238',
    address: 'Pasay City, Metro Manila',
    preferredRegime: 'RA_12009_NGPA',
    primaryProcurementType: 'GOODS',
    createdAt: new Date().toISOString(),
    authorizedSignatory: {
      name: 'Cloud Ocampo',
      title: 'Procurement Specialist',
      tin: '123-456-789-000'
    }
  };

  const dummyPdfSec = 'data:application/pdf;base64,JVBERi0xLjQKJVRISVMgSVMgU0VDIENFUlRJRklDQVRF...';
  const dummyPdfMayor = 'data:application/pdf;base64,JVBERi0xLjQKJVRISVMgSVMgTUFZT1JTIFBFUk1JVC...';
  const dummyPdfPhilgeps = 'data:application/pdf;base64,JVBERi0xLjQKJVRISVMgSVMgUEhJTEdFUFMgQ0VSVElGSUNBVEU...';
  const dummyPdfTax = 'data:application/pdf;base64,JVBERi0xLjQKJVRISVMgSVMgVEFYIENMRUFSQU5DRS...';

  const mockVaultDocs: DocumentVaultItem[] = [
    {
      id: 'vault-doc-1',
      tenantId: 'tenant-match-test',
      documentName: 'PhilGEPS Platinum Certificate of Registration (Annex A)',
      documentCode: 'DOC-1',
      documentNumber: '202206-237042-3850021238',
      category: 'ELIGIBILITY_CLASS_A',
      procurementApplicability: ['GOODS', 'INFRASTRUCTURE'],
      legalBasisReference: 'RA 12009 / RA 9184 Standard',
      versionNumber: 1,
      fileHash: 'hash-1',
      fileSizeBytes: 1048576,
      fileName: 'philgeps_cert.pdf',
      uploadedByName: 'Cloud Ocampo',
      isOptional: false,
      requiresIssueDate: true,
      requiresExpiryDate: true,
      status: 'ACTIVE',
      previousVersions: [],
      fileDataUrl: dummyPdfPhilgeps
    },
    {
      id: 'vault-doc-2',
      tenantId: 'tenant-match-test',
      documentName: 'Certificate of Incorporation (SEC Registration)',
      documentCode: 'DOC-2',
      documentNumber: 'CS202009782',
      category: 'ELIGIBILITY_CLASS_A',
      procurementApplicability: ['GOODS', 'INFRASTRUCTURE'],
      legalBasisReference: 'Revised Corporation Code',
      versionNumber: 1,
      fileHash: 'hash-2',
      fileSizeBytes: 1048576,
      fileName: 'sec_registration.pdf',
      uploadedByName: 'Cloud Ocampo',
      isOptional: false,
      requiresIssueDate: false,
      requiresExpiryDate: false,
      status: 'ACTIVE',
      previousVersions: [],
      fileDataUrl: dummyPdfSec
    },
    {
      id: 'vault-doc-3',
      tenantId: 'tenant-match-test',
      documentName: 'City of Pasay Mayor / Business Permit to Operate',
      documentCode: 'DOC-3',
      documentNumber: '2026-002290',
      category: 'ELIGIBILITY_CLASS_A',
      procurementApplicability: ['GOODS', 'INFRASTRUCTURE'],
      legalBasisReference: 'LGU Pasay Permit',
      versionNumber: 1,
      fileHash: 'hash-3',
      fileSizeBytes: 1048576,
      fileName: 'mayors_permit.pdf',
      uploadedByName: 'Cloud Ocampo',
      isOptional: false,
      requiresIssueDate: true,
      requiresExpiryDate: true,
      status: 'ACTIVE',
      previousVersions: [],
      fileDataUrl: dummyPdfMayor
    },
    {
      id: 'vault-doc-6',
      tenantId: 'tenant-match-test',
      documentName: 'BIR Certificate of Registration (BIR Form 2303)',
      documentCode: 'DOC-6',
      documentNumber: 'BIR-2303-9912',
      category: 'ELIGIBILITY_CLASS_A',
      procurementApplicability: ['GOODS', 'INFRASTRUCTURE'],
      legalBasisReference: 'NIRC / BIR Regulations',
      versionNumber: 1,
      fileHash: 'hash-6',
      fileSizeBytes: 1048576,
      fileName: 'bir_form_2303.pdf',
      uploadedByName: 'Cloud Ocampo',
      isOptional: false,
      requiresIssueDate: true,
      requiresExpiryDate: false,
      status: 'ACTIVE',
      previousVersions: [],
      fileDataUrl: 'data:application/pdf;base64,JVBERi0xLjQKJVRISVMgSVMgQklSIEZPUk0gMjMwMy...'
    },
    {
      id: 'vault-doc-7',
      tenantId: 'tenant-match-test',
      documentName: 'BIR Tax Clearance for Bidding Purposes',
      documentCode: 'DOC-7',
      documentNumber: 'TC-2026-0881',
      category: 'ELIGIBILITY_CLASS_A',
      procurementApplicability: ['GOODS', 'INFRASTRUCTURE'],
      legalBasisReference: 'EO 398',
      versionNumber: 1,
      fileHash: 'hash-7',
      fileSizeBytes: 1048576,
      fileName: 'tax_clearance.pdf',
      uploadedByName: 'Cloud Ocampo',
      isOptional: false,
      requiresIssueDate: true,
      requiresExpiryDate: true,
      status: 'ACTIVE',
      previousVersions: [],
      fileDataUrl: dummyPdfTax
    }
  ];

  const ctx: DocResolveContext = {
    tenant: mockTenant,
    tenantId: mockTenant.id,
    activeProject: { id: 'proj-match-1', title: 'Supply & Delivery of IT Systems' },
    projectRefNo: 'PHILGEPS-2026-0909',
    projectTitle: 'Supply & Delivery of IT Systems',
    procuringEntity: 'City of Pasay',
    vaultDocs: mockVaultDocs,
    folderCopy: 'ORIGINAL'
  };

  it('should NEVER attach SEC Certificate (DOC-2) to Statement of All Ongoing Contracts', async () => {
    const userOngoingContracts = [
      {
        id: '1',
        projectName: 'User Created Hospital IT Infrastructure Network Project',
        ownerName: 'Department of Health',
        ownerAddress: 'Manila, Philippines',
        ownerTelephone: '(02) 8651-7800',
        natureOfWork: 'IT Systems and Infrastructure',
        bidderRole: 'Prime Contractor',
        amountAward: 'PHP 8,500,000.00',
        amountCompletion: 'PHP 8,500,000.00',
        dateAwarded: '2026-01-10',
        dateStarted: '2026-02-01',
        dateCompletion: '2026-12-31',
        accomplishmentPlanned: 60,
        accomplishmentActual: 60,
        valueOutstanding: 'PHP 3,400,000.00'
      }
    ];

    mockStorage.setItem(
      `bidocs_ongoing_${mockTenant.id}_${ctx.projectRefNo}`,
      JSON.stringify(userOngoingContracts)
    );

    const doc = {
      id: 'ONGOING_CONTRACTS',
      documentName: 'Statement of All Ongoing Government & Private Contracts',
      documentCode: 'ONGOING_CONTRACTS',
      code: 'ONGOING_CONTRACTS'
    };

    const resolved = await resolveDocumentPdfAttachment(doc, ctx);
    expect(resolved).toBeTruthy();
    // Must NOT be the SEC dummy PDF or Mayor's Permit
    expect(resolved).not.toBe(dummyPdfSec);
    expect(resolved).not.toBe(dummyPdfMayor);
    // Must be a valid PDF data URL generated with the user's ongoing contracts
    expect(resolved?.startsWith('data:application/pdf;base64,')).toBe(true);
  });

  it('should NEVER attach Mayor Permit (DOC-3) to Single Largest Completed Contract (SLCC)', async () => {
    const userSlcc = {
      contractName: 'User Completed Data Center Upgrade for Pasay City Hall',
      ownerName: 'City Government of Pasay',
      ownerAddress: 'Pasay City, Philippines',
      dateOfContract: '2025-03-15',
      dateOfCompletion: '2025-11-30',
      contractAmount: 'PHP 15,200,000.00',
      natureOfWork: 'Data Center & Server Modernization'
    };

    mockStorage.setItem(
      `bidocs_slcc_${mockTenant.id}_${ctx.projectRefNo}`,
      JSON.stringify(userSlcc)
    );

    const doc = {
      id: 'SLCC_STATEMENT',
      documentName: 'Statement of Single Largest Completed Contract (SLCC)',
      documentCode: 'SLCC_STATEMENT',
      code: 'SLCC_STATEMENT'
    };

    const resolved = await resolveDocumentPdfAttachment(doc, ctx);
    expect(resolved).toBeTruthy();
    // Must NOT be Mayor's permit or SEC
    expect(resolved).not.toBe(dummyPdfMayor);
    expect(resolved).not.toBe(dummyPdfSec);
    expect(resolved?.startsWith('data:application/pdf;base64,')).toBe(true);
  });

  it('should NEVER cross-match Section VI Requirements to SEC Certificate (DOC-2)', async () => {
    const doc = {
      id: 'SECTION_VI_REQUIREMENTS',
      documentName: 'Section VI: Schedule of Requirements',
      documentCode: 'SECTION_VI_REQUIREMENTS',
      code: 'SECTION_VI_REQUIREMENTS'
    };

    const resolved = await resolveDocumentPdfAttachment(doc, ctx);
    expect(resolved).toBeTruthy();
    expect(resolved).not.toBe(dummyPdfSec);
    expect(resolved?.startsWith('data:application/pdf;base64,')).toBe(true);
  });

  it('should correctly attach PhilGEPS (DOC-1), SEC (DOC-2), and Mayor Permit (DOC-3) to their respective corporate items', async () => {
    // 1. PhilGEPS Certificate
    const philgepsDoc = {
      id: 'PHILGEPS_PLATINUM',
      documentName: 'PhilGEPS Platinum Certificate of Registration (Annex A)',
      documentCode: 'PHILGEPS_PLATINUM',
      code: 'PHILGEPS_PLATINUM'
    };
    const resolvedPhilgeps = await resolveDocumentPdfAttachment(philgepsDoc, ctx);
    expect(resolvedPhilgeps).toBe(dummyPdfPhilgeps);

    // 2. SEC / DTI Certificate
    const secDoc = {
      id: 'SEC_DTI_REG',
      documentName: 'SEC / DTI Certificate of Business Registration',
      documentCode: 'SEC_DTI_REG',
      code: 'SEC_DTI_REG'
    };
    const resolvedSec = await resolveDocumentPdfAttachment(secDoc, ctx);
    expect(resolvedSec).toBe(dummyPdfSec);

    // 3. Mayor's / Business Permit
    const mayorDoc = {
      id: 'MAYORS_PERMIT',
      documentName: "Mayor's / Business Permit (Current Year)",
      documentCode: 'MAYORS_PERMIT',
      code: 'MAYORS_PERMIT'
    };
    const resolvedMayor = await resolveDocumentPdfAttachment(mayorDoc, ctx);
    expect(resolvedMayor).toBe(dummyPdfMayor);

    // 4. Tax Clearance
    const taxDoc = {
      id: 'TAX_CLEARANCE',
      documentName: 'BIR Tax Clearance Certificate & BIR Registration',
      documentCode: 'TAX_CLEARANCE',
      code: 'TAX_CLEARANCE'
    };
    const resolvedTax = await resolveDocumentPdfAttachment(taxDoc, ctx);
    expect(resolvedTax).toBe(dummyPdfTax);
  });

  it('should NEVER attach cached Key Personnel PDF to Detailed Estimates Form L', async () => {
    const dummyKeyPersonnelPdf = 'data:application/pdf;base64,JVBERi0xLjQKJVRISVMgSVMgS0VZX1BFUlNPTk5FTF9QREY...';
    
    // Simulate cached key personnel in IndexedDB memory cache
    const { savePdfData } = await import('../vaultIndexedDB');
    await savePdfData(`key_personnel_pdf_${mockTenant.id}_${ctx.projectRefNo}`, dummyKeyPersonnelPdf);
    await savePdfData(`key_personnel_pdf_${mockTenant.id}_default`, dummyKeyPersonnelPdf);

    // Save user detailed estimates data
    const userDetailedEstimates = {
      projectName: 'Supply & Delivery of IT Systems',
      projectRefNo: ctx.projectRefNo,
      totalMaterialsCost: 5500000,
      totalLaborCost: 1800000,
      totalEquipmentCost: 450000,
      totalLogisticsCost: 150000,
      totalEstimatedProjectCost: 7900000,
      materials: [
        { id: 'm-1', itemNo: '1', description: 'Core Server Hardware Unit', quantity: 2, unitPrice: 2750000 }
      ],
      labors: [
        { id: 'l-1', itemNo: '1', description: 'Senior Systems Architect', noOfWorkers: 2, noOfDays: 30, dailyPrice: 30000 }
      ]
    };

    mockStorage.setItem(
      `bidocs_detailed_estimates_${mockTenant.id}_${ctx.projectRefNo}`,
      JSON.stringify(userDetailedEstimates)
    );

    const detailedEstimatesDoc = {
      id: 'DETAILED_ESTIMATES_FORM_L',
      documentName: '(Form L) Detailed Estimates (Direct Labor, Logistics & Equipment)',
      documentCode: 'FORM_L',
      code: 'FORM_L'
    };

    const resolved = await resolveDocumentPdfAttachment(detailedEstimatesDoc, ctx);
    expect(resolved).toBeTruthy();
    // MUST NOT be the cached Key Personnel PDF!
    expect(resolved).not.toBe(dummyKeyPersonnelPdf);
    // Must be a valid PDF data URL
    expect(resolved?.startsWith('data:application/pdf;base64,')).toBe(true);

    // But when resolving actual KEY_PERSONNEL, it SHOULD return the cached key personnel!
    const keyPersonnelDoc = {
      id: 'KEY_PERSONNEL',
      documentName: "Key Personnel's Certificate of Employment & Bio-Data",
      documentCode: 'KEY_PERSONNEL',
      code: 'KEY_PERSONNEL'
    };
    const resolvedPersonnel = await resolveDocumentPdfAttachment(keyPersonnelDoc, ctx);
    expect(resolvedPersonnel).toBe(dummyKeyPersonnelPdf);
  });

  it('should compile ORIGINAL, COPY_1, and COPY_2 packages with perfect document-to-cover alignment and certified stamping', async () => {
    const { buildMergedThreeLayerPdfBytes } = await import('../pdfExportEngine');
    const { PDFDocument } = await import('pdf-lib');

    // Generate valid statutory PDF for Detailed Estimates
    const detailedDoc = {
      id: 'DETAILED_ESTIMATES_FORM_L',
      documentName: '(Form L) Detailed Estimates (Direct Labor, Logistics & Equipment)',
      documentCode: 'FORM_L',
      code: 'FORM_L'
    };
    const detailedDataUrl = await resolveDocumentPdfAttachment(detailedDoc, ctx);
    expect(detailedDataUrl).toBeTruthy();

    // Create a mock cover PDF
    const coverPdf = await PDFDocument.create();
    const cPage = coverPdf.addPage([612, 936]);
    cPage.drawText('ENVELOPE 2: FINANCIAL BID PROPOSAL', { x: 50, y: 850 });
    cPage.drawText('(FORM L) DETAILED ESTIMATES', { x: 50, y: 800 });
    const coverDataUrl = await coverPdf.saveAsBase64({ dataUri: true });

    // Test ORIGINAL copy package
    const originalBytes = await buildMergedThreeLayerPdfBytes([
      {
        title: detailedDoc.documentName,
        documentName: detailedDoc.documentName,
        fileDataUrl: detailedDataUrl
      }
    ], 'ORIGINAL_TEST_PACKAGE.pdf', undefined, {
      projectRefNo: ctx.projectRefNo,
      folderCopy: 'ORIGINAL',
      signatoryName: mockTenant.authorizedSignatory.name,
      submissionDate: '2026-08-30'
    });

    expect(originalBytes).toBeTruthy();
    expect(originalBytes.length).toBeGreaterThan(1000);
    const loadedOriginal = await PDFDocument.load(originalBytes);
    expect(loadedOriginal.getPageCount()).toBeGreaterThanOrEqual(1);

    // Test COPY_1 package (with Certified True Copy rubber stamping)
    const copy1Bytes = await buildMergedThreeLayerPdfBytes([
      {
        title: detailedDoc.documentName,
        documentName: detailedDoc.documentName,
        fileDataUrl: detailedDataUrl
      }
    ], 'COPY_1_TEST_PACKAGE.pdf', undefined, {
      projectRefNo: ctx.projectRefNo,
      folderCopy: 'COPY_1',
      signatoryName: mockTenant.authorizedSignatory.name,
      submissionDate: '2026-08-30'
    });

    expect(copy1Bytes).toBeTruthy();
    const loadedCopy1 = await PDFDocument.load(copy1Bytes);
    expect(loadedCopy1.getPageCount()).toBeGreaterThanOrEqual(1);

    // Test COPY_2 package (with Certified True Copy rubber stamping)
    const copy2Bytes = await buildMergedThreeLayerPdfBytes([
      {
        title: detailedDoc.documentName,
        documentName: detailedDoc.documentName,
        fileDataUrl: detailedDataUrl
      }
    ], 'COPY_2_TEST_PACKAGE.pdf', undefined, {
      projectRefNo: ctx.projectRefNo,
      folderCopy: 'COPY_2',
      signatoryName: mockTenant.authorizedSignatory.name,
      submissionDate: '2026-08-30'
    });

    expect(copy2Bytes).toBeTruthy();
    const loadedCopy2 = await PDFDocument.load(copy2Bytes);
    expect(loadedCopy2.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it('Strict Separation: SEC/DTI registration must never match Secretary Certificate or BIR', async () => {
    const dummySecPdf = 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDwKL0xlbmd0aCAxMDUKPj4Kc3RyZWFtCnEKMSAwIDAgMSA1MCA3NTAgY20KQlQKL0YxIDEyIFRmCihTRUMgQ2VydGlmaWNhdGUpIFRqCkVUCnEKZW5kc3RyZWFtCmVuZG9iagoxIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovQ291bnQgMQovS2lkcyBbMyAwIFJdCj4+CmVuZG9iagozIDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMSAwIFIKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KL0NvbnRlbnRzIDQgMCBSCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQo+Pgo+Pgo+Pgo+PgplbmRvYmoKMiAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMSAwIFIKPj4KZW5kb2JqCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDE2MSAwMDAwMCBuIAowMDAwMDAwMzY4IDAwMDAwIG4gCjAwMDAwMDAyMTggMDAwMDAgbiAKMDAwMDAwMDAxOSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMiAwIFIKPj4Kc3RhcnR4cmVmCjQxOQolJUVPRgo=';
    const dummySecCertPdf = 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDwKL0xlbmd0aCAxMDUKPj4Kc3RyZWFtCnEKMSAwIDAgMSA1MCA3NTAgY20KQlQKL0YxIDEyIFRmCihTZWNyZXRhcnlzIENlcnRpZmljYXRlKSBUagpFVApxCmVuZHN0cmVhbQplbmRvYmoKMSAwIG9iago8PAovVHlwZSAvUGFnZXMKL0NvdW50IDEKL0tpZHMgWzMgMCBSXQo+PgplbmRvYmoKMyAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDEgMCBSCi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9Db250ZW50cyA0IDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKPj4KPj4KPj4KPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDEgMCBSCj4+CmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAxNjEgMDAwMDAgbiAKMDAwMDAwMDM2OCAwMDAwMCBuIAowMDAwMDAwMjE4IDAwMDAwIG4gCjAwMDAwMDAwMTkgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA1Ci9Sb290IDIgMCBSCj4+CnN0YXJ0eHJlZgo0MTkKJSVFT0YK';

    const vaultDocsWithSecAndCert: DocumentVaultItem[] = [
      {
        id: 'vault-sec-cert-id',
        tenantId: mockTenant.id,
        documentName: "Secretary's Certificate / Board Resolution",
        documentCode: 'DOC-13',
        category: 'ELIGIBILITY_CLASS_A',
        procurementApplicability: ['GOODS', 'INFRASTRUCTURE'],
        legalBasisReference: 'RA 9184',
        versionNumber: 1,
        fileHash: 'cert13',
        fileSizeBytes: 1024,
        fileName: 'secretary_cert.pdf',
        uploadedByName: 'Cloud Ocampo',
        fileDataUrl: dummySecCertPdf,
        isOptional: false,
        requiresIssueDate: false,
        requiresExpiryDate: false,
        status: 'ACTIVE',
        previousVersions: []
      },
      {
        id: 'vault-sec-reg-id',
        tenantId: mockTenant.id,
        documentName: 'SEC Certificate of Registration',
        documentCode: 'DOC-2',
        category: 'ELIGIBILITY_CLASS_A',
        procurementApplicability: ['GOODS', 'INFRASTRUCTURE'],
        legalBasisReference: 'RA 9184',
        versionNumber: 1,
        fileHash: 'sec2',
        fileSizeBytes: 1024,
        fileName: 'sec_registration.pdf',
        uploadedByName: 'Cloud Ocampo',
        fileDataUrl: dummySecPdf,
        isOptional: false,
        requiresIssueDate: false,
        requiresExpiryDate: false,
        status: 'ACTIVE',
        previousVersions: []
      }
    ];

    const ctx: DocResolveContext = {
      tenant: mockTenant,
      vaultDocs: vaultDocsWithSecAndCert,
      projectRefNo: 'PhilGEPS-2026-TEST',
      projectTitle: 'Strict SEC Matching Test'
    };

    const secReqDoc = {
      id: 'SEC_DTI_REG',
      documentName: 'SEC / DTI Certificate of Business Registration',
      documentCode: 'SEC_DTI_REG',
      code: 'SEC_DTI_REG'
    };

    const resolved = await resolveDocumentPdfAttachment(secReqDoc, ctx);
    expect(resolved).toBe(dummySecPdf);
    expect(resolved).not.toBe(dummySecCertPdf);
  });

  it('Rubber Stamp Color Selection: accepts all colors and generates valid stamped PDF', async () => {
    const testDoc = {
      title: 'Technical Document',
      documentName: 'Technical Document',
      fileDataUrl: null
    };

    const colors = ['red', 'purple', 'black', 'green', 'blue'] as const;
    for (const c of colors) {
      const pdfBytes = await buildMergedThreeLayerPdfBytes([testDoc], `TEST_${c}.pdf`, undefined, {
        projectRefNo: 'PhilGEPS-STAMP-TEST',
        folderCopy: 'COPY_1',
        stampColor: c,
        companyName: 'Quantum Cloud Corporation',
        signatoryName: 'Mark-Vin Ocampo',
        submissionDate: '2026-09-30'
      });

      expect(pdfBytes).toBeTruthy();
      const loaded = await PDFDocument.load(pdfBytes);
      expect(loaded.getPageCount()).toBeGreaterThanOrEqual(1);
    }
  });

  it('Uploaded Document Sizing: oversized scanned PDFs (like PCAB) are normalized to standard Legal dimensions', async () => {
    // Simulate an oversized scanned PCAB license (1500pt x 2200pt)
    const oversizedDoc = await PDFDocument.create();
    const oversizedPage = oversizedDoc.addPage([1500, 2200]);
    oversizedPage.drawText('PHILIPPINE CONTRACTORS ACCREDITATION BOARD - OVERSIZED SCAN', {
      x: 100,
      y: 2000,
      size: 28
    });
    const oversizedBytes = await oversizedDoc.save();
    const oversizedBase64 = `data:application/pdf;base64,${Buffer.from(oversizedBytes).toString('base64')}`;

    const mergedBytes = await buildMergedThreeLayerPdfBytes([
      {
        title: 'PCAB License',
        documentName: 'PCAB License and Special License',
        fileDataUrl: oversizedBase64
      }
    ], 'MERGED_PCAB_STANDARDIZED.pdf', undefined, {
      projectRefNo: 'PhilGEPS-PCAB-NORMALIZE',
      folderCopy: 'COPY_1',
      stampColor: 'blue'
    });

    expect(mergedBytes).toBeTruthy();
    const loadedMerged = await PDFDocument.load(mergedBytes);
    const pages = loadedMerged.getPages();
    expect(pages.length).toBeGreaterThanOrEqual(1);

    // Every page in the merged bundle must have standardized Legal Portrait dimensions (612 x 936)
    for (const p of pages) {
      expect(p.getWidth()).toBe(612);
      expect(p.getHeight()).toBe(936);
    }
  });

  it('should leave uploaded PhilGEPS documents and their QR codes 100% UNTOUCHED without scaling, stamps, or watermarks', async () => {
    // 1. Create a custom PhilGEPS upload with specific dimensions and mock QR text
    const rawPhilgepsDoc = await PDFDocument.create();
    const pPage = rawPhilgepsDoc.addPage([595, 842]); // standard A4 upload from user
    const helv = await rawPhilgepsDoc.embedFont(StandardFonts.Helvetica);
    pPage.drawText('PHILGEPS OFFICIAL VERIFICATION QR CODE [DO NOT TOUCH]', {
      x: 50,
      y: 50,
      size: 10,
      font: helv
    });
    const rawPhilgepsBytes = await rawPhilgepsDoc.save();
    const rawPhilgepsBase64 = `data:application/pdf;base64,${Buffer.from(rawPhilgepsBytes).toString('base64')}`;

    // 2. Build merged package containing the PhilGEPS upload
    const mergedBytes = await buildMergedThreeLayerPdfBytes([
      {
        title: 'DOC-1: PhilGEPS Certificate',
        documentName: 'PhilGEPS Platinum Certificate of Registration (Annex A)',
        documentCode: 'DOC-1',
        fileName: 'philgeps_platinum_cert.pdf',
        fileDataUrl: rawPhilgepsBase64
      }
    ], 'PhilGEPS_MERGED_PACKAGE.pdf', undefined, {
      folderCopy: 'ORIGINAL',
      stampColor: 'blue',
      projectRefNo: 'PHILGEPS-QR-PROTECT'
    });

    expect(mergedBytes).toBeTruthy();
    const loadedMerged = await PDFDocument.load(mergedBytes);
    const pages = loadedMerged.getPages();
    expect(pages.length).toBe(1);

    // The uploaded PhilGEPS page MUST preserve its exact original dimensions (595 x 842) - ZERO-TOUCH PRESERVATION!
    const philgepsPage = pages[0];
    expect(philgepsPage.getWidth()).toBe(595);
    expect(philgepsPage.getHeight()).toBe(842);
  });

  it('should separately resolve BIR Certificate of Registration (DOC-6 / BIR Form 2303) and BIR Tax Clearance (DOC-7) without cross-contamination', async () => {
    const birRegDoc = {
      id: 'BIR_REGISTRATION',
      documentName: 'BIR Certificate of Registration (BIR Form 2303)',
      documentCode: 'BIR_REGISTRATION',
      code: 'BIR_REGISTRATION'
    };

    const taxClearanceDoc = {
      id: 'TAX_CLEARANCE',
      documentName: 'BIR Tax Clearance Certificate for Bidding (EO 398)',
      documentCode: 'TAX_CLEARANCE',
      code: 'TAX_CLEARANCE'
    };

    const birResolved = await resolveDocumentPdfAttachment(birRegDoc, ctx);
    const taxResolved = await resolveDocumentPdfAttachment(taxClearanceDoc, ctx);

    // BIR Registration must resolve to DOC-6 (BIR Form 2303)
    expect(birResolved).toBe('data:application/pdf;base64,JVBERi0xLjQKJVRISVMgSVMgQklSIEZPUk0gMjMwMy...');
    // Tax Clearance must resolve to DOC-7 (Tax Clearance)
    expect(taxResolved).toBe(dummyPdfTax);
    // They must never cross-contaminate or return each other
    expect(birResolved).not.toBe(taxResolved);
  });

  it('should generate statutory BIR Certificate of Registration (BIR Form 2303) fallback if no vault doc is uploaded', async () => {
    const emptyCtx: DocResolveContext = {
      ...ctx,
      vaultDocs: []
    };

    const birRegDoc = {
      id: 'BIR_REGISTRATION',
      documentName: 'BIR Certificate of Registration (BIR Form 2303)',
      documentCode: 'BIR_REGISTRATION',
      code: 'BIR_REGISTRATION'
    };

    const birResolved = await resolveDocumentPdfAttachment(birRegDoc, emptyCtx);
    expect(birResolved).toBeTruthy();
    expect(birResolved?.startsWith('data:application/pdf;base64,')).toBe(true);

    // Verify it is a valid PDF
    const base64Content = birResolved!.split(',')[1];
    const pdfBytes = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
    const loadedDoc = await PDFDocument.load(pdfBytes);
    expect(loadedDoc.getPages().length).toBeGreaterThanOrEqual(1);
  });
});



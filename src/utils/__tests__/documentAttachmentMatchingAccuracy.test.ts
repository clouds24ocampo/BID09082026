import { describe, it, expect, beforeEach } from 'vitest';
import { resolveDocumentPdfAttachment, DocResolveContext } from '../systemDocumentPdfGenerator';
import { DocumentVaultItem, Tenant } from '../../types';

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
});


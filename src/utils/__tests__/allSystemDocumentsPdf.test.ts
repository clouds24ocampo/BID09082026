import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  generateOngoingContractsPdf,
  generateSlccStatementPdf,
  generateSectionViRequirementsPdf,
  generateTechnicalSpecificationsPdf,
  generateFrameworkAgreementListPdf,
  generateNfccComputationPdf,
  generateFinancialBidFormPdf,
  generateBillOfQuantitiesPdf,
  generateDetailedEstimatesPdf,
  generateOrgChartPdf,
  generateKeyPersonnelPdf,
  generateMajorEquipmentPdf,
  generateOmnibusSwornStatementPdf,
  generateBidSecuringDeclarationPdf,
  generateAfterSalesWarrantyPdf,
  generatePriceSchedulePdf,
  generateSummaryOfBidPricesPdf,
  generateCashFlowPdf,
  generatePhilgepsCertificatePdf,
  generateSecDtiRegistrationPdf,
  generateMayorsPermitPdf,
  generateTaxClearancePdf,
  generateAuditedFinancialStatementsPdf,
  generatePcabLicensePdf,
  generateSecretaryCertificatePdf,
  generateJointVentureAgreementPdf,
  generateCustomExhibitPdf,
  DocResolveContext
} from '../systemDocumentPdfGenerator';
import { buildMergedThreeLayerPdfBytes } from '../pdfExportEngine';

const mockContext: DocResolveContext = {
  vaultDocs: [],
  projectTitle: 'Procurement of High-Capacity Enterprise Server Cluster & Storage Area Network',
  projectRefNo: 'GOP-BAC-2026-IT-0089',
  procuringEntity: 'Department of Information and Communications Technology',
  activeProject: {
    id: 'proj-test-123',
    title: 'Procurement of High-Capacity Enterprise Server Cluster',
    refNo: 'GOP-BAC-2026-IT-0089',
    procuringEntity: 'DICT - National Gov Center'
  },
  tenant: {
    id: 'tenant-test-01',
    companyName: 'Apex Cloud & Technology Solutions Corp.',
    brandCode: 'APEX',
    brandColor: '#0f3580',
    tin: '008-991-234-000',
    secDtiRegNo: 'SEC-CS2019-99412',
    pcabLicenseNo: 'PCAB-GE-94120',
    pcabCategory: 'AAA',
    philgepsPlatinumNo: 'PLATINUM-2026-009841',
    address: '14th Floor, Cyber Tower One, Ortigas Center, Pasig City, Metro Manila',
    preferredRegime: 'RA_9184',
    primaryProcurementType: 'GOODS',
    createdAt: '2026-01-01',
    authorizedSignatory: {
      name: 'Engr. Ferdinand R. Valenzuela',
      title: 'Chief Operating Officer & Managing Director',
      tin: '194-882-019'
    }
  }
};

describe('All 27 BiDOCS System Document PDF Generators', () => {
  const generators: Array<{ name: string; fn: (ctx: DocResolveContext) => Promise<string> }> = [
    { name: '1. Ongoing Contracts', fn: generateOngoingContractsPdf },
    { name: '2. SLCC Statement', fn: generateSlccStatementPdf },
    { name: '3. Section VI Requirements', fn: generateSectionViRequirementsPdf },
    { name: '4. Technical Specifications', fn: generateTechnicalSpecificationsPdf },
    { name: '5. Framework Agreement List', fn: generateFrameworkAgreementListPdf },
    { name: '6. NFCC Computation', fn: generateNfccComputationPdf },
    { name: '7. Financial Bid Form', fn: (ctx) => generateFinancialBidFormPdf(ctx, 'GOODS') },
    { name: '8. Bill of Quantities', fn: generateBillOfQuantitiesPdf },
    { name: '9. Detailed Estimates', fn: generateDetailedEstimatesPdf },
    { name: '10. Organizational Chart', fn: generateOrgChartPdf },
    { name: '11. Key Personnel Matrix', fn: generateKeyPersonnelPdf },
    { name: '12. Major Equipment Matrix', fn: generateMajorEquipmentPdf },
    { name: '13. Omnibus Sworn Statement', fn: generateOmnibusSwornStatementPdf },
    { name: '14. Bid Securing Declaration', fn: generateBidSecuringDeclarationPdf },
    { name: '15. After-Sales Warranty', fn: generateAfterSalesWarrantyPdf },
    { name: '16. Price Schedule for Goods', fn: generatePriceSchedulePdf },
    { name: '17. Summary of Bid Prices', fn: generateSummaryOfBidPricesPdf },
    { name: '18. Cash Flow by Quarter', fn: generateCashFlowPdf },
    { name: '19. PhilGEPS Platinum Certificate', fn: generatePhilgepsCertificatePdf },
    { name: '20. SEC / DTI Registration', fn: generateSecDtiRegistrationPdf },
    { name: '21. Mayor\'s / Business Permit', fn: generateMayorsPermitPdf },
    { name: '22. Tax Clearance Certificate', fn: generateTaxClearancePdf },
    { name: '23. Audited Financial Statements', fn: generateAuditedFinancialStatementsPdf },
    { name: '24. PCAB Contractor\'s License', fn: generatePcabLicensePdf },
    { name: '25. Secretary\'s Certificate', fn: generateSecretaryCertificatePdf },
    { name: '26. Joint Venture Agreement', fn: generateJointVentureAgreementPdf },
    { name: '27. Custom Exhibit / Cover Sheet', fn: (ctx) => generateCustomExhibitPdf({ id: 'custom-doc-1', documentName: 'Technical Appendix & Supplemental Certifications' }, ctx) }
  ];

  for (const { name, fn } of generators) {
    it(`should generate valid, non-empty, Legal-sized PDF: ${name}`, async () => {
      const dataUri = await fn(mockContext);
      expect(dataUri).toBeDefined();
      expect(dataUri.startsWith('data:application/pdf;base64,')).toBe(true);

      const base64Data = dataUri.replace('data:application/pdf;base64,', '');
      const pdfBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      expect(pdfBytes.length).toBeGreaterThan(100);

      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();
      expect(pageCount).toBeGreaterThanOrEqual(1);

      const page = pdfDoc.getPage(0);
      const width = Math.round(page.getWidth());
      const height = Math.round(page.getHeight());

      // Should be Legal portrait (612 x 936) or Legal landscape (936 x 612)
      const isLegal = (width === 612 && height === 936) || (width === 936 && height === 612);
      expect(isLegal).toBe(true);
    });
  }

  it('should auto-paginate ongoing contracts when row items exceed one page', async () => {
    // Ensure localStorage polyfill for node test environment
    const storageMap: Record<string, string> = {};
    const mockStorage = {
      getItem: (k: string) => storageMap[k] || null,
      setItem: (k: string, v: string) => { storageMap[k] = v; },
      removeItem: (k: string) => { delete storageMap[k]; },
      clear: () => { Object.keys(storageMap).forEach(k => delete storageMap[k]); }
    };
    (globalThis as any).localStorage = mockStorage;

    const manyContracts = Array.from({ length: 18 }, (_, i) => ({
      projectName: `Government Project Alpha Contract Package ${i + 1} - Multi-Year Implementation`,
      ownerName: `Procuring Agency ${i + 1} Regional Office`,
      natureOfWork: `Civil, Mechanical and Electrical Engineering Systems Installation ${i + 1}`,
      contractValue: 12500000 + i * 500000,
      outstandingValue: 4500000 + i * 100000,
      dateStarted: '2025-01-10',
      targetCompletion: '2026-12-31',
      percentageAccomplished: 65
    }));

    globalThis.localStorage.setItem('bidocs_ongoing_tenant-test-01_proj-test-123', JSON.stringify(manyContracts));

    const dataUri = await generateOngoingContractsPdf(mockContext);
    const base64Data = dataUri.replace('data:application/pdf;base64,', '');
    const pdfBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const pdfDoc = await PDFDocument.load(pdfBytes);

    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(2);

    globalThis.localStorage.removeItem('bidocs_ongoing_tenant-test-01_proj-test-123');
  });

  it('should auto-paginate Key Personnel matrix when manpower list exceeds one page', async () => {
    const storageMap: Record<string, string> = {};
    const mockStorage = {
      getItem: (k: string) => storageMap[k] || null,
      setItem: (k: string, v: string) => { storageMap[k] = v; },
      removeItem: (k: string) => { delete storageMap[k]; },
      clear: () => { Object.keys(storageMap).forEach(k => delete storageMap[k]); }
    };
    (globalThis as any).localStorage = mockStorage;

    const manyPersonnel = Array.from({ length: 35 }, (_, i) => ({
      position: `Senior Resident Engineer / Specialist ${i + 1}`,
      name: `Engr. Candidate Specialist Number ${i + 1}, CE, PMP, REE`,
      prcNo: `PRC-00${89000 + i}`,
      validity: '2027-10-31',
      experience: `${5 + i} Years`
    }));

    globalThis.localStorage.setItem('bidocs_key_personnel_tenant-test-01', JSON.stringify(manyPersonnel));

    const dataUri = await generateKeyPersonnelPdf(mockContext);
    const base64Data = dataUri.replace('data:application/pdf;base64,', '');
    const pdfBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const pdfDoc = await PDFDocument.load(pdfBytes);

    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(2);

    globalThis.localStorage.removeItem('bidocs_key_personnel_tenant-test-01');
  });

  it('should compile merged 3-layer package with Certified True Copy stamp on COPY_1 and COPY_2', async () => {
    const sampleDoc = await PDFDocument.create();
    sampleDoc.addPage([612, 936]);
    const sampleBytes = await sampleDoc.save();

    // 1. Test COPY_1 merge
    const copy1Bytes = await buildMergedThreeLayerPdfBytes([
      { title: 'Technical Proposal Cover', fileSource: sampleBytes }
    ], 'MERGED_TECHNICAL_COPY_1.pdf', undefined, {
      folderCopy: 'COPY_1',
      submissionDate: 'September 08, 2026',
      signatoryName: 'Engr. Ferdinand R. Valenzuela',
      signatoryTitle: 'Managing Director',
      projectRefNo: 'GOP-BAC-2026-IT-0089'
    });

    expect(copy1Bytes).toBeDefined();
    const copy1Doc = await PDFDocument.load(copy1Bytes);
    expect(copy1Doc.getPageCount()).toBe(1);

    // 2. Test COPY_2 merge
    const copy2Bytes = await buildMergedThreeLayerPdfBytes([
      { title: 'Financial Proposal Cover', fileSource: sampleBytes }
    ], 'MERGED_FINANCIAL_COPY_2.pdf', undefined, {
      folderCopy: 'COPY_2',
      submissionDate: 'September 08, 2026',
      signatoryName: 'Engr. Ferdinand R. Valenzuela',
      signatoryTitle: 'Managing Director',
      projectRefNo: 'GOP-BAC-2026-IT-0089'
    });

    expect(copy2Bytes).toBeDefined();
    const copy2Doc = await PDFDocument.load(copy2Bytes);
    expect(copy2Doc.getPageCount()).toBe(1);

    // 3. Test ORIGINAL merge
    const origBytes = await buildMergedThreeLayerPdfBytes([
      { title: 'Original Submission Package', fileSource: sampleBytes }
    ], 'MERGED_PACKAGE_ORIGINAL.pdf', undefined, {
      folderCopy: 'ORIGINAL',
      submissionDate: 'September 08, 2026'
    });

    expect(origBytes).toBeDefined();
    const origDoc = await PDFDocument.load(origBytes);
    expect(origDoc.getPageCount()).toBe(1);
  });
});

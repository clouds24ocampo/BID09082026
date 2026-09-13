import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  generateSectionViVectorPdf,
  generateFrameworkAgreementListVectorPdf,
  generateSectionViiVectorPdf,
  SectionViVectorData,
  TechSpecVectorData
} from '../vectorPdfGenerator';

describe('Vector PDF Generator System (jsPDF + AutoTable)', () => {
  const sampleSectionViData: SectionViVectorData = {
    companyName: 'QUANTUM CLOUD CORPORATION',
    companyAddress: 'Unit 206-C Genelle Park Bldg EDSA-Pasay City Philippines 1300',
    projectTitle: 'Procurement and Installation of CCTV System',
    projectRefNo: 'PhilGEPS-13202956',
    procuringEntity: 'Barangay Batong, Los Baños, Laguna',
    dateTimeSubmitted: '2026-09-30T09:00',
    signatoryName: 'Juan Dela Cruz',
    signatoryTitle: 'Authorized Representative',
    items: [
      {
        id: '1',
        description: 'A critical technical constraint is that web browsers cannot natively decode RTSP streams. To build a functional web/mobile application, you must implement a "Media Bridge" layer from scratch.\n' +
          'Configure the NVR to output RTSP streams on a dedicated internal network port for Media Server.\n' +
          'Deploy MediaMTX server on the same network as the NVR. Verify stream stability using a test player like VLC.',
        quantity: '1 Unit',
        unitAmount: '120000.00',
        total: '120000.00',
        delivered: '30 Calendar Days upon receipt of NTP'
      },
      {
        id: '2',
        description: 'Native Cross-Platform Sync: Utilize existing API backend to allow mobile users to run the same Web Application.',
        quantity: '1 Unit',
        unitAmount: '1.00',
        total: '1.00',
        delivered: '30 Calendar Days upon receipt of NTP'
      },
      {
        id: '3',
        description: 'Push Notifications integration with Firebase Cloud Messaging (FCM) to send alerts if the NVR triggers motion detection.',
        quantity: '1 Unit',
        unitAmount: '1.00',
        total: '1.00',
        delivered: '30 Calendar Days upon receipt of NTP'
      }
    ],
    totalQuantity: '3 Units',
    totalMaterials: '120002.00',
    servicesDescription: 'Logistic, Delivery, Labor, Installation (35% of Materials Cost)',
    servicesCost: '42000.70',
    grandTotal: '162002.70'
  };

  it('should generate Section VI vector PDF as a valid base64 data URL on exactly 1 page without orphan pages', async () => {
    const dataUrl = await generateSectionViVectorPdf(sampleSectionViData);
    expect(dataUrl).toBeDefined();
    expect(dataUrl.startsWith('data:application/pdf;base64,')).toBe(true);
    expect(dataUrl.length).toBeGreaterThan(1000);

    const pdfBytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));
    const loadedDoc = await PDFDocument.load(pdfBytes);
    expect(loadedDoc.getPageCount()).toBe(1);
  });

  it('should handle large multi-page items and auto-split cleanly without error', async () => {
    // Generate 25 items to test multi-page flow
    const largeItems = Array.from({ length: 25 }, (_, i) => ({
      id: String(i + 1),
      description: `Item ${i + 1} Detailed Specification: High performance optical sensor with 4K Ultra HD resolution, H.265+ smart compression, night vision up to 50 meters, IP67 weatherproof housing, and built-in edge storage support.`,
      quantity: `${i + 1} Units`,
      unitAmount: '5000.00',
      total: `${(i + 1) * 5000}.00`,
      delivered: '30 Calendar Days'
    }));

    const multiPageData: SectionViVectorData = {
      ...sampleSectionViData,
      items: largeItems
    };

    const dataUrl = await generateSectionViVectorPdf(multiPageData);
    expect(dataUrl).toBeDefined();
    expect(dataUrl.startsWith('data:application/pdf;base64,')).toBe(true);

    const multiDoc = await PDFDocument.load(Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0)));
    expect(multiDoc.getPageCount()).toBeGreaterThan(1);
  });

  it('should generate Framework Agreement List vector PDF as a valid base64 data URL', async () => {
    const dataUrl = await generateFrameworkAgreementListVectorPdf(sampleSectionViData);
    expect(dataUrl).toBeDefined();
    expect(dataUrl.startsWith('data:application/pdf;base64,')).toBe(true);
  });

  it('should generate Section VII Technical Specifications vector PDF as a valid base64 data URL', async () => {
    const sampleTechSpecData: TechSpecVectorData = {
      companyName: 'QUANTUM CLOUD CORPORATION',
      companyAddress: 'Unit 206-C Genelle Park Bldg EDSA-Pasay City Philippines 1300',
      projectTitle: 'Procurement and Installation of CCTV System',
      projectRefNo: 'PhilGEPS-13202956',
      procuringEntity: 'Barangay Batong, Los Baños, Laguna',
      dateTimeSubmitted: '2026-09-30T09:00',
      signatoryName: 'Juan Dela Cruz',
      signatoryTitle: 'Authorized Representative',
      items: [
        {
          id: '1',
          itemNo: '1',
          quantity: '1 Unit',
          specification: 'Camera Image Sensor 1/2.8" Progressive Scan CMOS 4MP, Resolution 2688 x 1520, H.265+ Compression',
          compliance: 'Comply',
          brandModel: 'HIKVISION DS-2CD2043G2-I'
        },
        {
          id: '2',
          itemNo: '2',
          quantity: '1 Unit',
          specification: 'Network Video Recorder (NVR) 32-Channel 4K H.265+ Plug & Play 16 PoE Ports',
          compliance: 'Comply',
          brandModel: 'HIKVISION DS-7732NI-I4/16P'
        }
      ]
    };

    const dataUrl = await generateSectionViiVectorPdf(sampleTechSpecData);
    expect(dataUrl).toBeDefined();
    expect(dataUrl.startsWith('data:application/pdf;base64,')).toBe(true);
  });
});

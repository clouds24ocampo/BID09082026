import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateQrCodeDataUrl, QrCodeDetails } from './qrCodeGenerator';
import { ScheduleItem, formatDescriptionText, formatPaperAmount } from '../components/vault/templates/SectionViScheduleOfRequirements';
import { TechSpecItem } from '../components/vault/templates/TechnicalSpecifications';

// Philippine Statutory Legal Paper Dimensions in Points (72 pt/inch)
// 8.5" x 13.0" = 612pt x 936pt
export const LEGAL_PORTRAIT_PT: [number, number] = [612, 936];

export interface VectorPdfOptions {
  companyName: string;
  companyAddress?: string;
  projectTitle: string;
  projectRefNo: string;
  procuringEntity: string;
  dateTimeSubmitted?: string;
  signatoryName?: string;
  signatoryTitle?: string;
}

export interface SectionViVectorData extends VectorPdfOptions {
  items: ScheduleItem[];
  servicesDescription?: string;
  servicesCost?: string | number;
  grandTotal?: string | number;
  totalMaterials?: string | number;
  totalQuantity?: string;
}

export interface TechSpecVectorData extends VectorPdfOptions {
  items: TechSpecItem[];
}

const formatDateTimeDisplay = (raw?: string): string => {
  if (!raw) return 'N/A';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return raw;
  }
};

/**
 * Stamps the official running header/footer across all pages after layout is complete.
 */
function stampRunningFooters(
  doc: jsPDF,
  docTitle: string,
  options: VectorPdfOptions
) {
  // Temporarily disabled per user request: bottom reserved for Certified True Copy stamp
  /*
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 36;
  const footerY = pageHeight - 38;

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Separator rule
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);
    doc.line(marginX, footerY, pageWidth - marginX, footerY);

    // Left: Bidder / Company Name
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text((options.companyName || 'OFFICIAL BIDDER').toUpperCase(), marginX, footerY + 12);
    doc.setFont('times', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(90, 90, 90);
    doc.text('Official Bidder • Republic of the Philippines', marginX, footerY + 22);

    // Center: Statutory document identifier
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(20, 20, 20);
    const centerTitle = `${docTitle.toUpperCase()} • REF: ${options.projectRefNo || 'N/A'}`;
    doc.text(centerTitle, pageWidth / 2, footerY + 12, { align: 'center' });
    doc.setFont('times', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 100);
    doc.text('Philippine Bidding Documents (PBDs) • RA 9184 / RA 12009', pageWidth / 2, footerY + 22, { align: 'center' });

    // Right: Page count
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(`PAGE ${i} OF ${totalPages}`, pageWidth - marginX, footerY + 12, { align: 'right' });
    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(110, 110, 110);
    doc.text('STANDARD FORM', pageWidth - marginX, footerY + 22, { align: 'right' });
  }
  */
}

/**
 * Draws the statutory header block (Page 1).
 */
function drawPage1Header(
  doc: jsPDF,
  formTitle: string,
  subTitle: string,
  options: VectorPdfOptions
): number {
  const marginX = 36;
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 36;

  // 1. Company Name & Address Header
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text((options.companyName || '').toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
  currentY += 14;

  if (options.companyAddress) {
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(70, 70, 70);
    doc.text(options.companyAddress.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
    currentY += 12;
  }

  // Header separator line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.2);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);
  currentY += 10;

  // 2. 4-Field Project Information Grid
  const col1X = marginX;
  const col2X = marginX + (pageWidth - marginX * 2) / 2;
  const colWidth = (pageWidth - marginX * 2) / 2 - 10;

  doc.setFontSize(8.5);

  // Row 1: Project Name | Project REF No
  doc.setFont('times', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Project Name: ', col1X, currentY);
  const pNameW = doc.getTextWidth('Project Name: ');

  doc.setFont('times', 'bold');
  doc.text('Project REF No.: ', col2X, currentY);
  const pRefW = doc.getTextWidth('Project REF No.: ');
  doc.setFont('courier', 'bold');
  doc.text(options.projectRefNo || 'N/A', col2X + pRefW, currentY);

  doc.setFont('times', 'normal');
  const fullTitle = (options.projectTitle || 'N/A').trim();
  const projTitleLines = doc.splitTextToSize(fullTitle, colWidth - pNameW);
  projTitleLines.forEach((line: string, idx: number) => {
    doc.text(line, col1X + pNameW, currentY + idx * 10);
  });
  currentY += Math.max(13, projTitleLines.length * 10 + 2);

  // Row 2: Procuring Entity | Submission Date
  doc.setFont('times', 'bold');
  doc.text('Procuring Entity: ', col1X, currentY);
  const pEntW = doc.getTextWidth('Procuring Entity: ');

  doc.setFont('times', 'bold');
  doc.text('Submission Date & Time: ', col2X, currentY);
  const pDateW = doc.getTextWidth('Submission Date & Time: ');
  doc.setFont('courier', 'normal');
  doc.text(formatDateTimeDisplay(options.dateTimeSubmitted), col2X + pDateW, currentY);

  doc.setFont('times', 'normal');
  const fullEntity = (options.procuringEntity || 'N/A').trim();
  const entLines = doc.splitTextToSize(fullEntity, colWidth - pEntW);
  entLines.forEach((line: string, idx: number) => {
    doc.text(line, col1X + pEntW, currentY + idx * 10);
  });
  currentY += Math.max(13, entLines.length * 10 + 3);

  // 3. Form Title
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(formTitle.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
  const titleW = doc.getTextWidth(formTitle.toUpperCase());
  doc.setLineWidth(0.75);
  doc.line((pageWidth - titleW) / 2, currentY + 1.5, (pageWidth + titleW) / 2, currentY + 1.5);
  currentY += 11;

  if (subTitle) {
    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    const subLines = doc.splitTextToSize(subTitle, pageWidth - marginX * 2);
    doc.text(subLines, pageWidth / 2, currentY, { align: 'center' });
    currentY += subLines.length * 9 + 4;
  } else {
    currentY += 4;
  }

  return currentY;
}

/**
 * Draws the official certification signatory block + QR code on the final page.
 */
async function drawSignatoryBlock(
  doc: jsPDF,
  certificationText: string,
  qrDetails: QrCodeDetails,
  options: VectorPdfOptions
) {
  const marginX = 36;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerSafeY = pageHeight - 42; // Safe area before running footer (at pageHeight - 34)
  const neededHeight = 72; // Compact, perfectly proportioned signatory block height

  let finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 100;

  // If table finished too low on the page, create a fresh continuation sheet for the signatory block
  if (finalY + neededHeight > footerSafeY) {
    doc.addPage();
    finalY = 46;
  }

  // Top separator border
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.6);
  doc.line(marginX, finalY, pageWidth - marginX, finalY);
  finalY += 8;

  // Certification statement
  doc.setFont('times', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text(certificationText.toUpperCase(), marginX, finalY);
  finalY += 12;

  // Left column: Bidder signature & title
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.text((options.companyName || '').toUpperCase(), marginX, finalY);
  finalY += 22;

  // Signature line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(marginX, finalY, marginX + 180, finalY);
  finalY += 9;

  // Signatory Name
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.text((options.signatoryName || 'AUTHORIZED REPRESENTATIVE').toUpperCase(), marginX, finalY);
  finalY += 9;

  // Designation
  doc.setFont('times', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  doc.text(options.signatoryTitle || 'Designation / Authorized Signatory', marginX, finalY);

  // Right column: GPPB QR Code (Temporarily disabled on paper per user request - can be restored later)
  /*
  try {
    const qrDataUrl = await generateQrCodeDataUrl(qrDetails);
    if (qrDataUrl) {
      const qrSize = 52;
      const qrX = pageWidth - marginX - qrSize;
      const qrY = finalY - 42;
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      doc.setFont('courier', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(60, 60, 60);
      doc.text(`VERIFIED GPPB DOC • ${options.projectRefNo || 'SEC-VI'}`, qrX + qrSize / 2, qrY + qrSize + 6, { align: 'center' });
    }
  } catch (qrErr) {
    console.warn('[VectorPDF] Failed to render QR code:', qrErr);
  }
  */
}

/**
 * Generates Section VI (Schedule of Requirements) directly as a Vector PDF.
 * Returns a base64 Data URL (data:application/pdf;base64,...).
 */
export async function generateSectionViVectorPdf(data: SectionViVectorData): Promise<string> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: LEGAL_PORTRAIT_PT
  });

  const startY = drawPage1Header(
    doc,
    'Section VI. Schedule of Requirements',
    'The delivery schedule expressed as weeks/months stipulates hereafter a delivery date which is the date of delivery to the project site.',
    data
  );

  // Build table data
  const tableBody = data.items.map((it, idx) => [
    String(idx + 1),
    formatDescriptionText(it.description || ''),
    it.quantity || '',
    formatPaperAmount(it.unitAmount || ''),
    formatPaperAmount(it.total || ''),
    it.delivered || '30 Calendar Days upon receipt of NTP'
  ]);

  // Build table footer rows (*** NOTHING FOLLOWS ***, Total Materials, Services, Grand Total)
  const tableFoot: any[] = [
    [
      { content: '*** NOTHING FOLLOWS ***', colSpan: 6, styles: { halign: 'center', fontStyle: 'bold', fillColor: [245, 245, 245] } }
    ],
    [
      { content: 'TOTAL MATERIALS:', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: data.totalQuantity || '', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: '—', styles: { halign: 'center' } },
      { content: formatPaperAmount(data.totalMaterials || ''), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: '—', styles: { halign: 'center' } }
    ]
  ];

  if (data.servicesDescription) {
    tableFoot.push([
      { content: data.servicesDescription, colSpan: 4, styles: { fontStyle: 'italic', fontSize: 7.5 } },
      { content: formatPaperAmount(data.servicesCost || ''), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: '—', styles: { halign: 'center' } }
    ]);
  }

  tableFoot.push([
    { content: 'GRAND TOTAL REQUIREMENTS (MATERIALS + SERVICES):', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [254, 243, 199] } },
    { content: formatPaperAmount(data.grandTotal || ''), styles: { halign: 'center', fontStyle: 'bold', fillColor: [253, 230, 138] } },
    { content: '—', styles: { halign: 'center', fillColor: [254, 243, 199] } }
  ]);

  autoTable(doc, {
    startY,
    margin: { left: 36, right: 36, top: 40, bottom: 95 },
    head: [['Item No.', 'Description', 'Qty', 'Unit Cost', 'Total Cost', 'Delivered in,']],
    body: tableBody,
    foot: tableFoot,
    showHead: 'everyPage',
    showFoot: 'lastPage',
    pageBreak: 'auto',
    theme: 'grid',
    styles: {
      font: 'times',
      fontSize: 8.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      textColor: [10, 10, 10],
      cellPadding: 3.5,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [226, 232, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8.5,
      lineWidth: 0.5,
      lineColor: [0, 0, 0]
    },
    footStyles: {
      fillColor: [248, 250, 252],
      textColor: [0, 0, 0],
      fontSize: 8.5,
      lineWidth: 0.5,
      lineColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 32, halign: 'center' }, // Item No: 5.2%
      1: { cellWidth: 290, halign: 'left' },   // Description: 53.7%
      2: { cellWidth: 38, halign: 'center' },  // Qty: 7%
      3: { cellWidth: 62, halign: 'center' },  // Unit Cost: 11.5%
      4: { cellWidth: 62, halign: 'center' },  // Total Cost: 11.5%
      5: { cellWidth: 56, halign: 'center' }   // Delivered: 10.3%
    }
  });

  // Draw Signatory Block on Final Page
  const qrDetails: QrCodeDetails = {
    companyName: data.companyName,
    documentName: 'Section VI. Schedule of Requirements',
    documentNumber: `SEC-VI-${data.projectRefNo || '2026-901283'}`,
    projectTitle: data.projectTitle,
    projectRefNo: data.projectRefNo,
    procuringEntity: data.procuringEntity,
    dateTimeSubmitted: formatDateTimeDisplay(data.dateTimeSubmitted),
    documentCategory: 'Bid Forms',
    generatedBy: data.companyName
  };

  await drawSignatoryBlock(
    doc,
    'I hereby certify to comply and deliver all the above requirements:',
    qrDetails,
    data
  );

  // Stamp Running Footers across all pages
  stampRunningFooters(doc, 'Section VI. Schedule of Requirements', data);

  const base64 = doc.output('datauristring').split(',')[1];
  return `data:application/pdf;base64,${base64}`;
}

/**
 * Generates Framework Agreement List directly as a Vector PDF.
 * Returns a base64 Data URL (data:application/pdf;base64,...).
 */
export async function generateFrameworkAgreementListVectorPdf(data: SectionViVectorData): Promise<string> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: LEGAL_PORTRAIT_PT
  });

  const startY = drawPage1Header(
    doc,
    'Framework Agreement List',
    '(PRICE SCHEDULE & ITEM MATRIX)',
    data
  );

  const tableBody = data.items.map((it, idx) => [
    String(idx + 1),
    formatDescriptionText(it.description || ''),
    it.quantity || '',
    formatPaperAmount(it.unitAmount || ''),
    formatPaperAmount(it.total || '')
  ]);

  const tableFoot: any[] = [
    [
      { content: '*** NOTHING FOLLOWS ***', colSpan: 5, styles: { halign: 'center', fontStyle: 'bold', fillColor: [245, 245, 245] } }
    ],
    [
      { content: 'TOTAL MATERIALS:', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: data.totalQuantity || '', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: '—', styles: { halign: 'center' } },
      { content: formatPaperAmount(data.totalMaterials || ''), styles: { halign: 'center', fontStyle: 'bold' } }
    ]
  ];

  if (data.servicesDescription) {
    tableFoot.push([
      { content: data.servicesDescription, colSpan: 4, styles: { fontStyle: 'italic', fontSize: 7.5 } },
      { content: formatPaperAmount(data.servicesCost || ''), styles: { halign: 'center', fontStyle: 'bold' } }
    ]);
  }

  tableFoot.push([
    { content: 'GRAND TOTAL REQUIREMENTS (MATERIALS + SERVICES):', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fillColor: [254, 243, 199] } },
    { content: '—', styles: { halign: 'center', fillColor: [254, 243, 199] } },
    { content: formatPaperAmount(data.grandTotal || ''), styles: { halign: 'center', fontStyle: 'bold', fillColor: [253, 230, 138] } }
  ]);

  autoTable(doc, {
    startY,
    margin: { left: 36, right: 36, top: 40, bottom: 95 },
    head: [['Item No.', 'Description', 'Qty', 'Unit Cost', 'Total Cost']],
    body: tableBody,
    foot: tableFoot,
    showHead: 'everyPage',
    showFoot: 'lastPage',
    pageBreak: 'auto',
    theme: 'grid',
    styles: {
      font: 'times',
      fontSize: 8.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      textColor: [10, 10, 10],
      cellPadding: 3.5,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [226, 232, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8.5,
      lineWidth: 0.5,
      lineColor: [0, 0, 0]
    },
    footStyles: {
      fillColor: [248, 250, 252],
      textColor: [0, 0, 0],
      fontSize: 8.5,
      lineWidth: 0.5,
      lineColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 36, halign: 'center' }, // Item No: 6.6%
      1: { cellWidth: 284, halign: 'left' },   // Description: 52.5%
      2: { cellWidth: 50, halign: 'center' },  // Qty: 9.2%
      3: { cellWidth: 85, halign: 'center' },  // Unit Cost: 15.7%
      4: { cellWidth: 85, halign: 'center' }   // Total Cost: 15.7%
    }
  });

  const qrDetails: QrCodeDetails = {
    companyName: data.companyName,
    documentName: 'Framework Agreement List',
    documentNumber: `FAL-01-${data.projectRefNo || '2026-901283'}`,
    projectTitle: data.projectTitle,
    projectRefNo: data.projectRefNo,
    procuringEntity: data.procuringEntity,
    dateTimeSubmitted: formatDateTimeDisplay(data.dateTimeSubmitted),
    documentCategory: 'Bid Forms',
    generatedBy: data.companyName
  };

  await drawSignatoryBlock(
    doc,
    'I hereby certify to comply and deliver all the above requirements:',
    qrDetails,
    data
  );

  stampRunningFooters(doc, 'Framework Agreement List', data);

  const base64 = doc.output('datauristring').split(',')[1];
  return `data:application/pdf;base64,${base64}`;
}

/**
 * Generates Section VII (Technical Specifications) directly as a Vector PDF.
 * Returns a base64 Data URL (data:application/pdf;base64,...).
 */
export async function generateSectionViiVectorPdf(data: TechSpecVectorData): Promise<string> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: LEGAL_PORTRAIT_PT
  });

  const startY = drawPage1Header(
    doc,
    'Section VII. Technical Specifications',
    'Bidders must state here either "Comply" or "Not Comply" against each of the individual parameters of each Specification.',
    data
  );

  const tableBody = data.items.map((it, idx) => {
    let complianceText = it.compliance || 'Comply';
    if (it.brandModel && it.brandModel.trim()) {
      complianceText += `\n(Brand/Model: ${it.brandModel.trim()})`;
    }
    return [
      String(idx + 1),
      it.quantity || '',
      formatDescriptionText(it.specification || ''),
      complianceText
    ];
  });

  const tableFoot: any[] = [
    [
      { content: `TOTAL SPECIFICATION ITEMS: ${data.items.length}`, colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }
    ]
  ];

  autoTable(doc, {
    startY,
    margin: { left: 36, right: 36, top: 40, bottom: 95 },
    head: [['Item No.', 'Qty', 'Technical Specifications', 'Statement of Compliance']],
    body: tableBody,
    foot: tableFoot,
    showHead: 'everyPage',
    showFoot: 'lastPage',
    pageBreak: 'auto',
    theme: 'grid',
    styles: {
      font: 'times',
      fontSize: 8.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      textColor: [10, 10, 10],
      cellPadding: 3.5,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [226, 232, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8.5,
      lineWidth: 0.5,
      lineColor: [0, 0, 0]
    },
    footStyles: {
      fillColor: [248, 250, 252],
      textColor: [0, 0, 0],
      fontSize: 8.5,
      lineWidth: 0.5,
      lineColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 36, halign: 'center' }, // Item No: 6.6%
      1: { cellWidth: 44, halign: 'center' },  // Qty: 8.1%
      2: { cellWidth: 320, halign: 'left' },   // Specification: 59.2%
      3: { cellWidth: 140, halign: 'center' }  // Compliance: 25.9%
    }
  });

  const qrDetails: QrCodeDetails = {
    companyName: data.companyName,
    documentName: 'Section VII. Technical Specifications',
    documentNumber: `SEC-VII-${data.projectRefNo || '2026-901283'}`,
    projectTitle: data.projectTitle,
    projectRefNo: data.projectRefNo,
    procuringEntity: data.procuringEntity,
    dateTimeSubmitted: formatDateTimeDisplay(data.dateTimeSubmitted),
    documentCategory: 'Technical Eligibility',
    generatedBy: data.companyName
  };

  await drawSignatoryBlock(
    doc,
    'I hereby certify to comply with all above technical specifications:',
    qrDetails,
    data
  );

  stampRunningFooters(doc, 'Section VII. Technical Specifications', data);

  const base64 = doc.output('datauristring').split(',')[1];
  return `data:application/pdf;base64,${base64}`;
}

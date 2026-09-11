import React from 'react';
import { DocumentVaultItem, Tenant } from '../../types';
import { ShieldCheck, Award } from 'lucide-react';
import DocumentQrCode from '../common/DocumentQrCode';

interface DocumentCoverPageProps {
  item: DocumentVaultItem & {
    procuringEntity?: string;
    approvedBudget?: number | string;
    preBidConferenceDate?: string;
    submissionDeadline?: string;
  };
  tenant: Tenant | null;
  incrementNumber?: number;
  folderCopy?: string;
  envelopeName?: string;
}

export const DocumentCoverPage: React.FC<DocumentCoverPageProps> = ({ 
  item, 
  tenant, 
  incrementNumber = 1,
  folderCopy = 'ORIGINAL',
  envelopeName
}) => {
  // Normalize folder copy display
  const normalizedCopy = (folderCopy || 'ORIGINAL').toUpperCase();
  const folderClean = normalizedCopy.replace(/\s+/g, '_');
  
  // Format Project Reference & Increments for Official Digital Seal
  const projectNumClean = (item.philgepsRefNo || item.documentNumber || 'PROJ').replace(/^PhilGEPS-?/i, '');
  const formattedInc = String(incrementNumber).padStart(3, '0');
  const verificationSealId = `${tenant?.brandCode || 'QCC'}-${folderClean}-${formattedInc}-${projectNumClean} Verified`;

  // Determine Envelope, Sub-Component, and Category Badges with 100% precision
  const rawCategory = ((item.category as string) || '').toUpperCase();
  const nameLower = (item.documentName || '').toLowerCase();

  const isFinancial = rawCategory === 'FINANCIAL' || 
                      rawCategory.includes('FINANCIAL') || 
                      nameLower.includes('bid form') || 
                      nameLower.includes('price schedule') || 
                      nameLower.includes('bill of quantities') || 
                      nameLower.includes('boq') || 
                      nameLower.includes('detailed estimate') || 
                      nameLower.includes('summary of bid price') || 
                      nameLower.includes('cash flow');

  const isLegal = !isFinancial && (
    rawCategory === 'LEGAL' || 
    rawCategory === 'CORPORATE_LEGAL' || 
    rawCategory.includes('ELIGIBILITY') || 
    rawCategory.includes('LEGAL') || 
    nameLower.includes('philgeps') || 
    (((nameLower.includes('sec ') || nameLower.includes('securities') || nameLower.includes('sec registration') || nameLower.includes('sec-dti') || nameLower === 'sec') && !nameLower.includes('section') && !nameLower.includes('secretary'))) ||
    nameLower.includes('dti') || 
    nameLower.includes('mayor') || 
    nameLower.includes('tax clearance') || 
    nameLower.includes('audited') || 
    nameLower.includes('afs') || 
    nameLower.includes('pcab') || 
    nameLower.includes('secretary') || 
    nameLower.includes('board resolution') || 
    nameLower.includes('special power of attorney') || 
    nameLower.includes('spa') || 
    nameLower.includes('joint venture') || 
    nameLower.includes('jva')
  );

  // Clean tags for ORIGINAL, COPY 1, COPY 2
  const copyDisplay = normalizedCopy.includes('ORIGINAL')
    ? 'ORIGINAL COPY'
    : (normalizedCopy === 'COPY_1' || normalizedCopy === 'COPY 1')
      ? 'COPY NO. 1'
      : (normalizedCopy === 'COPY_2' || normalizedCopy === 'COPY 2')
        ? 'COPY NO. 2'
        : normalizedCopy.replace(/_/g, ' ');

  const copyFileDisplay = normalizedCopy.includes('ORIGINAL')
    ? 'ORIGINAL FILE'
    : (normalizedCopy === 'COPY_1' || normalizedCopy === 'COPY 1')
      ? 'COPY 1 FILE'
      : (normalizedCopy === 'COPY_2' || normalizedCopy === 'COPY 2')
        ? 'COPY 2 FILE'
        : `${normalizedCopy.replace(/_/g, ' ')} FILE`;

  const copyVerifiedDisplay = normalizedCopy.includes('ORIGINAL')
    ? 'ORIGINAL VERIFIED'
    : (normalizedCopy === 'COPY_1' || normalizedCopy === 'COPY 1')
      ? 'COPY 1 VERIFIED'
      : (normalizedCopy === 'COPY_2' || normalizedCopy === 'COPY 2')
        ? 'COPY 2 VERIFIED'
        : `${normalizedCopy.replace(/_/g, ' ')} VERIFIED`;

  // Explicit Envelope Name
  const officialEnvelopeName = isFinancial
    ? 'ENVELOPE 2: FINANCIAL BID PROPOSAL'
    : isLegal
      ? 'ENVELOPE 1: LEGAL & ELIGIBILITY COMPONENT'
      : 'ENVELOPE 1: TECHNICAL PROPOSAL COMPONENT';

  // Category Tag for Pill Badge (Strictly Specific: LEGAL / TECHNICAL / FINANCIAL)
  const categoryTag = isFinancial
    ? 'FINANCIAL DOCUMENT'
    : isLegal
      ? 'LEGAL DOCUMENT'
      : 'TECHNICAL DOCUMENT';

  // Format Approved Budget cleanly from string or number
  const rawAbc = item.approvedBudget || (item as any).abc;
  const formattedAbc = typeof rawAbc === 'number'
    ? `₱${rawAbc.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : (rawAbc ? (String(rawAbc).startsWith('₱') ? String(rawAbc) : `₱${rawAbc}`) : '₱12,500,000.00');

  return (
    <div 
      className="print-document-sheet portrait w-full bg-white text-black font-sans p-4 sm:p-5 border-4 border-black rounded-2xl shadow-2xl max-w-[800px] aspect-[8.5/13] mx-auto my-2 text-left relative flex flex-col justify-between print:m-0 print:border-4 print:border-black print:shadow-none print:p-5 print:break-inside-avoid print:page-break-inside-avoid overflow-hidden"
      style={{ 
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '800px',
        aspectRatio: '8.5 / 13'
      }}
    >
      {/* Strict 8.5in x 13in Portrait Print Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: 8.5in 13in portrait !important;
            margin: 0mm !important;
          }
          html, body, #root {
            width: 8.5in !important;
            height: 13in !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: hidden !important;
          }
          .print-document-sheet {
            width: 8.5in !important;
            height: 13in !important;
            max-height: 13in !important;
            margin: 0 !important;
            padding: 0.35in 0.4in !important;
            border: 4px solid #000000 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      {/* Inner Elegant Border Frame */}
      <div className="absolute inset-2 border-2 border-black rounded-xl pointer-events-none print:inset-2" />

      {/* TOP & MIDDLE SECTIONS */}
      <div className="space-y-3 relative z-10">
        
        {/* 1. Envelope & Section Banner (Clean White with Black Border) */}
        <div className="flex items-center justify-between gap-2 bg-white text-black px-3.5 py-2 rounded-xl border-2 border-black shadow-sm">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-black" />
              <span className="text-xs font-black tracking-wider uppercase text-black">
                {envelopeName || officialEnvelopeName}
              </span>
            </div>
            <p className="text-[9.5px] font-mono text-neutral-700 font-semibold tracking-wide pl-3.5">
              SECTION: <strong className="text-black uppercase">{categoryTag}</strong>
            </p>
          </div>

          <span className="px-3 py-1 rounded-lg font-mono font-black text-xs uppercase tracking-widest bg-neutral-100 text-black border-2 border-black shrink-0">
            {copyDisplay}
          </span>
        </div>

        {/* 3. DOCUMENT INFORMATION BLOCK (Centerpiece - Pure B&W) */}
        <div className="text-center bg-neutral-50 border-2 border-black p-4 sm:p-5 rounded-xl space-y-2.5 shadow-sm">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs sm:text-[13px] font-mono font-black uppercase tracking-wider px-4 py-1 rounded-full border-2 border-black bg-white text-black shadow-sm">
              {categoryTag}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl md:text-[26px] font-black text-black leading-tight uppercase tracking-tight px-2">
            {item.documentName}
          </h2>
        </div>

        {/* 4. PROJECT & PROCUREMENT INFORMATION BLOCK (Pure B&W) */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-neutral-50 border-2 border-black space-y-1 text-[9.5px] sm:text-[10px]">
          <div className="flex items-center gap-1.5 border-b border-black pb-1 text-black font-black uppercase text-[10px] tracking-wide">
            <Award className="w-3.5 h-3.5 text-black" />
            <span>Project & Procurement Information</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-black leading-snug">
            <p>
              <span className="font-bold">Project Title:</span>{' '}
              <span className="font-semibold">{item.projectTitle || 'Target Bidding Project'}</span>
            </p>
            <p>
              <span className="font-bold">PhilGEPS Ref No:</span>{' '}
              <span className="font-mono font-bold">{item.philgepsRefNo || 'PhilGEPS-13200679'}</span>
            </p>
            <p>
              <span className="font-bold">Procuring Entity:</span>{' '}
              <span>{item.procuringEntity || 'Procuring Agency'}</span>
            </p>
            <p>
              <span className="font-bold">Approved Budget (ABC):</span>{' '}
              <span className="font-mono font-bold">{formattedAbc}</span>
            </p>
            <p>
              <span className="font-bold">Pre-Bid Conference:</span>{' '}
              <span>{item.preBidConferenceDate || 'August 15, 2026 at 10:00 AM'}</span>
            </p>
            <p>
              <span className="font-bold">Submission Deadline:</span>{' '}
              <span>{item.submissionDeadline || 'August 30, 2026 at 02:00 PM'}</span>
            </p>
            <p>
              <span className="font-bold">Bidding Company:</span>{' '}
              <span className="font-semibold">{tenant?.companyName || 'Quantum Cloud Corporation'}</span>
            </p>
            <p>
              <span className="font-bold">PhilGEPS Platinum No:</span>{' '}
              <span className="font-mono font-bold">{tenant?.philgepsPlatinumNo || '202106-237062-883905538'}</span>
            </p>
          </div>
        </div>

        {/* 5. STATUTORY VERIFICATION & BAC ATTESTATION BLOCK (Fills Empty Space Professionally) */}
        <div className="p-3.5 rounded-xl bg-neutral-50 border-2 border-black space-y-2 text-black shadow-sm">
          <div className="flex items-center justify-between border-b border-black pb-1.5">
            <div className="flex items-center gap-1.5 font-black uppercase text-[10.5px] tracking-wide">
              <ShieldCheck className="w-4 h-4 text-black" />
              <span>Statutory Verification & BAC Submission Attestation</span>
            </div>
            <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-black text-white">
              RA 12009 / RA 9184 Standard
            </span>
          </div>

          <p className="text-[10px] leading-relaxed text-justify font-serif text-black">
            This document serves as the official statutory exhibit separator and verified cover sheet for <strong className="uppercase underline text-black">{item.documentName}</strong> forming an integral statutory component of <strong className="uppercase text-black">{envelopeName || officialEnvelopeName}</strong>. The attached document is certified true, authentic, valid, and legally binding as submitted to the Bids and Awards Committee (BAC) in full compliance with the Revised Implementing Rules and Regulations (IRR) of Republic Act No. 9184 and the New Government Procurement Act (RA 12009).
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-black/30 font-mono text-[9.5px]">
            <div className="bg-white p-2 rounded border border-black">
              <span className="text-[8.5px] text-neutral-600 font-bold block uppercase">Exhibit Status</span>
              <strong className="text-black font-black">LEGAL EXHIBIT — TAB {formattedInc}</strong>
            </div>
            <div className="bg-white p-2 rounded border border-black">
              <span className="text-[8.5px] text-neutral-600 font-bold block uppercase">Legal Authority</span>
              <strong className="text-black font-black">GPPB PBDs 6th Edition</strong>
            </div>
            <div className="bg-white p-2 rounded border border-black col-span-2 sm:col-span-1">
              <span className="text-[8.5px] text-neutral-600 font-bold block uppercase">Copy Verification</span>
              <strong className="text-black font-black">{copyVerifiedDisplay}</strong>
            </div>
          </div>
        </div>

        {/* 6. AUTHORIZED SIGNATORY ATTESTATION SEAL */}
        <div className="p-3 rounded-xl bg-white border-2 border-black flex items-center justify-between gap-4 shadow-sm">
          <div className="space-y-0.5 text-left text-black">
            <span className="text-[9px] font-mono font-bold uppercase text-neutral-600 block">
              Certified True & Correct For Submission By:
            </span>
            <p className="text-xs font-black uppercase underline tracking-wide text-black">
              {tenant?.authorizedSignatory?.name || 'Authorized Signatory'}
            </p>
            <p className="text-[10px] text-neutral-700 font-medium">
              {tenant?.authorizedSignatory?.title || 'President / General Manager'} • {tenant?.companyName}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="px-2.5 py-1 rounded bg-neutral-100 border border-black text-[9px] font-mono font-black uppercase text-black block text-center">
              OFFICIAL SEAL
            </span>
            <span className="text-[8px] font-mono text-neutral-600 mt-0.5 block">
              {verificationSealId}
            </span>
          </div>
        </div>

      </div>

      {/* FOOTER SECTION: Copy Identity Bar + QR Code & Official Verification Seal (Pure B&W) */}
      <div className="space-y-1.5 pt-1.5 relative z-10">
        
        {/* PROMINENT COPY IDENTITY BAR AT THE TOP OF FOOTER */}
        <div className="flex items-center justify-between bg-white text-black px-3 py-1 rounded-lg border-2 border-black shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-black" />
            <span className="text-[10px] font-mono uppercase font-black tracking-wider text-black">
              DOCUMENT COPY DESIGNATION:
            </span>
          </div>
          <span className="px-2 py-0.5 rounded font-mono font-black text-[10.5px] uppercase tracking-widest bg-neutral-100 text-black border border-black">
            {copyDisplay}
          </span>
        </div>

        {/* QR Code & Digital Verification Seal Box */}
        <div className="border-t border-black pt-2 flex flex-row items-center justify-between gap-4">
          
          {/* Scannable Smartphone QR Code */}
          <div className="flex items-center gap-2 shrink-0">
            <DocumentQrCode
              details={{
                companyName: tenant?.companyName || 'Quantum Cloud Corporation',
                documentName: item.documentName,
                documentNumber: item.documentNumber || item.id || 'REF-STATUTORY-001',
                folderCopy: normalizedCopy,
                projectTitle: item.projectTitle || 'Target Bidding Project',
                projectRefNo: item.philgepsRefNo || 'PhilGEPS-13200679',
                procuringEntity: item.procuringEntity || 'Procuring Agency',
                dateTimeSubmitted: item.submissionDeadline || item.preBidConferenceDate || (item as any).dateIssued || 'August 30, 2026 at 02:00 PM',
                submissionDate: item.submissionDeadline || 'August 30, 2026 at 02:00 PM',
                documentCategory: `${normalizedCopy} Document Cover Page`,
                generatedBy: tenant?.companyName
              }}
              size={64}
              showCaption={false}
              className="shrink-0"
            />
            <div className="text-[8px] font-mono font-bold text-neutral-700 leading-tight hidden sm:block">
              <span>SCAN TO</span><br />
              <span>VERIFY</span>
            </div>
          </div>

          {/* FILE COPY & DOCUMENT NUMBER IDENTIFIER (Pure B&W - Clean & Simple) */}
          <div className="text-right flex-1 min-w-0 space-y-1 border-l-2 border-black pl-3 flex flex-col items-end justify-center">
            <div className="inline-flex items-center gap-1.5 text-black bg-neutral-100 border-2 border-black px-3 py-1 rounded-lg shadow-sm">
              <span className="font-mono font-black text-xs uppercase tracking-wider text-black">
                {copyFileDisplay}
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-mono text-black font-black uppercase tracking-wide">
              DOC NO: <span>{item.documentNumber || item.philgepsRefNo || '214263'}</span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default DocumentCoverPage;

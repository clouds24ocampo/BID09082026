import React from 'react';
import { DocumentVaultItem, Tenant } from '../../types';
import { Award } from 'lucide-react';

export interface DocumentSeparatorCoverProps {
  item: Partial<DocumentVaultItem> & {
    procuringEntity?: string;
    approvedBudget?: number | string;
    preBidConferenceDate?: string;
    submissionDeadline?: string;
    code?: string;
    vaultDocumentName?: string;
    attachedDocumentName?: string;
    dtiSecType?: string;
    projectTitle?: string;
    philgepsRefNo?: string;
  };
  tenant: Tenant | null;
  incrementNumber?: number;
  folderCopy?: string;
  envelopeName?: string;
}

export const DocumentSeparatorCover: React.FC<DocumentSeparatorCoverProps> = ({ 
  item, 
  tenant, 
  incrementNumber = 1,
  folderCopy = 'ORIGINAL',
  envelopeName
}) => {
  // Normalize folder copy display
  const normalizedCopy = (folderCopy || 'ORIGINAL').toUpperCase();

  // Signatory Title with President & Authorized Managing Officer (AMO)
  const signatoryTitleDisplay = (() => {
    const raw = tenant?.authorizedSignatory?.title || '';
    if (raw.toLowerCase().includes('authorized managing officer') && raw.toLowerCase().includes('president')) {
      return raw;
    }
    if (raw.toLowerCase().includes('authorized managing officer') || raw.toLowerCase().includes('amo')) {
      return `${raw} / President`;
    }
    if (raw.toLowerCase().includes('president')) {
      return `${raw} & Authorized Managing Officer (AMO)`;
    }
    return raw ? `${raw} • President & Authorized Managing Officer (AMO)` : 'President & Authorized Managing Officer (AMO)';
  })();

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
                      nameLower.includes('form l') ||
                      nameLower.includes('form (l)') ||
                      nameLower.includes('summary of bid') ||
                      nameLower.includes('summary bid') ||
                      nameLower.includes('cash flow') ||
                      nameLower.includes('sf-infr-56');

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

  // Dynamically resolve Document Title for SEC vs DTI
  let resolvedDocName = item.documentName || 'PhilGEPS Certificate of Registration and Membership (Platinum)';
  const isSecDti = ((item.documentName || '').toLowerCase().includes('sec') && (item.documentName || '').toLowerCase().includes('dti')) ||
                   (item.code === 'SEC_DTI_REG' || item.code === 'DOC-2');
  if (isSecDti) {
    const rawVaultName = ((item as any).vaultDocumentName || (item as any).attachedDocumentName || (item as any).fileName || '').toLowerCase();
    const subType = ((item as any).dtiSecType || (item as any).subType || '').toUpperCase();
    const isExplicitDti = subType === 'DTI' || rawVaultName.includes('dti') || (item.documentName || '').toLowerCase().startsWith('dti');
    const isExplicitSec = subType === 'SEC' || rawVaultName.includes('sec') || rawVaultName.includes('securities') || (item.documentName || '').toLowerCase().startsWith('sec');

    if (isExplicitDti && !isExplicitSec) {
      resolvedDocName = 'Department of Trade and Industry (DTI) Certificate of Business Name Registration';
    } else if (isExplicitSec) {
      resolvedDocName = 'Securities and Exchange Commission (SEC) Certificate of Registration';
    } else if (tenant?.companyName?.toUpperCase().includes('CORP') || tenant?.companyName?.toUpperCase().includes('INC') || tenant?.companyName?.toUpperCase().includes('LTD') || (tenant as any)?.businessType === 'CORPORATION' || (tenant as any)?.businessType === 'PARTNERSHIP') {
      resolvedDocName = 'Securities and Exchange Commission (SEC) Certificate of Registration';
    } else {
      resolvedDocName = 'Securities and Exchange Commission (SEC) Certificate of Registration';
    }
  }

  // Format Approved Budget cleanly from string or number with proper en-US comma formatting
  const rawAbc = item.approvedBudget || (item as any).abc;
  const formattedAbc = (() => {
    if (typeof rawAbc === 'number') {
      return `₱${rawAbc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (typeof rawAbc === 'string' && rawAbc.trim()) {
      // Strip any stray spacing or repeated spaces e.g. "4, 438, 000. 00"
      const cleanDigits = rawAbc.replace(/[₱,\s]/g, '');
      const parsed = parseFloat(cleanDigits);
      if (!isNaN(parsed) && isFinite(parsed)) {
        return `₱${parsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      return rawAbc.startsWith('₱') ? rawAbc.replace(/\s+/g, ' ').trim() : `₱${rawAbc.trim()}`;
    }
    return '₱12,500,000.00';
  })();

  const formatDeadlineDisplay = (raw?: string): string => {
    if (!raw) return 'August 30, 2026 at 02:00 PM';
    const trimmed = String(raw).trim();
    if (trimmed.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      try {
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) {
          const datePart = d.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });
          const hasTime = trimmed.includes('T') || trimmed.includes(':');
          if (hasTime) {
            const timePart = d.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
            return `${datePart} at ${timePart}`;
          }
          return datePart;
        }
      } catch {
        // fallback
      }
    }
    return trimmed;
  };

  return (
    <div 
      className="print-document-sheet portrait w-full bg-white text-black font-sans px-4 pb-6 pt-8 sm:px-6 sm:pb-8 sm:pt-10 border-4 border-black rounded-2xl shadow-2xl max-w-[800px] aspect-[8.5/13] mx-auto my-2 text-left relative flex flex-col justify-between print:m-0 print:border-4 print:border-black print:shadow-none print:break-inside-avoid print:page-break-inside-avoid overflow-hidden"
      style={{ 
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '800px',
        aspectRatio: '8.5 / 13'
      }}
    >
      {/* Strict 8.5in x 13in Portrait Print Stylesheet with Top Hole-Punch Margin */}
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
            padding: 0.75in 0.45in 0.35in 0.45in !important;
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
      <div className="space-y-4 relative z-10 pt-1 sm:pt-2">
        
        {/* 1. Envelope & Section Banner (Lowered for Punch Hole Clearance, 15% Bigger) */}
        <div className="flex items-center justify-between gap-3 bg-white text-black px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl border-2 border-black shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-black shrink-0" />
              <span className="text-[14px] sm:text-[15px] font-sans font-black tracking-wide uppercase text-black leading-tight">
                {envelopeName || officialEnvelopeName}
              </span>
            </div>
            <p className="text-[11px] sm:text-[12px] font-sans text-neutral-800 font-bold tracking-wide pl-4.5">
              SECTION: <strong className="text-black uppercase font-black">{categoryTag}</strong>
            </p>
          </div>

          <span className="px-3.5 py-1.5 rounded-lg font-sans font-black text-[13.5px] sm:text-[14.5px] uppercase tracking-wider bg-neutral-100 text-black border-2 border-black shrink-0">
            {copyDisplay}
          </span>
        </div>

        {/* 2. DOCUMENT INFORMATION BLOCK (Centerpiece - 15% Bigger Title & Crisp Typography) */}
        <div className="text-center bg-neutral-50 border-2 border-black p-4 sm:p-5 md:p-6 rounded-xl space-y-3 shadow-sm">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[13.5px] sm:text-[15px] font-sans font-black uppercase tracking-wider px-5 py-1.5 rounded-full border-2 border-black bg-white text-black shadow-sm">
              {categoryTag}
            </span>
          </div>

          <h2 className="text-[28px] sm:text-[34px] md:text-[39px] font-black text-black leading-tight uppercase tracking-tight px-2">
            {resolvedDocName}
          </h2>
        </div>

        {/* 3. PROJECT & PROCUREMENT INFORMATION BLOCK (15% Bigger Text & High Contrast Readability) */}
        <div className="p-4 sm:p-5 rounded-xl bg-neutral-50 border-2 border-black space-y-2.5 text-[14px] sm:text-[14.5px] md:text-[15px]">
          <div className="flex items-center gap-2 border-b-2 border-black pb-2 text-black font-black uppercase text-[14px] sm:text-[15.5px] tracking-wide">
            <Award className="w-5 h-5 text-black shrink-0" />
            <span>Project & Procurement Information</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-black leading-snug">
            <p>
              <span className="font-bold text-neutral-900">Project Title:</span>{' '}
              <span className="font-extrabold text-black">{item.projectTitle || 'Target Bidding Project'}</span>
            </p>
            <p>
              <span className="font-bold text-neutral-900">PhilGEPS Ref No:</span>{' '}
              <span className="font-sans font-black text-black tracking-normal tabular-nums">{item.philgepsRefNo ? String(item.philgepsRefNo).trim() : 'PhilGEPS-13200679'}</span>
            </p>
            <p>
              <span className="font-bold text-neutral-900">Procuring Entity:</span>{' '}
              <span className="font-extrabold text-black">{item.procuringEntity || 'Procuring Agency'}</span>
            </p>
            <p>
              <span className="font-bold text-neutral-900">Approved Budget (ABC):</span>{' '}
              <span className="font-sans font-black text-black tracking-normal tabular-nums">{formattedAbc}</span>
            </p>
            <p>
              <span className="font-bold text-neutral-900">Pre-Bid Conference:</span>{' '}
              <span className="font-semibold text-black">{item.preBidConferenceDate || 'N/A'}</span>
            </p>
            <p>
              <span className="font-bold text-neutral-900">Submission Deadline:</span>{' '}
              <span className="font-semibold text-black">{formatDeadlineDisplay(item.submissionDeadline)}</span>
            </p>
            <p>
              <span className="font-bold text-neutral-900">Bidding Company:</span>{' '}
              <span className="font-extrabold text-black">{tenant?.companyName || ''}</span>
            </p>
            <p>
              <span className="font-bold text-neutral-900">PhilGEPS Platinum No:</span>{' '}
              <span className="font-sans font-black text-black tracking-normal tabular-nums">{tenant?.philgepsPlatinumNo ? String(tenant.philgepsPlatinumNo).trim() : ''}</span>
            </p>
          </div>
        </div>

        {/* 4. AUTHORIZED SIGNATORY ATTESTATION (15% Bigger Font & Crisp Readability) */}
        <div className="mt-6 sm:mt-8 p-4 sm:p-4.5 rounded-xl bg-white border-2 border-black flex items-center justify-between gap-4 shadow-sm relative z-10">
          <div className="space-y-1.5 text-left text-black">
            <span className="text-[13.5px] sm:text-[15px] font-sans font-black uppercase text-black block tracking-wide">
              CERTIFIED TRUE COPY — <span className="underline">{copyDisplay}</span>
            </span>
            <p className="text-[13px] sm:text-[14px] font-sans text-neutral-800">
              <span className="font-sans text-neutral-700 font-bold uppercase text-[11px] sm:text-[11.5px] tracking-wide">Submitted by:</span>{' '}
              <span className="font-black uppercase text-black">{tenant?.companyName || ''}</span>
            </p>
          </div>
          <div className="text-right shrink-0 space-y-0.5">
            <span className="text-[11px] sm:text-[11.5px] font-sans text-neutral-700 font-bold uppercase tracking-wider block">
              Signed by:
            </span>
            <p className="text-[14.5px] sm:text-[16px] font-sans font-black uppercase underline tracking-wide text-black">
              {tenant?.authorizedSignatory?.name || ''}
            </p>
            <p className="text-[11.5px] sm:text-[12.5px] text-neutral-800 font-bold leading-normal">
              {signatoryTitleDisplay}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DocumentSeparatorCover;

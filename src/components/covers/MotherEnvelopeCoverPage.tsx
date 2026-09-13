import React from 'react';
import { Tenant } from '../../types';
import DocumentQrCode from '../common/DocumentQrCode';

export interface MotherEnvelopeCoverPageProps {
  id?: string;
  tenant?: Tenant | null;
  companyName?: string;
  companyAddress?: string;
  tin?: string;
  philgepsPlatinumNo?: string;
  procuringEntity?: string;
  projectTitle?: string;
  projectRefNo?: string;
  solicitationNo?: string;
  abc?: string;
  submissionDeadline?: string;
  signatoryName?: string;
  signatoryTitle?: string;
}

export const MotherEnvelopeCoverPage: React.FC<MotherEnvelopeCoverPageProps> = ({
  id,
  tenant,
  companyName,
  companyAddress,
  tin,
  philgepsPlatinumNo,
  procuringEntity = 'THE BIDS AND AWARDS COMMITTEE (BAC)',
  projectTitle = 'SUPPLY, DELIVERY, INSTALLATION, TESTING, AND CONFIGURATION OF ICT EQUIPMENT, PERIPHERALS, SYSTEMS AND SOFTWARE',
  projectRefNo = '12795242',
  solicitationNo = 'SOL-2026-001',
  abc = '₱12,500,000.00',
  submissionDeadline = 'September 30, 2026 at 10:00 AM',
  signatoryName,
  signatoryTitle
}) => {
  const effectiveCompanyName = companyName || tenant?.companyName || 'QUANTUM CLOUD CORPORATION';
  const effectiveAddress = companyAddress || tenant?.address || 'La Trinidad, Benguet, Cordillera Administrative Region, Philippines';
  const effectiveTin = tin || tenant?.tin || '000-000-000-000';
  const effectivePhilgeps = philgepsPlatinumNo || tenant?.philgepsPlatinumNo || '202106-237062-883905538';
  const effectiveSignatory = signatoryName || tenant?.authorizedSignatory?.name || 'Mark-Vin F. Ocampo';

  const effectiveTitle = (() => {
    const raw = signatoryTitle || tenant?.authorizedSignatory?.title || '';
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

  const cleanProcuringEntity = (() => {
    let entity = (procuringEntity || '').trim();
    const prefixMatch = entity.match(/^(?:THE\s+BIDS\s+AND\s+AWARDS\s+COMMITTEE\s*\((?:BAC)?\)\s*[-—–:]\s*|BAC\s*[-—–:]\s*)/i);
    if (prefixMatch) {
      entity = entity.substring(prefixMatch[0].length).trim();
    }
    return entity || 'THE BIDS AND AWARDS COMMITTEE (BAC)';
  })();

  const formatDeadlineDisplay = (raw?: string): string => {
    if (!raw) return 'September 30, 2026 at 10:00 AM';
    const trimmed = raw.trim();
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

  const formattedDeadline = formatDeadlineDisplay(submissionDeadline);

  return (
    <div id={id} className="landscape-unified-cover single-page-paper landscape w-full max-w-[1100px] min-h-[680px] aspect-[13/8.5] bg-white text-black p-5 sm:p-7 border-4 border-black flex flex-col justify-between font-sans relative shadow-2xl print:shadow-none print:border-4 print:p-6 print:m-0 box-border mx-auto rounded-2xl">
      {/* 13in x 8.5in Landscape Print Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: 13in 8.5in landscape !important;
            margin: 0.25in !important;
          }
          html, body, #root {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .landscape-unified-cover {
            box-shadow: none !important;
            border: 4px solid #000000 !important;
            margin: 0 auto !important;
            padding: 0.35in !important;
            width: 13in !important;
            min-height: 8.5in !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}</style>

      {/* Inner Frame */}
      <div className="absolute inset-2 border-2 border-black rounded-xl pointer-events-none print:inset-2" />

      {/* TOP HEADER: Bidder Corporate Info */}
      <div className="text-center border-b-2 border-black pb-2 space-y-0.5 relative z-10">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-wide text-black leading-tight">
          {effectiveCompanyName}
        </h1>
        <p className="text-xs text-slate-700 font-medium">
          {effectiveAddress} • TIN: <span className="font-mono font-bold">{effectiveTin}</span> • PhilGEPS Reg. No.: <span className="font-bold text-blue-950">{effectivePhilgeps}</span>
        </p>
      </div>

      {/* SECTION 1: SUBMITTED TO & PROCURING ENTITY (Full Width, Balanced Two-Column) */}
      <div className="p-2.5 sm:p-3 border-2 border-black bg-slate-50/90 rounded-xl relative z-10 my-1 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4">
          <div className="text-left">
            <span className="text-[9.5px] uppercase font-mono font-black tracking-widest text-slate-500 block">SUBMITTED TO:</span>
            <h2 className="text-sm sm:text-base font-black uppercase text-blue-950 leading-tight">
              THE BIDS AND AWARDS COMMITTEE (BAC)
            </h2>
          </div>
          <div className="text-left sm:text-right border-t sm:border-t-0 pt-1 sm:pt-0 border-slate-200">
            <span className="text-[9.5px] uppercase font-mono font-black tracking-widest text-slate-500 block">PROCURING ENTITY:</span>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase leading-tight">
              {cleanProcuringEntity}
            </h3>
          </div>
        </div>
      </div>

      {/* SECTION 2: PROJECT TITLE & PROCUREMENT DETAILS */}
      <div className="border-2 border-black p-2.5 sm:p-3 bg-slate-50/90 rounded-xl text-left shadow-sm relative z-10 mb-1.5 space-y-1">
        <div>
          <span className="text-[9.5px] font-mono font-bold text-slate-500 uppercase block tracking-wider">PROJECT TITLE:</span>
          <p className="text-xs sm:text-sm font-black text-black uppercase leading-snug">
            {projectTitle}
          </p>
        </div>

        <div className="pt-1.5 border-t border-slate-300 grid grid-cols-3 gap-2 text-xs font-mono">
          <div>
            <span className="text-[9px] text-slate-500 block uppercase font-bold">PhilGEPS Ref No.</span>
            <strong className="text-blue-950 font-black truncate block text-[11px]">{projectRefNo}</strong>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block uppercase font-bold">Solicitation No.</span>
            <strong className="text-blue-950 font-black truncate block text-[11px]">{solicitationNo}</strong>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block uppercase font-bold">Approved Budget (ABC)</span>
            <strong className="text-emerald-800 font-black block text-[11px]">{abc}</strong>
          </div>
        </div>
      </div>

      {/* SECTION 3: 2-COLUMN GRID (Enclosures & Expanded Red Warning Box) */}
      <div className="grid grid-cols-12 gap-3 relative z-10 items-stretch mb-1.5">
        
        {/* Left Column (5 cols): Outer Enclosures */}
        <div className="col-span-5">
          <div className="p-2 sm:p-2.5 border-2 border-slate-900 bg-slate-100 rounded-xl text-left space-y-1 font-sans text-xs shadow-sm h-full flex flex-col justify-center">
            <p className="font-black text-black uppercase border-b border-slate-300 pb-1 text-[10px] flex items-center gap-1.5">
              <span>📦</span> ENCLOSED ENVELOPES IN THIS MOTHER BOX:
            </p>
            <div className="space-y-1 pt-0.5 text-[10.5px]">
              <div className="p-1 rounded-lg bg-blue-50 border border-blue-200 space-y-0.5">
                <strong className="text-blue-950 font-bold block text-[11px]">1. ENVELOPE 1: LEGAL & TECHNICAL DOCUMENTS</strong>
                <span className="text-slate-700 text-[9.5px] block font-medium">Includes: Original, Copy 1 (Duplicate), Copy 2 (Triplicate)</span>
              </div>
              <div className="p-1 rounded-lg bg-emerald-50 border border-emerald-200 space-y-0.5">
                <strong className="text-emerald-950 font-bold block text-[11px]">2. ENVELOPE 2: FINANCIAL BID PROPOSAL</strong>
                <span className="text-slate-700 text-[9.5px] block font-medium">Includes: Original, Copy 1 (Duplicate), Copy 2 (Triplicate)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Expanded Prominent Red Warning Box */}
        <div className="col-span-7">
          <div className="p-2.5 sm:p-3 border-2 border-red-600 bg-red-50 text-center rounded-xl flex flex-col justify-center items-center h-full space-y-1 shadow-sm">
            <h4 className="text-xs sm:text-sm font-black text-red-600 uppercase tracking-wide leading-tight flex items-center justify-center gap-1.5">
              <span>⚠️</span> WARNING: DO NOT OPEN BEFORE SCHEDULED BID OPENING DATE & TIME!
            </h4>
            <p className="text-[9.5px] sm:text-[10px] font-bold text-red-800 uppercase leading-snug">
              Any bid submitted after the deadline shall not be accepted. Bids opened prematurely shall be disqualified pursuant to RA 12009 / RA 9184.
            </p>
            <div className="pt-0.5 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-black text-red-950 font-mono uppercase tracking-wide">
                SCHEDULED BID OPENING:
              </span>
              <span className="bg-red-600 text-white px-2.5 py-0.5 rounded-lg font-black text-xs sm:text-sm font-mono tracking-wider shadow-sm">
                {formattedDeadline}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 4: MOTHER ENVELOPE IDENTIFIER BANNER (White Background with Ink Blue Text - 30% Larger & Prominent) */}
      <div className="my-1.5 relative z-10">
        <div className="py-4 sm:py-5 px-4 sm:px-6 border-4 border-blue-950 bg-white text-center rounded-2xl space-y-1 shadow-lg">
          <div className="font-mono font-black text-2xl sm:text-3xl md:text-[35px] uppercase tracking-widest text-blue-950 leading-tight">
            MOTHER ENVELOPE: OFFICIAL BID PROPOSAL
          </div>
          <div className="text-xs sm:text-[15px] font-sans font-bold text-blue-950/90 uppercase tracking-wider">
            MASTER OUTER ENVELOPE / ENCLOSING CONTAINER PURSUANT TO RA 12009 / RA 9184
          </div>
        </div>
      </div>

      {/* BOTTOM FOOTER: Signatory & QR Code (Clear of Borders) */}
      <div className="border-t-2 border-black pt-2 pb-0.5 flex items-center justify-between relative z-10 text-xs mt-auto">
        <div className="space-y-0.5 text-left">
          <p className="text-[9px] font-mono font-bold uppercase text-slate-500">
            AUTHORIZED MANAGING OFFICER / BIDDER SIGNATORY:
          </p>
          <p className="text-xs sm:text-sm font-black uppercase text-black underline tracking-wide">
            {effectiveSignatory}
          </p>
          <p className="text-[10px] text-slate-700 font-bold leading-tight">
            {effectiveTitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-right text-[9px] font-mono text-slate-600 hidden sm:block leading-tight">
            <div className="font-bold text-black">Official Submission QR</div>
            <div>{projectRefNo}</div>
          </div>
          <DocumentQrCode
            details={{
              documentNumber: projectRefNo || 'PhilGEPS-2026-001',
              documentName: 'Mother Envelope Outer Packaging Cover',
              projectName: projectTitle,
              dateTimeSubmitted: formattedDeadline,
              companyName: effectiveCompanyName,
              solicitationNo: solicitationNo
            }}
            size={46}
            showCaption={false}
            className="shrink-0"
          />
        </div>
      </div>

    </div>
  );
};

export default MotherEnvelopeCoverPage;

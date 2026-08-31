import React, { useState, useEffect } from 'react';
import { Tenant } from '../../../types';
import { generateAndDownloadThreeLayerPdf, buildMergedThreeLayerPdfDataUrl, ExportDocumentUnit } from '../../../utils/pdfExportEngine';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import { savePdfData } from '../../../utils/vaultIndexedDB';
import DocumentQrCode from '../../common/DocumentQrCode';
import VaultErrorBoundary from '../../common/VaultErrorBoundary';
import { numberToWords } from '../../../utils/numberToWords';
import {
  X,
  Printer,
  Download,
  Building2,
  FileSignature,
  DollarSign,
  Lock,
  Edit3,
  HardHat,
  Percent,
  CheckCircle2,
  Calendar,
  ShieldCheck
} from 'lucide-react';

export interface DiscountOfferRow {
  id: string;
  lotNameDescription: string;
  discountPercentageAmount: string;
  methodology: string;
}

export interface BidFormForInfrastructureModalProps {
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose: () => void;
}

// Helper to format currency number with commas and 2 decimal places (e.g. 1,000,000.00)
const formatCurrency = (num: number): string => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const parseNum = (val: string): number => {
  if (!val) return 0;
  const cleaned = val.replace(/,/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

// Helper to format Date ONLY without time (e.g., "March 19, 2026")
const formatDateOnly = (raw: string): string => {
  if (!raw) return 'March 19, 2026';
  let cleaned = raw.replace(/\s*T\s*\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?/gi, ' ').trim();
  cleaned = cleaned.replace(/\s+at\s+.*$/gi, '').trim();
  try {
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  } catch {}
  return cleaned;
};

export const BidFormForInfrastructureModalContent: React.FC<BidFormForInfrastructureModalProps> = ({
  tenant,
  activeProjectRefNo,
  activeProjectTitle,
  activeProcuringEntity,
  onSaveAndComplete,
  onClose
}) => {
  // Opportunity Projects Auto-Fill Integration
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  // Project & Document Parameters
  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo || '');
  const [projectTitle, setProjectTitle] = useState(activeProjectTitle || '');
  const [procuringEntity, setProcuringEntity] = useState(activeProcuringEntity || '');
  const [procuringEntityAddress, setProcuringEntityAddress] = useState('');
  const [solicitationNumber, setSolicitationNumber] = useState('INFRA-2026-01');
  const [dateSubmitted, setDateSubmitted] = useState('March 19, 2026');

  // Corporate Entity & Signatory
  const companyName = tenant?.companyName || '';
  const [companyAddress, setCompanyAddress] = useState(tenant?.address || '');
  const [signatoryName, setSignatoryName] = useState(tenant?.authorizedSignatory?.name || 'Authorized Managing Officer');
  const [signatoryTitle, setSignatoryTitle] = useState(tenant?.authorizedSignatory?.title || 'Authorized Managing Officer / President');
  const [writtenAuthority, setWrittenAuthority] = useState("Board Resolution & Secretary's Certificate");
  const [pcabLicenseNo, setPcabLicenseNo] = useState((tenant as any)?.pcabLicenseNo || 'PCAB-LIC-2026-AAA');

  // Performance Security Parameters
  const [performanceSecurityOption, setPerformanceSecurityOption] = useState<'PERFORMANCE_BOND' | 'PSD' | 'MANAGERS_CHECK'>('PERFORMANCE_BOND');
  const [performanceSecurityPercent, setPerformanceSecurityPercent] = useState('thirty (30)');
  const [bidValidityDays, setBidValidityDays] = useState('120');
  const [completionCalendarDays, setCompletionCalendarDays] = useState('180');

  // Discounts Offered
  const [discountsOffered, setDiscountsOffered] = useState('No discounts offered');
  const [hasDiscounts, setHasDiscounts] = useState(false);

  // Financial Bid Amount
  const [totalBidAmountFigures, setTotalBidAmountFigures] = useState('0.00');
  const [totalBidAmountWords, setTotalBidAmountWords] = useState('ZERO PESOS ONLY');
  const [bidBulletins, setBidBulletins] = useState('');

  // UI state
  const [showMetadataInputs, setShowMetadataInputs] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Helper to sync from Form L / Detailed Estimates / BOQ
  const syncFromDetailedEstimates = (targetRefNo?: string, targetOppId?: string) => {
    const tenantId = tenant?.id || 'default';
    const keysToCheck = [
      targetRefNo ? `bidocs_detailed_estimates_${tenantId}_${targetRefNo}` : '',
      targetOppId ? `bidocs_detailed_estimates_${tenantId}_${targetOppId}` : '',
      targetRefNo ? `bidocs_boq_${tenantId}_${targetRefNo}` : '',
      targetOppId ? `bidocs_boq_${tenantId}_${targetOppId}` : '',
      `bidocs_detailed_estimates_${tenantId}_default`,
      `bidocs_boq_${tenantId}_default`
    ].filter(Boolean);

    for (const key of keysToCheck) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          const totalVal = parsed.grandTotal || parsed.totalBidAmount || parsed.totalAmount || parsed.totalPrice;
          if (typeof totalVal === 'number' && totalVal > 0) {
            setTotalBidAmountFigures(formatCurrency(totalVal));
            setTotalBidAmountWords(numberToWords(totalVal));
            return;
          }
        }
      } catch (_) {}
    }
  };

  // Load Opportunity Projects and auto-fill
  useEffect(() => {
    const list = getOpportunityProjects(tenant?.id);
    setOppProjects(list);

    let currentRefNo = activeProjectRefNo;
    let currentOppId = '';

    if (activeProjectRefNo) {
      const match = list.find(p => p.refNo === activeProjectRefNo);
      if (match) {
        setSelectedOppId(match.id);
        currentOppId = match.id;
        setProjectRefNo(match.refNo);
        setProjectTitle(match.title);
        setProcuringEntity(`${match.procuringEntity.toUpperCase()}`);
        if (match.procuringEntityAddress || match.location) {
          setProcuringEntityAddress(match.procuringEntityAddress || match.location || '');
        }
        if (match.solicitationNo) setSolicitationNumber(match.solicitationNo);
        if (match.dateTimeSubmitted) {
          setDateSubmitted(formatDateOnly(match.dateTimeSubmitted));
        }
      }
    } else if (list.length > 0) {
      const first = list[0];
      setSelectedOppId(first.id);
      currentOppId = first.id;
      currentRefNo = first.refNo;
      setProjectRefNo(first.refNo);
      setProjectTitle(first.title);
      setProcuringEntity(`${first.procuringEntity.toUpperCase()}`);
      if (first.procuringEntityAddress || first.location) {
        setProcuringEntityAddress(first.procuringEntityAddress || first.location || '');
      }
      if (first.solicitationNo) setSolicitationNumber(first.solicitationNo);
      if (first.dateTimeSubmitted) {
        setDateSubmitted(formatDateOnly(first.dateTimeSubmitted));
      }
    }

    const targetRef = currentRefNo || projectRefNo || selectedOppId;
    syncFromDetailedEstimates(targetRef, currentOppId || selectedOppId);
  }, [tenant?.id, activeProjectRefNo]);

  const handleSelectOpportunity = (oppId: string) => {
    setSelectedOppId(oppId);
    const found = oppProjects.find(p => p.id === oppId || p.refNo === oppId);
    if (found) {
      setProjectRefNo(found.refNo);
      setProjectTitle(found.title);
      setProcuringEntity(`${found.procuringEntity.toUpperCase()}`);
      if (found.procuringEntityAddress || found.location) {
        setProcuringEntityAddress(found.procuringEntityAddress || found.location || '');
      }
      if (found.solicitationNo) setSolicitationNumber(found.solicitationNo);
      if (found.dateTimeSubmitted) {
        setDateSubmitted(formatDateOnly(found.dateTimeSubmitted));
      }
      syncFromDetailedEstimates(found.refNo, found.id);
    }
  };

  const docTitle = 'Bid Form for the Procurement of Infrastructure Projects';
  const cleanRef = (projectRefNo || 'INFRA').replace(/[^a-zA-Z0-9]/g, '_');
  const pdfFileName = `Bid_Form_Infrastructure_${cleanRef}.pdf`;

  const handleExportPdf = async () => {
    setIsSaving(true);
    try {
      const elem = document.getElementById('bidform-infra-paper-container');
      if (elem) {
        await generateAndDownloadThreeLayerPdf(null, elem, undefined, pdfFileName);
      }
    } catch (err) {
      console.error('[BidFormInfra] PDF Export Error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const elem = document.getElementById('bidform-infra-paper-container');
      let dataUrl: string | undefined = undefined;
      if (elem) {
        const unit: ExportDocumentUnit = {
          title: docTitle,
          formElement: elem
        };
        dataUrl = await buildMergedThreeLayerPdfDataUrl([unit], pdfFileName);
      }

      if (dataUrl) {
        const tenantKey = tenant?.id || 'default';
        const scopeKey = projectRefNo || selectedOppId || 'default';
        try {
          await savePdfData(`bidform_infra_${tenantKey}_${scopeKey}`, dataUrl);
          await savePdfData(`bidform_${tenantKey}_${scopeKey}`, dataUrl);
          if (selectedOppId) await savePdfData(`bidform_infra_${tenantKey}_${selectedOppId}`, dataUrl);
          if (projectRefNo) await savePdfData(`bidform_infra_${tenantKey}_${projectRefNo}`, dataUrl);
        } catch (dbErr) {
          console.warn('[BidFormInfra] IndexedDB caching error:', dbErr);
        }
      }

      if (onSaveAndComplete) {
        onSaveAndComplete(dataUrl, docTitle, projectRefNo, projectTitle);
      }
      if (onClose) onClose();
    } catch (err) {
      console.error('[BidFormInfra] Save Error:', err);
      if (onSaveAndComplete) {
        onSaveAndComplete(undefined, docTitle, projectRefNo, projectTitle);
      }
      if (onClose) onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-hidden print:p-0 print:bg-white print:static">

      {/* PORTRAIT LEGAL 8.5" x 13" PRINT STYLESHEET */}
      <style>{`
        @media print {
          @page {
            size: 8.5in 13in portrait;
            margin: 0mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .single-page-paper {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            width: 8.5in !important;
            height: 13in !important;
            max-height: 13in !important;
          }
          .no-export, .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Header Bar */}
      <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between print:hidden no-export shrink-0 shadow-lg z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl border bg-amber-500/10 text-amber-400 border-amber-500/20">
            <HardHat className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Bid Form for the Procurement of Infrastructure Projects</span>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-mono rounded border border-amber-500/40 font-bold">
                🏗️ INFRASTRUCTURE (GPPB Res. 09-2020)
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Statutory Financial Envelope Bid Form for Civil Works & Infrastructure Contracts (Philippine Bidding Documents 6th Edition)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md text-slate-950 bg-amber-500 hover:bg-amber-400 font-bold"
          >
            <Download className="w-4 h-4" />
            <span>Export Legal PDF</span>
          </button>

          <button
            onClick={() => setShowMetadataInputs(!showMetadataInputs)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{showMetadataInputs ? 'Hide Controls' : 'Edit Bid Controls'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save & Attach'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 flex flex-col items-center">

        {/* Opportunity Project Picker & Bid Controls Drawer */}
        {showMetadataInputs && (
          <div className="w-full max-w-4xl bg-slate-900 border border-amber-500/40 rounded-2xl p-4 sm:p-5 mb-6 shadow-xl space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>Infrastructure Project & Bid Price Controls</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                GPPB Standard Form SF-INFR-01
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Target Infrastructure Project</label>
                <select
                  value={selectedOppId}
                  onChange={(e) => handleSelectOpportunity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:border-amber-500 focus:outline-none"
                >
                  {oppProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.refNo}] {p.title.substring(0, 50)}...
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Total Bid Price in Figures (PHP)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 font-bold">₱</span>
                  <input
                    type="text"
                    value={totalBidAmountFigures}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTotalBidAmountFigures(val);
                      const num = parseNum(val);
                      setTotalBidAmountWords(num > 0 ? numberToWords(num) : 'ZERO PESOS ONLY');
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-amber-300 font-bold font-mono text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Procuring Entity (BAC)</label>
                <input
                  type="text"
                  value={procuringEntity}
                  onChange={(e) => setProcuringEntity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Supplemental / Bid Bulletins</label>
                <input
                  type="text"
                  value={bidBulletins}
                  onChange={(e) => setBidBulletins(e.target.value)}
                  placeholder="e.g. Bid Bulletin No. 1 & 2 (or None)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Bid Validity Period (Calendar Days)</label>
                <input
                  type="text"
                  value={bidValidityDays}
                  onChange={(e) => setBidValidityDays(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Contract Works Duration (Calendar Days)</label>
                <input
                  type="text"
                  value={completionCalendarDays}
                  onChange={(e) => setCompletionCalendarDays(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Total Bid Price in Words Preview Banner */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
                Auto-Converted Total Bid Price in Words:
              </span>
              <p className="text-xs font-serif font-bold uppercase leading-snug tracking-wide text-amber-300">
                {totalBidAmountWords || 'ZERO PESOS ONLY'}
              </p>
            </div>
          </div>
        )}

        {/* 8.5" x 13" LEGAL PORTRAIT CANVAS SHEET */}
        <div
          id="bidform-infra-paper-container"
          className="bidform-infra-paper single-page-paper bg-white text-black font-serif p-5 w-[8.5in] max-w-[8.5in] min-h-[13in] max-h-[13in] aspect-[8.5/13] mx-auto text-left relative shadow-2xl print:m-0 print:p-4 print:border-none print:shadow-none overflow-hidden flex flex-col justify-between border-2 border-black rounded-2xl"
          style={{ width: '8.5in', height: '13in', boxSizing: 'border-box' }}
        >
          {/* Outer Legal Frame Border Box */}
          <div className="w-full h-full border-2 border-black rounded-xl p-4 sm:p-5 flex flex-col justify-between relative bg-white overflow-hidden space-y-1.5">

            {/* Centered Header Title Block */}
            <div className="text-center border-b-2 border-black pb-1 shrink-0">
              <h1 className="text-xs sm:text-sm font-bold font-serif uppercase tracking-wider text-black">
                Bid Form for the Procurement of Infrastructure Projects
              </h1>
              <p className="text-[9.5px] italic text-black font-serif font-semibold">
                [shall be submitted with the Bid]
              </p>
            </div>

            {/* Header Metadata Row */}
            <div className="py-0.5 border-b border-black/60 font-serif text-[10.5px] leading-tight space-y-0.5 shrink-0">
              <div className="text-center">
                <h2 className="font-bold text-xs sm:text-sm tracking-wider uppercase text-black font-serif">
                  BID FORM
                </h2>
              </div>
              <div className="text-right space-y-0.5 text-[10px] text-black font-serif font-medium">
                <div>
                  <span className="font-bold">Date of Submission : </span>
                  <span className="font-bold underline">{dateSubmitted}</span>
                </div>
                <div>
                  <span className="font-bold">Project Identification No. : </span>
                  <span className="font-bold underline">{projectRefNo}</span>
                </div>
                {solicitationNumber && solicitationNumber !== 'N/A' && (
                  <div>
                    <span className="font-bold">Solicitation No. : </span>
                    <span className="font-bold underline">{solicitationNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Addressed To */}
            <div className="text-[10.5px] font-serif space-y-0.5 text-black shrink-0">
              <p><span className="font-bold">To: </span> <span className="font-bold uppercase underline">{procuringEntity}</span></p>
              {procuringEntityAddress && (
                <p className="text-black font-semibold text-[10px] uppercase">{procuringEntityAddress}</p>
              )}
              <p className="text-black font-semibold text-[10px]">
                The Bids and Awards Committee (BAC) Chairman and Members
              </p>
            </div>

            {/* Opening Preamble */}
            <p className="text-[10px] font-serif text-black text-justify leading-snug font-normal">
              Having examined the Philippine Bidding Documents (PBDs) including the Supplemental or Bid Bulletin Numbers{' '}
              <span className="font-bold underline">{bidBulletins || 'None'}</span>
              , the receipt of which is hereby duly acknowledged, we, the undersigned, declare that:
            </p>

            {/* Statutory Clauses (Points a to i Verbatim from GPPB Resolution 09-2020 for Infrastructure) */}
            <div className="space-y-1 text-[10px] font-serif text-black leading-tight">
              <div className="flex gap-1.5 items-start">
                <span className="font-bold shrink-0">a.</span>
                <p className="text-justify font-normal text-black">
                  We have no reservation to the PBDs, including the Supplemental or Bid Bulletins, for the Procurement Project:{' '}
                  <span className="font-bold uppercase text-black underline">{projectTitle}</span>;
                </p>
              </div>

              <div className="flex gap-1.5 items-start">
                <span className="font-bold shrink-0">b.</span>
                <p className="text-justify font-normal text-black">
                  We offer to execute the Works for this Contract in accordance with the PBDs;
                </p>
              </div>

              <div className="flex gap-1.5 items-start">
                <span className="font-bold shrink-0">c.</span>
                <div className="space-y-0.5 w-full">
                  <p className="text-justify font-normal text-black">
                    The total price of our Bid in words and figures, excluding any discounts offered below is:
                  </p>
                  <div className="p-1.5 rounded bg-slate-50 border-2 border-black font-serif space-y-0.5 my-0.5">
                    <p className="font-bold text-[10.5px] uppercase underline tracking-wide text-black">
                      {totalBidAmountWords || 'ZERO PESOS ONLY'}
                    </p>
                    <p className="font-bold text-[11px] text-black font-mono">
                      (Php {totalBidAmountFigures || '0.00'})
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-1.5 items-start">
                <span className="font-bold shrink-0">d.</span>
                <p className="text-justify font-normal text-black">
                  The discounts offered and the methodology for their application are:{' '}
                  <span className="font-bold underline">{discountsOffered}</span>;
                </p>
              </div>

              <div className="flex gap-1.5 items-start">
                <span className="font-bold shrink-0">e.</span>
                <p className="text-justify font-normal text-black">
                  The total bid price includes the cost of all taxes, such as, but not limited to: value added tax (VAT), income tax, local taxes, and other fiscal levies and duties, which are itemized in the Bill of Quantities;
                </p>
              </div>

              <div className="flex gap-1.5 items-start">
                <span className="font-bold shrink-0">f.</span>
                <p className="text-justify font-normal text-black">
                  Our Bid shall be valid within the period stated in the PBDs (<span className="font-bold underline">{bidValidityDays} calendar days</span> from the date of the Bid opening), and it shall remain binding upon us and may be accepted at any time before the expiration of that period;
                </p>
              </div>

              <div className="flex gap-1.5 items-start">
                <span className="font-bold shrink-0">g.</span>
                <p className="text-justify font-normal text-black">
                  If our Bid is accepted, we commit to obtain a Performance Security in the amount of{' '}
                  <span className="font-bold underline">{performanceSecurityPercent} percent</span> of the Contract Price for the due performance of the Contract, or a Performance Securing Declaration in lieu of the allowable forms of Performance Security;
                </p>
              </div>

              <div className="flex gap-1.5 items-start">
                <span className="font-bold shrink-0">h.</span>
                <p className="text-justify font-normal text-black">
                  We are not participating, as Bidders, in more than one Bid in this bidding process, other than alternative offers in accordance with the Bidding Documents;
                </p>
              </div>

              <div className="flex gap-1.5 items-start">
                <span className="font-bold shrink-0">i.</span>
                <p className="text-justify font-normal text-black">
                  We understand that this Bid, together with your written acceptance thereof included in your notification of award, shall constitute a binding contract between us, until a formal Contract is prepared and executed; and
                </p>
              </div>

              <div className="flex gap-1.5 items-start">
                <span className="font-bold shrink-0">j.</span>
                <p className="text-justify font-normal text-black">
                  We understand that you are not bound to accept the Lowest Calculated Bid or any other Bid that you may receive.
                </p>
              </div>

              <div className="flex gap-1.5 items-start">
                <span className="font-bold shrink-0">k.</span>
                <p className="text-justify font-normal text-black">
                  We acknowledge that failure to sign each and every page of this Bid Form, including the Bill of Quantities, shall be a ground for the rejection of our bid.
                </p>
              </div>
            </div>

            {/* Bottom Signatory & QR Block */}
            <div className="pt-2 border-t-2 border-black flex items-end justify-between shrink-0 font-serif">
              <div className="space-y-0.5 text-left text-[10px]">
                <p className="text-slate-600 font-semibold uppercase text-[9px]">Duly authorized to sign the Bid for and on behalf of:</p>
                <p className="font-bold text-xs uppercase text-black">{companyName || 'BIDDING ENTERPRISE CORP.'}</p>
                <p className="text-slate-700 text-[9.5px]">{companyAddress}</p>
                
                <div className="pt-2">
                  <p className="font-bold text-xs uppercase underline text-black tracking-wide">{signatoryName}</p>
                  <p className="text-black font-semibold text-[9.5px]">{signatoryTitle}</p>
                  <p className="text-slate-600 text-[9px]">Authority: <span className="font-semibold">{writtenAuthority}</span></p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right text-[8.5px] font-mono text-slate-500">
                  <div className="font-bold text-black uppercase">GPPB INFR-01</div>
                  <div>Ref: {projectRefNo}</div>
                </div>
                <DocumentQrCode
                  details={{
                    documentNumber: `FIN-BIDFORM-INFRA-${projectRefNo || 'PROJECT'}`,
                    documentName: 'Bid Form for Infrastructure Projects',
                    projectName: projectTitle,
                    companyName: companyName,
                    solicitationNo: solicitationNumber
                  }}
                  size={65}
                  className="border border-black p-0.5 bg-white shrink-0"
                />
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export const BidFormForInfrastructureModal: React.FC<BidFormForInfrastructureModalProps> = (props) => (
  <VaultErrorBoundary fallbackTitle="Bid Form for Infrastructure Modal">
    <BidFormForInfrastructureModalContent {...props} />
  </VaultErrorBoundary>
);

export default BidFormForInfrastructureModal;

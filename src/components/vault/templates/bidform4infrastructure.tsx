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
  Edit3,
  HardHat,
  CheckCircle2,
  ShieldCheck,
  FolderKanban
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
  const [signatoryName] = useState(tenant?.authorizedSignatory?.name || 'Authorized Managing Officer');
  const [signatoryTitle] = useState(tenant?.authorizedSignatory?.title || 'Authorized Managing Officer / President');

  // Performance Security Parameters
  const [performanceSecurityOption, setPerformanceSecurityOption] = useState<'PERFORMANCE_BOND' | 'PSD' | 'MANAGERS_CHECK'>('PERFORMANCE_BOND');
  const [performanceSecurityPercent, setPerformanceSecurityPercent] = useState('thirty (30)');
  const [bidValidityDays, setBidValidityDays] = useState('120');
  const [completionCalendarDays, setCompletionCalendarDays] = useState('180');

  // Performance Security Option Selector Helper
  const handlePerformanceSecurityChange = (option: 'PERFORMANCE_BOND' | 'PSD' | 'MANAGERS_CHECK') => {
    setPerformanceSecurityOption(option);
    if (option === 'PERFORMANCE_BOND') {
      setPerformanceSecurityPercent('thirty (30)');
    } else if (option === 'MANAGERS_CHECK') {
      setPerformanceSecurityPercent('ten (10)');
    } else {
      setPerformanceSecurityPercent('N/A');
    }
  };

  // Discounts Offered
  const [discountsOffered, setDiscountsOffered] = useState('No discounts offered');

  // Financial Bid Amount
  const [totalBidAmountFigures, setTotalBidAmountFigures] = useState('0.00');
  const [totalBidAmountWords, setTotalBidAmountWords] = useState('ZERO PESOS ONLY');
  const [bidBulletins, setBidBulletins] = useState('');

  // UI state
  const [showMetadataInputs, setShowMetadataInputs] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Helper to sync strictly from this specific project's Form L / Detailed Estimates / BOQ
  const syncFromDetailedEstimates = (targetRefNo?: string, targetOppId?: string) => {
    const tenantId = tenant?.id || 'default';
    if (!targetRefNo && !targetOppId) {
      setTotalBidAmountFigures('0.00');
      setTotalBidAmountWords('ZERO PESOS ONLY');
      return;
    }

    // 1. Primary Statutory Authority for Duration / Delivery Schedule: Section VI Schedule of Requirements
    const secViKeys = [
      targetRefNo ? `bidocs_sec_vi_${tenantId}_${targetRefNo}` : '',
      targetOppId ? `bidocs_sec_vi_${tenantId}_${targetOppId}` : ''
    ].filter(Boolean);

    for (const key of secViKeys) {
      const savedSec = localStorage.getItem(key);
      if (savedSec) {
        try {
          const parsed = JSON.parse(savedSec);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const validDelivered = parsed
              .map((it: any) => (it.delivered || '').trim())
              .filter(Boolean);

            if (validDelivered.length > 0) {
              const uniqueSchedules = Array.from(new Set(validDelivered));
              setCompletionCalendarDays(uniqueSchedules.join(', '));
              break;
            }
          }
        } catch (_) {}
      }
    }

    const keysToCheck = [
      targetRefNo ? `bidocs_detailed_estimates_${tenantId}_${targetRefNo}` : '',
      targetOppId ? `bidocs_detailed_estimates_${tenantId}_${targetOppId}` : '',
      targetRefNo ? `bidocs_boq_${tenantId}_${targetRefNo}` : '',
      targetOppId ? `bidocs_boq_${tenantId}_${targetOppId}` : '',
      targetRefNo ? `bidocs_detailed_estimates_${targetRefNo}` : '',
      targetOppId ? `bidocs_detailed_estimates_${targetOppId}` : ''
    ].filter(Boolean);

    for (const key of keysToCheck) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed) {
            // Verify project scope match
            if (targetRefNo && parsed.projectRefNo && parsed.projectRefNo !== targetRefNo && parsed.projectRefNo !== targetOppId) {
              continue;
            }

            if (parsed.ownerName && parsed.ownerName.trim()) {
              setProcuringEntity(parsed.ownerName.trim().toUpperCase());
            }
            if (parsed.projectLocation && parsed.projectLocation.trim()) {
              setProcuringEntityAddress(parsed.projectLocation.trim());
            }
            if (parsed.solicitationNumber && parsed.solicitationNumber !== 'N/A') {
              setSolicitationNumber(parsed.solicitationNumber);
            }
            if (parsed.estimateDate) {
              const d = new Date(parsed.estimateDate);
              if (!isNaN(d.getTime())) {
                setDateSubmitted(d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
              }
            }
            if (parsed.projectName && parsed.projectName.trim()) {
              setProjectTitle(parsed.projectName.trim());
            }
            if (parsed.deliverySchedule && parsed.deliverySchedule.trim()) {
              setCompletionCalendarDays(parsed.deliverySchedule.trim());
            }

            let num = 0;
            if (typeof parsed.totalEstimatedProjectCost === 'number' && parsed.totalEstimatedProjectCost > 0) {
              num = parsed.totalEstimatedProjectCost;
            } else if (typeof parsed.grandTotal === 'number' && parsed.grandTotal > 0) {
              num = parsed.grandTotal;
            } else if (typeof parsed.totalBidAmount === 'number' && parsed.totalBidAmount > 0) {
              num = parsed.totalBidAmount;
            } else if (parsed.totalBidAmountFigures) {
              num = parseFloat(`${parsed.totalBidAmountFigures}`.replace(/,/g, '')) || 0;
            } else if (Array.isArray(parsed) && parsed.length > 0) {
              // Array of BOQ rows
              num = parsed.reduce((sum: number, r: any) => sum + (Number(r.amount || r.totalAmount || (r.quantity * r.unitPrice)) || 0), 0);
            } else if (parsed.materials && Array.isArray(parsed.materials)) {
              num = parsed.materials.reduce((sum: number, m: any) => sum + (Number(m.quantity) || 0) * (Number(m.unitPrice) || 0), 0);
            }

            if (num > 0) {
              const formattedFig = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              const words = parsed.totalBidAmountWords || numberToWords(num);
              setTotalBidAmountFigures(formattedFig);
              setTotalBidAmountWords(words);
              return;
            }
          }
        }
      } catch (_) {}
    }

    // Fallback if not yet estimated: reset to 0.00
    setTotalBidAmountFigures('0.00');
    setTotalBidAmountWords('ZERO PESOS ONLY');
  };

  // Load Opportunity Projects and auto-fill + saved settings
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
    const tenantId = tenant?.id || 'default';

    // Restore saved user selections for this project
    try {
      const savedRaw = localStorage.getItem(`bidocs_bidform_infra_${tenantId}_${targetRef}`);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (saved.performanceSecurityOption) setPerformanceSecurityOption(saved.performanceSecurityOption);
        if (saved.performanceSecurityPercent) setPerformanceSecurityPercent(saved.performanceSecurityPercent);
        if (saved.bidValidityDays) setBidValidityDays(saved.bidValidityDays);
        if (saved.completionCalendarDays) setCompletionCalendarDays(saved.completionCalendarDays);
        if (saved.discountsOffered) setDiscountsOffered(saved.discountsOffered);
        if (saved.bidBulletins) setBidBulletins(saved.bidBulletins);
        if (saved.totalBidAmountFigures && saved.totalBidAmountFigures !== '0.00') {
          setTotalBidAmountFigures(saved.totalBidAmountFigures);
          setTotalBidAmountWords(saved.totalBidAmountWords || numberToWords(parseNum(saved.totalBidAmountFigures)));
          return;
        }
      }
    } catch (_) {}

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

      // Check saved for this opportunity
      const tenantId = tenant?.id || 'default';
      try {
        const savedRaw = localStorage.getItem(`bidocs_bidform_infra_${tenantId}_${found.refNo}`);
        if (savedRaw) {
          const saved = JSON.parse(savedRaw);
          if (saved.performanceSecurityOption) setPerformanceSecurityOption(saved.performanceSecurityOption);
          if (saved.performanceSecurityPercent) setPerformanceSecurityPercent(saved.performanceSecurityPercent);
          if (saved.bidValidityDays) setBidValidityDays(saved.bidValidityDays);
          if (saved.completionCalendarDays) setCompletionCalendarDays(saved.completionCalendarDays);
          if (saved.discountsOffered) setDiscountsOffered(saved.discountsOffered);
          if (saved.bidBulletins) setBidBulletins(saved.bidBulletins);
          if (saved.totalBidAmountFigures && saved.totalBidAmountFigures !== '0.00') {
            setTotalBidAmountFigures(saved.totalBidAmountFigures);
            setTotalBidAmountWords(saved.totalBidAmountWords || numberToWords(parseNum(saved.totalBidAmountFigures)));
            return;
          }
        }
      } catch (_) {}

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
      const tenantKey = tenant?.id || 'default';
      const scopeKey = projectRefNo || selectedOppId || 'default';

      // Save form state to local storage
      try {
        const payload = {
          projectRefNo,
          projectTitle,
          procuringEntity,
          procuringEntityAddress,
          solicitationNumber,
          dateSubmitted,
          performanceSecurityOption,
          performanceSecurityPercent,
          bidValidityDays,
          completionCalendarDays,
          totalBidAmountFigures,
          totalBidAmountWords,
          discountsOffered,
          bidBulletins
        };
        localStorage.setItem(`bidocs_bidform_infra_${tenantKey}_${scopeKey}`, JSON.stringify(payload));
        if (projectRefNo) localStorage.setItem(`bidocs_bidform_infra_${tenantKey}_${projectRefNo}`, JSON.stringify(payload));
        if (selectedOppId) localStorage.setItem(`bidocs_bidform_infra_${tenantKey}_${selectedOppId}`, JSON.stringify(payload));
      } catch (lsErr) {
        console.warn('[BidFormInfra] localStorage cache note:', lsErr);
      }

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

        {/* PROMINENT ACTIVE TARGET INFRASTRUCTURE PROJECT SELECTOR */}
        {oppProjects.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-1.5 shadow-inner">
            <FolderKanban className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono font-bold text-amber-300 uppercase">
                  Target Bidding Project:
                </span>
              </div>
              <select
                value={selectedOppId}
                onChange={(e) => handleSelectOpportunity(e.target.value)}
                className="bg-transparent text-white font-mono font-bold text-xs focus:outline-none cursor-pointer pr-2 max-w-[280px] truncate"
              >
                <option value="" className="bg-slate-900 text-slate-400">-- Select Opportunity Project --</option>
                {oppProjects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    [{p.refNo}] {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

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
            <span>{showMetadataInputs ? 'Hide Full Controls' : 'Edit Full Bid Controls'}</span>
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

        {/* ALWAYS-VISIBLE PROMINENT PERFORMANCE SECURITY SELECTOR BAR */}
        <div className="w-full max-w-4xl bg-slate-900 border border-amber-500/40 rounded-2xl p-3.5 sm:p-4 mb-4 shadow-xl print:hidden no-export space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                Clause (g) Performance Security Form Selector:
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Click an option below to update the legal text instantly
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            {/* Option 1: PSD */}
            <button
              type="button"
              onClick={() => handlePerformanceSecurityChange('PSD')}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                performanceSecurityOption === 'PSD'
                  ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg ring-2 ring-amber-400/50'
                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                  🛡️ Option 1: PSD
                </span>
                {performanceSecurityOption === 'PSD' && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
              </div>
              <p className="text-[11px] leading-tight text-slate-300 font-sans">
                Performance Securing Declaration (In lieu of cash/surety bond)
              </p>
            </button>

            {/* Option 2: Performance Bond (30%) */}
            <button
              type="button"
              onClick={() => handlePerformanceSecurityChange('PERFORMANCE_BOND')}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                performanceSecurityOption === 'PERFORMANCE_BOND'
                  ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg ring-2 ring-amber-400/50'
                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                  📄 Option 2: Performance Bond (30%)
                </span>
                {performanceSecurityOption === 'PERFORMANCE_BOND' && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
              </div>
              <p className="text-[11px] leading-tight text-slate-300 font-sans">
                Surety Bond callable upon demand (thirty percent of Contract Price)
              </p>
            </button>

            {/* Option 3: Manager's Check (10%) */}
            <button
              type="button"
              onClick={() => handlePerformanceSecurityChange('MANAGERS_CHECK')}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                performanceSecurityOption === 'MANAGERS_CHECK'
                  ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg ring-2 ring-amber-400/50'
                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                  🏦 Option 3: Check / Cash (10%)
                </span>
                {performanceSecurityOption === 'MANAGERS_CHECK' && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
              </div>
              <p className="text-[11px] leading-tight text-slate-300 font-sans">
                Cash / Manager&apos;s Check / Bank Guarantee (ten percent)
              </p>
            </button>
          </div>
        </div>

        {/* Opportunity Project Picker & Full Bid Controls Drawer */}
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
                <label className="block text-slate-400 font-semibold mb-1">Procuring Entity Address</label>
                <input
                  type="text"
                  value={procuringEntityAddress}
                  onChange={(e) => setProcuringEntityAddress(e.target.value)}
                  placeholder="e.g. Provincial Capitol, Tagbilaran City"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Project Ref / ID Number</label>
                <input
                  type="text"
                  value={projectRefNo}
                  onChange={(e) => setProjectRefNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Solicitation Number</label>
                <input
                  type="text"
                  value={solicitationNumber}
                  onChange={(e) => setSolicitationNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Date of Bid Submission</label>
                <input
                  type="text"
                  value={dateSubmitted}
                  onChange={(e) => setDateSubmitted(e.target.value)}
                  placeholder="e.g. March 19, 2026"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Discounts Offered (Clause d)</label>
                <input
                  type="text"
                  value={discountsOffered}
                  onChange={(e) => setDiscountsOffered(e.target.value)}
                  placeholder="e.g. No discounts offered (or 5% discount on total bid)"
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
                  placeholder="e.g. 180 Calendar Days"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Performance Security %</label>
                <input
                  type="text"
                  value={performanceSecurityOption === 'PSD' ? 'In lieu of security' : performanceSecurityPercent}
                  onChange={(e) => setPerformanceSecurityPercent(e.target.value)}
                  disabled={performanceSecurityOption === 'PSD'}
                  placeholder="e.g. thirty (30)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-amber-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* 1. Centered Header Title Block */}
            <div className="text-center pb-1 shrink-0">
              <h1 className="text-sm font-bold font-serif uppercase tracking-wider text-black">
                Bid Form for the Procurement of Infrastructure Projects
              </h1>
              <p className="text-[10px] italic text-black font-serif font-semibold">
                [shall be submitted with the Bid]
              </p>
              <hr className="border-t border-black my-1" />
            </div>

            {/* 2. Header Metadata Row */}
            <div className="py-0.5 font-serif text-[10.5px] leading-tight space-y-0.5 shrink-0 text-black">
              <div className="text-center">
                <h2 className="font-bold text-xs sm:text-sm tracking-wider uppercase text-black font-serif">
                  BID FORM
                </h2>
              </div>
              <div className="text-right space-y-0.5 text-[10px] text-black font-serif font-medium">
                <div>
                  <span className="font-bold">Date : </span>
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

            {/* 3. Addressed To */}
            <div className="text-[10.5px] font-serif space-y-0.5 text-black shrink-0">
              <p><span className="font-bold">To: </span> <span className="font-bold uppercase underline text-black">{procuringEntity}</span></p>
              {procuringEntityAddress && (
                <p className="text-black font-semibold text-[10px] uppercase">{procuringEntityAddress}</p>
              )}
              <p className="text-black font-semibold text-[10px]">
                The Bids and Awards Committee (BAC) Chairman and Members
              </p>
            </div>

            {/* 4. Opening Preamble */}
            <p className="text-[10px] font-serif text-black text-justify leading-snug font-normal">
              Having examined the Philippine Bidding Documents (PBDs) including the Supplemental or Bid Bulletin Numbers{' '}
              <span className="font-bold underline text-black">{bidBulletins || 'None'}</span>
              , the receipt of which is hereby duly acknowledged, we, the undersigned, declare that:
            </p>

            {/* 5. Statutory Clauses (Points a to l Verbatim from GPPB Resolution 09-2020) */}
            <div className="space-y-1 text-[9.5px] font-serif text-black leading-snug">
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
                  <div className="p-1 rounded bg-slate-50 border border-black font-serif space-y-0.5 my-0.5">
                    <p className="font-bold text-[10px] uppercase underline tracking-wide text-black">
                      {totalBidAmountWords || 'ZERO PESOS ONLY'}
                    </p>
                    <p className="font-bold text-[10.5px] text-black font-mono">
                      (Php {totalBidAmountFigures || '0.00'})
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-1.5 items-start">
                <span className="font-bold shrink-0">d.</span>
                <p className="text-justify font-normal text-black">
                  The discounts offered and the methodology for their application are:{' '}
                  <span className="font-bold underline text-black">{discountsOffered || 'None'}</span>;
                </p>
              </div>

              <div className="flex gap-1.5 items-start">
                <span className="font-bold shrink-0">e.</span>
                <p className="text-justify font-normal text-black">
                  The total bid price includes the cost of all taxes, such as, but not limited to: <span className="italic font-semibold text-black">(i) value added tax (VAT), (ii) income tax, (iii) local taxes, and (iv) other fiscal levies and duties</span>, which are itemized herein and reflected in the detailed estimates;
                </p>
              </div>

              <div className="flex gap-1.5 items-start">
                <span className="font-bold shrink-0">f.</span>
                <p className="text-justify font-normal text-black">
                  Our Bid shall be valid within the a period stated in the PBDs (<span className="font-bold underline text-black">{bidValidityDays} calendar days</span> from the date of the Bid opening), and it shall remain binding upon us at any time before the expiration of that period;
                </p>
              </div>

              <div className="flex gap-1.5 items-start">
                <span className="font-bold shrink-0">g.</span>
                {performanceSecurityOption === 'PSD' ? (
                  <p className="text-justify font-normal text-black">
                    If our Bid is accepted, we commit to submit a <span className="font-bold underline uppercase text-black">Performance Securing Declaration</span> in lieu of the allowable forms of Performance Security for the due performance of the Contract, subject to the terms and conditions of issued GPPB guidelines¹ for this purpose;
                  </p>
                ) : performanceSecurityOption === 'MANAGERS_CHECK' ? (
                  <p className="text-justify font-normal text-black">
                    If our Bid is accepted, we commit to obtain a Performance Security in the form of <span className="font-bold underline text-black">Cash, Cashier&apos;s / Manager&apos;s Check, Bank Draft/Guarantee or Irrevocable Letter of Credit</span> in the amount of <span className="font-bold underline text-black">{performanceSecurityPercent || 'ten (10)'} percent</span> of the Contract Price for the due performance of the Contract, subject to the terms and conditions of issued GPPB guidelines¹ for this purpose;
                  </p>
                ) : (
                  <p className="text-justify font-normal text-black">
                    If our Bid is accepted, we commit to obtain a Performance Security in the form of a <span className="font-bold underline text-black">Performance Bond / Surety Bond</span> callable upon demand in the amount of <span className="font-bold underline text-black">{performanceSecurityPercent || 'thirty (30)'} percent</span> of the Contract Price for the due performance of the Contract, subject to the terms and conditions of issued GPPB guidelines¹ for this purpose;
                  </p>
                )}
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
                  We likewise certify/confirm that the undersigned, is the duly authorized representative of the bidder, and granted full power and authority to do, execute and perform any and all acts necessary to participate, submit the bid, and to sign and execute the ensuing contract for the <span className="font-bold uppercase underline text-black">{projectTitle}</span> of the <span className="font-bold uppercase underline text-black">{procuringEntity}</span>.
                </p>
              </div>

              <div className="flex gap-1.5 items-start">
                <span className="font-bold shrink-0">l.</span>
                <p className="text-justify font-bold text-black">
                  We acknowledge that failure to sign each and every page of this Bid Form, including the Bill of Quantities, shall be a ground for the rejection of our bid.
                </p>
              </div>
            </div>

            {/* Footnote */}
            <div className="text-[8.5px] font-serif italic text-black/80 pt-0.5 border-t border-black/40">
              ¹ currently based on GPPB Resolution No. 09-2020
            </div>

            {/* 6. Statutory Signatory & QR Block */}
            <div className="pt-1 font-serif text-[9.5px] text-black border-t border-slate-300 flex items-end justify-between">
              <div className="grid grid-cols-1 gap-0.5">
                <p>
                  <span className="font-bold">Name: </span>
                  <span className="font-bold uppercase underline text-black">{signatoryName}</span>
                </p>
                <p>
                  <span className="font-bold">Legal Capacity: </span>
                  <span className="font-semibold underline text-black">{signatoryTitle}</span>
                </p>
                <p>
                  <span className="font-bold">Signature: </span>
                  <span className="inline-block border-b border-black w-72"></span>
                </p>
                <p>
                  <span className="font-bold">Duly authorized to sign the Bid for and behalf of: </span>
                  <span className="font-bold uppercase underline text-black">{companyName || 'BIDDING ENTERPRISE CORP.'}</span>
                </p>
                <p>
                  <span className="font-bold">Date: </span>
                  <span className="font-bold underline text-black">{dateSubmitted}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right text-[8px] font-mono text-slate-500">
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
                  size={58}
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

import React, { useState, useEffect } from 'react';
import { Tenant } from '../../../types';
import { generateAndDownloadThreeLayerPdf, buildMergedThreeLayerPdfDataUrl, ExportDocumentUnit } from '../../../utils/pdfExportEngine';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import DocumentQrCode from '../../common/DocumentQrCode';
import VaultErrorBoundary from '../../common/VaultErrorBoundary';
import {
  X,
  Printer,
  Download,
  Building2,
  ShieldCheck,
  Calculator,
  CheckCircle2,
  FileText,
  Edit3,
  Lock
} from 'lucide-react';

export interface NfccModalProps {
  item?: { id: string; code: string; name: string };
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  solicitationNumber?: string;
  dateTimeSubmitted?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose?: () => void;
}

// Helper to parse numbers with comma support
const parseNum = (val: string): number => {
  if (!val) return 0;
  const cleaned = val.replace(/,/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

// Helper to format currency number with commas and 2 decimal places (e.g. 1,000,000.00)
const formatCurrency = (num: number): string => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Helper to clean ISO T-timestamps for Date-only fields (e.g., "September 30, 2026")
const formatCleanDateString = (raw: string): string => {
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

// Helper to format clean Date & Time string including Time (e.g., "September 30, 2026 at 10:00 AM")
const formatCleanDateTimeWithTime = (raw: string): string => {
  if (!raw) return 'March 19, 2026 at 10:00 AM';

  let s = raw.trim();
  // If already formatted nicely with month name and time, return directly
  if (/^[A-Za-z]+\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}/i.test(s)) {
    return s;
  }

  // Parse ISO strings like "2026-09-30T10:00:00Z" or "2026-09-30 T 10:00"
  let cleaned = s.replace(/\s*T\s*/gi, ' ').trim();
  cleaned = cleaned.replace(/\s+at\s+/gi, ' ').trim();

  try {
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      const datePart = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${datePart} at ${timePart}`;
    }
  } catch {}

  // Fallback: If it's a date without time (e.g. "September 30, 2026"), append default time
  if (!s.toLowerCase().includes('at') && !s.includes(':')) {
    return `${s} at 10:00 AM`;
  }

  return s;
};

// Helper to retrieve and compute total uncompleted ongoing contracts strictly for the selected project
const fetchOngoingContractsTotal = (tenantId?: string, projectRefNo?: string, oppId?: string): number => {
  if (!tenantId) return 0;

  const candidateKeys = [
    oppId ? `bidocs_ongoing_total_${tenantId}_${oppId}` : null,
    projectRefNo ? `bidocs_ongoing_total_${tenantId}_${projectRefNo}` : null,
  ].filter(Boolean) as string[];

  // 1. Check direct project total key
  for (const key of candidateKeys) {
    const directTotal = localStorage.getItem(key);
    if (directTotal !== null && directTotal !== undefined && !isNaN(parseFloat(directTotal))) {
      return parseFloat(directTotal);
    }
  }

  // 2. Check project-scoped ongoing contracts array
  const arrayKeys = [
    oppId ? `bidocs_ongoing_${tenantId}_${oppId}` : null,
    projectRefNo ? `bidocs_ongoing_${tenantId}_${projectRefNo}` : null,
  ].filter(Boolean) as string[];

  for (const key of arrayKeys) {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sum = parsed.reduce((acc: number, row: any) => {
            const comp = parseFloat((row.amountCompletion || '').replace(/[^0-9.]/g, '')) || 0;
            const award = parseFloat((row.amountAward || '').replace(/[^0-9.]/g, '')) || 0;
            return acc + (comp > 0 ? comp : award);
          }, 0);
          return sum;
        }
      } catch (e) {}
    }
  }

  return 0;
};

export const NfccModalContent: React.FC<NfccModalProps> = ({
  item,
  tenant,
  activeProjectRefNo = '',
  activeProjectTitle = '',
  activeProcuringEntity = '',
  solicitationNumber: propSolicitationNumber = '',
  dateTimeSubmitted: propDateTimeSubmitted = '',
  onSaveAndComplete,
  onClose
}) => {
  // Opportunity Projects Dropdown
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  // Signatory & Company Info
  const [companyName, setCompanyName] = useState<string>(
    tenant?.companyName || 'QUANTUM CLOUD CORPORATION'
  );
  const [signatoryName, setSignatoryName] = useState<string>(
    tenant?.authorizedSignatory?.name || 'Mark-Vin F. Ocampo'
  );
  const [signatoryTitle, setSignatoryTitle] = useState<string>(
    tenant?.authorizedSignatory?.title || 'President'
  );
  const [signatoryDate, setSignatoryDate] = useState<string>(
    formatCleanDateString(propDateTimeSubmitted) || 'Mar. 19, 2026'
  );

  // Document Metadata Fields
  const [procuringEntityLocation, setProcuringEntityLocation] = useState<string>(
    activeProcuringEntity ? activeProcuringEntity.toUpperCase() : 'MUNICIPALITY OF LA TRINIDAD'
  );
  const [projectRefNo, setProjectRefNo] = useState<string>(activeProjectRefNo || '12795242');
  const [projectTitle, setProjectTitle] = useState<string>(
    activeProjectTitle ||
    'SUPPLY, DELIVERY, INSTALLATION, TESTING, AND CONFIGURATION OF ICT EQUIPMENT, PERIPHERALS, SYSTEMS AND SOFTWARE FOR THE LA TRINIDAD COMMUNICATION, INFORMATION & NETWORK HUB'
  );
  const [projectLocation, setProjectLocation] = useState<string>(
    activeProcuringEntity ? activeProcuringEntity.toUpperCase() : 'MUNICIPALITY OF LA TRINIDAD'
  );
  const [standardFormNo, setStandardFormNo] = useState<string>(propSolicitationNumber || '2025-12-4162-MO');
  const [submissionDateTime, setSubmissionDateTime] = useState<string>(
    formatCleanDateTimeWithTime(propDateTimeSubmitted)
  );

  // Fiscal Year for Table Header
  const [fiscalYear, setFiscalYear] = useState<string>('2025');

  // Financial Figures (Default matching user template sample with clean comma & decimal formatting)
  const [totalAssets, setTotalAssets] = useState<string>('2,342,487.00');
  const [currentAssets, setCurrentAssets] = useState<string>('1,877,225.00');
  const [totalLiabilities, setTotalLiabilities] = useState<string>('2,134.00');
  const [currentLiabilities, setCurrentLiabilities] = useState<string>('2,134.00');
  const [kFactor, setKFactor] = useState<number>(15);
  const [ongoingContractsValue, setOngoingContractsValue] = useState<string>('0.00');

  // UI Control States
  const [showMetadataInputs, setShowMetadataInputs] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Sync ongoing contracts total strictly for selected project
  const syncOngoingTotal = (targetRefNo?: string, targetOppId?: string) => {
    const tenantId = tenant?.id || 'default';
    const total = fetchOngoingContractsTotal(
      tenantId,
      targetRefNo || projectRefNo || activeProjectRefNo,
      targetOppId || selectedOppId
    );
    setOngoingContractsValue(formatCurrency(total));
  };

  // Auto-Format Number on Blur
  const handleBlurFormat = (val: string, setter: (v: string) => void) => {
    if (!val.trim()) return;
    const num = parseNum(val);
    setter(formatCurrency(num));
    saveState();
  };

  // Dynamic Computations
  const numTotalAssets = parseNum(totalAssets);
  const numCurrentAssets = parseNum(currentAssets);
  const numTotalLiabilities = parseNum(totalLiabilities);
  const numCurrentLiabilities = parseNum(currentLiabilities);
  const numOngoing = parseNum(ongoingContractsValue);

  // 1. Net Worth = Total Assets - Total Liabilities
  const calculatedNetWorth = numTotalAssets - numTotalLiabilities;

  // 2. NFCC = [(Current Assets - Current Liabilities) * K] - Ongoing Contracts
  const netWorkingCapital = numCurrentAssets - numCurrentLiabilities;
  const calculatedNfcc = (netWorkingCapital * kFactor) - numOngoing;

  // Load Saved Draft & Opportunity Projects
  useEffect(() => {
    const tenantId = tenant?.id || 'default';
    const list = getOpportunityProjects(tenantId);
    setOppProjects(list);

    if (tenant?.companyName) setCompanyName(tenant.companyName);
    if (tenant?.authorizedSignatory?.name) setSignatoryName(tenant.authorizedSignatory.name);
    if (tenant?.authorizedSignatory?.title) setSignatoryTitle(tenant.authorizedSignatory.title);

    const initialRefNo = activeProjectRefNo || (list.length > 0 ? list[0].refNo : '');
    const initialOppId = list.length > 0 ? list[0].id : '';

    // Auto-sync ongoing contracts total strictly for this project
    const autoOngoing = fetchOngoingContractsTotal(tenantId, initialRefNo, initialOppId);
    setOngoingContractsValue(formatCurrency(autoOngoing));

    const storageKey = `bidocs_nfcc_${tenantId}_${initialRefNo || 'default'}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.procuringEntityLocation) setProcuringEntityLocation(parsed.procuringEntityLocation.replace(/,\s*BENGUET$/i, ''));
        if (parsed.projectRefNo) setProjectRefNo(parsed.projectRefNo);
        if (parsed.projectTitle) setProjectTitle(parsed.projectTitle);
        if (parsed.projectLocation) setProjectLocation(parsed.projectLocation.replace(/,\s*BENGUET$/i, ''));
        if (parsed.standardFormNo) setStandardFormNo(parsed.standardFormNo);
        if (parsed.submissionDateTime) setSubmissionDateTime(parsed.submissionDateTime);
        if (parsed.fiscalYear) setFiscalYear(parsed.fiscalYear);
        if (parsed.totalAssets) setTotalAssets(parsed.totalAssets);
        if (parsed.currentAssets) setCurrentAssets(parsed.currentAssets);
        if (parsed.totalLiabilities) setTotalLiabilities(parsed.totalLiabilities);
        if (parsed.currentLiabilities) setCurrentLiabilities(parsed.currentLiabilities);
        if (parsed.kFactor) setKFactor(parsed.kFactor);
        if (autoOngoing > 0) {
          setOngoingContractsValue(formatCurrency(autoOngoing));
        } else if (parsed.ongoingContractsValue) {
          setOngoingContractsValue(parsed.ongoingContractsValue);
        }
        if (parsed.signatoryName) setSignatoryName(parsed.signatoryName);
        if (parsed.signatoryTitle) setSignatoryTitle(parsed.signatoryTitle);
        if (parsed.signatoryDate) setSignatoryDate(parsed.signatoryDate);
      } else if (list.length > 0 && !selectedOppId) {
        const first = list[0];
        setSelectedOppId(first.id);
        setProjectRefNo(first.refNo);
        setProjectTitle(first.title);
        setProcuringEntityLocation(first.procuringEntity.toUpperCase());
        setProjectLocation(first.procuringEntity.toUpperCase());
        if (first.solicitationNo) setStandardFormNo(first.solicitationNo);
        if (first.dateTimeSubmitted) {
          setSignatoryDate(first.dateTimeSubmitted);
          setSubmissionDateTime(formatCleanDateTimeWithTime(first.dateTimeSubmitted));
        }
        const oppOngoing = fetchOngoingContractsTotal(tenantId, first.refNo, first.id);
        setOngoingContractsValue(formatCurrency(oppOngoing));
      }
    } catch (e) {
      console.error('[NFCC] Draft load error:', e);
    }
  }, [tenant, activeProjectRefNo]);

  // Save State
  const saveState = () => {
    const tenantId = tenant?.id || 'default';
    const storageKey = `bidocs_nfcc_${tenantId}_${projectRefNo || 'default'}`;
    const payload = {
      companyName,
      procuringEntityLocation,
      projectRefNo,
      projectTitle,
      projectLocation,
      standardFormNo,
      submissionDateTime,
      fiscalYear,
      totalAssets,
      currentAssets,
      totalLiabilities,
      currentLiabilities,
      kFactor,
      ongoingContractsValue,
      signatoryName,
      signatoryTitle,
      signatoryDate
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error('[NFCC] Draft save error:', e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    setIsSaving(true);
    try {
      const elem = document.getElementById('nfcc-paper-container');
      if (elem) {
        const cleanRef = (projectRefNo || 'NFCC').replace(/[^a-zA-Z0-9]/g, '_');
        await generateAndDownloadThreeLayerPdf(null, elem, undefined, `NFCC_Eligibility_Check_${cleanRef}.pdf`);
      }
    } catch (err) {
      console.error('[NFCC] PDF Export Error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    saveState();
    setIsSaving(true);
    try {
      const elem = document.getElementById('nfcc-paper-container');
      let dataUrl: string | undefined = undefined;
      if (elem) {
        const unit: ExportDocumentUnit = {
          title: 'NFCC - Net Financial Contracting Capacity',
          formElement: elem
        };
        dataUrl = await buildMergedThreeLayerPdfDataUrl([unit], `NFCC_Eligibility_Check.pdf`);
      }

      if (onSaveAndComplete) {
        onSaveAndComplete(dataUrl, 'NFCC — Net Financial Contracting Capacity', projectRefNo, projectTitle);
      }
      if (onClose) onClose();
    } catch (err) {
      console.error('[NFCC] Save Error:', err);
      if (onSaveAndComplete) {
        onSaveAndComplete(undefined, 'NFCC — Net Financial Contracting Capacity', projectRefNo, projectTitle);
      }
      if (onClose) onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-hidden print:p-0 print:bg-white print:static">

      {/* PRINT STYLESHEET OVERRIDE */}
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

      {/* Top Navigation Header */}
      <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between print:hidden no-export shrink-0 shadow-lg z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Net Financial Contracting Capacity (NFCC)</span>
              <span className="px-2 py-0.5 bg-emerald-900/50 text-emerald-300 text-[10px] font-mono rounded border border-emerald-700/50 font-bold">
                Class A Financial Legal Portrait (8.5" × 13")
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Official PhilGEPS / GPPB Financial Documents for Eligibility Check Format
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md"
            title="Export Legal PDF Document"
          >
            <Download className="w-4 h-4" />
            <span>Export Legal PDF</span>
          </button>

          <button
            onClick={() => setShowMetadataInputs(!showMetadataInputs)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{showMetadataInputs ? 'Hide Financial & Project Controls' : 'Edit Financial Controls'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Print Legal Document"
          >
            <Printer className="w-4 h-4" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Close Window"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace */}
      <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-950 print:p-0 print:overflow-visible">

        {/* Collapsible Controls & Input Form Panel */}
        {showMetadataInputs && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4 print:hidden no-export animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                Financial Figures & Project Metadata Controls
              </span>
              {oppProjects.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-300">Target Bidding Project:</span>
                  </div>
                  <select
                    value={selectedOppId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedOppId(id);
                      const proj = oppProjects.find(p => p.id === id);
                      if (proj) {
                        setProjectRefNo(proj.refNo);
                        setProjectTitle(proj.title);
                        setProcuringEntityLocation(proj.procuringEntity.toUpperCase());
                        setProjectLocation(proj.procuringEntity.toUpperCase());
                        if (proj.solicitationNo) setStandardFormNo(proj.solicitationNo);
                        if (proj.dateTimeSubmitted) {
                          setSignatoryDate(proj.dateTimeSubmitted);
                          setSubmissionDateTime(formatCleanDateTimeWithTime(proj.dateTimeSubmitted));
                        }
                        const oppOngoing = fetchOngoingContractsTotal(tenant?.id || 'default', proj.refNo, proj.id);
                        setOngoingContractsValue(formatCurrency(oppOngoing));
                        saveState();
                      }
                    }}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500 disabled:opacity-85 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Select Opportunity Project --</option>
                    {oppProjects.map(p => (
                      <option key={p.id} value={p.id}>[{p.refNo}] {p.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Project Header Metadata Control Inputs (Strictly locked to Company Registration & Project Information) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-400 font-mono text-[10px] font-bold text-blue-300">Company Name:</label>
                  <span className="text-[8.5px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/60">
                    Registration
                  </span>
                </div>
                <input
                  type="text"
                  value={companyName}
                  readOnly
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none uppercase cursor-not-allowed select-none opacity-90"
                  title="Strictly synchronized from Company Profile Registration"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-400 font-mono text-[10px] font-bold text-purple-300">PhilGEPS Ref No.:</label>
                  <span className="text-[8.5px] font-mono text-purple-400 font-bold bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-800/60">
                    Project
                  </span>
                </div>
                <input
                  type="text"
                  value={projectRefNo}
                  readOnly
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-purple-300 font-mono font-bold focus:outline-none cursor-not-allowed select-none opacity-90"
                  title="Strictly synchronized from Selected Opportunity Project"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-400 font-mono text-[10px] font-bold text-teal-300">Standard Form No.:</label>
                  <span className="text-[8.5px] font-mono text-teal-400 font-bold bg-teal-950/80 px-1.5 py-0.5 rounded border border-teal-800/60">
                    Editable
                  </span>
                </div>
                <input
                  type="text"
                  value={standardFormNo}
                  onChange={(e) => { setStandardFormNo(e.target.value); saveState(); }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-teal-300 font-mono font-bold focus:outline-none focus:border-teal-500"
                  placeholder="e.g. BAC-PG-00297-26"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-amber-300">Date & Time of Submission:</label>
                  <span className="text-[8.5px] font-mono text-amber-400 font-bold bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/60">
                    Project
                  </span>
                </div>
                <input
                  type="text"
                  value={submissionDateTime}
                  readOnly
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-amber-300 font-mono font-bold focus:outline-none cursor-not-allowed select-none opacity-90"
                  title="Strictly synchronized from Selected Opportunity Project"
                />
              </div>
            </div>

            {/* Financial Inputs Row with Auto-Format on Blur */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-800/80">
              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-emerald-300">Total Assets (1):</label>
                <input
                  type="text"
                  value={totalAssets}
                  onChange={(e) => { setTotalAssets(e.target.value); saveState(); }}
                  onBlur={() => handleBlurFormat(totalAssets, setTotalAssets)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500 text-right"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-emerald-300">Current Assets (2):</label>
                <input
                  type="text"
                  value={currentAssets}
                  onChange={(e) => { setCurrentAssets(e.target.value); saveState(); }}
                  onBlur={() => handleBlurFormat(currentAssets, setCurrentAssets)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500 text-right"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-amber-300">Total Liabilities (3):</label>
                <input
                  type="text"
                  value={totalLiabilities}
                  onChange={(e) => { setTotalLiabilities(e.target.value); saveState(); }}
                  onBlur={() => handleBlurFormat(totalLiabilities, setTotalLiabilities)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-amber-400 font-mono font-bold focus:outline-none focus:border-emerald-500 text-right"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-amber-300">Current Liabilities (4):</label>
                <input
                  type="text"
                  value={currentLiabilities}
                  onChange={(e) => { setCurrentLiabilities(e.target.value); saveState(); }}
                  onBlur={() => handleBlurFormat(currentLiabilities, setCurrentLiabilities)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-amber-400 font-mono font-bold focus:outline-none focus:border-emerald-500 text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-800/80">
              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-blue-300">K Factor (Default = 15):</label>
                <input
                  type="number"
                  value={kFactor}
                  onChange={(e) => { setKFactor(parseFloat(e.target.value) || 15); saveState(); }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-blue-300 font-mono font-bold focus:outline-none focus:border-emerald-500 text-center"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-400 font-mono text-[10px] font-bold text-purple-300">
                    Ongoing Projects Value:
                  </label>
                  <button
                    type="button"
                    onClick={() => syncOngoingTotal()}
                    className="text-[9.5px] font-mono text-purple-300 hover:text-purple-100 underline flex items-center gap-0.5 cursor-pointer"
                    title="Auto-sync total from Statement of All Ongoing Contracts (Item b)"
                  >
                    <span>↺</span>
                    <span>Sync</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={ongoingContractsValue}
                  onChange={(e) => { setOngoingContractsValue(e.target.value); saveState(); }}
                  onBlur={() => handleBlurFormat(ongoingContractsValue, setOngoingContractsValue)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-purple-300 font-mono font-bold focus:outline-none focus:border-emerald-500 text-right"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-teal-300">Audited Tax Year:</label>
                <input
                  type="text"
                  value={fiscalYear}
                  onChange={(e) => { setFiscalYear(e.target.value); saveState(); }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500 text-center"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-emerald-400">Calculated NFCC (Auto):</label>
                <div className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg px-2.5 py-1.5 text-emerald-300 font-mono font-bold text-right text-xs">
                  Php {formatCurrency(calculatedNfcc)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 8.5" x 13" LEGAL PORTRAIT CANVAS SHEET (816px x 1248px) */}
        <div
          id="nfcc-paper-container"
          className="single-page-paper portrait aspect-[8.5/13] bg-white text-slate-950 font-serif p-6 sm:p-7 border-2 border-slate-900 rounded-2xl shadow-2xl w-[816px] min-h-[1248px] h-auto text-left relative flex flex-col justify-between print:m-0 print:border-none print:shadow-none box-border"
        >

          {/* Main Inner Legal Frame Box */}
          <div className="w-full h-full border-2 border-slate-900 rounded-xl p-5 sm:p-6 flex flex-col justify-between relative bg-white box-border flex-1">

            {/* Document Body */}
            <div className="space-y-3 flex-1">

              {/* 1. Centered Company Name Header */}
              <div className="text-center border-b-2 border-slate-900 pb-2 mb-2">
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => { setCompanyName(e.target.value); saveState(); }}
                  placeholder="COMPANY NAME"
                  className="w-full text-center font-bold text-base sm:text-lg uppercase tracking-wider bg-transparent border-none focus:outline-none focus:bg-blue-50 font-serif text-slate-950"
                />
              </div>

              {/* 2. Top Header Metadata Block */}
              <div className="space-y-1.5 font-serif text-[11px] text-slate-950 leading-tight">
                
                {/* Row 1: Procuring Entity (Left) & PhilGEPS Project Ref No (Right) */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 w-[60%]">
                    <span className="font-bold shrink-0">Procuring Entity:</span>
                    <input
                      type="text"
                      value={procuringEntityLocation}
                      onChange={(e) => { setProcuringEntityLocation(e.target.value); saveState(); }}
                      className="w-full bg-transparent border-b border-dashed border-slate-300 font-serif text-[11px] uppercase focus:outline-none focus:bg-blue-50"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0 pl-3 font-serif">
                    <span className="font-bold shrink-0">PhilGEPS Ref No.</span>
                    <input
                      type="text"
                      value={projectRefNo}
                      onChange={(e) => { setProjectRefNo(e.target.value); saveState(); }}
                      className="w-36 bg-transparent border-b border-dashed border-slate-300 font-serif font-bold text-[11px] focus:outline-none focus:bg-blue-50 text-right"
                    />
                  </div>
                </div>

                {/* Row 2: Name of Project */}
                <div className="pt-0.5 flex items-start gap-1">
                  <span className="font-bold shrink-0">Name of Project:</span>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => { setProjectTitle(e.currentTarget.innerText); saveState(); }}
                    className="w-full bg-transparent border-b border-dashed border-slate-300 font-serif font-bold text-[11px] uppercase focus:outline-none focus:bg-blue-50 leading-relaxed whitespace-pre-wrap break-words min-h-[1.25rem] cursor-text"
                  >
                    {projectTitle}
                  </div>
                </div>

                {/* Row 3: Location of the Project */}
                <div className="pt-0.5 flex items-start gap-1">
                  <span className="font-bold shrink-0">Location of the Project:</span>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => { setProjectLocation(e.currentTarget.innerText); saveState(); }}
                    className="w-full bg-transparent border-b border-dashed border-slate-300 font-serif font-medium underline text-[11px] focus:outline-none focus:bg-blue-50 leading-normal whitespace-pre-wrap break-words min-h-[1.25rem] cursor-text"
                  >
                    {projectLocation}
                  </div>
                </div>

                {/* Row 4: Standard Form No. & Date and Time of Submission */}
                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex items-center gap-1 w-[45%]">
                    <span className="font-bold shrink-0">Standard Form No.:</span>
                    <input
                      type="text"
                      value={standardFormNo}
                      onChange={(e) => { setStandardFormNo(e.target.value); saveState(); }}
                      className="w-full bg-transparent border-b border-dashed border-slate-300 font-serif text-[11px] focus:outline-none focus:bg-blue-50 font-normal"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0 pl-3">
                    <span className="font-bold shrink-0">Date & Time of Submission:</span>
                    <input
                      type="text"
                      value={formatCleanDateTimeWithTime(submissionDateTime)}
                      onChange={(e) => { setSubmissionDateTime(e.target.value); saveState(); }}
                      className="w-56 bg-transparent border-b border-dashed border-slate-300 font-serif text-[11px] focus:outline-none focus:bg-blue-50 text-right font-medium"
                    />
                  </div>
                </div>

              </div>

              {/* 3. Main Centered Document Title */}
              <div className="text-center pt-2 pb-1">
                <h1 className="text-sm sm:text-base font-bold font-serif uppercase tracking-wider text-slate-950">
                  FINANCIAL DOCUMENTS FOR ELIGIBILITY CHECK
                </h1>
              </div>

              {/* 4. Section A: Summary of Assets and Liabilities */}
              <div className="space-y-1.5 text-[11px] font-serif text-slate-950">
                <div className="flex gap-2">
                  <span className="font-bold shrink-0">A.</span>
                  <p className="leading-snug text-justify font-serif">
                    Summary of the Applicant Supplier's/Distributor's/Manufacturer's assets and liabilities on the basis of the attached income tax return and audited financial statement, stamped "RECEIVED" by the BIR or BIR authorized collecting agent, for the immediately preceding year and a certified copy of Schedule of Fixed Assets particularly the list of construction equipment.
                  </p>
                </div>

                {/* Section A Financial Summary Table (3 Columns) */}
                <div className="pt-0.5">
                  <table className="w-full border-collapse border-2 border-slate-900 text-[11px] font-serif text-slate-950">
                    <thead>
                      <tr className="border-b-2 border-slate-900">
                        <th className="border-r border-slate-900 w-12 px-2 py-1 text-center font-bold"></th>
                        <th className="border-r border-slate-900 px-3 py-1 text-left font-bold"></th>
                        <th className="px-3 py-1 text-left font-normal w-48">
                          Year{' '}
                          <input
                            type="text"
                            value={fiscalYear}
                            onChange={(e) => { setFiscalYear(e.target.value); saveState(); }}
                            className="w-20 bg-transparent border-none font-serif text-[11px] text-slate-950 focus:outline-none focus:bg-blue-50 inline"
                          />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-slate-900">
                        <td className="border-r border-slate-900 px-2 py-1 text-center font-normal">1</td>
                        <td className="border-r border-slate-900 px-3 py-1 font-normal">Total Assets</td>
                        <td className="px-3 py-1 text-left font-normal">
                          <input
                            type="text"
                            value={totalAssets}
                            onChange={(e) => { setTotalAssets(e.target.value); saveState(); }}
                            onBlur={() => handleBlurFormat(totalAssets, setTotalAssets)}
                            className="w-full bg-transparent border-none font-serif text-[11px] text-slate-950 focus:outline-none focus:bg-blue-50 p-0"
                          />
                        </td>
                      </tr>
                      <tr className="border-t border-slate-900">
                        <td className="border-r border-slate-900 px-2 py-1 text-center font-normal">2</td>
                        <td className="border-r border-slate-900 px-3 py-1 font-normal">Current Assets</td>
                        <td className="px-3 py-1 text-left font-normal">
                          <input
                            type="text"
                            value={currentAssets}
                            onChange={(e) => { setCurrentAssets(e.target.value); saveState(); }}
                            onBlur={() => handleBlurFormat(currentAssets, setCurrentAssets)}
                            className="w-full bg-transparent border-none font-serif text-[11px] text-slate-950 focus:outline-none focus:bg-blue-50 p-0"
                          />
                        </td>
                      </tr>
                      <tr className="border-t border-slate-900">
                        <td className="border-r border-slate-900 px-2 py-1 text-center font-normal">3</td>
                        <td className="border-r border-slate-900 px-3 py-1 font-normal">Total Liabilities</td>
                        <td className="px-3 py-1 text-left font-normal">
                          <input
                            type="text"
                            value={totalLiabilities}
                            onChange={(e) => { setTotalLiabilities(e.target.value); saveState(); }}
                            onBlur={() => handleBlurFormat(totalLiabilities, setTotalLiabilities)}
                            className="w-full bg-transparent border-none font-serif text-[11px] text-slate-950 focus:outline-none focus:bg-blue-50 p-0"
                          />
                        </td>
                      </tr>
                      <tr className="border-t border-slate-900">
                        <td className="border-r border-slate-900 px-2 py-1 text-center font-normal">4</td>
                        <td className="border-r border-slate-900 px-3 py-1 font-normal">Current Liabilities</td>
                        <td className="px-3 py-1 text-left font-normal">
                          <input
                            type="text"
                            value={currentLiabilities}
                            onChange={(e) => { setCurrentLiabilities(e.target.value); saveState(); }}
                            onBlur={() => handleBlurFormat(currentLiabilities, setCurrentLiabilities)}
                            className="w-full bg-transparent border-none font-serif text-[11px] text-slate-950 focus:outline-none focus:bg-blue-50 p-0"
                          />
                        </td>
                      </tr>
                      {/* Row 5: Net Worth */}
                      <tr className="border-t border-slate-900">
                        <td className="border-r border-slate-900 px-2 py-1 text-center font-normal">5</td>
                        <td className="border-r border-slate-900 px-3 py-1 font-normal">Net Worth (1-30)</td>
                        <td className="px-3 py-1 text-left font-normal font-serif">
                          {formatCurrency(calculatedNetWorth)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. Section B: NFCC Computation & Formula */}
              <div className="space-y-1.5 text-[11px] font-serif text-slate-950 pt-1">
                <div className="flex gap-2">
                  <span className="font-bold shrink-0">B.</span>
                  <p className="leading-snug text-justify font-serif">
                    The Net Financial Contracting Capacity (NFCC) based on the above data is computed as follows:
                  </p>
                </div>

                <div className="pl-5 space-y-1.5">
                  <p className="leading-relaxed text-justify font-serif">
                    NFCC = [(Current assets minus current liabilities) (K={kFactor})] minus the value of all outstanding or uncompleted portions of the projects under ongoing contracts, including awarded contracts yet to be started coinciding with the contract to be bid.
                  </p>

                  {/* NFCC Result Statement */}
                  <p className="font-serif pt-0.5">
                    NFCC= K Php <span className="font-bold underline text-[11.5px]">{formatCurrency(calculatedNfcc)}</span>
                  </p>

                  <p className="leading-relaxed text-justify font-serif pt-0.5">
                    The value of the domestic bidder's current assets and current liabilities shall be based on the latest financial statement submitted to the BIR.
                  </p>

                  <p className="leading-relaxed text-justify font-serif pt-0.5">
                    Herewith attached are certified true copies of the income tax return and audited financial statement stamped "RECEIVED" by the BIR or BIR authorized collecting agent for the immediately preceding year.
                  </p>
                </div>
              </div>

              {/* 6. Submitted By & Signatory Block */}
              <div className="pt-3 space-y-2.5 text-[11px] font-serif text-slate-950">
                <p className="font-normal">Submitted by:</p>

                {/* Company Name & Supplier Label */}
                <div className="space-y-0.5 pt-0.5">
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => { setCompanyName(e.target.value); saveState(); }}
                    className="w-full max-w-[360px] bg-transparent border-none font-bold text-[11px] uppercase focus:outline-none focus:bg-blue-50 font-serif text-slate-950 p-0"
                  />
                  <p className="text-[10px] font-normal text-slate-900">Name of Supplier</p>
                </div>

                {/* Authorized Signatory Details */}
                <div className="pt-2 space-y-1">
                  <div>
                    <input
                      type="text"
                      value={signatoryName}
                      onChange={(e) => { setSignatoryName(e.target.value); saveState(); }}
                      className="w-full max-w-[360px] bg-transparent border-none font-normal text-[11px] focus:outline-none focus:bg-blue-50 font-serif text-slate-950 p-0"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={signatoryTitle}
                      onChange={(e) => { setSignatoryTitle(e.target.value); saveState(); }}
                      className="w-full max-w-[360px] bg-transparent border-none font-normal text-[10.5px] focus:outline-none focus:bg-blue-50 font-serif text-slate-900 p-0"
                    />
                  </div>
                  <div className="flex items-center justify-between w-full pt-1">
                    <p className="text-[10px] font-normal text-slate-900">Signature of Authorized Representative</p>
                    <div className="flex items-center gap-1 font-serif">
                      <span>Date: </span>
                      <input
                        type="text"
                        value={formatCleanDateString(signatoryDate || submissionDateTime)}
                        onChange={(e) => { setSignatoryDate(e.target.value); saveState(); }}
                        className="w-40 bg-transparent border-b border-dashed border-slate-300 font-serif underline text-[11px] focus:outline-none focus:bg-blue-50 text-right font-medium"
                      />
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* 7. Footer QR Code Verification Seal (100% Readable & Fully Visible at Bottom of Frame) */}
            <div className="pt-3 border-t-2 border-slate-900 flex items-center justify-between px-1 pb-1 mt-4 shrink-0 bg-white">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono font-bold text-slate-800 uppercase block">
                  VERIFIED LEGAL FINANCIAL EXHIBIT • REF: {projectRefNo || '12795242'}
                </span>
                <span className="text-[9px] font-mono text-slate-600 block">
                  STATUTORY GPPB ELIGIBILITY FORM • K={kFactor}
                </span>
              </div>

              {/* Middle Action: Save & Attach to Vault (Screen Only) */}
              <div className="flex flex-col items-center justify-center px-2 print:hidden no-export my-auto">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>{isSaving ? 'Saving...' : 'Save & Attach to Vault'}</span>
                </button>
                <span className="text-[9px] text-slate-400 font-sans mt-0.5">Saves directly to Document Vault</span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <DocumentQrCode
                  details={{
                    companyName: companyName,
                    documentName: 'NET FINANCIAL CONTRACTING CAPACITY (NFCC)',
                    documentNumber: `EXHIBIT-NFCC-${projectRefNo || '12795242'}`,
                    projectTitle: projectTitle,
                    projectRefNo: projectRefNo || '12795242',
                    procuringEntity: procuringEntityLocation,
                    dateTimeSubmitted: formatCleanDateString(signatoryDate || submissionDateTime),
                    documentCategory: 'Financial Eligibility',
                    generatedBy: companyName
                  }}
                  size={46}
                  showCaption={false}
                />
                <div className="text-[9px] font-mono leading-tight text-slate-800 space-y-0.5">
                  <p className="font-bold text-slate-950 uppercase truncate max-w-[260px]">{companyName}</p>
                  <p className="font-semibold text-slate-900 truncate max-w-[260px]">REF NO: {projectRefNo || '12795242'}</p>
                  <p className="font-bold text-emerald-950 truncate max-w-[260px]">NFCC: Php {formatCurrency(calculatedNfcc)}</p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Modal Bottom Actions */}
      <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between print:hidden no-export shrink-0">
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
        )}
        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={handleExportPdf}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Legal PDF</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition shadow flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            <span>Save & Complete Exhibit</span>
          </button>
        </div>
      </div>

    </div>
  );
};

export const NfccModal: React.FC<NfccModalProps> = (props) => (
  <VaultErrorBoundary fallbackTitle="Net Financial Contracting Capacity (NFCC) Modal">
    <NfccModalContent {...props} />
  </VaultErrorBoundary>
);

export default NfccModal;

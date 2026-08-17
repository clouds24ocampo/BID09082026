import React, { useState, useEffect } from 'react';
import { Tenant } from '../../../types';
import { generateAndDownloadThreeLayerPdf } from '../../../utils/pdfExportEngine';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import html2canvas from 'html2canvas';
import DocumentQrCode from '../../common/DocumentQrCode';
import {
  X,
  Printer,
  Download,
  Building2,
  ShieldCheck,
  Calculator
} from 'lucide-react';

export interface NfccModalProps {
  item?: { id: string; code: string; name: string };
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose?: () => void;
}

const formatDateDisplay = (raw: string): string => {
  if (!raw) return '';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch { return raw; }
};

const formatDateUpper = (raw: string): string => formatDateDisplay(raw).toUpperCase();

// Safe number parser — returns 0 for blank/invalid
const parseNum = (val: string): number => {
  const n = parseFloat(val.replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
};

// Format number as Php currency with 2 decimal places
const formatPhp = (val: number): string =>
  val === 0 ? '—' : `Php ${val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const NfccModal: React.FC<NfccModalProps> = ({
  item,
  tenant,
  activeProjectRefNo = '',
  activeProjectTitle = '',
  activeProcuringEntity = '',
  onSaveAndComplete,
  onClose
}) => {
  // Opportunity Finder
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  // Project Identification
  const [projectRefNo, setProjectRefNo] = useState<string>(activeProjectRefNo || '');
  const [solicitationNo, setSolicitationNo] = useState<string>('');
  const [projectTitle, setProjectTitle] = useState<string>(activeProjectTitle || '');
  const [projectLocation, setProjectLocation] = useState<string>('');
  const [procuringEntity, setProcuringEntity] = useState<string>(activeProcuringEntity || '');
  const [standardFormNo, setStandardFormNo] = useState<string>('');
  const [fiscalYear, setFiscalYear] = useState<string>(new Date().getFullYear().toString());

  const [totalAssets, setTotalAssets] = useState<string>('');
  const [currentAssets, setCurrentAssets] = useState<string>('');
  const [totalLiabilities, setTotalLiabilities] = useState<string>('');
  const [currentLiabilities, setCurrentLiabilities] = useState<string>('');
  // Net Worth is auto-calculated: Total Assets − Total Liabilities
  const computedNetWorth = (): number => parseNum(totalAssets) - parseNum(totalLiabilities);
  const netWorthDisplay = (): string => {
    const v = computedNetWorth();
    return v === 0 && !totalAssets && !totalLiabilities ? '' : formatPhp(v);
  };

  // NFCC Computed Fields
  const [kValue, setKValue] = useState<string>('15');         // K=15 default per GPPB
  const [outstandingValue, setOutstandingValue] = useState<string>('');  // outstanding contracts value
  const [nfccResult, setNfccResult] = useState<string>('');  // final NFCC override (user can type)

  // Signatory Block
  const [companyName, setCompanyName] = useState<string>(tenant?.companyName || '');
  const [signatoryName, setSignatoryName] = useState<string>(tenant?.authorizedSignatory?.name || '');
  const [signatoryTitle, setSignatoryTitle] = useState<string>(tenant?.authorizedSignatory?.title || '');
  const [signatoryDate, setSignatoryDate] = useState<string>('');

  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Computed NFCC value
  const computedNfcc = (): number => {
    const ca = parseNum(currentAssets);
    const cl = parseNum(currentLiabilities);
    const k = parseNum(kValue);
    const outs = parseNum(outstandingValue);
    return ((ca - cl) * k) - outs;
  };

  const nfccDisplay = (): string => {
    if (nfccResult.trim()) return nfccResult.trim();
    const val = computedNfcc();
    return val === 0 ? 'Php _______________' : formatPhp(val);
  };

  // Load saved state & sync tenant signatory
  useEffect(() => {
    const tenantId = tenant?.id || 'default';
    const list = getOpportunityProjects(tenantId);
    setOppProjects(list);

    if (tenant?.companyName) setCompanyName(tenant.companyName);
    if (tenant?.authorizedSignatory?.name) setSignatoryName(tenant.authorizedSignatory.name);
    if (tenant?.authorizedSignatory?.title) setSignatoryTitle(tenant.authorizedSignatory.title);

    const storageKey = `bidocs_nfcc_${tenantId}_${projectRefNo || 'default'}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.projectRefNo) setProjectRefNo(parsed.projectRefNo);
        if (parsed.solicitationNo) setSolicitationNo(parsed.solicitationNo);
        if (parsed.projectTitle) setProjectTitle(parsed.projectTitle);
        if (parsed.projectLocation) setProjectLocation(parsed.projectLocation);
        if (parsed.procuringEntity) setProcuringEntity(parsed.procuringEntity);
        if (parsed.standardFormNo) setStandardFormNo(parsed.standardFormNo);
        if (parsed.fiscalYear) setFiscalYear(parsed.fiscalYear);
        if (parsed.totalAssets) setTotalAssets(parsed.totalAssets);
        if (parsed.currentAssets) setCurrentAssets(parsed.currentAssets);
        if (parsed.totalLiabilities) setTotalLiabilities(parsed.totalLiabilities);
        if (parsed.currentLiabilities) setCurrentLiabilities(parsed.currentLiabilities);
        if (parsed.kValue) setKValue(parsed.kValue);
        if (parsed.outstandingValue) setOutstandingValue(parsed.outstandingValue);
        if (parsed.nfccResult) setNfccResult(parsed.nfccResult);
        if (parsed.signatoryDate) setSignatoryDate(parsed.signatoryDate);
      } catch { /* ignore corrupt storage */ }
    }
  }, []);

  const saveState = () => {
    const tenantId = tenant?.id || 'default';
    const storageKey = `bidocs_nfcc_${tenantId}_${projectRefNo || 'default'}`;
    localStorage.setItem(storageKey, JSON.stringify({
      projectRefNo, solicitationNo, projectTitle, projectLocation, procuringEntity,
      standardFormNo, fiscalYear,
      totalAssets, currentAssets, totalLiabilities, currentLiabilities,
      kValue, outstandingValue, nfccResult, signatoryDate
    }));
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const el = document.getElementById('nfcc-paper') as HTMLElement | null;
      await generateAndDownloadThreeLayerPdf(
        null,
        el,
        undefined,
        `NFCC-Financial-Eligibility-${projectRefNo || '2026'}.pdf`
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveAndComplete = async () => {
    setIsExporting(true);
    saveState();
    let dataUrl: string | undefined = undefined;
    try {
      const el = document.getElementById('nfcc-paper');
      if (el) {
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          ignoreElements: (element: Element) => {
            return (
              element.classList.contains('print:hidden') ||
              element.classList.contains('no-export')
            );
          }
        });
        dataUrl = canvas.toDataURL('image/png');
      }
    } catch (err) {
      console.error('Failed to capture NFCC preview:', err);
    } finally {
      setIsExporting(false);
    }
    onSaveAndComplete?.(dataUrl, 'NFCC — Net Financial Contracting Capacity', projectRefNo, projectTitle);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col my-4 overflow-hidden">

        {/* ── MODAL HEADER ─────────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 print:hidden no-export">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <Calculator className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-mono tracking-tight">
                NFCC — Net Financial Contracting Capacity
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                Financial Documents for Eligibility Check • Legal 13" × 8.5" Landscape Standard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 transition print:hidden no-export"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg transition disabled:opacity-60 print:hidden no-export"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? 'Exporting…' : 'Export PDF'}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition print:hidden no-export"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── SETTINGS CONTROL BAR ──────────────────────────────────────────── */}
        <div className="p-4 border-b border-slate-800 bg-slate-900 space-y-3 print:hidden no-export">

          {/* Opportunity Finder Selector */}
          <div>
            <label className="block text-slate-300 font-mono text-[11px] mb-1 font-bold text-emerald-300">
              Select Project from Opportunity Finder:
            </label>
            <select
              value={selectedOppId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedOppId(val);
                const found = oppProjects.find((p) => p.id === val || p.refNo === val);
                if (found) {
                  setProjectRefNo(found.refNo);
                  setProjectTitle(found.title);
                  setProcuringEntity(found.procuringEntity);
                  if (found.solicitationNo) setSolicitationNo(found.solicitationNo);
                  if (found.dateTimeSubmitted) {
                    setSignatoryDate(formatDateUpper(found.dateTimeSubmitted));
                  }
                }
              }}
              className="w-full bg-slate-950 border border-emerald-500/60 rounded-xl px-3 py-2 text-white font-mono text-xs font-bold focus:outline-none focus:border-emerald-400 shadow-inner"
            >
              {oppProjects.length === 0 ? (
                <option value="">-- No Active Bidding Projects Saved in Opportunity Finder --</option>
              ) : (
                <>
                  <option value="">-- Select Active Bidding Opportunity / Project --</option>
                  {oppProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.refNo}] {p.title} — {p.procuringEntity} ({p.abc})
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1 border-t border-slate-800/80">
            <div>
              <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-emerald-400">Project Reference No.</label>
              <input type="text" value={projectRefNo} onChange={(e) => { setProjectRefNo(e.target.value); saveState(); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-teal-400">Solicitation No.</label>
              <input type="text" value={solicitationNo} onChange={(e) => { setSolicitationNo(e.target.value); saveState(); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-slate-400 font-mono text-[10px] mb-1">Standard Form No.</label>
              <input type="text" value={standardFormNo} onChange={(e) => { setStandardFormNo(e.target.value); saveState(); }}
                placeholder="e.g. SF-NFCC-2026"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-amber-400">Signatory / Submission Date</label>
              <input type="text" value={signatoryDate} onChange={(e) => { setSignatoryDate(e.target.value); saveState(); }}
                placeholder="MARCH 19, 2026"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500 uppercase" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-400 font-mono text-[10px] mb-1">Name of Project</label>
              <input type="text" value={projectTitle} onChange={(e) => { setProjectTitle(e.target.value); saveState(); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-slate-400 font-mono text-[10px] mb-1">Location of the Project</label>
              <input type="text" value={projectLocation} onChange={(e) => { setProjectLocation(e.target.value); saveState(); }}
                placeholder="e.g. La Trinidad, Benguet"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-slate-400 font-mono text-[10px] mb-1">Company Signatory Name</label>
              <input type="text" value={signatoryName} onChange={(e) => { setSignatoryName(e.target.value); saveState(); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500 uppercase" />
            </div>
            <div>
              <label className="block text-slate-400 font-mono text-[10px] mb-1">Company Signatory Title</label>
              <input type="text" value={signatoryTitle} onChange={(e) => { setSignatoryTitle(e.target.value); saveState(); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500 uppercase" />
            </div>
          </div>

          {/* Financial Data Inputs */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Financial Data (Year {fiscalYear})</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
              {[
                { label: '① Total Assets', val: totalAssets, set: setTotalAssets },
                { label: '② Current Assets', val: currentAssets, set: setCurrentAssets },
                { label: '③ Total Liabilities', val: totalLiabilities, set: setTotalLiabilities },
                { label: '④ Current Liabilities', val: currentLiabilities, set: setCurrentLiabilities }
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className="block text-slate-400 font-mono text-[10px] mb-1">{label}</label>
                  <input type="text" value={val}
                    onChange={(e) => { set(e.target.value); saveState(); }}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-500 text-right" />
                </div>
              ))}
              {/* Net Worth: auto-computed, read-only */}
              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-teal-400">⑤ Net Worth (Auto: A−C)</label>
                <div className="w-full bg-slate-900 border border-teal-500/40 rounded-lg px-2.5 py-1.5 text-teal-200 font-mono font-bold text-right text-xs">
                  {computedNetWorth() !== 0 || (totalAssets || totalLiabilities)
                    ? formatPhp(computedNetWorth())
                    : <span className="text-slate-600 font-normal">Auto-computed</span>
                  }
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1">K Value (default: 15)</label>
                <input type="text" value={kValue}
                  onChange={(e) => { setKValue(e.target.value); saveState(); }}
                  placeholder="15"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-yellow-300 font-mono font-bold focus:outline-none focus:border-emerald-500 text-right" />
              </div>
              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1">Outstanding Contracts Value</label>
                <input type="text" value={outstandingValue}
                  onChange={(e) => { setOutstandingValue(e.target.value); saveState(); }}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-orange-300 font-mono font-bold focus:outline-none focus:border-emerald-500 text-right" />
              </div>
              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-emerald-400">
                  NFCC= {computedNfcc() !== 0 ? formatPhp(computedNfcc()) : 'Enter data to auto-compute'}
                </label>
                <input type="text" value={nfccResult}
                  onChange={(e) => { setNfccResult(e.target.value); saveState(); }}
                  placeholder="Override computed NFCC (optional)"
                  className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg px-2.5 py-1.5 text-emerald-200 font-mono font-bold focus:outline-none focus:border-emerald-400 text-right" />
              </div>
            </div>
          </div>
        </div>

        {/* ── OFFICIAL PRINTABLE DOCUMENT SHEET ───────────────────────────── */}
        <div className="p-4 sm:p-6 bg-slate-800/30 overflow-y-auto">
          <div
            id="nfcc-paper"
            className="single-page-paper print-document-sheet bg-white text-black p-10 sm:p-14 border-2 border-slate-900 shadow-2xl mx-auto rounded-md w-full max-w-[1280px] min-h-[760px] aspect-[13/8.5] font-serif space-y-5 text-left flex flex-col justify-between"
          >

            {/* ── COMPANY & PROJECT HEADER (Top of Page) ──────────────────── */}
            <div className="space-y-1 font-serif text-black border-b-2 border-black pb-3 mb-2">
              <div className="text-[14px] font-black uppercase tracking-wide">{companyName}</div>
              {procuringEntity && (
                <div className="text-[12px] font-semibold">
                  <span className="font-bold">Procuring Entity: </span>{procuringEntity}
                </div>
              )}
            </div>

            {/* ── DOCUMENT HEADER METADATA BLOCK ──────────────────────────── */}
            <div className="space-y-0.5 font-serif text-[12px] text-black leading-snug">
              <div>
                <span className="font-bold">Project Reference No.</span>{' '}
                <span className="font-semibold font-mono">{projectRefNo}</span>
              </div>
              <div>
                <span className="font-bold">Solicitation No.</span>{' '}
                <span className="font-semibold font-mono">{solicitationNo}</span>
              </div>
              <div>
                <span className="font-bold">Name of Project:</span>{' '}
                <span className="font-semibold">{projectTitle}</span>
              </div>
              {projectLocation && (
                <div className="pt-1">
                  <span className="font-bold">Location of the Project:</span>{' '}
                  <span className="font-semibold">{projectLocation}</span>
                </div>
              )}
              {standardFormNo && (
                <div className="pt-1">
                  <span className="font-bold">Standard Form No.:</span>{' '}
                  <span className="font-semibold font-mono">{standardFormNo}</span>
                </div>
              )}
            </div>

            {/* ── MAIN TITLE ────────────────────────────────────────────────── */}
            <div className="text-center pt-4 pb-2">
              <h1 className="text-base sm:text-lg font-bold font-serif uppercase tracking-wide text-black">
                FINANCIAL DOCUMENTS FOR ELIGIBILITY CHECK
              </h1>
            </div>

            {/* ── SECTION A ─────────────────────────────────────────────────── */}
            <div className="space-y-3 text-[12px] font-serif text-black">
              <div className="flex gap-4">
                <span className="font-bold shrink-0">A.</span>
                <p className="leading-snug text-justify">
                  Summary of the Applicant Supplier's/Distributor's/Manufacturer's assets and liabilities on the basis of
                  the attached income tax return and audited financial statement, stamped "RECEIVED" by the BIR or BIR
                  authorized collecting agent, for the immediately preceding year and a certified copy of Schedule of
                  Fixed Assets particularly the list of construction equipment.
                </p>
              </div>

              {/* Financial Summary Table */}
              <div className="ml-6">
                <table className="w-full border-collapse text-[12px] font-serif">
                  <thead>
                    <tr>
                      <th className="border border-black px-3 py-1.5 text-left font-bold w-8">&nbsp;</th>
                      <th className="border border-black px-3 py-1.5 text-left font-bold"></th>
                      <th className="border border-black px-3 py-1.5 text-center font-bold min-w-[180px]">
                        Year{' '}
                        <input
                          type="text"
                          value={fiscalYear}
                          onChange={(e) => { setFiscalYear(e.target.value); saveState(); }}
                          className="inline-block w-16 border-b border-black text-center bg-transparent font-bold focus:outline-none print:border-b print:border-black"
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { num: 1, label: 'Total Assets', val: totalAssets, auto: false },
                      { num: 2, label: 'Current Assets', val: currentAssets, auto: false },
                      { num: 3, label: 'Total Liabilities', val: totalLiabilities, auto: false },
                      { num: 4, label: 'Current Liabilities', val: currentLiabilities, auto: false },
                    ].map(({ num, label, val }) => (
                      <tr key={num}>
                        <td className="border border-black px-3 py-2 text-center font-semibold">{num}</td>
                        <td className="border border-black px-3 py-2 font-semibold">{label}</td>
                        <td className="border border-black px-3 py-2 text-right font-mono font-semibold">
                          {val ? `Php ${parseNum(val).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : ''}
                        </td>
                      </tr>
                    ))}
                    {/* Row 5: Net Worth — auto-calculated */}
                    <tr>
                      <td className="border border-black px-3 py-2 text-center font-semibold">5</td>
                      <td className="border border-black px-3 py-2 font-semibold">Net Worth (1-3)</td>
                      <td className="border border-black px-3 py-2 text-right font-mono font-semibold">
                        {(totalAssets || totalLiabilities)
                          ? `Php ${computedNetWorth().toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                          : ''}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── SECTION B ─────────────────────────────────────────────────── */}
            <div className="space-y-3 text-[12px] font-serif text-black">
              <div className="flex gap-4">
                <span className="font-bold shrink-0">B.</span>
                <p className="leading-snug text-justify">
                  The Net Financial Contracting Capacity (NFCC) based on the above data is computed as follows:
                </p>
              </div>

              <div className="ml-6 space-y-3">
                {/* Formula */}
                <p className="font-serif leading-relaxed text-justify">
                  NFCC = [(Current assets minus current liabilities) (K={kValue || '15'})] minus the value of all
                  outstanding or uncompleted portions of the projects under ongoing contracts, including awarded
                  contracts yet to be started coinciding with the contract to be bid.
                </p>

                {/* NFCC Result */}
                <p className="font-bold font-serif">
                  NFCC= K <span className="inline-block min-w-[220px] border-b border-black pb-0.5 font-mono font-semibold ml-1">
                    {nfccDisplay()}
                  </span>
                </p>

                {/* Domestic Bidder Note */}
                <p className="font-serif leading-relaxed text-justify">
                  The value of the domestic bidder's current assets and current liabilities shall be based on the
                  latest financial statement submitted to the BIR.
                </p>

                {/* Attachment Note */}
                <p className="font-serif leading-relaxed text-justify">
                  Herewith attached are certified true copies of the income tax return and audited financial statement
                  stamped "RECEIVED" by the BIR or BIR authorized collecting agent for the immediately preceding year.
                </p>

                {/* Submitted By */}
                <div className="pt-2 space-y-1">
                  <p className="font-serif font-semibold">Submitted by:</p>
                </div>
              </div>
            </div>

            {/* ── SIGNATORY BLOCK */}
            <div className="pt-4 flex items-end justify-between gap-6 text-xs font-serif">

              {/* Left: Signature Fields */}
              <div className="space-y-4 flex-1">
                {/* Name of Supplier and contractor */}
                <div>
                  <div className="border-b border-black pb-0.5 min-w-[260px] font-bold font-serif text-[12px] uppercase text-black">
                    {companyName}
                  </div>
                  <p className="text-[11px] text-slate-700 mt-0.5">Name of Supplier and contractor</p>
                </div>

                {/* Signature + Date */}
                <div className="flex items-end gap-12">
                  <div>
                    <div className="border-b border-black pb-0.5 min-w-[240px] font-bold font-serif text-[12px] uppercase text-black">
                      {signatoryName}
                    </div>
                    <p className="text-[11px] text-slate-700 mt-0.5">Signature of Authorized Representative</p>
                    <p className="text-[11px] font-semibold text-black uppercase mt-0.5">{signatoryTitle}</p>
                  </div>

                  <div>
                    <div className="border-b border-black pb-0.5 min-w-[140px] font-semibold font-mono text-[12px] text-black">
                      {signatoryDate}
                    </div>
                    <p className="text-[11px] text-slate-700 mt-0.5">Date:</p>
                  </div>
                </div>
              </div>

              {/* Right: QR Code */}
              <div className="text-right flex flex-col items-end shrink-0">
                <DocumentQrCode
                  details={{
                    companyName: companyName,
                    documentName: 'Net Financial Contracting Capacity (NFCC)',
                    documentNumber: `NFCC-${projectRefNo || '2026-000000'}`,
                    projectTitle: projectTitle,
                    projectRefNo: projectRefNo,
                    procuringEntity: procuringEntity,
                    dateTimeSubmitted: signatoryDate,
                    solicitationNo: solicitationNo,
                    documentCategory: 'Financial Eligibility',
                    generatedBy: companyName
                  }}
                  size={90}
                  showCaption={false}
                />
                <span className="text-[9px] font-mono text-slate-600 uppercase mt-1">
                  VERIFIED DOC • {projectRefNo}
                </span>
              </div>
            </div>

          </div>{/* end nfcc-paper */}
        </div>

        {/* ── BOTTOM ACTIONS BAR  */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900 shrink-0 print:hidden no-export">
          <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Financial Eligibility Document — Legal 13" × 8.5" Landscape Standard</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs transition">
              Close
            </button>
            <button
              onClick={handleSaveAndComplete}
              disabled={isExporting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg transition flex items-center gap-2 disabled:opacity-60"
            >
              <Building2 className="w-4 h-4" />
              <span>{isExporting ? 'Saving…' : 'Save & Complete'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default NfccModal;
import React, { useState, useEffect } from 'react';
import { Tenant } from '../../../types';
import { generateAndDownloadThreeLayerPdf, buildMergedThreeLayerPdfDataUrl } from '../../../utils/pdfExportEngine';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import DocumentQrCode from '../../common/DocumentQrCode';
import {
  X,
  Printer,
  Download,
  Building2,
  TrendingUp,
  Loader2,
  CheckCircle2,
  FolderKanban
} from 'lucide-react';

export interface CashFlowByQuarterModalProps {
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose: () => void;
}

export const CashFlowByQuarterModal: React.FC<CashFlowByQuarterModalProps> = ({
  tenant,
  activeProjectRefNo,
  activeProjectTitle,
  activeProcuringEntity,
  onSaveAndComplete,
  onClose
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Opportunity Projects Auto-Fill Integration
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  // Top Header Parameters
  const [procuringEntity, setProcuringEntity] = useState(activeProcuringEntity || '');
  const [procuringOffice, setProcuringOffice] = useState('');
  const [contractRefNo, setContractRefNo] = useState(activeProjectRefNo || '');
  const [contractName, setContractName] = useState(activeProjectTitle || '');
  const [contractLocation, setContractLocation] = useState('');
  
  // Statutory Reference Parameters
  const [standardFormNo, setStandardFormNo] = useState('SF-INFR-56');
  const [revisionDate, setRevisionDate] = useState('August 11, 2004');
  const [dateSubmitted, setDateSubmitted] = useState(todayStr);

  // Total Contract Price (Clean Slate)
  const [, setTotalContractPrice] = useState<string>('');

  // Signatory & Enterprise
  const [companyName, setCompanyName] = useState(tenant?.companyName || '');
  const [signatoryName, setSignatoryName] = useState(tenant?.authorizedSignatory?.name || '');
  const [signatoryTitle, setSignatoryTitle] = useState(tenant?.authorizedSignatory?.title || '');

  // 4 Quarters Financial Data Inputs (% and Amounts) - Clean Slate
  const [q1Accomplishment, setQ1Accomplishment] = useState<string>('');
  const [q1CashFlow, setQ1CashFlow] = useState<string>('');

  const [q2Accomplishment, setQ2Accomplishment] = useState<string>('');
  const [q2CashFlow, setQ2CashFlow] = useState<string>('');

  const [q3Accomplishment, setQ3Accomplishment] = useState<string>('');
  const [q3CashFlow, setQ3CashFlow] = useState<string>('');

  const [q4Accomplishment, setQ4Accomplishment] = useState<string>('');
  const [q4CashFlow, setQ4CashFlow] = useState<string>('');

  const projectScopeKey = (contractRefNo || selectedOppId || activeProjectRefNo || 'default').replace(/[^a-zA-Z0-9]/g, '_');

  useEffect(() => {
    const list = getOpportunityProjects(tenant?.id);
    setOppProjects(list);

    if (activeProjectRefNo) {
      const match = list.find(p => p.refNo === activeProjectRefNo);
      if (match) {
        setSelectedOppId(match.id);
        setContractRefNo(match.refNo);
        setContractName(match.title);
        setProcuringEntity(match.procuringEntity);
        if (match.dateTimeSubmitted) setDateSubmitted(match.dateTimeSubmitted);
      } else {
        setContractRefNo(activeProjectRefNo);
        if (activeProjectTitle) setContractName(activeProjectTitle);
        if (activeProcuringEntity) setProcuringEntity(activeProcuringEntity);
      }
    } else if (list.length > 0) {
      const first = list[0];
      setSelectedOppId(first.id);
      setContractRefNo(first.refNo);
      setContractName(first.title);
      setProcuringEntity(first.procuringEntity);
      if (first.dateTimeSubmitted) setDateSubmitted(first.dateTimeSubmitted);
    }
  }, [tenant?.id, activeProjectRefNo, activeProjectTitle, activeProcuringEntity]);

  // Load project-scoped saved cash flow data from localStorage
  useEffect(() => {
    if (!tenant?.id) return;
    const storageKey = `bidocs_cash_flow_${tenant.id}_${projectScopeKey}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) {
          if (parsed.totalContractPrice !== undefined) setTotalContractPrice(parsed.totalContractPrice);
          if (parsed.q1Accomplishment !== undefined) setQ1Accomplishment(parsed.q1Accomplishment);
          if (parsed.q1CashFlow !== undefined) setQ1CashFlow(parsed.q1CashFlow);
          if (parsed.q2Accomplishment !== undefined) setQ2Accomplishment(parsed.q2Accomplishment);
          if (parsed.q2CashFlow !== undefined) setQ2CashFlow(parsed.q2CashFlow);
          if (parsed.q3Accomplishment !== undefined) setQ3Accomplishment(parsed.q3Accomplishment);
          if (parsed.q3CashFlow !== undefined) setQ3CashFlow(parsed.q3CashFlow);
          if (parsed.q4Accomplishment !== undefined) setQ4Accomplishment(parsed.q4Accomplishment);
          if (parsed.q4CashFlow !== undefined) setQ4CashFlow(parsed.q4CashFlow);
          return;
        }
      } catch (e) {
        console.error('[CashFlow] Load error:', e);
      }
    }
    // Clean Reset for projects with no data
    setTotalContractPrice('');
    setQ1Accomplishment('');
    setQ1CashFlow('');
    setQ2Accomplishment('');
    setQ2CashFlow('');
    setQ3Accomplishment('');
    setQ3CashFlow('');
    setQ4Accomplishment('');
    setQ4CashFlow('');
  }, [tenant?.id, projectScopeKey]);


  useEffect(() => {
    if (tenant) {
      if (tenant.companyName) setCompanyName(tenant.companyName);
      if (tenant.authorizedSignatory?.name) setSignatoryName(tenant.authorizedSignatory.name);
      if (tenant.authorizedSignatory?.title) setSignatoryTitle(tenant.authorizedSignatory.title);
    }
  }, [tenant]);

  const handleSelectOpportunity = (oppId: string) => {
    setSelectedOppId(oppId);
    const found = oppProjects.find(p => p.id === oppId || p.refNo === oppId);
    if (found) {
      setContractRefNo(found.refNo);
      setContractName(found.title);
      setProcuringEntity(found.procuringEntity);
      if (found.dateTimeSubmitted) setDateSubmitted(found.dateTimeSubmitted);
      if (found.abc) {
        const numericAbc = found.abc.replace(/[^0-9.-]+/g, '');
        if (numericAbc) setTotalContractPrice(numericAbc);
      }
    }
  };

  // Helper number parser
  const parseNum = (val: string): number => {
    const cleaned = val.replace(/[^0-9.-]+/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  };

  // Auto Calculations for Cumulative Accomplishments % & Cumulative Cash Flow Amounts ₱
  const nQ1Acc = parseNum(q1Accomplishment);
  const nQ2Acc = parseNum(q2Accomplishment);
  const nQ3Acc = parseNum(q3Accomplishment);
  const nQ4Acc = parseNum(q4Accomplishment);

  const totalAccomplishment = nQ1Acc + nQ2Acc + nQ3Acc + nQ4Acc;
  const cumQ1Acc = nQ1Acc;
  const cumQ2Acc = nQ1Acc + nQ2Acc;
  const cumQ3Acc = nQ1Acc + nQ2Acc + nQ3Acc;
  const cumQ4Acc = nQ1Acc + nQ2Acc + nQ3Acc + nQ4Acc;

  const nQ1CF = parseNum(q1CashFlow);
  const nQ2CF = parseNum(q2CashFlow);
  const nQ3CF = parseNum(q3CashFlow);
  const nQ4CF = parseNum(q4CashFlow);

  const totalCashFlow = nQ1CF + nQ2CF + nQ3CF + nQ4CF;
  const cumQ1CF = nQ1CF;
  const cumQ2CF = nQ1CF + nQ2CF;
  const cumQ3CF = nQ1CF + nQ2CF + nQ3CF;
  const cumQ4CF = nQ1CF + nQ2CF + nQ3CF + nQ4CF;

  // Format percent display
  const fmtPct = (val: number): string => `${val.toFixed(2)}%`;
  // Format peso display
  const fmtPeso = (val: number): string => val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const [isSaving, setIsSaving] = useState(false);

  const handleExportPdf = async () => {
    setIsSaving(true);
    try {
      const fileName = `${contractRefNo || 'PROJECT'}_Financial_Envelope_Cash_Flow_By_Quarter.pdf`;
      const templateElems = document.querySelectorAll('.cashflow-paper');
      if (templateElems.length > 0) {
        const elemArray = Array.from(templateElems) as HTMLElement[];
        await generateAndDownloadThreeLayerPdf(null, elemArray, undefined, fileName);
      }
    } catch (err) {
      console.error('[CashFlow] Export PDF Error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndComplete = async () => {
    setIsSaving(true);
    try {
      const fileName = `${contractRefNo || 'PROJECT'}_Financial_Envelope_Cash_Flow_By_Quarter.pdf`;
      const templateElems = document.querySelectorAll('.cashflow-paper');
      let dataUrl: string | undefined = undefined;
      if (templateElems.length > 0) {
        const elemArray = Array.from(templateElems) as HTMLElement[];
        dataUrl = await buildMergedThreeLayerPdfDataUrl(
          [{ title: 'Cash Flow by Quarter (SF-INFR-56)', formElement: elemArray }],
          fileName
        );
      }
      if (onSaveAndComplete) {
        onSaveAndComplete(dataUrl, `Cash Flow by Quarter (SF-INFR-56) - [${contractRefNo}]`, contractRefNo, contractName);
      }
      if (onClose) onClose();
    } catch (err) {
      console.error('[CashFlow] Save Error:', err);
      if (onSaveAndComplete) {
        onSaveAndComplete(undefined, `Cash Flow by Quarter (SF-INFR-56) - [${contractRefNo}]`, contractRefNo, contractName);
      }
      if (onClose) onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      
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
          .no-print {
            display: none !important;
          }
          .cashflow-paper {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0.45in 0.5in !important;
            width: 8.5in !important;
            min-height: 13in !important;
            page-break-after: always !important;
          }
          .cashflow-paper:last-child {
            page-break-after: avoid !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col">
        
        {/* Top Header Bar */}
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/95 sticky top-0 z-20 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight flex items-center gap-2">
                <span>Cash Flow by Quarter and Payment Schedule (SF-INFR-56)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                  Statutory Form SF-INFR-56
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Legal 8.5" × 13" Portrait
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Financial Schedule of Work Accomplishments and Quarterly Cash Flow Projections
              </p>
            </div>
          </div>

          {/* PROMINENT PROJECT SELECTOR DROPDOWN */}
          <div className="flex items-center gap-2 bg-slate-950 border border-purple-500/50 rounded-xl px-3 py-1.5 shadow-inner">
            <FolderKanban className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-mono font-bold text-slate-300 uppercase">Bidding Project:</span>
            </div>
            <select
              value={selectedOppId}
              onChange={(e) => handleSelectOpportunity(e.target.value)}
              className="bg-transparent text-white font-mono text-xs font-bold focus:outline-none cursor-pointer border-none max-w-xs sm:max-w-md truncate"
            >
              {oppProjects.length === 0 ? (
                <option value="">[{contractRefNo}] {contractName}</option>
              ) : (
                oppProjects.map(p => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    [{p.refNo}] {p.title} ({p.procuringEntity})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAndComplete}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-300" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Save & Attach to Vault</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition border border-slate-700 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition border border-slate-700 flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Legal</span>
            </button>

            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form & Paper Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 space-y-6">

          {/* Interactive Form Controls & Quarter Inputs */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 no-print">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <label className="block text-xs font-mono font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span>Target Contract & Cash Flow Parameters:</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Auto-populates SF-INFR-56 Header & Grid</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="col-span-full">
                <label className="block text-slate-300 font-mono mb-1 font-bold">
                  Select Active Bidding Opportunity from Opportunity Finder:
                </label>
                <select
                  value={selectedOppId}
                  onChange={(e) => handleSelectOpportunity(e.target.value)}
                  className="w-full bg-slate-950 border border-purple-500/60 rounded-xl px-3.5 py-2 text-white font-mono text-xs font-bold focus:outline-none focus:border-purple-400 shadow-inner cursor-pointer"
                >
                  <option value="">-- Custom Inputs --</option>
                  {oppProjects.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.refNo}] {p.title} — {p.procuringEntity} ({p.abc})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Procuring Entity <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={procuringEntity}
                  onChange={(e) => setProcuringEntity(e.target.value)}
                  placeholder="e.g. Philippine Ports Authority"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Office / Division Name</label>
                <input
                  type="text"
                  value={procuringOffice}
                  onChange={(e) => setProcuringOffice(e.target.value)}
                  placeholder="e.g. Port District Office – Southern Mindanao"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Contract Reference Number <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={contractRefNo}
                  onChange={(e) => setContractRefNo(e.target.value)}
                  placeholder="e.g. COP-SoMin 01-2014"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono font-bold"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 font-mono mb-1">Contract Name / Project Title <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={contractName}
                  onChange={(e) => setContractName(e.target.value)}
                  placeholder="e.g. Construction of RC Landing and RORO Ramp"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Location of Contract <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={contractLocation}
                  onChange={(e) => setContractLocation(e.target.value)}
                  placeholder="e.g. Port of Dapitan, Dapitan City"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Standard Form Number</label>
                <input
                  type="text"
                  value={standardFormNo}
                  onChange={(e) => setStandardFormNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Revision Date</label>
                <input
                  type="text"
                  value={revisionDate}
                  onChange={(e) => setRevisionDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Submission Date</label>
                <input
                  type="date"
                  value={dateSubmitted}
                  onChange={(e) => setDateSubmitted(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono"
                />
              </div>

              <div className="col-span-full border-t border-slate-800 pt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <label className="block text-amber-400 font-mono font-bold text-[11px]">1ST QUARTER</label>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono">Accomplishment (%):</span>
                    <input
                      type="text"
                      value={q1Accomplishment}
                      onChange={(e) => setQ1Accomplishment(e.target.value)}
                      placeholder="25.00"
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono">Cash Flow (₱):</span>
                    <input
                      type="text"
                      value={q1CashFlow}
                      onChange={(e) => setQ1CashFlow(e.target.value)}
                      placeholder="3,125,000.00"
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-emerald-400 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <label className="block text-amber-400 font-mono font-bold text-[11px]">2ND QUARTER</label>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono">Accomplishment (%):</span>
                    <input
                      type="text"
                      value={q2Accomplishment}
                      onChange={(e) => setQ2Accomplishment(e.target.value)}
                      placeholder="35.00"
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono">Cash Flow (₱):</span>
                    <input
                      type="text"
                      value={q2CashFlow}
                      onChange={(e) => setQ2CashFlow(e.target.value)}
                      placeholder="4,375,000.00"
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-emerald-400 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <label className="block text-amber-400 font-mono font-bold text-[11px]">3RD QUARTER</label>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono">Accomplishment (%):</span>
                    <input
                      type="text"
                      value={q3Accomplishment}
                      onChange={(e) => setQ3Accomplishment(e.target.value)}
                      placeholder="25.00"
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono">Cash Flow (₱):</span>
                    <input
                      type="text"
                      value={q3CashFlow}
                      onChange={(e) => setQ3CashFlow(e.target.value)}
                      placeholder="3,125,000.00"
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-emerald-400 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <label className="block text-amber-400 font-mono font-bold text-[11px]">4TH QUARTER</label>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono">Accomplishment (%):</span>
                    <input
                      type="text"
                      value={q4Accomplishment}
                      onChange={(e) => setQ4Accomplishment(e.target.value)}
                      placeholder="15.00"
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono">Cash Flow (₱):</span>
                    <input
                      type="text"
                      value={q4CashFlow}
                      onChange={(e) => setQ4CashFlow(e.target.value)}
                      placeholder="1,875,000.00"
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-emerald-400 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-full border-t border-slate-800 pt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Authorized Representative Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    placeholder="e.g. ENGR. JUAN DELA CRUZ"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">Position / Title <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={signatoryTitle}
                    onChange={(e) => setSignatoryTitle(e.target.value)}
                    placeholder="e.g. General Manager / Managing Partner"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">Name of the Bidder / Enterprise <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. QUANTUM BUILDERS INC."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold uppercase"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* EXACT STATUTORY LEGAL PORTRAIT PAPER LAYOUT PREVIEW (SF-INFR-56) */}
          <div className="space-y-8 flex flex-col items-center">

            <div className="cashflow-paper single-page-paper print-document-sheet w-[8.5in] min-w-[8.5in] max-w-[8.5in] min-h-[13in] bg-white text-slate-950 p-[0.45in] shadow-2xl font-sans text-[9pt] leading-normal flex flex-col justify-between mx-auto border-2 border-slate-950 box-border shrink-0">
              <div className="space-y-4">
                
                {/* 1. OFFICIAL DOCUMENT TITLE */}
                <div className="border-b-2 border-slate-950 pb-2 space-y-1">
                  <div className="text-center pt-1 pb-1">
                    <h1 className="text-center text-lg font-extrabold uppercase tracking-wide text-slate-950">
                      CASH FLOW BY QUARTER AND PAYMENT SCHEDULE
                    </h1>
                  </div>

                  {/* 2. OFFICIAL METADATA TABLE HEADER (MATCHING BILL OF QUANTITIES & PRICE SCHEDULE) */}
                  <table className="w-full border-collapse border-2 border-slate-950 text-slate-900 text-[8.5pt]">
                    <tbody>
                      <tr>
                        <td colSpan={2} className="border border-slate-950 p-1.5 text-left font-bold italic">
                          Contract Name: <span className="not-italic uppercase font-bold text-slate-950">{contractName || '____________________________________________________________________'}</span>
                          {contractLocation && (
                            <span className="ml-4 font-bold italic">
                              Location: <span className="not-italic uppercase">{contractLocation}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-slate-950 p-1.5 text-left w-2/3">
                          <span className="font-semibold">Name of Bidder: </span>
                          <span className="font-bold uppercase text-slate-950">{companyName || 'Quantum Cloud Corporation'}</span>
                        </td>
                        <td className="border border-slate-950 p-1.5 text-left w-1/3">
                          <span className="font-semibold">Project ID / Ref No: </span>
                          <span className="font-bold font-mono pl-1 text-slate-950">{contractRefNo || 'N/A'}</span>
                        </td>
                      </tr>
                      {procuringEntity && (
                        <tr>
                          <td colSpan={2} className="border border-slate-950 p-1.5 text-left text-[8pt] bg-slate-50">
                            <span className="font-semibold">Procuring Entity: </span>
                            <span className="font-bold uppercase text-slate-900">{procuringEntity}</span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Statutory Grid Table (SF-INFR-56) */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border-2 border-slate-950 text-[9.5pt] font-sans">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-950 text-center font-bold uppercase">
                        <th className="border border-slate-950 p-2 text-left w-64">PARTICULAR</th>
                        <th className="border border-slate-950 p-2 w-20">% WT.</th>
                        <th className="border border-slate-950 p-2 w-36">1ST QUARTER</th>
                        <th className="border border-slate-950 p-2 w-36">2ND QUARTER</th>
                        <th className="border border-slate-950 p-2 w-36">3RD QUARTER</th>
                        <th className="border border-slate-950 p-2 w-36">4TH QUARTER</th>
                      </tr>
                    </thead>
                    <tbody>
                      
                      {/* Row 1: ACCOMPLISHMENT */}
                      <tr className="border-b border-slate-950 font-medium">
                        <td className="border border-slate-950 p-2 font-bold uppercase">ACCOMPLISHMENT</td>
                        <td className="border border-slate-950 p-2 text-center font-mono font-bold text-blue-900">{fmtPct(totalAccomplishment)}</td>
                        <td className="border border-slate-950 p-2 text-center font-mono">{fmtPct(nQ1Acc)}</td>
                        <td className="border border-slate-950 p-2 text-center font-mono">{fmtPct(nQ2Acc)}</td>
                        <td className="border border-slate-950 p-2 text-center font-mono">{fmtPct(nQ3Acc)}</td>
                        <td className="border border-slate-950 p-2 text-center font-mono">{fmtPct(nQ4Acc)}</td>
                      </tr>

                      {/* Row 2: CASH FLOW */}
                      <tr className="border-b border-slate-950 font-medium">
                        <td className="border border-slate-950 p-2 font-bold uppercase">CASH FLOW</td>
                        <td className="border border-slate-950 p-2 text-center font-mono text-xs">₱</td>
                        <td className="border border-slate-950 p-2 text-right font-mono font-semibold">{fmtPeso(nQ1CF)}</td>
                        <td className="border border-slate-950 p-2 text-right font-mono font-semibold">{fmtPeso(nQ2CF)}</td>
                        <td className="border border-slate-950 p-2 text-right font-mono font-semibold">{fmtPeso(nQ3CF)}</td>
                        <td className="border border-slate-950 p-2 text-right font-mono font-semibold">{fmtPeso(nQ4CF)}</td>
                      </tr>

                      {/* Row 3: CUMULATIVE ACCOMPLISHMENT */}
                      <tr className="border-b border-slate-950 font-medium bg-slate-50">
                        <td className="border border-slate-950 p-2 font-bold uppercase">CUMULATIVE ACCOMPLISHMENT</td>
                        <td className="border border-slate-950 p-2 text-center font-mono font-bold">{fmtPct(cumQ4Acc)}</td>
                        <td className="border border-slate-950 p-2 text-center font-mono font-bold">{fmtPct(cumQ1Acc)}</td>
                        <td className="border border-slate-950 p-2 text-center font-mono font-bold">{fmtPct(cumQ2Acc)}</td>
                        <td className="border border-slate-950 p-2 text-center font-mono font-bold">{fmtPct(cumQ3Acc)}</td>
                        <td className="border border-slate-950 p-2 text-center font-mono font-bold">{fmtPct(cumQ4Acc)}</td>
                      </tr>

                      {/* Row 4: CUMULATIVE CASH FLOW */}
                      <tr className="border-b-2 border-slate-950 font-bold bg-slate-100">
                        <td className="border border-slate-950 p-2 font-bold uppercase">CUMULATIVE CASH FLOW</td>
                        <td className="border border-slate-950 p-2 text-center font-mono text-xs">₱</td>
                        <td className="border border-slate-950 p-2 text-right font-mono font-bold text-emerald-800">{fmtPeso(cumQ1CF)}</td>
                        <td className="border border-slate-950 p-2 text-right font-mono font-bold text-emerald-800">{fmtPeso(cumQ2CF)}</td>
                        <td className="border border-slate-950 p-2 text-right font-mono font-bold text-emerald-800">{fmtPeso(cumQ3CF)}</td>
                        <td className="border border-slate-950 p-2 text-right font-mono font-bold text-emerald-800">{fmtPeso(cumQ4CF)}</td>
                      </tr>

                    </tbody>
                  </table>
                </div>

                {/* Signature Block matching exact template position */}
                <div className="pt-8 space-y-4 font-sans text-[10pt]">
                  <p className="font-semibold">Submitted by:</p>
                  
                  <div className="pt-6 flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-950 uppercase border-b border-slate-950 inline-block pr-12 pb-0.5">
                        {signatoryName || 'Name of the Representative of the Bidder'}
                      </p>
                      <p className="italic text-slate-800">{signatoryTitle || 'Position'}</p>
                      <p className="font-bold text-slate-950 uppercase pt-1">{companyName || 'Name of the Bidder'}</p>
                    </div>

                    <div className="font-sans text-[10pt]">
                      <span>Date: </span>
                      <strong className="border-b border-slate-950 pb-0.5 font-mono px-4">
                        {dateSubmitted ? new Date(dateSubmitted).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '____________________'}
                      </strong>
                    </div>
                  </div>
                </div>

              </div>

              {/* Document Footer */}
              <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[8.5pt] font-mono text-slate-700">
                <div className="flex items-center gap-3">
                  <DocumentQrCode
                    details={{
                      companyName: companyName || 'Bidding Entity',
                      documentName: 'Cash Flow by Quarter (SF-INFR-56)',
                      documentNumber: `FIN-CASHFLOW-${contractRefNo || 'SCHED'}`,
                      projectTitle: contractName,
                      projectRefNo: contractRefNo,
                      procuringEntity: procuringEntity,
                      dateTimeSubmitted: dateSubmitted || 'March 19, 2026',
                      documentCategory: 'Financial Documents',
                      generatedBy: companyName || 'Bidding Entity'
                    }}
                    size={45}
                    showCaption={false}
                  />
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-950 uppercase">{companyName || 'BIDDING ENTITY'}</p>
                    <p>CONTRACT: <strong>{contractName || 'N/A'}</strong></p>
                    <p>REF NO: <strong>{contractRefNo || 'N/A'}</strong> • PROCURING ENTITY: <strong>{procuringEntity || 'N/A'}</strong></p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold font-mono">Page 1 of 1</span>
                  <p className="text-[7.5pt] text-slate-500">Cash Flow by Quarter & Payment Schedule</p>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/95 sticky bottom-0 z-10 shrink-0 no-print">
          <div className="text-xs font-mono text-slate-400">
            Total Cash Flow Amount: <span className="text-emerald-400 font-bold font-mono text-sm">₱ {fmtPeso(totalCashFlow)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndComplete}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating & Saving PDF...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save & Complete Cash Flow Schedule</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// Default export alias
export default CashFlowByQuarterModal;

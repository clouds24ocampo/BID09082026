import React, { useState, useEffect } from 'react';
import { Tenant } from '../../../types';
import { PDFDocument } from 'pdf-lib';
import html2canvas from 'html2canvas';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import VaultErrorBoundary from '../../common/VaultErrorBoundary';
import {
  X,
  Download,
  CheckCircle2,
  Clock,
  Briefcase
} from 'lucide-react';

export interface SoteModalProps {
  item?: { id: string; code: string; name: string };
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  procuringEntityAddress?: string;
  procuringEntityContactPerson?: string;
  headOfProcuringEntity?: string;
  headOfProcuringEntityPosition?: string;
  solicitationNumber?: string;
  contractAmount?: number;
  projectLocation?: string;
  contractDays?: number;
  dateTimeSubmitted?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose?: () => void;
}

export const SoteModalContent: React.FC<SoteModalProps> = ({
  item,
  tenant,
  activeProjectRefNo = '',
  activeProjectTitle = '',
  activeProcuringEntity = '',
  procuringEntityAddress = '',
  procuringEntityContactPerson = '',
  headOfProcuringEntity: propHeadOfProcuringEntity = '',
  headOfProcuringEntityPosition: propHeadOfProcuringEntityPosition = '',
  solicitationNumber: propSolicitationNumber = '',
  contractAmount: propContractAmount = 0,
  projectLocation: propProjectLocation = '',
  contractDays: propContractDays = 180,
  dateTimeSubmitted: propDateTimeSubmitted = '',
  onSaveAndComplete,
  onClose
}) => {
  const todayStr = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  const [, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  const [companyName, setCompanyName] = useState<string>(tenant?.companyName || '');
  const [projectTitle, setProjectTitle] = useState<string>(activeProjectTitle || '');
  const [projectRefNo, setProjectRefNo] = useState<string>(activeProjectRefNo || '');
  const [procuringEntity, setProcuringEntity] = useState<string>(activeProcuringEntity || '');
  const [asOfDate, setAsOfDate] = useState<string>(todayStr);

  // Time & Duration Parameters
  const [ntpDate, setNtpDate] = useState<string>('2026-03-01');
  const [effectivityDate, setEffectivityDate] = useState<string>('2026-03-08');
  const [originalDurationDays, setOriginalDurationDays] = useState<number>(propContractDays || 180);
  const [originalExpiryDate, setOriginalExpiryDate] = useState<string>('2026-09-04');
  const [timeExtensionDays, setTimeExtensionDays] = useState<number>(15);
  const [timeSuspensionDays, setTimeSuspensionDays] = useState<number>(0);
  const [revisedExpiryDate, setRevisedExpiryDate] = useState<string>('2026-09-19');

  const [calendarDaysElapsed, setCalendarDaysElapsed] = useState<number>(140);
  const [actualAccomplishmentPercent, setActualAccomplishmentPercent] = useState<number>(82.5);
  const [plannedAccomplishmentPercent, setPlannedAccomplishmentPercent] = useState<number>(78.0);

  // Signatories
  const [contractorPE, setContractorPE] = useState<string>(tenant?.authorizedSignatory?.name || 'Engr. Contractor Project Engineer');
  const [residentEngineer, setResidentEngineer] = useState<string>(procuringEntityContactPerson || 'Engr. Government Resident Engineer');
  const [districtEngineer, setDistrictEngineer] = useState<string>(
    propHeadOfProcuringEntity
      ? (propHeadOfProcuringEntityPosition ? `${propHeadOfProcuringEntity} (${propHeadOfProcuringEntityPosition})` : propHeadOfProcuringEntity)
      : 'Head of Procuring Entity / District Engineer'
  );

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const projectScopeKey = (projectRefNo || selectedOppId || activeProjectRefNo || 'default').replace(/[^a-zA-Z0-9]/g, '_');

  const revisedDurationDays = originalDurationDays + timeExtensionDays;
  const calendarDaysRemaining = Math.max(0, revisedDurationDays - calendarDaysElapsed);
  const timeElapsedPercent = revisedDurationDays > 0 ? (calendarDaysElapsed / revisedDurationDays) * 100 : 0;
  const slippagePercent = actualAccomplishmentPercent - plannedAccomplishmentPercent;

  useEffect(() => {
    const tenantId = tenant?.id || 'default';
    const list = getOpportunityProjects(tenantId);
    setOppProjects(list);

    if (tenant?.companyName) setCompanyName(tenant.companyName);
    if (tenant?.authorizedSignatory?.name) setContractorPE(tenant.authorizedSignatory.name);

    const storageKey = `bidocs_sote_${tenantId}_${projectScopeKey}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.projectTitle) setProjectTitle(parsed.projectTitle);
        if (parsed.projectRefNo) setProjectRefNo(parsed.projectRefNo);
        if (parsed.procuringEntity) setProcuringEntity(parsed.procuringEntity);
        if (parsed.asOfDate) setAsOfDate(parsed.asOfDate);
        if (parsed.ntpDate) setNtpDate(parsed.ntpDate);
        if (parsed.effectivityDate) setEffectivityDate(parsed.effectivityDate);
        if (parsed.originalDurationDays !== undefined) setOriginalDurationDays(parsed.originalDurationDays);
        if (parsed.originalExpiryDate) setOriginalExpiryDate(parsed.originalExpiryDate);
        if (parsed.timeExtensionDays !== undefined) setTimeExtensionDays(parsed.timeExtensionDays);
        if (parsed.timeSuspensionDays !== undefined) setTimeSuspensionDays(parsed.timeSuspensionDays);
        if (parsed.revisedExpiryDate) setRevisedExpiryDate(parsed.revisedExpiryDate);
        if (parsed.calendarDaysElapsed !== undefined) setCalendarDaysElapsed(parsed.calendarDaysElapsed);
        if (parsed.actualAccomplishmentPercent !== undefined) setActualAccomplishmentPercent(parsed.actualAccomplishmentPercent);
        if (parsed.plannedAccomplishmentPercent !== undefined) setPlannedAccomplishmentPercent(parsed.plannedAccomplishmentPercent);
        if (parsed.contractorPE) setContractorPE(parsed.contractorPE);
        if (parsed.residentEngineer) setResidentEngineer(parsed.residentEngineer);
        if (parsed.districtEngineer) setDistrictEngineer(parsed.districtEngineer);
        return;
      }
    } catch (e) {
      console.error('[SOTE] Storage load error:', e);
    }

    if (list.length > 0 && !selectedOppId) {
      const match = activeProjectRefNo ? list.find(p => p.refNo === activeProjectRefNo) : null;
      const target = match || list[0];
      if (target) {
        setSelectedOppId(target.id);
        setProjectTitle(target.title);
        setProjectRefNo(target.refNo);
        setProcuringEntity(target.procuringEntity);
      }
    }
  }, [tenant, activeProjectRefNo, projectScopeKey]);

  const handleSaveState = () => {
    const tenantId = tenant?.id || 'default';
    const storageKey = `bidocs_sote_${tenantId}_${projectScopeKey}`;
    const payload = {
      companyName,
      projectTitle,
      projectRefNo,
      procuringEntity,
      asOfDate,
      ntpDate,
      effectivityDate,
      originalDurationDays,
      originalExpiryDate,
      timeExtensionDays,
      timeSuspensionDays,
      revisedExpiryDate,
      calendarDaysElapsed,
      actualAccomplishmentPercent,
      plannedAccomplishmentPercent,
      contractorPE,
      residentEngineer,
      districtEngineer
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error('[SOTE] Save state error:', e);
    }
  };

  const generatePdf = async (): Promise<string | null> => {
    const printArea = document.getElementById('sote-print-sheet');
    if (!printArea) return null;
    try {
      setIsSaving(true);
      handleSaveState();

      const canvas = await html2canvas(printArea, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfDoc = await PDFDocument.create();
      // Philippine Legal: 8.5" x 13" -> 612 x 936 pt
      const page = pdfDoc.addPage([612, 936]);
      const img = await pdfDoc.embedPng(imgData);

      const margin = 24;
      const printableWidth = 612 - margin * 2;
      const printableHeight = 936 - margin * 2;
      const imgAspect = canvas.width / canvas.height;

      let drawWidth = printableWidth;
      let drawHeight = printableWidth / imgAspect;

      if (drawHeight > printableHeight) {
        drawHeight = printableHeight;
        drawWidth = printableHeight * imgAspect;
      }

      const x = margin + (printableWidth - drawWidth) / 2;
      const y = 936 - margin - drawHeight;

      page.drawImage(img, { x, y, width: drawWidth, height: drawHeight });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error('[SOTE] Generate PDF error:', err);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = async () => {
    const dataUrl = await generatePdf();
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Statement_of_Time_Elapsed_${projectRefNo || 'Project'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveAndComplete = async () => {
    const dataUrl = await generatePdf();
    if (dataUrl && onSaveAndComplete) {
      onSaveAndComplete(
        dataUrl,
        'Statement of Time Elapsed (SOTE)',
        projectRefNo,
        projectTitle
      );
    }
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              Statement of Time Elapsed (SOTE) & Slippage Analysis
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Contract Duration & Time Extensions Accounting • Philippine Legal (8.5" x 13")
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={isSaving}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={handleSaveAndComplete}
            disabled={isSaving}
            className="px-4 py-1.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-blue-600/30 border border-blue-400/40 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Save & Attach to Vault</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Form Controls (5 cols) */}
        <div className="lg:col-span-5 p-5 overflow-y-auto border-r border-slate-800 space-y-4 bg-slate-900/40">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Project & Milestone Dates
            </h3>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Project Title</label>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Contract / Ref No.</label>
                <input
                  type="text"
                  value={projectRefNo}
                  onChange={(e) => setProjectRefNo(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">As of Cut-Off Date</label>
                <input
                  type="text"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Notice to Proceed (NTP)</label>
                <input
                  type="text"
                  value={ntpDate}
                  onChange={(e) => setNtpDate(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Effectivity Date</label>
                <input
                  type="text"
                  value={effectivityDate}
                  onChange={(e) => setEffectivityDate(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Time & Duration Accounting */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Contract Duration & Extensions (CD)
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Original (Days)</label>
                <input
                  type="number"
                  value={originalDurationDays}
                  onChange={(e) => setOriginalDurationDays(Number(e.target.value))}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Extension (Days)</label>
                <input
                  type="number"
                  value={timeExtensionDays}
                  onChange={(e) => setTimeExtensionDays(Number(e.target.value))}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Elapsed (Days)</label>
                <input
                  type="number"
                  value={calendarDaysElapsed}
                  onChange={(e) => setCalendarDaysElapsed(Number(e.target.value))}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Original Expiry</label>
                <input
                  type="text"
                  value={originalExpiryDate}
                  onChange={(e) => setOriginalExpiryDate(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Revised Expiry</label>
                <input
                  type="text"
                  value={revisedExpiryDate}
                  onChange={(e) => setRevisedExpiryDate(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-semibold text-amber-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Actual Accomplishment (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={actualAccomplishmentPercent}
                  onChange={(e) => setActualAccomplishmentPercent(Number(e.target.value))}
                  className="w-full mt-1 bg-slate-950 border border-emerald-500 rounded px-2 py-1 text-xs text-emerald-400 font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Planned Accomplishment (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={plannedAccomplishmentPercent}
                  onChange={(e) => setPlannedAccomplishmentPercent(Number(e.target.value))}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview Sheet (7 cols) */}
        <div className="lg:col-span-7 p-6 overflow-y-auto bg-slate-950 flex justify-center items-start">
          <div
            id="sote-print-sheet"
            className="w-[816px] min-h-[1248px] bg-white text-slate-900 p-12 shadow-2xl rounded-sm flex flex-col justify-between text-[12px] leading-relaxed"
            style={{ boxSizing: 'border-box' }}
          >
            <div>
              {/* Header */}
              <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                <h1 className="text-base font-black tracking-wide uppercase text-slate-900">{companyName || 'CONTRACTOR / FIRM NAME'}</h1>
                <p className="text-[11px] text-slate-700 font-bold uppercase tracking-wider">STATEMENT OF TIME ELAPSED (SOTE)</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">As of Cut-Off Date: {asOfDate}</p>
              </div>

              {/* Project Meta */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-3 bg-slate-50 border border-slate-300 rounded text-xs">
                <div>
                  <p><strong>Project Name:</strong> {projectTitle || 'N/A'}</p>
                  <p><strong>Procuring Entity:</strong> {procuringEntity || 'Government Agency'}</p>
                </div>
                <div>
                  <p><strong>Contract / Ref No.:</strong> <span className="font-mono">{projectRefNo || 'N/A'}</span></p>
                  <p><strong>Notice to Proceed (NTP):</strong> <span className="font-mono">{ntpDate}</span></p>
                </div>
              </div>

              {/* SOTE Accounting Table */}
              <div className="border border-slate-400 rounded overflow-hidden mb-6">
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-300">
                    <tr className="bg-slate-100 font-bold">
                      <td className="p-2.5">1. Contract Effectivity Date</td>
                      <td className="p-2.5 text-right font-mono">{effectivityDate}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5">2. Original Contract Duration</td>
                      <td className="p-2.5 text-right font-mono font-semibold">{originalDurationDays} Calendar Days</td>
                    </tr>
                    <tr>
                      <td className="p-2.5">3. Original Expiry Date</td>
                      <td className="p-2.5 text-right font-mono">{originalExpiryDate}</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-2.5">4. Approved Time Extension(s)</td>
                      <td className="p-2.5 text-right font-mono text-blue-800">+{timeExtensionDays} Calendar Days</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-2.5">5. Approved Suspension Order(s)</td>
                      <td className="p-2.5 text-right font-mono">{timeSuspensionDays} Calendar Days</td>
                    </tr>
                    <tr className="bg-slate-100 font-bold">
                      <td className="p-2.5">6. Revised Contract Duration & Expiry Date</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-950">
                        {revisedDurationDays} CD ({revisedExpiryDate})
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-slate-800">7. Total Calendar Days Elapsed to Date</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        {calendarDaysElapsed} Calendar Days
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-slate-800">8. Calendar Days Remaining</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        {calendarDaysRemaining} Calendar Days
                      </td>
                    </tr>
                    <tr className="bg-blue-50 font-bold text-blue-950">
                      <td className="p-2.5">9. Percentage of Time Elapsed</td>
                      <td className="p-2.5 text-right font-mono text-sm">{timeElapsedPercent.toFixed(2)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Slippage & Progress Comparison */}
              <div className="p-4 bg-slate-50 border border-slate-300 rounded text-xs space-y-2 mb-6">
                <p className="font-bold text-slate-900 uppercase border-b border-slate-200 pb-1">PROGRESS & SLIPPAGE EVALUATION:</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-white border border-slate-200 rounded">
                    <p className="text-[10px] text-slate-500">Planned Accomplishment</p>
                    <p className="text-sm font-bold font-mono text-slate-800">{plannedAccomplishmentPercent.toFixed(2)}%</p>
                  </div>
                  <div className="p-2 bg-white border border-slate-200 rounded">
                    <p className="text-[10px] text-slate-500">Actual Accomplishment</p>
                    <p className="text-sm font-bold font-mono text-emerald-700">{actualAccomplishmentPercent.toFixed(2)}%</p>
                  </div>
                  <div className="p-2 bg-white border border-slate-200 rounded">
                    <p className="text-[10px] text-slate-500">Project Slippage</p>
                    <p className={`text-sm font-bold font-mono ${slippagePercent >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {slippagePercent >= 0 ? `+${slippagePercent.toFixed(2)}% (Ahead)` : `${slippagePercent.toFixed(2)}% (Behind)`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 3-Party Signatures */}
            <div className="pt-6 border-t border-slate-300">
              <div className="grid grid-cols-3 gap-4 text-center text-[10px]">
                <div className="space-y-1">
                  <p className="text-slate-500">Prepared by (Contractor):</p>
                  <div className="h-10"></div>
                  <p className="font-bold underline uppercase text-slate-900">{contractorPE}</p>
                  <p className="text-slate-600">Project Engineer / In-Charge</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500">Checked & Verified by:</p>
                  <div className="h-10"></div>
                  <p className="font-bold underline uppercase text-slate-900">{residentEngineer}</p>
                  <p className="text-slate-600">Government Resident Engineer</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500">Approved by (Procuring Entity):</p>
                  <div className="h-10"></div>
                  <p className="font-bold underline uppercase text-slate-900">{districtEngineer}</p>
                  <p className="text-slate-600">Head of Procuring Entity</p>
                </div>
              </div>

              <div className="mt-6 pt-2 border-t border-slate-200 flex justify-end items-center text-[9px] text-slate-400 font-mono">
                <span>Page 1 of 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function SoteModal(props: SoteModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] h-[94vh] flex flex-col">
        <VaultErrorBoundary>
          <SoteModalContent {...props} />
        </VaultErrorBoundary>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Tenant } from '../../../types';
import { PDFDocument } from 'pdf-lib';
import html2canvas from 'html2canvas';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import VaultErrorBoundary from '../../common/VaultErrorBoundary';
import {
  X,
  Printer,
  Download,
  CheckCircle2,
  RotateCcw,
  Building2,
  Calendar,
  FileText,
  DollarSign,
  ShieldCheck,
  Briefcase,
  BookOpen
} from 'lucide-react';
import StatutoryDocumentsGuideModal from './StatutoryDocumentsGuideModal';

export interface RlaModalProps {
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
  dateTimeSubmitted?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose?: () => void;
}

export const RlaModalContent: React.FC<RlaModalProps> = ({
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
  dateTimeSubmitted: propDateTimeSubmitted = '',
  onSaveAndComplete,
  onClose
}) => {
  const todayStr = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  const [companyName, setCompanyName] = useState<string>(tenant?.companyName || '');
  const [companyAddress, setCompanyAddress] = useState<string>(tenant?.address || '');
  const [projectTitle, setProjectTitle] = useState<string>(activeProjectTitle || '');
  const [projectRefNo, setProjectRefNo] = useState<string>(activeProjectRefNo || '');
  const [procuringEntity, setProcuringEntity] = useState<string>(activeProcuringEntity || '');
  const [headOfEntity, setHeadOfEntity] = useState<string>(
    propHeadOfProcuringEntity
      ? (propHeadOfProcuringEntityPosition ? `${propHeadOfProcuringEntity} (${propHeadOfProcuringEntityPosition})` : propHeadOfProcuringEntity)
      : (procuringEntityContactPerson || 'The Head of Procuring Entity / BAC Chairperson')
  );
  const [entityAddress, setEntityAddress] = useState<string>(procuringEntityAddress || '');
  const [contractAmount, setContractAmount] = useState<number>(propContractAmount || 0);
  const [advanceRate, setAdvanceRate] = useState<number>(15); // Standard 15% under RA 9184 Annex E
  const [legalFramework, setLegalFramework] = useState<'RA_9184' | 'RA_12009' | 'CUSTOM'>('RA_9184');
  const [securityInstrumentType, setSecurityInstrumentType] = useState<string>('Irrevocable Standby Letter of Credit');
  const [suretyBondNo, setSuretyBondNo] = useState<string>('');
  const [suretyIssuer, setSuretyIssuer] = useState<string>('');
  const [ntpDate, setNtpDate] = useState<string>(todayStr);
  const [letterDate, setLetterDate] = useState<string>(todayStr);
  const [remarks, setRemarks] = useState<string>(
    'In accordance with Annex E, Section 4 of the Revised Implementing Rules and Regulations (IRR) of Republic Act No. 9184 and the terms of the Contract Agreement, we hereby formally request the release of Fifteen Percent (15%) Advance Payment / Mobilization Fund.'
  );

  const getStandardRemarks = (framework: 'RA_9184' | 'RA_12009', rate: number = 15) => {
    const rateWord = rate === 15 ? 'Fifteen Percent (15%)' : `${rate}%`;
    if (framework === 'RA_12009') {
      return `In accordance with the Implementing Rules and Regulations (IRR) of Republic Act No. 12009 (New Government Procurement Act - NGPA) and the terms of the Contract Agreement, we hereby formally request the release of ${rateWord} Advance Payment / Mobilization Fund.`;
    }
    return `In accordance with Annex E, Section 4 of the Revised Implementing Rules and Regulations (IRR) of Republic Act No. 9184 and the terms of the Contract Agreement, we hereby formally request the release of ${rateWord} Advance Payment / Mobilization Fund.`;
  };

  const handleFrameworkChange = (framework: 'RA_9184' | 'RA_12009') => {
    setLegalFramework(framework);
    setRemarks(getStandardRemarks(framework, advanceRate));
  };

  const [signatoryName, setSignatoryName] = useState<string>(tenant?.authorizedSignatory?.name || '');
  const [signatoryTitle, setSignatoryTitle] = useState<string>(tenant?.authorizedSignatory?.title || 'Authorized Managing Officer');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const projectScopeKey = (projectRefNo || selectedOppId || activeProjectRefNo || 'default').replace(/[^a-zA-Z0-9]/g, '_');

  const advanceAmount = (contractAmount * (advanceRate / 100));

  useEffect(() => {
    const tenantId = tenant?.id || 'default';
    const list = getOpportunityProjects(tenantId);
    setOppProjects(list);

    if (tenant?.companyName) setCompanyName(tenant.companyName);
    if (tenant?.address) setCompanyAddress(tenant.address);
    if (tenant?.authorizedSignatory?.name) setSignatoryName(tenant.authorizedSignatory.name);
    if (tenant?.authorizedSignatory?.title) setSignatoryTitle(tenant.authorizedSignatory.title);

    const storageKey = `bidocs_rla_${tenantId}_${projectScopeKey}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.companyAddress) setCompanyAddress(parsed.companyAddress);
        if (parsed.projectTitle) setProjectTitle(parsed.projectTitle);
        if (parsed.projectRefNo) setProjectRefNo(parsed.projectRefNo);
        if (parsed.procuringEntity) setProcuringEntity(parsed.procuringEntity);
        if (parsed.headOfEntity) setHeadOfEntity(parsed.headOfEntity);
        if (parsed.entityAddress) setEntityAddress(parsed.entityAddress);
        if (parsed.contractAmount) setContractAmount(parsed.contractAmount);
        if (parsed.advanceRate !== undefined) setAdvanceRate(parsed.advanceRate);
        if (parsed.legalFramework) setLegalFramework(parsed.legalFramework);
        if (parsed.securityInstrumentType) setSecurityInstrumentType(parsed.securityInstrumentType);
        if (parsed.suretyBondNo) setSuretyBondNo(parsed.suretyBondNo);
        if (parsed.suretyIssuer) setSuretyIssuer(parsed.suretyIssuer);
        if (parsed.ntpDate) setNtpDate(parsed.ntpDate);
        if (parsed.letterDate) setLetterDate(parsed.letterDate);
        if (parsed.remarks) setRemarks(parsed.remarks);
        if (parsed.signatoryName) setSignatoryName(parsed.signatoryName);
        if (parsed.signatoryTitle) setSignatoryTitle(parsed.signatoryTitle);
        return;
      }
    } catch (e) {
      console.error('[RLA] Storage load error:', e);
    }

    if (list.length > 0 && !selectedOppId) {
      const match = activeProjectRefNo ? list.find(p => p.refNo === activeProjectRefNo) : null;
      const target = match || list[0];
      if (target) {
        setSelectedOppId(target.id);
        setProjectTitle(target.title);
        setProjectRefNo(target.refNo);
        setProcuringEntity(target.procuringEntity);
        if (target.headOfProcuringEntity) {
          setHeadOfEntity(target.headOfProcuringEntityPosition ? `${target.headOfProcuringEntity} (${target.headOfProcuringEntityPosition})` : target.headOfProcuringEntity);
        } else if (target.procuringEntityContactPerson) {
          setHeadOfEntity(target.procuringEntityContactPerson);
        }
        if (target.procuringEntityAddress) setEntityAddress(target.procuringEntityAddress);
        const amt = Number((target as any).abc || (target as any).contractAmount || 0);
        if (amt > 0) setContractAmount(amt);
      }
    }
  }, [tenant, activeProjectRefNo, projectScopeKey]);

  const handleSaveState = () => {
    const tenantId = tenant?.id || 'default';
    const storageKey = `bidocs_rla_${tenantId}_${projectScopeKey}`;
    const payload = {
      companyName,
      companyAddress,
      projectTitle,
      projectRefNo,
      procuringEntity,
      headOfEntity,
      entityAddress,
      contractAmount,
      advanceRate,
      legalFramework,
      securityInstrumentType,
      suretyBondNo,
      suretyIssuer,
      ntpDate,
      letterDate,
      remarks,
      signatoryName,
      signatoryTitle
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error('[RLA] Save state error:', e);
    }
  };

  const generatePdf = async (): Promise<string | null> => {
    const printArea = document.getElementById('rla-print-sheet');
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
      console.error('[RLA] Generate PDF error:', err);
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
    a.download = `Request_Letter_Advance_Payment_${projectRefNo || 'Project'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveAndComplete = async () => {
    const dataUrl = await generatePdf();
    if (dataUrl && onSaveAndComplete) {
      onSaveAndComplete(
        dataUrl,
        'Request Letter for Advance Payment / Mobilization',
        projectRefNo,
        projectTitle
      );
    }
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans">
      {/* Top Action Header */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              Request Letter for Advance Payment / Mobilization (RLA)
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              {legalFramework === 'RA_12009' ? 'RA 12009 (NGPA)' : 'RA 9184 Annex E'} • {advanceRate}% Mobilization Fund Formal Request • Philippine Legal (8.5" x 13")
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuideModal(true)}
            className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-emerald-500/40 cursor-pointer"
            title="View Step-by-Step Filing & Answering Guide"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Filing Guide</span>
          </button>

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
            className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-blue-600/30 border border-blue-400/40 cursor-pointer disabled:opacity-50"
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

      {/* Main Grid Content */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Form Controls (5 cols) */}
        <div className="lg:col-span-5 p-5 overflow-y-auto border-r border-slate-800 space-y-4 bg-slate-900/40">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Project Information
            </h3>

            {oppProjects.length > 0 && (
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Load from Opportunity</label>
                <select
                  value={selectedOppId}
                  onChange={(e) => {
                    const found = oppProjects.find(p => p.id === e.target.value);
                    if (found) {
                      setSelectedOppId(found.id);
                      setProjectTitle(found.title);
                      setProjectRefNo(found.refNo);
                      setProcuringEntity(found.procuringEntity);
                      const amt = Number((found as any).abc || (found as any).contractAmount || 0);
                      if (amt > 0) setContractAmount(amt);
                    }
                  }}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="">-- Select Project Opportunity --</option>
                  {oppProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.refNo} - {p.title.slice(0, 40)}...</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Project Title</label>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                placeholder="Complete Project Title"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">PhilGEPS / Ref No.</label>
                <input
                  type="text"
                  value={projectRefNo}
                  onChange={(e) => setProjectRefNo(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  placeholder="e.g. 2026-BAC-089"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Letter Date</label>
                <input
                  type="text"
                  value={letterDate}
                  onChange={(e) => setLetterDate(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Procuring Entity / Agency</label>
              <input
                type="text"
                value={procuringEntity}
                onChange={(e) => setProcuringEntity(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                placeholder="e.g. Department of Public Works and Highways"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Head of Procuring Entity / Addressee</label>
              <input
                type="text"
                value={headOfEntity}
                onChange={(e) => setHeadOfEntity(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                placeholder="Name / Title of HOPO / District Engineer"
              />
            </div>
          </div>

          {/* Financial & Advance Details */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Financial & Advance Calculation
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Contract Amount (PHP)</label>
                <input
                  type="number"
                  value={contractAmount || ''}
                  onChange={(e) => setContractAmount(Number(e.target.value))}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Advance Rate (%)</label>
                <input
                  type="number"
                  value={advanceRate}
                  onChange={(e) => setAdvanceRate(Number(e.target.value))}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  max={15}
                  min={1}
                />
              </div>
            </div>

            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300">Requested Advance Amount:</span>
              <span className="text-sm font-black text-emerald-400 font-mono">
                ₱ {advanceAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Choice: Form of Security Instrument */}
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Form of Security / Guarantee</label>
              <select
                value={securityInstrumentType}
                onChange={(e) => setSecurityInstrumentType(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white cursor-pointer"
              >
                <option value="Irrevocable Standby Letter of Credit">Irrevocable Standby Letter of Credit</option>
                <option value="Bank Guarantee">Bank Guarantee</option>
                <option value="Callable Surety Bond">Callable Surety Bond</option>
                <option value="Cashier's / Manager's Check">Cashier's / Manager's Check</option>
                <option value="Irrevocable Standby Letter of Credit / Bank Guarantee / Surety Bond">Combined General Format (With Slashes)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Security / Policy No.</label>
                <input
                  type="text"
                  value={suretyBondNo}
                  onChange={(e) => setSuretyBondNo(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  placeholder="e.g. G(13) No. 04892"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Issuing Bank / Surety</label>
                <input
                  type="text"
                  value={suretyIssuer}
                  onChange={(e) => setSuretyIssuer(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  placeholder="e.g. GSIS / Landbank"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Notice to Proceed (NTP) Date</label>
              <input
                type="text"
                value={ntpDate}
                onChange={(e) => setNtpDate(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          {/* Governing Procurement Law & Legal Basis Choice Card */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Governing Procurement Law
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {legalFramework === 'RA_12009' ? 'RA 12009 (NGPA)' : 'RA 9184 Standard'}
              </span>
            </div>

            {/* 2-Choice Quick Toggles */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFrameworkChange('RA_9184')}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  legalFramework === 'RA_9184'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md font-bold'
                    : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                <span className="text-xs font-black">RA 9184 Standard</span>
                <span className={`text-[10px] mt-0.5 ${legalFramework === 'RA_9184' ? 'text-blue-100' : 'text-slate-400'}`}>
                  Annex E, Section 4 (Revised IRR)
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleFrameworkChange('RA_12009')}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  legalFramework === 'RA_12009'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold'
                    : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                <span className="text-xs font-black">RA 12009 (NGPA)</span>
                <span className={`text-[10px] mt-0.5 ${legalFramework === 'RA_12009' ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                  New Gov Procurement Act
                </span>
              </button>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Opening Statement & Legal Citation Text</label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => {
                  setRemarks(e.target.value);
                  setLegalFramework('CUSTOM');
                }}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white leading-relaxed focus:outline-none focus:border-amber-400 font-sans"
                placeholder="Enter opening paragraph text..."
              />
            </div>
          </div>

          {/* Signatory */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Authorized Signatory
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Signatory Name</label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Designation / Title</label>
                <input
                  type="text"
                  value={signatoryTitle}
                  onChange={(e) => setSignatoryTitle(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview Sheet (7 cols) */}
        <div className="lg:col-span-7 p-6 overflow-y-auto bg-slate-950 flex justify-center items-start">
          {/* Philippine Legal Sheet: 816px x 1248px */}
          <div
            id="rla-print-sheet"
            className="w-[816px] min-h-[1248px] bg-white text-slate-900 p-12 shadow-2xl rounded-sm flex flex-col justify-between text-[13px] leading-relaxed relative"
            style={{ boxSizing: 'border-box' }}
          >
            {/* Header / Letterhead */}
            <div>
              <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                <h1 className="text-lg font-black tracking-wide uppercase text-slate-900">{companyName || 'CONTRACTOR / FIRM NAME'}</h1>
                <p className="text-[11px] text-slate-600 uppercase tracking-wider">{companyAddress || 'Main Business Office Address, Philippines'}</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">TIN: {tenant?.tin || 'N/A'} • PhilGEPS: {tenant?.philgepsPlatinumNo || 'N/A'}</p>
              </div>

              {/* Date & Addressee */}
              <div className="space-y-4 mb-6">
                <div className="text-right font-medium text-slate-700">
                  <span>Date: <strong>{letterDate}</strong></span>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-slate-900">{headOfEntity || 'THE HEAD OF PROCURING ENTITY'}</p>
                  <p className="font-semibold text-slate-800">{procuringEntity || 'Procuring Entity Name'}</p>
                  <p className="text-slate-600 text-xs">{entityAddress || 'Government Agency Office Address, Philippines'}</p>
                </div>

                <div className="pt-2">
                  <p className="font-bold text-slate-900">
                    SUBJECT: <span className="underline uppercase">REQUEST FOR {advanceRate}% ADVANCE PAYMENT / MOBILIZATION FUND</span>
                  </p>
                  <p className="text-xs text-slate-700 mt-1">
                    <strong>Project:</strong> {projectTitle || '[Project Name]'} <br />
                    <strong>Contract / Ref No.:</strong> <span className="font-mono">{projectRefNo || 'N/A'}</span>
                  </p>
                </div>
              </div>

              {/* Letter Body */}
              <div className="space-y-4 text-justify text-slate-800 leading-normal">
                <p>
                  Dear Sir / Madam:
                </p>

                <p>
                  {remarks}
                </p>

                <div className="my-3 p-4 bg-slate-50 border border-slate-300 rounded text-xs space-y-1.5">
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="font-semibold text-slate-700">Original Contract Amount:</span>
                    <span className="font-bold font-mono text-slate-900">₱ {contractAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="font-semibold text-slate-700">Requested Advance Percentage:</span>
                    <span className="font-bold font-mono text-slate-900">{advanceRate}%</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="font-bold text-slate-900">Total Requested Mobilization Amount:</span>
                    <span className="font-black font-mono text-blue-900 text-sm">₱ {advanceAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {suretyBondNo && (
                    <div className="flex justify-between pt-1 text-[11px] text-slate-600">
                      <span>{securityInstrumentType}:</span>
                      <span className="font-mono font-semibold">{suretyBondNo} ({suretyIssuer || 'Bank/Surety'})</span>
                    </div>
                  )}
                  {ntpDate && (
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>Notice to Proceed (NTP) Date:</span>
                      <span className="font-mono font-semibold">{ntpDate}</span>
                    </div>
                  )}
                </div>

                <p>
                  To secure this advance payment in full compliance with the procurement law, we have enclosed the required <strong>{securityInstrumentType}</strong> callable on demand in the equivalent amount.
                </p>

                <p>
                  This mobilization fund will be utilized exclusively for site installation, deployment of initial manpower, procurement of critical initial materials, and mobilization of heavy construction equipment required to promptly execute the works according to schedule.
                </p>

                <p>
                  We look forward to your favorable action and immediate release of the advance payment.
                </p>
              </div>
            </div>

            {/* Bottom Signatures & QR Code */}
            <div className="pt-8 mt-6 border-t border-slate-200">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Very truly yours,</p>
                  <p className="text-sm font-bold uppercase text-slate-900 pt-6">{companyName || 'CONTRACTOR NAME'}</p>
                  <div className="pt-4">
                    <p className="font-bold text-slate-900 underline uppercase">{signatoryName || 'AUTHORIZED SIGNATORY'}</p>
                    <p className="text-xs text-slate-600">{signatoryTitle || 'Authorized Managing Officer'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-2 border-t border-slate-100 flex justify-end items-center text-[10px] text-slate-400 font-mono">
                <span>Page 1 of 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showGuideModal && (
        <StatutoryDocumentsGuideModal
          initialCode="RLA"
          onClose={() => setShowGuideModal(false)}
        />
      )}
    </div>
  );
};

export default function RlaModal(props: RlaModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] h-[94vh] flex flex-col">
        <VaultErrorBoundary>
          <RlaModalContent {...props} />
        </VaultErrorBoundary>
      </div>
    </div>
  );
}

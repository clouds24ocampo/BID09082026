import React, { useState, useEffect } from 'react';
import { Tenant } from '../../../types';
import { PDFDocument } from 'pdf-lib';
import html2canvas from 'html2canvas';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import { safeGetJson, safeSetJson } from '../../../utils/safeStorage';
import VaultErrorBoundary from '../../common/VaultErrorBoundary';
import {
  X,
  Download,
  CheckCircle2,
  FileSignature,
  ShieldCheck,
  Briefcase,
  BookOpen
} from 'lucide-react';
import StatutoryDocumentsGuideModal from './StatutoryDocumentsGuideModal';

export interface PsdModalProps {
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

export const PsdModalContent: React.FC<PsdModalProps> = ({
  item,
  tenant,
  activeProjectRefNo = '',
  activeProjectTitle = '',
  activeProcuringEntity = '',
  procuringEntityAddress = '',
  procuringEntityContactPerson = '',
  headOfProcuringEntity = '',
  headOfProcuringEntityPosition = '',
  solicitationNumber = '',
  contractAmount = 0,
  projectLocation = '',
  dateTimeSubmitted = '',
  onSaveAndComplete,
  onClose
}) => {
  const today = new Date();
  const currentYear = today.getFullYear().toString();

  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  // Core Project & Entity Data
  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo || '');
  const [projectTitle, setProjectTitle] = useState(activeProjectTitle || '');
  const [procuringEntity, setProcuringEntity] = useState(activeProcuringEntity || '');
  const [entityAddress, setEntityAddress] = useState(procuringEntityAddress || '');
  const [companyName, setCompanyName] = useState(tenant?.companyName || '');
  const [signatoryName, setSignatoryName] = useState(tenant?.authorizedSignatory?.name || '');
  const [signatoryTitle, setSignatoryTitle] = useState(tenant?.authorizedSignatory?.title || 'Authorized Managing Officer / Representative');

  // Legal Framework & Framework Agreement Toggle
  const [legalFramework, setLegalFramework] = useState<'RA_12009' | 'RA_9184'>('RA_12009');
  const [includeFrameworkAgreement, setIncludeFrameworkAgreement] = useState<boolean>(true);

  // Jurat & Execution Details
  const [executionCity, setExecutionCity] = useState('');
  const [executionDay, setExecutionDay] = useState(today.getDate().toString());
  const [executionMonth, setExecutionMonth] = useState(today.toLocaleDateString('en-PH', { month: 'long' }));
  const [executionYear, setExecutionYear] = useState(currentYear);
  const [govIdType, setGovIdType] = useState('');
  const [govIdNumber, setGovIdNumber] = useState('');
  const [idDateIssued, setIdDateIssued] = useState('');
  const [idPlaceIssued, setIdPlaceIssued] = useState('');

  // Notary Public Details
  const [notaryName, setNotaryName] = useState('');
  const [notaryCommissionNo, setNotaryCommissionNo] = useState('');
  const [notaryJurisdiction, setNotaryJurisdiction] = useState('');
  const [notaryUntil, setNotaryUntil] = useState(`December 31, ${currentYear}`);
  const [notaryRollNo, setNotaryRollNo] = useState('');
  const [notaryPtr, setNotaryPtr] = useState('');
  const [notaryIbp, setNotaryIbp] = useState('');

  // Notarial Docket
  const [docNo, setDocNo] = useState('');
  const [pageNo, setPageNo] = useState('');
  const [bookNo, setBookNo] = useState('');
  const [seriesYear, setSeriesYear] = useState(currentYear);

  const [isSaving, setIsSaving] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    const list = getOpportunityProjects(tenant?.id);
    setOppProjects(list);

    if (activeProjectRefNo) {
      const match = list.find(p => p.refNo === activeProjectRefNo);
      if (match) {
        setSelectedOppId(match.id);
        setProjectRefNo(match.refNo);
        setProjectTitle(match.title);
        setProcuringEntity(match.procuringEntity);
        if (match.procuringEntityAddress) setEntityAddress(match.procuringEntityAddress);
      }
    } else if (list.length > 0) {
      const first = list[0];
      setSelectedOppId(first.id);
      setProjectRefNo(first.refNo);
      setProjectTitle(first.title);
      setProcuringEntity(first.procuringEntity);
      if (first.procuringEntityAddress) setEntityAddress(first.procuringEntityAddress);
    }
  }, [tenant?.id, activeProjectRefNo]);

  useEffect(() => {
    if (tenant) {
      if (tenant.companyName) setCompanyName(tenant.companyName);
      if (tenant.authorizedSignatory?.name) setSignatoryName(tenant.authorizedSignatory.name);
      if (tenant.authorizedSignatory?.title) setSignatoryTitle(tenant.authorizedSignatory.title);

      const tenantId = tenant.id || 'default';
      const savedProfile = safeGetJson<any>(`bidocs_notary_profile_${tenantId}`, null);
      if (savedProfile) {
        if (savedProfile.executionCity && !executionCity) setExecutionCity(savedProfile.executionCity);
        if (savedProfile.govIdType && !govIdType) setGovIdType(savedProfile.govIdType);
        if (savedProfile.govIdNumber && !govIdNumber) setGovIdNumber(savedProfile.govIdNumber);
        if (savedProfile.idDateIssued && !idDateIssued) setIdDateIssued(savedProfile.idDateIssued);
        if (savedProfile.idPlaceIssued && !idPlaceIssued) setIdPlaceIssued(savedProfile.idPlaceIssued);
        if (savedProfile.notaryName && !notaryName) setNotaryName(savedProfile.notaryName);
        if (savedProfile.notaryCommissionNo && !notaryCommissionNo) setNotaryCommissionNo(savedProfile.notaryCommissionNo);
        if (savedProfile.notaryJurisdiction && !notaryJurisdiction) setNotaryJurisdiction(savedProfile.notaryJurisdiction);
        if (savedProfile.notaryRollNo && !notaryRollNo) setNotaryRollNo(savedProfile.notaryRollNo);
        if (savedProfile.notaryPtr && !notaryPtr) setNotaryPtr(savedProfile.notaryPtr);
        if (savedProfile.notaryIbp && !notaryIbp) setNotaryIbp(savedProfile.notaryIbp);
      }
    }
  }, [tenant]);

  const handleSelectOpportunity = (oppId: string) => {
    setSelectedOppId(oppId);
    const found = oppProjects.find(p => p.id === oppId || p.refNo === oppId);
    if (found) {
      setProjectRefNo(found.refNo);
      setProjectTitle(found.title);
      setProcuringEntity(found.procuringEntity);
      if (found.procuringEntityAddress) setEntityAddress(found.procuringEntityAddress);
    }
  };

  const generatePdf = async (): Promise<string | null> => {
    const printArea = document.getElementById('psd-print-sheet');
    if (!printArea) return null;

    try {
      setIsSaving(true);
      const canvas = await html2canvas(printArea, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 936]); // Legal Portrait (8.5" x 13")
      const img = await pdfDoc.embedPng(imgData);

      const margin = 20;
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
      console.error('[PSD] PDF Generation error:', err);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const persistNotaryProfile = () => {
    const tenantId = tenant?.id || 'default';
    safeSetJson(`bidocs_notary_profile_${tenantId}`, {
      executionCity,
      govIdType,
      govIdNumber,
      idDateIssued,
      idPlaceIssued,
      notaryName,
      notaryCommissionNo,
      notaryJurisdiction,
      notaryRollNo,
      notaryPtr,
      notaryIbp
    });
  };

  const handleExportPdf = async () => {
    persistNotaryProfile();
    const dataUrl = await generatePdf();
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${projectRefNo || 'Project'}_Performance_Securing_Declaration_${executionYear}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveAndComplete = async () => {
    persistNotaryProfile();
    const dataUrl = await generatePdf();
    if (dataUrl && onSaveAndComplete) {
      onSaveAndComplete(
        dataUrl,
        'Performance Securing Declaration (Notarized PSD)',
        projectRefNo,
        projectTitle
      );
    }
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <span>Performance Securing Declaration (PSD)</span>
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/30 font-bold">
                RA 12009 Section 76 Standard
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Official Statutory Notarized Template • Framework Agreement & Section 76 Compliant • Legal (8.5" x 13")
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

      {/* Main Form + Print Preview Splitter */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Form Controls (5 cols) */}
        <div className="lg:col-span-5 p-5 overflow-y-auto border-r border-slate-800 space-y-4 bg-slate-900/40">
          
          {/* Opportunity Auto-Fill */}
          {oppProjects.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-2">
              <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" /> Auto-Fill from Opportunity Project
              </label>
              <select
                value={selectedOppId}
                onChange={(e) => handleSelectOpportunity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                {oppProjects.map((opp) => (
                  <option key={opp.id} value={opp.id}>
                    {opp.refNo} — {opp.title.substring(0, 48)}...
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Governing Law & Framework Agreement Options */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-3">
            <label className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileSignature className="w-3.5 h-3.5" /> Legal Basis & Contract Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLegalFramework('RA_12009')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition text-left border cursor-pointer ${
                  legalFramework === 'RA_12009'
                    ? 'bg-indigo-600/30 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <p>RA 12009 (NGPA)</p>
                <p className="text-[10px] text-slate-400 font-normal mt-0.5">Section 76 IRR Standard</p>
              </button>
              <button
                type="button"
                onClick={() => setLegalFramework('RA_9184')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition text-left border cursor-pointer ${
                  legalFramework === 'RA_9184'
                    ? 'bg-blue-600/30 border-blue-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <p>RA 9184 Standard</p>
                <p className="text-[10px] text-slate-400 font-normal mt-0.5">GPPB Resolution No. 09-2020</p>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-300">Include Framework Agreement Clause (Sec 68.4 & 68.5)</span>
              <input
                type="checkbox"
                checked={includeFrameworkAgreement}
                onChange={(e) => setIncludeFrameworkAgreement(e.target.checked)}
                className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Project & Entity Details */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Project & Procuring Entity</h3>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Invitation to Bid / Ref No.</label>
              <input
                type="text"
                value={projectRefNo}
                onChange={(e) => setProjectRefNo(e.target.value)}
                placeholder="[Insert Reference Number indicated in Bidding Documents]"
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Procuring Entity Name</label>
              <input
                type="text"
                value={procuringEntity}
                onChange={(e) => setProcuringEntity(e.target.value)}
                placeholder="[Insert name of the Procuring Entity]"
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Procuring Entity Address</label>
              <input
                type="text"
                value={entityAddress}
                onChange={(e) => setEntityAddress(e.target.value)}
                placeholder="[Insert address of the Procuring Entity]"
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          {/* Bidder & Affiant Information */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Bidder & Affiant Information</h3>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Name of Bidder / Corporate Entity</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="[Insert Bidder / Company Name]"
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Authorized Representative (Affiant)</label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  placeholder="[NAME OF AUTHORIZED REPRESENTATIVE]"
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Position / Designation</label>
                <input
                  type="text"
                  value={signatoryTitle}
                  onChange={(e) => setSignatoryTitle(e.target.value)}
                  placeholder="[Position/Designation]"
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Competent Evidence of Identity (Jurat) */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Competent Evidence of Identity (2004 Notarial Rules)</h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Type of Gov't ID Used</label>
                <input
                  type="text"
                  value={govIdType}
                  onChange={(e) => setGovIdType(e.target.value)}
                  placeholder="Passport / Driver's License / PRC ID"
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">ID Number</label>
                <input
                  type="text"
                  value={govIdNumber}
                  onChange={(e) => setGovIdNumber(e.target.value)}
                  placeholder="e.g. P1234567B"
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Date Issued</label>
                <input
                  type="text"
                  value={idDateIssued}
                  onChange={(e) => setIdDateIssued(e.target.value)}
                  placeholder="e.g. January 15, 2024"
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Place Issued</label>
                <input
                  type="text"
                  value={idPlaceIssued}
                  onChange={(e) => setIdPlaceIssued(e.target.value)}
                  placeholder="e.g. DFA Manila / LTO Quezon City"
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Place of Execution (City)</label>
                <input
                  type="text"
                  value={executionCity}
                  onChange={(e) => setExecutionCity(e.target.value)}
                  placeholder="e.g. City of Manila"
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Day</label>
                <input
                  type="text"
                  value={executionDay}
                  onChange={(e) => setExecutionDay(e.target.value)}
                  placeholder="e.g. 15th"
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Month & Year</label>
                <input
                  type="text"
                  value={`${executionMonth} ${executionYear}`}
                  onChange={(e) => {
                    const parts = e.target.value.split(' ');
                    if (parts[0]) setExecutionMonth(parts[0]);
                    if (parts[1]) setExecutionYear(parts[1]);
                  }}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Notary Public Details */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Notary Public Information</h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Name of Notary Public</label>
                <input
                  type="text"
                  value={notaryName}
                  onChange={(e) => setNotaryName(e.target.value)}
                  placeholder="NAME OF NOTARY PUBLIC"
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Serial No. of Commission</label>
                <input
                  type="text"
                  value={notaryCommissionNo}
                  onChange={(e) => setNotaryCommissionNo(e.target.value)}
                  placeholder="e.g. Comm. No. 2026-089"
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Notary Public For & Until</label>
                <input
                  type="text"
                  value={notaryJurisdiction ? `${notaryJurisdiction} until ${notaryUntil}` : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const parts = val.split(' until ');
                    setNotaryJurisdiction(parts[0] || '');
                    setNotaryUntil(parts[1] || `December 31, ${currentYear}`);
                  }}
                  placeholder="e.g. Manila until Dec 31, 2026"
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Roll of Attorneys No.</label>
                <input
                  type="text"
                  value={notaryRollNo}
                  onChange={(e) => setNotaryRollNo(e.target.value)}
                  placeholder="e.g. 78910"
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">PTR No., Date & Place</label>
                <input
                  type="text"
                  value={notaryPtr}
                  onChange={(e) => setNotaryPtr(e.target.value)}
                  placeholder="PTR No. __, [date], [place]"
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">IBP No., Date & Place</label>
                <input
                  type="text"
                  value={notaryIbp}
                  onChange={(e) => setNotaryIbp(e.target.value)}
                  placeholder="IBP No. __, [date], [place]"
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Doc No.</label>
                <input
                  type="text"
                  value={docNo}
                  onChange={(e) => setDocNo(e.target.value)}
                  placeholder="___"
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Page No.</label>
                <input
                  type="text"
                  value={pageNo}
                  onChange={(e) => setPageNo(e.target.value)}
                  placeholder="___"
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Book No.</label>
                <input
                  type="text"
                  value={bookNo}
                  onChange={(e) => setBookNo(e.target.value)}
                  placeholder="___"
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Series Of</label>
                <input
                  type="text"
                  value={seriesYear}
                  onChange={(e) => setSeriesYear(e.target.value)}
                  placeholder="2026"
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview Sheet (7 cols) — 100% Identical to Sample Template Image */}
        <div className="lg:col-span-7 p-6 overflow-y-auto bg-slate-950 flex justify-center items-start">
          <div
            id="psd-print-sheet"
            className="w-[816px] min-h-[1248px] bg-white text-slate-900 px-14 py-12 shadow-2xl rounded-sm flex flex-col justify-between text-[11.5px] leading-relaxed font-sans"
            style={{ boxSizing: 'border-box', fontFamily: 'Arial, Helvetica, sans-serif' }}
          >
            <div className="space-y-4">
              
              {/* Top Header Center Title */}
              <div className="text-center">
                <h1 className="text-sm font-bold tracking-wide text-slate-950 font-sans">
                  Performance Securing Declaration
                </h1>
                <hr className="border-t border-slate-900 my-2" />
              </div>

              {/* Jurisdiction Header */}
              <div className="text-left font-sans text-xs space-y-0.5 pt-1 text-slate-900">
                <p>REPUBLIC OF THE PHILIPPINES)</p>
                <p>CITY OF {executionCity ? <u>{executionCity.toUpperCase()}</u> : '____________________'}) S.S.</p>
              </div>

              {/* Document Title & Reference */}
              <div className="text-center pt-3 pb-2 space-y-1">
                <h2 className="text-sm font-bold tracking-wide uppercase text-slate-950 font-sans">
                  PERFORMANCE SECURING DECLARATION
                </h2>
                <p className="text-[11.5px] font-sans text-slate-800 max-w-xl mx-auto leading-normal">
                  {legalFramework === 'RA_12009'
                    ? '(For Framework Agreement and Section 76 of the Implementing Rules and Regulations of Republic Act No. 12009)'
                    : '(Pursuant to GPPB Resolution No. 09-2020 / Republic Act No. 9184)'}
                </p>
              </div>

              {/* Addressee */}
              <div className="text-left text-xs font-sans space-y-1 pt-1">
                <p>
                  Invitation to Bid: {projectRefNo ? <u>{projectRefNo}</u> : '[Insert Reference Number indicated in the Bidding Documents]'}
                </p>
                <p>
                  To: {procuringEntity ? <u>{procuringEntity}</u> : '[Insert name and address of the Procuring Entity]'}
                  {entityAddress && <span className="block text-slate-700 pl-6">{entityAddress}</span>}
                </p>
              </div>

              {/* Declaration Body */}
              <div className="pt-2 text-justify space-y-3 text-[11.5px] leading-relaxed text-slate-900">
                <p>
                  I/We, the undersigned, declare that:
                </p>

                <div className="pl-6 relative">
                  <span className="absolute left-0 font-sans">1.</span>
                  <p>
                    I/We understand that, according to your conditions, to guarantee the faithful performance by the supplier/distributor/manufacturer/contractor/consultant of its obligations under the Contract, I/we shall submit a Performance Securing Declaration within a maximum period of ten (10) calendar days from the receipt of the Notice of Award prior to the signing of the Contract;
                  </p>
                </div>

                <div className="pl-6 relative">
                  <span className="absolute left-0 font-sans">2.</span>
                  <p>
                    I/We accept that: I/we will be automatically disqualified from bidding for any procurement contract with any Procuring Entity, upon receipt of your Blacklisting Order if I/We have violated my/our obligations under the Contract; and
                  </p>
                </div>

                <div className="pl-6 relative space-y-2">
                  <span className="absolute left-0 font-sans">3.</span>
                  <p>
                    I/We understand that this Performance Securing Declaration shall cease to be valid upon:
                  </p>

                  <div className="pl-5 space-y-1.5">
                    <p>
                      a. &nbsp;<span className="underline">Issuance by the Procuring Entity of the Certificate of Final Acceptance, subject to the following conditions:</span>
                    </p>

                    <div className="pl-6 space-y-0.5 text-[11px]">
                      <p>i. &nbsp;&nbsp;<span className="underline">Procuring Entity has no claims filed against the contract awardee;</span></p>
                      <p>ii. &nbsp;<span className="underline">Procuring Entity has no claims for labor and materials filed against the contractor; and</span></p>
                      <p>iii. <span className="underline">Other terms of the contract; or</span></p>
                    </div>

                    {includeFrameworkAgreement && (
                      <div className="pt-2 space-y-1">
                        <p className="italic text-[11px] text-slate-700 font-sans">[Add this paragraph for Framework Agreement]</p>
                        <p>
                          b. &nbsp;<span className="underline">replacement by the winning bidder of the submitted PSD with a performance security in any of the prescribed forms under Section 68.4 and 68.5 of the Implementing Rules and Regulations of RA No. 12009 as required by the Procuring Entity.</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <p className="pt-3">
                  IN WITNESS WHEREOF, I/We have hereunto set my/our hand/s this {executionDay ? <u>{executionDay}</u> : '_____'} day of {executionMonth ? <u>{executionMonth}</u> : '[month]'} {executionYear ? <u>{executionYear}</u> : '[year]'} at {executionCity ? <u>{executionCity}</u> : '[place of execution]'}.
                </p>
              </div>

              {/* Affiant Signature Box (Right-Aligned) */}
              <div className="pt-4 flex justify-end">
                <div className="text-center w-80 space-y-0.5 font-sans">
                  <div className="h-10"></div>
                  {signatoryName ? (
                    <p className="font-bold underline uppercase text-slate-900 text-xs">
                      {signatoryName}
                    </p>
                  ) : (
                    <p className="italic uppercase text-slate-900 text-xs leading-snug">
                      [NAME OF BIDDER OR ITS AUTHORIZED REPRESENTATIVE]
                    </p>
                  )}
                  <p className={`text-[11px] text-slate-700 ${!signatoryName ? 'italic' : ''}`}>
                    {signatoryTitle || '[Position/Designation]'}
                  </p>
                  {companyName && signatoryName && (
                    <p className="text-[11px] font-bold text-slate-800 uppercase">
                      {companyName}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-800 pt-0.5">Affiant</p>
                </div>
              </div>

              {/* Jurat Notarial Section */}
              <div className="pt-3 font-sans text-[11px] space-y-3 text-justify leading-relaxed text-slate-900">
                <p>
                  SUBSCRIBED AND SWORN to before me this {executionDay ? <u>{executionDay}</u> : '___'} day of {executionMonth ? <u>{executionMonth}</u> : <i>[month]</i>} {executionYear ? <u>{executionYear}</u> : <i>[year]</i>} at {executionCity ? <u>{executionCity}</u> : <i>[place of execution]</i>}, Philippines. Affiant/s is/are personally known to me and was/were identified by me through competent evidence of identity as defined in the 2004 Rules on Notarial Practice (A.M. No. 02-8-13-SC). Affiant/s exhibited to me his/her {govIdType ? <u>{govIdType}</u> : <i>[insert type of government identification card used]</i>}, with his/her photograph and signature appearing thereon, with no. {govIdNumber ? <u>{govIdNumber}</u> : '_______'} issued on {idDateIssued ? <u>{idDateIssued}</u> : '__________'} at {idPlaceIssued ? <u>{idPlaceIssued}</u> : '_____________'}.
                </p>

                {/* Notary and Docket 2-Column Layout */}
                <div className="flex justify-between items-end pt-4">
                  {/* Left Docket Column */}
                  <div className="space-y-0.5 text-[11px] text-slate-800 font-sans">
                    <p>Doc. No. {docNo ? <u>{docNo}</u> : '___'}</p>
                    <p>Page No. {pageNo ? <u>{pageNo}</u> : '___'}</p>
                    <p>Book No. {bookNo ? <u>{bookNo}</u> : '___'}</p>
                    <p>Series of {seriesYear ? <u>{seriesYear}</u> : '____.'}</p>
                  </div>

                  {/* Right Notary Public Column */}
                  <div className="text-left w-72 space-y-0.5 text-[11px] text-slate-900 font-sans">
                    <p className="font-bold uppercase text-slate-950">
                      {notaryName || 'NAME OF NOTARY PUBLIC'}
                    </p>
                    <p>
                      Serial No. of Commission {notaryCommissionNo ? <u>{notaryCommissionNo}</u> : '___________'}
                    </p>
                    <p>
                      Notary Public for {notaryJurisdiction ? <u>{notaryJurisdiction}</u> : '_______'} until {notaryUntil ? <u>{notaryUntil}</u> : '________'}
                    </p>
                    <p>
                      Roll of Attorneys No. {notaryRollNo ? <u>{notaryRollNo}</u> : '________'}
                    </p>
                    <p>
                      PTR No. {notaryPtr ? <u>{notaryPtr}</u> : <span>__, <i>[date issued]</i>, <i>[place issued]</i></span>}
                    </p>
                    <p>
                      IBP No. {notaryIbp ? <u>{notaryIbp}</u> : <span>__, <i>[date issued]</i>, <i>[place issued]</i></span>}
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Clean Printable Footer */}
            <div className="pt-2 border-t border-slate-100 flex justify-end items-center text-[9px] text-slate-400 font-mono">
              <span>Page 1 of 1</span>
            </div>
          </div>
        </div>
      </div>

      {showGuideModal && (
        <StatutoryDocumentsGuideModal
          initialCode="PSD"
          onClose={() => setShowGuideModal(false)}
        />
      )}
    </div>
  );
};

export default function PsdModal(props: PsdModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] h-[94vh] flex flex-col">
        <VaultErrorBoundary>
          <PsdModalContent {...props} />
        </VaultErrorBoundary>
      </div>
    </div>
  );
}

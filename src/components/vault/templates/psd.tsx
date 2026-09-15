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
  Building2,
  FileSignature,
  ShieldCheck,
  Calendar,
  FileText,
  Briefcase
} from 'lucide-react';

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
  const [entityAddress, setEntityAddress] = useState(procuringEntityAddress || 'Metro Manila, Philippines');
  const [companyName, setCompanyName] = useState(tenant?.companyName || 'Bidding Entity Corporate Name');
  const [companyAddress, setCompanyAddress] = useState(tenant?.address || 'Metro Manila, Philippines');
  const [signatoryName, setSignatoryName] = useState(tenant?.authorizedSignatory?.name || 'Juan Dela Cruz');
  const [signatoryTitle, setSignatoryTitle] = useState(tenant?.authorizedSignatory?.title || 'Authorized Managing Officer / President');

  // Legal Framework Selection
  const [legalFramework, setLegalFramework] = useState<'RA_9184' | 'RA_12009'>('RA_9184');

  // Jurat & Execution Details
  const [executionCity, setExecutionCity] = useState('Quezon City');
  const [executionDay, setExecutionDay] = useState(today.getDate().toString());
  const [executionMonth, setExecutionMonth] = useState(today.toLocaleDateString('en-PH', { month: 'long' }));
  const [executionYear, setExecutionYear] = useState(currentYear);
  const [govIdType, setGovIdType] = useState("Passport / Driver's License / PRC ID");
  const [govIdNumber, setGovIdNumber] = useState('P-98234120A');
  const [ctcNumber, setCtcNumber] = useState('CTC-2026-09812');
  const [ctcDateIssued, setCtcDateIssued] = useState('January 15, 2026');
  const [ctcPlaceIssued, setCtcPlaceIssued] = useState('Manila, Philippines');

  // Notarial Register Block
  const [docNo, setDocNo] = useState('____');
  const [pageNo, setPageNo] = useState('____');
  const [bookNo, setBookNo] = useState('____');
  const [seriesYear, setSeriesYear] = useState(currentYear);

  const [isSaving, setIsSaving] = useState(false);

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
      }
    } else if (list.length > 0) {
      const first = list[0];
      setSelectedOppId(first.id);
      setProjectRefNo(first.refNo);
      setProjectTitle(first.title);
      setProcuringEntity(first.procuringEntity);
    }
  }, [tenant?.id, activeProjectRefNo]);

  useEffect(() => {
    if (tenant) {
      if (tenant.companyName) setCompanyName(tenant.companyName);
      if (tenant.address) setCompanyAddress(tenant.address);
      if (tenant.authorizedSignatory?.name) setSignatoryName(tenant.authorizedSignatory.name);
      if (tenant.authorizedSignatory?.title) setSignatoryTitle(tenant.authorizedSignatory.title);
    }
  }, [tenant]);

  const handleSelectOpportunity = (oppId: string) => {
    setSelectedOppId(oppId);
    const found = oppProjects.find(p => p.id === oppId || p.refNo === oppId);
    if (found) {
      setProjectRefNo(found.refNo);
      setProjectTitle(found.title);
      setProcuringEntity(found.procuringEntity);
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
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfDoc = await PDFDocument.create();
      // Philippine Legal: 8.5" x 13" -> [612, 936]
      const page = pdfDoc.addPage([612, 936]);
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

  const handleExportPdf = async () => {
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
            <h2 className="text-sm font-bold text-white tracking-wide">
              Performance Securing Declaration (PSD)
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Official Statutory Notarized Template • GPPB Resolution No. 09-2020 • Philippine Legal (8.5" x 13")
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

          {/* Governing Law Toggle */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-2">
            <label className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileSignature className="w-3.5 h-3.5" /> Governing Legal Standard
            </label>
            <div className="grid grid-cols-2 gap-2">
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
                <p className="text-[10px] text-slate-400 font-normal mt-0.5">Section 39.2 IRR / GPPB Res 09-2020</p>
              </button>
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
                <p className="text-[10px] text-slate-400 font-normal mt-0.5">New Gov Procurement Act Standards</p>
              </button>
            </div>
          </div>

          {/* Project & Entity Details */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Project & Procuring Entity</h3>

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
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Invitation to Bid / Ref No.</label>
                <input
                  type="text"
                  value={projectRefNo}
                  onChange={(e) => setProjectRefNo(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Procuring Entity</label>
                <input
                  type="text"
                  value={procuringEntity}
                  onChange={(e) => setProcuringEntity(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Procuring Entity Office Address</label>
              <input
                type="text"
                value={entityAddress}
                onChange={(e) => setEntityAddress(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          {/* Bidder & Signatory */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Bidder & Signatory Information</h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Authorized Signatory</label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Signatory Legal Capacity / Title</label>
              <input
                type="text"
                value={signatoryTitle}
                onChange={(e) => setSignatoryTitle(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Government ID Type</label>
                <input
                  type="text"
                  value={govIdType}
                  onChange={(e) => setGovIdType(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Government ID No.</label>
                <input
                  type="text"
                  value={govIdNumber}
                  onChange={(e) => setGovIdNumber(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Notarial & Execution Details */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Notarial Jurat Details</h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">City / Municipality</label>
                <input
                  type="text"
                  value={executionCity}
                  onChange={(e) => setExecutionCity(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Day of Execution</label>
                <input
                  type="text"
                  value={executionDay}
                  onChange={(e) => setExecutionDay(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Doc No.</label>
                <input
                  type="text"
                  value={docNo}
                  onChange={(e) => setDocNo(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Page No.</label>
                <input
                  type="text"
                  value={pageNo}
                  onChange={(e) => setPageNo(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Book No.</label>
                <input
                  type="text"
                  value={bookNo}
                  onChange={(e) => setBookNo(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Series Of</label>
                <input
                  type="text"
                  value={seriesYear}
                  onChange={(e) => setSeriesYear(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview Sheet (7 cols) */}
        <div className="lg:col-span-7 p-6 overflow-y-auto bg-slate-950 flex justify-center items-start">
          <div
            id="psd-print-sheet"
            className="w-[816px] min-h-[1248px] bg-white text-slate-900 p-12 shadow-2xl rounded-sm flex flex-col justify-between text-xs leading-relaxed font-serif"
            style={{ boxSizing: 'border-box' }}
          >
            <div className="space-y-4">
              {/* Jurisdiction Header */}
              <div className="text-left font-bold text-slate-800 text-[11px] font-sans">
                <p>REPUBLIC OF THE PHILIPPINES )</p>
                <p>CITY/MUNICIPALITY OF {executionCity.toUpperCase()} ) S.S.</p>
                <div className="h-2"></div>
              </div>

              {/* Document Title */}
              <div className="text-center pt-2 pb-2">
                <h1 className="text-base font-black tracking-wide uppercase text-slate-950 font-sans">
                  PERFORMANCE SECURING DECLARATION
                </h1>
                <p className="text-[11px] font-sans text-slate-600 mt-1">
                  Invitation to Bid: <strong><u>{projectRefNo || '[Insert Reference No.]'}</u></strong>
                </p>
              </div>

              {/* Addressee */}
              <div className="text-left text-xs font-sans space-y-0.5 pt-2">
                <p className="font-bold">To: <u>{procuringEntity || '[Insert Name of Procuring Entity]'}</u></p>
                <p className="text-slate-700">{entityAddress || '[Insert Address of Procuring Entity]'}</p>
              </div>

              {/* Declaration Body */}
              <div className="pt-2 text-justify space-y-3.5 text-[11.5px] leading-relaxed">
                <p>
                  I/We, the undersigned, declare that:
                </p>

                <p className="pl-6 text-justify">
                  1. &nbsp;I/We understand that, according to your conditions, to guarantee the faithful performance by the supplier/distributor/manufacturer/contractor/consultant of its obligations under the Contract, I/we shall submit a Performance Securing Declaration within a maximum period of ten (10) calendar days from the receipt of the Notice of Award prior to the signing of the Contract.
                </p>

                <p className="pl-6 text-justify">
                  2. &nbsp;I/We accept that: I/we will be automatically disqualified from bidding for any procurement contract with any procuring entity for a period of one (1) year for the first offense, or two (2) years for the second offense, upon receipt of your Blacklisting Order if I/We have violated my/our obligations under the Contract;
                </p>

                <div className="pl-6 text-justify space-y-1.5">
                  <p>
                    3. &nbsp;I/We understand that this Performance Securing Declaration shall cease to be valid upon:
                  </p>
                  <div className="pl-6 space-y-1 text-[11px]">
                    <p>
                      a. &nbsp;issuance by the Procuring Entity of the Certificate of Final Acceptance, subject to the following conditions:
                    </p>
                    <div className="pl-6 space-y-0.5 text-[10.5px] text-slate-800">
                      <p>i. &nbsp;Procuring Entity has no claims filed against the contract awardee;</p>
                      <p>ii. &nbsp;It has no claims for labor and materials filed against the contractor; and</p>
                      <p>iii. &nbsp;Other terms of the contract; or</p>
                    </div>
                    <p className="pt-1">
                      b. &nbsp;replacement by the winning bidder of the submitted PSD with a performance security in any of the prescribed forms under {legalFramework === 'RA_12009' ? 'Republic Act No. 12009 (New Government Procurement Act)' : 'Section 39.2 of the 2016 revised IRR of RA No. 9184'}.
                    </p>
                  </div>
                </div>

                <p className="pt-2">
                  IN WITNESS WHEREOF, I/We have hereunto set my/our hand/s this <strong>{executionDay}</strong> day of <strong>{executionMonth} {executionYear}</strong> at <strong>{executionCity}</strong>, Philippines.
                </p>
              </div>

              {/* Affiant Signature Box */}
              <div className="pt-4 flex justify-end">
                <div className="text-center w-72 space-y-1 font-sans">
                  <div className="h-10"></div>
                  <p className="font-bold underline uppercase text-slate-900 text-xs">
                    {signatoryName || 'AUTHORIZED SIGNATORY'}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    {signatoryTitle || 'Authorized Managing Officer'}
                  </p>
                  <p className="text-[10.5px] font-bold text-slate-800 uppercase">
                    {companyName || 'NAME OF BIDDING ENTITY'}
                  </p>
                  <p className="text-[9.5px] text-slate-500 italic">Affiant</p>
                </div>
              </div>

              {/* Jurat Notarial Section */}
              <div className="pt-4 border-t-2 border-slate-900 font-sans text-[10.5px] space-y-3">
                <p className="text-justify leading-relaxed">
                  <strong>SUBSCRIBED AND SWORN</strong> to before me this <strong>{executionDay}</strong> day of <strong>{executionMonth} {executionYear}</strong> at <strong>{executionCity}</strong>, Philippines. Affiant exhibiting to me their competent evidence of identity: <u>{govIdType}</u> with ID No. <u>{govIdNumber}</u>, and Community Tax Certificate No. <u>{ctcNumber}</u> issued on <u>{ctcDateIssued}</u> at <u>{ctcPlaceIssued}</u>.
                </p>

                <div className="flex justify-between items-end pt-4">
                  <div className="space-y-0.5 text-[10px] font-mono text-slate-700">
                    <p>Doc. No. &nbsp;<strong>{docNo}</strong>;</p>
                    <p>Page No. <strong>{pageNo}</strong>;</p>
                    <p>Book No. <strong>{bookNo}</strong>;</p>
                    <p>Series of <strong>{seriesYear}</strong>.</p>
                  </div>

                  <div className="text-center space-y-0.5">
                    <div className="h-8"></div>
                    <p className="font-bold underline uppercase text-slate-900 text-xs">NOTARY PUBLIC</p>
                    <p className="text-[9.5px] text-slate-500">Commission Expires on Dec 31, {seriesYear}</p>
                    <p className="text-[9px] text-slate-500 font-mono">PTR / IBP / Roll of Attorneys No.</p>
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

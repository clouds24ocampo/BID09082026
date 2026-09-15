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
  FileCheck,
  ShieldCheck,
  Briefcase,
  Building2,
  Calendar
} from 'lucide-react';

export interface CaModalProps {
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

export const CaModalContent: React.FC<CaModalProps> = ({
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
  const [contractAmount, setContractAmount] = useState<number>(propContractAmount || 0);

  // Affidavit Legal Details
  const [affiantName, setAffiantName] = useState<string>(tenant?.authorizedSignatory?.name || '');
  const [affiantCivilStatus, setAffiantCivilStatus] = useState<string>('Filipino, of legal age, married/single');
  const [affiantTitle, setAffiantTitle] = useState<string>(tenant?.authorizedSignatory?.title || 'Authorized Managing Officer / President');
  const [affiantAddress, setAffiantAddress] = useState<string>(tenant?.address || '');
  const [cityVenue, setCityVenue] = useState<string>('City/Municipality of Manila');
  const [provinceVenue, setProvinceVenue] = useState<string>('Metro Manila, Philippines');
  const [idType, setIdType] = useState<string>('Passport / Driver’s License / PRC ID');
  const [idNumber, setIdNumber] = useState<string>('PRC-0098762 / CTC No. 19283746');
  const [idExpiry, setIdExpiry] = useState<string>('Valid until 2028');

  // Notary Public details
  const [docNo, setDocNo] = useState<string>('124');
  const [pageNo, setPageNo] = useState<string>('26');
  const [bookNo, setBookNo] = useState<string>('XLII');
  const [seriesYear, setSeriesYear] = useState<string>(new Date().getFullYear().toString());

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const projectScopeKey = (projectRefNo || selectedOppId || activeProjectRefNo || 'default').replace(/[^a-zA-Z0-9]/g, '_');

  useEffect(() => {
    const tenantId = tenant?.id || 'default';
    const list = getOpportunityProjects(tenantId);
    setOppProjects(list);

    if (tenant?.companyName) setCompanyName(tenant.companyName);
    if (tenant?.address) setCompanyAddress(tenant.address);
    if (tenant?.authorizedSignatory?.name) setAffiantName(tenant.authorizedSignatory.name);
    if (tenant?.authorizedSignatory?.title) setAffiantTitle(tenant.authorizedSignatory.title);

    const storageKey = `bidocs_ca_${tenantId}_${projectScopeKey}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.projectTitle) setProjectTitle(parsed.projectTitle);
        if (parsed.projectRefNo) setProjectRefNo(parsed.projectRefNo);
        if (parsed.procuringEntity) setProcuringEntity(parsed.procuringEntity);
        if (parsed.contractAmount) setContractAmount(parsed.contractAmount);
        if (parsed.affiantName) setAffiantName(parsed.affiantName);
        if (parsed.affiantCivilStatus) setAffiantCivilStatus(parsed.affiantCivilStatus);
        if (parsed.affiantTitle) setAffiantTitle(parsed.affiantTitle);
        if (parsed.affiantAddress) setAffiantAddress(parsed.affiantAddress);
        if (parsed.cityVenue) setCityVenue(parsed.cityVenue);
        if (parsed.provinceVenue) setProvinceVenue(parsed.provinceVenue);
        if (parsed.idType) setIdType(parsed.idType);
        if (parsed.idNumber) setIdNumber(parsed.idNumber);
        if (parsed.idExpiry) setIdExpiry(parsed.idExpiry);
        if (parsed.docNo) setDocNo(parsed.docNo);
        if (parsed.pageNo) setPageNo(parsed.pageNo);
        if (parsed.bookNo) setBookNo(parsed.bookNo);
        if (parsed.seriesYear) setSeriesYear(parsed.seriesYear);
        return;
      }
    } catch (e) {
      console.error('[CA] Storage load error:', e);
    }

    if (list.length > 0 && !selectedOppId) {
      const match = activeProjectRefNo ? list.find(p => p.refNo === activeProjectRefNo) : null;
      const target = match || list[0];
      if (target) {
        setSelectedOppId(target.id);
        setProjectTitle(target.title);
        setProjectRefNo(target.refNo);
        setProcuringEntity(target.procuringEntity);
        const amt = Number((target as any).abc || (target as any).contractAmount || 0);
        if (amt > 0) setContractAmount(amt);
      }
    }
  }, [tenant, activeProjectRefNo, projectScopeKey]);

  const handleSaveState = () => {
    const tenantId = tenant?.id || 'default';
    const storageKey = `bidocs_ca_${tenantId}_${projectScopeKey}`;
    const payload = {
      companyName,
      companyAddress,
      projectTitle,
      projectRefNo,
      procuringEntity,
      contractAmount,
      affiantName,
      affiantCivilStatus,
      affiantTitle,
      affiantAddress,
      cityVenue,
      provinceVenue,
      idType,
      idNumber,
      idExpiry,
      docNo,
      pageNo,
      bookNo,
      seriesYear
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error('[CA] Save state error:', e);
    }
  };

  const generatePdf = async (): Promise<string | null> => {
    const printArea = document.getElementById('ca-print-sheet');
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
      console.error('[CA] Generate PDF error:', err);
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
    a.download = `Contractors_Affidavit_${projectRefNo || 'Project'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveAndComplete = async () => {
    const dataUrl = await generatePdf();
    if (dataUrl && onSaveAndComplete) {
      onSaveAndComplete(
        dataUrl,
        "Contractor's Affidavit (CA)",
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
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              Contractor's Affidavit (CA)
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Sworn Notarial Certificate of Full Payment of Labor, Materials, & Taxes • Philippine Legal (8.5" x 13")
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

      {/* Main Grid */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Form Controls (5 cols) */}
        <div className="lg:col-span-5 p-5 overflow-y-auto border-r border-slate-800 space-y-4 bg-slate-900/40">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Project & Affiant Information
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
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Contract Amount (PHP)</label>
                <input
                  type="number"
                  value={contractAmount || ''}
                  onChange={(e) => setContractAmount(Number(e.target.value))}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
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

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Affiant / Managing Officer Name</label>
              <input
                type="text"
                value={affiantName}
                onChange={(e) => setAffiantName(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Designation</label>
                <input
                  type="text"
                  value={affiantTitle}
                  onChange={(e) => setAffiantTitle(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Civil Status & Citizenship</label>
                <input
                  type="text"
                  value={affiantCivilStatus}
                  onChange={(e) => setAffiantCivilStatus(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Legal Venue & ID details */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Venue & Government ID
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">City / Municipality</label>
                <input
                  type="text"
                  value={cityVenue}
                  onChange={(e) => setCityVenue(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Province / Region</label>
                <input
                  type="text"
                  value={provinceVenue}
                  onChange={(e) => setProvinceVenue(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Government ID Type</label>
                <input
                  type="text"
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">ID / CTC Number</label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Notarial Entry Block */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5" /> Notarial Register Notations
            </h3>

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
            id="ca-print-sheet"
            className="w-[816px] min-h-[1248px] bg-white text-slate-900 p-12 shadow-2xl rounded-sm flex flex-col justify-between text-[12.5px] leading-relaxed"
            style={{ boxSizing: 'border-box' }}
          >
            <div>
              {/* Notary Jurat Header */}
              <div className="mb-6 space-y-1 text-xs font-mono text-slate-800">
                <p>REPUBLIC OF THE PHILIPPINES )</p>
                <p>{cityVenue.toUpperCase()} ) S.S.</p>
              </div>

              {/* Title */}
              <div className="text-center border-b-2 border-slate-900 pb-3 mb-6">
                <h1 className="text-lg font-black tracking-wider uppercase text-slate-900">CONTRACTOR'S AFFIDAVIT</h1>
                <p className="text-[11px] text-slate-600 font-semibold uppercase">(Full Payment of Labor, Materials, Equipment & Subcontractors)</p>
              </div>

              {/* Affidavit Narrative */}
              <div className="space-y-4 text-justify text-slate-800">
                <p>
                  I, <strong>{affiantName.toUpperCase()}</strong>, {affiantCivilStatus}, after having been duly sworn to in accordance with law, hereby depose and state that:
                </p>

                <ol className="list-decimal pl-6 space-y-2.5">
                  <li>
                    I am the duly authorized <strong>{affiantTitle}</strong> of <strong>{companyName.toUpperCase()}</strong>, a corporation/enterprise organized and existing under Philippine laws, with business address at <em>{companyAddress || affiantAddress || 'Philippines'}</em>.
                  </li>
                  <li>
                    That the said company is the Contractor for the project: <strong>"{projectTitle}"</strong> under Contract / Reference No. <strong>{projectRefNo || 'N/A'}</strong> with the <strong>{procuringEntity}</strong> in the total contract amount of <strong>₱ {contractAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>.
                  </li>
                  <li>
                    That all workers, laborers, tradesmen, and personnel employed in the execution of the said project have been <strong>FULLY PAID</strong> their corresponding wages, salaries, overtime, and statutory benefits in accordance with the Philippine Labor Code.
                  </li>
                  <li>
                    That all materials, supplies, equipment rentals, fuels, and sub-contractors supplied and utilized for the works have been <strong>FULLY PAID AND SATISFIED</strong>, and that no outstanding liens, garnishments, or third-party liabilities exist against the project.
                  </li>
                  <li>
                    That all applicable national and local taxes, fees, and government contributions (including SSS, PhilHealth, Pag-IBIG, and BIR withholdings) relative to the project have been fully paid and remitted.
                  </li>
                  <li>
                    I am executing this Affidavit to attest to the truth of the foregoing facts and to release the Procuring Entity from any and all liability or claims arising from labor, material, or equipment obligations, in support of our application for progress billing / final payment.
                  </li>
                </ol>

                <p className="pt-2">
                  IN WITNESS WHEREOF, I have hereunto set my hand this _____ day of __________________, 20___ at {cityVenue}, Philippines.
                </p>
              </div>

              {/* Affiant Signature */}
              <div className="pt-8 text-right pr-6">
                <p className="font-bold underline uppercase text-slate-900 text-sm">{affiantName || 'AUTHORIZED MANAGING OFFICER'}</p>
                <p className="text-xs text-slate-600">Affiant / {affiantTitle}</p>
                <p className="text-[11px] text-slate-500 font-mono mt-1">{idType}: {idNumber}</p>
              </div>
            </div>

            {/* Jurat Notarial Block */}
            <div className="pt-6 border-t-2 border-slate-900">
              <p className="text-justify text-xs text-slate-800 leading-normal">
                <strong>SUBSCRIBED AND SWORN</strong> to before me this _____ day of __________________, 20___ at {cityVenue}, Philippines, affiant exhibiting to me their competent evidence of identity indicated above.
              </p>

              <div className="flex justify-between items-end pt-6">
                <div className="space-y-1 text-xs font-mono text-slate-700">
                  <p>Doc. No. &nbsp;<strong>{docNo}</strong>;</p>
                  <p>Page No. <strong>{pageNo}</strong>;</p>
                  <p>Book No. <strong>{bookNo}</strong>;</p>
                  <p>Series of <strong>{seriesYear}</strong>.</p>
                </div>

                <div className="text-center space-y-1">
                  <div className="h-10"></div>
                  <p className="font-bold underline uppercase text-slate-900 text-xs">NOTARY PUBLIC</p>
                  <p className="text-[10px] text-slate-500">Commission Expires on Dec 31, {seriesYear}</p>
                  <p className="text-[10px] text-slate-500 font-mono">PTR / IBP / Roll of Attorneys No.</p>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-100 flex justify-end items-center text-[9px] text-slate-400 font-mono">
                <span>Page 1 of 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function CaModal(props: CaModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] h-[94vh] flex flex-col">
        <VaultErrorBoundary>
          <CaModalContent {...props} />
        </VaultErrorBoundary>
      </div>
    </div>
  );
}

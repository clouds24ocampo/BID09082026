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
  Handshake,
  Briefcase,
  Layers,
  ShieldCheck,
  Building2,
  Calendar
} from 'lucide-react';

export interface ToaModalProps {
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

export const ToaModalContent: React.FC<ToaModalProps> = ({
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
  const [endUserRecipient, setEndUserRecipient] = useState<string>('Local Government Unit / School Principal / End-User Agency');
  const [turnoverDate, setTurnoverDate] = useState<string>(todayStr);
  const [contractAmount, setContractAmount] = useState<number>(propContractAmount || 0);
  const [warrantyPeriod, setWarrantyPeriod] = useState<string>('One (1) Year Defects Liability Period under RA 9184');

  // Signatories
  const [contractorSignatory, setContractorSignatory] = useState<string>(tenant?.authorizedSignatory?.name || '');
  const [contractorTitle, setContractorTitle] = useState<string>(tenant?.authorizedSignatory?.title || 'Authorized Managing Officer');
  const [headOfProcuringEntity, setHeadOfProcuringEntity] = useState<string>(
    propHeadOfProcuringEntity
      ? (propHeadOfProcuringEntityPosition ? `${propHeadOfProcuringEntity} (${propHeadOfProcuringEntityPosition})` : propHeadOfProcuringEntity)
      : (procuringEntityContactPerson || 'Head of Procuring Entity / Regional Director')
  );
  const [endUserSignatory, setEndUserSignatory] = useState<string>('Authorized End-User Representative');
  const [witness1, setWitness1] = useState<string>(procuringEntityContactPerson || 'BAC Chairperson');
  const [witness2, setWitness2] = useState<string>('Government Project Inspector');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const projectScopeKey = (projectRefNo || selectedOppId || activeProjectRefNo || 'default').replace(/[^a-zA-Z0-9]/g, '_');

  useEffect(() => {
    const tenantId = tenant?.id || 'default';
    const list = getOpportunityProjects(tenantId);
    setOppProjects(list);

    if (tenant?.companyName) setCompanyName(tenant.companyName);
    if (tenant?.address) setCompanyAddress(tenant.address);
    if (tenant?.authorizedSignatory?.name) setContractorSignatory(tenant.authorizedSignatory.name);
    if (tenant?.authorizedSignatory?.title) setContractorTitle(tenant.authorizedSignatory.title);

    const storageKey = `bidocs_toa_${tenantId}_${projectScopeKey}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.projectTitle) setProjectTitle(parsed.projectTitle);
        if (parsed.projectRefNo) setProjectRefNo(parsed.projectRefNo);
        if (parsed.procuringEntity) setProcuringEntity(parsed.procuringEntity);
        if (parsed.endUserRecipient) setEndUserRecipient(parsed.endUserRecipient);
        if (parsed.turnoverDate) setTurnoverDate(parsed.turnoverDate);
        if (parsed.contractAmount) setContractAmount(parsed.contractAmount);
        if (parsed.warrantyPeriod) setWarrantyPeriod(parsed.warrantyPeriod);
        if (parsed.contractorSignatory) setContractorSignatory(parsed.contractorSignatory);
        if (parsed.contractorTitle) setContractorTitle(parsed.contractorTitle);
        if (parsed.headOfProcuringEntity) setHeadOfProcuringEntity(parsed.headOfProcuringEntity);
        if (parsed.endUserSignatory) setEndUserSignatory(parsed.endUserSignatory);
        if (parsed.witness1) setWitness1(parsed.witness1);
        if (parsed.witness2) setWitness2(parsed.witness2);
        return;
      }
    } catch (e) {
      console.error('[TOA] Storage load error:', e);
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
          setHeadOfProcuringEntity(target.headOfProcuringEntityPosition ? `${target.headOfProcuringEntity} (${target.headOfProcuringEntityPosition})` : target.headOfProcuringEntity);
        } else if (target.procuringEntityContactPerson) {
          setHeadOfProcuringEntity(target.procuringEntityContactPerson);
        }
        if (target.procuringEntityContactPerson) {
          setWitness1(target.procuringEntityPosition ? `${target.procuringEntityContactPerson} (${target.procuringEntityPosition})` : target.procuringEntityContactPerson);
        }
        const amt = Number((target as any).abc || (target as any).contractAmount || 0);
        if (amt > 0) setContractAmount(amt);
      }
    }
  }, [tenant, activeProjectRefNo, projectScopeKey]);

  const handleSaveState = () => {
    const tenantId = tenant?.id || 'default';
    const storageKey = `bidocs_toa_${tenantId}_${projectScopeKey}`;
    const payload = {
      companyName,
      companyAddress,
      projectTitle,
      projectRefNo,
      procuringEntity,
      endUserRecipient,
      turnoverDate,
      contractAmount,
      warrantyPeriod,
      contractorSignatory,
      contractorTitle,
      headOfProcuringEntity,
      endUserSignatory,
      witness1,
      witness2
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error('[TOA] Save state error:', e);
    }
  };

  const generatePdf = async (): Promise<string | null> => {
    const printArea = document.getElementById('toa-print-sheet');
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
      console.error('[TOA] Generate PDF error:', err);
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
    a.download = `Turn_Over_Agreement_${projectRefNo || 'Project'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveAndComplete = async () => {
    const dataUrl = await generatePdf();
    if (dataUrl && onSaveAndComplete) {
      onSaveAndComplete(
        dataUrl,
        'Turn-Over Agreement (TOA)',
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
          <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/30">
            <Handshake className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              Turn-Over Agreement (TOA) & Certificate of Acceptance
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Official Handover of Facility / Completed Project • Philippine Legal (8.5" x 13")
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
            className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/30 border border-emerald-400/40 cursor-pointer disabled:opacity-50"
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
              <Briefcase className="w-3.5 h-3.5" /> Project & Turnover Parties
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
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Turnover Date</label>
                <input
                  type="text"
                  value={turnoverDate}
                  onChange={(e) => setTurnoverDate(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Procuring Entity Agency</label>
              <input
                type="text"
                value={procuringEntity}
                onChange={(e) => setProcuringEntity(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">End-User / Recipient Entity</label>
              <input
                type="text"
                value={endUserRecipient}
                onChange={(e) => setEndUserRecipient(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Contract Amount (₱)</label>
              <input
                type="number"
                value={contractAmount || ''}
                onChange={(e) => setContractAmount(Number(e.target.value))}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Signatories */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Handover Signatories
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Contractor Signatory</label>
                <input
                  type="text"
                  value={contractorSignatory}
                  onChange={(e) => setContractorSignatory(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Head of Procuring Entity</label>
                <input
                  type="text"
                  value={headOfProcuringEntity}
                  onChange={(e) => setHeadOfProcuringEntity(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">End-User Signatory</label>
                <input
                  type="text"
                  value={endUserSignatory}
                  onChange={(e) => setEndUserSignatory(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Witness / BAC Rep</label>
                <input
                  type="text"
                  value={witness1}
                  onChange={(e) => setWitness1(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview Sheet (7 cols) */}
        <div className="lg:col-span-7 p-6 overflow-y-auto bg-slate-950 flex justify-center items-start">
          <div
            id="toa-print-sheet"
            className="w-[816px] min-h-[1248px] bg-white text-slate-900 p-12 shadow-2xl rounded-sm flex flex-col justify-between text-[12.5px] leading-relaxed"
            style={{ boxSizing: 'border-box' }}
          >
            <div>
              {/* Header */}
              <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                <h1 className="text-lg font-black tracking-wider uppercase text-slate-900">MEMORANDUM OF AGREEMENT / TURN-OVER CERTIFICATE</h1>
                <p className="text-[11px] text-slate-600 font-semibold uppercase">(Official Handover and Acceptance of Completed Infrastructure / Project)</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Executed on {turnoverDate}</p>
              </div>

              {/* Parties */}
              <div className="space-y-4 text-justify text-slate-800 leading-normal">
                <p>
                  This <strong>TURN-OVER AGREEMENT AND ACCEPTANCE</strong> is entered into this _____ day of __________________, 20___ by and between:
                </p>

                <div className="p-3 bg-slate-50 border border-slate-300 rounded text-xs space-y-2">
                  <p>
                    <strong>1. THE CONTRACTOR:</strong> <strong>{companyName.toUpperCase()}</strong>, with principal office address at <em>{companyAddress || 'Philippines'}</em>, represented herein by its {contractorTitle}, <strong>{contractorSignatory}</strong>;
                  </p>
                  <p className="text-center font-bold text-slate-500">— and —</p>
                  <p>
                    <strong>2. THE PROCURING ENTITY & END-USER:</strong> <strong>{procuringEntity.toUpperCase()}</strong> and <strong>{endUserRecipient.toUpperCase()}</strong>, represented herein by <strong>{headOfProcuringEntity}</strong> and <strong>{endUserSignatory}</strong>.
                  </p>
                </div>

                <p className="font-bold uppercase pt-1 text-slate-900">WITNESSETH THAT:</p>

                <ol className="list-decimal pl-6 space-y-2 text-xs">
                  <li>
                    <strong>WHEREAS</strong>, the Contractor has completed 100% of all contractual works and specifications for <strong>"{projectTitle}"</strong> under Contract / Reference No. <strong>{projectRefNo || 'N/A'}</strong> in the total amount of <strong>₱ {contractAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>;
                  </li>
                  <li>
                    <strong>WHEREAS</strong>, a joint final inspection conducted by the Procuring Entity's Inspectorate Team verified that all works are satisfactorily accomplished in accordance with approved plans, without outstanding punch-list defects;
                  </li>
                  <li>
                    <strong>NOW THEREFORE</strong>, the Contractor hereby officially <strong>TURNS OVER AND TRANSFERS</strong> the full custody, physical possession, and operational management of the completed facility to the Procuring Entity and End-User;
                  </li>
                  <li>
                    <strong>ACCEPTANCE:</strong> The Procuring Entity and End-User hereby officially <strong>ACCEPT</strong> the turnover of the facility, acknowledging receipt of complete As-Built Plans, Operating & Maintenance Manuals, and Equipment Warranties;
                  </li>
                  <li>
                    <strong>WARRANTY UNDERTAKING:</strong> The Contractor guarantees the works against structural defects and failures in accordance with Section 62 of RA 9184 and the posted Warranty Security for <strong>{warrantyPeriod}</strong>.
                  </li>
                </ol>

                <p className="pt-2 text-xs">
                  IN WITNESS WHEREOF, the parties have signed this Turn-Over Agreement on the date and place first above written.
                </p>
              </div>
            </div>

            {/* Bottom 4 Signatures & QR */}
            <div className="pt-6 border-t-2 border-slate-900 mt-6">
              <div className="grid grid-cols-2 gap-8 text-center text-xs mb-6">
                <div>
                  <p className="text-slate-500 text-[11px]">Turned Over by (Contractor):</p>
                  <div className="h-10"></div>
                  <p className="font-bold underline uppercase text-slate-900">{contractorSignatory}</p>
                  <p className="text-[10.5px] text-slate-600">{contractorTitle}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[11px]">Accepted by (Procuring Entity & End-User):</p>
                  <div className="h-10"></div>
                  <p className="font-bold underline uppercase text-slate-900">{headOfProcuringEntity}</p>
                  <p className="text-[10.5px] text-slate-600">{endUserSignatory}</p>
                </div>
              </div>

              <div className="flex justify-between items-end border-t border-slate-200 pt-4 text-xs">
                <div className="space-y-1">
                  <p className="text-slate-500 text-[10px]">WITNESSES:</p>
                  <p className="font-semibold text-slate-800">{witness1}</p>
                  <p className="font-semibold text-slate-800">{witness2}</p>
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

export default function ToaModal(props: ToaModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] h-[94vh] flex flex-col">
        <VaultErrorBoundary>
          <ToaModalContent {...props} />
        </VaultErrorBoundary>
      </div>
    </div>
  );
}

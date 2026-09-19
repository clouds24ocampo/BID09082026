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
  FileCheck2,
  Briefcase,
  DollarSign
} from 'lucide-react';

export interface FplModalProps {
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

export const FplModalContent: React.FC<FplModalProps> = ({
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

  const [, setOppProjects] = useState<OpportunityProjectOption[]>([]);
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
  const [entityAddress, setEntityAddress] = useState<string>(procuringEntityAddress || 'Government Agency Office Address, Philippines');
  const [letterDate, setLetterDate] = useState<string>(todayStr);

  // Financial Summary
  const [contractAmount, setContractAmount] = useState<number>(propContractAmount || 0);
  const [finalBillingAmount, setFinalBillingAmount] = useState<number>(propContractAmount ? propContractAmount * 0.15 : 0);
  const [retentionAmount, setRetentionAmount] = useState<number>(propContractAmount ? propContractAmount * 0.10 : 0);
  const [completionDate, setCompletionDate] = useState<string>(todayStr);
  const [punchlistClearedDate, setPunchlistClearedDate] = useState<string>(todayStr);

  // Signatory
  const [signatoryName, setSignatoryName] = useState<string>(tenant?.authorizedSignatory?.name || '');
  const [signatoryTitle, setSignatoryTitle] = useState<string>(tenant?.authorizedSignatory?.title || 'Authorized Managing Officer / President');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const projectScopeKey = (projectRefNo || selectedOppId || activeProjectRefNo || 'default').replace(/[^a-zA-Z0-9]/g, '_');

  useEffect(() => {
    const tenantId = tenant?.id || 'default';
    const list = getOpportunityProjects(tenantId);
    setOppProjects(list);

    if (tenant?.companyName) setCompanyName(tenant.companyName);
    if (tenant?.address) setCompanyAddress(tenant.address);
    if (tenant?.authorizedSignatory?.name) setSignatoryName(tenant.authorizedSignatory.name);
    if (tenant?.authorizedSignatory?.title) setSignatoryTitle(tenant.authorizedSignatory.title);

    const storageKey = `bidocs_fpl_${tenantId}_${projectScopeKey}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.projectTitle) setProjectTitle(parsed.projectTitle);
        if (parsed.projectRefNo) setProjectRefNo(parsed.projectRefNo);
        if (parsed.procuringEntity) setProcuringEntity(parsed.procuringEntity);
        if (parsed.headOfEntity) setHeadOfEntity(parsed.headOfEntity);
        if (parsed.entityAddress) setEntityAddress(parsed.entityAddress);
        if (parsed.letterDate) setLetterDate(parsed.letterDate);
        if (parsed.contractAmount) setContractAmount(parsed.contractAmount);
        if (parsed.finalBillingAmount) setFinalBillingAmount(parsed.finalBillingAmount);
        if (parsed.retentionAmount) setRetentionAmount(parsed.retentionAmount);
        if (parsed.completionDate) setCompletionDate(parsed.completionDate);
        if (parsed.punchlistClearedDate) setPunchlistClearedDate(parsed.punchlistClearedDate);
        if (parsed.signatoryName) setSignatoryName(parsed.signatoryName);
        if (parsed.signatoryTitle) setSignatoryTitle(parsed.signatoryTitle);
        return;
      }
    } catch (e) {
      console.error('[FPL] Storage load error:', e);
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
        if (amt > 0) {
          setContractAmount(amt);
          setFinalBillingAmount(amt * 0.15);
          setRetentionAmount(amt * 0.10);
        }
      }
    }
  }, [tenant, activeProjectRefNo, projectScopeKey]);

  const handleSaveState = () => {
    const tenantId = tenant?.id || 'default';
    const storageKey = `bidocs_fpl_${tenantId}_${projectScopeKey}`;
    const payload = {
      companyName,
      companyAddress,
      projectTitle,
      projectRefNo,
      procuringEntity,
      headOfEntity,
      entityAddress,
      letterDate,
      contractAmount,
      finalBillingAmount,
      retentionAmount,
      completionDate,
      punchlistClearedDate,
      signatoryName,
      signatoryTitle
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error('[FPL] Save state error:', e);
    }
  };

  const generatePdf = async (): Promise<string | null> => {
    const printArea = document.getElementById('fpl-print-sheet');
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
      console.error('[FPL] Generate PDF error:', err);
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
    a.download = `Final_Payment_Letter_${projectRefNo || 'Project'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveAndComplete = async () => {
    const dataUrl = await generatePdf();
    if (dataUrl && onSaveAndComplete) {
      onSaveAndComplete(
        dataUrl,
        'Final Payment Letter (FPL)',
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
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              Final Payment Letter (FPL)
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Formal Request for Final Billing & Release of Retention Money • Philippine Legal (8.5" x 13")
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
        {/* Left Form (5 cols) */}
        <div className="lg:col-span-5 p-5 overflow-y-auto border-r border-slate-800 space-y-4 bg-slate-900/40">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Project & Addressee
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
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Head of Procuring Entity</label>
              <input
                type="text"
                value={headOfEntity}
                onChange={(e) => setHeadOfEntity(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
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
          </div>

          {/* Financials & Dates */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Final Billing & Completion Milestones
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Contract Amount (₱)</label>
                <input
                  type="number"
                  value={contractAmount || ''}
                  onChange={(e) => setContractAmount(Number(e.target.value))}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Final Billing Amount (₱)</label>
                <input
                  type="number"
                  value={finalBillingAmount || ''}
                  onChange={(e) => setFinalBillingAmount(Number(e.target.value))}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Completion Date</label>
                <input
                  type="text"
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Punchlist Rectified Date</label>
                <input
                  type="text"
                  value={punchlistClearedDate}
                  onChange={(e) => setPunchlistClearedDate(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview Sheet (7 cols) */}
        <div className="lg:col-span-7 p-6 overflow-y-auto bg-slate-950 flex justify-center items-start">
          <div
            id="fpl-print-sheet"
            className="w-[816px] min-h-[1248px] bg-white text-slate-900 p-12 shadow-2xl rounded-sm flex flex-col justify-between text-[13px] leading-relaxed"
            style={{ boxSizing: 'border-box' }}
          >
            <div>
              {/* Letterhead */}
              <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                <h1 className="text-lg font-black tracking-wide uppercase text-slate-900">{companyName || 'CONTRACTOR / FIRM NAME'}</h1>
                <p className="text-[11px] text-slate-600 uppercase tracking-wider">{companyAddress || 'Main Business Office Address, Philippines'}</p>
                <p className="text-[11px] text-slate-500 font-mono">TIN: {tenant?.tin || 'N/A'} • PhilGEPS: {tenant?.philgepsPlatinumNo || 'N/A'}</p>
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
                    SUBJECT: <span className="underline uppercase">REQUEST FOR FINAL PAYMENT, 100% COMPLETION INSPECTION & RELEASE OF RETENTION MONEY</span>
                  </p>
                  <p className="text-xs text-slate-700 mt-1">
                    <strong>Project:</strong> {projectTitle || '[Project Name]'} <br />
                    <strong>Contract / Ref No.:</strong> <span className="font-mono">{projectRefNo || 'N/A'}</span>
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="space-y-4 text-justify text-slate-800 leading-normal">
                <p>
                  Dear Sir / Madam:
                </p>

                <p>
                  We have the honor to formally notify your good office that the contract works for the above-referenced project have been <strong>100% physically completed</strong> as of <strong>{completionDate}</strong> in strict accordance with the approved plans, technical specifications, and contractual terms.
                </p>

                <p>
                  All punch-list items noted during joint pre-final inspections have been completely rectified and verified by your project engineers on <strong>{punchlistClearedDate}</strong>.
                </p>

                <div className="my-3 p-4 bg-slate-50 border border-slate-300 rounded text-xs space-y-1.5">
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="font-semibold text-slate-700">Contract Total Amount:</span>
                    <span className="font-bold font-mono text-slate-900">₱ {contractAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="font-semibold text-slate-700">Total Work Accomplished:</span>
                    <span className="font-bold font-mono text-blue-900">100.00% Completed</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="font-bold text-slate-900">Requested Final Payment Amount:</span>
                    <span className="font-black font-mono text-blue-900 text-sm">₱ {finalBillingAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <p>
                  In connection herewith, we are enclosing all statutory close-out requirements:
                </p>

                <ul className="list-disc pl-6 text-xs space-y-1">
                  <li>Complete As-Built Plans (Architectural, Structural, MEPFS) signed and sealed</li>
                  <li>Final Statement of Work Accomplished (SWA) and Billing Statement</li>
                  <li>Contractor's Sworn Affidavit of Full Payment of Labor, Materials, and Taxes</li>
                  <li>Comprehensive Materials Testing Reports & Quality Certifications</li>
                  <li>Warranty Security Bond under Section 62 of RA 9184</li>
                  <li>Turnover and Acceptance Agreement</li>
                </ul>

                <p>
                  In view of the foregoing, we respectfully request for the conduct of the <strong>Final Inspection</strong>, the issuance of the <strong>Certificate of Completion and Acceptance</strong>, and the prompt processing of our Final Payment and release of retention money.
                </p>
              </div>
            </div>

            {/* Bottom Signatures & QR */}
            <div className="pt-8 border-t border-slate-200">
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
    </div>
  );
};

export default function FplModal(props: FplModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] h-[94vh] flex flex-col">
        <VaultErrorBoundary>
          <FplModalContent {...props} />
        </VaultErrorBoundary>
      </div>
    </div>
  );
}

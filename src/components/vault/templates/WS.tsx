import React, { useState, useEffect, useRef } from 'react';
import { Tenant } from '../../../types';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import { savePdfData, loadPdfData } from '../../../utils/vaultIndexedDB';
import VaultErrorBoundary from '../../common/VaultErrorBoundary';
import {
  X,
  Download,
  CheckCircle2,
  ShieldCheck,
  Upload,
  FileText,
  Trash2,
  Briefcase,
  Building2,
  Calendar,
  DollarSign
} from 'lucide-react';

export interface WsModalProps {
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

export const WsModalContent: React.FC<WsModalProps> = ({
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
  const [projectTitle, setProjectTitle] = useState<string>(activeProjectTitle || '');
  const [projectRefNo, setProjectRefNo] = useState<string>(activeProjectRefNo || '');
  const [procuringEntity, setProcuringEntity] = useState<string>(activeProcuringEntity || '');

  // Warranty Security Metadata (RA 9184 Section 62)
  const [securityForm, setSecurityForm] = useState<string>('Surety Bond callable upon demand (30% of Contract Price)');
  const [bondNumber, setBondNumber] = useState<string>('G(16)-WB-2026-00492');
  const [issuingSuretyBank, setIssuingSuretyBank] = useState<string>('GSIS / Insurance Commission Accredited Surety');
  const [contractAmount, setContractAmount] = useState<number>(propContractAmount || 0);
  const [securityAmount, setSecurityAmount] = useState<number>(propContractAmount ? propContractAmount * 0.3 : 0);
  const [validityPeriodStart, setValidityPeriodStart] = useState<string>(todayStr);
  const [validityPeriodEnd, setValidityPeriodEnd] = useState<string>('2028-09-15 (2 Years)');

  // Standalone PDF Document
  const [pdfDataUrl, setPdfDataUrl] = useState<string>('');
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const projectScopeKey = (projectRefNo || selectedOppId || activeProjectRefNo || 'default').replace(/[^a-zA-Z0-9]/g, '_');

  useEffect(() => {
    const tenantId = tenant?.id || 'default';
    const list = getOpportunityProjects(tenantId);
    setOppProjects(list);

    if (tenant?.companyName) setCompanyName(tenant.companyName);

    const storageKey = `bidocs_ws_${tenantId}_${projectScopeKey}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.projectTitle) setProjectTitle(parsed.projectTitle);
        if (parsed.projectRefNo) setProjectRefNo(parsed.projectRefNo);
        if (parsed.procuringEntity) setProcuringEntity(parsed.procuringEntity);
        if (parsed.securityForm) setSecurityForm(parsed.securityForm);
        if (parsed.bondNumber) setBondNumber(parsed.bondNumber);
        if (parsed.issuingSuretyBank) setIssuingSuretyBank(parsed.issuingSuretyBank);
        if (parsed.contractAmount) setContractAmount(parsed.contractAmount);
        if (parsed.securityAmount) setSecurityAmount(parsed.securityAmount);
        if (parsed.validityPeriodStart) setValidityPeriodStart(parsed.validityPeriodStart);
        if (parsed.validityPeriodEnd) setValidityPeriodEnd(parsed.validityPeriodEnd);
        if (parsed.pdfFileName) setPdfFileName(parsed.pdfFileName);
      }
    } catch (e) {
      console.error('[WS] Storage load error:', e);
    }

    const pdfDbKey = `proj_ws_pdf_${tenantId}_${projectScopeKey}`;
    loadPdfData(pdfDbKey).then((data) => {
      if (data) setPdfDataUrl(data);
    }).catch(console.error);

    if (list.length > 0 && !selectedOppId) {
      const match = activeProjectRefNo ? list.find(p => p.refNo === activeProjectRefNo) : null;
      const target = match || list[0];
      if (target) {
        setSelectedOppId(target.id);
        setProjectTitle(target.title);
        setProjectRefNo(target.refNo);
        setProcuringEntity(target.procuringEntity);
        const amt = Number((target as any).abc || (target as any).contractAmount || 0);
        if (amt > 0) {
          setContractAmount(amt);
          setSecurityAmount(amt * 0.30);
        }
      }
    }
  }, [tenant, activeProjectRefNo, projectScopeKey]);

  const handleSaveState = (newFileName?: string) => {
    const tenantId = tenant?.id || 'default';
    const storageKey = `bidocs_ws_${tenantId}_${projectScopeKey}`;
    const payload = {
      companyName,
      projectTitle,
      projectRefNo,
      procuringEntity,
      securityForm,
      bondNumber,
      issuingSuretyBank,
      contractAmount,
      securityAmount,
      validityPeriodStart,
      validityPeriodEnd,
      pdfFileName: newFileName !== undefined ? newFileName : pdfFileName
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error('[WS] Save state error:', e);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setPdfDataUrl(dataUrl);
      setPdfFileName(file.name);
      const tenantId = tenant?.id || 'default';
      const pdfDbKey = `proj_ws_pdf_${tenantId}_${projectScopeKey}`;
      await savePdfData(pdfDbKey, dataUrl);
      handleSaveState(file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveAndComplete = () => {
    handleSaveState();
    if (pdfDataUrl && onSaveAndComplete) {
      onSaveAndComplete(
        pdfDataUrl,
        'Warranty Security Document',
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
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              Warranty Security (WS) — Upload Documents Only
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              RA 9184 Section 62 • Surety Bond / Bank Guarantee / Standby LC Attachment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pdfDataUrl && (
            <a
              href={pdfDataUrl}
              download={pdfFileName || 'Warranty_Security.pdf'}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Download Uploaded PDF</span>
            </a>
          )}
          <button
            onClick={handleSaveAndComplete}
            disabled={isSaving || !pdfDataUrl}
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
        {/* Left Form (5 cols) */}
        <div className="lg:col-span-5 p-5 overflow-y-auto border-r border-slate-800 space-y-4 bg-slate-900/40">
          {/* Document Upload Area */}
          <div className="bg-slate-900 border-2 border-dashed border-emerald-500/40 p-5 rounded-xl text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl mx-auto flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Upload Official Warranty Security (PDF)
              </h3>
              <p className="text-[11px] text-slate-400">
                Attach the scanned original Surety Bond, Bank Guarantee, or Letter of Credit issued for this project.
              </p>
            </div>

            <input
              type="file"
              ref={pdfInputRef}
              accept="application/pdf"
              onChange={handlePdfUpload}
              className="hidden"
            />

            {pdfDataUrl ? (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2 truncate text-left">
                  <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-mono text-emerald-200 truncate">{pdfFileName || 'Warranty_Security.pdf'}</span>
                </div>
                <button
                  onClick={() => {
                    setPdfDataUrl('');
                    setPdfFileName('');
                    handleSaveState('');
                  }}
                  className="p-1 text-slate-400 hover:text-red-400 rounded transition"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => pdfInputRef.current?.click()}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-600/30"
              >
                <Upload className="w-4 h-4" />
                <span>Select & Upload Warranty Security PDF</span>
              </button>
            )}
          </div>

          {/* Metadata Parameters */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Warranty Security Details (Sec. 62 RA 9184)
            </h3>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Form of Warranty Security</label>
              <select
                value={securityForm}
                onChange={(e) => setSecurityForm(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value="Surety Bond callable upon demand (30% of Contract Price)">Surety Bond callable upon demand (30% of Contract Price)</option>
                <option value="Bank Guarantee confirmed by Universal/Commercial Bank (10%)">Bank Guarantee confirmed by Universal/Commercial Bank (10%)</option>
                <option value="Irrevocable Standby Letter of Credit (10%)">Irrevocable Standby Letter of Credit (10%)</option>
                <option value="Special Bank Guarantee / Retention Money">Special Bank Guarantee / Retention Money</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Bond / Policy No.</label>
                <input
                  type="text"
                  value={bondNumber}
                  onChange={(e) => setBondNumber(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Issuing Company / Bank</label>
                <input
                  type="text"
                  value={issuingSuretyBank}
                  onChange={(e) => setIssuingSuretyBank(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Contract Price (₱)</label>
                <input
                  type="number"
                  value={contractAmount || ''}
                  onChange={(e) => {
                    const amt = Number(e.target.value);
                    setContractAmount(amt);
                    setSecurityAmount(amt * 0.30);
                  }}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Security Amount (₱)</label>
                <input
                  type="number"
                  value={securityAmount || ''}
                  onChange={(e) => setSecurityAmount(Number(e.target.value))}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Validity Start</label>
                <input
                  type="text"
                  value={validityPeriodStart}
                  onChange={(e) => setValidityPeriodStart(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Validity End (Expiration)</label>
                <input
                  type="text"
                  value={validityPeriodEnd}
                  onChange={(e) => setValidityPeriodEnd(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right PDF Viewer (7 cols) */}
        <div className="lg:col-span-7 p-6 overflow-y-auto bg-slate-950 flex justify-center items-start">
          {pdfDataUrl ? (
            <div className="w-full h-[750px] bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
              <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex justify-between items-center text-xs font-mono text-slate-300">
                <span>Warranty Security PDF: {pdfFileName}</span>
                <span className="text-emerald-400 font-bold">Document Ready</span>
              </div>
              <iframe
                src={pdfDataUrl}
                title="Warranty Security PDF"
                className="w-full flex-1 border-0"
              />
            </div>
          ) : (
            <div className="w-full h-[600px] border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center p-12 text-center text-slate-500 space-y-3">
              <ShieldCheck className="w-12 h-12 text-slate-600" />
              <p className="text-sm font-semibold text-slate-400">No Warranty Security PDF uploaded yet.</p>
              <p className="text-xs max-w-sm text-slate-600">
                Please upload your scanned Warranty Bond or Bank Guarantee document using the left upload button.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function WsModal(props: WsModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] h-[94vh] flex flex-col">
        <VaultErrorBoundary>
          <WsModalContent {...props} />
        </VaultErrorBoundary>
      </div>
    </div>
  );
}

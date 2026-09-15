import React, { useState, useEffect, useRef } from 'react';
import { Tenant } from '../../../types';
import { PDFDocument } from 'pdf-lib';
import html2canvas from 'html2canvas';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import { savePdfData, loadPdfData } from '../../../utils/vaultIndexedDB';
import VaultErrorBoundary from '../../common/VaultErrorBoundary';
import {
  X,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  Compass,
  Upload,
  FileText,
  Eye,
  ShieldCheck,
  Briefcase,
  Layers
} from 'lucide-react';

export interface AbpDrawingSheet {
  id: string;
  sheetNo: string;
  discipline: 'ARCHITECTURAL' | 'STRUCTURAL' | 'ELECTRICAL' | 'PLUMBING' | 'MECHANICAL';
  title: string;
  revisions: string;
  approvedBy: string;
}

export interface AbpModalProps {
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

const DEFAULT_DRAWING_SHEETS: AbpDrawingSheet[] = [
  { id: 'sheet-1', sheetNo: 'A-1', discipline: 'ARCHITECTURAL', title: 'Site Development & Ground Floor As-Built Plan', revisions: 'Final As-Built', approvedBy: 'Arch. Lead Architect' },
  { id: 'sheet-2', sheetNo: 'A-2', discipline: 'ARCHITECTURAL', title: 'Elevations & Section Details As-Built', revisions: 'Final As-Built', approvedBy: 'Arch. Lead Architect' },
  { id: 'sheet-3', sheetNo: 'S-1', discipline: 'STRUCTURAL', title: 'Foundation & Column Layout As-Built', revisions: 'Final As-Built', approvedBy: 'Engr. Structural PE' },
  { id: 'sheet-4', sheetNo: 'S-2', discipline: 'STRUCTURAL', title: 'Beam Framing & Slab Rebar Schedules As-Built', revisions: 'Final As-Built', approvedBy: 'Engr. Structural PE' },
  { id: 'sheet-5', sheetNo: 'E-1', discipline: 'ELECTRICAL', title: 'Power Layout & Single Line Diagram As-Built', revisions: 'Final As-Built', approvedBy: 'Engr. Professional Electrical Engr' },
  { id: 'sheet-6', sheetNo: 'P-1', discipline: 'PLUMBING', title: 'Water Distribution & Drainage Isometrics As-Built', revisions: 'Final As-Built', approvedBy: 'Engr. Master Plumber / San. Engr' }
];

export const AbpModalContent: React.FC<AbpModalProps> = ({
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
  const [completionDate, setCompletionDate] = useState<string>(todayStr);

  // Standalone Blueprint / As-built PDF upload
  const [directPdfDataUrl, setDirectPdfDataUrl] = useState<string>('');
  const [directPdfFileName, setDirectPdfFileName] = useState<string>('');

  // Drawing schedule
  const [sheets, setSheets] = useState<AbpDrawingSheet[]>(DEFAULT_DRAWING_SHEETS);

  // Certifying Engineers
  const [projectEngineer, setProjectEngineer] = useState<string>('Engr. Project In-Charge');
  const [peLicense, setPeLicense] = useState<string>('PRC Reg. No. 0089124');
  const [consultantEngineer, setConsultantEngineer] = useState<string>('Engr. Government Resident Engineer');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const projectScopeKey = (projectRefNo || selectedOppId || activeProjectRefNo || 'default').replace(/[^a-zA-Z0-9]/g, '_');

  useEffect(() => {
    const tenantId = tenant?.id || 'default';
    const list = getOpportunityProjects(tenantId);
    setOppProjects(list);

    if (tenant?.companyName) setCompanyName(tenant.companyName);

    const storageKey = `bidocs_abp_${tenantId}_${projectScopeKey}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.projectTitle) setProjectTitle(parsed.projectTitle);
        if (parsed.projectRefNo) setProjectRefNo(parsed.projectRefNo);
        if (parsed.procuringEntity) setProcuringEntity(parsed.procuringEntity);
        if (parsed.completionDate) setCompletionDate(parsed.completionDate);
        if (Array.isArray(parsed.sheets) && parsed.sheets.length > 0) setSheets(parsed.sheets);
        if (parsed.directPdfFileName) setDirectPdfFileName(parsed.directPdfFileName);
        if (parsed.projectEngineer) setProjectEngineer(parsed.projectEngineer);
        if (parsed.peLicense) setPeLicense(parsed.peLicense);
        if (parsed.consultantEngineer) setConsultantEngineer(parsed.consultantEngineer);
      }
    } catch (e) {
      console.error('[ABP] Storage load error:', e);
    }

    const pdfDbKey = `proj_abp_pdf_${tenantId}_${projectScopeKey}`;
    loadPdfData(pdfDbKey).then((data) => {
      if (data) setDirectPdfDataUrl(data);
    }).catch(console.error);

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

  const handleSaveState = (newSheets?: AbpDrawingSheet[], pdfName?: string) => {
    const tenantId = tenant?.id || 'default';
    const storageKey = `bidocs_abp_${tenantId}_${projectScopeKey}`;
    const payload = {
      companyName,
      projectTitle,
      projectRefNo,
      procuringEntity,
      completionDate,
      sheets: newSheets || sheets,
      directPdfFileName: pdfName !== undefined ? pdfName : directPdfFileName,
      projectEngineer,
      peLicense,
      consultantEngineer
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error('[ABP] Save state error:', e);
    }
  };

  const handleDirectPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setDirectPdfDataUrl(dataUrl);
      setDirectPdfFileName(file.name);
      const tenantId = tenant?.id || 'default';
      const pdfDbKey = `proj_abp_pdf_${tenantId}_${projectScopeKey}`;
      await savePdfData(pdfDbKey, dataUrl);
      handleSaveState(undefined, file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddSheet = () => {
    const newSheet: AbpDrawingSheet = {
      id: `sheet-${Date.now()}`,
      sheetNo: `DWG-${sheets.length + 1}`,
      discipline: 'STRUCTURAL',
      title: 'Detailed As-Built Plan Sheet',
      revisions: 'Final As-Built',
      approvedBy: 'Professional Engineer'
    };
    const updated = [...sheets, newSheet];
    setSheets(updated);
    handleSaveState(updated);
  };

  const handleRemoveSheet = (id: string) => {
    const updated = sheets.filter(s => s.id !== id);
    setSheets(updated);
    handleSaveState(updated);
  };

  const handleUpdateSheet = (id: string, field: keyof AbpDrawingSheet, value: any) => {
    const updated = sheets.map(s => (s.id === id ? { ...s, [field]: value } : s));
    setSheets(updated);
    handleSaveState(updated);
  };

  const generatePdf = async (): Promise<string | null> => {
    if (directPdfDataUrl) {
      return directPdfDataUrl;
    }
    const printArea = document.getElementById('abp-print-sheet');
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
      console.error('[ABP] Generate PDF error:', err);
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
    a.download = `As_Built_Plans_${projectRefNo || 'Project'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveAndComplete = async () => {
    const dataUrl = await generatePdf();
    if (dataUrl && onSaveAndComplete) {
      onSaveAndComplete(
        dataUrl,
        'As-Built Plan (ABP) Certification',
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
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              As-Built Plan (ABP) Certification & Drawing Registry
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Final Built Engineering Drawings Schedule & Blueprint PDF Attachment • Philippine Legal (8.5" x 13")
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

      {/* Grid Content */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Form Controls (5 cols) */}
        <div className="lg:col-span-5 p-5 overflow-y-auto border-r border-slate-800 space-y-4 bg-slate-900/40">
          {/* Direct Blueprint PDF Upload */}
          <div className="bg-slate-900 border border-blue-500/30 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Upload Complete As-Built Plan Set (PDF)
            </h3>
            <p className="text-xs text-slate-400">
              Attach the signed and sealed complete PDF set of As-Built architectural and engineering plans:
            </p>

            <input
              type="file"
              ref={pdfInputRef}
              accept="application/pdf"
              onChange={handleDirectPdfUpload}
              className="hidden"
            />

            {directPdfDataUrl ? (
              <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-xs font-mono text-white truncate">{directPdfFileName || 'As_Built_Plans.pdf'}</span>
                </div>
                <button
                  onClick={() => {
                    setDirectPdfDataUrl('');
                    setDirectPdfFileName('');
                    handleSaveState(undefined, '');
                  }}
                  className="p-1 text-slate-400 hover:text-red-400 rounded transition"
                  title="Remove PDF"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => pdfInputRef.current?.click()}
                className="w-full py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload As-Built Drawing PDF Set</span>
              </button>
            )}
          </div>

          {/* Project Details */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Project Information
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
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Completion Date</label>
                <input
                  type="text"
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Drawing Sheet Index */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Drawing Sheet Index ({sheets.length})
              </h3>
              <button
                onClick={handleAddSheet}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Sheet
              </button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {sheets.map((s) => (
                <div key={s.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={s.sheetNo}
                      onChange={(e) => handleUpdateSheet(s.id, 'sheetNo', e.target.value)}
                      placeholder="Sheet No"
                      className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-cyan-400 font-bold"
                    />
                    <select
                      value={s.discipline}
                      onChange={(e) => handleUpdateSheet(s.id, 'discipline', e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-blue-300"
                    >
                      <option value="ARCHITECTURAL">ARCHITECTURAL</option>
                      <option value="STRUCTURAL">STRUCTURAL</option>
                      <option value="ELECTRICAL">ELECTRICAL</option>
                      <option value="PLUMBING">PLUMBING</option>
                      <option value="MECHANICAL">MECHANICAL</option>
                    </select>
                    <button
                      onClick={() => handleRemoveSheet(s.id)}
                      className="p-1 text-slate-500 hover:text-red-400 rounded transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={s.title}
                    onChange={(e) => handleUpdateSheet(s.id, 'title', e.target.value)}
                    placeholder="Drawing Sheet Title"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Preview Sheet or PDF Viewer (7 cols) */}
        <div className="lg:col-span-7 p-6 overflow-y-auto bg-slate-950 flex justify-center items-start">
          {directPdfDataUrl ? (
            <div className="w-full h-[750px] bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
              <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex justify-between items-center text-xs font-mono text-slate-300">
                <span>As-Built Plan PDF: {directPdfFileName || 'As-Built Plans'}</span>
                <span className="text-emerald-400 font-bold">Document Attached</span>
              </div>
              <iframe
                src={directPdfDataUrl}
                title="As-Built Plan PDF"
                className="w-full flex-1 border-0"
              />
            </div>
          ) : (
            <div
              id="abp-print-sheet"
              className="w-[816px] min-h-[1248px] bg-white text-slate-900 p-10 shadow-2xl rounded-sm flex flex-col justify-between text-[11px] leading-tight"
              style={{ boxSizing: 'border-box' }}
            >
              <div>
                {/* Header */}
                <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
                  <h1 className="text-base font-black tracking-wide uppercase text-slate-900">{companyName || 'CONTRACTOR / FIRM NAME'}</h1>
                  <p className="text-[10px] text-slate-600 uppercase font-semibold">AS-BUILT PLANS TRANSMITTAL & CERTIFICATION</p>
                  <p className="text-[10px] text-blue-900 font-bold mt-0.5">As of {completionDate}</p>
                </div>

                {/* Project Info */}
                <div className="grid grid-cols-2 gap-4 mb-4 p-2.5 bg-slate-50 border border-slate-300 rounded text-[10.5px]">
                  <div>
                    <p><strong>Project Name:</strong> {projectTitle || 'N/A'}</p>
                    <p><strong>Procuring Entity:</strong> {procuringEntity || 'Government Agency'}</p>
                  </div>
                  <div>
                    <p><strong>Contract / Ref No.:</strong> <span className="font-mono">{projectRefNo || 'N/A'}</span></p>
                    <p><strong>Total As-Built Sheets:</strong> {sheets.length} Drawing Sheets</p>
                  </div>
                </div>

                {/* Drawing Sheet Table */}
                <table className="w-full border-collapse border border-slate-400 text-[10px] mb-4">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900 text-center font-bold">
                      <th className="border border-slate-400 p-1.5 w-16">Sheet No</th>
                      <th className="border border-slate-400 p-1.5 w-24">Discipline</th>
                      <th className="border border-slate-400 p-1.5 text-left">Drawing Sheet Title</th>
                      <th className="border border-slate-400 p-1.5 w-28">Status / Revision</th>
                      <th className="border border-slate-400 p-1.5 w-32">Certifying Engineer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheets.map((s, idx) => (
                      <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="border border-slate-400 p-1.5 text-center font-mono font-bold text-slate-900">{s.sheetNo}</td>
                        <td className="border border-slate-400 p-1.5 text-center font-semibold text-blue-900 text-[9px]">{s.discipline}</td>
                        <td className="border border-slate-400 p-1.5 font-medium">{s.title}</td>
                        <td className="border border-slate-400 p-1.5 text-center font-mono text-[9px]">{s.revisions}</td>
                        <td className="border border-slate-400 p-1.5 text-center text-[9px]">{s.approvedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Certification Statement */}
                <div className="p-3 bg-slate-50 border border-slate-300 rounded text-[10px] space-y-1 text-slate-700 leading-normal">
                  <p className="font-bold text-slate-900 uppercase">ENGINEERING AS-BUILT CERTIFICATION:</p>
                  <p>
                    We hereby certify that the attached As-Built Drawings accurately represent the actual physical dimensions, structural configurations, utility runs, and engineering modifications executed and completed on-site in full accordance with the approved plans and authorized variation orders.
                  </p>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-6 border-t border-slate-300">
                <div className="grid grid-cols-2 gap-8 text-center text-[10px]">
                  <div className="space-y-1">
                    <p className="text-slate-500">Prepared & Sealed by (Contractor):</p>
                    <div className="h-10"></div>
                    <p className="font-bold underline uppercase text-slate-900">{projectEngineer}</p>
                    <p className="text-slate-600 font-mono text-[9px]">{peLicense}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-500">Reviewed & Accepted by (Procuring Entity):</p>
                    <div className="h-10"></div>
                    <p className="font-bold underline uppercase text-slate-900">{consultantEngineer}</p>
                    <p className="text-slate-600 text-[9px]">Government Project Engineer / Consultant</p>
                  </div>
                </div>

              <div className="mt-6 pt-2 border-t border-slate-200 flex justify-end items-center text-[9px] text-slate-400 font-mono">
                <span>Page 1 of 1</span>
              </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function AbpModal(props: AbpModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] h-[94vh] flex flex-col">
        <VaultErrorBoundary>
          <AbpModalContent {...props} />
        </VaultErrorBoundary>
      </div>
    </div>
  );
}

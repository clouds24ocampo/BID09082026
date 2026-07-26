import React, { useState, useEffect } from 'react';
import { Tenant } from '../../../types';
import { generateAndDownloadThreeLayerPdf } from '../../../utils/pdfExportEngine';
import { PDFDocument } from 'pdf-lib';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import html2canvas from 'html2canvas';
import {
  X,
  Printer,
  Plus,
  Trash2,
  Upload,
  Download,
  CheckCircle2,
  FileText,
  CheckSquare,
  Square,
  Paperclip,
  Edit3,
  Building2,
  Calendar,
  DollarSign,
  ShieldCheck,
  Clock
} from 'lucide-react';

export interface OngoingContractRow {
  id: string;
  type: 'Government' | 'Private';
  projectName: string;
  ownerName: string;
  ownerAddress: string;
  ownerTelephone: string;
  natureOfWork: string;
  bidderRole: string;
  amountAward: string;
  amountCompletion: string;
  duration: string;
  dateAwarded: string;
  dateStarted: string;
  dateCompletion: string;
  accomplishmentPlanned: number;
  accomplishmentActual: number;
  pdfFile?: {
    fileName: string;
    fileSizeBytes: number;
    fileDataUrl?: string;
  };
}

interface StatementOngoingContractsModalProps {
  tenant: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete: (fileDataUrl?: string, customName?: string) => void;
  onClose: () => void;
}

const formatPhpCurrency = (val: string): string => {
  if (!val) return '₱0.00';
  const cleaned = val.replace(/[^0-9.]/g, '');
  if (!cleaned) return '₱0.00';
  const parts = cleaned.split('.');
  const intPart = parts[0] ? parseInt(parts[0], 10) : 0;
  const decPart = parts.length > 1 ? parts[1].slice(0, 2) : '00';
  const formattedInt = isNaN(intPart) ? '0' : intPart.toLocaleString('en-US');
  const formattedDec = decPart.padEnd(2, '0');
  return `₱${formattedInt}.${formattedDec}`;
};

const getNowDateTimeString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${mins}`;
};

export const StatementOngoingContractsModal: React.FC<StatementOngoingContractsModalProps> = ({
  tenant,
  activeProjectRefNo = '',
  activeProjectTitle = '',
  activeProcuringEntity = '',
  onSaveAndComplete,
  onClose
}) => {
  const [isNoOngoing, setIsNoOngoing] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];
  const [dateTimeSubmitted, setDateTimeSubmitted] = useState<string>(getNowDateTimeString());

  // Target Project Information (Auto-filled directly from Opportunity Finder)
  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo);
  const [projectTitle, setProjectTitle] = useState(activeProjectTitle);
  const [procuringEntity, setProcuringEntity] = useState(activeProcuringEntity);
  const [solicitationNumber, setSolicitationNumber] = useState('');

  // Opportunity Finder Project List State (Strictly real user opportunities)
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  useEffect(() => {
    const list = getOpportunityProjects();
    setOppProjects(list);
    if (list.length > 0 && !selectedOppId) {
      const first = list[0];
      setSelectedOppId(first.id);
      setProjectRefNo(first.refNo);
      setSolicitationNumber(first.solicitationNo || 'N/A');
      setProjectTitle(first.title);
      setProcuringEntity(first.procuringEntity);
      if (first.dateTimeSubmitted) {
        setDateTimeSubmitted(first.dateTimeSubmitted);
      }
    }
  }, []);

  // Form Editor Modal state for editing or creating a contract row
  const [editingRow, setEditingRow] = useState<OngoingContractRow | null>(null);

  // CLEAN SLATE: Initial state has zero dummy contracts
  const [contracts, setContracts] = useState<OngoingContractRow[]>([]);

  const openFormEditor = (existingRow?: OngoingContractRow, defaultType: 'Government' | 'Private' = 'Government') => {
    if (existingRow) {
      setEditingRow({ ...existingRow });
    } else {
      setEditingRow({
        id: `cnt-${Date.now()}-${Math.random()}`,
        type: defaultType,
        projectName: '',
        ownerName: '',
        ownerAddress: '',
        ownerTelephone: '',
        natureOfWork: '',
        bidderRole: 'Main Contractor',
        amountAward: '',
        amountCompletion: '',
        duration: ' calendar days',
        dateAwarded: todayStr,
        dateStarted: todayStr,
        dateCompletion: todayStr,
        accomplishmentPlanned: 0,
        accomplishmentActual: 0
      });
    }
  };

  const saveEditingRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;

    const formattedRow: OngoingContractRow = {
      ...editingRow,
      amountAward: editingRow.amountAward ? formatPhpCurrency(editingRow.amountAward) : '₱0.00',
      amountCompletion: editingRow.amountCompletion ? formatPhpCurrency(editingRow.amountCompletion) : '₱0.00'
    };

    setContracts(prev => {
      const idx = prev.findIndex(c => c.id === formattedRow.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = formattedRow;
        return copy;
      }
      return [...prev, formattedRow];
    });

    setEditingRow(null);
  };

  const removeRow = (id: string) => {
    setContracts(prev => prev.filter(c => c.id !== id));
  };

  const handleRowPdfUpload = (id: string, file: File | undefined) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      alert('Only PDF files (.pdf) are accepted.');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      alert(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds 100 MB limit.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setContracts(prev => prev.map(c => {
        if (c.id === id) {
          return {
            ...c,
            pdfFile: {
              fileName: file.name,
              fileSizeBytes: file.size,
              fileDataUrl: reader.result as string
            }
          };
        }
        return c;
      }));

      if (editingRow && editingRow.id === id) {
        setEditingRow(prev => prev ? {
          ...prev,
          pdfFile: {
            fileName: file.name,
            fileSizeBytes: file.size,
            fileDataUrl: reader.result as string
          }
        } : null);
      }
    };
    reader.readAsDataURL(file);
  };

  const generateMergedPackageDataUrl = async (): Promise<string | undefined> => {
    try {
      const templateElem = document.querySelector('.single-page-paper') as HTMLElement;
      if (!templateElem) return undefined;

      // 1. Convert template element to high-res canvas image (Scale 2.5)
      const canvas = await html2canvas(templateElem, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        ignoreElements: (el) => el.classList.contains('no-export-btn')
      });
      const imgDataUrl = canvas.toDataURL('image/png');

      // 2. Initialize pdf-lib document
      const mainPdfDoc = await PDFDocument.create();

      // Embed Legal Landscape Page 1 (936pt x 612pt)
      const pngImage = await mainPdfDoc.embedPng(imgDataUrl);
      const page1 = mainPdfDoc.addPage([936, 612]);
      page1.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: 936,
        height: 612
      });

      // 3. Append all uploaded supporting PDF documents attached to ongoing contract rows
      for (const row of contracts) {
        if (row.pdfFile?.fileDataUrl && row.pdfFile.fileDataUrl.startsWith('data:application/pdf')) {
          try {
            const base64Str = row.pdfFile.fileDataUrl.split(',')[1] || row.pdfFile.fileDataUrl;
            const pdfBytes = Uint8Array.from(atob(base64Str), c => c.charCodeAt(0));
            const srcPdf = await PDFDocument.load(pdfBytes);
            const copiedPages = await mainPdfDoc.copyPages(srcPdf, srcPdf.getPageIndices());
            copiedPages.forEach(p => mainPdfDoc.addPage(p));
          } catch (err) {
            console.error(`[PDFMerge] Error appending supporting PDF for ${row.projectName}:`, err);
          }
        }
      }

      // 4. Return complete merged PDF DataURL
      const mergedPdfBytes = await mainPdfDoc.save();
      const blob = new Blob([mergedPdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error('[PDFMerge] Error generating merged PDF package:', e);
      return undefined;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    const projRef = projectRefNo || 'UNLINKED_PROJECT';
    const docName = 'Statement_of_All_Ongoing_Government_and_Private_Contracts';
    const today = new Date().toISOString().split('T')[0];
    const fileName = `${projRef}_${docName}_${today}.pdf`;

    const mergedDataUrl = await generateMergedPackageDataUrl();
    if (mergedDataUrl) {
      const link = document.createElement('a');
      link.href = mergedDataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const templateElem = document.querySelector('.single-page-paper') as HTMLElement;
      await generateAndDownloadThreeLayerPdf(null, templateElem, undefined, fileName);
    }
  };

  const handleSaveDraft = async () => {
    try {
      const mergedDataUrl = await generateMergedPackageDataUrl();
      onSaveAndComplete(mergedDataUrl, 'Statement of All Ongoing Government & Private Contracts');
    } catch (e) {
      onSaveAndComplete(undefined, 'Statement of All Ongoing Government & Private Contracts');
    }
  };

  const govContracts = contracts.filter(c => c.type === 'Government');
  const privContracts = contracts.filter(c => c.type === 'Private');

  // Format date-time for 100% accurate display (e.g. "2026-08-30T14:00" -> "2026-08-30 02:00 PM")
  const formatDateTimeDisplay = (dtStr: string) => {
    if (!dtStr) return 'N/A';
    const parts = dtStr.split('T');
    if (parts.length === 2) {
      const datePart = parts[0];
      const timePart = parts[1];
      const [hours, mins] = timePart.split(':');
      const h = parseInt(hours, 10);
      if (!isNaN(h)) {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${datePart} ${String(h12).padStart(2, '0')}:${mins} ${ampm}`;
      }
      return `${datePart} ${timePart}`;
    }
    return dtStr;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">

      {/* PORTRAIT PRINT STYLESHEET OVERRIDE */}
      <style>{`
        @media print {
          @page {
            size: 8.5in 13in;
            margin: 0.4in;
          }
          header, nav, aside, button, .print\\:hidden, .no-print, .no-export, .proof-column, .actions-column, .sticky {
            display: none !important;
          }
          html, body, #root, .fixed, .backdrop-blur-md, .bg-slate-900, .bg-slate-950 {
            position: static !important;
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
          }
          .single-page-paper {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0.25in !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col">

        {/* Top Header Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>GPPB Legal Template — Item (b) Statement of All Ongoing Contracts</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                  Legal (8.5" × 13") Portrait Standard
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Statement of all ongoing government and private contracts, including contracts awarded but not yet started.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export to PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Legal (8.5" × 13")</span>
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950 space-y-6">

          {/* Target Bidding Project Selector & Auto-Fill Bar */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4 print:hidden no-export">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                Target Bidding Project Auto-Fill Settings (Linked to Opportunity Finder)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Changes auto-fill directly onto Legal Template header below</span>
            </div>

            {/* Opportunity Finder Project Dropdown */}
            <div>
              <label className="block text-slate-300 font-mono text-[11px] mb-1 flex items-center justify-between">
                <span className="font-bold text-blue-300">Select Project from Opportunity Finder:</span>
                <span className="text-[10px] text-emerald-400 font-semibold">⚡ Auto-populates template header from real saved opportunities</span>
              </label>
              <select
                value={selectedOppId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedOppId(val);
                  const found = oppProjects.find(p => p.id === val || p.refNo === val);
                  if (found) {
                    setProjectRefNo(found.refNo);
                    setSolicitationNumber(found.solicitationNo || 'N/A');
                    setProjectTitle(found.title);
                    setProcuringEntity(found.procuringEntity);
                    if (found.dateTimeSubmitted) {
                      setDateTimeSubmitted(found.dateTimeSubmitted);
                    }
                  }
                }}
                className="w-full bg-slate-950 border border-blue-500/60 rounded-xl px-3 py-2 text-white font-mono text-xs font-bold focus:outline-none focus:border-blue-400 shadow-inner"
              >
                {oppProjects.length === 0 ? (
                  <option value="">-- No Active Bidding Projects Saved in Opportunity Finder. Add a Project in Opportunity Finder --</option>
                ) : (
                  <>
                    <option value="">-- Select Active Bidding Opportunity / Project --</option>
                    {oppProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.refNo}] {p.title} — {p.procuringEntity} ({p.abc})
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs pt-1 border-t border-slate-800/80">
              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1">1. Project Ref. No</label>
                <input
                  type="text"
                  value={projectRefNo}
                  onChange={(e) => setProjectRefNo(e.target.value)}
                  placeholder="Select from Opportunity Finder"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1">2. Solicitation No.</label>
                <input
                  type="text"
                  value={solicitationNumber}
                  onChange={(e) => setSolicitationNumber(e.target.value)}
                  placeholder="e.g. SOL-2026-001"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1">3. Name of Project</label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="Select from Opportunity Finder"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1">4. Procuring Entity</label>
                <input
                  type="text"
                  value={procuringEntity}
                  onChange={(e) => setProcuringEntity(e.target.value)}
                  placeholder="Select from Opportunity Finder"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1">5. Date & Time of Submission</label>
                <input
                  type="datetime-local"
                  value={dateTimeSubmitted}
                  onChange={(e) => setDateTimeSubmitted(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Action Toolbar: "No Ongoing" Toggle & Add Contract Buttons */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden no-export">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsNoOngoing(!isNoOngoing)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold font-mono transition flex items-center gap-2 shadow-lg ${isNoOngoing
                  ? 'bg-amber-600 text-white border border-amber-400'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                  }`}
              >
                {isNoOngoing ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                <span>"No Ongoing" Declaration</span>
              </button>

              <p className="text-xs text-slate-400 font-mono">
                {isNoOngoing
                  ? 'One-click "No Ongoing" active. Displays "NONE" across legal template tables & marks Item (b) Complete.'
                  : 'Click to declare no ongoing contracts or click "Fill Out Contract Form" to add entry rows.'}
              </p>
            </div>

            {!isNoOngoing && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openFormEditor(undefined, 'Government')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition flex items-center gap-1.5 shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>Fill Out Government Contract Form</span>
                </button>
                <button
                  type="button"
                  onClick={() => openFormEditor(undefined, 'Private')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition flex items-center gap-1.5 shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>Fill Out Private Contract Form</span>
                </button>
              </div>
            )}
          </div>

          {/* GPPB LEGAL PAPER CONTAINER (Legal 13" x 8.5" LANDSCAPE Printable Layout — EXPANDABLE MULTI-ENTRY FIT) */}
          <div className="single-page-paper bg-white text-slate-900 font-sans p-6 sm:p-8 border-2 border-slate-900 rounded-2xl shadow-2xl space-y-4 max-w-[1150px] min-h-[680px] h-auto mx-auto text-left relative flex flex-col justify-between print:m-0 print:border-none print:shadow-none">

            {/* Outer Legal Frame */}
            <div className="absolute inset-3 border-2 border-slate-900 pointer-events-none rounded-xl" />

            <div className="space-y-4">

              {/* TEMPLATE HEADER: Auto-Populated Fields */}
              <div className="border-b-2 border-slate-900 pb-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-950">
                  <span>PROJECT REF. NO: <strong className="text-blue-950 font-extrabold">{projectRefNo || 'UNLINKED (Select Project)'}</strong></span>
                  <span>SOLICITATION NO: <strong className="text-blue-950 font-extrabold">{solicitationNumber || 'N/A'}</strong></span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-950">
                  <span>NAME OF PROJECT: <strong className="text-blue-950 font-extrabold">{projectTitle || 'UNLINKED (Select Project)'}</strong></span>
                  <span>DATE & TIME OF SUBMISSION: <strong className="text-slate-950 font-extrabold">{formatDateTimeDisplay(dateTimeSubmitted)}</strong></span>
                </div>
                <div className="text-xs font-mono text-slate-800">
                  <span>PROCURING ENTITY: <strong className="text-slate-950">{procuringEntity || 'UNLINKED'}</strong></span>
                </div>

                <div className="text-center pt-1 space-y-0.5">
                  <h2 className="text-base font-black text-slate-950 uppercase tracking-wide">
                    STATEMENT OF ALL ONGOING GOVERNMENT & PRIVATE CONTRACTS
                  </h2>
                  <p className="text-[10px] font-mono text-slate-600">
                    INCLUDING CONTRACTS AWARDED BUT NOT YET STARTED (LEGAL LANDSCAPE STANDARD)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-mono pt-1.5 border-t border-slate-300">
                  <div>
                    <span className="font-bold text-slate-950">BUSINESS NAME:</span>{' '}
                    <strong className="text-blue-950 uppercase">{tenant?.companyName || 'Not Set (Register Company in Profile)'}</strong>
                  </div>
                  <div>
                    <span className="font-bold text-slate-950">BUSINESS ADDRESS:</span>{' '}
                    <span>{tenant?.address || 'Not Set'}</span>
                  </div>
                </div>
              </div>

              {/* CONTRACT ENTRY LANDSCAPE TABLES */}
              <div className="space-y-4 text-xs font-sans">

                {/* GOVERNMENT CONTRACTS TABLE */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between border-b border-slate-400 pb-1">
                    <h4 className="font-black text-blue-950 text-xs uppercase font-mono flex items-center gap-2">
                      <span>1. Government Contracts</span>
                      <span className="text-[10px] font-mono bg-blue-100 text-blue-950 px-2 py-0.5 rounded font-bold">
                        {isNoOngoing ? 'NONE' : `${govContracts.length} Rows`}
                      </span>
                    </h4>
                    {!isNoOngoing && (
                      <button
                        onClick={() => openFormEditor(undefined, 'Government')}
                        className="text-[11px] font-bold text-blue-900 hover:underline flex items-center gap-1 print:hidden no-export font-mono"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Fill Out New Form</span>
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto border border-slate-400 rounded-lg">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-slate-100 text-slate-950 font-mono text-[9px] uppercase border-b border-slate-400">
                        <tr>
                          <th className="p-1.5 border-r border-slate-300 w-8 text-center">#</th>
                          <th className="p-1.5 border-r border-slate-300 min-w-[160px]">Project Name & Owner</th>
                          <th className="p-1.5 border-r border-slate-300 min-w-[130px]">Owner Address & Tel</th>
                          <th className="p-1.5 border-r border-slate-300">Nature of Work</th>
                          <th className="p-1.5 border-r border-slate-300 min-w-[110px]">Value at Award & Completion</th>
                          <th className="p-1.5 border-r border-slate-300 min-w-[110px]">Dates & Duration</th>
                          <th className="p-1.5 border-r border-slate-300 w-24 text-center">Accomplishment %</th>
                          <th className="p-1.5 border-r border-slate-300 w-24 text-center proof-column">Proof PDF</th>
                          <th className="p-1.5 text-right actions-column w-20">Contract Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300 font-sans">
                        {isNoOngoing ? (
                          <tr>
                            <td colSpan={9} className="p-4 text-center text-slate-950 font-mono font-bold uppercase tracking-wider bg-slate-50">
                              NO ONGOING GOVERNMENT CONTRACTS (INCLUDING CONTRACTS AWARDED BUT NOT YET STARTED)
                            </td>
                          </tr>
                        ) : govContracts.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-3 text-center text-slate-500 font-mono italic">
                              No Government contracts added. Click "Fill Out Government Contract Form" above.
                            </td>
                          </tr>
                        ) : (
                          govContracts.map((row, idx) => (
                            <tr key={row.id} className="hover:bg-slate-50">
                              <td className="p-1.5 border-r border-slate-300 font-mono font-bold text-center">{idx + 1}</td>
                              <td className="p-1.5 border-r border-slate-300">
                                <div className="font-bold text-slate-950 leading-tight">{row.projectName || 'Untitled Project'}</div>
                                <div className="text-[10px] text-slate-600 font-medium mt-0.5">{row.ownerName}</div>
                              </td>
                              <td className="p-1.5 border-r border-slate-300 text-[10px] text-slate-700">
                                <div>{row.ownerAddress}</div>
                                <div className="font-mono text-slate-500">{row.ownerTelephone}</div>
                              </td>
                              <td className="p-1.5 border-r border-slate-300 text-[10px]">
                                <div className="font-medium text-slate-900">{row.natureOfWork}</div>
                                <div className="text-slate-500 italic">{row.bidderRole}</div>
                              </td>
                              <td className="p-1.5 border-r border-slate-300 font-mono text-[10px]">
                                <div className="font-bold text-emerald-800">{row.amountAward || '₱0.00'}</div>
                                <div className="text-slate-600">{row.amountCompletion || '₱0.00'}</div>
                              </td>
                              <td className="p-1.5 border-r border-slate-300 font-mono">
                                <div className="font-bold text-black text-[11px]" style={{ color: '#000000', fontWeight: 'bold' }}>{row.duration || 'N/A'}</div>
                                <div className="text-[10px] font-bold text-black mt-0.5 leading-tight" style={{ color: '#000000' }}>
                                  <span className="block font-bold" style={{ color: '#000000' }}>Award: {row.dateAwarded || 'N/A'}</span>
                                  <span className="block font-bold" style={{ color: '#000000' }}>Comp: {row.dateCompletion || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="p-1.5 border-r border-slate-300 text-center font-mono text-[10px]">
                                <div>Plan: <span className="font-semibold">{row.accomplishmentPlanned}%</span></div>
                                <div>Act: <span className="font-bold text-blue-900">{row.accomplishmentActual}%</span></div>
                              </td>
                              <td className="p-1.5 border-r border-slate-300 text-center font-mono text-[9px] proof-column">
                                {row.pdfFile ? (
                                  <span className="text-emerald-950 font-bold block truncate max-w-[90px]" style={{ color: '#000000', fontWeight: 'bold' }} title={row.pdfFile.fileName}>
                                    <Paperclip className="w-3 h-3 inline text-emerald-700 mr-0.5" />
                                    {row.pdfFile.fileName}
                                  </span>
                                ) : (
                                  <label className="px-1 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-blue-900 border border-slate-300 cursor-pointer block print:hidden no-export-btn">
                                    Attach PDF
                                    <input type="file" accept=".pdf" onChange={(e) => handleRowPdfUpload(row.id, e.target.files?.[0])} className="hidden" />
                                  </label>
                                )}
                              </td>
                              <td className="p-1.5 text-right actions-column font-mono text-[9px]">
                                <div className="flex items-center justify-end gap-1 print:hidden no-export-btn">
                                  <button onClick={() => openFormEditor(row)} className="p-1 text-blue-900 hover:bg-blue-50 rounded" title="Edit Form">
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => removeRow(row.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <span className="font-bold text-black block" style={{ color: '#000000', fontWeight: 'bold' }}>{row.bidderRole || 'Contractor'}</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PRIVATE CONTRACTS TABLE */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between border-b border-slate-400 pb-1">
                    <h4 className="font-black text-purple-950 text-xs uppercase font-mono flex items-center gap-2">
                      <span>2. Private Contracts</span>
                      <span className="text-[10px] font-mono bg-purple-100 text-purple-950 px-2 py-0.5 rounded font-bold">
                        {isNoOngoing ? 'NONE' : `${privContracts.length} Rows`}
                      </span>
                    </h4>
                    {!isNoOngoing && (
                      <button
                        onClick={() => openFormEditor(undefined, 'Private')}
                        className="text-[11px] font-bold text-purple-900 hover:underline flex items-center gap-1 print:hidden no-export font-mono"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Fill Out New Form</span>
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto border border-slate-400 rounded-lg">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-slate-100 text-slate-950 font-mono text-[9px] uppercase border-b border-slate-400">
                        <tr>
                          <th className="p-1.5 border-r border-slate-300 w-8 text-center">#</th>
                          <th className="p-1.5 border-r border-slate-300 min-w-[160px]">Project Name & Owner</th>
                          <th className="p-1.5 border-r border-slate-300 min-w-[130px]">Owner Address & Tel</th>
                          <th className="p-1.5 border-r border-slate-300">Nature of Work</th>
                          <th className="p-1.5 border-r border-slate-300 min-w-[110px]">Value at Award & Completion</th>
                          <th className="p-1.5 border-r border-slate-300 min-w-[110px]">Dates & Duration</th>
                          <th className="p-1.5 border-r border-slate-300 w-24 text-center">Accomplishment %</th>
                          <th className="p-1.5 border-r border-slate-300 w-24 text-center proof-column">Proof PDF</th>
                          <th className="p-1.5 text-right actions-column w-20">Contract Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300 font-sans">
                        {isNoOngoing ? (
                          <tr>
                            <td colSpan={9} className="p-4 text-center text-slate-950 font-mono font-bold uppercase tracking-wider bg-slate-50">
                              NO ONGOING PRIVATE CONTRACTS
                            </td>
                          </tr>
                        ) : privContracts.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-3 text-center text-slate-500 font-mono italic">
                              No Private contracts added. Click "Fill Out Private Contract Form" above.
                            </td>
                          </tr>
                        ) : (
                          privContracts.map((row, idx) => (
                            <tr key={row.id} className="hover:bg-slate-50">
                              <td className="p-1.5 border-r border-slate-300 font-mono font-bold text-center">{idx + 1}</td>
                              <td className="p-1.5 border-r border-slate-300">
                                <div className="font-bold text-slate-950 leading-tight">{row.projectName || 'Untitled Project'}</div>
                                <div className="text-[10px] text-slate-600 font-medium mt-0.5">{row.ownerName}</div>
                              </td>
                              <td className="p-1.5 border-r border-slate-300 text-[10px] text-slate-700">
                                <div>{row.ownerAddress}</div>
                                <div className="font-mono text-slate-500">{row.ownerTelephone}</div>
                              </td>
                              <td className="p-1.5 border-r border-slate-300 text-[10px]">
                                <div className="font-medium text-slate-900">{row.natureOfWork}</div>
                                <div className="text-slate-500 italic">{row.bidderRole}</div>
                              </td>
                              <td className="p-1.5 border-r border-slate-300 font-mono text-[10px]">
                                <div className="font-bold text-emerald-800">{row.amountAward || '₱0.00'}</div>
                                <div className="text-slate-600">{row.amountCompletion || '₱0.00'}</div>
                              </td>
                              <td className="p-1.5 border-r border-slate-300 font-mono">
                                <div className="font-bold text-black text-[11px]" style={{ color: '#000000', fontWeight: 'bold' }}>{row.duration || 'N/A'}</div>
                                <div className="text-[10px] font-bold text-black mt-0.5 leading-tight" style={{ color: '#000000' }}>
                                  <span className="block font-bold" style={{ color: '#000000' }}>Award: {row.dateAwarded || 'N/A'}</span>
                                  <span className="block font-bold" style={{ color: '#000000' }}>Comp: {row.dateCompletion || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="p-1.5 border-r border-slate-300 text-center font-mono text-[10px]">
                                <div>Plan: <span className="font-semibold">{row.accomplishmentPlanned}%</span></div>
                                <div>Act: <span className="font-bold text-blue-900">{row.accomplishmentActual}%</span></div>
                              </td>
                              <td className="p-1.5 border-r border-slate-300 text-center font-mono text-[9px] proof-column">
                                {row.pdfFile ? (
                                  <span className="text-emerald-950 font-bold block truncate max-w-[90px]" style={{ color: '#000000', fontWeight: 'bold' }} title={row.pdfFile.fileName}>
                                    <Paperclip className="w-3 h-3 inline text-emerald-700 mr-0.5" />
                                    {row.pdfFile.fileName}
                                  </span>
                                ) : (
                                  <label className="px-1 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-purple-900 border border-slate-300 cursor-pointer block print:hidden no-export-btn">
                                    Attach PDF
                                    <input type="file" accept=".pdf" onChange={(e) => handleRowPdfUpload(row.id, e.target.files?.[0])} className="hidden" />
                                  </label>
                                )}
                              </td>
                              <td className="p-1.5 text-right actions-column font-mono text-[9px]">
                                <div className="flex items-center justify-end gap-1 print:hidden no-export-btn">
                                  <button onClick={() => openFormEditor(row)} className="p-1 text-purple-900 hover:bg-purple-50 rounded" title="Edit Form">
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => removeRow(row.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <span className="font-bold text-black block" style={{ color: '#000000', fontWeight: 'bold' }}>{row.bidderRole || 'Contractor'}</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* FOOTER SECTION: Static Note, Signatory & Date & Time */}
              <div className="border-t-2 border-slate-900 pt-3 space-y-3 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-300 text-[10px] text-slate-800 font-medium">
                  <strong>This Statement Must be Supported With:</strong> 1. Contract 2. CPES Rating Sheets And / or Certificate of Completion 3. Certificate of Acceptance
                </div>

                <div className="flex items-end justify-between gap-6 pt-1">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 block uppercase">Submitted By:</span>
                    <p className="font-bold text-slate-950">{tenant?.companyName || 'Not Set (Register Company in Profile)'}</p>
                  </div>

                  <div className="text-right space-y-0.5 min-w-[240px]">
                    <div className="border-b-2 border-slate-950 pb-0.5 font-bold text-slate-950 text-sm">
                      {tenant?.authorizedSignatory?.name || 'Authorized Signatory'}
                    </div>
                    <p className="text-[11px] text-slate-700 font-semibold">
                      {tenant?.authorizedSignatory?.title || 'Company Representative'}
                    </p>
                    <div className="flex items-center justify-end gap-1 text-xs text-black pt-1 font-mono" style={{ color: '#000000', fontWeight: 'bold' }}>
                      <span className="font-bold flex items-center gap-1"><Clock className="w-3 h-3 inline text-slate-800" /> Date & Time:</span>
                      <span className="font-extrabold text-black" style={{ color: '#000000', fontWeight: '900' }}>
                        {formatDateTimeDisplay(dateTimeSubmitted)}
                      </span>
                      <input
                        type="datetime-local"
                        value={dateTimeSubmitted}
                        onChange={(e) => setDateTimeSubmitted(e.target.value)}
                        className="bg-transparent border-0 text-[10px] font-bold text-slate-950 print:hidden no-export-btn ml-1 cursor-pointer opacity-80"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/95 sticky bottom-0 z-10 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Legal Landscape (13" × 8.5") GPPB Format</span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium">
              Cancel
            </button>
            <button
              onClick={handleSaveDraft}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save & Mark Item (b) Completed</span>
            </button>
          </div>
        </div>

      </div>

      {/* STRUCTURED FORM EDITOR POP-UP MODAL */}
      {editingRow && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-scaleIn my-auto flex flex-col max-h-[92vh]">

            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                Fill Out Ongoing Contract Entry Form — Item (b)
              </h3>
              <button onClick={() => setEditingRow(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveEditingRow} className="p-6 overflow-y-auto space-y-5 text-xs flex-1">

              {/* Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Contract Category <span className="text-red-400">*</span></label>
                  <select
                    value={editingRow.type}
                    onChange={(e) => setEditingRow({ ...editingRow, type: e.target.value as 'Government' | 'Private' })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-semibold focus:outline-none focus:border-blue-500"
                  >
                    <option value="Government">Government Ongoing Contract</option>
                    <option value="Private">Private Ongoing Contract</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Project Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={editingRow.projectName}
                    onChange={(e) => setEditingRow({ ...editingRow, projectName: e.target.value })}
                    placeholder="e.g. Infrastructure Project"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Owner Details */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-3">
                <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  Owner / Client Information
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Owner Name <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={editingRow.ownerName}
                      onChange={(e) => setEditingRow({ ...editingRow, ownerName: e.target.value })}
                      placeholder="e.g. Department of Public Works"
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Owner Address <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={editingRow.ownerAddress}
                      onChange={(e) => setEditingRow({ ...editingRow, ownerAddress: e.target.value })}
                      placeholder="City / Province"
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Owner Telephone <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={editingRow.ownerTelephone}
                      onChange={(e) => setEditingRow({ ...editingRow, ownerTelephone: e.target.value })}
                      placeholder="+63 2 8924 0000"
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Nature of Work */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nature of Work <span className="text-red-400">*</span></label>
                  <textarea
                    rows={2}
                    value={editingRow.natureOfWork}
                    onChange={(e) => setEditingRow({ ...editingRow, natureOfWork: e.target.value })}
                    placeholder="General Construction & Engineering"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Bidder's Role & Description <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={editingRow.bidderRole}
                    onChange={(e) => setEditingRow({ ...editingRow, bidderRole: e.target.value })}
                    placeholder="e.g. Prime Contractor"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Values & Duration */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-3">
                <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Contract Value & Duration
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Amount at Award (₱) <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={editingRow.amountAward}
                      onChange={(e) => setEditingRow({ ...editingRow, amountAward: e.target.value })}
                      onBlur={() => setEditingRow({ ...editingRow, amountAward: formatPhpCurrency(editingRow.amountAward) })}
                      placeholder="₱0.00"
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold text-emerald-400 focus:border-emerald-400"
                    />
                    <span className="text-[10px] text-emerald-400/80 font-mono mt-0.5 block">
                      Formatted: {formatPhpCurrency(editingRow.amountAward)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Amount at Completion (₱) <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={editingRow.amountCompletion}
                      onChange={(e) => setEditingRow({ ...editingRow, amountCompletion: e.target.value })}
                      onBlur={() => setEditingRow({ ...editingRow, amountCompletion: formatPhpCurrency(editingRow.amountCompletion) })}
                      placeholder="₱0.00"
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold text-blue-400 focus:border-blue-400"
                    />
                    <span className="text-[10px] text-blue-400/80 font-mono mt-0.5 block">
                      Formatted: {formatPhpCurrency(editingRow.amountCompletion)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Contract Duration <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={editingRow.duration}
                      onChange={(e) => setEditingRow({ ...editingRow, duration: e.target.value })}
                      placeholder="180 calendar days"
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Milestone Dates & Accomplishment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-3">
                  <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    Contract Milestone Dates
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-0.5">Date Awarded *</label>
                      <input type="date" value={editingRow.dateAwarded} onChange={(e) => setEditingRow({ ...editingRow, dateAwarded: e.target.value })} required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white" />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-0.5">Date Started *</label>
                      <input type="date" value={editingRow.dateStarted} onChange={(e) => setEditingRow({ ...editingRow, dateStarted: e.target.value })} required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white" />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-0.5">Estimated Completion Date *</label>
                      <input type="date" value={editingRow.dateCompletion} onChange={(e) => setEditingRow({ ...editingRow, dateCompletion: e.target.value })} required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white" />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-3">
                  <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Accomplishment % & Supporting PDF Attachment
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-0.5">Planned % *</label>
                      <input type="number" min={0} max={100} value={editingRow.accomplishmentPlanned} onChange={(e) => setEditingRow({ ...editingRow, accomplishmentPlanned: Number(e.target.value) })} required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-center font-bold" />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-0.5">Actual % *</label>
                      <input type="number" min={0} max={100} value={editingRow.accomplishmentActual} onChange={(e) => setEditingRow({ ...editingRow, accomplishmentActual: Number(e.target.value) })} required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-center font-bold text-emerald-400" />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <label className="block text-slate-400 text-[11px] mb-1 font-mono font-semibold">Supporting PDF File (Notice of Award / Contract / CPES)</label>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-center">
                      {editingRow.pdfFile ? (
                        <div className="flex items-center justify-between text-xs text-emerald-400 font-mono font-bold">
                          <span className="truncate max-w-[180px]">{editingRow.pdfFile.fileName}</span>
                          <span className="text-[10px] text-slate-500 font-normal">({(editingRow.pdfFile.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB)</span>
                        </div>
                      ) : (
                        <label className="cursor-pointer text-xs font-semibold text-blue-400 hover:underline inline-flex items-center gap-1">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>Attach Supporting PDF Document</span>
                          <input type="file" accept=".pdf" onChange={(e) => handleRowPdfUpload(editingRow.id, e.target.files?.[0])} className="hidden" />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow"
                >
                  Save Ongoing Contract Entry
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

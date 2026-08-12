import React, { useState, useEffect } from 'react';
import { Tenant } from '../../../types';
import { generateAndDownloadThreeLayerPdf } from '../../../utils/pdfExportEngine';
import { PDFDocument } from 'pdf-lib';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import DocumentQrCode from '../../common/DocumentQrCode';
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

export interface SlccContractRow {
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

interface StatementSlccModalProps {
  tenant: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
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

export const StatementSlccModal: React.FC<StatementSlccModalProps> = ({
  tenant,
  activeProjectRefNo = '',
  activeProjectTitle = '',
  activeProcuringEntity = '',
  onSaveAndComplete,
  onClose
}) => {
  const [isNoSlcc, setIsNoSlcc] = useState(false);
  const [isNoPrivateSlcc, setIsNoPrivateSlcc] = useState(false);
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
    const list = getOpportunityProjects(tenant?.id);
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
    } else if (list.length === 0) {
      setSelectedOppId('');
      setProjectRefNo('');
      setSolicitationNumber('');
      setProjectTitle('');
      setProcuringEntity('');
    }
  }, [tenant?.id]);

  // Form Editor Modal state for editing or creating an SLCC contract row
  const [editingRow, setEditingRow] = useState<SlccContractRow | null>(null);

  // CLEAN SLATE: Initial state has zero dummy contracts (Project-scoped)
  const [contracts, setContracts] = useState<SlccContractRow[]>([]);

  // STRICT PROJECT ISOLATION: Load contracts strictly scoped to current projectRefNo & tenantId
  useEffect(() => {
    if (!projectRefNo || !tenant?.id) {
      setContracts([]);
      return;
    }
    const storageKey = `bidocs_slcc_${tenant.id}_${projectRefNo}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setContracts(parsed);
          return;
        }
      } catch (e) {}
    }
    setContracts([]);
  }, [tenant?.id, projectRefNo]);

  const updateAndSaveContracts = (updater: (prev: SlccContractRow[]) => SlccContractRow[]) => {
    setContracts(prev => {
      const nextContracts = updater(prev);
      if (projectRefNo && tenant?.id) {
        const storageKey = `bidocs_slcc_${tenant.id}_${projectRefNo}`;
        localStorage.setItem(storageKey, JSON.stringify(nextContracts));
      }
      return nextContracts;
    });
  };

  const openFormEditor = (existingRow?: SlccContractRow, defaultType: 'Government' | 'Private' = 'Government') => {
    if (existingRow) {
      setEditingRow({ ...existingRow });
    } else {
      setEditingRow({
        id: `slcc-${Date.now()}-${Math.random()}`,
        type: defaultType,
        projectName: '',
        ownerName: '',
        ownerAddress: '',
        ownerTelephone: '',
        natureOfWork: '',
        bidderRole: 'Sole Prime Contractor',
        amountAward: '',
        amountCompletion: '',
        duration: '',
        dateAwarded: todayStr,
        dateStarted: todayStr,
        dateCompletion: todayStr,
        accomplishmentPlanned: 100,
        accomplishmentActual: 100
      });
    }
  };

  const saveEditingRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;

    const formattedRow: SlccContractRow = {
      ...editingRow,
      amountAward: editingRow.amountAward ? formatPhpCurrency(editingRow.amountAward) : '₱0.00',
      amountCompletion: editingRow.amountCompletion ? formatPhpCurrency(editingRow.amountCompletion) : '₱0.00'
    };

    updateAndSaveContracts(prev => {
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
    updateAndSaveContracts(prev => prev.filter(c => c.id !== id));
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

      // 3. Append all uploaded supporting PDF documents attached to SLCC contract rows
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
      console.error('[PDFMerge] Error generating merged SLCC PDF package:', e);
      return undefined;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    const projRef = projectRefNo || 'UNLINKED_PROJECT';
    const docName = 'Statement_of_Single_Largest_Completed_Contract_SLCC';
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
      const templateElems = document.querySelectorAll('.single-page-paper');
      if (templateElems.length > 0) {
        const elemArray = Array.from(templateElems) as HTMLElement[];
        await generateAndDownloadThreeLayerPdf(null, elemArray, undefined, fileName);
      } else {
        const templateElem = document.querySelector('.single-page-paper') as HTMLElement;
        await generateAndDownloadThreeLayerPdf(null, templateElem, undefined, fileName);
      }
    }
  };

  const handleSaveDraft = async () => {
    try {
      const mergedDataUrl = await generateMergedPackageDataUrl();
      onSaveAndComplete(
        mergedDataUrl,
        'Statement of Single Largest Completed Contract (SLCC)',
        projectRefNo,
        projectTitle
      );
    } catch (e) {
      onSaveAndComplete(
        undefined,
        'Statement of Single Largest Completed Contract (SLCC)',
        projectRefNo,
        projectTitle
      );
    }
  };

  const govContracts = contracts.filter(c => c.type === 'Government');
  const privContracts = contracts.filter(c => c.type === 'Private');

  // Format date for display (e.g. "2026-08-30T14:00" -> "August 30, 2026" - DATE ONLY)
  const formatDateDisplay = (dtStr: string) => {
    if (!dtStr) return 'N/A';
    const cleanDate = dtStr.split('T')[0];
    if (!cleanDate) return 'N/A';
    try {
      const parts = cleanDate.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }
      }
    } catch (e) {
      // fallback
    }
    return cleanDate;
  };

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

      {/* LANDSCAPE PRINT STYLESHEET OVERRIDE */}
      <style>{`
        @media print {
          @page {
            size: 13in 8.5in;
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
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>GPPB Legal Template — Item (c) Statement of Single Largest Completed Contract (SLCC)</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Statement of Single Largest Completed Contract similar to the contract to be bid within the last 5 years.
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
              <span>Print Legal Landscape</span>
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
                Project Information (Read-Only / Auto-Filled from Opportunity Finder)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Values below are pulled from the selected project and locked for consistency.</span>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 text-xs pt-1 border-t border-slate-800/80">
              {[
                { label: '1. Philgeps Ref No.', value: projectRefNo || 'Not selected' },
                { label: '2. Solicitation No.', value: solicitationNumber || 'N/A' },
                { label: '3. Name of Project', value: projectTitle || 'Not selected' },
                { label: '4. Procuring Entity', value: procuringEntity || 'Not selected' },
                { label: '5. Date & Time of Submission', value: dateTimeSubmitted ? formatDateTimeDisplay(dateTimeSubmitted) : 'N/A' }
              ].map(item => (
                <div key={item.label} className="bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-2">
                  <div className="block text-slate-400 font-mono text-[10px] mb-1">{item.label}</div>
                  <div className="text-white font-mono font-bold text-[11px] break-words [overflow-wrap:anywhere]">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Toolbar: "No SLCC" Toggle & Add Contract Buttons */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden no-export">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsNoSlcc(!isNoSlcc)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold font-mono transition flex items-center gap-2 shadow-lg ${isNoSlcc
                  ? 'bg-amber-600 text-white border border-amber-400'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                  }`}
              >
                {isNoSlcc ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                <span>"No SLCC" Declaration</span>
              </button>

              <button
                type="button"
                onClick={() => setIsNoPrivateSlcc(!isNoPrivateSlcc)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold font-mono transition flex items-center gap-2 shadow-lg ${isNoPrivateSlcc
                  ? 'bg-purple-700 text-white border border-purple-400'
                  : 'bg-slate-800 text-purple-300 hover:text-white border border-slate-700'
                  }`}
              >
                {isNoPrivateSlcc ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                <span>"No Private SLCC" Declaration</span>
              </button>
            </div>

            {!isNoSlcc && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openFormEditor(undefined, 'Government')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition flex items-center gap-1.5 shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>Fill Out Government SLCC Form</span>
                </button>
                {!isNoPrivateSlcc && (
                  <button
                    type="button"
                    onClick={() => openFormEditor(undefined, 'Private')}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition flex items-center gap-1.5 shadow-lg"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Fill Out Private SLCC Form</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* GPPB LEGAL PAPER CONTAINER (Legal 13" x 8.5" LANDSCAPE Printable Layout — EXPANDABLE MULTI-ENTRY FIT) */}
          <div className="single-page-paper bg-white text-slate-900 font-legal p-6 sm:p-8 border-2 border-slate-900 rounded-2xl shadow-2xl space-y-4 max-w-[1150px] h-auto mx-auto text-left relative flex flex-col justify-between print:m-0 print:border-none print:shadow-none">

            {/* Outer Legal Frame */}
            <div className="absolute inset-3 border-2 border-slate-900 pointer-events-none rounded-xl" />

            <div className="space-y-4">

              {/* TEMPLATE HEADER: Auto-Populated Fields */}
              <div className="border-b-2 border-slate-900 pb-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-950">
                  <span>Philgeps Ref No.: <strong className="text-blue-950 font-extrabold">{projectRefNo || 'UNLINKED (Select Project)'}</strong></span>
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
                    STATEMENT OF SINGLE LARGEST COMPLETED CONTRACT (SLCC)
                  </h2>
                  <p className="text-[10px] font-mono text-slate-600">
                    SIMILAR TO THE CONTRACT TO BE BID WITHIN THE LAST 5 YEARS (LEGAL LANDSCAPE STANDARD)
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
                      <span>1. Government Completed Contracts</span>
                      <span className="text-[10px] font-mono bg-blue-100 text-blue-950 px-2 py-0.5 rounded font-bold">
                        {isNoSlcc ? 'NONE' : `${govContracts.length} Rows`}
                      </span>
                    </h4>
                    {!isNoSlcc && (
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
                    <table className="w-full text-left text-[11px] border-collapse table-fixed">
                      <thead className="bg-slate-100 text-slate-950 font-mono text-[9px] uppercase border-b border-slate-400">
                        <tr>
                          <th className="p-1.5 border-r border-slate-300 w-[3%] text-center">#</th>
                          <th className="p-1.5 border-r border-slate-300 w-[22%]">Project Name & Owner</th>
                          <th className="p-1.5 border-r border-slate-300 w-[18%]">Owner Address & Tel</th>
                          <th className="p-1.5 border-r border-slate-300 w-[15%]">Nature of Work</th>
                          <th className="p-1.5 border-r border-slate-300 w-[16%]">
                            <div className="font-bold">VALUE AT AWARD, COMPLETION & DURATION</div>
                            <div className="text-[8px] font-normal text-slate-600">a. Award / b. Completion / c. Duration</div>
                          </th>
                          <th className="p-1.5 border-r border-slate-300 w-[13%]">
                            <div className="font-bold">DATES</div>
                            <div className="text-[8px] font-normal text-slate-600">a. Started / b. Awarded / c. Completion</div>
                          </th>
                          <th className="p-1.5 border-r border-slate-300 w-[8%] text-center">Accomplishment %</th>
                          <th className="p-1.5 text-right actions-column w-[5%]">Contract Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300 font-sans">
                        {isNoSlcc ? (
                          <tr>
                            <td colSpan={8} className="p-4 text-center text-slate-950 font-mono font-bold uppercase tracking-wider bg-slate-50">
                              NO COMPLETED GOVERNMENT CONTRACTS IN THE LAST 5 YEARS
                            </td>
                          </tr>
                        ) : govContracts.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-3 text-center text-slate-500 font-mono italic">
                              No Government SLCC contracts added. Click "Fill Out Government SLCC Form" above.
                            </td>
                          </tr>
                        ) : (
                          govContracts.map((row, idx) => (
                            <tr key={row.id} className="hover:bg-slate-50">
                              <td className="p-1.5 border-r border-slate-300 font-mono font-bold text-center align-top">{idx + 1}</td>
                              <td className="p-1.5 border-r border-slate-300 align-top break-words [overflow-wrap:anywhere]">
                                <div className="font-bold text-slate-950 leading-tight break-words [overflow-wrap:anywhere]">{row.projectName || 'Untitled Project'}</div>
                                <div className="text-[10px] text-slate-600 font-medium mt-0.5 break-words [overflow-wrap:anywhere]">{row.ownerName}</div>
                              </td>
                              <td className="p-1.5 border-r border-slate-300 text-[10px] text-slate-700 align-top break-words [overflow-wrap:anywhere]">
                                <div className="leading-tight break-words [overflow-wrap:anywhere]">{row.ownerAddress}</div>
                                <div className="font-mono text-slate-500 mt-0.5 leading-tight break-words [overflow-wrap:anywhere]">{row.ownerTelephone}</div>
                              </td>
                              <td className="p-1.5 border-r border-slate-300 text-[10px] align-top break-words [overflow-wrap:anywhere]">
                                <div className="font-medium text-slate-900 leading-tight break-words [overflow-wrap:anywhere]">{row.natureOfWork}</div>
                              </td>
                              <td className="p-1.5 border-r border-slate-300 font-mono text-[10px] space-y-0.5 align-top break-words [overflow-wrap:anywhere]">
                                <div className="font-bold text-emerald-800 break-words">a. {row.amountAward || '₱0.00'}</div>
                                <div className="text-slate-700 font-semibold break-words">b. {row.amountCompletion || '₱0.00'}</div>
                                <div className="font-bold text-slate-900 bg-slate-100 px-1 py-0.5 rounded text-[9.5px] break-words">c. {row.duration || 'N/A'}</div>
                              </td>
                              <td className="p-1.5 border-r border-slate-300 font-mono text-[10px] space-y-0.5 align-top break-words [overflow-wrap:anywhere]">
                                <div className="text-slate-800 font-medium break-words">a. {row.dateStarted || 'N/A'}</div>
                                <div className="text-slate-900 font-semibold break-words">b. {row.dateAwarded || 'N/A'}</div>
                                <div className="font-bold text-black break-words">c. {row.dateCompletion || 'N/A'}</div>
                              </td>
                              <td className="p-1.5 border-r border-slate-300 text-center font-mono text-[10px] align-top">
                                <div>Plan: <span className="font-semibold">{row.accomplishmentPlanned}%</span></div>
                                <div>Act: <span className="font-bold text-blue-900">{row.accomplishmentActual}%</span></div>
                              </td>
                              <td className="p-1.5 text-right actions-column font-mono text-[9.5px] align-top break-words [overflow-wrap:anywhere]">
                                <div className="flex items-center justify-end gap-1 print:hidden no-export-btn mb-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      openFormEditor(row);
                                    }}
                                    className="p-1 text-blue-900 hover:bg-blue-50 rounded"
                                    title="Edit Form"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      removeRow(row.id);
                                    }}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <span className="font-bold text-black block leading-tight break-words [overflow-wrap:anywhere]" style={{ color: '#000000', fontWeight: 'bold' }}>
                                  {row.bidderRole || 'Contractor'}
                                </span>
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
                      <span>2. Private Completed Contracts</span>
                      <span className="text-[10px] font-mono bg-purple-100 text-purple-950 px-2 py-0.5 rounded font-bold">
                        {isNoSlcc ? 'NONE' : `${privContracts.length} Rows`}
                      </span>
                    </h4>
                    {!isNoSlcc && (
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
                    <table className="w-full text-left text-[11px] border-collapse table-fixed">
                      <thead className="bg-slate-100 text-slate-950 font-mono text-[9px] uppercase border-b border-slate-400">
                        <tr>
                          <th className="p-1.5 border-r border-slate-300 w-[3%] text-center">#</th>
                          <th className="p-1.5 border-r border-slate-300 w-[22%]">Project Name & Owner</th>
                          <th className="p-1.5 border-r border-slate-300 w-[18%]">Owner Address & Tel</th>
                          <th className="p-1.5 border-r border-slate-300 w-[15%]">Nature of Work</th>
                          <th className="p-1.5 border-r border-slate-300 w-[16%]">
                            <div className="font-bold">VALUE AT AWARD, COMPLETION & DURATION</div>
                            <div className="text-[8px] font-normal text-slate-600">a. Award / b. Completion / c. Duration</div>
                          </th>
                          <th className="p-1.5 border-r border-slate-300 w-[13%]">
                            <div className="font-bold">DATES</div>
                            <div className="text-[8px] font-normal text-slate-600">a. Started / b. Awarded / c. Completion</div>
                          </th>
                          <th className="p-1.5 border-r border-slate-300 w-[8%] text-center">Accomplishment %</th>
                          <th className="p-1.5 text-right actions-column w-[5%]">Contract Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300 font-sans">
                        {(isNoSlcc || isNoPrivateSlcc) ? (
                          <tr>
                            <td colSpan={8} className="p-4 text-center text-slate-950 font-mono font-bold uppercase tracking-wider bg-slate-50">
                              NO COMPLETED PRIVATE CONTRACTS IN THE LAST 5 YEARS
                            </td>
                          </tr>
                        ) : privContracts.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-3 text-center text-slate-500 font-mono italic">
                              No Private SLCC contracts added. Click "Fill Out Private SLCC Form" above.
                            </td>
                          </tr>
                        ) : (
                          privContracts.map((row, idx) => (
                            <tr key={row.id} className="hover:bg-slate-50">
                              <td className="p-1.5 border-r border-slate-300 font-mono font-bold text-center align-top">{idx + 1}</td>
                              <td className="p-1.5 border-r border-slate-300 align-top break-words [overflow-wrap:anywhere]">
                                <div className="font-bold text-slate-950 leading-tight break-words [overflow-wrap:anywhere]">{row.projectName || 'Untitled Project'}</div>
                                <div className="text-[10px] text-slate-600 font-medium mt-0.5 break-words [overflow-wrap:anywhere]">{row.ownerName}</div>
                              </td>
                              <td className="p-1.5 border-r border-slate-300 text-[10px] text-slate-700 align-top break-words [overflow-wrap:anywhere]">
                                <div className="leading-tight break-words [overflow-wrap:anywhere]">{row.ownerAddress}</div>
                                <div className="font-mono text-slate-500 mt-0.5 leading-tight break-words [overflow-wrap:anywhere]">{row.ownerTelephone}</div>
                              </td>
                              <td className="p-1.5 border-r border-slate-300 text-[10px] align-top break-words [overflow-wrap:anywhere]">
                                <div className="font-medium text-slate-900 leading-tight break-words [overflow-wrap:anywhere]">{row.natureOfWork}</div>
                              </td>
                              <td className="p-1.5 border-r border-slate-300 font-mono text-[10px] space-y-0.5 align-top break-words [overflow-wrap:anywhere]">
                                <div className="font-bold text-emerald-800 break-words">a. {row.amountAward || '₱0.00'}</div>
                                <div className="text-slate-700 font-semibold break-words">b. {row.amountCompletion || '₱0.00'}</div>
                                <div className="font-bold text-slate-900 bg-slate-100 px-1 py-0.5 rounded text-[9.5px] break-words">c. {row.duration || 'N/A'}</div>
                              </td>
                              <td className="p-1.5 border-r border-slate-300 font-mono text-[10px] space-y-0.5 align-top break-words [overflow-wrap:anywhere]">
                                <div className="text-slate-800 font-medium break-words">a. {row.dateStarted || 'N/A'}</div>
                                <div className="text-slate-900 font-semibold break-words">b. {row.dateAwarded || 'N/A'}</div>
                                <div className="font-bold text-black break-words">c. {row.dateCompletion || 'N/A'}</div>
                              </td>
                              <td className="p-1.5 border-r border-slate-300 text-center font-mono text-[10px] align-top">
                                <div>Plan: <span className="font-semibold">{row.accomplishmentPlanned}%</span></div>
                                <div>Act: <span className="font-bold text-blue-900">{row.accomplishmentActual}%</span></div>
                              </td>
                              <td className="p-1.5 text-right actions-column font-mono text-[9.5px] align-top break-words [overflow-wrap:anywhere]">
                                <div className="flex items-center justify-end gap-1 print:hidden no-export-btn mb-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      openFormEditor(row);
                                    }}
                                    className="p-1 text-purple-900 hover:bg-purple-50 rounded"
                                    title="Edit Form"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      removeRow(row.id);
                                    }}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <span className="font-bold text-black block leading-tight break-words [overflow-wrap:anywhere]" style={{ color: '#000000', fontWeight: 'bold' }}>
                                  {row.bidderRole || 'Contractor'}
                                </span>
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
                  <strong>This Statement Must be Supported With:</strong> 1. Contract / Purchase Order 2. Certificate of Completion or Certificate of Acceptance 3. Official Receipt / Sales Invoice
                </div>

                <div className="flex items-end justify-between gap-6 pt-1">
                  {/* Arrow 3: Verification QR Code (Company & Project Details) */}
                  <div className="flex items-center gap-2.5">
                    <DocumentQrCode
                      details={{
                        companyName: tenant?.companyName || 'Bidding Entity Corporate Name',
                        documentName: 'Statement of Single Largest Completed Contract (SLCC Item c)',
                        documentNumber: `SLCC-${projectRefNo || '2026-901283'}`,
                        projectTitle: projectTitle,
                        projectRefNo: projectRefNo,
                        procuringEntity: procuringEntity,
                        dateTimeSubmitted: formatDateDisplay(dateTimeSubmitted),
                        documentCategory: 'Financial Eligibility',
                        generatedBy: tenant?.companyName
                      }}
                      size={70}
                      showCaption={false}
                    />
                    <div className="text-[9px] font-mono text-slate-700 leading-tight">
                      <span className="font-black text-slate-950 block uppercase">Document Verification QR</span>
                      <span className="block text-slate-600">Ref: {projectRefNo || 'UNLINKED'}</span>
                      <span className="block font-bold text-emerald-800">✓ Official Bidding Record</span>
                    </div>
                  </div>

                  {/* Arrow 1 & 2: Moved "Submitted By" into Signature Block */}
                  <div className="text-right space-y-1 min-w-[260px]">
                    <div className="space-y-0.5 border-b border-slate-300 pb-1 mb-1 text-right">
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">SUBMITTED BY:</span>
                      <p className="font-bold text-slate-950 text-xs uppercase">{tenant?.companyName || 'Not Set (Register Company in Profile)'}</p>
                    </div>

                    <div className="border-b-2 border-slate-950 pb-0.5 font-bold text-slate-950 text-sm">
                      {tenant?.authorizedSignatory?.name || 'Authorized Signatory'}
                    </div>
                    <p className="text-[11px] text-slate-700 font-semibold">
                      {tenant?.authorizedSignatory?.title || 'Company Representative'}
                    </p>
                    <div className="flex items-center justify-end gap-1 text-xs text-black pt-0.5 font-mono" style={{ color: '#000000', fontWeight: 'bold' }}>
                      <span className="font-bold">Date:</span>
                      <span className="font-extrabold text-black" style={{ color: '#000000', fontWeight: '900' }}>
                        {formatDateDisplay(dateTimeSubmitted)}
                      </span>
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
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 transition shadow flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save & Mark Item (c) Completed</span>
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
                <Edit3 className="w-4 h-4 text-purple-400" />
                Fill Out SLCC Contract Entry Form — Item (c)
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-semibold focus:outline-none focus:border-purple-500"
                  >
                    <option value="Government">Government SLCC Contract</option>
                    <option value="Private">Private SLCC Contract</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Project Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={editingRow.projectName}
                    onChange={(e) => setEditingRow({ ...editingRow, projectName: e.target.value })}
                    placeholder="e.g. Single Largest Completed Project"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-semibold focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Owner Details */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-3">
                <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-purple-400" />
                  Owner / Client Information
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Owner Name <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={editingRow.ownerName}
                      onChange={(e) => setEditingRow({ ...editingRow, ownerName: e.target.value })}
                      placeholder="e.g. Procuring Agency / Client"
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

              {/* Nature of Work & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nature of Work <span className="text-red-400">*</span></label>
                  <textarea
                    rows={2}
                    value={editingRow.natureOfWork}
                    onChange={(e) => setEditingRow({ ...editingRow, natureOfWork: e.target.value })}
                    placeholder="General Construction & Engineering Work"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Bidder's Role & Description <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={editingRow.bidderRole}
                    onChange={(e) => setEditingRow({ ...editingRow, bidderRole: e.target.value })}
                    placeholder="e.g. Main Contractor"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-500"
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
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold text-purple-400 focus:border-purple-400"
                    />
                    <span className="text-[10px] text-purple-400/80 font-mono mt-0.5 block">
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
                    <Calendar className="w-4 h-4 text-purple-400" />
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
                      <label className="block text-slate-400 text-[11px] mb-0.5">Completion Date *</label>
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
                    <label className="block text-slate-400 text-[11px] mb-1 font-mono font-semibold">Supporting SLCC PDF File (Certificate of Completion / Contract)</label>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-center">
                      {editingRow.pdfFile ? (
                        <div className="flex items-center justify-between text-xs text-emerald-400 font-mono font-bold">
                          <span className="truncate max-w-[180px]">{editingRow.pdfFile.fileName}</span>
                          <span className="text-[10px] text-slate-500 font-normal">({(editingRow.pdfFile.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB)</span>
                        </div>
                      ) : (
                        <label className="cursor-pointer text-xs font-semibold text-purple-400 hover:underline inline-flex items-center gap-1">
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
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 transition shadow"
                >
                  Save SLCC Contract Entry
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

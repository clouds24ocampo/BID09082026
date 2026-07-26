import React, { useState, useEffect } from 'react';
import { Tenant } from '../../../types';
import { generateAndDownloadThreeLayerPdf } from '../../../utils/pdfExportEngine';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import html2canvas from 'html2canvas';
import DocumentQrCode from '../../common/DocumentQrCode';
import {
  X,
  Printer,
  Download,
  FileSignature,
  Plus,
  Trash2,
  Building2,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
  Type
} from 'lucide-react';

export interface ScheduleItem {
  id: string;
  description: string;
  quantity: string;
  unitAmount: string;
  total: string;
  delivered: string;
}

export interface SectionViScheduleOfRequirementsProps {
  item?: { id: string; code: string; name: string };
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose?: () => void;
}

const getNowDateTimeString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${mins}`;
};

const formatDateTimeDisplay = (raw: string): string => {
  if (!raw) return 'N/A';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return raw;
  }
};

const computeTotalAmount = (unitStr: string, qtyStr: string): string => {
  if (!unitStr || !qtyStr) return '';
  const unitNum = parseFloat(unitStr.replace(/[^0-9.]/g, ''));
  const qtyNum = parseFloat(qtyStr.replace(/[^0-9.]/g, ''));
  if (isNaN(unitNum) || isNaN(qtyNum)) return '';
  const total = unitNum * qtyNum;
  return `PHP ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const defaultDelivery = '30 Calendar Days upon receipt of NTP';
const DEFAULT_SECTION_VI_ITEMS: ScheduleItem[] = [
  {
    id: '1',
    description: 'Enterprise Server Rack Systems with High-Availability Redundancy, Dual Hot-Swappable 1200W Power Supplies, Rail Kits, and 5-Year OEM On-Site Warranty Support',
    quantity: '5 units',
    unitAmount: 'PHP 500,000.00',
    total: 'PHP 2,500,000.00',
    delivered: defaultDelivery
  },
  {
    id: '2',
    description: 'Managed Layer 3 Core Network Switches (48-Port PoE+ 740W, 4x 10G SFP+ Uplinks, Stacking Module, Redundant Power Module, Advanced L3 Routing License)',
    quantity: '10 units',
    unitAmount: 'PHP 120,000.00',
    total: 'PHP 1,200,000.00',
    delivered: defaultDelivery
  },
  {
    id: '3',
    description: 'Uninterruptible Power Supply (UPS) 10kVA Online Double Conversion Tower/Rack Mountable with Extended Battery Module (EBM) and Network Management Card',
    quantity: '4 units',
    unitAmount: 'PHP 200,000.00',
    total: 'PHP 800,000.00',
    delivered: defaultDelivery
  }
];

export const SectionViScheduleOfRequirements: React.FC<SectionViScheduleOfRequirementsProps> = ({
  item = { id: 'sec-6', code: 'SEC-VI', name: 'Section VI. Schedule of Requirements' },
  tenant,
  activeProjectRefNo = 'PRJ-2026-901283',
  activeProjectTitle = 'Infrastructure & IT Systems Modernization Project',
  activeProcuringEntity = 'Department of Information & Communications Technology',
  onSaveAndComplete,
  onClose
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // PDF Export rendering mode state
  const [isExporting, setIsExporting] = useState(false);

  // Adjustable Table Font Size State ('fine' = 9pt, 'xs' = 10pt, 'sm' = 11pt)
  const [fontSizeMode, setFontSizeMode] = useState<'fine' | 'xs' | 'sm'>('xs');

  // Opportunity Finder Project List State
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  // Document & Project Metadata State
  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo);
  const [solicitationNumber, setSolicitationNumber] = useState('SOL-2026-001');
  const [projectTitle, setProjectTitle] = useState(activeProjectTitle);
  const [procuringEntity, setProcuringEntity] = useState(activeProcuringEntity);
  const [dateTimeSubmitted, setDateTimeSubmitted] = useState<string>(getNowDateTimeString());

  // Company Details State
  const [companyName] = useState(tenant?.companyName || 'Bidding Entity Corporate Name');
  const [companyAddress] = useState(tenant?.address || 'Metro Manila, Philippines');
  const [signatoryName] = useState(tenant?.authorizedSignatory?.name || 'Authorized Signatory Name');
  const [signatoryTitle] = useState(tenant?.authorizedSignatory?.title || 'President / General Manager');

  // Items State (Shared & Mirrored with Framework Agreement Page 1)
  const [items, setItems] = useState<ScheduleItem[]>(DEFAULT_SECTION_VI_ITEMS);

  // Load real saved opportunity projects from Opportunity Finder
  useEffect(() => {
    const list = getOpportunityProjects(tenant?.id);
    setOppProjects(list);
    if (list.length > 0 && !selectedOppId) {
      const first = list[0];
      setSelectedOppId(first.id);
      setProjectRefNo(first.refNo);
      setSolicitationNumber(first.solicitationNo || 'SOL-2026-001');
      setProjectTitle(first.title);
      setProcuringEntity(first.procuringEntity);
      if (first.dateTimeSubmitted) {
        setDateTimeSubmitted(first.dateTimeSubmitted);
      }
    }
  }, [tenant?.id]);

  // Load shared Section VI data for current project
  useEffect(() => {
    if (!projectRefNo) return;
    const storageKey = `bidocs_sec_vi_${tenant?.id || 'default'}_${projectRefNo}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
        }
      } catch (e) {}
    }
  }, [projectRefNo, tenant?.id]);

  const saveSharedItems = (newItems: ScheduleItem[]) => {
    setItems(newItems);
    if (projectRefNo) {
      const storageKey = `bidocs_sec_vi_${tenant?.id || 'default'}_${projectRefNo}`;
      localStorage.setItem(storageKey, JSON.stringify(newItems));
    }
  };

  const handleDeliveredChange = (index: number, newDelivered: string) => {
    let updated: ScheduleItem[];
    if (index === 0) {
      updated = items.map((it) => ({ ...it, delivered: newDelivered }));
    } else {
      updated = items.map((it, idx) => (idx === index ? { ...it, delivered: newDelivered } : it));
    }
    saveSharedItems(updated);
  };

  const handleFieldChange = (index: number, field: keyof ScheduleItem, value: string) => {
    if (field === 'delivered') {
      handleDeliveredChange(index, value);
    } else {
      const updated = items.map((it, idx) => {
        if (idx !== index) return it;
        const itemUpdated = { ...it, [field]: value };
        if (field === 'unitAmount' || field === 'quantity') {
          const computed = computeTotalAmount(itemUpdated.unitAmount, itemUpdated.quantity);
          if (computed) {
            itemUpdated.total = computed;
          }
        }
        return itemUpdated;
      });
      saveSharedItems(updated);
    }
  };

  const handleAddItem = () => {
    const item1Delivered = items.length > 0 ? items[0].delivered : defaultDelivery;
    const newItem: ScheduleItem = {
      id: Date.now().toString(),
      description: '',
      quantity: '',
      unitAmount: '',
      total: '',
      delivered: item1Delivered
    };
    saveSharedItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    saveSharedItems(items.filter((_, idx) => idx !== index));
  };

  const handleSyncAllWithItem1 = () => {
    if (items.length === 0) return;
    const masterValue = items[0].delivered;
    saveSharedItems(items.map((it) => ({ ...it, delivered: masterValue })));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    await new Promise((r) => setTimeout(r, 150));
    try {
      const fileName = `${projectRefNo}_Section_VI_Schedule_of_Requirements_${todayStr}.pdf`;
      const templateElem = document.getElementById('section-vi-paper') as HTMLElement;
      if (templateElem) {
        await generateAndDownloadThreeLayerPdf(null, templateElem, undefined, fileName);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    const cleanProj = (projectRefNo || 'PRJ').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${cleanProj}_Section_VI_Schedule_of_Requirements_${todayStr}.csv`;

    let csvContent = '\uFEFF';
    csvContent += `"SECTION VI. SCHEDULE OF REQUIREMENTS"\n`;
    csvContent += `"Company Name:","${companyName.replace(/"/g, '""')}"\n`;
    csvContent += `"Company Address:","${companyAddress.replace(/"/g, '""')}"\n`;
    csvContent += `"Project Ref. No.:","${projectRefNo.replace(/"/g, '""')}"\n`;
    csvContent += `"Solicitation No.:","${solicitationNumber.replace(/"/g, '""')}"\n`;
    csvContent += `"Project Title:","${projectTitle.replace(/"/g, '""')}"\n`;
    csvContent += `"Procuring Entity:","${procuringEntity.replace(/"/g, '""')}"\n`;
    csvContent += `"Submission Date & Time:","${formatDateTimeDisplay(dateTimeSubmitted)}"\n\n`;

    csvContent += `"Item Number","Description","Quantity","Unit Amount","Total","Delivered, Weeks/Months"\n`;

    items.forEach((it, idx) => {
      const itemNum = `"${idx + 1}"`;
      const desc = `"${(it.description || '').replace(/"/g, '""')}"`;
      const qty = `"${(it.quantity || '').replace(/"/g, '""')}"`;
      const unitAmt = `"${(it.unitAmount || '').replace(/"/g, '""')}"`;
      const tot = `"${(it.total || computeTotalAmount(it.unitAmount, it.quantity) || '').replace(/"/g, '""')}"`;
      const del = `"${(it.delivered || '').replace(/"/g, '""')}"`;
      csvContent += `${itemNum},${desc},${qty},${unitAmt},${tot},${del}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = async () => {
    setIsExporting(true);
    await new Promise((r) => setTimeout(r, 150));
    try {
      const templateElem = document.getElementById('section-vi-paper') as HTMLElement;
      let dataUrl: string | undefined = undefined;
      if (templateElem) {
        const canvas = await html2canvas(templateElem, {
          scale: 2.5,
          useCORS: true,
          backgroundColor: '#ffffff',
          ignoreElements: (element: Element) => {
            return (
              element.classList.contains('print:hidden') ||
              element.classList.contains('no-export') ||
              element.classList.contains('proof-column') ||
              element.classList.contains('actions-column') ||
              element.tagName === 'BUTTON'
            );
          }
        });
        dataUrl = canvas.toDataURL('image/png');
      }
      if (onSaveAndComplete) {
        onSaveAndComplete(dataUrl, item.name, projectRefNo, projectTitle);
      }
    } catch {
      if (onSaveAndComplete) {
        onSaveAndComplete(undefined, item.name, projectRefNo, projectTitle);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const getTableFontSizeClass = () => {
    if (fontSizeMode === 'fine') return 'text-[10px] leading-snug';
    if (fontSizeMode === 'xs') return 'text-xs leading-normal';
    return 'text-sm leading-relaxed';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
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
            padding: 0.3in !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
          }
          .export-text {
            display: block !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col print:border-none print:shadow-none print:max-h-none print:bg-white">
        
        {/* Top Controls Header Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 shrink-0 print:hidden no-export">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Section VI. Schedule of Requirements</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                  100% Mirrored with Framework Agreement
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-xl">
                Automatic Item Numbering • Unit Amount & Total Auto-calc • Master Delivery Sync
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 transition shadow flex items-center gap-1.5 border border-emerald-500/40"
              title="Export table data directly to Microsoft Excel CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export to Excel</span>
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition shadow flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Exporting PDF...' : 'Export to PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Legal Landscape</span>
            </button>
            {onClose && (
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950 space-y-6 print:p-0 print:bg-white">

          {/* Interactive Screen Controls (Hidden in Print & PDF) */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 print:hidden no-export">
            
            {/* Target Opportunity / Project Dropdown Selector & Quick Row Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="block text-slate-200 font-mono text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-blue-300">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    Select Target Project from Opportunity Finder:
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold font-mono">⚡ Auto-populates Document Header & Mirrors Framework Agreement</span>
                </label>
                <select
                  value={selectedOppId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedOppId(val);
                    const found = oppProjects.find((p) => p.id === val || p.refNo === val);
                    if (found) {
                      setProjectRefNo(found.refNo);
                      setSolicitationNumber(found.solicitationNo || 'SOL-2026-001');
                      setProjectTitle(found.title);
                      setProcuringEntity(found.procuringEntity);
                      if (found.dateTimeSubmitted) {
                        setDateTimeSubmitted(found.dateTimeSubmitted);
                      }
                    }
                  }}
                  className="w-full bg-slate-950 border border-blue-500/60 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs font-bold focus:outline-none focus:border-blue-400 shadow-inner cursor-pointer hover:border-blue-400"
                >
                  {oppProjects.length === 0 ? (
                    <option value="">-- No Saved Projects in Opportunity Finder --</option>
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

              <div className="flex flex-wrap items-center gap-2 pt-4 sm:pt-0 shrink-0">
                {/* Font Size Selector for Long Specifications */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                  <span className="text-slate-400 px-1.5 flex items-center gap-1 text-[11px]">
                    <Type className="w-3.5 h-3.5 text-blue-400" /> Font Size:
                  </span>
                  <button
                    type="button"
                    onClick={() => setFontSizeMode('fine')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                      fontSizeMode === 'fine' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Ultra-compact font (9pt)"
                  >
                    9pt
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSizeMode('xs')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                      fontSizeMode === 'xs' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Compact font (10pt)"
                  >
                    10pt
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSizeMode('sm')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                      fontSizeMode === 'sm' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Standard font (11pt)"
                  >
                    11pt
                  </button>
                </div>

                <button
                  onClick={handleAddItem}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Row Item</span>
                </button>
                <button
                  onClick={handleSyncAllWithItem1}
                  title="Propagate Item 1 Delivery Schedule to all items"
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Sync Item 1 Delivery to All</span>
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-purple-400" />
              <span>
                <strong>100% Identical & Mirrored Sync:</strong> Entering Quantity and Unit Amount automatically calculates Total cost. Automatically synced with Page 1 of Framework Agreement List.
              </span>
            </div>
          </div>

          {/* OFFICIAL PRINTABLE PAPER DOCUMENT SHEET (Legal 13" x 8.5" LANDSCAPE Standard - Unique ID target) */}
          <div id="section-vi-paper" className="single-page-paper print-document-sheet bg-white text-black p-6 sm:p-10 border-2 border-slate-900 shadow-2xl mx-auto rounded-md min-h-[680px] w-full max-w-[1150px] flex flex-col justify-between font-serif">
            
            <div>
              {/* COMPANY & PROJECT HEADER BLOCK */}
              <div className="border-b-2 border-black pb-3 mb-5 space-y-2 font-serif">
                {/* Company Header */}
                <div className="text-center pb-2 border-b border-slate-300">
                  <h2 className="text-lg sm:text-xl font-bold text-black uppercase tracking-wide font-serif">{companyName}</h2>
                  <p className="text-xs text-slate-700 font-serif mt-0.5">{companyAddress}</p>
                </div>

                {/* Bidding Project Info Grid (Legal Landscape) */}
                <div className="space-y-1.5 text-xs font-serif text-black pt-1">
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <span className="font-bold">PROJECT REF. NO: </span>
                      <span className="font-mono font-semibold text-blue-950">{projectRefNo || 'N/A'}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold">SOLICITATION NO: </span>
                      <span className="font-mono font-semibold text-blue-950">{solicitationNumber || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <span className="font-bold">NAME OF PROJECT: </span>
                      <span className="font-semibold text-black">{projectTitle || 'N/A'}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="font-bold">DATE & TIME OF SUBMISSION: </span>
                      <span className="font-mono font-semibold text-blue-950">{formatDateTimeDisplay(dateTimeSubmitted)}</span>
                    </div>
                  </div>
                  <div>
                    <span className="font-bold">PROCURING ENTITY: </span>
                    <span className="text-slate-900">{procuringEntity || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Document Header Title */}
              <div className="text-center mb-4">
                <h1 className="text-xl sm:text-2xl font-bold font-serif italic text-black tracking-tight mb-2">
                  Section VI. Schedule of Requirements
                </h1>
                <p className="text-xs sm:text-sm text-black font-serif leading-relaxed text-left">
                  The delivery schedule expressed as weeks/months stipulates hereafter a delivery date which is the date of delivery to the project site.
                </p>
              </div>

              {/* Requirements Grid Table (Borders 2px solid black, 6 Columns: 6%, 44%, 9%, 13%, 14%, 14%) */}
              <table className={`w-full border-collapse border-2 border-black text-black table-fixed ${getTableFontSizeClass()}`}>
                <thead>
                  <tr className="border-b-2 border-black bg-slate-50 font-serif">
                    <th className="border border-black px-1.5 py-2 text-center font-bold w-[6%]">
                      Item<br />Number
                    </th>
                    <th className="border border-black px-3 py-2 text-center font-bold w-[44%]">
                      Description
                    </th>
                    <th className="border border-black px-1.5 py-2 text-center font-bold w-[9%]">
                      Quantity
                    </th>
                    <th className="border border-black px-2 py-2 text-center font-bold w-[13%]">
                      Unit Amount
                    </th>
                    <th className="border border-black px-2 py-2 text-center font-bold w-[14%]">
                      Total
                    </th>
                    <th className="border border-black px-2.5 py-2 text-center font-bold w-[14%]">
                      Delivered,<br />Weeks/Months
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Render Populated Items Dynamically */}
                  {items.map((rowItem, idx) => (
                    <tr key={rowItem.id} className="border-b border-black hover:bg-slate-50/50 transition-colors">
                      {/* Automatic Item Number */}
                      <td className="border border-black px-1.5 py-2 text-center font-serif font-medium align-top">
                        <div className="flex flex-col items-center justify-between h-full">
                          <span className="block pt-0.5 font-bold">{idx + 1}</span>
                          {!isExporting && items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              title="Remove item"
                              className="text-red-500 hover:text-red-700 mt-2 print:hidden no-export p-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Description Cell */}
                      <td className="border border-black px-3 py-2 font-serif align-top break-words">
                        {!isExporting && (
                          <textarea
                            rows={3}
                            value={rowItem.description}
                            onChange={(e) => handleFieldChange(idx, 'description', e.target.value)}
                            placeholder="Enter detailed technical specification..."
                            className={`w-full bg-transparent resize-y outline-none font-serif text-black placeholder-slate-400 focus:bg-amber-50/40 print:hidden p-1 rounded border border-slate-200 hover:border-slate-400 ${getTableFontSizeClass()}`}
                          />
                        )}
                        <div className={`${!isExporting ? 'hidden print:block' : 'block'} font-serif text-black pt-0.5 whitespace-pre-wrap font-normal break-words ${getTableFontSizeClass()}`}>
                          {rowItem.description || ''}
                        </div>
                      </td>

                      {/* Quantity Cell */}
                      <td className="border border-black px-1.5 py-2 font-serif text-center align-top">
                        {!isExporting && (
                          <input
                            type="text"
                            value={rowItem.quantity}
                            onChange={(e) => handleFieldChange(idx, 'quantity', e.target.value)}
                            placeholder="Qty"
                            className={`w-full bg-transparent text-center outline-none font-serif text-black placeholder-slate-400 focus:bg-amber-50/40 print:hidden p-1 rounded border border-slate-200 hover:border-slate-400 ${getTableFontSizeClass()}`}
                          />
                        )}
                        <div className={`${!isExporting ? 'hidden print:block' : 'block'} font-serif text-black text-center pt-0.5 font-normal break-words ${getTableFontSizeClass()}`}>
                          {rowItem.quantity || ''}
                        </div>
                      </td>

                      {/* Unit Amount Cell */}
                      <td className="border border-black px-2 py-2 font-serif text-center align-top break-words">
                        {!isExporting && (
                          <input
                            type="text"
                            value={rowItem.unitAmount}
                            onChange={(e) => handleFieldChange(idx, 'unitAmount', e.target.value)}
                            placeholder="Unit Amount"
                            className={`w-full bg-transparent text-center outline-none font-serif text-black placeholder-slate-400 focus:bg-amber-50/40 print:hidden p-1 rounded border border-slate-200 hover:border-slate-400 ${getTableFontSizeClass()}`}
                          />
                        )}
                        <div className={`${!isExporting ? 'hidden print:block' : 'block'} font-serif text-black text-center pt-0.5 font-normal break-words ${getTableFontSizeClass()}`}>
                          {rowItem.unitAmount || ''}
                        </div>
                      </td>

                      {/* Total Cell (Quantity x Unit Amount Auto Computation) */}
                      <td className="border border-black px-2 py-2 font-serif text-center align-top break-words">
                        {!isExporting && (
                          <input
                            type="text"
                            value={computeTotalAmount(rowItem.unitAmount, rowItem.quantity) || rowItem.total}
                            onChange={(e) => handleFieldChange(idx, 'total', e.target.value)}
                            placeholder="Total Amount"
                            className={`w-full bg-transparent text-center outline-none font-serif text-black placeholder-slate-400 focus:bg-amber-50/40 print:hidden p-1 rounded border border-slate-200 hover:border-slate-400 font-semibold ${getTableFontSizeClass()}`}
                          />
                        )}
                        <div className={`${!isExporting ? 'hidden print:block' : 'block'} font-serif text-black text-center pt-0.5 font-semibold break-words ${getTableFontSizeClass()}`}>
                          {computeTotalAmount(rowItem.unitAmount, rowItem.quantity) || rowItem.total || ''}
                        </div>
                      </td>

                      {/* Delivered Weeks/Months Cell */}
                      <td className="border border-black px-2.5 py-2 font-serif text-center align-top break-words">
                        {!isExporting && (
                          <input
                            type="text"
                            value={rowItem.delivered}
                            onChange={(e) => handleFieldChange(idx, 'delivered', e.target.value)}
                            placeholder="e.g. 30 Days"
                            title={idx === 0 ? "Item 1 Delivery: Changing this updates all rows automatically" : "Delivery Weeks/Months"}
                            className={`w-full bg-transparent text-center outline-none font-serif text-black placeholder-slate-400 focus:bg-amber-50/40 print:hidden p-1 rounded border border-slate-200 hover:border-slate-400 ${
                              idx === 0 ? 'font-semibold text-blue-950' : ''
                            } ${getTableFontSizeClass()}`}
                          />
                        )}
                        <div className={`${!isExporting ? 'hidden print:block' : 'block'} font-serif text-black text-center pt-0.5 font-normal break-words ${getTableFontSizeClass()}`}>
                          {rowItem.delivered || ''}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Document Footer: Signatory Block & Verification QR */}
            <div className="mt-8 pt-4 border-t border-slate-300 flex items-end justify-between text-xs font-serif">
              <div>
                <p className="font-bold text-black uppercase">{companyName}</p>
                <div className="mt-8 border-b border-black w-64"></div>
                <p className="font-bold text-black mt-1 uppercase">{signatoryName}</p>
                <p className="text-slate-700">{signatoryTitle}</p>
              </div>

              <div className="text-right flex flex-col items-end">
                <DocumentQrCode
                  details={{
                    companyName: companyName,
                    documentName: 'Section VI. Schedule of Requirements',
                    documentNumber: `SEC-VI-${projectRefNo || '2026-901283'}`,
                    projectTitle: projectTitle,
                    projectRefNo: projectRefNo,
                    procuringEntity: procuringEntity,
                    dateTimeSubmitted: formatDateTimeDisplay(dateTimeSubmitted)
                  }}
                  size={95}
                  showCaption={false}
                />
                <span className="text-[9px] font-mono text-slate-600 uppercase mt-1">
                  VERIFIED GPPB DOC • {projectRefNo}
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* Bottom Modal Actions (Hidden in Print) */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900 shrink-0 print:hidden no-export">
          <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Class A Technical Exhibit — Legal Landscape Standard (13" × 8.5")</span>
          </div>

          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isExporting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition shadow-lg flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isExporting ? 'Saving PDF...' : 'Save & Complete Section VI'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SectionViScheduleOfRequirements;

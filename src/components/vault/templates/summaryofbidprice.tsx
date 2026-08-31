import React, { useState, useEffect, useMemo } from 'react';
import { Tenant } from '../../../types';
import { generateAndDownloadThreeLayerPdf, buildMergedThreeLayerPdfDataUrl } from '../../../utils/pdfExportEngine';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import DocumentQrCode from '../../common/DocumentQrCode';
import {
  X,
  Printer,
  Download,
  Building2,
  FileText,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

export interface SummaryBidPriceRow {
  id: string;
  itemNo: string;
  item: string;
  particularsDescription: string;
  totalAmount: number;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  isLumpSum?: boolean;
  lumpSumType?: 'LABOR' | 'LOGISTICS' | 'EQUIPMENT';
  isSplitContinuation?: boolean;
}

export interface SummaryOfBidPriceModalProps {
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose: () => void;
}

// Fallback Section VI Items if no custom items are found in storage
const DEFAULT_SECTION_VI_ITEMS = [
  {
    id: '1',
    description: 'Enterprise Server Rack Systems with High-Availability Redundancy, Dual Hot-Swappable 1200W Power Supplies, Rail Kits, and 5-Year OEM On-Site Warranty Support',
    unit: 'Unit',
    quantity: 5,
    unitPrice: 500000.00
  },
  {
    id: '2',
    description: 'Managed Layer 3 Core Network Switches (48-Port PoE+ 740W, 4x 10G SFP+ Uplinks, Stacking Module, Redundant Power Module, Advanced L3 Routing License)',
    unit: 'Unit',
    quantity: 10,
    unitPrice: 120000.00
  },
  {
    id: '3',
    description: 'Uninterruptible Power Supply (UPS) 10kVA Online Double Conversion Tower/Rack Mountable with Extended Battery Module (EBM) and Network Management Card',
    unit: 'Unit',
    quantity: 4,
    unitPrice: 200000.00
  }
];

export const SummaryOfBidPriceModal: React.FC<SummaryOfBidPriceModalProps> = ({
  tenant,
  activeProjectRefNo,
  activeProjectTitle,
  activeProcuringEntity,
  onSaveAndComplete,
  onClose
}) => {
  // Opportunity Projects Auto-Fill Integration
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  // Form Fields
  const [projectTitle, setProjectTitle] = useState(activeProjectTitle || 'Procurement of High-Capacity Network Switches & Firewall Security');
  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo || '2026-FIN-009');
  const [procuringEntity, setProcuringEntity] = useState(activeProcuringEntity || 'Department of Information and Communications Technology');
  
  // Signatory & Enterprise
  const [signatoryName, setSignatoryName] = useState(tenant?.authorizedSignatory?.name || '');
  const [companyName, setCompanyName] = useState(tenant?.companyName || '');
  const [dateSubmitted, setDateSubmitted] = useState('March 19, 2026');

  // Dynamic Summary Material Items
  const [items, setItems] = useState<SummaryBidPriceRow[]>([]);

  // Lump Sum State Synced from Form (L) Detailed Estimates
  const [laborLumpSum, setLaborLumpSum] = useState<number>(0);
  const [logisticsLumpSum, setLogisticsLumpSum] = useState<number>(0);
  const [equipmentLumpSum, setEquipmentLumpSum] = useState<number>(0);
  const [isSyncedFromDetailedEstimates, setIsSyncedFromDetailedEstimates] = useState<boolean>(false);
  const [includeLumpSumsInTable, setIncludeLumpSumsInTable] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);

  // Helper to parse numbers safely
  const parseNum = (val: number | string | undefined): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.-]+/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Helper to extract a clean item name from description
  const extractItemName = (desc: string, index: number): string => {
    const raw = (desc || '').trim();
    if (!raw) return `Item ${index + 1}`;
    
    // Look for delimiter before technical specs
    if (raw.includes(':')) {
      const p = raw.split(':')[0].trim();
      if (p.length >= 3 && p.length <= 80) return p;
    }
    if (raw.includes(' - ')) {
      const p = raw.split(' - ')[0].trim();
      if (p.length >= 3 && p.length <= 80) return p;
    }
    if (raw.includes('(')) {
      const p = raw.split('(')[0].trim();
      if (p.length >= 3 && p.length <= 80) return p;
    }
    if (raw.includes(',')) {
      const p = raw.split(',')[0].trim();
      if (p.length >= 3 && p.length <= 80) return p;
    }
    return raw;
  };

  // Helper to load Detailed Estimates (Form L) with fallback to Section VI
  const loadProjectData = (projectKey: string, candidateTitle?: string) => {
    if (!projectKey && !candidateTitle) return;
    
    const tenantId = tenant?.id || 'default';
    let savedDetEst: string | null = null;

    // 1. Direct exact key match
    if (projectKey) {
      savedDetEst = localStorage.getItem(`bidocs_detailed_estimates_${tenantId}_${projectKey}`);
    }

    // 2. Clean key match
    if (!savedDetEst && projectKey) {
      const cleanKey = projectKey.replace(/[^a-zA-Z0-9_-]/g, '_');
      savedDetEst = localStorage.getItem(`bidocs_detailed_estimates_${tenantId}_${cleanKey}`);
    }

    let loadedFromDetEst = false;

    if (savedDetEst) {
      try {
        const parsed = JSON.parse(savedDetEst);
        if (parsed) {
          const laborCost = parseNum(parsed.totalLaborCost);
          const logCost = parseNum(parsed.totalLogisticsCost);
          const eqCost = parseNum(parsed.totalEquipmentCost);

          setLaborLumpSum(laborCost);
          setLogisticsLumpSum(logCost);
          setEquipmentLumpSum(eqCost);

          if (Array.isArray(parsed.materials) && parsed.materials.length > 0) {
            const rows: SummaryBidPriceRow[] = parsed.materials.map((item: any, idx: number) => {
              const qty = parseNum(item.quantity) || 1;
              const unitPrice = parseNum(item.unitPrice) || 0;
              const lineTotal = qty * unitPrice;
              const unit = item.unit || 'Unit';
              const rawDesc = (item.description || '').trim();
              const itemName = extractItemName(rawDesc, idx);

              return {
                id: item.id || `sum-det-${idx + 1}`,
                itemNo: item.itemNo || `${idx + 1}`,
                item: itemName,
                particularsDescription: rawDesc,
                totalAmount: lineTotal,
                unit: unit,
                quantity: qty,
                unitPrice: unitPrice
              };
            });
            setItems(rows);
            loadedFromDetEst = true;
            setIsSyncedFromDetailedEstimates(true);
          }
        }
      } catch (e) {
        console.error('Error parsing detailed estimates for Summary of Bid Prices:', e);
      }
    }

    // 2. If not found in Detailed Estimates, fallback to Section VI Schedule of Requirements
    if (!loadedFromDetEst) {
      setIsSyncedFromDetailedEstimates(false);
      setLaborLumpSum(0);
      setLogisticsLumpSum(0);
      setEquipmentLumpSum(0);

      const candidateKeys = [
        `bidocs_sec_vi_${tenantId}_${projectKey}`,
        selectedOppId ? `bidocs_sec_vi_${tenantId}_${selectedOppId}` : '',
        projectRefNo ? `bidocs_sec_vi_${tenantId}_${projectRefNo}` : ''
      ].filter(Boolean);

      let secViItems: any[] = [];
      for (const key of candidateKeys) {
        const savedSecVi = localStorage.getItem(key);
        if (savedSecVi) {
          try {
            const parsed = JSON.parse(savedSecVi);
            if (Array.isArray(parsed) && parsed.length > 0) {
              secViItems = parsed;
              break;
            }
          } catch (e) {
            console.error('Error reading Section VI items for Summary of Bid Prices:', e);
          }
        }
      }

      const rows: SummaryBidPriceRow[] = secViItems.map((item: any, idx: number) => {
        const qty = parseNum(item.quantity) || 1;
        const unitPrice = parseNum(item.unitAmount || item.unitPrice || item.unitCost) || 0;
        const lineTotal = qty * unitPrice;
        const unit = item.unit || 'Unit';
        const rawDesc = (item.description || '').trim();
        const itemName = extractItemName(rawDesc, idx);

        return {
          id: `sum-sec6-${item.id || idx + 1}`,
          itemNo: `${idx + 1}`,
          item: itemName,
          particularsDescription: rawDesc,
          totalAmount: lineTotal,
          unit: unit,
          quantity: qty,
          unitPrice: unitPrice
        };
      });
      setItems(rows);
    }
  };

  useEffect(() => {
    const list = getOpportunityProjects(tenant?.id);
    setOppProjects(list);

    const activeKey = activeProjectRefNo || (list.length > 0 ? list[0].refNo : '');
    if (activeKey) {
      const match = list.find(p => p.refNo === activeKey);
      if (match) {
        setSelectedOppId(match.id);
        setProjectRefNo(match.refNo);
        setProjectTitle(match.title);
        setProcuringEntity(match.procuringEntity);
        if (match.dateTimeSubmitted) setDateSubmitted(match.dateTimeSubmitted);
        loadProjectData(match.refNo, match.title);
      } else {
        setProjectRefNo(activeKey);
        if (activeProjectTitle) setProjectTitle(activeProjectTitle);
        if (activeProcuringEntity) setProcuringEntity(activeProcuringEntity);
        loadProjectData(activeKey, activeProjectTitle);
      }
    } else if (list.length > 0) {
      const first = list[0];
      setSelectedOppId(first.id);
      setProjectRefNo(first.refNo);
      setProjectTitle(first.title);
      setProcuringEntity(first.procuringEntity);
      if (first.dateTimeSubmitted) setDateSubmitted(first.dateTimeSubmitted);
      loadProjectData(first.refNo, first.title);
    } else {
      loadProjectData('default');
    }
  }, [tenant?.id, activeProjectRefNo, activeProjectTitle, activeProcuringEntity]);

  useEffect(() => {
    if (tenant) {
      if (tenant.companyName) setCompanyName(tenant.companyName);
      if (tenant.authorizedSignatory?.name) setSignatoryName(tenant.authorizedSignatory.name);
    }
  }, [tenant]);

  const handleSelectOpportunity = (oppId: string) => {
    setSelectedOppId(oppId);
    const found = oppProjects.find(p => p.id === oppId || p.refNo === oppId);
    if (found) {
      setProjectRefNo(found.refNo);
      setProjectTitle(found.title);
      setProcuringEntity(found.procuringEntity);
      if (found.dateTimeSubmitted) setDateSubmitted(found.dateTimeSubmitted);
      loadProjectData(found.refNo, found.title);
    }
  };

  const handleReloadData = () => {
    const activeKey = projectRefNo || activeProjectRefNo || 'default';
    loadProjectData(activeKey, projectTitle);
  };

  // Generate complete display rows (Materials + Single Consolidated Lump Sum row)
  const getAllDisplaySummaryRows = (): SummaryBidPriceRow[] => {
    const displayRows: SummaryBidPriceRow[] = [...items];
    let nextNum = items.length + 1;

    const totalLumpSumsCost = (laborLumpSum || 0) + (logisticsLumpSum || 0) + (equipmentLumpSum || 0);

    if (includeLumpSumsInTable && totalLumpSumsCost > 0) {
      displayRows.push({
        id: 'row-sum-lumpsum-consolidated',
        itemNo: `LS-${nextNum++}`,
        item: 'Direct Labor, Logistics, Hauling & Equipment',
        particularsDescription: 'Consolidated Technical Personnel, Assembly, Logistics, Mobilization, Rigging & Machinery Utilization (From Form L Detailed Estimates)',
        totalAmount: totalLumpSumsCost,
        isLumpSum: true,
        lumpSumType: 'LABOR'
      });
    }

    return displayRows;
  };

  // Subtotals and Grand Total
  const materialsSubtotal = items.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  const totalLumpSums = (laborLumpSum || 0) + (logisticsLumpSum || 0) + (equipmentLumpSum || 0);
  const grandTotalAmount = materialsSubtotal + totalLumpSums;

  const fmtPeso = (val: number): string => {
    if (val === 0) return '-';
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Intelligent Multi-Page Pagination Chunking for 8.5" x 13" Portrait Legal Paper (Zero Empty Space & Auto Item Splitting)
  const pageChunks = useMemo(() => {
    const allRows = getAllDisplaySummaryRows();
    if (allRows.length === 0) return [[]];

    const getRowHeight = (itemText: string, partText: string) => {
      const pLen = (partText || '').length;
      const dLen = (itemText || '').length;
      const maxLen = Math.max(pLen, dLen);
      const lineCount = Math.max(1, Math.ceil(maxLen / 42));
      return 22 + (lineCount - 1) * 12;
    };

    const pages: SummaryBidPriceRow[][] = [];
    let currentChunk: SummaryBidPriceRow[] = [];
    let currentHeight = 0;
    let pageIdx = 0;

    for (let idx = 0; idx < allRows.length; idx++) {
      const row = allRows[idx];
      const rHeight = getRowHeight(row.item, row.particularsDescription);
      const isPage1 = pageIdx === 0;

      // Height budget for 13" Portrait Legal (1248px total height, printable ~1150px)
      // Page 1 has header (~130px) + thead (~50px), final page needs space for summary + signature (~220px)
      // Continuation pages have no thead (reclaimed 50px)
      const finalPageLimit = isPage1 ? 640 : 800;
      const continuationLimit = isPage1 ? 860 : 1020;

      let remainingHeight = 0;
      for (let r = idx; r < allRows.length; r++) {
        remainingHeight += getRowHeight(allRows[r].item, allRows[r].particularsDescription);
      }

      if (currentHeight + remainingHeight <= finalPageLimit) {
        currentChunk.push(row);
        currentHeight += rHeight;
        continue;
      }

      if (currentHeight + rHeight > continuationLimit && currentChunk.length > 0) {
        const remainingSpace = continuationLimit - currentHeight;
        const pDesc = row.particularsDescription || '';

        // If there is usable space on current page and particulars description is substantial, split across pages
        if (remainingSpace >= 50 && pDesc.length > 80) {
          const linesFit = Math.max(2, Math.floor((remainingSpace - 22) / 12));
          const charsFit = linesFit * 42;

          let splitIdx = pDesc.lastIndexOf(' ', charsFit);
          if (splitIdx < 40) splitIdx = charsFit;

          const part1Desc = pDesc.substring(0, splitIdx).trim();
          const part2Desc = pDesc.substring(splitIdx).trim();

          if (part1Desc.length > 25 && part2Desc.length > 15) {
            const part1Row: SummaryBidPriceRow = {
              ...row,
              id: `${row.id}-pt1`,
              particularsDescription: part1Desc
            };
            const part2Row: SummaryBidPriceRow = {
              ...row,
              id: `${row.id}-pt2`,
              itemNo: row.itemNo,
              item: `${row.item}`,
              particularsDescription: part2Desc,
              totalAmount: 0,
              isSplitContinuation: true
            };

            currentChunk.push(part1Row);
            pages.push(currentChunk);

            pageIdx++;
            currentChunk = [part2Row];
            currentHeight = getRowHeight(row.item, part2Desc);
            continue;
          }
        }

        pages.push(currentChunk);
        pageIdx++;
        currentChunk = [row];
        currentHeight = rHeight;
      } else {
        currentChunk.push(row);
        currentHeight += rHeight;
      }
    }

    if (currentChunk.length > 0) {
      pages.push(currentChunk);
    }

    return pages;
  }, [items, includeLumpSumsInTable, laborLumpSum, logisticsLumpSum, equipmentLumpSum]);

  const totalPagesCount = pageChunks.length;

  const handleExportPdf = async () => {
    setIsSaving(true);
    try {
      const fileName = `${projectRefNo || 'PROJECT'}_Financial_Envelope_Summary_Of_Bid_Prices.pdf`;
      const templateElems = document.querySelectorAll('.summarybid-paper');
      if (templateElems.length > 0) {
        const elemArray = Array.from(templateElems) as HTMLElement[];
        await generateAndDownloadThreeLayerPdf(null, elemArray, undefined, fileName);
      }
    } catch (err) {
      console.error('[SummaryBid] PDF Export Error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const fileName = `${projectRefNo || 'PROJECT'}_Financial_Envelope_Summary_Of_Bid_Prices.pdf`;
      const templateElems = document.querySelectorAll('.summarybid-paper');
      let dataUrl: string | undefined = undefined;
      if (templateElems.length > 0) {
        const elemArray = Array.from(templateElems) as HTMLElement[];
        dataUrl = await buildMergedThreeLayerPdfDataUrl(
          [{ title: 'Summary of Bid Prices', formElement: elemArray }],
          fileName
        );
      }
      if (onSaveAndComplete) {
        onSaveAndComplete(dataUrl, `Summary of Bid Prices - [${projectRefNo}]`, projectRefNo, projectTitle);
      }
      if (onClose) onClose();
    } catch (err) {
      console.error('[SummaryBid] Save Error:', err);
      if (onSaveAndComplete) {
        onSaveAndComplete(undefined, `Summary of Bid Prices - [${projectRefNo}]`, projectRefNo, projectTitle);
      }
      if (onClose) onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      
      {/* LEGAL PORTRAIT 8.5" x 13" PRINT STYLESHEET */}
      <style>{`
        @media print {
          @page {
            size: 8.5in 13in portrait;
            margin: 0mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .summarybid-paper {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0.5in !important;
            width: 8.5in !important;
            min-height: 13in !important;
            page-break-after: always !important;
          }
          .summarybid-paper:last-child {
            page-break-after: avoid !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col">
        
        {/* Top Header Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight flex items-center gap-2">
                <span>Summary of Bid Prices</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                  Statutory Financial Form
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Legal 8.5" × 13" Portrait
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold">
                  {totalPagesCount} {totalPagesCount === 1 ? 'Page' : 'Pages'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Statutory Summary Table of Bid Items, Particulars & Single Consolidated Lump Sum synced with Form L
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition border border-slate-700 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Legal 8.5"×13"</span>
            </button>

            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form & Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 space-y-6">

          {/* Form (L) Project Selector & Sync Status Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 no-print">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span>Detailed Estimates (Form L) Synchronization:</span>
                </label>
                {isSyncedFromDetailedEstimates ? (
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-purple-950/80 text-purple-300 border border-purple-700 font-bold flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                    100% Synced from Form (L)
                  </span>
                ) : (
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold flex items-center gap-1.5">
                    Section VI Schedule
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReloadData}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition shadow flex items-center gap-1.5"
                  title="Re-read Form (L) Detailed Estimates for active project"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>🔄 Re-Sync from Detailed Estimates</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="col-span-full">
                <label className="block text-slate-300 font-mono mb-1 font-bold">
                  Select Active Bidding Opportunity:
                </label>
                <select
                  value={selectedOppId}
                  onChange={(e) => handleSelectOpportunity(e.target.value)}
                  className="w-full bg-slate-950 border border-blue-500/60 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs font-bold focus:outline-none focus:border-blue-400 shadow-inner cursor-pointer"
                >
                  <option value="">-- Select Opportunity --</option>
                  {oppProjects.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.refNo}] {p.title} — {p.procuringEntity} ({p.abc})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1 font-bold">Project Reference No. <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={projectRefNo}
                  onChange={(e) => setProjectRefNo(e.target.value)}
                  placeholder="e.g. 2026-FIN-009"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1 font-bold">Project Title / Name of Project <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g. Supply and Delivery of IT Equipment"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1 font-bold">Procuring Entity</label>
                <input
                  type="text"
                  value={procuringEntity}
                  onChange={(e) => setProcuringEntity(e.target.value)}
                  placeholder="e.g. Department of Agriculture"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-semibold"
                />
              </div>

              <div className="col-span-3">
                <label className="block text-slate-400 font-mono mb-1 font-bold">Bidder Company Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. QUANTUM CLOUD CORPORATION"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold uppercase"
                />
              </div>
            </div>

            {/* Live Synced Financial Summary Card */}
            <div className="bg-slate-950 border border-purple-500/30 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-4">
                <span className="text-slate-400">Direct Materials: <strong className="text-blue-300">₱{fmtPeso(materialsSubtotal)}</strong> ({items.length} items)</span>
                <span className="text-slate-400">Consolidated Lump Sum (Labor, Logistics, Equipment): <strong className="text-purple-300">₱{fmtPeso(totalLumpSums)}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">Grand Total:</span>
                <span className="text-emerald-400 font-extrabold text-sm px-2.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/50">
                  ₱{fmtPeso(grandTotalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* MULTI-PAGE STATUTORY LEGAL PORTRAIT PAPER SHEETS (8.5" x 13") */}
          <div className="space-y-8 flex flex-col items-center">
            {pageChunks.map((chunk, pageIdx) => {
              const isFirstPage = pageIdx === 0;
              const isLastPage = pageIdx === totalPagesCount - 1;
              const currentPageNum = pageIdx + 1;

              return (
                <div
                  key={`summarybid-page-${pageIdx}`}
                  className="summarybid-paper single-page-paper print-document-sheet w-[8.5in] min-w-[8.5in] max-w-[8.5in] min-h-[13in] bg-white text-slate-950 p-[0.5in] shadow-2xl font-serif text-[8.5pt] leading-normal flex flex-col justify-between mx-auto border-2 border-black box-border shrink-0"
                >
                  <div className="space-y-2">
                    
                    {/* Header Title Row (Page 1 vs Continuation) */}
                    {isFirstPage ? (
                      <div className="border-b-2 border-black pb-1.5">
                        <div className="flex items-end justify-between">
                          <div>
                            <h1 className="text-base font-bold text-black font-serif tracking-wide uppercase">
                              Summary of Bid Prices
                            </h1>
                            <p className="text-[7.5pt] italic text-slate-800 leading-tight font-serif mt-0.5">
                              (All Prices Shall Be Submitted in Philippine Pesos and Shall Correspond Identically to the Price Schedule and Form L Detailed Estimates)
                            </p>
                          </div>
                          <div className="text-right text-[7.5pt] font-mono text-slate-800">
                            <span className="font-bold uppercase">{companyName || 'Quantum Cloud Corporation'}</span>
                          </div>
                        </div>

                        {/* Project Info Metadata Strip */}
                        <div className="mt-1.5 pt-1.5 border-t border-slate-300 grid grid-cols-3 gap-2 text-[7.5pt] font-serif text-black">
                          <div>
                            <span className="font-bold">Project: </span>
                            <span className="font-semibold text-slate-900 truncate">{projectTitle || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-bold">Ref No.: </span>
                            <span className="font-mono font-bold text-blue-950">{projectRefNo || 'N/A'}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold">Procuring Entity: </span>
                            <span className="text-slate-900">{procuringEntity || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border-b-2 border-black pb-1 flex items-center justify-between font-serif text-[8pt] text-black">
                        <div>
                          <span className="font-bold uppercase">Summary of Bid Prices (Continuation)</span>
                          <span className="text-slate-600 ml-2 font-mono text-[7.5pt]">— {projectRefNo || 'N/A'}</span>
                        </div>
                        <div className="text-right font-mono text-[7.5pt]">
                          <span className="font-bold">Page {currentPageNum} of {totalPagesCount}</span>
                        </div>
                      </div>
                    )}

                    {/* 4-Column Statutory Table Matrix (Portrait Colgroup) */}
                    <div className="w-full">
                      <table className="w-full border-collapse border-2 border-black text-[8pt] font-serif table-fixed">
                        <colgroup>
                          <col style={{ width: '6%' }} />
                          <col style={{ width: '26%' }} />
                          <col style={{ width: '48%' }} />
                          <col style={{ width: '20%' }} />
                        </colgroup>
                        {isFirstPage && (
                          <thead>
                            
                            {/* Numbered Row 1 */}
                            <tr className="bg-slate-100 border-b border-black text-center font-bold font-mono text-[7.5pt]">
                              <th className="border border-black p-0.5">1</th>
                              <th className="border border-black p-0.5">2</th>
                              <th className="border border-black p-0.5">3</th>
                              <th className="border border-black p-0.5">4</th>
                            </tr>

                            {/* Column Names Header Row 2 */}
                            <tr className="bg-slate-50 border-b-2 border-black text-center font-bold uppercase text-[7.5pt]">
                              <th className="border border-black p-1 align-middle">Item No.</th>
                              <th className="border border-black p-1 align-middle">Item / Description</th>
                              <th className="border border-black p-1 align-middle">Particulars & Quantities</th>
                              <th className="border border-black p-1 align-middle">Total Amount (Pesos)</th>
                            </tr>

                          </thead>
                        )}
                        <tbody>
                          
                          {/* Dynamic Item Rows for Current Page Chunk */}
                          {chunk.map((row) => {
                            const isLumpSum = !!row.isLumpSum;
                            const isSplitCont = !!row.isSplitContinuation;

                            return (
                              <tr key={row.id} className={`border-b border-black font-normal ${isLumpSum ? 'bg-purple-50/70 font-semibold' : ''} ${isSplitCont ? 'bg-slate-50/70 italic' : ''}`}>
                                <td className="border border-black px-1.5 py-1 text-center font-bold font-mono align-top text-[8pt]">
                                  {isSplitCont ? `${row.itemNo} (cont.)` : row.itemNo}
                                </td>
                                <td className="border border-black px-2 py-1 font-bold text-black align-top break-words leading-tight text-[8pt]">
                                  {row.item}
                                </td>
                                <td className="border border-black px-2 py-1 leading-tight text-slate-900 align-top break-words text-[8pt]">
                                  <div>{row.particularsDescription}</div>
                                  {!isLumpSum && !isSplitCont && row.quantity && row.unitPrice ? (
                                    <div className="text-[7.5pt] font-mono text-slate-600 font-semibold mt-0.5">
                                      Qty: {row.quantity} {row.unit || 'Unit'} @ ₱{fmtPeso(row.unitPrice)}
                                    </div>
                                  ) : null}
                                </td>
                                <td className="border border-black px-2 py-1 text-right font-mono font-bold text-black align-top whitespace-nowrap text-[8pt]">
                                  {isSplitCont ? (
                                    <span className="text-slate-400 font-mono italic text-[7.5pt]">[Item {row.itemNo} Cont.]</span>
                                  ) : (
                                    `₱ ${fmtPeso(row.totalAmount)}`
                                  )}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Render Subtotals, Consolidated Lump Sum, and Grand Total ONLY on Final Page */}
                          {isLastPage && (
                            <>
                              {/* 1. Materials Subtotal Row */}
                              <tr className="border-t-2 border-black bg-slate-50 font-bold text-[8pt]">
                                <td colSpan={3} className="border border-black px-2 py-1 text-right uppercase tracking-wider text-black">
                                  SUBTOTAL - DIRECT MATERIALS & SUPPLY:
                                </td>
                                <td className="border border-black px-2 py-1 text-right font-mono font-bold text-black text-[8.5pt]">
                                  ₱ {materialsSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>

                              {/* 2. ONE Single Consolidated Lump Sum Row */}
                              {totalLumpSums > 0 && (
                                <tr className="border-t border-black bg-purple-50/60 font-bold text-[8pt]">
                                  <td colSpan={3} className="border border-black px-2 py-1 text-right uppercase tracking-wider text-purple-950">
                                    LUMP SUM - LABOR, LOGISTICS & EQUIPMENT (FROM FORM L):
                                  </td>
                                  <td className="border border-black px-2 py-1 text-right font-mono font-bold text-purple-950 text-[8.5pt]">
                                    ₱ {totalLumpSums.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              )}

                              {/* 3. Summary Grand Total Row */}
                              <tr className="border-t-2 border-black bg-amber-100 font-extrabold text-[8.5pt]">
                                <td colSpan={3} className="border border-black px-2 py-1.5 text-right font-black uppercase text-black">
                                  TOTAL CALCULATED BID PRICE (DELIVERED FINAL DESTINATION):
                                </td>
                                <td className="border border-black px-2 py-1.5 text-right font-mono font-black text-black text-[9.5pt] bg-amber-200">
                                  ₱ {grandTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            </>
                          )}

                        </tbody>
                      </table>
                    </div>

                    {/* Signature Block (Rendered ONLY on Final Page, attached cleanly) */}
                    {isLastPage && (
                      <div className="pt-2 space-y-1.5 font-serif text-[8pt] text-black">
                        <div className="flex items-baseline gap-2">
                          <span className="w-28 font-bold text-black shrink-0">Name of Signatory:</span>
                          <span className="flex-1 border-b border-black pb-0.5 font-bold uppercase text-black">
                            {signatoryName || 'ENGR. JUAN DELA CRUZ'}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-2">
                          <span className="w-28 font-bold text-black shrink-0">Signature:</span>
                          <span className="flex-1 border-b border-black pb-0.5 text-slate-400">
                            ________________________________________
                          </span>
                        </div>

                        <div className="flex items-baseline gap-2 pt-0.5">
                          <span className="w-auto font-bold text-black shrink-0">Duly authorized to sign the Bid for and behalf of:</span>
                          <span className="flex-1 border-b border-black pb-0.5 font-bold uppercase text-black">
                            {companyName || 'QUANTUM CLOUD CORPORATION'}
                          </span>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Document Running Footer on EVERY Page */}
                  <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-[7.5pt] font-mono text-slate-700 mt-2">
                    <div className="flex items-center gap-3">
                      <DocumentQrCode
                        details={{
                          companyName: companyName || 'Bidding Entity',
                          documentName: 'Summary of Bid Prices',
                          documentNumber: `FIN-SUMMARYBID-${projectRefNo || 'SCHED'}`,
                          projectTitle: projectTitle,
                          projectRefNo: projectRefNo,
                          procuringEntity: procuringEntity,
                          dateTimeSubmitted: dateSubmitted || 'March 19, 2026',
                          documentCategory: 'Financial Documents',
                          generatedBy: companyName || 'Bidding Entity'
                        }}
                        size={38}
                        showCaption={false}
                      />
                      <div className="space-y-0.5">
                        <p className="font-bold text-black uppercase">{companyName || 'QUANTUM CLOUD CORPORATION'}</p>
                        <p>PROJECT: <strong>{projectTitle || 'N/A'}</strong></p>
                        <p>REF NO: <strong>{projectRefNo || 'N/A'}</strong></p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold font-mono text-black text-[8.5pt]">Page {currentPageNum} of {totalPagesCount}</span>
                      <p className="text-[7pt] text-slate-500 uppercase">Statutory Summary of Bid Prices (Form L Synced)</p>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/95 sticky bottom-0 z-10 shrink-0 no-print">
          <div className="text-xs font-mono text-slate-400">
            Total Calculated Bid Price: <span className="text-emerald-400 font-bold font-mono text-sm">₱ {grandTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg transition flex items-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Saving to Vault...' : 'Save & Complete Summary of Bid Prices'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// Default export alias
export default SummaryOfBidPriceModal;

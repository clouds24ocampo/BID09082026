import React, { useState, useEffect, useMemo } from 'react';
import { Tenant } from '../../../types';
import { generateAndDownloadThreeLayerPdf, buildMergedThreeLayerPdfDataUrl } from '../../../utils/pdfExportEngine';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import { savePdfData } from '../../../utils/vaultIndexedDB';
import DocumentQrCode from '../../common/DocumentQrCode';
import {
  X,
  Printer,
  Download,
  Building2,
  Table,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

export interface BoqItemRow {
  id: string;
  itemNo: string;
  description: string;
  unit: string;
  quantity: number | string;
  unitPrice: number | string;
  isLumpSum?: boolean;
  lumpSumType?: 'LABOR' | 'LOGISTICS' | 'EQUIPMENT';
  isSplitContinuation?: boolean;
}

export interface BillOfQuantitiesModalProps {
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

export const BillOfQuantitiesModal: React.FC<BillOfQuantitiesModalProps> = ({
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

  // Header Parameters
  const [projectTitle, setProjectTitle] = useState(activeProjectTitle || '');
  const [contractLocation, setContractLocation] = useState(activeProcuringEntity || '');
  const [companyName, setCompanyName] = useState(tenant?.companyName || '');
  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo || '');
  const [dateSubmitted, setDateSubmitted] = useState('March 19, 2026');
  const [totalLabel, setTotalLabel] = useState('Total Calculated Bid Price (Delivered Final Destination)');

  // BOQ Materials Items State
  const [boqRows, setBoqRows] = useState<BoqItemRow[]>([]);

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

  // Helper to load Detailed Estimates (Form L) with fallback to Section VI / Section VII
  const loadProjectData = (projectKey: string, candidateTitle?: string, oppId?: string) => {
    const tenantId = tenant?.id || 'default';
    const targetOppId = oppId || selectedOppId || '';
    const cleanKey = (projectKey || '').replace(/[^a-zA-Z0-9_-]/g, '_');

    // 1. Build all candidate keys for Form (L) Detailed Estimates
    const candidateDetKeys = [
      targetOppId ? `bidocs_detailed_estimates_${tenantId}_${targetOppId}` : '',
      projectKey ? `bidocs_detailed_estimates_${tenantId}_${projectKey}` : '',
      cleanKey ? `bidocs_detailed_estimates_${tenantId}_${cleanKey}` : '',
      projectRefNo ? `bidocs_detailed_estimates_${tenantId}_${projectRefNo}` : '',
      activeProjectRefNo ? `bidocs_detailed_estimates_${tenantId}_${activeProjectRefNo}` : ''
    ].filter(Boolean);

    let savedDetEst: string | null = null;
    for (const key of candidateDetKeys) {
      const val = localStorage.getItem(key);
      if (val) {
        savedDetEst = val;
        break;
      }
    }

    // 2. If not found by direct keys, scan all localStorage detailed estimates keys for this tenant
    if (!savedDetEst) {
      try {
        const prefix = `bidocs_detailed_estimates_${tenantId}_`;
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) {
            const raw = localStorage.getItem(k);
            if (raw) {
              const parsed = JSON.parse(raw);
              const pRef = (parsed.projectRefNo || '').trim().toLowerCase();
              const pTitle = (parsed.projectName || parsed.projectTitle || '').trim().toLowerCase();
              const qRef = (projectKey || '').trim().toLowerCase();
              const qTitle = (candidateTitle || '').trim().toLowerCase();
              
              if ((qRef && pRef === qRef) || (qTitle && pTitle === qTitle) || (targetOppId && k.includes(targetOppId))) {
                savedDetEst = raw;
                break;
              }
            }
          }
        }
      } catch (e) {
        console.warn('[BOQ] Error scanning detailed estimates in localStorage:', e);
      }
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
            const rows: BoqItemRow[] = parsed.materials.map((item: any, idx: number) => ({
              id: item.id || `boq-det-${idx + 1}`,
              itemNo: item.itemNo || `${idx + 1}`,
              description: item.description || `Material Item ${idx + 1}`,
              unit: item.unit || 'Unit',
              quantity: parseNum(item.quantity) || 1,
              unitPrice: parseNum(item.unitPrice) || 0
            }));
            setBoqRows(rows);
            loadedFromDetEst = true;
            setIsSyncedFromDetailedEstimates(true);
          }
        }
      } catch (e) {
        console.error('[BOQ] Error parsing Form (L) detailed estimates:', e);
      }
    }

    // 3. Fallback: If not found in Detailed Estimates, check Section VI Schedule of Requirements & Section VII
    if (!loadedFromDetEst) {
      setIsSyncedFromDetailedEstimates(false);
      setLaborLumpSum(0);
      setLogisticsLumpSum(0);
      setEquipmentLumpSum(0);

      const candidateSecViKeys = [
        targetOppId ? `bidocs_sec_vi_${tenantId}_${targetOppId}` : '',
        projectKey ? `bidocs_sec_vi_${tenantId}_${projectKey}` : '',
        cleanKey ? `bidocs_sec_vi_${tenantId}_${cleanKey}` : '',
        projectRefNo ? `bidocs_sec_vi_${tenantId}_${projectRefNo}` : '',
        activeProjectRefNo ? `bidocs_sec_vi_${tenantId}_${activeProjectRefNo}` : ''
      ].filter(Boolean);

      let secViItems: any[] = [];
      for (const key of candidateSecViKeys) {
        const savedSecVi = localStorage.getItem(key);
        if (savedSecVi) {
          try {
            const parsed = JSON.parse(savedSecVi);
            if (Array.isArray(parsed) && parsed.length > 0) {
              secViItems = parsed;
              break;
            }
          } catch (e) {}
        }
      }

      if (secViItems.length > 0) {
        const rows: BoqItemRow[] = secViItems.map((item: any, idx: number) => ({
          id: `boq-sec6-${item.id || idx + 1}`,
          itemNo: `${idx + 1}`,
          description: item.description || `Section VI Item ${idx + 1}`,
          unit: item.unit || 'Unit',
          quantity: parseNum(item.quantity) || 1,
          unitPrice: parseNum(item.unitAmount || item.unitPrice || item.unitCost) || 0
        }));
        setBoqRows(rows);
      } else {
        const candidateTechKeys = [
          targetOppId ? `bidocs_tech_specs_${tenantId}_${targetOppId}` : '',
          projectKey ? `bidocs_tech_specs_${tenantId}_${projectKey}` : '',
          cleanKey ? `bidocs_tech_specs_${tenantId}_${cleanKey}` : '',
          projectRefNo ? `bidocs_tech_specs_${tenantId}_${projectRefNo}` : ''
        ].filter(Boolean);

        let techItems: any[] = [];
        for (const key of candidateTechKeys) {
          const savedTech = localStorage.getItem(key);
          if (savedTech) {
            try {
              const parsed = JSON.parse(savedTech);
              if (Array.isArray(parsed) && parsed.length > 0) {
                techItems = parsed;
                break;
              }
            } catch (e) {}
          }
        }

        if (techItems.length > 0) {
          const rows: BoqItemRow[] = techItems.map((item: any, idx: number) => ({
            id: `boq-sec7-${item.id || idx + 1}`,
            itemNo: item.itemNo || `${idx + 1}`,
            description: item.specification || item.description || `Item ${idx + 1}`,
            unit: item.unit || 'Unit',
            quantity: parseNum(item.quantity) || 1,
            unitPrice: 0
          }));
          setBoqRows(rows);
        } else {
          setBoqRows([]);
        }
      }
    }
  };

  useEffect(() => {
    const list = getOpportunityProjects(tenant?.id);
    setOppProjects(list);

    const activeKey = activeProjectRefNo || (list.length > 0 ? list[0].refNo : '');
    if (activeKey) {
      const match = list.find(p => p.refNo === activeKey || p.id === activeKey);
      if (match) {
        setSelectedOppId(match.id);
        setProjectRefNo(match.refNo);
        setProjectTitle(match.title);
        setContractLocation(match.procuringEntity);
        if (match.dateTimeSubmitted) setDateSubmitted(match.dateTimeSubmitted);
        loadProjectData(match.refNo, match.title, match.id);
      } else {
        setProjectRefNo(activeKey);
        if (activeProjectTitle) setProjectTitle(activeProjectTitle);
        if (activeProcuringEntity) setContractLocation(activeProcuringEntity);
        loadProjectData(activeKey, activeProjectTitle, activeKey);
      }
    } else if (list.length > 0) {
      const first = list[0];
      setSelectedOppId(first.id);
      setProjectRefNo(first.refNo);
      setProjectTitle(first.title);
      setContractLocation(first.procuringEntity);
      if (first.dateTimeSubmitted) setDateSubmitted(first.dateTimeSubmitted);
      loadProjectData(first.refNo, first.title, first.id);
    } else {
      loadProjectData('default');
    }
  }, [tenant?.id, activeProjectRefNo, activeProjectTitle, activeProcuringEntity]);

  useEffect(() => {
    if (tenant?.companyName) {
      setCompanyName(tenant.companyName);
    }
  }, [tenant]);

  const handleSelectOpportunity = (oppId: string) => {
    setSelectedOppId(oppId);
    const found = oppProjects.find(p => p.id === oppId || p.refNo === oppId);
    if (found) {
      setProjectRefNo(found.refNo);
      setProjectTitle(found.title);
      setContractLocation(found.procuringEntity);
      if (found.dateTimeSubmitted) setDateSubmitted(found.dateTimeSubmitted);
      loadProjectData(found.refNo, found.title, found.id);
    } else {
      loadProjectData(oppId, '', oppId);
    }
  };

  const handleReloadData = () => {
    const activeKey = projectRefNo || activeProjectRefNo || selectedOppId || 'default';
    loadProjectData(activeKey, projectTitle, selectedOppId);
  };

  // Calculate row total amount
  const calculateRowAmount = (qty: number | string, unitPrice: number | string): number => {
    const q = parseNum(qty);
    const p = parseNum(unitPrice);
    return q * p;
  };

  // Generate complete display rows (Materials + Form L Lump Sum breakdown)
  const getAllDisplayBoqRows = (): BoqItemRow[] => {
    const displayRows: BoqItemRow[] = [...boqRows];
    let nextNum = boqRows.length + 1;

    if (includeLumpSumsInTable) {
      if (laborLumpSum > 0) {
        displayRows.push({
          id: 'row-boq-labor',
          itemNo: `LS-${nextNum++}`,
          description: 'DIRECT LABOR & TECHNICAL PERSONNEL SERVICES (Installation, Assembly, Testing & Commissioning from Form L Detailed Estimates)',
          unit: 'Lot',
          quantity: 1,
          unitPrice: laborLumpSum,
          isLumpSum: true,
          lumpSumType: 'LABOR'
        });
      }

      if (logisticsLumpSum > 0) {
        displayRows.push({
          id: 'row-boq-logistics',
          itemNo: `LS-${nextNum++}`,
          description: 'MOBILIZATION, HAULING & TRANSPORTATION LOGISTICS (Freight, Site Delivery & Handling from Form L Detailed Estimates)',
          unit: 'Lot',
          quantity: 1,
          unitPrice: logisticsLumpSum,
          isLumpSum: true,
          lumpSumType: 'LOGISTICS'
        });
      }

      if (equipmentLumpSum > 0) {
        displayRows.push({
          id: 'row-boq-equipment',
          itemNo: `LS-${nextNum++}`,
          description: 'SPECIALIZED EQUIPMENT RENTAL & MACHINERY UTILIZATION (Tools, Lifting & Rigging Operations from Form L Detailed Estimates)',
          unit: 'Lot',
          quantity: 1,
          unitPrice: equipmentLumpSum,
          isLumpSum: true,
          lumpSumType: 'EQUIPMENT'
        });
      }
    }

    return displayRows;
  };

  // Subtotals and Grand Total
  const materialsSubtotal = boqRows.reduce((sum, row) => sum + calculateRowAmount(row.quantity, row.unitPrice), 0);
  const totalLumpSums = (laborLumpSum || 0) + (logisticsLumpSum || 0) + (equipmentLumpSum || 0);
  const grandTotal = materialsSubtotal + totalLumpSums;

  // Intelligent Multi-Page Pagination Chunking for 13" x 8.5" Landscape Paper
  const pageChunks = useMemo(() => {
    const allRows = getAllDisplayBoqRows();
    if (allRows.length === 0) return [[]];

    const getRowHeight = (desc: string) => {
      const dLen = (desc || '').length;
      // Col 2 width (54% of ~12in landscape) holds ~85 chars per line at 8pt font
      const lineCount = Math.max(1, Math.ceil(dLen / 85));
      return 18 + (lineCount - 1) * 11;
    };

    const pages: BoqItemRow[][] = [];
    let currentChunk: BoqItemRow[] = [];
    let currentHeight = 0;
    let pageIdx = 0;

    for (let idx = 0; idx < allRows.length; idx++) {
      const row = allRows[idx];
      const rHeight = getRowHeight(row.description);
      const isPage1 = pageIdx === 0;

      // Height budget for 13" x 8.5" Landscape Legal (740px printable)
      // Page 1 has big header block (~130px), final page needs space for summary + signature (~210px)
      // Continuation pages have no top header rows (reclaimed 130px)
      const finalPageLimit = isPage1 ? 380 : 530;
      const continuationLimit = isPage1 ? 580 : 710;

      let remainingHeight = 0;
      for (let r = idx; r < allRows.length; r++) {
        remainingHeight += getRowHeight(allRows[r].description);
      }

      if (currentHeight + remainingHeight <= finalPageLimit) {
        currentChunk.push(row);
        currentHeight += rHeight;
        continue;
      }

      if (currentHeight + rHeight > continuationLimit && currentChunk.length > 0) {
        const remainingSpace = continuationLimit - currentHeight;
        const desc = row.description || '';

        // If there is usable space on current page, split description across pages
        if (remainingSpace >= 30 && desc.length > 50) {
          const linesFit = Math.max(1, Math.floor((remainingSpace - 18) / 11));
          const charsFit = Math.max(40, linesFit * 85);

          let splitIdx = desc.lastIndexOf(' ', charsFit);
          if (splitIdx < 30) splitIdx = charsFit;

          const part1Desc = desc.substring(0, splitIdx).trim();
          const part2Desc = desc.substring(splitIdx).trim();

          if (part1Desc.length > 15 && part2Desc.length > 10) {
            const part1Row: BoqItemRow = {
              ...row,
              id: `${row.id}-pt1`,
              description: part1Desc
            };
            const part2Row: BoqItemRow = {
              ...row,
              id: `${row.id}-pt2`,
              itemNo: row.itemNo,
              description: part2Desc,
              quantity: '',
              unitPrice: '',
              isSplitContinuation: true
            };

            currentChunk.push(part1Row);
            pages.push(currentChunk);

            pageIdx++;
            currentChunk = [part2Row];
            currentHeight = getRowHeight(part2Desc);
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
  }, [boqRows, includeLumpSumsInTable, laborLumpSum, logisticsLumpSum, equipmentLumpSum]);

  const totalPagesCount = pageChunks.length;

  const fmtPeso = (val: number): string => {
    if (val === 0) return '-';
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleExportPdf = async () => {
    setIsSaving(true);
    try {
      const fileName = `${projectRefNo || 'PROJECT'}_Financial_Envelope_Bill_of_Quantities.pdf`;
      const templateElems = document.querySelectorAll('.boq-paper');
      if (templateElems.length > 0) {
        const elemArray = Array.from(templateElems) as HTMLElement[];
        await generateAndDownloadThreeLayerPdf(null, elemArray, undefined, fileName);
      }
    } catch (err) {
      console.error('[BOQ] PDF Export Error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const fileName = `${projectRefNo || 'PROJECT'}_Financial_Envelope_Bill_of_Quantities.pdf`;
      const templateElems = document.querySelectorAll('.boq-paper');
      let dataUrl: string | undefined = undefined;
      if (templateElems.length > 0) {
        const elemArray = Array.from(templateElems) as HTMLElement[];
        dataUrl = await buildMergedThreeLayerPdfDataUrl(
          [{ title: 'Bill of Quantities', formElement: elemArray }],
          fileName
        );
      }

      const tenantId = tenant?.id || 'default';
      const scopeKey = selectedOppId || projectRefNo || 'default';
      if (dataUrl) {
        try {
          await savePdfData(`boq_${tenantId}_${scopeKey}`, dataUrl);
          if (selectedOppId) await savePdfData(`boq_${tenantId}_${selectedOppId}`, dataUrl);
          if (projectRefNo) await savePdfData(`boq_${tenantId}_${projectRefNo}`, dataUrl);
        } catch (_) {}
      }

      try {
        localStorage.setItem(`bidocs_boq_${tenantId}_${scopeKey}`, JSON.stringify(boqRows));
        if (selectedOppId) localStorage.setItem(`bidocs_boq_${tenantId}_${selectedOppId}`, JSON.stringify(boqRows));
        if (projectRefNo) localStorage.setItem(`bidocs_boq_${tenantId}_${projectRefNo}`, JSON.stringify(boqRows));
      } catch (_) {}

      if (onSaveAndComplete) {
        onSaveAndComplete(dataUrl, `Bill of Quantities - [${projectRefNo}]`, projectRefNo, projectTitle);
      }
      if (onClose) onClose();
    } catch (err) {
      console.error('[BOQ] Save Error:', err);
      if (onSaveAndComplete) {
        onSaveAndComplete(undefined, `Bill of Quantities - [${projectRefNo}]`, projectRefNo, projectTitle);
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
      
      {/* LANDSCAPE LEGAL 13" x 8.5" PRINT STYLESHEET */}
      <style>{`
        @media print {
          @page {
            size: 13in 8.5in landscape;
            margin: 0mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .boq-paper {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0.4in !important;
            width: 13in !important;
            min-height: 8.5in !important;
            page-break-after: always !important;
          }
          .boq-paper:last-child {
            page-break-after: avoid !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col">
        
        {/* Top Header Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight flex items-center gap-2">
                <span>Bill of Quantities (BOQ)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                  Form (L) Synced
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Legal 13" × 8.5" Landscape
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold">
                  {totalPagesCount} {totalPagesCount === 1 ? 'Page' : 'Pages'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Statutory BOQ Schedule of Direct Materials & Consolidated Lump Sum (Labor, Logistics, Equipment)
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
              <span>Print Legal 13"×8.5"</span>
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
                  placeholder="e.g. Procurement of High-Capacity Network Switches"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1 font-bold">Contract Location</label>
                <input
                  type="text"
                  value={contractLocation}
                  onChange={(e) => setContractLocation(e.target.value)}
                  placeholder="e.g. Metro Manila, Philippines"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-semibold"
                />
              </div>

              <div className="col-span-3">
                <label className="block text-slate-400 font-mono mb-1 font-bold">Enterprise / Bidder Name <span className="text-red-400">*</span></label>
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
                <span className="text-slate-400">Direct Materials: <strong className="text-blue-300">₱{fmtPeso(materialsSubtotal)}</strong> ({boqRows.length} items)</span>
                <span className="text-slate-400">Consolidated Lump Sum (Labor, Logistics, Equipment): <strong className="text-purple-300">₱{fmtPeso(totalLumpSums)}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">Grand Total:</span>
                <span className="text-emerald-400 font-extrabold text-sm px-2.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/50">
                  ₱{fmtPeso(grandTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* MULTI-PAGE STATUTORY LEGAL LANDSCAPE PAPER SHEETS */}
          <div className="space-y-8 flex flex-col items-center">
            {pageChunks.map((chunk, pageIdx) => {
              const isFirstPage = pageIdx === 0;
              const isLastPage = pageIdx === totalPagesCount - 1;
              const currentPageNum = pageIdx + 1;

              return (
                <div
                  key={`boq-page-${pageIdx}`}
                  className="boq-paper single-page-paper print-document-sheet w-[13in] min-w-[13in] max-w-[13in] min-h-[8.5in] bg-white text-slate-950 p-[0.4in] shadow-2xl font-sans text-[8.5pt] leading-normal flex flex-col justify-between mx-auto border-2 border-slate-950 box-border shrink-0"
                >
                  <div className="space-y-0">
                    
                    {/* TABLE GRID STRUCTURE */}
                    <table className="w-full border-collapse border-2 border-slate-950 text-slate-900 table-fixed">
                        <colgroup>
                          <col style={{ width: '4.5%' }} />
                          <col style={{ width: '54%' }} />
                          <col style={{ width: '6.5%' }} />
                          <col style={{ width: '6.5%' }} />
                          <col style={{ width: '13.5%' }} />
                          <col style={{ width: '15%' }} />
                        </colgroup>
                        {isFirstPage && (
                          <thead>
                            {/* Row 1: Document Title Header */}
                            <tr className="border-b border-slate-950 bg-slate-100 text-center">
                              <td colSpan={6} className="p-1 font-bold text-slate-950 uppercase tracking-widest text-[9.5pt]">
                                BILL OF QUANTITIES
                              </td>
                            </tr>

                            {/* Row 2: Name / Location */}
                            <tr>
                              <td colSpan={6} className="border border-slate-950 p-1.5 text-left font-bold italic text-[8pt]">
                                Name: <span className="not-italic uppercase">{projectTitle || '____________________________________________________________________'}</span>
                                {contractLocation && (
                                  <span className="ml-4 font-bold italic">
                                    Location: <span className="not-italic uppercase">{contractLocation}</span>
                                  </span>
                                )}
                              </td>
                            </tr>

                            {/* Row 3: Name of Bidder (Left) & Project ID No. (Right) */}
                            <tr>
                              <td colSpan={4} className="border border-slate-950 p-1.5 text-left text-[9pt]">
                                <span className="font-semibold">Name of Bidder: </span>
                                <span className="font-bold uppercase">{companyName || 'Quantum Cloud Corporation'}</span>
                              </td>
                              <td colSpan={2} className="border border-slate-950 p-1.5 text-left text-[9pt]">
                                <span className="font-medium">Project ID No. </span>
                                <span className="font-bold font-mono pl-1">{projectRefNo || 'N/A'}</span>
                              </td>
                            </tr>

                            {/* Row 4: Column Number Headers (1, 2, 3, 4, 5, 6) */}
                            <tr className="text-center font-semibold border-b border-slate-950 text-[8pt] bg-slate-100 font-mono">
                              <td className="border border-slate-950 py-0.5 px-1">1</td>
                              <td className="border border-slate-950 py-0.5 px-2">2</td>
                              <td className="border border-slate-950 py-0.5 px-1">3</td>
                              <td className="border border-slate-950 py-0.5 px-1">4</td>
                              <td className="border border-slate-950 py-0.5 px-1">5</td>
                              <td className="border border-slate-950 py-0.5 px-1">6</td>
                            </tr>

                            {/* Row 5: Column Title Headers */}
                            <tr className="text-center font-bold border-b-2 border-slate-950 text-[7.5pt] uppercase bg-slate-50">
                              <td className="border border-slate-950 p-1 italic">Item</td>
                              <td className="border border-slate-950 p-1 italic text-left pl-2">Description</td>
                              <td className="border border-slate-950 p-1">UNIT</td>
                              <td className="border border-slate-950 p-1">QTY</td>
                              <td className="border border-slate-950 p-1">
                                <div>UNIT PRICE</div>
                                <div className="text-[7pt] lowercase italic text-slate-700">(Pesos)</div>
                              </td>
                              <td className="border border-slate-950 p-1">
                                <div>AMOUNT</div>
                                <div className="text-[7pt] italic text-slate-700">(Pesos)</div>
                              </td>
                            </tr>
                          </thead>
                        )}
                        <tbody>
                        
                        {/* BOQ Data Rows for Current Page Chunk */}
                        {chunk.map((row, idx) => {
                          const amount = calculateRowAmount(row.quantity, row.unitPrice);
                          const isLumpSum = !!row.isLumpSum;
                          const isSplitCont = !!row.isSplitContinuation;

                          return (
                            <tr key={row.id} className={`text-[8pt] border-b border-slate-950 hover:bg-slate-50 transition ${isLumpSum ? 'bg-purple-50/50 font-semibold' : ''} ${isSplitCont ? 'bg-slate-50/70 italic' : ''}`}>
                              <td className="border border-slate-950 py-1 px-1.5 text-center font-mono font-semibold align-top">
                                {isSplitCont ? `${row.itemNo} (cont.)` : (row.itemNo || idx + 1)}
                              </td>
                              <td className="border border-slate-950 py-1 px-2 text-left font-normal leading-snug align-top break-words">
                                {isLumpSum ? (
                                  <strong className="text-slate-950 uppercase">{row.description}</strong>
                                ) : (
                                  row.description || '-'
                                )}
                              </td>
                              <td className="border border-slate-950 py-1 px-1.5 text-center font-mono align-top">
                                {isSplitCont ? <span className="text-slate-400 font-mono italic text-[7.5pt]">—</span> : (row.unit || 'Unit')}
                              </td>
                              <td className="border border-slate-950 py-1 px-1.5 text-center font-mono align-top">
                                {isSplitCont ? <span className="text-slate-400 font-mono italic text-[7.5pt]">—</span> : (row.quantity !== '' ? row.quantity : '')}
                              </td>
                              <td className="border border-slate-950 py-1 px-2 text-right font-mono align-top whitespace-nowrap">
                                {isSplitCont ? (
                                  <span className="text-slate-400 font-mono italic text-[7.5pt]">—</span>
                                ) : parseNum(row.unitPrice) > 0 ? (
                                  parseNum(row.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className="border border-slate-950 py-1 px-2 text-right font-mono font-bold align-top whitespace-nowrap">
                                {isSplitCont ? (
                                  <span className="text-slate-400 font-mono italic text-[7.5pt] font-semibold">[Item {row.itemNo} Cont.]</span>
                                ) : amount > 0 ? (
                                  amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                ) : (
                                  '-'
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Render Subtotals, Consolidated Lump Sum, and Grand Total ONLY on Final Page */}
                        {isLastPage && (
                          <>
                            {/* Materials Subtotal Row */}
                            <tr className="border-t border-slate-950 text-[8pt] bg-slate-50">
                              <td colSpan={4} className="border border-slate-950 py-1 px-2 text-right font-bold uppercase">
                                SUBTOTAL - DIRECT MATERIALS & SUPPLY:
                              </td>
                              <td colSpan={2} className="border border-slate-950 py-1 px-2 text-right font-mono font-bold text-slate-950">
                                ₱ {materialsSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>

                            {/* ONE Single Consolidated Lump Sum Row */}
                            {totalLumpSums > 0 && (
                              <tr className="border-t border-slate-950 text-[8pt] bg-purple-50/60 font-bold">
                                <td colSpan={4} className="border border-slate-950 py-1 px-2 text-right uppercase tracking-wider text-purple-950">
                                  LUMP SUM - LABOR, LOGISTICS & EQUIPMENT (FROM FORM L):
                                </td>
                                <td colSpan={2} className="border border-slate-950 py-1 px-2 text-right font-mono font-bold text-purple-950">
                                  ₱ {totalLumpSums.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            )}

                            {/* Final Grand Total Row */}
                            <tr className="border-t-2 border-slate-950 text-[8.5pt] font-bold bg-amber-100">
                              <td colSpan={4} className="border-none py-1.5 px-2 text-right text-slate-950 font-black uppercase italic">
                                {totalLabel || 'TOTAL CALCULATED BID PRICE (DELIVERED FINAL DESTINATION)'}
                              </td>
                              <td colSpan={2} className="border-2 border-slate-950 py-1.5 px-2 text-right font-mono text-sm font-black bg-amber-200 text-slate-950">
                                ₱ {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </>
                        )}

                      </tbody>
                    </table>

                  </div>

                  {/* Document Footer on EVERY Page */}
                  <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-[7.5pt] font-mono text-slate-700 mt-2">
                    <div className="flex items-center gap-3">
                      <DocumentQrCode
                        details={{
                          companyName: companyName || 'Bidding Entity',
                          documentName: 'Bill of Quantities Schedule',
                          documentNumber: `FIN-BOQ-${projectRefNo || 'SCHED'}`,
                          projectTitle: projectTitle,
                          projectRefNo: projectRefNo,
                          procuringEntity: contractLocation,
                          dateTimeSubmitted: dateSubmitted || 'March 19, 2026',
                          documentCategory: 'Financial Documents',
                          generatedBy: companyName || 'Bidding Entity'
                        }}
                        size={38}
                        showCaption={false}
                      />
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-950 uppercase">{companyName || 'QUANTUM CLOUD CORPORATION'}</p>
                        <p>PROJECT: <strong>{projectTitle || 'N/A'}</strong></p>
                        <p>REF NO: <strong>{projectRefNo || 'N/A'}</strong> • LOCATION: <strong>{contractLocation || 'N/A'}</strong></p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold font-mono text-[8.5pt]">Page {currentPageNum} of {totalPagesCount}</span>
                      <p className="text-[7pt] text-slate-500 uppercase">Statutory Bill of Quantities Financial Schedule</p>
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
            Total BOQ Calculated Amount: <span className="text-emerald-400 font-bold font-mono text-sm">₱ {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
              <span>{isSaving ? 'Saving to Vault...' : 'Save & Complete Bill of Quantities'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// Default export alias
export default BillOfQuantitiesModal;

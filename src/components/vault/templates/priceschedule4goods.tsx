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
  Table,
  RotateCcw,
  Calculator,
  Lock,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

export interface PriceScheduleItemRow {
  id: string;
  itemNo: string;
  description: string;
  countryOfOrigin: string;
  quantity: number;
  unitPriceSec6: number;
  isLumpSum?: boolean;
  lumpSumType?: 'LABOR' | 'LOGISTICS' | 'EQUIPMENT';
  isSplitContinuation?: boolean;
}

export interface PriceScheduleModalProps {
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
    quantity: 5,
    unitCost: 500000.00
  },
  {
    id: '2',
    description: 'Managed Layer 3 Core Network Switches (48-Port PoE+ 740W, 4x 10G SFP+ Uplinks, Stacking Module, Redundant Power Module, Advanced L3 Routing License)',
    quantity: 10,
    unitCost: 120000.00
  },
  {
    id: '3',
    description: 'Uninterruptible Power Supply (UPS) 10kVA Online Double Conversion Tower/Rack Mountable with Extended Battery Module (EBM) and Network Management Card',
    quantity: 4,
    unitCost: 200000.00
  }
];

export const PriceScheduleModal: React.FC<PriceScheduleModalProps> = ({
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

  // Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [projectTitle, setProjectTitle] = useState(activeProjectTitle || 'Procurement of High-Capacity Network Switches & Firewall Security');
  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo || '01-INFRA-2026');
  const [procuringEntity, setProcuringEntity] = useState(activeProcuringEntity || '');
  const [bidderName, setBidderName] = useState(tenant?.companyName || '');
  const [signatoryName, setSignatoryName] = useState(tenant?.authorizedSignatory?.name || '');
  const [signatoryTitle, setSignatoryTitle] = useState(tenant?.authorizedSignatory?.title || '');
  const [dateSubmitted, setDateSubmitted] = useState(todayStr);

  // Cost Breakdown Percentage Rates (Default: 20% Transpo, 5% Sales Taxes, 15% Incidental Services)
  const [transpoPercent, setTranspoPercent] = useState<number>(20);
  const [taxPercent, setTaxPercent] = useState<number>(5);
  const [servicesPercent, setServicesPercent] = useState<number>(15);

  // Dynamic Price Schedule Item Rows (Materials)
  const [items, setItems] = useState<PriceScheduleItemRow[]>([]);

  // Lump Sum State Synced from Form (L) Detailed Estimates
  const [laborLumpSum, setLaborLumpSum] = useState<number>(0);
  const [logisticsLumpSum, setLogisticsLumpSum] = useState<number>(0);
  const [equipmentLumpSum, setEquipmentLumpSum] = useState<number>(0);
  const [isSyncedFromDetailedEstimates, setIsSyncedFromDetailedEstimates] = useState<boolean>(false);
  const [includeLumpSumsInTable, setIncludeLumpSumsInTable] = useState<boolean>(true);

  // Helper to parse numbers from strings safely
  const parseNumeric = (val: string | number | undefined): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Helper to load Detailed Estimates (Form L) with fallback to Section VI Schedule of Requirements
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
          const laborCost = parseNumeric(parsed.totalLaborCost);
          const logCost = parseNumeric(parsed.totalLogisticsCost);
          const eqCost = parseNumeric(parsed.totalEquipmentCost);

          setLaborLumpSum(laborCost);
          setLogisticsLumpSum(logCost);
          setEquipmentLumpSum(eqCost);

          if (Array.isArray(parsed.materials) && parsed.materials.length > 0) {
            const rows: PriceScheduleItemRow[] = parsed.materials.map((item: any, idx: number) => {
              const qty = parseNumeric(item.quantity);
              const unitP = parseNumeric(item.unitPrice);
              return {
                id: item.id || `row-det-${idx + 1}`,
                itemNo: item.itemNo || `${idx + 1}`,
                description: item.description || `Material Item ${idx + 1}`,
                countryOfOrigin: 'Philippines',
                quantity: qty > 0 ? qty : 1,
                unitPriceSec6: unitP > 0 ? unitP : 0
              };
            });
            setItems(rows);
            loadedFromDetEst = true;
            setIsSyncedFromDetailedEstimates(true);
          }
        }
      } catch (e) {
        console.error('Error parsing detailed estimates for price schedule:', e);
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
            console.error('Error reading Section VI items from localStorage:', e);
          }
        }
      }

      const rows: PriceScheduleItemRow[] = secViItems.map((item: any, idx: number) => {
        const qtyNum = parseNumeric(item.quantity);
        const unitNum = parseNumeric(item.unitAmount || item.unitCost);

        return {
          id: `row-sec6-${item.id || idx + 1}`,
          itemNo: `${idx + 1}`,
          description: item.description || `Section VI Item ${idx + 1}`,
          countryOfOrigin: 'Philippines',
          quantity: qtyNum > 0 ? qtyNum : 1,
          unitPriceSec6: unitNum > 0 ? unitNum : 140
        };
      });

      setItems(rows);
    }
  };

  // Project Category & Theme State (100% Auto-Determined: 'Goods' = Blue, 'Infrastructure' = Yellow/Amber, 'Consulting' = Green/Emerald)
  const [projectCategory, setProjectCategory] = useState<'Goods' | 'Infrastructure' | 'Consulting'>('Goods');

  const detectCategoryFromProject = (titleStr: string, refNoStr: string, catStr?: string): 'Goods' | 'Infrastructure' | 'Consulting' => {
    const catUpper = (catStr || '').toUpperCase();
    if (catUpper.includes('INFRA')) return 'Infrastructure';
    if (catUpper.includes('CONSULT')) return 'Consulting';
    if (catUpper.includes('GOOD')) return 'Goods';

    const combined = `${titleStr || ''} ${refNoStr || ''}`.toLowerCase();
    if (
      combined.includes('infra') ||
      combined.includes('construction') ||
      combined.includes('civil') ||
      combined.includes('building') ||
      combined.includes('road') ||
      combined.includes('paving') ||
      combined.includes('bridge') ||
      combined.includes('drainage')
    ) {
      return 'Infrastructure';
    }
    if (combined.includes('consult')) {
      return 'Consulting';
    }
    return 'Goods';
  };

  // Initial Sync on Component Mount & Project Change
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
        setProjectCategory(detectCategoryFromProject(match.title, match.refNo, match.category));
        loadProjectData(match.refNo, match.title);
      } else {
        setProjectRefNo(activeKey);
        if (activeProjectTitle) setProjectTitle(activeProjectTitle);
        if (activeProcuringEntity) setProcuringEntity(activeProcuringEntity);
        setProjectCategory(detectCategoryFromProject(activeProjectTitle || '', activeKey));
        loadProjectData(activeKey, activeProjectTitle);
      }
    } else if (list.length > 0) {
      const first = list[0];
      setSelectedOppId(first.id);
      setProjectRefNo(first.refNo);
      setProjectTitle(first.title);
      setProcuringEntity(first.procuringEntity);
      if (first.dateTimeSubmitted) setDateSubmitted(first.dateTimeSubmitted);
      setProjectCategory(detectCategoryFromProject(first.title, first.refNo, first.category));
      loadProjectData(first.refNo, first.title);
    } else {
      loadProjectData('default');
    }
  }, [tenant?.id, activeProjectRefNo, activeProjectTitle, activeProcuringEntity]);

  useEffect(() => {
    if (tenant) {
      if (tenant.companyName) setBidderName(tenant.companyName);
      if (tenant.authorizedSignatory?.name) setSignatoryName(tenant.authorizedSignatory.name);
      if (tenant.authorizedSignatory?.title) setSignatoryTitle(tenant.authorizedSignatory.title);
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
      setProjectCategory(detectCategoryFromProject(found.title, found.refNo, found.category));
      loadProjectData(found.refNo, found.title);
    }
  };

  const handleUpdateCountryOfOrigin = (id: string, origin: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, countryOfOrigin: origin } : item));
  };

  const handleReloadData = () => {
    const activeKey = projectRefNo || activeProjectRefNo || 'default';
    loadProjectData(activeKey);
  };

  // Generate complete display rows (Materials + Single Consolidated Lump Sum row)
  const getAllDisplayRows = (): PriceScheduleItemRow[] => {
    const displayRows: PriceScheduleItemRow[] = [...items];
    let nextNum = items.length + 1;

    const totalLumpSumsCost = (laborLumpSum || 0) + (logisticsLumpSum || 0) + (equipmentLumpSum || 0);

    if (includeLumpSumsInTable && totalLumpSumsCost > 0) {
      displayRows.push({
        id: 'row-ls-consolidated',
        itemNo: `LS-${nextNum++}`,
        description: 'DIRECT LABOR, LOGISTICS, HAULING & SPECIALIZED EQUIPMENT (Consolidated Incidental Services, Delivery & Machinery Utilization from Form L Detailed Estimates)',
        countryOfOrigin: 'Philippines',
        quantity: 1,
        unitPriceSec6: totalLumpSumsCost,
        isLumpSum: true,
        lumpSumType: 'LABOR'
      });
    }

    return displayRows;
  };

  // Calculation Mechanics for Price Schedule Columns 5, 6, 7, 8, 9, 10
  const computeRowBreakdown = (row: PriceScheduleItemRow) => {
    if (row.isSplitContinuation) {
      return {
        col5_EXW: 0,
        col6_Transpo: 0,
        col7_Taxes: 0,
        col8_Services: 0,
        col9_UnitTotal: 0,
        col10_LineTotal: 0
      };
    }

    if (row.isLumpSum) {
      const totalLS = (laborLumpSum || 0) + (logisticsLumpSum || 0) + (equipmentLumpSum || 0);
      return {
        col5_EXW: 0,
        col6_Transpo: logisticsLumpSum || 0,
        col7_Taxes: 0,
        col8_Services: (laborLumpSum || 0) + (equipmentLumpSum || 0),
        col9_UnitTotal: totalLS,
        col10_LineTotal: totalLS
      };
    }

    const sec6UnitPrice = row.unitPriceSec6 || 0;
    const transpoRate = (transpoPercent || 20) / 100;
    const taxRate = (taxPercent || 5) / 100;
    const servRate = (servicesPercent || 15) / 100;
    const divisor = 1 + transpoRate + taxRate + servRate; // e.g. 1.40 for 20% + 5% + 15%

    const col5_EXW = sec6UnitPrice / (divisor || 1);
    const col6_Transpo = col5_EXW * transpoRate;
    const col7_Taxes = col5_EXW * taxRate;
    const col8_Services = col5_EXW * servRate;
    const col9_UnitTotal = col5_EXW + col6_Transpo + col7_Taxes + col8_Services; // Equals sec6UnitPrice
    const col10_LineTotal = col9_UnitTotal * (row.quantity || 0);

    return {
      col5_EXW,
      col6_Transpo,
      col7_Taxes,
      col8_Services,
      col9_UnitTotal,
      col10_LineTotal
    };
  };

  // Subtotals and Grand Total Project Cost
  const materialsSubtotal = items.reduce((sum, item) => sum + computeRowBreakdown(item).col10_LineTotal, 0);
  const totalLumpSums = (laborLumpSum || 0) + (logisticsLumpSum || 0) + (equipmentLumpSum || 0);
  const totalProjectCost = materialsSubtotal + totalLumpSums;

  // Intelligent Multi-Page Pagination Chunking for 13" x 8.5" Landscape Paper (Zero Empty Space & Auto Item Splitting)
  const pageChunks = useMemo(() => {
    const allRows = getAllDisplayRows();
    if (allRows.length === 0) return [[]];

    const getRowHeight = (desc: string) => {
      const dLen = (desc || '').length;
      const lineCount = Math.max(1, Math.ceil(dLen / 42));
      return 20 + (lineCount - 1) * 12;
    };

    const pages: PriceScheduleItemRow[][] = [];
    let currentChunk: PriceScheduleItemRow[] = [];
    let currentHeight = 0;
    let pageIdx = 0;

    for (let idx = 0; idx < allRows.length; idx++) {
      const row = allRows[idx];
      const rHeight = getRowHeight(row.description);
      const isPage1 = pageIdx === 0;

      const finalPageLimit = isPage1 ? 340 : 480;
      const continuationLimit = isPage1 ? 560 : 700;

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

        // If there is usable space (>= 50px) on current page and description is substantial (>80 chars), split across pages
        if (remainingSpace >= 50 && desc.length > 80) {
          const linesFit = Math.max(2, Math.floor((remainingSpace - 20) / 12));
          const charsFit = linesFit * 42;

          let splitIdx = desc.lastIndexOf(' ', charsFit);
          if (splitIdx < 40) splitIdx = charsFit;

          const part1Desc = desc.substring(0, splitIdx).trim();
          const part2Desc = desc.substring(splitIdx).trim();

          if (part1Desc.length > 25 && part2Desc.length > 15) {
            const part1Row: PriceScheduleItemRow = {
              ...row,
              id: `${row.id}-pt1`,
              description: part1Desc
            };
            const part2Row: PriceScheduleItemRow = {
              ...row,
              id: `${row.id}-pt2`,
              itemNo: row.itemNo,
              description: part2Desc,
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
  }, [items, includeLumpSumsInTable, laborLumpSum, logisticsLumpSum, equipmentLumpSum, transpoPercent, taxPercent, servicesPercent]);

  const totalPagesCount = pageChunks.length;

  const fmtPeso = (val: number): string => {
    if (val === 0) return '-';
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleExportPdf = async () => {
    setIsSaving(true);
    try {
      const fileName = `${projectRefNo || 'PROJECT'}_Financial_Envelope_Price_Schedule.pdf`;
      const templateElems = document.querySelectorAll('.priceschedule-paper');
      if (templateElems.length > 0) {
        const elemArray = Array.from(templateElems) as HTMLElement[];
        await generateAndDownloadThreeLayerPdf(null, elemArray, undefined, fileName);
      }
    } catch (err) {
      console.error('[PriceSchedule] PDF Export Error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const fileName = `${projectRefNo || 'PROJECT'}_Financial_Envelope_Price_Schedule.pdf`;
      const templateElems = document.querySelectorAll('.priceschedule-paper');
      let dataUrl: string | undefined = undefined;
      if (templateElems.length > 0) {
        const elemArray = Array.from(templateElems) as HTMLElement[];
        dataUrl = await buildMergedThreeLayerPdfDataUrl(
          [{ title: `Price Schedule for ${projectCategory}`, formElement: elemArray }],
          fileName
        );
      }
      if (onSaveAndComplete) {
        onSaveAndComplete(dataUrl, `Price Schedule for ${projectCategory} - [${projectRefNo}]`, projectRefNo, projectTitle);
      }
      if (onClose) onClose();
    } catch (err) {
      console.error('[PriceSchedule] Save Error:', err);
      if (onSaveAndComplete) {
        onSaveAndComplete(undefined, `Price Schedule for ${projectCategory} - [${projectRefNo}]`, projectRefNo, projectTitle);
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
          .priceschedule-paper {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0.5in !important;
            width: 13in !important;
            min-h: 8.5in !important;
            page-break-after: always !important;
          }
          .priceschedule-paper:last-child {
            page-break-after: avoid !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-[98vw] xl:max-w-[1400px] overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col">
        
        {/* Top Bar */}
        {(() => {
          const isInfraTheme = projectCategory === 'Infrastructure';
          const isConsultingTheme = projectCategory === 'Consulting';

          let categoryLabel = 'Goods';
          let categoryLower = 'goods';

          if (isInfraTheme) {
            categoryLabel = 'Infrastructure';
            categoryLower = 'infrastructure projects';
          } else if (isConsultingTheme) {
            categoryLabel = 'Consulting Services';
            categoryLower = 'consulting services';
          }

          const themeHeaderBadge = isInfraTheme
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            : isConsultingTheme
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            : 'bg-blue-500/10 text-blue-400 border-blue-500/20';

          const themeBadgeText = isInfraTheme
            ? '🏗️ INFRASTRUCTURE (Yellow Theme)'
            : isConsultingTheme
            ? '💼 CONSULTING SERVICES (Green Theme)'
            : '📦 GOODS (Blue Theme)';

          const themeCol9Header = isInfraTheme
            ? 'bg-amber-100/80 text-amber-950 font-bold'
            : isConsultingTheme
            ? 'bg-emerald-100/80 text-emerald-950 font-bold'
            : 'bg-blue-100/70 text-black font-bold';

          const themeCol10Header = isInfraTheme
            ? 'bg-amber-200/90 text-amber-950 font-bold'
            : isConsultingTheme
            ? 'bg-emerald-200/90 text-emerald-950 font-bold'
            : 'bg-blue-200/80 text-black font-bold';

          const themeCol9Cell = isInfraTheme
            ? 'bg-amber-50/50 text-black font-bold'
            : isConsultingTheme
            ? 'bg-emerald-50/50 text-black font-bold'
            : 'bg-blue-50/40 text-black font-bold';

          const themeCol10Cell = isInfraTheme
            ? 'bg-amber-100/60 text-amber-950 font-black'
            : isConsultingTheme
            ? 'bg-emerald-100/60 text-emerald-950 font-black'
            : 'bg-blue-100/40 text-blue-950 font-black';

          const themeTotalCell = isInfraTheme
            ? 'bg-amber-200/80 text-amber-950 font-black'
            : isConsultingTheme
            ? 'bg-emerald-200/80 text-emerald-950 font-black'
            : 'bg-blue-200/70 text-blue-950 font-black';

          const themeBtnBg = isInfraTheme
            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
            : isConsultingTheme
            ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold'
            : 'bg-blue-600 hover:bg-blue-500 text-white font-bold';

          const themeAccentText = isInfraTheme
            ? 'text-amber-400'
            : isConsultingTheme
            ? 'text-emerald-400'
            : 'text-blue-400';

          return (
            <>
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 shrink-0 no-print">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${isInfraTheme ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : (isConsultingTheme ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20')}`}>
                    <Table className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight flex items-center gap-2">
                      <span>Price Schedule for {categoryLabel}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        100% Synced with Section VI
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${themeHeaderBadge}`}>
                        {themeBadgeText}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Itemized Price Schedule for {categoryLabel} auto-classified from Opportunity Finder with Columns 5-10 calculation
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
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow flex items-center gap-1.5 ${themeBtnBg}`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Legal 13"×8.5"</span>
                  </button>

                  <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Content Body */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 space-y-6">

                {/* Interactive Form Controls & Detailed Estimates (Form L) Auto-Sync Panel */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 no-print">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <label className={`text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 ${themeAccentText}`}>
                        <Building2 className="w-4 h-4" />
                        <span>Price Schedule Header & Form (L) Synchronization:</span>
                      </label>
                      {isSyncedFromDetailedEstimates ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-purple-400" />
                          Form (L) Estimates Synced
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold flex items-center gap-1">
                          Section VI Schedule
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleReloadData}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow flex items-center gap-1.5 ${themeBtnBg}`}
                        title="Re-read Form (L) Detailed Estimates for the active project"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Sync from Detailed Estimates</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="col-span-full">
                      <label className="block text-slate-300 font-mono mb-1 font-bold flex items-center gap-1.5">
                        <span>Select Active Bidding Opportunity from Opportunity Finder:</span>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold">⚡ (Auto-detects Goods vs Infrastructure)</span>
                      </label>
                      <select
                        value={selectedOppId}
                        onChange={(e) => handleSelectOpportunity(e.target.value)}
                        className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2 text-white font-mono text-xs font-bold focus:outline-none shadow-inner cursor-pointer ${isInfraTheme ? 'border-amber-500/60 focus:border-amber-400' : 'border-blue-500/60 focus:border-blue-400'}`}
                      >
                        <option value="">-- Select Project --</option>
                        {oppProjects.map(p => (
                          <option key={p.id} value={p.id}>
                            [{p.refNo}] {p.title} — {p.procuringEntity} ({p.abc})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-mono mb-1 font-bold">Name of Bidder / Enterprise <span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        value={bidderName}
                        onChange={(e) => setBidderName(e.target.value)}
                        placeholder="e.g. Quantum Cloud Corporation"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-mono mb-1 font-bold">Project Title / Name of Project <span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        value={projectTitle}
                        onChange={(e) => setProjectTitle(e.target.value)}
                        placeholder="e.g. Procurement and Installation of CCTV at Purok 1-6"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-mono mb-1 font-bold">Project ID No. / Reference <span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        value={projectRefNo}
                        onChange={(e) => setProjectRefNo(e.target.value)}
                        placeholder="e.g. 13132143 / 01-INFRA-2026"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Form (L) Detailed Estimates Lump Sums Sync & Rate Breakdown Controls */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {/* Lump Sum Components from Detailed Estimates */}
                    <div className="bg-slate-950/80 border border-purple-500/30 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-purple-300 uppercase tracking-wide flex items-center gap-1.5">
                          <Calculator className="w-4 h-4 text-purple-400" />
                          Lump Sums (Synced from Detailed Estimates Form L):
                        </span>
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeLumpSumsInTable}
                            onChange={(e) => setIncludeLumpSumsInTable(e.target.checked)}
                            className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0"
                          />
                          <span>Show in Schedule Table</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                        <div>
                          <label className="block text-slate-400 text-[10px] mb-0.5">👷 Labor Lump Sum (₱):</label>
                          <input
                            type="number"
                            value={laborLumpSum}
                            onChange={(e) => setLaborLumpSum(parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-purple-500/40 rounded px-2 py-1 text-purple-300 font-bold text-right text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[10px] mb-0.5">🚚 Logistics Lump Sum (₱):</label>
                          <input
                            type="number"
                            value={logisticsLumpSum}
                            onChange={(e) => setLogisticsLumpSum(parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-purple-500/40 rounded px-2 py-1 text-purple-300 font-bold text-right text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[10px] mb-0.5">🛠️ Equipment Lump Sum (₱):</label>
                          <input
                            type="number"
                            value={equipmentLumpSum}
                            onChange={(e) => setEquipmentLumpSum(parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-purple-500/40 rounded px-2 py-1 text-purple-300 font-bold text-right text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] font-mono">
                        <span className="text-slate-400">Materials: <strong className="text-blue-300">₱{fmtPeso(materialsSubtotal)}</strong></span>
                        <span className="text-slate-400">Lump Sums: <strong className="text-purple-300">₱{fmtPeso(totalLumpSums)}</strong></span>
                        <span className="text-slate-200">Grand Total: <strong className="text-emerald-400 text-xs">₱{fmtPeso(totalProjectCost)}</strong></span>
                      </div>
                    </div>

                    {/* Cost Breakdown Rates Controls Panel (Auto-Calculates Columns 5, 6, 7, 8, 9, 10) */}
                    <div className={`bg-slate-950/80 border rounded-xl p-3 space-y-2 ${isInfraTheme ? 'border-amber-500/30' : 'border-blue-500/30'}`}>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className={`font-bold uppercase tracking-wide flex items-center gap-1.5 ${isInfraTheme ? 'text-amber-400' : 'text-blue-400'}`}>
                          <Calculator className="w-4 h-4" />
                          Material Cost Breakdown Rates (Col 5-10):
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Col 5 = Unit Price / (1 + Rates)
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                        <div>
                          <label className="block text-slate-300 text-[10px] mb-0.5">
                            Transpo Rate (Col 6):
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={transpoPercent}
                              onChange={(e) => setTranspoPercent(parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold text-center text-xs"
                            />
                            <span className="text-slate-400 font-bold">%</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-300 text-[10px] mb-0.5">
                            Sales Taxes (Col 7):
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={taxPercent}
                              onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold text-center text-xs"
                            />
                            <span className="text-slate-400 font-bold">%</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-300 text-[10px] mb-0.5">
                            Services Rate (Col 8):
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={servicesPercent}
                              onChange={(e) => setServicesPercent(parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold text-center text-xs"
                            />
                            <span className="text-slate-400 font-bold">%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STATUTORY LEGAL LANDSCAPE MULTI-PAGE PAPER LAYOUT PREVIEW */}
                <div className="space-y-8 flex flex-col items-center w-full">
                  {pageChunks.map((pageItems, pageIdx) => {
                    const isFirstPage = pageIdx === 0;
                    const isLastPage = pageIdx === totalPagesCount - 1;
                    const currentPageNumber = pageIdx + 1;

                    return (
                      <div key={`pricesched-page-wrapper-${pageIdx}`} className="w-full overflow-x-auto flex justify-center py-2 no-print-scroll">
                        <div
                          key={`pricesched-page-${pageIdx}`}
                          className="priceschedule-paper single-page-paper print-document-sheet bg-white text-black p-4 sm:p-6 border-2 border-black shadow-2xl mx-auto rounded-md w-[13in] min-w-[13in] max-w-[13in] min-h-[8.5in] flex flex-col justify-between font-serif shrink-0"
                        >
                          <div className="space-y-3">
                            
                            {/* 1. OFFICIAL GPPB PRICE SCHEDULE HEADER TITLE BLOCK (PAGE 1 ONLY) */}
                            {isFirstPage && (
                              <div className="border-b-2 border-black pb-2 text-center space-y-0.5 font-serif">
                                <h1 className="text-center text-lg sm:text-xl font-bold uppercase tracking-wide text-black">
                                  Price Schedule for {categoryLabel} Offered from Within the Philippines
                                </h1>
                                <p className="text-center font-bold text-[10px] text-slate-800 italic">
                                  [Shall be submitted with the Bid if bidder is offering {categoryLower} from within the Philippines]
                                </p>
                              </div>
                            )}

                            {/* 2. OFFICIAL METADATA BAR (RENDERED ON EVERY SINGLE PAGE) */}
                            <div className="flex items-center justify-between border-b-2 border-black pb-1.5 pt-1 font-serif text-xs text-black">
                              <div>
                                <span className="italic text-slate-900 font-bold">For {categoryLabel} Offered from Within the Philippines</span>
                              </div>
                              <div className="flex items-center gap-6">
                                <div>
                                  <span className="font-bold">Name of Bidder : </span>
                                  <span className="font-bold uppercase underline text-black">{bidderName || 'Quantum Cloud Corporation'}</span>
                                </div>
                                <div>
                                  <span className="font-bold">Project ID No. : </span>
                                  <span className="font-bold font-mono underline text-black">{projectRefNo || '01-INFRA-2026'}</span>
                                </div>
                                <div>
                                  <span className="font-bold">Page </span>
                                  <span className="font-bold font-mono text-black">{currentPageNumber}</span>
                                  <span className="font-bold"> of </span>
                                  <span className="font-bold font-mono text-black">{totalPagesCount}</span>
                                </div>
                              </div>
                            </div>

                            {/* 3. 10-COLUMN PRICE SCHEDULE TABLE MATRIX FOR THIS PAGE */}
                            <div className="w-full">
                              <table className="w-full border-collapse border-2 border-black text-black font-serif text-[8pt] table-fixed">
                                <colgroup>
                                  <col style={{ width: '3.5%' }} />
                                  <col style={{ width: '28.5%' }} />
                                  <col style={{ width: '8%' }} />
                                  <col style={{ width: '4.5%' }} />
                                  <col style={{ width: '9%' }} />
                                  <col style={{ width: '9%' }} />
                                  <col style={{ width: '8.5%' }} />
                                  <col style={{ width: '8.5%' }} />
                                  <col style={{ width: '9%' }} />
                                  <col style={{ width: '11.5%' }} />
                                </colgroup>

                                {/* Render Table Column Header Rows ONLY ON FIRST PAGE (Page 1) */}
                                {isFirstPage && (
                                  <thead className="table-header-group">
                                    
                                    {/* Numbered Header Row (Columns 1 to 10) */}
                                    <tr className="bg-slate-100 border-b border-black text-center font-bold font-mono text-black text-[8.5pt]">
                                      <th className="border border-black p-1">1</th>
                                      <th className="border border-black p-1">2</th>
                                      <th className="border border-black p-1">3</th>
                                      <th className="border border-black p-1">4</th>
                                      <th className="border border-black p-1">5</th>
                                      <th className="border border-black p-1">6</th>
                                      <th className="border border-black p-1">7</th>
                                      <th className="border border-black p-1">8</th>
                                      <th className={`border border-black p-1 ${themeCol9Header}`}>9</th>
                                      <th className={`border border-black p-1 ${themeCol10Header}`}>10</th>
                                    </tr>

                                    {/* Column Names Header Row */}
                                    <tr className="bg-slate-50 border-b-2 border-black text-center font-bold italic leading-tight text-black text-[7.5pt] uppercase">
                                      <th className="border border-black p-1.5 align-middle">Item</th>
                                      <th className="border border-black p-1.5 align-middle">Description</th>
                                      <th className="border border-black p-1.5 align-middle">Country of Origin</th>
                                      <th className="border border-black p-1.5 align-middle">QTY</th>
                                      <th className="border border-black p-1.5 align-middle">Unit price EXW per item</th>
                                      <th className="border border-black p-1.5 align-middle">Transportation and all other costs incidental to delivery, per item</th>
                                      <th className="border border-black p-1.5 align-middle">Sales and other taxes payable if Contract is awarded, per item</th>
                                      <th className="border border-black p-1.5 align-middle">Cost of Incidental Services, if applicable, per item</th>
                                      <th className={`border border-black p-1.5 align-middle ${themeCol9Header}`}>Total Price, per unit (col 5+6+7+8)</th>
                                      <th className={`border border-black p-1.5 align-middle ${themeCol10Header}`}>Total Price delivered Final Destination (col 9) x (col 4)</th>
                                    </tr>

                                  </thead>
                                )}
                                <tbody>
                                  
                                  {/* Dynamic Data Rows for Page Subset */}
                                  {pageItems.map((row) => {
                                    const breakdown = computeRowBreakdown(row);
                                    const isLumpSumRow = !!row.isLumpSum;
                                    const isSplitCont = !!row.isSplitContinuation;

                                    return (
                                      <tr key={row.id} className={`border-b border-black font-serif text-black hover:bg-slate-50/50 ${isLumpSumRow ? 'bg-purple-50/40 font-semibold' : ''} ${isSplitCont ? 'bg-slate-50/70 italic' : ''}`}>
                                        <td className="border border-black p-1.5 text-center font-bold align-top font-mono text-[8pt]">
                                          {isSplitCont ? `${row.itemNo} (cont.)` : row.itemNo}
                                        </td>
                                        <td className="border border-black p-1.5 font-normal leading-snug align-top break-words whitespace-pre-wrap text-[8pt]">
                                          {isLumpSumRow ? (
                                            <strong className="text-black uppercase">{row.description}</strong>
                                          ) : (
                                            row.description || '-'
                                          )}
                                        </td>
                                        <td className="border border-black p-1 text-center font-bold align-top break-words text-[8pt]">
                                          {isSplitCont ? (
                                            <span className="text-slate-400 font-mono italic text-[7.5pt]">—</span>
                                          ) : isLumpSumRow ? (
                                            <span className="font-mono text-[7.5pt] font-bold">Philippines</span>
                                          ) : (
                                            <input
                                              type="text"
                                              value={row.countryOfOrigin}
                                              onChange={(e) => handleUpdateCountryOfOrigin(row.id, e.target.value)}
                                              className="w-full bg-transparent text-center font-bold focus:outline-none focus:bg-amber-100/50 print:bg-transparent print:border-none text-[8pt]"
                                              placeholder="Philippines"
                                            />
                                          )}
                                        </td>
                                        <td className="border border-black p-1.5 text-center font-bold font-mono align-top text-[8pt]">
                                          {isSplitCont ? <span className="text-slate-400 font-mono italic text-[7.5pt]">—</span> : (isLumpSumRow ? '1 lot' : (row.quantity || 0))}
                                        </td>
                                        <td className="border border-black p-1.5 text-right font-mono align-top text-black text-[8pt]">
                                          {isSplitCont ? <span className="text-slate-400 font-mono italic text-[7.5pt]">—</span> : (breakdown.col5_EXW > 0 ? fmtPeso(breakdown.col5_EXW) : '-')}
                                        </td>
                                        <td className="border border-black p-1.5 text-right font-mono align-top text-black text-[8pt]">
                                          {isSplitCont ? <span className="text-slate-400 font-mono italic text-[7.5pt]">—</span> : (breakdown.col6_Transpo > 0 ? fmtPeso(breakdown.col6_Transpo) : '-')}
                                        </td>
                                        <td className="border border-black p-1.5 text-right font-mono align-top text-black text-[8pt]">
                                          {isSplitCont ? <span className="text-slate-400 font-mono italic text-[7.5pt]">—</span> : (breakdown.col7_Taxes > 0 ? fmtPeso(breakdown.col7_Taxes) : '-')}
                                        </td>
                                        <td className="border border-black p-1.5 text-right font-mono align-top text-black text-[8pt]">
                                          {isSplitCont ? <span className="text-slate-400 font-mono italic text-[7.5pt]">—</span> : (breakdown.col8_Services > 0 ? fmtPeso(breakdown.col8_Services) : '-')}
                                        </td>
                                        <td className={`border border-black p-1.5 text-right font-mono align-top text-[8pt] ${themeCol9Cell}`}>
                                          {isSplitCont ? <span className="text-slate-400 font-mono italic text-[7.5pt]">—</span> : fmtPeso(breakdown.col9_UnitTotal)}
                                        </td>
                                        <td className={`border border-black p-1.5 text-right font-mono align-top text-[8pt] ${themeCol10Cell}`}>
                                          {isSplitCont ? <span className="text-slate-400 font-mono italic text-[7.5pt] font-semibold">[Item {row.itemNo} Cont.]</span> : fmtPeso(breakdown.col10_LineTotal)}
                                        </td>
                                      </tr>
                                    );
                                  })}

                                  {/* TOTAL PROJECT COST SUMMARY ROWS (Rendered only on Final Page) */}
                                  {isLastPage && (
                                    <>
                                      {/* Materials Subtotal Row */}
                                      <tr className="border-t border-black bg-slate-50 font-serif text-[8pt]">
                                        <td colSpan={3} className="border border-black p-1.5 text-right font-bold uppercase">
                                          SUBTOTAL - DIRECT MATERIALS & SUPPLY:
                                        </td>
                                        <td className="border border-black p-1.5 text-center font-mono font-bold">
                                          {items.reduce((s, i) => s + (i.quantity || 0), 0)}
                                        </td>
                                        <td colSpan={5} className="border border-black p-1.5 bg-slate-50"></td>
                                        <td className="border border-black p-1.5 text-right font-mono font-bold text-black">
                                          ₱ {fmtPeso(materialsSubtotal)}
                                        </td>
                                      </tr>

                                      {/* ONE Single Consolidated Lump Sum Row in Summary */}
                                      {totalLumpSums > 0 && (
                                        <tr className="border-t border-black bg-purple-50/60 font-serif text-[8pt]">
                                          <td colSpan={3} className="border border-black p-1.5 text-right font-bold uppercase text-purple-950">
                                            LUMP SUM - LABOR, LOGISTICS & EQUIPMENT (FROM FORM L):
                                          </td>
                                          <td className="border border-black p-1.5 text-center font-mono font-bold">1 lot</td>
                                          <td className="border border-black p-1.5 bg-slate-50 text-center text-slate-400 font-mono">-</td>
                                          <td className="border border-black p-1.5 text-right font-mono font-bold text-purple-950">₱ {fmtPeso(logisticsLumpSum)}</td>
                                          <td className="border border-black p-1.5 bg-slate-50 text-center text-slate-400 font-mono">-</td>
                                          <td className="border border-black p-1.5 text-right font-mono font-bold text-purple-950">₱ {fmtPeso(laborLumpSum + equipmentLumpSum)}</td>
                                          <td className="border border-black p-1.5 text-right font-mono font-bold text-purple-950">₱ {fmtPeso(totalLumpSums)}</td>
                                          <td className="border border-black p-1.5 text-right font-mono font-bold text-purple-950">
                                            ₱ {fmtPeso(totalLumpSums)}
                                          </td>
                                        </tr>
                                      )}

                                      {/* Final Grand Total Row */}
                                      <tr className="border-t-2 border-black bg-slate-100 font-serif font-bold text-[8.5pt]">
                                        <td colSpan={3} className="border border-black p-2 text-center uppercase tracking-wider italic font-black text-black">
                                          TOTAL CALCULATED BID PRICE (DELIVERED FINAL DESTINATION)
                                        </td>
                                        <td className="border border-black p-2 text-center font-mono font-bold">
                                          {items.reduce((s, i) => s + (i.quantity || 0), 0) + (totalLumpSums > 0 ? 1 : 0)}
                                        </td>
                                        <td colSpan={5} className="border border-black p-2 bg-slate-50 text-right text-[8pt] italic font-bold">
                                        TOTAL CALCULATED BID PRICE (DELIVERED FINAL DESTINATION)
                                        </td>
                                        <td className={`border border-black p-2 text-right font-mono text-[10pt] ${themeTotalCell}`}>
                                          PHP {totalProjectCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    </>
                                  )}

                                </tbody>
                              </table>
                            </div>

                            {/* 4. RIGHT-ALIGNED STACKED SIGNATURE SECTION (Rendered only on Final Page) */}
                            {isLastPage && (
                              <div className="pt-4 flex justify-end text-black font-serif">
                                <div className="space-y-1 text-[10pt] w-full max-w-[360px] text-right">
                                  <div>
                                    <p className="text-black text-[9pt] font-bold">Name of Authorized Signatory:</p>
                                    <p className="font-extrabold text-[11pt] uppercase text-black border-b border-black pb-0.5">{signatoryName || 'ENGR. JUAN DELA CRUZ'}</p>
                                  </div>

                                  <div>
                                    <p className="text-black text-[9pt] font-bold">Legal Capacity / Title:</p>
                                    <p className="font-bold text-[10pt] text-black border-b border-black pb-0.5">{signatoryTitle || 'Authorized Representative'}</p>
                                  </div>

                                  <div>
                                    <p className="text-black text-[9pt] font-bold">Duly authorized to sign Bid for and on behalf of:</p>
                                    <p className="font-extrabold text-[10pt] uppercase text-black border-b border-black pb-0.5">{bidderName || 'Quantum Cloud Corporation'}</p>
                                  </div>

                                  <div>
                                    <p className="text-black text-[9pt] font-bold">Date Signed:</p>
                                    <p className="font-bold text-[10pt] font-serif text-black border-b border-black pb-0.5">
                                      {dateSubmitted ? new Date(dateSubmitted).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '____________________'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                          </div>

                          {/* 5. QR CODE VERIFICATION SEAL BLOCK (Rendered on Final Page) */}
                          {isLastPage && (
                            <div className="pt-2 pb-1 border-t border-slate-300 flex items-center justify-between text-[8pt] font-mono text-black shrink-0 mt-3">
                              <div className="flex items-center gap-3">
                                <DocumentQrCode
                                  details={{
                                    companyName: bidderName || 'Bidding Entity',
                                    documentName: `Price Schedule for ${categoryLabel} (Page ${currentPageNumber} of ${totalPagesCount})`,
                                    documentNumber: `FIN-PRICESCHED-${projectRefNo || 'SCHED'}-P${currentPageNumber}`,
                                    projectTitle: projectTitle,
                                    projectRefNo: projectRefNo,
                                    procuringEntity: procuringEntity,
                                    dateTimeSubmitted: dateSubmitted || 'March 19, 2026',
                                    documentCategory: 'Financial Documents',
                                    generatedBy: bidderName || 'Bidding Entity'
                                  }}
                                  size={42}
                                  showCaption={false}
                                />
                                <div className="space-y-0.5 text-[7.5pt]">
                                  <p className="font-bold text-black uppercase">OFFICIAL GPPB FINANCIAL EXHIBIT VERIFICATION</p>
                                  <p className="text-slate-700">PBDs SECTION VIII PRICE SCHEDULE FOR {categoryLabel.toUpperCase()} (COLS 1-10)</p>
                                </div>
                              </div>
                              <div className="text-right text-[7.5pt] font-mono text-slate-700">
                                <span>VERIFIED BY BIDMAE VAULT SYSTEM</span>
                              </div>
                            </div>
                          )}

                          {/* 6. GLOBAL INFORMATIVE DOCUMENT FOOTER (ON EVERY PAGE: COMPANY NAME | REF NO | PROJECT TITLE | PAGE X OF N) */}
                          <div className="pt-1.5 border-t-2 border-black flex items-center justify-between text-[8pt] font-mono text-black shrink-0 mt-2">
                            <div className="flex items-center gap-2 max-w-[80%] truncate">
                              <span className="font-extrabold uppercase text-black">{bidderName || 'QUANTUM CLOUD CORPORATION'}</span>
                              <span className="text-slate-400 font-normal">|</span>
                              <span className="font-bold text-black">REF NO: <strong className="font-bold font-mono">{projectRefNo || 'N/A'}</strong></span>
                              {projectTitle && (
                                <>
                                  <span className="text-slate-400 font-normal">|</span>
                                  <span className="font-semibold text-slate-900 truncate uppercase">PROJECT: {projectTitle}</span>
                                </>
                              )}
                            </div>
                            <div className="font-extrabold font-mono text-black shrink-0 ml-4">
                              PAGE {currentPageNumber} OF {totalPagesCount}
                            </div>
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
                  Total Project Cost (Col 10 Sum): <span className={`font-bold font-mono text-sm ${themeAccentText}`}>₱ {totalProjectCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition shadow-lg flex items-center gap-2 ${themeBtnBg} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSaving ? 'Saving to Vault...' : 'Save & Complete Price Schedule'}</span>
                  </button>
                </div>
              </div>
            </>
          );
        })()}

      </div>
    </div>
  );
};

export const PriceSchedule4GoodsModal = PriceScheduleModal;
export type PriceSchedule4GoodsModalProps = PriceScheduleModalProps;

export default PriceScheduleModal;

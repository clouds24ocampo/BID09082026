import React, { useState, useEffect, useCallback } from 'react';
import { Tenant } from '../../../types';
import { PDFDocument } from 'pdf-lib';
import html2canvas from 'html2canvas';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import VaultErrorBoundary from '../../common/VaultErrorBoundary';
import {
  X,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  RefreshCw,
  FileSpreadsheet,
  Briefcase,
  Layers,
  Activity,
  Calculator,
  Eye,
  Sliders
} from 'lucide-react';

export interface SwaItem {
  id: string;
  itemNo: string;
  description: string;
  unit: string;
  contractQty: number; // A
  unitPrice: number;   // C
  prevQty: number;     // F
  thisQty: number;     // G
}

export interface SwaModalProps {
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

const DEFAULT_SWA_ITEMS: SwaItem[] = [
  { id: 'item-1', itemNo: 'SPL-1', description: 'Mobilization / Demobilization & Temporary Facilities', unit: 'l.s.', contractQty: 1, unitPrice: 150000, prevQty: 1, thisQty: 0 },
  { id: 'item-2', itemNo: 'SPL-2', description: 'Occupational Safety and Health Program', unit: 'l.s.', contractQty: 1, unitPrice: 85000, prevQty: 0.5, thisQty: 0.3 },
  { id: 'item-3', itemNo: '803(1)a', description: 'Structure Excavation (Common Soil)', unit: 'cu.m.', contractQty: 120, unitPrice: 480, prevQty: 120, thisQty: 0 },
  { id: 'item-4', itemNo: '900(1)c1', description: 'Structural Concrete (Class A, 28 days, 3000 psi)', unit: 'cu.m.', contractQty: 85, unitPrice: 6800, prevQty: 34, thisQty: 38.25 },
  { id: 'item-5', itemNo: '902(1)a', description: 'Reinforcing Steel Bar (Grade 40, Deformed)', unit: 'kg', contractQty: 6500, unitPrice: 78, prevQty: 2275, thisQty: 2925 },
  { id: 'item-6', itemNo: '1046(2)a1', description: '100mm CHB Non-Load Bearing Wall (including Rebar)', unit: 'sq.m.', contractQty: 240, unitPrice: 890, prevQty: 0, thisQty: 144 }
];

export const SwaModalContent: React.FC<SwaModalProps> = ({
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

  // SWA Header Fields (Accurate Philippine Gov Standard)
  const [companyName, setCompanyName] = useState<string>(tenant?.companyName || '');
  const [projectTitle, setProjectTitle] = useState<string>(activeProjectTitle || '');
  const [projectRefNo, setProjectRefNo] = useState<string>(activeProjectRefNo || '');
  const [procuringEntity, setProcuringEntity] = useState<string>(activeProcuringEntity || '');
  const [provinceName, setProvinceName] = useState<string>('');
  const [municipalityName, setMunicipalityName] = useState<string>('');
  const [programTitle, setProgramTitle] = useState<string>('STATEMENT OF WORK ACCOMPLISHED (SWA)');
  const [monthlyReportNo, setMonthlyReportNo] = useState<string>('Monthly Progress Report No. 1');
  const [dateSubmitted, setDateSubmitted] = useState<string>(todayStr);
  const [dateCovered, setDateCovered] = useState<string>(`As of ${todayStr}`);

  // Schedule & Progress Tracking
  const [targetProgressPercent, setTargetProgressPercent] = useState<number>(65.00);
  const [actualStartDate, setActualStartDate] = useState<string>('');
  const [targetCompletionDate, setTargetCompletionDate] = useState<string>('');
  const [projectDurationDays, setProjectDurationDays] = useState<string>('120 C.D.');

  // Work Breakdown Items
  const [items, setItems] = useState<SwaItem[]>(DEFAULT_SWA_ITEMS);

  // Statutory Deductions (Image 2 & 3 Compliance)
  const [recoupmentRate, setRecoupmentRate] = useState<number>(15); // 15% Advance Payment Recoupment
  const [retentionRate, setRetentionRate] = useState<number>(10);   // 10% Retention Money
  const [vatRate, setVatRate] = useState<number>(5);               // 5% Final Value Added Tax
  const [ewtRate, setEwtRate] = useState<number>(2);               // 2% Expanded Withholding Tax
  const [useNetOfVatFormula, setUseNetOfVatFormula] = useState<boolean>(true); // (rate x 100/1.12 of Work Completed)

  // View Mode: Master Matrix (Landscape) vs Summary of Payments (Landscape) vs Both
  const [activeSheetView, setActiveSheetView] = useState<'matrix' | 'summary' | 'both'>('matrix');

  // Signatories (5-Party Gov Standard from uploaded forms)
  const [preparedBySignatory, setPreparedBySignatory] = useState<string>(tenant?.authorizedSignatory?.name || 'CONTRACTOR PROJECT MANAGER');
  const [preparedByTitle, setPreparedByTitle] = useState<string>(tenant?.authorizedSignatory?.title || 'Project Manager / Contractor');
  const [verifiedBySignatory, setVerifiedBySignatory] = useState<string>(procuringEntityContactPerson || 'Engr. Municipal/Provincial Engineer');
  const [verifiedByTitle, setVerifiedByTitle] = useState<string>('Prov./City/Mun. Engineer');
  const [recommendedBySignatory, setRecommendedBySignatory] = useState<string>('Project Focal Person');
  const [recommendedByTitle, setRecommendedByTitle] = useState<string>('Focal Person / Supervising Engineer');
  const [approvedBySignatory, setApprovedBySignatory] = useState<string>(propHeadOfProcuringEntity || 'Governor / City Mayor / Mun. Mayor');
  const [approvedByTitle, setApprovedByTitle] = useState<string>(propHeadOfProcuringEntityPosition || 'Head of Procuring Entity');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('');

  const projectScopeKey = (projectRefNo || selectedOppId || activeProjectRefNo || 'default').replace(/[^a-zA-Z0-9]/g, '_');
  const tenantKey = tenant?.id || 'default';

  // 100% Accurate Calculations per Item (Columns A to Q)
  const computedItems = items.map((it) => {
    const totalAmount = it.contractQty * it.unitPrice; // D = A * C
    return {
      ...it,
      totalAmount
    };
  });

  const totalContractAmount = computedItems.reduce((acc, it) => acc + it.totalAmount, 0); // Total TCV

  const enrichedItems = computedItems.map((it) => {
    const weightPercent = totalContractAmount > 0 ? (it.totalAmount / totalContractAmount) * 100 : 0; // E = (D/TCV)*100
    const toDateQty = it.prevQty + it.thisQty; // H = F + G

    // Accomplishment relative to item (L, M, N)
    const prevItemAccomplishmentPercent = it.contractQty > 0 ? (it.prevQty / it.contractQty) * 100 : 0; // L = (F/A)*100
    const thisItemAccomplishmentPercent = it.contractQty > 0 ? (it.thisQty / it.contractQty) * 100 : 0; // M = (G/A)*100
    const toDateItemAccomplishmentPercent = prevItemAccomplishmentPercent + thisItemAccomplishmentPercent; // N = L + M

    // Total Project Accomplishment % (I, J, K)
    const prevProjectAccomplishmentPercent = (prevItemAccomplishmentPercent / 100) * weightPercent; // I = (F/A)*E
    const thisProjectAccomplishmentPercent = (thisItemAccomplishmentPercent / 100) * weightPercent; // J = (G*E)/A
    const toDateProjectAccomplishmentPercent = prevProjectAccomplishmentPercent + thisProjectAccomplishmentPercent; // K = I + J

    // Costs (O, P, Q)
    const prevCost = it.prevQty * it.unitPrice; // O = F * C
    const thisCost = it.thisQty * it.unitPrice; // P = G * C
    const toDateCost = prevCost + thisCost;    // Q = O + P

    return {
      ...it,
      weightPercent,
      toDateQty,
      prevItemAccomplishmentPercent,
      thisItemAccomplishmentPercent,
      toDateItemAccomplishmentPercent,
      prevProjectAccomplishmentPercent,
      thisProjectAccomplishmentPercent,
      toDateProjectAccomplishmentPercent,
      prevCost,
      thisCost,
      toDateCost
    };
  });

  // Overall Totals
  const totalWeightPercent = enrichedItems.reduce((acc, it) => acc + it.weightPercent, 0);
  const totalPrevAccomplishmentPercent = enrichedItems.reduce((acc, it) => acc + it.prevProjectAccomplishmentPercent, 0);
  const totalThisAccomplishmentPercent = enrichedItems.reduce((acc, it) => acc + it.thisProjectAccomplishmentPercent, 0);
  const totalToDateAccomplishmentPercent = totalPrevAccomplishmentPercent + totalThisAccomplishmentPercent;

  const totalPrevCost = enrichedItems.reduce((acc, it) => acc + it.prevCost, 0);
  const totalThisCost = enrichedItems.reduce((acc, it) => acc + it.thisCost, 0); // Work completed this period (#3)
  const totalToDateCost = totalPrevCost + totalThisCost; // Total value of work to date (#1)

  // Slippage Calculation (+/-)
  const slippagePercent = totalToDateAccomplishmentPercent - targetProgressPercent;

  // Deductions for this period (Image 2 Formulas)
  const retentionDeduction = totalThisCost * (retentionRate / 100);
  const ewtDeduction = useNetOfVatFormula 
    ? (totalThisCost * (100 / 112)) * (ewtRate / 100)
    : totalThisCost * (ewtRate / 100);
  const vatDeduction = useNetOfVatFormula
    ? (totalThisCost * (100 / 112)) * (vatRate / 100)
    : totalThisCost * (vatRate / 100);
  const recoupmentDeduction = totalThisCost * (recoupmentRate / 100);
  const totalDeductions = retentionDeduction + ewtDeduction + vatDeduction + recoupmentDeduction;
  const netPayableThisPeriod = totalThisCost - totalDeductions;

  // Function to sync 100% from Section VI and Detailed Estimates
  const syncFromSectionVI = useCallback((forceRefresh: boolean = false) => {
    const scopeKey = projectRefNo || activeProjectRefNo || selectedOppId;
    if (!scopeKey) return false;

    const secViKeys = [
      `bidocs_sec_vi_${tenantKey}_${scopeKey}`,
      `bidocs_sec_vi_services_${tenantKey}_${scopeKey}`,
      selectedOppId ? `bidocs_sec_vi_${tenantKey}_${selectedOppId}` : ''
    ].filter(Boolean);

    const detailedKey = `bidocs_detailed_estimates_${tenantKey}_${scopeKey}`;

    // Check detailed estimates first
    const savedDet = localStorage.getItem(detailedKey);
    if (savedDet) {
      try {
        const parsed = JSON.parse(savedDet);
        if (parsed.materials && Array.isArray(parsed.materials) && parsed.materials.length > 0) {
          const syncedItems: SwaItem[] = parsed.materials.map((m: any, idx: number) => ({
            id: `swa-sync-${idx}-${Date.now()}`,
            itemNo: m.itemNo || `Item ${idx + 1}`,
            description: m.description || `Scope Item ${idx + 1}`,
            unit: m.unit || 'l.s.',
            contractQty: Number(m.quantity) || 1,
            unitPrice: Number(m.unitPrice) || 0,
            prevQty: 0,
            thisQty: Number(m.quantity) ? Number(m.quantity) * 0.5 : 0.5
          }));
          setItems(syncedItems);
          setSyncStatus(`Synced ${syncedItems.length} items from Detailed Estimates`);
          return true;
        }
      } catch (e) {
        console.error('[SWA] Error parsing detailed estimates:', e);
      }
    }

    // Check Section VI Schedule of Requirements
    for (const k of secViKeys) {
      const savedSec = localStorage.getItem(k);
      if (savedSec) {
        try {
          const parsed = JSON.parse(savedSec);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const syncedItems: SwaItem[] = parsed.map((item: any, idx: number) => {
              const qtyStr = item.quantity || '1';
              const qtyMatch = `${qtyStr}`.match(/([\d,.]+)\s*(.*)/);
              const qty = qtyMatch ? parseFloat(qtyMatch[1].replace(/,/g, '')) || 1 : 1;
              const unit = qtyMatch && qtyMatch[2] ? qtyMatch[2].trim() : (item.unit || 'l.s.');

              const unitPrice = item.unitAmount
                ? parseFloat(`${item.unitAmount}`.replace(/[^0-9.]/g, '')) || 0
                : item.unitPrice
                  ? (typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(`${item.unitPrice}`.replace(/[^0-9.]/g, '')) || 0)
                  : item.unitCost
                    ? parseFloat(`${item.unitCost}`.replace(/[^0-9.]/g, '')) || 0
                    : 1000;

              return {
                id: `swa-secvi-${idx}-${Date.now()}`,
                itemNo: item.itemNumber || item.itemNo || `Item ${idx + 1}`,
                description: item.description || item.specification || `Scope Item ${idx + 1}`,
                unit,
                contractQty: qty,
                unitPrice,
                prevQty: 0,
                thisQty: qty * 0.5
              };
            });
            setItems(syncedItems);
            setSyncStatus(`Synced ${syncedItems.length} items from Section VI Requirements`);
            return true;
          }
        } catch (e) {
          console.error('[SWA] Error parsing Section VI:', e);
        }
      }
    }

    setSyncStatus('No Section VI saved items found for this project code. Using defaults.');
    return false;
  }, [projectRefNo, activeProjectRefNo, selectedOppId, tenantKey]);

  useEffect(() => {
    const list = getOpportunityProjects(tenantKey);
    setOppProjects(list);

    if (tenant?.companyName) setCompanyName(tenant.companyName);
    if (tenant?.authorizedSignatory?.name) setPreparedBySignatory(tenant.authorizedSignatory.name);
    if (tenant?.authorizedSignatory?.title) setPreparedByTitle(tenant.authorizedSignatory.title);

    const storageKey = `bidocs_swa_${tenantKey}_${projectScopeKey}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.projectTitle) setProjectTitle(parsed.projectTitle);
        if (parsed.projectRefNo) setProjectRefNo(parsed.projectRefNo);
        if (parsed.procuringEntity) setProcuringEntity(parsed.procuringEntity);
        if (parsed.provinceName) setProvinceName(parsed.provinceName);
        if (parsed.municipalityName) setMunicipalityName(parsed.municipalityName);
        if (parsed.programTitle) setProgramTitle(parsed.programTitle);
        if (parsed.monthlyReportNo) setMonthlyReportNo(parsed.monthlyReportNo);
        if (parsed.dateSubmitted) setDateSubmitted(parsed.dateSubmitted);
        if (parsed.dateCovered) setDateCovered(parsed.dateCovered);
        if (parsed.targetProgressPercent !== undefined) setTargetProgressPercent(parsed.targetProgressPercent);
        if (parsed.actualStartDate) setActualStartDate(parsed.actualStartDate);
        if (parsed.targetCompletionDate) setTargetCompletionDate(parsed.targetCompletionDate);
        if (parsed.projectDurationDays) setProjectDurationDays(parsed.projectDurationDays);
        if (Array.isArray(parsed.items) && parsed.items.length > 0) setItems(parsed.items);
        if (parsed.recoupmentRate !== undefined) setRecoupmentRate(parsed.recoupmentRate);
        if (parsed.retentionRate !== undefined) setRetentionRate(parsed.retentionRate);
        if (parsed.vatRate !== undefined) setVatRate(parsed.vatRate);
        if (parsed.ewtRate !== undefined) setEwtRate(parsed.ewtRate);
        if (parsed.useNetOfVatFormula !== undefined) setUseNetOfVatFormula(parsed.useNetOfVatFormula);
        if (parsed.preparedBySignatory) setPreparedBySignatory(parsed.preparedBySignatory);
        if (parsed.preparedByTitle) setPreparedByTitle(parsed.preparedByTitle);
        if (parsed.verifiedBySignatory) setVerifiedBySignatory(parsed.verifiedBySignatory);
        if (parsed.verifiedByTitle) setVerifiedByTitle(parsed.verifiedByTitle);
        if (parsed.recommendedBySignatory) setRecommendedBySignatory(parsed.recommendedBySignatory);
        if (parsed.recommendedByTitle) setRecommendedByTitle(parsed.recommendedByTitle);
        if (parsed.approvedBySignatory) setApprovedBySignatory(parsed.approvedBySignatory);
        if (parsed.approvedByTitle) setApprovedByTitle(parsed.approvedByTitle);
        return;
      }
    } catch (e) {
      console.error('[SWA] Storage load error:', e);
    }

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
  }, [tenant, activeProjectRefNo, projectScopeKey, tenantKey]);

  const handleSaveState = (newItems?: SwaItem[]) => {
    const storageKey = `bidocs_swa_${tenantKey}_${projectScopeKey}`;
    const payload = {
      companyName,
      projectTitle,
      projectRefNo,
      procuringEntity,
      provinceName,
      municipalityName,
      programTitle,
      monthlyReportNo,
      dateSubmitted,
      dateCovered,
      targetProgressPercent,
      actualStartDate,
      targetCompletionDate,
      projectDurationDays,
      items: newItems || items,
      recoupmentRate,
      retentionRate,
      vatRate,
      ewtRate,
      useNetOfVatFormula,
      preparedBySignatory,
      preparedByTitle,
      verifiedBySignatory,
      verifiedByTitle,
      recommendedBySignatory,
      recommendedByTitle,
      approvedBySignatory,
      approvedByTitle
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error('[SWA] Save state error:', e);
    }
  };

  const handleAddItem = () => {
    const newItem: SwaItem = {
      id: `item-${Date.now()}`,
      itemNo: `Item-${items.length + 1}`,
      description: 'New Scope / BOQ Item',
      unit: 'l.s.',
      contractQty: 1,
      unitPrice: 0,
      prevQty: 0,
      thisQty: 0
    };
    const updated = [...items, newItem];
    setItems(updated);
    handleSaveState(updated);
  };

  const handleRemoveItem = (id: string) => {
    const updated = items.filter(it => it.id !== id);
    setItems(updated);
    handleSaveState(updated);
  };

  const handleUpdateItem = (id: string, field: keyof SwaItem, value: any) => {
    const updated = items.map(it => (it.id === id ? { ...it, [field]: value } : it));
    setItems(updated);
    handleSaveState(updated);
  };

  // PDF Generation strictly in Philippine Legal Landscape (13" x 8.5" = 936pt x 612pt)
  const generatePdf = async (): Promise<string | null> => {
    const matrixSheet = document.getElementById('swa-matrix-sheet');
    const summarySheet = document.getElementById('swa-summary-sheet');
    if (!matrixSheet && !summarySheet) return null;

    try {
      setIsSaving(true);
      handleSaveState();

      const pdfDoc = await PDFDocument.create();
      // LEGAL_LANDSCAPE: [936, 612]
      const LEGAL_LANDSCAPE: [number, number] = [936, 612];

      const renderSheetToPage = async (sheetEl: HTMLElement) => {
        const canvas = await html2canvas(sheetEl, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const page = pdfDoc.addPage(LEGAL_LANDSCAPE);
        const img = await pdfDoc.embedPng(imgData);

        const margin = 16;
        const printableWidth = LEGAL_LANDSCAPE[0] - margin * 2; // 904 pt
        const printableHeight = LEGAL_LANDSCAPE[1] - margin * 2; // 580 pt

        const imgAspect = canvas.width / canvas.height;
        let drawWidth = printableWidth;
        let drawHeight = printableWidth / imgAspect;

        if (drawHeight > printableHeight) {
          drawHeight = printableHeight;
          drawWidth = printableHeight * imgAspect;
        }

        const x = margin + (printableWidth - drawWidth) / 2;
        const y = LEGAL_LANDSCAPE[1] - margin - drawHeight;

        page.drawImage(img, { x, y, width: drawWidth, height: drawHeight });
      };

      if (activeSheetView === 'matrix' && matrixSheet) {
        await renderSheetToPage(matrixSheet);
      } else if (activeSheetView === 'summary' && summarySheet) {
        await renderSheetToPage(summarySheet);
      } else {
        if (matrixSheet) await renderSheetToPage(matrixSheet);
        if (summarySheet) await renderSheetToPage(summarySheet);
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error('[SWA] Generate PDF error:', err);
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
    a.download = `Statement_of_Work_Accomplished_SWA_${projectRefNo || 'Project'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveAndComplete = async () => {
    const dataUrl = await generatePdf();
    if (dataUrl && onSaveAndComplete) {
      onSaveAndComplete(
        dataUrl,
        'Statement of Work Accomplished (SWA)',
        projectRefNo,
        projectTitle
      );
    }
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/30">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              Statement of Work Accomplished (SWA)
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-mono">
                Philippine Legal Landscape (13" x 8.5")
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Annex F / SALINTUBIG / DPWH Progress Billing Matrix • Columns (A to Q) & Deductions Summary
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => syncFromSectionVI(true)}
            title="Sync all BOQ items and Unit Prices from Section VI Requirements"
            className="px-3 py-1.5 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/60 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sync Section VI Inputs</span>
          </button>
          <button
            onClick={handleExportPdf}
            disabled={isSaving}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Download Landscape PDF</span>
          </button>
          <button
            onClick={handleSaveAndComplete}
            disabled={isSaving}
            className="px-4 py-1.5 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/30 border border-emerald-400/40 cursor-pointer disabled:opacity-50"
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

      {/* Main Container */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Form Controls Drawer (4 cols) */}
        <div className="lg:col-span-4 p-4 overflow-y-auto border-r border-slate-800 space-y-4 bg-slate-900/40">
          {syncStatus && (
            <div className="p-2.5 bg-indigo-950/80 border border-indigo-800/80 rounded-lg text-xs text-indigo-300 flex items-center justify-between">
              <span>{syncStatus}</span>
              <button onClick={() => setSyncStatus('')} className="text-indigo-400 hover:text-white ml-2">×</button>
            </div>
          )}

          {/* View Toggle */}
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-400" /> Sheet Display Mode
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setActiveSheetView('matrix')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition cursor-pointer ${
                  activeSheetView === 'matrix'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Detailed Matrix
              </button>
              <button
                type="button"
                onClick={() => setActiveSheetView('summary')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition cursor-pointer ${
                  activeSheetView === 'summary'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Payments Summary
              </button>
              <button
                type="button"
                onClick={() => setActiveSheetView('both')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition cursor-pointer ${
                  activeSheetView === 'both'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                2-Page Package
              </button>
            </div>
          </div>

          {/* Project Header Info */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Project & Administrative Metadata
            </h3>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Project Title</label>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => { setProjectTitle(e.target.value); handleSaveState(); }}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Contract / Ref No.</label>
                <input
                  type="text"
                  value={projectRefNo}
                  onChange={(e) => { setProjectRefNo(e.target.value); handleSaveState(); }}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Report / Billing No.</label>
                <input
                  type="text"
                  value={monthlyReportNo}
                  onChange={(e) => { setMonthlyReportNo(e.target.value); handleSaveState(); }}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Procuring Entity / LGU</label>
                <input
                  type="text"
                  value={procuringEntity}
                  onChange={(e) => { setProcuringEntity(e.target.value); handleSaveState(); }}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Contractor / Firm</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => { setCompanyName(e.target.value); handleSaveState(); }}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Province</label>
                <input
                  type="text"
                  placeholder="e.g. Province of Rizal"
                  value={provinceName}
                  onChange={(e) => { setProvinceName(e.target.value); handleSaveState(); }}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Municipality / City</label>
                <input
                  type="text"
                  placeholder="e.g. Municipality of Antipolo"
                  value={municipalityName}
                  onChange={(e) => { setMunicipalityName(e.target.value); handleSaveState(); }}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* S-Curve & Progress Tracking */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> S-Curve & Schedule Tracking
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-950 border border-slate-800 p-2 rounded-lg">
                <p className="text-[9px] text-slate-400 uppercase">Target Progress</p>
                <div className="flex items-center justify-center mt-1">
                  <input
                    type="number"
                    step="0.01"
                    value={targetProgressPercent}
                    onChange={(e) => { setTargetProgressPercent(Number(e.target.value)); handleSaveState(); }}
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-amber-300 font-mono font-bold text-center"
                  />
                  <span className="text-xs text-slate-500 ml-1">%</span>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-2 rounded-lg">
                <p className="text-[9px] text-slate-400 uppercase">Actual Accomplished</p>
                <p className="text-xs font-mono font-bold text-emerald-400 mt-1.5">
                  {totalToDateAccomplishmentPercent.toFixed(2)}%
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-2 rounded-lg">
                <p className="text-[9px] text-slate-400 uppercase">Slippage (+/-)</p>
                <p className={`text-xs font-mono font-bold mt-1.5 ${slippagePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {slippagePercent >= 0 ? `+${slippagePercent.toFixed(2)}%` : `${slippagePercent.toFixed(2)}%`}
                </p>
              </div>
            </div>
          </div>

          {/* Work Breakdown Manager */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> BOQ Items Breakdown ({items.length})
              </h3>
              <button
                onClick={handleAddItem}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Row
              </button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {items.map((it, idx) => (
                <div key={it.id} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between gap-1.5">
                    <input
                      type="text"
                      value={it.itemNo}
                      onChange={(e) => handleUpdateItem(it.id, 'itemNo', e.target.value)}
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-blue-300 font-mono font-bold"
                      placeholder="Item"
                    />
                    <input
                      type="text"
                      value={it.description}
                      onChange={(e) => handleUpdateItem(it.id, 'description', e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                      placeholder="Item of Work Description"
                    />
                    <button
                      onClick={() => handleRemoveItem(it.id)}
                      className="p-1 text-slate-500 hover:text-red-400 rounded transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                    <div>
                      <span className="text-slate-500">Qty (A)</span>
                      <input
                        type="number"
                        value={it.contractQty}
                        onChange={(e) => handleUpdateItem(it.id, 'contractQty', Number(e.target.value))}
                        className="w-full mt-0.5 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500">Unit (B)</span>
                      <input
                        type="text"
                        value={it.unit}
                        onChange={(e) => handleUpdateItem(it.id, 'unit', e.target.value)}
                        className="w-full mt-0.5 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-white text-center"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500">Unit Cost (C)</span>
                      <input
                        type="number"
                        value={it.unitPrice}
                        onChange={(e) => handleUpdateItem(it.id, 'unitPrice', Number(e.target.value))}
                        className="w-full mt-0.5 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500">This Qty (G)</span>
                      <input
                        type="number"
                        value={it.thisQty}
                        onChange={(e) => handleUpdateItem(it.id, 'thisQty', Number(e.target.value))}
                        className="w-full mt-0.5 bg-slate-900 border border-emerald-600/50 rounded px-1 py-0.5 text-emerald-400 font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Statutory Deductions & Tax Formulas */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5" /> Statutory Deductions & Recoupment
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Retention (%)</label>
                <input
                  type="number"
                  value={retentionRate}
                  onChange={(e) => { setRetentionRate(Number(e.target.value)); handleSaveState(); }}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Advance Recoupment (%)</label>
                <input
                  type="number"
                  value={recoupmentRate}
                  onChange={(e) => { setRecoupmentRate(Number(e.target.value)); handleSaveState(); }}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Withholding Tax (2%)</label>
                <input
                  type="number"
                  value={ewtRate}
                  onChange={(e) => { setEwtRate(Number(e.target.value)); handleSaveState(); }}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Value Added Tax (5%)</label>
                <input
                  type="number"
                  value={vatRate}
                  onChange={(e) => { setVatRate(Number(e.target.value)); handleSaveState(); }}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-[11px] text-slate-300 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={useNetOfVatFormula}
                onChange={(e) => { setUseNetOfVatFormula(e.target.checked); handleSaveState(); }}
                className="rounded bg-slate-950 border-slate-700 text-blue-500 focus:ring-0"
              />
              <span>Use Gov Formula: <code>rate × 100/1.12 of Gross</code></span>
            </label>
          </div>

          {/* Signatories Configuration */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" /> Signatories & Approvers
            </h3>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[9.5px] text-slate-400 uppercase font-semibold">Prepared By (Contractor PM)</label>
                <input
                  type="text"
                  value={preparedBySignatory}
                  onChange={(e) => { setPreparedBySignatory(e.target.value); handleSaveState(); }}
                  className="w-full mt-0.5 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[9.5px] text-slate-400 uppercase font-semibold">Check & Verified (LGU / Resident Engineer)</label>
                <input
                  type="text"
                  value={verifiedBySignatory}
                  onChange={(e) => { setVerifiedBySignatory(e.target.value); handleSaveState(); }}
                  className="w-full mt-0.5 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[9.5px] text-slate-400 uppercase font-semibold">Recommended By (Focal Person)</label>
                <input
                  type="text"
                  value={recommendedBySignatory}
                  onChange={(e) => { setRecommendedBySignatory(e.target.value); handleSaveState(); }}
                  className="w-full mt-0.5 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[9.5px] text-slate-400 uppercase font-semibold">Approved By (HoPE / Governor / Mayor)</label>
                <input
                  type="text"
                  value={approvedBySignatory}
                  onChange={(e) => { setApprovedBySignatory(e.target.value); handleSaveState(); }}
                  className="w-full mt-0.5 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview Sheet - Landscape (8 cols) */}
        <div className="lg:col-span-8 p-5 overflow-y-auto bg-slate-950 flex flex-col items-center space-y-6">
          {/* SHEET 1: Master Detailed SWA Matrix (Landscape) */}
          {(activeSheetView === 'matrix' || activeSheetView === 'both') && (
            <div
              id="swa-matrix-sheet"
              className="w-[1248px] min-h-[816px] bg-white text-slate-900 p-8 shadow-2xl rounded-sm flex flex-col justify-between text-[9.5px] leading-tight shrink-0 font-sans"
              style={{ boxSizing: 'border-box' }}
            >
              <div>
                {/* Official Title Header */}
                <div className="text-center pb-2 mb-3 border-b-2 border-slate-900">
                  <h1 className="text-base font-black tracking-wide uppercase text-slate-900">
                    STATEMENT OF WORK ACCOMPLISHED (SWA)
                  </h1>
                  {programTitle && (
                    <p className="text-[10px] font-bold text-slate-700 uppercase mt-0.5">
                      {programTitle}
                    </p>
                  )}
                </div>

                {/* Project Header Info Grid */}
                <div className="grid grid-cols-2 gap-4 mb-3 text-[10px] leading-snug">
                  <div className="space-y-0.5">
                    <p><strong>Project Title</strong> : {projectTitle || 'N/A'}</p>
                    <p><strong>Implementing Partner / Entity</strong> : {procuringEntity || 'Procuring Entity / LGU'}</p>
                    <p><strong>Contractor / Firm</strong> : {companyName || 'Contractor Name'}</p>
                    <p><strong>Contract / Ref. No.</strong> : <span className="font-mono font-semibold">{projectRefNo || 'N/A'}</span></p>
                  </div>
                  <div className="space-y-0.5 text-right">
                    <p><strong>{monthlyReportNo}</strong></p>
                    <p><strong>Date Covered</strong> : {dateCovered}</p>
                    <p><strong>Date Submitted</strong> : {dateSubmitted}</p>
                    <p><strong>Total Contract Amount</strong> : <span className="font-mono font-bold text-blue-900">₱ {totalContractAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></p>
                  </div>
                </div>

                {/* Master Multi-Level Column SWA Table (Columns A to Q) */}
                <table className="w-full border-collapse border border-slate-900 text-[8.5px] mb-2 text-center">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-900">
                      <th rowSpan={2} className="border border-slate-900 p-1 w-12">Bill No</th>
                      <th rowSpan={2} className="border border-slate-900 p-1 text-left">Description of Item of Work</th>
                      <th rowSpan={2} className="border border-slate-900 p-1 w-10">Qty.</th>
                      <th rowSpan={2} className="border border-slate-900 p-1 w-10">Unit</th>
                      <th rowSpan={2} className="border border-slate-900 p-1 w-18">Unit Cost</th>
                      <th rowSpan={2} className="border border-slate-900 p-1 w-20">Total Amount</th>
                      <th rowSpan={2} className="border border-slate-900 p-1 w-12">Wt. %</th>
                      <th colSpan={3} className="border border-slate-900 p-0.5 bg-slate-300">Total Quantity</th>
                      <th colSpan={3} className="border border-slate-900 p-0.5 bg-slate-300">Total Accomplishment %</th>
                      <th colSpan={3} className="border border-slate-900 p-0.5 bg-slate-300">Total Item Accomplishment %</th>
                      <th colSpan={3} className="border border-slate-900 p-0.5 bg-slate-300">Total Cost (₱)</th>
                    </tr>
                    <tr className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-900 text-[8px]">
                      {/* Total Quantity */}
                      <th className="border border-slate-900 p-0.5 w-11">Previous Billing</th>
                      <th className="border border-slate-900 p-0.5 w-11">This Billing</th>
                      <th className="border border-slate-900 p-0.5 w-11">To Date</th>
                      {/* Total Accomplishment % */}
                      <th className="border border-slate-900 p-0.5 w-12">Previous Billing</th>
                      <th className="border border-slate-900 p-0.5 w-12">This Billing</th>
                      <th className="border border-slate-900 p-0.5 w-12">To Date</th>
                      {/* Total Item Accomplishment % */}
                      <th className="border border-slate-900 p-0.5 w-12">Previous Billing</th>
                      <th className="border border-slate-900 p-0.5 w-12">This Billing</th>
                      <th className="border border-slate-900 p-0.5 w-12">To Date</th>
                      {/* Total Cost */}
                      <th className="border border-slate-900 p-0.5 w-18">Previous Billing</th>
                      <th className="border border-slate-900 p-0.5 w-18">This Billing</th>
                      <th className="border border-slate-900 p-0.5 w-18">To Date</th>
                    </tr>
                    {/* Formula Letter Designation Row */}
                    <tr className="bg-slate-50 text-slate-600 font-mono text-[7.5px] border-b border-slate-900 font-bold">
                      <th className="border border-slate-900 p-0.5"></th>
                      <th className="border border-slate-900 p-0.5"></th>
                      <th className="border border-slate-900 p-0.5">A</th>
                      <th className="border border-slate-900 p-0.5">B</th>
                      <th className="border border-slate-900 p-0.5">C</th>
                      <th className="border border-slate-900 p-0.5">D</th>
                      <th className="border border-slate-900 p-0.5">E</th>
                      <th className="border border-slate-900 p-0.5">F</th>
                      <th className="border border-slate-900 p-0.5">G</th>
                      <th className="border border-slate-900 p-0.5">H = (F+G)</th>
                      <th className="border border-slate-900 p-0.5">I</th>
                      <th className="border border-slate-900 p-0.5">J = (G*E)/A</th>
                      <th className="border border-slate-900 p-0.5">K = (I+J)</th>
                      <th className="border border-slate-900 p-0.5">L</th>
                      <th className="border border-slate-900 p-0.5">M = (G/A)*100</th>
                      <th className="border border-slate-900 p-0.5">N = (L+M)</th>
                      <th className="border border-slate-900 p-0.5">O</th>
                      <th className="border border-slate-900 p-0.5">P = (G*C)</th>
                      <th className="border border-slate-900 p-0.5">Q = (O+P)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrichedItems.map((it, idx) => (
                      <tr key={it.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="border border-slate-900 p-1 font-mono font-bold">{it.itemNo}</td>
                        <td className="border border-slate-900 p-1 text-left font-medium">{it.description}</td>
                        <td className="border border-slate-900 p-1 font-mono">{it.contractQty.toLocaleString('en-PH')}</td>
                        <td className="border border-slate-900 p-1">{it.unit}</td>
                        <td className="border border-slate-900 p-1 font-mono text-right">{it.unitPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                        <td className="border border-slate-900 p-1 font-mono font-semibold text-right">{it.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                        <td className="border border-slate-900 p-1 font-mono">{it.weightPercent.toFixed(2)}%</td>
                        
                        {/* Total Quantity */}
                        <td className="border border-slate-900 p-1 font-mono">{it.prevQty.toLocaleString('en-PH')}</td>
                        <td className="border border-slate-900 p-1 font-mono font-bold text-blue-900">{it.thisQty.toLocaleString('en-PH')}</td>
                        <td className="border border-slate-900 p-1 font-mono font-semibold">{it.toDateQty.toLocaleString('en-PH')}</td>

                        {/* Total Accomplishment % */}
                        <td className="border border-slate-900 p-1 font-mono">{it.prevProjectAccomplishmentPercent.toFixed(2)}%</td>
                        <td className="border border-slate-900 p-1 font-mono font-bold text-blue-900">{it.thisProjectAccomplishmentPercent.toFixed(2)}%</td>
                        <td className="border border-slate-900 p-1 font-mono font-semibold">{it.toDateProjectAccomplishmentPercent.toFixed(2)}%</td>

                        {/* Total Item Accomplishment % */}
                        <td className="border border-slate-900 p-1 font-mono">{it.prevItemAccomplishmentPercent.toFixed(2)}%</td>
                        <td className="border border-slate-900 p-1 font-mono font-bold text-blue-900">{it.thisItemAccomplishmentPercent.toFixed(2)}%</td>
                        <td className="border border-slate-900 p-1 font-mono font-semibold">{it.toDateItemAccomplishmentPercent.toFixed(2)}%</td>

                        {/* Total Cost */}
                        <td className="border border-slate-900 p-1 font-mono text-right">{it.prevCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                        <td className="border border-slate-900 p-1 font-mono font-bold text-blue-950 text-right">{it.thisCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                        <td className="border border-slate-900 p-1 font-mono font-bold text-right">{it.toDateCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}

                    {/* Summary Totals Row */}
                    <tr className="bg-amber-100/70 font-bold text-slate-900 border-t-2 border-slate-900">
                      <td colSpan={5} className="border border-slate-900 p-1 text-center uppercase tracking-wider font-black">
                        TOTAL
                      </td>
                      <td className="border border-slate-900 p-1 font-mono text-right font-black">
                        ₱ {totalContractAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border border-slate-900 p-1 font-mono font-black">
                        {totalWeightPercent.toFixed(2)}%
                      </td>
                      <td colSpan={3} className="border border-slate-900 p-1 bg-amber-50"></td>
                      <td className="border border-slate-900 p-1 font-mono">{totalPrevAccomplishmentPercent.toFixed(2)}%</td>
                      <td className="border border-slate-900 p-1 font-mono font-bold text-blue-900">{totalThisAccomplishmentPercent.toFixed(2)}%</td>
                      <td className="border border-slate-900 p-1 font-mono font-black text-emerald-950">{totalToDateAccomplishmentPercent.toFixed(2)}%</td>
                      <td colSpan={3} className="border border-slate-900 p-1 bg-amber-50"></td>
                      <td className="border border-slate-900 p-1 font-mono text-right">{totalPrevCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                      <td className="border border-slate-900 p-1 font-mono font-black text-blue-950 text-right">₱ {totalThisCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                      <td className="border border-slate-900 p-1 font-mono font-black text-right">₱ {totalToDateCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bottom 5 Signatories Grid (from uploaded Image 3) */}
              <div className="pt-4 border-t-2 border-slate-900">
                <div className="grid grid-cols-5 gap-4 text-center text-[9px]">
                  <div className="space-y-1">
                    <p className="text-slate-600 font-semibold">Prepared by:</p>
                    <div className="h-9"></div>
                    <p className="font-bold underline uppercase text-slate-950">{preparedBySignatory}</p>
                    <p className="text-slate-600">{preparedByTitle}</p>
                    <p className="text-[8px] text-slate-500 font-mono mt-1">Date: {dateSubmitted}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-slate-600 font-semibold">Check and verified by:</p>
                    <div className="h-9"></div>
                    <p className="font-bold underline uppercase text-slate-950">{verifiedBySignatory}</p>
                    <p className="text-slate-600">{verifiedByTitle}</p>
                    <p className="text-[8px] text-slate-500 font-mono mt-1">Date: ___________</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-slate-600 font-semibold">Recommended by:</p>
                    <div className="h-9"></div>
                    <p className="font-bold underline uppercase text-slate-950">{recommendedBySignatory}</p>
                    <p className="text-slate-600">{recommendedByTitle}</p>
                    <p className="text-[8px] text-slate-500 font-mono mt-1">Date: ___________</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-slate-600 font-semibold">Approved by:</p>
                    <div className="h-9"></div>
                    <p className="font-bold underline uppercase text-slate-950">{approvedBySignatory}</p>
                    <p className="text-slate-600">{approvedByTitle}</p>
                    <p className="text-[8px] text-slate-500 font-mono mt-1">Date: ___________</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-slate-600 font-semibold">Approved by:</p>
                    <div className="h-9"></div>
                    <p className="font-bold underline uppercase text-slate-950">{approvedBySignatory}</p>
                    <p className="text-slate-600">{approvedByTitle}</p>
                    <p className="text-[8px] text-slate-500 font-mono mt-1">Date: ___________</p>
                  </div>
                </div>

                <div className="mt-3 pt-1 border-t border-slate-200 flex justify-end items-center text-[8.5px] text-slate-400 font-mono">
                  <span>Page 1 of {activeSheetView === 'both' ? '2' : '1'}</span>
                </div>
              </div>
            </div>
          )}

          {/* SHEET 2: Summary of Payments & Recapitulation (Landscape - Image 2) */}
          {(activeSheetView === 'summary' || activeSheetView === 'both') && (
            <div
              id="swa-summary-sheet"
              className="w-[1248px] min-h-[816px] bg-white text-slate-900 p-8 shadow-2xl rounded-sm flex flex-col justify-between text-[10px] leading-tight shrink-0 font-sans"
              style={{ boxSizing: 'border-box' }}
            >
              <div>
                {/* SALINTUBIG / Gov Program Letterhead */}
                <div className="text-center pb-2 mb-3 border-b-2 border-slate-900">
                  <p className="text-[10px] uppercase font-bold text-slate-600">Republic of the Philippines</p>
                  {provinceName && <p className="text-xs font-bold uppercase text-slate-900">PROVINCE OF {provinceName.replace(/province of/i, '').trim()}</p>}
                  {municipalityName && <p className="text-xs font-bold uppercase text-slate-900">MUNICIPALITY OF {municipalityName.replace(/municipality of/i, '').trim()}</p>}
                  <h1 className="text-sm font-black tracking-wide uppercase text-slate-900 mt-1">
                    {programTitle}
                  </h1>
                </div>

                {/* Subproject & Contract Overview Grid */}
                <div className="grid grid-cols-2 gap-8 mb-4">
                  <div className="space-y-1">
                    <p><strong>Implementing Partner</strong> : {procuringEntity || 'LGU / Government Agency'}</p>
                    <p><strong>Subproject Title</strong> : {projectTitle || 'N/A'}</p>
                    <p><strong>Subproject Code / Ref No.</strong> : <span className="font-mono">{projectRefNo || 'N/A'}</span></p>
                    <p className="pt-2"><strong>MONTHLY REPORT NO.</strong> : <span className="font-bold">{monthlyReportNo}</span></p>
                    <p><strong>Name of Contractor</strong> : {companyName || 'Contractor Name'}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p><strong>Date Submitted</strong> : {dateSubmitted}</p>
                    <p><strong>Date Covered</strong> : {dateCovered}</p>
                    <p className="pt-2"><strong>Original Contract Amount</strong> : <span className="font-mono">₱ {totalContractAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></p>
                    <p><strong>Total Approved Value of Contract</strong> : <span className="font-mono font-bold">₱ {totalContractAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></p>
                    <p><strong>Completed to Date</strong> : <span className="font-mono font-bold text-blue-900">₱ {totalToDateCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></p>
                    <p><strong>Percent Completed</strong> : <span className="font-mono font-bold text-emerald-800">{totalToDateAccomplishmentPercent.toFixed(2)}%</span></p>
                  </div>
                </div>

                {/* SUMMARY OF PAYMENTS BOX (Image 2) */}
                <div className="border-2 border-slate-900 rounded-sm overflow-hidden mb-4">
                  <div className="bg-amber-100/90 py-1.5 px-4 text-center font-black uppercase text-xs tracking-wider border-b border-slate-900">
                    SUMMARY OF PAYMENTS
                  </div>
                  <div className="p-4 bg-slate-50/50 space-y-1.5 text-[10.5px]">
                    <div className="flex justify-between font-semibold">
                      <span>Value of Work Completed to Date-Bid Items</span>
                      <span></span>
                    </div>
                    <div className="flex justify-between pl-4">
                      <span>1. Total Value of Work Completed to Date</span>
                      <span className="font-mono font-bold">₱ {totalToDateCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pl-4">
                      <span>2. Previous Value of Work Completed (from Previous M.P.P.R.)</span>
                      <span className="font-mono">₱ {totalPrevCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pl-4 font-bold border-b border-slate-300 pb-1 text-blue-950">
                      <span>3. Work Completed this Period (#1 - #2)</span>
                      <span className="font-mono">₱ {totalThisCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="pt-1 font-semibold">
                      <span>4. Less : Deductions (a+b+c+d)</span>
                    </div>
                    <div className="flex justify-between pl-6 text-red-800">
                      <span>a. {retentionRate}% Retention ({retentionRate}% of Total of #3)</span>
                      <span className="font-mono">- ₱ {retentionDeduction.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pl-6 text-red-800">
                      <span>b. {ewtRate}% Withholding Tax ({ewtRate}% x 100/ 1.12 of #3)</span>
                      <span className="font-mono">- ₱ {ewtDeduction.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pl-6 text-red-800">
                      <span>c. {vatRate}% Value Added Tax -VAT ({vatRate}% x 100/ 1.12 of #3)</span>
                      <span className="font-mono">- ₱ {vatDeduction.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pl-6 text-red-800">
                      <span>d. Recoupment of Advance Payment ({recoupmentRate}% of #3)</span>
                      <span className="font-mono">- ₱ {recoupmentDeduction.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between pl-4 pt-1 font-bold border-t border-slate-300 text-slate-800">
                      <span>5. Sub-total Deductions (a+b+c+d)</span>
                      <span className="font-mono text-red-900">- ₱ {totalDeductions.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pl-4 pt-1 border-t-2 border-slate-900 text-xs font-black text-emerald-950 bg-amber-50 p-2 rounded">
                      <span>6. Net Amount Approved for Payment this Period (#3 - #4)</span>
                      <span className="font-mono text-sm">₱ {netPayableThisPeriod.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>

                    {/* S-Curve Tracking within Summary Box */}
                    <div className="pt-2 mt-2 border-t border-slate-300">
                      <p className="font-bold text-slate-800">Scheduled Progress : (from Approved S-Curve and Bar Chart)</p>
                      <div className="grid grid-cols-3 gap-4 pt-1 pl-4 text-[10px]">
                        <div>
                          <span>Target Progress (%) : </span>
                          <strong className="font-mono text-amber-900">{targetProgressPercent.toFixed(2)}%</strong>
                        </div>
                        <div>
                          <span>Actual Progress (%) : </span>
                          <strong className="font-mono text-emerald-900">{totalToDateAccomplishmentPercent.toFixed(2)}%</strong>
                        </div>
                        <div>
                          <span>Slippage (+/-) : </span>
                          <strong className={`font-mono ${slippagePercent >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                            {slippagePercent >= 0 ? `+${slippagePercent.toFixed(2)}%` : `${slippagePercent.toFixed(2)}%`}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom 5 Signatories Grid (Image 2) */}
              <div className="pt-4 border-t-2 border-slate-900">
                <div className="grid grid-cols-5 gap-4 text-center text-[9px]">
                  <div className="space-y-1">
                    <p className="text-slate-600 font-semibold">Prepared by:</p>
                    <div className="h-9"></div>
                    <p className="font-bold underline uppercase text-slate-950">{preparedBySignatory}</p>
                    <p className="text-slate-600">{preparedByTitle}</p>
                    <p className="text-[8px] text-slate-500 font-mono mt-1">Date: {dateSubmitted}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-slate-600 font-semibold">Check and verified by:</p>
                    <div className="h-9"></div>
                    <p className="font-bold underline uppercase text-slate-950">{verifiedBySignatory}</p>
                    <p className="text-slate-600">{verifiedByTitle}</p>
                    <p className="text-[8px] text-slate-500 font-mono mt-1">Date: ___________</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-slate-600 font-semibold">Recommended by:</p>
                    <div className="h-9"></div>
                    <p className="font-bold underline uppercase text-slate-950">{recommendedBySignatory}</p>
                    <p className="text-slate-600">{recommendedByTitle}</p>
                    <p className="text-[8px] text-slate-500 font-mono mt-1">Date: ___________</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-slate-600 font-semibold">Approved by:</p>
                    <div className="h-9"></div>
                    <p className="font-bold underline uppercase text-slate-950">{approvedBySignatory}</p>
                    <p className="text-slate-600">{approvedByTitle}</p>
                    <p className="text-[8px] text-slate-500 font-mono mt-1">Date: ___________</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-slate-600 font-semibold">Approved by:</p>
                    <div className="h-9"></div>
                    <p className="font-bold underline uppercase text-slate-950">{approvedBySignatory}</p>
                    <p className="text-slate-600">{approvedByTitle}</p>
                    <p className="text-[8px] text-slate-500 font-mono mt-1">Date: ___________</p>
                  </div>
                </div>

                <div className="mt-3 pt-1 border-t border-slate-200 flex justify-end items-center text-[8.5px] text-slate-400 font-mono">
                  <span>Page {activeSheetView === 'both' ? '2 of 2' : '1 of 1'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function SwaModal(props: SwaModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] h-[94vh] flex flex-col">
        <VaultErrorBoundary>
          <SwaModalContent {...props} />
        </VaultErrorBoundary>
      </div>
    </div>
  );
}


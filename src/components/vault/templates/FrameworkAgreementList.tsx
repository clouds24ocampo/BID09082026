import React, { useState, useEffect, useMemo } from 'react';
import { Tenant } from '../../../types';
import { generateAndDownloadThreeLayerPdf, generateThreeLayerPdfDataUrl } from '../../../utils/pdfExportEngine';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import { autoFitPageChunks, calculateRowHeight, getAutoFitTypographyClass } from '../../../utils/autoFitEngine';
import { savePdfData } from '../../../utils/vaultIndexedDB';
import DocumentQrCode from '../../common/DocumentQrCode';
import {
  X,
  Printer,
  Download,
  FileSignature,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  FileSpreadsheet,
  Type,
  Lock,
  Calendar,
  Zap
} from 'lucide-react';

export interface ScheduleItem {
  id: string;
  description: string;
  quantity: string;
  unitAmount: string;
  total: string;
  delivered: string;
}

export interface FrameworkAgreementListProps {
  item?: { id: string; code: string; name: string };
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string, projectId?: string) => void;
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

export const computeTotalQuantity = (itemList: ScheduleItem[]): string => {
  let totalQty = 0;
  let hasValid = false;
  let detectedUnit = '';

  (itemList || []).forEach((it) => {
    if (!it.quantity) return;
    const match = it.quantity.trim().match(/^([0-9.,]+)\s*(.*)$/);
    if (match) {
      const num = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(num)) {
        totalQty += num;
        hasValid = true;
        if (!detectedUnit && match[2]) {
          detectedUnit = match[2].trim();
        }
      }
    }
  });

  if (!hasValid) return '0';
  return detectedUnit ? `${totalQty.toLocaleString('en-US')} ${detectedUnit}` : `${totalQty.toLocaleString('en-US')}`;
};

export const computeTotalUnitAmount = (itemList: ScheduleItem[]): string => {
  let totalUnit = 0;
  let hasValid = false;
  (itemList || []).forEach((it) => {
    if (!it.unitAmount) return;
    const clean = parseFloat(it.unitAmount.replace(/[^0-9.]/g, ''));
    if (!isNaN(clean) && clean > 0) {
      totalUnit += clean;
      hasValid = true;
    }
  });
  if (!hasValid && totalUnit === 0) return 'PHP 0.00';
  return `PHP ${totalUnit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const computeGrandTotalMaterials = (itemList: ScheduleItem[]): string => {
  let grandTotal = 0;
  let hasValid = false;
  (itemList || []).forEach((it) => {
    let amtNum = 0;
    const computedStr = computeTotalAmount(it.unitAmount, it.quantity);
    const targetStr = computedStr || it.total || '';
    if (targetStr) {
      const clean = parseFloat(targetStr.replace(/[^0-9.]/g, ''));
      if (!isNaN(clean) && clean > 0) {
        amtNum = clean;
        hasValid = true;
      }
    }
    grandTotal += amtNum;
  });
  if (!hasValid && grandTotal === 0) return 'PHP 0.00';
  return `PHP ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const getNumericGrandTotalMaterials = (itemList: ScheduleItem[]): number => {
  let grandTotal = 0;
  (itemList || []).forEach((it) => {
    let amtNum = 0;
    const computedStr = computeTotalAmount(it.unitAmount, it.quantity);
    const targetStr = computedStr || it.total || '';
    if (targetStr) {
      const clean = parseFloat(targetStr.replace(/[^0-9.]/g, ''));
      if (!isNaN(clean) && clean > 0) {
        amtNum = clean;
      }
    }
    grandTotal += amtNum;
  });
  return grandTotal;
};

export const DEFAULT_SERVICES_DESCRIPTION = 'Logistic, Delivery, Labor, Installation, Cable Pulling, Rough-ins, Cloud Service, Mobile Configuration and User Restriction, Commissioning, CCTV System (35% of Materials Cost) - All kinds of taxes included';

export const getServicesCostAmount = (itemList: ScheduleItem[], percentage: number = 35, customAmountStr?: string): number => {
  if (customAmountStr && customAmountStr.trim()) {
    const clean = parseFloat(customAmountStr.replace(/[^0-9.]/g, ''));
    if (!isNaN(clean) && clean >= 0) return clean;
  }
  const materialsCost = getNumericGrandTotalMaterials(itemList);
  return materialsCost * ((percentage || 0) / 100);
};

export const formatDescriptionText = (text: string): string => {
  if (!text) return '';
  return text.replace(/([a-zA-Z0-9])&([a-zA-Z0-9])/g, '$1 & $2');
};

export const getServicesCostDisplay = (itemList: ScheduleItem[], percentage: number = 35, customAmountStr?: string): string => {
  const amount = getServicesCostAmount(itemList, percentage, customAmountStr);
  return `PHP ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const getGrandTotalWithServicesDisplay = (itemList: ScheduleItem[], percentage: number = 35, customAmountStr?: string): string => {
  const materials = getNumericGrandTotalMaterials(itemList);
  const services = getServicesCostAmount(itemList, percentage, customAmountStr);
  const grandTotal = materials + services;
  return `PHP ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const defaultDelivery = '30 Calendar Days upon receipt of NTP';

interface PageRow {
  item: ScheduleItem;
  index: number;
}

export const FrameworkAgreementList: React.FC<FrameworkAgreementListProps> = ({
  item = { id: 'fal-01', code: 'FAL-01', name: 'Framework Agreement List' },
  tenant,
  activeProjectRefNo = '',
  activeProjectTitle = '',
  activeProcuringEntity = '',
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
  const projectScopeKey = selectedOppId || projectRefNo || activeProjectRefNo;

  // Company Details State
  const [companyName] = useState(tenant?.companyName || 'Bidding Entity Corporate Name');
  const [companyAddress] = useState(tenant?.address || 'Metro Manila, Philippines');
  const [signatoryName] = useState(tenant?.authorizedSignatory?.name || 'Authorized Signatory Name');
  const [signatoryTitle] = useState(tenant?.authorizedSignatory?.title || 'President / General Manager');

  // Items State (Mirrored and Synchronized with Section VI & Bid Documents)
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [globalDeliveryDays, setGlobalDeliveryDays] = useState<string>('30 Calendar Days');

  // Services / Logistics Layer State (Mirrored Read-Only from Section VI)
  const [servicesDescription, setServicesDescription] = useState<string>(DEFAULT_SERVICES_DESCRIPTION);
  const [servicesPercentage, setServicesPercentage] = useState<number>(35);
  const [servicesCustomAmount, setServicesCustomAmount] = useState<string>('');

  // Synchronize items and delivery days across Section VI, Form L Detailed Estimates, and FAL
  const saveItemsToSharedStorage = (updatedItems: ScheduleItem[]) => {
    const tenantKey = tenant?.id || 'default';
    const scopeKey = selectedOppId || projectRefNo || activeProjectRefNo || 'default';

    // 1. Save FAL
    try {
      localStorage.setItem(`bidocs_fal_${tenantKey}_${scopeKey}`, JSON.stringify(updatedItems));
      if (selectedOppId) localStorage.setItem(`bidocs_fal_${tenantKey}_${selectedOppId}`, JSON.stringify(updatedItems));
      if (projectRefNo) localStorage.setItem(`bidocs_fal_${tenantKey}_${projectRefNo}`, JSON.stringify(updatedItems));
    } catch (_) {}

    // 2. Sync to Section VI so both documents have 100% IDENTICAL delivery days
    try {
      localStorage.setItem(`bidocs_sec_vi_${tenantKey}_${scopeKey}`, JSON.stringify(updatedItems));
      if (selectedOppId) localStorage.setItem(`bidocs_sec_vi_${tenantKey}_${selectedOppId}`, JSON.stringify(updatedItems));
      if (projectRefNo) localStorage.setItem(`bidocs_sec_vi_${tenantKey}_${projectRefNo}`, JSON.stringify(updatedItems));
    } catch (_) {}

    // 3. Sync to Detailed Estimates deliverySchedule
    if (updatedItems.length > 0 && updatedItems[0].delivered) {
      const deliv = updatedItems[0].delivered;
      try {
        const candidateDetKeys = [
          `bidocs_detailed_estimates_${tenantKey}_${scopeKey}`,
          selectedOppId ? `bidocs_detailed_estimates_${tenantKey}_${selectedOppId}` : '',
          projectRefNo ? `bidocs_detailed_estimates_${tenantKey}_${projectRefNo}` : ''
        ].filter(Boolean);

        for (const k of candidateDetKeys) {
          const rawDet = localStorage.getItem(k);
          if (rawDet) {
            const parsedDet = JSON.parse(rawDet);
            parsedDet.deliverySchedule = deliv;
            localStorage.setItem(k, JSON.stringify(parsedDet));
          }
        }
      } catch (_) {}
    }
  };

  const handleDeliveryChange = (index: number, newDelivered: string) => {
    const updated = items.map((it, idx) => (idx === index ? { ...it, delivered: newDelivered } : it));
    setItems(updated);
    saveItemsToSharedStorage(updated);
  };

  const handleApplyDeliveryToAll = (newDelivered: string) => {
    const updated = items.map((it) => ({ ...it, delivered: newDelivered }));
    setItems(updated);
    saveItemsToSharedStorage(updated);
  };

  // Load real saved opportunity projects from Opportunity Finder
  useEffect(() => {
    const list = getOpportunityProjects(tenant?.id);
    setOppProjects(list);
    if (activeProjectRefNo) {
      const match = list.find((project) => project.refNo === activeProjectRefNo);
      if (match) {
        setSelectedOppId(match.id);
        setProjectRefNo(match.refNo);
        setSolicitationNumber(match.solicitationNo || 'SOL-2026-001');
        setProjectTitle(match.title);
        setProcuringEntity(match.procuringEntity);
        if (match.dateTimeSubmitted) {
          setDateTimeSubmitted(match.dateTimeSubmitted);
        }
        return;
      }
      setSelectedOppId('');
      setProjectRefNo(activeProjectRefNo);
      setSolicitationNumber('SOL-2026-001');
      setProjectTitle(activeProjectTitle || 'Target Bidding Project');
      setProcuringEntity(activeProcuringEntity || '');
    } else if (list.length > 0) {
      const first = list[0];
      setSelectedOppId(first.id);
      setProjectRefNo(first.refNo);
      setSolicitationNumber(first.solicitationNo || 'SOL-2026-001');
      setProjectTitle(first.title);
      setProcuringEntity(first.procuringEntity);
      if (first.dateTimeSubmitted) {
        setDateTimeSubmitted(first.dateTimeSubmitted);
      }
    } else {
      setSelectedOppId('');
      setProjectRefNo('');
      setSolicitationNumber('');
      setProjectTitle('');
      setProcuringEntity('');
    }
  }, [tenant?.id, activeProjectRefNo, activeProjectTitle, activeProcuringEntity]);

  const handleSelectProject = (oppIdOrRef: string) => {
    const found = oppProjects.find((p) => p.id === oppIdOrRef || p.refNo === oppIdOrRef);
    if (found) {
      setSelectedOppId(found.id);
      setProjectRefNo(found.refNo);
      setSolicitationNumber(found.solicitationNo || 'SOL-2026-001');
      setProjectTitle(found.title);
      setProcuringEntity(found.procuringEntity);
      if (found.dateTimeSubmitted) {
        setDateTimeSubmitted(found.dateTimeSubmitted);
      }
    }
  };

  // Load shared Section VI data for current project (100% identical & read-only mirrored)
  useEffect(() => {
    if (!projectScopeKey) {
      setItems([]);
      setServicesDescription(DEFAULT_SERVICES_DESCRIPTION);
      setServicesPercentage(35);
      setServicesCustomAmount('');
      return;
    }
    const tenantKey = tenant?.id || 'default';
    const candidateSecViKeys = [
      `bidocs_sec_vi_${tenantKey}_${projectScopeKey}`,
      selectedOppId ? `bidocs_sec_vi_${tenantKey}_${selectedOppId}` : '',
      projectRefNo ? `bidocs_sec_vi_${tenantKey}_${projectRefNo}` : ''
    ].filter(Boolean);

    let loadedItems: ScheduleItem[] | null = null;
    for (const key of candidateSecViKeys) {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            loadedItems = parsed;
            break;
          }
        } catch (e) { }
      }
    }
    setItems(loadedItems !== null ? loadedItems : []);

    const candidateServiceKeys = [
      `bidocs_sec_vi_services_${tenantKey}_${projectScopeKey}`,
      selectedOppId ? `bidocs_sec_vi_services_${tenantKey}_${selectedOppId}` : '',
      projectRefNo ? `bidocs_sec_vi_services_${tenantKey}_${projectRefNo}` : ''
    ].filter(Boolean);

    let loadedServices: any = null;
    for (const key of candidateServiceKeys) {
      const savedServices = localStorage.getItem(key);
      if (savedServices !== null) {
        try {
          const parsedSvc = JSON.parse(savedServices);
          if (parsedSvc) {
            loadedServices = parsedSvc;
            break;
          }
        } catch (e) {}
      }
    }

    if (loadedServices) {
      setServicesDescription(loadedServices.description || DEFAULT_SERVICES_DESCRIPTION);
      setServicesPercentage(loadedServices.percentage ?? 35);
      setServicesCustomAmount(loadedServices.customAmount || '');
    } else {
      setServicesDescription(DEFAULT_SERVICES_DESCRIPTION);
      setServicesPercentage(35);
      setServicesCustomAmount('');
    }
  }, [projectScopeKey, selectedOppId, projectRefNo, tenant?.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const fileName = `${projectRefNo}_Framework_Agreement_List_${todayStr}.pdf`;
      const containerElem = document.getElementById('framework-pages-container') || document.getElementById('framework-paper');
      if (containerElem) {
        await generateAndDownloadThreeLayerPdf(null, containerElem, undefined, fileName);
      }
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    const cleanProj = (projectRefNo || 'PRJ').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${cleanProj}_Framework_Agreement_List_${todayStr}.csv`;

    let csvContent = '\uFEFF';
    csvContent += `"FRAMEWORK AGREEMENT LIST"\n`;
    csvContent += `"Company Name:","${companyName.replace(/"/g, '""')}"\n`;
    csvContent += `"Company Address:","${companyAddress.replace(/"/g, '""')}"\n`;
    csvContent += `"PhilGEPS Ref. No.:","${projectRefNo.replace(/"/g, '""')}"\n`;
    csvContent += `"Solicitation No.:","${solicitationNumber.replace(/"/g, '""')}"\n`;
    csvContent += `"Project Title:","${projectTitle.replace(/"/g, '""')}"\n`;
    csvContent += `"Procuring Entity:","${procuringEntity.replace(/"/g, '""')}"\n`;
    csvContent += `"Submission Date & Time:","${formatDateTimeDisplay(dateTimeSubmitted)}"\n\n`;

    csvContent += `"Item Number","Description","Quantity","Unit Amount","Total"\n`;

    items.forEach((it, idx) => {
      const itemNum = `"${idx + 1}"`;
      const desc = `"${(it.description || '').replace(/"/g, '""')}"`;
      const qty = `"${(it.quantity || '').replace(/"/g, '""')}"`;
      const unitAmt = `"${(it.unitAmount || '').replace(/"/g, '""')}"`;
      const tot = `"${(it.total || computeTotalAmount(it.unitAmount, it.quantity) || '').replace(/"/g, '""')}"`;
      csvContent += `${itemNum},${desc},${qty},${unitAmt},${tot}\n`;
    });

    const totalQtyStr = computeTotalQuantity(items);
    const grandTotalStr = computeGrandTotalMaterials(items);
    const servicesCostStr = getServicesCostDisplay(items, servicesPercentage, servicesCustomAmount);
    const overallGrandTotalStr = getGrandTotalWithServicesDisplay(items, servicesPercentage, servicesCustomAmount);

    csvContent += `"","TOTAL MATERIALS:","${totalQtyStr}","","${grandTotalStr}"\n`;
    csvContent += `"","${servicesDescription.replace(/"/g, '""')}","1 Lot","","${servicesCostStr}"\n`;
    csvContent += `"","GRAND TOTAL REQUIREMENTS (MATERIALS + SERVICES):","","","${overallGrandTotalStr}"\n`;

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
    try {
      const containerElem = (document.getElementById('framework-pages-container') || document.getElementById('framework-paper')) as HTMLElement;
      let dataUrl: string | undefined = undefined;
      if (containerElem) {
        dataUrl = await generateThreeLayerPdfDataUrl(
          null,
          containerElem,
          undefined,
          `${projectRefNo}_Framework_Agreement_List_${todayStr}.pdf`
        );
      }

      const tenantKey = tenant?.id || 'default';
      const scopeKey = selectedOppId || projectRefNo || activeProjectRefNo || 'default';
      if (dataUrl) {
        try {
          await savePdfData(`fal_${tenantKey}_${scopeKey}`, dataUrl);
          if (selectedOppId) await savePdfData(`fal_${tenantKey}_${selectedOppId}`, dataUrl);
          if (projectRefNo) await savePdfData(`fal_${tenantKey}_${projectRefNo}`, dataUrl);
        } catch (_) {}
      }

      saveItemsToSharedStorage(items);

      if (onSaveAndComplete) {
        onSaveAndComplete(dataUrl, item.name, projectRefNo, projectTitle, selectedOppId);
      }
    } catch (error) {
      console.error('Failed to generate Framework Agreement List PDF:', error);
      if (onSaveAndComplete) {
        onSaveAndComplete(undefined, item.name, projectRefNo, projectTitle, selectedOppId);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const totalCharactersInDoc = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.description || '').length, 0);
  }, [items]);

  const autoTypographyClass = useMemo(() => {
    return getAutoFitTypographyClass(totalCharactersInDoc, items.length);
  }, [totalCharactersInDoc, items.length]);

  const getTableFontSizeClass = () => {
    if (fontSizeMode === 'fine') return 'text-[9.5px] leading-tight';
    if (fontSizeMode === 'xs') return autoTypographyClass;
    return 'text-xs leading-normal';
  };

  // --- DYNAMIC AUTO-FIT PAGE-PACKING ENGINE ---
  // Automatically measures and packs all information inside the minimum necessary number of pages with zero empty space
  const pageChunks = useMemo<PageRow[][]>(() => {
    const indexedItems: PageRow[] = items.map((it, idx) => ({ item: it, index: idx }));
    return autoFitPageChunks(
      indexedItems,
      (row) => calculateRowHeight(row.item.description || '', 65, 13.5, 8, 22),
      {
        orientation: 'portrait',
        columnCharWidth: 65,
        headerHeightPx: 170,
        footerHeightPx: 260,
        runningFooterPx: 30
      }
    );
  }, [items]);

  const totalPages = pageChunks.length;

  const pagesList = pageChunks.map((chunk, pIdx) => (
    <div
      key={`fal-page-${pIdx}`}
      id={pIdx === 0 ? 'framework-paper' : `framework-paper-p${pIdx + 1}`}
      className="single-page-paper print-document-sheet portrait aspect-[8.5/13] bg-white text-black p-6 border-2 border-slate-900 shadow-2xl mx-auto rounded-none w-[816px] min-h-[1248px] max-w-[816px] flex flex-col justify-between font-serif mb-8 box-border relative text-slate-950"
    >
      <div>
        {/* COMPANY & PROJECT HEADER BLOCK (PAGE 1 ONLY) */}
        {pIdx === 0 ? (
          <div className="mb-3 pb-2.5 border-b-2 border-slate-900 font-serif">
            {/* Centered Company Name Header */}
            <div className="text-center pb-2 border-b border-slate-300">
              <h1 className="text-lg font-bold uppercase tracking-wider text-black font-serif">
                {companyName}
              </h1>
              <p className="text-xs text-slate-700 font-serif font-semibold mt-0.5 uppercase tracking-wide">
                {companyAddress}
              </p>
            </div>

            {/* 4-Field Project Information Grid */}
            <div className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs font-serif text-black">
              <div>
                <span className="font-bold">Project Name: </span>
                <span className="font-semibold text-slate-900">{projectTitle || 'N/A'}</span>
              </div>
              <div>
                <span className="font-bold">Project REF No.: </span>
                <span className="font-mono font-semibold text-blue-950">{projectRefNo || 'N/A'}</span>
              </div>
              <div>
                <span className="font-bold">Procuring Entity: </span>
                <span className="text-slate-900">{procuringEntity || 'N/A'}</span>
              </div>
              <div>
                <span className="font-bold">Submission Date & Time: </span>
                <span className="font-mono font-semibold text-blue-950">{formatDateTimeDisplay(dateTimeSubmitted)}</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* FORM TITLE (PAGE 1 ONLY) */}
        {pIdx === 0 ? (
          <div className="mb-3 text-center">
            <h2 className="text-lg font-bold uppercase tracking-wide text-black border-b border-black inline-block pb-0.5 font-serif">
              Framework Agreement List
            </h2>
            <p className="text-[11px] font-mono text-slate-600 uppercase mt-0.5 font-bold">
              (PRICE SCHEDULE & ITEM MATRIX)
            </p>
          </div>
        ) : null}

        {/* ITEMS TABLE (100% READ-ONLY MIRRORED FROM SECTION VI) */}
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse border border-black text-xs font-serif table-fixed">
            <colgroup>
              <col className="w-[6%]" />
              <col className="w-[48%]" />
              <col className="w-[12%]" />
              <col className="w-[16%]" />
              <col className="w-[18%]" />
            </colgroup>
            {pIdx === 0 ? (
              <thead>
                <tr className="bg-slate-200 border-b border-black text-black font-bold text-center uppercase tracking-wider text-[11px]">
                  <th className="border border-black px-1.5 py-1.5 w-[6%]">Item No.</th>
                  <th className="border border-black px-2 py-1.5 text-left w-[48%]">Description</th>
                  <th className="border border-black px-1.5 py-1.5 w-[12%]">Qty</th>
                  <th className="border border-black px-2 py-1.5 w-[16%]">Unit Cost</th>
                  <th className="border border-black px-2 py-1.5 w-[18%]">Total Cost</th>
                </tr>
              </thead>
            ) : (
              <thead>
                <tr className="bg-slate-200 border-b border-black text-black font-bold text-center uppercase tracking-wider text-[10px]">
                  <th className="border border-black px-1.5 py-1 w-[6%]">Item No.</th>
                  <th className="border border-black px-2 py-1 text-left w-[48%]">Description (Continuation)</th>
                  <th className="border border-black px-1.5 py-1 w-[12%]">Qty</th>
                  <th className="border border-black px-2 py-1 w-[16%]">Unit Cost</th>
                  <th className="border border-black px-2 py-1 w-[18%]">Total Cost</th>
                </tr>
              </thead>
            )}
            <tbody>
              {chunk.map(({ item: rowItem, index: itemIdx }) => (
                <tr key={rowItem.id} className="border-b border-black hover:bg-amber-50/20 even:bg-slate-50/30 transition-colors">
                  {/* 1. Item # */}
                  <td className="border border-black px-1.5 py-2 text-center font-serif font-bold align-top text-slate-950">
                    <span className="block pt-0.5 font-bold text-xs">{itemIdx + 1}</span>
                  </td>

                  {/* 2. Description (Read-Only) */}
                  <td className="border border-black px-3.5 py-2 font-serif align-top break-words">
                    <div className={`font-serif text-slate-950 pt-0.5 whitespace-pre-wrap font-normal break-words [overflow-wrap:break-word] leading-relaxed text-justify ${getTableFontSizeClass()}`}>
                      {formatDescriptionText(rowItem.description)}
                    </div>
                  </td>

                  {/* 3. Quantity (Read-Only) */}
                  <td className="border border-black px-1.5 py-2 font-serif text-center align-top">
                    <div className={`font-serif text-black text-center pt-0.5 font-normal break-words ${getTableFontSizeClass()}`}>
                      {rowItem.quantity || ''}
                    </div>
                  </td>

                  {/* 4. Unit Amount (Read-Only) */}
                  <td className="border border-black px-2 py-2 font-serif text-center align-top break-words">
                    <div className={`font-serif text-black text-center pt-0.5 font-normal break-words ${getTableFontSizeClass()}`}>
                      {rowItem.unitAmount
                        ? rowItem.unitAmount.startsWith('PHP')
                          ? rowItem.unitAmount
                          : (() => {
                              const clean = parseFloat(rowItem.unitAmount.replace(/[^0-9.]/g, ''));
                              return !isNaN(clean)
                                ? `PHP ${clean.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : rowItem.unitAmount;
                            })()
                        : ''}
                    </div>
                  </td>

                  {/* 5. Total Amount (Read-Only) */}
                  <td className="border border-black px-2 py-2 font-serif text-center align-top break-words">
                    <div className={`font-serif text-black text-center pt-0.5 font-semibold break-words ${getTableFontSizeClass()}`}>
                      {computeTotalAmount(rowItem.unitAmount, rowItem.quantity) || rowItem.total || ''}
                    </div>
                  </td>
                </tr>
              ))}
              {/* Statutory *** NOTHING FOLLOWS *** Security Seal (Final Page after items) */}
              {pIdx === totalPages - 1 && (
                <tr className="border-b border-black text-center font-bold tracking-widest text-[10.5px] bg-slate-100/60 uppercase text-slate-800">
                  <td colSpan={5} className="py-1">
                    *** NOTHING FOLLOWS ***
                  </td>
                </tr>
              )}
            </tbody>

            {/* SUMMARY ROWS (TOTAL MATERIALS, SERVICES, GRAND TOTAL) ONLY ON FINAL PAGE */}
            {pIdx === totalPages - 1 && (
              <tfoot className="border-t-2 border-black font-serif font-bold bg-slate-100/90">
                {/* 1. Subtotal Materials Row */}
                <tr className="border-b border-black">
                  <td colSpan={2} className="border border-black px-3 py-1.5 font-serif text-xs text-right">
                    <span className="uppercase tracking-wider text-black font-bold font-serif text-xs">
                      TOTAL MATERIALS:
                    </span>
                  </td>
                  <td className="border border-black px-1.5 py-1.5 text-center font-bold text-black text-xs font-mono break-words bg-amber-50/70">
                    {computeTotalQuantity(items)}
                  </td>
                  <td className="border border-black px-2 py-1.5 text-center text-xs font-serif text-slate-500">
                    —
                  </td>
                  <td className="border border-black px-2 py-1.5 text-center font-bold text-black text-xs font-mono break-words bg-amber-50/90">
                    {computeGrandTotalMaterials(items)}
                  </td>
                </tr>

                {/* 2. Services & Logistics Layer Row (Read-Only Mirrored from Section VI) */}
                {(servicesPercentage > 0 || !!servicesCustomAmount) && (
                  <tr className="border-b border-black bg-blue-50/40">
                    <td className="border border-black px-1.5 py-1 text-center font-serif font-bold text-xs text-slate-950 align-middle">
                      {items.length + 1}
                    </td>
                    <td className="border border-black px-3 py-1 text-left font-serif text-xs text-black align-middle">
                      <div className="font-serif text-black text-xs font-medium">
                        {servicesDescription || 'Logistics, Installation, Testing & Commissioning Services'}
                      </div>
                    </td>
                    <td className="border border-black px-1.5 py-1 text-center font-serif text-xs text-black font-bold align-middle">
                      1 Lot
                    </td>
                    <td className="border border-black px-2 py-1 text-center text-xs font-serif text-slate-500 align-middle">
                      —
                    </td>
                    <td className="border border-black px-2 py-1 text-center font-bold text-blue-950 text-xs font-mono break-words bg-blue-50/80 align-middle">
                      <div className="font-mono text-blue-950 text-xs font-bold">
                        {getServicesCostDisplay(items, servicesPercentage, servicesCustomAmount)}
                      </div>
                    </td>
                  </tr>
                )}

                {/* 3. Grand Total Requirements Row */}
                <tr className="border-b-2 border-black bg-amber-100/90 text-black">
                  <td colSpan={2} className="border border-black px-3 py-2 text-right uppercase tracking-wider text-black font-bold font-serif text-xs">
                    GRAND TOTAL REQUIREMENTS (MATERIALS + SERVICES):
                  </td>
                  <td className="border border-black px-1.5 py-2 text-center text-xs font-serif text-slate-600">
                    —
                  </td>
                  <td className="border border-black px-2 py-2 text-center text-xs font-serif text-slate-600">
                    —
                  </td>
                  <td className="border border-black px-2 py-2 text-center font-extrabold text-black text-sm font-mono break-words bg-amber-200">
                    {getGrandTotalWithServicesDisplay(items, servicesPercentage, servicesCustomAmount)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Document Footer: Signatory Block (Final Page Only) + Running Page Footer on EVERY Page */}
      <div>
        {/* Signatory Block & GPPB QR Code (Final Page Only) */}
        {pIdx === totalPages - 1 && (
          <div className="mt-6 pt-3 border-t border-slate-300 flex items-end justify-between text-xs font-serif signatory-block mb-3">
            <div>
              <p className="font-bold text-black uppercase">{companyName}</p>
              <div className="mt-6 border-b border-black w-64"></div>
              <p className="font-bold text-black mt-1 uppercase">{signatoryName}</p>
              <p className="text-slate-700">{signatoryTitle}</p>
            </div>

            <div className="text-right flex flex-col items-end">
              <DocumentQrCode
                details={{
                  companyName: companyName,
                  documentName: 'Framework Agreement List',
                  documentNumber: `FAL-01-${projectRefNo || '2026-901283'}`,
                  projectTitle: projectTitle,
                  projectRefNo: projectRefNo,
                  procuringEntity: procuringEntity,
                  dateTimeSubmitted: formatDateTimeDisplay(dateTimeSubmitted),
                  documentCategory: 'Bid Forms',
                  generatedBy: companyName
                }}
                size={80}
                showCaption={false}
              />
              <span className="text-[9px] font-mono text-slate-600 uppercase mt-1">
                VERIFIED GPPB DOC • {projectRefNo}
              </span>
            </div>
          </div>
        )}

        {/* Running Page Footer (Rendered on EVERY Page) */}
        <div className="mt-4 pt-2 border-t-2 border-black flex items-center justify-between text-[8.5pt] font-mono text-black shrink-0">
          <div className="font-bold uppercase">{companyName}</div>
          <div>FRAMEWORK AGREEMENT LIST • REF: {projectRefNo || 'N/A'}</div>
          <div className="font-bold">PAGE {pIdx + 1} OF {totalPages}</div>
        </div>
      </div>
    </div>
  ));

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <style>{`
        @media print {
          @page {
            size: 8.5in 13in portrait;
            margin: 0;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, nav, aside, button, .print\\:hidden, .no-print, .no-export, .sticky {
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
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            position: relative !important;
            width: 8.5in !important;
            max-width: 8.5in !important;
            height: 13in !important;
            max-height: 13in !important;
            min-height: 13in !important;
            margin: 0 !important;
            padding: 0.4in 0.45in !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .single-page-paper:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
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
                <span>Framework Agreement List</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase">
                  Legal Portrait Form (8.5" × 13")
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-xl">
                100% Mirrored with Section VI Schedule of Requirements • Standard Legal Portrait
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 transition shadow flex items-center gap-1.5 border border-emerald-500/40 cursor-pointer"
              title="Export directly to Microsoft Excel CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export to Excel</span>
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Exporting PDF...' : 'Export PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Pages</span>
            </button>
            {onClose && (
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950 space-y-8 print:p-0 print:bg-white">

          {/* Interactive Screen Controls */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 print:hidden no-export">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-200 font-mono text-xs font-bold flex items-center gap-1.5 text-blue-300">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span>Target Bidding Project:</span>
                  </label>
                  {projectRefNo && (
                    <span className="text-[10px] text-emerald-400 font-bold font-mono flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      <Lock className="w-3 h-3 text-emerald-400" />
                      <span>Strict Isolation Active ({projectRefNo})</span>
                    </span>
                  )}
                </div>
                <select
                  value={selectedOppId || projectRefNo}
                  onChange={(e) => handleSelectProject(e.target.value)}
                  className="w-full bg-slate-950 border border-blue-500/60 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs font-bold focus:outline-none focus:border-blue-400 shadow-inner cursor-pointer"
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
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                  <span className="text-slate-400 px-1.5 flex items-center gap-1 text-[11px]">
                    <Type className="w-3.5 h-3.5 text-blue-400" /> Font Size:
                  </span>
                  <button
                    type="button"
                    onClick={() => setFontSizeMode('fine')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${fontSizeMode === 'fine' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    9pt
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSizeMode('xs')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${fontSizeMode === 'xs' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    10pt
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSizeMode('sm')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${fontSizeMode === 'sm' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    11pt
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-blue-400" />
              <span>
                <strong>Synchronized with Section VI & Bid Documents:</strong> All item descriptions, quantities, unit prices, and services are automatically synchronized across all project bid forms.
              </span>
            </div>
          </div>

          {/* MULTI-PAGE RENDER CONTAINER */}
          <div id="framework-pages-container" className="space-y-8 print:space-y-0">
            {pagesList}
          </div>

        </div>

        {/* Bottom Modal Actions */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900 shrink-0 print:hidden no-export">
          <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Class A Legal Package — Framework Agreement List ({totalPages} {totalPages === 1 ? 'Page' : 'Pages'} • Legal Portrait 8.5" × 13")</span>
          </div>

          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isExporting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isExporting ? 'Saving Package...' : 'Save & Complete Package'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FrameworkAgreementList;
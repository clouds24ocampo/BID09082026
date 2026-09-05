import React, { useState, useEffect } from 'react';
import { Tenant } from '../../../types';
import { generateAndDownloadThreeLayerPdf, buildMergedThreeLayerPdfDataUrl, ExportDocumentUnit } from '../../../utils/pdfExportEngine';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import DocumentQrCode from '../../common/DocumentQrCode';
import VaultErrorBoundary from '../../common/VaultErrorBoundary';
import { numberToWords } from '../../../utils/numberToWords';
import {
  X,
  Printer,
  Download,
  Building2,
  FileSignature,
  DollarSign,
  Lock,
  Edit3,
  HardHat,
  FolderKanban
} from 'lucide-react';

export interface AgentCommissionRow {
  id: string;
  agentNameAddress: string;
  amountCurrency: string;
  purpose: string;
}

export interface BidFormForGoodsModalProps {
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose: () => void;
}

// Helper to format currency number with commas and 2 decimal places (e.g. 1,000,000.00)
const formatCurrency = (num: number): string => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const parseNum = (val: string): number => {
  if (!val) return 0;
  const cleaned = val.replace(/,/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

// Helper to format Date ONLY without time (e.g., "March 19, 2026")
const formatDateOnly = (raw: string): string => {
  if (!raw) return 'March 19, 2026';
  let cleaned = raw.replace(/\s*T\s*\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?/gi, ' ').trim();
  cleaned = cleaned.replace(/\s+at\s+.*$/gi, '').trim();
  try {
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  } catch {}
  return cleaned;
};

export const BidFormForGoodsModalContent: React.FC<BidFormForGoodsModalProps> = ({
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

  // Project & Document Parameters (PhilGEPS Ref No is strictly locked to target project)
  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo || '');
  const [projectTitle, setProjectTitle] = useState(activeProjectTitle || '');
  const [procuringEntity, setProcuringEntity] = useState(activeProcuringEntity || '');
  const [procuringEntityAddress, setProcuringEntityAddress] = useState('');
  const [solicitationNumber, setSolicitationNumber] = useState('SF-GOODS-01');
  const [dateSubmitted, setDateSubmitted] = useState('March 19, 2026');

  // Corporate Entity & Signatory (Company Name is strictly locked to Tenant Registration Name)
  const companyName = tenant?.companyName || '';
  const [companyAddress, setCompanyAddress] = useState(tenant?.address || '');
  const [signatoryName, setSignatoryName] = useState(tenant?.authorizedSignatory?.name || 'Mark-Vin F. Ocampo');
  const [signatoryTitle, setSignatoryTitle] = useState(tenant?.authorizedSignatory?.title || 'President');
  const [writtenAuthority, setWrittenAuthority] = useState("Board Resolution & Secretary's Certificate");

  // Category Auto-Detection State ('Goods' = Blue, 'Infrastructure' = Yellow/Amber, 'Consulting' = Green/Emerald)
  const [projectCategory, setProjectCategory] = useState<'Goods' | 'Infrastructure' | 'Consulting'>('Goods');

  // Performance Security Parameters (3 Statutory Options: Performance Bond, PSD, Manager's Check)
  const [performanceSecurityOption, setPerformanceSecurityOption] = useState<'PERFORMANCE_BOND' | 'PSD' | 'MANAGERS_CHECK'>('PERFORMANCE_BOND');
  const [performanceSecurityPercent, setPerformanceSecurityPercent] = useState('thirty (30)');

  // Delivery Schedule / Contract Duration Parameters
  const [deliverySchedule, setDeliverySchedule] = useState('30 Calendar Days upon receipt of Notice to Proceed');

  // Infrastructure-Specific Bid Parameters
  const [discountsOffered, setDiscountsOffered] = useState('No discounts offered');

  // Performance Security Option Selector Helper
  const handlePerformanceSecurityChange = (option: 'PERFORMANCE_BOND' | 'PSD' | 'MANAGERS_CHECK', currentCategory?: 'Goods' | 'Infrastructure' | 'Consulting') => {
    setPerformanceSecurityOption(option);
    const cat = currentCategory || projectCategory;
    if (option === 'PERFORMANCE_BOND') {
      setPerformanceSecurityPercent('thirty (30)');
    } else if (option === 'MANAGERS_CHECK') {
      setPerformanceSecurityPercent(cat === 'Infrastructure' ? 'ten (10)' : 'five (5)');
    } else {
      setPerformanceSecurityPercent('N/A');
    }
  };

  // Goods Description & Bid Offer Parameters
  const [bidBulletins, setBidBulletins] = useState('Bid Bulletin No. 1');
  const [offerAction, setOfferAction] = useState<string>('supply, deliver, and perform');
  const [goodsDescription, setGoodsDescription] = useState(
    activeProjectTitle || 'SUPPLY, DELIVERY, INSTALLATION, TESTING, AND CONFIGURATION OF ICT EQUIPMENT'
  );
  const [totalBidAmountFigures, setTotalBidAmountFigures] = useState('1,250,000.00');
  const [totalBidAmountWords, setTotalBidAmountWords] = useState('');
  const [commissionsText, setCommissionsText] = useState('None');

  const [showMetadataInputs, setShowMetadataInputs] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const detectCategoryFromProject = (titleStr: string, refNoStr: string, catStr?: string): 'Goods' | 'Infrastructure' | 'Consulting' => {
    const titleLower = (titleStr || '').toLowerCase();
    if (
      titleLower.includes('public address') ||
      titleLower.includes('supply') ||
      titleLower.includes('equipment') ||
      titleLower.includes('cctv') ||
      titleLower.includes('ict') ||
      titleLower.includes('hardware') ||
      titleLower.includes('software') ||
      titleLower.includes('goods') ||
      titleLower.includes('supplies') ||
      titleLower.includes('furniture') ||
      titleLower.includes('appliances') ||
      titleLower.includes('vehicle') ||
      titleLower.includes('medicine') ||
      titleLower.includes('medical') ||
      titleLower.includes('food') ||
      titleLower.includes('catering')
    ) {
      return 'Goods';
    }

    const catUpper = (catStr || '').toUpperCase();
    if (catUpper.includes('GOOD')) return 'Goods';
    if (catUpper.includes('CONSULT') || titleLower.includes('consult')) return 'Consulting';
    if (catUpper.includes('INFRA')) return 'Infrastructure';

    const combined = `${titleStr || ''} ${refNoStr || ''}`.toLowerCase();
    if (
      combined.includes('construction') ||
      combined.includes('civil works') ||
      combined.includes('concreting') ||
      combined.includes('road opening') ||
      combined.includes('drainage system')
    ) {
      return 'Infrastructure';
    }
    return 'Goods';
  };

  // Auto-convert figures to words whenever figures change
  const handleFiguresChange = (val: string) => {
    setTotalBidAmountFigures(val);
    const num = parseNum(val);
    if (num > 0) {
      const words = numberToWords(num);
      setTotalBidAmountWords(words);
    }
  };

  const handleBlurFigures = () => {
    const num = parseNum(totalBidAmountFigures);
    if (num > 0) {
      const formatted = formatCurrency(num);
      setTotalBidAmountFigures(formatted);
      setTotalBidAmountWords(numberToWords(num));
    }
  };

  // Auto-sync total bid amount & project details strictly from this specific project's Detailed Estimates
  const syncFromDetailedEstimates = (refNo?: string, oppId?: string) => {
    const tenantId = tenant?.id || 'default';
    if (!refNo && !oppId) {
      setTotalBidAmountFigures('0.00');
      setTotalBidAmountWords('ZERO PESOS ONLY');
      return false;
    }

    // 1. Primary Statutory Authority for Delivery Schedule: Section VI Schedule of Requirements
    const secViKeys = [
      refNo ? `bidocs_sec_vi_${tenantId}_${refNo}` : '',
      oppId ? `bidocs_sec_vi_${tenantId}_${oppId}` : ''
    ].filter(Boolean);

    let deliveryFound = false;
    for (const key of secViKeys) {
      const savedSec = localStorage.getItem(key);
      if (savedSec) {
        try {
          const parsed = JSON.parse(savedSec);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const validDelivered = parsed
              .map((it: any) => (it.delivered || '').trim())
              .filter(Boolean);

            if (validDelivered.length > 0) {
              const uniqueSchedules = Array.from(new Set(validDelivered));
              setDeliverySchedule(uniqueSchedules.join(', '));
              deliveryFound = true;
              break;
            }
          }
        } catch (_) {}
      }
    }

    const keysToCheck = [
      refNo ? `bidocs_detailed_estimates_${tenantId}_${refNo}` : '',
      oppId ? `bidocs_detailed_estimates_${tenantId}_${oppId}` : '',
      refNo ? `bidocs_detailed_estimates_${refNo}` : '',
      oppId ? `bidocs_detailed_estimates_${oppId}` : ''
    ].filter(Boolean);

    for (const key of keysToCheck) {
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed) {
            // Verify this payload actually belongs to the target project
            if (refNo && parsed.projectRefNo && parsed.projectRefNo !== refNo && parsed.projectRefNo !== oppId) {
              continue;
            }

            if (parsed.ownerName && parsed.ownerName.trim()) {
              setProcuringEntity(parsed.ownerName.trim().toUpperCase());
            }
            if (parsed.projectLocation && parsed.projectLocation.trim()) {
              setProcuringEntityAddress(parsed.projectLocation.trim());
            }
            if (parsed.solicitationNumber && parsed.solicitationNumber !== 'N/A') {
              setSolicitationNumber(parsed.solicitationNumber);
            }
            if (parsed.estimateDate) {
              const d = new Date(parsed.estimateDate);
              if (!isNaN(d.getTime())) {
                setDateSubmitted(d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
              }
            }
            if (parsed.projectName && parsed.projectName.trim()) {
              setProjectTitle(parsed.projectName.trim());
              setGoodsDescription(parsed.projectName.trim());
            }

            if (!deliveryFound && parsed.deliverySchedule && parsed.deliverySchedule.trim()) {
              setDeliverySchedule(parsed.deliverySchedule.trim());
            }

            let num = 0;
            if (typeof parsed.totalEstimatedProjectCost === 'number' && parsed.totalEstimatedProjectCost > 0) {
              num = parsed.totalEstimatedProjectCost;
            } else if (parsed.totalBidAmountFigures) {
              num = parseFloat(`${parsed.totalBidAmountFigures}`.replace(/,/g, '')) || 0;
            } else if (parsed.materials && Array.isArray(parsed.materials)) {
              num = parsed.materials.reduce((sum: number, m: any) => sum + (Number(m.quantity) || 0) * (Number(m.unitPrice) || 0), 0);
            }

            if (num > 0) {
              const formattedFig = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              const words = parsed.totalBidAmountWords || numberToWords(num);
              setTotalBidAmountFigures(formattedFig);
              setTotalBidAmountWords(words);
              return true;
            }
          }
        } catch (e) {}
      }
    }

    if (deliveryFound) return true;

    // No detailed estimates exist for this specific project
    setTotalBidAmountFigures('0.00');
    setTotalBidAmountWords('ZERO PESOS ONLY');
    return false;
  };

  useEffect(() => {
    const list = getOpportunityProjects(tenant?.id);
    setOppProjects(list);

    let currentRefNo = activeProjectRefNo;
    let currentOppId = '';

    if (activeProjectRefNo) {
      const match = list.find(p => p.refNo === activeProjectRefNo);
      if (match) {
        setSelectedOppId(match.id);
        currentOppId = match.id;
        setProjectRefNo(match.refNo);
        setProjectTitle(match.title);
        setGoodsDescription(match.title);
        setProcuringEntity(`${match.procuringEntity.toUpperCase()}`);
        if (match.procuringEntityAddress || match.location) {
          setProcuringEntityAddress(match.procuringEntityAddress || match.location || '');
        }
        setProjectCategory(detectCategoryFromProject(match.title, match.refNo, match.category));
        if (match.solicitationNo) setSolicitationNumber(match.solicitationNo);
        if (match.dateTimeSubmitted) {
          setDateSubmitted(formatDateOnly(match.dateTimeSubmitted));
        }
      } else {
        setProjectCategory(detectCategoryFromProject(activeProjectTitle || '', activeProjectRefNo));
      }
    } else if (list.length > 0) {
      const first = list[0];
      setSelectedOppId(first.id);
      currentOppId = first.id;
      currentRefNo = first.refNo;
      setProjectRefNo(first.refNo);
      setProjectTitle(first.title);
      setGoodsDescription(first.title);
      setProcuringEntity(`${first.procuringEntity.toUpperCase()}`);
      if (first.procuringEntityAddress || first.location) {
        setProcuringEntityAddress(first.procuringEntityAddress || first.location || '');
      }
      setProjectCategory(detectCategoryFromProject(first.title, first.refNo, first.category));
      if (first.solicitationNo) setSolicitationNumber(first.solicitationNo);
      if (first.dateTimeSubmitted) {
        setDateSubmitted(formatDateOnly(first.dateTimeSubmitted));
      }
    }

    // Strictly sync from Detailed Estimates for this specific project only
    const targetRef = currentRefNo || projectRefNo || selectedOppId;
    syncFromDetailedEstimates(targetRef, currentOppId || selectedOppId);
  }, [tenant?.id, activeProjectRefNo]);

  const handleSelectOpportunity = (oppId: string) => {
    setSelectedOppId(oppId);
    const found = oppProjects.find(p => p.id === oppId || p.refNo === oppId);
    if (found) {
      setProjectRefNo(found.refNo);
      setProjectTitle(found.title);
      setGoodsDescription(found.title);
      setProcuringEntity(`${found.procuringEntity.toUpperCase()}`);
      if (found.procuringEntityAddress || found.location) {
        setProcuringEntityAddress(found.procuringEntityAddress || found.location || '');
      }
      setProjectCategory(detectCategoryFromProject(found.title, found.refNo, found.category));
      if (found.solicitationNo) setSolicitationNumber(found.solicitationNo);
      if (found.dateTimeSubmitted) {
        setDateSubmitted(formatDateOnly(found.dateTimeSubmitted));
      }

      // Sync strictly for this newly selected project (resets to 0.00 if no estimates exist)
      syncFromDetailedEstimates(found.refNo, found.id);
    }
  };

  const getDocumentDisplayName = () => {
    if (projectCategory === 'Infrastructure') {
      return 'Bid Form for the Procurement of Infrastructure Projects';
    }
    if (projectCategory === 'Consulting') {
      return 'Bid Form for Consulting Services';
    }
    return 'Bid Form for the Procurement of Goods';
  };

  const getPdfFilename = () => {
    const cleanRef = (projectRefNo || 'DOC').replace(/[^a-zA-Z0-9]/g, '_');
    if (projectCategory === 'Infrastructure') {
      return `Bid_Form_Infrastructure_${cleanRef}.pdf`;
    }
    if (projectCategory === 'Consulting') {
      return `Bid_Form_Consulting_${cleanRef}.pdf`;
    }
    return `Bid_Form_Goods_${cleanRef}.pdf`;
  };

  const handleExportPdf = async () => {
    setIsSaving(true);
    try {
      const elem = document.getElementById('bidform-goods-paper-container');
      if (elem) {
        await generateAndDownloadThreeLayerPdf(null, elem, undefined, getPdfFilename());
      }
    } catch (err) {
      console.error('[BidFormGoods] PDF Export Error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const docTitle = getDocumentDisplayName();
    const pdfName = getPdfFilename();
    try {
      const elem = document.getElementById('bidform-goods-paper-container');
      let dataUrl: string | undefined = undefined;
      if (elem) {
        const unit: ExportDocumentUnit = {
          title: docTitle,
          formElement: elem
        };
        dataUrl = await buildMergedThreeLayerPdfDataUrl([unit], pdfName);
      }

      if (onSaveAndComplete) {
        onSaveAndComplete(dataUrl, docTitle, projectRefNo, projectTitle);
      }
      if (onClose) onClose();
    } catch (err) {
      console.error('[BidFormGoods] Save Error:', err);
      if (onSaveAndComplete) {
        onSaveAndComplete(undefined, docTitle, projectRefNo, projectTitle);
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
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-hidden print:p-0 print:bg-white print:static">

      {/* PORTRAIT LEGAL 8.5" x 13" PRINT STYLESHEET */}
      <style>{`
        @media print {
          @page {
            size: 8.5in 13in portrait;
            margin: 0mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .single-page-paper {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            width: 8.5in !important;
            height: 13in !important;
            max-height: 13in !important;
          }
          .no-export, .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Header Bar */}
      <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between print:hidden no-export shrink-0 shadow-lg z-50">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${projectCategory === 'Infrastructure' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : (projectCategory === 'Consulting' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20')}`}>
            {projectCategory === 'Infrastructure' ? <HardHat className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{projectCategory === 'Infrastructure' ? 'Bid Form for the Procurement of Infrastructure Projects' : (projectCategory === 'Consulting' ? 'Bid Form for Consulting Services' : 'Bid Form for the Procurement of Goods')}</span>
              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-mono rounded border border-slate-700 font-bold">
                {projectCategory === 'Infrastructure' ? 'GPPB Res. 09-2020 Statutory Form' : 'PBDs Sec VIII Statutory Form'}
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-mono rounded font-bold border ${projectCategory === 'Infrastructure' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : (projectCategory === 'Consulting' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-blue-500/10 text-blue-400 border-blue-500/20')}`}>
                {projectCategory === 'Infrastructure' ? '🏗️ INFRASTRUCTURE (Yellow Theme)' : (projectCategory === 'Consulting' ? '💼 CONSULTING SERVICES (Green Theme)' : '📦 GOODS (Blue Theme)')}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Statutory Financial Envelope Bid Form for {projectCategory === 'Infrastructure' ? 'Infrastructure Projects' : (projectCategory === 'Consulting' ? 'Consulting Services' : 'Goods Procurement')} (Auto-Classified from Opportunity Finder)
            </p>
          </div>
        </div>

        {/* PROMINENT ACTIVE TARGET PROJECT SELECTOR */}
        {oppProjects.length > 0 && (
          <div className={`flex items-center gap-2 bg-slate-950 border rounded-xl px-3 py-1.5 shadow-inner ${projectCategory === 'Infrastructure' ? 'border-amber-500/50' : (projectCategory === 'Consulting' ? 'border-emerald-500/50' : 'border-blue-500/50')}`}>
            <FolderKanban className={`w-4 h-4 shrink-0 ${projectCategory === 'Infrastructure' ? 'text-amber-400' : (projectCategory === 'Consulting' ? 'text-emerald-400' : 'text-blue-400')}`} />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] font-mono font-bold uppercase ${projectCategory === 'Infrastructure' ? 'text-amber-300' : (projectCategory === 'Consulting' ? 'text-emerald-300' : 'text-blue-300')}`}>
                  Target Bidding Project:
                </span>
                {(activeProjectRefNo || (selectedOppId && selectedOppId !== '')) && (
                  <span className="text-[8.5px] text-amber-400 font-bold font-mono flex items-center gap-0.5 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/30">
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    <span>Locked</span>
                  </span>
                )}
              </div>
              <select
                value={selectedOppId}
                disabled={Boolean(activeProjectRefNo || (selectedOppId && selectedOppId !== ''))}
                onChange={(e) => handleSelectOpportunity(e.target.value)}
                className="bg-transparent text-white font-mono font-bold text-xs focus:outline-none cursor-pointer pr-2 max-w-[280px] truncate disabled:opacity-85 disabled:cursor-not-allowed"
              >
                <option value="" className="bg-slate-900 text-slate-400">-- Select Opportunity Project --</option>
                {oppProjects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    [{p.refNo}] {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* STATUTORY TEMPLATE FORMAT TOGGLE */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setProjectCategory('Goods')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${projectCategory === 'Goods' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            title="Switch to Statutory Goods Bid Form (Appendix 1)"
          >
            📦 For Goods
          </button>
          <button
            onClick={() => setProjectCategory('Infrastructure')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${projectCategory === 'Infrastructure' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
            title="Switch to Statutory Infrastructure Bid Form (GPPB Res. 09-2020)"
          >
            🏗️ For Infra
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md text-white ${projectCategory === 'Infrastructure' ? 'bg-amber-600 hover:bg-amber-500' : (projectCategory === 'Consulting' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500')}`}
          >
            <Download className="w-4 h-4" />
            <span>Export Legal PDF</span>
          </button>

          <button
            onClick={() => setShowMetadataInputs(!showMetadataInputs)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{showMetadataInputs ? 'Hide Controls' : 'Edit Bid Controls'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Print Legal Document"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-950 print:p-0 print:overflow-visible">

        {/* Collapsible Controls Panel */}
        {showMetadataInputs && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4 print:hidden no-export animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className={`text-xs font-bold font-mono flex items-center gap-2 ${projectCategory === 'Infrastructure' ? 'text-amber-400' : (projectCategory === 'Consulting' ? 'text-emerald-400' : 'text-blue-400')}`}>
                <Building2 className="w-4 h-4" />
                <span>{projectCategory} Bid Form Parameters (Auto Currency Converter & Project Sync)</span>
              </span>
              {oppProjects.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">Quick Select Project:</span>
                  <select
                    value={selectedOppId}
                    onChange={(e) => handleSelectOpportunity(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">-- Custom Inputs --</option>
                    {oppProjects.map(p => (
                      <option key={p.id} value={p.id}>[{p.refNo}] {p.title} ({p.category || 'Goods'})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 text-xs">
              {/* STRICTLY LOCKED Company Registration Name */}
              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-blue-300 flex items-center justify-between">
                  <span>Company Name:</span>
                  <span className="text-[9px] text-blue-400 font-bold flex items-center gap-0.5">
                    <Lock className="w-3 h-3" /> Registered
                  </span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  readOnly
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-blue-300 font-mono font-bold uppercase focus:outline-none cursor-not-allowed"
                />
              </div>

              {/* LOCKED PhilGEPS Ref No (Identical to selected project) */}
              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-purple-300 flex items-center justify-between">
                  <span>PhilGEPS Ref No.:</span>
                  <span className="text-[9px] text-purple-400 font-bold flex items-center gap-0.5">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                </label>
                <input
                  type="text"
                  value={projectRefNo}
                  readOnly
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-purple-300 font-mono font-bold focus:outline-none cursor-not-allowed"
                />
              </div>

              {/* Offer Action or Discounts Offered */}
              {projectCategory === 'Infrastructure' ? (
                <div>
                  <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-amber-300">Discounts Offered (Point d):</label>
                  <input
                    type="text"
                    value={discountsOffered}
                    onChange={(e) => setDiscountsOffered(e.target.value)}
                    placeholder="e.g. No discounts offered"
                    className="w-full bg-slate-950 border border-amber-500/60 rounded-lg px-2.5 py-1.5 text-amber-200 font-mono text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-emerald-300">Offer Action:</label>
                  <input
                    type="text"
                    value={offerAction}
                    onChange={(e) => setOfferAction(e.target.value)}
                    placeholder="e.g. supply, deliver, and perform"
                    className="w-full bg-slate-950 border border-emerald-500/60 rounded-lg px-2.5 py-1.5 text-emerald-200 font-mono text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
              )}

              {/* Standard Form No */}
              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-indigo-300">Standard Form No.:</label>
                <input
                  type="text"
                  value={solicitationNumber}
                  onChange={(e) => setSolicitationNumber(e.target.value)}
                  placeholder="e.g. SF-GOODS-01"
                  className="w-full bg-slate-950 border border-indigo-500/60 rounded-lg px-2.5 py-1.5 text-indigo-200 font-mono text-xs focus:outline-none focus:border-indigo-400"
                />
              </div>

              {/* Bid Bulletin No */}
              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-cyan-300">Bid Bulletin No.:</label>
                <input
                  type="text"
                  value={bidBulletins}
                  onChange={(e) => setBidBulletins(e.target.value)}
                  placeholder="e.g. Bid Bulletin No. 1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* 3 Performance Security Options: Performance Bond (30%), PSD, Manager's Check (5%/10%) */}
              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-emerald-300">
                  Performance Security Form:
                </label>
                <select
                  value={performanceSecurityOption}
                  onChange={(e) => handlePerformanceSecurityChange(e.target.value as any)}
                  className="w-full bg-slate-950 border border-emerald-500/60 rounded-lg px-2.5 py-1.5 text-emerald-300 font-mono text-xs focus:outline-none focus:border-emerald-400 cursor-pointer"
                >
                  <option value="PERFORMANCE_BOND">Option 1: Performance Bond / Surety (30%)</option>
                  <option value="PSD">Option 2: Performance Securing Declaration (PSD)</option>
                  <option value="MANAGERS_CHECK">Option 3: Manager's Check / Cash ({projectCategory === 'Infrastructure' ? '10%' : '5%'})</option>
                </select>
              </div>

              {/* Performance Security Percentage Input */}
              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-teal-300">
                  Performance Security %:
                </label>
                <input
                  type="text"
                  value={performanceSecurityOption === 'PSD' ? 'In lieu of security' : performanceSecurityPercent}
                  onChange={(e) => setPerformanceSecurityPercent(e.target.value)}
                  disabled={performanceSecurityOption === 'PSD'}
                  placeholder="e.g. thirty (30)"
                  className="w-full bg-slate-950 border border-teal-500/60 rounded-lg px-2.5 py-1.5 text-teal-200 font-mono text-xs focus:outline-none focus:border-teal-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-blue-300 flex items-center justify-between">
                  <span>Total Bid Price (₱):</span>
                  <span className="text-[9px] text-blue-400 font-bold flex items-center gap-0.5" title="Strictly locked - automatically derived from Form (L) Detailed Estimates total project cost">
                    <Lock className="w-3 h-3" /> Form (L) Locked
                  </span>
                </label>
                <input
                  type="text"
                  value={totalBidAmountFigures}
                  readOnly
                  disabled
                  title="Strictly locked - automatically derived from Form (L) Detailed Estimates Total Project Cost"
                  className="w-full bg-slate-950/80 border border-blue-500/40 rounded-lg px-2.5 py-1.5 text-blue-400 font-mono font-bold focus:outline-none text-right cursor-not-allowed select-none opacity-90"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-amber-300 flex items-center justify-between">
                  <span>Date of Submission:</span>
                  <span className="text-[9px] text-amber-400 font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                </label>
                <input
                  type="text"
                  value={dateSubmitted}
                  readOnly
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-amber-300 font-mono text-xs focus:outline-none cursor-not-allowed text-right font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-cyan-300">
                  Delivery Schedule (Calendar Days):
                </label>
                <input
                  type="text"
                  value={deliverySchedule}
                  onChange={(e) => setDeliverySchedule(e.target.value)}
                  placeholder="e.g. 30 Calendar Days upon receipt of NTP"
                  className="w-full bg-slate-950 border border-cyan-500/60 rounded-lg px-2.5 py-1.5 text-cyan-200 font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Total Bid Price in Words Preview Banner */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
                Auto-Converted Total Bid Price in Words:
              </span>
              <p className={`text-xs font-serif font-bold uppercase leading-snug tracking-wide ${projectCategory === 'Infrastructure' ? 'text-amber-300' : (projectCategory === 'Consulting' ? 'text-emerald-300' : 'text-blue-300')}`}>
                {totalBidAmountWords || 'ZERO PESOS ONLY'}
              </p>
            </div>
          </div>
        )}

        {/* 8.5" x 13" LEGAL PORTRAIT CANVAS SHEET */}
        <div
          id="bidform-goods-paper-container"
          className="bidform-goods-paper single-page-paper bg-white text-black font-serif p-5 w-[8.5in] max-w-[8.5in] min-h-[13in] max-h-[13in] aspect-[8.5/13] mx-auto text-left relative shadow-2xl print:m-0 print:p-4 print:border-none print:shadow-none overflow-hidden flex flex-col justify-between border-2 border-black rounded-2xl"
          style={{ width: '8.5in', height: '13in', boxSizing: 'border-box' }}
        >

          {/* Outer Legal Frame Border Box */}
          <div className="w-full h-full border-2 border-black rounded-xl p-4 sm:p-5 flex flex-col justify-between relative bg-white overflow-hidden space-y-1.5">

            {projectCategory === 'Infrastructure' ? (
              /* =========================================================================
                 100% UNTOUCHED STATUTORY INFRASTRUCTURE BID FORM (GPPB RESOLUTION 09-2020)
                 ========================================================================= */
              <div className="space-y-1.5 flex-1 text-black flex flex-col justify-between">
                {/* 1. Centered Header Title Block */}
                <div className="text-center border-b-2 border-black pb-1 shrink-0">
                  <h1 className="text-xs sm:text-sm font-bold font-serif uppercase tracking-wider text-black">
                    Bid Form for the Procurement of Infrastructure Projects
                  </h1>
                  <p className="text-[9.5px] italic text-black font-serif font-semibold">
                    [shall be submitted with the Bid]
                  </p>
                </div>

                {/* 2. Top Header Metadata Row */}
                <div className="py-0.5 border-b border-black/60 font-serif text-[10.5px] leading-tight space-y-0.5 shrink-0">
                  <div className="text-center">
                    <h2 className="font-bold text-xs sm:text-sm tracking-wider uppercase text-black font-serif">
                      BID FORM
                    </h2>
                  </div>
                  <div className="text-right space-y-0.5 text-[10px] text-black font-serif font-medium">
                    <div>
                      <span className="font-bold">Date of Submission : </span>
                      <span className="font-bold underline">{dateSubmitted}</span>
                    </div>
                    <div>
                      <span className="font-bold">Project Identification No. : </span>
                      <span className="font-bold underline">{projectRefNo}</span>
                    </div>
                    {solicitationNumber && solicitationNumber !== 'N/A' && (
                      <div>
                        <span className="font-bold">Solicitation No. : </span>
                        <span className="font-bold underline">{solicitationNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Addressed To */}
                <div className="text-[10.5px] font-serif space-y-0.5 text-black shrink-0">
                  <p><span className="font-bold">To: </span> <span className="font-bold uppercase underline">{procuringEntity}</span></p>
                  {procuringEntityAddress && !procuringEntityAddress.includes('Km. 5, La Trinidad') && (
                    <p className="text-black font-semibold text-[10px] uppercase">{procuringEntityAddress}</p>
                  )}
                  <p className="text-black font-semibold text-[10px]">
                    The Bids and Awards Committee (BAC) Chairman and Members
                  </p>
                </div>

                {/* 4. Opening Preamble */}
                <p className="text-[10px] font-serif text-black text-justify leading-snug font-normal">
                  Having examined the Philippine Bidding Documents (PBDs) including the Supplemental or Bid Bulletin Numbers{' '}
                  <span className="font-bold underline">{bidBulletins || 'None'}</span>
                  , the receipt of which is hereby duly acknowledged, we, the undersigned, declare that:
                </p>

                {/* 5. Statutory Clauses (Points a to l Verbatim from GPPB Resolution 09-2020) */}
                <div className="space-y-1 text-[10px] font-serif text-black leading-tight">
                  <div className="flex gap-1.5 items-start">
                    <span className="font-bold shrink-0">a.</span>
                    <p className="text-justify font-normal text-black">
                      We have no reservation to the PBDs, including the Supplemental or Bid Bulletins, for the Procurement Project:{' '}
                      <span className="font-bold uppercase text-black underline">{projectTitle}</span>;
                    </p>
                  </div>

                  <div className="flex gap-1.5 items-start">
                    <span className="font-bold shrink-0">b.</span>
                    <p className="text-justify font-normal text-black">
                      We offer to execute the Works for this Contract in accordance with the PBDs;
                    </p>
                  </div>

                  <div className="flex gap-1.5 items-start">
                    <span className="font-bold shrink-0">c.</span>
                    <div className="space-y-0.5 w-full">
                      <p className="text-justify font-normal text-black">
                        The total price of our Bid in words and figures, excluding any discounts offered below is:
                      </p>
                      <div className="p-1.5 rounded bg-slate-50 border-2 border-black font-serif space-y-0.5 my-0.5">
                        <p className="font-bold text-[10.5px] uppercase underline tracking-wide text-black">
                          {totalBidAmountWords || 'ZERO PESOS ONLY'}
                        </p>
                        <p className="font-bold text-[11px] text-black font-mono">
                          (Php {totalBidAmountFigures || '0.00'})
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1.5 items-start">
                    <span className="font-bold shrink-0">d.</span>
                    <p className="text-justify font-normal">
                      The discounts offered and the methodology for their application are:{' '}
                      <span className="font-bold underline">{discountsOffered || 'No discounts offered'}</span>;
                    </p>
                  </div>

                  <div className="flex gap-1.5 items-start">
                    <span className="font-bold shrink-0">e.</span>
                    <p className="text-justify font-normal">
                      The total bid price includes the cost of all taxes, such as, but not limited to: <span className="italic font-medium">(i) value added tax (VAT), (ii) income tax, (iii) local taxes, and (iv) other fiscal levies and duties</span>, which are itemized herein and reflected in the detailed estimates,
                    </p>
                  </div>

                  <div className="flex gap-1.5 items-start">
                    <span className="font-bold shrink-0">f.</span>
                    <p className="text-justify font-normal">
                      Our Bid shall be valid within the period stated in the PBDs, and it shall remain binding upon us at any time before the expiration of that period;
                    </p>
                  </div>

                  <div className="flex gap-1.5 items-start">
                    <span className="font-bold shrink-0">g.</span>
                    {performanceSecurityOption === 'PSD' ? (
                      <p className="text-justify font-normal">
                        If our Bid is accepted, we commit to submit a <span className="font-bold underline uppercase text-black">Performance Securing Declaration</span> in lieu of the allowable forms of Performance Security for the due performance of the Contract, subject to the terms and conditions of issued GPPB guidelines¹ for this purpose;
                      </p>
                    ) : performanceSecurityOption === 'MANAGERS_CHECK' ? (
                      <p className="text-justify font-normal">
                        If our Bid is accepted, we commit to obtain a Performance Security in the form of <span className="font-bold underline text-black">Cash, Cashier's / Manager's Check, Bank Draft/Guarantee or Irrevocable Letter of Credit</span> in the amount of <span className="font-bold underline">{performanceSecurityPercent || 'ten (10)'} percent</span> of the Contract Price for the due performance of the Contract;
                      </p>
                    ) : (
                      <p className="text-justify font-normal">
                        If our Bid is accepted, we commit to obtain a Performance Security in the form of a <span className="font-bold underline text-black">Performance Bond / Surety Bond</span> callable upon demand in the amount of <span className="font-bold underline">{performanceSecurityPercent || 'thirty (30)'} percent</span> of the Contract Price for the due performance of the Contract;
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1.5 items-start">
                    <span className="font-bold shrink-0">h.</span>
                    <p className="text-justify font-normal">
                      We are not participating, as Bidders, in more than one Bid in this bidding process, other than alternative offers in accordance with the Bidding Documents;
                    </p>
                  </div>

                  <div className="flex gap-1.5 items-start">
                    <span className="font-bold shrink-0">i.</span>
                    <p className="text-justify font-normal">
                      We understand that this Bid, together with your written acceptance thereof included in your notification of award, shall constitute a binding contract between us, until a formal Contract is prepared and executed; and
                    </p>
                  </div>

                  <div className="flex gap-1.5 items-start">
                    <span className="font-bold shrink-0">j.</span>
                    <p className="text-justify font-normal">
                      We understand that you are not bound to accept the Lowest Calculated Bid or any other Bid that you may receive.
                    </p>
                  </div>

                  <div className="flex gap-1.5 items-start">
                    <span className="font-bold shrink-0">k.</span>
                    <p className="text-justify font-normal">
                      We likewise certify/confirm that the undersigned, is the duly authorized representative of the bidder, and granted full power and authority to do, execute and perform any and all acts necessary to participate, submit the bid, and to sign and execute the ensuing contract for the <span className="font-bold uppercase">{projectTitle}</span> of the <span className="font-bold uppercase">{procuringEntity}</span>.
                    </p>
                  </div>

                  <div className="flex gap-1.5 items-start">
                    <span className="font-bold shrink-0">l.</span>
                    <p className="text-justify font-bold text-black">
                      We acknowledge that failure to sign each and every page of this Bid Form, including the Bill of Quantities, shall be a ground for the rejection of our bid.
                    </p>
                  </div>
                </div>

                {/* Footnote 1 */}
                <div className="text-[8.5px] font-serif italic text-black/80 pt-0.5 border-t border-black/40">
                  ¹ currently based on GPPB Resolution No. 09-2020
                </div>

                {/* Signatory Block */}
                <div className="pt-1 font-serif text-[9.5px] text-black space-y-1 border-t border-slate-300">
                  <div className="grid grid-cols-1 gap-0.5">
                    <p>
                      <span className="font-bold">Name: </span>
                      <span className="font-bold uppercase underline text-black">{signatoryName}</span>
                    </p>
                    <p>
                      <span className="font-bold">Legal Capacity: </span>
                      <span className="font-semibold underline text-black">{signatoryTitle}</span>
                    </p>
                    <p>
                      <span className="font-bold">Signature: </span>
                      <span className="inline-block border-b border-black w-72"></span>
                    </p>
                    <p>
                      <span className="font-bold">Duly authorized to sign the Bid for and behalf of: </span>
                      <span className="font-bold uppercase underline text-black">{companyName}</span>
                    </p>
                    <p>
                      <span className="font-bold">Date: </span>
                      <span className="font-bold underline text-black">{dateSubmitted}</span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* =========================================================================
                 100% UNTOUCHED STATUTORY GOODS / CONSULTING BID FORM (GPPB APPENDIX 1)
                 ========================================================================= */
              <div className="space-y-1.5 flex-1 text-black flex flex-col justify-between">
                {/* 1. Top Right Appendix Tag & Centered Header Title Block */}
                <div className="shrink-0">
                  <div className="text-right text-[10px] font-serif font-bold text-black uppercase tracking-wider mb-0.5">
                    APPENDIX &ldquo;1&rdquo;
                  </div>
                  <div className="text-center pb-1">
                    <h1 className="text-sm font-bold font-serif uppercase tracking-wider text-black">
                      {projectCategory === 'Consulting' ? 'Bid Form for Consulting Services' : 'Bid Form for the Procurement of Goods'}
                    </h1>
                    <p className="text-[10px] italic text-black font-serif font-semibold">
                      [shall be submitted with the Bid]
                    </p>
                  </div>
                  <hr className="border-t border-black my-1" />
                </div>

                {/* 2. Top Header Metadata Row */}
                <div className="py-0.5 font-serif text-[10.5px] leading-tight space-y-0.5 text-black shrink-0">
                  <div className="text-center">
                    <h2 className="font-bold text-xs sm:text-sm tracking-wider uppercase text-black font-serif">
                      BID FORM
                    </h2>
                  </div>
                  <div className="text-right space-y-0.5 text-[10px] text-black font-serif font-medium">
                    <div>
                      <span className="font-bold">Date : </span>
                      <span className="font-bold underline text-black">{dateSubmitted}</span>
                    </div>
                    <div>
                      <span className="font-bold">Project Identification No. : </span>
                      <span className="font-bold underline text-black">{projectRefNo}</span>
                    </div>
                    {solicitationNumber && solicitationNumber !== 'N/A' && (
                      <div>
                        <span className="font-bold">Solicitation No. : </span>
                        <span className="font-bold underline text-black">{solicitationNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Addressed To */}
                <div className="text-[10.5px] font-serif space-y-0.5 text-black shrink-0">
                  <p><span className="font-bold">To: </span> <span className="font-bold uppercase underline text-black">{procuringEntity}</span></p>
                  {procuringEntityAddress && !procuringEntityAddress.includes('Km. 5, La Trinidad') && (
                    <p className="text-black font-semibold text-[10px] uppercase">{procuringEntityAddress}</p>
                  )}
                  <p className="text-black font-semibold text-[10px]">
                    The Bids and Awards Committee (BAC) Chairman and Members
                  </p>
                </div>

                {/* 4. Opening Preamble */}
                <p className="text-[10px] font-serif font-normal text-black text-justify leading-snug">
                  Having examined the Philippine Bidding Documents (PBDs) including the Supplemental or Bid Bulletin Numbers{' '}
                  <span className="font-bold underline text-black">{bidBulletins || 'None'}</span>
                  , the receipt of which is hereby duly acknowledged, we, the undersigned, offer to{' '}
                  <span className="font-bold underline text-black">{offerAction || 'supply, deliver, and perform'}</span>{' '}
                  <span className="font-bold uppercase text-black underline">{projectTitle}</span> in conformity with the said PBDs for the sum of:
                </p>

                {/* Total Bid Amount Box */}
                <div className="p-1.5 rounded bg-slate-50 border-2 border-black font-serif space-y-0.5 my-0.5">
                  <p className="font-bold text-[10.5px] uppercase underline tracking-wide text-black">
                    {totalBidAmountWords || 'ZERO PESOS ONLY'}
                  </p>
                  <p className="font-bold text-[11px] text-black font-mono">
                    (Php {totalBidAmountFigures || '0.00'})
                  </p>
                </div>

                <p className="text-[9.5px] font-serif font-normal text-black text-justify leading-snug">
                  or the total calculated bid price, as evaluated and corrected for computational errors, and other bid modifications in accordance with the Price Schedules attached herewith and made part of this Bid. The total bid price includes the cost of all taxes, such as, but not limited to: <span className="italic font-semibold text-black">(i) value added tax (VAT), (ii) income tax, (iii) local taxes, and (iv) other fiscal levies and duties</span>, which are itemized herein or in the Price Schedules,
                </p>

                {/* 5. Undertakings (Points a, b, c) */}
                <div className="space-y-0.5 text-[9.5px] font-serif text-black leading-snug">
                  <p className="font-bold text-black">If our Bid is accepted, we undertake:</p>
                  <div className="flex gap-1.5 items-start pl-2">
                    <span className="font-bold text-black shrink-0">a.</span>
                    <p className="text-justify font-normal text-black">
                      to deliver the goods in accordance with the delivery schedule specified in the Schedule of Requirements of the Philippine Bidding Documents (PBDs) (<span className="font-bold underline text-black">{deliverySchedule}</span>);
                    </p>
                  </div>
                  <div className="flex gap-1.5 items-start pl-2">
                    <span className="font-bold text-black shrink-0">b.</span>
                    {performanceSecurityOption === 'PSD' ? (
                      <p className="text-justify font-normal text-black">
                        to provide a performance security in the form of a <span className="font-bold underline uppercase text-black">Performance Securing Declaration</span> in lieu of the allowable forms of Performance Security for the due performance of the Contract, and within the times prescribed in the PBDs;
                      </p>
                    ) : performanceSecurityOption === 'MANAGERS_CHECK' ? (
                      <p className="text-justify font-normal text-black">
                        to provide a performance security in the form of <span className="font-bold underline text-black">Cash, Cashier&apos;s / Manager&apos;s Check, Bank Draft/Guarantee or Irrevocable Letter of Credit</span> in the amount of <span className="font-bold underline text-black">{performanceSecurityPercent || 'five (5)'} percent</span> of the Contract Price, and within the times prescribed in the PBDs;
                      </p>
                    ) : (
                      <p className="text-justify font-normal text-black">
                        to provide a performance security in the form of a <span className="font-bold underline text-black">Performance Bond / Surety Bond</span> callable upon demand in the amount of <span className="font-bold underline text-black">{performanceSecurityPercent || 'thirty (30)'} percent</span> of the Contract Price, and within the times prescribed in the PBDs;
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 items-start pl-2">
                    <span className="font-bold text-black shrink-0">c.</span>
                    <p className="text-justify font-normal text-black">
                      to abide by the Bid Validity Period specified in the PBDs and it shall remain binding upon us at any time before the expiration of that period.
                    </p>
                  </div>
                </div>

                {/* 6. Commissions Clause */}
                <div className="space-y-0.5 text-[9px] font-serif text-black leading-tight border-y border-black/50 py-0.5">
                  <p className="italic text-[8.5px] font-bold text-black">
                    [Insert this paragraph if Foreign-Assisted Project with the Development Partner:
                  </p>
                  <p className="text-justify font-normal text-black">
                    Commissions or gratuities, if any, paid or to be paid by us to agents relating to this Bid, and to contract execution if we are awarded the contract, are listed below:
                  </p>
                  <div className="flex justify-between items-center font-bold text-[8.5px] text-black border-b border-black pb-0.5">
                    <span>Name and address of agent</span>
                    <span>Amount and Currency</span>
                    <span>Purpose of Commission or gratuity</span>
                  </div>
                  <div className="text-center font-bold italic py-0.5 text-black">
                    {commissionsText || 'None'}
                  </div>
                  <p className="italic text-[8.5px] font-bold text-black">(if none, state &ldquo;None&rdquo;)]</p>
                </div>

                {/* 7. Closing Statutory Declarations */}
                <div className="space-y-0.5 text-[9.5px] font-serif text-black leading-snug">
                  <p className="text-justify font-normal text-black">
                    Until a formal Contract is prepared and executed, this Bid, together with your written acceptance thereof and your Notice of Award, shall be binding upon us.
                  </p>
                  <p className="text-justify font-normal text-black">
                    We understand that you are not bound to accept the Lowest Calculated Bid or any Bid you may receive.
                  </p>
                  <p className="text-justify font-normal text-black">
                    We certify/confirm that we comply with the eligibility requirements pursuant to the PBDs.
                  </p>
                  <p className="text-justify font-normal text-black">
                    The undersigned is authorized to submit the bid on behalf of <span className="font-bold uppercase underline text-black">{companyName}</span> as evidenced by the attached <span className="font-bold underline text-black">{writtenAuthority}</span>.
                  </p>
                  <p className="text-justify font-bold text-black">
                    We acknowledge that failure to sign each and every page of this Bid Form, including the attached Schedule of Prices, shall be a ground for the rejection of our bid.
                  </p>
                </div>

                {/* 8. STATUTORY GPPB SIGNATORY BLOCK */}
                <div className="pt-1 font-serif text-[9.5px] text-black space-y-1 border-t border-slate-300">
                  <div className="grid grid-cols-1 gap-0.5">
                    <p>
                      <span className="font-bold">Name: </span>
                      <span className="font-bold uppercase underline text-black">{signatoryName}</span>
                    </p>
                    <p>
                      <span className="font-bold">Legal capacity: </span>
                      <span className="font-semibold underline text-black">{signatoryTitle}</span>
                    </p>
                    <p>
                      <span className="font-bold">Signature: </span>
                      <span className="inline-block border-b border-black w-72"></span>
                    </p>
                    <p>
                      <span className="font-bold">Duly authorized to sign the Bid for and behalf of: </span>
                      <span className="font-bold uppercase underline text-black">{companyName}</span>
                    </p>
                    <p>
                      <span className="font-bold">Date: </span>
                      <span className="font-bold underline text-black">{dateSubmitted}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* FOOTER QR CODE VERIFICATION SEAL */}
            <div className="pt-1 border-t-2 border-black flex items-center justify-between px-1 pb-0.5 shrink-0 text-black">
              <div className="space-y-0.5">
                <span className="text-[9px] font-mono font-bold text-black uppercase block">
                  VERIFIED STATUTORY FINANCIAL {projectCategory.toUpperCase()} EXHIBIT • REF: {projectRefNo || '12795242'}
                </span>
                <span className="text-[8px] font-mono font-bold text-black block">
                  {projectCategory === 'Infrastructure' ? 'GPPB RES. 09-2020 FINANCIAL BID FORM FOR INFRASTRUCTURE' : 'PBDs SECTION VIII FINANCIAL BID FORM'}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-[8.5px] font-mono leading-tight text-right text-black space-y-0.5 max-w-[200px]">
                  <p className="font-bold text-black uppercase truncate">{companyName}</p>
                  <p className="font-bold text-black truncate">REF: {projectRefNo || '12795242'}</p>
                  <p className="font-bold text-black truncate">
                    BID: Php {totalBidAmountFigures || '0.00'}
                  </p>
                </div>

                <DocumentQrCode
                  details={{
                    companyName: companyName,
                    documentName: `BID FORM FOR ${projectCategory.toUpperCase()}`,
                    documentNumber: `FIN-BIDFORM-${projectCategory.toUpperCase()}-${projectRefNo || '12795242'}`,
                    projectTitle: projectTitle,
                    projectRefNo: projectRefNo || '12795242',
                    procuringEntity: procuringEntity,
                    dateTimeSubmitted: dateSubmitted,
                    documentCategory: 'Financial Documents',
                    generatedBy: companyName
                  }}
                  size={52}
                  showCaption={false}
                />
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Modal Bottom Actions */}
      <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between print:hidden no-export shrink-0">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          Cancel
        </button>
        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={handleExportPdf}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition shadow flex items-center gap-2 cursor-pointer ${projectCategory === 'Infrastructure' ? 'bg-amber-600 hover:bg-amber-500' : (projectCategory === 'Consulting' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500')}`}
          >
            <Download className="w-4 h-4" />
            <span>Export Legal PDF</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition shadow flex items-center gap-2 cursor-pointer disabled:opacity-50 ${projectCategory === 'Infrastructure' ? 'bg-amber-600 hover:bg-amber-500' : (projectCategory === 'Consulting' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500')}`}
          >
            <FileSignature className="w-4 h-4" />
            <span>Save & Complete Financial Exhibit</span>
          </button>
        </div>
      </div>

    </div>
  );
};

export const BidFormForGoodsModal: React.FC<BidFormForGoodsModalProps> = (props) => (
  <VaultErrorBoundary fallbackTitle="Bid Form for Goods Modal">
    <BidFormForGoodsModalContent {...props} />
  </VaultErrorBoundary>
);

export default BidFormForGoodsModal;

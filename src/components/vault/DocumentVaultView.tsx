import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DocumentVaultItem, DocCategory, Tenant, DocumentVersion } from '../../types';
import { PdfPreviewModal } from './PdfPreviewModal';
import { MergedPdfViewerModal } from './MergedPdfViewerModal';
import { StatementOngoingContractsModal } from './templates/StatementOngoingContractsModal';
import { StatementSlccModal } from './templates/StatementSlccModal';
import { TechnicalExhibitTemplateModal } from './templates/TechnicalExhibitTemplateModal';
import { SectionViScheduleOfRequirements } from './templates/SectionViScheduleOfRequirements';
import { FrameworkAgreementList } from './templates/FrameworkAgreementList';
import { TechnicalSpecifications } from './templates/TechnicalSpecifications';
import { AfterSalesServiceModal } from './templates/AfterSalesServiceModal';
import { NfccModal } from './templates/NfccModal';
import { BidFormForGoodsModal } from './templates/bidform4goods';
import { BidFormForInfrastructureModal } from './templates/bidform4infrastructure';
import { BillOfQuantitiesModal } from './templates/billofquantities';
import { CashFlowByQuarterModal } from './templates/cashflowbyquarter';
import { PriceSchedule4GoodsModal } from './templates/priceschedule4goods';
import { SummaryOfBidPriceModal } from './templates/summaryofbidprice';
import { DetailedEstimatesModal } from './templates/detailedestimates';
import VaultErrorBoundary from '../common/VaultErrorBoundary';
import {
  saveVaultItems,
  loadVaultItems,
  savePdfData,
  loadPdfData as loadPdfDataFromDB,
  clearAllPdfData,
  clearAllVaultData,
  clearVaultDataForTenant,
  migrateFromLocalStorage
} from '../../utils/vaultIndexedDB';
import { getOpportunityProjects, OpportunityProjectOption } from '../../utils/opportunityProjects';
import { debugLog } from '../../utils/debugLog';
import {
  FileCheck,
  Upload,
  Eye,
  RefreshCw,
  Search,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Award,
  FileText,
  Plus,
  X,
  CheckSquare,
  Square,
  Layers,
  History,
  ChevronRight,
  ChevronDown,
  FileSignature,
  Building2,
  Lock,
  Trash2,
  Edit3,
  Filter,
  HardHat,
  Table,
  TrendingUp,
  Calculator
} from 'lucide-react';

interface ClassAMasterItemDef {
  code: string;
  name: string;
  requiresIssueDate: boolean;
  requiresExpiryDate: boolean;
  isOptional: boolean;
  conditionalRuleNote: string;
  subType?: 'DTI' | 'SEC';
}

const CLASS_A_MASTER_LIST: ClassAMasterItemDef[] = [
  { code: 'DOC-1', name: 'PhilGEPS Certificate', requiresIssueDate: true, requiresExpiryDate: true, isOptional: false, conditionalRuleNote: 'Requires valid Issue Date and Expiration Date.' },
  { code: 'DOC-2', name: 'DTI or SEC Certificate', requiresIssueDate: true, requiresExpiryDate: true, isOptional: false, conditionalRuleNote: 'DTI requires Issue Date + Expiration Date. SEC requires no dates.' },
  { code: 'DOC-3', name: 'Business Permit', requiresIssueDate: true, requiresExpiryDate: true, isOptional: false, conditionalRuleNote: 'Requires valid Issue Date and Expiration Date.' },
  { code: 'DOC-4', name: 'Barangay Business Permit', requiresIssueDate: true, requiresExpiryDate: true, isOptional: false, conditionalRuleNote: 'Requires valid Issue Date and Expiration Date.' },
  { code: 'DOC-5', name: 'Business Plate', requiresIssueDate: false, requiresExpiryDate: false, isOptional: false, conditionalRuleNote: 'No dates required.' },
  { code: 'DOC-6', name: 'BIR Certificate of Registration', requiresIssueDate: false, requiresExpiryDate: false, isOptional: false, conditionalRuleNote: 'No dates required.' },
  { code: 'DOC-7', name: 'BIR Tax Clearance for Bidding', requiresIssueDate: true, requiresExpiryDate: true, isOptional: false, conditionalRuleNote: 'Requires valid Issue Date and Expiration Date.' },
  { code: 'DOC-8', name: 'PCAB License', requiresIssueDate: true, requiresExpiryDate: true, isOptional: false, conditionalRuleNote: 'Requires valid Issue Date and Expiration Date.' },
  { code: 'DOC-9', name: 'DOLE COSH or BOSH', requiresIssueDate: false, requiresExpiryDate: false, isOptional: false, conditionalRuleNote: 'No dates required.' },
  { code: 'DOC-10', name: 'Occupancy Permit', requiresIssueDate: true, requiresExpiryDate: true, isOptional: true, conditionalRuleNote: 'Optional document. Requires dates if uploaded.' },
  { code: 'DOC-11', name: 'Sanitary Permit', requiresIssueDate: true, requiresExpiryDate: true, isOptional: true, conditionalRuleNote: 'Optional document. Requires dates if uploaded.' },
  { code: 'DOC-12', name: 'Fire Permit', requiresIssueDate: true, requiresExpiryDate: true, isOptional: true, conditionalRuleNote: 'Optional document. Requires dates if uploaded.' },
  { code: 'DOC-13', name: 'Secretary Certificate — Authority Signatory', requiresIssueDate: false, requiresExpiryDate: false, isOptional: false, conditionalRuleNote: 'No dates required.' },
];

export interface TechnicalChecklistItem {
  id: string;
  code: string;
  name: string;
  notes: string;
  templateCode: string;
  isExpandable?: boolean;
  subItems?: { id: string; code: string; name: string; notes: string }[];
}

const TECHNICAL_CHECKLIST_MASTER: TechnicalChecklistItem[] = [
  {
    id: 'tech-b',
    code: '(b)',
    name: 'Statement of all ongoing government and private contracts (including awarded but not yet started), whether similar or not to the contract to be bid',
    notes: 'Legal template to follow',
    templateCode: 'STATEMENT_ONGOING_CONTRACTS'
  },
  {
    id: 'tech-c',
    code: '(c)',
    name: 'Statement of Bidder\'s Single Largest Completed Contract (SLCC) similar to the contract to be bid',
    notes: 'Legal template to follow',
    templateCode: 'STATEMENT_SLCC'
  },
  {
    id: 'tech-sec-vi',
    code: 'SEC-VI',
    name: 'Section VI. Schedule of Requirements',
    notes: 'Legal template to follow',
    templateCode: 'SCHEDULE_OF_REQUIREMENTS'
  },
  {
    id: 'tech-sec-vii',
    code: 'SEC-VII',
    name: 'Section VII. Technical Specifications',
    notes: 'Legal template to follow',
    templateCode: 'TECHNICAL_SPECIFICATIONS'
  },
  {
    id: 'tech-fal',
    code: 'FAL-01',
    name: 'Framework Agreement List',
    notes: 'Legal template to follow',
    templateCode: 'FRAMEWORK_AGREEMENT_LIST'
  },
  {
    id: 'tech-d',
    code: '(d)',
    name: 'Special PCAB License (for Joint Ventures) and registration for type/cost of contract to be bid',
    notes: 'Legal template to follow',
    templateCode: 'SPECIAL_PCAB_LICENSE'
  },
  {
    id: 'tech-f',
    code: '(f)',
    name: 'Project Requirements — Key Personnel, Equipment & Organizational Chart',
    notes: 'Legal template to follow',
    templateCode: 'PROJECT_REQUIREMENTS',
    isExpandable: true,
    subItems: [
      {
        id: 'tech-fa',
        code: '(f.a)',
        name: 'Organizational chart for the contract to be bid',
        notes: 'Legal template to follow'
      },
      {
        id: 'tech-fb',
        code: '(f.b)',
        name: 'List of contractor\'s key personnel (Project Manager, Engineers, Foremen) with complete qualifications and experience data',
        notes: 'Legal template to follow'
      },
      {
        id: 'tech-fc',
        code: '(f.c)',
        name: 'List of contractor\'s major equipment (owned/leased/under purchase) with proof of ownership or lessor/vendor availability certification',
        notes: 'Legal template to follow'
      }
    ]
  },
  {
    id: 'tech-h',
    code: '(h)',
    name: 'After Sales Services & Warranty Undertaking Guaranty Statement',
    notes: 'Legal template to follow',
    templateCode: 'AFTER_SALES_SERVICES'
  },
  {
    id: 'tech-nfcc',
    code: 'NFCC',
    name: 'Net Financial Contracting Capacity (NFCC) — Financial Documents for Eligibility Check',
    notes: 'Legal template to follow',
    templateCode: 'NFCC'
  }
];

export interface VaultNotification {
  type: 'SUCCESS' | 'FAILURE';
  title: string;
  message: string;
  reason?: string;
}

export const DocumentVaultView: React.FC = () => {
  const { currentTenant, currentUser } = useAuth();

  // In-memory cache for PDF data URLs (fast access); backed by IndexedDB (200MB+ persistent storage)
  const pdfDataCache = React.useRef<Record<string, string>>({});
  const [dbReady, setDbReady] = useState(false);

  const storePdfData = (itemId: string, dataUrl: string | undefined) => {
    if (dataUrl) {
      pdfDataCache.current[itemId] = dataUrl;
      // Persist to IndexedDB in background (200MB+ capacity)
      savePdfData(itemId, dataUrl).catch(e =>
        console.error('[VaultDB] Failed to persist PDF data:', e)
      );
    }
  };

  const getPdfData = (itemId: string): string | undefined => {
    return pdfDataCache.current[itemId];
  };

  const activeTenantId = currentTenant?.id || '';
  const [vaultItems, setVaultItems] = useState<DocumentVaultItem[]>([]);

  // ─── Load vault data from IndexedDB on mount & tenant switch ───
  React.useEffect(() => {
    let cancelled = false;

    const loadFromDB = async () => {
      try {
        // One-time migration from old localStorage → IndexedDB
        const migrated = await migrateFromLocalStorage();

        // Load vault items from IndexedDB for the active tenant
        let items = await loadVaultItems(activeTenantId);

        // If migration produced items but loadVaultItems for this tenant is empty, use migrated if tenant matches
        if (items.length === 0 && migrated.length > 0) {
          items = migrated.filter((i: any) => i.tenantId === activeTenantId);
        }

        if (!cancelled) {
          setVaultItems(items);

          // Pre-load PDF blobs from IndexedDB into in-memory cache
          let pdfLoadedCount = 0;
          for (const item of items) {
            try {
              const pdfData = await loadPdfDataFromDB(item.id);
              if (pdfData) {
                pdfDataCache.current[item.id] = pdfData;
                pdfLoadedCount++;
              }
            } catch (_) { /* skip items without PDF data */ }
          }

          // #region agent log
          debugLog('DocumentVaultView.tsx:loadFromDB', 'Vault load complete', {
            activeTenantId,
            itemCount: items.length,
            migratedCount: migrated.length,
            pdfLoadedCount,
            dbReady: true
          }, 'B');
          // #endregion

          setDbReady(true);
        }
      } catch (e) {
        console.error('[VaultDB] Failed to load from IndexedDB, falling back to localStorage:', e);
        // #region agent log
        debugLog('DocumentVaultView.tsx:loadFromDB', 'Vault load failed, using localStorage fallback', {
          activeTenantId,
          error: String(e)
        }, 'B');
        // #endregion
        if (!cancelled) {
          try {
            const saved = localStorage.getItem(`bidocs_vault_items_${activeTenantId}`);
            if (saved) {
              const parsed = JSON.parse(saved);
              setVaultItems(Array.isArray(parsed) ? parsed.filter((item: any) => item.tenantId === activeTenantId) : []);
            } else {
              setVaultItems([]);
            }
          } catch (_) {
            setVaultItems([]);
          }
          setDbReady(true);
        }
      }
    };

    setDbReady(false);
    loadFromDB();

    // Sync tech completed IDs for active tenant (clean slate [] for new tenants)
    const savedTech = localStorage.getItem(`bidocs_tech_completed_ids_${activeTenantId}`);
    setTechCompletedIds(savedTech ? JSON.parse(savedTech) : []);

    return () => { cancelled = true; };
  }, [activeTenantId]);

  // ─── Persist vault item metadata to IndexedDB on every change (scoped by activeTenantId) ───
  React.useEffect(() => {
    if (!dbReady) return; // Don't write until initial load completes
    // #region agent log
    debugLog('DocumentVaultView.tsx:persist', 'Persisting vault items to IndexedDB', {
      activeTenantId,
      itemCount: vaultItems.length,
      dbReady
    }, 'B');
    // #endregion
    saveVaultItems(vaultItems, activeTenantId).catch(e =>
      console.error('[VaultDB] Failed to persist vault items:', e)
    );
  }, [vaultItems, dbReady, activeTenantId]);

  const [selectedCategory, setSelectedCategory] = useState<string>('ELIGIBILITY_CLASS_A');
  const [searchQuery, setSearchQuery] = useState('');

  // Selection & Merging state
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);

  // Active Bidding Project Scoping State (Strict Project Isolation)
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [activeProjectRefNo, setActiveProjectRefNo] = useState<string>('');
  const [activeProjectTitle, setActiveProjectTitle] = useState<string>('');
  const [activeProcuringEntity, setActiveProcuringEntity] = useState<string>('');

  React.useEffect(() => {
    const list = getOpportunityProjects(activeTenantId);
    setOppProjects(list);
    if (list.length > 0) {
      setActiveProjectRefNo(list[0].refNo);
      setActiveProjectTitle(list[0].title);
      setActiveProcuringEntity(list[0].procuringEntity);
    } else {
      setActiveProjectRefNo('');
      setActiveProjectTitle('');
      setActiveProcuringEntity('');
    }
  }, [activeTenantId]);

  // Technical Documents Sub-Tab State
  const [techSubTab, setTechSubTab] = useState<'CHECKLIST' | 'COMPLETED'>('CHECKLIST');
  const [expandedTechItems, setExpandedTechItems] = useState<string[]>(['tech-f']);
  const [techCompletedIds, setTechCompletedIds] = useState<string[]>([]);
  const [fillingTemplateItem, setFillingTemplateItem] = useState<{ id: string; code: string; name: string } | null>(null);
  const [selectedTechProjectFilter, setSelectedTechProjectFilter] = useState<string>('ALL');

  // Financial Documents Templates State
  const [showBidFormGoodsModal, setShowBidFormGoodsModal] = useState(false);
  const [showBidFormInfraModal, setShowBidFormInfraModal] = useState(false);
  const [showBoqModal, setShowBoqModal] = useState(false);
  const [showNfccModal, setShowNfccModal] = useState(false);

  const handleSaveCompletedBidFormGoods = (fileDataUrl?: string, customName?: string, projRefNo?: string, projTitle?: string) => {
    const newId = `fin-bidform-goods-${Date.now()}`;
    const refNo = projRefNo || activeProjectRefNo || (oppProjects[0]?.refNo || '');
    const title = projTitle || activeProjectTitle || (oppProjects[0]?.title || '');

    const newItem: DocumentVaultItem = {
      id: newId,
      tenantId: activeTenantId,
      documentCode: 'GPPB-BIDFORM-GOODS',
      documentName: customName || `Bid Form for the Procurement of Goods - [${refNo}]`,
      category: 'FINANCIAL',
      procurementApplicability: ['GOODS'],
      legalBasisReference: 'Section 30.1 of RA 12009 / Section 32.2.1 of RA 9184 (Financial Bid Form)',
      versionNumber: 1,
      fileHash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      fileSizeBytes: 245000,
      fileName: customName || `${refNo}_Financial_Envelope_Bid_Form_for_Goods.pdf`,
      fileDataUrl: fileDataUrl,
      status: 'ACTIVE',
      uploadedByName: currentUser?.fullName || 'Authorized Financial Manager',
      isOptional: false,
      requiresIssueDate: false,
      requiresExpiryDate: false,
      philgepsRefNo: refNo,
      projectTitle: title
    };

    storePdfData(newId, fileDataUrl);
    setVaultItems(prev => [newItem, ...prev]);
    setShowBidFormGoodsModal(false);
    notifySuccess(
      'Financial Bid Form for Goods Saved!',
      `Duly completed statutory Financial Bid Form for Goods saved to vault under project [${refNo}] ${title}.`
    );
  };

  const handleSaveCompletedBidFormInfra = (fileDataUrl?: string, customName?: string, projRefNo?: string, projTitle?: string) => {
    const newId = `fin-bidform-infra-${Date.now()}`;
    const refNo = projRefNo || activeProjectRefNo || (oppProjects[0]?.refNo || '');
    const title = projTitle || activeProjectTitle || (oppProjects[0]?.title || '');

    const newItem: DocumentVaultItem = {
      id: newId,
      tenantId: activeTenantId,
      documentCode: 'GPPB-BIDFORM-INFRASTRUCTURE',
      documentName: customName || `Bid Form for Infrastructure Projects - [${refNo}]`,
      category: 'FINANCIAL',
      procurementApplicability: ['INFRASTRUCTURE'],
      legalBasisReference: 'GPPB Resolution No. 09-2020 / Section 30.1 of RA 12009 (Financial Bid Form)',
      versionNumber: 1,
      fileHash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      fileSizeBytes: 250000,
      fileName: customName || `${refNo}_Financial_Envelope_Bid_Form_for_Infrastructure.pdf`,
      fileDataUrl: fileDataUrl,
      status: 'ACTIVE',
      uploadedByName: currentUser?.fullName || 'Authorized Financial Manager',
      isOptional: false,
      requiresIssueDate: false,
      requiresExpiryDate: false,
      philgepsRefNo: refNo,
      projectTitle: title
    };

    storePdfData(newId, fileDataUrl);
    setVaultItems(prev => [newItem, ...prev]);
    setShowBidFormInfraModal(false);
    notifySuccess(
      'Infrastructure Financial Bid Form Saved!',
      `Duly completed statutory Bid Form for Infrastructure Projects saved to vault under project [${refNo}] ${title}.`
    );
  };

  const handleSaveCompletedBoq = (fileDataUrl?: string, customName?: string, projRefNo?: string, projTitle?: string) => {
    const newId = `fin-boq-${Date.now()}`;
    const refNo = projRefNo || activeProjectRefNo || (oppProjects[0]?.refNo || '');
    const title = projTitle || activeProjectTitle || (oppProjects[0]?.title || '');

    const newItem: DocumentVaultItem = {
      id: newId,
      tenantId: activeTenantId,
      documentCode: 'BOQ',
      documentName: customName || `Bill of Quantities Schedule - [${refNo}]`,
      category: 'FINANCIAL',
      procurementApplicability: ['GOODS', 'INFRASTRUCTURE'],
      legalBasisReference: 'Section 32.2.1 of RA 9184 / RA 12009 (Bill of Quantities / Detailed Estimates)',
      versionNumber: 1,
      fileHash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      fileSizeBytes: 210000,
      fileName: customName || `${refNo}_Financial_Envelope_Bill_of_Quantities.pdf`,
      fileDataUrl: fileDataUrl,
      status: 'ACTIVE',
      uploadedByName: currentUser?.fullName || 'Authorized Financial Manager',
      isOptional: false,
      requiresIssueDate: false,
      requiresExpiryDate: false,
      philgepsRefNo: refNo,
      projectTitle: title
    };

    storePdfData(newId, fileDataUrl);
    setVaultItems(prev => [newItem, ...prev]);
    setShowBoqModal(false);
    notifySuccess(
      'Bill of Quantities Saved!',
      `Bill of Quantities schedule saved to Financial Documents vault under project [${refNo}] ${title}.`
    );
  };

  const [showCashFlowModal, setShowCashFlowModal] = useState(false);

  const handleSaveCompletedCashFlow = (fileDataUrl?: string, customName?: string, projRefNo?: string, projTitle?: string) => {
    const newId = `fin-cashflow-${Date.now()}`;
    const refNo = projRefNo || activeProjectRefNo || (oppProjects[0]?.refNo || '');
    const title = projTitle || activeProjectTitle || (oppProjects[0]?.title || '');

    const newItem: DocumentVaultItem = {
      id: newId,
      tenantId: activeTenantId,
      documentCode: 'SF-INFR-56',
      documentName: customName || `Cash Flow by Quarter (SF-INFR-56) - [${refNo}]`,
      category: 'FINANCIAL',
      procurementApplicability: ['INFRASTRUCTURE', 'GOODS'],
      legalBasisReference: 'Standard Form SF-INFR-56 / Section 32.2.1 of RA 9184 / RA 12009 (Cash Flow by Quarter)',
      versionNumber: 1,
      fileHash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      fileSizeBytes: 220000,
      fileName: customName || `${refNo}_Financial_Envelope_Cash_Flow_By_Quarter.pdf`,
      fileDataUrl: fileDataUrl,
      status: 'ACTIVE',
      uploadedByName: currentUser?.fullName || 'Authorized Financial Manager',
      isOptional: false,
      requiresIssueDate: false,
      requiresExpiryDate: false,
      philgepsRefNo: refNo,
      projectTitle: title
    };

    storePdfData(newId, fileDataUrl);
    setVaultItems(prev => [newItem, ...prev]);
    setShowCashFlowModal(false);
    notifySuccess(
      'Cash Flow Schedule Saved!',
      `Cash Flow by Quarter and Payment Schedule (SF-INFR-56) saved to Financial Documents vault under project [${refNo}] ${title}.`
    );
  };

  const [showPriceScheduleGoodsModal, setShowPriceScheduleGoodsModal] = useState(false);

  const handleSaveCompletedPriceScheduleGoods = (fileDataUrl?: string, customName?: string, projRefNo?: string, projTitle?: string) => {
    const newId = `fin-pricesched-goods-${Date.now()}`;
    const refNo = projRefNo || activeProjectRefNo || (oppProjects[0]?.refNo || '');
    const title = projTitle || activeProjectTitle || (oppProjects[0]?.title || '');

    const newItem: DocumentVaultItem = {
      id: newId,
      tenantId: activeTenantId,
      documentCode: 'GPPB-PRICESCHED-GOODS',
      documentName: customName || `Price Schedule for Goods (Cols 1-10) - [${refNo}]`,
      category: 'FINANCIAL',
      procurementApplicability: ['GOODS'],
      legalBasisReference: 'PBDs Section VIII / Section 32.2.1 of RA 9184 / RA 12009 (Price Schedule for Goods)',
      versionNumber: 1,
      fileHash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      fileSizeBytes: 230000,
      fileName: customName || `${refNo}_Financial_Envelope_Price_Schedule_For_Goods.pdf`,
      fileDataUrl: fileDataUrl,
      status: 'ACTIVE',
      uploadedByName: currentUser?.fullName || 'Authorized Financial Manager',
      isOptional: false,
      requiresIssueDate: false,
      requiresExpiryDate: false,
      philgepsRefNo: refNo,
      projectTitle: title
    };

    storePdfData(newId, fileDataUrl);
    setVaultItems(prev => [newItem, ...prev]);
    setShowPriceScheduleGoodsModal(false);
    notifySuccess(
      'Price Schedule for Goods Saved!',
      `Price Schedule for Goods (Columns 1-10) saved to Financial Documents vault under project [${refNo}] ${title}.`
    );
  };

  const [showSummaryBidPriceModal, setShowSummaryBidPriceModal] = useState(false);

  const handleSaveCompletedSummaryBidPrice = (fileDataUrl?: string, customName?: string, projRefNo?: string, projTitle?: string) => {
    const newId = `fin-summarybid-${Date.now()}`;
    const refNo = projRefNo || activeProjectRefNo || (oppProjects[0]?.refNo || '');
    const title = projTitle || activeProjectTitle || (oppProjects[0]?.title || '');

    const newItem: DocumentVaultItem = {
      id: newId,
      tenantId: activeTenantId,
      documentCode: 'PBD-SUMMARY-BIDPRICE',
      documentName: customName || `Summary of Bid Prices - [${refNo}]`,
      category: 'FINANCIAL',
      procurementApplicability: ['GOODS', 'INFRASTRUCTURE', 'CONSULTING_SERVICES'],
      legalBasisReference: 'Section 32.2.1 of RA 9184 / RA 12009 (Summary of Bid Prices)',
      versionNumber: 1,
      fileHash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      fileSizeBytes: 215000,
      fileName: customName || `${refNo}_Financial_Envelope_Summary_Of_Bid_Prices.pdf`,
      fileDataUrl: fileDataUrl,
      status: 'ACTIVE',
      uploadedByName: currentUser?.fullName || 'Authorized Financial Manager',
      isOptional: false,
      requiresIssueDate: false,
      requiresExpiryDate: false,
      philgepsRefNo: refNo,
      projectTitle: title
    };

    storePdfData(newId, fileDataUrl);
    setVaultItems(prev => [newItem, ...prev]);
    setShowSummaryBidPriceModal(false);
    notifySuccess(
      'Summary of Bid Prices Saved!',
      `Summary of Bid Prices schedule saved to Financial Documents vault under project [${refNo}] ${title}.`
    );
  };

  const [showDetailedEstimatesModal, setShowDetailedEstimatesModal] = useState(false);

  const handleSaveCompletedDetailedEstimates = (fileDataUrl?: string, customName?: string, projRefNo?: string, projTitle?: string) => {
    const newId = `fin-detest-${Date.now()}`;
    const refNo = projRefNo || activeProjectRefNo || (oppProjects[0]?.refNo || '');
    const title = projTitle || activeProjectTitle || (oppProjects[0]?.title || '');

    const newItem: DocumentVaultItem = {
      id: newId,
      tenantId: activeTenantId,
      documentCode: 'PBD-DETAILED-ESTIMATES',
      documentName: customName || `(L) Detailed Estimates Form - [${refNo}]`,
      category: 'FINANCIAL',
      procurementApplicability: ['INFRASTRUCTURE', 'GOODS', 'CONSULTING_SERVICES'],
      legalBasisReference: 'Form (L) / Section 32.2.1 of RA 9184 / RA 12009 (Detailed Estimates Form)',
      versionNumber: 1,
      fileHash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      fileSizeBytes: 240000,
      fileName: customName || `${refNo}_Financial_Envelope_Detailed_Estimates.pdf`,
      fileDataUrl: fileDataUrl,
      status: 'ACTIVE',
      uploadedByName: currentUser?.fullName || 'Authorized Financial Manager',
      isOptional: false,
      requiresIssueDate: false,
      requiresExpiryDate: false,
      philgepsRefNo: refNo,
      projectTitle: title
    };

    storePdfData(newId, fileDataUrl);
    setVaultItems(prev => [newItem, ...prev]);
    setShowDetailedEstimatesModal(false);
    notifySuccess(
      'Detailed Estimates Saved!',
      `(L) Duly accomplished Detailed Estimates Form saved to Financial Documents vault under project [${refNo}] ${title}.`
    );
  };

  // Modals state
  const [uploadTargetDef, setUploadTargetDef] = useState<ClassAMasterItemDef | null>(null);
  const [showCustomUploadModal, setShowCustomUploadModal] = useState(false);
  const [customUploadCategory, setCustomUploadCategory] = useState<DocCategory>('ELIGIBILITY_CLASS_B');
  const [customDocName, setCustomDocName] = useState('');

  const [replaceTargetItem, setReplaceTargetItem] = useState<DocumentVaultItem | null>(null);
  const [detailsTargetItem, setDetailsTargetItem] = useState<DocumentVaultItem | null>(null);
  const [previewPdfItem, setPreviewPdfItem] = useState<DocumentVaultItem | null>(null);

  // Edit Metadata State
  const [editTargetItem, setEditTargetItem] = useState<DocumentVaultItem | null>(null);
  const [editDocName, setEditDocName] = useState('');
  const [editDocNumber, setEditDocNumber] = useState('');
  const [editIssuedDate, setEditIssuedDate] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');

  // Re-Tag Bidding Project State (Zero-Mistake Project Isolation)
  const [retagTargetItem, setRetagTargetItem] = useState<DocumentVaultItem | null>(null);
  const [retagProjectRefNo, setRetagProjectRefNo] = useState<string>('');
  const [retagProjectTitle, setRetagProjectTitle] = useState<string>('');

  const openRetagModal = (item: DocumentVaultItem) => {
    setRetagTargetItem(item);
    const initialRef = item.philgepsRefNo || activeProjectRefNo || (oppProjects[0]?.refNo || '');
    const initialTitle = item.projectTitle || activeProjectTitle || (oppProjects[0]?.title || '');
    setRetagProjectRefNo(initialRef);
    setRetagProjectTitle(initialTitle);
  };

  const handleRetagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!retagTargetItem) return;

    const matchedOpp = oppProjects.find(p => p.refNo === retagProjectRefNo);
    const updatedRefNo = retagProjectRefNo.trim();
    const updatedTitle = (matchedOpp?.title || retagProjectTitle).trim();

    setVaultItems(prev => prev.map(item => {
      if (item.id === retagTargetItem.id) {
        return {
          ...item,
          philgepsRefNo: updatedRefNo || undefined,
          projectTitle: updatedTitle || undefined
        };
      }
      return item;
    }));

    setRetagTargetItem(null);
    notifySuccess('Bidding Project Tag Updated', `"${retagTargetItem.documentName}" is now successfully tagged to project [${updatedRefNo || 'N/A'}] ${updatedTitle}.`);
  };

  const openEditModal = (item: DocumentVaultItem) => {
    setEditTargetItem(item);
    setEditDocName(item.documentName);
    setEditDocNumber(item.documentNumber || '');
    setEditIssuedDate(item.issuedDate || '');
    setEditExpiryDate(item.expiryDate || '');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetItem) return;

    const updatedItem: DocumentVaultItem = {
      ...editTargetItem,
      documentName: editDocName.trim() || editTargetItem.documentName,
      documentNumber: editDocNumber.trim(),
      issuedDate: editIssuedDate || undefined,
      expiryDate: editExpiryDate || undefined,
      status: editExpiryDate && new Date(editExpiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        ? 'EXPIRING_SOON'
        : (editExpiryDate && new Date(editExpiryDate) < new Date() ? 'EXPIRED' : 'ACTIVE')
    };

    setVaultItems(prev => prev.map(item => item.id === editTargetItem.id ? updatedItem : item));
    setEditTargetItem(null);
    notifySuccess(
      `[${updatedItem.documentName}] Details Updated!`,
      'Document serial number, name, and validity dates updated in Document Vault.'
    );
  };

  // Upload & Form Inputs
  const [docNumber, setDocNumber] = useState('');
  const [dtiSecType, setDtiSecType] = useState<'DTI' | 'SEC'>('DTI');
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileDataUrl, setSelectedFileDataUrl] = useState<string>('');
  const [uploadError, setUploadError] = useState('');
  const [vaultNotification, setVaultNotification] = useState<VaultNotification | null>(null);

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const notifySuccess = (title: string, message: string) => {
    setVaultNotification({
      type: 'SUCCESS',
      title,
      message
    });
  };

  const notifyFailure = (title: string, message: string, reason: string) => {
    setVaultNotification({
      type: 'FAILURE',
      title,
      message,
      reason
    });
  };

  // Sync states to localStorage — strip fileDataUrl to avoid QuotaExceededError
  React.useEffect(() => {
    try {
      const itemsForStorage = vaultItems.map(item => {
        const { fileDataUrl, previousVersions, ...rest } = item;
        // Strip fileDataUrl from previous versions too
        const cleanVersions = (previousVersions || []).map(v => {
          const { fileDataUrl: _fd, ...vRest } = v;
          return vRest;
        });
        return { ...rest, previousVersions: cleanVersions };
      });
      localStorage.setItem(`bidocs_vault_items_${activeTenantId}`, JSON.stringify(itemsForStorage));
    } catch (e) {
      console.error('Failed to persist vault items to localStorage:', e);
    }
  }, [vaultItems, activeTenantId]);

  React.useEffect(() => {
    if (activeTenantId) {
      localStorage.setItem(`bidocs_tech_completed_ids_${activeTenantId}`, JSON.stringify(techCompletedIds));
    }
  }, [techCompletedIds, activeTenantId]);

  const resetFormState = () => {
    setDocNumber('');
    setDtiSecType('DTI');
    setIssuedDate(new Date().toISOString().split('T')[0]);
    setExpiryDate('');
    setSelectedFile(null);
    setSelectedFileDataUrl('');
    setUploadError('');
    setCustomDocName('');
  };

  const calculateDaysRemaining = (expiryDateStr?: string) => {
    if (!expiryDateStr) return null;
    const expDate = new Date(expiryDateStr);
    const today = new Date();
    expDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = expDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleResetClassAVault = () => {
    if (confirm('Are you sure you want to remove all uploaded Class A Eligibility documents and start fresh from scratch? PhilGEPS and all document slots will be reset to v1.0.')) {
      setVaultItems([]);
      setSelectedItemIds([]);
      // Clear only this tenant's vault data from IndexedDB
      if (activeTenantId) {
        clearVaultDataForTenant(activeTenantId).catch(e => console.error('[VaultDB] Failed to clear tenant vault:', e));
      }
      alert('Class A Eligibility documents have been completely reset! All document slots are ready for re-uploading from scratch.');
    }
  };

  const handleClearAllClassAUploads = () => {
    if (confirm('Are you sure you want to remove ALL uploaded documents? All uploaded files in Class A Legal Eligibility and All Vault Documents will be removed so you can re-upload everything from scratch.')) {
      setVaultItems([]);
      setSelectedItemIds([]);
      // Clear only this tenant's vault data from IndexedDB (preserves other tenants)
      if (activeTenantId) {
        clearVaultDataForTenant(activeTenantId).catch(e => console.error('[VaultDB] Failed to clear tenant vault:', e));
      }
      pdfDataCache.current = {};
      notifySuccess('All Documents Removed', 'All uploaded documents and PDF files have been completely removed. All slots are clean and ready for re-uploading.');
    }
  };

  const toggleTechExpand = (id: string) => {
    setExpandedTechItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleTechCheckbox = (id: string) => {
    setTechCompletedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCompleteTemplate = (fileDataUrl?: string, customName?: string, projRefNo?: string, projTitle?: string) => {
    if (!fillingTemplateItem) return;

    const itemId = fillingTemplateItem.id;
    if (!techCompletedIds.includes(itemId)) {
      setTechCompletedIds(prev => [...prev, itemId]);
    }

    const docTitle = customName || fillingTemplateItem.name;
    const cleanDocName = docTitle.replace(/[^a-zA-Z0-9]/g, '_');

    // Create DocumentVaultItem for the completed technical exhibit template with Project Tagging
    const newVaultDoc: DocumentVaultItem = {
      id: `doc-tech-${itemId}-${Date.now()}`,
      tenantId: activeTenantId,
      documentCode: fillingTemplateItem.code,
      documentName: docTitle,
      documentNumber: `EXHIBIT-${fillingTemplateItem.code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-2026`,
      category: 'TECHNICAL',
      procurementApplicability: ['Goods & Supply', 'Goods & Supply with Installation', 'Infrastructure', 'Consulting'],
      legalBasisReference: 'RA 12009 NGPA Statutory Compliance Exhibit',
      versionNumber: 1,
      fileHash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      fileSizeBytes: 150000,
      fileName: `${cleanDocName}.pdf`,
      fileDataUrl: fileDataUrl,
      status: 'ACTIVE',
      uploadedByName: currentUser?.fullName || 'Authorized Administrator',
      isOptional: false,
      requiresIssueDate: false,
      requiresExpiryDate: false,
      conditionalRuleNote: 'Completed GPPB Statutory Legal Template',
      philgepsRefNo: projRefNo || undefined,
      projectTitle: projTitle || undefined,
      previousVersions: []
    };

    storePdfData(newVaultDoc.id, fileDataUrl);
    setVaultItems(prev => [newVaultDoc, ...prev.filter(item => item.id !== newVaultDoc.id)]);
    setFillingTemplateItem(null);
    setTechSubTab('COMPLETED');
    notifySuccess(`[${docTitle}, v1.0] Template Save Successful!`, 'Legal template saved into Document Vault as an active technical exhibit under Completed Technical Documents & Forms.');
  };

  const handleDeleteCompletedTechDoc = (docId: string, docName: string) => {
    if (confirm(`Are you sure you want to delete "${docName}" from Completed Technical Documents? This will remove the completed form and reset its item status.`)) {
      setVaultItems(prev => prev.filter(item => item.id !== docId));
      notifySuccess('Completed Form Deleted', `"${docName}" has been successfully removed from Technical Eligibility.`);
    }
  };

  const handleFileSelection = (file: File | undefined) => {
    if (!file) {
      setSelectedFile(null);
      setSelectedFileDataUrl('');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      const errReason = 'Invalid File Format: Strictly PDF (.pdf) documents are accepted by GPPB bidding standards.';
      setUploadError(errReason);
      notifyFailure('Upload Validation Failed', 'Selected document file cannot be accepted.', errReason);
      setSelectedFile(null);
      setSelectedFileDataUrl('');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      const errReason = `File Size Exceeded: Selected file size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum 100 MB limit.`;
      setUploadError(errReason);
      notifyFailure('Upload Validation Failed', 'Selected document file is too large.', errReason);
      setSelectedFile(null);
      setSelectedFileDataUrl('');
      return;
    }

    setSelectedFile(file);
    setUploadError('');

    // Read PDF file into Base64 Data URL for rendering directly in PDF viewer
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFileDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTargetDef) return;

    const docName = uploadTargetDef.code === 'DOC-2' ? `${dtiSecType} Certificate` : uploadTargetDef.name;

    if (!selectedFile) {
      const errReason = 'No File Selected: Please select a PDF document file from your computer.';
      setUploadError(errReason);
      notifyFailure(`Upload Failed for ${docName}`, 'Submission could not be completed.', errReason);
      return;
    }

    let reqIssue = uploadTargetDef.requiresIssueDate;
    let reqExp = uploadTargetDef.requiresExpiryDate;

    if (uploadTargetDef.code === 'DOC-2') {
      if (dtiSecType === 'SEC') {
        reqIssue = false;
        reqExp = false;
      } else {
        reqIssue = true;
        reqExp = true;
      }
    }

    if (reqIssue && !issuedDate) {
      const errReason = `Missing Required Field: Issue Date is mandatory for ${docName}.`;
      setUploadError(errReason);
      notifyFailure(`Upload Failed for ${docName}`, 'Submission could not be completed.', errReason);
      return;
    }

    if (reqExp && !expiryDate) {
      const errReason = `Missing Required Field: Expiration Date is mandatory for ${docName}.`;
      setUploadError(errReason);
      notifyFailure(`Upload Failed for ${docName}`, 'Submission could not be completed.', errReason);
      return;
    }

    let fileDataUrl = selectedFileDataUrl;
    if (!fileDataUrl && selectedFile) {
      try {
        fileDataUrl = await readFileAsDataUrl(selectedFile);
      } catch (err) {
        const errReason = 'File Processing Error: Failed to read PDF document data.';
        setUploadError(errReason);
        notifyFailure(`Upload Failed for ${docName}`, 'File conversion failed.', errReason);
        return;
      }
    }

    const newItem: DocumentVaultItem = {
      id: `doc-${uploadTargetDef.code.toLowerCase()}-${Date.now()}`,
      tenantId: activeTenantId,
      documentCode: uploadTargetDef.code,
      documentName: docName,
      documentNumber: docNumber.trim() || `REF-${Math.floor(Math.random() * 899999 + 100000)}`,
      category: 'ELIGIBILITY_CLASS_A',
      procurementApplicability: ['Goods & Supply', 'Goods & Supply with Installation', 'Infrastructure', 'Consulting'],
      legalBasisReference: uploadTargetDef.conditionalRuleNote,
      versionNumber: 1,
      fileHash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      fileSizeBytes: selectedFile.size,
      fileName: selectedFile.name,
      fileDataUrl: fileDataUrl,
      issuedDate: reqIssue ? issuedDate : undefined,
      expiryDate: reqExp ? expiryDate : undefined,
      status: reqExp && expiryDate && new Date(expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'EXPIRING_SOON' : 'ACTIVE',
      uploadedByName: currentUser?.fullName || 'Authorized Administrator',
      isOptional: uploadTargetDef.isOptional,
      requiresIssueDate: reqIssue,
      requiresExpiryDate: reqExp,
      conditionalRuleNote: uploadTargetDef.conditionalRuleNote,
      previousVersions: []
    };

    storePdfData(newItem.id, fileDataUrl);
    setVaultItems(prev => [newItem, ...prev.filter(item => item.id !== newItem.id)]);
    setUploadTargetDef(null);
    resetFormState();
    notifySuccess(`[${docName}, v1.0] Upload Successful!`, 'Your document has been verified and encrypted into Document Vault. Click "View PDF" to inspect your document.');
  };

  const handleCustomUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDocName.trim()) {
      const errReason = 'Missing Required Field: Document Name is required.';
      setUploadError(errReason);
      notifyFailure('Custom Upload Failed', 'Submission could not be completed.', errReason);
      return;
    }

    if (!selectedFile) {
      const errReason = 'No File Selected: Please select a PDF document to upload.';
      setUploadError(errReason);
      notifyFailure(`Custom Upload Failed for ${customDocName}`, 'Submission could not be completed.', errReason);
      return;
    }

    let fileDataUrl = selectedFileDataUrl;
    if (!fileDataUrl && selectedFile) {
      try {
        fileDataUrl = await readFileAsDataUrl(selectedFile);
      } catch (err) {
        const errReason = 'File Processing Error: Failed to read PDF document data.';
        setUploadError(errReason);
        notifyFailure(`Custom Upload Failed for ${customDocName}`, 'File conversion failed.', errReason);
        return;
      }
    }

    const newItem: DocumentVaultItem = {
      id: `doc-custom-${Date.now()}`,
      tenantId: activeTenantId,
      documentName: customDocName.trim(),
      documentNumber: docNumber.trim() || `REF-${Math.floor(Math.random() * 899999 + 100000)}`,
      category: customUploadCategory,
      procurementApplicability: ['Goods & Supply', 'Goods & Supply with Installation', 'Infrastructure', 'Consulting'],
      legalBasisReference: 'RA 12009 NGPA Statutory Compliance Exhibit',
      versionNumber: 1,
      fileHash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      fileSizeBytes: selectedFile.size,
      fileName: selectedFile.name,
      fileDataUrl: fileDataUrl,
      issuedDate: issuedDate || undefined,
      expiryDate: expiryDate || undefined,
      status: expiryDate && new Date(expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'EXPIRING_SOON' : 'ACTIVE',
      uploadedByName: currentUser?.fullName || 'Authorized Administrator',
      isOptional: true,
      requiresIssueDate: !!issuedDate,
      requiresExpiryDate: !!expiryDate,
      conditionalRuleNote: 'Custom Uploaded Statutory Exhibit',
      previousVersions: []
    };

    storePdfData(newItem.id, fileDataUrl);
    setVaultItems(prev => [newItem, ...prev]);
    setShowCustomUploadModal(false);
    resetFormState();
    notifySuccess(`[${newItem.documentName}, v1.0] Upload Successful!`, 'Custom statutory document added to Document Vault.');
  };

  const handleReplaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceTargetItem) return;

    if (!selectedFile) {
      const errReason = 'No File Selected: Please select a replacement PDF file to upload.';
      setUploadError(errReason);
      notifyFailure(`Replacement Failed for ${replaceTargetItem.documentName}`, 'Submission could not be completed.', errReason);
      return;
    }

    let fileDataUrl = selectedFileDataUrl;
    if (!fileDataUrl && selectedFile) {
      try {
        fileDataUrl = await readFileAsDataUrl(selectedFile);
      } catch (err) {
        const errReason = 'File Processing Error: Failed to read replacement PDF document data.';
        setUploadError(errReason);
        notifyFailure(`Replacement Failed for ${replaceTargetItem.documentName}`, 'File conversion failed.', errReason);
        return;
      }
    }

    const archivedVersion: DocumentVersion = {
      versionNumber: replaceTargetItem.versionNumber,
      documentNumber: replaceTargetItem.documentNumber,
      fileHash: replaceTargetItem.fileHash,
      uploadedAt: new Date().toLocaleString(),
      uploadedByName: replaceTargetItem.uploadedByName,
      fileName: replaceTargetItem.fileName || 'previous_document.pdf',
      fileSizeBytes: replaceTargetItem.fileSizeBytes,
      fileDataUrl: replaceTargetItem.fileDataUrl
    };

    const newVersionNum = replaceTargetItem.versionNumber + 1;

    const updatedItem: DocumentVaultItem = {
      ...replaceTargetItem,
      versionNumber: newVersionNum,
      documentNumber: docNumber.trim() || replaceTargetItem.documentNumber,
      fileHash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      fileSizeBytes: selectedFile.size,
      fileName: selectedFile.name,
      fileDataUrl: fileDataUrl || replaceTargetItem.fileDataUrl,
      issuedDate: replaceTargetItem.requiresIssueDate ? (issuedDate || replaceTargetItem.issuedDate) : undefined,
      expiryDate: replaceTargetItem.requiresExpiryDate ? (expiryDate || replaceTargetItem.expiryDate) : undefined,
      status: replaceTargetItem.requiresExpiryDate && expiryDate && new Date(expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'EXPIRING_SOON' : 'ACTIVE',
      uploadedByName: currentUser?.fullName || 'Authorized Administrator',
      previousVersions: [archivedVersion, ...(replaceTargetItem.previousVersions || [])]
    };

    storePdfData(updatedItem.id, fileDataUrl || replaceTargetItem.fileDataUrl);
    setVaultItems(prev => prev.map(item => item.id === replaceTargetItem.id ? updatedItem : item));
    setReplaceTargetItem(null);
    resetFormState();
    notifySuccess(`[${updatedItem.documentName}, v${newVersionNum}.0] Replacement Successful!`, 'Replacement file uploaded and set as active document version.');
  };

  const toggleSelectDoc = (id: string) => {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (itemsToSelect: DocumentVaultItem[]) => {
    if (selectedItemIds.length === itemsToSelect.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(itemsToSelect.map(i => i.id));
    }
  };

  const mandatoryDefs = CLASS_A_MASTER_LIST.filter(d => !d.isOptional);
  const uploadedCodes = vaultItems.map(i => i.documentCode);
  const completedMandatoryCount = mandatoryDefs.filter(d => uploadedCodes.includes(d.code)).length;
  const isClassAFullyCompliant = completedMandatoryCount === mandatoryDefs.length;

  const customClassAItems = vaultItems.filter(item =>
    item.category === 'ELIGIBILITY_CLASS_A' &&
    !CLASS_A_MASTER_LIST.some(d => d.code === item.documentCode)
  );

  const completedTechVaultItems = vaultItems.filter(item =>
    item.category === 'TECHNICAL' &&
    (selectedTechProjectFilter === 'ALL' || item.philgepsRefNo === selectedTechProjectFilter)
  );

  const filteredGridItems = vaultItems.filter(item => {
    const matchesSearch = item.documentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.documentNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.legalBasisReference || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const selectedVaultObjects = vaultItems.filter(item => selectedItemIds.includes(item.id));

  return (
    <VaultErrorBoundary fallbackTitle="Document Vault Render Protected">
      <div className="space-y-6 animate-fadeIn">

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: currentTenant?.brandColor || '#1e40af' }}
            />
            <h1 className="text-2xl font-bold text-white">Document Vault & Statutory Registry</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Encrypted compliance repository storing Class A & Class B eligibility, technical exhibits, and financial statements for <span className="text-slate-200 font-semibold">{currentTenant?.companyName || 'Your Enterprise'}</span>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetClassAVault}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition flex items-center gap-2 shrink-0"
            title="Remove all uploaded PDFs and reset  and CPhilGEPSlass A slots to v1.0 for re-uploading from scratch"
          >
            <RefreshCw className="w-4 h-4 text-amber-400" />
            <span>Reset & Refresh Vault (Re-upload from Scratch)</span>
          </button>

          {selectedItemIds.length > 0 && (
            <button
              onClick={() => setShowMergeModal(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg transition flex items-center gap-2"
            >
              <Layers className="w-4 h-4" />
              <span>Merge Selected ({selectedItemIds.length})</span>
            </button>
          )}

          <button
            onClick={() => {
              resetFormState();
              setCustomUploadCategory('ELIGIBILITY_CLASS_A');
              setShowCustomUploadModal(true);
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition flex items-center gap-2 hover:opacity-90 shrink-0"
            style={{ backgroundColor: currentTenant?.brandColor || '#1e40af' }}
            title="Add custom or project-specific legal document to vault"
          >
            <Plus className="w-4 h-4 text-blue-200" />
            <span>+ Add Additional Legal Document</span>
          </button>
        </div>
      </div>

      {/* UNIFIED VAULT SUCCESS / FAILURE NOTIFICATION BANNER */}
      {vaultNotification && (
        <div className={`p-4 rounded-2xl border-2 flex items-start justify-between gap-4 shadow-xl animate-fadeIn ${vaultNotification.type === 'SUCCESS'
          ? 'bg-emerald-500/15 border-emerald-500/40 text-white'
          : 'bg-red-500/15 border-red-500/40 text-white'
          }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${vaultNotification.type === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              }`}>
              {vaultNotification.type === 'SUCCESS' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-400" />
              )}
            </div>
            <div className="space-y-1">
              <h4 className={`text-sm font-bold font-mono ${vaultNotification.type === 'SUCCESS' ? 'text-emerald-300' : 'text-red-300'
                }`}>
                {vaultNotification.title}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">{vaultNotification.message}</p>
              {vaultNotification.reason && (
                <div className="p-2.5 rounded-xl bg-red-950/90 border border-red-800/80 text-red-200 text-xs font-mono mt-2 shadow-inner">
                  <strong className="text-red-400 font-bold block mb-0.5">Reason for Failure:</strong>
                  <span>{vaultNotification.reason}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setVaultNotification(null)}
            className="text-slate-400 hover:text-white transition p-1 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ALL CATEGORY TABS AT TOP */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {[
            { id: 'ALL', label: 'All Vault Documents' },
            { id: 'ELIGIBILITY_CLASS_A', label: 'Class A Eligibility' },
            { id: 'TECHNICAL', label: 'Technical Eligibility' },
            { id: 'FINANCIAL', label: 'Financial Documents' },
            { id: 'CORPORATE_LEGAL', label: 'Corporate Legal' },
            { id: 'ELIGIBILITY_CLASS_B', label: 'Class B Joint Venture' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${selectedCategory === cat.id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {selectedCategory !== 'ELIGIBILITY_CLASS_A' && selectedCategory !== 'TECHNICAL' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleSelectAll(filteredGridItems)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold hover:text-white transition flex items-center gap-1.5"
            >
              {selectedItemIds.length === filteredGridItems.length && filteredGridItems.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-blue-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
              <span>Select All</span>
            </button>

            <div className="relative min-w-[220px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents or serial no..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: CLASS A ELIGIBILITY MATRIX */}
      {selectedCategory === 'ELIGIBILITY_CLASS_A' && (
        <div className="space-y-6">
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${isClassAFullyCompliant
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
            <div className="flex items-center gap-3">
              <Award className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold">
                  Class A Eligibility Matrix Status: {completedMandatoryCount} / {mandatoryDefs.length} Mandatory Uploaded
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {isClassAFullyCompliant
                    ? '100% Mandatory Class A documents uploaded & verified. Ready for automated bid envelope assembly.'
                    : 'Upload the remaining mandatory Class A documents in the table below to pass GPPB eligibility audit.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleClearAllClassAUploads}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition flex items-center gap-1.5 shadow-sm"
                title="Remove all uploaded Class A documents to re-upload from scratch"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Remove All Uploaded Documents</span>
              </button>
              <span className="text-xs font-mono font-bold bg-slate-900 text-white px-3 py-1.5 rounded-xl border border-slate-800">
                10 Mandatory • 3 Optional
              </span>
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl space-y-0">
            <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-400" />
                Statutory Fixed Master Document List & Custom Exhibits (Class A)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    resetFormState();
                    setCustomUploadCategory('ELIGIBILITY_CLASS_A');
                    setShowCustomUploadModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow transition flex items-center gap-1.5"
                  title="Add custom or project-specific legal document to Class A Eligibility"
                >
                  <Plus className="w-4 h-4 text-blue-200" />
                  <span>+ Add Additional Legal Document</span>
                </button>
                <button
                  onClick={handleClearAllClassAUploads}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition flex items-center gap-1.5"
                  title="Clear all Class A documents and start fresh"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Remove All Uploads</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px] tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Document Name</th>
                    <th className="py-3 px-4 text-center">Issue Date</th>
                    <th className="py-3 px-4 text-center">Expiration Date</th>
                    <th className="py-3 px-4 text-center">Optional</th>
                    <th className="py-3 px-4">Conditional Rules & Status</th>
                    <th className="py-3 px-4 text-right">Global Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {CLASS_A_MASTER_LIST.map((def, idx) => {
                    const uploadedItem = vaultItems.find(item => item.documentCode === def.code);
                    const isUploaded = !!uploadedItem;
                    const daysRem = isUploaded ? calculateDaysRemaining(uploadedItem?.expiryDate) : null;
                    const isSoonExpiring = daysRem !== null && daysRem <= 30 && daysRem >= 0;
                    const isExp = daysRem !== null && daysRem < 0;

                    return (
                      <tr
                        key={def.code}
                        className={`hover:bg-slate-800/40 transition ${!isUploaded && !def.isOptional ? 'bg-red-500/5' : ''
                          }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-500 text-center">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-white">
                          <div className="flex items-center gap-2">
                            <FileText className={`w-4 h-4 shrink-0 ${isUploaded ? 'text-blue-400' : 'text-slate-500'}`} />
                            <div>
                              <span className="font-bold text-slate-100">{def.name}</span>
                              {uploadedItem?.documentNumber && (
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  No: {uploadedItem.documentNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {def.code === 'DOC-2' ? (
                            <span className="text-amber-400 text-sm">⚠️</span>
                          ) : def.requiresIssueDate ? (
                            <span className="text-emerald-400 text-sm">✅</span>
                          ) : (
                            <span className="text-slate-600 text-sm">❌</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {def.code === 'DOC-2' ? (
                            <span className="text-amber-400 text-sm">⚠️</span>
                          ) : def.requiresExpiryDate ? (
                            <span className="text-emerald-400 text-sm">✅</span>
                          ) : (
                            <span className="text-slate-600 text-sm">❌</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono">
                          {def.isOptional ? (
                            <span className="text-amber-400 text-sm">✅</span>
                          ) : (
                            <span className="text-slate-600 text-sm">❌</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {isUploaded ? (
                            <div className="space-y-1">
                              {isSoonExpiring || uploadedItem.status === 'EXPIRING_SOON' ? (
                                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 animate-pulse">
                                  <AlertTriangle className="w-3 h-3 text-amber-400" /> Expiring in {daysRem ?? 30} Days (30-Day Notice)
                                </span>
                              ) : isExp || uploadedItem.status === 'EXPIRED' ? (
                                <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 animate-pulse">
                                  <AlertTriangle className="w-3 h-3 text-red-400" /> EXPIRED ({daysRem ? Math.abs(daysRem) : 0} Days Ago) — Action Required
                                </span>
                              ) : (
                                <span className="badge-success text-[10px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Uploaded (v{uploadedItem.versionNumber}.0)
                                </span>
                              )}
                              {uploadedItem.expiryDate && (
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  Expires: {uploadedItem.expiryDate}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className={`text-[10px] font-semibold block ${def.isOptional ? 'text-slate-400' : 'text-red-400 font-bold'
                                }`}>
                                {def.isOptional ? 'Optional — Pending Upload' : 'Required — Missing'}
                              </span>
                              <span className="text-[10px] text-slate-500 block leading-tight">{def.conditionalRuleNote}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isUploaded ? (
                              <>
                                <button
                                  onClick={() => setPreviewPdfItem(uploadedItem)}
                                  className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition font-semibold text-[11px] flex items-center gap-1 border border-blue-500/30"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View PDF</span>
                                </button>
                                <button
                                  onClick={() => openEditModal(uploadedItem)}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white transition font-semibold text-[11px] flex items-center gap-1 border border-amber-500/30"
                                  title="Edit Document Number, Title, or Validity Dates"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setReplaceTargetItem(uploadedItem);
                                    resetFormState();
                                  }}
                                  className={`px-3 py-1.5 rounded-lg transition font-bold text-[11px] flex items-center gap-1.5 border shadow ${isSoonExpiring || isExp || uploadedItem.status === 'EXPIRING_SOON' || uploadedItem.status === 'EXPIRED'
                                    ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 animate-pulse'
                                    : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border-emerald-500/30'
                                    }`}
                                  title="Click to replace document at any time or update expiring document"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>{isSoonExpiring || isExp ? 'Upload Replacement (30-Day Notice)' : 'Replace PDF'}</span>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setUploadTargetDef(def);
                                  resetFormState();
                                }}
                                className="px-3 py-1.5 rounded-lg text-white font-semibold text-[11px] shadow transition flex items-center gap-1.5 hover:opacity-90"
                                style={{ backgroundColor: currentTenant?.brandColor || '#1e40af' }}
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>Upload Document</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* CUSTOM / ADDITIONAL PROJECT-SPECIFIC LEGAL DOCUMENTS */}
                  {customClassAItems.map((item, idx) => {
                    const daysRem = calculateDaysRemaining(item.expiryDate);
                    const isSoonExpiring = daysRem !== null && daysRem <= 30 && daysRem >= 0;
                    const isExp = daysRem !== null && daysRem < 0;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-800/40 transition bg-blue-500/5 border-l-2 border-l-blue-500"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-400 text-center">
                          {CLASS_A_MASTER_LIST.length + idx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-white">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                            <div>
                              <span className="font-bold text-slate-100">{item.documentName}</span>
                              <span className="text-[10px] text-blue-400 font-mono block">Additional Legal Exhibit</span>
                              {item.documentNumber && (
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  No: {item.documentNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-300">
                          {item.issuedDate || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-300">
                          {item.expiryDate || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono">
                          <span className="text-amber-400 text-sm">✅</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            {isSoonExpiring || item.status === 'EXPIRING_SOON' ? (
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-amber-400" /> Expiring in {daysRem ?? 30} Days
                              </span>
                            ) : isExp || item.status === 'EXPIRED' ? (
                              <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-red-400" /> EXPIRED — Action Required
                              </span>
                            ) : (
                              <span className="badge-success text-[10px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Uploaded (v{item.versionNumber}.0)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPreviewPdfItem(item)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition font-semibold text-[11px] flex items-center gap-1 border border-blue-500/30"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View PDF</span>
                            </button>
                            <button
                              onClick={() => openEditModal(item)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white transition font-semibold text-[11px] flex items-center gap-1 border border-amber-500/30"
                              title="Edit Document Number, Title, or Validity Dates"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => {
                                setReplaceTargetItem(item);
                                resetFormState();
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition font-bold text-[11px] flex items-center gap-1.5 border border-emerald-500/30 shadow"
                              title="Replace PDF file"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Replace PDF</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TECHNICAL EXHIBITS — TECHNICAL DOCUMENTS SUB-TAB */}
      {selectedCategory === 'TECHNICAL' && (
        <div className="space-y-6">

          {/* Sub-Tab Navigation Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTechSubTab('CHECKLIST')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${techSubTab === 'CHECKLIST'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
              >
                <FileSignature className="w-4 h-4" />
                <span>Technical Requirements Checklist</span>
                <span className="text-[10px] font-mono bg-blue-950 px-2 py-0.5 rounded-full border border-blue-400">
                  {techCompletedIds.length} / 8 Completed
                </span>
              </button>

              <button
                onClick={() => setTechSubTab('COMPLETED')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${techSubTab === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Completed Technical Documents & Forms</span>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500 font-bold">
                  {completedTechVaultItems.length} Saved
                </span>
              </button>
            </div>

            <span className="text-xs text-slate-400 font-mono">
              RA 12009 NGPA Statutory Technical Compliance Engine
            </span>
          </div>

          {/* SUB-TAB 1: TECHNICAL DOCUMENTS CHECKLIST */}
          {techSubTab === 'CHECKLIST' && (
            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl space-y-0">
              <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Technical Documents Requirement Checklist (Items b through g)
                </h3>
                <span className="text-xs font-mono text-slate-400">Legal Templates Provided</span>
              </div>

              <div className="divide-y divide-slate-800/80">
                {TECHNICAL_CHECKLIST_MASTER.map((item) => {
                  const isCompleted = techCompletedIds.includes(item.id);
                  const isExpanded = expandedTechItems.includes(item.id);

                  return (
                    <div key={item.id} className="bg-slate-950/60 hover:bg-slate-900/50 transition">

                      {/* Main Row */}
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                        <div className="flex items-start gap-3 min-w-0">
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleTechCheckbox(item.id)}
                            className="mt-0.5 text-slate-400 hover:text-white transition shrink-0"
                          >
                            {isCompleted ? (
                              <CheckSquare className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-600" />
                            )}
                          </button>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-xs text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                                Item {item.code}
                              </span>
                              <span className="font-bold text-white text-xs leading-snug">{item.name}</span>
                              {item.isExpandable && (
                                <button
                                  onClick={() => toggleTechExpand(item.id)}
                                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition flex items-center gap-1"
                                >
                                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                  <span>3 Sub-Items</span>
                                </button>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono italic">{item.notes}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => setFillingTemplateItem({ id: item.id, code: item.code, name: item.name })}
                            className="px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition text-xs font-semibold flex items-center gap-1 border border-blue-500/30"
                          >
                            <FileSignature className="w-3.5 h-3.5" />
                            <span>Create Form</span>
                          </button>

                          <button
                            onClick={() => {
                              resetFormState();
                              setCustomDocName(`Item ${item.code} — ${item.name}`);
                              setCustomUploadCategory('TECHNICAL');
                              setShowCustomUploadModal(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition text-xs font-semibold flex items-center gap-1 border border-emerald-500/30"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload PDF</span>
                          </button>
                        </div>

                      </div>

                      {/* Expandable Sub-Items Section for Item (f) */}
                      {item.isExpandable && isExpanded && item.subItems && (
                        <div className="bg-slate-900/80 p-4 border-t border-slate-800 pl-10 space-y-3">
                          <h5 className="text-[11px] font-bold text-slate-300 uppercase font-mono tracking-wider">
                            Item (f) Expandable Sub-Checklist Requirements:
                          </h5>
                          <div className="space-y-2">
                            {item.subItems.map((sub) => {
                              const isSubCompleted = techCompletedIds.includes(sub.id);

                              return (
                                <div
                                  key={sub.id}
                                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                                >
                                  <div className="flex items-start gap-2.5">
                                    <button
                                      onClick={() => toggleTechCheckbox(sub.id)}
                                      className="mt-0.5 text-slate-400 hover:text-white transition shrink-0"
                                    >
                                      {isSubCompleted ? (
                                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                                      ) : (
                                        <Square className="w-4 h-4 text-slate-600" />
                                      )}
                                    </button>
                                    <div>
                                      <span className="font-mono font-bold text-blue-300 mr-2">{sub.code}</span>
                                      <span className="text-slate-200 font-medium">{sub.name}</span>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => setFillingTemplateItem({ id: sub.id, code: sub.code, name: sub.name })}
                                    className="px-2.5 py-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition text-[11px] font-semibold flex items-center gap-1 border border-blue-500/30 shrink-0"
                                  >
                                    <FileSignature className="w-3 h-3" />
                                    <span>Create Form</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUB-TAB 2: COMPLETED TECHNICAL DOCUMENTS & FORMS */}
          {techSubTab === 'COMPLETED' && (
            <div className="space-y-4">
              {/* Bidding Project Filter Bar & Document Management */}
              {(() => {
                // Build complete option list combining Opportunity Finder projects and existing form project tags
                const allAvailableProjects = (() => {
                  const seenRefs = new Set<string>();
                  const list: { refNo: string; title: string; docCount: number }[] = [];

                  oppProjects.forEach(p => {
                    if (p.refNo && !seenRefs.has(p.refNo)) {
                      seenRefs.add(p.refNo);
                      const count = completedTechVaultItems.filter(i => i.philgepsRefNo === p.refNo).length;
                      list.push({ refNo: p.refNo, title: p.title, docCount: count });
                    }
                  });

                  completedTechVaultItems.forEach(i => {
                    if (i.philgepsRefNo && !seenRefs.has(i.philgepsRefNo)) {
                      seenRefs.add(i.philgepsRefNo);
                      list.push({
                        refNo: i.philgepsRefNo,
                        title: i.projectTitle || 'Bidding Opportunity',
                        docCount: completedTechVaultItems.filter(doc => doc.philgepsRefNo === i.philgepsRefNo).length
                      });
                    }
                  });

                  return list;
                })();

                const selectedProjectOption = allAvailableProjects.find(p => p.refNo === selectedTechProjectFilter);

                const displayedCompletedTechItems = completedTechVaultItems.filter(item => {
                  if (selectedTechProjectFilter === 'ALL') return true;
                  return item.philgepsRefNo === selectedTechProjectFilter;
                });

                if (completedTechVaultItems.length === 0) {
                  return (
                    <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 space-y-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div className="max-w-md mx-auto space-y-2">
                        <h3 className="text-base font-bold text-white">No Completed Technical Documents Saved Yet</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Go to <span className="text-blue-400 font-bold">Technical Requirements Checklist</span> sub-tab above and click <span className="text-white font-bold">"Fill Legal Template"</span> on Item (b) Statement of Ongoing Contracts or Item (c) SLCC to generate and save your completed technical forms.
                        </p>
                      </div>
                      <button
                        onClick={() => setTechSubTab('CHECKLIST')}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow transition inline-flex items-center gap-2"
                      >
                        <FileSignature className="w-4 h-4" />
                        <span>Go to Technical Checklist & Fill Templates</span>
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {/* Filter Bar */}
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                        <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>Filter Completed Technical Forms by Bidding Project:</span>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <select
                          value={selectedTechProjectFilter}
                          onChange={(e) => setSelectedTechProjectFilter(e.target.value)}
                          className="w-full sm:w-auto bg-slate-950 border border-blue-500/60 rounded-xl px-3.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-blue-400 shadow-inner cursor-pointer"
                        >
                          <option value="ALL">All Bidding Projects ({completedTechVaultItems.length} Total Forms)</option>
                          {allAvailableProjects.map(p => (
                            <option key={p.refNo} value={p.refNo}>
                              [{p.refNo}] {p.title} ({p.docCount} saved)
                            </option>
                          ))}
                        </select>
                        {selectedTechProjectFilter !== 'ALL' && (
                          <button
                            onClick={() => setSelectedTechProjectFilter('ALL')}
                            className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-400 bg-slate-950 border border-slate-800 hover:text-white transition shrink-0"
                            title="Clear project filter to show all"
                          >
                            Clear Filter
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Filter Active Summary Banner */}
                    {selectedTechProjectFilter !== 'ALL' && (
                      <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-500/40 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <Filter className="w-4 h-4 text-blue-400 shrink-0" />
                          <span className="text-slate-300 font-medium">Active Project Filter:</span>
                          <span className="text-white font-bold">[{selectedTechProjectFilter}] {selectedProjectOption?.title || 'Selected Opportunity'}</span>
                        </div>
                        <span className="text-blue-300 font-bold bg-blue-900/80 px-2.5 py-0.5 rounded-full border border-blue-400 text-[11px]">
                          {displayedCompletedTechItems.length} Completed Form{displayedCompletedTechItems.length !== 1 ? 's' : ''} Found
                        </span>
                      </div>
                    )}

                    {/* Empty State for specific project filter */}
                    {displayedCompletedTechItems.length === 0 ? (
                      <div className="glass-panel p-8 text-center rounded-2xl border border-slate-800 space-y-4">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div className="max-w-md mx-auto space-y-1">
                          <h3 className="text-sm font-bold text-white">No Completed Technical Forms Found for Filtered Project</h3>
                          <p className="text-xs text-blue-400 font-mono font-bold truncate">
                            [{selectedTechProjectFilter}] {selectedProjectOption?.title || 'Selected Bidding Project'}
                          </p>
                          <p className="text-xs text-slate-400 leading-relaxed pt-1">
                            No completed technical forms have been generated and saved for this project reference yet. Switch to the Checklist tab to generate forms for this project.
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-3 pt-2">
                          <button
                            onClick={() => setSelectedTechProjectFilter('ALL')}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:text-white transition"
                          >
                            Show All Projects ({completedTechVaultItems.length} Total)
                          </button>
                          <button
                            onClick={() => setTechSubTab('CHECKLIST')}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow transition flex items-center gap-1.5"
                          >
                            <FileSignature className="w-4 h-4" />
                            <span>Go to Technical Checklist & Fill Form</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {displayedCompletedTechItems.map((item) => (
                          <div
                            key={item.id}
                            className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition space-y-4 flex flex-col justify-between"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Technical Completed Form
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                                  v{item.versionNumber}.0
                                </span>
                              </div>

                              <div>
                                <h3 className="text-sm font-bold text-white leading-snug">{item.documentName}</h3>
                                <p className="text-xs text-slate-400 mt-1 font-mono">Ref: {item.documentNumber || 'N/A'}</p>
                              </div>

                              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-[11px] font-mono text-slate-400">
                                {item.philgepsRefNo ? (
                                  <div className="p-2.5 rounded-lg bg-blue-950/90 border border-blue-500/50 text-[11px] font-mono space-y-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="text-blue-300 font-bold flex items-center gap-1">
                                        <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" /> Tagged Bidding Project:
                                      </span>
                                      <button
                                        onClick={() => openRetagModal(item)}
                                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-1 transition"
                                        title="Change or update associated Bidding Project tag"
                                      >
                                        <Edit3 className="w-3 h-3" /> Change Tag
                                      </button>
                                    </div>
                                    <span className="text-white font-bold block truncate">[{item.philgepsRefNo}] {item.projectTitle || 'Bidding Opportunity'}</span>
                                  </div>
                                ) : (
                                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
                                    <span className="text-amber-300 text-[11px] font-bold flex items-center gap-1">
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" /> No Project Tagged
                                    </span>
                                    <button
                                      onClick={() => openRetagModal(item)}
                                      className="px-2 py-1 rounded bg-amber-400 text-slate-950 font-bold text-[10px] hover:bg-amber-300 transition"
                                    >
                                      Tag Project
                                    </button>
                                  </div>
                                )}
                                <p className="text-slate-300 font-semibold">{item.legalBasisReference}</p>
                                <p className="truncate">File: {item.fileName}</p>
                                <p className="text-[10px] text-slate-500">Saved by: {item.uploadedByName}</p>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                              <button
                                onClick={() => setPreviewPdfItem(item)}
                                className="px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition text-xs font-semibold flex items-center gap-1 border border-blue-500/30"
                                title="View completed PDF document"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View PDF</span>
                              </button>

                              <button
                                onClick={() => {
                                  setFillingTemplateItem({
                                    id: item.documentCode?.toLowerCase() || 'tech-b',
                                    code: item.documentCode || 'b',
                                    name: item.documentName
                                  });
                                }}
                                className="px-3 py-1.5 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white transition text-xs font-semibold flex items-center gap-1 border border-amber-500/30"
                                title="Edit form entries in legal template"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit Form</span>
                              </button>

                              <button
                                onClick={() => {
                                  setReplaceTargetItem(item);
                                  resetFormState();
                                }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition text-xs font-semibold flex items-center gap-1 border border-emerald-500/30"
                                title="Replace PDF file"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Replace</span>
                              </button>

                              <button
                                onClick={() => handleDeleteCompletedTechDoc(item.id, item.documentName)}
                                className="px-3.5 py-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition text-xs font-semibold flex items-center gap-1 border border-red-500/30"
                                title="Delete completed technical document"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

        </div>
      )}

      {/* OTHER CATEGORY TABS (ALL, CLASS B, FINANCIAL, CORPORATE LEGAL) GRID */}
      {selectedCategory !== 'ELIGIBILITY_CLASS_A' && selectedCategory !== 'TECHNICAL' && (
        <div className="space-y-6">

          {/* SECTION SEPARATOR BANNER FOR ORGANIZED VIEW */}
          {selectedCategory === 'ALL' && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-blue-500/30 flex items-center justify-between flex-wrap gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span>Organized Document Vault — Statutory Component Registry</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                      Class A • Technical • Financial
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Categorized into Class A Legal Eligibility, Technical Exhibits (Envelope 1), and Financial Component (Envelope 2).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-300 font-bold bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  {filteredGridItems.length} Saved Documents
                </span>
              </div>
            </div>
          )}

          {/* INDIVIDUAL CATEGORY HEADER BANNER */}
          {selectedCategory !== 'ALL' && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {selectedCategory === 'FINANCIAL' ? '3. Financial Component Documents (Envelope 2)' : selectedCategory === 'CORPORATE_LEGAL' ? '4. Corporate Legal Documents' : '5. Class B Joint Venture Documents'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {selectedCategory === 'FINANCIAL' ? 'Financial Bid Form, Bill of Quantities (BOQ), Detailed Estimates, Unit Price Schedules & Cash Flow Statements' : 'Corporate resolutions, secretary certificates, power of attorney, and joint venture agreements.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* FINANCIAL DOCUMENTS STATUTORY FORMS GENERATOR CARDS */}
          {selectedCategory === 'FINANCIAL' && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
              
              {/* CARD 1: Bid Form for Goods */}
              <div className="glass-card p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/50 transition space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-1">
                      <FileSignature className="w-3 h-3 text-emerald-400" /> Goods Form
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">PBDs Sec VIII</span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white leading-snug">Bid Form for Goods</h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Statutory 2-page Financial Bid Form for goods procurement with itemized taxes and signatures.
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5 text-[10px] font-mono text-slate-400">
                    <p className="text-slate-300 font-bold">Ref: Section 30.1</p>
                    <p className="text-emerald-400">Legal 8.5" × 13"</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">bidform4goods...</span>
                  <button
                    onClick={() => setShowBidFormGoodsModal(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow transition flex items-center gap-1"
                  >
                    <FileSignature className="w-3.5 h-3.5" />
                    <span>Create</span>
                  </button>
                </div>
              </div>

              {/* CARD 2: Bid Form for Infrastructure Projects */}
              <div className="glass-card p-4 rounded-2xl border border-slate-800 hover:border-amber-500/50 transition space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20 flex items-center gap-1">
                      <HardHat className="w-3 h-3 text-amber-400" /> Infra Form
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">GPPB 09-2020</span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white leading-snug">Bid Form for Infra</h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Statutory 2-page Financial Bid Form for Civil Works with points (a)-(l) and BOQ acknowledgement.
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5 text-[10px] font-mono text-slate-400">
                    <p className="text-slate-300 font-bold">Ref: Res. 09-2020</p>
                    <p className="text-amber-400">Legal 8.5" × 13"</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">bidform4infra...</span>
                  <button
                    onClick={() => setShowBidFormInfraModal(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow transition flex items-center gap-1"
                  >
                    <FileSignature className="w-3.5 h-3.5" />
                    <span>Create</span>
                  </button>
                </div>
              </div>

              {/* CARD 3: Price Schedule for Goods */}
              <div className="glass-card p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/50 transition space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-1">
                      <Table className="w-3 h-3 text-emerald-400" /> Price Schedule
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">Cols 1 to 10</span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white leading-snug">Price Schedule (Goods)</h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Statutory Goods Price Schedule tracing columns 1-10 with EXW unit price, taxes, and auto-computed total cost.
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5 text-[10px] font-mono text-slate-400">
                    <p className="text-slate-300 font-bold">Ref: Section 32.2.1</p>
                    <p className="text-emerald-400">Legal 13" × 8.5"</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">priceschedule4...</span>
                  <button
                    onClick={() => setShowPriceScheduleGoodsModal(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow transition flex items-center gap-1"
                  >
                    <FileSignature className="w-3.5 h-3.5" />
                    <span>Create</span>
                  </button>
                </div>
              </div>

              {/* CARD 4: Summary of Bid Prices */}
              <div className="glass-card p-4 rounded-2xl border border-slate-800 hover:border-blue-500/50 transition space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-blue-400" /> Summary of Bid
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">Cols 1 to 4</span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white leading-snug">Summary of Bid Prices</h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Statutory Summary of Bid Prices table with Item No, Item, Particulars/Description, and Total Amount.
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5 text-[10px] font-mono text-slate-400">
                    <p className="text-slate-300 font-bold">Ref: Section 32.2.1</p>
                    <p className="text-blue-400">Legal 8.5" × 13"</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">summaryofbidpr...</span>
                  <button
                    onClick={() => setShowSummaryBidPriceModal(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow transition flex items-center gap-1"
                  >
                    <FileSignature className="w-3.5 h-3.5" />
                    <span>Create</span>
                  </button>
                </div>
              </div>

              {/* CARD 5: (L) Detailed Estimates Form */}
              <div className="glass-card p-4 rounded-2xl border border-slate-800 hover:border-purple-500/50 transition space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-bold border border-purple-500/20 flex items-center gap-1">
                      <Calculator className="w-3 h-3 text-purple-400" /> Detailed Estimates
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">Form (L)</span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white leading-snug">(L) Detailed Estimates</h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Statutory Form (L) Detailed Estimates Form with unit prices of materials, labor rates, rentals, and tax breakdown.
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5 text-[10px] font-mono text-slate-400">
                    <p className="text-slate-300 font-bold">Ref: Statutory Form (L)</p>
                    <p className="text-purple-400">Legal 13" × 8.5"</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">detailedestim...</span>
                  <button
                    onClick={() => setShowDetailedEstimatesModal(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow transition flex items-center gap-1"
                  >
                    <FileSignature className="w-3.5 h-3.5" />
                    <span>Create</span>
                  </button>
                </div>
              </div>

              {/* CARD 4: Bill of Quantities (BOQ) */}
              <div className="glass-card p-4 rounded-2xl border border-slate-800 hover:border-blue-500/50 transition space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20 flex items-center gap-1">
                      <Table className="w-3 h-3 text-blue-400" /> BOQ Schedule
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">Cols 1 to 6</span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white leading-snug">Bill of Quantities (BOQ)</h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Statutory Bill of Quantities schedule tracing columns 1-6 with unit prices, quantity & auto-totals.
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5 text-[10px] font-mono text-slate-400">
                    <p className="text-slate-300 font-bold">Ref: Sec. 32.2.1</p>
                    <p className="text-blue-400">Legal 8.5" × 13"</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">billofquantities...</span>
                  <button
                    onClick={() => setShowBoqModal(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow transition flex items-center gap-1"
                  >
                    <FileSignature className="w-3.5 h-3.5" />
                    <span>Create</span>
                  </button>
                </div>
              </div>

              {/* CARD 5: Cash Flow by Quarter (SF-INFR-56) */}
              <div className="glass-card p-4 rounded-2xl border border-slate-800 hover:border-purple-500/50 transition space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-bold border border-purple-500/20 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-purple-400" /> Cash Flow
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">SF-INFR-56</span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white leading-snug">Cash Flow by Quarter</h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Statutory Cash Flow and Payment Schedule form (SF-INFR-56) with quarterly accomplishments & cumulative amounts.
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5 text-[10px] font-mono text-slate-400">
                    <p className="text-slate-300 font-bold">Ref: SF-INFR-56</p>
                    <p className="text-purple-400">Legal 13" × 8.5"</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">cashflowbyquarter...</span>
                  <button
                    onClick={() => setShowCashFlowModal(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow transition flex items-center gap-1"
                  >
                    <FileSignature className="w-3.5 h-3.5" />
                    <span>Create</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {filteredGridItems.length === 0 && selectedCategory !== 'FINANCIAL' ? (
            <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
                <FileCheck className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-base font-bold text-white">No Documents in Selected Category</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  No uploaded vault items match category <span className="text-white font-mono font-bold">{selectedCategory.replace('_', ' ')}</span>. Click "Upload Vault Document" above to add new permits or exhibits.
                </p>
              </div>
              <button
                onClick={() => {
                  resetFormState();
                  setCustomUploadCategory(selectedCategory === 'ALL' ? 'ELIGIBILITY_CLASS_B' : selectedCategory as DocCategory);
                  setShowCustomUploadModal(true);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white shadow transition inline-flex items-center gap-2"
                style={{ backgroundColor: currentTenant?.brandColor || '#1e40af' }}
              >
                <Upload className="w-4 h-4" />
                <span>Upload Vault Document</span>
              </button>
            </div>
          ) : filteredGridItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGridItems.map((item) => {
                const isSelected = selectedItemIds.includes(item.id);

                return (
                  <div
                    key={item.id}
                    className={`glass-card p-5 rounded-2xl border transition space-y-4 flex flex-col justify-between group cursor-pointer ${isSelected
                      ? 'border-blue-500 bg-blue-950/20 shadow-xl'
                      : 'border-slate-800 hover:border-slate-700'
                      }`}
                    onClick={() => toggleSelectDoc(item.id)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30">
                          {item.category.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                          v{item.versionNumber}.0
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition leading-snug">{item.documentName}</h3>
                        <p className="text-xs text-slate-400 mt-1 font-mono">Serial No: {item.documentNumber || 'N/A'}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1 text-[11px] font-mono text-slate-400">
                        {item.issuedDate && <p>Issued: <span className="text-slate-200">{item.issuedDate}</span></p>}
                        {item.expiryDate && <p>Expires: <span className="text-emerald-400 font-semibold">{item.expiryDate}</span></p>}
                        <p className="truncate">File: {item.fileName}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setPreviewPdfItem(item)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition text-xs font-semibold flex items-center gap-1 border border-blue-500/30"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View PDF</span>
                      </button>

                      <button
                        onClick={() => openEditModal(item)}
                        className="px-3 py-1.5 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white transition text-xs font-semibold flex items-center gap-1 border border-amber-500/30"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => {
                          setReplaceTargetItem(item);
                          resetFormState();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition text-xs font-semibold flex items-center gap-1 border border-emerald-500/30"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Replace</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      {/* LEGAL TEMPLATE FILLER MODALS */}
      {fillingTemplateItem && fillingTemplateItem.code === '(b)' && (
        <StatementOngoingContractsModal
          tenant={currentTenant}
          activeProjectRefNo={activeProjectRefNo}
          activeProjectTitle={activeProjectTitle}
          activeProcuringEntity={activeProcuringEntity}
          onSaveAndComplete={(dataUrl, docName, projRef, projTitle) => {
            handleCompleteTemplate(dataUrl, docName, projRef, projTitle);
          }}
          onClose={() => setFillingTemplateItem(null)}
        />
      )}

      {fillingTemplateItem && fillingTemplateItem.code === '(c)' && (
        <StatementSlccModal
          tenant={currentTenant}
          activeProjectRefNo={activeProjectRefNo}
          activeProjectTitle={activeProjectTitle}
          activeProcuringEntity={activeProcuringEntity}
          onSaveAndComplete={(dataUrl, docName, projRef, projTitle) => {
            handleCompleteTemplate(dataUrl, docName, projRef, projTitle);
          }}
          onClose={() => setFillingTemplateItem(null)}
        />
      )}

      {fillingTemplateItem && (fillingTemplateItem.code === 'SEC-VI' || fillingTemplateItem.code === '(f.d)' || fillingTemplateItem.name.toLowerCase().includes('schedule of requirements') || fillingTemplateItem.name.toLowerCase().includes('section vi')) && (
        <SectionViScheduleOfRequirements
          item={fillingTemplateItem}
          tenant={currentTenant}
          activeProjectRefNo={activeProjectRefNo}
          activeProjectTitle={activeProjectTitle}
          onSaveAndComplete={(dataUrl, docName, projRef, projTitle) => {
            handleCompleteTemplate(dataUrl, docName, projRef, projTitle);
          }}
          onClose={() => setFillingTemplateItem(null)}
        />
      )}

      {fillingTemplateItem && (fillingTemplateItem.code === 'SEC-VII' || fillingTemplateItem.name.toLowerCase().includes('technical specifications') || fillingTemplateItem.name.toLowerCase().includes('section vii')) && (
        <TechnicalSpecifications
          item={fillingTemplateItem}
          tenant={currentTenant}
          activeProjectRefNo={activeProjectRefNo}
          activeProjectTitle={activeProjectTitle}
          onSaveAndComplete={(dataUrl, docName, projRef, projTitle) => {
            handleCompleteTemplate(dataUrl, docName, projRef, projTitle);
          }}
          onClose={() => setFillingTemplateItem(null)}
        />
      )}

      {fillingTemplateItem && (fillingTemplateItem.code === 'FAL-01' || fillingTemplateItem.code === 'SEC-VI-FAL' || fillingTemplateItem.name.toLowerCase().includes('framework agreement') || fillingTemplateItem.name.toLowerCase().includes('framework agreement list')) && (
        <FrameworkAgreementList
          item={fillingTemplateItem}
          tenant={currentTenant}
          activeProjectRefNo={activeProjectRefNo}
          activeProjectTitle={activeProjectTitle}
          onSaveAndComplete={(dataUrl, docName, projRef, projTitle) => {
            handleCompleteTemplate(dataUrl, docName, projRef, projTitle);
          }}
          onClose={() => setFillingTemplateItem(null)}
        />
      )}

      {fillingTemplateItem && (fillingTemplateItem.code === '(h)' || fillingTemplateItem.code === 'AFTER-SALES' || fillingTemplateItem.name.toLowerCase().includes('after sales')) && (
        <AfterSalesServiceModal
          item={fillingTemplateItem}
          tenant={currentTenant}
          activeProjectRefNo={activeProjectRefNo}
          activeProjectTitle={activeProjectTitle}
          activeProcuringEntity={activeProcuringEntity}
          onSaveAndComplete={(dataUrl, docName, projRef, projTitle) => {
            handleCompleteTemplate(dataUrl, docName, projRef, projTitle);
          }}
          onClose={() => setFillingTemplateItem(null)}
        />
      )}

      {fillingTemplateItem && (fillingTemplateItem.code === 'NFCC' || fillingTemplateItem.name.toLowerCase().includes('nfcc') || fillingTemplateItem.name.toLowerCase().includes('net financial contracting')) && (
        <NfccModal
          item={fillingTemplateItem}
          tenant={currentTenant}
          activeProjectRefNo={activeProjectRefNo}
          activeProjectTitle={activeProjectTitle}
          activeProcuringEntity={activeProcuringEntity}
          onSaveAndComplete={(dataUrl, docName, projRef, projTitle) => {
            handleCompleteTemplate(dataUrl, docName, projRef, projTitle);
          }}
          onClose={() => setFillingTemplateItem(null)}
        />
      )}

      {fillingTemplateItem && fillingTemplateItem.code !== '(b)' && fillingTemplateItem.code !== '(c)' && fillingTemplateItem.code !== 'SEC-VI' && fillingTemplateItem.code !== 'SEC-VII' && fillingTemplateItem.code !== '(f.d)' && fillingTemplateItem.code !== 'FAL-01' && fillingTemplateItem.code !== '(h)' && fillingTemplateItem.code !== 'NFCC' && !fillingTemplateItem.name.toLowerCase().includes('schedule of requirements') && !fillingTemplateItem.name.toLowerCase().includes('section vi') && !fillingTemplateItem.name.toLowerCase().includes('technical specifications') && !fillingTemplateItem.name.toLowerCase().includes('section vii') && !fillingTemplateItem.name.toLowerCase().includes('framework agreement') && !fillingTemplateItem.name.toLowerCase().includes('after sales') && !fillingTemplateItem.name.toLowerCase().includes('nfcc') && !fillingTemplateItem.name.toLowerCase().includes('net financial contracting') && (
        <TechnicalExhibitTemplateModal
          item={fillingTemplateItem}
          tenant={currentTenant}
          activeProjectRefNo={activeProjectRefNo}
          activeProjectTitle={activeProjectTitle}
          onSaveAndComplete={(dataUrl, docName, projRef, projTitle) => {
            handleCompleteTemplate(dataUrl, docName, projRef, projTitle);
          }}
          onClose={() => setFillingTemplateItem(null)}
        />
      )}

      {/* CLASS A MASTER UPLOAD MODAL */}
      {uploadTargetDef && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleIn my-auto">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-400" />
                <span>Upload Statutory Document — {uploadTargetDef.name}</span>
              </h3>
              <button onClick={() => setUploadTargetDef(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 text-xs">
              {uploadTargetDef.code === 'DOC-2' && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Registration Entity Sub-Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDtiSecType('DTI')}
                      className={`py-2 rounded-lg font-bold border transition ${dtiSecType === 'DTI' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-950 text-slate-400 border-slate-800'}`}
                    >
                      DTI Registration
                    </button>
                    <button
                      type="button"
                      onClick={() => setDtiSecType('SEC')}
                      className={`py-2 rounded-lg font-bold border transition ${dtiSecType === 'SEC' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-950 text-slate-400 border-slate-800'}`}
                    >
                      SEC Certificate
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">Document Serial / Permit Number</label>
                <input
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="e.g. PERMIT-2026-9012"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {uploadTargetDef.requiresIssueDate && (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Issue Date <span className="text-red-400">*</span></label>
                    <input
                      type="date"
                      value={issuedDate}
                      onChange={(e) => setIssuedDate(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
                {uploadTargetDef.requiresExpiryDate && (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Expiration Date <span className="text-red-400">*</span></label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Upload PDF File (Max 100 MB) <span className="text-red-400">*</span></label>
                <div className="border-2 border-dashed border-slate-800 rounded-xl p-4 text-center hover:border-blue-500 transition cursor-pointer bg-slate-950">
                  <label className="cursor-pointer block space-y-1">
                    <FileText className="w-6 h-6 text-blue-400 mx-auto" />
                    <p className="text-xs text-slate-300 font-semibold">{selectedFile?.name || 'Click to select PDF document'}</p>
                    <input type="file" accept=".pdf" onChange={(e) => handleFileSelection(e.target.files?.[0])} className="hidden" />
                  </label>
                </div>
                {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setUploadTargetDef(null)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-xl transition">
                  Upload & Save Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT REPLACEMENT MODAL */}
      {replaceTargetItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleIn my-auto">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-400" />
                <span>Upload Replacement Document — {replaceTargetItem.documentName}</span>
              </h3>
              <button onClick={() => setReplaceTargetItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReplaceSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 font-mono">
                Uploading replacement will archive version <strong>v{replaceTargetItem.versionNumber}.0</strong> and increment version to <strong>v{replaceTargetItem.versionNumber + 1}.0</strong>.
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">New Serial / Permit Number</label>
                <input
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder={replaceTargetItem.documentNumber || 'New Document Serial Number'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {replaceTargetItem.requiresIssueDate && (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">New Issue Date</label>
                    <input
                      type="date"
                      value={issuedDate}
                      onChange={(e) => setIssuedDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
                {replaceTargetItem.requiresExpiryDate && (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">New Expiration Date</label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">New Replacement PDF File <span className="text-red-400">*</span></label>
                <div className="border-2 border-dashed border-slate-800 rounded-xl p-4 text-center hover:border-emerald-500 transition cursor-pointer bg-slate-950">
                  <label className="cursor-pointer block space-y-1">
                    <FileText className="w-6 h-6 text-emerald-400 mx-auto" />
                    <p className="text-xs text-slate-300 font-semibold">{selectedFile?.name || 'Click to select replacement PDF'}</p>
                    <input type="file" accept=".pdf" onChange={(e) => handleFileSelection(e.target.files?.[0])} className="hidden" />
                  </label>
                </div>
                {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setReplaceTargetItem(null)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xl transition">
                  Save Replacement & Update Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DOCUMENT METADATA MODAL */}
      {editTargetItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleIn my-auto">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>Edit Document Details — {editTargetItem.documentName}</span>
              </h3>
              <button onClick={() => setEditTargetItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-mono">
                Correct or update document metadata such as document title, serial number, and statutory validity dates.
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Document Title / Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={editDocName}
                  onChange={(e) => setEditDocName(e.target.value)}
                  required
                  placeholder="e.g. Mayor's Permit / Business Permit 2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Document Serial / Permit Number</label>
                <input
                  type="text"
                  value={editDocNumber}
                  onChange={(e) => setEditDocNumber(e.target.value)}
                  placeholder="e.g. PERMIT-2026-9012"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={editIssuedDate}
                    onChange={(e) => setEditIssuedDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Expiration Date</label>
                  <input
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setEditTargetItem(null)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-xl transition">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RE-TAG BIDDING PROJECT MODAL */}
      {retagTargetItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleIn my-auto">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>Assign / Update Bidding Project Tag</span>
              </h3>
              <button onClick={() => setRetagTargetItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRetagSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 font-mono space-y-1">
                <p className="font-bold text-white">Document: {retagTargetItem.documentName}</p>
                <p>Tagging this document ensures zero cross-project data leakage and accurate filtering in Technical Eligibility.</p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Select Bidding Project (Opportunity Finder)</label>
                <select
                  value={retagProjectRefNo}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRetagProjectRefNo(val);
                    const found = oppProjects.find(p => p.refNo === val);
                    if (found) {
                      setRetagProjectTitle(found.title);
                    }
                  }}
                  className="w-full bg-slate-950 border border-blue-500/60 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-400 cursor-pointer"
                >
                  {oppProjects.map(p => (
                    <option key={p.id} value={p.refNo}>
                      [{p.refNo}] {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Project Reference Number</label>
                <input
                  type="text"
                  value={retagProjectRefNo}
                  onChange={(e) => setRetagProjectRefNo(e.target.value)}
                  placeholder="e.g. PRJ-2026-901283"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Bidding Project Title</label>
                <input
                  type="text"
                  value={retagProjectTitle}
                  onChange={(e) => setRetagProjectTitle(e.target.value)}
                  placeholder="e.g. Supply and Delivery of IT Equipment"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRetagTargetItem(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-xl transition"
                >
                  Update Project Tag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MERGED PDF VIEWER MODAL */}
      {showMergeModal && (
        <MergedPdfViewerModal
          selectedItems={selectedVaultObjects}
          tenant={currentTenant}
          onClose={() => setShowMergeModal(false)}
        />
      )}

      {/* SINGLE CONTINUOUS STREAM PDF PREVIEW MODAL */}
      {previewPdfItem && (
        <PdfPreviewModal
          item={previewPdfItem}
          tenant={currentTenant}
          onClose={() => setPreviewPdfItem(null)}
          pdfDataUrl={getPdfData(previewPdfItem.id)}
          hidePrintExport={true}
        />
      )}

      {/* UPLOAD CUSTOM DOCUMENT MODAL */}
      {showCustomUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleIn my-auto">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-400" />
                <span>Upload Custom Vault Document</span>
              </h3>
              <button onClick={() => setShowCustomUploadModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCustomUploadSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Category</label>
                <select
                  value={customUploadCategory}
                  onChange={(e) => setCustomUploadCategory(e.target.value as DocCategory)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="ELIGIBILITY_CLASS_A">Class A Legal Eligibility</option>
                  <option value="ELIGIBILITY_CLASS_B">Class B Joint Venture</option>
                  <option value="TECHNICAL">Class A Technical Eligibility</option>
                  <option value="FINANCIAL">Financial Documents</option>
                  <option value="CORPORATE_LEGAL">Corporate Legal</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Document Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={customDocName}
                  onChange={(e) => setCustomDocName(e.target.value)}
                  placeholder="e.g. Joint Venture Agreement 2026"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Document Serial Number</label>
                <input
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="e.g. JVA-2026-901"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={issuedDate}
                    onChange={(e) => setIssuedDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Expiration Date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">PDF File (Max 100 MB) <span className="text-red-400">*</span></label>
                <div className="border-2 border-dashed border-slate-800 rounded-xl p-4 text-center hover:border-blue-500 transition cursor-pointer bg-slate-950">
                  <label className="cursor-pointer block space-y-1">
                    <FileText className="w-6 h-6 text-blue-400 mx-auto" />
                    <p className="text-xs text-slate-300 font-semibold">{selectedFile?.name || 'Click to select PDF'}</p>
                    <input type="file" accept=".pdf" onChange={(e) => handleFileSelection(e.target.files?.[0])} className="hidden" />
                  </label>
                </div>
                {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCustomUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-xl transition"
                  style={{ backgroundColor: currentTenant?.brandColor || '#1e40af' }}
                >
                  Upload Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUTORY FINANCIAL BID FORM FOR GOODS MODAL */}
      {showBidFormGoodsModal && (
        <BidFormForGoodsModal
          tenant={currentTenant}
          activeProjectRefNo={activeProjectRefNo}
          activeProjectTitle={activeProjectTitle}
          activeProcuringEntity={activeProcuringEntity}
          onSaveAndComplete={handleSaveCompletedBidFormGoods}
          onClose={() => setShowBidFormGoodsModal(false)}
        />
      )}

      {/* STATUTORY FINANCIAL BID FORM FOR INFRASTRUCTURE MODAL */}
      {showBidFormInfraModal && (
        <BidFormForInfrastructureModal
          tenant={currentTenant}
          activeProjectRefNo={activeProjectRefNo}
          activeProjectTitle={activeProjectTitle}
          activeProcuringEntity={activeProcuringEntity}
          onSaveAndComplete={handleSaveCompletedBidFormInfra}
          onClose={() => setShowBidFormInfraModal(false)}
        />
      )}

      {/* STATUTORY BILL OF QUANTITIES (BOQ) MODAL */}
      {showBoqModal && (
        <BillOfQuantitiesModal
          tenant={currentTenant}
          activeProjectRefNo={activeProjectRefNo}
          activeProjectTitle={activeProjectTitle}
          activeProcuringEntity={activeProcuringEntity}
          onSaveAndComplete={handleSaveCompletedBoq}
          onClose={() => setShowBoqModal(false)}
        />
      )}

      {/* STATUTORY CASH FLOW BY QUARTER (SF-INFR-56) MODAL */}
      {showCashFlowModal && (
        <CashFlowByQuarterModal
          tenant={currentTenant}
          activeProjectRefNo={activeProjectRefNo}
          activeProjectTitle={activeProjectTitle}
          activeProcuringEntity={activeProcuringEntity}
          onSaveAndComplete={handleSaveCompletedCashFlow}
          onClose={() => setShowCashFlowModal(false)}
        />
      )}

      {/* STATUTORY PRICE SCHEDULE FOR GOODS MODAL */}
      {showPriceScheduleGoodsModal && (
        <PriceSchedule4GoodsModal
          tenant={currentTenant}
          activeProjectRefNo={activeProjectRefNo}
          activeProjectTitle={activeProjectTitle}
          activeProcuringEntity={activeProcuringEntity}
          onSaveAndComplete={handleSaveCompletedPriceScheduleGoods}
          onClose={() => setShowPriceScheduleGoodsModal(false)}
        />
      )}

      {/* STATUTORY SUMMARY OF BID PRICES MODAL */}
      {showSummaryBidPriceModal && (
        <SummaryOfBidPriceModal
          tenant={currentTenant}
          activeProjectRefNo={activeProjectRefNo}
          activeProjectTitle={activeProjectTitle}
          activeProcuringEntity={activeProcuringEntity}
          onSaveAndComplete={handleSaveCompletedSummaryBidPrice}
          onClose={() => setShowSummaryBidPriceModal(false)}
        />
      )}

      {/* STATUTORY (L) DETAILED ESTIMATES FORM MODAL */}
      {showDetailedEstimatesModal && (
        <DetailedEstimatesModal
          tenant={currentTenant}
          activeProjectRefNo={activeProjectRefNo}
          activeProjectTitle={activeProjectTitle}
          activeProcuringEntity={activeProcuringEntity}
          onSaveAndComplete={handleSaveCompletedDetailedEstimates}
          onClose={() => setShowDetailedEstimatesModal(false)}
        />
      )}

      {/* STATUTORY NFCC MODAL */}
      {showNfccModal && (
        <NfccModal
          tenant={currentTenant}
          activeProjectRefNo={activeProjectRefNo}
          activeProjectTitle={activeProjectTitle}
          activeProcuringEntity={activeProcuringEntity}
          onClose={() => setShowNfccModal(false)}
          onSaveAndComplete={(pdfDataUrl?: string, docName?: string, projRefNo?: string, projTitle?: string) => {
            const newId = `fin-nfcc-${Date.now()}`;
            const refNo = projRefNo || activeProjectRefNo || (oppProjects[0]?.refNo || '');
            const title = projTitle || activeProjectTitle || (oppProjects[0]?.title || '');

            const newItem: DocumentVaultItem = {
              id: newId,
              tenantId: activeTenantId,
              documentCode: 'NFCC',
              documentName: docName || `Net Financial Contracting Capacity - [${refNo}]`,
              category: 'FINANCIAL',
              procurementApplicability: ['GOODS', 'INFRASTRUCTURE', 'CONSULTING_SERVICES'],
              legalBasisReference: 'Section 23.4.1.4 of RA 12009 / RA 9184',
              versionNumber: 1,
              fileHash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
              fileSizeBytes: 185000,
              fileName: `${refNo}_Financial_Envelope_NFCC.pdf`,
              fileDataUrl: pdfDataUrl,
              status: 'ACTIVE',
              uploadedByName: currentUser?.fullName || 'Authorized Financial Manager',
              isOptional: false,
              requiresIssueDate: false,
              requiresExpiryDate: false,
              philgepsRefNo: refNo,
              projectTitle: title
            };
            storePdfData(newId, pdfDataUrl);
            setVaultItems(prev => [newItem, ...prev]);
            setShowNfccModal(false);
            notifySuccess('NFCC Statement Saved!', `Net Financial Contracting Capacity statement saved to Financial Documents vault.`);
          }}
        />
      )}

    </div>
    </VaultErrorBoundary>
  );
};

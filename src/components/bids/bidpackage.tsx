import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DocumentVaultItem } from '../../types';
import { DocumentCoverPage } from '../vault/DocumentCoverPage';
import { MergedPdfViewerModal } from '../vault/MergedPdfViewerModal';
import { MergedPackageViewerModal } from '../vault/MergedPackageViewerModal';
import { PdfPreviewModal } from '../vault/PdfPreviewModal';
import DocumentQrCode from '../common/DocumentQrCode';
import { loadVaultItems, loadPdfData } from '../../utils/vaultIndexedDB';
import { getOpportunityProjects, OpportunityProjectOption } from '../../utils/opportunityProjects';
import { generateAndDownloadThreeLayerPdf, exportMergedThreeLayerPdf, ExportDocumentUnit } from '../../utils/pdfExportEngine';
import { 
  ChevronDown, 
  Briefcase, 
  ShieldCheck, 
  Coins, 
  Folder, 
  FolderOpen, 
  FileText, 
  ChevronRight, 
  Eye, 
  Printer, 
  CheckCircle2, 
  Clock, 
  Search, 
  FolderPlus, 
  Plus, 
  Trash2, 
  Layers, 
  X, 
  Box, 
  Sparkles, 
  Copy,
  CheckSquare,
  Square,
  FileCheck2,
  ListPlus,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  GripVertical,
  ListOrdered,
  FileStack,
  Loader2,
  Download
} from 'lucide-react';

export type FolderCopyType = 'ORIGINAL' | 'COPY_1' | 'COPY_2';

export interface PackageItem {
  id: string;
  documentName: string;
  documentNumber?: string;
  category: 'LEGAL' | 'TECHNICAL' | 'FINANCIAL';
  envelope: 'ENVELOPE_1' | 'ENVELOPE_2';
  folderCopy: FolderCopyType;
  vaultDocId?: string;
  fileSizeBytes?: number;
  dateAdded: string;
  isAutoDetected?: boolean;
}

interface StatutoryDocDefinition {
  id: string;
  name: string;
  category: 'LEGAL' | 'TECHNICAL' | 'FINANCIAL';
  envelope: 'ENVELOPE_1' | 'ENVELOPE_2';
  code: string;
  storageKey?: string;
  vaultMatchCategory?: string;
}

export const BidPackageBuilderView: React.FC = () => {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id || '';

  // Opportunity Projects Dropdown State
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  // Active Envelope State ('ENVELOPE_1' = Technical & Legal, 'ENVELOPE_2' = Financial)
  const [activeEnvelope, setActiveEnvelope] = useState<'ENVELOPE_1' | 'ENVELOPE_2'>('ENVELOPE_1');

  // Active Folder Copy State per Envelope ('ORIGINAL' | 'COPY_1' | 'COPY_2')
  const [activeFolderCopy, setActiveFolderCopy] = useState<FolderCopyType>('ORIGINAL');

  // Project-Scoped Bid Package Documents
  const [packageItems, setPackageItems] = useState<PackageItem[]>([]);

  // Vault Items & Preview Modals
  const [vaultDocs, setVaultDocs] = useState<DocumentVaultItem[]>([]);
  const [previewDocItem, setPreviewDocItem] = useState<DocumentVaultItem | null>(null);
  const [showOrganizeModal, setShowOrganizeModal] = useState(false);
  const [showMergedPackageViewerModal, setShowMergedPackageViewerModal] = useState(false);

  // Cover Page Modals:
  const [showMotherCoverModal, setShowMotherCoverModal] = useState(false);
  const [showEnvelopeCoverModal, setShowEnvelopeCoverModal] = useState(false);
  const [showFolderCoverModal, setShowFolderCoverModal] = useState(false);
  const [selectedDocForCover, setSelectedDocForCover] = useState<PackageItem | null>(null);

  // Add Completed Documents Picker Modal State
  const [showAddCompletedModal, setShowAddCompletedModal] = useState(false);
  const [selectedDocIdsToAdd, setSelectedDocIdsToAdd] = useState<string[]>([]);
  const [completedDocFilter, setCompletedDocFilter] = useState<'ALL' | 'LEGAL' | 'TECHNICAL' | 'FINANCIAL'>('ALL');

  const [showVaultImportModal, setShowVaultImportModal] = useState(false);
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [showAutoSyncSuccess, setShowAutoSyncSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Custom Modal Inputs
  const [customDocName, setCustomDocName] = useState('');
  const [customDocCategory, setCustomDocCategory] = useState<'LEGAL' | 'TECHNICAL' | 'FINANCIAL'>('LEGAL');

  // Reorganize & Sequence State
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [reorderList, setReorderList] = useState<PackageItem[]>([]);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  // Merge All Documents State
  const [isMergingAll, setIsMergingAll] = useState(false);
  const [mergeStatusText, setMergeStatusText] = useState('');

  const pdfDataCache = useRef<Record<string, string>>({});

  useEffect(() => {
    const list = getOpportunityProjects(tenantId);
    setOppProjects(list);
    if (list.length > 0 && !selectedOppId) {
      setSelectedOppId(list[0].id);
    }
  }, [tenantId]);

  const activeProject = oppProjects.find(p => p.id === selectedOppId || p.refNo === selectedOppId) || oppProjects[0] || null;
  const projectRefNo = activeProject?.refNo || '';
  const projectTitle = activeProject?.title || '';
  const procuringEntity = activeProject?.procuringEntity || 'Bids and Awards Committee';
  const submissionDeadline = activeProject?.dateTimeSubmitted || 'March 19, 2026';
  const projectCategory = (activeProject?.category || 'Infrastructure').toLowerCase();
  const projectScopeKey = projectRefNo || selectedOppId || 'default';

  // Master Statutory Bidding Documents Checklist definitions (Strictly aligned with 1-17 Statutory Checklist Order)
  const statutoryDocsList: StatutoryDocDefinition[] = [
    // 1. PhilGEPS Platinum Certificate of Registration
    { id: 'PHILGEPS_PLATINUM', name: 'PhilGEPS Platinum Certificate of Registration (Annex A)', category: 'LEGAL', envelope: 'ENVELOPE_1', code: 'PHILGEPS_PLATINUM', vaultMatchCategory: 'ELIGIBILITY_CLASS_A' },
    // 2. Statement of All Ongoing Government & Private Contracts
    { id: 'ONGOING_CONTRACTS', name: 'Statement of All Ongoing Government & Private Contracts', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'ONGOING_CONTRACTS', storageKey: `bidocs_ongoing_${tenantId}_${projectScopeKey}` },
    // 3. Statement of Single Largest Completed Contract (SLCC)
    { id: 'SLCC_STATEMENT', name: 'Statement of Single Largest Completed Contract (SLCC)', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'SLCC_STATEMENT', storageKey: `bidocs_slcc_${tenantId}_${projectScopeKey}` },
    // 4. Bid Securing Declaration / Bid Security or Surety Bond
    { id: 'BID_SECURING_DECLARATION', name: 'Bid Securing Declaration / Bid Security or Surety Bond (BSD)', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'BID_SECURING_DECLARATION' },
    // 5. Section VI: Schedule of Requirements
    { id: 'SECTION_VI_REQUIREMENTS', name: 'Section VI: Schedule of Requirements', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'SECTION_VI_REQUIREMENTS', storageKey: `bidocs_sec_vi_${tenantId}_${projectScopeKey}` },
    // 6. Section VII: Technical Specifications Statement of Compliance
    { id: 'TECH_SPECS_SECTION_VII', name: 'Section VII: Technical Specifications Statement of Compliance', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'TECH_SPECS_SECTION_VII', storageKey: `bidocs_tech_specs_${tenantId}_${projectScopeKey}` },
    // 7. Delivery Schedule / Framework Agreement List
    { id: 'DELIVERY_SCHEDULE', name: 'Delivery Schedule / Framework Agreement List', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'DELIVERY_SCHEDULE', storageKey: `bidocs_fal_${tenantId}_${projectScopeKey}` },
    // 8. Organizational Chart, Manpower Requirements & Key Personnel
    { id: 'ORGANIZATIONAL_CHART', name: 'Organizational Chart for the Contract to be Bid', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'ORGANIZATIONAL_CHART', storageKey: `bidocs_org_chart_${tenantId}_${projectScopeKey}` },
    { id: 'KEY_PERSONNEL', name: 'Key Personnel Matrix, Bio-Data & PRC Certifications (Manpower Requirements)', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'KEY_PERSONNEL', storageKey: `bidocs_personnel_${tenantId}_${projectScopeKey}` },
    { id: 'MAJOR_EQUIPMENT', name: "Contractor's Major Equipment Utilization Matrix", category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'MAJOR_EQUIPMENT', storageKey: `bidocs_equipment_${tenantId}_${projectScopeKey}` },
    // 9. After-Sales Services & Warranty Undertaking
    { id: 'AFTERSALES_WARRANTY', name: 'After-Sales Services & Warranty Undertaking', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'AFTERSALES_WARRANTY', storageKey: `bidocs_aftersale_${tenantId}_${projectScopeKey}` },
    // 10. Omnibus Sworn Statement (OSS)
    { id: 'OMNIBUS_SWORN_STATEMENT', name: 'Omnibus Sworn Statement (OSS)', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'OMNIBUS_SWORN_STATEMENT' },
    // 11. Net Financial Contracting Capacity (NFCC) Computation
    { id: 'NFCC_COMPUTATION', name: 'Net Financial Contracting Capacity (NFCC) Computation', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'NFCC_COMPUTATION', storageKey: `bidocs_nfcc_${tenantId}_${projectScopeKey}` },
    // 12. Audited Financial Statements (AFS)
    { id: 'AUDITED_FS', name: 'Audited Financial Statements (AFS) stamped received by BIR', category: 'LEGAL', envelope: 'ENVELOPE_1', code: 'AUDITED_FS', vaultMatchCategory: 'ELIGIBILITY_CLASS_A' },
    // 13. Mayor's / Business Permit (Current Year)
    { id: 'MAYORS_PERMIT', name: "Mayor's / Business Permit (Current Year)", category: 'LEGAL', envelope: 'ENVELOPE_1', code: 'MAYORS_PERMIT', vaultMatchCategory: 'ELIGIBILITY_CLASS_A' },
    // 14. PCAB License and Special License
    { id: 'PCAB_LICENSE', name: 'PCAB License and Special License (for Infrastructure)', category: 'LEGAL', envelope: 'ENVELOPE_1', code: 'PCAB_LICENSE', vaultMatchCategory: 'ELIGIBILITY_CLASS_A' },
    // 15. SEC / DTI Certificate of Business Registration
    { id: 'SEC_DTI_REG', name: 'SEC / DTI Certificate of Business Registration', category: 'LEGAL', envelope: 'ENVELOPE_1', code: 'SEC_DTI_REG', vaultMatchCategory: 'ELIGIBILITY_CLASS_A' },
    // 16. BIR Registration and Tax Clearance Certificate
    { id: 'TAX_CLEARANCE', name: 'BIR Tax Clearance Certificate & BIR Registration', category: 'LEGAL', envelope: 'ENVELOPE_1', code: 'TAX_CLEARANCE', vaultMatchCategory: 'ELIGIBILITY_CLASS_A' },
    // 17. Secretary's Certificate / Board Resolution / SPA
    { id: 'SECRETARY_CERTIFICATE', name: "Secretary's Certificate / Board Resolution / Special Power of Attorney (SPA)", category: 'LEGAL', envelope: 'ENVELOPE_1', code: 'SECRETARY_CERTIFICATE', vaultMatchCategory: 'ELIGIBILITY_CLASS_A' },
    { id: 'JOINT_VENTURE_AGREEMENT', name: 'Joint Venture Agreement (JVA) / Class B Legal Documents', category: 'LEGAL', envelope: 'ENVELOPE_1', code: 'JOINT_VENTURE_AGREEMENT', vaultMatchCategory: 'ELIGIBILITY_CLASS_B' },

    // Envelope 2: Financial Proposal Documents
    { id: 'FINANCIAL_BID_FORM_GOODS', name: 'Official Financial Bid Form (for Goods & General Support)', category: 'FINANCIAL', envelope: 'ENVELOPE_2', code: 'GPPB-BIDFORM-GOODS', storageKey: `bidocs_bidform_goods_${tenantId}_${projectScopeKey}` },
    { id: 'FINANCIAL_BID_FORM_INFRA', name: 'Official Financial Bid Form (for Infrastructure Projects)', category: 'FINANCIAL', envelope: 'ENVELOPE_2', code: 'GPPB-BIDFORM-INFRASTRUCTURE', storageKey: `bidocs_bidform_infra_${tenantId}_${projectScopeKey}` },
    { id: 'PRICE_SCHEDULE_GOODS', name: 'Detailed Price Schedule for Goods (Offered from Abroad / Within Philippines)', category: 'FINANCIAL', envelope: 'ENVELOPE_2', code: 'PRICE_SCHEDULE_GOODS', storageKey: `bidocs_pricesched_${tenantId}_${projectScopeKey}` },
    { id: 'BILL_OF_QUANTITIES', name: 'Bill of Quantities (BOQ Breakdown)', category: 'FINANCIAL', envelope: 'ENVELOPE_2', code: 'BILL_OF_QUANTITIES', storageKey: `bidocs_boq_${tenantId}_${projectScopeKey}` },
    { id: 'DETAILED_ESTIMATES_FORM_L', name: '(Form L) Detailed Estimates (Direct Labor, Logistics & Equipment)', category: 'FINANCIAL', envelope: 'ENVELOPE_2', code: 'DETAILED_ESTIMATES_FORM_L', storageKey: `bidocs_detailed_estimates_${tenantId}_${projectScopeKey}` },
    { id: 'SUMMARY_BID_PRICES', name: 'Summary of Bid Prices & Lump-Sum Breakdown', category: 'FINANCIAL', envelope: 'ENVELOPE_2', code: 'SUMMARY_BID_PRICES', storageKey: `bidocs_summary_bid_price_${tenantId}_${projectScopeKey}` },
    { id: 'CASH_FLOW_BY_QUARTER', name: 'Cash Flow by Quarter and Payment Schedule (SF-INFR-56)', category: 'FINANCIAL', envelope: 'ENVELOPE_2', code: 'CASH_FLOW_BY_QUARTER', storageKey: `bidocs_cash_flow_${tenantId}_${projectScopeKey}` }
  ];

  // Load vault documents from IndexedDB + Completed Forms
  useEffect(() => {
    if (!tenantId) return;
    loadVaultItems(tenantId).then(async (docs) => {
      const combinedDocs: DocumentVaultItem[] = Array.isArray(docs) ? [...docs] : [];

      // Also merge completed statutory forms (Section VII, Section VI, BSD, OSS, etc.)
      try {
        const rawCompleted = localStorage.getItem(`bidocs_completed_notarized_${tenantId}`);
        if (rawCompleted) {
          const parsedCompleted = JSON.parse(rawCompleted);
          if (Array.isArray(parsedCompleted)) {
            parsedCompleted.forEach((form: any) => {
              if (!combinedDocs.some(d => d.id === form.id)) {
                combinedDocs.push({
                  id: form.id,
                  tenantId: tenantId,
                  documentName: form.title || form.formCode,
                  documentCode: form.formCode,
                  documentNumber: form.projectRefNo || projectRefNo,
                  category: form.formCode === 'SEC-VII' || form.formCode === 'SEC-VI' ? 'TECHNICAL' : 'TECHNICAL',
                  procurementApplicability: ['Infrastructure'],
                  legalBasisReference: 'RA 12009 NGPA / RA 9184 Standard',
                  versionNumber: form.versionNumber || 1,
                  fileHash: '',
                  fileSizeBytes: 1048576,
                  fileName: `${(form.title || 'document').toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
                  uploadedByName: currentTenant?.authorizedSignatory?.name || 'Authorized Signatory',
                  isOptional: false,
                  requiresIssueDate: false,
                  requiresExpiryDate: false,
                  status: 'ACTIVE',
                  projectTitle: form.projectTitle || projectTitle,
                  philgepsRefNo: form.projectRefNo || projectRefNo,
                  previousVersions: []
                });
              }
            });
          }
        }
      } catch (e) {
        console.warn('[BidPackage] Note loading completed forms:', e);
      }

      setVaultDocs(combinedDocs);

      for (const d of combinedDocs) {
        try {
          const data = await loadPdfData(d.id);
          if (data) pdfDataCache.current[d.id] = data;
        } catch (_) { /* ignore missing binary */ }
      }
    }).catch(e => console.error('[BidPackage] Failed to load vault items:', e));
  }, [tenantId, projectScopeKey]);

  // Load project-scoped package items from localStorage (Strictly Isolated per Project)
  useEffect(() => {
    if (!tenantId || !projectScopeKey) {
      setPackageItems([]);
      return;
    }

    const storageKey = `bidocs_package_items_${tenantId}_${projectScopeKey}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map(item => ({
            ...item,
            folderCopy: item.folderCopy || 'ORIGINAL'
          }));
          setPackageItems(normalized);
          return;
        }
      } catch (_) {}
    }

    setPackageItems([]);
  }, [tenantId, projectScopeKey]);

  // Master Helper: Guarantee COPY 1 and COPY 2 are 100% IDENTICAL to ORIGINAL in content, envelope, and sequence
  const syncOriginalToCopies = (items: PackageItem[]): PackageItem[] => {
    const originalItems = items.filter(item => item.folderCopy === 'ORIGINAL');

    const copy1Items: PackageItem[] = originalItems.map(item => ({
      ...item,
      id: item.id.startsWith('pkg-c1-') ? item.id : `pkg-c1-${item.id.replace(/^pkg-c[12]-/, '')}`,
      folderCopy: 'COPY_1'
    }));

    const copy2Items: PackageItem[] = originalItems.map(item => ({
      ...item,
      id: item.id.startsWith('pkg-c2-') ? item.id : `pkg-c2-${item.id.replace(/^pkg-c[12]-/, '')}`,
      folderCopy: 'COPY_2'
    }));

    return [...originalItems, ...copy1Items, ...copy2Items];
  };

  // Persist package items per project with automatic 100% synchronization to COPY 1 and COPY 2
  const savePackageItems = (newItems: PackageItem[]) => {
    const fullySynced = syncOriginalToCopies(newItems);
    setPackageItems(fullySynced);
    if (tenantId && projectScopeKey) {
      const storageKey = `bidocs_package_items_${tenantId}_${projectScopeKey}`;
      localStorage.setItem(storageKey, JSON.stringify(fullySynced));
    }
  };

  // Helper to check if a statutory document is ready/configured in system (100% ACCURATE & STRICT PROJECT ISOLATION)
  const checkDocReadiness = (doc: StatutoryDocDefinition): { isReady: boolean; vaultId?: string } => {
    const currentRef = (projectRefNo || '').trim().toLowerCase();
    const currentTitle = (projectTitle || '').trim().toLowerCase();

    // 1. Check local storage template for THIS specific project (must have actual non-empty content)
    if (doc.storageKey) {
      const raw = localStorage.getItem(doc.storageKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return { isReady: true };
          } else if (typeof parsed === 'object' && parsed !== null) {
            // Check for objects with arrays like detailed estimates
            const hasData = Object.values(parsed).some(val => Array.isArray(val) && val.length > 0);
            if (hasData || Object.keys(parsed).length > 2) {
              return { isReady: true };
            }
          }
        } catch (_) {}
      }
    }

    // 2. Check vault items (Class A/B Legal & Eligibility, Technical, Financial)
    const matchingVault = vaultDocs.find(v => {
      const vName = (v.documentName || '').toLowerCase();
      const vCode = (v.documentCode || '').toUpperCase();
      const vRef = (v.philgepsRefNo || v.documentNumber || '').trim().toLowerCase();
      const vTitle = (v.projectTitle || '').trim().toLowerCase();

      // If document belongs to a specific project, ensure it matches THIS project strictly
      const isForThisProject = (!currentRef && !currentTitle) ||
                               (!vRef && !vTitle) ||
                               (currentRef && (vRef.includes(currentRef) || currentRef.includes(vRef))) ||
                               (currentTitle && (vTitle.includes(currentTitle) || currentTitle.includes(vTitle)));

      // Class A / B Corporate Credentials Matching
      if (doc.id === 'PHILGEPS_PLATINUM') {
        return (vCode === 'DOC-1' || vCode.includes('PHILGEPS') || vName.includes('philgeps')) && isForThisProject;
      }
      if (doc.id === 'SEC_DTI_REG') {
        return (vCode === 'DOC-2' || vCode.includes('SEC') || vCode.includes('DTI') || vName.includes('sec') || vName.includes('dti') || vName.includes('business registration')) && isForThisProject;
      }
      if (doc.id === 'MAYORS_PERMIT') {
        return (vCode === 'DOC-3' || vCode === 'DOC-4' || vName.includes('mayor') || vName.includes('business permit') || vName.includes('barangay business')) && isForThisProject;
      }
      if (doc.id === 'TAX_CLEARANCE') {
        return (vCode === 'DOC-7' || vCode === 'DOC-6' || vCode.includes('TAX') || vName.includes('tax clearance') || vName.includes('bir tax') || vName.includes('tax')) && isForThisProject;
      }
      if (doc.id === 'AUDITED_FS') {
        return (vCode === 'DOC-15' || vCode.includes('AFS') || vName.includes('financial statement') || vName.includes('afs') || vName.includes('audited')) && isForThisProject;
      }
      if (doc.id === 'PCAB_LICENSE') {
        return (vCode === 'DOC-8' || vCode.includes('PCAB') || vName.includes('pcab')) && isForThisProject;
      }
      if (doc.id === 'SECRETARY_CERTIFICATE') {
        return (vCode === 'DOC-13' || vCode.includes('SECRETARY') || vName.includes('secretary') || vName.includes('board resolution') || vName.includes('power of attorney') || vName.includes('spa')) && isForThisProject;
      }
      if (doc.id === 'JOINT_VENTURE_AGREEMENT') {
        return (vCode === 'DOC-14' || vCode.includes('JVA') || vName.includes('joint venture') || vName.includes('jva')) && isForThisProject;
      }

      // Technical Exhibits & Statements Matching
      if (doc.id === 'SLCC_STATEMENT') {
        return (vCode.includes('SLCC') || vName.includes('slcc') || vName.includes('single largest')) && isForThisProject;
      }
      if (doc.id === 'ONGOING_CONTRACTS') {
        return (vCode.includes('ONGOING') || vName.includes('ongoing')) && isForThisProject;
      }
      if (doc.id === 'NFCC_COMPUTATION') {
        return (vCode.includes('NFCC') || vName.includes('nfcc') || vName.includes('contracting capacity')) && isForThisProject;
      }
      if (doc.id === 'SECTION_VI_REQUIREMENTS') {
        return (vCode.includes('SEC-VI') || vName.includes('section vi') || vName.includes('schedule of requirements')) && isForThisProject;
      }
      if (doc.id === 'TECH_SPECS_SECTION_VII') {
        return (vCode.includes('SEC-VII') || vName.includes('section vii') || vName.includes('technical specifications')) && isForThisProject;
      }
      if (doc.id === 'BID_SECURING_DECLARATION') {
        return (vCode.includes('BSD') || vName.includes('bid securing') || vName.includes('bsd') || vName.includes('bid security')) && isForThisProject;
      }
      if (doc.id === 'OMNIBUS_SWORN_STATEMENT') {
        return (vCode.includes('OSS') || vName.includes('omnibus') || vName.includes('oss')) && isForThisProject;
      }
      if (doc.id === 'ORGANIZATIONAL_CHART') {
        return (vCode.includes('ORG') || vName.includes('organizational chart') || vName.includes('org chart')) && isForThisProject;
      }
      if (doc.id === 'KEY_PERSONNEL') {
        return (vCode.includes('PERSONNEL') || vName.includes('key personnel') || vName.includes('bio-data') || vName.includes('prc')) && isForThisProject;
      }
      if (doc.id === 'MAJOR_EQUIPMENT') {
        return (vCode.includes('EQUIPMENT') || vName.includes('equipment')) && isForThisProject;
      }
      if (doc.id === 'AFTERSALES_WARRANTY') {
        return (vCode.includes('AFTER') || vName.includes('after-sales') || vName.includes('aftersales') || vName.includes('warranty')) && isForThisProject;
      }

      // Financial Proposals Matching
      if (doc.id === 'FINANCIAL_BID_FORM_GOODS') {
        return (vCode.includes('GOODS') || vName.includes('goods')) && (vCode.includes('BIDFORM') || vName.includes('bid form')) && isForThisProject;
      }
      if (doc.id === 'FINANCIAL_BID_FORM_INFRA') {
        return (vCode.includes('INFRA') || vName.includes('infrastructure')) && (vCode.includes('BIDFORM') || vName.includes('bid form')) && isForThisProject;
      }
      if (doc.id === 'PRICE_SCHEDULE_GOODS') {
        return (vCode.includes('PRICESCHED') || vCode.includes('PRICE-SCHEDULE') || vName.includes('price schedule')) && isForThisProject;
      }
      if (doc.id === 'BILL_OF_QUANTITIES') {
        return (vCode.includes('BOQ') || vName.includes('bill of quantities') || vName.includes('boq')) && isForThisProject;
      }
      if (doc.id === 'DETAILED_ESTIMATES_FORM_L') {
        return (vCode.includes('DETAILED-ESTIMATES') || vName.includes('detailed estimate') || vName.includes('form l') || vName.includes('form (l)')) && isForThisProject;
      }
      if (doc.id === 'SUMMARY_BID_PRICES') {
        return (vCode.includes('SUMMARY-BIDPRICE') || vName.includes('summary of bid price')) && isForThisProject;
      }
      if (doc.id === 'CASH_FLOW_BY_QUARTER') {
        return (vCode.includes('SF-INFR-56') || vCode.includes('CASHFLOW') || vName.includes('cash flow') || vName.includes('sf-infr-56')) && isForThisProject;
      }

      // Fallback substring matching
      const dName = (doc.name || '').toLowerCase();
      return (vName.includes(dName) || dName.includes(vName)) && isForThisProject;
    });

    if (matchingVault) {
      return { isReady: true, vaultId: matchingVault.id };
    }

    // BSD & OSS are official Cover Separator documents that are printed, notarized with wet-ink, and attached in real life
    if (doc.id === 'BID_SECURING_DECLARATION' || doc.id === 'OMNIBUS_SWORN_STATEMENT') {
      return { isReady: true };
    }

    return { isReady: false };
  };

  // Master Document Checklist Rank Matcher (Strictly 1-17 Order for Envelope 1, followed by 18-24 for Envelope 2)
  const getDocumentChecklistRank = (doc: PackageItem): number => {
    const name = (doc.documentName || '').toLowerCase();
    
    // Check defined statutory list
    const def = statutoryDocsList.find(
      d => d.name.toLowerCase() === name || name.includes(d.name.toLowerCase()) || d.name.toLowerCase().includes(name)
    );
    if (def) {
      const STATUTORY_ORDER_RANK: Record<string, number> = {
        'PHILGEPS_PLATINUM': 1,
        'ONGOING_CONTRACTS': 2,
        'SLCC_STATEMENT': 3,
        'BID_SECURING_DECLARATION': 4,
        'SECTION_VI_REQUIREMENTS': 5,
        'TECH_SPECS_SECTION_VII': 6,
        'DELIVERY_SCHEDULE': 7,
        'ORGANIZATIONAL_CHART': 8,
        'KEY_PERSONNEL': 9,
        'MAJOR_EQUIPMENT': 10,
        'AFTERSALES_WARRANTY': 11,
        'OMNIBUS_SWORN_STATEMENT': 12,
        'NFCC_COMPUTATION': 13,
        'AUDITED_FS': 14,
        'MAYORS_PERMIT': 15,
        'PCAB_LICENSE': 16,
        'SEC_DTI_REG': 17,
        'TAX_CLEARANCE': 18,
        'SECRETARY_CERTIFICATE': 19,
        'JOINT_VENTURE_AGREEMENT': 20,
        'FINANCIAL_BID_FORM_GOODS': 21,
        'FINANCIAL_BID_FORM_INFRA': 22,
        'PRICE_SCHEDULE_GOODS': 23,
        'BILL_OF_QUANTITIES': 24,
        'DETAILED_ESTIMATES_FORM_L': 25,
        'SUMMARY_BID_PRICES': 26,
        'CASH_FLOW_BY_QUARTER': 27,
      };
      if (STATUTORY_ORDER_RANK[def.id]) {
        return STATUTORY_ORDER_RANK[def.id];
      }
    }

    // 1. PhilGEPS Platinum Certificate of Registration
    if (name.includes('philgeps')) return 1;
    // 2. Statement of All Ongoing Contracts
    if (name.includes('ongoing')) return 2;
    // 3. Statement of Single Largest Completed Contract (SLCC)
    if (name.includes('slcc') || name.includes('single largest')) return 3;
    // 4. Bid Security / BSD / Surety Bond
    if (name.includes('bid secur') || name.includes('bsd') || name.includes('surety bond') || name.includes('bid security')) return 4;
    // 5. Section 6: Schedule of Requirements
    if (name.includes('section vi') || name.includes('section 6') || name.includes('schedule of requirements') || name.includes('schedule of req')) return 5;
    // 6. Section 7: Technical Specifications Statement of Compliance
    if (name.includes('section vii') || name.includes('section 7') || name.includes('technical specification') || name.includes('statement of compliance')) return 6;
    // 7. Delivery Schedule / Framework Agreement List
    if (name.includes('delivery schedule') || name.includes('framework agreement') || name.includes('delivery timeline') || name.includes('fal')) return 7;
    // 8. Organizational Chart / Key Personnel / Manpower / Major Equipment
    if (name.includes('organizational chart') || name.includes('org chart')) return 8;
    if (name.includes('key personnel') || name.includes('manpower') || name.includes('bio-data') || name.includes('prc')) return 9;
    if (name.includes('major equipment') || name.includes('equipment utilization') || name.includes('equipment matrix')) return 10;
    // 9. After Sales Services & Warranty
    if (name.includes('after-sale') || name.includes('aftersale') || name.includes('warranty')) return 11;
    // 10. Omnibus Sworn Statement (OSS)
    if (name.includes('omnibus') || name.includes('oss')) return 12;
    // 11. Net Financial Contracting Capacity (NFCC)
    if (name.includes('nfcc') || name.includes('contracting capacity')) return 13;
    // 12. Audited Financial Statements (AFS)
    if (name.includes('audited') || name.includes('afs') || name.includes('financial statement')) return 14;
    // 13. Mayor's / Business Permit
    if (name.includes('mayor') || name.includes('business permit') || name.includes('barangay business')) return 15;
    // 14. PCAB License
    if (name.includes('pcab')) return 16;
    // 15. Securities and Exchange Commission (SEC) / DTI
    if (name.includes('sec ') || name.includes('dti') || name.includes('securities and exchange') || name.includes('certificate of business registration') || name.includes('sec/dti')) return 17;
    // 16. BIR Registration and Tax Clearance
    if (name.includes('tax clearance') || name.includes('bir registration') || name.includes('bir tax') || name.includes('tax')) return 18;
    // 17. Secretary's Certificate / Board Resolution / Special Power of Attorney (SPA)
    if (name.includes('secretary') || name.includes('board resolution') || name.includes('special power of attorney') || name.includes('spa')) return 19;
    if (name.includes('joint venture') || name.includes('jva')) return 20;

    // Envelope 2: Financial Proposal Items
    if (name.includes('bid form') && (name.includes('goods') || name.includes('supply'))) return 21;
    if (name.includes('bid form') && (name.includes('infra') || name.includes('civil works'))) return 22;
    if (name.includes('bid form') || name.includes('financial proposal')) return 21;
    if (name.includes('price schedule')) return 23;
    if (name.includes('bill of quantities') || name.includes('boq')) return 24;
    if (name.includes('detailed estimate') || name.includes('form l') || name.includes('form (l)')) return 25;
    if (name.includes('summary of bid') || name.includes('summary bid')) return 26;
    if (name.includes('cash flow') || name.includes('sf-infr-56')) return 27;

    if (doc.category === 'LEGAL') return 16;
    if (doc.category === 'TECHNICAL') return 8;
    if (doc.category === 'FINANCIAL') return 22;
    return 50;
  };

  // Add selected completed statutory documents to ORIGINAL (Auto-replicated to COPY 1 & COPY 2 in 1-17 checklist sequence)
  const handleAddSelectedCompletedDocs = () => {
    if (selectedDocIdsToAdd.length === 0) return;

    const originalItems = packageItems.filter(item => item.folderCopy === 'ORIGINAL');

    selectedDocIdsToAdd.forEach((docId) => {
      const def = statutoryDocsList.find(d => d.id === docId);
      if (!def) return;

      const readiness = checkDocReadiness(def);
      const isAlreadyInFolder = originalItems.some(
        item => item.envelope === activeEnvelope && 
                item.documentName.toLowerCase() === def.name.toLowerCase()
      );

      if (!isAlreadyInFolder) {
        originalItems.push({
          id: `pkg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          documentName: def.name,
          documentNumber: projectRefNo,
          category: def.category,
          envelope: def.envelope,
          folderCopy: 'ORIGINAL',
          vaultDocId: readiness.vaultId,
          fileSizeBytes: 1048576,
          dateAdded: new Date().toISOString(),
          isAutoDetected: readiness.isReady
        });
      }
    });

    // Automatically organize active envelope items into the 1-17 Statutory Checklist sequence
    const activeEnvelopeSorted = originalItems
      .filter(i => i.envelope === activeEnvelope)
      .sort((a, b) => getDocumentChecklistRank(a) - getDocumentChecklistRank(b));
    
    const otherEnvelopeItems = originalItems.filter(i => i.envelope !== activeEnvelope);

    savePackageItems([...otherEnvelopeItems, ...activeEnvelopeSorted]);
    setSelectedDocIdsToAdd([]);
    setShowAddCompletedModal(false);
    setShowAutoSyncSuccess(true);
    setTimeout(() => setShowAutoSyncSuccess(false), 3500);
  };

  // Quick action: Select all legal documents
  const handleSelectAllLegalDocs = () => {
    const originalItems = packageItems.filter(item => item.folderCopy === 'ORIGINAL');
    const legalIds = statutoryDocsList
      .filter(d => d.category === 'LEGAL' && d.envelope === 'ENVELOPE_1')
      .filter(d => {
        const isAlreadyAdded = originalItems.some(
          item => item.envelope === 'ENVELOPE_1' && 
                  item.documentName.toLowerCase() === d.name.toLowerCase()
        );
        return !isAlreadyAdded;
      })
      .map(d => d.id);

    setSelectedDocIdsToAdd(legalIds);
    setCompletedDocFilter('LEGAL');
  };

  // Quick action: Select all ready documents for current envelope
  const handleSelectAllReadyInEnvelope = () => {
    const originalItems = packageItems.filter(item => item.folderCopy === 'ORIGINAL');
    const readyIds = statutoryDocsList
      .filter(d => d.envelope === activeEnvelope)
      .filter(d => {
        const isAlreadyAdded = originalItems.some(
          item => item.envelope === activeEnvelope && 
                  item.documentName.toLowerCase() === d.name.toLowerCase()
        );
        return !isAlreadyAdded;
      })
      .map(d => d.id);

    setSelectedDocIdsToAdd(readyIds);
  };

  // REPLICATE: Duplicate all documents from ORIGINAL into COPY 1 and COPY 2
  const handleReplicateOriginalToCopies = () => {
    const originalItems = packageItems.filter(item => item.folderCopy === 'ORIGINAL');
    if (originalItems.length === 0) return;

    savePackageItems(originalItems);
    setShowAutoSyncSuccess(true);
    setTimeout(() => setShowAutoSyncSuccess(false), 3500);
  };

  const handleImportFromVault = (vaultDoc: DocumentVaultItem) => {
    const isFinancial = vaultDoc.category === 'FINANCIAL' || 
                        vaultDoc.documentName.toLowerCase().includes('bid form') ||
                        vaultDoc.documentName.toLowerCase().includes('price schedule') ||
                        vaultDoc.documentName.toLowerCase().includes('bill of quantities') ||
                        vaultDoc.documentName.toLowerCase().includes('detailed estimate');

    const env: 'ENVELOPE_1' | 'ENVELOPE_2' = isFinancial ? 'ENVELOPE_2' : 'ENVELOPE_1';
    let cat: 'LEGAL' | 'TECHNICAL' | 'FINANCIAL' = 'LEGAL';
    if (isFinancial) cat = 'FINANCIAL';
    else if (vaultDoc.category === 'TECHNICAL') cat = 'TECHNICAL';

    const newItem: PackageItem = {
      id: `pkg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      documentName: vaultDoc.documentName,
      documentNumber: vaultDoc.documentNumber || projectRefNo,
      category: cat,
      envelope: env,
      folderCopy: 'ORIGINAL',
      vaultDocId: vaultDoc.id,
      fileSizeBytes: vaultDoc.fileSizeBytes || 1048576,
      dateAdded: new Date().toISOString()
    };

    const originalItems = packageItems.filter(item => item.folderCopy === 'ORIGINAL');
    savePackageItems([...originalItems, newItem]);
    setShowVaultImportModal(false);
  };

  const handleAddCustomDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDocName.trim()) return;

    const env: 'ENVELOPE_1' | 'ENVELOPE_2' = customDocCategory === 'FINANCIAL' ? 'ENVELOPE_2' : 'ENVELOPE_1';

    const newItem: PackageItem = {
      id: `pkg-custom-${Date.now()}`,
      documentName: customDocName.trim(),
      documentNumber: projectRefNo,
      category: customDocCategory,
      envelope: env,
      folderCopy: 'ORIGINAL',
      fileSizeBytes: 1048576,
      dateAdded: new Date().toISOString()
    };

    const originalItems = packageItems.filter(item => item.folderCopy === 'ORIGINAL');
    savePackageItems([...originalItems, newItem]);
    setCustomDocName('');
    setShowAddCustomModal(false);
  };

  const handleDeleteItem = (id: string) => {
    const target = packageItems.find(item => item.id === id);
    if (!target) return;

    const originalItems = packageItems.filter(item => item.folderCopy === 'ORIGINAL');
    const updatedOriginal = originalItems.filter(
      item => !(item.id === id || (item.documentName === target.documentName && item.envelope === target.envelope))
    );
    savePackageItems(updatedOriginal);
  };

  // Move single item UP or DOWN in ORIGINAL (Automatically keeps COPY 1 and COPY 2 100% in sync)
  const handleMoveItem = (itemId: string, direction: 'UP' | 'DOWN') => {
    const targetItem = packageItems.find(item => item.id === itemId);
    if (!targetItem) return;

    const originalFolderDocs = packageItems.filter(
      item => item.folderCopy === 'ORIGINAL' && item.envelope === activeEnvelope
    );
    const otherOriginalDocs = packageItems.filter(
      item => item.folderCopy === 'ORIGINAL' && item.envelope !== activeEnvelope
    );

    const index = originalFolderDocs.findIndex(
      item => item.id === itemId || (item.documentName === targetItem.documentName && item.envelope === targetItem.envelope)
    );
    if (index === -1) return;
    if (direction === 'UP' && index === 0) return;
    if (direction === 'DOWN' && index === originalFolderDocs.length - 1) return;

    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    const reordered = [...originalFolderDocs];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    savePackageItems([...otherOriginalDocs, ...reordered]);
  };

  // Instant 1-Click Action: Organize current folder documents according to the 17-item statutory checklist order
  const handleOrganizeDirectlyByChecklist = () => {
    const currentFolderDocs = packageItems.filter(
      item => item.folderCopy === 'ORIGINAL' && item.envelope === activeEnvelope
    );
    const otherOriginalDocs = packageItems.filter(
      item => item.folderCopy === 'ORIGINAL' && item.envelope !== activeEnvelope
    );

    if (currentFolderDocs.length === 0) return;

    const sortedCurrent = [...currentFolderDocs].sort(
      (a, b) => getDocumentChecklistRank(a) - getDocumentChecklistRank(b)
    );

    savePackageItems([...otherOriginalDocs, ...sortedCurrent]);
    setShowAutoSyncSuccess(true);
    setTimeout(() => setShowAutoSyncSuccess(false), 3500);
  };

  // Open Reorganize Modal for active envelope
  const handleOpenReorderModal = () => {
    const currentFolderDocs = packageItems.filter(
      item => item.folderCopy === 'ORIGINAL' && item.envelope === activeEnvelope
    );
    setReorderList(currentFolderDocs);
    setShowReorderModal(true);
  };

  // Save the reordered sequence from modal (Syncs across ORIGINAL, COPY 1, and COPY 2)
  const handleSaveReorder = (newList: PackageItem[]) => {
    const otherOriginalDocs = packageItems.filter(
      item => item.folderCopy === 'ORIGINAL' && item.envelope !== activeEnvelope
    );
    const normalizedNewList: PackageItem[] = newList.map(item => ({
      ...item,
      folderCopy: 'ORIGINAL'
    }));
    savePackageItems([...otherOriginalDocs, ...normalizedNewList]);
    setShowReorderModal(false);
  };

  // Auto-sort by Philippine Statutory Checklist Order (1–17 sequence)
  const handleAutoSortStatutory = () => {
    const sorted = [...reorderList].sort(
      (a, b) => getDocumentChecklistRank(a) - getDocumentChecklistRank(b)
    );
    setReorderList(sorted);
  };

  // Sort Alphabetically A-Z
  const handleAutoSortAlphabetical = () => {
    const sorted = [...reorderList].sort((a, b) => a.documentName.localeCompare(b.documentName));
    setReorderList(sorted);
  };

  // Filter docs strictly for current Envelope AND current Folder Copy
  const currentFolderItems = packageItems.filter(
    item => item.envelope === activeEnvelope && item.folderCopy === activeFolderCopy
  );

  const filteredItems = currentFolderItems.filter(item => {
    if (!searchQuery) return true;
    return item.documentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           item.category.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const originalCount = packageItems.filter(i => i.envelope === activeEnvelope && i.folderCopy === 'ORIGINAL').length;

  const folderConfigs: { id: FolderCopyType; label: string; subLabel: string; badge: string }[] = [
    {
      id: 'ORIGINAL',
      label: 'ORIGINAL',
      subLabel: 'Original Official Submission Copy',
      badge: 'Main Copy'
    },
    {
      id: 'COPY_1',
      label: 'COPY 1',
      subLabel: 'First Certified True Copy',
      badge: 'Duplicate'
    },
    {
      id: 'COPY_2',
      label: 'COPY 2',
      subLabel: 'Second Certified True Copy',
      badge: 'Triplicate'
    }
  ];

  // Comprehensive Resolver for Attached Document Streams (Section VII, Section VI, BSD, OSS, Vault & Templates)
  const resolveAttachmentForDoc = async (doc: PackageItem): Promise<string | null> => {
    const dName = (doc.documentName || '').toLowerCase();
    
    // 1. Direct Vault Item match by ID
    if (doc.vaultDocId) {
      const linked = vaultDocs.find(v => v.id === doc.vaultDocId);
      if (linked?.fileDataUrl) return linked.fileDataUrl;
      try {
        const data = await loadPdfData(doc.vaultDocId);
        if (data) return data;
      } catch (_) {}
    }

    // 2. Direct match by doc.id
    if (doc.id) {
      try {
        const data = await loadPdfData(doc.id);
        if (data) return data;
      } catch (_) {}
    }

    // 3. Vault Item match by Name
    const matchedVault = vaultDocs.find(v => {
      const vName = (v.documentName || '').toLowerCase();
      return vName === dName || vName.includes(dName) || dName.includes(vName);
    });
    if (matchedVault?.fileDataUrl) return matchedVault.fileDataUrl;
    if (matchedVault?.id) {
      try {
        const data = await loadPdfData(matchedVault.id);
        if (data) return data;
      } catch (_) {}
    }

    // 4. Check completed notarized & statutory forms in localStorage
    try {
      const raw = localStorage.getItem(`bidocs_completed_notarized_${tenantId || 'default'}`);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const found = parsed.find(f => {
            const fTitle = (f.title || '').toLowerCase();
            const fCode = (f.formCode || '').toUpperCase();
            if (f.id === doc.vaultDocId || f.id === doc.id) return true;
            if (fTitle === dName || fTitle.includes(dName) || dName.includes(fTitle)) return true;

            if ((dName.includes('section vii') || dName.includes('technical specifications') || dName.includes('tech spec')) &&
                (fCode === 'SEC-VII' || fTitle.includes('section vii') || fTitle.includes('technical specifications'))) {
              return true;
            }
            if ((dName.includes('section vi') || dName.includes('schedule of requirements')) &&
                (fCode === 'SEC-VI' || fTitle.includes('section vi') || fTitle.includes('schedule of requirements'))) {
              return true;
            }
            if ((dName.includes('omnibus') || dName.includes('oss')) && (fCode === 'GPPB-OSS-2025' || fTitle.includes('omnibus'))) return true;
            if ((dName.includes('bid securing') || dName.includes('bsd')) && (fCode === 'GPPB-BSD-2025' || fTitle.includes('bid securing'))) return true;
            if (dName.includes('slcc') && (fCode.includes('SLCC') || fTitle.includes('slcc'))) return true;
            if (dName.includes('ongoing') && (fCode.includes('ONGOING') || fTitle.includes('ongoing'))) return true;
            if (dName.includes('nfcc') && (fCode.includes('NFCC') || fTitle.includes('nfcc'))) return true;
            if (dName.includes('framework') && (fCode.includes('FAL') || fTitle.includes('framework'))) return true;
            return false;
          });

          if (found) {
            if (found.fileDataUrl) return found.fileDataUrl;
            if (found.id) {
              const data = await loadPdfData(found.id);
              if (data) return data;
            }
          }
        }
      }
    } catch (_) {}

    // 5. Check project-scoped indexedDB keys
    const candidateKeys = [
      `tech_specs_${tenantId}_${projectScopeKey}`,
      `tech_specs_${tenantId}_${projectRefNo}`,
      `sec_vi_${tenantId}_${projectScopeKey}`,
      `fal_${tenantId}_${projectScopeKey}`,
      `nfcc_${tenantId}_${projectScopeKey}`,
      `slcc_${tenantId}_${projectScopeKey}`,
      `ongoing_${tenantId}_${projectScopeKey}`,
      `bsd_${tenantId}_${projectScopeKey}`,
      `oss_${tenantId}_${projectScopeKey}`,
      `priceschedule_${tenantId}_${projectScopeKey}`,
      `pricesched_${tenantId}_${projectScopeKey}`,
      `priceschedule_${tenantId}_${projectRefNo}`,
      `bidform_${tenantId}_${projectScopeKey}`,
      `boq_${tenantId}_${projectScopeKey}`,
      `boq_${tenantId}_${projectRefNo}`,
      `estimates_${tenantId}_${projectScopeKey}`,
      `cashflow_${tenantId}_${projectScopeKey}`,
      `summarybid_${tenantId}_${projectScopeKey}`
    ];

    for (const k of candidateKeys) {
      try {
        const data = await loadPdfData(k);
        if (data) return data;
      } catch (_) {}
    }

    return null;
  };

  // ─── ONE-CLICK MERGE ALL DOCUMENTS WITH "PAGE X OF Y" PAGINATION ───
  const handleMergeAllDocuments = async (scope: 'CURRENT_FOLDER' | 'ALL_ENVELOPES' = 'CURRENT_FOLDER') => {
    const docsToMerge = scope === 'ALL_ENVELOPES'
      ? packageItems.filter(item => item.folderCopy === activeFolderCopy)
      : currentFolderItems;

    if (docsToMerge.length === 0) {
      alert(`No documents found in this ${activeFolderCopy} folder to merge.`);
      return;
    }

    setIsMergingAll(true);
    setMergeStatusText(`Preparing ${docsToMerge.length} documents for ${activeFolderCopy}...`);

    try {
      const units: ExportDocumentUnit[] = [];

      for (let i = 0; i < docsToMerge.length; i++) {
        const doc = docsToMerge[i];
        setMergeStatusText(`Processing [${i + 1}/${docsToMerge.length}]: ${doc.documentName}...`);

        // 1. Locate attached vault / template file with universal resolver
        const fileDataUrl = await resolveAttachmentForDoc(doc);

        // 2. Cover Page element from pre-rendered offscreen container
        const coverElem = document.getElementById(`cover-page-render-${doc.id}`) as HTMLElement | null;

        units.push({
          title: doc.documentName,
          coverElement: coverElem || null,
          fileDataUrl: fileDataUrl || null,
          documentName: doc.documentName
        });
      }

      setMergeStatusText(`Compiling & stamping "Page X of Y" pagination on ${units.length} documents...`);

      const cleanRef = (activeProject?.refNo || projectRefNo || 'PRJ-2026').replace(/[^a-zA-Z0-9]/g, '_');
      const envTag = activeEnvelope === 'ENVELOPE_1' ? 'TECHNICAL_LEGAL' : 'FINANCIAL';
      const fileName = `${cleanRef}_${activeFolderCopy}_${envTag}_COMPLETE_BID_PACKAGE.pdf`;

      await exportMergedThreeLayerPdf(units, fileName);
      setMergeStatusText('Merged Package Successfully Downloaded!');
      setTimeout(() => {
        setIsMergingAll(false);
        setMergeStatusText('');
      }, 2500);
    } catch (err) {
      console.error('Failed to merge all documents:', err);
      alert('An error occurred while compiling the merged package. Please try again.');
      setIsMergingAll(false);
      setMergeStatusText('');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left min-h-[60vh] p-2 sm:p-4 md:p-6">
      
      {/* 1. Target Bidding Project Identifier Container + Header Controls */}
      <div className="w-full bg-[#080d1a]/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full">
          
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <Briefcase className="w-4 h-4 text-blue-400" />
              <span className="text-xs sm:text-sm font-bold text-slate-200 whitespace-nowrap">
                Target Bidding Project:
              </span>
            </div>

            {/* Project Selector Dropdown Pill */}
            <div className="relative flex-1 min-w-0">
              {oppProjects.length > 0 ? (
                <div className="relative w-full">
                  <select
                    value={selectedOppId}
                    onChange={(e) => setSelectedOppId(e.target.value)}
                    className="w-full appearance-none bg-[#040814] hover:bg-[#060c1d] border border-blue-600/70 hover:border-blue-500 focus:border-blue-400 rounded-full px-5 py-2.5 pr-10 text-xs sm:text-sm font-extrabold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 shadow-inner cursor-pointer truncate transition-all"
                  >
                    {oppProjects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-950 text-white font-medium py-1.5">
                        {p.refNo} — {p.title}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-blue-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              ) : (
                <div className="w-full bg-[#040814] border border-slate-800 rounded-full px-5 py-2.5 text-xs text-slate-500 font-mono italic">
                  No Opportunity Projects Found
                </div>
              )}
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {/* Add Completed Documents to Current Folder Button */}
            <button
              onClick={() => {
                setSelectedDocIdsToAdd([]);
                setShowAddCompletedModal(true);
              }}
              className="px-4 py-2.5 rounded-full text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-950/40 transition flex items-center gap-2 cursor-pointer"
              title={`Add completed legal, technical, or financial documents to the ${activeFolderCopy} folder`}
            >
              <ListPlus className="w-4 h-4 text-blue-200" />
              <span>+ Add Completed Documents ({activeFolderCopy})</span>
            </button>

            {/* Mother Cover Labeling Page */}
            <button
              onClick={() => setShowMotherCoverModal(true)}
              className="px-4 py-2.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-950/30 transition flex items-center gap-2 cursor-pointer"
              title="Print Mother Envelope / Outer Box Label Cover Page"
            >
              <Box className="w-4 h-4" />
              <span>Mother Cover Labeling Page</span>
            </button>
          </div>

        </div>

        {/* Sync Success Feedback Notification */}
        {showAutoSyncSuccess && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Folder documents successfully updated for {activeFolderCopy}!</span>
          </div>
        )}
      </div>

      {/* 2. Envelope 1 & Envelope 2 Tabs Container */}
      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Envelope 1 Tab Card */}
          <button
            type="button"
            onClick={() => setActiveEnvelope('ENVELOPE_1')}
            className={`group relative p-5 rounded-2xl border text-left transition-all duration-300 cursor-pointer overflow-hidden ${
              activeEnvelope === 'ENVELOPE_1'
                ? 'bg-gradient-to-br from-[#0c1938] to-[#081026] border-blue-500 shadow-xl shadow-blue-950/40 ring-1 ring-blue-500/60'
                : 'bg-[#080d1a]/80 border-slate-800/90 hover:border-slate-700 hover:bg-[#0c1426]/60'
            }`}
          >
            {activeEnvelope === 'ENVELOPE_1' && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-indigo-500" />
            )}

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl border transition-colors ${
                  activeEnvelope === 'ENVELOPE_1'
                    ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-inner'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 group-hover:text-slate-300'
                }`}>
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={`text-base font-extrabold transition-colors ${
                    activeEnvelope === 'ENVELOPE_1' ? 'text-white' : 'text-slate-300 group-hover:text-white'
                  }`}>
                    Envelope 1
                  </h3>
                  <p className="text-xs font-semibold text-blue-400">
                    Technical & Eligibility Component
                  </p>
                </div>
              </div>

              <span className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold border transition-colors ${
                activeEnvelope === 'ENVELOPE_1'
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}>
                {packageItems.filter(i => i.envelope === 'ENVELOPE_1' && i.folderCopy === activeFolderCopy).length} Docs ({activeFolderCopy})
              </span>
            </div>

            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              Legal Class A/B Documents, PhilGEPS Platinum, SLCC, Ongoing Contracts, NFCC, Bid Securing Declaration, Section VI, Section VII, OSS & Technical Exhibits.
            </p>
          </button>

          {/* Envelope 2 Tab Card */}
          <button
            type="button"
            onClick={() => setActiveEnvelope('ENVELOPE_2')}
            className={`group relative p-5 rounded-2xl border text-left transition-all duration-300 cursor-pointer overflow-hidden ${
              activeEnvelope === 'ENVELOPE_2'
                ? 'bg-gradient-to-br from-[#0c2e22] to-[#081f18] border-emerald-500 shadow-xl shadow-emerald-950/40 ring-1 ring-emerald-500/60'
                : 'bg-[#080d1a]/80 border-slate-800/90 hover:border-slate-700 hover:bg-[#0c1426]/60'
            }`}
          >
            {activeEnvelope === 'ENVELOPE_2' && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-500" />
            )}

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl border transition-colors ${
                  activeEnvelope === 'ENVELOPE_2'
                    ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 shadow-inner'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 group-hover:text-slate-300'
                }`}>
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={`text-base font-extrabold transition-colors ${
                    activeEnvelope === 'ENVELOPE_2' ? 'text-white' : 'text-slate-300 group-hover:text-white'
                  }`}>
                    Envelope 2
                  </h3>
                  <p className="text-xs font-semibold text-emerald-400">
                    Financial Bid Proposal Component
                  </p>
                </div>
              </div>

              <span className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold border transition-colors ${
                activeEnvelope === 'ENVELOPE_2'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}>
                {packageItems.filter(i => i.envelope === 'ENVELOPE_2' && i.folderCopy === activeFolderCopy).length} Docs ({activeFolderCopy})
              </span>
            </div>

            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              Official Financial Bid Form (Goods / Infrastructure / Consulting), Detailed Price Schedules, Form (L) Detailed Estimates, BOQ & Cash Flow by Quarter.
            </p>
          </button>

        </div>
      </div>

      {/* 3. Inside Envelope: 3 Folder Copies (Original, Copy 1, Copy 2) */}
      <div className="w-full bg-[#080d1a]/95 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
        
        {/* Envelope & Folder Navigation Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 flex-wrap">
            <span className="text-slate-400 font-medium">Bid Package</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className={activeEnvelope === 'ENVELOPE_1' ? 'text-blue-400 font-extrabold' : 'text-emerald-400 font-extrabold'}>
              {activeEnvelope === 'ENVELOPE_1' ? 'Envelope 1 (Technical & Legal)' : 'Envelope 2 (Financial Component)'}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-white px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 font-mono text-[11px] font-bold">
              📁 {activeFolderCopy}
            </span>
          </div>

          {/* Action Buttons for Envelope, Folder Cover & Replicate */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Add Completed Documents Button */}
            <button
              onClick={() => {
                setSelectedDocIdsToAdd([]);
                setShowAddCompletedModal(true);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5 cursor-pointer shadow"
              title={`Add completed documents into ${activeFolderCopy} folder`}
            >
              <ListPlus className="w-3.5 h-3.5" />
              <span>Add Documents</span>
            </button>

            {/* Replicate Original to Copy 1 & Copy 2 Button */}
            {originalCount > 0 && (
              <button
                onClick={handleReplicateOriginalToCopies}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/30 hover:bg-indigo-600 hover:text-white text-indigo-300 border border-indigo-500/50 transition flex items-center gap-1.5 cursor-pointer shadow"
                title="Duplicate all documents from Original into Copy 1 and Copy 2 folders"
              >
                <Copy className="w-3.5 h-3.5 text-indigo-400" />
                <span>Replicate Original → Copy 1 & 2</span>
              </button>
            )}

            {/* Envelope Cover Page Button */}
            <button
              onClick={() => setShowEnvelopeCoverModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/20 hover:bg-blue-600 hover:text-white text-blue-300 border border-blue-500/40 transition flex items-center gap-1.5 cursor-pointer shadow"
              title="Print Envelope Outer Cover Page"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Envelope Cover</span>
            </button>

            {/* Folder Cover Page Button */}
            <button
              onClick={() => setShowFolderCoverModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600 hover:text-white text-emerald-300 border border-emerald-500/40 transition flex items-center gap-1.5 cursor-pointer shadow"
              title="Print Folder Cover Page for this copy"
            >
              <Folder className="w-3.5 h-3.5 text-emerald-400" />
              <span>Folder Cover ({activeFolderCopy})</span>
            </button>

            {/* Merged Bid Packages Folder (Preview & Download Original, Copy 1, Copy 2) */}
            <button
              onClick={() => setShowMergedPackageViewerModal(true)}
              disabled={currentFolderItems.length === 0}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition flex items-center gap-1.5 shadow-lg shadow-purple-950/40 cursor-pointer disabled:opacity-50 border border-purple-400/40"
              title="Open Merged Bid Packages Folder to view and download ORIGINAL, COPY 1, and COPY 2 PDFs"
            >
              <FileStack className="w-3.5 h-3.5 text-purple-200" />
              <span>Merged Packages Folder ({activeFolderCopy})</span>
            </button>

            {/* Organize & Merge */}
            <button
              onClick={() => setShowOrganizeModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 shadow cursor-pointer"
              title="Organize, inspect and preview package bundles"
            >
              <Layers className="w-3.5 h-3.5 text-purple-300" />
              <span>Organizer ({activeFolderCopy})</span>
            </button>
          </div>
        </div>

        {/* 3 Folders Tabs: Original, Copy 1, Copy 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {folderConfigs.map((folder) => {
            const isSelected = activeFolderCopy === folder.id;
            const folderItemCount = packageItems.filter(i => i.envelope === activeEnvelope && i.folderCopy === folder.id).length;

            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => setActiveFolderCopy(folder.id)}
                className={`group relative p-4 sm:p-5 rounded-xl border text-left transition-all duration-200 cursor-pointer overflow-hidden ${
                  isSelected
                    ? activeEnvelope === 'ENVELOPE_1'
                      ? 'bg-gradient-to-b from-[#0f1f45] to-[#0a1329] border-blue-500/90 shadow-lg shadow-blue-950/50 ring-1 ring-blue-500'
                      : 'bg-gradient-to-b from-[#0f382a] to-[#0a2118] border-emerald-500/90 shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-500'
                    : 'bg-[#050b17] border-slate-800 hover:border-slate-700 hover:bg-[#071024]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    {isSelected ? (
                      <FolderOpen className={`w-6 h-6 transition-colors ${
                        activeEnvelope === 'ENVELOPE_1' ? 'text-blue-400' : 'text-emerald-400'
                      }`} />
                    ) : (
                      <Folder className="w-6 h-6 text-slate-500 group-hover:text-slate-400 transition-colors" />
                    )}
                    <div>
                      <h4 className={`text-sm font-black tracking-wide ${
                        isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'
                      }`}>
                        {folder.label}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {folder.subLabel}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    isSelected
                      ? activeEnvelope === 'ENVELOPE_1'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}>
                    {folder.badge}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-mono">
                    {folderItemCount} {folderItemCount === 1 ? 'Document' : 'Documents'}
                  </span>
                  <span className={`font-semibold ${isSelected ? (activeEnvelope === 'ENVELOPE_1' ? 'text-blue-400' : 'text-emerald-400') : 'text-slate-500'}`}>
                    {isSelected ? '● Inside Folder' : 'Open Folder →'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* 4. Inside Folder Documents List & Actions Bar */}
        <div className="space-y-4 pt-2">
          
          {/* Header Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#050b17] border border-slate-800 rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-white">
                {activeEnvelope === 'ENVELOPE_1' ? 'Envelope 1 (Legal & Technical)' : 'Envelope 2 (Financial)'} — {activeFolderCopy}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                {filteredItems.length} {filteredItems.length === 1 ? 'Item' : 'Items'}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Primary Add Completed Docs Button */}
              <button
                onClick={() => {
                  setSelectedDocIdsToAdd([]);
                  setShowAddCompletedModal(true);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5 shadow cursor-pointer"
                title="Select completed documents from checklist"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Completed Docs</span>
              </button>

              <button
                onClick={() => setShowVaultImportModal(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 shadow cursor-pointer"
                title="Import from Document Vault"
              >
                <FolderPlus className="w-3.5 h-3.5 text-blue-400" />
                <span>From Vault</span>
              </button>

              <button
                onClick={() => {
                  setCustomDocCategory(activeEnvelope === 'ENVELOPE_1' ? 'LEGAL' : 'FINANCIAL');
                  setShowAddCustomModal(true);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/30 hover:bg-emerald-600 hover:text-white text-emerald-300 border border-emerald-500/40 transition flex items-center gap-1.5 shadow cursor-pointer"
                title="Add custom document"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Custom Doc</span>
              </button>

              {/* 1-Click Instant Organize by Checklist */}
              <button
                onClick={handleOrganizeDirectlyByChecklist}
                disabled={filteredItems.length <= 1}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 shadow cursor-pointer"
                title="Automatically organize all documents in this folder according to the standard 17-item Philippine Statutory Checklist"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Organize by Checklist</span>
              </button>

              {/* Reorganize & Reorder Sequence Button */}
              <button
                onClick={handleOpenReorderModal}
                disabled={filteredItems.length <= 1}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/30 hover:bg-indigo-600 hover:text-white text-indigo-300 border border-indigo-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 shadow cursor-pointer"
                title="Reorganize and reorder documents in this folder"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                <span>Reorganize Sequence</span>
              </button>

              {/* Preview & Merge Folder Button */}
              <button
                onClick={() => setShowMergedPackageViewerModal(true)}
                disabled={filteredItems.length === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title={`Preview and download merged ORIGINAL, COPY 1, and COPY 2 files (${filteredItems.length} docs)`}
              >
                <Eye className="w-3.5 h-3.5 text-purple-200" />
                <span>Preview & Merge ({filteredItems.length})</span>
              </button>

              {/* Search Filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter..."
                  className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 w-36"
                />
              </div>
            </div>
          </div>

          {/* Documents Grid List */}
          <div className="space-y-3">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 bg-[#050b17] space-y-2">
                <p className="text-xs font-bold text-slate-400">No documents added to this {activeFolderCopy} folder yet.</p>
                <p className="text-[11px] text-slate-600">
                  Click <strong className="text-blue-400 cursor-pointer" onClick={() => setShowAddCompletedModal(true)}>+ Add Completed Docs</strong> to select and attach your completed legal, technical, and financial documents.
                </p>
              </div>
            ) : (
              filteredItems.map((doc, idx) => {
                const linkedVaultDoc = vaultDocs.find(v => v.id === doc.vaultDocId);

                return (
                  <div
                    key={doc.id}
                    className="p-4 rounded-xl bg-[#050c1f]/80 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    {/* Left: Document Info & Sequence Controls */}
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                      
                      {/* Reorder Up / Down Direct Quick Controls */}
                      <div className="flex flex-col items-center justify-center bg-slate-950/80 p-1 rounded-lg border border-slate-800 shrink-0">
                        <button
                          onClick={() => handleMoveItem(doc.id, 'UP')}
                          disabled={idx === 0}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:cursor-not-allowed transition"
                          title="Move Document Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-mono font-black text-blue-400 px-1">
                          {idx + 1}
                        </span>
                        <button
                          onClick={() => handleMoveItem(doc.id, 'DOWN')}
                          disabled={idx === filteredItems.length - 1}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:cursor-not-allowed transition"
                          title="Move Document Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 font-bold border border-slate-800">
                            Sequence #{idx + 1}
                          </span>
                          <span className={`px-2 py-0.5 rounded font-bold border ${
                            doc.category === 'LEGAL'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : doc.category === 'TECHNICAL'
                                ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          }`}>
                            {doc.category}
                          </span>
                          <span className="text-slate-400 font-bold">
                            {doc.folderCopy}
                          </span>
                          {doc.isAutoDetected && (
                            <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-sans text-[10px]">
                              Verified Project Document
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                          {doc.documentName}
                        </h4>

                        <div className="flex items-center gap-4 text-[11px] text-slate-400">
                          {projectRefNo && (
                            <span>
                              Target Ref: <strong className="text-slate-200 font-mono">{projectRefNo}</strong>
                            </span>
                          )}
                          {doc.dateAdded && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <Clock className="w-3 h-3" />
                              {new Date(doc.dateAdded).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions (Document Cover Page, Preview, Delete) */}
                    <div className="flex items-center gap-2 shrink-0">
                      
                      {/* Document Cover Page Action */}
                      <button
                        onClick={() => setSelectedDocForCover(doc)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/30 transition flex items-center gap-1.5 cursor-pointer"
                        title="View / Print Document Cover Page for this item"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        <span>Doc Cover</span>
                      </button>

                      {/* Preview PDF */}
                      <button
                        onClick={async () => {
                          // 1. Direct ID lookup
                          let targetVaultDoc = vaultDocs.find(v => v.id === doc.vaultDocId);

                          // 2. Match through statutory checklist definition
                          if (!targetVaultDoc) {
                            const def = statutoryDocsList.find(
                              d => d.name.toLowerCase() === doc.documentName.toLowerCase() || 
                                   d.name.toLowerCase().includes(doc.documentName.toLowerCase()) || 
                                   doc.documentName.toLowerCase().includes(d.name.toLowerCase())
                            );
                            if (def) {
                              const readiness = checkDocReadiness(def);
                              if (readiness.vaultId) {
                                targetVaultDoc = vaultDocs.find(v => v.id === readiness.vaultId);
                              }
                            }
                          }

                          // 3. Smart Keyword Fallback Lookup
                          if (!targetVaultDoc) {
                            const dName = doc.documentName.toLowerCase();
                            targetVaultDoc = vaultDocs.find(v => {
                              const vName = (v.documentName || '').toLowerCase();
                              const vCode = (v.documentCode || '').toUpperCase();
                              if (dName.includes('philgeps') && (vCode === 'DOC-1' || vName.includes('philgeps'))) return true;
                              if ((dName.includes('dti') || dName.includes('sec')) && (vCode === 'DOC-2' || vName.includes('dti') || vName.includes('sec') || vName.includes('registration'))) return true;
                              if (dName.includes('mayor') && (vCode === 'DOC-3' || vCode === 'DOC-4' || vName.includes('mayor') || vName.includes('permit'))) return true;
                              if (dName.includes('tax') && (vCode === 'DOC-7' || vCode === 'DOC-6' || vName.includes('tax') || vName.includes('clearance'))) return true;
                              if ((dName.includes('financial') || dName.includes('afs') || dName.includes('audited')) && (vCode === 'DOC-15' || vName.includes('afs') || vName.includes('financial') || vName.includes('audited'))) return true;
                              if (dName.includes('pcab') && (vCode === 'DOC-8' || vName.includes('pcab'))) return true;
                              if (dName.includes('secretary') && (vCode === 'DOC-13' || vName.includes('secretary') || vName.includes('board') || vName.includes('attorney'))) return true;
                              if ((dName.includes('joint venture') || dName.includes('jva')) && (vCode === 'DOC-14' || vName.includes('joint') || vName.includes('jva'))) return true;
                              return vName.includes(dName) || dName.includes(vName);
                            });
                          }

                          if (targetVaultDoc) {
                            // Ensure PDF binary data is in cache
                            if (!pdfDataCache.current[targetVaultDoc.id] && !targetVaultDoc.fileDataUrl) {
                              try {
                                const dbData = await loadPdfData(targetVaultDoc.id);
                                if (dbData) {
                                  pdfDataCache.current[targetVaultDoc.id] = dbData;
                                  targetVaultDoc = { ...targetVaultDoc, fileDataUrl: dbData };
                                }
                              } catch (_) {}
                            }
                            setPreviewDocItem(targetVaultDoc);
                          } else {
                            setPreviewDocItem({
                              id: doc.id,
                              tenantId,
                              documentName: doc.documentName,
                              documentNumber: doc.documentNumber || projectRefNo,
                              category: doc.category === 'FINANCIAL' ? 'FINANCIAL' : 'TECHNICAL',
                              procurementApplicability: [(projectCategory as any) || 'Infrastructure'],
                              legalBasisReference: 'RA 12009 NGPA / RA 9184 Standard',
                              versionNumber: 1,
                              fileHash: '',
                              fileSizeBytes: doc.fileSizeBytes || 1048576,
                              fileName: `${doc.documentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
                              uploadedByName: currentTenant?.authorizedSignatory?.name || 'Authorized Signatory',
                              isOptional: false,
                              requiresIssueDate: false,
                              requiresExpiryDate: false,
                              status: 'ACTIVE',
                              projectTitle: projectTitle,
                              philgepsRefNo: projectRefNo,
                              previousVersions: []
                            });
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white border border-blue-500/40 transition flex items-center gap-1.5 cursor-pointer"
                        title="Preview document PDF"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteItem(doc.id)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/40 transition flex items-center gap-1 cursor-pointer"
                        title="Remove document from folder"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* ADD COMPLETED DOCUMENTS PICKER MODAL (CHECKLIST SELECTOR)                 */}
      {/* ========================================================================= */}
      {showAddCompletedModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-10">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ListPlus className="w-4 h-4 text-blue-400" />
                  <span>Add Completed Documents to {activeFolderCopy} Folder</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select documents created or configured for <strong className="text-slate-200 font-mono">{projectRefNo || 'this project'}</strong>.
                </p>
              </div>
              <button onClick={() => setShowAddCompletedModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Filter & Select All Bar */}
            <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap text-xs">
              <div className="flex items-center gap-2">
                {activeEnvelope === 'ENVELOPE_1' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setCompletedDocFilter('ALL')}
                      className={`px-3 py-1 rounded-lg font-bold transition ${
                        completedDocFilter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      All (Envelope 1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompletedDocFilter('LEGAL')}
                      className={`px-3 py-1 rounded-lg font-bold transition ${
                        completedDocFilter === 'LEGAL' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Legal Documents Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompletedDocFilter('TECHNICAL')}
                      className={`px-3 py-1 rounded-lg font-bold transition ${
                        completedDocFilter === 'TECHNICAL' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Technical Documents Only
                    </button>
                  </>
                ) : (
                  <span className="font-bold text-emerald-400">
                    Envelope 2: Financial Proposal Documents
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleSelectAllReadyInEnvelope}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Select All in {activeEnvelope === 'ENVELOPE_1' ? 'Envelope 1' : 'Envelope 2'}</span>
                </button>
              </div>
            </div>

            {/* Documents List */}
            <div className="p-5 overflow-y-auto space-y-2.5 flex-1 bg-slate-950">
              {statutoryDocsList
                .filter(doc => doc.envelope === activeEnvelope)
                .filter(doc => completedDocFilter === 'ALL' || doc.category === completedDocFilter)
                .map((doc) => {
                  const readiness = checkDocReadiness(doc);
                  const isAlreadyInFolder = currentFolderItems.some(
                    item => item.documentName.toLowerCase() === doc.name.toLowerCase()
                  );
                  const isSelected = selectedDocIdsToAdd.includes(doc.id);

                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        if (isAlreadyInFolder) return;
                        if (isSelected) {
                          setSelectedDocIdsToAdd(selectedDocIdsToAdd.filter(id => id !== doc.id));
                        } else {
                          setSelectedDocIdsToAdd([...selectedDocIdsToAdd, doc.id]);
                        }
                      }}
                      className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                        isAlreadyInFolder
                          ? 'bg-slate-900/40 border-slate-800/60 opacity-60 cursor-not-allowed'
                          : isSelected
                            ? 'bg-blue-600/15 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isAlreadyInFolder ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        ) : isSelected ? (
                          <CheckSquare className="w-5 h-5 text-blue-400 shrink-0" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-600 shrink-0" />
                        )}

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
                            <span className={`px-2 py-0.5 rounded font-bold border ${
                              doc.category === 'LEGAL'
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : doc.category === 'TECHNICAL'
                                  ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            }`}>
                              {doc.category}
                            </span>
                            <span className="text-slate-500">{doc.code}</span>
                          </div>
                          <p className="text-xs font-bold text-white truncate">{doc.name}</p>
                        </div>
                      </div>

                      {/* Status Tag */}
                      <div className="shrink-0">
                        {isAlreadyInFolder ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                            Already in {activeFolderCopy}
                          </span>
                        ) : readiness.isReady ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Ready in System</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                            Standard Template
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/95">
              <span className="text-xs text-slate-400 font-mono">
                {selectedDocIdsToAdd.length} document{selectedDocIdsToAdd.length === 1 ? '' : 's'} selected
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCompletedModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddSelectedCompletedDocs}
                  disabled={selectedDocIdsToAdd.length === 0}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition shadow ${
                    selectedDocIdsToAdd.length === 0
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                  }`}
                >
                  Add to {activeFolderCopy} Folder ({selectedDocIdsToAdd.length})
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. MOTHER COVER LABELING PAGE MODAL (OUTER PACKAGING BOX / MOTHER ENVELOPE) */}
      {/* ========================================================================= */}
      {/* 1. MOTHER ENVELOPE / OUTER BOX SUBMISSION COVER MODAL (PORTRAIT LEGAL 8.5x13) */}
      {/* ========================================================================= */}
      {showMotherCoverModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col print:border-none print:shadow-none print:max-h-none print:bg-white">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 print:hidden">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Box className="w-4 h-4 text-amber-400" />
                <span>Mother Envelope Cover Label (Portrait Legal 8.5" × 13")</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Mother Cover</span>
                </button>
                <button onClick={() => setShowMotherCoverModal(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 flex justify-center print:p-0 print:bg-white">
              <div 
                className="max-w-[850px] w-full min-h-[1100px] aspect-[8.5/13] bg-white text-black p-7 sm:p-9 border-4 border-black flex flex-col justify-between font-sans relative overflow-hidden shadow-2xl print:shadow-none print:border-4 print:p-6 print:m-0 print:break-inside-avoid print:page-break-inside-avoid"
                style={{ boxSizing: 'border-box' }}
              >
                
                {/* Inner Elegant Border Frame */}
                <div className="absolute inset-3 border-2 border-black rounded-xl pointer-events-none" />

                {/* TOP SECTION: Header & Addressee */}
                <div className="space-y-3.5 relative z-10">
                  
                  {/* Bidder Identity (Centered at Top) */}
                  <div className="text-center border-b-2 border-black pb-3.5 space-y-1">
                    <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-black leading-tight">
                      {currentTenant?.companyName || 'BIDDING ENTERPRISE CORPORATION'}
                    </h1>
                    <p className="text-xs text-slate-700 font-medium">
                      {currentTenant?.address || 'Metro Manila, Philippines'} • TIN: <span className="font-mono font-bold">{currentTenant?.tin || '000-000-000-000'}</span>
                    </p>
                    <p className="text-[11px] text-slate-600 font-mono">
                      PhilGEPS Platinum Reg. No.: <span className="font-bold text-blue-950">{currentTenant?.philgepsPlatinumNo || 'PLAT-2026-ACTIVE'}</span>
                    </p>
                  </div>

                  {/* Submitted To: Bids and Awards Committee */}
                  <div className="text-center space-y-1 pt-2 pb-1">
                    <p className="text-xs sm:text-sm uppercase font-mono font-black tracking-widest text-slate-600">SUBMITTED TO:</p>
                    <h2 className="text-2xl sm:text-3xl font-black uppercase text-blue-950 tracking-tight leading-tight">
                      THE BIDS AND AWARDS COMMITTEE (BAC)
                    </h2>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide">
                      {procuringEntity}
                    </h3>
                  </div>

                  {/* Project & Solicitation Details Box */}
                  <div className="border-2 border-black p-4 bg-slate-50 rounded-xl space-y-2 text-left">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Project Title / Description</span>
                      <p className="text-sm font-black text-black uppercase leading-tight">
                        {projectTitle || 'INFRASTRUCTURE & IT MODERNIZATION PROJECT'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-300 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">PhilGEPS Ref No.</span>
                        <strong className="text-blue-950 font-black truncate block">{projectRefNo || 'PhilGEPS-2026-001'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Solicitation No.</span>
                        <strong className="text-blue-950 font-black truncate block">{activeProject?.solicitationNo || (activeProject as any)?.solicitationNumber || 'SOL-2026-001'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Approved Budget (ABC)</span>
                        <strong className="text-emerald-800 font-black block">{activeProject?.abc || '₱12,500,000.00'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Large Mother Envelope Identification Banner */}
                  <div className="p-3.5 border-4 border-black bg-black text-white text-center rounded-xl space-y-0.5 shadow-md">
                    <div className="font-mono font-black text-base sm:text-lg uppercase tracking-widest text-amber-300">
                      MOTHER ENVELOPE: OFFICIAL BID PROPOSAL
                    </div>
                    <div className="text-[10px] font-sans font-semibold text-slate-200 uppercase tracking-wide">
                      CONTAINS: ENVELOPE 1 (LEGAL & TECHNICAL) & ENVELOPE 2 (FINANCIAL BID PROPOSAL)
                    </div>
                  </div>

                  {/* Envelope Packaging Breakdown (2-Column Grid) */}
                  <div className="grid grid-cols-2 gap-3 text-left font-sans text-xs">
                    <div className="p-3 border-2 border-blue-950 bg-blue-50/80 rounded-xl space-y-1">
                      <p className="font-black text-blue-950 uppercase border-b border-blue-900 pb-1 text-[11px] flex items-center justify-between">
                        <span>📦 ENVELOPE 1: LEGAL & TECHNICAL</span>
                      </p>
                      <ul className="text-[11px] text-slate-800 space-y-0.5 pt-0.5 font-medium">
                        <li>• Original Technical & Legal Copy</li>
                        <li>• Copy 1 (Duplicate)</li>
                        <li>• Copy 2 (Triplicate)</li>
                      </ul>
                    </div>

                    <div className="p-3 border-2 border-emerald-950 bg-emerald-50/80 rounded-xl space-y-1">
                      <p className="font-black text-emerald-950 uppercase border-b border-emerald-900 pb-1 text-[11px] flex items-center justify-between">
                        <span>💰 ENVELOPE 2: FINANCIAL PROPOSAL</span>
                      </p>
                      <ul className="text-[11px] text-slate-800 space-y-0.5 pt-0.5 font-medium">
                        <li>• Original Financial Copy</li>
                        <li>• Copy 1 (Duplicate)</li>
                        <li>• Copy 2 (Triplicate)</li>
                      </ul>
                    </div>
                  </div>

                  {/* BIGGER AND BOLD WARNING BOX WITH RED INK */}
                  <div className="p-4 sm:p-5 border-4 border-red-600 bg-red-50/95 rounded-2xl text-center space-y-1.5 shadow-md">
                    <h3 className="text-lg sm:text-2xl font-black text-red-600 uppercase tracking-wide leading-tight animate-pulse">
                      ⚠️ WARNING: DO NOT OPEN BEFORE SCHEDULED BID OPENING DATE & TIME!
                    </h3>
                    <p className="text-xs sm:text-sm font-black text-red-800 font-mono uppercase">
                      SCHEDULED BID OPENING DEADLINE: <span className="bg-red-600 text-white px-2.5 py-0.5 rounded-md font-black text-xs sm:text-sm">{submissionDeadline}</span>
                    </p>
                    <p className="text-[10px] sm:text-[11px] font-bold text-red-900 uppercase tracking-tight">
                      Official Sealed Bidding Proposal • Shall only be unsealed publicly by the Bids and Awards Committee (BAC) pursuant to Republic Act No. 12009 / RA 9184
                    </p>
                  </div>

                </div>

                {/* FOOTER SECTION: Authorized Signatory & Official Submission QR */}
                <div className="border-t-2 border-black pt-3 flex items-center justify-between relative z-10">
                  <div className="space-y-0.5 text-left">
                    <p className="text-[10px] font-mono font-bold uppercase text-slate-600">Authorized Managing Officer / Bidder Signatory:</p>
                    <p className="text-sm font-black uppercase text-black underline tracking-wide">
                      {currentTenant?.authorizedSignatory?.name || 'AUTHORIZED MANAGING OFFICER'}
                    </p>
                    <p className="text-[11px] text-slate-700 font-medium">
                      {currentTenant?.authorizedSignatory?.title || 'President & Authorized Signatory'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-[10px] font-mono text-slate-600">
                      <div className="font-bold text-black">Official Submission QR</div>
                      <div>{projectRefNo || 'PhilGEPS-2026-001'}</div>
                    </div>
                    <DocumentQrCode
                      details={{
                        documentNumber: projectRefNo || 'PhilGEPS-2026-001',
                        documentName: 'Mother Envelope Outer Packaging Cover',
                        projectName: projectTitle,
                        dateTimeSubmitted: submissionDeadline,
                        companyName: currentTenant?.companyName,
                        solicitationNo: activeProject?.solicitationNo || (activeProject as any)?.solicitationNumber || 'SOL-2026-001'
                      }}
                      size={75}
                      className="border-2 border-black p-1 bg-white shrink-0"
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ENVELOPE COVER PAGE MODAL (ENVELOPE 1 OR ENVELOPE 2 OUTER COVER - LANDSCAPE) */}
      {/* ========================================================================= */}
      {showEnvelopeCoverModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col print:border-none print:shadow-none print:max-h-none print:bg-white">
            <style>{`
              @media print {
                @page {
                  size: 13in 8.5in landscape;
                  margin: 0.25in;
                }
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                header, nav, aside, button, .print\\:hidden, .no-print, .no-export {
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
                  overflow: visible !important;
                  border: none !important;
                  box-shadow: none !important;
                }
                .landscape-envelope-cover {
                  box-shadow: none !important;
                  border: 3px solid #000000 !important;
                  margin: 0 auto !important;
                  padding: 0.35in !important;
                  width: 13in !important;
                  min-height: 8.5in !important;
                  box-sizing: border-box !important;
                  page-break-after: avoid !important;
                }
              }
            `}</style>

            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 print:hidden">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>Envelope Outer Cover Label (Landscape Legal 13" × 8.5") — {activeEnvelope === 'ENVELOPE_1' ? 'Envelope 1 (Technical & Eligibility)' : 'Envelope 2 (Financial Component)'}</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Landscape Cover</span>
                </button>
                <button onClick={() => setShowEnvelopeCoverModal(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 flex justify-center print:p-0 print:bg-white">
              <div className="landscape-envelope-cover w-[13in] max-w-[1200px] min-h-[780px] aspect-[13/8.5] bg-white text-black p-6 sm:p-8 border-4 border-black flex flex-col justify-between font-sans relative shadow-2xl print:shadow-none print:border-4 print:p-6 print:m-0 box-border">
                
                {/* Inner Frame */}
                <div className="absolute inset-2.5 border-2 border-black rounded-xl pointer-events-none" />

                {/* TOP HEADER: Bidder Corporate Info */}
                <div className="text-center border-b-2 border-black pb-2.5 space-y-0.5 relative z-10">
                  <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-black leading-tight">
                    {currentTenant?.companyName || 'BIDDING ENTERPRISE CORPORATION'}
                  </h1>
                  <p className="text-xs text-slate-700 font-medium">
                    {currentTenant?.address || 'Metro Manila, Philippines'} • TIN: <span className="font-mono font-bold">{currentTenant?.tin || '000-000-000-000'}</span> • PhilGEPS Reg. No.: <span className="font-bold text-blue-950">{currentTenant?.philgepsPlatinumNo || 'PLAT-2026-ACTIVE'}</span>
                  </p>
                </div>

                {/* MIDDLE SECTION: 2-Column Grid */}
                <div className="grid grid-cols-12 gap-4 my-2 relative z-10">
                  
                  {/* Left Column (5 cols): Addressee & Envelope Breakdown */}
                  <div className="col-span-5 space-y-3">
                    <div className="p-3 border-2 border-black bg-slate-50 rounded-xl space-y-1 text-left">
                      <p className="text-[10px] uppercase font-mono font-black tracking-widest text-slate-600">SUBMITTED TO:</p>
                      <h2 className="text-lg font-black uppercase text-blue-950 leading-tight">
                        THE BIDS AND AWARDS COMMITTEE (BAC)
                      </h2>
                      <h3 className="text-sm font-black text-slate-900 uppercase">
                        {procuringEntity}
                      </h3>
                    </div>

                    <div className="p-3 border-2 border-slate-900 bg-slate-100 rounded-xl text-left space-y-1 font-sans text-xs">
                      <p className="font-black text-black uppercase border-b border-slate-400 pb-1 text-[11px]">
                        📦 INCLUDED FOLDERS IN THIS ENVELOPE:
                      </p>
                      <ul className="text-[11px] text-slate-800 space-y-0.5 pt-0.5 font-medium">
                        <li>• <strong>Original Copy</strong> ({activeEnvelope === 'ENVELOPE_1' ? 'Technical & Legal' : 'Financial'})</li>
                        <li>• <strong>Copy 1</strong> (First Certified True Duplicate Copy)</li>
                        <li>• <strong>Copy 2</strong> (Second Certified True Triplicate Copy)</li>
                      </ul>
                    </div>
                  </div>

                  {/* Right Column (7 cols): Full Project Details, Envelope Title, and Warning */}
                  <div className="col-span-7 space-y-2.5 text-left">
                    
                    {/* Project Details Box */}
                    <div className="border-2 border-black p-3.5 bg-slate-50 rounded-xl space-y-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Project Title / Description:</span>
                        <p className="text-sm font-black text-black uppercase leading-tight">
                          {projectTitle || 'INFRASTRUCTURE & IT MODERNIZATION PROJECT'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-300 grid grid-cols-3 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-[9.5px] text-slate-500 block uppercase font-bold">PhilGEPS Ref No.</span>
                          <strong className="text-blue-950 font-black truncate block">{projectRefNo || 'PhilGEPS-2026-001'}</strong>
                        </div>
                        <div>
                          <span className="text-[9.5px] text-slate-500 block uppercase font-bold">Solicitation No.</span>
                          <strong className="text-blue-950 font-black truncate block">{activeProject?.solicitationNo || (activeProject as any)?.solicitationNumber || 'SOL-2026-001'}</strong>
                        </div>
                        <div>
                          <span className="text-[9.5px] text-slate-500 block uppercase font-bold">Approved Budget (ABC)</span>
                          <strong className="text-emerald-800 font-black block">{activeProject?.abc || '₱12,500,000.00'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Large Envelope Identifier */}
                    <div className="p-3 border-4 border-black bg-black text-white text-center rounded-xl space-y-0.5 shadow-md">
                      <div className="font-mono font-black text-base uppercase tracking-wider text-amber-300">
                        {activeEnvelope === 'ENVELOPE_1' 
                          ? 'ENVELOPE NO. 1: TECHNICAL & ELIGIBILITY COMPONENT'
                          : 'ENVELOPE NO. 2: FINANCIAL BID PROPOSAL COMPONENT'}
                      </div>
                      <div className="text-[10px] font-sans font-semibold text-slate-200 uppercase">
                        Official Sealed Envelope Submission pursuant to RA 12009 / RA 9184
                      </div>
                    </div>

                    {/* Prominent Red Warning Box */}
                    <div className="p-2.5 border-2 border-red-600 bg-red-50 text-center rounded-xl space-y-0.5">
                      <h4 className="text-xs sm:text-sm font-black text-red-600 uppercase tracking-wide leading-tight">
                        ⚠️ WARNING: DO NOT OPEN BEFORE SCHEDULED BID OPENING DATE & TIME!
                      </h4>
                      <p className="text-[11px] font-black text-red-900 font-mono uppercase">
                        SCHEDULED BID OPENING: <span className="bg-red-600 text-white px-2 py-0.2 rounded font-black">{submissionDeadline}</span>
                      </p>
                    </div>

                  </div>

                </div>

                {/* BOTTOM FOOTER: Signatory & QR Code */}
                <div className="border-t-2 border-black pt-2 flex items-center justify-between relative z-10 text-xs">
                  <div className="space-y-0.5 text-left">
                    <p className="text-[9.5px] font-mono font-bold uppercase text-slate-600">Authorized Managing Officer / Bidder Signatory:</p>
                    <p className="text-sm font-black uppercase text-black underline tracking-wide">
                      {currentTenant?.authorizedSignatory?.name || 'AUTHORIZED MANAGING OFFICER'}
                    </p>
                    <p className="text-[10.5px] text-slate-700 font-medium">
                      {currentTenant?.authorizedSignatory?.title || 'President & Authorized Signatory'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-[9.5px] font-mono text-slate-600">
                      <div className="font-bold text-black">Official Submission QR</div>
                      <div>{projectRefNo || 'PhilGEPS-2026-001'}</div>
                    </div>
                    <DocumentQrCode
                      details={{
                        documentNumber: projectRefNo || 'PhilGEPS-2026-001',
                        documentName: activeEnvelope === 'ENVELOPE_1' ? 'Envelope 1 Technical Outer Cover' : 'Envelope 2 Financial Outer Cover',
                        projectName: projectTitle,
                        dateTimeSubmitted: submissionDeadline,
                        companyName: currentTenant?.companyName,
                        solicitationNo: activeProject?.solicitationNo || (activeProject as any)?.solicitationNumber || 'SOL-2026-001'
                      }}
                      size={65}
                      className="border-2 border-black p-0.5 bg-white shrink-0"
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FOLDER COVER PAGE MODAL (ORIGINAL / COPY 1 / COPY 2 - LANDSCAPE)        */}
      {/* ========================================================================= */}
      {showFolderCoverModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col print:border-none print:shadow-none print:max-h-none print:bg-white">
            <style>{`
              @media print {
                @page {
                  size: 13in 8.5in landscape;
                  margin: 0.25in;
                }
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                header, nav, aside, button, .print\\:hidden, .no-print, .no-export {
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
                  overflow: visible !important;
                  border: none !important;
                  box-shadow: none !important;
                }
                .landscape-folder-cover {
                  box-shadow: none !important;
                  border: 3px solid #000000 !important;
                  margin: 0 auto !important;
                  padding: 0.35in !important;
                  width: 13in !important;
                  min-height: 8.5in !important;
                  box-sizing: border-box !important;
                  page-break-after: avoid !important;
                }
              }
            `}</style>

            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 print:hidden">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Folder className="w-4 h-4 text-emerald-400" />
                <span>Folder Cover Page (Landscape Legal 13" × 8.5") — {activeFolderCopy} ({activeEnvelope === 'ENVELOPE_1' ? 'Technical' : 'Financial'})</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Folder Cover</span>
                </button>
                <button onClick={() => setShowFolderCoverModal(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 flex justify-center print:p-0 print:bg-white">
              <div className="landscape-folder-cover w-[13in] max-w-[1200px] min-h-[780px] aspect-[13/8.5] bg-white text-black p-6 sm:p-8 border-4 border-black flex flex-col justify-between font-sans relative shadow-2xl print:shadow-none print:border-4 print:p-6 print:m-0 box-border">
                
                {/* Inner Frame */}
                <div className="absolute inset-2.5 border-2 border-black rounded-xl pointer-events-none" />

                {/* Header */}
                <div className="text-center border-b-2 border-black pb-2 space-y-0.5 relative z-10">
                  <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-black">
                    {currentTenant?.companyName || 'BIDDING ENTERPRISE CORPORATION'}
                  </h1>
                  <p className="text-xs text-slate-700 font-medium">
                    {currentTenant?.address || 'Metro Manila, Philippines'} • TIN: <span className="font-mono font-bold">{currentTenant?.tin || '000-000-000-000'}</span> • PhilGEPS Platinum: <span className="font-bold text-blue-950">{currentTenant?.philgepsPlatinumNo || 'PLAT-2026-ACTIVE'}</span>
                  </p>
                </div>

                {/* Main 2-Column Section */}
                <div className="grid grid-cols-12 gap-4 my-2 relative z-10 flex-1">
                  
                  {/* Left Column: Project Details & Folder Badge */}
                  <div className="col-span-5 space-y-2.5 text-left">
                    <div className="p-3 border-2 border-black bg-slate-50 rounded-xl space-y-1.5">
                      <p className="text-[10px] uppercase font-mono font-black text-slate-500">SUBMITTED TO:</p>
                      <h3 className="text-sm font-black uppercase text-blue-950 leading-tight">
                        THE BIDS AND AWARDS COMMITTEE
                      </h3>
                      <p className="text-xs font-bold text-slate-800 uppercase">{procuringEntity}</p>
                    </div>

                    <div className="p-3 border-2 border-black bg-slate-50 rounded-xl space-y-1.5">
                      <div>
                        <span className="text-[9.5px] font-mono font-bold text-slate-500 uppercase block">Project Title:</span>
                        <p className="text-xs font-black text-black uppercase leading-tight">{projectTitle}</p>
                      </div>
                      <div className="pt-1.5 border-t border-slate-300 grid grid-cols-2 gap-1 text-[11px] font-mono">
                        <div>
                          <span className="text-[9px] text-slate-500 block uppercase">PhilGEPS Ref:</span>
                          <strong className="text-blue-950 font-bold">{projectRefNo}</strong>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 block uppercase">ABC:</span>
                          <strong className="text-emerald-800 font-bold">{activeProject?.abc || '₱0.00'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Folder Badge */}
                    <div className="p-3 border-3 border-black bg-slate-900 text-white rounded-xl text-center space-y-0.5">
                      <div className="font-mono font-black text-lg text-amber-300 uppercase tracking-widest">
                        {activeFolderCopy}
                      </div>
                      <div className="text-[10px] font-bold text-slate-200 uppercase">
                        {activeEnvelope === 'ENVELOPE_1' ? 'ELIGIBILITY & TECHNICAL COMPONENT' : 'FINANCIAL BID PROPOSAL'}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Table of Contents Matrix */}
                  <div className="col-span-7 flex flex-col justify-between text-left">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Table of Contents / Documents Included in this {activeFolderCopy} Folder:
                      </p>

                      <div className="border-2 border-black overflow-hidden rounded-lg">
                        <table className="w-full text-left text-xs border-collapse font-sans">
                          <thead>
                            <tr className="bg-black text-white font-mono font-bold text-[10px]">
                              <th className="p-1.5 border-r border-slate-700 w-10 text-center">#</th>
                              <th className="p-1.5 border-r border-slate-700">Document Title / Specification</th>
                              <th className="p-1.5 border-r border-slate-700 w-24 text-center">Category</th>
                              <th className="p-1.5 w-16 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentFolderItems.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="p-4 text-center text-slate-400 italic text-xs">
                                  (No documents attached to this folder yet)
                                </td>
                              </tr>
                            ) : (
                              currentFolderItems.slice(0, 10).map((item, idx) => (
                                <tr key={item.id} className="border-t border-slate-300 hover:bg-slate-50 text-[10.5px]">
                                  <td className="p-1 border-r border-slate-300 text-center font-mono font-bold">{idx + 1}</td>
                                  <td className="p-1 border-r border-slate-300 font-semibold truncate max-w-[280px]">{item.documentName}</td>
                                  <td className="p-1 border-r border-slate-300 text-center font-mono text-[9.5px]">{item.category}</td>
                                  <td className="p-1 text-center font-bold text-emerald-700 text-[9.5px]">PRESENT</td>
                                </tr>
                              ))
                            )}
                            {currentFolderItems.length > 10 && (
                              <tr className="border-t border-slate-300 bg-slate-50 text-[10px] italic text-slate-600">
                                <td colSpan={4} className="p-1 text-center">
                                  + and {currentFolderItems.length - 10} more documents in this folder
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="p-2 border border-red-500 bg-red-50 rounded-lg text-center mt-2">
                      <p className="text-[10px] font-bold text-red-800 uppercase">
                        Scheduled Bid Opening Deadline: <span className="font-black underline">{submissionDeadline}</span>
                      </p>
                    </div>
                  </div>

                </div>

                {/* Footer */}
                <div className="border-t-2 border-black pt-2 flex items-center justify-between relative z-10 text-xs">
                  <div className="space-y-0.5 text-left">
                    <p className="text-[9.5px] font-mono font-bold uppercase text-slate-600">Certified Complete & Authentic By:</p>
                    <p className="text-sm font-black uppercase underline text-black tracking-wide">{currentTenant?.authorizedSignatory?.name || 'AUTHORIZED MANAGING OFFICER'}</p>
                    <p className="text-[10.5px] text-slate-700 font-medium">{currentTenant?.authorizedSignatory?.title || 'President'}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-[9.5px] font-mono text-slate-600">
                      <div className="font-bold text-black">{activeFolderCopy} Cover QR</div>
                      <div>{projectRefNo}</div>
                    </div>
                    <DocumentQrCode
                      details={{
                        documentNumber: projectRefNo || 'PhilGEPS-2026-001',
                        documentName: `${activeFolderCopy} — ${activeEnvelope === 'ENVELOPE_1' ? 'Envelope 1 Folder Cover' : 'Envelope 2 Folder Cover'}`,
                        projectName: projectTitle,
                        dateTimeSubmitted: submissionDeadline,
                        companyName: currentTenant?.companyName,
                        solicitationNo: activeProject?.solicitationNo || (activeProject as any)?.solicitationNumber || 'SOL-2026-001'
                      }}
                      size={60}
                      className="border-2 border-black p-0.5 bg-white shrink-0"
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. INDIVIDUAL DOCUMENT COVER PAGE MODAL                                    */}
      {/* ========================================================================= */}
      {selectedDocForCover && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col print:border-none print:shadow-none print:max-h-none print:bg-white">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 print:hidden">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Document Cover Separator ({selectedDocForCover.folderCopy}): {selectedDocForCover.documentName}</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const coverElem = document.querySelector('.print-document-sheet') as HTMLElement;
                    if (!coverElem) {
                      alert('Cover page is loading, please try again.');
                      return;
                    }
                    const cleanRef = (activeProject?.refNo || projectRefNo || 'PRJ-2026-001').replace(/[^a-zA-Z0-9]/g, '_');
                    const cleanDoc = selectedDocForCover.documentName.replace(/[^a-zA-Z0-9]/g, '_');
                    const copyTag = selectedDocForCover.folderCopy || activeFolderCopy || 'ORIGINAL';
                    const fileName = `${cleanRef}_${copyTag}_COVER_${cleanDoc}.pdf`;
                    await generateAndDownloadThreeLayerPdf(coverElem, null, undefined, fileName);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow"
                  title="Download single-page 8.5x13 Cover Page PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Cover PDF</span>
                </button>

                <button
                  onClick={async () => {
                    const coverElem = document.querySelector('.print-document-sheet') as HTMLElement;
                    if (!coverElem) {
                      alert('Cover page is loading, please try again.');
                      return;
                    }
                    const linkedVaultDoc = vaultDocs.find(v => v.id === selectedDocForCover.vaultDocId) ||
                      vaultDocs.find(v => {
                        const vName = (v.documentName || '').toLowerCase();
                        const dName = selectedDocForCover.documentName.toLowerCase();
                        return vName.includes(dName) || dName.includes(vName);
                      });

                    let fileDataUrl = linkedVaultDoc?.fileDataUrl;
                    if (!fileDataUrl && linkedVaultDoc?.id) {
                      fileDataUrl = await loadPdfData(linkedVaultDoc.id);
                    }

                    const cleanRef = (activeProject?.refNo || projectRefNo || 'PRJ-2026-001').replace(/[^a-zA-Z0-9]/g, '_');
                    const cleanDoc = selectedDocForCover.documentName.replace(/[^a-zA-Z0-9]/g, '_');
                    const copyTag = selectedDocForCover.folderCopy || activeFolderCopy || 'ORIGINAL';
                    const fileName = `${cleanRef}_${copyTag}_MERGED_${cleanDoc}.pdf`;

                    if (fileDataUrl) {
                      await generateAndDownloadThreeLayerPdf(coverElem, null, fileDataUrl, fileName);
                    } else {
                      await generateAndDownloadThreeLayerPdf(coverElem, null, undefined, fileName);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow"
                  title="Download Cover Page merged with the actual attached document"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Download Merged (Cover + Doc)</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Cover</span>
                </button>
                <button onClick={() => setSelectedDocForCover(null)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 flex justify-center print:p-0 print:bg-white">
              <div className="max-w-[850px] w-full mx-auto">
                {(() => {
                  const linkedVaultDoc = vaultDocs.find(v => v.id === selectedDocForCover.vaultDocId) ||
                    vaultDocs.find(v => {
                      const vName = (v.documentName || '').toLowerCase();
                      const dName = selectedDocForCover.documentName.toLowerCase();
                      return vName.includes(dName) || dName.includes(vName);
                    });

                  return (
                    <DocumentCoverPage
                      item={{
                        id: selectedDocForCover.id,
                        tenantId: tenantId,
                        documentName: selectedDocForCover.documentName,
                        documentNumber: linkedVaultDoc?.documentNumber || selectedDocForCover.documentNumber || projectRefNo,
                        category: (selectedDocForCover.category as any) || (linkedVaultDoc?.category as any) || 'LEGAL',
                        procurementApplicability: [(projectCategory as any) || 'Infrastructure'],
                        legalBasisReference: 'RA 12009 NGPA / RA 9184 Standard',
                        versionNumber: linkedVaultDoc?.versionNumber || 1,
                        fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                        fileSizeBytes: selectedDocForCover.fileSizeBytes || 1048576,
                        fileName: linkedVaultDoc?.fileName || `${selectedDocForCover.documentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
                        uploadedByName: currentTenant?.authorizedSignatory?.name || 'Authorized Managing Officer',
                        isOptional: false,
                        requiresIssueDate: !!linkedVaultDoc?.issuedDate,
                        requiresExpiryDate: !!linkedVaultDoc?.expiryDate,
                        issuedDate: linkedVaultDoc?.issuedDate,
                        expiryDate: linkedVaultDoc?.expiryDate,
                        status: 'ACTIVE',
                        projectTitle: activeProject?.title || projectTitle || 'Target Bidding Project',
                        philgepsRefNo: activeProject?.refNo || projectRefNo || 'PhilGEPS-2026-001',
                        procuringEntity: activeProject?.procuringEntity || procuringEntity || 'Department of Information & Communications Technology',
                        approvedBudget: activeProject?.abc || (activeProject as any)?.approvedBudget,
                        preBidConferenceDate: (activeProject as any)?.preBidConferenceDate || 'August 15, 2026 at 10:00 AM',
                        submissionDeadline: activeProject?.dateTimeSubmitted || (activeProject as any)?.submissionDeadline || submissionDeadline || 'August 30, 2026 at 02:00 PM',
                        previousVersions: []
                      }}
                      tenant={currentTenant}
                      folderCopy={selectedDocForCover.folderCopy || activeFolderCopy}
                      envelopeName={selectedDocForCover.envelope === 'ENVELOPE_1' ? 'ENVELOPE 1: TECHNICAL & ELIGIBILITY COMPONENT' : 'ENVELOPE 2: FINANCIAL BID PROPOSAL'}
                    />
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT FROM VAULT MODAL */}
      {showVaultImportModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-10">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-blue-400" />
                  <span>Import Documents from Document Vault ({activeFolderCopy})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Select documents to add into this {activeFolderCopy} folder.</p>
              </div>
              <button onClick={() => setShowVaultImportModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {vaultDocs.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs italic">
                  No documents found in Document Vault.
                </div>
              ) : (
                vaultDocs.map((doc) => {
                  const isAlreadyAdded = currentFolderItems.some(i => i.vaultDocId === doc.id || i.documentName === doc.documentName);
                  return (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                            {doc.category}
                          </span>
                          {doc.philgepsRefNo && (
                            <span className="text-[10px] font-mono text-slate-400">
                              REF: {doc.philgepsRefNo}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-white">{doc.documentName}</p>
                      </div>

                      <button
                        onClick={() => handleImportFromVault(doc)}
                        disabled={isAlreadyAdded}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
                          isAlreadyAdded
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow cursor-pointer'
                        }`}
                      >
                        {isAlreadyAdded ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add to {activeFolderCopy}</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-end bg-slate-900/95">
              <button
                onClick={() => setShowVaultImportModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOM DOCUMENT MODAL */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scaleIn my-auto">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Add Document to {activeFolderCopy} Folder</span>
              </h3>
              <button onClick={() => setShowAddCustomModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomDocument} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Document Category</label>
                <select
                  value={customDocCategory}
                  onChange={(e) => setCustomDocCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option value="LEGAL">Legal & Eligibility (Class A / Class B)</option>
                  <option value="TECHNICAL">Technical Document / Exhibit</option>
                  <option value="FINANCIAL">Financial Proposal Document</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Document Name / Title <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={customDocName}
                  onChange={(e) => setCustomDocName(e.target.value)}
                  placeholder="e.g. PCAB Special Joint Venture License"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowAddCustomModal(false)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow">
                  Add to {activeFolderCopy}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REORGANIZE DOCUMENT SEQUENCE MODAL (DRAG & DROP / ARROW SORTER)           */}
      {/* ========================================================================= */}
      {showReorderModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[92vh] flex flex-col">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-10">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-indigo-400" />
                  <span>Reorganize Document Sequence: {activeFolderCopy}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Drag items, use the arrow buttons, or click standard auto-sort to customize sequence.
                </p>
              </div>
              <button
                onClick={() => setShowReorderModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Auto-Sort Toolbar */}
            <div className="px-5 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
              <span className="text-[11px] font-mono text-slate-400 font-semibold">
                {reorderList.length} Documents in {activeEnvelope === 'ENVELOPE_1' ? 'Envelope 1' : 'Envelope 2'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoSortStatutory}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/40 transition flex items-center gap-1.5 cursor-pointer shadow"
                  title="Sort into standard 17-item Philippine Statutory Checklist Order: 1. PhilGEPS, 2. Ongoing Contracts, 3. SLCC, 4. BSD/Surety, 5. Section VI, 6. Section VII, 7. Delivery Schedule, 8. Org Chart/Personnel/Equipment, 9. After-Sales, 10. OSS, 11. NFCC, 12. AFS, 13. Mayor's Permit, 14. PCAB, 15. SEC/DTI, 16. Tax Clearance, 17. Sec Cert/SPA"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>⚡ Checklist Order (1–17)</span>
                </button>

                <button
                  type="button"
                  onClick={handleAutoSortAlphabetical}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                  title="Sort Alphabetically A to Z"
                >
                  <span>Sort A-Z</span>
                </button>
              </div>
            </div>

            {/* Draggable & Sortable Items List */}
            <div className="p-5 overflow-y-auto space-y-2 flex-1 max-h-[58vh]">
              {reorderList.map((doc, idx) => (
                <div
                  key={doc.id}
                  draggable
                  onDragStart={() => setDraggedItemIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedItemIndex === null || draggedItemIndex === idx) return;
                    const updated = [...reorderList];
                    const [moved] = updated.splice(draggedItemIndex, 1);
                    updated.splice(idx, 0, moved);
                    setReorderList(updated);
                    setDraggedItemIndex(null);
                  }}
                  className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 select-none ${
                    draggedItemIndex === idx
                      ? 'bg-indigo-950/60 border-indigo-500 shadow-lg opacity-60'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Drag Handle */}
                    <div className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 p-1">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Sequence Badge */}
                    <span className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 text-blue-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{doc.documentName}</p>
                      <span className={`text-[9px] font-mono px-2 py-0.2 rounded font-bold border inline-block mt-0.5 ${
                        doc.category === 'LEGAL'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : doc.category === 'TECHNICAL'
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      }`}>
                        {doc.category}
                      </span>
                    </div>
                  </div>

                  {/* Move Up / Down Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (idx === 0) return;
                        const updated = [...reorderList];
                        const [moved] = updated.splice(idx, 1);
                        updated.splice(idx - 1, 0, moved);
                        setReorderList(updated);
                      }}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-25 disabled:cursor-not-allowed border border-slate-800 transition"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (idx === reorderList.length - 1) return;
                        const updated = [...reorderList];
                        const [moved] = updated.splice(idx, 1);
                        updated.splice(idx + 1, 0, moved);
                        setReorderList(updated);
                      }}
                      disabled={idx === reorderList.length - 1}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-25 disabled:cursor-not-allowed border border-slate-800 transition"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-900/95 sticky bottom-0">
              <button
                type="button"
                onClick={() => setShowReorderModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleSaveReorder(reorderList)}
                className="px-6 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow flex items-center gap-1.5 cursor-pointer font-bold"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Reordered Sequence</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SINGLE ATTACHED DOCUMENT PREVIEW MODAL */}
      {previewDocItem && (
        <PdfPreviewModal
          item={previewDocItem}
          tenant={currentTenant}
          onClose={() => setPreviewDocItem(null)}
          pdfDataUrl={pdfDataCache.current[previewDocItem.id]}
          hidePrintExport={false}
        />
      )}

      {/* ORGANIZE & MERGE DOCUMENTS MODAL */}
      {showOrganizeModal && (
        <MergedPdfViewerModal
          selectedItems={currentFolderItems.map(item => {
            const linked = vaultDocs.find(v => v.id === item.vaultDocId) ||
              vaultDocs.find(v => v.documentName.toLowerCase() === item.documentName.toLowerCase());
            return {
              id: item.id,
              tenantId: tenantId,
              documentName: item.documentName,
              documentNumber: linked?.documentNumber || item.documentNumber || projectRefNo,
              category: (item.category as any) || (linked?.category as any) || 'LEGAL',
              procurementApplicability: [(projectCategory as any) || 'Infrastructure'],
              legalBasisReference: 'RA 12009 NGPA / RA 9184 Standard',
              versionNumber: linked?.versionNumber || 1,
              fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              fileSizeBytes: item.fileSizeBytes || 1048576,
              fileName: linked?.fileName || `${item.documentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
              uploadedByName: currentTenant?.authorizedSignatory?.name || 'Authorized Managing Officer',
              fileDataUrl: linked?.fileDataUrl || pdfDataCache.current[linked?.id || ''] || undefined,
              isOptional: false,
              requiresIssueDate: !!linked?.issuedDate,
              requiresExpiryDate: !!linked?.expiryDate,
              issuedDate: linked?.issuedDate,
              expiryDate: linked?.expiryDate,
              status: 'ACTIVE',
              projectTitle: activeProject?.title || projectTitle || 'Target Bidding Project',
              philgepsRefNo: activeProject?.refNo || projectRefNo || 'PhilGEPS-2026-001',
              procuringEntity: activeProject?.procuringEntity || procuringEntity || 'Department of Information & Communications Technology',
              approvedBudget: activeProject?.abc || (activeProject as any)?.approvedBudget,
              preBidConferenceDate: (activeProject as any)?.preBidConferenceDate || 'August 15, 2026 at 10:00 AM',
              submissionDeadline: activeProject?.dateTimeSubmitted || (activeProject as any)?.submissionDeadline || submissionDeadline || 'August 30, 2026 at 02:00 PM',
              previousVersions: []
            };
          })}
          tenant={currentTenant}
          onClose={() => setShowOrganizeModal(false)}
        />
      )}

      {/* MERGED BID PACKAGES FOLDER (PREVIEW & DOWNLOAD ORIGINAL, COPY 1, COPY 2) */}
      {showMergedPackageViewerModal && (
        <MergedPackageViewerModal
          isOpen={showMergedPackageViewerModal}
          onClose={() => setShowMergedPackageViewerModal(false)}
          items={currentFolderItems}
          vaultDocs={vaultDocs}
          tenant={currentTenant}
          activeProject={activeProject}
          projectRefNo={projectRefNo}
          projectTitle={projectTitle}
          procuringEntity={procuringEntity}
          activeEnvelope={activeEnvelope}
          initialFolderCopy={activeFolderCopy}
        />
      )}

      {/* MERGE PROCESS TOAST / PROGRESS NOTIFICATION */}
      {isMergingAll && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border-2 border-purple-500 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-scaleIn">
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin shrink-0" />
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-white">{mergeStatusText || 'Compiling Bid Package...'}</p>
            <p className="text-[10px] text-slate-400">Stamping "Page X of Y" pagination on every single page</p>
          </div>
        </div>
      )}

      {/* OFF-SCREEN COVER PAGE CONTAINER FOR INSTANT PERFECT MERGING */}
      <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none opacity-0 overflow-hidden" aria-hidden="true">
        {packageItems.map((doc, idx) => {
          const linkedVaultDoc = vaultDocs.find(v => v.id === doc.vaultDocId) ||
            vaultDocs.find(v => {
              const vName = (v.documentName || '').toLowerCase();
              const dName = doc.documentName.toLowerCase();
              return vName.includes(dName) || dName.includes(vName);
            });

          return (
            <div key={`render-cover-${doc.id}`} id={`cover-page-render-${doc.id}`} style={{ width: '800px' }}>
              <DocumentCoverPage
                item={{
                  id: doc.id,
                  tenantId: tenantId,
                  documentName: doc.documentName,
                  documentNumber: linkedVaultDoc?.documentNumber || doc.documentNumber || projectRefNo,
                  category: (doc.category as any) || (linkedVaultDoc?.category as any) || 'LEGAL',
                  procurementApplicability: [(projectCategory as any) || 'Infrastructure'],
                  legalBasisReference: 'RA 12009 NGPA / RA 9184 Standard',
                  versionNumber: linkedVaultDoc?.versionNumber || 1,
                  fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                  fileSizeBytes: doc.fileSizeBytes || 1048576,
                  fileName: linkedVaultDoc?.fileName || `${doc.documentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
                  uploadedByName: currentTenant?.authorizedSignatory?.name || 'Authorized Managing Officer',
                  isOptional: false,
                  requiresIssueDate: !!linkedVaultDoc?.issuedDate,
                  requiresExpiryDate: !!linkedVaultDoc?.expiryDate,
                  issuedDate: linkedVaultDoc?.issuedDate,
                  expiryDate: linkedVaultDoc?.expiryDate,
                  status: 'ACTIVE',
                  projectTitle: activeProject?.title || projectTitle || 'Target Bidding Project',
                  philgepsRefNo: activeProject?.refNo || projectRefNo || 'PhilGEPS-2026-001',
                  procuringEntity: activeProject?.procuringEntity || procuringEntity || 'Department of Information & Communications Technology',
                  approvedBudget: activeProject?.abc || (activeProject as any)?.approvedBudget,
                  preBidConferenceDate: (activeProject as any)?.preBidConferenceDate || 'August 15, 2026 at 10:00 AM',
                  submissionDeadline: activeProject?.dateTimeSubmitted || (activeProject as any)?.submissionDeadline || submissionDeadline || 'August 30, 2026 at 02:00 PM',
                  previousVersions: []
                }}
                tenant={currentTenant}
                folderCopy={doc.folderCopy || activeFolderCopy}
                envelopeName={doc.envelope === 'ENVELOPE_1' ? 'ENVELOPE 1: TECHNICAL & ELIGIBILITY COMPONENT' : 'ENVELOPE 2: FINANCIAL BID PROPOSAL'}
                incrementNumber={idx + 1}
              />
            </div>
          );
        })}
      </div>

    </div>
  );
};

export const BidPackage = BidPackageBuilderView;
export default BidPackageBuilderView;

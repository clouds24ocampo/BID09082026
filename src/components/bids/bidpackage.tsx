import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DocumentVaultItem } from '../../types';
import { DocumentCoverPage } from '../vault/DocumentCoverPage';
import { MergedPdfViewerModal } from '../vault/MergedPdfViewerModal';
import { MergedPackageViewerModal } from '../vault/MergedPackageViewerModal';
import { PdfPreviewModal } from '../vault/PdfPreviewModal';
import DocumentQrCode from '../common/DocumentQrCode';
import { loadVaultItems, loadPdfData, savePdfData } from '../../utils/vaultIndexedDB';
import { getOpportunityProjects, OpportunityProjectOption } from '../../utils/opportunityProjects';
import { generateAndDownloadThreeLayerPdf, exportMergedThreeLayerPdf, buildMergedThreeLayerPdfDataUrl, ExportDocumentUnit } from '../../utils/pdfExportEngine';
import { resolveDocumentPdfAttachment } from '../../utils/systemDocumentPdfGenerator';
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
  Download,
  Loader2,
  CheckCircle2, 
  Clock, 
  Search, 
  Plus, 
  Trash2, 
  Layers, 
  X, 
  Box, 
  Sparkles, 
  Copy,
  CheckSquare,
  Square,
  ListPlus,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  GripVertical,
  ListOrdered,
  FileStack,
  Upload
} from 'lucide-react';
import { SpotlightCard } from '../common/SpotlightCard';
import { BorderBeam } from '../common/BorderBeam';
import { ShinyText } from '../common/ShinyText';
import { CyberBadge } from '../common/CyberBadge';


export type FolderCopyType = 'ORIGINAL' | 'COPY_1' | 'COPY_2';

export interface PackageItem {
  id: string;
  documentName: string;
  documentNumber?: string;
  category: 'LEGAL' | 'TECHNICAL' | 'FINANCIAL';
  envelope: 'ENVELOPE_1' | 'ENVELOPE_2';
  folderCopy: FolderCopyType;
  code?: string;
  vaultDocId?: string;
  fileSizeBytes?: number;
  fileName?: string;
  fileDataUrl?: string;
  storageKey?: string;
  dateAdded: string;
  isAutoDetected?: boolean;
  pageCount?: number;
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

  // Unified Cover Pages Modal State:
  const [showUnifiedCoverModal, setShowUnifiedCoverModal] = useState(false);
  const [coverModalTab, setCoverModalTab] = useState<'MOTHER' | 'ENVELOPE' | 'FOLDER' | 'TOC'>('MOTHER');
  const [coverEnvelopeChoice, setCoverEnvelopeChoice] = useState<'ENVELOPE_1' | 'ENVELOPE_2'>('ENVELOPE_1');
  const [coverFolderCopyChoice, setCoverFolderCopyChoice] = useState<FolderCopyType>('ORIGINAL');
  const [selectedDocForCover, setSelectedDocForCover] = useState<PackageItem | null>(null);
  const [isDownloadingAllCovers, setIsDownloadingAllCovers] = useState(false);
  const [isPrintingAllCovers, setIsPrintingAllCovers] = useState(false);

  // Add Completed Documents Picker Modal State
  const [showAddCompletedModal, setShowAddCompletedModal] = useState(false);
  const [selectedDocIdsToAdd, setSelectedDocIdsToAdd] = useState<string[]>([]);
  const [completedDocFilter, setCompletedDocFilter] = useState<'ALL' | 'LEGAL' | 'TECHNICAL' | 'FINANCIAL'>('ALL');

  const [showAutoSyncSuccess, setShowAutoSyncSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    // User Directive: No automatic project pre-selection, let user choose first
    setSelectedOppId('');
  }, [tenantId]);

  const activeProject = selectedOppId ? (oppProjects.find(p => p.id === selectedOppId || p.refNo === selectedOppId) || null) : null;
  const projectRefNo = activeProject?.refNo || '';
  const projectTitle = activeProject?.title || '';
  const procuringEntity = activeProject?.procuringEntity || 'Bids and Awards Committee';
  const submissionDeadline = activeProject?.dateTimeSubmitted || 'March 19, 2026';
  const projectCategory = (activeProject?.category || 'Infrastructure').toLowerCase();
  const projectScopeKey = (projectRefNo || '').trim();

  const isInfraProject = React.useMemo(() => {
    // 1. Primary Authority: Project's explicit category from PhilGEPS / Opportunity Setup
    if (activeProject?.category) {
      const cat = activeProject.category.toUpperCase();
      if (cat.includes('INFRA') || cat.includes('CIVIL')) return true;
      if (cat.includes('GOOD')) return false;
      if (cat.includes('CONSULT')) return false;
    }
    
    // 2. Fallback: Check project title and reference number if category is not explicitly set
    const combined = `${projectRefNo || ''} ${projectTitle || ''}`.toUpperCase();
    return combined.includes('CONSTRUCT') || combined.includes('CIVIL WORKS') || combined.includes('ROAD OPENING') || combined.includes('DRAINAGE SYSTEM') || combined.includes('INFRASTRUCTURE') || combined.includes('BUILDING');
  }, [activeProject, projectRefNo, projectTitle]);

  const isConsultingProject = React.useMemo(() => {
    if (activeProject?.category) {
      const cat = activeProject.category.toUpperCase();
      if (cat.includes('CONSULT')) return true;
      if (cat.includes('INFRA') || cat.includes('GOOD')) return false;
    }
    const titleLower = (projectTitle || '').toLowerCase();
    return titleLower.includes('consult') || titleLower.includes('feasibility') || titleLower.includes('master plan');
  }, [activeProject, projectTitle]);

  // Master Statutory Bidding Documents Checklist definitions (Memoized for Fast Refresh & 0ms Rendering)
  const statutoryDocsList: StatutoryDocDefinition[] = React.useMemo(() => {
    const list: StatutoryDocDefinition[] = [
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
      // 7. Framework Agreement List
      { id: 'FRAMEWORK_AGREEMENT_LIST', name: 'Framework Agreement List', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'FRAMEWORK_AGREEMENT_LIST', storageKey: `bidocs_fal_${tenantId}_${projectScopeKey}` },
      // 8. Organizational Chart, Manpower Requirements & Key Personnel
      { id: 'ORGANIZATIONAL_CHART', name: 'Organizational Chart for the Contract to be Bid', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'ORGANIZATIONAL_CHART', storageKey: `bidocs_org_chart_${tenantId}_${projectScopeKey}` },
      { id: 'KEY_PERSONNEL', name: 'Key Personnel Matrix, Bio-Data & PRC Certifications (Manpower Requirements)', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'KEY_PERSONNEL', storageKey: `bidocs_key_personnel_${tenantId}_${projectScopeKey}` },
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

    ];

    // Envelope 2: Financial Proposal Documents (1: Bid Form, 2: BOQ, 3: Form L, 4: Price Schedule, 5: Bid Summary, 6: Cash Flow)
    // 1. Bid Form (Dynamic naming strictly aligned to project classification)
    if (isInfraProject) {
      list.push({ id: 'FINANCIAL_BID_FORM_INFRA', name: 'Financial Bid Form (Infrastructure)', category: 'FINANCIAL', envelope: 'ENVELOPE_2', code: 'GPPB-BIDFORM-INFRASTRUCTURE', storageKey: `bidocs_bidform_infra_${tenantId}_${projectScopeKey}` });
    } else if (isConsultingProject) {
      list.push({ id: 'FINANCIAL_BID_FORM_CONSULTING', name: 'Financial Bid Form (Consulting)', category: 'FINANCIAL', envelope: 'ENVELOPE_2', code: 'GPPB-BIDFORM-CONSULTING', storageKey: `bidocs_bidform_consulting_${tenantId}_${projectScopeKey}` });
    } else {
      list.push({ id: 'FINANCIAL_BID_FORM_GOODS', name: 'Financial Bid Form (Goods)', category: 'FINANCIAL', envelope: 'ENVELOPE_2', code: 'GPPB-BIDFORM-GOODS', storageKey: `bidocs_bidform_goods_${tenantId}_${projectScopeKey}` });
    }

    // 2. Bill of Quantities
    list.push({ id: 'BILL_OF_QUANTITIES', name: 'Bill of Quantities (BOQ Breakdown)', category: 'FINANCIAL', envelope: 'ENVELOPE_2', code: 'BILL_OF_QUANTITIES', storageKey: `bidocs_boq_${tenantId}_${projectScopeKey}` });

    // 3. Form L - Detailed Estimates
    list.push({ id: 'DETAILED_ESTIMATES_FORM_L', name: '(Form L) Detailed Estimates (Direct Labor, Logistics & Equipment)', category: 'FINANCIAL', envelope: 'ENVELOPE_2', code: 'DETAILED_ESTIMATES_FORM_L', storageKey: `bidocs_detailed_estimates_${tenantId}_${projectScopeKey}` });

    // 4. Detailed Price Schedule
    list.push({ id: 'PRICE_SCHEDULE_GOODS', name: 'Detailed Price Schedule for Goods (Offered from Abroad / Within Philippines)', category: 'FINANCIAL', envelope: 'ENVELOPE_2', code: 'PRICE_SCHEDULE_GOODS', storageKey: `bidocs_pricesched_${tenantId}_${projectScopeKey}` });

    // 5. Summary of Bid Prices
    list.push({ id: 'SUMMARY_BID_PRICES', name: 'Summary of Bid Prices & Lump-Sum Breakdown', category: 'FINANCIAL', envelope: 'ENVELOPE_2', code: 'SUMMARY_BID_PRICES', storageKey: `bidocs_summary_bid_price_${tenantId}_${projectScopeKey}` });

    // 6. Cash Flow by Quarter
    list.push({ id: 'CASH_FLOW_BY_QUARTER', name: 'Cash Flow by Quarter and Payment Schedule (SF-INFR-56)', category: 'FINANCIAL', envelope: 'ENVELOPE_2', code: 'CASH_FLOW_BY_QUARTER', storageKey: `bidocs_cash_flow_${tenantId}_${projectScopeKey}` });

    return list;
  }, [tenantId, projectScopeKey, isInfraProject, isConsultingProject]);

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
                  documentNumber: form.projectRefNo || '',
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
                  projectTitle: form.projectTitle || '',
                  philgepsRefNo: form.projectRefNo || '',
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

      await Promise.all(
        combinedDocs.map(async (d) => {
          try {
            const data = await loadPdfData(d.id);
            if (data) {
              pdfDataCache.current[d.id] = data;
              d.fileDataUrl = data;
            }
          } catch (_) { /* ignore missing binary */ }
        })
      );

      // Re-trigger state with loaded fileDataUrl attached so all downstream modals and resolvers have immediate binary access
      setVaultDocs([...combinedDocs]);
    }).catch(e => console.error('[BidPackage] Failed to load vault items:', e));
  }, [tenantId, projectScopeKey]);



  // Memoized batch readiness map for all statutory docs (0ms instantaneous lookup)
  const docReadinessMap = React.useMemo(() => {
    const currentRef = (projectRefNo || '').trim().toLowerCase();
    const ref = projectRefNo || '';
    const currentRefDigits = currentRef.replace(/[^0-9]/g, '');

    const map: Record<string, { isReady: boolean; vaultId?: string }> = {};

    statutoryDocsList.forEach(doc => {
      // 1. Candidate localStorage keys strictly for THIS active project (MUST have valid ref)
      const candidateStorageKeys: string[] = [];
      if (ref && doc.storageKey) candidateStorageKeys.push(doc.storageKey);

      if (ref) {
        if (doc.id === 'ORGANIZATIONAL_CHART') {
          candidateStorageKeys.push(`bidocs_org_chart_${tenantId}_${ref}`);
        } else if (doc.id === 'KEY_PERSONNEL') {
          candidateStorageKeys.push(`bidocs_key_personnel_${tenantId}_${ref}`);
          candidateStorageKeys.push(`bidocs_personnel_${tenantId}_${ref}`);
        } else if (doc.id === 'MAJOR_EQUIPMENT') {
          candidateStorageKeys.push(`bidocs_equipment_${tenantId}_${ref}`);
          candidateStorageKeys.push(`bidocs_major_equipment_${tenantId}_${ref}`);
        } else if (doc.id === 'SECTION_VI_REQUIREMENTS') {
          candidateStorageKeys.push(`bidocs_sec_vi_${tenantId}_${ref}`);
        } else if (doc.id === 'TECH_SPECS_SECTION_VII') {
          candidateStorageKeys.push(`bidocs_tech_specs_${tenantId}_${ref}`);
        } else if (doc.id === 'FRAMEWORK_AGREEMENT_LIST') {
          candidateStorageKeys.push(`bidocs_fal_${tenantId}_${ref}`);
        } else if (doc.id === 'ONGOING_CONTRACTS') {
          candidateStorageKeys.push(`bidocs_ongoing_${tenantId}_${ref}`);
        } else if (doc.id === 'SLCC_STATEMENT') {
          candidateStorageKeys.push(`bidocs_slcc_${tenantId}_${ref}`);
        } else if (doc.id === 'NFCC_COMPUTATION') {
          candidateStorageKeys.push(`bidocs_nfcc_${tenantId}_${ref}`);
        } else if (doc.id === 'BID_SECURING_DECLARATION') {
          candidateStorageKeys.push(`bidocs_bsd_${tenantId}_${ref}`);
        } else if (doc.id === 'OMNIBUS_SWORN_STATEMENT') {
          candidateStorageKeys.push(`bidocs_oss_${tenantId}_${ref}`);
        } else if (doc.id === 'AFTERSALES_WARRANTY') {
          candidateStorageKeys.push(`bidocs_aftersale_${tenantId}_${ref}`);
        } else if (doc.id === 'CASH_FLOW_BY_QUARTER') {
          candidateStorageKeys.push(`bidocs_cash_flow_${tenantId}_${ref}`);
        } else if (doc.id === 'PRICE_SCHEDULE_GOODS') {
          candidateStorageKeys.push(`bidocs_pricesched_${tenantId}_${ref}`);
        } else if (doc.id === 'BILL_OF_QUANTITIES') {
          candidateStorageKeys.push(`bidocs_boq_${tenantId}_${ref}`);
        } else if (doc.id === 'DETAILED_ESTIMATES_FORM_L') {
          candidateStorageKeys.push(`bidocs_detailed_estimates_${tenantId}_${ref}`);
        } else if (doc.id === 'SUMMARY_BID_PRICES') {
          candidateStorageKeys.push(`bidocs_summary_bid_price_${tenantId}_${ref}`);
        } else if (doc.id === 'FINANCIAL_BID_FORM_GOODS') {
          candidateStorageKeys.push(`bidocs_bidform_goods_${tenantId}_${ref}`);
        } else if (doc.id === 'FINANCIAL_BID_FORM_INFRA') {
          candidateStorageKeys.push(`bidocs_bidform_infra_${tenantId}_${ref}`);
        } else if (doc.id === 'FINANCIAL_BID_FORM_CONSULTING') {
          candidateStorageKeys.push(`bidocs_bidform_consulting_${tenantId}_${ref}`);
        }
      }

      let foundInStorage = false;
      for (const key of candidateStorageKeys) {
        if (!key) continue;
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (!parsed) continue;

            // Strict project reference verification if metadata is stored
            if (typeof parsed === 'object' && !Array.isArray(parsed)) {
              const pRef = (parsed.projectRefNo || parsed.philgepsRefNo || '').trim().toLowerCase();
              if (pRef && pRef !== currentRef) continue;
            }

            if (doc.id === 'SECTION_VI_REQUIREMENTS') {
              const rows = Array.isArray(parsed) ? parsed : (parsed.requirements || parsed.items || parsed.scheduleRows || []);
              const hasActualItems = Array.isArray(rows) && rows.length > 0 && rows.some((it: any) => {
                const desc = (it.description || '').trim();
                return desc.length > 0 && !desc.toLowerCase().includes('enterprise server rack');
              });
              if (hasActualItems) {
                map[doc.id] = { isReady: true };
                foundInStorage = true;
                break;
              }
            } else if (doc.id === 'TECH_SPECS_SECTION_VII') {
              const rows = Array.isArray(parsed) ? parsed : (parsed.specs || parsed.specifications || parsed.items || parsed.rows || []);
              const hasActualSpecs = Array.isArray(rows) && rows.length > 0 && rows.some((it: any) => {
                const spec = (it.description || it.specification || it.statement || it.specs || '').trim();
                return spec.length > 0;
              });
              if (hasActualSpecs) {
                map[doc.id] = { isReady: true };
                foundInStorage = true;
                break;
              }
            } else if (doc.id === 'FRAMEWORK_AGREEMENT_LIST') {
              const rows = Array.isArray(parsed) ? parsed : (parsed.items || parsed.frameworkItems || []);
              const hasActualFal = Array.isArray(rows) && rows.length > 0 && rows.some((it: any) => {
                const item = (it.description || it.item || '').trim();
                return item.length > 0;
              });
              if (hasActualFal) {
                map[doc.id] = { isReady: true };
                foundInStorage = true;
                break;
              }
            } else if (doc.id === 'ONGOING_CONTRACTS' || doc.id === 'SLCC_STATEMENT') {
              const rows = Array.isArray(parsed) ? parsed : (parsed.contracts || parsed.ongoingContracts || parsed.slccContracts || parsed.items || []);
              const hasActualContracts = Array.isArray(rows) && rows.some((it: any) => (it.contractName || it.clientName || it.description || it.title || '').trim().length > 0);
              if (hasActualContracts) {
                map[doc.id] = { isReady: true };
                foundInStorage = true;
                break;
              }
            } else if (doc.id === 'BID_SECURING_DECLARATION' || doc.id === 'OMNIBUS_SWORN_STATEMENT') {
              const isConfigured = !!(
                (parsed.projectTitle && parsed.projectTitle.trim().length > 0) ||
                (parsed.procuringEntity && parsed.procuringEntity.trim().length > 0) ||
                (parsed.signatoryName && parsed.signatoryName.trim().length > 0) ||
                (parsed.notaryDetails && typeof parsed.notaryDetails === 'object') ||
                parsed.fileDataUrl
              );
              if (isConfigured) {
                map[doc.id] = { isReady: true };
                foundInStorage = true;
                break;
              }
            } else if (doc.id === 'MAJOR_EQUIPMENT') {
              const arr = parsed.equipments || parsed.items || parsed.equipmentList || (Array.isArray(parsed) ? parsed : []);
              const hasEquip = Array.isArray(arr) && arr.some((e: any) => (e.description || e.equipmentName || e.model || '').trim().length > 0);
              if (hasEquip) {
                map[doc.id] = { isReady: true };
                foundInStorage = true;
                break;
              }
            } else if (doc.id === 'KEY_PERSONNEL') {
              const arr = parsed.labors || parsed.personnel || parsed.keyPersonnel || (Array.isArray(parsed) ? parsed : []);
              const hasPersonnel = Array.isArray(arr) && arr.some((p: any) => (p.name || p.personnelName || p.position || '').trim().length > 0);
              if (hasPersonnel) {
                map[doc.id] = { isReady: true };
                foundInStorage = true;
                break;
              }
            } else if (doc.id === 'ORGANIZATIONAL_CHART') {
              const hasChart = !!(parsed.chartData || (Array.isArray(parsed.nodes) && parsed.nodes.length > 0) || parsed.fileDataUrl || parsed.uploaded);
              if (hasChart) {
                map[doc.id] = { isReady: true };
                foundInStorage = true;
                break;
              }
            } else if (doc.id === 'NFCC_COMPUTATION') {
              const hasNfcc = (Number(parsed.currentAssets) > 0 || Number(parsed.currentLiabilities) > 0 || Number(parsed.nfccAmount) > 0 || Number(parsed.nfccTotal) > 0);
              if (hasNfcc) {
                map[doc.id] = { isReady: true };
                foundInStorage = true;
                break;
              }
            } else if (doc.id === 'DETAILED_ESTIMATES_FORM_L' || doc.id === 'BILL_OF_QUANTITIES') {
              const hasCost = (typeof parsed.totalEstimatedProjectCost === 'number' && parsed.totalEstimatedProjectCost > 0) ||
                              (typeof parsed.grandTotal === 'number' && parsed.grandTotal > 0) ||
                              (typeof parsed.totalBidAmount === 'number' && parsed.totalBidAmount > 0) ||
                              (Array.isArray(parsed.materials) && parsed.materials.length > 0 && parsed.materials.some((m: any) => (Number(m.quantity) > 0 && Number(m.unitPrice) > 0))) ||
                              (Array.isArray(parsed.items) && parsed.items.length > 0 && parsed.items.some((it: any) => (Number(it.amount || it.totalAmount) > 0)));
              if (hasCost) {
                map[doc.id] = { isReady: true };
                foundInStorage = true;
                break;
              }
            } else if (doc.id === 'PRICE_SCHEDULE_GOODS') {
              const arr = parsed.items || parsed.scheduleRows || (Array.isArray(parsed) ? parsed : []);
              const hasRows = Array.isArray(arr) && arr.some((r: any) => (r.description || '').trim().length > 0 && (Number(r.unitPrice || r.totalPrice || r.amount) > 0));
              if (hasRows) {
                map[doc.id] = { isReady: true };
                foundInStorage = true;
                break;
              }
            } else if (doc.id === 'CASH_FLOW_BY_QUARTER') {
              const arr = parsed.quarters || parsed.paymentSchedule || (Array.isArray(parsed) ? parsed : []);
              const hasQuarter = Array.isArray(arr) && arr.some((q: any) => Number(q.amount || q.cashFlow || q.total) > 0);
              if (hasQuarter) {
                map[doc.id] = { isReady: true };
                foundInStorage = true;
                break;
              }
            } else if (doc.id === 'FINANCIAL_BID_FORM_GOODS' || doc.id === 'FINANCIAL_BID_FORM_INFRA') {
              const num = parseFloat(`${parsed.totalBidAmountFigures || parsed.totalBidAmount || ''}`.replace(/,/g, ''));
              if (num > 0) {
                map[doc.id] = { isReady: true };
                foundInStorage = true;
                break;
              }
            } else if (Array.isArray(parsed)) {
              const hasRealItems = parsed.some((it: any) => {
                if (!it || typeof it !== 'object') return false;
                const textFields = [it.description, it.contractName, it.clientName, it.projectName, it.title, it.specs, it.name];
                return textFields.some(f => typeof f === 'string' && f.trim().length > 0);
              });
              if (hasRealItems) {
                map[doc.id] = { isReady: true };
                foundInStorage = true;
                break;
              }
            }
          } catch (_) {}
        }
      }

      if (foundInStorage) return;

      // 2. Check vault items (Class A/B Corporate vs Isolated Project Exhibits)
      const isCorporateClassAOrB = [
        'PHILGEPS_CERTIFICATE',
        'PHILGEPS_PLATINUM',
        'SEC_DTI_REG',
        'MAYORS_PERMIT',
        'TAX_CLEARANCE',
        'AUDITED_FS',
        'PCAB_LICENSE',
        'SECRETARY_CERTIFICATE',
        'JOINT_VENTURE_AGREEMENT'
      ].includes(doc.id);

      const matchingVault = vaultDocs.find(v => {
        if (!v) return false;
        const vName = (v.documentName || '').toLowerCase();
        const vCode = (v.documentCode || '').toUpperCase();
        const vRef = (v.philgepsRefNo || '').trim().toLowerCase();
        const vRefDigits = vRef.replace(/[^0-9]/g, '');

        if (isCorporateClassAOrB) {
          // Class A / B Corporate Credentials belong to the company/tenant in Vault
          if (doc.id === 'PHILGEPS_CERTIFICATE' || doc.id === 'PHILGEPS_PLATINUM') {
            return vCode === 'DOC-1' || vCode.includes('PHILGEPS') || vName.includes('philgeps');
          }
          if (doc.id === 'SEC_DTI_REG') {
            return vCode === 'DOC-2' || vCode.includes('SEC') || vCode.includes('DTI') || vName.includes('sec') || vName.includes('dti') || vName.includes('cda');
          }
          if (doc.id === 'MAYORS_PERMIT') {
            return vCode === 'DOC-3' || vCode.includes('MAYOR') || vName.includes('mayor') || vName.includes('business permit');
          }
          if (doc.id === 'TAX_CLEARANCE') {
            return vCode === 'DOC-4' || vCode.includes('TAX') || vName.includes('tax clearance') || vName.includes('bir');
          }
          if (doc.id === 'AUDITED_FS') {
            return vCode === 'DOC-5' || vCode.includes('AFS') || vCode.includes('AUDITED') || vName.includes('audited') || vName.includes('financial statement') || vName.includes('afs');
          }
          if (doc.id === 'PCAB_LICENSE') {
            return vCode === 'DOC-6' || vCode.includes('PCAB') || vName.includes('pcab') || vName.includes('contractor license');
          }
          if (doc.id === 'SECRETARY_CERTIFICATE') {
            return vCode === 'DOC-13' || vCode.includes('SEC_CERT') || vCode.includes('BOARD_RES') || vCode.includes('SPA') || vName.includes('secretary') || vName.includes('board resolution') || vName.includes('power of attorney') || vName.includes('spa');
          }
          if (doc.id === 'JOINT_VENTURE_AGREEMENT') {
            return vCode === 'DOC-14' || vCode.includes('JVA') || vCode.includes('JOINT_VENTURE') || vName.includes('joint venture') || vName.includes('jva');
          }
          return false;
        }

        // Project-Specific Technical Exhibits & Financial Documents
        const isStrictlyForThisProject = !vRef || !currentRef || (
          vRef === currentRef ||
          (currentRefDigits.length >= 6 && vRefDigits === currentRefDigits) ||
          (selectedOppId && v.projectId === selectedOppId) ||
          (projectTitle && v.projectTitle && v.projectTitle.toLowerCase().trim() === projectTitle.toLowerCase().trim())
        );

        if (!isStrictlyForThisProject) return false;

        // Technical Exhibits & Statements Matching (Never match corporate DOC-1 through DOC-15!)
        if (doc.id === 'STATEMENT_SLCC' || doc.id === 'SLCC_STATEMENT') {
          return vCode.includes('SLCC') || vName.includes('slcc') || vName.includes('single largest');
        }
        if (doc.id === 'STATEMENT_ONGOING_CONTRACTS' || doc.id === 'ONGOING_CONTRACTS') {
          return vCode.includes('ONGOING') || vName.includes('ongoing contracts') || (vName.includes('ongoing') && !vName.includes('sec'));
        }
        if (doc.id === 'NFCC_COMPUTATION') {
          return vCode.includes('NFCC') || vCode.includes('CL-08') || vName.includes('nfcc') || vName.includes('net financial contracting') || vName.includes('contracting capacity');
        }
        if (doc.id === 'BID_SECURING_DECLARATION') {
          return vCode.includes('BSD') || vCode.includes('BID_SECURITY') || vCode.includes('GPPB-BSD') || vName.includes('bid securing declaration') || vName.includes('surety bond');
        }
        if (doc.id === 'SECTION_VI_SCHEDULE_OF_REQUIREMENTS' || doc.id === 'SECTION_VI_REQUIREMENTS') {
          return vCode === 'SEC-VI' || vCode.includes('SEC-VI') || vName.includes('section vi') || vName.includes('schedule of requirement');
        }
        if (doc.id === 'SECTION_VII_TECHNICAL_SPECS' || doc.id === 'TECH_SPECS_SECTION_VII') {
          return vCode === 'SEC-VII' || vCode.includes('SEC-VII') || vCode.includes('TECH_SPECS') || vName.includes('section vii') || vName.includes('technical specification');
        }
        if (doc.id === 'FRAMEWORK_AGREEMENT_LIST') {
          return vCode === 'FAL' || vCode === 'FAL-01' || vCode.includes('FAL') || vName.includes('framework agreement') || vName.includes('fal');
        }
        if (doc.id === 'OMNIBUS_SWORN_STATEMENT') {
          return vCode.includes('OSS') || vCode.includes('OMNIBUS') || vCode.includes('GPPB-OSS') || vName.includes('omnibus sworn statement');
        }
        if (doc.id === 'ORGANIZATIONAL_CHART') {
          return vCode.includes('ORG_CHART') || vCode.includes('FC-2024') || vName.includes('organizational chart') || vName.includes('org chart');
        }
        if (doc.id === 'KEY_PERSONNEL' || doc.id === 'LIST_KEY_PERSONNEL') {
          return vCode.includes('KEY_PERSONNEL') || vCode.includes('FC-2025') || vName.includes('key personnel') || vName.includes('project manager') || vName.includes('manpower');
        }
        if (doc.id === 'MAJOR_EQUIPMENT') {
          return vCode.includes('EQUIPMENT') || vCode.includes('FC-2026') || vName.includes('major equipment') || vName.includes('machinery');
        }
        if (doc.id === 'AFTERSALES_WARRANTY') {
          return vCode.includes('AFTER') || vCode.includes('WARRANTY') || vName.includes('after-sales') || vName.includes('aftersales') || vName.includes('warranty');
        }

        // Financial Proposals Matching
        if (doc.id === 'FINANCIAL_BID_FORM_GOODS') {
          return (vCode.includes('GOODS') || vName.includes('goods')) && (vCode.includes('BIDFORM') || vName.includes('bid form') || vCode.includes('FINANCIAL_BID_FORM'));
        }
        if (doc.id === 'FINANCIAL_BID_FORM_INFRA') {
          return (vCode.includes('INFRA') || vName.includes('infra') || vName.includes('infrastructure')) && (vCode.includes('BIDFORM') || vName.includes('bid form') || vCode.includes('FINANCIAL_BID_FORM'));
        }
        if (doc.id === 'FINANCIAL_BID_FORM_CONSULTING') {
          return (vCode.includes('CONSULT') || vName.includes('consult')) && (vCode.includes('BIDFORM') || vName.includes('bid form') || vCode.includes('FINANCIAL_BID_FORM'));
        }
        if (doc.id === 'BILL_OF_QUANTITIES') {
          return vCode.includes('BOQ') || vName.includes('bill of quantities') || vName.includes('boq');
        }
        if (doc.id === 'DETAILED_ESTIMATES_FORM_L') {
          return vCode.includes('DETAILED-ESTIMATES') || vCode.includes('ESTIMATES') || vName.includes('detailed estimate') || vName.includes('form l') || vName.includes('form (l)');
        }
        if (doc.id === 'PRICE_SCHEDULE_GOODS') {
          return vCode.includes('PRICESCHED') || vCode.includes('PRICE-SCHEDULE') || vName.includes('price schedule');
        }
        if (doc.id === 'SUMMARY_BID_PRICES') {
          return vCode.includes('SUMMARY-BIDPRICE') || vCode.includes('SUMMARY_BID') || vName.includes('summary of bid price');
        }
        if (doc.id === 'CASH_FLOW_BY_QUARTER') {
          return vCode.includes('SF-INFR-56') || vCode.includes('CASHFLOW') || vName.includes('cash flow') || vName.includes('sf-infr-56');
        }

        return vName === (doc.name || '').toLowerCase() || vName.includes((doc.name || '').toLowerCase());
      });

      if (doc.id === 'BID_SECURING_DECLARATION' || doc.id === 'OMNIBUS_SWORN_STATEMENT') {
        map[doc.id] = {
          isReady: true,
          vaultId: matchingVault?.id
        };
      } else if (matchingVault) {
        map[doc.id] = {
          isReady: true,
          vaultId: matchingVault.id
        };
      } else if (!foundInStorage) {
        map[doc.id] = { isReady: false };
      }
    });

    return map;
  }, [statutoryDocsList, vaultDocs, projectRefNo, projectTitle, selectedOppId, tenantId, projectScopeKey]);

  // Helper to check if a statutory document is ready/configured in system (0ms O(1) Instant Lookup)
  const checkDocReadiness = (doc: StatutoryDocDefinition): { isReady: boolean; vaultId?: string } => {
    return docReadinessMap[doc.id] || { isReady: false };
  };

  // Master Document Checklist Rank Matcher (Strictly 1-20 Order for Envelope 1, followed by 21-26 for Envelope 2)
  const getDocumentChecklistRank = (doc: PackageItem | StatutoryDocDefinition | DocumentVaultItem): number => {
    const name = ((doc as any).documentName || (doc as any).name || '').toLowerCase();
    const docCode = ((doc as any).documentCode || (doc as any).code || '').toUpperCase();

    // 0. Highest Priority: exact match with statutory code or definition ID
    if ((doc as any).id) {
      const def = statutoryDocsList.find(
        d => d.id === (doc as any).id || (d.code && (doc as any).documentCode && d.code.toUpperCase() === (doc as any).documentCode.toUpperCase())
      );
      const STATUTORY_ORDER_RANK: Record<string, number> = {
        'PHILGEPS_CERTIFICATE': 1,
        'STATEMENT_ONGOING_CONTRACTS': 2,
        'STATEMENT_SLCC': 3,
        'BID_SECURING_DECLARATION': 4,
        'SECTION_VI_SCHEDULE_OF_REQUIREMENTS': 5,
        'SECTION_VII_TECHNICAL_SPECS': 6,
        'FRAMEWORK_AGREEMENT_LIST': 7,
        'ORGANIZATIONAL_CHART': 8,
        'LIST_KEY_PERSONNEL': 9,
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
        // Envelope 2: 1. Bid Form, 2. BOQ, 3. Form L, 4. Price Schedule, 5. Bid Summary, 6. Cash Flow
        'FINANCIAL_BID_FORM_GOODS': 21,
        'FINANCIAL_BID_FORM_INFRA': 21,
        'FINANCIAL_BID_FORM_CONSULTING': 21,
        'BILL_OF_QUANTITIES': 22,
        'DETAILED_ESTIMATES_FORM_L': 23,
        'PRICE_SCHEDULE_GOODS': 24,
        'SUMMARY_BID_PRICES': 25,
        'CASH_FLOW_BY_QUARTER': 26,
      };
      if (def && STATUTORY_ORDER_RANK[def.id]) {
        return STATUTORY_ORDER_RANK[def.id];
      }
      if (STATUTORY_ORDER_RANK[(doc as any).id]) {
        return STATUTORY_ORDER_RANK[(doc as any).id];
      }
    }

    // Direct Code Fallback Ranking
    if (docCode.includes('BIDFORM') || docCode.includes('FINANCIAL_BID_FORM')) return 21;
    if (docCode.includes('BOQ') || docCode.includes('BILL_OF_QUANTITIES')) return 22;
    if (docCode.includes('DETAILED_ESTIMATES') || docCode.includes('FORM_L')) return 23;
    if (docCode.includes('PRICE_SCHEDULE') || docCode.includes('PRICESCHED')) return 24;
    if (docCode.includes('SUMMARY_BID') || docCode.includes('SUMMARY-BIDPRICE')) return 25;
    if (docCode.includes('CASH_FLOW') || docCode.includes('SF-INFR-56')) return 26;

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
    if (name.includes('after-sale') || name.includes('aftersales') || name.includes('warranty')) return 11;
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

    // Envelope 2: Financial Proposal Items (1st: Bid Form, 2nd: BOQ, 3rd: Form L, 4th: Price Schedule, 5th: Summary of Bid Prices, 6th: Cash Flow)
    if (name.includes('bid form') || name.includes('financial proposal')) return 21;
    if (name.includes('bill of quantities') || name.includes('boq')) return 22;
    if (name.includes('detailed estimate') || name.includes('form l') || name.includes('form (l)')) return 23;
    if (name.includes('price schedule')) return 24;
    if (name.includes('summary of bid') || name.includes('summary bid')) return 25;
    if (name.includes('cash flow') || name.includes('sf-infr-56')) return 26;

    if (doc.category === 'LEGAL') return 16;
    if (doc.category === 'TECHNICAL') return 8;
    if (doc.category === 'FINANCIAL') return 21;
    return 50;
  };

  // Master Helper: Guarantee BSD and OSS Cover Pages are ALWAYS active in Envelope 1
  const ensureMandatoryStatutoryDocs = (items: PackageItem[], currentRef: string): PackageItem[] => {
    const originalItems = items.filter(item => item.folderCopy === 'ORIGINAL');
    let updatedOriginal = [...originalItems];

    const hasBsd = updatedOriginal.some(
      item => item.envelope === 'ENVELOPE_1' && (
        item.code === 'BID_SECURING_DECLARATION' ||
        item.id === 'BID_SECURING_DECLARATION' ||
        item.id.includes('bsd') ||
        item.documentName.toLowerCase().includes('bid securing declaration') ||
        item.documentName.toLowerCase().includes('surety bond') ||
        item.documentName.toLowerCase().includes('bsd')
      )
    );

    if (!hasBsd) {
      const bsdDef = statutoryDocsList.find(d => d.id === 'BID_SECURING_DECLARATION');
      const bsdReadiness = checkDocReadiness(bsdDef || { id: 'BID_SECURING_DECLARATION', name: '', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'BID_SECURING_DECLARATION' });
      updatedOriginal.push({
        id: 'pkg-bsd-statutory',
        documentName: bsdDef?.name || 'Bid Securing Declaration / Bid Security or Surety Bond (BSD)',
        documentNumber: currentRef,
        category: 'TECHNICAL',
        envelope: 'ENVELOPE_1',
        folderCopy: 'ORIGINAL',
        code: 'BID_SECURING_DECLARATION',
        vaultDocId: bsdReadiness.vaultId,
        fileSizeBytes: 1048576,
        dateAdded: new Date().toISOString(),
        isAutoDetected: true
      });
    }

    const hasOss = updatedOriginal.some(
      item => item.envelope === 'ENVELOPE_1' && (
        item.code === 'OMNIBUS_SWORN_STATEMENT' ||
        item.id === 'OMNIBUS_SWORN_STATEMENT' ||
        item.id.includes('oss') ||
        item.documentName.toLowerCase().includes('omnibus sworn statement') ||
        item.documentName.toLowerCase().includes('oss')
      )
    );

    if (!hasOss) {
      const ossDef = statutoryDocsList.find(d => d.id === 'OMNIBUS_SWORN_STATEMENT');
      const ossReadiness = checkDocReadiness(ossDef || { id: 'OMNIBUS_SWORN_STATEMENT', name: '', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'OMNIBUS_SWORN_STATEMENT' });
      updatedOriginal.push({
        id: 'pkg-oss-statutory',
        documentName: ossDef?.name || 'Omnibus Sworn Statement (OSS)',
        documentNumber: currentRef,
        category: 'TECHNICAL',
        envelope: 'ENVELOPE_1',
        folderCopy: 'ORIGINAL',
        code: 'OMNIBUS_SWORN_STATEMENT',
        vaultDocId: ossReadiness.vaultId,
        fileSizeBytes: 1048576,
        dateAdded: new Date().toISOString(),
        isAutoDetected: true
      });
    }

    // Sort active envelope items in statutory rank order
    const env1Sorted = updatedOriginal
      .filter(i => i.envelope === 'ENVELOPE_1')
      .sort((a, b) => getDocumentChecklistRank(a) - getDocumentChecklistRank(b));
    const otherEnvs = updatedOriginal.filter(i => i.envelope !== 'ENVELOPE_1');

    return [...otherEnvs, ...env1Sorted];
  };

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
    const withMandatory = ensureMandatoryStatutoryDocs(newItems, projectRefNo);
    const fullySynced = syncOriginalToCopies(withMandatory);
    setPackageItems(fullySynced);
    if (tenantId && projectScopeKey) {
      const storageKey = `bidocs_package_items_${tenantId}_${projectScopeKey}`;
      localStorage.setItem(storageKey, JSON.stringify(fullySynced));
    }
  };

  // Load project-scoped package items from localStorage (Strictly Isolated per Project)
  useEffect(() => {
    if (!tenantId || !projectScopeKey) {
      setPackageItems([]);
      return;
    }

    const storageKey = `bidocs_package_items_${tenantId}_${projectScopeKey}`;
    const saved = localStorage.getItem(storageKey);
    let itemsToUse: PackageItem[] = [];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          itemsToUse = parsed;
        }
      } catch (_) {}
    }

    // Sanitize technical/financial documents from corrupted corporate vault links
    const sanitizedItems = itemsToUse.map(item => {
      const codeOrId = ((item.code || item.id || '') as string).toUpperCase();
      const name = (item.documentName || '').toLowerCase();
      const isTechOrFinancial = [
        'ONGOING_CONTRACTS', 'SLCC_STATEMENT', 'SECTION_VI_REQUIREMENTS', 'TECH_SPECS_SECTION_VII',
        'FRAMEWORK_AGREEMENT_LIST', 'ORGANIZATIONAL_CHART', 'KEY_PERSONNEL', 'MAJOR_EQUIPMENT',
        'AFTERSALES_WARRANTY', 'OMNIBUS_SWORN_STATEMENT', 'BID_SECURING_DECLARATION', 'NFCC_COMPUTATION',
        'FINANCIAL_BID_FORM_GOODS', 'FINANCIAL_BID_FORM_INFRA', 'FINANCIAL_BID_FORM_CONSULTING',
        'BILL_OF_QUANTITIES', 'DETAILED_ESTIMATES_FORM_L', 'PRICE_SCHEDULE_GOODS', 'SUMMARY_BID_PRICES',
        'CASH_FLOW_BY_QUARTER'
      ].some(k => codeOrId.includes(k)) || name.includes('ongoing') || name.includes('slcc') || name.includes('single largest');

      if (isTechOrFinancial && item.vaultDocId) {
        // If it was linked to a corporate vault doc, clear it so the official system document generates cleanly
        return { ...item, vaultDocId: undefined };
      }
      return item;
    });

    const withMandatory = ensureMandatoryStatutoryDocs(sanitizedItems, projectRefNo);
    const fullySynced = syncOriginalToCopies(withMandatory);
    setPackageItems(fullySynced);
    localStorage.setItem(storageKey, JSON.stringify(fullySynced));
  }, [tenantId, projectScopeKey, projectRefNo]);

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
          code: def.code,
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

  const handleUploadFileForDoc = (doc: PackageItem, file: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Invalid Format: Only PDF documents (.pdf) can be attached to the bid package.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      if (dataUrl) {
        const cleanDocId = doc.id.replace(/^pkg-c[12]-/, '');
        try {
          await savePdfData(cleanDocId, dataUrl);
          await savePdfData(doc.id, dataUrl);
          if (doc.vaultDocId) {
            await savePdfData(doc.vaultDocId, dataUrl);
          }

          pdfDataCache.current[cleanDocId] = dataUrl;
          pdfDataCache.current[doc.id] = dataUrl;
          if (doc.vaultDocId) {
            pdfDataCache.current[doc.vaultDocId] = dataUrl;
          }

          const originalItems = packageItems.filter(item => item.folderCopy === 'ORIGINAL');
          const updatedOriginal = originalItems.map(it => {
            const itClean = it.id.replace(/^pkg-c[12]-/, '');
            if (itClean === cleanDocId || it.id === doc.id || (doc.vaultDocId && it.vaultDocId === doc.vaultDocId) || it.documentName.toLowerCase() === doc.documentName.toLowerCase()) {
              return {
                ...it,
                fileDataUrl: dataUrl,
                fileName: file.name,
                fileSizeBytes: file.size,
                isAutoDetected: true
              };
            }
            return it;
          });

          savePackageItems(updatedOriginal);
          alert(`✅ Document file "${file.name}" attached successfully to ${doc.documentName} across ORIGINAL, COPY 1, and COPY 2!`);
        } catch (err) {
          console.error('[BidPackage] Failed to save uploaded PDF binary:', err);
          alert('Failed to save document file to browser storage.');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteItem = (id: string) => {
    const target = packageItems.find(item => item.id === id);
    if (!target) return;

    if (
      target.code === 'BID_SECURING_DECLARATION' ||
      target.id === 'BID_SECURING_DECLARATION' ||
      target.id.includes('bsd') ||
      target.documentName.toLowerCase().includes('bid securing declaration') ||
      target.documentName.toLowerCase().includes('surety bond') ||
      target.code === 'OMNIBUS_SWORN_STATEMENT' ||
      target.id === 'OMNIBUS_SWORN_STATEMENT' ||
      target.id.includes('oss') ||
      target.documentName.toLowerCase().includes('omnibus sworn statement')
    ) {
      alert('Notice: Bid Securing Declaration (or Surety Bond) and Omnibus Sworn Statement Cover Pages are statutory requirements and always kept active in your bid package.');
      return;
    }

    const originalItems = packageItems.filter(item => item.folderCopy === 'ORIGINAL');
    const updatedOriginal = originalItems.filter(
      item => !(item.id === id || (item.documentName === target.documentName && item.envelope === target.envelope))
    );
    savePackageItems(updatedOriginal);
  };

  const handleResetDocReadiness = (doc: StatutoryDocDefinition) => {
    const ref = (projectRefNo || '').trim();
    if (!ref) return;

    const dName = doc.name.toLowerCase();
    const keysToRemove: string[] = [];
    if (doc.storageKey) keysToRemove.push(doc.storageKey);

    if (dName.includes('schedule of requirements') || dName.includes('section vi') || doc.id === 'SECTION_VI_REQUIREMENTS') {
      keysToRemove.push(`bidocs_sec_vi_${tenantId}_${ref}`);
      keysToRemove.push(`bidocs_sec_vi_services_${tenantId}_${ref}`);
    }
    if (dName.includes('technical specifications') || dName.includes('section vii') || doc.id === 'TECH_SPECS_SECTION_VII') {
      keysToRemove.push(`bidocs_tech_specs_${tenantId}_${ref}`);
    }
    if (dName.includes('framework agreement') || doc.id === 'FRAMEWORK_AGREEMENT_LIST') {
      keysToRemove.push(`bidocs_fal_${tenantId}_${ref}`);
    }
    if (dName.includes('ongoing') || doc.id === 'ONGOING_CONTRACTS') {
      keysToRemove.push(`bidocs_ongoing_${tenantId}_${ref}`);
    }
    if (dName.includes('slcc') || doc.id === 'SLCC_STATEMENT') {
      keysToRemove.push(`bidocs_slcc_${tenantId}_${ref}`);
    }
    if (dName.includes('bid securing') || dName.includes('bsd') || doc.id === 'BID_SECURING_DECLARATION') {
      keysToRemove.push(`bidocs_bsd_${tenantId}_${ref}`);
    }
    if (dName.includes('omnibus') || dName.includes('oss') || doc.id === 'OMNIBUS_SWORN_STATEMENT') {
      keysToRemove.push(`bidocs_oss_${tenantId}_${ref}`);
    }
    if (dName.includes('organizational chart') || doc.id === 'ORGANIZATIONAL_CHART') {
      keysToRemove.push(`bidocs_org_chart_${tenantId}_${ref}`);
    }
    if (dName.includes('key personnel') || doc.id === 'KEY_PERSONNEL') {
      keysToRemove.push(`bidocs_key_personnel_${tenantId}_${ref}`);
      keysToRemove.push(`bidocs_personnel_${tenantId}_${ref}`);
    }
    if (dName.includes('equipment') || doc.id === 'MAJOR_EQUIPMENT') {
      keysToRemove.push(`bidocs_equipment_${tenantId}_${ref}`);
      keysToRemove.push(`bidocs_major_equipment_${tenantId}_${ref}`);
    }
    if (dName.includes('warranty') || doc.id === 'AFTERSALES_WARRANTY') {
      keysToRemove.push(`bidocs_aftersale_${tenantId}_${ref}`);
    }
    if (dName.includes('nfcc') || doc.id === 'NFCC_COMPUTATION') {
      keysToRemove.push(`bidocs_nfcc_${tenantId}_${ref}`);
    }
    if (dName.includes('bill of quantities') || doc.id === 'BILL_OF_QUANTITIES') {
      keysToRemove.push(`bidocs_boq_${tenantId}_${ref}`);
    }
    if (dName.includes('detailed estimates') || doc.id === 'DETAILED_ESTIMATES_FORM_L') {
      keysToRemove.push(`bidocs_detailed_estimates_${tenantId}_${ref}`);
    }
    if (dName.includes('price schedule') || doc.id === 'PRICE_SCHEDULE_GOODS') {
      keysToRemove.push(`bidocs_pricesched_${tenantId}_${ref}`);
    }
    if (dName.includes('summary of bid price') || doc.id === 'SUMMARY_BID_PRICES') {
      keysToRemove.push(`bidocs_summary_bid_price_${tenantId}_${ref}`);
    }
    if (dName.includes('cash flow') || doc.id === 'CASH_FLOW_BY_QUARTER') {
      keysToRemove.push(`bidocs_cash_flow_${tenantId}_${ref}`);
    }

    keysToRemove.forEach(k => {
      try { localStorage.removeItem(k); } catch (_) {}
    });

    try {
      const rawCompleted = localStorage.getItem(`bidocs_completed_notarized_${tenantId}`);
      if (rawCompleted) {
        const parsed = JSON.parse(rawCompleted);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((f: any) => {
            const fRef = (f.projectRefNo || '').trim().toLowerCase();
            const fTitle = (f.title || f.formCode || '').toLowerCase();
            const isMatchProj = fRef === ref.toLowerCase();
            const isMatchDoc = fTitle.includes(dName) || dName.includes(fTitle) || (doc.code && f.formCode === doc.code);
            return !(isMatchProj && isMatchDoc);
          });
          localStorage.setItem(`bidocs_completed_notarized_${tenantId}`, JSON.stringify(filtered));
        }
      }
    } catch (_) {}

    setVaultDocs(prev => prev.filter(v => {
      const vRef = (v.philgepsRefNo || '').trim().toLowerCase();
      const vName = (v.documentName || '').toLowerCase();
      const isMatchProj = vRef === ref.toLowerCase();
      const isMatchDoc = vName.includes(dName) || dName.includes(vName) || (doc.code && v.documentCode === doc.code);
      return !(isMatchProj && isMatchDoc);
    }));

    setSelectedDocIdsToAdd(prev => prev.filter(id => id !== doc.id));
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

  // Reliable items for Merged Package Modal (includes all documents in folder for envelope toggle)
  const packageItemsForMerge = React.useMemo(() => {
    const matching = packageItems.filter(
      item => item.folderCopy === activeFolderCopy || !item.folderCopy
    );
    if (matching.length > 0) return matching;

    const originalInEnv = packageItems.filter(
      item => item.folderCopy === 'ORIGINAL'
    );
    if (originalInEnv.length > 0) return originalInEnv;

    return packageItems;
  }, [packageItems, activeFolderCopy]);

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
    let preloadedDataUrl: string | undefined = undefined;
    const cleanDocId = doc.id.replace(/^pkg-c[12]-/, '');

    if (doc.vaultDocId && pdfDataCache.current[doc.vaultDocId]) {
      preloadedDataUrl = pdfDataCache.current[doc.vaultDocId];
    } else if (pdfDataCache.current[doc.id]) {
      preloadedDataUrl = pdfDataCache.current[doc.id];
    } else if (pdfDataCache.current[cleanDocId]) {
      preloadedDataUrl = pdfDataCache.current[cleanDocId];
    }

    const codeOrId = ((doc.code || doc.id || '') as string).toUpperCase();
    const docNameLower = (doc.documentName || '').toLowerCase();
    const isTechnicalOrFinancialDoc = [
      'ONGOING_CONTRACTS', 'SLCC_STATEMENT', 'SECTION_VI_REQUIREMENTS', 'TECH_SPECS_SECTION_VII',
      'FRAMEWORK_AGREEMENT_LIST', 'ORGANIZATIONAL_CHART', 'KEY_PERSONNEL', 'MAJOR_EQUIPMENT',
      'AFTERSALES_WARRANTY', 'OMNIBUS_SWORN_STATEMENT', 'BID_SECURING_DECLARATION', 'NFCC_COMPUTATION',
      'FINANCIAL_BID_FORM_GOODS', 'FINANCIAL_BID_FORM_INFRA', 'FINANCIAL_BID_FORM_CONSULTING',
      'BILL_OF_QUANTITIES', 'DETAILED_ESTIMATES_FORM_L', 'PRICE_SCHEDULE_GOODS', 'SUMMARY_BID_PRICES',
      'CASH_FLOW_BY_QUARTER', 'ESTIMATES', 'FORM_L', 'BOQ', 'BID_FORM', 'PRICE_SCHEDULE', 'TECH_SPECS', 'SEC_VI', 'SEC_VII'
    ].some(k => codeOrId.includes(k)) ||
    docNameLower.includes('ongoing') || docNameLower.includes('slcc') || docNameLower.includes('single largest') ||
    docNameLower.includes('section vi') || docNameLower.includes('schedule of req') ||
    docNameLower.includes('section vii') || docNameLower.includes('technical spec') ||
    docNameLower.includes('framework agreement') || docNameLower.includes('fal') ||
    docNameLower.includes('org chart') || docNameLower.includes('organizational chart') ||
    docNameLower.includes('key personnel') || docNameLower.includes('personnel') || docNameLower.includes('manpower') ||
    docNameLower.includes('equipment') || docNameLower.includes('machinery') ||
    docNameLower.includes('after-sale') || docNameLower.includes('aftersales') || docNameLower.includes('warranty') ||
    docNameLower.includes('omnibus') || docNameLower.includes('oss') ||
    docNameLower.includes('bid secur') || docNameLower.includes('bsd') ||
    docNameLower.includes('nfcc') || docNameLower.includes('contracting capacity') ||
    docNameLower.includes('bid form') ||
    docNameLower.includes('bill of quantities') || docNameLower.includes('boq') ||
    docNameLower.includes('detailed estimate') || docNameLower.includes('form l') || docNameLower.includes('form (l)') ||
    docNameLower.includes('price schedule') ||
    docNameLower.includes('summary of bid') || docNameLower.includes('summary bid') ||
    docNameLower.includes('cash flow');

    let targetVaultDocId = doc.vaultDocId;

    // Sanitize: If technical or financial doc was mistakenly linked to a corporate vault doc (DOC-1..DOC-15), clear it
    if (isTechnicalOrFinancialDoc && targetVaultDocId) {
      const linked = vaultDocs.find(v => v.id === targetVaultDocId);
      const vCode = (linked?.documentCode || '').toUpperCase();
      if (['DOC-1', 'DOC-2', 'DOC-3', 'DOC-4', 'DOC-5', 'DOC-6', 'DOC-7', 'DOC-8', 'DOC-9', 'DOC-10', 'DOC-11', 'DOC-12', 'DOC-13', 'DOC-14', 'DOC-15'].includes(vCode)) {
        targetVaultDocId = undefined;
        preloadedDataUrl = undefined;
      }
    }

    if (!preloadedDataUrl && !isTechnicalOrFinancialDoc) {
      const dName = (doc.documentName || '').toLowerCase();
      const match = vaultDocs.find(v =>
        (targetVaultDocId && v.id === targetVaultDocId) ||
        (v.id && (v.id === doc.id || v.id === doc.code || v.id === cleanDocId)) ||
        ((v as any).code && doc.code && (v as any).code.toLowerCase() === doc.code.toLowerCase()) ||
        (v.documentName && doc.documentName && v.documentName.trim().toLowerCase() === doc.documentName.trim().toLowerCase()) ||
        (dName.includes('philgeps') && (v.documentCode === 'DOC-1' || (v.documentName || '').toLowerCase().includes('philgeps'))) ||
        (((dName.includes('sec ') || dName.includes('securities') || dName.includes('dti') || dName.includes('sec registration')) && !dName.includes('section') && !dName.includes('secretary')) && (v.documentCode === 'DOC-2' || ((v.documentName || '').toLowerCase().includes('incorporation') || (v.documentName || '').toLowerCase().includes('business registration') || (v.documentName || '').toLowerCase().includes('dti') || (v.documentName || '').toLowerCase().includes('sec')) && !(v.documentName || '').toLowerCase().includes('philgeps') && !(v.documentName || '').toLowerCase().includes('bir'))) ||
        ((dName.includes('mayor') || (dName.includes('business permit') && !dName.includes('barangay'))) && (v.documentCode === 'DOC-3' || (v.documentName || '').toLowerCase().includes('permit'))) ||
        (dName.includes('tax') && (v.documentCode === 'DOC-4' || v.documentCode === 'DOC-7' || (v.documentName || '').toLowerCase().includes('clearance'))) ||
        (dName.includes('audited') && (v.documentCode === 'DOC-5' || v.documentCode === 'DOC-15' || (v.documentName || '').toLowerCase().includes('audited'))) ||
        (dName.includes('pcab') && (v.documentCode === 'DOC-6' || v.documentCode === 'DOC-8' || (v.documentName || '').toLowerCase().includes('pcab'))) ||
        ((dName.includes('secretary') || dName.includes('board res') || dName.includes('spa')) && !dName.includes('section') && (v.documentCode === 'DOC-13' || (v.documentName || '').toLowerCase().includes('secretary') || (v.documentName || '').toLowerCase().includes('spa'))) ||
        (dName.includes('joint') && (v.documentCode === 'DOC-14' || (v.documentName || '').toLowerCase().includes('joint') || (v.documentName || '').toLowerCase().includes('jva')))
      );
      if (match) {
        if (!targetVaultDocId) targetVaultDocId = match.id;
        if (match.fileDataUrl) preloadedDataUrl = match.fileDataUrl;
        else if (pdfDataCache.current[match.id]) preloadedDataUrl = pdfDataCache.current[match.id];
      }
    }

    // Direct binary load from IndexedDB if not yet cached in memory
    if (!preloadedDataUrl && !isTechnicalOrFinancialDoc) {
      const idCandidates = [targetVaultDocId, doc.vaultDocId, doc.id, cleanDocId].filter(Boolean) as string[];
      for (const candId of idCandidates) {
        try {
          const dbData = await loadPdfData(candId);
          if (dbData) {
            preloadedDataUrl = dbData;
            pdfDataCache.current[candId] = dbData;
            break;
          }
        } catch (_) {}
      }
    }

    const effectiveDoc = {
      ...doc,
      vaultDocId: targetVaultDocId,
      fileDataUrl: preloadedDataUrl || (doc as any).fileDataUrl
    };

    const resolved = await resolveDocumentPdfAttachment(effectiveDoc, {
      tenant: currentTenant,
      activeProject,
      projectRefNo,
      projectTitle,
      procuringEntity,
      vaultDocs,
      folderCopy: doc.folderCopy || activeFolderCopy
    });

    if (resolved && targetVaultDocId) {
      pdfDataCache.current[targetVaultDocId] = resolved;
    }
    if (resolved && doc.id) {
      pdfDataCache.current[doc.id] = resolved;
    }
    if (resolved && cleanDocId) {
      pdfDataCache.current[cleanDocId] = resolved;
    }

    return resolved;
  };

  // ─── ONE-CLICK MERGE ALL DOCUMENTS WITH "PAGE X OF Y" PAGINATION ───
  const handleMergeAllDocuments = async (scope: 'CURRENT_FOLDER' | 'ALL_ENVELOPES' = 'CURRENT_FOLDER') => {
    let docsToMerge = scope === 'ALL_ENVELOPES'
      ? packageItems.filter(item => item.folderCopy === activeFolderCopy)
      : currentFolderItems;

    // Fallback: If COPY_1 or COPY_2 is empty, automatically replicate from ORIGINAL so nothing is ever missing
    if (docsToMerge.length === 0 && (activeFolderCopy === 'COPY_1' || activeFolderCopy === 'COPY_2')) {
      const originalFallback = scope === 'ALL_ENVELOPES'
        ? packageItems.filter(item => item.folderCopy === 'ORIGINAL')
        : packageItems.filter(item => item.envelope === activeEnvelope && item.folderCopy === 'ORIGINAL');
      if (originalFallback.length > 0) {
        docsToMerge = originalFallback.map(item => ({
          ...item,
          folderCopy: activeFolderCopy
        }));
      }
    }

    if (docsToMerge.length === 0) {
      alert(`No documents found in this ${activeFolderCopy} folder to merge.`);
      return;
    }

    setIsMergingAll(true);
    setMergeStatusText(`Preparing ${docsToMerge.length} documents for ${activeFolderCopy}...`);

    try {
      const units: ExportDocumentUnit[] = [];

      // Pre-resolve all attachments concurrently in parallel
      const resolvedAttachments = await Promise.all(
        docsToMerge.map(doc => resolveAttachmentForDoc(doc))
      );

      for (let i = 0; i < docsToMerge.length; i++) {
        const doc = docsToMerge[i];
        const fileDataUrl = resolvedAttachments[i];

        // 2. Cover Page element from pre-rendered offscreen container (with prefix fallback)
        const coverElem = (
          document.getElementById(`cover-page-render-${doc.id}`) ||
          document.getElementById(`cover-page-render-${doc.id.replace(/^pkg-c[12]-/, '')}`)
        ) as HTMLElement | null;

        units.push({
          title: doc.documentName,
          coverElement: coverElem || null,
          fileDataUrl: fileDataUrl || null,
          documentName: doc.documentName
        });
      }

      setMergeStatusText(`Compiling & stamping "Page X of Y" pagination on ${units.length} documents...`);

      const cleanRef = (activeProject?.refNo || projectRefNo || 'PRJ-2026').replace(/[^a-zA-Z0-9]/g, '_');
      const envTag = scope === 'ALL_ENVELOPES'
        ? 'COMPLETE_BID_PACKAGE_ALL_ENVELOPES'
        : activeEnvelope === 'ENVELOPE_1' ? 'TECHNICAL_LEGAL' : 'FINANCIAL';
      const fileName = `${cleanRef}_${activeFolderCopy}_${envTag}.pdf`;

      await exportMergedThreeLayerPdf(units, fileName, (prog) => {
        setMergeStatusText(`${prog.status} (${prog.percent}%)`);
      }, {
        folderCopy: activeFolderCopy,
        submissionDate: activeProject?.dateTimeSubmitted || (activeProject as any)?.submissionDeadline || submissionDeadline || 'August 30, 2026',
        companyName: currentTenant?.companyName,
        signatoryName: currentTenant?.authorizedSignatory?.name || 'Authorized Managing Officer',
        signatoryTitle: currentTenant?.authorizedSignatory?.title || (currentTenant?.authorizedSignatory as any)?.designation || 'President',
        projectRefNo: projectRefNo || activeProject?.refNo || 'PhilGEPS-2026',
        projectTitle: projectTitle || activeProject?.title || 'Target Procurement Project'
      });
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

  // 1-Click Download for All Packaging Labels (Mother Box, Envelopes, Folders, TOCs)
  const handleDownloadAllPackagingLabels = async () => {
    setIsDownloadingAllCovers(true);
    try {
      const units: ExportDocumentUnit[] = [];
      const coverIds = [
        { id: 'cover-render-mother', title: 'Mother Box Official Outer Cover' },
        { id: 'cover-render-env1', title: 'Envelope 1 (Technical & Legal) Outer Cover' },
        { id: 'cover-render-env2', title: 'Envelope 2 (Financial Proposal) Outer Cover' },
        { id: 'cover-render-folder-env1-original', title: 'Folder Cover — Envelope 1 (Original Copy)' },
        { id: 'cover-render-folder-env1-copy1', title: 'Folder Cover — Envelope 1 (Copy 1 Duplicate)' },
        { id: 'cover-render-folder-env1-copy2', title: 'Folder Cover — Envelope 1 (Copy 2 Triplicate)' },
        { id: 'cover-render-folder-env2-original', title: 'Folder Cover — Envelope 2 (Original Copy)' },
        { id: 'cover-render-folder-env2-copy1', title: 'Folder Cover — Envelope 2 (Copy 1 Duplicate)' },
        { id: 'cover-render-folder-env2-copy2', title: 'Folder Cover — Envelope 2 (Copy 2 Triplicate)' },
        { id: 'cover-render-toc-env1-original', title: 'Table of Contents — Envelope 1 (Original Copy)' },
        { id: 'cover-render-toc-env1-copy1', title: 'Table of Contents — Envelope 1 (Copy 1 Duplicate)' },
        { id: 'cover-render-toc-env1-copy2', title: 'Table of Contents — Envelope 1 (Copy 2 Triplicate)' },
        { id: 'cover-render-toc-env2-original', title: 'Table of Contents — Envelope 2 (Original Copy)' },
        { id: 'cover-render-toc-env2-copy1', title: 'Table of Contents — Envelope 2 (Copy 1 Duplicate)' },
        { id: 'cover-render-toc-env2-copy2', title: 'Table of Contents — Envelope 2 (Copy 2 Triplicate)' }
      ];

      for (const item of coverIds) {
        const el = document.getElementById(item.id) as HTMLElement | null;
        if (el) {
          units.push({
            title: item.title,
            coverElement: el,
            fileDataUrl: null,
            documentName: item.title
          });
        }
      }

      if (units.length === 0) {
        const activeElem = document.querySelector('.landscape-unified-cover') as HTMLElement | null;
        if (activeElem) {
          units.push({
            title: 'Packaging Cover Label',
            coverElement: activeElem,
            fileDataUrl: null,
            documentName: 'Packaging Cover'
          });
        }
      }

      const cleanRef = (activeProject?.refNo || projectRefNo || 'BID_PACKAGE').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${cleanRef}_COMPLETE_PACKAGING_LABELS_SET.pdf`;
      const dataUrl = await buildMergedThreeLayerPdfDataUrl(units, fileName);

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download packaging covers bundle:', err);
      alert('Error generating packaging bundle. Please try again.');
    } finally {
      setIsDownloadingAllCovers(false);
    }
  };

  // 1-Click Sequential Print for All Packaging Covers & Labels
  const handlePrintAllCovers = () => {
    setIsPrintingAllCovers(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setIsPrintingAllCovers(false);
      }, 1000);
    }, 250);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left min-h-[60vh] p-2 sm:p-4 md:p-6">
      
      {/* 1. Target Bidding Project Identifier Container + Header Controls — HorizonX 3D Glass */}
      <div className="relative w-full bg-gradient-to-r from-slate-900/95 via-[#080d1a]/90 to-slate-900/95 border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl overflow-hidden">
        <BorderBeam size={220} duration={14} colorFrom="#3b82f6" colorTo="#6366f1" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full">
          
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <Briefcase className="w-4 h-4 text-blue-400" />
              <span className="text-xs sm:text-sm font-black text-white tracking-tight whitespace-nowrap">
                <ShinyText text="Target Bidding Project:" speed={6} />
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
                    <option value="" className="bg-slate-950 text-slate-400 font-medium py-1.5">
                      -- Choose / Select a Bidding Project --
                    </option>
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
                if (!selectedOppId) {
                  alert('Please select a target bidding project from the dropdown first.');
                  return;
                }
                setSelectedDocIdsToAdd([]);
                setShowAddCompletedModal(true);
              }}
              className="px-4 py-2.5 rounded-full text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-950/40 transition flex items-center gap-2 cursor-pointer"
              title={`Add completed legal, technical, or financial documents to the ${activeFolderCopy} folder`}
            >
              <ListPlus className="w-4 h-4 text-blue-200" />
              <span>+ Add Completed Documents ({activeFolderCopy})</span>
            </button>

            {/* Unified Cover Pages & Packaging Labels Button */}
            <button
              onClick={() => {
                if (!selectedOppId) {
                  alert('Please select a target bidding project from the dropdown first.');
                  return;
                }
                setCoverEnvelopeChoice(activeEnvelope);
                setCoverFolderCopyChoice(activeFolderCopy);
                setShowUnifiedCoverModal(true);
              }}
              className="px-4 py-2.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-950/30 transition flex items-center gap-2 cursor-pointer"
              title="View, Print & Preview All Cover Pages (Mother Box, Envelopes & Folders)"
            >
              <Box className="w-4 h-4 text-slate-950" />
              <span>Cover Pages & Packaging Labels</span>
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

      {!selectedOppId ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/20">
            <Briefcase className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-white">No Bidding Project Selected</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Please select a target bidding project from the <span className="text-blue-400 font-bold">Target Bidding Project</span> dropdown above to assemble, organize, and compile your project-scoped bid packages (Envelope 1 & Envelope 2).
            </p>
          </div>
        </div>
      ) : (
        <>
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

            {/* Direct 1-Click Merge Current Envelope Button */}
            <button
              onClick={() => handleMergeAllDocuments('CURRENT_FOLDER')}
              disabled={isMergingAll || (currentFolderItems.length === 0 && originalCount === 0)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50 border border-emerald-400/40"
              title={`Compile current envelope (${activeEnvelope === 'ENVELOPE_1' ? 'Envelope 1' : 'Envelope 2'}) in ${activeFolderCopy} and download merged PDF`}
            >
              {isMergingAll ? (
                <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-emerald-200" />
              )}
              <span>Merge {activeEnvelope === 'ENVELOPE_1' ? 'Env 1' : 'Env 2'} ({activeFolderCopy})</span>
            </button>

            {/* Direct 1-Click Merge ALL Documents across Both Envelopes */}
            <button
              onClick={() => handleMergeAllDocuments('ALL_ENVELOPES')}
              disabled={isMergingAll || packageItems.length === 0}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white transition flex items-center gap-1.5 shadow-lg shadow-cyan-950/40 cursor-pointer disabled:opacity-50 border border-cyan-400/40"
              title={`Compile ALL documents across BOTH Envelope 1 and Envelope 2 in ${activeFolderCopy} into one complete bid package`}
            >
              <FileStack className="w-3.5 h-3.5 text-cyan-200" />
              <span>Merge All Envelopes ({activeFolderCopy})</span>
            </button>

            {/* Merged Bid Packages Folder (Preview & Download Original, Copy 1, Copy 2) */}
            <button
              onClick={() => setShowMergedPackageViewerModal(true)}
              disabled={packageItemsForMerge.length === 0}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition flex items-center gap-1.5 shadow-lg shadow-purple-950/40 cursor-pointer disabled:opacity-50 border border-purple-400/40"
              title="Open Merged Bid Packages Folder to view and download ORIGINAL, COPY 1, and COPY 2 PDFs"
            >
              <FileStack className="w-3.5 h-3.5 text-purple-200" />
              <span>Merged Packages Folder</span>
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

              {/* Direct 1-Click Merge & Download Button */}
              <button
                onClick={() => handleMergeAllDocuments('CURRENT_FOLDER')}
                disabled={isMergingAll || filteredItems.length === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-400/30"
                title={`Direct 1-click compile & download ${activeFolderCopy} package with live progress bar`}
              >
                {isMergingAll ? (
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-emerald-200" />
                )}
                <span>Merge & Download ({filteredItems.length})</span>
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
                          {(doc.code === 'BID_SECURING_DECLARATION' || doc.code === 'OMNIBUS_SWORN_STATEMENT' || doc.id.includes('bsd') || doc.id.includes('oss') || doc.documentName.toLowerCase().includes('bid securing') || doc.documentName.toLowerCase().includes('surety bond') || doc.documentName.toLowerCase().includes('omnibus')) && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-amber-400" />
                              <span>Cover Page Always Active • Attach Notarized Original</span>
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

                      {/* Attach / Replace PDF File Action */}
                      <label
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600 hover:text-white text-emerald-300 border border-emerald-500/40 transition flex items-center gap-1.5 cursor-pointer"
                        title="Attach or replace PDF file for this document"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{pdfDataCache.current[doc.id] || pdfDataCache.current[doc.id.replace(/^pkg-c[12]-/, '')] || doc.fileDataUrl ? 'Replace PDF' : 'Attach PDF'}</span>
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleUploadFileForDoc(doc, file);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>

                      {/* Preview PDF */}
                      <button
                        onClick={async () => {
                          const codeOrId = ((doc.code || doc.id || '') as string).toUpperCase();
                          const docNameLower = (doc.documentName || '').toLowerCase();
                          const isTechOrFinancial = [
                            'ONGOING_CONTRACTS', 'SLCC_STATEMENT', 'SECTION_VI_REQUIREMENTS', 'TECH_SPECS_SECTION_VII',
                            'FRAMEWORK_AGREEMENT_LIST', 'ORGANIZATIONAL_CHART', 'KEY_PERSONNEL', 'MAJOR_EQUIPMENT',
                            'AFTERSALES_WARRANTY', 'OMNIBUS_SWORN_STATEMENT', 'BID_SECURING_DECLARATION', 'NFCC_COMPUTATION',
                            'FINANCIAL_BID_FORM_GOODS', 'FINANCIAL_BID_FORM_INFRA', 'FINANCIAL_BID_FORM_CONSULTING',
                            'BILL_OF_QUANTITIES', 'DETAILED_ESTIMATES_FORM_L', 'PRICE_SCHEDULE_GOODS', 'SUMMARY_BID_PRICES',
                            'CASH_FLOW_BY_QUARTER'
                          ].some(k => codeOrId.includes(k)) || docNameLower.includes('ongoing') || docNameLower.includes('slcc') || docNameLower.includes('single largest');

                          // 1. Direct ID lookup (guarded against corporate mismatch)
                          let targetVaultDoc = vaultDocs.find(v => v.id === doc.vaultDocId);
                          if (targetVaultDoc && isTechOrFinancial) {
                            const vCode = (targetVaultDoc.documentCode || '').toUpperCase();
                            if (['DOC-1', 'DOC-2', 'DOC-3', 'DOC-4', 'DOC-5', 'DOC-6', 'DOC-7', 'DOC-8', 'DOC-9', 'DOC-10', 'DOC-11', 'DOC-12', 'DOC-13', 'DOC-14', 'DOC-15'].includes(vCode)) {
                              targetVaultDoc = undefined;
                            }
                          }

                          // 2. Match through statutory checklist definition (Corporate docs only)
                          if (!targetVaultDoc && !isTechOrFinancial) {
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

                          // 3. Smart Keyword Fallback Lookup (Corporate docs only)
                          if (!targetVaultDoc && !isTechOrFinancial) {
                            const dName = doc.documentName.toLowerCase();
                            targetVaultDoc = vaultDocs.find(v => {
                              const vName = (v.documentName || '').toLowerCase();
                              const vCode = (v.documentCode || '').toUpperCase();
                              if (dName.includes('philgeps') && (vCode === 'DOC-1' || vName.includes('philgeps'))) return true;
                              if (((dName.includes('sec ') || dName.includes('securities') || dName.includes('dti')) && !dName.includes('section') && !dName.includes('secretary')) && (vCode === 'DOC-2' || vName.includes('registration'))) return true;
                              if ((dName.includes('mayor') || (dName.includes('business permit') && !dName.includes('barangay'))) && (vCode === 'DOC-3' || vCode === 'DOC-4' || vName.includes('permit'))) return true;
                              if (dName.includes('tax') && (vCode === 'DOC-7' || vCode === 'DOC-6' || vName.includes('tax') || vName.includes('clearance'))) return true;
                              if ((dName.includes('financial') || dName.includes('afs') || dName.includes('audited')) && (vCode === 'DOC-15' || vName.includes('afs') || vName.includes('financial') || vName.includes('audited'))) return true;
                              if (dName.includes('pcab') && (vCode === 'DOC-8' || vName.includes('pcab'))) return true;
                              if (dName.includes('secretary') && !dName.includes('section') && (vCode === 'DOC-13' || vName.includes('secretary') || vName.includes('board') || vName.includes('attorney'))) return true;
                              if ((dName.includes('joint venture') || dName.includes('jva')) && (vCode === 'DOC-14' || vName.includes('joint') || vName.includes('jva'))) return true;
                              return false;
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
        </>
      )}

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
                      <div className="shrink-0 flex items-center gap-2">
                        {isAlreadyInFolder ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                            Already in {activeFolderCopy}
                          </span>
                        ) : readiness.isReady ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Ready in System</span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResetDocReadiness(doc);
                              }}
                              title="Reset document to Standard Template for this project"
                              className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
      {/* UNIFIED PACKAGING & COVER PAGES MODAL (MOTHER BOX, ENVELOPES & FOLDERS)    */}
      {/* ========================================================================= */}
      {showUnifiedCoverModal && (
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
                .landscape-unified-cover {
                  box-shadow: none !important;
                  border: 3px solid #000000 !important;
                  margin: 0 auto !important;
                  padding: 0.35in !important;
                  width: 13in !important;
                  min-height: 8.5in !important;
                  box-sizing: border-box !important;
                  page-break-after: always !important;
                  break-after: page !important;
                }
                .print-all-covers-section {
                  display: ${isPrintingAllCovers ? 'block' : 'none'} !important;
                }
                .single-cover-preview-section {
                  display: ${isPrintingAllCovers ? 'none' : 'block'} !important;
                }
              }
            `}</style>

            {/* Modal Navigation & Controls Header */}
            <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-20 print:hidden space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Box className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">
                      Bidding Packaging & Cover Pages
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Standardized Landscape Legal (13" × 8.5") packaging templates with live QR verification.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {/* 1-Click Download All Packaging PDFs */}
                  <button
                    onClick={handleDownloadAllPackagingLabels}
                    disabled={isDownloadingAllCovers}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center gap-1.5 cursor-pointer shadow-lg transition disabled:opacity-50"
                    title="Download all packaging covers, envelopes, folder separators and Table of Contents in 1 PDF bundle"
                  >
                    {isDownloadingAllCovers ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating Bundle...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Download All Labels (1-Click)</span>
                      </>
                    )}
                  </button>

                  {/* 1-Click Print All Packaging Covers & Labels */}
                  <button
                    onClick={handlePrintAllCovers}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 cursor-pointer shadow transition"
                    title="Print complete packaging set (Mother box, all envelopes, all folder copies & TOCs) in sequential order"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print All (1-Click)</span>
                  </button>

                  {/* Print Active Cover */}
                  <button
                    onClick={() => {
                      setIsPrintingAllCovers(false);
                      setTimeout(() => window.print(), 100);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 cursor-pointer shadow transition"
                    title="Print currently active cover template"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Active</span>
                  </button>

                  <button
                    onClick={() => setShowUnifiedCoverModal(false)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                    title="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 4-Tab Selector for Mother Box, Envelope Cover, Folder Cover & Table of Contents */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCoverModalTab('MOTHER')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      coverModalTab === 'MOTHER'
                        ? 'bg-amber-500 text-slate-950 shadow font-black'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>1. Mother Box Cover</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCoverModalTab('ENVELOPE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      coverModalTab === 'ENVELOPE'
                        ? 'bg-blue-600 text-white shadow font-black'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>2. Envelope Outer Cover</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCoverModalTab('FOLDER')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      coverModalTab === 'FOLDER'
                        ? 'bg-emerald-600 text-white shadow font-black'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>3. Folder Cover Page</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCoverModalTab('TOC')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      coverModalTab === 'TOC'
                        ? 'bg-purple-600 text-white shadow font-black'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>4. Table of Contents (TOC)</span>
                  </button>
                </div>

                {/* Sub-selectors for Envelope Tab */}
                {coverModalTab === 'ENVELOPE' && (
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 px-2 uppercase font-bold">Select Envelope:</span>
                    <button
                      type="button"
                      onClick={() => setCoverEnvelopeChoice('ENVELOPE_1')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        coverEnvelopeChoice === 'ENVELOPE_1'
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Envelope 1 (Technical)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverEnvelopeChoice('ENVELOPE_2')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        coverEnvelopeChoice === 'ENVELOPE_2'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Envelope 2 (Financial)
                    </button>
                  </div>
                )}

                {/* Sub-selectors for Folder & TOC Tabs */}
                {(coverModalTab === 'FOLDER' || coverModalTab === 'TOC') && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setCoverEnvelopeChoice('ENVELOPE_1')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          coverEnvelopeChoice === 'ENVELOPE_1'
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Env 1 (Technical)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoverEnvelopeChoice('ENVELOPE_2')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          coverEnvelopeChoice === 'ENVELOPE_2'
                            ? 'bg-emerald-600 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Env 2 (Financial)
                      </button>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      {(['ORIGINAL', 'COPY_1', 'COPY_2'] as FolderCopyType[]).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCoverFolderCopyChoice(c)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            coverFolderCopyChoice === c
                              ? 'bg-amber-500 text-slate-950 shadow font-black'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {c === 'ORIGINAL' ? 'Original' : c === 'COPY_1' ? 'Copy 1' : 'Copy 2'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Template Preview Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 flex flex-col items-center print:p-0 print:bg-white">
              
              {/* SINGLE ACTIVE PREVIEW SECTION */}
              <div className="single-cover-preview-section w-full flex justify-center">
                {/* ============================================================ */}
                {/* VIEW 1: MOTHER BOX LABEL COVER (MASTER ENCLOSURE)            */}
                {/* ============================================================ */}
                {coverModalTab === 'MOTHER' && (
                  <div className="landscape-unified-cover w-[13in] max-w-[1200px] min-h-[780px] aspect-[13/8.5] bg-white text-black p-6 sm:p-8 border-4 border-black flex flex-col justify-between font-sans relative shadow-2xl print:shadow-none print:border-4 print:p-6 print:m-0 box-border">
                    
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
                      
                      {/* Left Column (5 cols): Addressee & Outer Enclosures */}
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
                            📦 ENCLOSED ENVELOPES IN THIS MOTHER BOX:
                          </p>
                          <div className="space-y-1.5 pt-1 text-[11px]">
                            <div className="p-1.5 rounded bg-blue-50 border border-blue-200">
                              <strong className="text-blue-950 font-bold block">1. ENVELOPE 1: LEGAL & TECHNICAL DOCUMENTS</strong>
                              <span className="text-slate-700 text-[10px] block">Includes: Original, Copy 1 (Duplicate), Copy 2 (Triplicate)</span>
                            </div>
                            <div className="p-1.5 rounded bg-emerald-50 border border-emerald-200">
                              <strong className="text-emerald-950 font-bold block">2. ENVELOPE 2: FINANCIAL BID PROPOSAL</strong>
                              <span className="text-slate-700 text-[10px] block">Includes: Original, Copy 1 (Duplicate), Copy 2 (Triplicate)</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column (7 cols): Full Project Details, Mother Banner, and Warning */}
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

                        {/* Large Mother Envelope Identifier */}
                        <div className="p-3 border-4 border-black bg-black text-white text-center rounded-xl space-y-0.5 shadow-md">
                          <div className="font-mono font-black text-base uppercase tracking-wider text-amber-300">
                            MOTHER ENVELOPE: OFFICIAL BID PROPOSAL
                          </div>
                          <div className="text-[10px] font-sans font-semibold text-slate-200 uppercase">
                            MASTER OUTER ENVELOPE / ENCLOSING CONTAINER PURSUANT TO RA 12009 / RA 9184
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
                            documentName: 'Mother Envelope Outer Packaging Cover',
                            projectName: projectTitle,
                            dateTimeSubmitted: submissionDeadline,
                            companyName: currentTenant?.companyName,
                            solicitationNo: activeProject?.solicitationNo || (activeProject as any)?.solicitationNumber || 'SOL-2026-001'
                          }}
                          size={65}
                          className="border-2 border-black p-1 bg-white shrink-0"
                        />
                      </div>
                    </div>

                  </div>
                )}

                {/* ============================================================ */}
                {/* VIEW 2: ENVELOPE OUTER COVER (ENVELOPE 1 OR ENVELOPE 2)      */}
                {/* ============================================================ */}
                {coverModalTab === 'ENVELOPE' && (
                  <div className="landscape-unified-cover w-[13in] max-w-[1200px] min-h-[780px] aspect-[13/8.5] bg-white text-black p-6 sm:p-8 border-4 border-black flex flex-col justify-between font-sans relative shadow-2xl print:shadow-none print:border-4 print:p-6 print:m-0 box-border">
                    
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
                            <li>• <strong>Original Copy</strong> ({coverEnvelopeChoice === 'ENVELOPE_1' ? 'Technical & Legal' : 'Financial'})</li>
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
                            {coverEnvelopeChoice === 'ENVELOPE_1' 
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
                            documentName: coverEnvelopeChoice === 'ENVELOPE_1' ? 'Envelope 1 Technical Outer Cover' : 'Envelope 2 Financial Outer Cover',
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
                )}

                {/* ============================================================ */}
                {/* VIEW 3: FOLDER COVER PAGE (ORIGINAL / COPY 1 / COPY 2)       */}
                {/* ============================================================ */}
                {coverModalTab === 'FOLDER' && (
                  <div className="landscape-unified-cover w-[13in] max-w-[1200px] min-h-[780px] aspect-[13/8.5] bg-white text-black p-8 sm:p-10 border-4 border-black flex flex-col justify-between font-sans relative shadow-2xl print:shadow-none print:border-4 print:p-8 print:m-0 box-border">
                    
                    {/* Inner Frame */}
                    <div className="absolute inset-3 border-2 border-black rounded-xl pointer-events-none" />

                    {/* Header */}
                    <div className="text-center border-b-2 border-black pb-3 space-y-1 relative z-10">
                      <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-black">
                        {currentTenant?.companyName || 'BIDDING ENTERPRISE CORPORATION'}
                      </h1>
                      <p className="text-xs text-slate-700 font-medium">
                        {currentTenant?.address || 'Metro Manila, Philippines'} • TIN: <span className="font-mono font-bold">{currentTenant?.tin || '000-000-000-000'}</span> • PhilGEPS Platinum: <span className="font-bold text-blue-950">{currentTenant?.philgepsPlatinumNo || 'PLAT-2026-ACTIVE'}</span>
                      </p>
                    </div>

                    {/* Main Stately 2-Column Section */}
                    <div className="grid grid-cols-12 gap-6 my-4 relative z-10 flex-1 items-stretch">
                      
                      {/* Left Column: Project Details */}
                      <div className="col-span-6 space-y-4 text-left flex flex-col justify-between">
                        <div className="p-4 border-2 border-black bg-slate-50 rounded-xl space-y-1.5 shadow-sm">
                          <p className="text-[11px] uppercase font-mono font-black text-slate-500">SUBMITTED TO:</p>
                          <h3 className="text-base font-black uppercase text-blue-950 leading-tight">
                            THE BIDS AND AWARDS COMMITTEE
                          </h3>
                          <p className="text-xs font-bold text-slate-800 uppercase">{procuringEntity}</p>
                        </div>

                        <div className="p-4 border-2 border-black bg-slate-50 rounded-xl space-y-2 shadow-sm flex-1 flex flex-col justify-center">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Project Title / Name:</span>
                            <p className="text-sm font-black text-black uppercase leading-tight">{projectTitle}</p>
                          </div>
                          <div className="pt-2 border-t border-slate-300 grid grid-cols-2 gap-2 text-xs font-mono">
                            <div>
                              <span className="text-[9.5px] text-slate-500 block uppercase font-bold">PhilGEPS Ref:</span>
                              <strong className="text-blue-950 font-black">{projectRefNo}</strong>
                            </div>
                            <div>
                              <span className="text-[9.5px] text-slate-500 block uppercase font-bold">Approved Budget (ABC):</span>
                              <strong className="text-emerald-800 font-black">{activeProject?.abc || '₱0.00'}</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Prominent Folder Designation Box */}
                      <div className="col-span-6 flex flex-col justify-between text-left space-y-4">
                        
                        {/* Large Folder Badge */}
                        <div className="p-6 border-4 border-black bg-slate-950 text-white rounded-2xl text-center space-y-2 shadow-md flex-1 flex flex-col justify-center">
                          <div className="font-mono font-black text-3xl text-amber-300 uppercase tracking-widest">
                            📁 {coverFolderCopyChoice}
                          </div>
                          <div className="text-xs font-black text-slate-200 uppercase tracking-wider py-1 border-y border-slate-700">
                            {coverEnvelopeChoice === 'ENVELOPE_1' ? 'ENVELOPE 1: ELIGIBILITY & TECHNICAL COMPONENT' : 'ENVELOPE 2: FINANCIAL BID PROPOSAL'}
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono">
                            Official Certified Submission pursuant to RA 12009 / RA 9184 Standard PBDs
                          </p>
                        </div>

                        {/* Scheduled Bid Opening Box */}
                        <div className="p-3 border-2 border-red-600 bg-red-50 rounded-xl text-center">
                          <p className="text-xs font-bold text-red-800 uppercase">
                            Scheduled Bid Opening Deadline: <span className="font-black underline">{submissionDeadline}</span>
                          </p>
                        </div>

                      </div>

                    </div>

                    {/* Footer */}
                    <div className="border-t-2 border-black pt-3 flex items-center justify-between relative z-10 text-xs">
                      <div className="space-y-0.5 text-left">
                        <p className="text-[10px] font-mono font-bold uppercase text-slate-600">Certified Complete & Authentic By:</p>
                        <p className="text-sm font-black uppercase underline text-black tracking-wide">{currentTenant?.authorizedSignatory?.name || 'AUTHORIZED MANAGING OFFICER'}</p>
                        <p className="text-[11px] text-slate-700 font-medium">{currentTenant?.authorizedSignatory?.title || 'President'}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right text-[10px] font-mono text-slate-600">
                          <div className="font-bold text-black">{coverFolderCopyChoice} Cover QR</div>
                          <div>{projectRefNo}</div>
                        </div>
                        <DocumentQrCode
                          details={{
                            documentNumber: projectRefNo || 'PhilGEPS-2026-001',
                            documentName: `${coverFolderCopyChoice} — ${coverEnvelopeChoice === 'ENVELOPE_1' ? 'Envelope 1 Folder Cover' : 'Envelope 2 Folder Cover'}`,
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
                )}

                {/* ============================================================ */}
                {/* VIEW 4: TABLE OF CONTENTS (TOC - DEDICATED FULL PAGE)        */}
                {/* ============================================================ */}
                {coverModalTab === 'TOC' && (() => {
                  const targetFolderDocs = packageItems.filter(
                    i => i.envelope === coverEnvelopeChoice && i.folderCopy === coverFolderCopyChoice
                  );

                  return (
                    <div className="landscape-unified-cover w-[13in] max-w-[1200px] min-h-[780px] aspect-[13/8.5] bg-white text-black p-6 sm:p-8 border-4 border-black flex flex-col justify-between font-sans relative shadow-2xl print:shadow-none print:border-4 print:p-6 print:m-0 box-border">
                      
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

                      {/* Table of Contents Banner & Metadata Strip */}
                      <div className="relative z-10 space-y-2 my-2">
                        <div className="p-3 border-2 border-black bg-slate-900 text-white rounded-xl flex items-center justify-between gap-4 text-left">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-amber-300">
                                TABLE OF CONTENTS & STATUTORY CHECKLIST
                              </h2>
                              <span className={`px-2.5 py-0.5 rounded border text-[11px] font-mono font-black uppercase tracking-wider shadow-sm ${
                                coverFolderCopyChoice === 'ORIGINAL'
                                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                                  : coverFolderCopyChoice === 'COPY_1'
                                  ? 'bg-blue-500 text-white border-blue-400'
                                  : 'bg-purple-500 text-white border-purple-400'
                              }`}>
                                ★ {coverFolderCopyChoice === 'ORIGINAL' ? 'ORIGINAL COPY' : coverFolderCopyChoice === 'COPY_1' ? 'COPY 1 (DUPLICATE)' : 'COPY 2 (TRIPLICATE)'}
                              </span>
                            </div>
                            <p className="text-[10.5px] text-slate-300 font-medium">
                              {coverEnvelopeChoice === 'ENVELOPE_1' ? 'ENVELOPE 1: ELIGIBILITY & TECHNICAL COMPONENT' : 'ENVELOPE 2: FINANCIAL BID PROPOSAL'} • Official Submission Schedule
                            </p>
                          </div>

                          <div className="text-right text-[11px] font-mono text-slate-300 border-l border-slate-700 pl-4 shrink-0">
                            <div><strong className="text-white">PhilGEPS Ref:</strong> {projectRefNo}</div>
                            <div><strong className="text-emerald-400">ABC:</strong> {activeProject?.abc || '₱0.00'}</div>
                          </div>
                        </div>

                        {/* Full-Width Comprehensive Table of Contents Matrix */}
                        <div className="border-2 border-black overflow-hidden rounded-xl">
                          <table className="w-full text-left text-xs border-collapse font-sans">
                            <thead>
                              <tr className="bg-black text-white font-mono font-bold text-[10.5px]">
                                <th className="p-2 border-r border-slate-700 w-12 text-center">Tab #</th>
                                <th className="p-2 border-r border-slate-700">Document Title & Statutory Specification</th>
                                <th className="p-2 border-r border-slate-700 w-36 text-center">Reference Code</th>
                                <th className="p-2 border-r border-slate-700 w-28 text-center">Category</th>
                                <th className="p-2 border-r border-slate-700 w-28 text-center">Folder Copy</th>
                                <th className="p-2 w-36 text-center">Page Range in Bundle</th>
                              </tr>
                            </thead>
                            <tbody>
                              {targetFolderDocs.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="p-8 text-center text-slate-400 italic text-xs">
                                    (No documents attached to this {coverFolderCopyChoice} folder yet. Please use "Add Documents" in Bid Package to add completed forms.)
                                  </td>
                                </tr>
                              ) : (
                                targetFolderDocs.map((item, idx) => {
                                  let startP = 2;
                                  for (let k = 0; k < idx; k++) {
                                    startP += 1 + (targetFolderDocs[k].pageCount || 1);
                                  }
                                  const endP = startP + (1 + (item.pageCount || 1)) - 1;
                                  const rangeText = startP === endP ? `Page ${startP}` : `Page ${startP} to ${endP}`;

                                  return (
                                    <tr key={item.id} className="border-t border-slate-300 hover:bg-slate-50 text-[11px]">
                                      <td className="p-1.5 border-r border-slate-300 text-center font-mono font-bold bg-slate-100">
                                        TAB {idx + 1}
                                      </td>
                                      <td className="p-1.5 border-r border-slate-300 font-bold text-slate-950">
                                        {item.documentName}
                                      </td>
                                      <td className="p-1.5 border-r border-slate-300 text-center font-mono text-[10px] text-blue-950 font-bold">
                                        {item.documentNumber || projectRefNo || 'STAT-REF'}
                                      </td>
                                      <td className="p-1.5 border-r border-slate-300 text-center font-mono text-[10px] text-slate-700 font-semibold">
                                        {item.category}
                                      </td>
                                      <td className="p-1.5 border-r border-slate-300 text-center font-mono text-[10px] font-bold text-slate-900 bg-slate-50">
                                        {coverFolderCopyChoice}
                                      </td>
                                      <td className="p-1.5 text-center font-mono font-black text-slate-950 text-[10.5px] bg-amber-50/50">
                                        <span className="px-2 py-0.5 rounded border border-black/40 bg-white shadow-xs">
                                          {rangeText}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="border-t-2 border-black pt-2 flex items-center justify-between relative z-10 text-xs">
                        <div className="space-y-0.5 text-left">
                          <p className="text-[9.5px] font-mono font-bold uppercase text-slate-600">
                            Table of Contents Certified Correct ({coverFolderCopyChoice}) By:
                          </p>
                          <p className="text-sm font-black uppercase underline text-black tracking-wide">{currentTenant?.authorizedSignatory?.name || 'AUTHORIZED MANAGING OFFICER'}</p>
                          <p className="text-[10.5px] text-slate-700 font-medium">{currentTenant?.authorizedSignatory?.title || 'President'}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right text-[9.5px] font-mono text-slate-600">
                            <div className="font-bold text-black">{coverFolderCopyChoice} TOC QR</div>
                            <div>{projectRefNo}</div>
                          </div>
                          <DocumentQrCode
                            details={{
                              documentNumber: projectRefNo || 'PhilGEPS-2026-001',
                              documentName: `${coverFolderCopyChoice} — ${coverEnvelopeChoice === 'ENVELOPE_1' ? 'Envelope 1 Table of Contents' : 'Envelope 2 Table of Contents'}`,
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
                  );
                })()}
              </div>

              {/* OFFSCREEN & PRINT-ALL COMPLETE 15-ITEM PACKAGING SET */}
              <div 
                id="print-all-covers-section"
                className="print-all-covers-section fixed -left-[9999px] -top-[9999px] print:static print:block pointer-events-none opacity-0 print:opacity-100 overflow-hidden print:overflow-visible"
                aria-hidden={!isPrintingAllCovers}
              >
                {/* 1. Mother Box Label Cover */}
                <div id="cover-render-mother" className="landscape-unified-cover print-page">
                  <div className="text-center border-b-2 border-black pb-2 space-y-0.5">
                    <h1 className="text-xl font-black uppercase text-black">{currentTenant?.companyName || 'BIDDING ENTERPRISE CORPORATION'}</h1>
                    <p className="text-xs text-slate-700">{currentTenant?.address} • TIN: {currentTenant?.tin} • PhilGEPS: {currentTenant?.philgepsPlatinumNo}</p>
                  </div>
                  <div className="grid grid-cols-12 gap-4 my-2 text-left">
                    <div className="col-span-5 space-y-2">
                      <div className="p-3 border-2 border-black bg-slate-50 rounded-xl">
                        <p className="text-[10px] font-mono uppercase font-bold text-slate-600">SUBMITTED TO:</p>
                        <h2 className="text-base font-black uppercase text-blue-950">THE BIDS AND AWARDS COMMITTEE</h2>
                        <h3 className="text-xs font-black uppercase text-slate-900">{procuringEntity}</h3>
                      </div>
                      <div className="p-2.5 border-2 border-slate-900 bg-slate-100 rounded-xl text-xs">
                        <p className="font-bold text-black uppercase border-b border-slate-400 pb-1">📦 ENCLOSED ENVELOPES:</p>
                        <p className="pt-1 font-bold text-blue-950">1. ENVELOPE 1: LEGAL & TECHNICAL DOCUMENTS</p>
                        <p className="font-bold text-emerald-950">2. ENVELOPE 2: FINANCIAL BID PROPOSAL</p>
                      </div>
                    </div>
                    <div className="col-span-7 space-y-2">
                      <div className="border-2 border-black p-3 bg-slate-50 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Project Title:</span>
                        <p className="text-sm font-black text-black uppercase">{projectTitle}</p>
                        <div className="pt-1.5 border-t border-slate-300 grid grid-cols-2 gap-2 text-xs font-mono">
                          <div><strong>PhilGEPS:</strong> {projectRefNo}</div>
                          <div><strong>ABC:</strong> {activeProject?.abc || '₱0.00'}</div>
                        </div>
                      </div>
                      <div className="p-3 border-4 border-black bg-black text-white text-center rounded-xl font-mono font-black text-sm uppercase text-amber-300">
                        MOTHER ENVELOPE: OFFICIAL BID PROPOSAL
                      </div>
                      <div className="p-2 border-2 border-red-600 bg-red-50 text-center rounded-xl text-xs font-black text-red-700 uppercase">
                        ⚠️ WARNING: DO NOT OPEN BEFORE BID OPENING: {submissionDeadline}
                      </div>
                    </div>
                  </div>
                  <div className="border-t-2 border-black pt-2 flex items-center justify-between text-xs">
                    <div className="text-left">
                      <p className="text-[9px] font-mono uppercase text-slate-600">Authorized Managing Officer:</p>
                      <p className="text-sm font-black uppercase underline">{currentTenant?.authorizedSignatory?.name}</p>
                    </div>
                    <DocumentQrCode
                      details={{ documentNumber: projectRefNo || 'PhilGEPS-2026-001', documentName: 'Mother Envelope Outer Cover', projectName: projectTitle, dateTimeSubmitted: submissionDeadline, companyName: currentTenant?.companyName }}
                      size={55}
                      className="border-2 border-black p-0.5 bg-white"
                    />
                  </div>
                </div>

                {/* 2 & 3: Envelope 1 & Envelope 2 Outer Covers */}
                {(['ENVELOPE_1', 'ENVELOPE_2'] as ('ENVELOPE_1' | 'ENVELOPE_2')[]).map((env) => (
                  <div key={`cover-render-${env}`} id={env === 'ENVELOPE_1' ? 'cover-render-env1' : 'cover-render-env2'} className="landscape-unified-cover print-page">
                    <div className="text-center border-b-2 border-black pb-2 space-y-0.5">
                      <h1 className="text-xl font-black uppercase text-black">{currentTenant?.companyName || 'BIDDING ENTERPRISE CORPORATION'}</h1>
                      <p className="text-xs text-slate-700">{currentTenant?.address} • TIN: {currentTenant?.tin} • PhilGEPS: {currentTenant?.philgepsPlatinumNo}</p>
                    </div>
                    <div className="grid grid-cols-12 gap-4 my-2 text-left">
                      <div className="col-span-5 space-y-2">
                        <div className="p-3 border-2 border-black bg-slate-50 rounded-xl">
                          <p className="text-[10px] font-mono uppercase font-bold text-slate-600">SUBMITTED TO:</p>
                          <h2 className="text-base font-black uppercase text-blue-950">THE BIDS AND AWARDS COMMITTEE</h2>
                          <h3 className="text-xs font-black uppercase text-slate-900">{procuringEntity}</h3>
                        </div>
                        <div className="p-2.5 border-2 border-slate-900 bg-slate-100 rounded-xl text-xs">
                          <p className="font-bold text-black uppercase border-b border-slate-400 pb-1">📦 INCLUDED FOLDERS:</p>
                          <p className="pt-1 font-semibold">• Original Copy</p>
                          <p className="font-semibold">• Copy 1 (Duplicate)</p>
                          <p className="font-semibold">• Copy 2 (Triplicate)</p>
                        </div>
                      </div>
                      <div className="col-span-7 space-y-2">
                        <div className="border-2 border-black p-3 bg-slate-50 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Project Title:</span>
                          <p className="text-sm font-black text-black uppercase">{projectTitle}</p>
                          <div className="pt-1.5 border-t border-slate-300 grid grid-cols-2 gap-2 text-xs font-mono">
                            <div><strong>PhilGEPS:</strong> {projectRefNo}</div>
                            <div><strong>ABC:</strong> {activeProject?.abc || '₱0.00'}</div>
                          </div>
                        </div>
                        <div className="p-3 border-4 border-black bg-black text-white text-center rounded-xl font-mono font-black text-sm uppercase text-amber-300">
                          {env === 'ENVELOPE_1' ? 'ENVELOPE NO. 1: TECHNICAL & ELIGIBILITY COMPONENT' : 'ENVELOPE NO. 2: FINANCIAL BID PROPOSAL'}
                        </div>
                        <div className="p-2 border-2 border-red-600 bg-red-50 text-center rounded-xl text-xs font-black text-red-700 uppercase">
                          ⚠️ WARNING: DO NOT OPEN BEFORE BID OPENING: {submissionDeadline}
                        </div>
                      </div>
                    </div>
                    <div className="border-t-2 border-black pt-2 flex items-center justify-between text-xs">
                      <div className="text-left">
                        <p className="text-[9px] font-mono uppercase text-slate-600">Authorized Managing Officer:</p>
                        <p className="text-sm font-black uppercase underline">{currentTenant?.authorizedSignatory?.name}</p>
                      </div>
                      <DocumentQrCode
                        details={{ documentNumber: projectRefNo || 'PhilGEPS-2026-001', documentName: `${env} Outer Cover`, projectName: projectTitle, dateTimeSubmitted: submissionDeadline, companyName: currentTenant?.companyName }}
                        size={55}
                        className="border-2 border-black p-0.5 bg-white"
                      />
                    </div>
                  </div>
                ))}

                {/* 4 to 9: Folder Covers (Env 1 & Env 2 × Original, Copy 1, Copy 2) */}
                {(['ENVELOPE_1', 'ENVELOPE_2'] as ('ENVELOPE_1' | 'ENVELOPE_2')[]).map((env) =>
                  (['ORIGINAL', 'COPY_1', 'COPY_2'] as FolderCopyType[]).map((c) => (
                    <div key={`folder-${env}-${c}`} id={`cover-render-folder-${env === 'ENVELOPE_1' ? 'env1' : 'env2'}-${c.toLowerCase()}`} className="landscape-unified-cover print-page">
                      <div className="text-center border-b-2 border-black pb-3 space-y-1">
                        <h1 className="text-2xl font-black uppercase text-black">{currentTenant?.companyName || 'BIDDING ENTERPRISE CORPORATION'}</h1>
                        <p className="text-xs text-slate-700">{currentTenant?.address} • TIN: {currentTenant?.tin} • PhilGEPS: {currentTenant?.philgepsPlatinumNo}</p>
                      </div>
                      <div className="grid grid-cols-12 gap-6 my-4 text-left flex-1 items-stretch">
                        <div className="col-span-6 space-y-3 flex flex-col justify-between">
                          <div className="p-3 border-2 border-black bg-slate-50 rounded-xl">
                            <p className="text-[10px] font-mono uppercase font-bold text-slate-600">SUBMITTED TO:</p>
                            <h2 className="text-base font-black uppercase text-blue-950">THE BIDS AND AWARDS COMMITTEE</h2>
                            <h3 className="text-xs font-black uppercase text-slate-900">{procuringEntity}</h3>
                          </div>
                          <div className="p-3 border-2 border-black bg-slate-50 rounded-xl flex-1 flex flex-col justify-center">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">Project Title:</span>
                            <p className="text-sm font-black text-black uppercase">{projectTitle}</p>
                            <div className="pt-2 border-t border-slate-300 grid grid-cols-2 gap-2 text-xs font-mono">
                              <div><strong>PhilGEPS:</strong> {projectRefNo}</div>
                              <div><strong>ABC:</strong> {activeProject?.abc || '₱0.00'}</div>
                            </div>
                          </div>
                        </div>
                        <div className="col-span-6 flex flex-col justify-between space-y-3">
                          <div className="p-5 border-4 border-black bg-slate-950 text-white rounded-2xl text-center space-y-2 flex-1 flex flex-col justify-center">
                            <div className="font-mono font-black text-2xl text-amber-300 uppercase tracking-widest">📁 {c}</div>
                            <div className="text-xs font-black text-slate-200 uppercase">{env === 'ENVELOPE_1' ? 'ENVELOPE 1: ELIGIBILITY & TECHNICAL' : 'ENVELOPE 2: FINANCIAL PROPOSAL'}</div>
                          </div>
                          <div className="p-2 border-2 border-red-600 bg-red-50 text-center rounded-xl text-xs font-bold text-red-800">
                            Bid Opening Deadline: {submissionDeadline}
                          </div>
                        </div>
                      </div>
                      <div className="border-t-2 border-black pt-2 flex items-center justify-between text-xs">
                        <div className="text-left">
                          <p className="text-[9px] font-mono uppercase text-slate-600">Certified Complete & Authentic By:</p>
                          <p className="text-sm font-black uppercase underline">{currentTenant?.authorizedSignatory?.name}</p>
                        </div>
                        <DocumentQrCode
                          details={{ documentNumber: projectRefNo || 'PhilGEPS-2026-001', documentName: `${c} Folder Cover — ${env}`, projectName: projectTitle, dateTimeSubmitted: submissionDeadline, companyName: currentTenant?.companyName }}
                          size={55}
                          className="border-2 border-black p-0.5 bg-white"
                        />
                      </div>
                    </div>
                  ))
                )}

                {/* 10 to 15: Table of Contents (Env 1 & Env 2 × Original, Copy 1, Copy 2) */}
                {(['ENVELOPE_1', 'ENVELOPE_2'] as ('ENVELOPE_1' | 'ENVELOPE_2')[]).map((env) =>
                  (['ORIGINAL', 'COPY_1', 'COPY_2'] as FolderCopyType[]).map((c) => {
                    const fDocs = packageItems.filter(i => i.envelope === env && i.folderCopy === c);
                    return (
                      <div key={`toc-${env}-${c}`} id={`cover-render-toc-${env === 'ENVELOPE_1' ? 'env1' : 'env2'}-${c.toLowerCase()}`} className="landscape-unified-cover print-page">
                        <div className="text-center border-b-2 border-black pb-2 space-y-0.5">
                          <h1 className="text-xl font-black uppercase text-black">{currentTenant?.companyName || 'BIDDING ENTERPRISE CORPORATION'}</h1>
                          <p className="text-xs text-slate-700">{currentTenant?.address} • TIN: {currentTenant?.tin} • PhilGEPS: {currentTenant?.philgepsPlatinumNo}</p>
                        </div>
                        <div className="space-y-2 my-2 text-left">
                          <div className="p-2.5 border-2 border-black bg-slate-900 text-white rounded-xl flex items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h2 className="text-sm font-black uppercase tracking-wider text-amber-300">TABLE OF CONTENTS & STATUTORY CHECKLIST</h2>
                                <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-mono font-black uppercase">★ {c}</span>
                              </div>
                              <p className="text-[10px] text-slate-300">{env === 'ENVELOPE_1' ? 'ENVELOPE 1: ELIGIBILITY & TECHNICAL COMPONENT' : 'ENVELOPE 2: FINANCIAL BID PROPOSAL'}</p>
                            </div>
                            <div className="text-right text-[10.5px] font-mono text-slate-300">
                              <div><strong>PhilGEPS:</strong> {projectRefNo}</div>
                              <div><strong>ABC:</strong> {activeProject?.abc || '₱0.00'}</div>
                            </div>
                          </div>
                          <div className="border-2 border-black overflow-hidden rounded-xl">
                            <table className="w-full text-left text-xs border-collapse font-sans">
                              <thead>
                                <tr className="bg-black text-white font-mono font-bold text-[10px]">
                                  <th className="p-1.5 border-r border-slate-700 w-12 text-center">Tab #</th>
                                  <th className="p-1.5 border-r border-slate-700">Document Title / Specification</th>
                                  <th className="p-1.5 border-r border-slate-700 w-28 text-center">Category</th>
                                  <th className="p-1.5 border-r border-slate-700 w-20 text-center">Copy</th>
                                  <th className="p-1.5 w-32 text-center">Page Range in Bundle</th>
                                </tr>
                              </thead>
                              <tbody>
                                {fDocs.length === 0 ? (
                                  <tr><td colSpan={5} className="p-6 text-center text-slate-400 italic text-xs">(No documents attached)</td></tr>
                                ) : (
                                  fDocs.map((item, idx) => {
                                    let startP = 2;
                                    for (let k = 0; k < idx; k++) {
                                      startP += 1 + (fDocs[k].pageCount || 1);
                                    }
                                    const endP = startP + (1 + (item.pageCount || 1)) - 1;
                                    const rangeText = startP === endP ? `Page ${startP}` : `Page ${startP} to ${endP}`;

                                    return (
                                      <tr key={item.id} className="border-t border-slate-300 text-[10.5px]">
                                        <td className="p-1 border-r border-slate-300 text-center font-mono font-bold bg-slate-100">TAB {idx + 1}</td>
                                        <td className="p-1 border-r border-slate-300 font-bold">{item.documentName}</td>
                                        <td className="p-1 border-r border-slate-300 text-center font-mono text-[9.5px]">{item.category}</td>
                                        <td className="p-1 border-r border-slate-300 text-center font-mono text-[9.5px] font-bold">{c}</td>
                                        <td className="p-1 text-center font-mono font-black text-slate-950 text-[10px] bg-amber-50/50">
                                          <span className="px-2 py-0.5 rounded border border-black/40 bg-white">
                                            {rangeText}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div className="border-t-2 border-black pt-2 flex items-center justify-between text-xs">
                          <div className="text-left">
                            <p className="text-[9px] font-mono uppercase text-slate-600">Table of Contents Certified Correct ({c}) By:</p>
                            <p className="text-sm font-black uppercase underline">{currentTenant?.authorizedSignatory?.name}</p>
                          </div>
                          <DocumentQrCode
                            details={{ documentNumber: projectRefNo || 'PhilGEPS-2026-001', documentName: `${c} Table of Contents — ${env}`, projectName: projectTitle, dateTimeSubmitted: submissionDeadline, companyName: currentTenant?.companyName }}
                            size={55}
                            className="border-2 border-black p-0.5 bg-white"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
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
          activeProject={activeProject}
          projectRefNo={projectRefNo}
          projectTitle={projectTitle}
          procuringEntity={procuringEntity}
          vaultDocs={vaultDocs}
          onClose={() => setShowOrganizeModal(false)}
        />
      )}

      {/* MERGED BID PACKAGES FOLDER (PREVIEW & DOWNLOAD ORIGINAL, COPY 1, COPY 2) */}
      {showMergedPackageViewerModal && (
        <MergedPackageViewerModal
          isOpen={showMergedPackageViewerModal}
          onClose={() => setShowMergedPackageViewerModal(false)}
          items={packageItemsForMerge}
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
      <div className="fixed pointer-events-none" style={{ left: '-9999px', top: '0px', width: '816px', zIndex: -1 }} aria-hidden="true">
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

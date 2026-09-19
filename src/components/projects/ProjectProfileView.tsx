import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PhilGEPSOpportunity, ProcurementType, SectorType, LegalRegime, DocumentVaultItem, Tenant, DocCategory } from '../../types';
import { invalidateOpportunityProjectsCache, isProjectBidMergeDone } from '../../utils/opportunityProjects';
import { savePdfData, loadPdfData, deletePdfData, loadVaultItems } from '../../utils/vaultIndexedDB';
import { resolveDocumentPdfAttachment } from '../../utils/systemDocumentPdfGenerator';
import { PdfPreviewModal } from '../vault/PdfPreviewModal';
import { MergedPackageViewerModal } from '../vault/MergedPackageViewerModal';
import { PackageItem, FolderCopyType } from '../bids/bidpackage';
import { numberToWords } from '../../utils/numberToWords';
import { DocumentQrCode } from '../common/DocumentQrCode';
import { SpotlightCard } from '../common/SpotlightCard';
import { BorderBeam } from '../common/BorderBeam';
import { CyberBadge } from '../common/CyberBadge';
import { formatBytes } from '../../utils/storageScalability';
import {
  Briefcase,
  Search,
  Plus,
  Building2,
  Calendar,
  DollarSign,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileSignature,
  Edit3,
  Trash2,
  Copy,
  Printer,
  X,
  FileCheck,
  FolderKanban,
  Box,
  MapPin,
  Phone,
  Mail,
  UserCheck,
  Layers,
  Upload,
  Eye,
  Download,
  FileText,
  Receipt,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  FolderOpen,
  Award,
  HardHat,
  FileCheck2,
  Check,
  Percent,
  Calculator,
  Trophy,
  Sparkles,
  RefreshCw,
  HelpCircle,
  BookOpen,
  Folder,
  FileStack,
  Maximize2,
  Paperclip,
  Image as ImageIcon,
  UploadCloud
} from 'lucide-react';

// 15 Statutory Document Template Modals
import RlaModal from '../vault/templates/RLA';
import SwaModal from '../vault/templates/SWA';
import ProgressphotoModal from '../vault/templates/Progressphoto';
import MtsModal from '../vault/templates/MTS';
import CaModal from '../vault/templates/CA';
import AbpModal from '../vault/templates/ABP';
import WsModal from '../vault/templates/WS';
import PowModal from '../vault/templates/POW';
import BsModal from '../vault/templates/Bs';
import CmsModal from '../vault/templates/CMS';
import EupModal from '../vault/templates/EUP';
import FplModal from '../vault/templates/FPL';
import MpdsModal from '../vault/templates/mpds';
import PertModal from '../vault/templates/pert';
import SoteModal from '../vault/templates/sote';
import ToaModal from '../vault/templates/toa';
import PsdModal from '../vault/templates/psd';
import StatutoryDocumentsGuideModal from '../vault/templates/StatutoryDocumentsGuideModal';

interface ProjectProfileViewProps {
  setActiveTab: (tab: string) => void;
}

export interface StatutoryDocDefinition {
  id: string;
  name: string;
  category: 'LEGAL' | 'TECHNICAL' | 'FINANCIAL';
  envelope: 'ENVELOPE_1' | 'ENVELOPE_2';
  code: string;
  storageKey?: string;
  vaultMatchCategory?: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Document Slot Types
// ---------------------------------------------------------------------------
export interface ProjectDocAttachment {
  slotKey: string;
  slotTitle: string;
  category: 'WIN_DOCS' | 'FINAL_PAYMENT' | 'STATUTORY' | 'OTHER';
  fileName?: string;
  fileSizeBytes?: number;
  uploadedAt?: string;
  fileDataUrl?: string;
  notes?: string;
}

export interface ProjectExpenseItem {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  orNumber: string;
  paidBy: string;
  receiptFileName?: string;
  receiptFileType?: string;
  receiptFileSizeBytes?: number;
  receiptUploadedAt?: string;
  receiptDataUrl?: string;
}

const EXPENSE_CATEGORIES = [
  'Bidding Documents (ITB) Fee',
  'Bid Security / Surety Bond Premium',
  'Notarial & Legal Fees',
  'Site Inspection & Travel',
  'Laboratory Testing & Sample Preparation',
  'Post-Qualification Expenses',
  'Performance Bond Premium',
  'Contract Signing & Documentary Stamps',
  'Project Mobilization & Deliveries',
  'Miscellaneous & Office Supplies'
];

const WIN_DOC_SLOTS = [
  { key: 'post_qual', title: 'Post Qualification', desc: 'Post-Qualification Notice, Verification & Evaluation Clearances' },
  { key: 'noa', title: 'Notice of Award (NOA)', desc: 'Official Notice of Award issued by the Head of Procuring Entity' },
  { key: 'performance_bond', title: 'Performance Security: PSD / Performance Bond', desc: 'Performance Securing Declaration (PSD) OR Callable Surety Bond / Bank Guarantee' },
  { key: 'contract', title: 'Contract Agreement', desc: 'Signed and Notarized Government Contract Agreement' },
  { key: 'ntp', title: 'Notice to Proceed (NTP)', desc: 'Official Notice to Proceed with issuance date and contract effectivity' },
  { key: 'delivery_receipt', title: 'Delivery Receipt (DR)', desc: 'Official Delivery Receipt (DR) signed and stamped by Procuring Entity receiving personnel' },
  { key: 'delivery_proof', title: 'Delivery Proof / Turn-over Proof', desc: 'Photos of Delivered Goods, On-Site Turn-over Proof, or Inspection & Acceptance Report (IAR)' },
  { key: 'dole_cert', title: 'DOLE Certification (if applicable)', desc: 'DOLE BOSH / Approved Construction Safety and Health Program (CSHP)' }
];

const FINAL_PAYMENT_DOC_SLOTS = [
  { key: 'voucher', title: 'Disbursement Voucher / Payment Voucher', desc: 'Official Government Disbursement Voucher (DV) / Entity Payment Processing Voucher' },
  { key: 'cert_completion_acceptance', title: 'Certificate of Completion / Letter of Acceptance', desc: 'Official Certificate of Project Completion and Letter of Final Acceptance from Procuring Entity' },
  { key: 'pic_cheque', title: 'Picture of Cheque', desc: 'Photo / Scanned Copy of Government Issued Check, LDDAP-ADA, or Warrant of Payment' },
  { key: 'pic_sales_invoice', title: 'Picture of Sales Invoice / Service Invoice', desc: 'Official Sales Invoice (SI), Billing Statement, or Service Invoice registered with BIR' },
  { key: 'final_payment_cert', title: 'Final Billing & Inspection Acceptance (IAR)', desc: 'Final Statement of Account, Inspection & Acceptance Report, or Final Payment Clearance' },
  { key: 'brgy_cert', title: 'Certificate from Barangay (BRGY)', desc: 'Barangay Clearance & Project Completion Certificate from Local LGU' },
  { key: 'bir_tax_clearance', title: 'Tax Clearance from BIR', desc: 'Final BIR Tax Clearance & Certificate of Final Tax Withheld (BIR Form 2306/2307)' },
  { key: 's_curve', title: 'Final S-Curve / Progress Chart', desc: 'Final Progress S-Curve Chart, Physical vs Financial Accomplishment Report' }
];

export interface StatutoryTemplateSlot {
  key: string;
  name: string;
  code: string;
  templateType: 'RLA' | 'SWA' | 'PROGRESS_PHOTO' | 'MTS' | 'CA' | 'ABP' | 'WS' | 'BS' | 'CMS' | 'EUP' | 'FPL' | 'MPDS' | 'PERT' | 'SOTE' | 'TOA' | 'POW';
  isUploadOnly?: boolean;
  description: string;
}

export const STATUTORY_DOCUMENT_SLOTS: StatutoryTemplateSlot[] = [
  {
    key: 'pow',
    name: 'Program of Work (POW) & Terms of Reference (TOR)',
    code: 'POW',
    templateType: 'POW',
    description: 'Itemized detailed cost estimate, direct/indirect markups, and integrated Terms of Reference PDF attachment.'
  },
  {
    key: 'rla',
    name: 'Request Letter for Advance Payment / Mobilization',
    code: 'RLA',
    templateType: 'RLA',
    description: 'Formal request letter for 15% mobilization fund with project details and bank guarantee references.'
  },
  {
    key: 'swa',
    name: 'Statement of Work Accomplished (SWA)',
    code: 'SWA',
    templateType: 'SWA',
    description: 'Detailed billing breakdown of work items, percent accomplishment, recoupment and retention.'
  },
  {
    key: 'progress_photo',
    name: 'Progress Photos Documentation',
    code: 'PHOTO',
    templateType: 'PROGRESS_PHOTO',
    isUploadOnly: true,
    description: 'Upload PDF / site photo albums showing Before, During, and After milestones.'
  },
  {
    key: 'mts',
    name: 'Materials Testing Reports (MTS)',
    code: 'MTS',
    templateType: 'MTS',
    description: 'Quality control and laboratory materials testing log (ASTM/DPWH standards).'
  },
  {
    key: 'ca',
    name: "Contractor's Affidavit (CA)",
    code: 'CA',
    templateType: 'CA',
    description: 'Sworn notarial affidavit certifying full payment of labor, materials, suppliers and taxes.'
  },
  {
    key: 'abp',
    name: 'As-Built Plan (ABP)',
    code: 'ABP',
    templateType: 'ABP',
    description: 'As-Built plan drawings index checklist and complete blueprint PDF attachment.'
  },
  {
    key: 'ws',
    name: 'Warranty Security (WS)',
    code: 'WS',
    templateType: 'WS',
    isUploadOnly: true,
    description: 'Upload official Warranty Bond / Bank Guarantee under Section 62 of RA 9184.'
  },
  {
    key: 'bs',
    name: 'Billing Statement (BS)',
    code: 'BS',
    templateType: 'BS',
    description: 'Statement of account, statutory tax deductions, and bank remittance instructions.'
  },
  {
    key: 'cms',
    name: 'Construction Method Statement (CMS)',
    code: 'CMS',
    templateType: 'CMS',
    description: 'Comprehensive engineering methodology and sequence of execution.'
  },
  {
    key: 'eup',
    name: 'Equipment Utilization Plan (EUP)',
    code: 'EUP',
    templateType: 'EUP',
    description: 'Heavy equipment schedule, plate numbers, and monthly deployment timeline.'
  },
  {
    key: 'fpl',
    name: 'Final Payment Letter (FPL)',
    code: 'FPL',
    templateType: 'FPL',
    description: 'Formal request letter for 100% completion billing and release of retention money.'
  },
  {
    key: 'mpds',
    name: 'Manpower Deployment Schedule (MPDS)',
    code: 'MPDS',
    templateType: 'MPDS',
    description: 'Key personnel and labor workforce headcount distribution per month.'
  },
  {
    key: 'pert',
    name: 'PERT/CPM Network Schedule',
    code: 'PERT',
    templateType: 'PERT',
    description: 'Activity schedule, early/late dates, float, critical path and milestone weights.'
  },
  {
    key: 'sote',
    name: 'Statement of Time Elapsed (SOTE)',
    code: 'SOTE',
    templateType: 'SOTE',
    description: 'Contract duration tracking, NTP date, approved extensions, and slippage percentage.'
  },
  {
    key: 'toa',
    name: 'Turn-Over Agreement (TOA)',
    code: 'TOA',
    templateType: 'TOA',
    description: 'Joint memorandum of agreement for official project turnover and acceptance.'
  }
];

const formatPhpCurrency = (val: number | string): string => {
  if (val === '' || val === null || val === undefined) return '₱0.00';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return '₱0.00';
  return '₱' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parsePhpCurrency = (val: string): number => {
  const cleaned = val.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export const getProjectBidFormAmount = (
  tenantId: string,
  projectScopeKey: string,
  selectedOppId?: string,
  fallbackAbc: number = 0
): { amount: number; amountFigures: string; amountWords: string; source: string } => {
  const candidateKeys = [
    `bidocs_bidform_infra_${tenantId}_${projectScopeKey}`,
    `bidocs_bidform_goods_${tenantId}_${projectScopeKey}`,
    `bidocs_bidform_consulting_${tenantId}_${projectScopeKey}`,
    `bidocs_bidform_${tenantId}_${projectScopeKey}`,
    `bidocs_detailed_estimates_${tenantId}_${projectScopeKey}`,
    `bidocs_price_schedule_goods_${tenantId}_${projectScopeKey}`,
    `bidocs_summary_bid_price_${tenantId}_${projectScopeKey}`,
    // Un-prefixed or tenant-scoped variants
    `bidform_infra_${tenantId}_${projectScopeKey}`,
    `bidform_goods_${tenantId}_${projectScopeKey}`,
    `detailed_estimates_${tenantId}_${projectScopeKey}`
  ];

  if (selectedOppId) {
    candidateKeys.push(
      `bidocs_bidform_infra_${tenantId}_${selectedOppId}`,
      `bidocs_bidform_goods_${tenantId}_${selectedOppId}`,
      `bidocs_bidform_consulting_${tenantId}_${selectedOppId}`,
      `bidocs_bidform_${tenantId}_${selectedOppId}`,
      `bidocs_detailed_estimates_${tenantId}_${selectedOppId}`,
      `bidform_infra_${tenantId}_${selectedOppId}`,
      `bidform_goods_${tenantId}_${selectedOppId}`
    );
  }

  for (const key of candidateKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        let num = 0;
        let fig = '';
        let words = '';

        if (typeof parsed.totalBidAmount === 'number' && parsed.totalBidAmount > 0) {
          num = parsed.totalBidAmount;
          fig = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          words = parsed.totalBidAmountWords || numberToWords(num);
        } else if (parsed.totalBidAmountFigures && parsed.totalBidAmountFigures !== '0.00') {
          num = parseFloat(`${parsed.totalBidAmountFigures}`.replace(/[^0-9.]/g, '')) || 0;
          fig = parsed.totalBidAmountFigures;
          words = parsed.totalBidAmountWords || numberToWords(num);
        } else if (typeof parsed.totalEstimatedProjectCost === 'number' && parsed.totalEstimatedProjectCost > 0) {
          num = parsed.totalEstimatedProjectCost;
          fig = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          words = parsed.totalBidAmountWords || numberToWords(num);
        } else if (typeof parsed.totalPriceOffered === 'number' && parsed.totalPriceOffered > 0) {
          num = parsed.totalPriceOffered;
          fig = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          words = parsed.totalBidAmountWords || numberToWords(num);
        } else if (typeof parsed.grandTotal === 'number' && parsed.grandTotal > 0) {
          num = parsed.grandTotal;
          fig = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          words = numberToWords(num);
        } else if (typeof parsed.totalAmount === 'number' && parsed.totalAmount > 0) {
          num = parsed.totalAmount;
          fig = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          words = numberToWords(num);
        } else if (parsed.materials && Array.isArray(parsed.materials) && parsed.materials.length > 0) {
          num = parsed.materials.reduce((acc: number, m: any) => acc + (Number(m.quantity) || 0) * (Number(m.unitPrice) || 0), 0);
          if (num > 0) {
            fig = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            words = numberToWords(num);
          }
        }

        if (num > 0) {
          return {
            amount: num,
            amountFigures: fig,
            amountWords: words,
            source: key.includes('infra')
              ? 'Infrastructure Financial Bid Form'
              : key.includes('goods')
              ? 'Goods Financial Bid Form'
              : key.includes('consulting')
              ? 'Consulting Financial Bid Form'
              : key.includes('detailed_estimates')
              ? 'Detailed Estimates Schedule'
              : 'Financial Bid Offer Form'
          };
        }
      }
    } catch {}
  }

  // Fallback to ABC if no custom Bid Form was filled yet
  if (fallbackAbc > 0) {
    return {
      amount: fallbackAbc,
      amountFigures: fallbackAbc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      amountWords: numberToWords(fallbackAbc),
      source: 'Approved Budget for Contract (ABC Baseline)'
    };
  }

  return {
    amount: 0,
    amountFigures: '0.00',
    amountWords: 'ZERO PESOS ONLY',
    source: 'No Bid Form Found'
  };
};

export const ProjectProfileView: React.FC<ProjectProfileViewProps> = ({ setActiveTab }) => {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id || '';

  // 1. Projects State
  const [projects, setProjects] = useState<PhilGEPSOpportunity[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // 6 Required Tabs
  const [activeTabSection, setActiveTabSection] = useState<'general' | 'win_docs' | 'final_payment' | 'expenses' | 'bid_docs' | 'statutory_docs' | 'other_docs'>('general');

  // Active Project for the entire workspace
  const [activeWorkspaceRef, setActiveWorkspaceRef] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`bidocs_active_vault_project_${tenantId}`) || localStorage.getItem('bidocs_active_vault_project') || '';
      return saved;
    } catch {
      return '';
    }
  });

  // Only projects whose bid documents have been merged & completed in Bid Package Builder are visible in Project Profile
  const mergedProjects = useMemo(() => {
    return projects.filter(p => isProjectBidMergeDone(tenantId, p));
  }, [projects, tenantId]);

  // Selected Project Object (Scoped to merged projects only)
  const selectedProject = useMemo(() => {
    return mergedProjects.find(p => p.id === selectedProjectId) || (mergedProjects.length > 0 ? mergedProjects[0] : null);
  }, [mergedProjects, selectedProjectId]);

  const projectScopeKey = selectedProject ? (selectedProject.projectReferenceNumber || selectedProject.philgepsRefNo) : 'default';

  // ---------------------------------------------------------------------------
  // Win Project Status & Winning Bid Form Amount State (3 Options: WIN, LOSE, DQ)
  // ---------------------------------------------------------------------------
  const [projectWinStatus, setProjectWinStatus] = useState<'UNSPECIFIED' | 'WIN' | 'LOSE' | 'DQ'>('UNSPECIFIED');
  const [winningBidData, setWinningBidData] = useState<{ amount: number; amountFigures: string; amountWords: string; source: string }>({
    amount: 0,
    amountFigures: '0.00',
    amountWords: 'ZERO PESOS ONLY',
    source: 'Bid Form'
  });

  // ---------------------------------------------------------------------------
  // 2. Win DOCs & Final Payment Docs & Statutory Docs & Other Docs State
  // ---------------------------------------------------------------------------
  const [winDocs, setWinDocs] = useState<Record<string, ProjectDocAttachment>>({});
  const [finalPaymentDocs, setFinalPaymentDocs] = useState<Record<string, ProjectDocAttachment>>({});
  const [statutoryDocs, setStatutoryDocs] = useState<Record<string, ProjectDocAttachment>>({});
  const [activeStatutoryModal, setActiveStatutoryModal] = useState<string | null>(null);
  const [showPsdModal, setShowPsdModal] = useState(false);
  const [showStatutoryGuideModal, setShowStatutoryGuideModal] = useState(false);
  const [selectedStatutoryGuideCode, setSelectedStatutoryGuideCode] = useState<string>('RLA');
  const [otherDocs, setOtherDocs] = useState<ProjectDocAttachment[]>([]);
  
  // Expenses State
  const [expenses, setExpenses] = useState<ProjectExpenseItem[]>([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ProjectExpenseItem | null>(null);
  
  // Modals & PDF Previews
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [previewPdfModal, setPreviewPdfModal] = useState<{ title: string; dataUrl?: string; fileName: string } | null>(null);
  const [showNewOtherDocModal, setShowNewOtherDocModal] = useState(false);
  const [newOtherDocTitle, setNewOtherDocTitle] = useState('');

  // Re-sync Win Status & Bid Form Amount when selectedProject changes
  useEffect(() => {
    if (!tenantId || !projectScopeKey || !selectedProject) return;

    const savedStatus = localStorage.getItem(`bidocs_project_win_status_${tenantId}_${projectScopeKey}`) as any;
    const isAwarded = selectedProject.status === 'AWARDED' || savedStatus === 'WIN' || savedStatus === 'WON';

    if (isAwarded) {
      setProjectWinStatus('WIN');
      const bidData = getProjectBidFormAmount(tenantId, projectScopeKey, selectedProject.id, selectedProject.approvedBudget);
      setWinningBidData(bidData);
    } else if (savedStatus === 'LOSE' || savedStatus === 'LOST') {
      setProjectWinStatus('LOSE');
      const bidData = getProjectBidFormAmount(tenantId, projectScopeKey, selectedProject.id, selectedProject.approvedBudget);
      setWinningBidData(bidData);
    } else if (savedStatus === 'DQ') {
      setProjectWinStatus('DQ');
      const bidData = getProjectBidFormAmount(tenantId, projectScopeKey, selectedProject.id, selectedProject.approvedBudget);
      setWinningBidData(bidData);
    } else {
      setProjectWinStatus('UNSPECIFIED');
      const bidData = getProjectBidFormAmount(tenantId, projectScopeKey, selectedProject.id, selectedProject.approvedBudget);
      setWinningBidData(bidData);
    }
  }, [tenantId, projectScopeKey, selectedProject?.id, selectedProject?.status]);

  const handleConfirmWin = (status: 'WIN' | 'LOSE' | 'DQ') => {
    setProjectWinStatus(status);
    try {
      localStorage.setItem(`bidocs_project_win_status_${tenantId}_${projectScopeKey}`, status);
      
      if (status === 'WIN' && selectedProject) {
        const bidData = getProjectBidFormAmount(tenantId, projectScopeKey, selectedProject.id, selectedProject.approvedBudget);
        setWinningBidData(bidData);

        // Update project status to AWARDED
        const updatedProjects = projects.map(p => {
          if (p.id === selectedProject.id) {
            return { ...p, status: 'AWARDED' as const };
          }
          return p;
        });
        setProjects(updatedProjects);
        localStorage.setItem(`bidocs_opportunities_${tenantId}`, JSON.stringify(updatedProjects));
        localStorage.setItem('bidocs_opportunities', JSON.stringify(updatedProjects));
        invalidateOpportunityProjectsCache();
      } else if (status === 'LOSE' && selectedProject) {
        const updatedProjects = projects.map(p => {
          if (p.id === selectedProject.id) {
            return { ...p, status: 'AWARDED_TO_OTHERS' as const };
          }
          return p;
        });
        setProjects(updatedProjects);
        localStorage.setItem(`bidocs_opportunities_${tenantId}`, JSON.stringify(updatedProjects));
        localStorage.setItem('bidocs_opportunities', JSON.stringify(updatedProjects));
        invalidateOpportunityProjectsCache();
      } else if (status === 'DQ' && selectedProject) {
        const updatedProjects = projects.map(p => {
          if (p.id === selectedProject.id) {
            return { ...p, status: 'CANCELLED' as const };
          }
          return p;
        });
        setProjects(updatedProjects);
        localStorage.setItem(`bidocs_opportunities_${tenantId}`, JSON.stringify(updatedProjects));
        localStorage.setItem('bidocs_opportunities', JSON.stringify(updatedProjects));
        invalidateOpportunityProjectsCache();
      }
    } catch (e) {
      console.error('[ProjectProfileView] Error saving win status:', e);
    }
  };

  // ---------------------------------------------------------------------------
  // 2B. Bid Docs Repository & Merged 3-Copy Package Viewer State
  // ---------------------------------------------------------------------------
  const [vaultDocs, setVaultDocs] = useState<DocumentVaultItem[]>([]);
  const [previewVaultDoc, setPreviewVaultDoc] = useState<DocumentVaultItem | null>(null);
  const [showMergedPackageViewerModal, setShowMergedPackageViewerModal] = useState(false);
  const [mergedModalFolderCopy, setMergedModalFolderCopy] = useState<FolderCopyType>('ORIGINAL');
  const [bidDocCategoryFilter, setBidDocCategoryFilter] = useState<'ALL' | 'LEGAL' | 'TECHNICAL' | 'FINANCIAL'>('ALL');
  const [bidDocSearchQuery, setBidDocSearchQuery] = useState('');
  const [isGeneratingDocPdf, setIsGeneratingDocPdf] = useState<string | null>(null);

  // Load Vault Items & PDF Data URLs from IndexedDB + Completed Forms
  useEffect(() => {
    if (!tenantId) return;
    loadVaultItems(tenantId).then(async (docs) => {
      const combinedDocs: DocumentVaultItem[] = Array.isArray(docs) ? [...docs] : [];
      try {
        const rawCompleted = localStorage.getItem(`bidocs_completed_notarized_${tenantId}`);
        if (rawCompleted) {
          const parsed = JSON.parse(rawCompleted);
          if (Array.isArray(parsed)) {
            parsed.forEach((form: any) => {
              if (!combinedDocs.some(d => d.id === form.id)) {
                combinedDocs.push({
                  id: form.id,
                  tenantId,
                  documentName: form.title || form.formCode,
                  documentCode: form.formCode,
                  documentNumber: form.projectRefNo || '',
                  category: 'TECHNICAL',
                  procurementApplicability: ['INFRASTRUCTURE', 'GOODS', 'CONSULTING_SERVICES'],
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
      } catch (e) {}

      await Promise.all(
        combinedDocs.map(async (d) => {
          try {
            const data = await loadPdfData(d.id);
            if (data) d.fileDataUrl = data;
          } catch (_) {}
        })
      );
      setVaultDocs(combinedDocs);
    }).catch(e => console.error('[ProjectStatus] Failed to load vault items:', e));
  }, [tenantId, projectScopeKey]);

  // Project Classification Inference
  const isInfraProject = useMemo(() => {
    if (selectedProject?.procurementType) {
      const cat = selectedProject.procurementType.toUpperCase();
      if (cat.includes('INFRA') || cat.includes('CIVIL')) return true;
      if (cat.includes('GOOD')) return false;
      if (cat.includes('CONSULT')) return false;
    }
    const combined = `${selectedProject?.projectReferenceNumber || ''} ${selectedProject?.title || ''}`.toUpperCase();
    return combined.includes('CONSTRUCT') || combined.includes('CIVIL WORKS') || combined.includes('ROAD OPENING') || combined.includes('DRAINAGE SYSTEM') || combined.includes('INFRASTRUCTURE') || combined.includes('BUILDING');
  }, [selectedProject]);

  const isConsultingProject = useMemo(() => {
    if (selectedProject?.procurementType) {
      const cat = selectedProject.procurementType.toUpperCase();
      if (cat.includes('CONSULT')) return true;
      if (cat.includes('INFRA') || cat.includes('GOOD')) return false;
    }
    const titleLower = (selectedProject?.title || '').toLowerCase();
    return titleLower.includes('consult') || titleLower.includes('feasibility') || titleLower.includes('master plan');
  }, [selectedProject]);

  // Master Statutory Bidding Documents Checklist definitions (Legal, Technical, Financial)
  const statutoryDocsList: StatutoryDocDefinition[] = useMemo(() => {
    const list: StatutoryDocDefinition[] = [
      // 1. PhilGEPS Platinum Certificate of Registration
      { id: 'PHILGEPS_PLATINUM', name: 'PhilGEPS Platinum Certificate of Registration (Annex A)', category: 'LEGAL', envelope: 'ENVELOPE_1', code: 'PHILGEPS_PLATINUM', vaultMatchCategory: 'ELIGIBILITY_CLASS_A', description: 'Mandatory Class A Platinum 2026 Certificate & Annex A Eligibility Documents' },
      // 2. Statement of All Ongoing Government & Private Contracts
      { id: 'ONGOING_CONTRACTS', name: 'Statement of All Ongoing Government & Private Contracts', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'ONGOING_CONTRACTS', storageKey: `bidocs_ongoing_${tenantId}_${projectScopeKey}`, description: 'Statement of ongoing government & private contracts including awarded but not yet started' },
      // 3. Statement of Single Largest Completed Contract (SLCC)
      { id: 'SLCC_STATEMENT', name: 'Statement of Single Largest Completed Contract (SLCC)', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'SLCC_STATEMENT', storageKey: `bidocs_slcc_${tenantId}_${projectScopeKey}`, description: 'Similar completed contract within prescribed period complying with 50% ABC threshold' },
      // 4. Bid Securing Declaration / Bid Security
      { id: 'BID_SECURING_DECLARATION', name: 'Bid Securing Declaration / Bid Security or Surety Bond (BSD)', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'BID_SECURING_DECLARATION', storageKey: `bidocs_bsd_${tenantId}_${projectScopeKey}`, description: 'GPPB un-notarized/notarized Bid Securing Declaration or Bank Guarantee/Surety' },
      // 5. Section VI: Schedule of Requirements
      { id: 'SECTION_VI_REQUIREMENTS', name: 'Section VI: Schedule of Requirements', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'SECTION_VI_REQUIREMENTS', storageKey: `bidocs_sec_vi_${tenantId}_${projectScopeKey}`, description: 'Schedule of delivery commitments, milestones, and site destinations' },
      // 6. Section VII: Technical Specifications Statement of Compliance
      { id: 'TECH_SPECS_SECTION_VII', name: 'Section VII: Technical Specifications Statement of Compliance', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'TECH_SPECS_SECTION_VII', storageKey: `bidocs_tech_specs_${tenantId}_${projectScopeKey}`, description: 'Item-by-item Statement of Compliance with BAC tender parameters' },
      // 7. Framework Agreement List
      { id: 'FRAMEWORK_AGREEMENT_LIST', name: 'Framework Agreement List', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'FRAMEWORK_AGREEMENT_LIST', storageKey: `bidocs_fal_${tenantId}_${projectScopeKey}`, description: 'Itemized Framework Agreement call-off schedules and parameters' },
      // 8. Organizational Chart, Manpower Requirements & Key Personnel
      { id: 'ORGANIZATIONAL_CHART', name: 'Organizational Chart for the Contract to be Bid', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'ORGANIZATIONAL_CHART', storageKey: `bidocs_org_chart_${tenantId}_${projectScopeKey}`, description: 'Project management deployment hierarchy and command structure' },
      { id: 'KEY_PERSONNEL', name: 'Key Personnel Matrix, Bio-Data & PRC Certifications', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'KEY_PERSONNEL', storageKey: `bidocs_key_personnel_${tenantId}_${projectScopeKey}`, description: 'Professional qualifications, PRC licenses, and experience bio-data of key technical team' },
      { id: 'MAJOR_EQUIPMENT', name: "Contractor's Major Equipment Utilization Matrix", category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'MAJOR_EQUIPMENT', storageKey: `bidocs_equipment_${tenantId}_${projectScopeKey}`, description: 'Owned, leased, or purchase-agreement heavy machinery and equipment roster' },
      // 9. After-Sales Services & Warranty Undertaking
      { id: 'AFTERSALES_WARRANTY', name: 'After-Sales Services & Warranty Undertaking', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'AFTERSALES_WARRANTY', storageKey: `bidocs_aftersale_${tenantId}_${projectScopeKey}`, description: 'Commitment for spare parts availability, technical response, and maintenance support' },
      // 10. Omnibus Sworn Statement (OSS)
      { id: 'OMNIBUS_SWORN_STATEMENT', name: 'Omnibus Sworn Statement (OSS)', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'OMNIBUS_SWORN_STATEMENT', storageKey: `bidocs_oss_${tenantId}_${projectScopeKey}`, description: '10-point GPPB statutory notarized affidavit on bidder integrity and non-blacklisting' },
      // 11. Net Financial Contracting Capacity (NFCC) Computation
      { id: 'NFCC_COMPUTATION', name: 'Net Financial Contracting Capacity (NFCC) Computation', category: 'TECHNICAL', envelope: 'ENVELOPE_1', code: 'NFCC_COMPUTATION', storageKey: `bidocs_nfcc_${tenantId}_${projectScopeKey}`, description: 'Statutory NFCC formula computation based on current assets, liabilities, and ongoing contracts' },
      // 12. Audited Financial Statements (AFS)
      { id: 'AUDITED_FS', name: 'Audited Financial Statements (AFS) stamped received by BIR', category: 'LEGAL', envelope: 'ENVELOPE_1', code: 'AUDITED_FS', vaultMatchCategory: 'ELIGIBILITY_CLASS_A', description: 'BIR-received balance sheet, income statement, and independent auditor report' },
      // 13. Mayor's / Business Permit (Current Year)
      { id: 'MAYORS_PERMIT', name: "Mayor's / Business Permit (Current Year)", category: 'LEGAL', envelope: 'ENVELOPE_1', code: 'MAYORS_PERMIT', vaultMatchCategory: 'ELIGIBILITY_CLASS_A', description: 'Valid mayor or business permit issued by LGU of principal place of business' },
      // 14. PCAB License and Special License
      { id: 'PCAB_LICENSE', name: 'PCAB License and Special License (for Infrastructure)', category: 'LEGAL', envelope: 'ENVELOPE_1', code: 'PCAB_LICENSE', vaultMatchCategory: 'ELIGIBILITY_CLASS_A', description: 'Valid Philippine Contractors Accreditation Board category & classification license' },
      // 15. SEC / DTI Certificate of Business Registration
      { id: 'SEC_DTI_REG', name: 'SEC / DTI Certificate of Business Registration', category: 'LEGAL', envelope: 'ENVELOPE_1', code: 'SEC_DTI_REG', vaultMatchCategory: 'ELIGIBILITY_CLASS_A', description: 'SEC Articles of Incorporation / DTI Business Name Certificate / CDA Registration' },
      // 16. BIR Certificate of Registration (BIR Form 2303)
      { id: 'BIR_REGISTRATION', name: 'BIR Certificate of Registration (BIR Form 2303)', category: 'LEGAL', envelope: 'ENVELOPE_1', code: 'BIR_REGISTRATION', vaultMatchCategory: 'ELIGIBILITY_CLASS_A', description: 'Tax identification certificate with registered tax types' },
      // 17. BIR Tax Clearance Certificate for Bidding
      { id: 'TAX_CLEARANCE', name: 'BIR Tax Clearance Certificate for Bidding (EO 398)', category: 'LEGAL', envelope: 'ENVELOPE_1', code: 'TAX_CLEARANCE', vaultMatchCategory: 'ELIGIBILITY_CLASS_A', description: 'Executive Order 398 tax clearance for government bidding purposes' },
      // 18. Secretary's Certificate / Board Resolution / SPA
      { id: 'SECRETARY_CERTIFICATE', name: "Secretary's Certificate / Board Resolution / Special Power of Attorney (SPA)", category: 'LEGAL', envelope: 'ENVELOPE_1', code: 'SECRETARY_CERTIFICATE', vaultMatchCategory: 'ELIGIBILITY_CLASS_A', description: 'Corporate authorization granting signatory full authority to execute bid documents' },
      // 19. Joint Venture Agreement (JVA)
      { id: 'JOINT_VENTURE_AGREEMENT', name: 'Joint Venture Agreement (JVA) / Class B Legal Documents', category: 'LEGAL', envelope: 'ENVELOPE_1', code: 'JOINT_VENTURE_AGREEMENT', vaultMatchCategory: 'ELIGIBILITY_CLASS_B', description: 'Valid JVA or notarized statements from joint venture partners (if applicable)' },
    ];

    // Envelope 2: Financial Proposal Documents
    if (isInfraProject) {
      list.push({ id: 'FINANCIAL_BID_FORM_INFRA', name: 'Financial Bid Form (Infrastructure)', category: 'FINANCIAL', envelope: 'ENVELOPE_2', code: 'GPPB-BIDFORM-INFRASTRUCTURE', storageKey: `bidocs_bidform_infra_${tenantId}_${projectScopeKey}`, description: 'Official statutory GPPB Financial Bid Form with lump-sum offer and breakdown' });
    } else if (isConsultingProject) {
      list.push({ id: 'FINANCIAL_BID_FORM_CONSULTING', name: 'Financial Bid Form (Consulting)', category: 'FINANCIAL', envelope: 'ENVELOPE_2', code: 'GPPB-BIDFORM-CONSULTING', storageKey: `bidocs_bidform_consulting_${tenantId}_${projectScopeKey}`, description: 'Statutory Financial Proposal Submission Form and remuneration schedules' });
    } else {
      list.push({ id: 'FINANCIAL_BID_FORM_GOODS', name: 'Financial Bid Form (Goods)', category: 'FINANCIAL', envelope: 'ENVELOPE_2', code: 'GPPB-BIDFORM-GOODS', storageKey: `bidocs_bidform_goods_${tenantId}_${projectScopeKey}`, description: 'Official statutory GPPB Financial Bid Form for supply & delivery of goods' });
    }

    list.push({ id: 'BILL_OF_QUANTITIES', name: 'Bill of Quantities (BOQ Breakdown)', category: 'FINANCIAL', envelope: 'ENVELOPE_2', code: 'BILL_OF_QUANTITIES', storageKey: `bidocs_boq_${tenantId}_${projectScopeKey}`, description: 'Itemized unit price and total cost matrix for every tender pay item' });
    list.push({ id: 'DETAILED_ESTIMATES_FORM_L', name: '(Form L) Detailed Estimates (Direct Labor, Logistics & Equipment)', category: 'FINANCIAL', envelope: 'ENVELOPE_2', code: 'DETAILED_ESTIMATES_FORM_L', storageKey: `bidocs_detailed_estimates_${tenantId}_${projectScopeKey}`, description: 'Unit cost breakdown showing direct materials, direct labor, equipment expenses, OCM, and profit' });
    list.push({ id: 'PRICE_SCHEDULE_GOODS', name: 'Detailed Price Schedule for Goods (Domestic & Foreign)', category: 'FINANCIAL', envelope: 'ENVELOPE_2', code: 'PRICE_SCHEDULE_GOODS', storageKey: `bidocs_pricesched_${tenantId}_${projectScopeKey}`, description: 'Price Schedule for goods offered from abroad or within the Philippines' });
    list.push({ id: 'SUMMARY_BID_PRICES', name: 'Summary of Bid Prices & Lump-Sum Breakdown', category: 'FINANCIAL', envelope: 'ENVELOPE_2', code: 'SUMMARY_BID_PRICES', storageKey: `bidocs_summary_bid_price_${tenantId}_${projectScopeKey}`, description: 'Consolidated summary of bid prices across project components' });
    list.push({ id: 'CASH_FLOW_BY_QUARTER', name: 'Cash Flow by Quarter and Payment Schedule (SF-INFR-56)', category: 'FINANCIAL', envelope: 'ENVELOPE_2', code: 'CASH_FLOW_BY_QUARTER', storageKey: `bidocs_cash_flow_${tenantId}_${projectScopeKey}`, description: 'Quarterly financial disbursements and milestone progress billing schedule' });

    return list;
  }, [tenantId, projectScopeKey, isInfraProject, isConsultingProject]);

  // Derived Package Items for Merged Package Modal
  const computedPackageItems = useMemo<PackageItem[]>(() => {
    if (!selectedProject) return [];
    return statutoryDocsList.map(doc => {
      const vaultMatch = vaultDocs.find(v => 
        (doc.vaultMatchCategory && v.category === doc.vaultMatchCategory) ||
        (v.documentCode && v.documentCode.toUpperCase() === doc.code.toUpperCase()) ||
        (v.documentName && v.documentName.toLowerCase().includes(doc.name.toLowerCase()))
      );

      return {
        id: doc.id,
        documentName: doc.name,
        documentNumber: selectedProject.projectReferenceNumber || selectedProject.philgepsRefNo,
        category: doc.category,
        envelope: doc.envelope,
        folderCopy: 'ORIGINAL' as FolderCopyType,
        code: doc.code,
        vaultDocId: vaultMatch?.id,
        fileName: vaultMatch?.fileName || `${doc.id.toLowerCase()}.pdf`,
        fileDataUrl: vaultMatch?.fileDataUrl,
        storageKey: doc.storageKey,
        dateAdded: new Date().toISOString().split('T')[0]
      };
    });
  }, [statutoryDocsList, vaultDocs, selectedProject]);

  // Filtered Bid Docs List
  const filteredBidDocs = useMemo(() => {
    return statutoryDocsList.filter(doc => {
      if (bidDocCategoryFilter !== 'ALL' && doc.category !== bidDocCategoryFilter) {
        return false;
      }
      if (bidDocSearchQuery.trim()) {
        const query = bidDocSearchQuery.toLowerCase();
        const matchesName = doc.name.toLowerCase().includes(query);
        const matchesCode = doc.code.toLowerCase().includes(query);
        const matchesDesc = (doc.description || '').toLowerCase().includes(query);
        return matchesName || matchesCode || matchesDesc;
      }
      return true;
    });
  }, [statutoryDocsList, bidDocCategoryFilter, bidDocSearchQuery]);

  // Bid Doc Preview & Download Handlers
  const handlePreviewBidDoc = async (doc: StatutoryDocDefinition) => {
    setIsGeneratingDocPdf(doc.id);
    const vaultMatch = vaultDocs.find(v => 
      (doc.vaultMatchCategory && v.category === doc.vaultMatchCategory) ||
      (v.documentCode && v.documentCode.toUpperCase() === doc.code.toUpperCase()) ||
      (v.documentName && v.documentName.toLowerCase().includes(doc.name.toLowerCase()))
    );

    let dataUrl = vaultMatch?.fileDataUrl;
    if (!dataUrl) {
      try {
        const generated = await resolveDocumentPdfAttachment(
          {
            id: doc.id,
            documentName: doc.name,
            category: doc.category,
            documentNumber: selectedProject?.projectReferenceNumber || selectedProject?.philgepsRefNo,
            vaultDocId: vaultMatch?.id
          },
          {
            tenant: currentTenant,
            projectRefNo: selectedProject?.projectReferenceNumber || selectedProject?.philgepsRefNo || '',
            projectTitle: selectedProject?.title || ''
          }
        );
        if (generated) dataUrl = generated;
      } catch (err) {
        console.warn('Could not auto-generate PDF for doc:', doc.name, err);
      }
    }
    setIsGeneratingDocPdf(null);

    const mappedCategory: DocCategory = doc.category === 'LEGAL' 
      ? 'ELIGIBILITY_CLASS_A' 
      : (doc.category === 'FINANCIAL' ? 'FINANCIAL' : 'TECHNICAL');

    setPreviewVaultDoc({
      id: doc.id,
      tenantId,
      documentName: doc.name,
      documentCode: doc.code,
      documentNumber: selectedProject?.projectReferenceNumber || selectedProject?.philgepsRefNo || '',
      category: mappedCategory,
      procurementApplicability: ['INFRASTRUCTURE', 'GOODS', 'CONSULTING_SERVICES'],
      legalBasisReference: 'RA 9184 / RA 12009 Standards',
      versionNumber: 1,
      fileHash: '',
      fileSizeBytes: 1048576,
      fileName: `${doc.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
      fileDataUrl: dataUrl || undefined,
      uploadedByName: currentTenant?.authorizedSignatory?.name || 'Authorized Signatory',
      isOptional: false,
      requiresIssueDate: false,
      requiresExpiryDate: false,
      status: 'ACTIVE',
      projectTitle: selectedProject?.title || '',
      philgepsRefNo: selectedProject?.philgepsRefNo || '',
      previousVersions: []
    });
  };

  const handleDownloadBidDoc = async (doc: StatutoryDocDefinition) => {
    setIsGeneratingDocPdf(doc.id);
    const vaultMatch = vaultDocs.find(v => 
      (doc.vaultMatchCategory && v.category === doc.vaultMatchCategory) ||
      (v.documentCode && v.documentCode.toUpperCase() === doc.code.toUpperCase()) ||
      (v.documentName && v.documentName.toLowerCase().includes(doc.name.toLowerCase()))
    );

    let dataUrl = vaultMatch?.fileDataUrl;
    if (!dataUrl) {
      try {
        const generated = await resolveDocumentPdfAttachment(
          {
            id: doc.id,
            documentName: doc.name,
            category: doc.category,
            documentNumber: selectedProject?.projectReferenceNumber || selectedProject?.philgepsRefNo,
            vaultDocId: vaultMatch?.id
          },
          {
            tenant: currentTenant,
            projectRefNo: selectedProject?.projectReferenceNumber || selectedProject?.philgepsRefNo || '',
            projectTitle: selectedProject?.title || ''
          }
        );
        if (generated) dataUrl = generated;
      } catch (err) {
        console.warn('Could not auto-generate PDF for download:', doc.name, err);
      }
    }
    setIsGeneratingDocPdf(null);

    if (dataUrl) {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${(selectedProject?.projectReferenceNumber || selectedProject?.philgepsRefNo || 'BID')}_${doc.id}_${doc.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleOpenMergedPackage = (copyType: FolderCopyType) => {
    setMergedModalFolderCopy(copyType);
    setShowMergedPackageViewerModal(true);
  };

  // Load Projects from localStorage
  const loadProjectsFromStorage = () => {
    if (!tenantId) return;
    try {
      const saved = localStorage.getItem(`bidocs_opportunities_${tenantId}`) || localStorage.getItem('bidocs_opportunities');
      if (saved) {
        const parsed: PhilGEPSOpportunity[] = JSON.parse(saved);
        setProjects(parsed);
        const mergedList = parsed.filter(p => isProjectBidMergeDone(tenantId, p));
        if (mergedList.length > 0 && !selectedProjectId) {
          const matched = mergedList.find(p => p.projectReferenceNumber === activeWorkspaceRef || p.philgepsRefNo === activeWorkspaceRef);
          setSelectedProjectId(matched ? matched.id : mergedList[0].id);
        }
      } else {
        setProjects([]);
      }
    } catch (e) {
      console.error('[ProjectProfileView] Error loading projects:', e);
      setProjects([]);
    }
  };

  useEffect(() => {
    loadProjectsFromStorage();
  }, [tenantId]);

  // Load Project-Specific Documents & Expenses when project changes
  useEffect(() => {
    if (!tenantId || !projectScopeKey) return;

    // Load Win Docs Metadata
    try {
      const savedWin = localStorage.getItem(`bidocs_win_docs_${tenantId}_${projectScopeKey}`);
      if (savedWin) {
        setWinDocs(JSON.parse(savedWin));
      } else {
        setWinDocs({});
      }
    } catch {
      setWinDocs({});
    }

    // Load Final Payment Docs Metadata
    try {
      const savedFinal = localStorage.getItem(`bidocs_final_payment_docs_${tenantId}_${projectScopeKey}`);
      if (savedFinal) {
        setFinalPaymentDocs(JSON.parse(savedFinal));
      } else {
        setFinalPaymentDocs({});
      }
    } catch {
      setFinalPaymentDocs({});
    }

    // Load Statutory Docs Metadata
    try {
      const savedStatutory = localStorage.getItem(`bidocs_statutory_docs_${tenantId}_${projectScopeKey}`);
      if (savedStatutory) {
        setStatutoryDocs(JSON.parse(savedStatutory));
      } else {
        setStatutoryDocs({});
      }
    } catch {
      setStatutoryDocs({});
    }

    // Load Other Docs
    try {
      const savedOther = localStorage.getItem(`bidocs_other_docs_${tenantId}_${projectScopeKey}`);
      if (savedOther) {
        setOtherDocs(JSON.parse(savedOther));
      } else {
        setOtherDocs([]);
      }
    } catch {
      setOtherDocs([]);
    }

    // Load Expenses
    try {
      const savedExp = localStorage.getItem(`bidocs_project_expenses_${tenantId}_${projectScopeKey}`);
      if (savedExp) {
        setExpenses(JSON.parse(savedExp));
      } else {
        setExpenses([]);
      }
    } catch {
      setExpenses([]);
    }
  }, [tenantId, projectScopeKey]);

  // ---------------------------------------------------------------------------
  // File Upload Handlers (IndexedDB backed)
  // ---------------------------------------------------------------------------
  const handleUploadSlotDoc = async (
    slotKey: string,
    slotTitle: string,
    category: 'WIN_DOCS' | 'FINAL_PAYMENT',
    file: File
  ) => {
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name);

    if (!isPdf && !isImage) {
      alert('Please upload a valid PDF document or image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const docKey = `proj_${category.toLowerCase()}_${tenantId}_${projectScopeKey}_${slotKey}`;
      
      try {
        await savePdfData(docKey, dataUrl);
      } catch (err) {
        console.error('[ProjectProfileView] Error saving document to IndexedDB:', err);
      }

      const docItem: ProjectDocAttachment = {
        slotKey,
        slotTitle,
        category,
        fileName: file.name,
        fileSizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
        fileDataUrl: dataUrl
      };

      if (category === 'WIN_DOCS') {
        const updated = { ...winDocs, [slotKey]: docItem };
        setWinDocs(updated);
        try {
          const cleanStorage = { ...updated };
          Object.keys(cleanStorage).forEach(k => {
            cleanStorage[k] = { ...cleanStorage[k], fileDataUrl: undefined };
          });
          localStorage.setItem(`bidocs_win_docs_${tenantId}_${projectScopeKey}`, JSON.stringify(cleanStorage));
        } catch (e) {}
      } else {
        const updated = { ...finalPaymentDocs, [slotKey]: docItem };
        setFinalPaymentDocs(updated);
        try {
          const cleanStorage = { ...updated };
          Object.keys(cleanStorage).forEach(k => {
            cleanStorage[k] = { ...cleanStorage[k], fileDataUrl: undefined };
          });
          localStorage.setItem(`bidocs_final_payment_docs_${tenantId}_${projectScopeKey}`, JSON.stringify(cleanStorage));
        } catch (e) {}
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePsdToSlotDoc = async (dataUrl?: string, customName?: string) => {
    if (!dataUrl) {
      setShowPsdModal(false);
      return;
    }
    const slotKey = 'performance_bond';
    const slotTitle = 'Performance Security: PSD / Performance Bond';
    const category = 'WIN_DOCS';
    const docKey = `proj_${category.toLowerCase()}_${tenantId}_${projectScopeKey}_${slotKey}`;
    try {
      await savePdfData(docKey, dataUrl);
    } catch (err) {
      console.error('[ProjectProfileView] Error saving PSD to IndexedDB:', err);
    }
    const fileName = `${(customName || 'Performance_Securing_Declaration_PSD').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    const approxBytes = Math.round((dataUrl.length * 3) / 4);
    const docItem: ProjectDocAttachment = {
      slotKey,
      slotTitle,
      category,
      fileName,
      fileSizeBytes: approxBytes,
      uploadedAt: new Date().toISOString(),
      fileDataUrl: dataUrl
    };
    const updated: Record<string, ProjectDocAttachment> = { ...winDocs, [slotKey]: docItem };
    setWinDocs(updated);
    try {
      const cleanStorage: Record<string, ProjectDocAttachment> = { ...updated };
      Object.keys(cleanStorage).forEach(k => {
        cleanStorage[k] = { ...cleanStorage[k], fileDataUrl: undefined };
      });
      localStorage.setItem(`bidocs_win_docs_${tenantId}_${projectScopeKey}`, JSON.stringify(cleanStorage));
    } catch (e) {}
    setShowPsdModal(false);
  };

  const handlePreviewSlotDoc = async (
    slotKey: string,
    slotTitle: string,
    category: 'WIN_DOCS' | 'FINAL_PAYMENT',
    docMeta?: ProjectDocAttachment
  ) => {
    let dataUrl = docMeta?.fileDataUrl;
    if (!dataUrl) {
      const docKey = `proj_${category.toLowerCase()}_${tenantId}_${projectScopeKey}_${slotKey}`;
      try {
        dataUrl = await loadPdfData(docKey);
      } catch (e) {}
    }

    if (dataUrl) {
      setPreviewPdfModal({
        title: slotTitle,
        fileName: docMeta?.fileName || `${slotTitle}.pdf`,
        dataUrl
      });
    } else {
      alert('Document binary not found or still loading.');
    }
  };

  const handleDeleteSlotDoc = async (
    slotKey: string,
    category: 'WIN_DOCS' | 'FINAL_PAYMENT'
  ) => {
    if (!confirm(`Are you sure you want to remove this attached document?`)) return;

    const docKey = `proj_${category.toLowerCase()}_${tenantId}_${projectScopeKey}_${slotKey}`;
    try {
      await deletePdfData(docKey);
    } catch (e) {}

    if (category === 'WIN_DOCS') {
      const updated = { ...winDocs };
      delete updated[slotKey];
      setWinDocs(updated);
      localStorage.setItem(`bidocs_win_docs_${tenantId}_${projectScopeKey}`, JSON.stringify(updated));
    } else {
      const updated = { ...finalPaymentDocs };
      delete updated[slotKey];
      setFinalPaymentDocs(updated);
      localStorage.setItem(`bidocs_final_payment_docs_${tenantId}_${projectScopeKey}`, JSON.stringify(updated));
    }
  };

  // ---------------------------------------------------------------------------
  // Statutory Documents Handlers
  // ---------------------------------------------------------------------------
  const handleSaveStatutoryDoc = async (
    slotKey: string,
    fileDataUrl?: string,
    customName?: string,
    projectRef?: string,
    projTitle?: string
  ) => {
    if (!fileDataUrl) return;

    const docKey = `proj_statutory_${tenantId}_${projectScopeKey}_${slotKey}`;
    try {
      await savePdfData(docKey, fileDataUrl);
    } catch (err) {
      console.error('[Statutory] Error saving to IndexedDB:', err);
    }

    const docItem: ProjectDocAttachment = {
      slotKey,
      slotTitle: customName || slotKey.toUpperCase(),
      category: 'STATUTORY',
      fileName: `${(customName || slotKey).toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
      fileSizeBytes: fileDataUrl.length ? Math.round((fileDataUrl.length * 3) / 4) : 1024,
      uploadedAt: new Date().toISOString(),
      fileDataUrl
    };

    const updated = { ...statutoryDocs, [slotKey]: docItem };
    setStatutoryDocs(updated);
    try {
      const cleanStorage = { ...updated };
      Object.keys(cleanStorage).forEach(k => {
        cleanStorage[k] = { ...cleanStorage[k], fileDataUrl: undefined };
      });
      localStorage.setItem(`bidocs_statutory_docs_${tenantId}_${projectScopeKey}`, JSON.stringify(cleanStorage));
    } catch (e) {}
  };

  const handlePreviewStatutoryDoc = async (slotKey: string, slotTitle: string) => {
    const docMeta = statutoryDocs[slotKey];
    let dataUrl = docMeta?.fileDataUrl;
    if (!dataUrl) {
      const docKey = `proj_statutory_${tenantId}_${projectScopeKey}_${slotKey}`;
      try {
        dataUrl = await loadPdfData(docKey);
      } catch (e) {}
    }

    if (dataUrl) {
      setPreviewPdfModal({
        title: slotTitle,
        fileName: docMeta?.fileName || `${slotTitle}.pdf`,
        dataUrl
      });
    } else {
      alert('Statutory document PDF not found. Please fill or upload the form first.');
    }
  };

  const handleDeleteStatutoryDoc = async (slotKey: string, slotTitle: string) => {
    if (!confirm(`Are you sure you want to clear/delete ${slotTitle}?`)) return;

    const docKey = `proj_statutory_${tenantId}_${projectScopeKey}_${slotKey}`;
    try {
      await deletePdfData(docKey);
    } catch (e) {}

    const updated = { ...statutoryDocs };
    delete updated[slotKey];
    setStatutoryDocs(updated);
    try {
      localStorage.setItem(`bidocs_statutory_docs_${tenantId}_${projectScopeKey}`, JSON.stringify(updated));
    } catch (e) {}
  };

  // ---------------------------------------------------------------------------
  // Other Documents Upload Handler
  // ---------------------------------------------------------------------------
  const handleUploadOtherDoc = async (file: File) => {
    if (!newOtherDocTitle.trim()) {
      alert('Please provide a document title.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const slotId = 'other_' + Date.now();
      const docKey = `proj_other_${tenantId}_${projectScopeKey}_${slotId}`;

      try {
        await savePdfData(docKey, dataUrl);
      } catch (err) {}

      const newItem: ProjectDocAttachment = {
        slotKey: slotId,
        slotTitle: newOtherDocTitle.trim(),
        category: 'OTHER',
        fileName: file.name,
        fileSizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
        fileDataUrl: dataUrl
      };

      const updated = [newItem, ...otherDocs];
      setOtherDocs(updated);
      try {
        const cleanList = updated.map(item => ({ ...item, fileDataUrl: undefined }));
        localStorage.setItem(`bidocs_other_docs_${tenantId}_${projectScopeKey}`, JSON.stringify(cleanList));
      } catch (e) {}

      setShowNewOtherDocModal(false);
      setNewOtherDocTitle('');
    };
    reader.readAsDataURL(file);
  };

  // ---------------------------------------------------------------------------
  // Expenses Handlers & Receipt Attachment Management
  // ---------------------------------------------------------------------------
  const [expenseFormDate, setExpenseFormDate] = useState(new Date().toISOString().substring(0, 10));
  const [expenseFormCategory, setExpenseFormCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expenseFormDesc, setExpenseFormDesc] = useState('');
  const [expenseFormAmount, setExpenseFormAmount] = useState('');
  const [expenseFormOr, setExpenseFormOr] = useState('');
  const [expenseFormPaidBy, setExpenseFormPaidBy] = useState(currentTenant?.authorizedSignatory?.name || '');
  const [expenseFormReceiptName, setExpenseFormReceiptName] = useState('');
  const [expenseFormReceiptType, setExpenseFormReceiptType] = useState('');
  const [expenseFormReceiptSize, setExpenseFormReceiptSize] = useState<number | undefined>(undefined);
  const [expenseFormReceiptDataUrl, setExpenseFormReceiptDataUrl] = useState('');

  const handleOpenNewExpenseModal = () => {
    setEditingExpense(null);
    setExpenseFormDate(new Date().toISOString().substring(0, 10));
    setExpenseFormCategory(EXPENSE_CATEGORIES[0]);
    setExpenseFormDesc('');
    setExpenseFormAmount('');
    setExpenseFormOr('');
    setExpenseFormPaidBy(currentTenant?.authorizedSignatory?.name || '');
    setExpenseFormReceiptName('');
    setExpenseFormReceiptType('');
    setExpenseFormReceiptSize(undefined);
    setExpenseFormReceiptDataUrl('');
    setShowExpenseModal(true);
  };

  const handleOpenEditExpenseModal = async (exp: ProjectExpenseItem) => {
    setEditingExpense(exp);
    setExpenseFormDate(exp.date);
    setExpenseFormCategory(exp.category);
    setExpenseFormDesc(exp.description);
    setExpenseFormAmount(formatPhpCurrency(exp.amount).replace('₱', '').trim());
    setExpenseFormOr(exp.orNumber === 'N/A' ? '' : exp.orNumber);
    setExpenseFormPaidBy(exp.paidBy);
    setExpenseFormReceiptName(exp.receiptFileName || '');
    setExpenseFormReceiptType(exp.receiptFileType || '');
    setExpenseFormReceiptSize(exp.receiptFileSizeBytes);
    
    let dataUrl = exp.receiptDataUrl || '';
    if (!dataUrl && exp.receiptFileName) {
      try {
        dataUrl = (await loadPdfData(`proj_exp_rcpt_${tenantId}_${projectScopeKey}_${exp.id}`)) || '';
      } catch (e) {}
    }
    setExpenseFormReceiptDataUrl(dataUrl);
    setShowExpenseModal(true);
  };

  const handleExpenseReceiptFileChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setExpenseFormReceiptName(file.name);
      setExpenseFormReceiptType(file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'));
      setExpenseFormReceiptSize(file.size);
      setExpenseFormReceiptDataUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveReceiptInModal = () => {
    setExpenseFormReceiptName('');
    setExpenseFormReceiptType('');
    setExpenseFormReceiptSize(undefined);
    setExpenseFormReceiptDataUrl('');
  };

  const handleDirectUploadReceipt = async (expenseId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const rcptKey = `proj_exp_rcpt_${tenantId}_${projectScopeKey}_${expenseId}`;
      try {
        await savePdfData(rcptKey, dataUrl);
      } catch (err) {
        console.error('Error saving receipt binary to IndexedDB:', err);
      }

      const updated = expenses.map(exp => {
        if (exp.id === expenseId) {
          return {
            ...exp,
            receiptFileName: file.name,
            receiptFileType: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
            receiptFileSizeBytes: file.size,
            receiptUploadedAt: new Date().toISOString(),
            receiptDataUrl: dataUrl
          };
        }
        return exp;
      });

      setExpenses(updated);
      try {
        const cleanStorage = updated.map(e => ({ ...e, receiptDataUrl: undefined }));
        localStorage.setItem(`bidocs_project_expenses_${tenantId}_${projectScopeKey}`, JSON.stringify(cleanStorage));
      } catch (e) {}
    };
    reader.readAsDataURL(file);
  };

  const handleViewExpenseReceipt = async (exp: ProjectExpenseItem) => {
    let dataUrl = exp.receiptDataUrl;
    if (!dataUrl && exp.receiptFileName) {
      const rcptKey = `proj_exp_rcpt_${tenantId}_${projectScopeKey}_${exp.id}`;
      try {
        dataUrl = (await loadPdfData(rcptKey)) || undefined;
      } catch (e) {}
    }

    if (dataUrl) {
      setPreviewPdfModal({
        title: `Official Receipt / Proof of Payment — ${exp.description}`,
        fileName: exp.receiptFileName || `Receipt-${exp.orNumber || exp.id}.pdf`,
        dataUrl
      });
    } else {
      alert('Receipt attachment could not be loaded.');
    }
  };

  const handleSaveExpense = async () => {
    const amt = parsePhpCurrency(expenseFormAmount);
    if (!expenseFormDesc.trim()) {
      alert('Please enter an expense description.');
      return;
    }
    if (amt <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }

    const expId = editingExpense ? editingExpense.id : ('exp_' + Date.now());

    if (expenseFormReceiptDataUrl) {
      const rcptKey = `proj_exp_rcpt_${tenantId}_${projectScopeKey}_${expId}`;
      try {
        await savePdfData(rcptKey, expenseFormReceiptDataUrl);
      } catch (err) {
        console.error('Error saving receipt binary:', err);
      }
    } else if (editingExpense && !expenseFormReceiptName && editingExpense.receiptFileName) {
      const rcptKey = `proj_exp_rcpt_${tenantId}_${projectScopeKey}_${expId}`;
      try {
        await deletePdfData(rcptKey);
      } catch (e) {}
    }

    const item: ProjectExpenseItem = {
      id: expId,
      date: expenseFormDate,
      category: expenseFormCategory,
      description: expenseFormDesc.trim(),
      amount: amt,
      orNumber: expenseFormOr.trim() || 'N/A',
      paidBy: expenseFormPaidBy.trim() || 'Finance / Project Custodian',
      receiptFileName: expenseFormReceiptName || undefined,
      receiptFileType: expenseFormReceiptType || undefined,
      receiptFileSizeBytes: expenseFormReceiptSize || undefined,
      receiptUploadedAt: expenseFormReceiptName ? (editingExpense?.receiptUploadedAt || new Date().toISOString()) : undefined,
      receiptDataUrl: expenseFormReceiptDataUrl || undefined
    };

    let updated: ProjectExpenseItem[] = [];
    if (editingExpense) {
      updated = expenses.map(e => e.id === item.id ? item : e);
    } else {
      updated = [item, ...expenses];
    }

    setExpenses(updated);
    try {
      const cleanStorage = updated.map(e => ({ ...e, receiptDataUrl: undefined }));
      localStorage.setItem(`bidocs_project_expenses_${tenantId}_${projectScopeKey}`, JSON.stringify(cleanStorage));
    } catch (e) {}

    setShowExpenseModal(false);
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm('Delete this expense record and its attached receipt?')) {
      const rcptKey = `proj_exp_rcpt_${tenantId}_${projectScopeKey}_${id}`;
      try {
        await deletePdfData(rcptKey);
      } catch (e) {}
      const updated = expenses.filter(e => e.id !== id);
      setExpenses(updated);
      try {
        const cleanStorage = updated.map(e => ({ ...e, receiptDataUrl: undefined }));
        localStorage.setItem(`bidocs_project_expenses_${tenantId}_${projectScopeKey}`, JSON.stringify(cleanStorage));
      } catch (e) {}
    }
  };

  const totalProjectExpenses = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + curr.amount, 0);
  }, [expenses]);

  const expenseAbcPercentage = useMemo(() => {
    if (!selectedProject || !selectedProject.approvedBudget || selectedProject.approvedBudget === 0) return 0;
    return (totalProjectExpenses / selectedProject.approvedBudget) * 100;
  }, [totalProjectExpenses, selectedProject]);

  const expensesWithReceiptsCount = useMemo(() => {
    return expenses.filter(e => !!e.receiptFileName).length;
  }, [expenses]);

  // ---------------------------------------------------------------------------
  // Project Edit / Add Handlers
  // ---------------------------------------------------------------------------
  const [formId, setFormId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formPhilgepsRefNo, setFormPhilgepsRefNo] = useState('');
  const [formSolNo, setFormSolNo] = useState('');
  const [formProjRefNo, setFormProjRefNo] = useState('');
  const [formCategory, setFormCategory] = useState<ProcurementType>('GOODS');
  const [formSector, setFormSector] = useState<SectorType>('Government');
  const [formRegime, setFormRegime] = useState<LegalRegime>('RA_9184');
  const [formAbc, setFormAbc] = useState<number>(0);
  const [formAbcInput, setFormAbcInput] = useState('');
  const [formEntityName, setFormEntityName] = useState('');
  const [formEntityAddress, setFormEntityAddress] = useState('');
  const [formEntityContactNumber, setFormEntityContactNumber] = useState('');
  const [formEntityEmail, setFormEntityEmail] = useState('');
  const [formEntityContactPerson, setFormEntityContactPerson] = useState('');
  const [formEntityPosition, setFormEntityPosition] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formPreBidDate, setFormPreBidDate] = useState('');
  const [formDeadlineDate, setFormDeadlineDate] = useState('');
  const [formBidOpeningDate, setFormBidOpeningDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'OPEN' | 'CLOSED' | 'AWARDED' | 'AWARDED_TO_OTHERS' | 'CANCELLED'>('OPEN');

  const handleOpenNewProjectModal = () => {
    setIsEditing(false);
    const randomRef = 'PhilGEPS-' + Math.floor(10000000 + Math.random() * 9000000);
    const newId = 'proj_' + Date.now();
    setFormId(newId);
    setFormTitle('');
    setFormPhilgepsRefNo(randomRef);
    setFormSolNo('ITB-2026-' + Math.floor(100 + Math.random() * 900));
    setFormProjRefNo(randomRef);
    setFormCategory('GOODS');
    setFormSector('Government');
    setFormRegime(currentTenant?.preferredRegime || 'RA_9184');
    setFormAbc(1000000);
    setFormAbcInput('1,000,000.00');
    setFormEntityName('');
    setFormEntityAddress(currentTenant?.address || '');
    setFormEntityContactNumber('');
    setFormEntityEmail('');
    setFormEntityContactPerson('');
    setFormEntityPosition('BAC Chairperson');
    setFormLocation('Metro Manila / Regional Office');
    
    const today = new Date();
    const in14Days = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    setFormPreBidDate(in7Days.toISOString().substring(0, 16));
    setFormDeadlineDate(in14Days.toISOString().substring(0, 16));
    setFormBidOpeningDate(in14Days.toISOString().substring(0, 16));
    setFormDescription('');
    setFormStatus('OPEN');
    setShowAddEditModal(true);
  };

  const handleOpenEditModal = (proj: PhilGEPSOpportunity) => {
    setIsEditing(true);
    setFormId(proj.id);
    setFormTitle(proj.title);
    setFormPhilgepsRefNo(proj.philgepsRefNo);
    setFormSolNo(proj.solicitationNumber || '');
    setFormProjRefNo(proj.projectReferenceNumber || proj.philgepsRefNo);
    setFormCategory(proj.procurementType);
    setFormSector(proj.sector || 'Government');
    setFormRegime(proj.legalRegime || 'RA_9184');
    setFormAbc(proj.approvedBudget || 0);
    setFormAbcInput(proj.approvedBudget ? proj.approvedBudget.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '');
    setFormEntityName(proj.procuringEntity || '');
    setFormEntityAddress(proj.procuringEntityAddress || '');
    setFormEntityContactNumber(proj.procuringEntityContactNumber || '');
    setFormEntityEmail(proj.procuringEntityEmail || '');
    setFormEntityContactPerson(proj.procuringEntityContactPerson || '');
    setFormEntityPosition(proj.procuringEntityPosition || 'BAC Chairperson');
    setFormLocation(proj.location || proj.areaOfDelivery || '');
    setFormPreBidDate(proj.preBidConferenceDatetime || '');
    setFormDeadlineDate(proj.submissionDeadlineDatetime || proj.submissionDeadline || '');
    setFormBidOpeningDate(proj.bidOpeningDate || '');
    setFormDescription(proj.description || '');
    setFormStatus(proj.status || 'OPEN');
    setShowAddEditModal(true);
  };

  const handleSaveProjectProfile = () => {
    if (!formTitle.trim()) {
      alert('Please enter a Project Title.');
      return;
    }
    if (!formPhilgepsRefNo.trim()) {
      alert('Please enter a PhilGEPS Reference Number.');
      return;
    }

    const budgetNum = formAbc || parsePhpCurrency(formAbcInput);

    const updatedItem: PhilGEPSOpportunity = {
      id: formId || ('proj_' + Date.now()),
      philgepsRefNo: formPhilgepsRefNo.trim(),
      projectReferenceNumber: formProjRefNo.trim() || formPhilgepsRefNo.trim(),
      solicitationNumber: formSolNo.trim() || 'ITB-2026-001',
      title: formTitle.trim(),
      procuringEntity: formEntityName.trim() || 'Government Procuring Entity',
      procuringEntityAddress: formEntityAddress.trim(),
      procuringEntityContactNumber: formEntityContactNumber.trim(),
      procuringEntityEmail: formEntityEmail.trim(),
      procuringEntityContactPerson: formEntityContactPerson.trim(),
      procuringEntityPosition: formEntityPosition.trim(),
      procurementType: formCategory,
      sector: formSector,
      legalRegime: formRegime,
      approvedBudget: budgetNum,
      datePublished: new Date().toISOString().substring(0, 10),
      preBidConferenceDatetime: formPreBidDate,
      submissionDeadlineDatetime: formDeadlineDate,
      submissionDeadline: formDeadlineDate ? formDeadlineDate.substring(0, 10) : '',
      bidOpeningDate: formBidOpeningDate,
      location: formLocation.trim() || 'Philippines',
      areaOfDelivery: formLocation.trim() || 'Philippines',
      description: formDescription.trim(),
      status: formStatus
    };

    let updatedList: PhilGEPSOpportunity[] = [];
    if (isEditing) {
      updatedList = projects.map(p => p.id === updatedItem.id ? { ...p, ...updatedItem } : p);
    } else {
      updatedList = [updatedItem, ...projects];
    }

    try {
      localStorage.setItem(`bidocs_opportunities_${tenantId}`, JSON.stringify(updatedList));
      localStorage.setItem('bidocs_opportunities', JSON.stringify(updatedList));
      invalidateOpportunityProjectsCache();
    } catch (err) {}

    setProjects(updatedList);
    setSelectedProjectId(updatedItem.id);
    setShowAddEditModal(false);
  };

  const handleDuplicateProject = (proj: PhilGEPSOpportunity) => {
    const cloneId = 'proj_' + Date.now();
    const cloneRef = 'PhilGEPS-' + Math.floor(10000000 + Math.random() * 9000000);
    const cloned: PhilGEPSOpportunity = {
      ...proj,
      id: cloneId,
      title: `${proj.title} (Copy)`,
      philgepsRefNo: cloneRef,
      projectReferenceNumber: cloneRef,
      solicitationNumber: `${proj.solicitationNumber || 'ITB'}-COPY`,
      datePublished: new Date().toISOString().substring(0, 10)
    };

    const updatedList = [cloned, ...projects];
    try {
      localStorage.setItem(`bidocs_opportunities_${tenantId}`, JSON.stringify(updatedList));
      localStorage.setItem('bidocs_opportunities', JSON.stringify(updatedList));
      invalidateOpportunityProjectsCache();
    } catch (e) {}

    setProjects(updatedList);
    setSelectedProjectId(cloned.id);
  };

  const handleDeleteProject = (proj: PhilGEPSOpportunity) => {
    if (confirm(`Are you sure you want to delete Project Status: "${proj.title}" (${proj.philgepsRefNo})?`)) {
      const filtered = projects.filter(p => p.id !== proj.id);
      try {
        localStorage.setItem(`bidocs_opportunities_${tenantId}`, JSON.stringify(filtered));
        localStorage.setItem('bidocs_opportunities', JSON.stringify(filtered));
        invalidateOpportunityProjectsCache();
      } catch (e) {}
      setProjects(filtered);
      if (filtered.length > 0) {
        setSelectedProjectId(filtered[0].id);
      } else {
        setSelectedProjectId('');
      }
    }
  };

  const handleSetActiveWorkspaceProject = (proj: PhilGEPSOpportunity) => {
    const activeRef = proj.projectReferenceNumber || proj.philgepsRefNo;
    const activeData = {
      refNo: activeRef,
      title: proj.title,
      procuringEntity: proj.procuringEntity,
      solicitationNo: proj.solicitationNumber,
      abc: proj.approvedBudget ? String(proj.approvedBudget) : '0',
      category: proj.procurementType,
      dateTimeSubmitted: proj.submissionDeadlineDatetime || proj.submissionDeadline || ''
    };

    try {
      localStorage.setItem(`bidocs_active_project_${tenantId}`, JSON.stringify(activeData));
      localStorage.setItem('bidocs_active_project', JSON.stringify(activeData));
      localStorage.setItem(`bidocs_active_vault_project_${tenantId}`, activeRef);
      localStorage.setItem('bidocs_active_vault_project', activeRef);
      setActiveWorkspaceRef(activeRef);
    } catch (e) {}
  };

  const filteredProjects = useMemo(() => {
    return mergedProjects.filter(p => {
      const matchSearch = searchQuery === '' ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.philgepsRefNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.procuringEntity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.location && p.location.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchCat = selectedCategory === 'ALL' ||
        p.procurementType.toUpperCase().includes(selectedCategory.toUpperCase());

      return matchSearch && matchCat;
    });
  }, [mergedProjects, searchQuery, selectedCategory]);

  const metrics = useMemo(() => {
    const totalCount = mergedProjects.length;
    const totalAbc = mergedProjects.reduce((acc, p) => acc + (p.approvedBudget || 0), 0);
    const goodsCount = mergedProjects.filter(p => (p.procurementType || '').toUpperCase().includes('GOOD')).length;
    const infraCount = mergedProjects.filter(p => (p.procurementType || '').toUpperCase().includes('INFRA')).length;
    return { totalCount, totalAbc, goodsCount, infraCount };
  }, [mergedProjects]);

  const financialDetails = useMemo(() => {
    if (!selectedProject) return null;
    const abc = selectedProject.approvedBudget || 0;
    const words = numberToWords(abc);
    const bidSecCash2Pct = abc * 0.02;
    const bidSecSurety5Pct = abc * 0.05;
    const slcc50Pct = abc * 0.50;
    const slcc25Pct = abc * 0.25;
    return {
      abc,
      words,
      bidSecCash2Pct,
      bidSecSurety5Pct,
      slcc50Pct,
      slcc25Pct
    };
  }, [selectedProject]);

  return (
    <div className="w-full min-h-screen text-slate-100 flex flex-col space-y-6 pb-16 font-sans">
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. TOP HEADER & METRICS BANNER                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-blue-600/30 to-indigo-600/20 text-blue-400 rounded-xl border border-blue-500/30 shadow-lg shadow-blue-500/10">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Project Status
                </h1>
                <CyberBadge label="Procurement Registry" variant="blue" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized Bidding Specifications, Win DOCs, Final Payments, Expenses Tracker & Merged Bid Docs
              </p>
            </div>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleOpenNewProjectModal}
            className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-blue-600/20 border border-blue-400/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Project Status</span>
          </button>
          
          <button
            onClick={() => setActiveTab('opportunities')}
            className="px-3 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700/80 cursor-pointer"
            title="Import from Opportunity Finder"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span>Opportunity Finder</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 2. PIPELINE METRICS SUMMARY TILES                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <SpotlightCard className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total Projects</span>
            <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-1">{metrics.totalCount}</p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Active Project Statuses</p>
        </SpotlightCard>

        <SpotlightCard className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total ABC Pipeline</span>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1">{formatPhpCurrency(metrics.totalAbc)}</p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Cumulative Budget Value</p>
        </SpotlightCard>

        <SpotlightCard className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Goods & Supply</span>
            <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <Box className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-cyan-300 mt-1">{metrics.goodsCount}</p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Goods Opportunities</p>
        </SpotlightCard>

        <SpotlightCard className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Infrastructure</span>
            <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-300 mt-1">{metrics.infraCount}</p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Civil Works & Contracts</p>
        </SpotlightCard>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 3. MAIN DUAL-PANE WORKSPACE                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: PROJECT SELECTOR & FILTER (4 COLS) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 space-y-3.5 shadow-xl backdrop-blur-md">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search projects, ref #, BAC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700/70 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-semibold">
              {['ALL', 'GOODS', 'INFRA', 'CONSULT'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg transition shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat === 'ALL' ? 'All Types' : cat}
                </button>
              ))}
            </div>

            {/* Project List Items */}
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredProjects.length === 0 ? (
                <div className="p-6 text-center bg-slate-950/60 rounded-xl border border-dashed border-slate-800 space-y-3">
                  <FolderOpen className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-300">No Merged Projects Yet</p>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Projects only appear in Project Status after their bidding documents package has been merged & completed in Bid Package Builder.
                  </p>
                  <button
                    onClick={() => setActiveTab('bids')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <FolderKanban className="w-3.5 h-3.5" />
                    <span>Open Bid Builder</span>
                  </button>
                </div>
              ) : (
                filteredProjects.map((proj) => {
                  const isSelected = selectedProjectId === proj.id;
                  const isWorkspaceActive = (proj.projectReferenceNumber === activeWorkspaceRef || proj.philgepsRefNo === activeWorkspaceRef);

                  return (
                    <div
                      key={proj.id}
                      onClick={() => setSelectedProjectId(proj.id)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer text-left relative group ${
                        isSelected
                          ? 'bg-blue-950/40 border-blue-500/60 shadow-lg shadow-blue-950/50 ring-1 ring-blue-500/30'
                          : 'bg-slate-950/50 hover:bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/50 truncate max-w-[170px]">
                          {proj.philgepsRefNo || 'NO REF'}
                        </span>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isWorkspaceActive && (
                            <span className="text-[9px] font-bold bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-700/50 flex items-center gap-1 font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              ACTIVE
                            </span>
                          )}
                          <span className="text-[9px] font-bold bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded uppercase font-mono">
                            {proj.procurementType?.substring(0, 5) || 'GOODS'}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-white mt-2 line-clamp-2 leading-snug">
                        {proj.title}
                      </h4>

                      <div className="text-[11px] text-slate-400 mt-2 space-y-0.5 font-sans">
                        <p className="truncate text-slate-300 font-medium">
                          {proj.procuringEntity || 'Procuring Entity'}
                        </p>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 mt-1.5 text-[11px]">
                          <span className="font-mono font-bold text-emerald-400">
                            {formatPhpCurrency(proj.approvedBudget || 0)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {proj.submissionDeadline ? `Due: ${proj.submissionDeadline.substring(0, 10)}` : 'No Deadline'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED PROJECT PROFILE INSPECTOR (8 COLS) */}
        <div className="lg:col-span-8 space-y-5">
          {selectedProject ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
              <BorderBeam size={250} duration={12} delay={9} />

              {/* Profile Top Hero Banner */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800/80 pb-5">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 bg-blue-950 text-blue-300 text-xs font-mono font-bold rounded-lg border border-blue-700/60 shadow-xs">
                      {selectedProject.philgepsRefNo}
                    </span>
                    <span className="px-2 py-0.5 bg-purple-950 text-purple-300 text-[11px] font-mono font-bold rounded-lg border border-purple-700/60">
                      {selectedProject.procurementType}
                    </span>
                    <span className="px-2 py-0.5 bg-amber-950 text-amber-300 text-[11px] font-mono font-bold rounded-lg border border-amber-700/60">
                      {selectedProject.legalRegime === 'RA_12009_NGPA' ? 'RA 12009 (NGPA)' : 'RA 9184 Standard'}
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
                    {selectedProject.title}
                  </h2>

                  <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>{selectedProject.procuringEntity}</span>
                    {selectedProject.location && (
                      <>
                        <span className="text-slate-600">•</span>
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{selectedProject.location}</span>
                      </>
                    )}
                  </p>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    onClick={() => handleSetActiveWorkspaceProject(selectedProject)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                      activeWorkspaceRef === (selectedProject.projectReferenceNumber || selectedProject.philgepsRefNo)
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-600/70 shadow-emerald-950/50'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700'
                    }`}
                    title="Set as active bidding project across Vault, Packages, and Covers"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {activeWorkspaceRef === (selectedProject.projectReferenceNumber || selectedProject.philgepsRefNo)
                        ? 'Active Project'
                        : 'Set Active'}
                    </span>
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(selectedProject)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition border border-slate-700 cursor-pointer"
                    title="Edit Project Status"
                  >
                    <Edit3 className="w-4 h-4 text-blue-400" />
                  </button>

                  <button
                    onClick={() => handleDuplicateProject(selectedProject)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition border border-slate-700 cursor-pointer"
                    title="Duplicate Project Status"
                  >
                    <Copy className="w-4 h-4 text-purple-400" />
                  </button>

                  <button
                    onClick={() => handleDeleteProject(selectedProject)}
                    className="p-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-xl transition border border-red-800/40 cursor-pointer"
                    title="Delete Project Status"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ═════════════════════════════════════════════════════════════ */}
              {/* TAB NAVIGATION: 6 REVISED TABS                                */}
              {/* ═════════════════════════════════════════════════════════════ */}
              <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-semibold">
                {[
                  { id: 'general', label: 'General & PhilGEPS', icon: Briefcase },
                  { id: 'win_docs', label: 'Win DOCs', icon: Award },
                  { id: 'final_payment', label: 'Final Payment Document', icon: FileCheck2 },
                  { id: 'expenses', label: 'Expenses', icon: Receipt },
                  { id: 'bid_docs', label: 'Bid Docs', icon: FolderOpen },
                  { id: 'statutory_docs', label: 'Statutory Documents', icon: Building2 }
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTabSection === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTabSection(tab.id as any)}
                      className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30 ring-1 ring-blue-400/40'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* ═════════════════════════════════════════════════════════════ */}
              {/* TAB 1: ALL-IN-ONE GENERAL & PHILGEPS TAB                      */}
              {/* (Includes Procurement Details, Entity/BAC, ABC, Deadlines,   */}
              {/* Bidding Team & Printable Summary Sheet)                       */}
              {/* ═════════════════════════════════════════════════════════════ */}
              {activeTabSection === 'general' && (
                <div className="space-y-6">
                  
                  {/* Section A: Core PhilGEPS Identifiers */}
                  <div className="space-y-3">
                    <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4" />
                      <span>1. General Project & Procurement Identifiers</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1">
                        <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">PhilGEPS Ref Number</span>
                        <p className="text-sm font-bold font-mono text-blue-400">{selectedProject.philgepsRefNo}</p>
                      </div>

                      <div className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1">
                        <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Solicitation / ITB Number</span>
                        <p className="text-sm font-bold font-mono text-white">{selectedProject.solicitationNumber || 'N/A'}</p>
                      </div>

                      <div className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1">
                        <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Internal Project Ref Number</span>
                        <p className="text-sm font-bold font-mono text-white">{selectedProject.projectReferenceNumber || selectedProject.philgepsRefNo}</p>
                      </div>

                      <div className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1">
                        <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Procurement Category</span>
                        <p className="text-xs font-bold text-white">{selectedProject.procurementType}</p>
                      </div>

                      <div className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1">
                        <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Sector & Legal Regime</span>
                        <p className="text-xs font-bold text-white">
                          {selectedProject.sector || 'Government'} • {selectedProject.legalRegime === 'RA_12009_NGPA' ? 'RA 12009 (NGPA)' : 'RA 9184'}
                        </p>
                      </div>

                      <div className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1">
                        <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Area of Delivery / Site</span>
                        <p className="text-xs font-bold text-white truncate">{selectedProject.areaOfDelivery || selectedProject.location || 'Philippines'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Section B: Procuring Entity & BAC Secretariat */}
                  <div className="space-y-3 pt-2 border-t border-slate-800/80">
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" />
                      <span>2. Procuring Entity & BAC Secretariat</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1 sm:col-span-2">
                        <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Procuring Entity Name</span>
                        <p className="text-sm font-bold text-white">{selectedProject.procuringEntity}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 pt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{selectedProject.procuringEntityAddress || 'Official BAC Address'}</span>
                        </p>
                      </div>

                      <div className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1">
                        <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">Head of Procuring Entity (HoPE) / Signatory</span>
                        <p className="text-xs font-bold text-white">{selectedProject.headOfProcuringEntity || selectedProject.procuringEntityContactPerson || 'Head of Procuring Entity'}</p>
                        <p className="text-[11px] text-slate-400">{selectedProject.headOfProcuringEntityPosition || 'District Engineer / Regional Director / Mayor'}</p>
                      </div>

                      <div className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1">
                        <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold block">PhilGEPS Liaison / BAC Secretariat</span>
                        <p className="text-xs font-bold text-white">{selectedProject.procuringEntityContactPerson || 'BAC Secretariat Head'}</p>
                        <p className="text-[11px] text-slate-400">{selectedProject.procuringEntityPosition || 'Procurement Liaison / Secretariat'}</p>
                      </div>

                      <div className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1 sm:col-span-2">
                        <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Contact Information</span>
                        <div className="flex flex-wrap items-center gap-4 pt-0.5">
                          <p className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-cyan-400" />
                            <span>{selectedProject.procuringEntityContactNumber || '(02) 8000-0000'}</span>
                          </p>
                          <p className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-amber-400" />
                            <span>{selectedProject.procuringEntityEmail || 'bac@procuringentity.gov.ph'}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section C: Financial Benchmarks & ABC */}
                  {financialDetails && (
                    <div className="space-y-3 pt-2 border-t border-slate-800/80">
                      <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4" />
                        <span>3. Financial Benchmarks & ABC Analysis</span>
                      </span>

                      <div className="p-4 bg-gradient-to-br from-emerald-950/60 to-slate-950/90 border border-emerald-500/40 rounded-xl space-y-1.5">
                        <span className="text-[11px] font-mono font-bold uppercase text-emerald-400">Approved Budget for the Contract (ABC)</span>
                        <p className="text-2xl font-black text-emerald-300 font-mono">{formatPhpCurrency(financialDetails.abc)}</p>
                        <p className="text-xs font-serif italic text-slate-300 bg-black/40 p-2 rounded-lg border border-emerald-900/40">
                          Amount in words: <strong>{financialDetails.words}</strong>
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[9px] font-mono text-blue-400 uppercase font-bold block">Bid Sec (2% Cash/Bank)</span>
                          <p className="font-mono font-bold text-white">{formatPhpCurrency(financialDetails.bidSecCash2Pct)}</p>
                        </div>
                        <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[9px] font-mono text-purple-400 uppercase font-bold block">Bid Sec (5% Surety)</span>
                          <p className="font-mono font-bold text-white">{formatPhpCurrency(financialDetails.bidSecSurety5Pct)}</p>
                        </div>
                        <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[9px] font-mono text-amber-400 uppercase font-bold block">SLCC 50% Threshold</span>
                          <p className="font-mono font-bold text-white">{formatPhpCurrency(financialDetails.slcc50Pct)}</p>
                        </div>
                        <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[9px] font-mono text-cyan-400 uppercase font-bold block">SLCC 25% Threshold</span>
                          <p className="font-mono font-bold text-white">{formatPhpCurrency(financialDetails.slcc25Pct)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section D: Timelines & Schedule */}
                  <div className="space-y-3 pt-2 border-t border-slate-800/80">
                    <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>4. Procurement Timeline & Deadlines</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1">
                        <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold block">Pre-Bid Conference</span>
                        <p className="text-xs font-bold text-white">
                          {selectedProject.preBidConferenceDatetime ? selectedProject.preBidConferenceDatetime.replace('T', ' ') : 'As per ITB'}
                        </p>
                      </div>

                      <div className="p-3 bg-red-950/30 border border-red-500/40 rounded-xl space-y-1">
                        <span className="text-[10px] font-mono uppercase text-red-400 font-bold block">Submission Deadline</span>
                        <p className="text-xs font-bold text-red-300">
                          {selectedProject.submissionDeadlineDatetime ? selectedProject.submissionDeadlineDatetime.replace('T', ' ') : (selectedProject.submissionDeadline || 'As per ITB')}
                        </p>
                      </div>

                      <div className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1">
                        <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">Bid Opening Date</span>
                        <p className="text-xs font-bold text-white">
                          {selectedProject.bidOpeningDate ? selectedProject.bidOpeningDate.replace('T', ' ') : 'Immediately after deadline'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section E: Bidding Team */}
                  <div className="space-y-3 pt-2 border-t border-slate-800/80">
                    <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4" />
                      <span>5. Bidding Team & Signatories</span>
                    </span>

                    <div className="p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block">Authorized Signatory</span>
                        <p className="text-sm font-bold text-white">{currentTenant?.authorizedSignatory?.name || 'Authorized Managing Officer'}</p>
                        <p className="text-xs text-slate-400">{currentTenant?.authorizedSignatory?.title || 'President / General Manager'}</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('profile')}
                        className="text-xs text-blue-400 hover:text-blue-300 underline cursor-pointer"
                      >
                        Edit in Company Profile
                      </button>
                    </div>
                  </div>

                  {/* Section F: Official Printable Summary Sheet */}
                  <div className="space-y-3 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Printer className="w-4 h-4 text-blue-400" />
                        <span>6. Official Project Status Summary Sheet (Printable)</span>
                      </span>

                      <button
                        onClick={() => window.print()}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow cursor-pointer print:hidden"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Sheet</span>
                      </button>
                    </div>

                    <div className="bg-white text-slate-950 p-6 sm:p-8 rounded-xl shadow-xl border-2 border-slate-900 font-serif space-y-4 text-left text-xs max-w-[816px] mx-auto print:m-0 print:border-none print:shadow-none">
                      
                      {/* Header */}
                      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2">
                        <div>
                          <h3 className="text-base font-bold font-serif uppercase tracking-tight text-slate-900">
                            {currentTenant?.companyName || 'BIDDER ENTERPRISE'}
                          </h3>
                          <p className="text-[10px] text-slate-600">{currentTenant?.address || 'Official Business Address'}</p>
                          <p className="text-[10px] font-mono text-slate-600">TIN: {currentTenant?.tin || '000-000-000-000'} • PhilGEPS: {currentTenant?.philgepsPlatinumNo || 'PLATINUM-2026'}</p>
                        </div>

                        <DocumentQrCode
                          details={{
                            companyName: currentTenant?.companyName || '',
                            documentName: `Project Status — ${selectedProject.philgepsRefNo}`,
                            documentNumber: selectedProject.philgepsRefNo,
                            projectTitle: selectedProject.title,
                            projectRefNo: selectedProject.projectReferenceNumber || selectedProject.philgepsRefNo,
                            procuringEntity: selectedProject.procuringEntity,
                            dateTimeSubmitted: selectedProject.submissionDeadlineDatetime || '',
                            documentCategory: 'Project Identification Registry'
                          }}
                          size={48}
                          showCaption={false}
                        />
                      </div>

                      {/* Title */}
                      <div className="text-center py-0.5">
                        <h2 className="text-xs font-bold uppercase tracking-wider underline">
                          OFFICIAL PROCUREMENT PROJECT STATUS & SPECIFICATIONS
                        </h2>
                      </div>

                      {/* Specifications Table */}
                      <table className="w-full border-collapse border border-slate-900 text-[10px]">
                        <tbody>
                          <tr className="border-b border-slate-900">
                            <td className="w-1/3 p-1 font-bold bg-slate-100 border-r border-slate-900">PROJECT TITLE:</td>
                            <td className="w-2/3 p-1 font-bold text-slate-950">{selectedProject.title}</td>
                          </tr>
                          <tr className="border-b border-slate-900">
                            <td className="p-1 font-bold bg-slate-100 border-r border-slate-900">PHILGEPS REF NO.:</td>
                            <td className="p-1 font-mono font-bold text-blue-900">{selectedProject.philgepsRefNo}</td>
                          </tr>
                          <tr className="border-b border-slate-900">
                            <td className="p-1 font-bold bg-slate-100 border-r border-slate-900">PROCURING ENTITY:</td>
                            <td className="p-1 font-bold">{selectedProject.procuringEntity}</td>
                          </tr>
                          <tr className="border-b border-slate-900">
                            <td className="p-1 font-bold bg-slate-100 border-r border-slate-900">APPROVED BUDGET (ABC):</td>
                            <td className="p-1 font-mono font-bold text-emerald-900">
                              {formatPhpCurrency(selectedProject.approvedBudget || 0)}
                            </td>
                          </tr>
                          <tr className="border-b border-slate-900">
                            <td className="p-1 font-bold bg-slate-100 border-r border-slate-900">SUBMISSION DEADLINE:</td>
                            <td className="p-1 font-mono font-bold text-red-900">
                              {selectedProject.submissionDeadlineDatetime ? selectedProject.submissionDeadlineDatetime.replace('T', ' ') : selectedProject.submissionDeadline}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Signatory Footer */}
                      <div className="pt-4 flex items-end justify-between">
                        <div className="text-[8.5px] font-mono text-slate-600">
                          <p>Certified Project Identification Profile</p>
                          <p>BiDOCS Procurement System</p>
                        </div>

                        <div className="text-center font-serif min-w-[200px]">
                          <div className="border-b border-slate-900 pb-0.5 mb-1 font-bold text-[10.5px]">
                            {currentTenant?.authorizedSignatory?.name || 'AUTHORIZED SIGNATORY'}
                          </div>
                          <p className="text-[9.5px] text-slate-700">{currentTenant?.authorizedSignatory?.title || 'President / General Manager'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════ */}
              {/* TAB 2: WIN DOCS (POST QUAL, NOA, PERF BOND, CONTRACT, NTP, DOLE) */}
              {/* ═════════════════════════════════════════════════════════════ */}
              {activeTabSection === 'win_docs' && (
                <div className="space-y-5">
                  {/* 1. Header Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-400" />
                        <span>Win DOCs — Post-Award & Contract Execution Dossier</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Official contract execution repository, winning bid price synchronization, and statutory post-award documentation.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {projectWinStatus === 'WIN' && (
                        <span className="px-3 py-1 bg-gradient-to-r from-amber-500/20 to-emerald-500/20 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 shadow-sm">
                          <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          <span>🏆 WIN — CONTRACT AWARDED</span>
                        </span>
                      )}
                      {projectWinStatus === 'LOSE' && (
                        <span className="px-3 py-1 bg-slate-800/90 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 shadow-sm">
                          <X className="w-3.5 h-3.5 text-slate-400" />
                          <span>❌ LOSE — AWARDED TO OTHERS</span>
                        </span>
                      )}
                      {projectWinStatus === 'DQ' && (
                        <span className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 shadow-sm">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          <span>⚠️ DQ — DISQUALIFIED</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 2A. Interactive 3-Option Outcome Selector (When Unspecified) */}
                  {projectWinStatus === 'UNSPECIFIED' && (
                    <div className="p-6 bg-gradient-to-br from-blue-950/40 via-slate-900/90 to-indigo-950/40 border border-blue-500/40 rounded-2xl relative overflow-hidden shadow-2xl space-y-5">
                      <BorderBeam size={200} duration={8} delay={0} />
                      
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl shadow-lg shrink-0">
                          <Trophy className="w-8 h-8" />
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider">
                            Procurement Outcome Verification
                          </span>
                          <h4 className="text-base sm:text-lg font-black text-white">
                            Did you win this bidding project?
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                            Select the official bidding outcome from BAC post-qualification & evaluation. If you <strong className="text-emerald-300">WON</strong>, BiDOCS will automatically fetch and display your exact offer price from the <strong className="text-emerald-300">Financial Bid Form</strong> and calculate statutory Performance Security bonds.
                          </p>
                        </div>
                      </div>

                      {/* 3 Explicit Option Cards: WIN | LOSE | DQ */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2 border-t border-slate-800/80">
                        {/* Option 1: WIN */}
                        <button
                          type="button"
                          onClick={() => handleConfirmWin('WIN')}
                          className="p-4 bg-gradient-to-b from-emerald-950/40 to-slate-900/90 hover:from-emerald-900/60 hover:to-slate-900 border border-emerald-500/40 hover:border-emerald-400 rounded-2xl text-left transition-all duration-200 group relative overflow-hidden shadow-lg cursor-pointer flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
                              <Trophy className="w-5 h-5 text-amber-400" />
                            </div>
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-[9px] font-mono font-bold uppercase">
                              Awarded Contract
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h5 className="text-sm font-black text-emerald-300 flex items-center gap-1.5">
                              <span>🏆 WIN</span>
                            </h5>
                            <p className="text-[11px] text-slate-300 leading-relaxed">
                              Awarded the contract (LCRB / SCRB). Automatically syncs winning amount from Financial Bid Form & computes statutory performance bonds.
                            </p>
                          </div>

                          <div className="pt-2 border-t border-emerald-500/20 text-[11px] font-bold text-emerald-400 flex items-center justify-between group-hover:text-emerald-300">
                            <span>Select WIN Outcome</span>
                            <span className="text-sm">→</span>
                          </div>
                        </button>

                        {/* Option 2: LOSE */}
                        <button
                          type="button"
                          onClick={() => handleConfirmWin('LOSE')}
                          className="p-4 bg-gradient-to-b from-slate-900/90 to-slate-950 hover:from-slate-800/90 hover:to-slate-900 border border-slate-700 hover:border-slate-500 rounded-2xl text-left transition-all duration-200 group relative overflow-hidden shadow-lg cursor-pointer flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="p-2.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-xl group-hover:scale-110 transition-transform">
                              <X className="w-5 h-5 text-slate-400" />
                            </div>
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded text-[9px] font-mono font-bold uppercase">
                              Awarded to Others
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h5 className="text-sm font-black text-slate-200 flex items-center gap-1.5">
                              <span>❌ LOSE</span>
                            </h5>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              Contract awarded to another qualified bidder. Retains all compiled and merged bid dossiers in this tab for record-keeping.
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-800 text-[11px] font-bold text-slate-400 flex items-center justify-between group-hover:text-slate-200">
                            <span>Select LOSE Outcome</span>
                            <span className="text-sm">→</span>
                          </div>
                        </button>

                        {/* Option 3: DQ */}
                        <button
                          type="button"
                          onClick={() => handleConfirmWin('DQ')}
                          className="p-4 bg-gradient-to-b from-rose-950/30 to-slate-900/90 hover:from-rose-900/50 hover:to-slate-900 border border-rose-500/40 hover:border-rose-400 rounded-2xl text-left transition-all duration-200 group relative overflow-hidden shadow-lg cursor-pointer flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-xl group-hover:scale-110 transition-transform">
                              <AlertTriangle className="w-5 h-5 text-rose-400" />
                            </div>
                            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[9px] font-mono font-bold uppercase">
                              Ineligible / Non-Responsive
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h5 className="text-sm font-black text-rose-300 flex items-center gap-1.5">
                              <span>⚠️ DQ</span>
                            </h5>
                            <p className="text-[11px] text-slate-300 leading-relaxed">
                              Disqualified or declared ineligible during opening or post-qualification. Allows storing BAC findings and Motion for Reconsideration (MR).
                            </p>
                          </div>

                          <div className="pt-2 border-t border-rose-500/20 text-[11px] font-bold text-rose-400 flex items-center justify-between group-hover:text-rose-300">
                            <span>Select DQ Outcome</span>
                            <span className="text-sm">→</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 2B. STATUS === 'WIN': Prominent Winning Contract Price Card */}
                  {projectWinStatus === 'WIN' && (
                    <div className="p-5 sm:p-6 bg-gradient-to-br from-amber-950/30 via-slate-900/95 to-emerald-950/30 border border-amber-500/50 rounded-2xl relative overflow-hidden shadow-2xl space-y-4">
                      <BorderBeam size={300} duration={10} delay={2} />

                      {/* Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl shadow-md">
                            <Trophy className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-tight">
                                Official Contract Award & Winning Bid Amount
                              </span>
                              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-600/50 rounded text-[10px] font-mono font-bold">
                                🏆 ACTIVE WIN
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              <span>Source: {winningBidData.source}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedProject) {
                                const bidData = getProjectBidFormAmount(tenantId, projectScopeKey, selectedProject.id, selectedProject.approvedBudget);
                                setWinningBidData(bidData);
                              }
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                            title="Re-read Financial Bid Form values from storage"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                            <span>Re-Sync from Bid Form</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleConfirmWin('LOSE')}
                            className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-800 cursor-pointer"
                            title="Change status to LOSE"
                          >
                            <span>Change to LOSE</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleConfirmWin('DQ')}
                            className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-xl text-xs font-semibold transition border border-rose-800/60 cursor-pointer"
                            title="Change status to DQ"
                          >
                            <span>Change to DQ</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setProjectWinStatus('UNSPECIFIED')}
                            className="px-2.5 py-1.5 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition border border-slate-800 cursor-pointer"
                            title="Reset project award status"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Reset</span>
                          </button>
                        </div>
                      </div>

                      {/* Large Amount Display */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="md:col-span-7 p-4 bg-slate-950/80 rounded-xl border border-emerald-500/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono uppercase font-bold text-emerald-400">
                              Winning Bid Contract Price (As Evaluated & Awarded)
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">PHP (Philippine Peso)</span>
                          </div>
                          
                          <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-300 tracking-tight">
                            {formatPhpCurrency(winningBidData.amount)}
                          </p>

                          <div className="p-2.5 bg-black/40 rounded-lg border border-slate-800/80">
                            <p className="text-[11px] font-serif italic text-slate-300 leading-snug">
                              <span className="text-slate-500 font-sans not-italic text-[10px] font-bold uppercase mr-1">In Words:</span>
                              <strong>{winningBidData.amountWords}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Variance vs ABC Box */}
                        <div className="md:col-span-5 p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5 text-xs font-sans">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium">Approved Budget (ABC):</span>
                            <span className="font-mono font-bold text-white">{formatPhpCurrency(selectedProject.approvedBudget || 0)}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-emerald-400 font-bold">Winning Bid Offer:</span>
                            <span className="font-mono font-bold text-emerald-300">{formatPhpCurrency(winningBidData.amount)}</span>
                          </div>

                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                            <span className="text-slate-400 font-medium">Variance / Gov Savings:</span>
                            <span className="font-mono font-bold text-cyan-300">
                              {selectedProject.approvedBudget && selectedProject.approvedBudget > 0
                                ? `${formatPhpCurrency(selectedProject.approvedBudget - winningBidData.amount)} (${(((selectedProject.approvedBudget - winningBidData.amount) / selectedProject.approvedBudget) * 100).toFixed(2)}%)`
                                : '₱0.00'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Performance Security Bond Requirements Breakdown */}
                      <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold uppercase text-amber-400 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Statutory Performance Security Requirements (Computed from Winning Bid)</span>
                          </span>
                          <span className="text-[9px] font-mono text-slate-500">Sec. 39 RA 9184 / RA 12009</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                          <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg space-y-0.5">
                            <span className="text-[9px] text-blue-400 font-bold block uppercase">5% Cash / Manager's Check</span>
                            <p className="font-bold text-white">{formatPhpCurrency(winningBidData.amount * 0.05)}</p>
                          </div>

                          <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg space-y-0.5">
                            <span className="text-[9px] text-cyan-400 font-bold block uppercase">10% Bank Guarantee / LC</span>
                            <p className="font-bold text-white">{formatPhpCurrency(winningBidData.amount * 0.10)}</p>
                          </div>

                          <div className="p-2.5 bg-slate-900/90 border border-amber-500/30 rounded-lg space-y-0.5">
                            <span className="text-[9px] text-amber-400 font-bold block uppercase">30% Callable Surety Bond</span>
                            <p className="font-bold text-amber-300">{formatPhpCurrency(winningBidData.amount * 0.30)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2C. STATUS === 'LOSE' */}
                  {projectWinStatus === 'LOSE' && (
                    <div className="p-4 bg-slate-900/80 border border-slate-700 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-xl">
                          <X className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-200">Status: Awarded to Other Bidder (LOSE)</h4>
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded text-[9px] font-mono font-bold">
                              AWARDED TO COMPETITOR
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            This bidding project was awarded to another qualified bidder. All compiled and merged bid packages remain archived and accessible.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleConfirmWin('WIN')}
                          className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-emerald-500/40 cursor-pointer"
                        >
                          <Trophy className="w-3.5 h-3.5" />
                          <span>Change to WIN</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmWin('DQ')}
                          className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-xl text-xs font-semibold transition border border-rose-800/60 cursor-pointer"
                        >
                          <span>Change to DQ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setProjectWinStatus('UNSPECIFIED')}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition border border-slate-700 cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 2D. STATUS === 'DQ' */}
                  {projectWinStatus === 'DQ' && (
                    <div className="p-4 bg-rose-950/30 border border-rose-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-xl">
                          <AlertTriangle className="w-5 h-5 text-rose-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-rose-200">Status: Disqualified / Ineligible / Non-Responsive (DQ)</h4>
                            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[9px] font-mono font-bold">
                              DISQUALIFIED
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-0.5">
                            This project was disqualified or found non-compliant during opening or BAC post-qualification evaluation. You can track BAC evaluation findings or log Motion for Reconsideration (MR).
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleConfirmWin('WIN')}
                          className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-emerald-500/40 cursor-pointer"
                        >
                          <Trophy className="w-3.5 h-3.5" />
                          <span>Change to WIN</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmWin('LOSE')}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition border border-slate-700 cursor-pointer"
                        >
                          <span>Change to LOSE</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setProjectWinStatus('UNSPECIFIED')}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition border border-slate-700 cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3. Statutory Post-Award Document Attachments */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Statutory Post-Award Document Attachments ({WIN_DOC_SLOTS.length} Slots)</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {Object.keys(winDocs).length} / {WIN_DOC_SLOTS.length} Documents Attached
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {WIN_DOC_SLOTS.map(slot => {
                        const attached = winDocs[slot.key];
                        const hasFile = !!attached?.fileName;
                        const isImg = attached?.fileName && /\.(png|jpe?g|webp)$/i.test(attached.fileName);

                        return (
                          <div
                            key={slot.key}
                            className={`p-4 rounded-2xl border transition relative space-y-3 ${
                              hasFile
                                ? 'bg-emerald-950/20 border-emerald-500/50 shadow-lg shadow-emerald-950/30'
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                                  Statutory Requirement
                                </span>
                                <h4 className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
                                  {isImg ? (
                                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                                  ) : (
                                    <FileText className={`w-3.5 h-3.5 ${hasFile ? 'text-emerald-400' : 'text-slate-400'}`} />
                                  )}
                                  <span>{slot.title}</span>
                                </h4>
                              </div>

                              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                                hasFile
                                  ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-600/60'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}>
                                {hasFile ? 'ATTACHED' : 'PENDING'}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-400 leading-snug">
                              {slot.desc}
                            </p>

                            {/* File Details if uploaded */}
                            {hasFile && (
                              <div className="p-2.5 bg-slate-900/90 rounded-xl border border-emerald-500/30 flex items-center justify-between text-xs font-mono">
                                <div className="truncate mr-2">
                                  <p className="text-emerald-300 font-bold truncate">{attached.fileName}</p>
                                  <p className="text-[10px] text-slate-400">
                                    {attached.fileSizeBytes ? `${(attached.fileSizeBytes / 1024).toFixed(1)} KB` : ''} • {attached.uploadedAt ? attached.uploadedAt.substring(0, 10) : ''}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handlePreviewSlotDoc(slot.key, slot.title, 'WIN_DOCS', attached)}
                                    className="p-1.5 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg transition cursor-pointer"
                                    title="Preview Document / Photo"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSlotDoc(slot.key, 'WIN_DOCS')}
                                    className="p-1.5 bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white rounded-lg transition cursor-pointer"
                                    title="Delete Document / Photo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Upload / Replace Action */}
                            {slot.key === 'performance_bond' ? (
                              <div className="space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setShowPsdModal(true)}
                                    className="w-full py-2 px-2.5 bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/40 hover:to-teal-600/40 text-emerald-300 border border-emerald-500/40 hover:border-emerald-500/60 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                                    title="Fill statutory GPPB Performance Securing Declaration (PSD) template"
                                  >
                                    <FileSignature className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="truncate">{hasFile ? 'Re-generate PSD' : 'Fill PSD Template'}</span>
                                  </button>

                                  <label className="w-full py-2 px-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer">
                                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                                    <span className="truncate">{hasFile ? 'Replace File' : 'Upload PSD / Bond'}</span>
                                    <input
                                      type="file"
                                      accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleUploadSlotDoc(slot.key, slot.title, 'WIN_DOCS', file);
                                      }}
                                    />
                                  </label>
                                </div>
                                <p className="text-[10px] text-slate-400 font-mono text-center">
                                  Upload signed PSD or Surety Bond / Bank Guarantee, or fill PSD template
                                </p>
                              </div>
                            ) : (
                              <div>
                                <label className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer">
                                  <Upload className="w-3.5 h-3.5 text-blue-400" />
                                  <span>{hasFile ? 'Replace Document / Proof' : 'Upload Document / Proof'}</span>
                                  <input
                                    type="file"
                                    accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleUploadSlotDoc(slot.key, slot.title, 'WIN_DOCS', file);
                                    }}
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════ */}
              {/* TAB 3: FINAL PAYMENT DOCUMENT (VOUCHER, CERT, CHEQUE, INVOICE) */}
              {/* ═════════════════════════════════════════════════════════════ */}
              {activeTabSection === 'final_payment' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <FileCheck2 className="w-4 h-4 text-emerald-400" />
                        <span>Final Payment Document — Contract Completion & Clearance Dossier</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Upload required disbursement voucher, certificate of completion / acceptance, cheque photo, sales/service invoice, barangay certification, BIR tax clearance, and final progress S-Curve.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {Object.keys(finalPaymentDocs).length} / {FINAL_PAYMENT_DOC_SLOTS.length} Uploaded
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {FINAL_PAYMENT_DOC_SLOTS.map(slot => {
                      const attached = finalPaymentDocs[slot.key];
                      const hasFile = !!attached?.fileName;
                      const isImg = attached?.fileName && /\.(png|jpe?g|webp)$/i.test(attached.fileName);

                      return (
                        <div
                          key={slot.key}
                          className={`p-4 rounded-2xl border transition relative space-y-3 ${
                            hasFile
                              ? 'bg-emerald-950/20 border-emerald-500/50 shadow-lg shadow-emerald-950/30'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                                Payment Closeout Item
                              </span>
                              <h4 className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
                                {isImg ? (
                                  <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                                ) : (
                                  <FileText className={`w-3.5 h-3.5 ${hasFile ? 'text-emerald-400' : 'text-slate-400'}`} />
                                )}
                                <span>{slot.title}</span>
                              </h4>
                            </div>

                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                              hasFile
                                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-600/60'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {hasFile ? 'ATTACHED' : 'PENDING'}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 leading-snug">
                            {slot.desc}
                          </p>

                          {/* File Details if uploaded */}
                          {hasFile && (
                            <div className="p-2.5 bg-slate-900/90 rounded-xl border border-emerald-500/30 flex items-center justify-between text-xs font-mono">
                              <div className="truncate mr-2">
                                <p className="text-emerald-300 font-bold truncate">{attached.fileName}</p>
                                <p className="text-[10px] text-slate-400">
                                  {attached.fileSizeBytes ? `${(attached.fileSizeBytes / 1024).toFixed(1)} KB` : ''} • {attached.uploadedAt ? attached.uploadedAt.substring(0, 10) : ''}
                                </p>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handlePreviewSlotDoc(slot.key, slot.title, 'FINAL_PAYMENT', attached)}
                                  className="p-1.5 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg transition cursor-pointer"
                                  title="Preview Document / Photo"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSlotDoc(slot.key, 'FINAL_PAYMENT')}
                                  className="p-1.5 bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white rounded-lg transition cursor-pointer"
                                  title="Delete Document / Photo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Upload / Replace Action */}
                          <div>
                            <label className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer">
                              <Upload className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{hasFile ? 'Replace Document / Proof' : 'Upload Document / Proof'}</span>
                              <input
                                type="file"
                                accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadSlotDoc(slot.key, slot.title, 'FINAL_PAYMENT', file);
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════ */}
              {/* TAB 4: EXPENSES (PROJECT BIDDING & EXECUTION TRACKER)          */}
              {/* ═════════════════════════════════════════════════════════════ */}
              {activeTabSection === 'expenses' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-cyan-400" />
                        <span>Project Expenses & Financial Outlay Tracker</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Log and calculate all project-related expenditures with attached official receipts, bank deposit slips, and invoices.
                      </p>
                    </div>

                    <button
                      onClick={handleOpenNewExpenseModal}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-cyan-600/20 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Log New Expense</span>
                    </button>
                  </div>

                  {/* Expenses Metrics Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Total Logged Expenses</span>
                      <p className="text-xl font-bold font-mono text-cyan-300">{formatPhpCurrency(totalProjectExpenses)}</p>
                    </div>

                    <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">% of Approved Budget (ABC)</span>
                      <p className="text-xl font-bold font-mono text-amber-300">{expenseAbcPercentage.toFixed(2)}%</p>
                    </div>

                    <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Attached Receipts Verified</span>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-bold font-mono text-emerald-400">
                          {expensesWithReceiptsCount} <span className="text-xs text-slate-500">/ {expenses.length} Records</span>
                        </p>
                        {expenses.length > 0 && (
                          <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono rounded-full font-bold">
                            {Math.round((expensesWithReceiptsCount / expenses.length) * 100)}% Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expenses Table */}
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/90 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Description / Item</th>
                            <th className="p-3">OR / Invoice #</th>
                            <th className="p-3">Disbursed By</th>
                            <th className="p-3 text-right">Amount (PHP)</th>
                            <th className="p-3">Attached Receipt / Proof</th>
                            <th className="p-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {expenses.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="p-8 text-center text-slate-500 text-xs">
                                No expense entries recorded for this project yet. Click "+ Log New Expense" to record expenditures and attach official receipts.
                              </td>
                            </tr>
                          ) : (
                            expenses.map(exp => (
                              <tr key={exp.id} className="hover:bg-slate-900/40 transition">
                                <td className="p-3 font-mono text-slate-300 whitespace-nowrap">{exp.date}</td>
                                <td className="p-3 whitespace-nowrap">
                                  <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-mono rounded">
                                    {exp.category}
                                  </span>
                                </td>
                                <td className="p-3 font-medium text-white max-w-xs">{exp.description}</td>
                                <td className="p-3 font-mono text-slate-400 whitespace-nowrap">{exp.orNumber}</td>
                                <td className="p-3 text-slate-400 whitespace-nowrap">{exp.paidBy || 'Finance'}</td>
                                <td className="p-3 font-mono font-bold text-emerald-400 text-right whitespace-nowrap">{formatPhpCurrency(exp.amount)}</td>
                                <td className="p-3">
                                  {exp.receiptFileName ? (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-[11px] font-mono max-w-[180px] truncate" title={exp.receiptFileName}>
                                        <Paperclip className="w-3 h-3 shrink-0 text-emerald-400" />
                                        <span className="truncate">{exp.receiptFileName}</span>
                                        {exp.receiptFileSizeBytes && (
                                          <span className="text-[9px] text-emerald-400/70 shrink-0">({formatBytes(exp.receiptFileSizeBytes)})</span>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleViewExpenseReceipt(exp)}
                                        className="p-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-md transition cursor-pointer"
                                        title="View Attached Receipt"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      <label className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition cursor-pointer" title="Replace Attached Receipt">
                                        <Upload className="w-3.5 h-3.5" />
                                        <input
                                          type="file"
                                          accept=".pdf,image/png,image/jpeg,image/webp,image/jpg"
                                          className="hidden"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleDirectUploadReceipt(exp.id, file);
                                          }}
                                        />
                                      </label>
                                    </div>
                                  ) : (
                                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-dashed border-slate-700 hover:border-slate-600 rounded-lg text-[11px] font-medium transition cursor-pointer">
                                      <Paperclip className="w-3 h-3 text-cyan-400" />
                                      <span>+ Attach Receipt</span>
                                      <input
                                        type="file"
                                        accept=".pdf,image/png,image/jpeg,image/webp,image/jpg"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleDirectUploadReceipt(exp.id, file);
                                        }}
                                      />
                                    </label>
                                  )}
                                </td>
                                <td className="p-3 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleOpenEditExpenseModal(exp)}
                                      className="p-1 text-slate-400 hover:text-cyan-300 transition cursor-pointer"
                                      title="Edit Expense"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteExpense(exp.id)}
                                      className="p-1 text-slate-500 hover:text-red-400 transition cursor-pointer"
                                      title="Delete Expense"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════ */}
              {/* TAB 5: BID DOCS (3-COPY MERGED REPOSITORY & STATUTORY DOSSIER) */}
              {/* ═════════════════════════════════════════════════════════════ */}
              {activeTabSection === 'bid_docs' && (
                <div className="space-y-6">
                  {/* Top Bar Banner & Quick Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-purple-400" />
                        <span>Bid Docs — Master Bidding Package & Statutory Dossier</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Official repository of 3-copy merged packages (Original, Copy 1, Copy 2) and all Legal, Technical, and Financial bidding documents for this project.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenMergedPackage('ORIGINAL')}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-purple-600/20 border border-purple-400/30 cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Open 3-Copy Merged Viewer</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleSetActiveWorkspaceProject(selectedProject);
                          setActiveTab('bids');
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
                      >
                        <FolderKanban className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Bid Package Builder</span>
                      </button>
                    </div>
                  </div>

                  {/* ───────────────────────────────────────────────────────────── */}
                  {/* 1. MASTER 3-COPY MERGED BIDDING PACKAGES (ORIGINAL, COPY 1, 2) */}
                  {/* ───────────────────────────────────────────────────────────── */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <FileStack className="w-4 h-4 text-purple-400" />
                        <span>3-Copy Merged Packages (RA 9184 & RA 12009 Standards)</span>
                      </span>
                      <span className="text-[10px] font-mono text-purple-400 font-bold">
                        Philippine Legal Paper (8.5" x 13")
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* 1. ORIGINAL COPY */}
                      <div className="p-4 bg-gradient-to-b from-blue-950/30 to-slate-900/90 border border-blue-500/40 rounded-2xl space-y-3 relative overflow-hidden shadow-lg flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono uppercase font-bold text-blue-400">Primary Folder</span>
                            <CyberBadge label="ORIGINAL" variant="blue" />
                          </div>
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>Original Bid Document Package</span>
                          </h4>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                            Complete master compilation containing Envelope 1 (Legal & Technical) and Envelope 2 (Financial) with un-watermarked master proposal and original notarized documents.
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenMergedPackage('ORIGINAL')}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Original</span>
                          </button>
                        </div>
                      </div>

                      {/* 2. COPY 1 */}
                      <div className="p-4 bg-gradient-to-b from-purple-950/30 to-slate-900/90 border border-purple-500/40 rounded-2xl space-y-3 relative overflow-hidden shadow-lg flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono uppercase font-bold text-purple-400">First Certified Copy</span>
                            <CyberBadge label="COPY 1" variant="purple" />
                          </div>
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>Copy 1 (First Certified True Copy)</span>
                          </h4>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                            Stamped on every page with official "CERTIFIED TRUE COPY — COPY 1", authorized signatory stamp, and date stamp pursuant to statutory procurement requirements.
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenMergedPackage('COPY_1')}
                            className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Copy 1</span>
                          </button>
                        </div>
                      </div>

                      {/* 3. COPY 2 */}
                      <div className="p-4 bg-gradient-to-b from-emerald-950/30 to-slate-900/90 border border-emerald-500/40 rounded-2xl space-y-3 relative overflow-hidden shadow-lg flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono uppercase font-bold text-emerald-400">Second Certified Copy</span>
                            <CyberBadge label="COPY 2" variant="emerald" />
                          </div>
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>Copy 2 (Second Certified True Copy)</span>
                          </h4>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                            Stamped on every page with official "CERTIFIED TRUE COPY — COPY 2" for duplicate BAC evaluation committee members and statutory archives.
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenMergedPackage('COPY_2')}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Copy 2</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* ───────────────────────────────────────────────────────────── */}
                  {/* 2. ALL STATUTORY BIDDING DOCUMENTS (LEGAL, TECH, FINANCIAL)   */}
                  {/* ───────────────────────────────────────────────────────────── */}
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-cyan-400" />
                          <span>All Bidding Documents ({statutoryDocsList.length} Items)</span>
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Inspect and preview individual Legal, Technical, and Financial bidding forms and verified attachments.
                        </p>
                      </div>

                      {/* Search Filter */}
                      <div className="relative min-w-[240px]">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search document title or code..."
                          value={bidDocSearchQuery}
                          onChange={(e) => setBidDocSearchQuery(e.target.value)}
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                        />
                        {bidDocSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setBidDocSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Category Filter Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setBidDocCategoryFilter('ALL')}
                        className={`px-3 py-1.5 rounded-xl transition shrink-0 cursor-pointer ${
                          bidDocCategoryFilter === 'ALL'
                            ? 'bg-blue-600 text-white font-bold shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        All Documents ({statutoryDocsList.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setBidDocCategoryFilter('LEGAL')}
                        className={`px-3 py-1.5 rounded-xl transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                          bidDocCategoryFilter === 'LEGAL'
                            ? 'bg-blue-600 text-white font-bold shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        <span>⚖️ Legal Documents</span>
                        <span className="px-1.5 py-0.2 bg-black/40 rounded text-[10px] font-mono">
                          {statutoryDocsList.filter(d => d.category === 'LEGAL').length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBidDocCategoryFilter('TECHNICAL')}
                        className={`px-3 py-1.5 rounded-xl transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                          bidDocCategoryFilter === 'TECHNICAL'
                            ? 'bg-cyan-600 text-white font-bold shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        <span>🛠️ Technical Proposal</span>
                        <span className="px-1.5 py-0.2 bg-black/40 rounded text-[10px] font-mono">
                          {statutoryDocsList.filter(d => d.category === 'TECHNICAL').length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBidDocCategoryFilter('FINANCIAL')}
                        className={`px-3 py-1.5 rounded-xl transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                          bidDocCategoryFilter === 'FINANCIAL'
                            ? 'bg-emerald-600 text-white font-bold shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        <span>💰 Financial Proposal</span>
                        <span className="px-1.5 py-0.2 bg-black/40 rounded text-[10px] font-mono">
                          {statutoryDocsList.filter(d => d.category === 'FINANCIAL').length}
                        </span>
                      </button>
                    </div>

                    {/* Documents Table / Grid */}
                    <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60 shadow-xl">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-900/90 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="p-3.5">#</th>
                              <th className="p-3.5">Document Title & Statutory Reference</th>
                              <th className="p-3.5">Category</th>
                              <th className="p-3.5">Envelope</th>
                              <th className="p-3.5 text-center">Format & Size</th>
                              <th className="p-3.5 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {filteredBidDocs.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                                  No bidding documents matching "{bidDocSearchQuery}" in this category.
                                </td>
                              </tr>
                            ) : (
                              filteredBidDocs.map((doc, idx) => {
                                const vaultMatch = vaultDocs.find(v => 
                                  (doc.vaultMatchCategory && v.category === doc.vaultMatchCategory) ||
                                  (v.documentCode && v.documentCode.toUpperCase() === doc.code.toUpperCase()) ||
                                  (v.documentName && v.documentName.toLowerCase().includes(doc.name.toLowerCase()))
                                );
                                const isAttached = !!vaultMatch;
                                const isGenerating = isGeneratingDocPdf === doc.id;

                                return (
                                  <tr key={doc.id} className="hover:bg-slate-900/40 transition">
                                    <td className="p-3.5 font-mono text-slate-500 text-[11px]">{idx + 1}</td>
                                    
                                    <td className="p-3.5">
                                      <div className="space-y-0.5 max-w-md">
                                        <p className="font-bold text-white text-xs">{doc.name}</p>
                                        <p className="text-[10px] text-slate-400 line-clamp-1">{doc.description || doc.code}</p>
                                        <span className="text-[9px] font-mono text-slate-500 block">Code: {doc.code}</span>
                                      </div>
                                    </td>

                                    <td className="p-3.5">
                                      {doc.category === 'LEGAL' && (
                                        <span className="px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-500/40 rounded text-[10px] font-mono font-bold">
                                          LEGAL
                                        </span>
                                      )}
                                      {doc.category === 'TECHNICAL' && (
                                        <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-500/40 rounded text-[10px] font-mono font-bold">
                                          TECHNICAL
                                        </span>
                                      )}
                                      {doc.category === 'FINANCIAL' && (
                                        <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-mono font-bold">
                                          FINANCIAL
                                        </span>
                                      )}
                                    </td>

                                    <td className="p-3.5">
                                      <span className="text-[10px] font-mono text-slate-300">
                                        {doc.envelope === 'ENVELOPE_1' ? 'Envelope 1 (Tech & Legal)' : 'Envelope 2 (Financial)'}
                                      </span>
                                    </td>

                                    <td className="p-3.5 text-center">
                                      <span className="text-[10px] font-mono text-slate-400">
                                        Legal (8.5" x 13")
                                      </span>
                                    </td>

                                    <td className="p-3.5 text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <button
                                          type="button"
                                          disabled={isGenerating}
                                          onClick={() => handlePreviewBidDoc(doc)}
                                          className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 border border-blue-500/30 cursor-pointer disabled:opacity-50"
                                          title="Preview Document in Full Screen Modal"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                          <span>View</span>
                                        </button>

                                        <button
                                          type="button"
                                          disabled={isGenerating}
                                          onClick={() => handleDownloadBidDoc(doc)}
                                          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition border border-slate-800 cursor-pointer disabled:opacity-50"
                                          title="Download PDF"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════ */}
              {/* TAB 6: STATUTORY DOCUMENTS (15 STATUTORY PROCUREMENT FORMS)   */}
              {/* ═════════════════════════════════════════════════════════════ */}
              {(activeTabSection === 'statutory_docs' || activeTabSection === 'other_docs') && (
                <div className="space-y-6">
                  {/* Top Header & Metrics */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-400" />
                        <span>Statutory Construction & Procurement Documents (15 Forms)</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Official Philippine Government (RA 9184 / RA 12009 / DPWH) statutory execution, billing, and close-out documents on Philippine Legal (8.5" x 13").
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStatutoryGuideCode('RLA');
                          setShowStatutoryGuideModal(true);
                        }}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/20 cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>📘 Filing & Answering Guide</span>
                      </button>

                      <span className="px-2.5 py-1 bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 rounded-lg text-xs font-mono font-bold">
                        {Object.keys(statutoryDocs).length} / {STATUTORY_DOCUMENT_SLOTS.length} COMPLETED
                      </span>
                    </div>
                  </div>

                  {/* 15 Statutory Document Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                    {STATUTORY_DOCUMENT_SLOTS.map((slot) => {
                      const docMeta = statutoryDocs[slot.key];
                      const isCompleted = !!docMeta;

                      return (
                        <div
                          key={slot.key}
                          className={`p-4 rounded-xl border transition flex flex-col justify-between relative group ${
                            isCompleted
                              ? 'bg-slate-950/80 border-emerald-500/40 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/20'
                              : 'bg-slate-950/50 hover:bg-slate-900/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 bg-blue-950 text-blue-300 font-mono font-bold text-[10px] rounded border border-blue-800/60">
                                  {slot.code}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedStatutoryGuideCode(slot.code);
                                    setShowStatutoryGuideModal(true);
                                  }}
                                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-emerald-950 text-slate-400 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 rounded text-[10px] font-mono flex items-center gap-1 transition cursor-pointer"
                                  title={`View How to Answer Guide for ${slot.name}`}
                                >
                                  <HelpCircle className="w-3 h-3 text-emerald-400" />
                                  <span>Guide</span>
                                </button>
                              </div>

                              {isCompleted ? (
                                <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700/60 flex items-center gap-1 font-mono">
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  READY / ATTACHED
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                                  PENDING
                                </span>
                              )}
                            </div>

                            <h4 className="text-xs font-bold text-white mt-2 leading-snug">
                              {slot.name}
                            </h4>

                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                              {slot.description}
                            </p>

                            {isCompleted && (
                              <p className="text-[10px] text-slate-500 font-mono mt-2">
                                {docMeta.fileName || `${slot.code}.pdf`} • {docMeta.fileSizeBytes ? `${(docMeta.fileSizeBytes / 1024).toFixed(1)} KB` : 'Attached'}
                              </p>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-slate-800/80">
                            <button
                              onClick={() => setActiveStatutoryModal(slot.templateType)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow ${
                                isCompleted
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/20'
                              }`}
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>{isCompleted ? 'Edit Form' : slot.isUploadOnly ? 'Upload Doc' : 'Fill Form'}</span>
                            </button>

                            {isCompleted && (
                              <>
                                <button
                                  onClick={() => handlePreviewStatutoryDoc(slot.key, slot.name)}
                                  className="p-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg transition cursor-pointer border border-blue-500/30"
                                  title="View PDF"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={async () => {
                                    let dataUrl = docMeta?.fileDataUrl;
                                    if (!dataUrl) {
                                      const docKey = `proj_statutory_${tenantId}_${projectScopeKey}_${slot.key}`;
                                      dataUrl = (await loadPdfData(docKey)) || '';
                                    }
                                    if (dataUrl) {
                                      const a = document.createElement('a');
                                      a.href = dataUrl;
                                      a.download = `${slot.code}_${projectScopeKey}.pdf`;
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                    }
                                  }}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer border border-slate-700"
                                  title="Download PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteStatutoryDoc(slot.key, slot.name)}
                                  className="p-1.5 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-lg transition cursor-pointer border border-red-500/30"
                                  title="Delete Attachment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Supplementary Attachments Section */}
                  <div className="pt-6 border-t border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-blue-400" />
                          <span>Custom Supplementary Project Attachments</span>
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Upload supplemental bid bulletins, pre-bid minutes, site inspection logs, and custom technical notes.
                        </p>
                      </div>

                      <button
                        onClick={() => setShowNewOtherDocModal(true)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-blue-400" />
                        <span>Add Supplementary File</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {otherDocs.length === 0 ? (
                        <div className="col-span-2 p-6 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
                          No supplemental files attached. Click "+ Add Supplementary File" to attach additional documents.
                        </div>
                      ) : (
                        otherDocs.map(doc => (
                          <div key={doc.slotKey} className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                            <div className="truncate mr-3">
                              <h4 className="text-xs font-bold text-white truncate">{doc.slotTitle}</h4>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                                {doc.fileName} • {doc.fileSizeBytes ? `${(doc.fileSizeBytes / 1024).toFixed(1)} KB` : ''}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={async () => {
                                  let dataUrl = doc.fileDataUrl;
                                  if (!dataUrl) {
                                    dataUrl = await loadPdfData(`proj_other_${tenantId}_${projectScopeKey}_${doc.slotKey}`);
                                  }
                                  if (dataUrl) {
                                    setPreviewPdfModal({ title: doc.slotTitle, fileName: doc.fileName || 'document.pdf', dataUrl });
                                  }
                                }}
                                className="p-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg transition cursor-pointer"
                                title="Preview"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Delete ${doc.slotTitle}?`)) {
                                    const updated = otherDocs.filter(d => d.slotKey !== doc.slotKey);
                                    setOtherDocs(updated);
                                    localStorage.setItem(`bidocs_other_docs_${tenantId}_${projectScopeKey}`, JSON.stringify(updated));
                                  }
                                }}
                                className="p-1.5 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-lg transition cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="p-10 sm:p-12 text-center bg-slate-900/60 border border-slate-800/90 rounded-2xl space-y-4 shadow-2xl backdrop-blur-md relative overflow-hidden">
              <BorderBeam size={220} duration={14} delay={0} />
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-2xl w-16 h-16 mx-auto flex items-center justify-center shadow-lg">
                <FolderKanban className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-lg mx-auto">
                <h3 className="text-lg font-black text-white">No Merged Bidding Projects Found</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  In accordance with your bidding governance workflow, projects will only be visible in <strong>Project Status</strong> after their Bidding Documents package (Original, Copy 1, and Copy 2) has been compiled, merged, and completed in the <strong>Bid Package Builder</strong>.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                <button
                  onClick={() => setActiveTab('bids')}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-blue-600/30 border border-blue-400/40 cursor-pointer"
                >
                  <FolderKanban className="w-4 h-4" />
                  <span>Open Bid Package Builder</span>
                </button>
                <button
                  onClick={() => setActiveTab('opportunities')}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Browse Opportunities</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ADD / EDIT EXPENSE                                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingExpense ? 'Edit Project Expense' : 'Log Project Expense'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Record expenditure details and attach official receipt or invoice proof.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-mono">EXPENSE CATEGORY *</label>
                <select
                  value={expenseFormCategory}
                  onChange={(e) => setExpenseFormCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">DESCRIPTION / PARTICULARS *</label>
                <input
                  type="text"
                  value={expenseFormDesc}
                  onChange={(e) => setExpenseFormDesc(e.target.value)}
                  placeholder="e.g. Purchase of Official Standard Bidding Documents (ITB)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-400 mb-1 font-mono font-bold">AMOUNT (PHP) *</label>
                  <input
                    type="text"
                    value={expenseFormAmount}
                    onChange={(e) => setExpenseFormAmount(e.target.value)}
                    placeholder="5,000.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-mono">OR / INVOICE NO.</label>
                  <input
                    type="text"
                    value={expenseFormOr}
                    onChange={(e) => setExpenseFormOr(e.target.value)}
                    placeholder="OR-908123"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-mono">DATE OF EXPENSE</label>
                  <input
                    type="date"
                    value={expenseFormDate}
                    onChange={(e) => setExpenseFormDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-mono">DISBURSED / PAID BY</label>
                  <input
                    type="text"
                    value={expenseFormPaidBy}
                    onChange={(e) => setExpenseFormPaidBy(e.target.value)}
                    placeholder="Finance Officer / Custodian"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────── */}
              {/* RECEIPT / PAYMENT PROOF UPLOAD SECTION                      */}
              {/* ─────────────────────────────────────────────────────────── */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-cyan-400 font-mono font-bold flex items-center gap-1.5 text-[11px] uppercase">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Official Receipt / Proof of Payment</span>
                  </label>
                  {expenseFormReceiptName && (
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Attached</span>
                    </span>
                  )}
                </div>

                {expenseFormReceiptName ? (
                  <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg shrink-0">
                        {expenseFormReceiptType?.includes('pdf') ? (
                          <FileText className="w-4 h-4" />
                        ) : (
                          <ImageIcon className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{expenseFormReceiptName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {expenseFormReceiptSize ? formatBytes(expenseFormReceiptSize) : 'File Attached'} • {expenseFormReceiptType?.includes('pdf') ? 'PDF Document' : 'Image Receipt'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {expenseFormReceiptDataUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewPdfModal({
                              title: `Receipt Preview — ${expenseFormDesc || 'Expense'}`,
                              fileName: expenseFormReceiptName,
                              dataUrl: expenseFormReceiptDataUrl
                            });
                          }}
                          className="p-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg transition cursor-pointer"
                          title="Preview Receipt"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <label
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                        title="Replace Receipt File"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept=".pdf,image/png,image/jpeg,image/webp,image/jpg"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleExpenseReceiptFileChange(f);
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveReceiptInModal}
                        className="p-1.5 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-lg transition cursor-pointer"
                        title="Remove Receipt"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500/70 bg-slate-900/50 hover:bg-slate-900 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition">
                    <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-200">
                      Click to upload or drag & drop receipt
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Official Receipt (OR), Bank Deposit Slip, Cash Voucher, or Invoice (PDF, PNG, JPG, WEBP)
                    </span>
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/webp,image/jpg"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleExpenseReceiptFileChange(f);
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveExpense}
                className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{editingExpense ? 'Update Expense' : 'Save Expense'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ADD OTHER DOCUMENT                                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showNewOtherDocModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Add Supplementary Document</span>
              </h3>
              <button onClick={() => setShowNewOtherDocModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">DOCUMENT TITLE *</label>
                <input
                  type="text"
                  value={newOtherDocTitle}
                  onChange={(e) => setNewOtherDocTitle(e.target.value)}
                  placeholder="e.g. Supplemental Bid Bulletin No. 1"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">SELECT PDF FILE *</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadOtherDoc(file);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowNewOtherDocModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: DOCUMENT & RECEIPT PREVIEW (PDF OR IMAGE)                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {previewPdfModal && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col p-4 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl max-w-6xl mx-auto w-full">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  {previewPdfModal.dataUrl?.startsWith('data:image/') ? (
                    <ImageIcon className="w-5 h-5 text-cyan-400" />
                  ) : (
                    <FileText className="w-5 h-5 text-blue-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{previewPdfModal.title}</h3>
                  <p className="text-xs text-slate-400 font-mono">{previewPdfModal.fileName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewPdfModal.dataUrl}
                  download={previewPdfModal.fileName}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition shadow cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setPreviewPdfModal(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-950 p-2 overflow-auto flex items-center justify-center">
              {previewPdfModal.dataUrl?.startsWith('data:image/') ? (
                <div className="max-w-full max-h-full flex items-center justify-center p-4">
                  <img
                    src={previewPdfModal.dataUrl}
                    alt={previewPdfModal.title}
                    className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl border border-slate-800"
                  />
                </div>
              ) : (
                <iframe
                  src={previewPdfModal.dataUrl}
                  title={previewPdfModal.title}
                  className="w-full h-full border-none rounded-xl bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: CREATE / EDIT PROJECT PROFILE                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl space-y-4 p-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isEditing ? 'Edit Project Status' : 'Create New Project Status'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Enter bidding parameters, ABC details, and BAC Procuring Entity specifications.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddEditModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              <div>
                <label className="block text-slate-400 font-mono mb-1">PROJECT TITLE / CONTRACT NAME *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Supply and Delivery of IT Equipment for Regional Offices"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">PHILGEPS REF NO. *</label>
                  <input
                    type="text"
                    value={formPhilgepsRefNo}
                    onChange={(e) => setFormPhilgepsRefNo(e.target.value)}
                    placeholder="PhilGEPS-13207699"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">SOLICITATION / ITB NO.</label>
                  <input
                    type="text"
                    value={formSolNo}
                    onChange={(e) => setFormSolNo(e.target.value)}
                    placeholder="ITB-2026-004"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">PROJECT REF NO.</label>
                  <input
                    type="text"
                    value={formProjRefNo}
                    onChange={(e) => setFormProjRefNo(e.target.value)}
                    placeholder="PROJECT-REF-01"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">PROCUREMENT CATEGORY</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="GOODS">Goods & Supply</option>
                    <option value="INFRASTRUCTURE">Infrastructure</option>
                    <option value="CONSULTING_SERVICES">Consulting Services</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">SECTOR</label>
                  <select
                    value={formSector}
                    onChange={(e) => setFormSector(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Government">Government / Public</option>
                    <option value="Private">Private Commercial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">LEGAL REGIME</label>
                  <select
                    value={formRegime}
                    onChange={(e) => setFormRegime(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="RA_9184">RA 9184 (Standard)</option>
                    <option value="RA_12009_NGPA">RA 12009 (New NGPA)</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-emerald-400 font-mono font-bold">APPROVED BUDGET FOR THE CONTRACT (ABC in PHP) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₱</span>
                  <input
                    type="text"
                    value={formAbcInput}
                    onChange={(e) => {
                      setFormAbcInput(e.target.value);
                      setFormAbc(parsePhpCurrency(e.target.value));
                    }}
                    placeholder="1,500,000.00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-white font-mono font-bold text-sm"
                  />
                </div>
                <p className="text-[11px] font-serif italic text-slate-400">
                  Amount in words: {numberToWords(formAbc || parsePhpCurrency(formAbcInput))}
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-blue-400 font-mono uppercase">
                  Procuring Entity & BAC Secretariat
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">PROCURING ENTITY NAME *</label>
                    <input
                      type="text"
                      value={formEntityName}
                      onChange={(e) => setFormEntityName(e.target.value)}
                      placeholder="e.g. Provincial Government of Bohol"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">OFFICE ADDRESS / LOCATION</label>
                    <input
                      type="text"
                      value={formEntityAddress}
                      onChange={(e) => setFormEntityAddress(e.target.value)}
                      placeholder="e.g. Capitol Complex, Tagbilaran City"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">BAC CONTACT PERSON</label>
                    <input
                      type="text"
                      value={formEntityContactPerson}
                      onChange={(e) => setFormEntityContactPerson(e.target.value)}
                      placeholder="e.g. Atty. Juan Santos"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">CONTACT NUMBER</label>
                    <input
                      type="text"
                      value={formEntityContactNumber}
                      onChange={(e) => setFormEntityContactNumber(e.target.value)}
                      placeholder="e.g. (038) 411-2000"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">OFFICIAL EMAIL</label>
                    <input
                      type="email"
                      value={formEntityEmail}
                      onChange={(e) => setFormEntityEmail(e.target.value)}
                      placeholder="bac@bohol.gov.ph"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">PRE-BID DATE & TIME</label>
                  <input
                    type="datetime-local"
                    value={formPreBidDate}
                    onChange={(e) => setFormPreBidDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-red-400 font-mono mb-1 font-bold">SUBMISSION DEADLINE *</label>
                  <input
                    type="datetime-local"
                    value={formDeadlineDate}
                    onChange={(e) => setFormDeadlineDate(e.target.value)}
                    className="w-full bg-slate-950 border border-red-500/50 rounded-xl px-2.5 py-1.5 text-white text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">BID OPENING DATE</label>
                  <input
                    type="datetime-local"
                    value={formBidOpeningDate}
                    onChange={(e) => setFormBidOpeningDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">PROJECT NOTES & SPECIFICATIONS</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Additional project notes, scope items, or special instructions..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddEditModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProjectProfile}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Project Status</span>
              </button>
            </div>

          </div>
        </div>
      )}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FULL SCREEN MODAL: PDF PREVIEW MODAL FOR INDIVIDUAL BID DOCS        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {previewVaultDoc && (
        <PdfPreviewModal
          item={previewVaultDoc}
          tenant={currentTenant}
          onClose={() => setPreviewVaultDoc(null)}
          pdfDataUrl={previewVaultDoc.fileDataUrl}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FULL SCREEN MODAL: 3-COPY MERGED PACKAGE VIEWER MODAL               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showMergedPackageViewerModal && selectedProject && (
        <MergedPackageViewerModal
          isOpen={showMergedPackageViewerModal}
          onClose={() => setShowMergedPackageViewerModal(false)}
          items={computedPackageItems}
          vaultDocs={vaultDocs}
          tenant={currentTenant}
          activeProject={selectedProject}
          projectRefNo={selectedProject.projectReferenceNumber || selectedProject.philgepsRefNo || ''}
          projectTitle={selectedProject.title || ''}
          procuringEntity={selectedProject.procuringEntity || 'Bids and Awards Committee'}
          activeEnvelope="ENVELOPE_1"
          initialFolderCopy={mergedModalFolderCopy}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 15 STATUTORY DOCUMENT TEMPLATE MODALS (OVERLAYS)                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeStatutoryModal === 'RLA' && (
        <RlaModal
          tenant={currentTenant}
          activeProjectRefNo={selectedProject?.projectReferenceNumber || selectedProject?.philgepsRefNo || ''}
          activeProjectTitle={selectedProject?.title || ''}
          activeProcuringEntity={selectedProject?.procuringEntity || 'Bids and Awards Committee'}
          procuringEntityAddress={selectedProject?.procuringEntityAddress || ''}
          procuringEntityContactPerson={selectedProject?.procuringEntityContactPerson || ''}
          headOfProcuringEntity={selectedProject?.headOfProcuringEntity || ''}
          headOfProcuringEntityPosition={selectedProject?.headOfProcuringEntityPosition || ''}
          solicitationNumber={selectedProject?.solicitationNumber || ''}
          contractAmount={selectedProject?.approvedBudget || 0}
          projectLocation={selectedProject?.areaOfDelivery || ''}
          onSaveAndComplete={(dataUrl, name, refNo, title) => {
            handleSaveStatutoryDoc('rla', dataUrl, name, refNo, title);
            setActiveStatutoryModal(null);
          }}
          onClose={() => setActiveStatutoryModal(null)}
        />
      )}

      {activeStatutoryModal === 'SWA' && (
        <SwaModal
          tenant={currentTenant}
          activeProjectRefNo={selectedProject?.projectReferenceNumber || selectedProject?.philgepsRefNo || ''}
          activeProjectTitle={selectedProject?.title || ''}
          activeProcuringEntity={selectedProject?.procuringEntity || 'Bids and Awards Committee'}
          procuringEntityAddress={selectedProject?.procuringEntityAddress || ''}
          procuringEntityContactPerson={selectedProject?.procuringEntityContactPerson || ''}
          headOfProcuringEntity={selectedProject?.headOfProcuringEntity || ''}
          headOfProcuringEntityPosition={selectedProject?.headOfProcuringEntityPosition || ''}
          solicitationNumber={selectedProject?.solicitationNumber || ''}
          contractAmount={selectedProject?.approvedBudget || 0}
          projectLocation={selectedProject?.areaOfDelivery || ''}
          onSaveAndComplete={(dataUrl, name, refNo, title) => {
            handleSaveStatutoryDoc('swa', dataUrl, name, refNo, title);
            setActiveStatutoryModal(null);
          }}
          onClose={() => setActiveStatutoryModal(null)}
        />
      )}

      {activeStatutoryModal === 'PROGRESS_PHOTO' && (
        <ProgressphotoModal
          tenant={currentTenant}
          activeProjectRefNo={selectedProject?.projectReferenceNumber || selectedProject?.philgepsRefNo || ''}
          activeProjectTitle={selectedProject?.title || ''}
          activeProcuringEntity={selectedProject?.procuringEntity || 'Bids and Awards Committee'}
          procuringEntityAddress={selectedProject?.procuringEntityAddress || ''}
          procuringEntityContactPerson={selectedProject?.procuringEntityContactPerson || ''}
          headOfProcuringEntity={selectedProject?.headOfProcuringEntity || ''}
          headOfProcuringEntityPosition={selectedProject?.headOfProcuringEntityPosition || ''}
          solicitationNumber={selectedProject?.solicitationNumber || ''}
          contractAmount={selectedProject?.approvedBudget || 0}
          projectLocation={selectedProject?.areaOfDelivery || ''}
          onSaveAndComplete={(dataUrl, name, refNo, title) => {
            handleSaveStatutoryDoc('progress_photo', dataUrl, name, refNo, title);
            setActiveStatutoryModal(null);
          }}
          onClose={() => setActiveStatutoryModal(null)}
        />
      )}

      {activeStatutoryModal === 'MTS' && (
        <MtsModal
          tenant={currentTenant}
          activeProjectRefNo={selectedProject?.projectReferenceNumber || selectedProject?.philgepsRefNo || ''}
          activeProjectTitle={selectedProject?.title || ''}
          activeProcuringEntity={selectedProject?.procuringEntity || 'Bids and Awards Committee'}
          procuringEntityAddress={selectedProject?.procuringEntityAddress || ''}
          procuringEntityContactPerson={selectedProject?.procuringEntityContactPerson || ''}
          headOfProcuringEntity={selectedProject?.headOfProcuringEntity || ''}
          headOfProcuringEntityPosition={selectedProject?.headOfProcuringEntityPosition || ''}
          solicitationNumber={selectedProject?.solicitationNumber || ''}
          contractAmount={selectedProject?.approvedBudget || 0}
          projectLocation={selectedProject?.areaOfDelivery || ''}
          onSaveAndComplete={(dataUrl, name, refNo, title) => {
            handleSaveStatutoryDoc('mts', dataUrl, name, refNo, title);
            setActiveStatutoryModal(null);
          }}
          onClose={() => setActiveStatutoryModal(null)}
        />
      )}

      {activeStatutoryModal === 'CA' && (
        <CaModal
          tenant={currentTenant}
          activeProjectRefNo={selectedProject?.projectReferenceNumber || selectedProject?.philgepsRefNo || ''}
          activeProjectTitle={selectedProject?.title || ''}
          activeProcuringEntity={selectedProject?.procuringEntity || 'Bids and Awards Committee'}
          procuringEntityAddress={selectedProject?.procuringEntityAddress || ''}
          procuringEntityContactPerson={selectedProject?.procuringEntityContactPerson || ''}
          headOfProcuringEntity={selectedProject?.headOfProcuringEntity || ''}
          headOfProcuringEntityPosition={selectedProject?.headOfProcuringEntityPosition || ''}
          solicitationNumber={selectedProject?.solicitationNumber || ''}
          contractAmount={selectedProject?.approvedBudget || 0}
          projectLocation={selectedProject?.areaOfDelivery || ''}
          onSaveAndComplete={(dataUrl, name, refNo, title) => {
            handleSaveStatutoryDoc('ca', dataUrl, name, refNo, title);
            setActiveStatutoryModal(null);
          }}
          onClose={() => setActiveStatutoryModal(null)}
        />
      )}

      {activeStatutoryModal === 'POW' && (
        <PowModal
          tenant={currentTenant}
          activeProjectRefNo={selectedProject?.projectReferenceNumber || selectedProject?.philgepsRefNo || ''}
          activeProjectTitle={selectedProject?.title || ''}
          activeProcuringEntity={selectedProject?.procuringEntity || 'Bids and Awards Committee'}
          procuringEntityAddress={selectedProject?.procuringEntityAddress || ''}
          procuringEntityContactPerson={selectedProject?.procuringEntityContactPerson || ''}
          headOfProcuringEntity={selectedProject?.headOfProcuringEntity || ''}
          headOfProcuringEntityPosition={selectedProject?.headOfProcuringEntityPosition || ''}
          solicitationNumber={selectedProject?.solicitationNumber || ''}
          contractAmount={selectedProject?.approvedBudget || 0}
          projectLocation={selectedProject?.areaOfDelivery || ''}
          onSaveAndComplete={(dataUrl, name, refNo, title) => {
            handleSaveStatutoryDoc('pow', dataUrl, name, refNo, title);
            setActiveStatutoryModal(null);
          }}
          onClose={() => setActiveStatutoryModal(null)}
        />
      )}

      {activeStatutoryModal === 'ABP' && (
        <AbpModal
          tenant={currentTenant}
          activeProjectRefNo={selectedProject?.projectReferenceNumber || selectedProject?.philgepsRefNo || ''}
          activeProjectTitle={selectedProject?.title || ''}
          activeProcuringEntity={selectedProject?.procuringEntity || 'Bids and Awards Committee'}
          procuringEntityAddress={selectedProject?.procuringEntityAddress || ''}
          procuringEntityContactPerson={selectedProject?.procuringEntityContactPerson || ''}
          headOfProcuringEntity={selectedProject?.headOfProcuringEntity || ''}
          headOfProcuringEntityPosition={selectedProject?.headOfProcuringEntityPosition || ''}
          solicitationNumber={selectedProject?.solicitationNumber || ''}
          contractAmount={selectedProject?.approvedBudget || 0}
          projectLocation={selectedProject?.areaOfDelivery || ''}
          onSaveAndComplete={(dataUrl, name, refNo, title) => {
            handleSaveStatutoryDoc('abp', dataUrl, name, refNo, title);
            setActiveStatutoryModal(null);
          }}
          onClose={() => setActiveStatutoryModal(null)}
        />
      )}

      {activeStatutoryModal === 'WS' && (
        <WsModal
          tenant={currentTenant}
          activeProjectRefNo={selectedProject?.projectReferenceNumber || selectedProject?.philgepsRefNo || ''}
          activeProjectTitle={selectedProject?.title || ''}
          activeProcuringEntity={selectedProject?.procuringEntity || 'Bids and Awards Committee'}
          procuringEntityAddress={selectedProject?.procuringEntityAddress || ''}
          procuringEntityContactPerson={selectedProject?.procuringEntityContactPerson || ''}
          headOfProcuringEntity={selectedProject?.headOfProcuringEntity || ''}
          headOfProcuringEntityPosition={selectedProject?.headOfProcuringEntityPosition || ''}
          solicitationNumber={selectedProject?.solicitationNumber || ''}
          contractAmount={selectedProject?.approvedBudget || 0}
          projectLocation={selectedProject?.areaOfDelivery || ''}
          onSaveAndComplete={(dataUrl, name, refNo, title) => {
            handleSaveStatutoryDoc('ws', dataUrl, name, refNo, title);
            setActiveStatutoryModal(null);
          }}
          onClose={() => setActiveStatutoryModal(null)}
        />
      )}

      {activeStatutoryModal === 'BS' && (
        <BsModal
          tenant={currentTenant}
          activeProjectRefNo={selectedProject?.projectReferenceNumber || selectedProject?.philgepsRefNo || ''}
          activeProjectTitle={selectedProject?.title || ''}
          activeProcuringEntity={selectedProject?.procuringEntity || 'Bids and Awards Committee'}
          procuringEntityAddress={selectedProject?.procuringEntityAddress || ''}
          procuringEntityContactPerson={selectedProject?.procuringEntityContactPerson || ''}
          headOfProcuringEntity={selectedProject?.headOfProcuringEntity || ''}
          headOfProcuringEntityPosition={selectedProject?.headOfProcuringEntityPosition || ''}
          solicitationNumber={selectedProject?.solicitationNumber || ''}
          contractAmount={selectedProject?.approvedBudget || 0}
          projectLocation={selectedProject?.areaOfDelivery || ''}
          onSaveAndComplete={(dataUrl, name, refNo, title) => {
            handleSaveStatutoryDoc('bs', dataUrl, name, refNo, title);
            setActiveStatutoryModal(null);
          }}
          onClose={() => setActiveStatutoryModal(null)}
        />
      )}

      {activeStatutoryModal === 'CMS' && (
        <CmsModal
          tenant={currentTenant}
          activeProjectRefNo={selectedProject?.projectReferenceNumber || selectedProject?.philgepsRefNo || ''}
          activeProjectTitle={selectedProject?.title || ''}
          activeProcuringEntity={selectedProject?.procuringEntity || 'Bids and Awards Committee'}
          procuringEntityAddress={selectedProject?.procuringEntityAddress || ''}
          procuringEntityContactPerson={selectedProject?.procuringEntityContactPerson || ''}
          headOfProcuringEntity={selectedProject?.headOfProcuringEntity || ''}
          headOfProcuringEntityPosition={selectedProject?.headOfProcuringEntityPosition || ''}
          solicitationNumber={selectedProject?.solicitationNumber || ''}
          contractAmount={selectedProject?.approvedBudget || 0}
          projectLocation={selectedProject?.areaOfDelivery || ''}
          onSaveAndComplete={(dataUrl, name, refNo, title) => {
            handleSaveStatutoryDoc('cms', dataUrl, name, refNo, title);
            setActiveStatutoryModal(null);
          }}
          onClose={() => setActiveStatutoryModal(null)}
        />
      )}

      {activeStatutoryModal === 'EUP' && (
        <EupModal
          tenant={currentTenant}
          activeProjectRefNo={selectedProject?.projectReferenceNumber || selectedProject?.philgepsRefNo || ''}
          activeProjectTitle={selectedProject?.title || ''}
          activeProcuringEntity={selectedProject?.procuringEntity || 'Bids and Awards Committee'}
          procuringEntityAddress={selectedProject?.procuringEntityAddress || ''}
          procuringEntityContactPerson={selectedProject?.procuringEntityContactPerson || ''}
          headOfProcuringEntity={selectedProject?.headOfProcuringEntity || ''}
          headOfProcuringEntityPosition={selectedProject?.headOfProcuringEntityPosition || ''}
          solicitationNumber={selectedProject?.solicitationNumber || ''}
          contractAmount={selectedProject?.approvedBudget || 0}
          projectLocation={selectedProject?.areaOfDelivery || ''}
          onSaveAndComplete={(dataUrl, name, refNo, title) => {
            handleSaveStatutoryDoc('eup', dataUrl, name, refNo, title);
            setActiveStatutoryModal(null);
          }}
          onClose={() => setActiveStatutoryModal(null)}
        />
      )}

      {activeStatutoryModal === 'FPL' && (
        <FplModal
          tenant={currentTenant}
          activeProjectRefNo={selectedProject?.projectReferenceNumber || selectedProject?.philgepsRefNo || ''}
          activeProjectTitle={selectedProject?.title || ''}
          activeProcuringEntity={selectedProject?.procuringEntity || 'Bids and Awards Committee'}
          procuringEntityAddress={selectedProject?.procuringEntityAddress || ''}
          procuringEntityContactPerson={selectedProject?.procuringEntityContactPerson || ''}
          headOfProcuringEntity={selectedProject?.headOfProcuringEntity || ''}
          headOfProcuringEntityPosition={selectedProject?.headOfProcuringEntityPosition || ''}
          solicitationNumber={selectedProject?.solicitationNumber || ''}
          contractAmount={selectedProject?.approvedBudget || 0}
          projectLocation={selectedProject?.areaOfDelivery || ''}
          onSaveAndComplete={(dataUrl, name, refNo, title) => {
            handleSaveStatutoryDoc('fpl', dataUrl, name, refNo, title);
            setActiveStatutoryModal(null);
          }}
          onClose={() => setActiveStatutoryModal(null)}
        />
      )}

      {activeStatutoryModal === 'MPDS' && (
        <MpdsModal
          tenant={currentTenant}
          activeProjectRefNo={selectedProject?.projectReferenceNumber || selectedProject?.philgepsRefNo || ''}
          activeProjectTitle={selectedProject?.title || ''}
          activeProcuringEntity={selectedProject?.procuringEntity || 'Bids and Awards Committee'}
          procuringEntityAddress={selectedProject?.procuringEntityAddress || ''}
          procuringEntityContactPerson={selectedProject?.procuringEntityContactPerson || ''}
          headOfProcuringEntity={selectedProject?.headOfProcuringEntity || ''}
          headOfProcuringEntityPosition={selectedProject?.headOfProcuringEntityPosition || ''}
          solicitationNumber={selectedProject?.solicitationNumber || ''}
          contractAmount={selectedProject?.approvedBudget || 0}
          projectLocation={selectedProject?.areaOfDelivery || ''}
          onSaveAndComplete={(dataUrl, name, refNo, title) => {
            handleSaveStatutoryDoc('mpds', dataUrl, name, refNo, title);
            setActiveStatutoryModal(null);
          }}
          onClose={() => setActiveStatutoryModal(null)}
        />
      )}

      {activeStatutoryModal === 'PERT' && (
        <PertModal
          tenant={currentTenant}
          activeProjectRefNo={selectedProject?.projectReferenceNumber || selectedProject?.philgepsRefNo || ''}
          activeProjectTitle={selectedProject?.title || ''}
          activeProcuringEntity={selectedProject?.procuringEntity || 'Bids and Awards Committee'}
          procuringEntityAddress={selectedProject?.procuringEntityAddress || ''}
          procuringEntityContactPerson={selectedProject?.procuringEntityContactPerson || ''}
          headOfProcuringEntity={selectedProject?.headOfProcuringEntity || ''}
          headOfProcuringEntityPosition={selectedProject?.headOfProcuringEntityPosition || ''}
          solicitationNumber={selectedProject?.solicitationNumber || ''}
          contractAmount={selectedProject?.approvedBudget || 0}
          projectLocation={selectedProject?.areaOfDelivery || ''}
          onSaveAndComplete={(dataUrl, name, refNo, title) => {
            handleSaveStatutoryDoc('pert', dataUrl, name, refNo, title);
            setActiveStatutoryModal(null);
          }}
          onClose={() => setActiveStatutoryModal(null)}
        />
      )}

      {activeStatutoryModal === 'SOTE' && (
        <SoteModal
          tenant={currentTenant}
          activeProjectRefNo={selectedProject?.projectReferenceNumber || selectedProject?.philgepsRefNo || ''}
          activeProjectTitle={selectedProject?.title || ''}
          activeProcuringEntity={selectedProject?.procuringEntity || 'Bids and Awards Committee'}
          procuringEntityAddress={selectedProject?.procuringEntityAddress || ''}
          procuringEntityContactPerson={selectedProject?.procuringEntityContactPerson || ''}
          headOfProcuringEntity={selectedProject?.headOfProcuringEntity || ''}
          headOfProcuringEntityPosition={selectedProject?.headOfProcuringEntityPosition || ''}
          solicitationNumber={selectedProject?.solicitationNumber || ''}
          contractAmount={selectedProject?.approvedBudget || 0}
          projectLocation={selectedProject?.areaOfDelivery || ''}
          onSaveAndComplete={(dataUrl, name, refNo, title) => {
            handleSaveStatutoryDoc('sote', dataUrl, name, refNo, title);
            setActiveStatutoryModal(null);
          }}
          onClose={() => setActiveStatutoryModal(null)}
        />
      )}

      {activeStatutoryModal === 'TOA' && (
        <ToaModal
          tenant={currentTenant}
          activeProjectRefNo={selectedProject?.projectReferenceNumber || selectedProject?.philgepsRefNo || ''}
          activeProjectTitle={selectedProject?.title || ''}
          activeProcuringEntity={selectedProject?.procuringEntity || 'Bids and Awards Committee'}
          procuringEntityAddress={selectedProject?.procuringEntityAddress || ''}
          procuringEntityContactPerson={selectedProject?.procuringEntityContactPerson || ''}
          headOfProcuringEntity={selectedProject?.headOfProcuringEntity || ''}
          headOfProcuringEntityPosition={selectedProject?.headOfProcuringEntityPosition || ''}
          solicitationNumber={selectedProject?.solicitationNumber || ''}
          contractAmount={selectedProject?.approvedBudget || 0}
          projectLocation={selectedProject?.areaOfDelivery || ''}
          onSaveAndComplete={(dataUrl, name, refNo, title) => {
            handleSaveStatutoryDoc('toa', dataUrl, name, refNo, title);
            setActiveStatutoryModal(null);
          }}
          onClose={() => setActiveStatutoryModal(null)}
        />
      )}

      {showPsdModal && (
        <PsdModal
          tenant={currentTenant}
          activeProjectRefNo={selectedProject?.projectReferenceNumber || selectedProject?.philgepsRefNo || ''}
          activeProjectTitle={selectedProject?.title || ''}
          activeProcuringEntity={selectedProject?.procuringEntity || 'Bids and Awards Committee'}
          procuringEntityAddress={selectedProject?.procuringEntityAddress || ''}
          procuringEntityContactPerson={selectedProject?.procuringEntityContactPerson || ''}
          headOfProcuringEntity={selectedProject?.headOfProcuringEntity || ''}
          headOfProcuringEntityPosition={selectedProject?.headOfProcuringEntityPosition || ''}
          solicitationNumber={selectedProject?.solicitationNumber || ''}
          contractAmount={selectedProject?.approvedBudget || 0}
          projectLocation={selectedProject?.areaOfDelivery || ''}
          onSaveAndComplete={(dataUrl, customName) => {
            handleSavePsdToSlotDoc(dataUrl, customName);
          }}
          onClose={() => setShowPsdModal(false)}
        />
      )}

      {showStatutoryGuideModal && (
        <StatutoryDocumentsGuideModal
          initialCode={selectedStatutoryGuideCode}
          onClose={() => setShowStatutoryGuideModal(false)}
        />
      )}

    </div>
  );
};

export default ProjectProfileView;

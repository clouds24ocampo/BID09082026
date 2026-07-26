import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DocumentVaultItem, DocCategory, Tenant, DocumentVersion } from '../../types';
import { PdfPreviewModal } from './PdfPreviewModal';
import { MergedPdfViewerModal } from './MergedPdfViewerModal';
import { StatementOngoingContractsModal } from './templates/StatementOngoingContractsModal';
import { StatementSlccModal } from './templates/StatementSlccModal';
import { TechnicalExhibitTemplateModal } from './templates/TechnicalExhibitTemplateModal';
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
  Trash2
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
    id: 'tech-d',
    code: '(d)',
    name: 'Special PCAB License (for Joint Ventures) and registration for type/cost of contract to be bid',
    notes: 'Legal template to follow',
    templateCode: 'SPECIAL_PCAB_LICENSE'
  },
  {
    id: 'tech-e',
    code: '(e)',
    name: 'Original Bid Security. If Surety Bond: include Insurance Commission certification. If Bid Securing Declaration: original notarized copy',
    notes: 'Legal template to follow',
    templateCode: 'BID_SECURITY_BSD'
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
    id: 'tech-g',
    code: '(g)',
    name: 'Original duly signed Omnibus Sworn Statement (OSS). If corporation/partnership/cooperative: Original Notarized Secretary\'s Certificate. If JV: Original Special Power of Attorney authorizing officer to sign OSS and represent Bidder',
    notes: 'Legal template to follow',
    templateCode: 'OMNIBUS_SWORN_STATEMENT'
  }
];

export const DocumentVaultView: React.FC = () => {
  const { currentTenant, currentUser } = useAuth();
  const [vaultItems, setVaultItems] = useState<DocumentVaultItem[]>(() => {
    const saved = localStorage.getItem('bidocs_vault_items');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('ELIGIBILITY_CLASS_A');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection & Merging state
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);

  // Technical Documents Sub-Tab State
  const [expandedTechItems, setExpandedTechItems] = useState<string[]>(['tech-f']);
  const [techCompletedIds, setTechCompletedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('bidocs_tech_completed_ids');
    return saved ? JSON.parse(saved) : ['tech-b', 'tech-c'];
  });
  const [fillingTemplateItem, setFillingTemplateItem] = useState<{ id: string; code: string; name: string } | null>(null);

  // Modals state
  const [uploadTargetDef, setUploadTargetDef] = useState<ClassAMasterItemDef | null>(null);
  const [showCustomUploadModal, setShowCustomUploadModal] = useState(false);
  const [customUploadCategory, setCustomUploadCategory] = useState<DocCategory>('ELIGIBILITY_CLASS_B');
  const [customDocName, setCustomDocName] = useState('');
  
  const [replaceTargetItem, setReplaceTargetItem] = useState<DocumentVaultItem | null>(null);
  const [detailsTargetItem, setDetailsTargetItem] = useState<DocumentVaultItem | null>(null);
  const [previewPdfItem, setPreviewPdfItem] = useState<DocumentVaultItem | null>(null);

  // Upload & Form Inputs
  const [docNumber, setDocNumber] = useState('');
  const [dtiSecType, setDtiSecType] = useState<'DTI' | 'SEC'>('DTI');
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileDataUrl, setSelectedFileDataUrl] = useState<string>('');
  const [uploadError, setUploadError] = useState('');

  // Sync states to localStorage
  React.useEffect(() => {
    localStorage.setItem('bidocs_vault_items', JSON.stringify(vaultItems));
  }, [vaultItems]);

  React.useEffect(() => {
    localStorage.setItem('bidocs_tech_completed_ids', JSON.stringify(techCompletedIds));
  }, [techCompletedIds]);

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

  const handleResetClassAVault = () => {
    if (confirm('Are you sure you want to remove all uploaded Class A Eligibility documents and start fresh from scratch? PhilGEPS and all document slots will be reset to v1.0.')) {
      setVaultItems([]);
      localStorage.removeItem('bidocs_vault_items');
      setSelectedItemIds([]);
      alert('Class A Eligibility documents have been completely reset! All document slots are ready for re-uploading from scratch.');
    }
  };

  const handleClearAllClassAUploads = () => {
    if (confirm('Are you sure you want to remove ALL uploaded Class A Eligibility documents? All documents (PhilGEPS, DTI/SEC, Permits, Tax Clearance, PCAB, etc.) will be cleared so you can re-upload them from scratch.')) {
      const remaining = vaultItems.filter(item => item.category !== 'ELIGIBILITY_CLASS_A');
      setVaultItems(remaining);
      localStorage.setItem('bidocs_vault_items', JSON.stringify(remaining));
      setSelectedItemIds([]);
      alert('All Class A uploaded documents have been removed! All 13 slots are now clean and ready for re-uploading.');
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

  const handleCompleteTemplate = () => {
    if (!fillingTemplateItem) return;
    if (!techCompletedIds.includes(fillingTemplateItem.id)) {
      setTechCompletedIds(prev => [...prev, fillingTemplateItem.id]);
    }
    setFillingTemplateItem(null);
  };

  const handleFileSelection = (file: File | undefined) => {
    if (!file) {
      setSelectedFile(null);
      setSelectedFileDataUrl('');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setUploadError('Invalid file format. Strictly PDF (.pdf) files are accepted.');
      setSelectedFile(null);
      setSelectedFileDataUrl('');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setUploadError(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 100 MB.`);
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

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTargetDef) return;

    if (!selectedFile) {
      setUploadError('Please select a PDF document to upload.');
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
      setUploadError('Issue Date is required for this document.');
      return;
    }

    if (reqExp && !expiryDate) {
      setUploadError('Expiration Date is required for this document.');
      return;
    }

    const newItem: DocumentVaultItem = {
      id: `doc-${uploadTargetDef.code.toLowerCase()}-${Date.now()}`,
      tenantId: currentTenant?.id || 'tenant-001',
      documentCode: uploadTargetDef.code,
      documentName: uploadTargetDef.code === 'DOC-2' ? `${dtiSecType} Certificate` : uploadTargetDef.name,
      documentNumber: docNumber.trim() || `REF-${Math.floor(Math.random()*899999 + 100000)}`,
      category: 'ELIGIBILITY_CLASS_A',
      procurementApplicability: ['Goods & Supply', 'Goods & Supply with Installation', 'Infrastructure', 'Consulting'],
      legalBasisReference: uploadTargetDef.conditionalRuleNote,
      versionNumber: 1,
      fileHash: Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
      fileSizeBytes: selectedFile.size,
      fileName: selectedFile.name,
      fileDataUrl: selectedFileDataUrl,
      issuedDate: reqIssue ? issuedDate : undefined,
      expiryDate: reqExp ? expiryDate : undefined,
      status: reqExp && expiryDate && new Date(expiryDate) < new Date(Date.now() + 30*24*60*60*1000) ? 'EXPIRING_SOON' : 'ACTIVE',
      uploadedByName: currentUser?.fullName || 'Authorized Administrator',
      isOptional: uploadTargetDef.isOptional,
      requiresIssueDate: reqIssue,
      requiresExpiryDate: reqExp,
      conditionalRuleNote: uploadTargetDef.conditionalRuleNote,
      previousVersions: []
    };

    setVaultItems(prev => [newItem, ...prev]);
    setUploadTargetDef(null);
    resetFormState();
  };

  const handleCustomUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDocName.trim()) {
      setUploadError('Document Name is required.');
      return;
    }

    if (!selectedFile) {
      setUploadError('Please select a PDF document to upload.');
      return;
    }

    const newItem: DocumentVaultItem = {
      id: `doc-custom-${Date.now()}`,
      tenantId: currentTenant?.id || 'tenant-001',
      documentName: customDocName.trim(),
      documentNumber: docNumber.trim() || `REF-${Math.floor(Math.random()*899999 + 100000)}`,
      category: customUploadCategory,
      procurementApplicability: ['Goods & Supply', 'Goods & Supply with Installation', 'Infrastructure', 'Consulting'],
      legalBasisReference: 'RA 12009 NGPA Statutory Compliance Exhibit',
      versionNumber: 1,
      fileHash: Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
      fileSizeBytes: selectedFile.size,
      fileName: selectedFile.name,
      fileDataUrl: selectedFileDataUrl,
      issuedDate: issuedDate || undefined,
      expiryDate: expiryDate || undefined,
      status: expiryDate && new Date(expiryDate) < new Date(Date.now() + 30*24*60*60*1000) ? 'EXPIRING_SOON' : 'ACTIVE',
      uploadedByName: currentUser?.fullName || 'Authorized Administrator',
      isOptional: true,
      requiresIssueDate: !!issuedDate,
      requiresExpiryDate: !!expiryDate,
      conditionalRuleNote: 'Custom Uploaded Statutory Exhibit',
      previousVersions: []
    };

    setVaultItems(prev => [newItem, ...prev]);
    setShowCustomUploadModal(false);
    resetFormState();
  };

  const handleReplaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceTargetItem || !selectedFile) return;

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

    const updatedItem: DocumentVaultItem = {
      ...replaceTargetItem,
      versionNumber: replaceTargetItem.versionNumber + 1,
      documentNumber: docNumber.trim() || replaceTargetItem.documentNumber,
      fileHash: Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
      fileSizeBytes: selectedFile.size,
      fileName: selectedFile.name,
      fileDataUrl: selectedFileDataUrl || replaceTargetItem.fileDataUrl,
      issuedDate: replaceTargetItem.requiresIssueDate ? (issuedDate || replaceTargetItem.issuedDate) : undefined,
      expiryDate: replaceTargetItem.requiresExpiryDate ? (expiryDate || replaceTargetItem.expiryDate) : undefined,
      status: replaceTargetItem.requiresExpiryDate && expiryDate && new Date(expiryDate) < new Date(Date.now() + 30*24*60*60*1000) ? 'EXPIRING_SOON' : 'ACTIVE',
      uploadedByName: currentUser?.fullName || 'Authorized Administrator',
      previousVersions: [archivedVersion, ...(replaceTargetItem.previousVersions || [])]
    };

    setVaultItems(prev => prev.map(item => item.id === replaceTargetItem.id ? updatedItem : item));
    setReplaceTargetItem(null);
    resetFormState();
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

  const filteredGridItems = vaultItems.filter(item => {
    const matchesSearch = item.documentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.documentNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.legalBasisReference || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const selectedVaultObjects = vaultItems.filter(item => selectedItemIds.includes(item.id));

  return (
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
            title="Remove all uploaded PDFs and reset PhilGEPS and Class A slots to v1.0 for re-uploading from scratch"
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
              setShowCustomUploadModal(true);
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition flex items-center gap-2 hover:opacity-90 shrink-0"
            style={{ backgroundColor: currentTenant?.brandColor || '#1e40af' }}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Vault Document</span>
          </button>
        </div>
      </div>

      {/* ALL CATEGORY TABS RESTORED AT TOP */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {[
            { id: 'ELIGIBILITY_CLASS_A', label: 'Class A Eligibility Matrix (13 Fixed)' },
            { id: 'ALL', label: 'All Vault Documents' },
            { id: 'ELIGIBILITY_CLASS_B', label: 'Class B Joint Venture' },
            { id: 'TECHNICAL', label: 'Technical Exhibits' },
            { id: 'FINANCIAL', label: 'Financial / AFS' },
            { id: 'CORPORATE_LEGAL', label: 'Corporate Legal' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedCategory === cat.id
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
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
            isClassAFullyCompliant 
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
            <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-400" />
                Statutory Fixed Master Document List (Class A)
              </h3>
              <button
                onClick={handleClearAllClassAUploads}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition flex items-center gap-1.5"
                title="Clear all Class A documents and start fresh"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Remove All Class A Uploads (Re-upload from Scratch)</span>
              </button>
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

                    return (
                      <tr 
                        key={def.code}
                        className={`hover:bg-slate-800/40 transition ${
                          !isUploaded && !def.isOptional ? 'bg-red-500/5' : ''
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
                              {uploadedItem.status === 'EXPIRING_SOON' ? (
                                <span className="badge-warning text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-400" /> Expiring Soon (v{uploadedItem.versionNumber}.0)
                                </span>
                              ) : uploadedItem.status === 'EXPIRED' ? (
                                <span className="badge-danger text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-red-400" /> Expired — Action Required
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
                              <span className={`text-[10px] font-semibold block ${
                                def.isOptional ? 'text-slate-400' : 'text-red-400 font-bold'
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
                                  onClick={() => {
                                    setReplaceTargetItem(uploadedItem);
                                    resetFormState();
                                  }}
                                  className={`px-3 py-1.5 rounded-lg transition font-bold text-[11px] flex items-center gap-1.5 border shadow ${
                                    uploadedItem.status === 'EXPIRING_SOON' || uploadedItem.status === 'EXPIRED'
                                      ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 animate-pulse'
                                      : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border-emerald-500/30'
                                  }`}
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>{uploadedItem.status === 'EXPIRING_SOON' || uploadedItem.status === 'EXPIRED' ? 'Upload Replacement' : 'Replace PDF'}</span>
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
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 shadow flex items-center gap-2"
              >
                <FileSignature className="w-4 h-4" />
                <span>Technical Documents</span>
                <span className="text-[10px] font-mono bg-blue-950 px-2 py-0.5 rounded-full border border-blue-400">
                  {techCompletedIds.length} / 8 Completed
                </span>
              </button>
            </div>

            <span className="text-xs text-slate-400 font-mono">
              RA 12009 NGPA Statutory Technical Requirements Checklist
            </span>
          </div>

          {/* Technical Documents Checklist Card */}
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
                          <span>Fill Legal Template</span>
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
                                  <span>Fill Template</span>
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
        </div>
      )}

      {/* OTHER CATEGORY TABS (ALL, CLASS B, FINANCIAL, CORPORATE LEGAL) GRID */}
      {selectedCategory !== 'ELIGIBILITY_CLASS_A' && selectedCategory !== 'TECHNICAL' && (
        <div className="space-y-4">
          {filteredGridItems.length === 0 ? (
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGridItems.map((item) => {
                const isSelected = selectedItemIds.includes(item.id);

                return (
                  <div 
                    key={item.id}
                    className={`glass-card p-5 rounded-2xl border transition space-y-4 flex flex-col justify-between group cursor-pointer ${
                      isSelected 
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
          )}
        </div>
      )}

      {/* LEGAL TEMPLATE FILLER MODALS */}
      {fillingTemplateItem && fillingTemplateItem.code === '(b)' && (
        <StatementOngoingContractsModal
          tenant={currentTenant}
          onSaveAndComplete={() => {
            handleCompleteTemplate();
          }}
          onClose={() => setFillingTemplateItem(null)}
        />
      )}

      {fillingTemplateItem && fillingTemplateItem.code === '(c)' && (
        <StatementSlccModal
          tenant={currentTenant}
          onSaveAndComplete={() => {
            handleCompleteTemplate();
          }}
          onClose={() => setFillingTemplateItem(null)}
        />
      )}

      {fillingTemplateItem && fillingTemplateItem.code !== '(b)' && fillingTemplateItem.code !== '(c)' && (
        <TechnicalExhibitTemplateModal
          item={fillingTemplateItem}
          tenant={currentTenant}
          onSaveAndComplete={() => {
            handleCompleteTemplate();
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
                  <option value="ELIGIBILITY_CLASS_B">Class B Joint Venture</option>
                  <option value="TECHNICAL">Technical Exhibits</option>
                  <option value="FINANCIAL">Financial / AFS</option>
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

    </div>
  );
};

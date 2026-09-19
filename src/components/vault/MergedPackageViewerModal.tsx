import React, { useState, useEffect } from 'react';
import { PackageItem, FolderCopyType } from '../bids/bidpackage';
import { DocumentVaultItem, Tenant, isApproverRole, isPreparerRole, getRoleDisplayName } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { DocumentCoverPage } from './DocumentCoverPage';
import { 
  buildMergedThreeLayerPdfDataUrl, 
  ExportDocumentUnit,
  StampColor
} from '../../utils/pdfExportEngine';
import { resolveDocumentPdfAttachment } from '../../utils/systemDocumentPdfGenerator';
import { loadPdfData } from '../../utils/vaultIndexedDB';
import { 
  markProjectBidMergeDone, 
  getDocumentApproval, 
  saveDocumentApproval, 
  DocumentApprovalRecord 
} from '../../utils/opportunityProjects';
import ApprovalGateModal from '../common/ApprovalGateModal';
import { PDFDocument } from 'pdf-lib';
import { 
  X, 
  Folder, 
  FolderOpen, 
  Download, 
  FileText, 
  CheckCircle2, 
  Loader2,
  FileStack,
  Copy,
  Stamp,
  Sparkles,
  Layers,
  Eye,
  Maximize2,
  Lock,
  ArrowRight,
} from 'lucide-react';
import DocumentQrCode from '../common/DocumentQrCode';

const STAMP_COLORS: { id: StampColor; label: string; bgClass: string; hex: string }[] = [
  { id: 'blue', label: 'Blue', bgClass: 'bg-blue-600', hex: '#1d4ed8' },
  { id: 'red', label: 'Red', bgClass: 'bg-red-600', hex: '#dc2626' },
  { id: 'purple', label: 'Purple', bgClass: 'bg-purple-600', hex: '#9333ea' },
  { id: 'black', label: 'Black', bgClass: 'bg-zinc-800', hex: '#27272a' },
  { id: 'green', label: 'Green', bgClass: 'bg-emerald-600', hex: '#16a34a' }
];

interface MergedPackageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: PackageItem[];
  vaultDocs: DocumentVaultItem[];
  tenant: Tenant | null;
  activeProject: any;
  projectRefNo: string;
  projectTitle: string;
  procuringEntity: string;
  activeEnvelope: 'ENVELOPE_1' | 'ENVELOPE_2';
  initialFolderCopy?: FolderCopyType;
}

export const MergedPackageViewerModal: React.FC<MergedPackageViewerModalProps> = ({
  isOpen,
  onClose,
  items,
  vaultDocs,
  tenant,
  activeProject,
  projectRefNo,
  projectTitle,
  procuringEntity,
  activeEnvelope,
  initialFolderCopy = 'ORIGINAL'
}) => {
  const [activeFolder, setActiveFolder] = useState<FolderCopyType>(initialFolderCopy);
  const [selectedEnvelope, setSelectedEnvelope] = useState<'ALL' | 'ENVELOPE_1' | 'ENVELOPE_2'>(activeEnvelope);
  const [compiledPdfs, setCompiledPdfs] = useState<Record<FolderCopyType, string | null>>({
    ORIGINAL: null,
    COPY_1: null,
    COPY_2: null
  });
  const [isCompiling, setIsCompiling] = useState<Record<FolderCopyType, boolean>>({
    ORIGINAL: false,
    COPY_1: false,
    COPY_2: false
  });
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [compileProgress, setCompileProgress] = useState<{
    percent: number;
    status: string;
    currentDoc: number;
    totalDocs: number;
  }>({
    percent: 0,
    status: '',
    currentDoc: 0,
    totalDocs: 0
  });
  const [isExportingAll, setIsExportingAll] = useState<boolean>(false);
  const [stampColor, setStampColor] = useState<StampColor>('blue');
  const [docPageCounts, setDocPageCounts] = useState<Record<string, number>>({});

  const tenantId = tenant?.id || '';
  const projectScopeKey = activeProject?.refNo || projectRefNo || 'PRJ-2026';
  const cleanRef = projectScopeKey.replace(/[^a-zA-Z0-9]/g, '_');

  const { currentUser } = useAuth();
  const [approvalRecord, setApprovalRecord] = useState<DocumentApprovalRecord | null>(null);
  const [showApprovalGateModal, setShowApprovalGateModal] = useState<boolean>(false);

  // Load project package approval status
  useEffect(() => {
    if (!isOpen) return;
    const rec = getDocumentApproval(tenantId, projectScopeKey);
    setApprovalRecord(rec);
  }, [tenantId, projectScopeKey, isOpen]);

  const handleSubmitForApproval = () => {
    const nowStr = new Date().toLocaleString('en-PH');
    const subName = currentUser?.fullName || 'Technical Estimator';
    const subRole = currentUser?.role ? getRoleDisplayName(currentUser.role) : 'Bid Manager';
    const rec: DocumentApprovalRecord = {
      recordId: projectScopeKey,
      docType: 'BIDDING_PACKAGE',
      status: 'PENDING_APPROVAL',
      submittedBy: subName,
      submittedByRole: subRole,
      submittedAt: nowStr
    };
    saveDocumentApproval(tenantId, rec);
    setApprovalRecord(rec);
    setStatusMessage('Sealed Bidding Package submitted for Owner review and print authorization.');
  };

  const handleApprovePackage = (notes?: string) => {
    const nowStr = new Date().toLocaleString('en-PH');
    const appName = currentUser?.fullName || tenant?.authorizedSignatory?.name || 'Company Owner';
    const appRole = currentUser?.role ? getRoleDisplayName(currentUser.role) : 'Company Owner';
    const rec: DocumentApprovalRecord = {
      recordId: projectScopeKey,
      docType: 'BIDDING_PACKAGE',
      status: 'APPROVED',
      submittedBy: approvalRecord?.submittedBy || 'Estimator',
      submittedByRole: approvalRecord?.submittedByRole || 'Bid Manager',
      submittedAt: approvalRecord?.submittedAt,
      approvedBy: appName,
      approvedByRole: appRole,
      approvedAt: nowStr,
      notes: notes || approvalRecord?.notes
    };
    saveDocumentApproval(tenantId, rec);
    setApprovalRecord(rec);
    setStatusMessage(`Sealed Bidding Package officially approved for print & BAC submission by ${appName}!`);
  };

  const handleRevertToDraft = () => {
    const rec: DocumentApprovalRecord = {
      recordId: projectScopeKey,
      docType: 'BIDDING_PACKAGE',
      status: 'DRAFT'
    };
    saveDocumentApproval(tenantId, rec);
    setApprovalRecord(rec);
    setStatusMessage('Package status reverted to DRAFT.');
  };

  const envTag = selectedEnvelope === 'ALL'
    ? 'COMPLETE_BID_PACKAGE'
    : selectedEnvelope === 'ENVELOPE_1'
    ? 'TECHNICAL_LEGAL'
    : 'FINANCIAL';

  const currentItems = React.useMemo(() => {
    if (selectedEnvelope === 'ALL') {
      return items;
    }
    const filtered = items.filter(it => it.envelope === selectedEnvelope);
    return filtered.length > 0 ? filtered : items;
  }, [items, selectedEnvelope]);

  // Reset compiled PDFs whenever envelope filter changes
  useEffect(() => {
    setCompiledPdfs({ ORIGINAL: null, COPY_1: null, COPY_2: null });
  }, [selectedEnvelope]);

  // Folders configuration
  const folderTabs: { id: FolderCopyType; title: string; badge: string; desc: string; color: string }[] = [
    {
      id: 'ORIGINAL',
      title: 'ORIGINAL BID FILE',
      badge: 'Main Submission',
      desc: 'Official Original Sealed Copy',
      color: 'blue'
    },
    {
      id: 'COPY_1',
      title: 'COPY 1 BID FILE',
      badge: 'Duplicate Copy',
      desc: 'Certified True Copy 1',
      color: 'emerald'
    },
    {
      id: 'COPY_2',
      title: 'COPY 2 BID FILE',
      badge: 'Triplicate Copy',
      desc: 'Certified True Copy 2',
      color: 'purple'
    }
  ];

  // Helper to compute exact page range for each document item in the merged bundle
  const getDocumentPageRange = (itemIndex: number) => {
    // Page 1 is always the Table of Contents
    let startPage = 2;
    for (let i = 0; i < itemIndex; i++) {
      const pastItem = currentItems[i];
      const attachedPages = pastItem ? (docPageCounts[pastItem.id] ?? 0) : 0;
      // 1 Cover Page + attachedPages
      const totalPagesForPastItem = 1 + attachedPages;
      startPage += totalPagesForPastItem;
    }
    const currentItem = currentItems[itemIndex];
    const currentAttachedPages = currentItem ? (docPageCounts[currentItem.id] ?? 0) : 0;
    const endPage = startPage + (1 + currentAttachedPages) - 1;
    return {
      startPage,
      endPage,
      pageText: startPage === endPage ? `Page ${startPage}` : `Page ${startPage} to ${endPage}`
    };
  };

  // Comprehensive Resolver for Attached Document Streams (Section VII, Section VI, BSD, OSS, Vault & System-Generated Documents)
  const resolveAttachmentForDoc = async (doc: PackageItem, targetFolderCopy?: FolderCopyType): Promise<string | null> => {
    try {
      const codeOrId = ((doc.code || doc.id || '') as string).toUpperCase();
      const docNameLower = (doc.documentName || '').toLowerCase();

      // User Requirement: Bid Securing Declaration / Surety Bond and Omnibus Sworn Statement
      // must ONLY contain the official statutory cover page separator (0 attached pages)
      // so the user can physically attach the original notarized paper documents.
      const isBsdOrOss = codeOrId.includes('BID_SECURING') || codeOrId.includes('BSD') || docNameLower.includes('bid secur') || docNameLower.includes('surety bond') ||
                         codeOrId.includes('OMNIBUS') || codeOrId.includes('OSS') || docNameLower.includes('omnibus') || docNameLower.includes('oss');
      if (isBsdOrOss) {
        return null;
      }

      let targetVaultDocId = doc.vaultDocId;
      let existingDataUrl = (doc as any).fileDataUrl;
      const cleanDocId = doc.id.replace(/^pkg-c[12]-/, '');

      const isTechnicalOrFinancialDoc = [
        'ONGOING_CONTRACTS', 'SLCC_STATEMENT', 'SECTION_VI_REQUIREMENTS', 'TECH_SPECS_SECTION_VII',
        'FRAMEWORK_AGREEMENT_LIST', 'ORGANIZATIONAL_CHART', 'KEY_PERSONNEL', 'MAJOR_EQUIPMENT',
        'AFTERSALES_WARRANTY', 'NFCC_COMPUTATION',
        'FINANCIAL_BID_FORM_GOODS', 'FINANCIAL_BID_FORM_INFRA', 'FINANCIAL_BID_FORM_CONSULTING',
        'BILL_OF_QUANTITIES', 'DETAILED_ESTIMATES_FORM_L', 'PRICE_SCHEDULE_GOODS', 'SUMMARY_BID_PRICES',
        'CASH_FLOW_BY_QUARTER', 'ESTIMATES', 'FORM_L', 'BOQ', 'BID_FORM', 'PRICE_SCHEDULE', 'TECH_SPECS', 'SEC_VI', 'SEC_VII'
      ].some(k => codeOrId.includes(k)) ||
      docNameLower.includes('ongoing') || docNameLower.includes('slcc') || docNameLower.includes('single largest') ||
      (!docNameLower.includes('section vii') && (docNameLower.includes('section vi') || docNameLower.includes('schedule of req'))) ||
      docNameLower.includes('section vii') || docNameLower.includes('technical spec') ||
      docNameLower.includes('framework agreement') || docNameLower.includes('fal') ||
      docNameLower.includes('org chart') || docNameLower.includes('organizational chart') ||
      docNameLower.includes('key personnel') || docNameLower.includes('personnel') || docNameLower.includes('manpower') ||
      docNameLower.includes('equipment') || docNameLower.includes('machinery') ||
      docNameLower.includes('after-sale') || docNameLower.includes('aftersales') || docNameLower.includes('warranty') ||
      docNameLower.includes('nfcc') || docNameLower.includes('contracting capacity') ||
      docNameLower.includes('bid form') ||
      docNameLower.includes('bill of quantities') || docNameLower.includes('boq') ||
      docNameLower.includes('detailed estimate') || docNameLower.includes('form l') || docNameLower.includes('form (l)') ||
      docNameLower.includes('price schedule') ||
      docNameLower.includes('summary of bid') || docNameLower.includes('summary bid') ||
      docNameLower.includes('cash flow');

      // Sanitize: If technical or financial doc has a targetVaultDocId pointing to corporate DOC-1..DOC-15, strip it
      if (isTechnicalOrFinancialDoc && targetVaultDocId && vaultDocs) {
        const linked = vaultDocs.find(v => v.id === targetVaultDocId);
        const vCode = (linked?.documentCode || '').toUpperCase();
        if (['DOC-1', 'DOC-2', 'DOC-3', 'DOC-4', 'DOC-5', 'DOC-6', 'DOC-7', 'DOC-8', 'DOC-9', 'DOC-10', 'DOC-11', 'DOC-12', 'DOC-13', 'DOC-14', 'DOC-15'].includes(vCode)) {
          targetVaultDocId = undefined;
          existingDataUrl = undefined;
        }
      }

      if (!targetVaultDocId && vaultDocs && vaultDocs.length > 0 && !isTechnicalOrFinancialDoc) {
        const dName = (doc.documentName || '').toLowerCase();
        const match = vaultDocs.find(v =>
          (v.id && (v.id === doc.id || v.id === doc.code || v.id === cleanDocId)) ||
          ((v as any).code && doc.code && (v as any).code.toLowerCase() === doc.code.toLowerCase()) ||
          (v.documentName && doc.documentName && v.documentName.trim().toLowerCase() === doc.documentName.trim().toLowerCase()) ||
          (dName.includes('philgeps') && (v.documentCode === 'DOC-1' || (v.documentName || '').toLowerCase().includes('philgeps'))) ||
          (((dName.includes('sec ') || dName.includes('securities') || dName.includes('dti') || dName.includes('sec registration')) && !dName.includes('section') && !dName.includes('secretary')) && (v.documentCode === 'DOC-2' || ((v.documentName || '').toLowerCase().includes('incorporation') || (v.documentName || '').toLowerCase().includes('securities and exchange') || (v.documentName || '').toLowerCase().includes('dti') || ((v.documentName || '').toLowerCase().includes('sec') && !(v.documentName || '').toLowerCase().includes('secretary') && !(v.documentName || '').toLowerCase().includes('section'))) && !(v.documentName || '').toLowerCase().includes('philgeps') && !(v.documentName || '').toLowerCase().includes('bir') && !(v.documentName || '').toLowerCase().includes('secretary') && v.documentCode !== 'DOC-13')) ||
          ((dName.includes('mayor') || (dName.includes('business permit') && !dName.includes('barangay'))) && (v.documentCode === 'DOC-3' || (v.documentName || '').toLowerCase().includes('permit'))) ||
          (((dName.includes('bir') || dName.includes('2303')) && (dName.includes('registration') || dName.includes('certificate') || dName.includes('cor') || dName.includes('2303')) && !dName.includes('clearance')) && (v.documentCode === 'DOC-6' || (v.documentName || '').toLowerCase().includes('2303') || ((v.documentName || '').toLowerCase().includes('bir') && (v.documentName || '').toLowerCase().includes('registration')))) ||
          (dName.includes('tax') && (v.documentCode === 'DOC-7' || (v.documentName || '').toLowerCase().includes('clearance')) && v.documentCode !== 'DOC-6' && !(v.documentName || '').toLowerCase().includes('2303')) ||
          (dName.includes('audited') && (v.documentCode === 'DOC-5' || v.documentCode === 'DOC-15' || (v.documentName || '').toLowerCase().includes('audited'))) ||
          (dName.includes('pcab') && (v.documentCode === 'DOC-8' || (v.documentName || '').toLowerCase().includes('pcab')) && v.documentCode !== 'DOC-6' && !(v.documentName || '').toLowerCase().includes('bir') && !(v.documentName || '').toLowerCase().includes('2303')) ||
          ((dName.includes('secretary') || dName.includes('board res') || dName.includes('spa')) && !dName.includes('section') && (v.documentCode === 'DOC-13' || (v.documentName || '').toLowerCase().includes('secretary') || (v.documentName || '').toLowerCase().includes('spa'))) ||
          (dName.includes('joint') && (v.documentCode === 'DOC-14' || (v.documentName || '').toLowerCase().includes('joint') || (v.documentName || '').toLowerCase().includes('jva')))
        );
        if (match) {
          targetVaultDocId = match.id;
          if (match.fileDataUrl && !existingDataUrl) {
            existingDataUrl = match.fileDataUrl;
          }
        }
      }

      if (!existingDataUrl && targetVaultDocId && !isTechnicalOrFinancialDoc) {
        try {
          const dbData = await loadPdfData(targetVaultDocId);
          if (dbData) existingDataUrl = dbData;
        } catch (_) {}
      }
      if (!existingDataUrl && doc.id && !isTechnicalOrFinancialDoc) {
        try {
          const dbData = await loadPdfData(doc.id) || await loadPdfData(cleanDocId);
          if (dbData) existingDataUrl = dbData;
        } catch (_) {}
      }

      const effectiveDoc = {
        ...doc,
        vaultDocId: targetVaultDocId,
        fileDataUrl: existingDataUrl
      };

      return await resolveDocumentPdfAttachment(effectiveDoc, {
        vaultDocs,
        tenant,
        tenantId,
        projectRefNo,
        projectTitle,
        procuringEntity,
        activeProject,
        folderCopy: targetFolderCopy || effectiveDoc.folderCopy || activeFolder
      });
    } catch (err) {
      console.warn(`[MergedPackageViewerModal] Could not generate attachment for ${doc.documentName}:`, err);
      return null;
    }
  };

  // Helper to compile a specific folder copy into a merged PDF Data URL
  const compileFolderPdf = async (folderCopy: FolderCopyType, overrideStampColor?: StampColor): Promise<string | null> => {
    if (currentItems.length === 0) {
      setStatusMessage('No documents in this selection yet.');
      return null;
    }

    const effectiveColor = overrideStampColor || stampColor;

    setIsCompiling(prev => ({ ...prev, [folderCopy]: true }));
    setStatusMessage(`Compiling ${folderCopy} package (${currentItems.length} docs)...`);

    try {
      const units: ExportDocumentUnit[] = [];

      // Pre-resolve all attachments in parallel
      const resolvedAttachments = await Promise.all(
        currentItems.map(doc => resolveAttachmentForDoc(doc, folderCopy))
      );

      // Measure attached PDF page counts and update state
      const counts: { [docId: string]: number } = {};
      for (let i = 0; i < currentItems.length; i++) {
        const doc = currentItems[i];
        const attachment = resolvedAttachments[i];
        if (attachment) {
          try {
            if (attachment.startsWith('data:')) {
              const base64Part = attachment.includes(',') ? attachment.split(',')[1] : attachment;
              const binaryString = atob(base64Part.replace(/\s+/g, ''));
              const bytes = new Uint8Array(binaryString.length);
              for (let b = 0; b < binaryString.length; b++) {
                bytes[b] = binaryString.charCodeAt(b);
              }
              const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
              counts[doc.id] = pdfDoc.getPageCount();
            } else if (attachment.startsWith('JVBERi0') || (!attachment.includes('://') && !attachment.startsWith('blob:') && attachment.length > 50)) {
              const cleanBase64 = attachment.replace(/\s+/g, '');
              const binaryString = atob(cleanBase64);
              const bytes = new Uint8Array(binaryString.length);
              for (let b = 0; b < binaryString.length; b++) {
                bytes[b] = binaryString.charCodeAt(b);
              }
              const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
              counts[doc.id] = pdfDoc.getPageCount();
            } else {
              const res = await fetch(attachment);
              const arrayBuf = await res.arrayBuffer();
              const pdfDoc = await PDFDocument.load(arrayBuf, { ignoreEncryption: true });
              counts[doc.id] = pdfDoc.getPageCount();
            }
          } catch (_) {
            counts[doc.id] = 0;
          }
        } else {
          counts[doc.id] = 0;
        }
      }
      setDocPageCounts(prev => ({ ...prev, ...counts }));
      // Yield to allow React DOM to re-render TOC with exact page ranges
      await new Promise(r => setTimeout(r, 150));

      // 1. FIRST PAGE: Table of Contents & Statutory Checklist for this Folder Copy
      const tocElem = document.getElementById(`preview-toc-${folderCopy}`) as HTMLElement | null;
      if (tocElem) {
        units.push({
          title: `Table of Contents (${folderCopy})`,
          coverElement: tocElem,
          fileDataUrl: null,
          documentName: `Table of Contents — ${folderCopy}`
        });
      }

      // 2. Subsequent Pages: Included Documents with Cover Separators and Attached PDF Streams
      for (let i = 0; i < currentItems.length; i++) {
        const doc = currentItems[i];
        const fileDataUrl = resolvedAttachments[i];

        // Cover Page Element rendered specifically for this folder copy (with prefix fallbacks)
        const coverElem = (
          document.getElementById(`preview-cover-${folderCopy}-${doc.id}`) ||
          document.getElementById(`preview-cover-${folderCopy}-${doc.id.replace(/^pkg-c[12]-/, '')}`) ||
          document.getElementById(`cover-page-render-${doc.id}`) ||
          document.getElementById(`cover-page-render-${doc.id.replace(/^pkg-c[12]-/, '')}`)
        ) as HTMLElement | null;

        units.push({
          title: doc.documentName,
          coverElement: coverElem || null,
          fileDataUrl: fileDataUrl || null,
          documentName: doc.documentName,
          documentCode: doc.code || (doc as any).documentCode,
          fileName: doc.fileName
        });
      }

      const outputFileName = `${cleanRef}_${folderCopy}_${envTag}_MERGED_PACKAGE.pdf`;
      const dataUrl = await buildMergedThreeLayerPdfDataUrl(
        units,
        outputFileName,
        (progress) => {
          setCompileProgress(progress);
          setStatusMessage(progress.status);
        },
        {
          folderCopy,
          submissionDate: activeProject?.dateTimeSubmitted || (activeProject as any)?.submissionDeadline || 'August 30, 2026',
          companyName: tenant?.companyName,
          signatoryName: tenant?.authorizedSignatory?.name || 'Authorized Managing Officer',
          signatoryTitle: tenant?.authorizedSignatory?.title || (tenant?.authorizedSignatory as any)?.designation || 'President',
          projectRefNo: projectRefNo || activeProject?.refNo || 'PhilGEPS-2026',
          projectTitle: projectTitle || activeProject?.title || 'Target Procurement Project',
          stampColor: effectiveColor
        }
      );

      setCompiledPdfs(prev => ({ ...prev, [folderCopy]: dataUrl }));
      setStatusMessage(`Merged ${folderCopy} package ready.`);

      // Mark this project as having merged and completed bid documents
      const targetProjectRef = projectRefNo || activeProject?.refNo || cleanRef;
      if (tenant?.id && targetProjectRef) {
        markProjectBidMergeDone(tenant.id, targetProjectRef, {
          fileName: outputFileName,
          copiesCount: 3,
          completedBy: tenant.authorizedSignatory?.name || 'BiDOCS 3-Copy Engine'
        });
      }

      return dataUrl;
    } catch (err) {
      console.error(`Error compiling ${folderCopy} package:`, err);
      setStatusMessage(`Error compiling ${folderCopy} package.`);
      return null;
    } finally {
      setIsCompiling(prev => ({ ...prev, [folderCopy]: false }));
    }
  };

  // Compile on-demand ONLY for the currently active folder copy
  useEffect(() => {
    if (!isOpen) return;
    if (items.length === 0) return;

    if (!compiledPdfs[activeFolder] && !isCompiling[activeFolder]) {
      compileFolderPdf(activeFolder);
    }
  }, [isOpen, activeFolder, items]);

  if (!isOpen) return null;

  const handleStampColorChange = async (newColor: StampColor) => {
    if (newColor === stampColor) return;
    setStampColor(newColor);
    setCompiledPdfs({ ORIGINAL: null, COPY_1: null, COPY_2: null });
    await compileFolderPdf(activeFolder, newColor);
  };

  // Single Download Trigger
  const handleDownloadCopy = async (folderCopy: FolderCopyType) => {
    if (isPreparerRole(currentUser?.role) && approvalRecord?.status !== 'APPROVED') {
      setShowApprovalGateModal(true);
      return;
    }

    let dataUrl = compiledPdfs[folderCopy];
    if (!dataUrl) {
      dataUrl = await compileFolderPdf(folderCopy);
    }
    if (!dataUrl) return;

    const outputFileName = `${cleanRef}_${folderCopy}_${envTag}_MERGED_PACKAGE.pdf`;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = outputFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Batch Download All 3 Copies
  const handleDownloadAllThreeCopies = async () => {
    if (isPreparerRole(currentUser?.role) && approvalRecord?.status !== 'APPROVED') {
      setShowApprovalGateModal(true);
      return;
    }

    setIsExportingAll(true);
    const copies: FolderCopyType[] = ['ORIGINAL', 'COPY_1', 'COPY_2'];
    for (let idx = 0; idx < copies.length; idx++) {
      const copy = copies[idx];
      setStatusMessage(`[Step ${idx + 1}/3] Generating and downloading ${copy} package with statutory BAC stamps...`);
      await handleDownloadCopy(copy);
      // Small pause between downloads to let browser handle files cleanly
      await new Promise(r => setTimeout(r, 600));
    }
    setStatusMessage('All 3 sealed packages (ORIGINAL, COPY 1, COPY 2) successfully downloaded!');
    setIsExportingAll(false);
  };

  const currentPdfDataUrl = compiledPdfs[activeFolder];
  const isCurrentCompiling = isCompiling[activeFolder];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col">
        
        {/* TOP HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/95 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <FileStack className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-white leading-tight">
                  Merged Bid Packages Folder
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {currentItems.length} of {currentItems.length} Files Preserved (100% Complete)
                </span>
                <div className="inline-flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setSelectedEnvelope('ALL')}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded transition cursor-pointer ${
                      selectedEnvelope === 'ALL'
                        ? 'bg-purple-600 text-white font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All Envelopes ({items.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEnvelope('ENVELOPE_1')}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded transition cursor-pointer ${
                      selectedEnvelope === 'ENVELOPE_1'
                        ? 'bg-blue-600 text-white font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Envelope 1 ({items.filter(i => i.envelope === 'ENVELOPE_1').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEnvelope('ENVELOPE_2')}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded transition cursor-pointer ${
                      selectedEnvelope === 'ENVELOPE_2'
                        ? 'bg-emerald-600 text-white font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Envelope 2 ({items.filter(i => i.envelope === 'ENVELOPE_2').length})
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xl">
                Project: <span className="text-slate-200 font-medium">{projectTitle || activeProject?.title}</span> ({projectScopeKey})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Approval Status Badge & Executive Controls */}
            <div className="flex items-center gap-2 mr-1">
              <span className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${
                approvalRecord?.status === 'APPROVED'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : approvalRecord?.status === 'PENDING_APPROVAL'
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {approvalRecord?.status === 'APPROVED' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>APPROVED ({approvalRecord.approvedBy || 'Owner'})</span>
                  </>
                ) : approvalRecord?.status === 'PENDING_APPROVAL' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span>PENDING APPROVAL</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>DRAFT (REQUIRES APPROVAL)</span>
                  </>
                )}
              </span>

              {isApproverRole(currentUser?.role) ? (
                approvalRecord?.status !== 'APPROVED' ? (
                  <button
                    type="button"
                    onClick={() => handleApprovePackage()}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400/50 flex items-center gap-1.5 cursor-pointer transition"
                    title="Authorize and officially approve sealed bidding package for printing"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve for Official Print ✓</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRevertToDraft}
                    className="px-2 py-1 rounded text-[10px] font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                    title="Revert package status to draft"
                  >
                    Revert
                  </button>
                )
              ) : (
                approvalRecord?.status === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={handleSubmitForApproval}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer transition"
                    title="Submit sealed package to Company Owner for approval before printing"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Submit for Owner Approval ➔</span>
                  </button>
                )
              )}
            </div>

            {/* Download This Copy Button */}
            <button
              onClick={() => handleDownloadCopy(activeFolder)}
              disabled={isCurrentCompiling}
              className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                isPreparerRole(currentUser?.role) && approvalRecord?.status !== 'APPROVED'
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40'
                  : 'bg-blue-600 hover:bg-blue-500'
              }`}
              title={
                isPreparerRole(currentUser?.role) && approvalRecord?.status !== 'APPROVED'
                  ? 'Owner / Manager approval required before downloading'
                  : `Download ${activeFolder} merged package`
              }
            >
              {isPreparerRole(currentUser?.role) && approvalRecord?.status !== 'APPROVED' ? (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>
                Download {activeFolder} PDF
                {isPreparerRole(currentUser?.role) && approvalRecord?.status !== 'APPROVED' ? ' 🔒' : ''}
              </span>
            </button>

            {/* Download All 3 Copies Button */}
            <button
              onClick={handleDownloadAllThreeCopies}
              disabled={isExportingAll || isCurrentCompiling}
              className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border ${
                isPreparerRole(currentUser?.role) && approvalRecord?.status !== 'APPROVED'
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40'
                  : 'bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-950/40 border-purple-400/30'
              }`}
              title={
                isPreparerRole(currentUser?.role) && approvalRecord?.status !== 'APPROVED'
                  ? 'Owner / Manager approval required before downloading 3 copies'
                  : 'Download all 3 copies (ORIGINAL, COPY 1, COPY 2)'
              }
            >
              {isExportingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-200" />
              ) : isPreparerRole(currentUser?.role) && approvalRecord?.status !== 'APPROVED' ? (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-purple-200" />
              )}
              <span>
                Download All 3 Copies
                {isPreparerRole(currentUser?.role) && approvalRecord?.status !== 'APPROVED' ? ' 🔒' : ''}
              </span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3 FOLDERS NAVIGATION TABS & STAMP COLOR SELECTOR */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-950/80 border-b border-slate-800 shrink-0 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Folder className="w-3.5 h-3.5 text-purple-400" />
              <span>Submission Packages:</span>
            </div>

            {/* STAMP COLOR SELECTOR (Blue, Red, Purple, Black, Green) */}
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 shadow-sm">
              <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Stamp className="w-3.5 h-3.5 text-amber-400" />
                Rubber Stamp Color:
              </span>
              <div className="flex items-center gap-1">
                {STAMP_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleStampColorChange(c.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      stampColor === c.id
                        ? 'bg-white text-slate-950 shadow-md scale-105 ring-2 ring-purple-400 font-black'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title={`Change Certified True Copy Stamp color to ${c.label}`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${c.bgClass} inline-block border border-white/40`} />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {folderTabs.map((tab) => {
              const isSelected = activeFolder === tab.id;
              const isReady = !!compiledPdfs[tab.id];
              const isLoading = isCompiling[tab.id];

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFolder(tab.id)}
                  className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? tab.id === 'ORIGINAL'
                        ? 'bg-blue-950/50 border-blue-500/80 ring-1 ring-blue-500/60 shadow-lg'
                        : tab.id === 'COPY_1'
                          ? 'bg-emerald-950/50 border-emerald-500/80 ring-1 ring-emerald-500/60 shadow-lg'
                          : 'bg-purple-950/50 border-purple-500/80 ring-1 ring-purple-500/60 shadow-lg'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-lg ${
                      isSelected 
                        ? 'bg-white/10 text-white' 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isSelected ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">{tab.title}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {tab.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">{tab.desc}</p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {isLoading ? (
                      <div className="flex items-center gap-1 text-[10px] text-purple-400 font-mono">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Compiling</span>
                      </div>
                    ) : isReady ? (
                      <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Ready</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500">Pending</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* MAIN BODY: SPLIT VIEW (DOCUMENTS SEQUENCE ON LEFT, INTERACTIVE PDF VIEWER ON RIGHT) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-137.5">
          
          {/* LEFT SIDEBAR: Arranged Documents Checklist */}
          <div className="lg:col-span-4 border-r border-slate-800 bg-slate-950/50 p-4 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300">
                Package Contents ({items.length} Documents)
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Exact Arranged Sequence
              </span>
            </div>

            <div className="space-y-2">
              {items.map((doc, idx) => (
                <div
                  key={doc.id}
                  className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5"
                >
                  <span className="w-5 h-5 rounded bg-slate-800 text-blue-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{doc.documentName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                        doc.category === 'LEGAL'
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                          : doc.category === 'TECHNICAL'
                            ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {doc.category}
                      </span>
                      <span className="text-[9px] text-slate-400">Cover Separator + Attached File</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 text-[11px] text-blue-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Automatic 100% Synchronization</span>
              </p>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                All 3 copies (Original, Copy 1, Copy 2) share the identical document list and order, each cleanly formatted with their official copy file designation and page-of-pages pagination.
              </p>
            </div>
          </div>

          {/* RIGHT VIEWPORT: Interactive Full PDF Previewer */}
          <div className="lg:col-span-8 bg-slate-950 flex flex-col items-center justify-center p-3 relative overflow-hidden">
            {isCurrentCompiling ? (
              <div className="w-full max-w-md p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl space-y-5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 animate-pulse">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white leading-tight">
                        Merging {activeFolder} Package...
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {compileProgress.currentDoc > 0 
                          ? `Document ${compileProgress.currentDoc} of ${compileProgress.totalDocs || items.length}` 
                          : 'Preparing documents & cover sheets...'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black font-mono text-purple-400">
                      {Math.min(100, Math.max(0, compileProgress.percent))}%
                    </span>
                  </div>
                </div>

                {/* ANIMATED GLOWING PROGRESS BAR */}
                <div className="space-y-1.5">
                  <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5 relative shadow-inner">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-300 ease-out shadow-[0_0_12px_rgba(168,85,247,0.6)]"
                      style={{ width: `${Math.min(100, Math.max(5, compileProgress.percent))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>PDF Merging Engine</span>
                    <span>Legal 8.5" × 13" High-Speed</span>
                  </div>
                </div>

                {/* CURRENT ACTIVE STEP STATUS */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2.5 text-xs font-mono text-slate-300">
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
                  <span className="truncate">{compileProgress.status || statusMessage || 'Processing documents...'}</span>
                </div>
              </div>
            ) : currentPdfDataUrl ? (
              <div className="w-full h-full flex flex-col rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
                {/* Viewport Top Bar */}
                <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300 font-medium">
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    <span>Live PDF Preview: <strong className="text-white">{activeFolder} COPY</strong></span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold text-white bg-slate-800 border border-slate-700 flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${STAMP_COLORS.find(c => c.id === stampColor)?.bgClass}`} />
                      Stamp: {stampColor.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={currentPdfDataUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 flex items-center gap-1.5 transition"
                      title="Open PDF in new browser tab"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Open in Tab</span>
                    </a>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      ✓ Complete 8.5" × 13" Legal Bundle
                    </span>
                  </div>
                </div>

                {/* Embedded PDF Viewer */}
                <div className="flex-1 w-full bg-slate-900 relative min-h-125">
                  <object
                    data={`${currentPdfDataUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                    type="application/pdf"
                    className="w-full h-full min-h-125 border-none bg-slate-900 rounded-b-xl"
                  >
                    <iframe
                      src={`${currentPdfDataUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                      className="w-full h-full min-h-125 border-none bg-slate-900"
                      title={`Merged PDF Preview for ${activeFolder}`}
                    />
                  </object>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center space-y-3 p-8 text-slate-500">
                <FileText className="w-12 h-12 mx-auto text-slate-600" />
                <p className="text-xs text-slate-300 font-bold">No documents added to this envelope yet.</p>
                <p className="text-[11px] text-slate-500">Click "Add Completed Docs" or "From Vault" in the Bid Package screen to populate this folder.</p>
              </div>
            ) : (
              <div className="text-center space-y-3 p-8 text-slate-500">
                <FileText className="w-12 h-12 mx-auto text-slate-600" />
                <p className="text-xs">No preview ready yet. Click compile or select a folder tab.</p>
                <button
                  onClick={() => compileFolderPdf(activeFolder)}
                  disabled={isCompiling[activeFolder]}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition shadow disabled:opacity-50 cursor-pointer"
                >
                  Compile {activeFolder} Now
                </button>
              </div>
            )}
          </div>

        </div>

        {/* OFF-SCREEN CONTAINER FOR RENDERING FOLDER-SPECIFIC COVER PAGES */}
        <div
          className="fixed pointer-events-none"
          style={{ left: '-9999px', top: '0px', width: '816px', zIndex: -1 }}
          aria-hidden="true"
        >
          {(['ORIGINAL', 'COPY_1', 'COPY_2'] as FolderCopyType[]).map((fCopy) => (
            <div key={`hidden-group-${fCopy}`}>
              {/* Table of Contents DOM element for this folder copy */}
              <div
                id={`preview-toc-${fCopy}`}
                style={{ width: '800px', minHeight: '1100px' }}
                className="bg-white text-black p-8 border-4 border-black font-sans flex flex-col justify-between"
              >
                <div>
                  {/* Company Header */}
                  <div className="text-center border-b-2 border-black pb-3 space-y-1">
                    <h1 className="text-2xl font-black uppercase tracking-wider text-black">
                      {tenant?.companyName || 'BIDDING ENTERPRISE CORPORATION'}
                    </h1>
                    <p className="text-xs text-slate-700 font-medium">
                      {tenant?.address || 'Metro Manila, Philippines'} • TIN: <span className="font-mono font-bold">{tenant?.tin || '000-000-000-000'}</span> • PhilGEPS: <span className="font-bold text-blue-950">{tenant?.philgepsPlatinumNo || 'PLAT-2026-ACTIVE'}</span>
                    </p>
                  </div>

                  {/* TOC Banner */}
                  <div className="my-4 space-y-2">
                    <div className="p-3 border-2 border-black bg-slate-900 text-white rounded-xl flex items-center justify-between gap-3 text-left">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-black uppercase tracking-wider text-amber-300">
                            TABLE OF CONTENTS & STATUTORY CHECKLIST
                          </h2>
                          <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[11px] font-mono font-black uppercase">
                            ★ {fCopy === 'ORIGINAL' ? 'ORIGINAL COPY' : fCopy === 'COPY_1' ? 'COPY 1 (DUPLICATE)' : 'COPY 2 (TRIPLICATE)'}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-300 font-medium">
                          {selectedEnvelope === 'ALL'
                            ? 'COMPLETE BID PACKAGE: ENVELOPE 1 (TECHNICAL) & ENVELOPE 2 (FINANCIAL)'
                            : selectedEnvelope === 'ENVELOPE_1'
                            ? 'ENVELOPE 1: ELIGIBILITY & TECHNICAL COMPONENT'
                            : 'ENVELOPE 2: FINANCIAL BID PROPOSAL'}
                        </p>
                      </div>
                      <div className="text-right text-[11px] font-mono text-slate-300">
                        <div><strong>PhilGEPS Ref:</strong> {projectRefNo}</div>
                        <div><strong className="text-emerald-400">ABC:</strong> {activeProject?.abc || '₱0.00'}</div>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="border-2 border-black overflow-hidden rounded-xl">
                      <table className="w-full text-left text-xs border-collapse font-sans">
                        <thead>
                          <tr className="bg-black text-white font-mono font-bold text-[11px]">
                            <th className="p-2 border-r border-slate-700 w-16 text-center">Tab #</th>
                            <th className="p-2 border-r border-slate-700">Document Title / Statutory Specification</th>
                            <th className="p-2 border-r border-slate-700 w-28 text-center">Category</th>
                            <th className="p-2 border-r border-slate-700 w-28 text-center">Copy</th>
                            <th className="p-2 w-36 text-center">Page Range in Bundle</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentItems.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                                (No documents attached)
                              </td>
                            </tr>
                          ) : (
                            currentItems.map((doc, idx) => {
                              const range = getDocumentPageRange(idx);
                              return (
                                <tr key={doc.id} className="border-t border-slate-300 text-[11px]">
                                  <td className="p-2 border-r border-slate-300 text-center font-mono font-bold bg-slate-100">
                                    TAB {idx + 1}
                                  </td>
                                  <td className="p-2 border-r border-slate-300 font-bold text-slate-950">
                                    {doc.documentName}
                                  </td>
                                  <td className="p-2 border-r border-slate-300 text-center font-mono text-[10px] text-slate-700 font-semibold">
                                    {doc.category}
                                  </td>
                                  <td className="p-2 border-r border-slate-300 text-center font-mono text-[10px] font-bold text-slate-950 bg-slate-50">
                                    {fCopy === 'ORIGINAL' ? 'ORIGINAL COPY' : fCopy === 'COPY_1' ? 'COPY 1' : 'COPY 2'}
                                  </td>
                                  <td className="p-2 text-center font-mono font-black text-slate-950 text-[10.5px] bg-amber-50/50">
                                    <span className="px-2 py-0.5 rounded border border-black/40 bg-white shadow-xs">
                                      {range.pageText}
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
                </div>

                {/* Footer */}
                <div className="border-t-2 border-black pt-3 flex items-center justify-between text-xs mt-6">
                  <div className="space-y-0.5 text-left">
                    <p className="text-[10px] font-mono font-bold uppercase text-slate-600">
                      Table of Contents Certified Correct ({fCopy === 'ORIGINAL' ? 'ORIGINAL' : fCopy === 'COPY_1' ? 'COPY 1' : 'COPY 2'}) By:
                    </p>
                    <p className="text-sm font-black uppercase underline text-black tracking-wide">
                      {tenant?.authorizedSignatory?.name || 'AUTHORIZED MANAGING OFFICER'}
                    </p>
                    <p className="text-[11px] text-slate-700 font-medium">
                      {tenant?.authorizedSignatory?.title || 'President'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <DocumentQrCode
                      details={{
                        documentNumber: projectRefNo || 'PhilGEPS-2026-001',
                        documentName: `${fCopy} Table of Contents — ${activeEnvelope}`,
                        projectName: projectTitle,
                        dateTimeSubmitted: activeProject?.dateTimeSubmitted || (activeProject as any)?.submissionDeadline,
                        companyName: tenant?.companyName,
                        solicitationNo: activeProject?.solicitationNo || (activeProject as any)?.solicitationNumber || 'SOL-2026-001'
                      }}
                      size={60}
                      className="border-2 border-black p-0.5 bg-white shrink-0"
                    />
                  </div>
                </div>
              </div>

              {currentItems.map((doc, idx) => {
                const codeOrId = ((doc.code || doc.id || '') as string).toUpperCase();
                const docNameLower = (doc.documentName || '').toLowerCase();
                const isFinancial = docNameLower.includes('bid form') ||
                  docNameLower.includes('price schedule') ||
                  docNameLower.includes('bill of quantities') ||
                  docNameLower.includes('boq') ||
                  docNameLower.includes('detailed estimate') ||
                  docNameLower.includes('form l') ||
                  docNameLower.includes('form (l)') ||
                  docNameLower.includes('summary of bid') ||
                  docNameLower.includes('summary bid') ||
                  docNameLower.includes('cash flow') ||
                  codeOrId.includes('FINANCIAL') || codeOrId.includes('FORM_L') || codeOrId.includes('BOQ') || codeOrId.includes('BID_FORM');

                const isTechnical = !isFinancial && (
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
                  docNameLower.includes('nfcc') || docNameLower.includes('contracting capacity')
                );

                const isTechnicalOrFinancial = isFinancial || isTechnical;

                const linkedVaultDoc = !isTechnicalOrFinancial
                  ? (vaultDocs.find(v => v.id === doc.vaultDocId) ||
                     vaultDocs.find(v => {
                       const vName = (v.documentName || '').toLowerCase();
                       const dName = doc.documentName.toLowerCase();
                       return vName === dName || (dName.length > 5 && vName.includes(dName));
                     }))
                  : undefined;

                const docCategory = isFinancial ? 'FINANCIAL' : isTechnical ? 'TECHNICAL' : (doc.category as any) || (linkedVaultDoc?.category as any) || 'LEGAL';

                return (
                  <div
                    key={`preview-cover-${fCopy}-${doc.id}`}
                    id={`preview-cover-${fCopy}-${doc.id}`}
                    style={{ width: '800px' }}
                  >
                    <DocumentCoverPage
                      item={{
                        id: doc.id,
                        tenantId: tenantId,
                        documentName: doc.documentName,
                        vaultDocumentName: linkedVaultDoc?.documentName,
                        attachedDocumentName: linkedVaultDoc?.fileName,
                        dtiSecType: (linkedVaultDoc as any)?.dtiSecType,
                        documentNumber: linkedVaultDoc?.documentNumber || doc.documentNumber || projectRefNo,
                        category: docCategory,
                        procurementApplicability: ['Infrastructure'],
                        legalBasisReference: 'RA 12009 NGPA / RA 9184 Standard',
                        versionNumber: linkedVaultDoc?.versionNumber || 1,
                        fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                        fileSizeBytes: doc.fileSizeBytes || 1048576,
                        fileName: linkedVaultDoc?.fileName || `${doc.documentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
                        uploadedByName: tenant?.authorizedSignatory?.name || 'Authorized Managing Officer',
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
                        submissionDeadline: activeProject?.dateTimeSubmitted || (activeProject as any)?.submissionDeadline || 'August 30, 2026 at 02:00 PM',
                        previousVersions: []
                      }}
                      tenant={tenant}
                      folderCopy={fCopy}
                      envelopeName={doc.envelope === 'ENVELOPE_1' ? 'ENVELOPE 1: TECHNICAL & ELIGIBILITY COMPONENT' : 'ENVELOPE 2: FINANCIAL BID PROPOSAL'}
                      incrementNumber={idx + 1}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

      </div>

      {/* 🔒 OWNER / HIGHER MANAGER APPROVAL GATE MODAL */}
      <ApprovalGateModal
        isOpen={showApprovalGateModal}
        onClose={() => setShowApprovalGateModal(false)}
        docTitle="3-Copy Sealed Bidding Documents Package (ORIGINAL, COPY 1, COPY 2)"
        trackingOrRefNo={projectScopeKey}
        approvalRecord={approvalRecord}
        onSubmitForApproval={() => {
          handleSubmitForApproval();
          setShowApprovalGateModal(false);
        }}
        onApprove={(notes) => {
          handleApprovePackage(notes);
          setShowApprovalGateModal(false);
        }}
        onRevertToDraft={() => {
          handleRevertToDraft();
          setShowApprovalGateModal(false);
        }}
      />
    </div>
  );
};
export default MergedPackageViewerModal;

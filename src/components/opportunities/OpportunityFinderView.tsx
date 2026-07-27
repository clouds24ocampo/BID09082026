import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PhilGEPSOpportunity, ProcurementType, SectorType, OpportunityPdfAttachment } from '../../types';
import VaultErrorBoundary from '../common/VaultErrorBoundary';
import {
  Search,
  Filter,
  Building2,
  Clock,
  ShieldCheck,
  Plus,
  ExternalLink,
  DollarSign,
  MapPin,
  FileText,
  CheckCircle2,
  Upload,
  AlertCircle,
  Calendar,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit3,
  Trash2,
  RefreshCw,
  Hash,
  Award,
  Mail,
  Phone,
  UserCheck,
  Lock,
  FileCheck
} from 'lucide-react';

const formatPhpCurrency = (val: number | string): string => {
  if (val === '' || val === null || val === undefined) return '';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return '';
  return '₱' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parsePhpCurrency = (val: string): number => {
  const cleaned = val.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const isValidPhone = (phone: string) => /^[\d\+\-\s\(\)]{7,20}$/.test(phone.trim());

export const OpportunityFinderView: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id || '';

  const [opportunities, setOpportunities] = useState<PhilGEPSOpportunity[]>(() => {
    const saved = localStorage.getItem(`bidocs_opportunities_${tenantId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Re-sync opportunities state when active tenant changes
  React.useEffect(() => {
    const saved = localStorage.getItem(`bidocs_opportunities_${tenantId}`);
    setOpportunities(saved ? JSON.parse(saved) : []);
  }, [tenantId]);

  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PhilGEPSOpportunity | null>(null);
  const [viewingItem, setViewingItem] = useState<PhilGEPSOpportunity | null>(null);
  const [deletingItem, setDeletingItem] = useState<PhilGEPSOpportunity | null>(null);
  const [previewPdfSlot, setPreviewPdfSlot] = useState<{ title: string; dataUrl?: string; fileName: string } | null>(null);

  // Form Fields & Specification States
  const [philgepsRefNo, setPhilgepsRefNo] = useState('');
  const [solicitationNumber, setSolicitationNumber] = useState('');
  const [areaOfDelivery, setAreaOfDelivery] = useState('');
  const [projectReferenceNumber, setProjectReferenceNumber] = useState('');
  const [sector, setSector] = useState<SectorType>('Government');
  const [biddingProjectTitle, setBiddingProjectTitle] = useState('');

  // Procuring Entity Group State
  const [procuringEntityName, setProcuringEntityName] = useState('');
  const [procuringEntityContactNumber, setProcuringEntityContactNumber] = useState('');
  const [procuringEntityAddress, setProcuringEntityAddress] = useState('');
  const [procuringEntityEmail, setProcuringEntityEmail] = useState('');
  const [procuringEntityPosition, setProcuringEntityPosition] = useState('');

  const [procurementType, setProcurementType] = useState<ProcurementType>('Goods & Supply');

  // Dates
  const todayStr = new Date().toISOString().split('T')[0];
  const [dateCreated, setDateCreated] = useState(todayStr);
  const [datePublished, setDatePublished] = useState(todayStr);
  const [preBidConferenceDatetime, setPreBidConferenceDatetime] = useState('');
  const [submissionDeadlineDatetime, setSubmissionDeadlineDatetime] = useState('');

  // Creation-flow PDF attachments state (4 slots)
  const [draftPdfAttachments, setDraftPdfAttachments] = useState<{
    bidBulletin?: OpportunityPdfAttachment;
    supplementalDocs?: OpportunityPdfAttachment;
    procuringEntityDocs?: OpportunityPdfAttachment;
    receiptOfBidDocs?: OpportunityPdfAttachment;
  }>({});

  // File & Currency
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfFileDataUrl, setPdfFileDataUrl] = useState('');
  const [approvedBudgetStr, setApprovedBudgetStr] = useState('');

  // Validation Error States
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync to localStorage
  React.useEffect(() => {
    if (tenantId) {
      localStorage.setItem(`bidocs_opportunities_${tenantId}`, JSON.stringify(opportunities));
    }
  }, [opportunities, tenantId]);

  const generateUniqueProjectId = (existingOps: PhilGEPSOpportunity[]) => {
    let candidate = '';
    let isTaken = true;
    let attempts = 0;
    while (isTaken && attempts < 500) {
      const suffix = Math.floor(Math.random() * 89999 + 10000);
      candidate = `PRJ-2026-${suffix}`;
      isTaken = existingOps.some(o => (o.projectReferenceNumber || '').trim().toUpperCase() === candidate);
      attempts++;
    }
    return candidate;
  };

  const resetForm = () => {
    setPhilgepsRefNo('');
    setSolicitationNumber('');
    setAreaOfDelivery('');
    setProjectReferenceNumber('');
    setSector('Government');
    setBiddingProjectTitle('');
    setProcuringEntityName('');
    setProcuringEntityContactNumber('');
    setProcuringEntityAddress('');
    setProcuringEntityEmail('');
    setProcuringEntityPosition('');
    setProcurementType('Goods & Supply');
    setDateCreated(new Date().toISOString().split('T')[0]);
    setDatePublished(new Date().toISOString().split('T')[0]);
    setPreBidConferenceDatetime('');
    setSubmissionDeadlineDatetime('');
    setDraftPdfAttachments({});
    setPdfFile(null);
    setPdfFileName('');
    setPdfFileDataUrl('');
    setApprovedBudgetStr('');
    setEditingItem(null);
    setErrors({});
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowAddEditModal(true);
  };

  const handleOpenEditModal = (op: PhilGEPSOpportunity) => {
    setEditingItem(op);
    setPhilgepsRefNo(op.philgepsRefNo);
    setSolicitationNumber(op.solicitationNumber || `SOL-2026-${Math.floor(Math.random() * 8999 + 1000)}`);
    setAreaOfDelivery(op.areaOfDelivery || op.location || 'NCR, Philippines');
    setProjectReferenceNumber(op.projectReferenceNumber);
    setSector(op.sector || 'Government');
    setBiddingProjectTitle(op.title);
    setProcuringEntityName(op.procuringEntity);
    setProcuringEntityContactNumber(op.procuringEntityContactNumber || '');
    setProcuringEntityAddress(op.procuringEntityAddress || '');
    setProcuringEntityEmail(op.procuringEntityEmail || '');
    setProcuringEntityPosition(op.procuringEntityPosition || '');
    setProcurementType(op.procurementType);
    setDateCreated(op.dateCreated || new Date().toISOString().split('T')[0]);
    setDatePublished(op.datePublished || new Date().toISOString().split('T')[0]);
    setPreBidConferenceDatetime(op.preBidConferenceDatetime || '');
    setSubmissionDeadlineDatetime(op.submissionDeadlineDatetime || '');
    setDraftPdfAttachments(op.pdfAttachments || {});
    setPdfFileName(op.pdfFileName || 'PhilGEPS_Notice.pdf');
    setPdfFileDataUrl(op.pdfFileDataUrl || '');
    setApprovedBudgetStr(formatPhpCurrency(op.approvedBudget));
    setErrors({});
    setShowAddEditModal(true);
  };

  // MULTI-FIELD SEARCH FILTER
  const filteredOps = opportunities.filter(op => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      return selectedType === 'ALL' || op.procurementType === selectedType;
    }

    const matchesName = op.title.toLowerCase().includes(q);
    const matchesProjNo = (op.projectReferenceNumber || '').toLowerCase().includes(q) || op.philgepsRefNo.toLowerCase().includes(q);
    const matchesAddress = (op.procuringEntityAddress || '').toLowerCase().includes(q) || op.location.toLowerCase().includes(q);
    const matchesArea = (op.areaOfDelivery || '').toLowerCase().includes(q);

    const matchesSearch = matchesName || matchesProjNo || matchesAddress || matchesArea;
    const matchesType = selectedType === 'ALL' || op.procurementType === selectedType;
    return matchesSearch && matchesType;
  });

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrors(prev => ({ ...prev, pdfFile: 'Only PDF files (.pdf) are accepted.' }));
      setPdfFile(null);
      setPdfFileName('');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, pdfFile: 'File size exceeds maximum allowed limit of 100 MB.' }));
      setPdfFile(null);
      setPdfFileName('');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPdfFileDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    setPdfFile(file);
    setPdfFileName(file.name);
    setErrors(prev => {
      const copy = { ...prev };
      delete copy.pdfFile;
      return copy;
    });
  };

  // Creation-flow PDF Slot Attachment Upload Handler
  const handleDraftSlotUpload = (
    slotKey: 'bidBulletin' | 'supplementalDocs' | 'procuringEntityDocs' | 'receiptOfBidDocs',
    file: File | undefined
  ) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      alert('Only PDF files (.pdf) are accepted.');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      alert(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 100 MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const attachmentObj: OpportunityPdfAttachment = {
        fileName: file.name,
        fileSizeBytes: file.size,
        uploadedAt: new Date().toLocaleString(),
        fileDataUrl: dataUrl
      };

      setDraftPdfAttachments(prev => ({
        ...prev,
        [slotKey]: attachmentObj
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleBudgetBlur = () => {
    const num = parsePhpCurrency(approvedBudgetStr);
    if (num > 0) {
      setApprovedBudgetStr(formatPhpCurrency(num));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!philgepsRefNo.trim()) {
      newErrors.philgepsRefNo = 'PhilGEPS Reference Number is required.';
    }

    if (!solicitationNumber.trim()) {
      newErrors.solicitationNumber = 'Solicitation Number is required.';
    }

    if (!biddingProjectTitle.trim()) {
      newErrors.biddingProjectTitle = 'Bidding Project Title is required.';
    } else if (biddingProjectTitle.length > 500) {
      newErrors.biddingProjectTitle = 'Title cannot exceed 500 characters.';
    }

    // Entity Group Validations
    if (!procuringEntityName.trim()) {
      newErrors.procuringEntityName = 'Procuring Entity Name is required.';
    }

    if (!procuringEntityContactNumber.trim()) {
      newErrors.procuringEntityContactNumber = 'Contact number is required.';
    } else if (!isValidPhone(procuringEntityContactNumber)) {
      newErrors.procuringEntityContactNumber = 'Invalid phone number format.';
    }

    if (!procuringEntityAddress.trim()) {
      newErrors.procuringEntityAddress = 'Procuring entity address is required.';
    }

    if (!procuringEntityEmail.trim()) {
      newErrors.procuringEntityEmail = 'Procuring entity email is required.';
    } else if (!isValidEmail(procuringEntityEmail)) {
      newErrors.procuringEntityEmail = 'Invalid email address format.';
    }

    if (!procuringEntityPosition.trim()) {
      newErrors.procuringEntityPosition = 'Officer position is required.';
    }

    if (!dateCreated) newErrors.dateCreated = 'Date created is required.';
    if (!datePublished) newErrors.datePublished = 'Date published is required.';
    if (!submissionDeadlineDatetime) newErrors.submissionDeadlineDatetime = 'Submission deadline Date & Time is required.';

    if (!pdfFileName) {
      newErrors.pdfFile = 'PhilGEPS official PDF document is required.';
    }

    const numBudget = parsePhpCurrency(approvedBudgetStr);
    if (!approvedBudgetStr || numBudget <= 0) {
      newErrors.approvedBudget = 'Approved Budget for Contract (ABC) is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveOpportunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const numBudget = parsePhpCurrency(approvedBudgetStr);
    const trimmedRefNo = philgepsRefNo.trim();

    if (editingItem) {
      // Edit mode (Project Reference Number is read-only and preserved)
      const updatedOp: PhilGEPSOpportunity = {
        ...editingItem,
        philgepsRefNo: trimmedRefNo.toUpperCase().startsWith('PHILGEPS-') ? trimmedRefNo.toUpperCase() : `PhilGEPS-${trimmedRefNo}`,
        projectReferenceNumber: editingItem.projectReferenceNumber,
        solicitationNumber: solicitationNumber.trim(),
        areaOfDelivery: areaOfDelivery.trim() || procuringEntityAddress.trim(),
        sector,
        title: biddingProjectTitle.trim(),
        procuringEntity: procuringEntityName.trim(),
        procuringEntityContactNumber: procuringEntityContactNumber.trim(),
        procuringEntityAddress: procuringEntityAddress.trim(),
        procuringEntityEmail: procuringEntityEmail.trim(),
        procuringEntityPosition: procuringEntityPosition.trim(),
        procurementType,
        approvedBudget: numBudget,
        dateCreated,
        datePublished,
        preBidConferenceDatetime,
        submissionDeadlineDatetime,
        pdfFileName,
        pdfFileSize: pdfFile?.size || editingItem.pdfFileSize || 0,
        pdfFileDataUrl: pdfFileDataUrl || editingItem.pdfFileDataUrl,
        pdfAttachments: draftPdfAttachments
      };

      setOpportunities(prev => prev.map(o => o.id === editingItem.id ? updatedOp : o));
      if (viewingItem?.id === editingItem.id) setViewingItem(updatedOp);
    } else {
      // Add mode (Project Reference Number is auto-generated on save)
      const generatedProjectId = generateUniqueProjectId(opportunities);

      const newOp: PhilGEPSOpportunity = {
        id: `op-${Date.now()}`,
        philgepsRefNo: trimmedRefNo.toUpperCase().startsWith('PHILGEPS-') ? trimmedRefNo.toUpperCase() : `PhilGEPS-${trimmedRefNo}`,
        projectReferenceNumber: generatedProjectId,
        solicitationNumber: solicitationNumber.trim(),
        areaOfDelivery: areaOfDelivery.trim() || procuringEntityAddress.trim(),
        sector,
        title: biddingProjectTitle.trim(),
        procuringEntity: procuringEntityName.trim(),
        procuringEntityContactNumber: procuringEntityContactNumber.trim(),
        procuringEntityAddress: procuringEntityAddress.trim(),
        procuringEntityEmail: procuringEntityEmail.trim(),
        procuringEntityPosition: procuringEntityPosition.trim(),
        procurementType,
        legalRegime: 'RA_12009_NGPA',
        approvedBudget: numBudget,
        dateCreated,
        datePublished,
        preBidConferenceDatetime,
        submissionDeadlineDatetime,
        submissionDeadline: submissionDeadlineDatetime ? new Date(submissionDeadlineDatetime).toISOString() : new Date().toISOString(),
        bidOpeningDate: submissionDeadlineDatetime ? new Date(submissionDeadlineDatetime).toISOString() : new Date().toISOString(),
        pdfFileName,
        pdfFileSize: pdfFile?.size || 0,
        pdfFileDataUrl,
        status: 'OPEN',
        location: procuringEntityAddress.trim() || 'Philippines',
        description: `${biddingProjectTitle.trim()} — Procured by ${procuringEntityName.trim()}`,
        pdfAttachments: draftPdfAttachments
      };

      setOpportunities(prev => [newOp, ...prev]);
    }

    setShowAddEditModal(false);
    resetForm();
  };

  const handleDeleteOpportunity = () => {
    if (!deletingItem) return;
    setOpportunities(prev => prev.filter(o => o.id !== deletingItem.id));
    if (viewingItem?.id === deletingItem.id) setViewingItem(null);
    setDeletingItem(null);
  };

  // Slot Upload Handler for Detail View
  const handleSlotAttachmentUploadDetail = (
    opId: string,
    slotKey: 'bidBulletin' | 'supplementalDocs' | 'procuringEntityDocs' | 'receiptOfBidDocs',
    file: File | undefined
  ) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      alert('Only PDF files (.pdf) are accepted.');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      alert(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds 100 MB limit.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;

      const attachmentObj: OpportunityPdfAttachment = {
        fileName: file.name,
        fileSizeBytes: file.size,
        uploadedAt: new Date().toLocaleString(),
        fileDataUrl: dataUrl
      };

      setOpportunities(prev => prev.map(op => {
        if (op.id === opId) {
          const updatedAttachments = {
            ...(op.pdfAttachments || {}),
            [slotKey]: attachmentObj
          };
          const updatedOp = { ...op, pdfAttachments: updatedAttachments };
          if (viewingItem?.id === opId) setViewingItem(updatedOp);
          return updatedOp;
        }
        return op;
      }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <VaultErrorBoundary fallbackTitle="Opportunity Finder Protected">
      <div className="space-y-6 animate-fadeIn">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: currentTenant?.brandColor || '#1e40af' }}
            />
            <h1 className="text-2xl font-bold text-white">Opportunity Finder & Procurement Registry</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time PhilGEPS bidding opportunities repository for <span className="text-slate-200 font-semibold">{currentTenant?.companyName}</span>.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition flex items-center gap-2 hover:opacity-90 shrink-0"
          style={{ backgroundColor: currentTenant?.brandColor || '#1e40af' }}
        >
          <Plus className="w-4 h-4" />
          <span>Add Bidding Opportunity</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {['ALL', 'Goods & Supply', 'Goods & Supply with Installation', 'Infrastructure', 'Consulting'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${selectedType === t
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
            >
              {t === 'ALL' ? 'All Procurement Types' : t}
            </button>
          ))}
        </div>

        {/* Global Multi-Field Search Input */}
        <div className="relative min-w-[280px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by project name, project ID, address, or area of delivery..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Opportunities List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOps.map((op) => (
          <div
            key={op.id}
            className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition space-y-4 flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30">
                  {op.projectReferenceNumber}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                  {op.sector || 'Government'}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition leading-snug">{op.title}</h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-mono">
                  <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">{op.procuringEntity}</span>
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-800/60">
                  <span>PhilGEPS: <strong className="text-slate-200">{op.philgepsRefNo}</strong></span>
                  <span>Solicitation: <strong className="text-slate-200">{op.solicitationNumber}</strong></span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Approved Budget (ABC)</span>
                  <span className="text-emerald-400 font-bold">{formatPhpCurrency(op.approvedBudget)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Area of Delivery</span>
                  <span className="text-slate-200 truncate max-w-[140px]">{op.areaOfDelivery || op.location}</span>
                </div>
                {op.submissionDeadlineDatetime && (
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Submission Deadline</span>
                    <span className="text-amber-400 font-semibold">{new Date(op.submissionDeadlineDatetime).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setViewingItem(op)}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition text-xs font-semibold flex items-center gap-1 border border-blue-500/30"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </button>

                <button
                  onClick={() => setPreviewPdfSlot({
                    title: 'Official PhilGEPS PDF Notice Document',
                    fileName: op.pdfFileName || `${op.philgepsRefNo}_Notice.pdf`,
                    dataUrl: op.pdfFileDataUrl
                  })}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition text-xs font-semibold flex items-center gap-1 border border-emerald-500/30"
                  title="View Official PhilGEPS PDF Notice Document"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View PhilGEPS PDF</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenEditModal(op)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                  title="Edit Opportunity"
                >
                  <Edit3 className="w-4 h-4 text-amber-400" />
                </button>
                <button
                  onClick={() => setDeletingItem(op)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-red-600 hover:text-white transition"
                  title="Delete Opportunity"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* DETAIL VIEW MODAL & 4 PDF ATTACHMENT SLOTS (100% SCREEN ADAPTED RESPONSIVE MODAL) */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col p-2 sm:p-4 md:p-6 overflow-hidden animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full h-full max-w-[1800px] mx-auto shadow-2xl flex flex-col overflow-hidden">

            {/* Modal Header Bar */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-blue-600 text-white shadow">
                  {viewingItem.projectReferenceNumber}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">{viewingItem.title}</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    PhilGEPS Ref: {viewingItem.philgepsRefNo} • Solicitation: {viewingItem.solicitationNumber}
                  </p>
                </div>
              </div>
              <button onClick={() => setViewingItem(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs overflow-y-auto flex-1">

              {/* Grid 1: Stored Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Procuring Entity</span>
                  <p className="font-bold text-white">{viewingItem.procuringEntity}</p>
                  <p className="text-[11px] text-slate-400">{viewingItem.procuringEntityPosition || 'Procurement Officer'}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Area of Delivery</span>
                  <p className="font-bold text-slate-200">{viewingItem.areaOfDelivery || viewingItem.location}</p>
                  <p className="text-[11px] text-slate-500 font-mono">{viewingItem.procuringEntityAddress}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Approved Budget (ABC)</span>
                  <p className="font-bold text-emerald-400 text-sm">{formatPhpCurrency(viewingItem.approvedBudget)}</p>
                  <p className="text-[11px] text-slate-400">{viewingItem.procurementType}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Date Created & Published</span>
                  <p className="font-bold text-slate-200">Created: {viewingItem.dateCreated || 'N/A'}</p>
                  <p className="text-[11px] text-slate-400">Published: {viewingItem.datePublished || 'N/A'}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Pre-Bid Conference</span>
                  <p className="font-bold text-slate-200">{viewingItem.preBidConferenceDatetime ? new Date(viewingItem.preBidConferenceDatetime).toLocaleString() : 'N/A'}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Submission Deadline</span>
                  <p className="font-bold text-amber-400">{viewingItem.submissionDeadlineDatetime ? new Date(viewingItem.submissionDeadlineDatetime).toLocaleString() : 'N/A'}</p>
                </div>
              </div>

              {/* OFFICIAL PHILGEPS PDF NOTICE DOCUMENT BANNER */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/80 to-slate-900 border border-blue-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Official PhilGEPS PDF Notice Document</span>
                      <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">Verified</span>
                    </h4>
                    <p className="text-xs text-slate-300 font-mono mt-0.5">
                      File: <strong className="text-blue-300">{viewingItem.pdfFileName || `${viewingItem.philgepsRefNo}_Notice.pdf`}</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setPreviewPdfSlot({
                    title: 'Official PhilGEPS PDF Notice Document',
                    fileName: viewingItem.pdfFileName || `${viewingItem.philgepsRefNo}_Notice.pdf`,
                    dataUrl: viewingItem.pdfFileDataUrl
                  })}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg transition flex items-center justify-center gap-2 shrink-0"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Official PhilGEPS PDF</span>
                </button>
              </div>

              {/* 4 DEDICATED PDF ATTACHMENT SLOTS SECTION */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Additional Bidding PDF Documents (4 Dedicated Slots)
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">Max 100 MB per PDF</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'bidBulletin', title: '1. Bid Bulletin', color: 'border-blue-500/30' },
                    { key: 'supplementalDocs', title: '2. Bid Supplemental Documents', color: 'border-emerald-500/30' },
                    { key: 'procuringEntityDocs', title: '3. Bid Docs from Procuring Entity', color: 'border-amber-500/30' },
                    { key: 'receiptOfBidDocs', title: '4. Receipt of Bid Docs', color: 'border-purple-500/30' },
                  ].map((slot) => {
                    const slotKey = slot.key as 'bidBulletin' | 'supplementalDocs' | 'procuringEntityDocs' | 'receiptOfBidDocs';
                    const attachment = viewingItem.pdfAttachments?.[slotKey];

                    return (
                      <div key={slot.key} className={`p-4 rounded-2xl bg-slate-950 border ${slot.color} space-y-3 flex flex-col justify-between`}>
                        <div>
                          <h5 className="font-bold text-white text-xs">{slot.title}</h5>
                          {attachment ? (
                            <div className="mt-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                              <p className="font-mono text-xs text-blue-300 font-bold truncate">{attachment.fileName}</p>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                <span>{(attachment.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                                <span>Uploaded: {attachment.uploadedAt}</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-500 mt-2 italic font-mono">No PDF file attached to this slot.</p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-900 flex items-center justify-end gap-2">
                          {attachment ? (
                            <>
                              <button
                                onClick={() => setPreviewPdfSlot({ title: slot.title, dataUrl: attachment.fileDataUrl, fileName: attachment.fileName })}
                                className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition text-[11px] font-semibold flex items-center gap-1 border border-blue-500/30"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View PDF</span>
                              </button>

                              <label className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition text-[11px] font-semibold flex items-center gap-1 border border-emerald-500/30 cursor-pointer">
                                <RefreshCw className="w-3 h-3" />
                                <span>Replace</span>
                                <input
                                  type="file"
                                  accept=".pdf"
                                  onChange={(e) => handleSlotAttachmentUploadDetail(viewingItem.id, slotKey, e.target.files?.[0])}
                                  className="hidden"
                                />
                              </label>
                            </>
                          ) : (
                            <label className="px-3 py-1.5 rounded-lg text-white font-semibold text-[11px] bg-blue-600 hover:bg-blue-500 transition shadow flex items-center gap-1 cursor-pointer">
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload PDF</span>
                              <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => handleSlotAttachmentUploadDetail(viewingItem.id, slotKey, e.target.files?.[0])}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/95 sticky bottom-0 z-10 shrink-0">
              <button
                onClick={() => handleOpenEditModal(viewingItem)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white transition flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Opportunity</span>
              </button>

              <button
                onClick={() => setViewingItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ADD / EDIT OPPORTUNITY MODAL (100% SCREEN ADAPTED RESPONSIVE MODAL) */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col p-2 sm:p-4 md:p-6 overflow-hidden animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full h-full max-w-[1800px] mx-auto shadow-2xl flex flex-col overflow-hidden">

            {/* Modal Fixed Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                {editingItem ? 'Edit Bidding Opportunity' : 'Add Bidding Opportunity'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddEditModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Wrapping Scrollable Body & Fixed Footer */}
            <form onSubmit={handleSaveOpportunity} className="flex-1 flex flex-col overflow-hidden">

              {/* Scrollable Form Body */}
              <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">

                {/* If Editing, display Project Reference Number as PERMANENTLY LOCKED / READ-ONLY */}
                {editingItem && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-300 font-mono">
                      <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Project Reference Number (Project ID): <strong className="text-white font-bold">{projectReferenceNumber}</strong></span>
                    </div>
                    <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded border border-slate-700 font-bold">LOCKED / READ-ONLY</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">PhilGEPS Ref. No. <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={philgepsRefNo}
                      onChange={(e) => setPhilgepsRefNo(e.target.value)}
                      placeholder="e.g. 10928371"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                    {errors.philgepsRefNo && <p className="text-[11px] text-red-400 mt-1">{errors.philgepsRefNo}</p>}
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Solicitation No. <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={solicitationNumber}
                      onChange={(e) => setSolicitationNumber(e.target.value)}
                      placeholder="e.g. SOL-2026-0912"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                    {errors.solicitationNumber && <p className="text-[11px] text-red-400 mt-1">{errors.solicitationNumber}</p>}
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Sector <span className="text-red-400">*</span></label>
                    <select
                      value={sector}
                      onChange={(e) => setSector(e.target.value as SectorType)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="Government">Government</option>
                      <option value="Private">Private</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Procurement Type <span className="text-red-400">*</span></label>
                    <select
                      value={procurementType}
                      onChange={(e) => setProcurementType(e.target.value as ProcurementType)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="Goods & Supply">Goods & Supply</option>
                      <option value="Goods & Supply with Installation">Goods & Supply with Installation</option>
                      <option value="Infrastructure">Infrastructure</option>
                      <option value="Consulting">Consulting</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Bidding Project Title <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={biddingProjectTitle}
                    onChange={(e) => setBiddingProjectTitle(e.target.value)}
                    placeholder="e.g. Supply and Delivery of Enterprise IT Infrastructure Systems"
                    required
                    maxLength={500}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Procuring Entity Details */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
                    Procuring Entity & Area of Delivery
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Entity Name <span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        value={procuringEntityName}
                        onChange={(e) => setProcuringEntityName(e.target.value)}
                        placeholder="e.g. Department of Information & Communications Technology"
                        required
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Contact Number <span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        value={procuringEntityContactNumber}
                        onChange={(e) => setProcuringEntityContactNumber(e.target.value)}
                        placeholder="+63 917 123 4567"
                        required
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Email Address <span className="text-red-400">*</span></label>
                      <input
                        type="email"
                        value={procuringEntityEmail}
                        onChange={(e) => setProcuringEntityEmail(e.target.value)}
                        placeholder="bac_secretariat@dict.gov.ph"
                        required
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Area of Delivery</label>
                      <input
                        type="text"
                        value={areaOfDelivery}
                        onChange={(e) => setAreaOfDelivery(e.target.value)}
                        placeholder="e.g. Metro Manila / Visayas / Mindanao Region"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Officer Position <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={procuringEntityPosition}
                      onChange={(e) => setProcuringEntityPosition(e.target.value)}
                      placeholder="BAC Secretariat Head"
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Address <span className="text-red-400">*</span></label>
                    <textarea
                      value={procuringEntityAddress}
                      onChange={(e) => setProcuringEntityAddress(e.target.value)}
                      placeholder="DICT Building, C.P. Garcia Ave., Diliman, Quezon City"
                      required
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Restored Dates: Created & Published */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Date Created <span className="text-red-400">*</span></label>
                    <input
                      type="date"
                      value={dateCreated}
                      onChange={(e) => setDateCreated(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Date Published <span className="text-red-400">*</span></label>
                    <input
                      type="date"
                      value={datePublished}
                      onChange={(e) => setDatePublished(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Pre-Bid & Deadline Datetime */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Pre-Bid Conference Date & Time <span className="text-slate-500 font-mono text-[11px]">(Optional)</span></label>
                    <input
                      type="datetime-local"
                      value={preBidConferenceDatetime}
                      onChange={(e) => setPreBidConferenceDatetime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Submission Deadline Date & Time <span className="text-red-400">*</span></label>
                    <input
                      type="datetime-local"
                      value={submissionDeadlineDatetime}
                      onChange={(e) => setSubmissionDeadlineDatetime(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Approved Budget for Contract (ABC) <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={approvedBudgetStr}
                    onChange={(e) => setApprovedBudgetStr(e.target.value)}
                    onBlur={handleBudgetBlur}
                    placeholder="₱1,250,000.00"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Main Notice PDF Upload */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Official PhilGEPS PDF Notice Document (Max 100 MB) <span className="text-red-400">*</span></label>
                  <div className="border-2 border-dashed border-slate-800 rounded-xl p-4 text-center hover:border-blue-500 transition cursor-pointer bg-slate-950">
                    <label className="cursor-pointer block space-y-1">
                      <FileText className="w-6 h-6 text-blue-400 mx-auto" />
                      <p className="text-xs text-slate-300 font-semibold">{pdfFileName || 'Click to select PDF document'}</p>
                      <input type="file" accept=".pdf" onChange={handlePdfUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* INLINE 4 PDF ATTACHMENT SLOTS DURING CREATION / EDITING */}
                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-blue-400" />
                      Upload PDF Attachments During Creation / Edit
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">Max 100 MB per slot</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'bidBulletin', label: 'Bid Bulletin' },
                      { key: 'supplementalDocs', label: 'Bid Supplemental Docs' },
                      { key: 'procuringEntityDocs', label: 'Procuring Entity Docs' },
                      { key: 'receiptOfBidDocs', label: 'Receipt of Bid Docs' }
                    ].map((s) => {
                      const slotKey = s.key as 'bidBulletin' | 'supplementalDocs' | 'procuringEntityDocs' | 'receiptOfBidDocs';
                      const att = draftPdfAttachments[slotKey];

                      return (
                        <div key={s.key} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-semibold text-white text-[11px] block">{s.label}</span>
                            {att ? (
                              <span className="text-[10px] text-blue-400 font-mono truncate block">{att.fileName}</span>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic block">No PDF attached</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {att && (
                              <button
                                type="button"
                                onClick={() => setPreviewPdfSlot({ title: s.label, dataUrl: att.fileDataUrl, fileName: att.fileName })}
                                className="px-2 py-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white text-[10px] font-bold transition flex items-center gap-0.5 border border-blue-500/30"
                              >
                                <Eye className="w-3 h-3" /> View
                              </button>
                            )}

                            <label className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold transition cursor-pointer flex items-center gap-0.5">
                              <Upload className="w-3 h-3 text-blue-400" />
                              <span>{att ? 'Replace' : 'Upload'}</span>
                              <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => handleDraftSlotUpload(slotKey, e.target.files?.[0])}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Fixed Modal Action Buttons Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-xl transition flex items-center gap-1.5 hover:opacity-90 cursor-pointer"
                  style={{ backgroundColor: currentTenant?.brandColor || '#1e40af' }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingItem ? 'Save Changes' : 'Create & Save Opportunity'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-scaleIn">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Delete Bidding Opportunity?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white">{deletingItem.title}</strong> (Ref: {deletingItem.philgepsRefNo})? All linked PDF attachments will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOpportunity}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition shadow"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INLINE SLOT PDF PREVIEW MODAL (100% SCREEN ADAPTED RESPONSIVE MODAL) */}
      {previewPdfSlot && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col p-2 sm:p-4 md:p-6 overflow-hidden animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full h-full max-w-[1800px] mx-auto shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">{previewPdfSlot.title} — {previewPdfSlot.fileName}</h3>
              </div>
              <button onClick={() => setPreviewPdfSlot(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-950 text-center">
              {previewPdfSlot.dataUrl ? (
                <iframe
                  src={previewPdfSlot.dataUrl}
                  title={previewPdfSlot.fileName}
                  className="w-full h-[700px] border-none rounded-xl bg-slate-900"
                />
              ) : (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <FileText className="w-12 h-12 text-blue-400 mx-auto opacity-70" />
                  <p className="text-xs font-mono font-bold text-white">{previewPdfSlot.fileName}</p>
                  <p className="text-xs text-slate-500">PDF Document Active in Opportunity Vault</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
    </VaultErrorBoundary>
  );
};

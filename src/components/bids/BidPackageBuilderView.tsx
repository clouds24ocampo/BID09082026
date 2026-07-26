import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ChecklistRequirement, DocumentVaultItem } from '../../types';
import { DocumentCoverPage } from '../vault/DocumentCoverPage';
import { MergedPdfViewerModal } from '../vault/MergedPdfViewerModal';
import { PdfPreviewModal } from '../vault/PdfPreviewModal';
import { loadVaultItems, loadPdfData } from '../../utils/vaultIndexedDB';
import {
  FolderKanban,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Download,
  FileText,
  ExternalLink,
  Clock,
  ChevronRight,
  Building2,
  Sparkles,
  Send,
  Printer,
  Edit3,
  Eye,
  Layers,
  X,
  RefreshCw
} from 'lucide-react';

const DEFAULT_CHECKLIST: ChecklistRequirement[] = [
  {
    id: 'chk-01',
    requirementCode: 'PHILGEPS_PLATINUM',
    requirementName: 'PhilGEPS Platinum Certificate of Registration (Annex A)',
    envelope: 'ENVELOPE_1_ELIGIBILITY_TECHNICAL',
    isMandatory: true,
    legalRegime: 'RA_12009_NGPA',
    status: 'MISSING'
  },
  {
    id: 'chk-02',
    requirementCode: 'TAX_CLEARANCE',
    requirementName: 'BIR Tax Clearance Certificate for Bidding (EO 398)',
    envelope: 'ENVELOPE_1_ELIGIBILITY_TECHNICAL',
    isMandatory: true,
    legalRegime: 'RA_12009_NGPA',
    status: 'MISSING'
  },
  {
    id: 'chk-03',
    requirementCode: 'PCAB_LICENSE',
    requirementName: 'PCAB License and Special License (Infrastructure)',
    envelope: 'ENVELOPE_1_ELIGIBILITY_TECHNICAL',
    isMandatory: true,
    legalRegime: 'RA_12009_NGPA',
    status: 'MISSING'
  },
  {
    id: 'chk-04',
    requirementCode: 'SLCC_STATEMENT',
    requirementName: 'Statement of Single Largest Completed Contract (SLCC)',
    envelope: 'ENVELOPE_1_ELIGIBILITY_TECHNICAL',
    isMandatory: true,
    legalRegime: 'RA_12009_NGPA',
    status: 'MISSING'
  },
  {
    id: 'chk-05',
    requirementCode: 'OMNIBUS_SWORN_STATEMENT',
    requirementName: 'GPPB Standard Omnibus Sworn Statement (OSS)',
    envelope: 'ENVELOPE_1_ELIGIBILITY_TECHNICAL',
    isMandatory: true,
    legalRegime: 'RA_12009_NGPA',
    status: 'MISSING'
  },
  {
    id: 'chk-06',
    requirementCode: 'BID_SECURING_DECLARATION',
    requirementName: 'Bid Securing Declaration (BSD) or Bid Security',
    envelope: 'ENVELOPE_1_ELIGIBILITY_TECHNICAL',
    isMandatory: true,
    legalRegime: 'RA_12009_NGPA',
    status: 'MISSING'
  },
  {
    id: 'chk-07',
    requirementCode: 'FINANCIAL_BID_FORM',
    requirementName: 'Financial Bid Form (GPPB Official Format)',
    envelope: 'ENVELOPE_2_FINANCIAL',
    isMandatory: true,
    legalRegime: 'RA_12009_NGPA',
    status: 'MISSING'
  },
  {
    id: 'chk-08',
    requirementCode: 'PRICE_SCHEDULE',
    requirementName: 'Detailed Price Schedule / Bill of Quantities (BOQ)',
    envelope: 'ENVELOPE_2_FINANCIAL',
    isMandatory: true,
    legalRegime: 'RA_12009_NGPA',
    status: 'MISSING'
  }
];

export const BidPackageBuilderView: React.FC = () => {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id || '';

  const [checklist, setChecklist] = useState<ChecklistRequirement[]>(() => {
    const saved = localStorage.getItem(`bidocs_checklist_${tenantId}`);
    return saved ? JSON.parse(saved) : DEFAULT_CHECKLIST;
  });
  const [activeEnvelope, setActiveEnvelope] = useState<'ENVELOPE_1' | 'ENVELOPE_2'>('ENVELOPE_1');
  const [showFormGeneratorModal, setShowFormGeneratorModal] = useState(false);
  const [showCoverPageModal, setShowCoverPageModal] = useState(false);
  const [selectedFormCode, setSelectedFormCode] = useState('OMNIBUS_SWORN_STATEMENT');

  // Package Organizer & View/Edit Modals State
  const [showOrganizeModal, setShowOrganizeModal] = useState(false);
  const [vaultDocs, setVaultDocs] = useState<DocumentVaultItem[]>([]);
  const pdfDataCache = useRef<Record<string, string>>({});

  const [editReqItem, setEditReqItem] = useState<ChecklistRequirement | null>(null);
  const [editReqName, setEditReqName] = useState('');
  const [editReqCode, setEditReqCode] = useState('');
  const [editReqStatus, setEditReqStatus] = useState<ChecklistRequirement['status']>('VERIFIED_VALID');

  const [previewDocItem, setPreviewDocItem] = useState<DocumentVaultItem | null>(null);

  // Sync checklist to localStorage
  React.useEffect(() => {
    localStorage.setItem(`bidocs_checklist_${tenantId}`, JSON.stringify(checklist));
  }, [checklist, tenantId]);

  // Sync state on tenant switch
  React.useEffect(() => {
    const saved = localStorage.getItem(`bidocs_checklist_${tenantId}`);
    setChecklist(saved ? JSON.parse(saved) : DEFAULT_CHECKLIST);
  }, [tenantId]);

  // Load vault documents from IndexedDB for organizing, previewing, and auto-verifying checklist
  React.useEffect(() => {
    loadVaultItems(tenantId).then(async (docs) => {
      if (Array.isArray(docs) && docs.length > 0) {
        setVaultDocs(docs);
        for (const d of docs) {
          try {
            const data = await loadPdfData(d.id);
            if (data) pdfDataCache.current[d.id] = data;
          } catch (_) { /* ignore missing blobs */ }
        }

        setChecklist(prev => prev.map(item => {
          const matchingDoc = docs.find((d: any) =>
            d.documentName.toLowerCase().includes(item.requirementName.toLowerCase().split(' ')[0]) ||
            (d.category.toLowerCase().includes('eligibility') && item.requirementCode === 'PHILGEPS_PLATINUM')
          );
          if (matchingDoc) {
            return { ...item, status: 'VERIFIED_VALID', linkedDocId: matchingDoc.id };
          }
          return item;
        }));
      } else {
        setVaultDocs([]);
      }
    }).catch(e => console.error('[BidPackage] Failed to load vault items:', e));
  }, [tenantId]);

  const envelope1Items = checklist.filter(c => c.envelope === 'ENVELOPE_1_ELIGIBILITY_TECHNICAL');
  const envelope2Items = checklist.filter(c => c.envelope === 'ENVELOPE_2_FINANCIAL');

  const isEnvelope1Valid = envelope1Items.every(c => c.status === 'VERIFIED_VALID' || c.status === 'ATTACHED');

  const toggleChecklistStatus = (id: string) => {
    setChecklist(prev => prev.map(c => {
      if (c.id === id) {
        const nextStatus = c.status === 'VERIFIED_VALID' ? 'MISSING' : 'VERIFIED_VALID';
        return { ...c, status: nextStatus };
      }
      return c;
    }));
  };

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: currentTenant?.brandColor || '#1e40af' }}
            />
            <h1 className="text-2xl font-bold text-white">Universal Bid Package Builder</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Envelope Assembly & GPPB Compliance Checklist for <span className="text-slate-200 font-semibold">{currentTenant?.companyName}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowOrganizeModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow transition flex items-center gap-1.5"
            title="Organize & re-sequence documents before printing or export"
          >
            <Layers className="w-4 h-4 text-purple-200" />
            <span>Organize Documents</span>
          </button>

          <button
            onClick={() => setShowCoverPageModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow transition flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4 text-blue-200" />
            <span>View Cover Page</span>
          </button>

          <button
            onClick={() => setShowFormGeneratorModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>Form Auto-Generator</span>
          </button>

          <button
            onClick={() => setShowOrganizeModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow transition flex items-center gap-1.5"
            title="Export full bid package as PDF"
          >
            <Download className="w-4 h-4 text-amber-200" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={() => setShowOrganizeModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition flex items-center gap-1.5"
            title="Print organized bid package"
          >
            <Printer className="w-4 h-4 text-indigo-200" />
            <span>Print Package</span>
          </button>
        </div>
      </div>

      {/* Active Bid Target Card */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-400">PhilGEPS-2026-10928371</span>
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono text-[10px] font-semibold">
              INFRASTRUCTURE
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> RA 12009 NGPA
            </span>
          </div>
          <span className="text-amber-400 font-mono font-semibold">Deadline: Aug 12, 2026</span>
        </div>

        <h2 className="text-base font-extrabold text-white">
          Construction of Multi-Purpose Evacuation Center Phase II
        </h2>
        <p className="text-xs text-slate-400">
          Procuring Entity: Department of Public Works and Highways (DPWH Region IV-A) | ABC: <span className="font-mono text-emerald-400 font-bold">₱24,500,000.00</span>
        </p>

        {/* Envelope Progress Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => setActiveEnvelope('ENVELOPE_1')}
            className={`p-3 rounded-xl text-left border transition ${activeEnvelope === 'ENVELOPE_1'
              ? 'border-blue-500 bg-blue-600/10 text-white'
              : 'border-slate-800 bg-slate-900/60 text-slate-400'
              }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Envelope 1: Eligibility & Technical Documents</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                6 Items
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Class A/B Documents, Bid Securing Declaration, Omnibus Sworn Statement</p>
          </button>

          <button
            onClick={() => setActiveEnvelope('ENVELOPE_2')}
            className={`p-3 rounded-xl text-left border transition ${activeEnvelope === 'ENVELOPE_2'
              ? 'border-emerald-500 bg-emerald-600/10 text-white'
              : 'border-slate-800 bg-slate-900/60 text-slate-400'
              }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Envelope 2: Financial Envelope</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                2 Items
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Financial Bid Form & Detailed Bill of Quantities (BOQ)</p>
          </button>
        </div>
      </div>

      {/* Checklist Matrix Table */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-blue-400" />
            {activeEnvelope === 'ENVELOPE_1' ? 'Envelope 1 Checklist Matrix' : 'Envelope 2 Checklist Matrix'}
          </h3>
          <span className="text-xs text-slate-400">Click item status to toggle verification</span>
        </div>

        <div className="space-y-3">
          {(activeEnvelope === 'ENVELOPE_1' ? envelope1Items : envelope2Items).map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl glass-card border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                    {item.requirementCode}
                  </span>
                  <span className="text-slate-400">RA 12009 NGPA Compliant</span>
                </div>
                <p className="text-xs font-bold text-white">{item.requirementName}</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div onClick={() => toggleChecklistStatus(item.id)} className="cursor-pointer" title="Click to toggle status">
                  {item.status === 'VERIFIED_VALID' && (
                    <span className="badge-success text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified Valid
                    </span>
                  )}
                  {item.status === 'ATTACHED' && (
                    <span className="badge-info text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> Attached
                    </span>
                  )}
                  {item.status === 'EXPIRED' && (
                    <span className="badge-warning text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Expired in Vault
                    </span>
                  )}
                  {item.status === 'MISSING' && (
                    <span className="badge-danger text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" /> Missing
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const linked = vaultDocs.find(d => d.id === item.linkedDocId) || vaultDocs[0];
                    if (linked) {
                      setPreviewDocItem(linked);
                    } else {
                      setShowCoverPageModal(true);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition text-xs font-semibold border border-blue-500/30 flex items-center gap-1"
                  title="View attached document"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditReqItem(item);
                    setEditReqName(item.requirementName);
                    setEditReqCode(item.requirementCode);
                    setEditReqStatus(item.status);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white transition text-xs font-semibold border border-amber-500/30 flex items-center gap-1"
                  title="Edit requirement details"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FORM AUTO-GENERATOR PREVIEW MODAL */}
      {showFormGeneratorModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl glass-panel p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  GPPB Standard Form Auto-Populator
                </h2>
                <p className="text-xs text-slate-400">Pre-populates corporate tenant data into Philippine government bidding templates.</p>
              </div>
              <button onClick={() => setShowFormGeneratorModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {/* Generated Document Preview */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs text-slate-300">
              <div className="text-center space-y-1 border-b border-slate-800 pb-2">
                <p className="font-bold text-white">REPUBLIC OF THE PHILIPPINES</p>
                <p className="text-[11px] text-emerald-400">GPPB OMNIBUS SWORN STATEMENT (RA 12009 NGPA FORMAT)</p>
              </div>

              <div className="space-y-2 text-[11px] leading-relaxed">
                <p>
                  I, <span className="text-amber-400 font-bold">{currentTenant?.authorizedSignatory?.name}</span>, of legal age, Filipino, residing at Pasig City, after having been duly sworn in accordance with law, do hereby depose and state that:
                </p>
                <p>
                  1. I am the duly authorized and designated representative of <span className="text-blue-400 font-bold">{currentTenant?.companyName}</span> with office address at {currentTenant?.address};
                </p>
                <p>
                  2. <span className="text-blue-400 font-bold">{currentTenant?.companyName}</span> is granted full power and authority to do, execute and perform any and all acts necessary to participate, submit the bid, and to sign and execute the contract for <span className="text-white">Construction of Multi-Purpose Evacuation Center Phase II</span> under DPWH Region IV-A;
                </p>
                <p>
                  3. Tax Identification Number (TIN): <span className="text-amber-400">{currentTenant?.tin}</span> | SEC/DTI Reg: <span className="text-amber-400">{currentTenant?.secDtiRegNo}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-slate-400 font-mono">Form auto-filled with dynamic tenant white-label tokens</span>
              <button
                onClick={() => {
                  alert('Form generated & attached to Envelope 1!');
                  setShowFormGeneratorModal(false);
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export & Attach PDF to Envelope</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PACKAGE FRONT COVER PAGE MODAL */}
      {showCoverPageModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[95vh] flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Official Bid Package Front Cover Page (Legal 8.5" × 13")</span>
              </h3>
              <button onClick={() => setShowCoverPageModal(false)} className="text-slate-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-950">
              <div className="max-w-[700px] mx-auto">
                <DocumentCoverPage
                  item={{
                    id: 'bid-pkg-cover',
                    tenantId: tenantId,
                    documentName: 'ENVELOPE 1: TECHNICAL & ELIGIBILITY SUBMISSION PACKAGE',
                    documentNumber: 'PhilGEPS-2026-10928371',
                    category: 'ELIGIBILITY_CLASS_A',
                    procurementApplicability: ['Infrastructure'],
                    legalBasisReference: 'RA 12009 NGPA / RA 9184 Standard',
                    versionNumber: 1,
                    fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                    fileSizeBytes: 1048576,
                    fileName: 'bid_envelope_1_submission_package.pdf',
                    uploadedByName: currentTenant?.authorizedSignatory?.name || 'Authorized Managing Officer',
                    isOptional: false,
                    requiresIssueDate: false,
                    requiresExpiryDate: false,
                    status: 'ACTIVE',
                    previousVersions: []
                  }}
                  tenant={currentTenant}
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/95">
              <span className="text-xs text-slate-400 font-mono">
                Formal submission cover page attached to Envelope 1 & 2
              </span>
              <button
                onClick={() => setShowCoverPageModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORGANIZE & SEQUENCE BID PACKAGE DOCUMENTS MODAL */}
      {showOrganizeModal && (
        <MergedPdfViewerModal
          selectedItems={vaultDocs}
          tenant={currentTenant}
          onClose={() => setShowOrganizeModal(false)}
        />
      )}

      {/* VIEW SINGLE ATTACHED DOCUMENT PREVIEW MODAL */}
      {previewDocItem && (
        <PdfPreviewModal
          item={previewDocItem}
          tenant={currentTenant}
          onClose={() => setPreviewDocItem(null)}
          pdfDataUrl={pdfDataCache.current[previewDocItem.id]}
          hidePrintExport={false}
        />
      )}

      {/* EDIT CHECKLIST REQUIREMENT MODAL */}
      {editReqItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scaleIn my-auto">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>Edit Requirement — {editReqItem.requirementCode}</span>
              </h3>
              <button onClick={() => setEditReqItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setChecklist(prev => prev.map(item => item.id === editReqItem.id ? {
                  ...item,
                  requirementName: editReqName.trim() || item.requirementName,
                  requirementCode: editReqCode.trim() || item.requirementCode,
                  status: editReqStatus
                } : item));
                setEditReqItem(null);
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-300 font-medium mb-1">Requirement Code</label>
                <input
                  type="text"
                  value={editReqCode}
                  onChange={(e) => setEditReqCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Requirement Name / Title</label>
                <textarea
                  value={editReqName}
                  onChange={(e) => setEditReqName(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Compliance Status</label>
                <select
                  value={editReqStatus}
                  onChange={(e) => setEditReqStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value="VERIFIED_VALID">Verified Valid</option>
                  <option value="ATTACHED">Attached</option>
                  <option value="EXPIRED">Expired in Vault</option>
                  <option value="MISSING">Missing</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setEditReqItem(null)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition shadow">
                  Save Requirement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

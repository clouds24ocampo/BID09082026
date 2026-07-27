import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getOpportunityProjects, OpportunityProjectOption } from '../../utils/opportunityProjects';
import { SectionViScheduleOfRequirements } from '../vault/templates/SectionViScheduleOfRequirements';
import { TechnicalSpecifications } from '../vault/templates/TechnicalSpecifications';
import { FrameworkAgreementList } from '../vault/templates/FrameworkAgreementList';
import { TechnicalExhibitTemplateModal } from '../vault/templates/TechnicalExhibitTemplateModal';
import { OmnibusSwornStatementModal } from '../vault/templates/OmnibusSwornStatementModal';
import { BidSecuringDeclarationModal } from '../vault/templates/BidSecuringDeclarationModal';
import { PdfPreviewModal } from '../vault/PdfPreviewModal';
import VaultErrorBoundary from '../common/VaultErrorBoundary';
import { savePdfData, loadPdfData as loadPdfDataFromDB } from '../../utils/vaultIndexedDB';
import {
  Download,
  FileText,
  ShieldCheck,
  Search,
  Building2,
  CheckCircle2,
  Calendar,
  Sparkles,
  FileCheck,
  ExternalLink,
  Award,
  Printer,
  Eye,
  Trash2,
  Edit3,
  Filter,
  X,
  FileSignature
} from 'lucide-react';

export interface FormItem {
  id: string;
  formCode: string;
  title: string;
  category: 'NOTARIZED' | 'ELIGIBILITY' | 'TECHNICAL' | 'FINANCIAL';
  governingLaw: string;
  format: 'PDF' | 'DOCX' | 'TEMPLATE';
  description: string;
  notaryRequirement: string;
}

export interface CompletedNotarizedForm {
  id: string;
  formCode: string;
  title: string;
  projectRefNo: string;
  projectTitle: string;
  procuringEntity: string;
  fileDataUrl?: string;
  completedAt: string;
  versionNumber: number;
}

const OFFICIAL_NOTARIZED_DOCS: FormItem[] = [
  {
    id: 'form-oss',
    formCode: 'GPPB-OSS-2025',
    title: 'Omnibus Sworn Statement (Notarized OSS - RA 12009 Standard)',
    category: 'NOTARIZED',
    governingLaw: 'RA 12009 / GPPB Resolution No. 02-2025',
    format: 'TEMPLATE',
    notaryRequirement: 'Requires Notary Public Jurat & Community Tax Certificate (CTC)',
    description: 'Mandatory notarized sworn statement certifying authenticity of documents, non-blacklisting, and authorized signatory powers.'
  },
  {
    id: 'form-bsd',
    formCode: 'GPPB-BSD-2025',
    title: 'Bid Securing Declaration / Bid Security / Bid Bond (Notarized BSD Template)',
    category: 'NOTARIZED',
    governingLaw: 'RA 12009 Section 27.5 / GPPB Res 02-2025',
    format: 'TEMPLATE',
    notaryRequirement: 'Requires Notary Public Jurat & Government-issued ID details',
    description: 'Statutory notarized bid security undertaking binding the bidder to execute the contract if awarded within bid validity period.'
  }
];

export const FormsDirectoryView: React.FC = () => {
  const { currentTenant, currentUser } = useAuth();
  const [forms] = useState<FormItem[]>(OFFICIAL_NOTARIZED_DOCS);
  const [searchQuery, setSearchQuery] = useState('');

  // Sub-Tab Navigation State
  const [formsSubTab, setFormsSubTab] = useState<'TEMPLATES' | 'COMPLETED'>('TEMPLATES');

  // Completed Forms Storage State
  const [completedForms, setCompletedForms] = useState<CompletedNotarizedForm[]>([]);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('ALL');
  const [previewPdfItem, setPreviewPdfItem] = useState<any | null>(null);

  // Opportunity Finder State Integration
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');
  const [activeProject, setActiveProject] = useState<OpportunityProjectOption | null>(null);

  // Active Interactive Template Modal State
  const [activeTemplateModal, setActiveTemplateModal] = useState<'SEC-VI' | 'SEC-VII' | 'FAL-01' | 'GPPB-OSS-2025' | 'GPPB-BSD-2025' | null>(null);

  // Load real saved opportunity projects & saved completed forms from IndexedDB + localStorage
  useEffect(() => {
    const list = getOpportunityProjects(currentTenant?.id);
    setOppProjects(list);
    if (list.length > 0) {
      const first = list[0];
      setSelectedOppId(first.id);
      setActiveProject(first);
    }

    const tenantId = currentTenant?.id || 'default';
    const saved = localStorage.getItem(`bidocs_completed_notarized_${tenantId}`);
    if (saved) {
      try {
        const parsed: CompletedNotarizedForm[] = JSON.parse(saved);
        setCompletedForms(parsed);

        // Background hydration of heavy PDF binaries from IndexedDB
        parsed.forEach(async (form) => {
          if (!form.fileDataUrl) {
            const dbDataUrl = await loadPdfDataFromDB(form.id);
            if (dbDataUrl) {
              setCompletedForms(prev => prev.map(f => f.id === form.id ? { ...f, fileDataUrl: dbDataUrl } : f));
            }
          }
        });
      } catch (e) {
        console.error('[FormsDirectoryView] Failed to parse saved completed forms:', e);
      }
    }
  }, [currentTenant?.id]);

  const saveCompletedForm = async (newForm: CompletedNotarizedForm) => {
    const tenantId = currentTenant?.id || 'default';

    // 1. Offload heavy PDF binary to IndexedDB (200MB+ storage capability)
    if (newForm.fileDataUrl) {
      try {
        await savePdfData(newForm.id, newForm.fileDataUrl);
      } catch (dbErr) {
        console.warn('[FormsDirectoryView] IndexedDB savePdfData warning:', dbErr);
      }
    }

    // 2. Update state and localStorage with clean metadata (stripped of heavy PDF binary)
    setCompletedForms(prev => {
      const updated = [newForm, ...prev.filter(f => f.id !== newForm.id)];

      const cleanForStorage = updated.map(f => {
        const { fileDataUrl: _fd, ...fRest } = f;
        return fRest;
      });

      try {
        localStorage.setItem(`bidocs_completed_notarized_${tenantId}`, JSON.stringify(cleanForStorage));
      } catch (lsErr) {
        console.warn('[FormsDirectoryView] Safely caught localStorage QuotaExceededError:', lsErr);
      }
      return updated;
    });
  };

  const handleDeleteCompletedForm = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}" from Completed Documents to be Printed?`)) {
      const tenantId = currentTenant?.id || 'default';
      setCompletedForms(prev => {
        const updated = prev.filter(f => f.id !== id);
        localStorage.setItem(`bidocs_completed_notarized_${tenantId}`, JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handlePrintDocument = (form: CompletedNotarizedForm) => {
    if (form.fileDataUrl) {
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Print Legal 8.5"x13" Document - ${form.title}</title>
              <style>
                @page { size: 8.5in 13in; margin: 0mm; }
                body { margin: 0; padding: 0; background: white; text-align: center; }
                img { width: 8.5in; max-width: 100%; height: auto; display: block; margin: 0 auto; page-break-after: always; }
              </style>
            </head>
            <body>
              <img src="${form.fileDataUrl}" onload="window.print(); setTimeout(function(){ window.close(); }, 800);" />
            </body>
          </html>
        `);
        printWin.document.close();
      }
    } else {
      alert(`Preparing print layout for "${form.title}"... Please use Export/Print inside the document editor.`);
    }
  };

  const handleSelectOpportunity = (oppId: string) => {
    setSelectedOppId(oppId);
    const found = oppProjects.find((p) => p.id === oppId || p.refNo === oppId);
    if (found) {
      setActiveProject(found);
    }
  };

  const filteredForms = forms.filter(
    (f) =>
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.formCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.governingLaw.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFormAction = (form: FormItem) => {
    if (form.formCode === 'GPPB-SEC-VI') {
      setActiveTemplateModal('SEC-VI');
    } else if (form.formCode === 'GPPB-SEC-VII') {
      setActiveTemplateModal('SEC-VII');
    } else if (form.formCode === 'GPPB-FAL-01') {
      setActiveTemplateModal('FAL-01');
    } else if (form.formCode === 'GPPB-OSS-2025') {
      setActiveTemplateModal('GPPB-OSS-2025');
    } else if (form.formCode === 'GPPB-BSD-2025') {
      setActiveTemplateModal('GPPB-BSD-2025');
    } else {
      alert(
        `Generates notarized template "${form.title}" pre-filled for project [${activeProject?.refNo || 'N/A'}] and corporate entity "${currentTenant?.companyName || 'Bidding Entity'}".`
      );
    }
  };

  return (
    <VaultErrorBoundary fallbackTitle="Notarized Documents Render Protected">
      <div className="space-y-6 animate-fadeIn pb-12">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                  <span>Notarized Documents & Legal Forms</span>
                  <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    Opportunity Finder Connected ⚡
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Official PhilGEPS & GPPB legal notarized document templates pre-populated for <span className="text-slate-200 font-semibold">{currentTenant?.companyName}</span>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* OPPORTUNITY FINDER PROJECT CONNECTION BAR */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-blue-500/40 space-y-4 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <label className="block text-slate-200 font-mono text-xs font-bold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>Select Active Bidding Opportunity from Opportunity Finder:</span>
              </label>
              <select
                value={selectedOppId}
                onChange={(e) => handleSelectOpportunity(e.target.value)}
                className="w-full bg-slate-950 border border-blue-500/60 rounded-xl px-4 py-2.5 text-white font-mono text-xs font-bold focus:outline-none focus:border-blue-400 shadow-inner cursor-pointer hover:border-blue-400"
              >
                {oppProjects.length === 0 ? (
                  <option value="">-- No Saved Projects in Opportunity Finder (Add Opportunity to Connect) --</option>
                ) : (
                  <>
                    <option value="">-- Select Active Opportunity / Bidding Project --</option>
                    {oppProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.refNo}] {p.title} — {p.procuringEntity} ({p.abc})
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {activeProject && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-4 text-xs font-mono shrink-0">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Selected Project Ref</div>
                  <div className="font-bold text-blue-400">{activeProject.refNo}</div>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Procuring Entity</div>
                  <div className="font-bold text-white truncate max-w-[180px]">{activeProject.procuringEntity}</div>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Approved Budget (ABC)</div>
                  <div className="font-bold text-emerald-400">{activeProject.abc}</div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2 font-mono">
            <Sparkles className="w-4 h-4 shrink-0 text-blue-400" />
            <span>
              Selecting a project auto-injects <strong>Project Ref No, Solicitation No, Title, Procuring Entity, Submission Time, and Company TIN</strong> across all notarized documents below.
            </span>
          </div>
        </div>

        {/* SUB-TABS NAVIGATION BAR */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 font-mono text-xs">
          <button
            onClick={() => setFormsSubTab('TEMPLATES')}
            className={`px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-2 ${formsSubTab === 'TEMPLATES'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
          >
            <FileSignature className="w-4 h-4" />
            <span>Notarized Templates Checklist</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-950 text-[10px] border border-slate-800 text-blue-300">
              {OFFICIAL_NOTARIZED_DOCS.length}
            </span>
          </button>

          <button
            onClick={() => setFormsSubTab('COMPLETED')}
            className={`px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-2 ${formsSubTab === 'COMPLETED'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
          >
            <Printer className="w-4 h-4" />
            <span>Completed Documents to be Printed</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] border ${completedForms.length > 0
              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40 font-bold'
              : 'bg-slate-950 text-slate-500 border-slate-800'
              }`}>
              {completedForms.length} Saved
            </span>
          </button>
        </div>

        {/* SUB-TAB 1: NOTARIZED TEMPLATES CHECKLIST */}
        {formsSubTab === 'TEMPLATES' && (
          <div className="space-y-6">
            {/* Search Input & Category Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative max-w-md w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notarized document title, GPPB code, or law..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              </div>

              <div className="text-xs text-slate-400 font-mono">
                Showing <span className="text-white font-bold">{filteredForms.length}</span> Notarized & Legal Forms
              </div>
            </div>

            {/* Notarized Documents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredForms.map((form) => (
                <div
                  key={form.id}
                  className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between hover:border-slate-700 transition shadow-lg group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 font-bold border border-blue-800">
                        {form.formCode}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                        {form.format}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white leading-snug group-hover:text-blue-300 transition">
                      {form.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{form.description}</p>

                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1 text-[11px]">
                      <div className="text-blue-400 font-mono font-medium">📜 Basis: {form.governingLaw}</div>
                      <div className="text-amber-400/90 font-mono font-medium">⚖️ {form.notaryRequirement}</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500 font-mono">
                      TIN: {currentTenant?.tin || '000-000-000-000'}
                    </span>

                    <button
                      onClick={() => handleFormAction(form)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Fill & Generate Document</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUB-TAB 2: COMPLETED DOCUMENTS TO BE PRINTED */}
        {formsSubTab === 'COMPLETED' && (
          <div className="space-y-4">
            {(() => {
              const allProjectsInCompleted = (() => {
                const seen = new Set<string>();
                const list: { refNo: string; title: string; count: number }[] = [];

                oppProjects.forEach(p => {
                  if (p.refNo && !seen.has(p.refNo)) {
                    seen.add(p.refNo);
                    const count = completedForms.filter(c => c.projectRefNo === p.refNo).length;
                    list.push({ refNo: p.refNo, title: p.title, count });
                  }
                });

                completedForms.forEach(c => {
                  if (c.projectRefNo && !seen.has(c.projectRefNo)) {
                    seen.add(c.projectRefNo);
                    list.push({
                      refNo: c.projectRefNo,
                      title: c.projectTitle || 'Bidding Opportunity',
                      count: completedForms.filter(item => item.projectRefNo === c.projectRefNo).length
                    });
                  }
                });

                return list;
              })();

              const displayedCompleted = completedForms.filter(item => {
                if (selectedProjectFilter === 'ALL') return true;
                return item.projectRefNo === selectedProjectFilter;
              });

              if (completedForms.length === 0) {
                return (
                  <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 space-y-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="max-w-md mx-auto space-y-2">
                      <h3 className="text-base font-bold text-white">No Completed Notarized Documents to Print Yet</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Select a Bidding Opportunity above and click <span className="text-white font-bold">"Fill & Generate Document"</span> on Omnibus Sworn Statement or Bid Securing Declaration. Upon clicking <span className="text-emerald-400 font-bold">"Submit" / "Save & Complete"</span>, your generated legal document will automatically appear here ready to print!
                      </p>
                    </div>
                    <button
                      onClick={() => setFormsSubTab('TEMPLATES')}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow transition inline-flex items-center gap-2"
                    >
                      <FileSignature className="w-4 h-4" />
                      <span>Go to Notarized Templates Checklist</span>
                    </button>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {/* Project Filter Bar */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                      <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>Filter Completed Documents by Bidding Project:</span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={selectedProjectFilter}
                        onChange={(e) => setSelectedProjectFilter(e.target.value)}
                        className="w-full sm:w-auto bg-slate-950 border border-blue-500/60 rounded-xl px-3.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-blue-400 shadow-inner cursor-pointer"
                      >
                        <option value="ALL">All Bidding Projects ({completedForms.length} Total Saved)</option>
                        {allProjectsInCompleted.map(p => (
                          <option key={p.refNo} value={p.refNo}>
                            [{p.refNo}] {p.title} ({p.count} saved)
                          </option>
                        ))}
                      </select>
                      {selectedProjectFilter !== 'ALL' && (
                        <button
                          onClick={() => setSelectedProjectFilter('ALL')}
                          className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-400 bg-slate-950 border border-slate-800 hover:text-white transition shrink-0"
                        >
                          Clear Filter
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayedCompleted.map((form) => (
                      <div
                        key={form.id}
                        className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition space-y-4 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Ready to Print
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                              v{form.versionNumber}.0
                            </span>
                          </div>

                          <div>
                            <h3 className="text-sm font-bold text-white leading-snug">{form.title}</h3>
                            <p className="text-xs text-slate-400 mt-1 font-mono">Completed: {form.completedAt}</p>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-[11px] font-mono text-slate-400">
                            <div className="p-2.5 rounded-lg bg-blue-950/90 border border-blue-500/50 text-[11px] font-mono space-y-1">
                              <span className="text-blue-300 font-bold flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" /> Tagged Bidding Project:
                              </span>
                              <span className="text-white font-bold block truncate">[{form.projectRefNo}] {form.projectTitle}</span>
                            </div>
                            <p className="text-slate-300 font-semibold">Procuring Agency: {form.procuringEntity}</p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                          <button
                            onClick={() => handlePrintDocument(form)}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 font-bold transition text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
                            title="Print document directly"
                          >
                            <Printer className="w-4 h-4" />
                            <span>Print Legal Document</span>
                          </button>

                          {form.fileDataUrl && (
                            <button
                              onClick={() => setPreviewPdfItem({
                                id: form.id,
                                documentName: form.title,
                                documentNumber: form.projectRefNo,
                                fileDataUrl: form.fileDataUrl,
                                philgepsRefNo: form.projectRefNo,
                                projectTitle: form.projectTitle
                              })}
                              className="px-3 py-2 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition text-xs font-semibold flex items-center gap-1 border border-blue-500/30"
                              title="View completed PDF"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View PDF</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteCompletedForm(form.id, form.title)}
                            className="px-3 py-2 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition text-xs font-semibold flex items-center gap-1 border border-red-500/30"
                            title="Delete from completed list"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* INTERACTIVE TEMPLATE MODALS LAUNCHER */}
        {activeTemplateModal === 'SEC-VI' && (
          <SectionViScheduleOfRequirements
            tenant={currentTenant}
            activeProjectRefNo={activeProject?.refNo}
            activeProjectTitle={activeProject?.title}
            activeProcuringEntity={activeProject?.procuringEntity}
            onClose={() => setActiveTemplateModal(null)}
          />
        )}

        {activeTemplateModal === 'SEC-VII' && (
          <TechnicalSpecifications
            tenant={currentTenant}
            activeProjectRefNo={activeProject?.refNo}
            activeProjectTitle={activeProject?.title}
            activeProcuringEntity={activeProject?.procuringEntity}
            onClose={() => setActiveTemplateModal(null)}
          />
        )}

        {activeTemplateModal === 'FAL-01' && (
          <FrameworkAgreementList
            tenant={currentTenant}
            activeProjectRefNo={activeProject?.refNo}
            activeProjectTitle={activeProject?.title}
            activeProcuringEntity={activeProject?.procuringEntity}
            onClose={() => setActiveTemplateModal(null)}
          />
        )}

        {activeTemplateModal === 'GPPB-OSS-2025' && (
          <OmnibusSwornStatementModal
            tenant={currentTenant}
            activeProjectRefNo={activeProject?.refNo}
            activeProjectTitle={activeProject?.title}
            activeProcuringEntity={activeProject?.procuringEntity}
            onSaveAndComplete={(dataUrl, customName, projRef, projTitle) => {
              const newCompleted: CompletedNotarizedForm = {
                id: `notarized-oss-${Date.now()}`,
                formCode: 'GPPB-OSS-2025',
                title: customName || 'Omnibus Sworn Statement (Notarized OSS)',
                projectRefNo: projRef || activeProject?.refNo || 'PRJ-2026-901283',
                projectTitle: projTitle || activeProject?.title || 'Bidding Opportunity',
                procuringEntity: activeProject?.procuringEntity || 'Procuring Agency',
                fileDataUrl: dataUrl,
                completedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                versionNumber: 1
              };
              saveCompletedForm(newCompleted);
              setActiveTemplateModal(null);
              setFormsSubTab('COMPLETED');
            }}
            onClose={() => setActiveTemplateModal(null)}
          />
        )}

        {activeTemplateModal === 'GPPB-BSD-2025' && (
          <BidSecuringDeclarationModal
            tenant={currentTenant}
            activeProjectRefNo={activeProject?.refNo}
            activeProjectTitle={activeProject?.title}
            activeProcuringEntity={activeProject?.procuringEntity}
            onSaveAndComplete={(dataUrl, customName, projRef, projTitle) => {
              const newCompleted: CompletedNotarizedForm = {
                id: `notarized-bsd-${Date.now()}`,
                formCode: 'GPPB-BSD-2025',
                title: customName || 'Bid Securing Declaration / Bid Security',
                projectRefNo: projRef || activeProject?.refNo || 'PRJ-2026-901283',
                projectTitle: projTitle || activeProject?.title || 'Bidding Opportunity',
                procuringEntity: activeProject?.procuringEntity || 'Procuring Agency',
                fileDataUrl: dataUrl,
                completedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                versionNumber: 1
              };
              saveCompletedForm(newCompleted);
              setActiveTemplateModal(null);
              setFormsSubTab('COMPLETED');
            }}
            onClose={() => setActiveTemplateModal(null)}
          />
        )}

        {/* SINGLE CONTINUOUS STREAM PDF PREVIEW MODAL */}
        {previewPdfItem && (
          <PdfPreviewModal
            item={previewPdfItem}
            tenant={currentTenant}
            onClose={() => setPreviewPdfItem(null)}
            pdfDataUrl={previewPdfItem.fileDataUrl}
            hidePrintExport={false}
          />
        )}

      </div>
    </VaultErrorBoundary>
  );
};

export default FormsDirectoryView;

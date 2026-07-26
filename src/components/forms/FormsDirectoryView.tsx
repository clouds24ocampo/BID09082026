import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getOpportunityProjects, OpportunityProjectOption } from '../../utils/opportunityProjects';
import { SectionViScheduleOfRequirements } from '../vault/templates/SectionViScheduleOfRequirements';
import { TechnicalSpecifications } from '../vault/templates/TechnicalSpecifications';
import { FrameworkAgreementList } from '../vault/templates/FrameworkAgreementList';
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
  Award
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

const OFFICIAL_NOTARIZED_DOCS: FormItem[] = [
  {
    id: 'form-oss',
    formCode: 'GPPB-OSS-2025',
    title: 'Omnibus Sworn Statement (Notarized OSS - RA 12009 Standard)',
    category: 'NOTARIZED',
    governingLaw: 'RA 12009 / GPPB Resolution No. 02-2025',
    format: 'DOCX',
    notaryRequirement: 'Requires Notary Public Jurat & Community Tax Certificate (CTC)',
    description: 'Mandatory notarized sworn statement certifying authenticity of documents, non-blacklisting, and authorized signatory powers.'
  },
  {
    id: 'form-bsd',
    formCode: 'GPPB-BSD-2025',
    title: 'Bid Securing Declaration (Notarized BSD Template)',
    category: 'NOTARIZED',
    governingLaw: 'RA 12009 Section 27.5 / GPPB Res 02-2025',
    format: 'DOCX',
    notaryRequirement: 'Requires Notary Public Jurat & Government-issued ID details',
    description: 'Statutory notarized bid security undertaking binding the bidder to execute the contract if awarded within bid validity period.'
  },
  {
    id: 'form-sec-cert',
    formCode: 'GPPB-SEC-CERT',
    title: 'Secretary\'s Certificate / Board Resolution (Notarized Signatory Power)',
    category: 'NOTARIZED',
    governingLaw: 'Revised Corporation Code / GPPB Standard',
    format: 'DOCX',
    notaryRequirement: 'Requires Corporate Secretary Notarized Acknowledgment',
    description: 'Corporate notarized resolution designating authorized managing officer to sign, execute, and submit bidding documents.'
  },
  {
    id: 'form-jva',
    formCode: 'GPPB-JVA-2025',
    title: 'Joint Venture Agreement (Notarized JVA Format)',
    category: 'NOTARIZED',
    governingLaw: 'RA 12009 Section 24.1(b)',
    format: 'DOCX',
    notaryRequirement: 'Requires All Joint Venture Partners Notarization',
    description: 'Formal notarized contract agreement for Joint Ventures detailing partner capital contributions and lead partner authority.'
  },
  {
    id: 'form-nfcc',
    formCode: 'GPPB-NFCC-CALC',
    title: 'Net Financial Contracting Capacity (NFCC) Computation & Sworn Statement',
    category: 'ELIGIBILITY',
    governingLaw: 'RA 12009 Section 23.4.1.4',
    format: 'DOCX',
    notaryRequirement: 'Requires Sworn Statement Certification by Authorized Officer',
    description: 'Official financial capacity worksheet computing NFCC = [(Current Assets - Current Liabilities) * 15] - Outstanding Contracts.'
  },
  {
    id: 'form-sec-vi',
    formCode: 'GPPB-SEC-VI',
    title: 'Section VI. Schedule of Requirements (Legal Exhibit)',
    category: 'TECHNICAL',
    governingLaw: 'RA 12009 / GPPB Goods Standard',
    format: 'TEMPLATE',
    notaryRequirement: 'Class A Technical Exhibit — Auto-populates Company & Opportunity Header',
    description: 'Official delivery schedule matrix with automatic item numbering, unit amount computation, and master delivery propagation.'
  },
  {
    id: 'form-sec-vii',
    formCode: 'GPPB-SEC-VII',
    title: 'Section VII. Technical Specifications (Legal Exhibit)',
    category: 'TECHNICAL',
    governingLaw: 'RA 12009 / GPPB Goods Standard',
    format: 'TEMPLATE',
    notaryRequirement: 'Class A Technical Exhibit — 60% Specification Width & Statement of Compliance',
    description: 'Official 3-column technical parameter compliance matrix with Comply/Not Comply statement toggles and evidence cross-references.'
  },
  {
    id: 'form-fal',
    formCode: 'GPPB-FAL-01',
    title: 'Framework Agreement List & Technical Specifications (2-Page Package)',
    category: 'TECHNICAL',
    governingLaw: 'RA 12009 Rule 11 / GPPB Framework Standard',
    format: 'TEMPLATE',
    notaryRequirement: 'Class A Legal Package — Auto-syncs Page 1 Unit Cost & Page 2 Compliance',
    description: '2-page complete framework agreement package with automatic unit cost calculation (Total ÷ Qty) and Page 2 technical specs.'
  }
];

export const FormsDirectoryView: React.FC = () => {
  const { currentTenant } = useAuth();
  const [forms] = useState<FormItem[]>(OFFICIAL_NOTARIZED_DOCS);
  const [searchQuery, setSearchQuery] = useState('');

  // Opportunity Finder State Integration
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');
  const [activeProject, setActiveProject] = useState<OpportunityProjectOption | null>(null);

  // Active Interactive Template Modal State
  const [activeTemplateModal, setActiveTemplateModal] = useState<'SEC-VI' | 'SEC-VII' | 'FAL-01' | null>(null);

  // Load real saved opportunity projects from Opportunity Finder across all keys
  useEffect(() => {
    const list = getOpportunityProjects(currentTenant?.id);
    setOppProjects(list);
    if (list.length > 0) {
      const first = list[0];
      setSelectedOppId(first.id);
      setActiveProject(first);
    }
  }, [currentTenant?.id]);

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
    } else {
      alert(
        `Generates notarized template "${form.title}" pre-filled for project [${activeProject?.refNo || 'N/A'}] and corporate entity "${currentTenant?.companyName || 'Bidding Entity'}".`
      );
    }
  };

  return (
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

    </div>
  );
};

export default FormsDirectoryView;

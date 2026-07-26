import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Download, FileText, ExternalLink, ShieldCheck, Search } from 'lucide-react';

interface FormItem {
  id: string;
  formCode: string;
  title: string;
  category: 'ELIGIBILITY' | 'TECHNICAL' | 'FINANCIAL';
  governingLaw: string;
  format: 'PDF' | 'DOCX';
  description: string;
}

const OFFICIAL_FORMS: FormItem[] = [
  {
    id: 'form-01',
    formCode: 'GPPB-OSS-2025',
    title: 'Omnibus Sworn Statement (OSS - RA 12009 NGPA Format)',
    category: 'TECHNICAL',
    governingLaw: 'RA 12009 / GPPB Res 02-2025',
    format: 'DOCX',
    description: 'Mandatory sworn statement certifying non-blacklisting, authenticity of documents, and authority of signatory.'
  },
  {
    id: 'form-02',
    formCode: 'GPPB-BSD-2025',
    title: 'Bid Securing Declaration (BSD Template)',
    category: 'TECHNICAL',
    governingLaw: 'RA 12009 / GPPB Res 02-2025',
    format: 'DOCX',
    description: 'Statutory bid security undertaking binding the bidder to execute the contract if awarded.'
  },
  {
    id: 'form-03',
    formCode: 'GPPB-BF-GOODS',
    title: 'Official Financial Bid Form for Goods',
    category: 'FINANCIAL',
    governingLaw: 'RA 12009 Rule IX',
    format: 'PDF',
    description: 'Standard financial submission form for Goods & Equipment procurement.'
  },
  {
    id: 'form-04',
    formCode: 'GPPB-NFCC-CALC',
    title: 'Net Financial Contracting Capacity (NFCC) Computation Form',
    category: 'ELIGIBILITY',
    governingLaw: 'RA 12009 Section 24.1',
    format: 'DOCX',
    description: 'Worksheet to compute NFCC = [(Current Assets - Current Liabilities) * 15] - Value of Outstanding Contracts.'
  },
  {
    id: 'form-05',
    formCode: 'GPPB-BOQ-INFRA',
    title: 'Detailed Bill of Quantities & Price Schedule (Infrastructure)',
    category: 'FINANCIAL',
    governingLaw: 'RA 12009 Rule X',
    format: 'DOCX',
    description: 'Unit cost breakdown sheet for materials, labor, and equipment for civil works.'
  }
];

export const FormsDirectoryView: React.FC = () => {
  const { currentTenant } = useAuth();
  const [forms] = useState<FormItem[]>(OFFICIAL_FORMS);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredForms = forms.filter(f => 
    f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.formCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <h1 className="text-2xl font-bold text-white">GPPB & PhilGEPS Official Forms Directory</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Official government standard bidding document templates pre-formatted for <span className="text-slate-200 font-semibold">{currentTenant?.companyName}</span>.
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search form title or GPPB code..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
      </div>

      {/* Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredForms.map((form) => (
          <div 
            key={form.id}
            className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                  {form.formCode}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                  {form.format}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white leading-snug">{form.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{form.description}</p>
              <p className="text-[11px] text-blue-400 font-mono">Basis: {form.governingLaw}</p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">Auto-injects TIN: {currentTenant?.tin}</span>
              <button
                onClick={() => alert(`Downloading template ${form.formCode} pre-filled for ${currentTenant?.companyName}`)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow transition flex items-center gap-1.5"
                style={{ backgroundColor: currentTenant?.brandColor || '#1e40af' }}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Blank Template</span>
              </button>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};

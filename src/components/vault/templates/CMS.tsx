import React, { useState, useEffect } from 'react';
import { Tenant } from '../../../types';
import { PDFDocument } from 'pdf-lib';
import html2canvas from 'html2canvas';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import VaultErrorBoundary from '../../common/VaultErrorBoundary';
import {
  X,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  HardHat,
  Briefcase,
  Layers
} from 'lucide-react';

export interface MethodSection {
  id: string;
  sectionTitle: string;
  narrative: string;
}

export interface CmsModalProps {
  item?: { id: string; code: string; name: string };
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  procuringEntityAddress?: string;
  procuringEntityContactPerson?: string;
  headOfProcuringEntity?: string;
  headOfProcuringEntityPosition?: string;
  solicitationNumber?: string;
  contractAmount?: number;
  projectLocation?: string;
  dateTimeSubmitted?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose?: () => void;
}

const DEFAULT_SECTIONS: MethodSection[] = [
  {
    id: 'sec-1',
    sectionTitle: '1. Site Mobilization & Temporary Facilities',
    narrative: 'Establishment of site offices, perimeter safety fencing, staff bunkhouses, material storage warehouse, fabrication yard, and temporary utilities (power & water connections). Deployment of security personnel and establishment of PPE entrance checkpoint.'
  },
  {
    id: 'sec-2',
    sectionTitle: '2. Earthworks, Site Clearing & Excavation',
    narrative: 'Execution of topographic site staking and survey batter-boards. Mechanical excavation for footings, tie beams, and utility trenches using hydraulic backhoes. Stockpiling of suitable excavated materials and off-site disposal of unsuitable surplus materials with compaction testing.'
  },
  {
    id: 'sec-3',
    sectionTitle: '3. Reinforced Concrete & Structural Steel Works',
    narrative: 'Fabrication and installation of Grade 40/60 deformed reinforcing steel bars in accordance with structural bending schedules. Erection of formworks and falsework scaffolds. Pouring of Class A ready-mix concrete with slump and compressive cylinder sampling, followed by proper water/membrane curing for 28 days.'
  },
  {
    id: 'sec-4',
    sectionTitle: '4. Architectural, Masonry & Finishing Works',
    narrative: 'Laying of 100mm/150mm CHB walls with continuous horizontal and vertical rebar ties. Application of cement plaster finish with damp-proofing admixture. Installation of ceramic floor/wall tiling, drywalls, acoustic ceilings, and multi-coat anti-fungal acrylic paint systems.'
  },
  {
    id: 'sec-5',
    sectionTitle: '5. Mechanical, Electrical, Plumbing & Sanitary (MEPS)',
    narrative: 'Conduit roughing-ins, wiring pulling, panelboard installations, circuit load balancing, and insulation resistance testing. Installation of PPR cold water distribution lines with 100 psi hydrostatic pressure testing and UPVC sanitary drainage lines with flood/flow testing.'
  },
  {
    id: 'sec-6',
    sectionTitle: '6. Quality Assurance, Testing & Final Demobilization',
    narrative: 'Comprehensive quality control inspections in compliance with DPWH Standard Specifications (Blue Book). Site cleanup, clearing of all construction debris, punchlist rectification, operational testing & commissioning, and final turn-over.'
  }
];

export const CmsModalContent: React.FC<CmsModalProps> = ({
  item,
  tenant,
  activeProjectRefNo = '',
  activeProjectTitle = '',
  activeProcuringEntity = '',
  procuringEntityAddress = '',
  procuringEntityContactPerson = '',
  headOfProcuringEntity: propHeadOfProcuringEntity = '',
  headOfProcuringEntityPosition: propHeadOfProcuringEntityPosition = '',
  solicitationNumber: propSolicitationNumber = '',
  contractAmount: propContractAmount = 0,
  projectLocation: propProjectLocation = '',
  dateTimeSubmitted: propDateTimeSubmitted = '',
  onSaveAndComplete,
  onClose
}) => {
  const todayStr = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  const [, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  const [companyName, setCompanyName] = useState<string>(tenant?.companyName || '');
  const [projectTitle, setProjectTitle] = useState<string>(activeProjectTitle || '');
  const [projectRefNo, setProjectRefNo] = useState<string>(activeProjectRefNo || '');
  const [procuringEntity, setProcuringEntity] = useState<string>(activeProcuringEntity || '');
  const [documentDate, setDocumentDate] = useState<string>(todayStr);

  const [sections, setSections] = useState<MethodSection[]>(DEFAULT_SECTIONS);

  // Signatory
  const [projectManager, setProjectManager] = useState<string>(tenant?.authorizedSignatory?.name || '');
  const [pmTitle, setPmTitle] = useState<string>(tenant?.authorizedSignatory?.title || 'Professional Civil Engineer / Project Manager');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const projectScopeKey = (projectRefNo || selectedOppId || activeProjectRefNo || 'default').replace(/[^a-zA-Z0-9]/g, '_');

  useEffect(() => {
    const tenantId = tenant?.id || 'default';
    const list = getOpportunityProjects(tenantId);
    setOppProjects(list);

    if (tenant?.companyName) setCompanyName(tenant.companyName);
    if (tenant?.authorizedSignatory?.name) setProjectManager(tenant.authorizedSignatory.name);
    if (tenant?.authorizedSignatory?.title) setPmTitle(tenant.authorizedSignatory.title);

    const storageKey = `bidocs_cms_${tenantId}_${projectScopeKey}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.projectTitle) setProjectTitle(parsed.projectTitle);
        if (parsed.projectRefNo) setProjectRefNo(parsed.projectRefNo);
        if (parsed.procuringEntity) setProcuringEntity(parsed.procuringEntity);
        if (parsed.documentDate) setDocumentDate(parsed.documentDate);
        if (Array.isArray(parsed.sections) && parsed.sections.length > 0) setSections(parsed.sections);
        if (parsed.projectManager) setProjectManager(parsed.projectManager);
        if (parsed.pmTitle) setPmTitle(parsed.pmTitle);
        return;
      }
    } catch (e) {
      console.error('[CMS] Storage load error:', e);
    }

    if (list.length > 0 && !selectedOppId) {
      const match = activeProjectRefNo ? list.find(p => p.refNo === activeProjectRefNo) : null;
      const target = match || list[0];
      if (target) {
        setSelectedOppId(target.id);
        setProjectTitle(target.title);
        setProjectRefNo(target.refNo);
        setProcuringEntity(target.procuringEntity);
      }
    }
  }, [tenant, activeProjectRefNo, projectScopeKey]);

  const handleSaveState = (newSections?: MethodSection[]) => {
    const tenantId = tenant?.id || 'default';
    const storageKey = `bidocs_cms_${tenantId}_${projectScopeKey}`;
    const payload = {
      companyName,
      projectTitle,
      projectRefNo,
      procuringEntity,
      documentDate,
      sections: newSections || sections,
      projectManager,
      pmTitle
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error('[CMS] Save state error:', e);
    }
  };

  const handleAddSection = () => {
    const newSec: MethodSection = {
      id: `sec-${Date.now()}`,
      sectionTitle: `${sections.length + 1}. Additional Execution Methodology`,
      narrative: 'Detailed narrative description of the engineering sequence and controls.'
    };
    const updated = [...sections, newSec];
    setSections(updated);
    handleSaveState(updated);
  };

  const handleRemoveSection = (id: string) => {
    const updated = sections.filter(s => s.id !== id);
    setSections(updated);
    handleSaveState(updated);
  };

  const handleUpdateSection = (id: string, field: keyof MethodSection, value: string) => {
    const updated = sections.map(s => (s.id === id ? { ...s, [field]: value } : s));
    setSections(updated);
    handleSaveState(updated);
  };

  const generatePdf = async (): Promise<string | null> => {
    const printArea = document.getElementById('cms-print-sheet');
    if (!printArea) return null;
    try {
      setIsSaving(true);
      handleSaveState();

      const canvas = await html2canvas(printArea, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfDoc = await PDFDocument.create();
      // Philippine Legal: 8.5" x 13" -> 612 x 936 pt
      const page = pdfDoc.addPage([612, 936]);
      const img = await pdfDoc.embedPng(imgData);

      const margin = 24;
      const printableWidth = 612 - margin * 2;
      const printableHeight = 936 - margin * 2;
      const imgAspect = canvas.width / canvas.height;

      let drawWidth = printableWidth;
      let drawHeight = printableWidth / imgAspect;

      if (drawHeight > printableHeight) {
        drawHeight = printableHeight;
        drawWidth = printableHeight * imgAspect;
      }

      const x = margin + (printableWidth - drawWidth) / 2;
      const y = 936 - margin - drawHeight;

      page.drawImage(img, { x, y, width: drawWidth, height: drawHeight });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error('[CMS] Generate PDF error:', err);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = async () => {
    const dataUrl = await generatePdf();
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Construction_Method_Statement_${projectRefNo || 'Project'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveAndComplete = async () => {
    const dataUrl = await generatePdf();
    if (dataUrl && onSaveAndComplete) {
      onSaveAndComplete(
        dataUrl,
        'Construction Method Statement (CMS)',
        projectRefNo,
        projectTitle
      );
    }
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-600/20 text-amber-400 rounded-lg border border-amber-500/30">
            <HardHat className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              Construction Method Statement (CMS)
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Engineering Work Execution Plan • Phased Sequence of Works • Philippine Legal (8.5" x 13")
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={isSaving}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={handleSaveAndComplete}
            disabled={isSaving}
            className="px-4 py-1.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-blue-600/30 border border-blue-400/40 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Save & Attach to Vault</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Form (5 cols) */}
        <div className="lg:col-span-5 p-5 overflow-y-auto border-r border-slate-800 space-y-4 bg-slate-900/40">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Project Information
            </h3>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Project Title</label>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Contract / Ref No.</label>
                <input
                  type="text"
                  value={projectRefNo}
                  onChange={(e) => setProjectRefNo(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Document Date</label>
                <input
                  type="text"
                  value={documentDate}
                  onChange={(e) => setDocumentDate(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Procuring Entity</label>
              <input
                type="text"
                value={procuringEntity}
                onChange={(e) => setProcuringEntity(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          {/* Method Statement Sections */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Methodology Sections ({sections.length})
              </h3>
              <button
                onClick={handleAddSection}
                className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Section
              </button>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {sections.map((s) => (
                <div key={s.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={s.sectionTitle}
                      onChange={(e) => handleUpdateSection(s.id, 'sectionTitle', e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-bold text-amber-300"
                    />
                    <button
                      onClick={() => handleRemoveSection(s.id)}
                      className="p-1 text-slate-500 hover:text-red-400 rounded transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={s.narrative}
                    onChange={(e) => handleUpdateSection(s.id, 'narrative', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-[11px] leading-relaxed"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Preview Sheet (7 cols) */}
        <div className="lg:col-span-7 p-6 overflow-y-auto bg-slate-950 flex justify-center items-start">
          <div
            id="cms-print-sheet"
            className="w-[816px] min-h-[1248px] bg-white text-slate-900 p-12 shadow-2xl rounded-sm flex flex-col justify-between text-[11.5px] leading-relaxed"
            style={{ boxSizing: 'border-box' }}
          >
            <div>
              {/* Header */}
              <div className="text-center border-b-2 border-slate-900 pb-4 mb-4">
                <h1 className="text-base font-black tracking-wide uppercase text-slate-900">{companyName || 'CONTRACTOR / FIRM NAME'}</h1>
                <p className="text-[11px] text-slate-700 font-bold uppercase tracking-wider">CONSTRUCTION METHOD STATEMENT (CMS)</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Date: {documentDate} • RA 9184 / RA 12009 Standard</p>
              </div>

              {/* Project Bar */}
              <div className="grid grid-cols-2 gap-4 mb-4 p-2.5 bg-slate-50 border border-slate-300 rounded text-[11px]">
                <div>
                  <p><strong>Project Title:</strong> {projectTitle || 'N/A'}</p>
                  <p><strong>Procuring Entity:</strong> {procuringEntity || 'Government Agency'}</p>
                </div>
                <div>
                  <p><strong>Contract / Ref No.:</strong> <span className="font-mono">{projectRefNo || 'N/A'}</span></p>
                  <p><strong>Methodology Scope:</strong> Complete Infrastructure Execution Sequence</p>
                </div>
              </div>

              {/* Method Sections */}
              <div className="space-y-3.5 text-justify">
                {sections.map((s) => (
                  <div key={s.id} className="space-y-1">
                    <h3 className="font-bold text-slate-900 uppercase text-xs border-b border-slate-200 pb-0.5">
                      {s.sectionTitle}
                    </h3>
                    <p className="text-slate-800 text-[11px] pl-2 leading-normal">
                      {s.narrative}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Signatures & QR */}
            <div className="pt-6 border-t border-slate-300 mt-6">
              <div className="flex justify-between items-end text-xs">
                <div className="space-y-1">
                  <p className="text-slate-500">Prepared & Endorsed by:</p>
                  <p className="font-bold underline uppercase text-slate-900 pt-6">{projectManager || 'PROJECT MANAGER / IN-CHARGE'}</p>
                  <p className="text-slate-600 text-[11px]">{pmTitle}</p>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-100 flex justify-end items-center text-[9px] text-slate-400 font-mono">
                <span>Page 1 of 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function CmsModal(props: CmsModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] h-[94vh] flex flex-col">
        <VaultErrorBoundary>
          <CmsModalContent {...props} />
        </VaultErrorBoundary>
      </div>
    </div>
  );
}

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
  Activity,
  Briefcase,
  Layers,
  ShieldCheck,
  Building2
} from 'lucide-react';

export interface PertActivity {
  id: string;
  actCode: string;
  description: string;
  predecessors: string;
  durationDays: number;
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalFloat: number;
  isCritical: boolean;
  weightPercent: number;
}

export interface PertModalProps {
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
  contractDuration?: number;
  dateTimeSubmitted?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose?: () => void;
}

const DEFAULT_ACTIVITIES: PertActivity[] = [
  { id: 'act-1', actCode: 'A', description: 'Mobilization & Temporary Site Facilities', predecessors: '-', durationDays: 14, earlyStart: 1, earlyFinish: 14, lateStart: 1, lateFinish: 14, totalFloat: 0, isCritical: true, weightPercent: 5.0 },
  { id: 'act-2', actCode: 'B', description: 'Staking, Layout & Batterboards', predecessors: 'A', durationDays: 7, earlyStart: 15, earlyFinish: 21, lateStart: 15, lateFinish: 21, totalFloat: 0, isCritical: true, weightPercent: 2.5 },
  { id: 'act-3', actCode: 'C', description: 'Structure Excavation & Foundation Bedding', predecessors: 'B', durationDays: 20, earlyStart: 22, earlyFinish: 41, lateStart: 22, lateFinish: 41, totalFloat: 0, isCritical: true, weightPercent: 8.5 },
  { id: 'act-4', actCode: 'D', description: 'Foundation & Column Footing Concrete / Rebar', predecessors: 'C', durationDays: 25, earlyStart: 42, earlyFinish: 66, lateStart: 42, lateFinish: 66, totalFloat: 0, isCritical: true, weightPercent: 18.0 },
  { id: 'act-5', actCode: 'E', description: 'Ground Slab, Beams & Framing Structural Works', predecessors: 'D', durationDays: 35, earlyStart: 67, earlyFinish: 101, lateStart: 67, lateFinish: 101, totalFloat: 0, isCritical: true, weightPercent: 24.0 },
  { id: 'act-6', actCode: 'F', description: 'Masonry & CHB Wall Partitioning', predecessors: 'E', durationDays: 28, earlyStart: 102, earlyFinish: 129, lateStart: 107, lateFinish: 134, totalFloat: 5, isCritical: false, weightPercent: 12.0 },
  { id: 'act-7', actCode: 'G', description: 'MEPFS Roughing-in & Utility Conduits', predecessors: 'E', durationDays: 30, earlyStart: 102, earlyFinish: 131, lateStart: 102, lateFinish: 131, totalFloat: 0, isCritical: true, weightPercent: 14.0 },
  { id: 'act-8', actCode: 'H', description: 'Finishing, Painting, Fixtures & Final Inspection', predecessors: 'F, G', durationDays: 35, earlyStart: 132, earlyFinish: 166, lateStart: 132, lateFinish: 166, totalFloat: 0, isCritical: true, weightPercent: 12.0 },
  { id: 'act-9', actCode: 'I', description: 'Demobilization & Joint Turnover Clearing', predecessors: 'H', durationDays: 14, earlyStart: 167, earlyFinish: 180, lateStart: 167, lateFinish: 180, totalFloat: 0, isCritical: true, weightPercent: 4.0 }
];

export const PertModalContent: React.FC<PertModalProps> = ({
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
  contractDuration: propContractDuration = 180,
  dateTimeSubmitted: propDateTimeSubmitted = '',
  onSaveAndComplete,
  onClose
}) => {
  const todayStr = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  const [companyName, setCompanyName] = useState<string>(tenant?.companyName || '');
  const [projectTitle, setProjectTitle] = useState<string>(activeProjectTitle || '');
  const [projectRefNo, setProjectRefNo] = useState<string>(activeProjectRefNo || '');
  const [procuringEntity, setProcuringEntity] = useState<string>(activeProcuringEntity || '');
  const [contractDuration, setContractDuration] = useState<number>(180);

  const [activities, setActivities] = useState<PertActivity[]>(DEFAULT_ACTIVITIES);

  // Signatory
  const [projectEngineer, setProjectEngineer] = useState<string>(tenant?.authorizedSignatory?.name || '');
  const [peTitle, setPeTitle] = useState<string>(tenant?.authorizedSignatory?.title || 'Planning & Scheduling Engineer');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const projectScopeKey = (projectRefNo || selectedOppId || activeProjectRefNo || 'default').replace(/[^a-zA-Z0-9]/g, '_');

  const totalWeight = activities.reduce((acc, a) => acc + (a.weightPercent || 0), 0);

  useEffect(() => {
    const tenantId = tenant?.id || 'default';
    const list = getOpportunityProjects(tenantId);
    setOppProjects(list);

    if (tenant?.companyName) setCompanyName(tenant.companyName);
    if (tenant?.authorizedSignatory?.name) setProjectEngineer(tenant.authorizedSignatory.name);
    if (tenant?.authorizedSignatory?.title) setPeTitle(tenant.authorizedSignatory.title);

    const storageKey = `bidocs_pert_${tenantId}_${projectScopeKey}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.projectTitle) setProjectTitle(parsed.projectTitle);
        if (parsed.projectRefNo) setProjectRefNo(parsed.projectRefNo);
        if (parsed.procuringEntity) setProcuringEntity(parsed.procuringEntity);
        if (parsed.contractDuration !== undefined) setContractDuration(parsed.contractDuration);
        if (Array.isArray(parsed.activities) && parsed.activities.length > 0) setActivities(parsed.activities);
        if (parsed.projectEngineer) setProjectEngineer(parsed.projectEngineer);
        if (parsed.peTitle) setPeTitle(parsed.peTitle);
        return;
      }
    } catch (e) {
      console.error('[PERT] Storage load error:', e);
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

  const handleSaveState = (newActivities?: PertActivity[]) => {
    const tenantId = tenant?.id || 'default';
    const storageKey = `bidocs_pert_${tenantId}_${projectScopeKey}`;
    const payload = {
      companyName,
      projectTitle,
      projectRefNo,
      procuringEntity,
      contractDuration,
      activities: newActivities || activities,
      projectEngineer,
      peTitle
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error('[PERT] Save state error:', e);
    }
  };

  const handleAddActivity = () => {
    const newAct: PertActivity = {
      id: `act-${Date.now()}`,
      actCode: String.fromCharCode(65 + activities.length),
      description: 'New Project Activity',
      predecessors: '-',
      durationDays: 10,
      earlyStart: 1,
      earlyFinish: 10,
      lateStart: 1,
      lateFinish: 10,
      totalFloat: 0,
      isCritical: false,
      weightPercent: 0
    };
    const updated = [...activities, newAct];
    setActivities(updated);
    handleSaveState(updated);
  };

  const handleRemoveActivity = (id: string) => {
    const updated = activities.filter(a => a.id !== id);
    setActivities(updated);
    handleSaveState(updated);
  };

  const handleUpdateActivity = (id: string, field: keyof PertActivity, value: any) => {
    const updated = activities.map(a => (a.id === id ? { ...a, [field]: value } : a));
    setActivities(updated);
    handleSaveState(updated);
  };

  const generatePdf = async (): Promise<string | null> => {
    const printArea = document.getElementById('pert-print-sheet');
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

      const margin = 20;
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
      console.error('[PERT] Generate PDF error:', err);
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
    a.download = `PERT_CPM_Network_Schedule_${projectRefNo || 'Project'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveAndComplete = async () => {
    const dataUrl = await generatePdf();
    if (dataUrl && onSaveAndComplete) {
      onSaveAndComplete(
        dataUrl,
        'PERT/CPM Network Schedule',
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
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              PERT/CPM Network Schedule & Milestone Chart
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Critical Path Method Analysis • Activity Float & Weight Distribution • Philippine Legal (8.5" x 13")
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
            className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-blue-600/30 border border-blue-400/40 cursor-pointer disabled:opacity-50"
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
        {/* Left Form Controls (5 cols) */}
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
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Duration (Calendar Days)</label>
                <input
                  type="number"
                  value={contractDuration}
                  onChange={(e) => setContractDuration(Number(e.target.value))}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
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

          {/* Activities List */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Project Activities ({activities.length})
              </h3>
              <button
                onClick={handleAddActivity}
                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Activity
              </button>
            </div>

            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {activities.map((a) => (
                <div key={a.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={a.actCode}
                      onChange={(e) => handleUpdateActivity(a.id, 'actCode', e.target.value)}
                      className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-center font-mono font-bold text-indigo-400"
                    />
                    <input
                      type="text"
                      value={a.description}
                      onChange={(e) => handleUpdateActivity(a.id, 'description', e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                    <label className="flex items-center gap-1 text-[10px] text-amber-400 font-bold shrink-0">
                      <input
                        type="checkbox"
                        checked={a.isCritical}
                        onChange={(e) => handleUpdateActivity(a.id, 'isCritical', e.target.checked)}
                      />
                      CPM
                    </label>
                    <button
                      onClick={() => handleRemoveActivity(a.id)}
                      className="p-1 text-slate-500 hover:text-red-400 rounded transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 text-[10px]">Pred</span>
                      <input
                        type="text"
                        value={a.predecessors}
                        onChange={(e) => handleUpdateActivity(a.id, 'predecessors', e.target.value)}
                        className="w-full mt-0.5 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px]">Days</span>
                      <input
                        type="number"
                        value={a.durationDays}
                        onChange={(e) => handleUpdateActivity(a.id, 'durationDays', Number(e.target.value))}
                        className="w-full mt-0.5 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px]">Float</span>
                      <input
                        type="number"
                        value={a.totalFloat}
                        onChange={(e) => handleUpdateActivity(a.id, 'totalFloat', Number(e.target.value))}
                        className="w-full mt-0.5 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px]">Weight %</span>
                      <input
                        type="number"
                        value={a.weightPercent}
                        onChange={(e) => handleUpdateActivity(a.id, 'weightPercent', Number(e.target.value))}
                        className="w-full mt-0.5 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-emerald-400 font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Preview Sheet (7 cols) */}
        <div className="lg:col-span-7 p-6 overflow-y-auto bg-slate-950 flex justify-center items-start">
          <div
            id="pert-print-sheet"
            className="w-[816px] min-h-[1248px] bg-white text-slate-900 p-10 shadow-2xl rounded-sm flex flex-col justify-between text-[11px] leading-tight"
            style={{ boxSizing: 'border-box' }}
          >
            <div>
              {/* Header */}
              <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
                <h1 className="text-base font-black tracking-wide uppercase text-slate-900">{companyName || 'CONTRACTOR / FIRM NAME'}</h1>
                <p className="text-[10px] text-slate-600 uppercase font-semibold">PERT / CPM NETWORK & ACTIVITY PROGRESS SCHEDULE</p>
                <p className="text-[10px] text-blue-900 font-bold mt-0.5">Total Contract Time: {contractDuration} Calendar Days</p>
              </div>

              {/* Meta Box */}
              <div className="grid grid-cols-2 gap-4 mb-4 p-2.5 bg-slate-50 border border-slate-300 rounded text-[10.5px]">
                <div>
                  <p><strong>Project Title:</strong> {projectTitle || 'N/A'}</p>
                  <p><strong>Procuring Entity:</strong> {procuringEntity || 'Government Agency'}</p>
                </div>
                <div>
                  <p><strong>Contract / Ref No.:</strong> <span className="font-mono">{projectRefNo || 'N/A'}</span></p>
                  <p><strong>Total Project Weight:</strong> <span className="font-mono font-bold text-blue-900">{totalWeight.toFixed(2)}%</span></p>
                </div>
              </div>

              {/* PERT Table */}
              <table className="w-full border-collapse border border-slate-400 text-[10px] mb-4">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 text-center font-bold">
                    <th className="border border-slate-400 p-1 w-10">Act</th>
                    <th className="border border-slate-400 p-1 text-left">Activity Description</th>
                    <th className="border border-slate-400 p-1 w-12">Pred</th>
                    <th className="border border-slate-400 p-1 w-12">Dur (d)</th>
                    <th className="border border-slate-400 p-1 w-12">ES</th>
                    <th className="border border-slate-400 p-1 w-12">EF</th>
                    <th className="border border-slate-400 p-1 w-12">LS</th>
                    <th className="border border-slate-400 p-1 w-12">LF</th>
                    <th className="border border-slate-400 p-1 w-12">Float</th>
                    <th className="border border-slate-400 p-1 w-14">Weight %</th>
                    <th className="border border-slate-400 p-1 w-14">Path</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((a, idx) => (
                    <tr key={a.id} className={a.isCritical ? 'bg-amber-50 font-semibold' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="border border-slate-400 p-1 text-center font-mono font-bold text-slate-900">{a.actCode}</td>
                      <td className="border border-slate-400 p-1">{a.description}</td>
                      <td className="border border-slate-400 p-1 text-center font-mono text-slate-600">{a.predecessors}</td>
                      <td className="border border-slate-400 p-1 text-center font-mono">{a.durationDays}</td>
                      <td className="border border-slate-400 p-1 text-center font-mono">{a.earlyStart}</td>
                      <td className="border border-slate-400 p-1 text-center font-mono">{a.earlyFinish}</td>
                      <td className="border border-slate-400 p-1 text-center font-mono">{a.lateStart}</td>
                      <td className="border border-slate-400 p-1 text-center font-mono">{a.lateFinish}</td>
                      <td className="border border-slate-400 p-1 text-center font-mono font-bold text-slate-700">{a.totalFloat}</td>
                      <td className="border border-slate-400 p-1 text-center font-mono font-bold text-blue-900">{a.weightPercent}%</td>
                      <td className="border border-slate-400 p-1 text-center text-[8.5px] font-bold">
                        {a.isCritical ? (
                          <span className="px-1 py-0.5 bg-red-600 text-white rounded">CRITICAL</span>
                        ) : (
                          <span className="text-slate-400 font-normal">Normal</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-200 font-bold text-slate-900">
                    <td colSpan={9} className="border border-slate-400 p-1 text-right uppercase">TOTAL WEIGHT ACCUMULATION:</td>
                    <td className="border border-slate-400 p-1 text-center font-mono text-blue-950 font-black">{totalWeight.toFixed(2)}%</td>
                    <td className="border border-slate-400 p-1 text-center text-slate-500">100% Target</td>
                  </tr>
                </tbody>
              </table>

              <div className="p-3 bg-slate-50 border border-slate-300 rounded text-[10px] space-y-1 text-slate-700">
                <p className="font-bold text-slate-900 uppercase">PERT/CPM SCHEDULE UNDERTAKING:</p>
                <p>
                  The critical path activities indicated above form the statutory baseline schedule for tracking project execution and determining any contractor or owner-attributable time delays in accordance with DPWH/RA 9184 contract guidelines.
                </p>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-6 border-t border-slate-300">
              <div className="flex justify-between items-end text-xs">
                <div className="space-y-1">
                  <p className="text-slate-500">Prepared & Certified by (Contractor):</p>
                  <p className="font-bold underline uppercase text-slate-900 pt-6">{projectEngineer || 'PLANNING & SCHEDULING ENGINEER'}</p>
                  <p className="text-slate-600 text-[11px]">{peTitle}</p>
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

export default function PertModal(props: PertModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] h-[94vh] flex flex-col">
        <VaultErrorBoundary>
          <PertModalContent {...props} />
        </VaultErrorBoundary>
      </div>
    </div>
  );
}

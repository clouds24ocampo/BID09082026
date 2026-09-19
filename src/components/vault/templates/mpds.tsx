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
  Users,
  Briefcase
} from 'lucide-react';

export interface ManpowerRow {
  id: string;
  category: 'KEY PERSONNEL' | 'TECHNICAL STAFF' | 'SKILLED LABOR' | 'UNSKILLED LABOR';
  designation: string;
  name: string;
  m1: number; // Headcount
  m2: number;
  m3: number;
  m4: number;
  m5: number;
  m6: number;
}

export interface MpdsModalProps {
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

const DEFAULT_MANPOWER_ROWS: ManpowerRow[] = [
  { id: 'mp-1', category: 'KEY PERSONNEL', designation: 'Project Manager', name: 'Engr. Juan Dela Cruz', m1: 1, m2: 1, m3: 1, m4: 1, m5: 1, m6: 1 },
  { id: 'mp-2', category: 'KEY PERSONNEL', designation: 'Project Engineer', name: 'Engr. Maria Santos', m1: 1, m2: 1, m3: 1, m4: 1, m5: 1, m6: 1 },
  { id: 'mp-3', category: 'KEY PERSONNEL', designation: 'Materials Engineer', name: 'Engr. Carlos Reyes (ME-II)', m1: 1, m2: 1, m3: 1, m4: 1, m5: 1, m6: 1 },
  { id: 'mp-4', category: 'KEY PERSONNEL', designation: 'Safety Officer (COSH)', name: 'Mr. Roberto Lim', m1: 1, m2: 1, m3: 1, m4: 1, m5: 1, m6: 1 },
  { id: 'mp-5', category: 'TECHNICAL STAFF', designation: 'General Foreman', name: 'Mr. Antonio Gomez', m1: 1, m2: 1, m3: 1, m4: 1, m5: 1, m6: 1 },
  { id: 'mp-6', category: 'SKILLED LABOR', designation: 'Masons & Plasterers', name: 'Skilled Trades Team', m1: 4, m2: 8, m3: 8, m4: 6, m5: 4, m6: 2 },
  { id: 'mp-7', category: 'SKILLED LABOR', designation: 'Steelmen & Rebar Fabricators', name: 'Steel Trades Team', m1: 6, m2: 8, m3: 6, m4: 4, m5: 2, m6: 0 },
  { id: 'mp-8', category: 'SKILLED LABOR', designation: 'Carpenters & Scaffolders', name: 'Carpentry Team', m1: 4, m2: 6, m3: 6, m4: 4, m5: 2, m6: 1 },
  { id: 'mp-9', category: 'SKILLED LABOR', designation: 'Electricians & Plumbers', name: 'MEP Installation Team', m1: 2, m2: 4, m3: 4, m4: 4, m5: 3, m6: 1 },
  { id: 'mp-10', category: 'UNSKILLED LABOR', designation: 'Laborers & Helpers', name: 'Site Support Team', m1: 8, m2: 14, m3: 14, m4: 10, m5: 6, m6: 4 }
];

export const MpdsModalContent: React.FC<MpdsModalProps> = ({
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
  const [, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  const [companyName, setCompanyName] = useState<string>(tenant?.companyName || '');
  const [projectTitle, setProjectTitle] = useState<string>(activeProjectTitle || '');
  const [projectRefNo, setProjectRefNo] = useState<string>(activeProjectRefNo || '');
  const [procuringEntity, setProcuringEntity] = useState<string>(activeProcuringEntity || '');
  const [contractDuration, setContractDuration] = useState<string>('180 Calendar Days (6 Months)');

  const [rows, setRows] = useState<ManpowerRow[]>(DEFAULT_MANPOWER_ROWS);

  // Signatory
  const [signatoryName, setSignatoryName] = useState<string>(tenant?.authorizedSignatory?.name || '');
  const [signatoryTitle, setSignatoryTitle] = useState<string>(tenant?.authorizedSignatory?.title || 'Authorized Managing Officer');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const projectScopeKey = (projectRefNo || selectedOppId || activeProjectRefNo || 'default').replace(/[^a-zA-Z0-9]/g, '_');

  // Total headcount per month
  const totalM1 = rows.reduce((acc, r) => acc + (r.m1 || 0), 0);
  const totalM2 = rows.reduce((acc, r) => acc + (r.m2 || 0), 0);
  const totalM3 = rows.reduce((acc, r) => acc + (r.m3 || 0), 0);
  const totalM4 = rows.reduce((acc, r) => acc + (r.m4 || 0), 0);
  const totalM5 = rows.reduce((acc, r) => acc + (r.m5 || 0), 0);
  const totalM6 = rows.reduce((acc, r) => acc + (r.m6 || 0), 0);

  useEffect(() => {
    const tenantId = tenant?.id || 'default';
    const list = getOpportunityProjects(tenantId);
    setOppProjects(list);

    if (tenant?.companyName) setCompanyName(tenant.companyName);
    if (tenant?.authorizedSignatory?.name) setSignatoryName(tenant.authorizedSignatory.name);
    if (tenant?.authorizedSignatory?.title) setSignatoryTitle(tenant.authorizedSignatory.title);

    const storageKey = `bidocs_mpds_${tenantId}_${projectScopeKey}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.projectTitle) setProjectTitle(parsed.projectTitle);
        if (parsed.projectRefNo) setProjectRefNo(parsed.projectRefNo);
        if (parsed.procuringEntity) setProcuringEntity(parsed.procuringEntity);
        if (parsed.contractDuration) setContractDuration(parsed.contractDuration);
        if (Array.isArray(parsed.rows) && parsed.rows.length > 0) setRows(parsed.rows);
        if (parsed.signatoryName) setSignatoryName(parsed.signatoryName);
        if (parsed.signatoryTitle) setSignatoryTitle(parsed.signatoryTitle);
        return;
      }
    } catch (e) {
      console.error('[MPDS] Storage load error:', e);
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

  const handleSaveState = (newRows?: ManpowerRow[]) => {
    const tenantId = tenant?.id || 'default';
    const storageKey = `bidocs_mpds_${tenantId}_${projectScopeKey}`;
    const payload = {
      companyName,
      projectTitle,
      projectRefNo,
      procuringEntity,
      contractDuration,
      rows: newRows || rows,
      signatoryName,
      signatoryTitle
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error('[MPDS] Save state error:', e);
    }
  };

  const handleAddRow = () => {
    const newRow: ManpowerRow = {
      id: `mp-${Date.now()}`,
      category: 'SKILLED LABOR',
      designation: 'Specialist Technician',
      name: 'Trade Crew',
      m1: 2,
      m2: 2,
      m3: 2,
      m4: 2,
      m5: 2,
      m6: 2
    };
    const updated = [...rows, newRow];
    setRows(updated);
    handleSaveState(updated);
  };

  const handleRemoveRow = (id: string) => {
    const updated = rows.filter(r => r.id !== id);
    setRows(updated);
    handleSaveState(updated);
  };

  const handleUpdateRow = (id: string, field: keyof ManpowerRow, value: any) => {
    const updated = rows.map(r => (r.id === id ? { ...r, [field]: value } : r));
    setRows(updated);
    handleSaveState(updated);
  };

  const generatePdf = async (): Promise<string | null> => {
    const printArea = document.getElementById('mpds-print-sheet');
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
      console.error('[MPDS] Generate PDF error:', err);
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
    a.download = `Manpower_Deployment_Schedule_${projectRefNo || 'Project'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveAndComplete = async () => {
    const dataUrl = await generatePdf();
    if (dataUrl && onSaveAndComplete) {
      onSaveAndComplete(
        dataUrl,
        'Manpower Deployment Schedule (MPDS)',
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
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              Manpower Deployment Schedule (MPDS)
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Monthly Labor Allocation Matrix & Headcount Distribution • Philippine Legal (8.5" x 13")
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
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Contract Duration</label>
                <input
                  type="text"
                  value={contractDuration}
                  onChange={(e) => setContractDuration(e.target.value)}
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

          {/* Manpower Rows */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Personnel & Labor Schedule ({rows.length})
              </h3>
              <button
                onClick={handleAddRow}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Row
              </button>
            </div>

            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {rows.map((r) => (
                <div key={r.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={r.designation}
                      onChange={(e) => handleUpdateRow(r.id, 'designation', e.target.value)}
                      placeholder="Designation / Trade"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-semibold"
                    />
                    <select
                      value={r.category}
                      onChange={(e) => handleUpdateRow(r.id, 'category', e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-blue-300 font-bold"
                    >
                      <option value="KEY PERSONNEL">KEY PERSONNEL</option>
                      <option value="TECHNICAL STAFF">TECHNICAL STAFF</option>
                      <option value="SKILLED LABOR">SKILLED LABOR</option>
                      <option value="UNSKILLED LABOR">UNSKILLED LABOR</option>
                    </select>
                    <button
                      onClick={() => handleRemoveRow(r.id)}
                      className="p-1 text-slate-500 hover:text-red-400 rounded transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={r.name}
                    onChange={(e) => handleUpdateRow(r.id, 'name', e.target.value)}
                    placeholder="Assigned Name / Crew Description"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs"
                  />

                  <div className="grid grid-cols-6 gap-1 text-[10px] text-center">
                    {(['m1', 'm2', 'm3', 'm4', 'm5', 'm6'] as const).map((m, idx) => (
                      <div key={m}>
                        <span className="text-slate-500">M{idx + 1}</span>
                        <input
                          type="number"
                          value={r[m]}
                          onChange={(e) => handleUpdateRow(r.id, m, Number(e.target.value))}
                          className="w-full mt-0.5 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center text-emerald-400 font-mono font-bold"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Preview Sheet (7 cols) */}
        <div className="lg:col-span-7 p-6 overflow-y-auto bg-slate-950 flex justify-center items-start">
          <div
            id="mpds-print-sheet"
            className="w-[816px] min-h-[1248px] bg-white text-slate-900 p-10 shadow-2xl rounded-sm flex flex-col justify-between text-[11px] leading-tight"
            style={{ boxSizing: 'border-box' }}
          >
            <div>
              {/* Header */}
              <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
                <h1 className="text-base font-black tracking-wide uppercase text-slate-900">{companyName || 'CONTRACTOR / FIRM NAME'}</h1>
                <p className="text-[10px] text-slate-600 uppercase font-semibold">MANPOWER DEPLOYMENT SCHEDULE (MPDS)</p>
                <p className="text-[10px] text-blue-900 font-bold mt-0.5">Project Duration: {contractDuration}</p>
              </div>

              {/* Meta Box */}
              <div className="grid grid-cols-2 gap-4 mb-4 p-2.5 bg-slate-50 border border-slate-300 rounded text-[10.5px]">
                <div>
                  <p><strong>Project Title:</strong> {projectTitle || 'N/A'}</p>
                  <p><strong>Procuring Entity:</strong> {procuringEntity || 'Government Agency'}</p>
                </div>
                <div>
                  <p><strong>Contract / Ref No.:</strong> <span className="font-mono">{projectRefNo || 'N/A'}</span></p>
                  <p><strong>Total Labor Categories:</strong> {rows.length} Staff/Labor Classifications</p>
                </div>
              </div>

              {/* Manpower Table */}
              <table className="w-full border-collapse border border-slate-400 text-[10px] mb-4">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 text-center font-bold">
                    <th className="border border-slate-400 p-1.5 text-left w-36">Position / Designation</th>
                    <th className="border border-slate-400 p-1.5 text-left w-40">Assigned Personnel / Team</th>
                    <th className="border border-slate-400 p-1.5 w-24">Category</th>
                    <th className="border border-slate-400 p-1.5 w-8">M1</th>
                    <th className="border border-slate-400 p-1.5 w-8">M2</th>
                    <th className="border border-slate-400 p-1.5 w-8">M3</th>
                    <th className="border border-slate-400 p-1.5 w-8">M4</th>
                    <th className="border border-slate-400 p-1.5 w-8">M5</th>
                    <th className="border border-slate-400 p-1.5 w-8">M6</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="border border-slate-400 p-1 font-semibold text-slate-900">{r.designation}</td>
                      <td className="border border-slate-400 p-1 text-slate-700">{r.name}</td>
                      <td className="border border-slate-400 p-1 text-center font-semibold text-[8.5px] text-blue-900">{r.category}</td>
                      {[r.m1, r.m2, r.m3, r.m4, r.m5, r.m6].map((val, mIdx) => (
                        <td key={mIdx} className="border border-slate-400 p-1 text-center font-mono font-bold text-slate-900">
                          {val > 0 ? val : <span className="text-slate-300 font-normal">-</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-slate-200 font-bold text-slate-900">
                    <td colSpan={3} className="border border-slate-400 p-1.5 text-right uppercase">TOTAL MONTHLY HEADCOUNT:</td>
                    <td className="border border-slate-400 p-1 text-center font-mono text-blue-950 font-black">{totalM1}</td>
                    <td className="border border-slate-400 p-1 text-center font-mono text-blue-950 font-black">{totalM2}</td>
                    <td className="border border-slate-400 p-1 text-center font-mono text-blue-950 font-black">{totalM3}</td>
                    <td className="border border-slate-400 p-1 text-center font-mono text-blue-950 font-black">{totalM4}</td>
                    <td className="border border-slate-400 p-1 text-center font-mono text-blue-950 font-black">{totalM5}</td>
                    <td className="border border-slate-400 p-1 text-center font-mono text-blue-950 font-black">{totalM6}</td>
                  </tr>
                </tbody>
              </table>

              <div className="p-3 bg-slate-50 border border-slate-300 rounded text-[10px] space-y-1 text-slate-700">
                <p className="font-bold text-slate-900 uppercase">LABOR DEPLOYMENT CERTIFICATION:</p>
                <p>
                  The contractor certifies that the above-scheduled key personnel and skilled labor workforce shall be deployed in complete compliance with DOLE Occupational Safety & Health Standards (D.O. 13) and the statutory project milestone commitments.
                </p>
              </div>
            </div>

            {/* Bottom Signatures */}
            <div className="pt-6 border-t border-slate-300">
              <div className="flex justify-between items-end text-xs">
                <div className="space-y-1">
                  <p className="text-slate-500">Submitted by (Contractor):</p>
                  <p className="font-bold underline uppercase text-slate-900 pt-6">{signatoryName || 'AUTHORIZED MANAGING OFFICER'}</p>
                  <p className="text-slate-600 text-[11px]">{signatoryTitle}</p>
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

export default function MpdsModal(props: MpdsModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] h-[94vh] flex flex-col">
        <VaultErrorBoundary>
          <MpdsModalContent {...props} />
        </VaultErrorBoundary>
      </div>
    </div>
  );
}

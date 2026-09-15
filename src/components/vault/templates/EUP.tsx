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
  Truck,
  Briefcase,
  Layers,
  ShieldCheck,
  Building2
} from 'lucide-react';

export interface EquipmentPlanRow {
  id: string;
  equipmentName: string;
  capacityModel: string;
  plateNumber: string;
  condition: string;
  ownership: 'OWNED' | 'LEASED' | 'UNDER PURCHASE';
  month1: number; // Utilization % or days
  month2: number;
  month3: number;
  month4: number;
  month5: number;
  month6: number;
}

export interface EupModalProps {
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

const DEFAULT_EQUIPMENT_ROWS: EquipmentPlanRow[] = [
  { id: 'eq-1', equipmentName: 'Hydraulic Excavator / Backhoe', capacityModel: '0.80 cu.m. (Komatsu PC200)', plateNumber: 'EXC-8910', condition: 'Good Operating Condition', ownership: 'OWNED', month1: 100, month2: 100, month3: 60, month4: 30, month5: 20, month6: 0 },
  { id: 'eq-2', equipmentName: 'Dump Truck (10-Wheeler)', capacityModel: '12.0 cu.m. (Isuzu Giga)', plateNumber: 'DT-4491', condition: 'Good Operating Condition', ownership: 'OWNED', month1: 100, month2: 100, month3: 80, month4: 50, month5: 40, month6: 20 },
  { id: 'eq-3', equipmentName: 'One-Bagger Concrete Mixer', capacityModel: '4/7 cu.ft. Portable', plateNumber: 'CM-019', condition: 'Good Condition', ownership: 'OWNED', month1: 20, month2: 100, month3: 100, month4: 100, month5: 60, month6: 20 },
  { id: 'eq-4', equipmentName: 'Concrete Vibrator (Flexible Shaft)', capacityModel: '5.5 HP Gasoline Engine', plateNumber: 'CV-882', condition: 'Good Condition', ownership: 'OWNED', month1: 20, month2: 100, month3: 100, month4: 100, month5: 50, month6: 10 },
  { id: 'eq-5', equipmentName: 'Plate Compactor', capacityModel: '5 HP Wacker Neuson', plateNumber: 'PC-102', condition: 'Good Condition', ownership: 'LEASED', month1: 100, month2: 80, month3: 40, month4: 20, month5: 0, month6: 0 },
  { id: 'eq-6', equipmentName: 'Bar Cutter & Bar Bender', capacityModel: 'Max 32mm RSB Electrical', plateNumber: 'BCB-04', condition: 'Good Condition', ownership: 'OWNED', month1: 60, month2: 100, month3: 100, month4: 80, month5: 20, month6: 0 }
];

export const EupModalContent: React.FC<EupModalProps> = ({
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

  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  const [companyName, setCompanyName] = useState<string>(tenant?.companyName || '');
  const [projectTitle, setProjectTitle] = useState<string>(activeProjectTitle || '');
  const [projectRefNo, setProjectRefNo] = useState<string>(activeProjectRefNo || '');
  const [procuringEntity, setProcuringEntity] = useState<string>(activeProcuringEntity || '');
  const [contractDuration, setContractDuration] = useState<string>('180 Calendar Days (6 Months)');

  const [rows, setRows] = useState<EquipmentPlanRow[]>(DEFAULT_EQUIPMENT_ROWS);

  // Signatory
  const [signatoryName, setSignatoryName] = useState<string>(tenant?.authorizedSignatory?.name || '');
  const [signatoryTitle, setSignatoryTitle] = useState<string>(tenant?.authorizedSignatory?.title || 'Equipment Officer / Project Manager');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const projectScopeKey = (projectRefNo || selectedOppId || activeProjectRefNo || 'default').replace(/[^a-zA-Z0-9]/g, '_');

  useEffect(() => {
    const tenantId = tenant?.id || 'default';
    const list = getOpportunityProjects(tenantId);
    setOppProjects(list);

    if (tenant?.companyName) setCompanyName(tenant.companyName);
    if (tenant?.authorizedSignatory?.name) setSignatoryName(tenant.authorizedSignatory.name);
    if (tenant?.authorizedSignatory?.title) setSignatoryTitle(tenant.authorizedSignatory.title);

    const storageKey = `bidocs_eup_${tenantId}_${projectScopeKey}`;
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
      console.error('[EUP] Storage load error:', e);
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

  const handleSaveState = (newRows?: EquipmentPlanRow[]) => {
    const tenantId = tenant?.id || 'default';
    const storageKey = `bidocs_eup_${tenantId}_${projectScopeKey}`;
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
      console.error('[EUP] Save state error:', e);
    }
  };

  const handleAddRow = () => {
    const newRow: EquipmentPlanRow = {
      id: `eq-${Date.now()}`,
      equipmentName: 'Heavy Equipment Unit',
      capacityModel: 'Standard Capacity',
      plateNumber: 'N/A',
      condition: 'Good Condition',
      ownership: 'OWNED',
      month1: 100,
      month2: 100,
      month3: 100,
      month4: 100,
      month5: 100,
      month6: 100
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

  const handleUpdateRow = (id: string, field: keyof EquipmentPlanRow, value: any) => {
    const updated = rows.map(r => (r.id === id ? { ...r, [field]: value } : r));
    setRows(updated);
    handleSaveState(updated);
  };

  const generatePdf = async (): Promise<string | null> => {
    const printArea = document.getElementById('eup-print-sheet');
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
      console.error('[EUP] Generate PDF error:', err);
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
    a.download = `Equipment_Utilization_Plan_${projectRefNo || 'Project'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveAndComplete = async () => {
    const dataUrl = await generatePdf();
    if (dataUrl && onSaveAndComplete) {
      onSaveAndComplete(
        dataUrl,
        'Equipment Utilization Plan (EUP)',
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
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              Equipment Utilization Plan (EUP)
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Monthly Equipment Deployment Matrix & Bar Schedule • Philippine Legal (8.5" x 13")
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

          {/* Equipment Rows */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Equipment Units ({rows.length})
              </h3>
              <button
                onClick={handleAddRow}
                className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Equipment
              </button>
            </div>

            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {rows.map((r) => (
                <div key={r.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={r.equipmentName}
                      onChange={(e) => handleUpdateRow(r.id, 'equipmentName', e.target.value)}
                      placeholder="Equipment Name"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-semibold"
                    />
                    <select
                      value={r.ownership}
                      onChange={(e) => handleUpdateRow(r.id, 'ownership', e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-blue-300 font-bold"
                    >
                      <option value="OWNED">OWNED</option>
                      <option value="LEASED">LEASED</option>
                      <option value="UNDER PURCHASE">UNDER PURCHASE</option>
                    </select>
                    <button
                      onClick={() => handleRemoveRow(r.id)}
                      className="p-1 text-slate-500 hover:text-red-400 rounded transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={r.capacityModel}
                      onChange={(e) => handleUpdateRow(r.id, 'capacityModel', e.target.value)}
                      placeholder="Capacity / Model"
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-[11px]"
                    />
                    <input
                      type="text"
                      value={r.plateNumber}
                      onChange={(e) => handleUpdateRow(r.id, 'plateNumber', e.target.value)}
                      placeholder="Plate / Engine No"
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-[11px] font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-6 gap-1 text-[10px] text-center">
                    {(['month1', 'month2', 'month3', 'month4', 'month5', 'month6'] as const).map((m, idx) => (
                      <div key={m}>
                        <span className="text-slate-500">M{idx + 1} %</span>
                        <input
                          type="number"
                          value={r[m]}
                          onChange={(e) => handleUpdateRow(r.id, m, Number(e.target.value))}
                          className="w-full mt-0.5 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center text-amber-400 font-mono"
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
            id="eup-print-sheet"
            className="w-[816px] min-h-[1248px] bg-white text-slate-900 p-10 shadow-2xl rounded-sm flex flex-col justify-between text-[11px] leading-tight"
            style={{ boxSizing: 'border-box' }}
          >
            <div>
              {/* Header */}
              <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
                <h1 className="text-base font-black tracking-wide uppercase text-slate-900">{companyName || 'CONTRACTOR / FIRM NAME'}</h1>
                <p className="text-[10px] text-slate-600 uppercase font-semibold">EQUIPMENT UTILIZATION SCHEDULE & DEPLOYMENT PLAN</p>
                <p className="text-[10px] text-blue-900 font-bold mt-0.5">Duration: {contractDuration}</p>
              </div>

              {/* Project Meta */}
              <div className="grid grid-cols-2 gap-4 mb-4 p-2.5 bg-slate-50 border border-slate-300 rounded text-[10.5px]">
                <div>
                  <p><strong>Project Name:</strong> {projectTitle || 'N/A'}</p>
                  <p><strong>Procuring Entity:</strong> {procuringEntity || 'Government Agency'}</p>
                </div>
                <div>
                  <p><strong>Contract / Ref No.:</strong> <span className="font-mono">{projectRefNo || 'N/A'}</span></p>
                  <p><strong>Total Major Equipment:</strong> {rows.length} Units Committed</p>
                </div>
              </div>

              {/* Schedule Table with Gantt / Utilization bars */}
              <table className="w-full border-collapse border border-slate-400 text-[10px] mb-4">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 text-center font-bold">
                    <th className="border border-slate-400 p-1 w-28 text-left">Equipment Description</th>
                    <th className="border border-slate-400 p-1 w-24">Capacity/Model</th>
                    <th className="border border-slate-400 p-1 w-16">Plate/ID</th>
                    <th className="border border-slate-400 p-1 w-16">Status</th>
                    <th className="border border-slate-400 p-1 w-8">M1</th>
                    <th className="border border-slate-400 p-1 w-8">M2</th>
                    <th className="border border-slate-400 p-1 w-8">M3</th>
                    <th className="border border-slate-400 p-1 w-8">M4</th>
                    <th className="border border-slate-400 p-1 w-8">M5</th>
                    <th className="border border-slate-400 p-1 w-8">M6</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="border border-slate-400 p-1 font-semibold text-slate-900">{r.equipmentName}</td>
                      <td className="border border-slate-400 p-1 text-center text-slate-700">{r.capacityModel}</td>
                      <td className="border border-slate-400 p-1 text-center font-mono text-[9px]">{r.plateNumber}</td>
                      <td className="border border-slate-400 p-1 text-center font-bold text-[8.5px] text-blue-900">{r.ownership}</td>
                      {[r.month1, r.month2, r.month3, r.month4, r.month5, r.month6].map((val, mIdx) => (
                        <td key={mIdx} className="border border-slate-400 p-1 text-center font-mono text-[9px]">
                          {val > 0 ? (
                            <div className="bg-amber-600 text-white font-bold rounded text-[8.5px] py-0.5">
                              {val}%
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-3 bg-slate-50 border border-slate-300 rounded text-[10px] space-y-1 text-slate-700">
                <p className="font-bold text-slate-900 uppercase">EQUIPMENT COMMITMENT UNDERTAKING:</p>
                <p>
                  We hereby commit that the equipment listed above shall be deployed and dedicated to the project in accordance with the specified utilization schedule. All units are maintained in prime mechanical condition with complete valid registration and calibration documents.
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

export default function EupModal(props: EupModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] h-[94vh] flex flex-col">
        <VaultErrorBoundary>
          <EupModalContent {...props} />
        </VaultErrorBoundary>
      </div>
    </div>
  );
}

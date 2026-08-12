import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, ChevronDown, ChevronUp, Download, HardHat, Layers, PackageCheck, Plus, Printer, RotateCcw, Table, Trash2, Truck, Users, X } from 'lucide-react';
import { Tenant } from '../../../types';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import { generateAndDownloadThreeLayerPdf } from '../../../utils/pdfExportEngine';

export interface MaterialEstimateRow {
  id: string;
  itemNo: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

export interface LaborEstimateRow {
  id: string;
  itemNo: string;
  description: string;
  noOfWorkers: number;
  unit: string;
  noOfDays: number;
  dailyPrice: number;
}

export interface LogisticsEstimateRow {
  id: string;
  itemNo: string;
  description: string;
  noOfVehicles: number;
  unit: string;
  noOfDays: number;
  dailyRate: number;
}

export interface EquipmentEstimateRow {
  id: string;
  itemNo: string;
  description: string;
  unit: string;
  noOfDays: number;
  dailyPrice: number;
}

export interface DetailedEstimatesModalProps {
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose: () => void;
}

export const DetailedEstimatesModal: React.FC<DetailedEstimatesModalProps> = ({
  tenant,
  activeProjectRefNo,
  activeProjectTitle,
  activeProcuringEntity,
  onSaveAndComplete,
  onClose
}) => {
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState('');
  const [projectName, setProjectName] = useState(activeProjectTitle || '');
  const [ownerName, setOwnerName] = useState(activeProcuringEntity || '');
  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo || '');
  const [contractorName, setContractorName] = useState(tenant?.companyName || '');
  const [estimateDate, setEstimateDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'MATERIALS' | 'LABOR' | 'LOGISTICS' | 'EQUIPMENT'>('MATERIALS');
  const [materials, setMaterials] = useState<MaterialEstimateRow[]>([
    { id: 'm-1', itemNo: '1', description: 'Material A', unit: 'Unit', quantity: 1, unitPrice: 1000 }
  ]);
  const [labors, setLabors] = useState<LaborEstimateRow[]>([
    { id: 'l-1', itemNo: '1', description: 'Labor Crew', noOfWorkers: 1, unit: 'Person', noOfDays: 1, dailyPrice: 1000 }
  ]);
  const [logistics, setLogistics] = useState<LogisticsEstimateRow[]>([
    { id: 'lg-1', itemNo: '1', description: 'Logistics', noOfVehicles: 1, unit: 'Vehicle', noOfDays: 1, dailyRate: 1000 }
  ]);
  const [equipments, setEquipments] = useState<EquipmentEstimateRow[]>([
    { id: 'e-1', itemNo: '1', description: 'Equipment', unit: 'Unit', noOfDays: 1, dailyPrice: 1000 }
  ]);

  useEffect(() => {
    const list = getOpportunityProjects(tenant?.id);
    setOppProjects(list);

    if (activeProjectRefNo) {
      const match = list.find((p) => p.refNo === activeProjectRefNo);
      if (match) {
        setSelectedOppId(match.id);
        setProjectRefNo(match.refNo);
        setProjectName(match.title);
        setOwnerName(match.procuringEntity);
      } else {
        setProjectRefNo(activeProjectRefNo);
        if (activeProjectTitle) setProjectName(activeProjectTitle);
        if (activeProcuringEntity) setOwnerName(activeProcuringEntity);
      }
    } else if (list.length > 0) {
      const first = list[0];
      setSelectedOppId(first.id);
      setProjectRefNo(first.refNo);
      setProjectName(first.title);
      setOwnerName(first.procuringEntity);
    }
  }, [tenant?.id, activeProjectRefNo, activeProjectTitle, activeProcuringEntity]);

  useEffect(() => {
    if (tenant?.companyName) setContractorName(tenant.companyName);
  }, [tenant]);

  const handleSelectOpportunity = (oppId: string) => {
    setSelectedOppId(oppId);
    const found = oppProjects.find((p) => p.id === oppId || p.refNo === oppId);
    if (found) {
      setProjectRefNo(found.refNo);
      setProjectName(found.title);
      setOwnerName(found.procuringEntity);
    }
  };

  const totals = useMemo(() => {
    const materialTotal = materials.reduce((sum, row) => sum + (row.quantity || 0) * (row.unitPrice || 0), 0);
    const laborTotal = labors.reduce((sum, row) => sum + (row.noOfWorkers || 0) * (row.noOfDays || 0) * (row.dailyPrice || 0), 0);
    const logisticsTotal = logistics.reduce((sum, row) => sum + (row.noOfVehicles || 0) * (row.noOfDays || 0) * (row.dailyRate || 0), 0);
    const equipmentTotal = equipments.reduce((sum, row) => sum + (row.noOfDays || 0) * (row.dailyPrice || 0), 0);
    return { materialTotal, laborTotal, logisticsTotal, equipmentTotal, projectTotal: materialTotal + laborTotal + logisticsTotal + equipmentTotal };
  }, [materials, labors, logistics, equipments]);

  const updateMaterial = (id: string, field: keyof MaterialEstimateRow, value: number | string) => {
    setMaterials((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const updateLabor = (id: string, field: keyof LaborEstimateRow, value: number | string) => {
    setLabors((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const updateLogistics = (id: string, field: keyof LogisticsEstimateRow, value: number | string) => {
    setLogistics((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const updateEquipment = (id: string, field: keyof EquipmentEstimateRow, value: number | string) => {
    setEquipments((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const addMaterial = () => {
    setActiveTab('MATERIALS');
    setMaterials((prev) => [...prev, { id: `m-${Date.now()}`, itemNo: String(prev.length + 1), description: '', unit: 'Unit', quantity: 1, unitPrice: 0 }]);
  };

  const addLabor = () => {
    setActiveTab('LABOR');
    setLabors((prev) => [...prev, { id: `l-${Date.now()}`, itemNo: String(prev.length + 1), description: '', noOfWorkers: 1, unit: 'Person', noOfDays: 1, dailyPrice: 0 }]);
  };

  const addLogistics = () => {
    setActiveTab('LOGISTICS');
    setLogistics((prev) => [...prev, { id: `lg-${Date.now()}`, itemNo: String(prev.length + 1), description: '', noOfVehicles: 1, unit: 'Vehicle', noOfDays: 1, dailyRate: 0 }]);
  };

  const addEquipment = () => {
    setActiveTab('EQUIPMENT');
    setEquipments((prev) => [...prev, { id: `e-${Date.now()}`, itemNo: String(prev.length + 1), description: '', unit: 'Unit', noOfDays: 1, dailyPrice: 0 }]);
  };

  const removeMaterial = (id: string) => setMaterials((prev) => prev.filter((row) => row.id !== id));
  const removeLabor = (id: string) => setLabors((prev) => prev.filter((row) => row.id !== id));
  const removeLogistics = (id: string) => setLogistics((prev) => prev.filter((row) => row.id !== id));
  const removeEquipment = (id: string) => setEquipments((prev) => prev.filter((row) => row.id !== id));

  const handleExportPdf = async () => {
    const fileName = `${projectRefNo || 'PROJECT'}_Detailed_Estimates.pdf`;
    if (typeof document !== 'undefined') {
      const templateElems = document.querySelectorAll('.detailed-estimates-paper');
      if (templateElems.length > 0) {
        const elemArray = Array.from(templateElems) as HTMLElement[];
        await generateAndDownloadThreeLayerPdf(null, elemArray, undefined, fileName);
      }
    }
    onSaveAndComplete?.(undefined, fileName, projectRefNo, projectName);
  };

  const sectionTabs: Array<{ key: 'MATERIALS' | 'LABOR' | 'LOGISTICS' | 'EQUIPMENT'; label: string; icon: React.ReactNode }> = [
    { key: 'MATERIALS', label: 'Materials', icon: <PackageCheck className="h-4 w-4" /> },
    { key: 'LABOR', label: 'Labor', icon: <Users className="h-4 w-4" /> },
    { key: 'LOGISTICS', label: 'Logistics', icon: <Truck className="h-4 w-4" /> },
    { key: 'EQUIPMENT', label: 'Equipment', icon: <HardHat className="h-4 w-4" /> }
  ];

  const renderTable = () => {
    if (activeTab === 'MATERIALS') {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-100"><tr><th className="border border-slate-300 px-2 py-2">Item</th><th className="border border-slate-300 px-2 py-2">Description</th><th className="border border-slate-300 px-2 py-2">Unit</th><th className="border border-slate-300 px-2 py-2">Qty</th><th className="border border-slate-300 px-2 py-2">Unit Price</th><th className="border border-slate-300 px-2 py-2">Amount</th><th className="border border-slate-300 px-2 py-2">Action</th></tr></thead>
            <tbody>
              {materials.map((row) => (
                <tr key={row.id}>
                  <td className="border border-slate-300 px-2 py-2"><input value={row.itemNo} onChange={(e) => updateMaterial(row.id, 'itemNo', e.target.value)} className="w-12 rounded border border-slate-300 px-1 py-1" /></td>
                  <td className="border border-slate-300 px-2 py-2"><input value={row.description} onChange={(e) => updateMaterial(row.id, 'description', e.target.value)} className="w-64 rounded border border-slate-300 px-2 py-1" /></td>
                  <td className="border border-slate-300 px-2 py-2"><input value={row.unit} onChange={(e) => updateMaterial(row.id, 'unit', e.target.value)} className="w-20 rounded border border-slate-300 px-2 py-1" /></td>
                  <td className="border border-slate-300 px-2 py-2"><input type="number" value={row.quantity} onChange={(e) => updateMaterial(row.id, 'quantity', Number(e.target.value))} className="w-20 rounded border border-slate-300 px-2 py-1" /></td>
                  <td className="border border-slate-300 px-2 py-2"><input type="number" value={row.unitPrice} onChange={(e) => updateMaterial(row.id, 'unitPrice', Number(e.target.value))} className="w-24 rounded border border-slate-300 px-2 py-1" /></td>
                  <td className="border border-slate-300 px-2 py-2 text-right">₱{((row.quantity || 0) * (row.unitPrice || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="border border-slate-300 px-2 py-2"><button onClick={() => removeMaterial(row.id)} className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (activeTab === 'LABOR') {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-100"><tr><th className="border border-slate-300 px-2 py-2">Item</th><th className="border border-slate-300 px-2 py-2">Description</th><th className="border border-slate-300 px-2 py-2">Workers</th><th className="border border-slate-300 px-2 py-2">Unit</th><th className="border border-slate-300 px-2 py-2">Days</th><th className="border border-slate-300 px-2 py-2">Daily Price</th><th className="border border-slate-300 px-2 py-2">Action</th></tr></thead>
            <tbody>
              {labors.map((row) => (
                <tr key={row.id}>
                  <td className="border border-slate-300 px-2 py-2"><input value={row.itemNo} onChange={(e) => updateLabor(row.id, 'itemNo', e.target.value)} className="w-12 rounded border border-slate-300 px-1 py-1" /></td>
                  <td className="border border-slate-300 px-2 py-2"><input value={row.description} onChange={(e) => updateLabor(row.id, 'description', e.target.value)} className="w-64 rounded border border-slate-300 px-2 py-1" /></td>
                  <td className="border border-slate-300 px-2 py-2"><input type="number" value={row.noOfWorkers} onChange={(e) => updateLabor(row.id, 'noOfWorkers', Number(e.target.value))} className="w-20 rounded border border-slate-300 px-2 py-1" /></td>
                  <td className="border border-slate-300 px-2 py-2"><input value={row.unit} onChange={(e) => updateLabor(row.id, 'unit', e.target.value)} className="w-20 rounded border border-slate-300 px-2 py-1" /></td>
                  <td className="border border-slate-300 px-2 py-2"><input type="number" value={row.noOfDays} onChange={(e) => updateLabor(row.id, 'noOfDays', Number(e.target.value))} className="w-20 rounded border border-slate-300 px-2 py-1" /></td>
                  <td className="border border-slate-300 px-2 py-2"><input type="number" value={row.dailyPrice} onChange={(e) => updateLabor(row.id, 'dailyPrice', Number(e.target.value))} className="w-24 rounded border border-slate-300 px-2 py-1" /></td>
                  <td className="border border-slate-300 px-2 py-2"><button onClick={() => removeLabor(row.id)} className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (activeTab === 'LOGISTICS') {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-100"><tr><th className="border border-slate-300 px-2 py-2">Item</th><th className="border border-slate-300 px-2 py-2">Description</th><th className="border border-slate-300 px-2 py-2">Vehicles</th><th className="border border-slate-300 px-2 py-2">Unit</th><th className="border border-slate-300 px-2 py-2">Days</th><th className="border border-slate-300 px-2 py-2">Daily Rate</th><th className="border border-slate-300 px-2 py-2">Action</th></tr></thead>
            <tbody>
              {logistics.map((row) => (
                <tr key={row.id}>
                  <td className="border border-slate-300 px-2 py-2"><input value={row.itemNo} onChange={(e) => updateLogistics(row.id, 'itemNo', e.target.value)} className="w-12 rounded border border-slate-300 px-1 py-1" /></td>
                  <td className="border border-slate-300 px-2 py-2"><input value={row.description} onChange={(e) => updateLogistics(row.id, 'description', e.target.value)} className="w-64 rounded border border-slate-300 px-2 py-1" /></td>
                  <td className="border border-slate-300 px-2 py-2"><input type="number" value={row.noOfVehicles} onChange={(e) => updateLogistics(row.id, 'noOfVehicles', Number(e.target.value))} className="w-20 rounded border border-slate-300 px-2 py-1" /></td>
                  <td className="border border-slate-300 px-2 py-2"><input value={row.unit} onChange={(e) => updateLogistics(row.id, 'unit', e.target.value)} className="w-20 rounded border border-slate-300 px-2 py-1" /></td>
                  <td className="border border-slate-300 px-2 py-2"><input type="number" value={row.noOfDays} onChange={(e) => updateLogistics(row.id, 'noOfDays', Number(e.target.value))} className="w-20 rounded border border-slate-300 px-2 py-1" /></td>
                  <td className="border border-slate-300 px-2 py-2"><input type="number" value={row.dailyRate} onChange={(e) => updateLogistics(row.id, 'dailyRate', Number(e.target.value))} className="w-24 rounded border border-slate-300 px-2 py-1" /></td>
                  <td className="border border-slate-300 px-2 py-2"><button onClick={() => removeLogistics(row.id)} className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-100"><tr><th className="border border-slate-300 px-2 py-2">Item</th><th className="border border-slate-300 px-2 py-2">Description</th><th className="border border-slate-300 px-2 py-2">Unit</th><th className="border border-slate-300 px-2 py-2">Days</th><th className="border border-slate-300 px-2 py-2">Daily Price</th><th className="border border-slate-300 px-2 py-2">Action</th></tr></thead>
          <tbody>
            {equipments.map((row) => (
              <tr key={row.id}>
                <td className="border border-slate-300 px-2 py-2"><input value={row.itemNo} onChange={(e) => updateEquipment(row.id, 'itemNo', e.target.value)} className="w-12 rounded border border-slate-300 px-1 py-1" /></td>
                <td className="border border-slate-300 px-2 py-2"><input value={row.description} onChange={(e) => updateEquipment(row.id, 'description', e.target.value)} className="w-64 rounded border border-slate-300 px-2 py-1" /></td>
                <td className="border border-slate-300 px-2 py-2"><input value={row.unit} onChange={(e) => updateEquipment(row.id, 'unit', e.target.value)} className="w-20 rounded border border-slate-300 px-2 py-1" /></td>
                <td className="border border-slate-300 px-2 py-2"><input type="number" value={row.noOfDays} onChange={(e) => updateEquipment(row.id, 'noOfDays', Number(e.target.value))} className="w-20 rounded border border-slate-300 px-2 py-1" /></td>
                <td className="border border-slate-300 px-2 py-2"><input type="number" value={row.dailyPrice} onChange={(e) => updateEquipment(row.id, 'dailyPrice', Number(e.target.value))} className="w-24 rounded border border-slate-300 px-2 py-1" /></td>
                <td className="border border-slate-300 px-2 py-2"><button onClick={() => removeEquipment(row.id)} className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-7xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20"><Layers className="h-5 w-5" /></div>
            <div>
              <h3 className="text-base font-bold text-white">Detailed Estimates</h3>
              <p className="text-xs text-slate-400">Material, labor, logistics and equipment summary</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportPdf} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"><Download className="h-3.5 w-3.5" /> Export PDF</button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"><Printer className="h-3.5 w-3.5" /> Print</button>
            <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="grid gap-3 rounded-xl border border-slate-700 bg-slate-950/60 p-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Project Ref. No.</label>
              <input value={projectRefNo} onChange={(e) => setProjectRefNo(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Project Name</label>
              <input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Owner / Procuring Entity</label>
              <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Date</label>
              <input type="date" value={estimateDate} onChange={(e) => setEstimateDate(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
            </div>
          </div>

          {oppProjects.length > 0 && (
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
              <label className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Project from Opportunity Finder</label>
              <select value={selectedOppId} onChange={(e) => handleSelectOpportunity(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
                <option value="">Select project</option>
                {oppProjects.map((project) => (
                  <option key={project.id} value={project.id}>{project.title} ({project.refNo})</option>
                ))}
              </select>
            </div>
          )}

          <div className="detailed-estimates-paper overflow-hidden rounded-xl border border-slate-700 bg-white text-slate-900">
            <div className="grid gap-4 border-b border-slate-300 bg-slate-100 p-4 text-sm md:grid-cols-4">
              <div><strong>Project</strong><div>{projectName || '—'}</div></div>
              <div><strong>Project Ref. No.</strong><div>{projectRefNo || '—'}</div></div>
              <div><strong>Procuring Entity</strong><div>{ownerName || '—'}</div></div>
              <div><strong>Contractor</strong><div>{contractorName || '—'}</div></div>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-slate-300 bg-slate-50 p-3">
              {sectionTabs.map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${activeTab === tab.key ? 'border-blue-500 bg-blue-500/10 text-blue-300' : 'border-slate-300 bg-white text-slate-700'}`}>
                  {tab.icon} {tab.label}
                  {activeTab === tab.key ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>

            <div className="p-4">
              {renderTable()}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-300 bg-slate-100 p-4 text-sm font-semibold">
              <div className="inline-flex items-center gap-2"><RotateCcw className="h-4 w-4" /> Estimate date: {estimateDate}</div>
              <div className="text-right text-base">Project Total: <span className="font-bold">₱{totals.projectTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            </div>

            <div className="grid gap-3 bg-slate-50 p-4 text-sm md:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white p-3"><div className="text-slate-500">Materials</div><div className="font-semibold">₱{totals.materialTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
              <div className="rounded-lg border border-slate-200 bg-white p-3"><div className="text-slate-500">Labor</div><div className="font-semibold">₱{totals.laborTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
              <div className="rounded-lg border border-slate-200 bg-white p-3"><div className="text-slate-500">Logistics</div><div className="font-semibold">₱{totals.logisticsTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
              <div className="rounded-lg border border-slate-200 bg-white p-3"><div className="text-slate-500">Equipment</div><div className="font-semibold">₱{totals.equipmentTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
            </div>

            <div className="flex justify-between gap-3 border-t border-slate-300 p-4">
              <button onClick={addMaterial} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"><Plus className="h-4 w-4" /> Add Material</button>
              <button onClick={addLabor} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"><Plus className="h-4 w-4" /> Add Labor</button>
              <button onClick={addLogistics} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"><Plus className="h-4 w-4" /> Add Logistics</button>
              <button onClick={addEquipment} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"><Plus className="h-4 w-4" /> Add Equipment</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedEstimatesModal;

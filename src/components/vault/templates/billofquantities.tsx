import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, Download, Printer, Table, Trash2, X } from 'lucide-react';
import { Tenant } from '../../../types';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import { generateAndDownloadThreeLayerPdf } from '../../../utils/pdfExportEngine';

export interface BoqItemRow {
  id: string;
  itemNo: string;
  description: string;
  unit: string;
  quantity: number | string;
  unitPrice: number | string;
}

export interface BillOfQuantitiesModalProps {
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose: () => void;
}

export const BillOfQuantitiesModal: React.FC<BillOfQuantitiesModalProps> = ({
  tenant,
  activeProjectRefNo,
  activeProjectTitle,
  activeProcuringEntity,
  onSaveAndComplete,
  onClose
}) => {
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState('');
  const [projectTitle, setProjectTitle] = useState(activeProjectTitle || '');
  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo || '');
  const [procuringEntity, setProcuringEntity] = useState(activeProcuringEntity || '');
  const [companyName, setCompanyName] = useState(tenant?.companyName || '');
  const [boqRows, setBoqRows] = useState<BoqItemRow[]>([
    { id: 'boq-1', itemNo: '1', description: '', unit: 'Pcs', quantity: '', unitPrice: '' },
    { id: 'boq-2', itemNo: '2', description: '', unit: 'Pcs', quantity: '', unitPrice: '' },
    { id: 'boq-3', itemNo: '3', description: '', unit: 'Lot', quantity: '', unitPrice: '' }
  ]);

  useEffect(() => {
    const list = getOpportunityProjects(tenant?.id);
    setOppProjects(list);

    if (activeProjectRefNo) {
      const match = list.find((p) => p.refNo === activeProjectRefNo);
      if (match) {
        setSelectedOppId(match.id);
        setProjectRefNo(match.refNo);
        setProjectTitle(match.title);
        setProcuringEntity(match.procuringEntity);
      } else {
        setProjectRefNo(activeProjectRefNo);
        if (activeProjectTitle) setProjectTitle(activeProjectTitle);
        if (activeProcuringEntity) setProcuringEntity(activeProcuringEntity);
      }
    } else if (list.length > 0) {
      const first = list[0];
      setSelectedOppId(first.id);
      setProjectRefNo(first.refNo);
      setProjectTitle(first.title);
      setProcuringEntity(first.procuringEntity);
    }
  }, [tenant?.id, activeProjectRefNo, activeProjectTitle, activeProcuringEntity]);

  useEffect(() => {
    if (tenant?.companyName) setCompanyName(tenant.companyName);
  }, [tenant]);

  const handleAddRow = () => {
    setBoqRows((prev) => [
      ...prev,
      {
        id: `boq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        itemNo: String(prev.length + 1),
        description: '',
        unit: 'Pcs',
        quantity: '',
        unitPrice: ''
      }
    ]);
  };

  const handleRemoveRow = (id: string) => {
    setBoqRows((prev) => prev.filter((row) => row.id !== id).map((row, idx) => ({ ...row, itemNo: String(idx + 1) })));
  };

  const handleUpdateRow = (id: string, field: keyof BoqItemRow, value: string | number) => {
    setBoqRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const parseNum = (value: number | string): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const cleaned = String(value).replace(/[^0-9.-]+/g, '');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const grandTotal = useMemo(
    () => boqRows.reduce((sum, row) => sum + parseNum(row.quantity) * parseNum(row.unitPrice), 0),
    [boqRows]
  );

  const handleSelectOpportunity = (oppId: string) => {
    setSelectedOppId(oppId);
    const found = oppProjects.find((p) => p.id === oppId || p.refNo === oppId);
    if (found) {
      setProjectRefNo(found.refNo);
      setProjectTitle(found.title);
      setProcuringEntity(found.procuringEntity);
    }
  };

  const handleExportPdf = async () => {
    const fileName = `${projectRefNo || 'PROJECT'}_Bill_of_Quantities.pdf`;
    if (typeof document !== 'undefined') {
      const templateElems = document.querySelectorAll('.boq-paper');
      if (templateElems.length > 0) {
        const elemArray = Array.from(templateElems) as HTMLElement[];
        await generateAndDownloadThreeLayerPdf(null, elemArray, undefined, fileName);
      }
    }
    onSaveAndComplete?.(undefined, fileName, projectRefNo, projectTitle);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-400 border border-blue-500/20"><Table className="h-5 w-5" /></div>
            <div>
              <h3 className="text-base font-bold text-white">Bill of Quantities (BOQ)</h3>
              <p className="text-xs text-slate-400">Financial Envelope Component</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportPdf} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">
              <Download className="h-3.5 w-3.5" /> Export PDF
            </button>
            <button onClick={handlePrint} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500">
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
            <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="grid gap-3 rounded-xl border border-slate-700 bg-slate-950/60 p-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Project Ref. No.</label>
              <input
                value={projectRefNo}
                onChange={(e) => setProjectRefNo(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Project</label>
              <input
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Procuring Entity</label>
              <input
                value={procuringEntity}
                onChange={(e) => setProcuringEntity(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Company</label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {oppProjects.length > 0 && (
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
              <label className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Project from Opportunity Finder</label>
              <select
                value={selectedOppId}
                onChange={(e) => handleSelectOpportunity(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="">Select project</option>
                {oppProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title} ({project.refNo})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="boq-paper overflow-hidden rounded-xl border border-slate-700 bg-white text-slate-900">
            <div className="grid gap-4 border-b border-slate-300 bg-slate-100 p-4 text-sm md:grid-cols-4">
              <div><strong>Project Ref. No.</strong><div>{projectRefNo || '—'}</div></div>
              <div><strong>Project</strong><div>{projectTitle || '—'}</div></div>
              <div><strong>Procuring Entity</strong><div>{procuringEntity || '—'}</div></div>
              <div><strong>Company</strong><div>{companyName || '—'}</div></div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-slate-100 text-left">
                  <tr>
                    <th className="border border-slate-300 px-2 py-2">Item</th>
                    <th className="border border-slate-300 px-2 py-2">Description</th>
                    <th className="border border-slate-300 px-2 py-2">Unit</th>
                    <th className="border border-slate-300 px-2 py-2">Qty</th>
                    <th className="border border-slate-300 px-2 py-2">Unit Price</th>
                    <th className="border border-slate-300 px-2 py-2">Amount</th>
                    <th className="border border-slate-300 px-2 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {boqRows.map((row) => (
                    <tr key={row.id}>
                      <td className="border border-slate-300 px-2 py-2"><input value={row.itemNo} onChange={(e) => handleUpdateRow(row.id, 'itemNo', e.target.value)} className="w-12 rounded border border-slate-300 px-1 py-1" /></td>
                      <td className="border border-slate-300 px-2 py-2"><input value={row.description} onChange={(e) => handleUpdateRow(row.id, 'description', e.target.value)} className="w-64 rounded border border-slate-300 px-2 py-1" /></td>
                      <td className="border border-slate-300 px-2 py-2"><input value={row.unit} onChange={(e) => handleUpdateRow(row.id, 'unit', e.target.value)} className="w-20 rounded border border-slate-300 px-2 py-1" /></td>
                      <td className="border border-slate-300 px-2 py-2"><input value={row.quantity} onChange={(e) => handleUpdateRow(row.id, 'quantity', e.target.value)} className="w-20 rounded border border-slate-300 px-2 py-1" /></td>
                      <td className="border border-slate-300 px-2 py-2"><input value={row.unitPrice} onChange={(e) => handleUpdateRow(row.id, 'unitPrice', e.target.value)} className="w-24 rounded border border-slate-300 px-2 py-1" /></td>
                      <td className="border border-slate-300 px-2 py-2 text-right">{(parseNum(row.quantity) * parseNum(row.unitPrice)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="border border-slate-300 px-2 py-2 text-center">
                        <button onClick={() => handleRemoveRow(row.id)} className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-300 bg-slate-100 p-4 text-sm font-semibold">
              <button onClick={handleAddRow} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 hover:bg-slate-200">
                <Calculator className="h-4 w-4" /> Add Row
              </button>
              <div className="text-right text-base">Total: <span className="font-bold">₱{grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillOfQuantitiesModal;

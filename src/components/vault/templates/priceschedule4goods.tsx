import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, Download, Plus, Printer, RotateCcw, Table, Trash2, X } from 'lucide-react';
import { Tenant } from '../../../types';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import { generateAndDownloadThreeLayerPdf } from '../../../utils/pdfExportEngine';

export interface PriceScheduleItemRow {
  id: string;
  itemNo: string;
  description: string;
  countryOfOrigin: string;
  quantity: number;
  unitPriceExw: number;
  transportationCost: number;
  salesTaxes: number;
  incidentalServicesCost: number;
}

export interface PriceSchedule4GoodsModalProps {
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose: () => void;
}

export const PriceSchedule4GoodsModal: React.FC<PriceSchedule4GoodsModalProps> = ({
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
  const [bidderName, setBidderName] = useState(tenant?.companyName || '');
  const [dateSubmitted, setDateSubmitted] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<PriceScheduleItemRow[]>([
    { id: 'row-1', itemNo: '1', description: 'Item sample', countryOfOrigin: 'Philippines', quantity: 1, unitPriceExw: 1000, transportationCost: 100, salesTaxes: 100, incidentalServicesCost: 50 }
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
    if (tenant?.companyName) setBidderName(tenant.companyName);
  }, [tenant]);

  const handleSelectOpportunity = (oppId: string) => {
    setSelectedOppId(oppId);
    const found = oppProjects.find((p) => p.id === oppId || p.refNo === oppId);
    if (found) {
      setProjectRefNo(found.refNo);
      setProjectTitle(found.title);
      setProcuringEntity(found.procuringEntity);
    }
  };

  const updateItem = (id: string, field: keyof PriceScheduleItemRow, value: number | string) => {
    setItems((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const addItem = () => {
    setItems((prev) => [...prev, {
      id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      itemNo: String(prev.length + 1),
      description: '',
      countryOfOrigin: 'Philippines',
      quantity: 1,
      unitPriceExw: 0,
      transportationCost: 0,
      salesTaxes: 0,
      incidentalServicesCost: 0
    }]);
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((row) => row.id !== id));

  const totalProjectCost = useMemo(
    () => items.reduce((sum, row) => sum + ((row.quantity || 0) * ((row.unitPriceExw || 0) + (row.transportationCost || 0) + (row.salesTaxes || 0) + (row.incidentalServicesCost || 0))), 0),
    [items]
  );

  const handleExportPdf = async () => {
    const fileName = `${projectRefNo || 'PROJECT'}_Price_Schedule_for_Goods.pdf`;
    if (typeof document !== 'undefined') {
      const templateElems = document.querySelectorAll('.priceschedule-paper');
      if (templateElems.length > 0) {
        const elemArray = Array.from(templateElems) as HTMLElement[];
        await generateAndDownloadThreeLayerPdf(null, elemArray, undefined, fileName);
      }
    }
    onSaveAndComplete?.(undefined, fileName, projectRefNo, projectTitle);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-7xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-400 border border-amber-500/20"><Table className="h-5 w-5" /></div>
            <div>
              <h3 className="text-base font-bold text-white">Price Schedule For Goods</h3>
              <p className="text-xs text-slate-400">Competitive goods pricing sheet</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportPdf} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"><Download className="h-3.5 w-3.5" /> Export PDF</button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-500"><Printer className="h-3.5 w-3.5" /> Print</button>
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
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Project Title</label>
              <input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Procuring Entity</label>
              <input value={procuringEntity} onChange={(e) => setProcuringEntity(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Bidder</label>
              <input value={bidderName} onChange={(e) => setBidderName(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
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

          <div className="priceschedule-paper overflow-hidden rounded-xl border border-slate-700 bg-white text-slate-900">
            <div className="grid gap-4 border-b border-slate-300 bg-slate-100 p-4 text-sm md:grid-cols-4">
              <div><strong>Project</strong><div>{projectTitle || '—'}</div></div>
              <div><strong>Ref. No.</strong><div>{projectRefNo || '—'}</div></div>
              <div><strong>Procuring Entity</strong><div>{procuringEntity || '—'}</div></div>
              <div><strong>Bidder</strong><div>{bidderName || '—'}</div></div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border border-slate-300 px-2 py-2">Item</th>
                    <th className="border border-slate-300 px-2 py-2">Description</th>
                    <th className="border border-slate-300 px-2 py-2">Country</th>
                    <th className="border border-slate-300 px-2 py-2">Qty</th>
                    <th className="border border-slate-300 px-2 py-2">EXW</th>
                    <th className="border border-slate-300 px-2 py-2">Transport</th>
                    <th className="border border-slate-300 px-2 py-2">Taxes</th>
                    <th className="border border-slate-300 px-2 py-2">Services</th>
                    <th className="border border-slate-300 px-2 py-2">Total</th>
                    <th className="border border-slate-300 px-2 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const total = ((row.quantity || 0) * ((row.unitPriceExw || 0) + (row.transportationCost || 0) + (row.salesTaxes || 0) + (row.incidentalServicesCost || 0)));
                    return (
                      <tr key={row.id}>
                        <td className="border border-slate-300 px-2 py-2"><input value={row.itemNo} onChange={(e) => updateItem(row.id, 'itemNo', e.target.value)} className="w-12 rounded border border-slate-300 px-1 py-1" /></td>
                        <td className="border border-slate-300 px-2 py-2"><input value={row.description} onChange={(e) => updateItem(row.id, 'description', e.target.value)} className="w-56 rounded border border-slate-300 px-2 py-1" /></td>
                        <td className="border border-slate-300 px-2 py-2"><input value={row.countryOfOrigin} onChange={(e) => updateItem(row.id, 'countryOfOrigin', e.target.value)} className="w-24 rounded border border-slate-300 px-2 py-1" /></td>
                        <td className="border border-slate-300 px-2 py-2"><input type="number" value={row.quantity} onChange={(e) => updateItem(row.id, 'quantity', Number(e.target.value))} className="w-20 rounded border border-slate-300 px-2 py-1" /></td>
                        <td className="border border-slate-300 px-2 py-2"><input type="number" value={row.unitPriceExw} onChange={(e) => updateItem(row.id, 'unitPriceExw', Number(e.target.value))} className="w-24 rounded border border-slate-300 px-2 py-1" /></td>
                        <td className="border border-slate-300 px-2 py-2"><input type="number" value={row.transportationCost} onChange={(e) => updateItem(row.id, 'transportationCost', Number(e.target.value))} className="w-24 rounded border border-slate-300 px-2 py-1" /></td>
                        <td className="border border-slate-300 px-2 py-2"><input type="number" value={row.salesTaxes} onChange={(e) => updateItem(row.id, 'salesTaxes', Number(e.target.value))} className="w-24 rounded border border-slate-300 px-2 py-1" /></td>
                        <td className="border border-slate-300 px-2 py-2"><input type="number" value={row.incidentalServicesCost} onChange={(e) => updateItem(row.id, 'incidentalServicesCost', Number(e.target.value))} className="w-24 rounded border border-slate-300 px-2 py-1" /></td>
                        <td className="border border-slate-300 px-2 py-2 text-right">₱{total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="border border-slate-300 px-2 py-2"><button onClick={() => removeItem(row.id)} className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-300 bg-slate-100 p-4 text-sm font-semibold">
              <button onClick={addItem} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 hover:bg-slate-200"><Plus className="h-4 w-4" /> Add Item</button>
              <div className="text-right text-base">Total: <span className="font-bold">₱{totalProjectCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-300 p-4 text-sm">
              <div className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2"><RotateCcw className="h-4 w-4" /> {dateSubmitted}</div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2"><Calculator className="h-4 w-4" /> Estimated project amount</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceSchedule4GoodsModal;

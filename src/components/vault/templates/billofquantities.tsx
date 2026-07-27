import React, { useState, useEffect } from 'react';
import { Tenant } from '../../../types';
import { generateAndDownloadThreeLayerPdf } from '../../../utils/pdfExportEngine';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import DocumentQrCode from '../../common/DocumentQrCode';
import {
  X,
  Printer,
  Download,
  Building2,
  Plus,
  Trash2,
  Table,
  Calculator,
  RefreshCw
} from 'lucide-react';

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
  const todayStr = new Date().toISOString().split('T')[0];

  // Opportunity Projects Auto-Fill Integration
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  // Header Parameters
  const [projectTitle, setProjectTitle] = useState(activeProjectTitle || '');
  const [contractLocation, setContractLocation] = useState(activeProcuringEntity || '');
  const [companyName, setCompanyName] = useState(tenant?.companyName || '');
  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo || '');
  const [totalLabel, setTotalLabel] = useState('Total Calculated Bid Price / Materials Cost');

  // BOQ Table Items State (Default clean slate 3 editable rows)
  const [boqRows, setBoqRows] = useState<BoqItemRow[]>([
    { id: 'boq-1', itemNo: '1', description: '', unit: 'Pcs', quantity: '', unitPrice: '' },
    { id: 'boq-2', itemNo: '2', description: '', unit: 'Pcs', quantity: '', unitPrice: '' },
    { id: 'boq-3', itemNo: '3', description: '', unit: 'Lot', quantity: '', unitPrice: '' }
  ]);

  useEffect(() => {
    const list = getOpportunityProjects(tenant?.id);
    setOppProjects(list);

    if (activeProjectRefNo) {
      const match = list.find(p => p.refNo === activeProjectRefNo);
      if (match) {
        setSelectedOppId(match.id);
        setProjectRefNo(match.refNo);
        setProjectTitle(match.title);
        setContractLocation(match.procuringEntity);
      } else {
        setProjectRefNo(activeProjectRefNo);
        if (activeProjectTitle) setProjectTitle(activeProjectTitle);
        if (activeProcuringEntity) setContractLocation(activeProcuringEntity);
      }
    } else if (list.length > 0) {
      const first = list[0];
      setSelectedOppId(first.id);
      setProjectRefNo(first.refNo);
      setProjectTitle(first.title);
      setContractLocation(first.procuringEntity);
    }
  }, [tenant?.id, activeProjectRefNo, activeProjectTitle, activeProcuringEntity]);

  useEffect(() => {
    if (tenant?.companyName) {
      setCompanyName(tenant.companyName);
    }
  }, [tenant]);

  const handleSelectOpportunity = (oppId: string) => {
    setSelectedOppId(oppId);
    const found = oppProjects.find(p => p.id === oppId || p.refNo === oppId);
    if (found) {
      setProjectRefNo(found.refNo);
      setProjectTitle(found.title);
      setContractLocation(found.procuringEntity);
    }
  };

  const handleAddRow = () => {
    setBoqRows(prev => [
      ...prev,
      {
        id: `boq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        itemNo: String(prev.length + 1),
        description: '',
        unit: 'Pcs',
        quantity: '',
        unitPrice: ''
      }
    ]);
  };

  const handleRemoveRow = (id: string) => {
    setBoqRows(prev => {
      const filtered = prev.filter(r => r.id !== id);
      return filtered.map((r, idx) => ({ ...r, itemNo: String(idx + 1) }));
    });
  };

  const handleUpdateRow = (id: string, field: keyof BoqItemRow, value: any) => {
    setBoqRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleClearAllRows = () => {
    setBoqRows([
      { id: `boq-${Date.now()}-1`, itemNo: '1', description: '', unit: 'Pcs', quantity: '', unitPrice: '' }
    ]);
  };

  // Helper to parse numbers safely
  const parseNum = (val: number | string): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.-]+/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Calculate row total amount
  const calculateRowAmount = (qty: number | string, unitPrice: number | string): number => {
    const q = parseNum(qty);
    const p = parseNum(unitPrice);
    return q * p;
  };

  // Compute Grand Total Amount
  const grandTotal = boqRows.reduce((sum, row) => {
    return sum + calculateRowAmount(row.quantity, row.unitPrice);
  }, 0);

  const handleExportPdf = async () => {
    const fileName = `${projectRefNo || 'PROJECT'}_Financial_Envelope_Bill_of_Quantities.pdf`;
    const templateElems = document.querySelectorAll('.boq-paper');
    if (templateElems.length > 0) {
      const elemArray = Array.from(templateElems) as HTMLElement[];
      await generateAndDownloadThreeLayerPdf(null, elemArray, undefined, fileName);
      if (onSaveAndComplete) {
        onSaveAndComplete(undefined, fileName, projectRefNo, projectTitle);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      
      {/* PORTRAIT LEGAL 8.5" x 13" PRINT STYLESHEET */}
      <style>{`
        @media print {
          @page {
            size: 8.5in 13in portrait;
            margin: 0mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .boq-paper {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0.6in !important;
            width: 8.5in !important;
            min-h: 13in !important;
            page-break-after: always !important;
          }
          .boq-paper:last-child {
            page-break-after: avoid !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col">
        
        {/* Top Header Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight flex items-center gap-2">
                <span>Bill of Quantities (BOQ) Schedule</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                  Financial Envelope Component
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Legal 8.5" × 13"
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Exact statutory Bill of Quantities table grid for Goods, Works & Technical Equipment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition border border-slate-700 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Legal 8.5"×13"</span>
            </button>

            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form & Paper Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 space-y-6">

          {/* Interactive Header & Table Editor Controls */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 no-print">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <label className="block text-xs font-mono font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>Bill of Quantities Header & Item Entry Editor:</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Item Row</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearAllRows}
                  className="px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition flex items-center gap-1"
                  title="Clear rows to clean slate"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clean Slate</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="col-span-full">
                <label className="block text-slate-300 font-mono mb-1 font-bold">
                  Select Active Bidding Opportunity from Opportunity Finder:
                </label>
                <select
                  value={selectedOppId}
                  onChange={(e) => handleSelectOpportunity(e.target.value)}
                  className="w-full bg-slate-950 border border-blue-500/60 rounded-xl px-3.5 py-2 text-white font-mono text-xs font-bold focus:outline-none focus:border-blue-400 shadow-inner cursor-pointer"
                >
                  <option value="">-- Custom Inputs --</option>
                  {oppProjects.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.refNo}] {p.title} — {p.procuringEntity} ({p.abc})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Name of Contract / Project Title <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g. PROCUREMENT/INSTALLATION OF CCTV CAMERAS..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Location of Contract <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={contractLocation}
                  onChange={(e) => setContractLocation(e.target.value)}
                  placeholder="e.g. Barangay Bayog, Los Baños, Laguna"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Name of Bidder / Enterprise <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Quantum Cloud Corporation"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Project ID / Reference No. <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={projectRefNo}
                  onChange={(e) => setProjectRefNo(e.target.value)}
                  placeholder="e.g. 12659334"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono font-bold"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 font-mono mb-1">Total Amount Summary Label</label>
                <input
                  type="text"
                  value={totalLabel}
                  onChange={(e) => setTotalLabel(e.target.value)}
                  placeholder="Materials cost / Total Bid Amount"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono"
                />
              </div>

            </div>

            {/* Line Items Entry Table */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-300">Bill of Quantities Line Items ({boqRows.length} Rows):</span>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  Total Calculated Amount: ₱ {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="overflow-x-auto max-h-[300px] overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 p-2 space-y-2">
                {boqRows.map((row, idx) => {
                  const rowAmount = calculateRowAmount(row.quantity, row.unitPrice);

                  return (
                    <div key={row.id} className="grid grid-cols-12 gap-2 items-center bg-slate-900/90 p-2 rounded-lg border border-slate-800 text-xs">
                      <div className="col-span-1">
                        <span className="text-[10px] font-mono text-slate-500 block">Item #</span>
                        <input
                          type="text"
                          value={row.itemNo}
                          onChange={(e) => handleUpdateRow(row.id, 'itemNo', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-center font-mono font-bold"
                        />
                      </div>

                      <div className="col-span-5">
                        <span className="text-[10px] font-mono text-slate-500 block">Description</span>
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => handleUpdateRow(row.id, 'description', e.target.value)}
                          placeholder="Enter item description specification..."
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white"
                        />
                      </div>

                      <div className="col-span-1">
                        <span className="text-[10px] font-mono text-slate-500 block text-center">Unit</span>
                        <input
                          type="text"
                          value={row.unit}
                          onChange={(e) => handleUpdateRow(row.id, 'unit', e.target.value)}
                          placeholder="Pcs/Lot"
                          className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-white text-center font-mono"
                        />
                      </div>

                      <div className="col-span-1">
                        <span className="text-[10px] font-mono text-slate-500 block text-center">Qty</span>
                        <input
                          type="text"
                          value={row.quantity}
                          onChange={(e) => handleUpdateRow(row.id, 'quantity', e.target.value)}
                          placeholder="1"
                          className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-white text-center font-mono"
                        />
                      </div>

                      <div className="col-span-2">
                        <span className="text-[10px] font-mono text-slate-500 block text-right">Unit Price (₱)</span>
                        <input
                          type="text"
                          value={row.unitPrice}
                          onChange={(e) => handleUpdateRow(row.id, 'unitPrice', e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-right font-mono"
                        />
                      </div>

                      <div className="col-span-2 flex items-center justify-between gap-1 pl-1">
                        <div className="text-right flex-1 truncate">
                          <span className="text-[10px] font-mono text-slate-500 block">Amount (₱)</span>
                          <span className="font-mono font-bold text-emerald-400 text-xs">
                            {rowAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        {boqRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="p-1 rounded text-red-400 hover:bg-red-500/20 transition shrink-0"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* EXACT TEMPLATE STRUCTURE LEGAL PAPER LAYOUT PREVIEW */}
          <div className="space-y-8 flex flex-col items-center">

            <div className="boq-paper single-page-paper w-[8.5in] min-h-[13in] bg-white text-slate-950 p-[0.6in] shadow-2xl font-sans text-[10pt] leading-normal flex flex-col justify-between mx-auto border-2 border-slate-950">
              <div className="space-y-0">
                
                {/* EXACT TABLE GRID STRUCTURE MATCHING USER TEMPLATE IMAGE */}
                <table className="w-full border-collapse border-2 border-slate-950 text-slate-950 font-sans">
                  <tbody>
                    
                    {/* Row 1: Bill of Quantities (Centered, Bold, Underlined) */}
                    <tr>
                      <td colSpan={6} className="border border-slate-950 p-2 text-center font-bold text-lg underline uppercase">
                        Bill of Quantities
                      </td>
                    </tr>

                    {/* Row 2: Name of Contract & Location of Contract */}
                    <tr>
                      <td colSpan={6} className="border border-slate-950 p-2 text-left font-bold italic text-[9.5pt]">
                        Name: <span className="not-italic uppercase">{projectTitle || '____________________________________________________________________'}</span>
                        {contractLocation && (
                          <span className="ml-4 font-bold italic">
                            Location of Contract: <span className="not-italic uppercase">{contractLocation}</span>
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Row 3: Name of Bidder (Left) & Project ID No. (Right) */}
                    <tr>
                      <td colSpan={4} className="border border-slate-950 p-2 text-left text-[11pt]">
                        <span className="font-semibold">Name of Bidder: </span>
                        <span className="font-bold text-lg uppercase">{companyName || '________________________________________'}</span>
                      </td>
                      <td colSpan={2} className="border border-slate-950 p-2 text-left text-[10.5pt]">
                        <span className="font-medium">Project ID No. </span>
                        <span className="font-bold text-base font-mono pl-2">{projectRefNo || '____________________'}</span>
                      </td>
                    </tr>

                    {/* Row 4: Column Number Headers (1, 2, 3, 4, 5, 6) */}
                    <tr className="text-center font-semibold border-b border-slate-950 text-[9.5pt]">
                      <td className="border border-slate-950 py-1 px-2 w-12">1</td>
                      <td className="border border-slate-950 py-1 px-4">2</td>
                      <td className="border border-slate-950 py-1 px-2 w-14">3</td>
                      <td className="border border-slate-950 py-1 px-2 w-12">4</td>
                      <td className="border border-slate-950 py-1 px-3 w-32">5</td>
                      <td className="border border-slate-950 py-1 px-3 w-36">6</td>
                    </tr>

                    {/* Row 5: Column Title Headers (Item, Description, UNIT, QTY, UNIT PRICE (Pesos), AMOUNT (Pesos)) */}
                    <tr className="text-center font-bold border-b-2 border-slate-950 text-[9pt] uppercase">
                      <td className="border border-slate-950 p-1.5 w-12 italic">Item</td>
                      <td className="border border-slate-950 p-1.5 italic">Description</td>
                      <td className="border border-slate-950 p-1.5 w-14">UNIT</td>
                      <td className="border border-slate-950 p-1.5 w-12">QTY</td>
                      <td className="border border-slate-950 p-1.5 w-32">
                        <div>UNIT PRICE</div>
                        <div className="text-[8pt] font-serif lowercase italic text-slate-700">(Pesos)</div>
                      </td>
                      <td className="border border-slate-950 p-1.5 w-36">
                        <div>AMOUNT</div>
                        <div className="text-[8pt] font-serif italic text-slate-700">(Pesos)</div>
                      </td>
                    </tr>

                    {/* BOQ Data Rows */}
                    {boqRows.map((row, idx) => {
                      const amount = calculateRowAmount(row.quantity, row.unitPrice);

                      return (
                        <tr key={row.id} className="text-[9.5pt] border-b border-slate-400 hover:bg-slate-50 transition">
                          <td className="border border-slate-950 py-1.5 px-2 text-center font-mono font-semibold">
                            {row.itemNo || idx + 1}
                          </td>
                          <td className="border border-slate-950 py-1.5 px-3 text-left font-normal leading-snug">
                            {row.description || <span className="text-slate-300 italic">____________________</span>}
                          </td>
                          <td className="border border-slate-950 py-1.5 px-2 text-center font-mono">
                            {row.unit || 'Pcs'}
                          </td>
                          <td className="border border-slate-950 py-1.5 px-2 text-center font-mono">
                            {row.quantity !== '' ? row.quantity : ''}
                          </td>
                          <td className="border border-slate-950 py-1.5 px-3 text-right font-mono">
                            {parseNum(row.unitPrice) > 0
                              ? parseNum(row.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : ''}
                          </td>
                          <td className="border border-slate-950 py-1.5 px-3 text-right font-mono font-semibold">
                            {amount > 0
                              ? amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : ''}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Bottom Summary Row (Matching exact red/black summary position from user template image) */}
                    <tr className="border-t-2 border-slate-950 text-[10pt] font-bold">
                      <td colSpan={4} className="border-none py-2 px-3 text-right text-red-600 font-semibold italic">
                        {totalLabel || 'Materials cost'}
                      </td>
                      <td colSpan={2} className="border-2 border-slate-950 py-2 px-3 text-right font-mono text-base font-bold bg-slate-50 text-slate-950">
                        ₱ {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>

                  </tbody>
                </table>

              </div>

              {/* Document Footer */}
              <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[8.5pt] font-mono text-slate-700">
                <div className="flex items-center gap-3">
                  <DocumentQrCode
                    details={{
                      companyName: companyName || 'Bidding Entity',
                      documentName: 'Bill of Quantities Schedule',
                      documentNumber: `FIN-BOQ-${projectRefNo || 'SCHED'}`,
                      projectTitle: projectTitle,
                      projectRefNo: projectRefNo,
                      procuringEntity: contractLocation,
                      dateTimeSubmitted: new Date().toLocaleString(),
                      documentCategory: 'Financial Documents',
                      generatedBy: companyName || 'Bidding Entity'
                    }}
                    size={45}
                    showCaption={false}
                  />
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-950 uppercase">{companyName || 'BIDDING ENTITY'}</p>
                    <p>PROJECT: <strong>{projectTitle || 'N/A'}</strong></p>
                    <p>REF NO: <strong>{projectRefNo || 'N/A'}</strong> • LOCATION: <strong>{contractLocation || 'N/A'}</strong></p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold font-mono">Page 1 of 1</span>
                  <p className="text-[7.5pt] text-slate-500">Statutory Bill of Quantities Financial Schedule</p>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/95 sticky bottom-0 z-10 shrink-0 no-print">
          <div className="text-xs font-mono text-slate-400">
            Total BOQ Calculated Amount: <span className="text-emerald-400 font-bold font-mono text-sm">₱ {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleExportPdf}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg transition flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Save & Complete Bill of Quantities</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// Default export alias
export default BillOfQuantitiesModal;

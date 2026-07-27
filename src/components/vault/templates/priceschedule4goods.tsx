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
  RotateCcw,
  Calculator
} from 'lucide-react';

export interface PriceScheduleItemRow {
  id: string;
  itemNo: string;
  description: string;
  countryOfOrigin: string;
  quantity: number;
  unitPriceExw: number; // Col 5
  transportationCost: number; // Col 6
  salesTaxes: number; // Col 7
  incidentalServicesCost: number; // Col 8
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
  const todayStr = new Date().toISOString().split('T')[0];

  // Opportunity Projects Auto-Fill Integration
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  // Header Parameters
  const [projectTitle, setProjectTitle] = useState(activeProjectTitle || 'Procurement and Installation of CCTV');
  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo || '01-INFRA-2026');
  const [procuringEntity, setProcuringEntity] = useState(activeProcuringEntity || '');
  const [bidderName, setBidderName] = useState(tenant?.companyName || '');
  const [signatoryName, setSignatoryName] = useState(tenant?.authorizedSignatory?.name || '');
  const [signatoryTitle, setSignatoryTitle] = useState(tenant?.authorizedSignatory?.title || '');
  const [dateSubmitted, setDateSubmitted] = useState(todayStr);

  // Dynamic Price Schedule Item Rows (Columns 1-10)
  const [items, setItems] = useState<PriceScheduleItemRow[]>([
    {
      id: 'row-1',
      itemNo: '1',
      description: 'High-Definition IP Security Camera (Outdoor Bullet Type)',
      countryOfOrigin: 'Philippines',
      quantity: 8,
      unitPriceExw: 12500,
      transportationCost: 350,
      salesTaxes: 1500,
      incidentalServicesCost: 650
    },
    {
      id: 'row-2',
      itemNo: '2',
      description: '32-Channel Network Video Recorder (NVR) with 16TB Enterprise Storage',
      countryOfOrigin: 'Philippines',
      quantity: 1,
      unitPriceExw: 85000,
      transportationCost: 1200,
      salesTaxes: 10200,
      incidentalServicesCost: 4500
    },
    {
      id: 'row-3',
      itemNo: '3',
      description: '24-Port Gigabit PoE+ Managed Network Switch',
      countryOfOrigin: 'Philippines',
      quantity: 2,
      unitPriceExw: 24000,
      transportationCost: 500,
      salesTaxes: 2880,
      incidentalServicesCost: 1200
    }
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
    if (tenant) {
      if (tenant.companyName) setBidderName(tenant.companyName);
      if (tenant.authorizedSignatory?.name) setSignatoryName(tenant.authorizedSignatory.name);
      if (tenant.authorizedSignatory?.title) setSignatoryTitle(tenant.authorizedSignatory.title);
    }
  }, [tenant]);

  const handleSelectOpportunity = (oppId: string) => {
    setSelectedOppId(oppId);
    const found = oppProjects.find(p => p.id === oppId || p.refNo === oppId);
    if (found) {
      setProjectRefNo(found.refNo);
      setProjectTitle(found.title);
      setProcuringEntity(found.procuringEntity);
    }
  };

  // Row Manipulation Handlers
  const handleAddItem = () => {
    const nextNo = items.length + 1;
    const newItem: PriceScheduleItemRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      itemNo: `${nextNo}`,
      description: '',
      countryOfOrigin: 'Philippines',
      quantity: 1,
      unitPriceExw: 0,
      transportationCost: 0,
      salesTaxes: 0,
      incidentalServicesCost: 0
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof PriceScheduleItemRow, val: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  const handleResetToCleanSlate = () => {
    setItems([
      {
        id: `row-${Date.now()}-1`,
        itemNo: '1',
        description: '',
        countryOfOrigin: '',
        quantity: 0,
        unitPriceExw: 0,
        transportationCost: 0,
        salesTaxes: 0,
        incidentalServicesCost: 0
      }
    ]);
  };

  // Calculation Mechanics for Price Schedule:
  // Col 9: Total Price, per unit (col 5 + col 6 + col 7 + col 8)
  // Col 10: Total Price delivered Final Destination (col 9) x (col 4)
  const computeCol9UnitTotal = (row: PriceScheduleItemRow): number => {
    return (row.unitPriceExw || 0) + (row.transportationCost || 0) + (row.salesTaxes || 0) + (row.incidentalServicesCost || 0);
  };

  const computeCol10LineTotal = (row: PriceScheduleItemRow): number => {
    const col9 = computeCol9UnitTotal(row);
    return col9 * (row.quantity || 0);
  };

  // Total Project Cost = sum of Col 10 across all items
  const totalProjectCost = items.reduce((sum, item) => sum + computeCol10LineTotal(item), 0);

  const fmtPeso = (val: number): string => {
    if (val === 0) return '-';
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleExportPdf = async () => {
    const fileName = `${projectRefNo || 'PROJECT'}_Financial_Envelope_Price_Schedule_For_Goods.pdf`;
    const templateElems = document.querySelectorAll('.priceschedule-paper');
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
      
      {/* LANDSCAPE LEGAL 13" x 8.5" PRINT STYLESHEET */}
      <style>{`
        @media print {
          @page {
            size: 13in 8.5in landscape;
            margin: 0mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .priceschedule-paper {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0.5in !important;
            width: 13in !important;
            min-h: 8.5in !important;
            page-break-after: always !important;
          }
          .priceschedule-paper:last-child {
            page-break-after: avoid !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col">
        
        {/* Top Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight flex items-center gap-2">
                <span>Price Schedule for Goods</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                  Statutory PBDs Form
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                  Legal 13" × 8.5" Landscape
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Itemized Price Schedule with Columns 1 to 10 and Auto-Calculated Line & Grand Totals
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
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Legal 13"×8.5"</span>
            </button>

            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 space-y-6">

          {/* Interactive Form Controls & Row Editor */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 no-print">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <label className="block text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>Price Schedule Header & Bidding Opportunity Selection:</span>
              </label>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetToCleanSlate}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clean Slate</span>
                </button>
                <button
                  onClick={handleAddItem}
                  className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Goods Row</span>
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
                  className="w-full bg-slate-950 border border-emerald-500/60 rounded-xl px-3.5 py-2 text-white font-mono text-xs font-bold focus:outline-none focus:border-emerald-400 shadow-inner cursor-pointer"
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
                <label className="block text-slate-400 font-mono mb-1">Name of Bidder / Enterprise <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={bidderName}
                  onChange={(e) => setBidderName(e.target.value)}
                  placeholder="e.g. Quantum Cloud Corporation"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Project Title / Name of Project <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g. Procurement and Installation of CCTV at Purok 1-6"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Project ID No. / Reference <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={projectRefNo}
                  onChange={(e) => setProjectRefNo(e.target.value)}
                  placeholder="e.g. 13132143 / 01-INFRA-2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono font-bold"
                />
              </div>
            </div>

            {/* Editable Item Rows Table Editor */}
            <div className="border-t border-slate-800 pt-3 space-y-2">
              <label className="block text-xs font-mono font-bold text-slate-300">
                Itemized Price Schedule Data Entry (Columns 1 - 8):
              </label>

              <div className="overflow-x-auto">
                <table className="w-full text-[11px] font-mono text-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-left">
                      <th className="p-2 w-12">Item</th>
                      <th className="p-2 min-w-[200px]">Description (Col 2)</th>
                      <th className="p-2 w-32">Origin (Col 3)</th>
                      <th className="p-2 w-16">QTY (Col 4)</th>
                      <th className="p-2 w-28">EXW Price (Col 5)</th>
                      <th className="p-2 w-28">Transpo (Col 6)</th>
                      <th className="p-2 w-28">Taxes (Col 7)</th>
                      <th className="p-2 w-28">Services (Col 8)</th>
                      <th className="p-2 w-28 text-emerald-400">Col 9 (Unit)</th>
                      <th className="p-2 w-32 text-emerald-400">Col 10 (Total)</th>
                      <th className="p-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {items.map((row, idx) => {
                      const col9Unit = computeCol9UnitTotal(row);
                      const col10Total = computeCol10LineTotal(row);
                      return (
                        <tr key={row.id} className="hover:bg-slate-800/30">
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.itemNo}
                              onChange={(e) => handleUpdateItem(row.id, 'itemNo', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-white text-center font-bold"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) => handleUpdateItem(row.id, 'description', e.target.value)}
                              placeholder="Item description..."
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.countryOfOrigin}
                              onChange={(e) => handleUpdateItem(row.id, 'countryOfOrigin', e.target.value)}
                              placeholder="e.g. Philippines"
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              value={row.quantity || ''}
                              onChange={(e) => handleUpdateItem(row.id, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-white text-center font-bold"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              value={row.unitPriceExw || ''}
                              onChange={(e) => handleUpdateItem(row.id, 'unitPriceExw', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-right"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              value={row.transportationCost || ''}
                              onChange={(e) => handleUpdateItem(row.id, 'transportationCost', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-right"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              value={row.salesTaxes || ''}
                              onChange={(e) => handleUpdateItem(row.id, 'salesTaxes', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-right"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              value={row.incidentalServicesCost || ''}
                              onChange={(e) => handleUpdateItem(row.id, 'incidentalServicesCost', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-right"
                            />
                          </td>
                          <td className="p-1.5 text-right font-bold text-emerald-400 font-mono">
                            ₱{col9Unit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-1.5 text-right font-bold text-emerald-400 font-mono">
                            ₱{col10Total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-1.5 text-center">
                            <button
                              onClick={() => handleRemoveItem(row.id)}
                              className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* EXACT STATUTORY LEGAL LANDSCAPE PAPER LAYOUT PREVIEW */}
          <div className="space-y-8 flex flex-col items-center">

            <div className="priceschedule-paper single-page-paper w-[13in] min-h-[8.5in] bg-white text-slate-950 p-[0.5in] shadow-2xl font-sans text-[9pt] leading-relaxed flex flex-col justify-between mx-auto border border-slate-300">
              <div className="space-y-4">
                
                {/* Header Title Row 1 */}
                <h1 className="text-center text-base font-extrabold uppercase tracking-wider text-slate-950 border-b border-slate-950 pb-1">
                  PRICE SCHEDULE FOR GOODS
                </h1>

                {/* Sub Title Row 2 */}
                <p className="text-center font-bold text-sm text-slate-900 -mt-2">
                  {projectTitle || 'Procurement and Installation of CCTV at Purok 1-6'}
                </p>

                {/* Header Row 3: Name of Bidder & Project ID No. */}
                <div className="grid grid-cols-12 border-2 border-slate-950 text-[9pt] font-sans">
                  <div className="col-span-6 border-r-2 border-slate-950 p-1.5 flex items-baseline gap-2">
                    <span className="font-semibold text-slate-800">Name of Bidder:</span>
                    <span className="font-bold text-slate-950 uppercase">{bidderName || 'Quantum Cloud Corporation'}</span>
                  </div>
                  <div className="col-span-3 border-r-2 border-slate-950 p-1.5 text-center font-semibold text-slate-800">
                    Project ID No.
                  </div>
                  <div className="col-span-3 p-1.5 text-center font-bold text-slate-950 font-mono">
                    {projectRefNo || '13132143 / 01-INFRA-2026'}
                  </div>
                </div>

                {/* 10-Column Price Schedule Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border-2 border-slate-950 text-[8.5pt] font-sans">
                    <thead>
                      
                      {/* Numbered Row 4 */}
                      <tr className="bg-slate-100 border-b border-slate-950 text-center font-bold font-mono">
                        <th className="border border-slate-950 p-1 w-10">1</th>
                        <th className="border border-slate-950 p-1">2</th>
                        <th className="border border-slate-950 p-1 w-28">3</th>
                        <th className="border border-slate-950 p-1 w-12">4</th>
                        <th className="border border-slate-950 p-1 w-24">5</th>
                        <th className="border border-slate-950 p-1 w-28">6</th>
                        <th className="border border-slate-950 p-1 w-28">7</th>
                        <th className="border border-slate-950 p-1 w-28">8</th>
                        <th className="border border-slate-950 p-1 w-28">9</th>
                        <th className="border border-slate-950 p-1 w-32">10</th>
                      </tr>

                      {/* Column Names Header Row 5 */}
                      <tr className="bg-slate-50 border-b-2 border-slate-950 text-center font-bold text-[8pt] leading-tight">
                        <th className="border border-slate-950 p-1.5 align-middle">Item</th>
                        <th className="border border-slate-950 p-1.5 align-middle">Description</th>
                        <th className="border border-slate-950 p-1.5 align-middle">Country of Origin</th>
                        <th className="border border-slate-950 p-1.5 align-middle">QTY</th>
                        <th className="border border-slate-950 p-1.5 align-middle">Unit price EXW per item</th>
                        <th className="border border-slate-950 p-1.5 align-middle">Transportation and all other costs incidental to delivery, per item</th>
                        <th className="border border-slate-950 p-1.5 align-middle">Sales and other taxes payable if Contract is awarded, per item</th>
                        <th className="border border-slate-950 p-1.5 align-middle">Cost of Incidental Services, if applicable, per item</th>
                        <th className="border border-slate-950 p-1.5 align-middle">Total Price, per unit (col 5+6+7+8)</th>
                        <th className="border border-slate-950 p-1.5 align-middle">Total Price delivered Final Destination (col 9) x (col 4)</th>
                      </tr>

                    </thead>
                    <tbody>
                      
                      {/* Dynamic Data Rows */}
                      {items.map((row) => {
                        const col9Unit = computeCol9UnitTotal(row);
                        const col10Total = computeCol10LineTotal(row);
                        return (
                          <tr key={row.id} className="border-b border-slate-950 font-normal">
                            <td className="border border-slate-950 p-1.5 text-center font-bold">{row.itemNo}</td>
                            <td className="border border-slate-950 p-1.5 font-medium">{row.description || '-'}</td>
                            <td className="border border-slate-950 p-1.5 text-center">{row.countryOfOrigin || '-'}</td>
                            <td className="border border-slate-950 p-1.5 text-center font-bold font-mono">{row.quantity || 0}</td>
                            <td className="border border-slate-950 p-1.5 text-right font-mono">{fmtPeso(row.unitPriceExw)}</td>
                            <td className="border border-slate-950 p-1.5 text-right font-mono">{fmtPeso(row.transportationCost)}</td>
                            <td className="border border-slate-950 p-1.5 text-right font-mono">{fmtPeso(row.salesTaxes)}</td>
                            <td className="border border-slate-950 p-1.5 text-right font-mono">{fmtPeso(row.incidentalServicesCost)}</td>
                            <td className="border border-slate-950 p-1.5 text-right font-mono font-semibold">{fmtPeso(col9Unit)}</td>
                            <td className="border border-slate-950 p-1.5 text-right font-mono font-bold text-slate-950">{fmtPeso(col10Total)}</td>
                          </tr>
                        );
                      })}

                      {/* TOTAL PROJECT COST Summary Row */}
                      <tr className="border-t-2 border-slate-950 bg-slate-100 font-bold text-[9pt]">
                        <td colSpan={3} className="border border-slate-950 p-2 text-center font-extrabold uppercase">
                          TOTAL PROJECT COST
                        </td>
                        <td className="border border-slate-950 p-2 text-center font-mono">
                          {items.reduce((s, i) => s + (i.quantity || 0), 0)}
                        </td>
                        <td colSpan={5} className="border border-slate-950 p-2 bg-slate-50"></td>
                        <td className="border border-slate-950 p-2 text-right font-mono font-extrabold text-slate-950 text-[10pt]">
                          ₱{totalProjectCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>

                    </tbody>
                  </table>
                </div>

                {/* Signature Block */}
                <div className="pt-6 space-y-4 font-sans text-[9pt]">
                  <div className="grid grid-cols-2 gap-8 items-end">
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="w-48 font-semibold text-slate-800">Name of Bidder:</span>
                        <strong className="border-b border-slate-950 pb-0.5 uppercase flex-1">{bidderName || 'Quantum Cloud Corporation'}</strong>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="w-48 font-semibold text-slate-800">Name of Authorized Representative:</span>
                        <strong className="border-b border-slate-950 pb-0.5 uppercase flex-1">{signatoryName || 'ENGR. JUAN DELA CRUZ'}</strong>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="w-48 font-semibold text-slate-800">Signature:</span>
                        <span className="border-b border-slate-950 pb-0.5 flex-1">________________________________________</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="w-48 font-semibold text-slate-800">Date:</span>
                        <strong className="border-b border-slate-950 pb-0.5 font-mono flex-1">
                          {dateSubmitted ? new Date(dateSubmitted).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '____________________'}
                        </strong>
                      </div>
                    </div>

                    <div className="text-right text-[8pt] text-slate-500 font-mono space-y-1">
                      <p>Duly authorized to sign Bid for and on behalf of</p>
                      <p className="font-bold text-slate-950 uppercase">{bidderName || 'BIDDER ENTERPRISE'}</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Document Footer */}
              <div className="pt-3 border-t border-slate-300 flex items-center justify-between text-[8.5pt] font-mono text-slate-700">
                <div className="flex items-center gap-3">
                  <DocumentQrCode
                    details={{
                      companyName: bidderName || 'Bidding Entity',
                      documentName: 'Price Schedule for Goods (Cols 1-10)',
                      documentNumber: `FIN-PRICESCHED-${projectRefNo || 'SCHED'}`,
                      projectTitle: projectTitle,
                      projectRefNo: projectRefNo,
                      procuringEntity: procuringEntity,
                      dateTimeSubmitted: new Date().toLocaleString(),
                      documentCategory: 'Financial Documents',
                      generatedBy: bidderName || 'Bidding Entity'
                    }}
                    size={45}
                    showCaption={false}
                  />
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-950 uppercase">{bidderName || 'BIDDING ENTITY'}</p>
                    <p>PROJECT: <strong>{projectTitle || 'N/A'}</strong></p>
                    <p>REF NO: <strong>{projectRefNo || 'N/A'}</strong></p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold font-mono">Page 1 of 1</span>
                  <p className="text-[7.5pt] text-slate-500">Statutory Price Schedule for Goods</p>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/95 sticky bottom-0 z-10 shrink-0 no-print">
          <div className="text-xs font-mono text-slate-400">
            Total Project Cost (Col 10 Sum): <span className="text-emerald-400 font-bold font-mono text-sm">₱ {totalProjectCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg transition flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Save & Complete Price Schedule</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// Default export alias
export default PriceSchedule4GoodsModal;

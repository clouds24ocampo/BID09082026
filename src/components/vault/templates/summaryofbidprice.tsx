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
  Calculator,
  FileText
} from 'lucide-react';

export interface SummaryBidPriceRow {
  id: string;
  itemNo: string;
  item: string;
  particularsDescription: string;
  totalAmount: number;
}

export interface SummaryOfBidPriceModalProps {
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose: () => void;
}

export const SummaryOfBidPriceModal: React.FC<SummaryOfBidPriceModalProps> = ({
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

  // Form Fields
  const [projectTitle, setProjectTitle] = useState(activeProjectTitle || 'Procurement of High-Capacity Network Switches & Firewall Security');
  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo || '2026-FIN-009');
  const [procuringEntity, setProcuringEntity] = useState(activeProcuringEntity || 'Department of Information and Communications Technology');
  
  // Signatory & Enterprise
  const [signatoryName, setSignatoryName] = useState(tenant?.authorizedSignatory?.name || '');
  const [companyName, setCompanyName] = useState(tenant?.companyName || '');
  const [dateSubmitted, setDateSubmitted] = useState(todayStr);

  // Dynamic 4-Column Summary Rows (Item No, Item, Particulars/Description, Total Amount)
  const [items, setItems] = useState<SummaryBidPriceRow[]>([
    {
      id: 'row-1',
      itemNo: '1',
      item: 'Core Network Hardware',
      particularsDescription: 'Supply, Delivery, and Configuration of Enterprise Core Switches & Routers',
      totalAmount: 4500000.00
    },
    {
      id: 'row-2',
      itemNo: '2',
      item: 'Security Infrastructure',
      particularsDescription: 'Next-Generation Firewall Security Appliance with High-Availability License',
      totalAmount: 2850000.00
    },
    {
      id: 'row-3',
      itemNo: '3',
      item: 'Installation & Training',
      particularsDescription: 'On-site Fiber Cabling Installation, Testing, Commissioning, and Admin Technical Training',
      totalAmount: 650000.00
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
      if (tenant.companyName) setCompanyName(tenant.companyName);
      if (tenant.authorizedSignatory?.name) setSignatoryName(tenant.authorizedSignatory.name);
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
    const newItem: SummaryBidPriceRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      itemNo: `${nextNo}`,
      item: '',
      particularsDescription: '',
      totalAmount: 0
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof SummaryBidPriceRow, val: any) => {
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
        item: '',
        particularsDescription: '',
        totalAmount: 0
      }
    ]);
  };

  // Calculation of Grand Total Amount (Col 4 Sum)
  const grandTotalAmount = items.reduce((sum, item) => sum + (item.totalAmount || 0), 0);

  const fmtPeso = (val: number): string => {
    if (val === 0) return '-';
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleExportPdf = async () => {
    const fileName = `${projectRefNo || 'PROJECT'}_Financial_Envelope_Summary_Of_Bid_Prices.pdf`;
    const templateElems = document.querySelectorAll('.summarybid-paper');
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
      
      {/* LEGAL PORTRAIT 8.5" x 13" PRINT STYLESHEET */}
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
          .summarybid-paper {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0.6in !important;
            width: 8.5in !important;
            min-h: 13in !important;
            page-break-after: always !important;
          }
          .summarybid-paper:last-child {
            page-break-after: avoid !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col">
        
        {/* Top Header Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight flex items-center gap-2">
                <span>Summary of Bid Prices</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                  Statutory Financial Form
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Legal 13" × 8.5" Landscape
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Statutory Summary Table of Bid Items, Particulars & Total Amounts
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

        {/* Scrollable Form & Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 space-y-6">

          {/* Interactive Form Controls & Row Editor */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 no-print">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <label className="block text-xs font-mono font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>Summary Header & Project Options:</span>
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
                  className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition shadow flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Bid Item Row</span>
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
                <label className="block text-slate-400 font-mono mb-1">Procuring Entity Name</label>
                <input
                  type="text"
                  value={procuringEntity}
                  onChange={(e) => setProcuringEntity(e.target.value)}
                  placeholder="e.g. Department of Information & Communications Technology"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Project Title / Name of Project <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g. Procurement of High-Capacity Network Switches"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Project Reference No. <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={projectRefNo}
                  onChange={(e) => setProjectRefNo(e.target.value)}
                  placeholder="e.g. 2026-FIN-009"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Name of Authorized Representative <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  placeholder="e.g. ENGR. JUAN DELA CRUZ"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 font-mono mb-1">Duly Authorized to Sign for Enterprise <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. QUANTUM CLOUD CORPORATION"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold uppercase"
                />
              </div>
            </div>

            {/* Editable Item Rows Table Editor */}
            <div className="border-t border-slate-800 pt-3 space-y-2">
              <label className="block text-xs font-mono font-bold text-slate-300">
                Summary of Bid Prices Data Entry (Cols 1 - 4):
              </label>

              <div className="space-y-2">
                {items.map((row) => (
                  <div key={row.id} className="grid grid-cols-12 gap-2 items-center bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <div className="col-span-1">
                      <span className="text-[10px] text-slate-500 font-mono block">Item No.</span>
                      <input
                        type="text"
                        value={row.itemNo}
                        onChange={(e) => handleUpdateItem(row.id, 'itemNo', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-center font-bold font-mono text-xs"
                      />
                    </div>

                    <div className="col-span-3">
                      <span className="text-[10px] text-slate-500 font-mono block">Item (Col 2)</span>
                      <input
                        type="text"
                        value={row.item}
                        onChange={(e) => handleUpdateItem(row.id, 'item', e.target.value)}
                        placeholder="Item name..."
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white text-xs font-semibold"
                      />
                    </div>

                    <div className="col-span-5">
                      <span className="text-[10px] text-slate-500 font-mono block">Particulars / Description (Col 3)</span>
                      <input
                        type="text"
                        value={row.particularsDescription}
                        onChange={(e) => handleUpdateItem(row.id, 'particularsDescription', e.target.value)}
                        placeholder="Detailed particulars or description..."
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white text-xs"
                      />
                    </div>

                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-500 font-mono block">Total Amount (Col 4)</span>
                      <input
                        type="number"
                        value={row.totalAmount || ''}
                        onChange={(e) => handleUpdateItem(row.id, 'totalAmount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-emerald-400 font-mono text-right font-bold text-xs"
                      />
                    </div>

                    <div className="col-span-1 text-center pt-3">
                      <button
                        onClick={() => handleRemoveItem(row.id)}
                        className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* EXACT STATUTORY LEGAL PORTRAIT PAPER LAYOUT PREVIEW */}
          <div className="space-y-8 flex flex-col items-center">

            <div className="summarybid-paper single-page-paper w-[13in] min-h-[8.5in] aspect-[13/8.5] bg-white text-slate-950 p-[0.6in] shadow-2xl font-sans text-[10pt] leading-relaxed flex flex-col justify-start mx-auto border border-slate-300">
              <div className="space-y-6">
                
                {/* Header Title Row 1 (Bold, Left-Aligned) */}
                <h1 className="text-xl font-bold text-slate-950 font-sans tracking-tight">
                  Summary of Bid Prices
                </h1>

                {/* Sub-Instruction Paragraph Row 2 (Italic) */}
                <p className="text-[9.5pt] italic text-slate-800 leading-normal font-sans">
                  The Procuring Entity may modify the table below as necessary to comply with the requirements of the Procurement Project.
                </p>

                {/* 4-Column Statutory Table */}
                <div className="overflow-x-auto pt-2">
                  <table className="w-full border-collapse border-2 border-slate-950 text-[9.5pt] font-sans">
                    <thead>
                      
                      {/* Numbered Row 1 */}
                      <tr className="bg-slate-100 border-b border-slate-950 text-center font-bold font-mono">
                        <th className="border border-slate-950 p-2 w-16">1</th>
                        <th className="border border-slate-950 p-2 w-44">2</th>
                        <th className="border border-slate-950 p-2">3</th>
                        <th className="border border-slate-950 p-2 w-44">4</th>
                      </tr>

                      {/* Column Names Header Row 2 */}
                      <tr className="bg-slate-50 border-b-2 border-slate-950 text-center font-bold">
                        <th className="border border-slate-950 p-2 align-middle">Item No.</th>
                        <th className="border border-slate-950 p-2 align-middle">Item</th>
                        <th className="border border-slate-950 p-2 align-middle">Particulars /<br />Description</th>
                        <th className="border border-slate-950 p-2 align-middle">Total Amount</th>
                      </tr>

                    </thead>
                    <tbody>
                      
                      {/* Dynamic Data Rows */}
                      {items.map((row) => (
                        <tr key={row.id} className="border-b border-slate-950 font-normal">
                          <td className="border border-slate-950 p-2.5 text-center font-bold font-mono">{row.itemNo}</td>
                          <td className="border border-slate-950 p-2.5 font-bold text-slate-950">{row.item || '-'}</td>
                          <td className="border border-slate-950 p-2.5 leading-snug">{row.particularsDescription || '-'}</td>
                          <td className="border border-slate-950 p-2.5 text-right font-mono font-bold text-slate-950">
                            {fmtPeso(row.totalAmount)}
                          </td>
                        </tr>
                      ))}

                      {/* Summary Grand Total Row */}
                      <tr className="border-t-2 border-slate-950 bg-slate-100 font-bold text-[10pt]">
                        <td colSpan={3} className="border border-slate-950 p-2.5 text-right font-extrabold uppercase">
                          TOTAL BID PRICE (PESOS)
                        </td>
                        <td className="border border-slate-950 p-2.5 text-right font-mono font-extrabold text-slate-950 text-[10.5pt]">
                          ₱{grandTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>

                    </tbody>
                  </table>
                </div>

                {/* Signature Block matching exact template format */}
                <div className="pt-12 space-y-4 font-sans text-[10pt]">
                  
                  <div className="flex items-baseline gap-2">
                    <span className="w-20 font-semibold text-slate-900 shrink-0">Name:</span>
                    <span className="flex-1 border-b border-slate-950 pb-0.5 font-bold uppercase text-slate-950">
                      {signatoryName || '________________________________________'}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="w-20 font-semibold text-slate-900 shrink-0">Signature:</span>
                    <span className="flex-1 border-b border-slate-950 pb-0.5">
                      ________________________________________
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="font-semibold text-slate-900 shrink-0">Duly authorized to sign the Bid for and behalf of:</span>
                    <span className="flex-1 border-b border-slate-950 pb-0.5 font-bold uppercase text-slate-950">
                      {companyName || '________________________________________'}
                    </span>
                  </div>

                </div>

              </div>

              {/* Document Footer */}
              <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[8.5pt] font-mono text-slate-700">
                <div className="flex items-center gap-3">
                  <DocumentQrCode
                    details={{
                      companyName: companyName || 'Bidding Entity',
                      documentName: 'Summary of Bid Prices',
                      documentNumber: `FIN-SUMMARYBID-${projectRefNo || 'SCHED'}`,
                      projectTitle: projectTitle,
                      projectRefNo: projectRefNo,
                      procuringEntity: procuringEntity,
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
                    <p>REF NO: <strong>{projectRefNo || 'N/A'}</strong></p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold font-mono">Page 1 of 1</span>
                  <p className="text-[7.5pt] text-slate-500">Statutory Summary of Bid Prices</p>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/95 sticky bottom-0 z-10 shrink-0 no-print">
          <div className="text-xs font-mono text-slate-400">
            Total Calculated Bid Price: <span className="text-emerald-400 font-bold font-mono text-sm">₱ {grandTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
              <span>Save & Complete Summary of Bid Prices</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// Default export alias
export default SummaryOfBidPriceModal;

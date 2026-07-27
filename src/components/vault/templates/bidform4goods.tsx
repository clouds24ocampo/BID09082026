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
  FileSignature,
  ShieldCheck,
  Plus,
  Trash2,
  DollarSign
} from 'lucide-react';

export interface AgentCommissionRow {
  id: string;
  agentNameAddress: string;
  amountCurrency: string;
  purpose: string;
}

export interface BidFormForGoodsModalProps {
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose: () => void;
}

export const BidFormForGoodsModal: React.FC<BidFormForGoodsModalProps> = ({
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

  // Project & Document Parameters
  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo || '');
  const [projectTitle, setProjectTitle] = useState(activeProjectTitle || '');
  const [procuringEntity, setProcuringEntity] = useState(activeProcuringEntity || '');
  const [procuringEntityAddress, setProcuringEntityAddress] = useState('');
  const [solicitationNumber, setSolicitationNumber] = useState('');
  const [dateSubmitted, setDateSubmitted] = useState(todayStr);

  // Corporate Entity & Signatory
  const [companyName, setCompanyName] = useState(tenant?.companyName || '');
  const [companyAddress, setCompanyAddress] = useState(tenant?.address || '');
  const [signatoryName, setSignatoryName] = useState(tenant?.authorizedSignatory?.name || '');
  const [signatoryTitle, setSignatoryTitle] = useState(tenant?.authorizedSignatory?.title || '');
  const [writtenAuthority, setWrittenAuthority] = useState("Board Resolution & Secretary's Certificate");

  // Goods Description & Bid Offer Parameters
  const [bidBulletins, setBidBulletins] = useState('Bid Bulletin No. 1');
  const [offerAction, setOfferAction] = useState<'supply' | 'deliver' | 'perform' | 'supply, deliver, and perform'>('supply, deliver, and perform');
  const [goodsDescription, setGoodsDescription] = useState('');
  const [totalBidAmountWords, setTotalBidAmountWords] = useState('');
  const [totalBidAmountFigures, setTotalBidAmountFigures] = useState('');
  const [applicableTaxes, setApplicableTaxes] = useState('(i) 12% Value Added Tax (VAT), (ii) Local Business Tax, and (iii) all statutory levies');

  // Agent Commissions Table (Optional Foreign-Assisted Projects)
  const [isForeignAssisted, setIsForeignAssisted] = useState(false);
  const [commissions, setCommissions] = useState<AgentCommissionRow[]>([]);

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
        if (match.solicitationNo) setSolicitationNumber(match.solicitationNo);
        if (match.abc) setTotalBidAmountFigures(match.abc);
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
      if (first.solicitationNo) setSolicitationNumber(first.solicitationNo);
      if (first.abc) setTotalBidAmountFigures(first.abc);
    }
  }, [tenant?.id, activeProjectRefNo, activeProjectTitle, activeProcuringEntity]);

  useEffect(() => {
    if (tenant) {
      if (tenant.companyName) setCompanyName(tenant.companyName);
      if (tenant.address) setCompanyAddress(tenant.address);
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
      if (found.solicitationNo) setSolicitationNumber(found.solicitationNo);
      if (found.abc) setTotalBidAmountFigures(found.abc);
    }
  };

  const handleAddCommissionRow = () => {
    setCommissions(prev => [
      ...prev,
      {
        id: `agent-${Date.now()}`,
        agentNameAddress: '',
        amountCurrency: '',
        purpose: ''
      }
    ]);
  };

  const handleRemoveCommissionRow = (id: string) => {
    setCommissions(prev => prev.filter(c => c.id !== id));
  };

  const handleExportPdf = async () => {
    const fileName = `${projectRefNo || 'PROJECT'}_Financial_Envelope_Bid_Form_for_Goods.pdf`;
    const templateElems = document.querySelectorAll('.bidform-goods-paper');
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
          .bidform-goods-paper {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0.75in !important;
            width: 8.5in !important;
            min-h: 13in !important;
            page-break-after: always !important;
          }
          .bidform-goods-paper:last-child {
            page-break-after: avoid !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col">
        
        {/* Top Header Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight flex items-center gap-2">
                <span>Bid Form for the Procurement of Goods</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                  Statutory GPPB Financial Form
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                  Legal 8.5" × 13" • 2 Pages
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Official Financial Bid Form (Envelope 2) pursuant to Philippine Bidding Documents (PBDs)
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
              <span>Print Legal 8.5"×13"</span>
            </button>

            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form & Paper Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 space-y-6">

          {/* Target Project & Financial Form Auto-Fill Controls Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 no-print">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <label className="block text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>Target Bidding Opportunity & Financial Parameters:</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Auto-populates GPPB Bid Form Fields</span>
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
                <label className="block text-slate-400 font-mono mb-1">Project Identification / Ref. No. <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={projectRefNo}
                  onChange={(e) => setProjectRefNo(e.target.value)}
                  placeholder="e.g. PRJ-2026-901283"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Procuring Entity Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={procuringEntity}
                  onChange={(e) => setProcuringEntity(e.target.value)}
                  placeholder="e.g. Department of Information & Communications Technology"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Procuring Entity Address</label>
                <input
                  type="text"
                  value={procuringEntityAddress}
                  onChange={(e) => setProcuringEntityAddress(e.target.value)}
                  placeholder="e.g. DICT Building, C.P. Garcia Ave., Diliman, Quezon City"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Date of Submission</label>
                <input
                  type="date"
                  value={dateSubmitted}
                  onChange={(e) => setDateSubmitted(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Supplemental / Bid Bulletin Numbers</label>
                <input
                  type="text"
                  value={bidBulletins}
                  onChange={(e) => setBidBulletins(e.target.value)}
                  placeholder="e.g. Bid Bulletin No. 1 and No. 2"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Offer Action</label>
                <select
                  value={offerAction}
                  onChange={(e) => setOfferAction(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono cursor-pointer"
                >
                  <option value="supply, deliver, and perform">supply, deliver, and perform</option>
                  <option value="supply and deliver">supply and deliver</option>
                  <option value="perform">perform</option>
                </select>
              </div>

              <div className="col-span-full">
                <label className="block text-slate-400 font-mono mb-1">Description of the Goods <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={goodsDescription}
                  onChange={(e) => setGoodsDescription(e.target.value)}
                  placeholder="e.g. Supply, Delivery, Installation, and Commissioning of Enterprise Server & Networking Infrastructure"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Total Bid Price in Figures (₱) <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={totalBidAmountFigures}
                  onChange={(e) => setTotalBidAmountFigures(e.target.value)}
                  placeholder="₱ 12,500,000.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-emerald-400 font-mono font-bold text-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 font-mono mb-1">Total Bid Price in Words <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={totalBidAmountWords}
                  onChange={(e) => setTotalBidAmountWords(e.target.value)}
                  placeholder="TWELVE MILLION FIVE HUNDRED THOUSAND PESOS ONLY"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-semibold"
                />
              </div>

              <div className="col-span-full">
                <label className="block text-slate-400 font-mono mb-1">Itemized Applicable Taxes & Fiscal Levies</label>
                <input
                  type="text"
                  value={applicableTaxes}
                  onChange={(e) => setApplicableTaxes(e.target.value)}
                  placeholder="(i) 12% Value Added Tax (VAT), (ii) Local Business Tax, and (iii) all statutory levies"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                />
              </div>

              <div className="col-span-full border-t border-slate-800 pt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="foreignAssistedCheck"
                    checked={isForeignAssisted}
                    onChange={(e) => setIsForeignAssisted(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="foreignAssistedCheck" className="text-xs text-slate-300 font-bold cursor-pointer">
                    Foreign-Assisted Project (Enable Development Partner Commissions/Gratuities Section)
                  </label>
                </div>

                {isForeignAssisted && (
                  <button
                    type="button"
                    onClick={handleAddCommissionRow}
                    className="px-3 py-1 rounded bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition flex items-center gap-1 border border-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Add Agent Commission Row</span>
                  </button>
                )}
              </div>

              {isForeignAssisted && commissions.length > 0 && (
                <div className="col-span-full space-y-2 pt-1">
                  <label className="block text-[11px] font-mono text-slate-400">Agent Commissions & Gratuities Itemization:</label>
                  {commissions.map((row, idx) => (
                    <div key={row.id} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <input
                        type="text"
                        value={row.agentNameAddress}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCommissions(prev => prev.map(c => c.id === row.id ? { ...c, agentNameAddress: val } : c));
                        }}
                        placeholder={`Agent #${idx+1} Name & Address`}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-xs"
                      />
                      <input
                        type="text"
                        value={row.amountCurrency}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCommissions(prev => prev.map(c => c.id === row.id ? { ...c, amountCurrency: val } : c));
                        }}
                        placeholder="Amount & Currency (e.g. ₱50,000)"
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-xs font-mono"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={row.purpose}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCommissions(prev => prev.map(c => c.id === row.id ? { ...c, purpose: val } : c));
                          }}
                          placeholder="Purpose of Commission"
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-xs flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCommissionRow(row.id)}
                          className="p-1 rounded text-red-400 hover:bg-red-500/20 transition"
                          title="Remove row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="col-span-full border-t border-slate-800 pt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Authorized Signatory Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    placeholder="e.g. ENGR. JUAN DELA CRUZ"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">Legal Capacity / Title <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={signatoryTitle}
                    onChange={(e) => setSignatoryTitle(e.target.value)}
                    placeholder="e.g. President & Managing Director"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">State Written Authority <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={writtenAuthority}
                    onChange={(e) => setWrittenAuthority(e.target.value)}
                    placeholder="e.g. Secretary's Certificate / Board Resolution"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* 2-PAGE STATUTORY LEGAL PAPER LAYOUT PREVIEW */}
          <div className="space-y-8 flex flex-col items-center">

            {/* PAGE 1 OF 2 */}
            <div className="bidform-goods-paper single-page-paper w-[8.5in] min-h-[13in] bg-white text-slate-950 p-[0.75in] shadow-2xl font-serif text-[10.5pt] leading-relaxed flex flex-col justify-between mx-auto border border-slate-300">
              <div className="space-y-5">
                
                {/* Header Titles */}
                <div className="text-center space-y-1 border-b-2 border-slate-950 pb-3">
                  <h1 className="text-base font-bold uppercase tracking-wider font-sans text-slate-950">
                    Bid Form for the Procurement of Goods
                  </h1>
                  <p className="text-[9.5pt] italic text-slate-700 font-serif">
                    [shall be submitted with the Bid]
                  </p>
                </div>

                {/* BID FORM Title & Reference */}
                <div className="pt-2">
                  <h2 className="text-center text-sm font-bold uppercase tracking-widest font-sans text-slate-950">
                    BID FORM
                  </h2>
                  <div className="mt-2 text-right font-serif text-[10pt] space-y-0.5">
                    <p>Date : <strong><u>{dateSubmitted ? new Date(dateSubmitted).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '____________________'}</u></strong></p>
                    <p>Project Identification No. : <strong><u>{projectRefNo || '____________________'}</u></strong></p>
                  </div>
                </div>

                {/* To Recipient Block */}
                <div className="font-serif text-[10.5pt]">
                  <p>To: <strong><u>{procuringEntity || '[name and address of Procuring Entity]'}</u></strong></p>
                  {procuringEntityAddress && <p className="text-slate-800">{procuringEntityAddress}</p>}
                </div>

                {/* Body Paragraph 1 */}
                <p className="font-serif text-justify text-[10.5pt] leading-relaxed">
                  Having examined the Philippine Bidding Documents (PBDs) including the Supplemental or Bid Bulletin Numbers <strong><u>{bidBulletins || '[insert numbers]'}</u></strong>, the receipt of which is hereby duly acknowledged, we, the undersigned, offer to <strong><u>{offerAction}</u></strong> <strong><u>{goodsDescription || projectTitle || '[description of the Goods]'}</u></strong> in conformity with the said PBDs for the sum of <strong><u>{totalBidAmountWords ? `${totalBidAmountWords} (${totalBidAmountFigures || '₱0.00'})` : '[total Bid amount in words and figures]'}</u></strong> or the total calculated bid price, as evaluated and corrected for computational errors, and other bid modifications in accordance with the Price Schedules attached herewith and made part of this Bid. The total bid price includes the cost of all taxes, such as, but not limited to: <strong><u>{applicableTaxes || '[specify the applicable taxes, e.g. (i) value added tax (VAT), (ii) income tax, (iii) local taxes, and (iv) other fiscal levies and duties]'}</u></strong>, which are itemized herein or in the Price Schedules,
                </p>

                {/* Undertaking Points */}
                <div className="space-y-2 font-serif text-[10.5pt]">
                  <p className="font-semibold">If our Bid is accepted, we undertake:</p>
                  <ol className="list-none pl-6 space-y-2 text-justify">
                    <li className="flex items-start gap-2">
                      <span className="font-bold shrink-0">a.</span>
                      <span>to deliver the goods in accordance with the delivery schedule specified in the Schedule of Requirements of the Philippine Bidding Documents (PBDs);</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold shrink-0">b.</span>
                      <span>to provide a performance security in the form, amounts, and within the times prescribed in the PBDs;</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold shrink-0">c.</span>
                      <span>to abide by the Bid Validity Period specified in the PBDs and it shall remain binding upon us at any time before the expiration of that period.</span>
                    </li>
                  </ol>
                </div>

                {/* Optional Foreign-Assisted Section */}
                {isForeignAssisted ? (
                  <div className="pt-2 space-y-2 font-serif text-[10pt] italic">
                    <p>[Insert this paragraph if Foreign-Assisted Project with the Development Partner:</p>
                    <p className="not-italic text-[10pt]">
                      Commissions or gratuities, if any, paid or to be paid by us to agents relating to this Bid, and to contract execution if we are awarded the contract, are listed below:
                    </p>
                    
                    <table className="w-full border-collapse border border-slate-900 text-[9.5pt] font-sans not-italic my-2">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-900 text-left font-bold">
                          <th className="p-2 border-r border-slate-900">Name and address of agent</th>
                          <th className="p-2 border-r border-slate-900">Amount and Currency</th>
                          <th className="p-2">Purpose of Commission or gratuity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commissions.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="p-2 text-center text-slate-600 font-mono">
                              (if none, state "None")
                            </td>
                          </tr>
                        ) : (
                          commissions.map((row) => (
                            <tr key={row.id} className="border-b border-slate-400">
                              <td className="p-2 border-r border-slate-900 font-medium">{row.agentNameAddress || 'None'}</td>
                              <td className="p-2 border-r border-slate-900 font-mono">{row.amountCurrency || 'None'}</td>
                              <td className="p-2">{row.purpose || 'None'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    <p className="not-italic text-[9.5pt]">(if none, state "None") ]</p>
                  </div>
                ) : (
                  <div className="pt-1 text-[9.5pt] font-serif text-slate-700 italic">
                    [Commissions or gratuities: None]
                  </div>
                )}

                {/* Clauses */}
                <div className="space-y-3 font-serif text-[10.5pt] text-justify pt-1">
                  <p>
                    Until a formal Contract is prepared and executed, this Bid, together with your written acceptance thereof and your Notice of Award, shall be binding upon us.
                  </p>
                  <p>
                    We understand that you are not bound to accept the Lowest Calculated Bid or any Bid you may receive.
                  </p>
                  <p>
                    We certify/confirm that we comply with the eligibility requirements pursuant to the PBDs.
                  </p>
                </div>

              </div>

              {/* Page 1 Footer */}
              <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[9pt] font-mono text-slate-700">
                <div className="flex items-center gap-3">
                  <DocumentQrCode
                    details={{
                      companyName: companyName || 'Bidding Entity',
                      documentName: 'Bid Form for the Procurement of Goods (Page 1 of 2)',
                      documentNumber: `FIN-BIDFORM-${projectRefNo || 'GOODS'}`,
                      projectTitle: projectTitle,
                      projectRefNo: projectRefNo,
                      procuringEntity: procuringEntity,
                      dateTimeSubmitted: new Date().toLocaleString(),
                      documentCategory: 'Financial Documents',
                      generatedBy: companyName || 'Bidding Entity'
                    }}
                    size={50}
                    showCaption={false}
                  />
                  <div className="space-y-0.5 text-[8.5pt]">
                    <p className="font-bold text-slate-950 uppercase">{companyName || 'BIDDING ENTITY'}</p>
                    <p>PROJECT: <strong>{projectTitle || 'N/A'}</strong></p>
                    <p>REF NO: <strong>{projectRefNo || 'N/A'}</strong> • ENTITY: <strong>{procuringEntity || 'N/A'}</strong></p>
                  </div>
                </div>
                <span className="font-bold font-mono">Page 1 of 2</span>
              </div>
            </div>

            {/* PAGE 2 OF 2 */}
            <div className="bidform-goods-paper single-page-paper w-[8.5in] min-h-[13in] bg-white text-slate-950 p-[0.75in] shadow-2xl font-serif text-[10.5pt] leading-relaxed flex flex-col justify-between mx-auto border border-slate-300">
              <div className="space-y-8 pt-4">
                
                <p className="font-serif text-justify text-[10.5pt] leading-relaxed">
                  The undersigned is authorized to submit the bid on behalf of <strong><u>{companyName || '[name of the bidder]'}</u></strong> as evidenced by the attached <strong><u>{writtenAuthority || '[state the written authority]'}</u></strong>.
                </p>

                <p className="font-serif text-justify text-[10.5pt] leading-relaxed">
                  We acknowledge that failure to sign each and every page of this Bid Form, including the attached Schedule of Prices, shall be a ground for the rejection of our bid.
                </p>

                {/* Signature Block matching template image */}
                <div className="pt-12 space-y-6 font-serif text-[10.5pt]">
                  <div className="flex items-baseline gap-2">
                    <span className="w-40 font-bold shrink-0">Name:</span>
                    <span className="flex-1 border-b border-slate-950 pb-0.5 font-bold uppercase">{signatoryName || '________________________________________'}</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="w-40 font-bold shrink-0">Legal capacity:</span>
                    <span className="flex-1 border-b border-slate-950 pb-0.5 font-medium">{signatoryTitle || '________________________________________'}</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="w-40 font-bold shrink-0">Signature:</span>
                    <span className="flex-1 border-b border-slate-950 pb-0.5 italic text-slate-700">[Duly Signed by Authorized Representative]</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="w-40 font-bold shrink-0">Duly authorized to sign the Bid for and behalf of:</span>
                    <span className="flex-1 border-b border-slate-950 pb-0.5 font-bold uppercase">{companyName || '________________________________________'}</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="w-40 font-bold shrink-0">Date:</span>
                    <span className="w-64 border-b border-slate-950 pb-0.5 font-mono">{dateSubmitted ? new Date(dateSubmitted).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '____________________'}</span>
                  </div>
                </div>

              </div>

              {/* Page 2 Footer */}
              <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[9pt] font-mono text-slate-700">
                <div className="flex items-center gap-3">
                  <DocumentQrCode
                    details={{
                      companyName: companyName || 'Bidding Entity',
                      documentName: 'Bid Form for the Procurement of Goods (Page 2 of 2)',
                      documentNumber: `FIN-BIDFORM-${projectRefNo || 'GOODS'}-P2`,
                      projectTitle: projectTitle,
                      projectRefNo: projectRefNo,
                      procuringEntity: procuringEntity,
                      dateTimeSubmitted: new Date().toLocaleString(),
                      documentCategory: 'Financial Documents',
                      generatedBy: companyName || 'Bidding Entity'
                    }}
                    size={50}
                    showCaption={false}
                  />
                  <div className="space-y-0.5 text-[8.5pt]">
                    <p className="font-bold text-slate-950 uppercase">{companyName || 'BIDDING ENTITY'}</p>
                    <p>PROJECT: <strong>{projectTitle || 'N/A'}</strong></p>
                    <p>REF NO: <strong>{projectRefNo || 'N/A'}</strong> • ENTITY: <strong>{procuringEntity || 'N/A'}</strong></p>
                  </div>
                </div>
                <span className="font-bold font-mono">Page 2 of 2</span>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/95 sticky bottom-0 z-10 shrink-0 no-print">
          <div className="text-xs font-mono text-slate-400">
            Official GPPB Statutory Financial Component (Envelope 2) Form
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
              <span>Save & Complete Financial Form</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// Default export alias for bidform4goods.tsx
export default BidFormForGoodsModal;

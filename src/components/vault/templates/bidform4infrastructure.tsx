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
  HardHat,
  Plus,
  Trash2,
  FileText
} from 'lucide-react';

export interface DiscountOfferRow {
  id: string;
  lotNameDescription: string;
  discountPercentageAmount: string;
  methodology: string;
}

export interface BidFormForInfrastructureModalProps {
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose: () => void;
}

export const BidFormForInfrastructureModal: React.FC<BidFormForInfrastructureModalProps> = ({
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
  const [dateSubmitted, setDateSubmitted] = useState(todayStr);

  // Corporate Entity & Signatory
  const [companyName, setCompanyName] = useState(tenant?.companyName || '');
  const [signatoryName, setSignatoryName] = useState(tenant?.authorizedSignatory?.name || '');
  const [signatoryTitle, setSignatoryTitle] = useState(tenant?.authorizedSignatory?.title || '');

  // Infrastructure Bid Parameters (Points a - l under GPPB Res. 09-2020)
  const [bidBulletins, setBidBulletins] = useState('Bid Bulletin No. 1');
  const [totalBidAmountWords, setTotalBidAmountWords] = useState('');
  const [totalBidAmountFigures, setTotalBidAmountFigures] = useState('');

  // Discounts (Point c)
  const [hasDiscounts, setHasDiscounts] = useState(false);
  const [discounts, setDiscounts] = useState<DiscountOfferRow[]>([]);

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
      if (first.abc) setTotalBidAmountFigures(first.abc);
    }
  }, [tenant?.id, activeProjectRefNo, activeProjectTitle, activeProcuringEntity]);

  useEffect(() => {
    if (tenant) {
      if (tenant.companyName) setCompanyName(tenant.companyName);
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
      if (found.abc) setTotalBidAmountFigures(found.abc);
    }
  };

  const handleExportPdf = async () => {
    const fileName = `${projectRefNo || 'PROJECT'}_Financial_Envelope_Bid_Form_for_Infrastructure.pdf`;
    const templateElems = document.querySelectorAll('.bidform-infra-paper');
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
          .bidform-infra-paper {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0.5in !important;
            width: 8.5in !important;
            min-h: 13in !important;
            page-break-after: avoid !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col">
        
        {/* Top Header Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight flex items-center gap-2">
                <span>Bid Form for Infrastructure Projects (Single Page Format)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                  GPPB Res. 09-2020
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                  Legal 13" × 8.5" 1-Page
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Statutory Financial Component Bid Form for Civil Works / Infrastructure (Fits 1 Legal Page)
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
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 transition shadow flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print 1-Page Legal</span>
            </button>

            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form & Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 space-y-6">

          {/* Form Controls */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 no-print">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <label className="block text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>Infrastructure Financial Form Parameters:</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">1-Page Legal Output Format</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="col-span-full">
                <label className="block text-slate-300 font-mono mb-1 font-bold">
                  Select Active Bidding Opportunity from Opportunity Finder:
                </label>
                <select
                  value={selectedOppId}
                  onChange={(e) => handleSelectOpportunity(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-500/60 rounded-xl px-3.5 py-2 text-white font-mono text-xs font-bold focus:outline-none focus:border-amber-400 shadow-inner cursor-pointer"
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
                <label className="block text-slate-400 font-mono mb-1">Project Identification No. <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={projectRefNo}
                  onChange={(e) => setProjectRefNo(e.target.value)}
                  placeholder="e.g. INFRA-2026-0412"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Procuring Entity Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={procuringEntity}
                  onChange={(e) => setProcuringEntity(e.target.value)}
                  placeholder="e.g. Department of Public Works and Highways"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Submission Date</label>
                <input
                  type="date"
                  value={dateSubmitted}
                  onChange={(e) => setDateSubmitted(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 font-mono mb-1">Project Title / Civil Works <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g. Construction of Multi-Purpose Building"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Supplemental / Bid Bulletins</label>
                <input
                  type="text"
                  value={bidBulletins}
                  onChange={(e) => setBidBulletins(e.target.value)}
                  placeholder="e.g. Bid Bulletin No. 1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Total Bid Price in Figures <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={totalBidAmountFigures}
                  onChange={(e) => setTotalBidAmountFigures(e.target.value)}
                  placeholder="₱ 18,500,000.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-amber-400 font-mono font-bold"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 font-mono mb-1">Total Bid Price in Words <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={totalBidAmountWords}
                  onChange={(e) => setTotalBidAmountWords(e.target.value)}
                  placeholder="EIGHTEEN MILLION FIVE HUNDRED THOUSAND PESOS ONLY"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-semibold"
                />
              </div>

              <div className="col-span-full border-t border-slate-800 pt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    placeholder="e.g. General Manager / President"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* EXACT SINGLE PAGE LEGAL PAPER PREVIEW */}
          <div className="space-y-8 flex flex-col items-center">

            <div className="bidform-infra-paper single-page-paper w-[13in] min-h-[8.5in] aspect-[13/8.5] bg-white text-slate-950 p-[0.45in] shadow-2xl font-serif text-[8.5pt] leading-snug flex flex-col justify-start mx-auto border border-slate-300">
              <div className="space-y-2.5">
                
                {/* Header Titles */}
                <div className="text-center space-y-0.5 border-b-2 border-slate-950 pb-1.5">
                  <h1 className="text-xs font-bold uppercase tracking-wider font-sans text-slate-950">
                    BID FORM FOR THE PROCUREMENT OF INFRASTRUCTURE PROJECTS
                  </h1>
                  <p className="text-[8pt] italic text-slate-700 font-serif">
                    [shall be submitted with the Bid]<sup>1</sup>
                  </p>
                </div>

                {/* BID FORM Title & Reference */}
                <div className="flex items-baseline justify-between font-sans text-[8.5pt]">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950">
                    BID FORM
                  </h2>
                  <div className="text-right font-serif text-[8pt] space-y-0.5">
                    <p>Date: <strong><u>{dateSubmitted ? new Date(dateSubmitted).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '____________________'}</u></strong></p>
                    <p>Project Identification No.: <strong><u>{projectRefNo || '____________________'}</u></strong></p>
                  </div>
                </div>

                {/* To Recipient Block */}
                <div className="font-serif text-[8.5pt]">
                  <p>To: <strong><u>{procuringEntity || '[name and address of Procuring Entity]'}</u></strong></p>
                </div>

                {/* Body Points (a - l) */}
                <p className="font-serif text-justify text-[8pt] leading-snug">
                  Having examined the Philippine Bidding Documents (PBDs) including Supplemental or Bid Bulletin Numbers <strong><u>{bidBulletins || '[insert numbers]'}</u></strong>, the receipt of which is hereby duly acknowledged, we, the undersigned, declare that:
                </p>

                <div className="space-y-1 font-serif text-[8pt] leading-snug">
                  <div className="flex items-start gap-1 text-justify">
                    <span className="font-bold shrink-0">a.</span>
                    <span>We have no reservation to the PBDs, including Supplemental or Bid Bulletins, for the Procurement Project: <strong><u>{projectTitle || '[Name of Project]'}</u></strong>;</span>
                  </div>

                  <div className="flex items-start gap-1 text-justify">
                    <span className="font-bold shrink-0">b.</span>
                    <span>We offer to execute the Works for this Contract in accordance with the PBDs for the Total Bid Price of <strong><u>{totalBidAmountWords ? `${totalBidAmountWords} (${totalBidAmountFigures || '₱0.00'})` : '[total Bid amount in words and figures]'}</u></strong>;</span>
                  </div>

                  <div className="flex items-start gap-1 text-justify">
                    <span className="font-bold shrink-0">c.</span>
                    <span>The total bid price includes the cost of all taxes, such as VAT, income tax, local taxes, and fiscal levies, which are itemized herein or in the Bill of Quantities;</span>
                  </div>

                  <div className="flex items-start gap-1 text-justify">
                    <span className="font-bold shrink-0">d.</span>
                    <span>Our Bid shall be valid for the period stated in the PBDs, and it shall remain binding upon us at any time before the expiration of that period;</span>
                  </div>

                  <div className="flex items-start gap-1 text-justify">
                    <span className="font-bold shrink-0">e.</span>
                    <span>If our Bid is accepted, we commit to obtain a Performance Security in the amount of percentage of the Contract Price in accordance with the PBDs;</span>
                  </div>

                  <div className="flex items-start gap-1 text-justify">
                    <span className="font-bold shrink-0">f.</span>
                    <span>We are not participating, as Bidders, in more than one Bid in this bidding process, other than alternative bids in accordance with the PBDs;</span>
                  </div>

                  <div className="flex items-start gap-1 text-justify">
                    <span className="font-bold shrink-0">g.</span>
                    <span>We understand that this Bid, together with your written acceptance thereof included in your notification of award, shall constitute a binding contract between us;</span>
                  </div>

                  <div className="flex items-start gap-1 text-justify">
                    <span className="font-bold shrink-0">h.</span>
                    <span>We understand that you are not bound to accept the Lowest Calculated Bid or any other Bid that you may receive;</span>
                  </div>

                  <div className="flex items-start gap-1 text-justify">
                    <span className="font-bold shrink-0">i.</span>
                    <span>We likewise certify/confirm that the undersigned is the duly authorized representative of the bidder, granted full power and authority to sign and execute the ensuing contract for the <strong><u>{projectTitle || '[Name of Project]'}</u></strong> of <strong><u>{procuringEntity || '[Procuring Entity]'}</u></strong>;</span>
                  </div>

                  <div className="flex items-start gap-1 text-justify">
                    <span className="font-bold shrink-0">j.</span>
                    <span>We acknowledge that failure to sign each and every page of this Bid Form, including the Bill of Quantities, shall be a ground for the rejection of our bid.</span>
                  </div>
                </div>

                {/* Signature Block */}
                <div className="pt-3 space-y-2 font-serif text-[8.5pt]">
                  <div className="flex items-baseline gap-2">
                    <span className="w-36 font-bold shrink-0">Name:</span>
                    <span className="flex-1 border-b border-slate-950 pb-0.5 font-bold uppercase">{signatoryName || '________________________________________'}</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="w-36 font-bold shrink-0">Legal Capacity:</span>
                    <span className="flex-1 border-b border-slate-950 pb-0.5 font-medium">{signatoryTitle || '________________________________________'}</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="w-36 font-bold shrink-0">Signature:</span>
                    <span className="flex-1 border-b border-slate-950 pb-0.5 italic text-slate-700">[Duly Signed by Authorized Representative]</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="w-36 font-bold shrink-0">Duly authorized to sign:</span>
                    <span className="flex-1 border-b border-slate-950 pb-0.5 font-bold uppercase">{companyName || '________________________________________'}</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="w-36 font-bold shrink-0">Date:</span>
                    <span className="w-64 border-b border-slate-950 pb-0.5 font-mono">{dateSubmitted ? new Date(dateSubmitted).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '____________________'}</span>
                  </div>
                </div>

              </div>

              {/* Footnote 1 & Single Page Footer */}
              <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-[8pt] font-mono text-slate-700">
                <div className="flex items-center gap-3">
                  <DocumentQrCode
                    details={{
                      companyName: companyName || 'Bidding Entity',
                      documentName: 'Bid Form for Infrastructure (Single Page)',
                      documentNumber: `FIN-BIDFORM-INFRA-${projectRefNo || 'CIVIL'}`,
                      projectTitle: projectTitle,
                      projectRefNo: projectRefNo,
                      procuringEntity: procuringEntity,
                      dateTimeSubmitted: new Date().toLocaleString(),
                      documentCategory: 'Financial Documents',
                      generatedBy: companyName || 'Bidding Entity'
                    }}
                    size={40}
                    showCaption={false}
                  />
                  <div className="space-y-0.5 text-[7.5pt]">
                    <p className="font-bold text-slate-950 uppercase">{companyName || 'BIDDING ENTITY'}</p>
                    <p>PROJECT: <strong>{projectTitle || 'N/A'}</strong></p>
                    <p>REF NO: <strong>{projectRefNo || 'N/A'}</strong></p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold font-mono text-[8pt]">Page 1 of 1</span>
                  <p className="text-[7pt] text-slate-500">GPPB Res. 09-2020 Infrastructure Bid Form</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/95 sticky bottom-0 z-10 shrink-0 no-print">
          <div className="text-xs font-mono text-slate-400">
            Official GPPB Resolution No. 09-2020 Infrastructure Financial Form (1-Page Legal Layout)
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
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-lg transition flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Save & Complete Infrastructure Bid Form</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BidFormForInfrastructureModal;

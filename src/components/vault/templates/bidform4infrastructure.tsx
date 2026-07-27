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
  HardHat
} from 'lucide-react';

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
  const [procuringEntityAddress, setProcuringEntityAddress] = useState('');
  const [dateSubmitted, setDateSubmitted] = useState(todayStr);

  // Corporate Entity & Signatory
  const [companyName, setCompanyName] = useState(tenant?.companyName || '');
  const [companyAddress, setCompanyAddress] = useState(tenant?.address || '');
  const [signatoryName, setSignatoryName] = useState(tenant?.authorizedSignatory?.name || '');
  const [signatoryTitle, setSignatoryTitle] = useState(tenant?.authorizedSignatory?.title || '');

  // Infrastructure Bid Parameters
  const [bidBulletins, setBidBulletins] = useState('Bid Bulletin No. 1');
  const [totalBidAmountWords, setTotalBidAmountWords] = useState('');
  const [totalBidAmountFigures, setTotalBidAmountFigures] = useState('');
  const [discountsOffered, setDiscountsOffered] = useState('None');
  const [applicableTaxes, setApplicableTaxes] = useState('(i) 12% Value Added Tax (VAT), (ii) Income Tax, (iii) Local Taxes, and (iv) other fiscal levies and duties');
  const [validityPeriodDays, setValidityPeriodDays] = useState('120');
  const [performanceSecurityPercent, setPerformanceSecurityPercent] = useState('10');

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
          .bidform-infra-paper {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0.75in !important;
            width: 8.5in !important;
            min-h: 13in !important;
            page-break-after: always !important;
          }
          .bidform-infra-paper:last-child {
            page-break-after: avoid !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col">
        
        {/* Top Header Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight flex items-center gap-2">
                <span>Bid Form for the Procurement of Infrastructure Projects</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                  Statutory GPPB Resolution 09-2020 Form
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                  Legal 8.5" × 13" • 2 Pages
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Official Financial Bid Form (Envelope 2) for Civil Works pursuant to Philippine Bidding Documents (PBDs)
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
              <span>Print Legal 8.5"×13"</span>
            </button>

            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form & Paper Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 space-y-6">

          {/* Target Project & Infrastructure Form Auto-Fill Controls Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 no-print">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <label className="block text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>Target Bidding Opportunity & Infrastructure Financial Parameters:</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Auto-populates GPPB Infra Bid Form Fields</span>
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
                <label className="block text-slate-400 font-mono mb-1">Project Identification / Ref. No. <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={projectRefNo}
                  onChange={(e) => setProjectRefNo(e.target.value)}
                  placeholder="e.g. INFRA-2026-8812"
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
                <label className="block text-slate-400 font-mono mb-1">Procuring Entity Address</label>
                <input
                  type="text"
                  value={procuringEntityAddress}
                  onChange={(e) => setProcuringEntityAddress(e.target.value)}
                  placeholder="e.g. Bonifacio Drive, Port Area, Manila"
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

              <div className="col-span-full">
                <label className="block text-slate-400 font-mono mb-1">Name of Contract / Project Title <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g. Construction of Multi-Purpose Building and Highway Expansion Project"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Total Bid Price in Figures (₱) <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={totalBidAmountFigures}
                  onChange={(e) => setTotalBidAmountFigures(e.target.value)}
                  placeholder="₱ 45,800,000.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-amber-400 font-mono font-bold text-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 font-mono mb-1">Total Bid Price in Words <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={totalBidAmountWords}
                  onChange={(e) => setTotalBidAmountWords(e.target.value)}
                  placeholder="FORTY-FIVE MILLION EIGHT HUNDRED THOUSAND PESOS ONLY"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-semibold"
                />
              </div>

              <div className="col-span-full">
                <label className="block text-slate-400 font-mono mb-1">Discounts Offered & Application Methodology</label>
                <input
                  type="text"
                  value={discountsOffered}
                  onChange={(e) => setDiscountsOffered(e.target.value)}
                  placeholder="e.g. None or 2% prompt payment discount applied to total calculated bid price"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                />
              </div>

              <div className="col-span-full">
                <label className="block text-slate-400 font-mono mb-1">Itemized Applicable Taxes & Levies</label>
                <input
                  type="text"
                  value={applicableTaxes}
                  onChange={(e) => setApplicableTaxes(e.target.value)}
                  placeholder="(i) 12% Value Added Tax (VAT), (ii) Income Tax, (iii) Local Taxes, and (iv) other fiscal levies"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Bid Validity Period (Days)</label>
                <input
                  type="text"
                  value={validityPeriodDays}
                  onChange={(e) => setValidityPeriodDays(e.target.value)}
                  placeholder="120 calendar days"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Performance Security (%)</label>
                <input
                  type="text"
                  value={performanceSecurityPercent}
                  onChange={(e) => setPerformanceSecurityPercent(e.target.value)}
                  placeholder="10% or 30%"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono"
                />
              </div>

              <div className="col-span-full border-t border-slate-800 pt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Authorized Signatory Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    placeholder="e.g. ENGR. MARCO POLO"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">Legal Capacity / Title <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={signatoryTitle}
                    onChange={(e) => setSignatoryTitle(e.target.value)}
                    placeholder="e.g. General Manager / Authorized Representative"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">Bidding Entity Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. BUILDERS PHILIPPINES INC."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold uppercase"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* 2-PAGE STATUTORY LEGAL PAPER LAYOUT PREVIEW */}
          <div className="space-y-8 flex flex-col items-center">

            {/* PAGE 1 OF 2 */}
            <div className="bidform-infra-paper single-page-paper w-[8.5in] min-h-[13in] bg-white text-slate-950 p-[0.75in] shadow-2xl font-serif text-[10.5pt] leading-relaxed flex flex-col justify-between mx-auto border border-slate-300">
              <div className="space-y-4">
                
                {/* Header Titles */}
                <div className="text-center space-y-1 border-b-2 border-slate-950 pb-3">
                  <h1 className="text-base font-bold uppercase tracking-wider font-sans text-slate-950">
                    Bid Form for the Procurement of Infrastructure Projects
                  </h1>
                  <p className="text-[9.5pt] italic text-slate-700 font-serif">
                    [shall be submitted with the Bid]
                  </p>
                </div>

                {/* BID FORM Title & Reference */}
                <div className="pt-1">
                  <h2 className="text-center text-sm font-bold uppercase tracking-widest font-sans text-slate-950">
                    BID FORM
                  </h2>
                  <div className="mt-1 text-right font-serif text-[10pt] space-y-0.5">
                    <p>Date : <strong><u>{dateSubmitted ? new Date(dateSubmitted).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '____________________'}</u></strong></p>
                    <p>Project Identification No. : <strong><u>{projectRefNo || '____________________'}</u></strong></p>
                  </div>
                </div>

                {/* To Recipient Block */}
                <div className="font-serif text-[10.5pt]">
                  <p>To: <strong><u>{procuringEntity || '[name and address of Procuring Entity]'}</u></strong></p>
                  {procuringEntityAddress && <p className="text-slate-800">{procuringEntityAddress}</p>}
                </div>

                {/* Opening Declaration */}
                <p className="font-serif text-justify text-[10.5pt] leading-relaxed">
                  Having examined the Philippine Bidding Documents (PBDs) including the Supplemental or Bid Bulletin Numbers <strong><u>{bidBulletins || '[insert numbers]'}</u></strong>, the receipt of which is hereby duly acknowledged, we, the undersigned, declare that:
                </p>

                {/* Points a through k matching image exactly */}
                <div className="space-y-2 font-serif text-[10pt] text-justify">
                  
                  <div className="flex items-start gap-2">
                    <span className="font-bold shrink-0">a.</span>
                    <span>We have no reservation to the PBDs, including the Supplemental or Bid Bulletins, for the Procurement Project: <strong><u>{projectTitle || '[insert name of contract]'}</u></strong>;</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-bold shrink-0">b.</span>
                    <span>We offer to execute the Works for this Contract in accordance with the PBDs;</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-bold shrink-0">c.</span>
                    <span>The total price of our Bid in words and figures, excluding any discounts offered below is: <strong><u>{totalBidAmountWords ? `${totalBidAmountWords} (${totalBidAmountFigures || '₱0.00'})` : '[insert information]'}</u></strong>;</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-bold shrink-0">d.</span>
                    <span>The discounts offered and the methodology for their application are: <strong><u>{discountsOffered || '[insert information]'}</u></strong>;</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-bold shrink-0">e.</span>
                    <span>The total bid price includes the cost of all taxes, such as, but not limited to: <strong><u>{applicableTaxes || '[specify the applicable taxes, e.g. (i) value added tax (VAT), (ii) income tax, (iii) local taxes, and (iv) other fiscal levies and duties]'}</u></strong>, which are itemized herein and reflected in the detailed estimates,</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-bold shrink-0">f.</span>
                    <span>Our Bid shall be valid within the a period stated in the PBDs ({validityPeriodDays} calendar days), and it shall remain binding upon us at any time before the expiration of that period;</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-bold shrink-0">g.</span>
                    <span>If our Bid is accepted, we commit to obtain a Performance Security in the amount of <strong><u>{performanceSecurityPercent || '[insert percentage amount]'}</u></strong> percent of the Contract Price for the due performance of the Contract, or a Performance Securing Declaration in lieu of the allowable forms of Performance Security, subject to the terms and conditions of issued GPPB guidelines<sup>1</sup> for this purpose;</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-bold shrink-0">h.</span>
                    <span>We are not participating, as Bidders, in more than one Bid in this bidding process, other than alternative offers in accordance with the Bidding Documents;</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-bold shrink-0">i.</span>
                    <span>We understand that this Bid, together with your written acceptance thereof included in your notification of award, shall constitute a binding contract between us, until a formal Contract is prepared and executed; and</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-bold shrink-0">j.</span>
                    <span>We understand that you are not bound to accept the Lowest Calculated Bid or any other Bid that you may receive.</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-bold shrink-0">k.</span>
                    <span>We likewise certify/confirm that the undersigned, is the duly authorized</span>
                  </div>

                </div>

              </div>

              {/* Footnote 1 & Page 1 Footer */}
              <div className="pt-2 space-y-2 border-t border-slate-300">
                <p className="text-[8pt] font-serif text-slate-700 italic">
                  <sup>1</sup> currently based on GPPB Resolution No. 09-2020
                </p>
                <div className="flex items-center justify-between text-[9pt] font-mono text-slate-700">
                  <div className="flex items-center gap-3">
                    <DocumentQrCode
                      details={{
                        companyName: companyName || 'Bidding Entity',
                        documentName: 'Bid Form for Infrastructure Projects (Page 1 of 2)',
                        documentNumber: `FIN-BIDFORM-INFRA-${projectRefNo || 'CIVIL'}`,
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
                    <div className="space-y-0.5 text-[8.5pt]">
                      <p className="font-bold text-slate-950 uppercase">{companyName || 'BIDDING ENTITY'}</p>
                      <p>PROJECT: <strong>{projectTitle || 'N/A'}</strong></p>
                      <p>REF NO: <strong>{projectRefNo || 'N/A'}</strong> • ENTITY: <strong>{procuringEntity || 'N/A'}</strong></p>
                    </div>
                  </div>
                  <span className="font-bold font-mono">Page 1 of 2</span>
                </div>
              </div>
            </div>

            {/* PAGE 2 OF 2 */}
            <div className="bidform-infra-paper single-page-paper w-[8.5in] min-h-[13in] bg-white text-slate-950 p-[0.75in] shadow-2xl font-serif text-[10.5pt] leading-relaxed flex flex-col justify-between mx-auto border border-slate-300">
              <div className="space-y-8 pt-4">
                
                {/* Continuation of Point k */}
                <p className="font-serif text-justify text-[10.5pt] leading-relaxed pl-6">
                  representative of the bidder, and granted full power and authority to do, execute and perform any and all acts necessary to participate, submit the bid, and to sign and execute the ensuing contract for the <strong><u>{projectTitle || '[Name of Project]'}</u></strong> of the <strong><u>{procuringEntity || '[Name of the Procuring Entity]'}</u></strong>.
                </p>

                {/* Point l */}
                <div className="flex items-start gap-2 text-justify">
                  <span className="font-bold shrink-0">l.</span>
                  <span>We acknowledge that failure to sign each and every page of this Bid Form, including the Bill of Quantities, shall be a ground for the rejection of our bid.</span>
                </div>

                {/* Signature Block matching template image */}
                <div className="pt-12 space-y-6 font-serif text-[10.5pt]">
                  <div className="flex items-baseline gap-2">
                    <span className="w-40 font-bold shrink-0">Name:</span>
                    <span className="flex-1 border-b border-slate-950 pb-0.5 font-bold uppercase">{signatoryName || '________________________________________'}</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="w-40 font-bold shrink-0">Legal Capacity:</span>
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
                      documentName: 'Bid Form for Infrastructure Projects (Page 2 of 2)',
                      documentNumber: `FIN-BIDFORM-INFRA-${projectRefNo || 'CIVIL'}-P2`,
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
            Official GPPB Resolution No. 09-2020 Infrastructure Financial Form
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

// Default export alias for bidform4infrastructure.tsx
export default BidFormForInfrastructureModal;

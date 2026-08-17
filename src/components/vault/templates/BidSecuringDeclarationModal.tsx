import React, { useState, useEffect } from 'react';
import { Tenant } from '../../../types';
import { generateAndDownloadThreeLayerPdf } from '../../../utils/pdfExportEngine';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import DocumentQrCode from '../../common/DocumentQrCode';
import html2canvas from 'html2canvas';
import {
  X,
  Printer,
  Download,
  Building2,
  FileSignature,
  ShieldCheck,
  Award
} from 'lucide-react';

export interface BidSecuringDeclarationModalProps {
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose: () => void;
}

export const BidSecuringDeclarationModal: React.FC<BidSecuringDeclarationModalProps> = ({
  tenant,
  activeProjectRefNo,
  activeProjectTitle,
  activeProcuringEntity,
  onSaveAndComplete,
  onClose
}) => {
  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo || 'PRJ-2026-901283');
  const [projectTitle, setProjectTitle] = useState(activeProjectTitle || 'Supply, Delivery, and Installation of IT Infrastructure Systems');
  const [procuringEntity, setProcuringEntity] = useState(activeProcuringEntity || 'Department of Information and Communications Technology');
  const [companyName, setCompanyName] = useState(tenant?.companyName || 'Bidding Entity Corporate Name');
  const [companyAddress, setCompanyAddress] = useState(tenant?.address || 'Metro Manila, Philippines');
  const [signatoryName, setSignatoryName] = useState(tenant?.authorizedSignatory?.name || 'Juan Dela Cruz');
  const [signatoryTitle, setSignatoryTitle] = useState(tenant?.authorizedSignatory?.title || 'Authorized Managing Officer / President');
  const [validityDays, setValidityDays] = useState('120 Calendar Days');
  const [govIdType, setGovIdType] = useState('Passport / Driver\'s License');
  const [govIdNumber, setGovIdNumber] = useState('P-109283029A');
  const [notaryPlace, setNotaryPlace] = useState('');
  const [jurisdictionType, setJurisdictionType] = useState<'CITY' | 'MUNICIPALITY' | 'BOTH'>('BOTH');

  // Instrument Selection State (OUTSIDE THE PAPER)
  const [instrumentType, setInstrumentType] = useState<'BID_SECURING_DECLARATION' | 'BANK_DRAFT_GUARANTEE_ILC'>('BID_SECURING_DECLARATION');

  // Option 2: Foreign Bank Guarantee & Local Universal/Commercial Bank Confirmation States
  const [issuingForeignBank, setIssuingForeignBank] = useState('HSBC Foreign Branch / Foreign Commercial Bank');
  const [foreignBankAddress, setForeignBankAddress] = useState('Singapore / Tokyo / London / New York');
  const [localConfirmingBank, setLocalConfirmingBank] = useState('BDO Unibank, Inc. / Metropolitan Bank & Trust Co. (Philippine Universal Bank)');
  const [localBankAddress, setLocalBankAddress] = useState('Makati City, Metro Manila, Philippines');
  const [guaranteeAmount, setGuaranteeAmount] = useState('₱ 500,000.00 (Two Percent of Approved Budget for the Contract)');
  const [guaranteeRefNumber, setGuaranteeRefNumber] = useState('BG-2026-908123-MANILA');
  const [foreignBankOfficer, setForeignBankOfficer] = useState('Robert Smith');
  const [foreignBankOfficerTitle, setForeignBankOfficerTitle] = useState('Vice President - International Trade Finance');
  const [localBankOfficer, setLocalBankOfficer] = useState('Maria Santos');
  const [localBankOfficerTitle, setLocalBankOfficerTitle] = useState('Senior Vice President - Trade Finance & Confirmation Division');

  // Opportunity Projects Auto-Fill Integration
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

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
    }
  };

  const handleExportPdf = async () => {
    const today = new Date().toISOString().split('T')[0];
    const fileName = `${projectRefNo}_Item_e_Bid_Securing_Declaration_${today}.pdf`;
    const templateElems = document.querySelectorAll('.bsd-legal-paper');
    if (templateElems.length > 0) {
      const elemArray = Array.from(templateElems) as HTMLElement[];
      await generateAndDownloadThreeLayerPdf(null, elemArray, undefined, fileName);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    try {
      const templateElems = document.querySelectorAll('.bsd-legal-paper');
      let dataUrl: string | undefined = undefined;
      if (templateElems.length > 0) {
        const elemArray = Array.from(templateElems) as HTMLElement[];
        const canvases = await Promise.all(
          elemArray.map(el => html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }))
        );

        if (canvases.length === 1) {
          dataUrl = canvases[0].toDataURL('image/png');
        } else {
          const totalWidth = Math.max(...canvases.map(c => c.width));
          const totalHeight = canvases.reduce((sum, c) => sum + c.height + 20, 0);
          const combinedCanvas = document.createElement('canvas');
          combinedCanvas.width = totalWidth;
          combinedCanvas.height = totalHeight;
          const ctx = combinedCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, totalWidth, totalHeight);
            let currentY = 0;
            canvases.forEach(c => {
              ctx.drawImage(c, 0, currentY);
              currentY += c.height + 20;
            });
            dataUrl = combinedCanvas.toDataURL('image/png');
          } else {
            dataUrl = canvases[0].toDataURL('image/png');
          }
        }
      }
      const customDocName = instrumentType === 'BID_SECURING_DECLARATION'
        ? 'Bid Securing Declaration (Duly Notarized)'
        : 'Bank Guarantee / Foreign Irrevocable Letter of Credit Confirmation';
      onSaveAndComplete(dataUrl, customDocName, projectRefNo, projectTitle);
    } catch {
      const customDocName = instrumentType === 'BID_SECURING_DECLARATION'
        ? 'Bid Securing Declaration (Duly Notarized)'
        : 'Bank Guarantee / Foreign Irrevocable Letter of Credit Confirmation';
      onSaveAndComplete(undefined, customDocName, projectRefNo, projectTitle);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <style>{`
        @media print {
          @page {
            size: 13in 8.5in landscape;
            margin: 0mm;
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print, .no-print * {
            display: none !important;
          }
          .bsd-legal-paper {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            width: 8.5in !important;
            min-height: 13in !important;
            page-break-after: always !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col">

        {/* Header Bar */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/95 sticky top-0 z-20 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight flex items-center gap-2">
                <span>Bid Securing Declaration (Notarized BSD Template)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                  GPPB-BSD-2025 • Section 27.5
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Legal 13" × 8.5"
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Official Statutory Notarized Bid Security Undertaking for Philippine Government Bidding
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

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 space-y-6">

          {/* Instrument Selection Toggle Card (OUTSIDE THE PAPER) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-blue-500/40 space-y-3 no-print">
            <label className="block text-xs font-mono font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Select Bid Security Form Type (Template Selection):</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setInstrumentType('BID_SECURING_DECLARATION')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  instrumentType === 'BID_SECURING_DECLARATION'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg ring-1 ring-blue-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold font-mono text-blue-300">Option 1</span>
                  {instrumentType === 'BID_SECURING_DECLARATION' && (
                    <span className="text-[10px] bg-blue-500 text-white font-bold px-2 py-0.5 rounded-full">ACTIVE TEMPLATE</span>
                  )}
                </div>
                <p className="text-xs font-bold text-white">Bid Securing Declaration (Duly Notarized)</p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Official GPPB Statutory Notarized Undertaking</p>
              </button>

              <button
                type="button"
                onClick={() => setInstrumentType('BANK_DRAFT_GUARANTEE_ILC')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  instrumentType === 'BANK_DRAFT_GUARANTEE_ILC'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg ring-1 ring-blue-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold font-mono text-blue-300">Option 2</span>
                  {instrumentType === 'BANK_DRAFT_GUARANTEE_ILC' && (
                    <span className="text-[10px] bg-blue-500 text-white font-bold px-2 py-0.5 rounded-full">ACTIVE TEMPLATE</span>
                  )}
                </div>
                <p className="text-xs font-bold text-white">Bank Draft / Guarantee / Irrevocable Letter of Credit</p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Foreign Bank Instrument + Local Universal/Commercial Bank Confirmation</p>
              </button>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 no-print">
            <div className="flex items-center gap-2 text-xs font-mono text-blue-400 font-bold border-b border-slate-800 pb-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span>
                {instrumentType === 'BID_SECURING_DECLARATION'
                  ? 'Bid Securing Declaration Legal Parameters:'
                  : 'Bank Guarantee / Foreign Letter of Credit Parameters:'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="col-span-full">
                <label className="block text-slate-200 font-mono mb-1 font-bold flex items-center gap-2 text-xs">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span>Select Active Bidding Opportunity (Auto-Fills Form Parameters):</span>
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
                <label className="block text-slate-400 font-mono mb-1">Project Ref No</label>
                <input
                  type="text"
                  value={projectRefNo}
                  onChange={(e) => setProjectRefNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Project Title</label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Procuring Entity</label>
                <input
                  type="text"
                  value={procuringEntity}
                  onChange={(e) => setProcuringEntity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Company Address</label>
                <input
                  type="text"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                />
              </div>

              {instrumentType === 'BID_SECURING_DECLARATION' ? (
                <>
                  <div>
                    <label className="block text-slate-400 font-mono mb-1">Authorized Signatory</label>
                    <input
                      type="text"
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-mono mb-1">Signatory Title</label>
                    <input
                      type="text"
                      value={signatoryTitle}
                      onChange={(e) => setSignatoryTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-mono mb-1">Bid Validity Period</label>
                    <input
                      type="text"
                      value={validityDays}
                      onChange={(e) => setValidityDays(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-mono mb-1">Notary Location</label>
                    <input
                      type="text"
                      value={notaryPlace}
                      onChange={(e) => setNotaryPlace(e.target.value)}
                      placeholder="e.g. City of Manila / Pasig City"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-mono mb-1">Jurisdiction Type</label>
                    <select
                      value={jurisdictionType}
                      onChange={(e) => setJurisdictionType(e.target.value as 'CITY' | 'MUNICIPALITY' | 'BOTH')}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono text-xs cursor-pointer"
                    >
                      <option value="BOTH">CITY/MUNICIPALITY OF</option>
                      <option value="CITY">CITY OF</option>
                      <option value="MUNICIPALITY">MUNICIPALITY OF</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-slate-400 font-mono mb-1">Foreign Issuing Bank</label>
                    <input
                      type="text"
                      value={issuingForeignBank}
                      onChange={(e) => setIssuingForeignBank(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-mono mb-1">Foreign Bank Address</label>
                    <input
                      type="text"
                      value={foreignBankAddress}
                      onChange={(e) => setForeignBankAddress(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-mono mb-1">Local Confirming Bank (PH Universal/Commercial Bank)</label>
                    <input
                      type="text"
                      value={localConfirmingBank}
                      onChange={(e) => setLocalConfirmingBank(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold text-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-mono mb-1">Local Bank Office Address</label>
                    <input
                      type="text"
                      value={localBankAddress}
                      onChange={(e) => setLocalBankAddress(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-mono mb-1">Security Guarantee Amount (PHP)</label>
                    <input
                      type="text"
                      value={guaranteeAmount}
                      onChange={(e) => setGuaranteeAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-mono mb-1">Guarantee / ILC Reference No.</label>
                    <input
                      type="text"
                      value={guaranteeRefNumber}
                      onChange={(e) => setGuaranteeRefNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-mono mb-1">Foreign Bank Officer</label>
                    <input
                      type="text"
                      value={foreignBankOfficer}
                      onChange={(e) => setForeignBankOfficer(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-mono mb-1">Local Bank Confirming Officer</label>
                    <input
                      type="text"
                      value={localBankOfficer}
                      onChange={(e) => setLocalBankOfficer(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Paper View Container */}
          <div className="space-y-8 flex flex-col items-center">
            {instrumentType === 'BID_SECURING_DECLARATION' ? (
              /* OPTION 1: OFFICIAL GPPB STATUTORY NOTARIZED BID SECURING DECLARATION */
              <div className="bsd-legal-paper single-page-paper w-[13in] min-h-[8.5in] aspect-[13/8.5] bg-white text-slate-950 p-[0.75in] shadow-2xl font-serif text-[10.5pt] leading-relaxed flex flex-col justify-start mx-auto border border-slate-300">

                <div className="space-y-5">

                  <div className="text-sm font-serif">
                    REPUBLIC OF THE PHILIPPINES)<br />
                    {jurisdictionType === 'CITY' ? 'CITY OF ' : jurisdictionType === 'MUNICIPALITY' ? 'MUNICIPALITY OF ' : 'CITY/MUNICIPALITY OF '}
                    <u>{notaryPlace || '____________________'}</u> ) S.S.
                  </div>

                  <div className="text-center my-4 font-serif">
                    <h2 className="text-base font-bold uppercase tracking-wider font-sans text-slate-950">BID SECURING DECLARATION</h2>
                    <p className="text-[10pt] font-mono text-slate-700 mt-1">Project Reference No.: <strong><u>{projectRefNo}</u></strong></p>
                  </div>

                  <p className="font-serif text-justify leading-relaxed">
                    To: <strong><u>{procuringEntity}</u></strong><br />
                    Address: Metro Manila, Philippines
                  </p>

                  <p className="font-serif text-justify leading-relaxed">
                    I/We, the undersigned, declare that:
                  </p>

                  <ol className="list-decimal pl-6 space-y-3 font-serif text-justify">
                    <li>
                      I/We understand that, according to your conditions, bids must be supported by a Bid Security, which may be in the form of a Bid Securing Declaration.
                    </li>

                    <li>
                      I/We accept that: (a) I/we will be automatically disqualified from bidding for any procurement contract with any procuring entity for a period of two (2) years upon receipt of your Blacklisting Order; and, (b) I/we will pay the applicable fine provided under Section 6 of the Guidelines on the Use of Bid Securing Declaration, within fifteen (15) days from receipt of the written demand by the procuring entity for the commission of acts resulting to the enforcement of the bid securing declaration under Sections 23.1(b), 34.2, 40.1 and 69.1, except 69.1(f), of the IRR of RA No. 9184 & RA No. 12009; without prejudice to other legal action the government may undertake.
                    </li>

                    <li>
                      I/We understand that this Bid Securing Declaration shall cease to be valid on the expiration of the bid validity period indicated above, or upon the occurrence of any of the following events:
                      <ol className="list-[lower-alpha] pl-6 space-y-1 mt-1">
                        <li>Upon expiration of the bid validity period (<u>{validityDays}</u>), or any extension thereof;</li>
                        <li>I am/we are declared ineligible or post-disqualified upon receipt of your notice to such effect, and (i) I/we failed to file a request for reconsideration; or (ii) I/we filed a waiver to avail of said right; or</li>
                        <li>I am/we are declared the bidder with the Lowest Calculated Responsive Bid / Highest Rated Responsive Bid, and I/we have furnished the performance security and signed the Contract.</li>
                      </ol>
                    </li>
                  </ol>

                  <p className="pt-2 font-serif text-justify leading-relaxed">
                    IN WITNESS WHEREOF, I/We have hereunto set my/our hand/s this _____ day of __________________, 20___ at <u>{notaryPlace || '____________________'}</u>, Philippines.
                  </p>

                  {/* Signatory Box */}
                  <div className="pt-6 flex flex-col items-end">
                    <div className="w-80 text-center space-y-1">
                      <p className="text-[10pt] font-semibold">Duly authorized to sign the Bid for and on behalf of:</p>
                      <p className="font-bold text-slate-950 uppercase border-b border-black pb-1">{companyName}</p>
                      <div className="pt-6">
                        <p className="font-bold text-slate-950 uppercase text-base">{signatoryName}</p>
                        <p className="text-[10pt] font-semibold text-slate-800">{signatoryTitle}</p>
                      </div>
                    </div>
                  </div>

                  {/* Notary Jurat Block */}
                  <div className="pt-6 border-t border-slate-300 font-serif space-y-3">
                    <p className="text-[10pt] font-serif leading-relaxed text-justify">
                      SUBSCRIBED AND SWORN to before me this _____ day of __________________ 20___ at <u>{notaryPlace || '____________________'}</u>, Philippines. Affiant/s is/are personally known to me and was/were identified by me through competent evidence of identity as defined in the 2004 Rules on Notarial Practice (A.M. No. 02-8-13-SC). Affiant/s exhibited to me his/her <u>{govIdType}</u> with no. <u>{govIdNumber}</u>, with his/her photograph and signature appearing thereon.
                    </p>

                    <p className="text-[10pt] font-serif pt-1">
                      WITNESS MY HAND AND SEAL this _____ day of __________________ 20___.
                    </p>

                    <div className="pt-4 flex items-start justify-between text-[9.5pt] font-mono text-slate-800">
                      <div className="space-y-0.5">
                        <p>Doc. No. _________;</p>
                        <p>Page No. _________;</p>
                        <p>Book No. _________;</p>
                        <p>Series of 2026.</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-bold text-slate-950 uppercase">NOTARY PUBLIC</p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Page Footer */}
                <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[9pt] font-mono text-slate-700">
                  <div className="flex items-center gap-3">
                    <DocumentQrCode
                      details={{
                        companyName: companyName,
                        documentName: 'Bid Securing Declaration (Legal Exhibit)',
                        documentNumber: `EXHIBIT-BSD-${projectRefNo}`,
                        projectTitle: projectTitle,
                        projectRefNo: projectRefNo,
                        procuringEntity: procuringEntity,
                        dateTimeSubmitted: new Date().toLocaleString(),
                        documentCategory: 'Notarized Documents',
                        generatedBy: companyName
                      }}
                      size={50}
                      showCaption={false}
                    />
                    <div className="space-y-0.5 text-[8.5pt]">
                      <p className="font-bold text-slate-950 uppercase">{companyName}</p>
                      <p>PROJECT: <strong>{projectTitle}</strong></p>
                      <p>REF NO: <strong>{projectRefNo}</strong> • ENTITY: <strong>{procuringEntity}</strong></p>
                    </div>
                  </div>
                  <span className="font-bold font-mono">Page 1 of 1</span>
                </div>

              </div>
            ) : (
              /* OPTION 2: OFFICIAL GPPB BANK GUARANTEE / DRAFT / IRREVOCABLE LETTER OF CREDIT WITH LOCAL UNIVERSAL/COMMERCIAL BANK CONFIRMATION */
              <div className="bsd-legal-paper single-page-paper w-[13in] min-h-[8.5in] aspect-[13/8.5] bg-white text-slate-950 p-[0.75in] shadow-2xl font-serif text-[10.5pt] leading-relaxed flex flex-col justify-start mx-auto border border-slate-300">

                <div className="space-y-5">

                  {/* Header / Issuing Foreign Bank Info */}
                  <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
                    <div>
                      <h2 className="text-sm font-bold uppercase font-sans text-slate-950">{issuingForeignBank}</h2>
                      <p className="text-[9pt] font-mono text-slate-700">{foreignBankAddress}</p>
                      <p className="text-[9pt] font-mono text-slate-800 font-bold mt-0.5">REF NO: {guaranteeRefNumber}</p>
                    </div>
                    <div className="text-right font-mono text-[9pt]">
                      <p className="font-bold">FORM OF BID SECURITY</p>
                      <p className="text-slate-700">Bank Draft / Guarantee / ILC</p>
                      <p className="text-slate-700">Date: {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="text-center my-4 font-serif">
                    <h2 className="text-sm font-bold uppercase tracking-wider">BANK GUARANTEE / IRREVOCABLE LETTER OF CREDIT FORM FOR BID SECURITY</h2>
                    <p className="text-[9.5pt] font-mono text-slate-700 mt-0.5">Project Reference No.: <strong><u>{projectRefNo}</u></strong></p>
                  </div>

                  <p className="font-serif text-[10pt]">
                    To: <strong><u>{procuringEntity}</u></strong><br />
                    Address: Metro Manila, Philippines
                  </p>

                  <p className="font-serif text-justify text-[10pt] leading-relaxed">
                    WHEREAS, <strong><u>{companyName}</u></strong> (hereinafter called "the Bidder") has submitted its bid dated <u>{new Date().toLocaleDateString()}</u> for the execution of <strong><u>{projectTitle}</u></strong> under Project Reference No. <strong><u>{projectRefNo}</u></strong> (hereinafter called "the Bid").
                  </p>

                  <p className="font-serif text-justify text-[10pt] leading-relaxed">
                    KNOW ALL MEN by these presents that WE, <strong><u>{issuingForeignBank}</u></strong>, having our registered office at <u>{foreignBankAddress}</u>, are bound unto <strong><u>{procuringEntity}</u></strong> (hereinafter called "the Procuring Entity") in the sum of <strong><u>{guaranteeAmount}</u></strong>, for which payment well and truly to be made to the said Procuring Entity, the Bank binds itself, its successors and assigns by these presents.
                  </p>

                  <p className="font-serif text-justify text-[10pt] leading-relaxed">
                    THE CONDITIONS of this obligation are:
                  </p>
                  <ol className="list-decimal pl-6 space-y-1.5 font-serif text-[9.5pt] text-justify">
                    <li>If the Bidder withdraws its Bid during the period of bid validity specified in the Form of Bid; or</li>
                    <li>If the Bidder having been notified of the acceptance of its bid by the Procuring Entity during the period of bid validity: (a) fails or refuses to execute the Contract Form; or (b) fails or refuses to furnish the Performance Security in accordance with the Instructions to Bidders.</li>
                  </ol>

                  <p className="font-serif text-justify text-[9.5pt] leading-relaxed">
                    We undertake to pay to the Procuring Entity up to the above amount upon receipt of its first written demand, without the Procuring Entity having to substantiate its demand, provided that in its demand the Procuring Entity will note that the amount claimed by it is due to it owing to the occurrence of one or both of the two conditions, specifying the occurred condition or conditions.
                  </p>

                  {/* Foreign Issuing Bank Signature */}
                  <div className="pt-2 flex justify-end font-serif">
                    <div className="w-72 text-center border-t border-slate-800 pt-1">
                      <p className="font-bold text-slate-950 uppercase text-[9.5pt]">{foreignBankOfficer}</p>
                      <p className="text-[8.5pt] text-slate-700 font-sans">{foreignBankOfficerTitle}</p>
                      <p className="text-[8pt] font-mono text-slate-600 uppercase mt-0.5">{issuingForeignBank}</p>
                    </div>
                  </div>

                  {/* MANDATORY LOCAL UNIVERSAL / COMMERCIAL BANK CONFIRMATION BLOCK */}
                  <div className="pt-3 border-t-2 border-dashed border-slate-400 font-serif space-y-2">
                    <div className="bg-slate-100 p-2 rounded border border-slate-300 text-center">
                      <h3 className="text-[9.5pt] font-bold uppercase tracking-wider text-slate-950 font-sans">
                        CONFIRMATION & AUTHENTICATION BY PHILIPPINE UNIVERSAL / COMMERCIAL BANK
                      </h3>
                      <p className="text-[8.5pt] font-mono text-slate-700">Required pursuant to Section 27.2 of the IRR of RA 12009 / RA 9184 for Foreign Bank Securities</p>
                    </div>

                    <p className="text-[9.5pt] font-serif leading-relaxed text-justify">
                      WE, <strong><u>{localConfirmingBank}</u></strong>, a Universal/Commercial Bank duly organized and licensed under the laws of the Republic of the Philippines with principal office at <u>{localBankAddress}</u>, HEREBY CONFIRM AND AUTHENTICATE the foregoing Bank Guarantee / Irrevocable Letter of Credit No. <strong><u>{guaranteeRefNumber}</u></strong> issued by <u>{issuingForeignBank}</u> in favor of <u>{procuringEntity}</u>.
                    </p>

                    <p className="text-[9.5pt] font-serif leading-relaxed text-justify">
                      We hereby confirm that this financial instrument is valid, binding, and fully enforceable in the Republic of the Philippines, and that our bank guarantees prompt payment upon written demand by the Procuring Entity in accordance with the terms herein.
                    </p>

                    <div className="pt-4 flex justify-between items-end">
                      <div className="text-[8.5pt] font-mono text-slate-700">
                        <p>Date Confirmed: <strong>{new Date().toLocaleDateString()}</strong></p>
                        <p>BSP License Ref: <strong>BSP-UAP-2026-CONFIRM</strong></p>
                      </div>
                      <div className="w-72 text-center border-t border-slate-800 pt-1">
                        <p className="font-bold text-slate-950 uppercase text-[9.5pt]">{localBankOfficer}</p>
                        <p className="text-[8.5pt] text-slate-700 font-sans">{localBankOfficerTitle}</p>
                        <p className="text-[8pt] font-mono text-slate-900 font-bold uppercase mt-0.5">{localConfirmingBank}</p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Page Footer */}
                <div className="pt-3 border-t border-slate-300 flex items-center justify-between text-[9pt] font-mono text-slate-700">
                  <div className="flex items-center gap-3">
                    <DocumentQrCode
                      details={{
                        companyName: companyName,
                        documentName: 'Bank Guarantee / Foreign ILC Confirmation (Bid Security)',
                        documentNumber: `EXHIBIT-BG-${projectRefNo}`,
                        projectTitle: projectTitle,
                        projectRefNo: projectRefNo,
                        procuringEntity: procuringEntity,
                        dateTimeSubmitted: new Date().toLocaleString(),
                        documentCategory: 'Notarized Documents',
                        generatedBy: companyName
                      }}
                      size={50}
                      showCaption={false}
                    />
                    <div className="space-y-0.5 text-[8.5pt]">
                      <p className="font-bold text-slate-950 uppercase">{companyName}</p>
                      <p>FOREIGN BANK: <strong>{issuingForeignBank}</strong> • CONFIRMING BANK: <strong>{localConfirmingBank}</strong></p>
                      <p>REF NO: <strong>{projectRefNo}</strong> • ENTITY: <strong>{procuringEntity}</strong></p>
                    </div>
                  </div>
                  <span className="font-bold font-mono">Page 1 of 1</span>
                </div>

              </div>
            )}

          </div>
        </div>

        {/* Footer Bar */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/95 sticky bottom-0 z-10 shrink-0 no-print">
          <span className="text-xs text-slate-400 font-mono">
            RA 12009 Section 27.5 Standard • Legal 13" × 8.5" Printable Output
          </span>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs transition">
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg transition flex items-center gap-2"
            >
              <FileSignature className="w-4 h-4" />
              <span>Save & Complete Document</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BidSecuringDeclarationModal;

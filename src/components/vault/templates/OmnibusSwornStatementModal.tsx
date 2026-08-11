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
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export interface OmnibusSwornStatementModalProps {
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose: () => void;
}

export const OmnibusSwornStatementModal: React.FC<OmnibusSwornStatementModalProps> = ({
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
  const [maritalStatus, setMaritalStatus] = useState<'single' | 'married' | 'widow' | 'widower'>('single');
  const [affiantNationality, setAffiantNationality] = useState('Filipino');
  const [govIdType, setGovIdType] = useState('Passport / Driver\'s License');
  const [govIdNumber, setGovIdNumber] = useState('P-109283029A');
  const [notaryPlace, setNotaryPlace] = useState('');
  const [jurisdictionType, setJurisdictionType] = useState<'CITY' | 'MUNICIPALITY' | 'BOTH'>('BOTH');
  const [entityType, setEntityType] = useState<'ALL' | 'CORPORATION' | 'SOLE PROPRIETORSHIP' | 'PARTNERSHIP' | 'JOINT VENTURE'>('ALL');

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
    const fileName = `${projectRefNo}_Item_g_Omnibus_Sworn_Statement_${today}.pdf`;
    const templateElems = document.querySelectorAll('.oss-legal-paper');
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
      const templateElems = document.querySelectorAll('.oss-legal-paper');
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
      onSaveAndComplete(dataUrl, 'Omnibus Sworn Statement (Notarized OSS)', projectRefNo, projectTitle);
    } catch {
      onSaveAndComplete(undefined, 'Omnibus Sworn Statement (Notarized OSS)', projectRefNo, projectTitle);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <style>{`
        @media print {
          @page {
            size: 8.5in 13in;
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
          .oss-legal-paper {
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

        {/* Modal Header Bar */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/95 sticky top-0 z-20 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight flex items-center gap-2">
                <span>Omnibus Sworn Statement (Notarized OSS)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                  GPPB-OSS-2025 • RA 12009 Standard
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Legal 8.5" × 13"
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Official Statutory Notarized Sworn Statement Template for Public Bidding Compliance
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

        {/* Scrollable Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 space-y-6">

          {/* Form Inputs Control Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 no-print">
            <div className="flex items-center gap-2 text-xs font-mono text-blue-400 font-bold border-b border-slate-800 pb-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span>Bidding Opportunity & Signatory Legal Inputs:</span>
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
                <label className="block text-slate-400 font-mono mb-1">Company / Bidder Name</label>
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

              <div>
                <label className="block text-slate-400 font-mono mb-1">Affiant / Signatory Name</label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Marital / Civil Status</label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono text-xs cursor-pointer capitalize"
                >
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="widow">Widow</option>
                  <option value="widower">Widower</option>
                </select>
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
                <label className="block text-slate-400 font-mono mb-1">Govt-Issued ID Type & Number</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={govIdType}
                    onChange={(e) => setGovIdType(e.target.value)}
                    placeholder="ID Type"
                    className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white"
                  />
                  <input
                    type="text"
                    value={govIdNumber}
                    onChange={(e) => setGovIdNumber(e.target.value)}
                    placeholder="ID Number"
                    className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Notary Jurat Location</label>
                <input
                  type="text"
                  value={notaryPlace}
                  onChange={(e) => setNotaryPlace(e.target.value)}
                  placeholder="Leave blank or enter city/municipality"
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

              <div>
                <label className="block text-slate-400 font-mono mb-1">Business Entity Type</label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono text-xs cursor-pointer"
                >
                  <option value="ALL">(SOLE PROPRIETORSHIP / CORPORATION / PARTNERSHIP / JOINT VENTURE)</option>
                  <option value="CORPORATION">(CORPORATION)</option>
                  <option value="SOLE PROPRIETORSHIP">(SOLE PROPRIETORSHIP)</option>
                  <option value="PARTNERSHIP">(PARTNERSHIP)</option>
                  <option value="JOINT VENTURE">(JOINT VENTURE / CONSORTIUM)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Legal 8.5" x 13" Printable Pages Preview */}
          <div className="space-y-8 flex flex-col items-center">

            {/* PAGE 1 */}
            <div className="oss-legal-paper single-page-paper w-[8.5in] min-h-[13in] bg-white text-slate-950 p-[0.75in] shadow-2xl font-serif text-[11pt] leading-relaxed flex flex-col justify-between mx-auto border border-slate-300">

              <div className="space-y-5">

                <div className="text-sm font-serif">
                  REPUBLIC OF THE PHILIPPINES)<br />
                  {jurisdictionType === 'CITY' ? 'CITY OF ' : jurisdictionType === 'MUNICIPALITY' ? 'MUNICIPALITY OF ' : 'CITY/MUNICIPALITY OF '}
                  <u>{notaryPlace || '____________________'}</u> ) S.S.
                </div>

                <div className="text-center my-4 font-serif">
                  <h2 className="text-base font-bold uppercase tracking-wider">OMNIBUS SWORN STATEMENT</h2>
                  <p className="text-[10pt] italic text-slate-700 mt-1 font-semibold">
                    {entityType === 'ALL'
                      ? '(SOLE PROPRIETORSHIP / CORPORATION / PARTNERSHIP / JOINT VENTURE)'
                      : `(${entityType})`}
                  </p>
                </div>

                <p className="font-serif text-justify leading-relaxed">
                  I, <strong><u>{signatoryName}</u></strong>, of legal age, <u>{maritalStatus}</u>, <u>{affiantNationality}</u>, and with residence at <strong><u>{companyAddress}</u></strong>, after having been duly sworn in accordance with law, do hereby depose and state that:
                </p>

                <ol className="list-decimal pl-6 space-y-4 font-serif text-justify">
                  <li>
                    I am the duly authorized and designated representative of <strong><u>{companyName}</u></strong> with office address at <strong><u>{companyAddress}</u></strong>;
                  </li>

                  <li>
                    I am granted full power and authority to do, execute and perform any and all acts necessary to participate, submit the bid, and to sign and execute the ensuing contract for <strong><u>{projectTitle}</u></strong> of the <strong><u>{procuringEntity}</u></strong>, as supported by the attached duly notarized Secretary's Certificate, Board/Partnership Resolution, or Special Power of Attorney;
                  </li>

                  <li>
                    <strong><u>{companyName}</u></strong> is not "blacklisted" or barred from bidding by the Government of the Philippines or any of its agencies, offices, corporations, or Local Government Units, foreign government/foreign or international financing institution whose blacklisting rules have been recognized by the Government Procurement Policy Board; by itself or by relation, membership, association, affiliation, or controlling interest with another blacklisted person or entity;
                  </li>

                  <li>
                    Each of the documents submitted in satisfaction of the bidding requirements is an authentic copy of the original, complete, and all statements and information provided therein are true and correct;
                  </li>

                  <li>
                    <strong><u>{companyName}</u></strong> is authorizing the Head of the Procuring Entity or its duly authorized representative(s) to verify all the documents submitted;
                  </li>

                  <li>
                    The corporation itself, and its officers, directors, controlling stockholders and beneficial owners of <strong><u>{companyName}</u></strong> are not related by consanguinity or affinity up to the third civil degree to the Head of the Procuring Entity, Procurement Agent (if engaged), End-User or Implementing Unit, project consultants, head of the Project Management Office, or the members of the Bids and Awards Committee (BAC), the Technical Working Group, and the BAC Secretariat;
                  </li>

                  <li>
                    It is understood that failure to faithfully disclose its relationship with the Head of the Procuring Entity, members of the BAC, TWG, and Secretariat, or the project consultants of the Procuring Entity by consanguinity or affinity up to the third civil degree, as well as submission of beneficial ownership information containing false entries shall be subject to blacklisting under Section 100 of the IRR of RA No. 12009.
                    <br />
                    • <strong><u>{companyName}</u></strong> declares its beneficial ownership information consistent with its updated General Information Sheet (GIS) or Beneficial Ownership Declaration Form duly submitted to the SEC in compliance with Sections 20.2.9.1, 81, and 82 of the IRR of RA No. 12009.
                  </li>
                </ol>
              </div>

              {/* Page 1 Footer */}
              <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[9pt] font-mono text-slate-700">
                <div className="flex items-center gap-3">
                  <DocumentQrCode
                    details={{
                      companyName: companyName,
                      documentName: 'Omnibus Sworn Statement (Page 1 of 2)',
                      documentNumber: `EXHIBIT-OSS-${projectRefNo}-P1`,
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
                <span className="font-bold font-mono">Page 1 of 2</span>
              </div>

            </div>

            {/* PAGE 2 */}
            <div className="oss-legal-paper single-page-paper w-[8.5in] min-h-[13in] bg-white text-slate-950 p-[0.75in] shadow-2xl font-serif text-[11pt] leading-relaxed flex flex-col justify-between mx-auto border border-slate-300">

              <div className="space-y-6">
                <ol start={8} className="list-decimal pl-6 space-y-5 font-serif text-justify">
                  <li>
                    <strong><u>{companyName}</u></strong> complies with existing labor laws and standards; and
                  </li>

                  <li>
                    <strong><u>{companyName}</u></strong> is aware of and has undertaken the responsibilities as a Bidder:
                    <ol className="list-[lower-alpha] pl-6 space-y-1.5 mt-1.5">
                      <li>Carefully examine all of the Bidding Documents;</li>
                      <li>Acknowledge all conditions, local or otherwise, affecting the implementation of the Contract;</li>
                      <li>Made an estimate of the facilities available and needed for the contract to be bid, if any; and</li>
                      <li>Inquire or secure Supplemental/Bid Bulletin(s) issued for <strong><u>{projectTitle}</u></strong>.</li>
                    </ol>
                  </li>

                  <li>
                    <strong><u>{companyName}</u></strong> did not give or pay directly or indirectly, any commission, amount, fee, or any form of consideration, pecuniary or otherwise, to any person or official, personnel or representative of the government in relation to any procurement project or activity.
                  </li>
                </ol>

                <p className="pt-4 font-serif">
                  IN WITNESS WHEREOF, I have hereunto set my hand this _____ day of ____________, 20___ at <u>{notaryPlace}</u>, Philippines.
                </p>

                {/* Signatory Box */}
                <div className="pt-8 flex flex-col items-end">
                  <div className="w-80 text-center space-y-1">
                    <p className="text-[10pt] font-semibold">Duly authorized to sign for and on behalf of:</p>
                    <p className="font-bold text-slate-950 uppercase border-b border-black pb-1">{companyName}</p>
                    <div className="pt-8">
                      <p className="font-bold text-slate-950 uppercase text-base">{signatoryName}</p>
                      <p className="text-[10pt] font-semibold text-slate-800">{signatoryTitle}</p>
                    </div>
                  </div>
                </div>

                {/* Notary Jurat Block */}
                <div className="pt-8 border-t border-slate-300 font-serif space-y-3">
                  <p className="text-[10pt] font-serif leading-relaxed text-justify">
                    SUBSCRIBED AND SWORN to before me this _____ day of __________________ 20___ at <u>{notaryPlace}</u>, Philippines. Affiant/s is/are personally known to me and was/were identified by me through competent evidence of identity as defined in the 2004 Rules on Notarial Practice (A.M. No. 02-8-13-SC). Affiant/s exhibited to me his/her <u>{govIdType}</u> with no. <u>{govIdNumber}</u>, with his/her photograph and signature appearing thereon.
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

              {/* Page 2 Footer */}
              <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[9pt] font-mono text-slate-700">
                <div className="flex items-center gap-3">
                  <DocumentQrCode
                    details={{
                      companyName: companyName,
                      documentName: 'Omnibus Sworn Statement (Page 2 of 2)',
                      documentNumber: `EXHIBIT-OSS-${projectRefNo}-P2`,
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
                <span className="font-bold font-mono">Page 2 of 2</span>
              </div>

            </div>

          </div>
        </div>

        {/* Footer Bar */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/95 sticky bottom-0 z-10 shrink-0 no-print">
          <span className="text-xs text-slate-400 font-mono">
            GPPB Resolution No. 02-2025 Standard • Legal 8.5" × 13" Printable Output
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

export default OmnibusSwornStatementModal;

import React, { useState, useEffect } from 'react';
import { Tenant } from '../../../types';
import { generateAndDownloadThreeLayerPdf } from '../../../utils/pdfExportEngine';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import DocumentQrCode from '../../common/DocumentQrCode';
import {
  X,
  Printer,
  Download,
  Plus,
  Trash2,
  Building2,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export interface WarrantyLotItem {
  id: string;
  lotNumber: string;
  warranty: string;
}

export interface AfterSalesServiceModalProps {
  item?: { id: string; code: string; name: string };
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose?: () => void;
}

const DEFAULT_WARRANTY_LOTS: WarrantyLotItem[] = [
  { id: '1', lotNumber: 'Lot 1', warranty: '2 Years Warranty for all Parts' },
  { id: '2', lotNumber: 'Lot 2', warranty: '2 Years 24/7 Customer Support' },
  { id: '3', lotNumber: 'Lot 3', warranty: '2 Years Warranty for Workmanship' }
];

const formatDateDisplay = (raw: string): string => {
  if (!raw) return 'March 9, 2026';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return raw;
  }
};

const formatDateUpper = (raw: string): string => {
  return formatDateDisplay(raw).toUpperCase();
};

export const AfterSalesServiceModal: React.FC<AfterSalesServiceModalProps> = ({
  item,
  tenant,
  activeProjectRefNo = '',
  activeProjectTitle = '',
  activeProcuringEntity = '',
  onSaveAndComplete,
  onClose
}) => {
  // Opportunity Finder Bidding Projects
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  // Template State Fields
  const [projectRefNo, setProjectRefNo] = useState<string>(activeProjectRefNo || '12795242');
  const [bidRefNo, setBidRefNo] = useState<string>(activeProjectRefNo || '12795242');
  const [solicitationNo, setSolicitationNo] = useState<string>('2025-12-4162-MO');
  const [projectTitle, setProjectTitle] = useState<string>(
    activeProjectTitle ||
    'SUPPLY, DELIVERY, INSTALLATION, TESTING, AND CONFIGURATION OF ICT EQUIPMENT, PERIPHERALS, SYSTEMS AND SOFTWARE FOR THE LA TRINIDAD COMMUNICATION, INFORMATION & NETWORK HUB'
  );
  const [procuringEntity, setProcuringEntity] = useState<string>(activeProcuringEntity || 'Municipality of La Trinidad');
  const [provinceAddress, setProvinceAddress] = useState<string>('Benguet');
  const [docDate, setDocDate] = useState<string>('March 9, 2026');
  const [bacCommittee, setBacCommittee] = useState<string>('Bids and Awards Committee');
  const [salutation, setSalutation] = useState<string>(`Dear ${activeProcuringEntity || 'Municipality of La Trinidad'}:`);

  const [guarantyText, setGuarantyText] = useState<string>(
    'we hereby guaranty that the goods to be delivered are in quality or similar to the technical specification or as approved sample.'
  );
  const [undertakingText, setUndertakingText] = useState<string>(
    'That we are giving the end-user to check every item and return for replacement if found damage through company defects. That we give them a warranty of:'
  );

  const [lots, setLots] = useState<WarrantyLotItem[]>(DEFAULT_WARRANTY_LOTS);

  // Signatory & Date State (Auto-populated from Company Signatory & Project Submission Date)
  const [companyName, setCompanyName] = useState<string>(
    tenant?.companyName || ''
  );
  const [signatoryName, setSignatoryName] = useState<string>(
    tenant?.authorizedSignatory?.name || ''
  );
  const [signatoryTitle, setSignatoryTitle] = useState<string>(
    tenant?.authorizedSignatory?.title || ''
  );
  const [signatoryDate, setSignatoryDate] = useState<string>('');

  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Load Saved State / Sync with Scoped Storage & Tenant Company Signatory
  useEffect(() => {
    const tenantId = tenant?.id || 'default';
    const list = getOpportunityProjects(tenantId);
    setOppProjects(list);

    // Sync tenant company signatory details automatically
    if (tenant?.companyName) setCompanyName(tenant.companyName);
    if (tenant?.authorizedSignatory?.name) setSignatoryName(tenant.authorizedSignatory.name);
    if (tenant?.authorizedSignatory?.title) setSignatoryTitle(tenant.authorizedSignatory.title);

    const storageKey = `bidocs_after_sales_${tenantId}_${projectRefNo || 'default'}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.projectRefNo) setProjectRefNo(parsed.projectRefNo);
        if (parsed.bidRefNo) setBidRefNo(parsed.bidRefNo);
        if (parsed.solicitationNo) setSolicitationNo(parsed.solicitationNo);
        if (parsed.projectTitle) setProjectTitle(parsed.projectTitle);
        if (parsed.procuringEntity) setProcuringEntity(parsed.procuringEntity);
        if (parsed.provinceAddress) setProvinceAddress(parsed.provinceAddress);
        if (parsed.docDate) setDocDate(parsed.docDate);
        if (parsed.bacCommittee) setBacCommittee(parsed.bacCommittee);
        if (parsed.salutation) setSalutation(parsed.salutation);
        if (parsed.guarantyText) setGuarantyText(parsed.guarantyText);
        if (parsed.undertakingText) setUndertakingText(parsed.undertakingText);
        if (Array.isArray(parsed.lots) && parsed.lots.length > 0) setLots(parsed.lots);
        if (parsed.signatoryName) setSignatoryName(parsed.signatoryName);
        if (parsed.signatoryTitle) setSignatoryTitle(parsed.signatoryTitle);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.signatoryDate) setSignatoryDate(parsed.signatoryDate);
      } catch (e) {
        console.error('[AfterSales] Error loading saved draft:', e);
      }
    } else if (list.length > 0 && !selectedOppId) {
      const first = list[0];
      setBidRefNo(first.refNo);
      setSolicitationNo(first.solicitationNo || '2025-12-4162-MO');
      if (first.dateTimeSubmitted) {
        setDocDate(formatDateDisplay(first.dateTimeSubmitted));
        setSignatoryDate(formatDateUpper(first.dateTimeSubmitted));
      }
    }
  }, [tenant, projectRefNo]);

  // Persist Changes
  const saveState = (updatedLots?: WarrantyLotItem[]) => {
    const tenantId = tenant?.id || 'default';
    const storageKey = `bidocs_after_sales_${tenantId}_${projectRefNo || 'default'}`;
    const payload = {
      projectRefNo,
      bidRefNo,
      solicitationNo,
      projectTitle,
      procuringEntity,
      provinceAddress,
      docDate,
      bacCommittee,
      salutation,
      guarantyText,
      undertakingText,
      lots: updatedLots || lots,
      signatoryName,
      signatoryTitle,
      companyName,
      signatoryDate
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  };

  const handleAddLot = () => {
    const newLot: WarrantyLotItem = {
      id: String(Date.now()),
      lotNumber: `Lot ${lots.length + 1}`,
      warranty: '1 Year Standard Parts and Support Warranty'
    };
    const nextLots = [...lots, newLot];
    setLots(nextLots);
    saveState(nextLots);
  };

  const handleRemoveLot = (index: number) => {
    if (lots.length <= 1) return;
    const nextLots = lots.filter((_, idx) => idx !== index);
    setLots(nextLots);
    saveState(nextLots);
  };

  const handleLotChange = (index: number, field: 'lotNumber' | 'warranty', val: string) => {
    const nextLots = lots.map((it, idx) => (idx === index ? { ...it, [field]: val } : it));
    setLots(nextLots);
    saveState(nextLots);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    await new Promise((r) => setTimeout(r, 150));
    try {
      const cleanRef = (projectRefNo || 'DOC').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${cleanRef}_After_Sales_Services_${new Date().toISOString().split('T')[0]}.pdf`;
      const templateElem = document.getElementById('after-sales-paper') as HTMLElement;
      if (templateElem) {
        await generateAndDownloadThreeLayerPdf(null, templateElem, undefined, fileName);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveDraft = async () => {
    saveState();
    setIsExporting(true);
    await new Promise((r) => setTimeout(r, 200));
    try {
      const templateElem = document.getElementById('after-sales-paper');
      let dataUrl: string | undefined = undefined;
      if (templateElem) {
        const canvas = await (await import('html2canvas')).default(templateElem, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });
        dataUrl = canvas.toDataURL('image/png');
      }
      if (onSaveAndComplete) {
        onSaveAndComplete(dataUrl, 'After Sales Services & Warranty Undertaking', projectRefNo, projectTitle);
      }
    } catch {
      if (onSaveAndComplete) {
        onSaveAndComplete(undefined, 'After Sales Services & Warranty Undertaking', projectRefNo, projectTitle);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col print:border-none print:shadow-none print:max-h-none print:bg-white">
        {/* Top Dark Header Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 shrink-0 print:hidden no-export">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>After Sales Services & Warranty Undertaking</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                  Class A Technical Legal Template (8.5" × 13")
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Official GPPB Legal Format • Guaranty & Lot Warranty Matrix
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddLot}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 transition shadow flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Warranty Lot</span>
            </button>
            <button
              onClick={handleSaveDraft}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition shadow flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
              <span>Save & Complete</span>
            </button>
            <button
              onClick={handleExportPdf}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Legal PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Document</span>
            </button>
            {onClose && (
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950 space-y-6">
          {/* Target Bidding Project Selector & Auto-Fill Bar */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4 print:hidden no-export">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                Target Bidding Project Auto-Fill Settings (Linked to Opportunity Finder)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Changes auto-fill directly onto Legal Template header below</span>
            </div>

            <div>
              <label className="block text-slate-300 font-mono text-[11px] mb-1 font-bold text-blue-300">
                Select Project from Opportunity Finder:
              </label>
              <select
                value={selectedOppId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedOppId(val);
                  const found = oppProjects.find((p) => p.id === val || p.refNo === val);
                  if (found) {
                    setProjectRefNo(found.refNo);
                    setBidRefNo(found.refNo);
                    setProjectTitle(found.title);
                    setProcuringEntity(found.procuringEntity);
                    setSalutation(`Dear ${found.procuringEntity}:`);
                    if (found.solicitationNo) setSolicitationNo(found.solicitationNo);
                    if (found.dateTimeSubmitted) {
                      setDocDate(formatDateDisplay(found.dateTimeSubmitted));
                      setSignatoryDate(formatDateUpper(found.dateTimeSubmitted));
                    }
                  }
                }}
                className="w-full bg-slate-950 border border-blue-500/60 rounded-xl px-3 py-2 text-white font-mono text-xs font-bold focus:outline-none focus:border-blue-400 shadow-inner"
              >
                {oppProjects.length === 0 ? (
                  <option value="">-- No Active Bidding Projects Saved in Opportunity Finder --</option>
                ) : (
                  <>
                    <option value="">-- Select Active Bidding Opportunity / Project --</option>
                    {oppProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.refNo}] {p.title} — {p.procuringEntity} ({p.abc})
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1 border-t border-slate-800/80">
              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-blue-400">Bid Reference No.</label>
                <input
                  type="text"
                  value={bidRefNo}
                  onChange={(e) => { setBidRefNo(e.target.value); setProjectRefNo(e.target.value); saveState(); }}
                  placeholder="12795242"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-purple-400">Solicitation No.</label>
                <input
                  type="text"
                  value={solicitationNo}
                  onChange={(e) => { setSolicitationNo(e.target.value); saveState(); }}
                  placeholder="2025-12-4162-MO"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-emerald-400">Document Date</label>
                <input
                  type="text"
                  value={docDate}
                  onChange={(e) => { setDocDate(e.target.value); saveState(); }}
                  placeholder="March 9, 2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1 font-bold text-amber-400">Project Submission Date</label>
                <input
                  type="text"
                  value={signatoryDate}
                  onChange={(e) => { setSignatoryDate(e.target.value); saveState(); }}
                  placeholder="MARCH 19, 2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1">Company Signatory Name</label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => { setSignatoryName(e.target.value); saveState(); }}
                  placeholder="MARK VIN F. OCAMPO"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1">Company Signatory Title</label>
                <input
                  type="text"
                  value={signatoryTitle}
                  onChange={(e) => { setSignatoryTitle(e.target.value); saveState(); }}
                  placeholder="PRESIDENT"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1">Procuring Entity</label>
                <input
                  type="text"
                  value={procuringEntity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProcuringEntity(val);
                    setSalutation(`Dear ${val}:`);
                    saveState();
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono text-[10px] mb-1">Province / Municipality</label>
                <input
                  type="text"
                  value={provinceAddress}
                  onChange={(e) => { setProvinceAddress(e.target.value); saveState(); }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* OFFICIAL PRINTABLE PAPER DOCUMENT SHEET (Legal 13" x 8.5" Landscape Standard) */}
          <div
            id="after-sales-paper"
            className="single-page-paper print-document-sheet bg-white text-black p-8 sm:p-12 border-2 border-slate-900 shadow-2xl mx-auto rounded-md w-full max-w-[1280px] min-h-[760px] aspect-[13/8.5] font-serif space-y-6 text-left flex flex-col justify-between"
          >
            {/* Header Project Metadata Block */}
            <div className="space-y-1 font-serif text-sm text-black">
              <div>
                <span className="font-bold uppercase">PROJECT TITLE: </span>
                <span className="font-semibold uppercase">{projectTitle}</span>
              </div>
              <div>
                <span className="font-bold uppercase">BID REFERENCE NO.: </span>
                <span className="font-mono font-semibold">{bidRefNo}</span>
              </div>
              <div>
                <span className="font-bold uppercase">SOLICITATION NO.: </span>
                <span className="font-mono font-semibold">{solicitationNo}</span>
              </div>
              <div>
                <span className="font-bold uppercase">DATE: </span>
                <span className="font-semibold">{docDate}</span>
              </div>
            </div>

            {/* Document Centered Title */}
            <div className="text-center pt-2 pb-1">
              <h1 className="text-xl sm:text-2xl font-bold font-serif uppercase tracking-wide text-black">
                AFTER SALES SERVICES
              </h1>
            </div>

            {/* Recipient Address Block */}
            <div className="space-y-0.5 font-serif text-sm text-black">
              <p className="font-semibold">{bacCommittee}</p>
              <p className="font-semibold">{procuringEntity}</p>
              <p className="font-semibold">{provinceAddress}</p>
            </div>

            {/* Salutation */}
            <div className="font-serif text-sm font-semibold text-black pt-1">
              {salutation || `Dear ${procuringEntity}:`}
            </div>

            {/* Body Paragraph 1 */}
            <div className="font-serif text-sm leading-relaxed text-black text-justify">
              In connection with the supply and delivery of{' '}
              <span className="font-semibold uppercase">{projectTitle}</span>, Bid Reference No.{' '}
              <span className="font-mono font-semibold">{bidRefNo}</span>, Solicitation No.{' '}
              <span className="font-mono font-semibold">{solicitationNo}</span>, {guarantyText}
            </div>

            {/* Body Paragraph 2 */}
            <div className="font-serif text-sm leading-relaxed text-black text-justify">
              {undertakingText}
            </div>

            {/* Warranty Lots Table (2 Columns: Lot Number | Warranty) */}
            <div className="py-2">
              <table className="w-full border-collapse border-2 border-black text-black font-serif">
                <thead>
                  <tr className="border-b-2 border-black bg-slate-50">
                    <th className="border border-black px-4 py-2.5 text-center font-bold text-sm w-[35%]">
                      Lot Number
                    </th>
                    <th className="border border-black px-4 py-2.5 text-center font-bold text-sm w-[65%]">
                      Warranty
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((rowItem, idx) => (
                    <tr key={rowItem.id} className="border-b border-black">
                      {/* Lot Number Cell */}
                      <td className="border border-black px-4 py-2.5 text-center font-serif font-bold text-sm align-middle">
                        {!isExporting ? (
                          <input
                            type="text"
                            value={rowItem.lotNumber}
                            onChange={(e) => handleLotChange(idx, 'lotNumber', e.target.value)}
                            placeholder="Lot 1"
                            className="w-full bg-transparent text-center outline-none font-serif text-black font-bold focus:bg-amber-50/40 p-1 rounded border border-slate-200 hover:border-slate-400 print:hidden"
                          />
                        ) : null}
                        <div className={`${!isExporting ? 'hidden print:block' : 'block'} font-serif font-bold text-center`}>
                          {rowItem.lotNumber}
                        </div>
                      </td>

                      {/* Warranty Cell */}
                      <td className="border border-black px-4 py-2.5 font-serif text-sm align-middle break-words">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            {!isExporting ? (
                              <input
                                type="text"
                                value={rowItem.warranty}
                                onChange={(e) => handleLotChange(idx, 'warranty', e.target.value)}
                                placeholder="2 Years Warranty for all Parts"
                                className="w-full bg-transparent outline-none font-serif text-black font-medium focus:bg-amber-50/40 p-1 rounded border border-slate-200 hover:border-slate-400 print:hidden"
                              />
                            ) : null}
                            <div className={`${!isExporting ? 'hidden print:block' : 'block'} font-serif font-medium`}>
                              {rowItem.warranty}
                            </div>
                          </div>

                          {!isExporting && lots.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLot(idx)}
                              title="Remove Lot Row"
                              className="text-red-500 hover:text-red-700 print:hidden no-export p-1 shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signatory Block & Verification QR Code Footer */}
            <div className="pt-10 flex items-end justify-between font-serif text-sm">
              <div className="space-y-1">
                <p className="font-bold text-black uppercase">{signatoryName}</p>
                <p className="font-semibold text-black uppercase">{signatoryTitle}</p>
                <p className="font-semibold text-black uppercase">{companyName}</p>
                <p className="text-slate-800 font-semibold">{signatoryDate}</p>
              </div>

              <div className="text-right flex flex-col items-end">
                <DocumentQrCode
                  details={{
                    companyName: companyName,
                    documentName: 'After Sales Services & Warranty Undertaking',
                    documentNumber: `AFTER-SALES-${projectRefNo || '2026-901283'}`,
                    projectTitle: projectTitle,
                    projectRefNo: projectRefNo,
                    procuringEntity: procuringEntity,
                    dateTimeSubmitted: signatoryDate,
                    solicitationNo: solicitationNo,
                    documentCategory: 'Technical Eligibility',
                    generatedBy: companyName
                  }}
                  size={85}
                  showCaption={false}
                />
                <span className="text-[9px] font-mono text-slate-600 uppercase mt-1">
                  VERIFIED DOC • {projectRefNo}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900 shrink-0 print:hidden no-export">
          <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Class A Technical Legal Template — Legal 13" × 8.5" Landscape Standard</span>
          </div>

          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                Close
              </button>
            )}
            <button
              onClick={handleSaveDraft}
              className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-xl transition flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save & Complete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

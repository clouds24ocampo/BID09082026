import React, { useState } from 'react';
import { Tenant } from '../../../types';
import { generateAndDownloadThreeLayerPdf } from '../../../utils/pdfExportEngine';
import html2canvas from 'html2canvas';
import {
  X,
  Printer,
  Download,
  FileSignature,
  CheckCircle2,
  Building2,
  ShieldCheck,
  UserCheck,
  HardHat,
  Truck,
  FileText,
  Plus,
  Trash2,
  Paperclip
} from 'lucide-react';

interface TechnicalExhibitTemplateModalProps {
  item: { id: string; code: string; name: string };
  tenant: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete: (fileDataUrl?: string, customName?: string) => void;
  onClose: () => void;
}

export const TechnicalExhibitTemplateModal: React.FC<TechnicalExhibitTemplateModalProps> = ({
  item,
  tenant,
  activeProjectRefNo = 'PRJ-2026-901283',
  activeProjectTitle = 'Infrastructure & IT Systems Modernization Project',
  activeProcuringEntity = 'Department of Information & Communications Technology',
  onSaveAndComplete,
  onClose
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Common State
  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo);
  const [projectTitle, setProjectTitle] = useState(activeProjectTitle);
  const [procuringEntity, setProcuringEntity] = useState(activeProcuringEntity);
  const [companyName, setCompanyName] = useState(tenant?.companyName || 'Not Set (Register Company in Profile)');
  const [companyAddress, setCompanyAddress] = useState(tenant?.address || 'Not Set');
  const [signatoryName, setSignatoryName] = useState(tenant?.authorizedSignatory?.name || 'Authorized Signatory');
  const [signatoryTitle, setSignatoryTitle] = useState(tenant?.authorizedSignatory?.title || 'Company Representative');
  const [signatoryTin, setSignatoryTin] = useState(tenant?.authorizedSignatory?.tin || '123-456-789-000');

  // Item (d) Special PCAB License / JVA State
  const [jvaPartnerCompany, setJvaPartnerCompany] = useState('');
  const [pcabLicenseNo, setPcabLicenseNo] = useState(tenant?.pcabLicenseNo || '');
  const [pcabCategory, setPcabCategory] = useState(tenant?.pcabCategory || '');

  // Item (e) Bid Security BSD State
  const [securityType, setSecurityType] = useState<'BSD' | 'SURETY_BOND' | 'MANAGERS_CHECK' | 'BID Securing Declaration'>('BSD');
  const [securityAmount, setSecurityAmount] = useState('0.00');
  const [validityDays, setValidityDays] = useState('');
  const [suretyCompany, setSuretyCompany] = useState('');

  // Item (f.b) Key Personnel State
  const [keyPersonnel, setKeyPersonnel] = useState([
    { id: '1', name: 'Engr. Carlos R. Mendoza', position: 'Project Manager', profession: 'Licensed Civil Engineer', prcNo: 'PRC-0089123', totalExp: '15 Years', similarExp: '10 Years' },
    { id: '2', name: 'Engr. Maria L. Santos', position: 'Senior Systems Architect', profession: 'Licensed Electronics Engineer', prcNo: 'PRC-0094512', totalExp: '12 Years', similarExp: '8 Years' },
    { id: '3', name: 'Mr. Juanito P. Dela Cruz', position: 'Safety & Health Officer', profession: 'DOLE-Accredited BOSH/COSH', prcNo: 'DOLE-OHSO-2024', totalExp: '8 Years', similarExp: '6 Years' }
  ]);

  // Item (f.c) Equipment State
  const [equipmentList, setEquipmentList] = useState([
    { id: '1', description: 'Heavy Duty Fiber Fusion Splicer Machine', model: 'Fujikura 90S+', serialNo: 'FS-90S-2025-88', status: 'Owned', proofRef: 'OR/CR #90812' },
    { id: '2', description: 'OTDR Optical Time Domain Reflectometer', model: 'EXFO FTB-1v2', serialNo: 'EX-998231-PHI', status: 'Owned', proofRef: 'OR/CR #90815' },
    { id: '3', description: '50 KVA Mobile Diesel Generator Set', model: 'Denyo DCA-50ES', serialNo: 'DEN-2024-551', status: 'Leased', proofRef: 'Lease Agreement #LA-2026-04' }
  ]);

  // Item (g) Notary Public State
  const [notaryCity, setNotaryCity] = useState('City of Manila');
  const [docNo, setDocNo] = useState('142');
  const [pageNo, setPageNo] = useState('29');
  const [bookNo, setBookNo] = useState('XV');
  const [seriesYear, setSeriesYear] = useState('2026');

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    const cleanCode = item.code.replace(/[^a-zA-Z0-9]/g, '');
    const cleanName = item.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const fileName = `${projectRefNo}_Item_${cleanCode}_${cleanName}_${todayStr}.pdf`;

    const templateElem = document.querySelector('.single-page-paper') as HTMLElement;
    await generateAndDownloadThreeLayerPdf(null, templateElem, undefined, fileName);
  };

  const handleSave = async () => {
    try {
      const templateElem = document.querySelector('.single-page-paper') as HTMLElement;
      let dataUrl: string | undefined = undefined;
      if (templateElem) {
        const canvas = await html2canvas(templateElem, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' });
        dataUrl = canvas.toDataURL('image/png');
      }
      onSaveAndComplete(dataUrl, item.name);
    } catch (e) {
      onSaveAndComplete(undefined, item.name);
    }
  };

  const addKeyPersonnel = () => {
    setKeyPersonnel(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        name: 'New Professional',
        position: 'Field Engineer',
        profession: 'Licensed Engineer',
        prcNo: 'PRC-NEW-001',
        totalExp: '5 Years',
        similarExp: '3 Years'
      }
    ]);
  };

  const removeKeyPersonnel = (id: string) => {
    setKeyPersonnel(prev => prev.filter(p => p.id !== id));
  };

  const addEquipment = () => {
    setEquipmentList(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        description: 'New Equipment Unit',
        model: 'Standard Model',
        serialNo: 'SN-2026-001',
        status: 'Owned',
        proofRef: 'OR/CR #00000'
      }
    ]);
  };

  const removeEquipment = (id: string) => {
    setEquipmentList(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">

      {/* PRINT STYLESHEET OVERRIDE */}
      <style>{`
        @media print {
          @page {
            size: 8.5in 13in;
            margin: 0.4in;
          }
          header, nav, aside, button, .print\\:hidden, .no-print, .no-export, .proof-column, .actions-column, .sticky {
            display: none !important;
          }
          html, body, #root, .fixed, .backdrop-blur-md, .bg-slate-900, .bg-slate-950 {
            position: static !important;
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
          }
          .single-page-paper {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0.25in !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col">

        {/* Top Header Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>GPPB Statutory Legal Exhibit — Item {item.code}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                  Legal (8.5" × 13") Paper Standard
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-xl">
                {item.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export to PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Legal (8.5" × 13")</span>
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950 space-y-6">

          {/* Editor Form Inputs (Screen Only) */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 print:hidden no-export">
            <h4 className="text-xs font-bold text-blue-400 uppercase font-mono flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>Legal Exhibit Field Inputs — Customized for Item {item.code}</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Project Ref. No.</label>
                <input
                  type="text"
                  value={projectRefNo}
                  onChange={(e) => setProjectRefNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Project Title</label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Procuring Entity</label>
                <input
                  type="text"
                  value={procuringEntity}
                  onChange={(e) => setProcuringEntity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2 border-t border-slate-800">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Authorized Signatory Name</label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Designation / Title</label>
                <input
                  type="text"
                  value={signatoryTitle}
                  onChange={(e) => setSignatoryTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Signatory TIN</label>
                <input
                  type="text"
                  value={signatoryTin}
                  onChange={(e) => setSignatoryTin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Custom Inputs per Item */}
            {item.code === '(d)' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">JV Partner Company</label>
                  <input type="text" value={jvaPartnerCompany} onChange={(e) => setJvaPartnerCompany(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Special PCAB License No.</label>
                  <input type="text" value={pcabLicenseNo} onChange={(e) => setPcabLicenseNo(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">PCAB Category & Classification</label>
                  <input type="text" value={pcabCategory} onChange={(e) => setPcabCategory(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>
            )}

            {item.code === '(e)' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Form of Security</label>
                  <select value={securityType} onChange={(e) => setSecurityType(e.target.value as any)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white">
                    <option value="BSD">Bid Securing Declaration (BSD)</option>
                    <option value="SURETY_BOND">Surety Bond (Insurance)</option>
                    <option value="MANAGERS_CHECK">Manager's Check</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Security Amount</label>
                  <input type="text" value={securityAmount} onChange={(e) => setSecurityAmount(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Validity Period</label>
                  <input type="text" value={validityDays} onChange={(e) => setValidityDays(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Issuer / Bank / Insurance Co.</label>
                  <input type="text" value={suretyCompany} onChange={(e) => setSuretyCompany(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>
            )}

            {item.code === '(g)' && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Notary City</label>
                  <input type="text" value={notaryCity} onChange={(e) => setNotaryCity(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Doc No.</label>
                  <input type="text" value={docNo} onChange={(e) => setDocNo(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Page No.</label>
                  <input type="text" value={pageNo} onChange={(e) => setPageNo(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Book No.</label>
                  <input type="text" value={bookNo} onChange={(e) => setBookNo(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Series of</label>
                  <input type="text" value={seriesYear} onChange={(e) => setSeriesYear(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
              </div>
            )}

          </div>

          {/* GPPB LEGAL PAPER CONTAINER (Legal 8.5" x 13" Portrait Standard Layout) */}
          <div className="single-page-paper bg-white text-slate-900 font-sans p-8 sm:p-10 border-2 border-slate-900 rounded-2xl shadow-2xl space-y-6 max-w-[850px] min-h-[1100px] aspect-[8.5/13] mx-auto text-left relative flex flex-col justify-between print:m-0 print:border-none print:shadow-none">

            {/* Outer Legal Frame */}
            <div className="absolute inset-4 border-2 border-slate-900 pointer-events-none rounded-xl" />

            <div className="space-y-6">

              {/* Document Header */}
              <div className="border-b-2 border-slate-900 pb-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-950">
                  <span>PROJECT REF. NO: <strong className="text-blue-950">{projectRefNo}</strong></span>
                  <span>DATE: <strong>{todayStr}</strong></span>
                </div>
                <div className="text-xs font-mono text-slate-800">
                  <span>NAME OF PROJECT: <strong className="text-slate-950">{projectTitle}</strong></span>
                </div>
                <div className="text-xs font-mono text-slate-800">
                  <span>PROCURING ENTITY: <strong className="text-slate-950">{procuringEntity}</strong></span>
                </div>

                <div className="text-center pt-3 space-y-1">
                  <h2 className="text-base font-black text-slate-950 uppercase tracking-wide">
                    {item.name}
                  </h2>
                  <p className="text-[11px] font-mono text-slate-600 uppercase">
                    GPPB STATUTORY TECHNICAL EXHIBIT • ITEM {item.code}
                  </p>
                </div>
              </div>

              {/* Document Body Templates */}
              {item.code === '(d)' && (
                <div className="space-y-4 text-xs font-sans text-slate-900 leading-relaxed">
                  <p>
                    <strong>REPUBLIC OF THE PHILIPPINES</strong>)<br />
                    CITY OF {notaryCity.toUpperCase()} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;) S.S.
                  </p>
                  <h4 className="font-bold text-center uppercase border-b pb-1">JOINT VENTURE AGREEMENT & SPECIAL PCAB LICENSE CERTIFICATION</h4>
                  <p>
                    KNOW ALL MEN BY THESE PRESENTS: That <strong>{companyName}</strong>, represented herein by <strong>{signatoryName}</strong>, and <strong>{jvaPartnerCompany}</strong>, have entered into a Joint Venture Agreement for the purpose of jointly participating in the procurement of <strong>{projectTitle}</strong> under Ref. No. <strong>{projectRefNo}</strong>.
                  </p>
                  <div className="p-3 bg-slate-50 border border-slate-300 rounded font-mono text-[11px] space-y-1">
                    <p><strong>SPECIAL PCAB LICENSE NO:</strong> {pcabLicenseNo}</p>
                    <p><strong>LICENSE CATEGORY:</strong> {pcabCategory}</p>
                    <p><strong>JOINT VENTURE REGISTRATION STATUS:</strong> FULLY COMPLIANT / REGISTERED</p>
                  </div>
                  <p>
                    IN WITNESS WHEREOF, we have hereunto set our hands this {new Date().getDate()}th day of {new Date().toLocaleString('default', { month: 'long' })}, {seriesYear}.
                  </p>
                </div>
              )}

              {item.code === '(e)' && (
                <div className="space-y-4 text-xs font-sans text-slate-900 leading-relaxed">
                  <p>
                    <strong>REPUBLIC OF THE PHILIPPINES</strong>)<br />
                    CITY OF {notaryCity.toUpperCase()} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;) S.S.
                  </p>
                  <h4 className="font-bold text-center uppercase border-b pb-1">BID SECURING DECLARATION (GPPB RESOLUTION NO. 15-2014)</h4>
                  <p>
                    To: <strong>{procuringEntity}</strong><br />
                    Address: Metro Manila, Philippines
                  </p>
                  <p>
                    I/We, the undersigned, declare that: 1. I/We understand that, according to your conditions, bids must be supported by a Bid Security, which may be in the form of a Bid Securing Declaration.
                  </p>
                  <p>
                    2. I/We accept that: (a) I/we will be automatically disqualified from bidding for any procurement contract with any procuring entity for a period of two (2) years upon receipt of your Blacklisting Order; and, (b) I/we will pay the applicable fine provided under Section 6 of the Guidelines on the Use of Bid Securing Declaration.
                  </p>
                  <div className="p-3 bg-slate-50 border border-slate-300 rounded font-mono text-[11px] space-y-1">
                    <p><strong>FORM OF SECURITY:</strong> {securityType === 'BSD' ? 'Original Notarized Bid Securing Declaration' : securityType}</p>
                    <p><strong>GUARANTEE AMOUNT:</strong> {securityAmount}</p>
                    <p><strong>VALIDITY PERIOD:</strong> {validityDays}</p>
                    <p><strong>ISSUING ENTITY:</strong> {suretyCompany}</p>
                  </div>
                </div>
              )}

              {(item.code === '(f.b)' || item.code === '(f)' || item.code === '(f.a)') && (
                <div className="space-y-3 text-xs font-sans">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-950 uppercase font-mono text-[11px]">List of Contractor's Key Personnel Assigned to Contract</h4>
                    <button onClick={addKeyPersonnel} className="px-2 py-1 bg-blue-100 text-blue-950 font-bold text-[10px] rounded hover:underline print:hidden no-export">
                      + Add Personnel Row
                    </button>
                  </div>
                  <table className="w-full border-collapse border border-slate-900 text-left text-[11px]">
                    <thead className="bg-slate-100 font-mono text-[9px] uppercase border-b border-slate-900">
                      <tr>
                        <th className="p-1.5 border-r border-slate-900">#</th>
                        <th className="p-1.5 border-r border-slate-900">Name & Position</th>
                        <th className="p-1.5 border-r border-slate-900">Profession & PRC License</th>
                        <th className="p-1.5 border-r border-slate-900">Total Exp</th>
                        <th className="p-1.5 border-r border-slate-900">Similar Exp</th>
                        <th className="p-1.5 print:hidden no-export text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-400">
                      {keyPersonnel.map((p, idx) => (
                        <tr key={p.id}>
                          <td className="p-1.5 border-r border-slate-400 font-mono font-bold">{idx + 1}</td>
                          <td className="p-1.5 border-r border-slate-400">
                            <div className="font-bold text-slate-950">{p.name}</div>
                            <div className="text-[10px] text-slate-600">{p.position}</div>
                          </td>
                          <td className="p-1.5 border-r border-slate-400 font-mono text-[10px]">
                            <div>{p.profession}</div>
                            <div className="text-slate-500">{p.prcNo}</div>
                          </td>
                          <td className="p-1.5 border-r border-slate-400 font-mono">{p.totalExp}</td>
                          <td className="p-1.5 border-r border-slate-400 font-mono">{p.similarExp}</td>
                          <td className="p-1.5 print:hidden no-export text-right">
                            <button onClick={() => removeKeyPersonnel(p.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {item.code === '(f.c)' && (
                <div className="space-y-3 text-xs font-sans">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-950 uppercase font-mono text-[11px]">List of Contractor's Major Equipment Units Owned/Leased</h4>
                    <button onClick={addEquipment} className="px-2 py-1 bg-blue-100 text-blue-950 font-bold text-[10px] rounded hover:underline print:hidden no-export">
                      + Add Equipment Row
                    </button>
                  </div>
                  <table className="w-full border-collapse border border-slate-900 text-left text-[11px]">
                    <thead className="bg-slate-100 font-mono text-[9px] uppercase border-b border-slate-900">
                      <tr>
                        <th className="p-1.5 border-r border-slate-900">#</th>
                        <th className="p-1.5 border-r border-slate-900">Equipment Description</th>
                        <th className="p-1.5 border-r border-slate-900">Model / Serial No</th>
                        <th className="p-1.5 border-r border-slate-900">Status</th>
                        <th className="p-1.5 border-r border-slate-900">Proof Document Ref</th>
                        <th className="p-1.5 print:hidden no-export text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-400">
                      {equipmentList.map((eq, idx) => (
                        <tr key={eq.id}>
                          <td className="p-1.5 border-r border-slate-400 font-mono font-bold">{idx + 1}</td>
                          <td className="p-1.5 border-r border-slate-400 font-bold text-slate-950">{eq.description}</td>
                          <td className="p-1.5 border-r border-slate-400 font-mono text-[10px]">
                            <div>{eq.model}</div>
                            <div className="text-slate-500">{eq.serialNo}</div>
                          </td>
                          <td className="p-1.5 border-r border-slate-400 font-mono font-bold text-blue-900">{eq.status}</td>
                          <td className="p-1.5 border-r border-slate-400 font-mono text-[10px]">{eq.proofRef}</td>
                          <td className="p-1.5 print:hidden no-export text-right">
                            <button onClick={() => removeEquipment(eq.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {item.code === '(g)' && (
                <div className="space-y-3 text-xs font-sans text-slate-900 leading-normal">
                  <h4 className="font-bold text-center uppercase border-b pb-1">OMNIBUS SWORN STATEMENT (10-POINT GPPB STANDARD)</h4>
                  <p>
                    I, <strong>{signatoryName}</strong>, of legal age, Filipino, residing at {companyAddress}, after having been duly sworn in accordance with law, do hereby depose and state that:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1 text-[11px]">
                    <li>I am the duly authorized and designated representative of <strong>{companyName}</strong> with office address at {companyAddress}.</li>
                    <li>I am granted full power and authority to do, execute and perform any and all acts necessary to participate, submit the bid, and sign the contract.</li>
                    <li><strong>{companyName}</strong> is not "blacklisted" or barred from bidding by the Government of the Philippines or any of its agencies.</li>
                    <li>Each of the documents submitted in satisfaction of the bidding requirements is an authentic copy of the original.</li>
                    <li><strong>{companyName}</strong> is authorizing the Head of the Procuring Entity or its duly authorized representative(s) to verify all documents.</li>
                    <li>None of the officers/directors/key personnel is related to the Head of the Procuring Entity or BAC members by consanguinity or affinity up to the third civil degree.</li>
                    <li><strong>{companyName}</strong> complies with existing labor laws and standards.</li>
                    <li><strong>{companyName}</strong> is aware of and has undertaken responsibilities as a Bidder in respect of regional laws.</li>
                    <li><strong>{companyName}</strong> did not give or pay directly or indirectly any commission, fee, or compensation to any official.</li>
                    <li>In case advance payment was made or given, failure to perform shall constitute criminal liability for Swindling (Estafa).</li>
                  </ol>
                </div>
              )}

              {/* Signatory Footer */}
              <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-xs">
                <div>
                  <p className="font-mono text-[10px] text-slate-600 mb-6">AFFIANT / AUTHORIZED SIGNATORY:</p>
                  <p className="font-bold text-slate-950 uppercase font-mono">{signatoryName}</p>
                  <p className="text-slate-700 font-mono text-[10px]">{signatoryTitle}</p>
                  <p className="text-slate-500 font-mono text-[9px]">TIN: {signatoryTin}</p>
                </div>

                <div className="text-right space-y-1 font-mono text-[10px] text-slate-700">
                  <p className="font-bold text-slate-950">SUBSCRIBED AND SWORN TO BEFORE ME</p>
                  <p>Doc No. <strong>{docNo}</strong></p>
                  <p>Page No. <strong>{pageNo}</strong></p>
                  <p>Book No. <strong>{bookNo}</strong></p>
                  <p>Series of <strong>{seriesYear}</strong></p>
                </div>
              </div>

            </div>

            {/* Verification Footer Seal */}
            <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[9px] font-mono text-slate-500">
              <span>BiDOCS AES-256 Verified Legal Template • GPPB Standard Compliant</span>
              <span>Legal 8.5" × 13" Paper Standard</span>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/95 sticky bottom-0 z-10 shrink-0">
          <span className="text-xs text-slate-400 font-mono">
            Item {item.code} Statutory Exhibit • Accurate Inputs Loaded
          </span>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs transition">
              Close
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-xl transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save & Mark Item {item.code} Completed</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

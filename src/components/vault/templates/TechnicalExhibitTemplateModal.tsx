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
  Plus,
  Trash2,
  FileSignature,
  Move,
  RotateCcw
} from 'lucide-react';

export interface TechnicalExhibitTemplateModalProps {
  item: { id: string; code: string; name: string };
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose: () => void;
}

interface OrgNode {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  location: string;
  level: 1 | 2 | 3;
  parentId?: string;
  x: number;
  y: number;
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

  // Opportunity Finder State
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  // Common State
  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo);
  const [projectTitle, setProjectTitle] = useState(activeProjectTitle);
  const [procuringEntity, setProcuringEntity] = useState(activeProcuringEntity);
  const [companyName, setCompanyName] = useState(tenant?.companyName || 'Bidding Entity Corporate Name');
  const [companyAddress, setCompanyAddress] = useState(tenant?.address || 'Metro Manila, Philippines');
  const [signatoryName, setSignatoryName] = useState(tenant?.authorizedSignatory?.name || 'Authorized Signatory Name');
  const [signatoryTitle, setSignatoryTitle] = useState(tenant?.authorizedSignatory?.title || 'President / General Manager');
  const [signatoryTin, setSignatoryTin] = useState(tenant?.authorizedSignatory?.tin || '123-456-789-000');

  // Item (d) Special PCAB License / JVA State
  const [jvaPartnerCompany, setJvaPartnerCompany] = useState('Partner Infrastructure Corp.');
  const [pcabLicenseNo, setPcabLicenseNo] = useState(tenant?.pcabLicenseNo || 'PCAB-2026-9012');
  const [pcabCategory, setPcabCategory] = useState(tenant?.pcabCategory || 'AAAA (General Engineering)');

  // Item (e) Bid Security BSD State
  const [securityType, setSecurityType] = useState<'BSD' | 'SURETY_BOND' | 'MANAGERS_CHECK'>('BSD');
  const [securityAmount, setSecurityAmount] = useState('PHP 250,000.00 (2% of ABC)');
  const [validityDays, setValidityDays] = useState('120 Calendar Days');
  const [suretyCompany, setSuretyCompany] = useState('GSIS / Pioneer Insurance Corporation');

  // Item (f.a) Organizational Chart State with Free Drag Positioning
  const [orgNodes, setOrgNodes] = useState<OrgNode[]>([
    {
      id: '1',
      name: tenant?.authorizedSignatory?.name || 'Engr. Noel Azutea',
      position: 'Project Director / Chief Executive',
      email: 'noel.azutea@company.com',
      phone: '0917-123-4567',
      location: 'Metro Manila',
      level: 1,
      x: 390,
      y: 10
    },
    {
      id: '2',
      name: 'Engr. Juan Dela Cruz',
      position: 'Project Manager',
      email: 'juan.delacruz@company.com',
      phone: '0918-987-6543',
      location: 'PRC: 0091823',
      level: 2,
      parentId: '1',
      x: 30,
      y: 150
    },
    {
      id: '3',
      name: 'Engr. Maria Santos',
      position: 'Chief Technical Architect',
      email: 'maria.santos@company.com',
      phone: '0919-876-5432',
      location: 'PRC: 0102938',
      level: 2,
      parentId: '1',
      x: 390,
      y: 150
    },
    {
      id: '4',
      name: 'Engr. Roberto Tan',
      position: 'Quality & Safety Director',
      email: 'roberto.tan@company.com',
      phone: '0920-765-4321',
      location: 'PRC: 0083921',
      level: 2,
      parentId: '1',
      x: 750,
      y: 150
    },
    {
      id: '5',
      name: 'Engr. Carlos Reyes',
      position: 'Lead Site Engineer',
      email: 'carlos.reyes@company.com',
      phone: '0921-654-3210',
      location: 'PRC: 0071234',
      level: 3,
      parentId: '2',
      x: 30,
      y: 330
    },
    {
      id: '6',
      name: 'Engr. Liza Mendoza',
      position: 'Systems Engineer',
      email: 'liza.mendoza@company.com',
      phone: '0922-543-2109',
      location: 'PRC: 0062345',
      level: 3,
      parentId: '3',
      x: 390,
      y: 330
    },
    {
      id: '7',
      name: 'Engr. Pedro Santos',
      position: 'Safety Inspector',
      email: 'pedro.santos@company.com',
      phone: '0923-432-1098',
      location: 'PRC: 0053456',
      level: 3,
      parentId: '4',
      x: 750,
      y: 330
    }
  ]);

  // Item (f.b) Key Personnel State
  const [keyPersonnel, setKeyPersonnel] = useState<{ id: string; name: string; position: string; profession: string; prcNo: string; totalExp: string; similarExp: string }[]>([
    { id: '1', name: 'Engr. Juan Dela Cruz', position: 'Project Manager', profession: 'Civil Engineer', prcNo: 'PRC-0091823', totalExp: '15 Years', similarExp: '10 Years' },
    { id: '2', name: 'Engr. Maria Santos', position: 'Lead Systems Architect', profession: 'Electronics & Comm. Engineer', prcNo: 'PRC-0102938', totalExp: '12 Years', similarExp: '8 Years' }
  ]);

  // Item (f.c) Equipment State
  const [equipmentList, setEquipmentList] = useState<{ id: string; description: string; model: string; serialNo: string; status: string; proofRef: string }[]>([
    { id: '1', description: 'Enterprise Fiber Optic Fusion Splicer System', model: 'Fujikura 90S+', serialNo: 'SN-90S-2026-88', status: 'Owned', proofRef: 'Official Receipt #89012' },
    { id: '2', description: 'OTDR Network Testing & Certification Rig', model: 'EXFO FTB-1v2', serialNo: 'SN-EXFO-1029', status: 'Owned', proofRef: 'OR/CR #10293' }
  ]);

  // Item (g) Omnibus Sworn Statement Specific State
  const [affiantCivilStatus, setAffiantCivilStatus] = useState('Single');
  const [affiantNationality, setAffiantNationality] = useState('Filipino');
  const [govIdType, setGovIdType] = useState('PRC License ID');
  const [govIdNumber, setGovIdNumber] = useState('PRC-0091823');

  // Notary Public State
  const [notaryCity, setNotaryCity] = useState('City of Manila');
  const [docNo, setDocNo] = useState('');
  const [pageNo, setPageNo] = useState('');
  const [bookNo, setBookNo] = useState('');
  const [seriesYear, setSeriesYear] = useState('2026');

  // Load real saved opportunity projects
  useEffect(() => {
    const list = getOpportunityProjects(tenant?.id);
    setOppProjects(list);
    if (list.length > 0 && !selectedOppId) {
      const first = list[0];
      setSelectedOppId(first.id);
      setProjectRefNo(first.refNo);
      setProjectTitle(first.title);
      setProcuringEntity(first.procuringEntity);
    }
  }, [tenant?.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    const cleanCode = item.code.replace(/[^a-zA-Z0-9]/g, '');
    const cleanName = item.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const fileName = `${projectRefNo}_Item_${cleanCode}_${cleanName}_${todayStr}.pdf`;

    const templateElems = document.querySelectorAll('.single-page-paper');
    if (templateElems.length > 0) {
      const elemArray = Array.from(templateElems) as HTMLElement[];
      await generateAndDownloadThreeLayerPdf(null, elemArray, undefined, fileName);
    }
  };

  const handleSave = async () => {
    try {
      const templateElems = document.querySelectorAll('.single-page-paper');
      let dataUrl: string | undefined = undefined;
      if (templateElems.length > 0) {
        const canvas = await html2canvas(templateElems[0] as HTMLElement, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' });
        dataUrl = canvas.toDataURL('image/png');
      }
      onSaveAndComplete(dataUrl, item.name, projectRefNo, projectTitle);
    } catch {
      onSaveAndComplete(undefined, item.name, projectRefNo, projectTitle);
    }
  };

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragStartOffset, setDragStartOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    const targetTag = (e.target as HTMLElement).tagName.toLowerCase();
    if (targetTag === 'input' || targetTag === 'button' || targetTag === 'svg' || targetTag === 'path') {
      return;
    }
    setActiveDragId(id);
    const node = orgNodes.find(n => n.id === id);
    if (node) {
      setDragStartOffset({
        x: e.clientX - node.x,
        y: e.clientY - node.y
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeDragId) return;
    const newX = Math.max(0, Math.min(820, e.clientX - dragStartOffset.x));
    const newY = Math.max(0, Math.min(480, e.clientY - dragStartOffset.y));
    setOrgNodes(prev => prev.map(n => n.id === activeDragId ? { ...n, x: newX, y: newY } : n));
  };

  const handlePointerUp = () => {
    setActiveDragId(null);
  };

  const resetOrgChartLayout = () => {
    setOrgNodes([
      { id: '1', name: tenant?.authorizedSignatory?.name || 'Engr. Noel Azutea', position: 'Project Director / Chief Executive', email: 'noel.azutea@company.com', phone: '0917-123-4567', location: 'Metro Manila', level: 1, x: 390, y: 10 },
      { id: '2', name: 'Engr. Juan Dela Cruz', position: 'Project Manager', email: 'juan.delacruz@company.com', phone: '0918-987-6543', location: 'PRC: 0091823', level: 2, parentId: '1', x: 30, y: 150 },
      { id: '3', name: 'Engr. Maria Santos', position: 'Chief Technical Architect', email: 'maria.santos@company.com', phone: '0919-876-5432', location: 'PRC: 0102938', level: 2, parentId: '1', x: 390, y: 150 },
      { id: '4', name: 'Engr. Roberto Tan', position: 'Quality & Safety Director', email: 'roberto.tan@company.com', phone: '0920-765-4321', location: 'PRC: 0083921', level: 2, parentId: '1', x: 750, y: 150 },
      { id: '5', name: 'Engr. Carlos Reyes', position: 'Lead Site Engineer', email: 'carlos.reyes@company.com', phone: '0921-654-3210', location: 'PRC: 0071234', level: 3, parentId: '2', x: 30, y: 330 },
      { id: '6', name: 'Engr. Liza Mendoza', position: 'Systems Engineer', email: 'liza.mendoza@company.com', phone: '0922-543-2109', location: 'PRC: 0062345', level: 3, parentId: '3', x: 390, y: 330 },
      { id: '7', name: 'Engr. Pedro Santos', position: 'Safety Inspector', email: 'pedro.santos@company.com', phone: '0923-432-1098', location: 'PRC: 0053456', level: 3, parentId: '4', x: 750, y: 330 }
    ]);
  };

  const addOrgNode = (level: 1 | 2 | 3 = 3) => {
    const level2Nodes = orgNodes.filter(n => n.level === 2);
    const parentId = level === 3 && level2Nodes.length > 0 ? level2Nodes[0].id : '1';
    setOrgNodes(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        name: 'Engr. New Member',
        position: level === 2 ? 'Division Lead' : 'Field Engineer',
        email: 'member@company.com',
        phone: '0917-000-0000',
        location: 'PRC: 0000000',
        level: level,
        parentId: parentId,
        x: 200 + (prev.length * 25) % 450,
        y: 180 + (prev.length * 20) % 250
      }
    ]);
  };

  const updateOrgNode = (id: string, field: string, value: string) => {
    setOrgNodes(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const removeOrgNode = (id: string) => {
    setOrgNodes(prev => prev.filter(n => n.id !== id));
  };

  const addKeyPersonnel = () => {
    setKeyPersonnel(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        name: 'Engr. Professional Name',
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
        description: 'New Heavy Equipment Unit',
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
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">

      {/* PRINT STYLESHEET OVERRIDE */}
      <style>{`
        @media print {
          @page {
            size: ${item.code === '(f.a)' ? '13in 8.5in' : '8.5in 13in'};
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
            margin: 0 auto 0.5in auto !important;
            padding: 0.25in !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .export-text {
            display: block !important;
          }
        }
      `}</style>

      <div className={`bg-slate-900 border border-slate-800 rounded-2xl w-full ${item.code === '(f.a)' ? 'max-w-7xl' : 'max-w-5xl'} overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col print:border-none print:shadow-none print:max-h-none print:bg-white`}>

        {/* Top Controls Header Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 shrink-0 print:hidden no-export">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Class A Statutory Technical Exhibit — Item {item.code}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase">
                  {item.code === '(f.a)' ? 'Legal 13" × 8.5" Landscape Standard' : item.code === '(g)' ? '2-Page Official GPPB Layout' : 'Legal Paper Standard'}
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
              <span>Print Legal</span>
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Item (f.a) External Toolbar Controls (Outside the Printable Page) */}
        {item.code === '(f.a)' && (
          <div className="px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between print:hidden no-export shrink-0">
            <span className="text-xs text-blue-300 font-mono flex items-center gap-1.5">
              🖐️ <strong>Drag & Place Enabled:</strong> Click and drag any card header to position it anywhere on the page
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={resetOrgChartLayout}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 transition shadow"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Auto-Align
              </button>
              <button
                onClick={() => addOrgNode(2)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow"
              >
                <Plus className="w-3.5 h-3.5" /> + Add Level 2 Lead
              </button>
              <button
                onClick={() => addOrgNode(3)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 transition shadow"
              >
                <Plus className="w-3.5 h-3.5" /> + Add Field Specialist
              </button>
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950 space-y-6 print:p-0 print:bg-white">

          {/* Editor Form Inputs (Screen Only) */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 print:hidden no-export">

            {/* Target Project Dropdown Selector */}
            <div className="space-y-1.5">
              <label className="block text-slate-200 font-mono text-xs font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-blue-300">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  Select Target Project from Opportunity Finder:
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold font-mono">⚡ Auto-populates all legal blanks</span>
              </label>
              <select
                value={selectedOppId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedOppId(val);
                  const found = oppProjects.find((p) => p.id === val || p.refNo === val);
                  if (found) {
                    setProjectRefNo(found.refNo);
                    setProjectTitle(found.title);
                    setProcuringEntity(found.procuringEntity);
                  }
                }}
                className="w-full bg-slate-950 border border-blue-500/60 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs font-bold focus:outline-none focus:border-blue-400 shadow-inner cursor-pointer hover:border-blue-400"
              >
                {oppProjects.length === 0 ? (
                  <option value="">-- No Saved Projects in Opportunity Finder --</option>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2 border-t border-slate-800">
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
                <label className="block text-slate-400 font-medium mb-1">Authorized Signatory / Affiant Name</label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Designation / Position</label>
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
                  <label className="block text-slate-200 font-bold mb-1">Form of Security Option:</label>
                  <select value={securityType} onChange={(e) => setSecurityType(e.target.value as any)} className="w-full bg-slate-950 border border-blue-500/80 rounded-lg px-3 py-2 text-white font-bold cursor-pointer">
                    <option value="BSD">Bid Securing Declaration (BSD Form)</option>
                    <option value="SURETY_BOND">Surety Bond / Security Bond</option>
                    <option value="MANAGERS_CHECK">Manager's / Cashier's Check</option>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Affiant Civil Status</label>
                  <input type="text" value={affiantCivilStatus} onChange={(e) => setAffiantCivilStatus(e.target.value)} placeholder="Single / Married / Legal Age" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Affiant Nationality</label>
                  <input type="text" value={affiantNationality} onChange={(e) => setAffiantNationality(e.target.value)} placeholder="Filipino" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Government ID Type</label>
                  <input type="text" value={govIdType} onChange={(e) => setGovIdType(e.target.value)} placeholder="PRC License / Driver's License / Passport" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Government ID Number</label>
                  <input type="text" value={govIdNumber} onChange={(e) => setGovIdNumber(e.target.value)} placeholder="PRC-0091823" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
              </div>
            )}

          </div>

          {/* NON-ITEM (g) STANDARD SINGLE PAGE LEGAL PAPER CONTAINER */}
          {item.code !== '(g)' && (
            <div className={`single-page-paper bg-white text-slate-900 font-sans p-8 sm:p-10 border-2 border-slate-900 rounded-2xl shadow-2xl space-y-6 ${item.code === '(f.a)' ? 'max-w-[1150px] min-h-[750px] aspect-[13/8.5]' : 'max-w-[850px] min-h-[1100px] aspect-[8.5/13]'} mx-auto text-left relative flex flex-col justify-between print:m-0 print:border-none print:shadow-none`}>

              {/* Outer Legal Frame */}
              <div className="absolute inset-4 border-2 border-slate-900 pointer-events-none rounded-xl" />

              <div className="space-y-6">

                {/* Document Header */}
                {!(item.code === '(e)' && securityType === 'BSD') && (
                  <div className="border-b-2 border-slate-900 pb-3 font-mono text-[11px] text-slate-950 font-bold mb-4 relative">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 z-10">
                        <div>PROJECT REF. NO: <strong className="text-blue-950">{projectRefNo}</strong></div>
                        <div>NAME OF PROJECT: <strong className="text-slate-950">{projectTitle}</strong></div>
                        <div>PROCURING ENTITY: <strong className="text-slate-950">{procuringEntity}</strong></div>
                      </div>

                      {item.code === '(f.a)' && (
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none w-max max-w-[65%] z-0">
                          <h4 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-widest text-slate-950 font-mono">
                            ORGANIZATIONAL CHART
                          </h4>
                        </div>
                      )}

                      <div className="text-right z-10">
                        <span>DATE: <strong>{todayStr}</strong></span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ITEM (d) SPECIAL PCAB LICENSE */}
                {item.code === '(d)' && (
                  <div className="space-y-4 text-xs font-serif text-slate-900 leading-relaxed">
                    <p>
                      <strong>REPUBLIC OF THE PHILIPPINES</strong>)<br />
                      CITY OF ____________________ ) S.S.
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

                {/* ITEM (e) OPTION 1: OFFICIAL GPPB BID SECURING DECLARATION FORM */}
                {item.code === '(e)' && securityType === 'BSD' && (
                  <div className="space-y-4 text-xs font-serif text-slate-900 leading-relaxed font-normal pt-2">
                    <div className="border-b-2 border-slate-900 pb-3 space-y-1 font-mono text-[11px] text-slate-950 font-bold mb-4">
                      <div className="flex items-center justify-between">
                        <span>PROJECT REF. NO: <strong className="text-blue-950">{projectRefNo}</strong></span>
                        <span>DATE: <strong>{todayStr}</strong></span>
                      </div>
                      <div>
                        <span>NAME OF PROJECT: <strong className="text-slate-950">{projectTitle}</strong></span>
                      </div>
                      <div>
                        <span>PROCURING ENTITY: <strong className="text-slate-950">{procuringEntity}</strong></span>
                      </div>
                    </div>

                    <div className="text-center font-serif space-y-1 mb-4">
                      <h3 className="text-base sm:text-lg font-bold uppercase tracking-wide border-b border-black pb-1">
                        Bid Securing Declaration Form
                      </h3>
                      <p className="text-[11px] italic text-slate-700">
                        [shall be submitted with the Bid if bidder opts to provide this form of bid security]
                      </p>
                    </div>

                    <p className="font-serif">
                      REPUBLIC OF THE PHILIPPINES)<br />
                      CITY OF ____________________ ) S.S.
                    </p>

                    <div className="text-center my-4 font-serif space-y-1">
                      <h4 className="text-sm sm:text-base font-bold uppercase tracking-wide">BID SECURING DECLARATION</h4>
                      <p className="text-xs font-bold font-mono">
                        Project Identification No.: <u className="font-bold text-blue-950">{projectRefNo || '[Insert number]'}</u>
                      </p>
                    </div>

                    <p className="font-serif">
                      To: <strong><u>{procuringEntity || '[Insert name and address of the Procuring Entity]'}</u></strong><br />
                      <span className="text-[11px] text-slate-700 italic">Name of Project: {projectTitle}</span>
                    </p>

                    <p className="font-serif pt-1">
                      I/We, the undersigned, declare that:
                    </p>

                    <ol className="list-decimal pl-6 space-y-6 font-serif leading-relaxed text-justify">
                      <li>
                        I/We understand that, according to your conditions, bids must be supported by a Bid Security, which may be in the form of a Bid Securing Declaration.
                      </li>
                      <li>
                        I/We accept that: (a) I/we will be automatically disqualified from bidding for any procurement contract with any procuring entity for a period of two (2) years upon receipt of your Blacklisting Order; and, (b) I/we will pay the applicable fine provided under Section 6 of the Guidelines on the Use of Bid Securing Declaration, within fifteen (15) days from receipt of the written demand by the procuring entity for the commission of acts resulting to the enforcement of the bid securing declaration under Sections 23.1(b), 34.2, 40.1 and 69.1, except 69.1(f), of the IRR of RA No. 9184; without prejudice to other legal action the government may undertake.
                      </li>
                      <li>
                        I/We understand that this Bid Securing Declaration shall cease to be valid on the following circumstances:
                        <ol className="list-[lower-alpha] pl-6 space-y-1.5 mt-1.5">
                          <li>Upon expiration of the bid validity period, or any extension thereof pursuant to your request;</li>
                          <li>I am/we are declared ineligible or post-disqualified upon receipt of your notice to such effect, and (i) I/we failed to timely file a request for reconsideration or (ii) I/we filed a waiver to avail of said right; and</li>
                          <li>I am/we are declared the bidder with the Lowest Calculated Responsive Bid, and I/we have furnished the performance security and signed the Contract.</li>
                        </ol>
                      </li>
                    </ol>

                    <p className="font-serif pt-4 leading-relaxed">
                      IN WITNESS WHEREOF, I/We have hereunto set my/our hand/s this _____ day of __________________ at ____________________.
                    </p>

                    <div className="pt-6 flex flex-col items-end text-right font-serif space-y-1">
                      <div className="border-b border-black w-72 text-center pb-1">
                        <p className="font-bold text-slate-950 uppercase">{companyName}</p>
                        <p className="font-bold text-slate-950 uppercase mt-0.5">{signatoryName}</p>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-800 text-center w-72">{signatoryTitle}</p>
                      <p className="text-[11px] text-slate-600 font-bold text-center w-72">Affiant</p>
                    </div>

                    <div className="pt-6 font-serif space-y-2">
                      <p className="text-[10px] italic text-slate-600">
                      </p>
                      <div className="text-[11px] font-mono text-slate-700 space-y-1 pt-1">
                        <p>Doc. No. _________;</p>
                        <p>Page No. _________;</p>
                        <p>Book No. _________;</p>
                        <p>Series of _________.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ITEM (e) OPTION 2: SURETY BOND / MANAGER'S CHECK */}
                {item.code === '(e)' && securityType !== 'BSD' && (
                  <div className="space-y-4 text-xs font-serif text-slate-900 leading-relaxed">
                    <p>
                      <strong>REPUBLIC OF THE PHILIPPINES</strong>)<br />
                      CITY OF ____________________ ) S.S.
                    </p>
                    <h4 className="font-bold text-center uppercase border-b pb-1">ORIGINAL BID SECURITY CERTIFICATION ({securityType.replace('_', ' ')})</h4>
                    <p>
                      To: <strong>{procuringEntity}</strong><br />
                      Address: Metro Manila, Philippines
                    </p>
                    <p>
                      This is to certify that <strong>{companyName}</strong> has posted an original Bid Security for the project <strong>{projectTitle}</strong> under Ref. No. <strong>{projectRefNo}</strong>.
                    </p>
                    <div className="p-3 bg-slate-50 border border-slate-300 rounded font-mono text-[11px] space-y-1">
                      <p><strong>FORM OF SECURITY:</strong> {securityType.replace('_', ' ')}</p>
                      <p><strong>SECURITY GUARANTEE AMOUNT:</strong> {securityAmount}</p>
                      <p><strong>VALIDITY PERIOD:</strong> {validityDays}</p>
                      <p><strong>ISSUING ENTITY:</strong> {suretyCompany}</p>
                    </div>
                  </div>
                )}

                {/* ITEM (f.a): OFFICIAL FREE DRAG-AND-PLACE ORGANIZATIONAL CHART */}
                {item.code === '(f.a)' && (
                  <div className="space-y-4 text-xs font-sans">
                    {/* DRAGGABLE FREE-FORM CANVAS */}
                    <div
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      className="relative w-full h-[410px] bg-slate-50/50 border border-dashed border-slate-300 rounded-xl overflow-hidden select-none"
                    >
                      {orgNodes.map((node) => (
                        <div
                          key={node.id}
                          onPointerDown={(e) => handlePointerDown(node.id, e)}
                          style={{
                            position: 'absolute',
                            left: `${node.x}px`,
                            top: `${node.y}px`,
                            touchAction: 'none'
                          }}
                          className={`w-72 border-2 ${node.level === 1 ? 'border-slate-900 shadow-xl' : 'border-slate-700 shadow-md'
                            } rounded-xl overflow-hidden bg-white cursor-grab active:cursor-grabbing transition-shadow ${activeDragId === node.id ? 'ring-4 ring-blue-500/50 z-30 shadow-2xl' : 'z-10'
                            }`}
                        >
                          {/* Header Bar */}
                          <div className={`${node.level === 1 ? 'bg-slate-900' : 'bg-slate-700'} text-white px-2 py-1.5 flex items-center justify-between`}>
                            <div className="flex items-center gap-1 shrink-0 print:hidden no-export">
                              <Move className="w-3 h-3 text-slate-300" />
                            </div>
                            <div className="w-full text-center">
                              <input
                                type="text"
                                value={node.name}
                                onChange={(e) => updateOrgNode(node.id, 'name', e.target.value)}
                                className="font-bold text-[11px] text-center w-full bg-transparent border-none text-white focus:outline-none uppercase cursor-text"
                              />
                              <input
                                type="text"
                                value={node.position}
                                onChange={(e) => updateOrgNode(node.id, 'position', e.target.value)}
                                className="text-[9.5px] text-slate-300 text-center w-full bg-transparent border-none focus:outline-none cursor-text"
                              />
                            </div>
                            {orgNodes.length > 1 && (
                              <button
                                onClick={() => removeOrgNode(node.id)}
                                className="p-0.5 text-red-300 hover:text-white print:hidden no-export shrink-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Body Info */}
                          <div className="p-2 bg-slate-50 flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full ${node.level === 1 ? 'bg-slate-900' : 'bg-blue-900'} text-white flex items-center justify-center shrink-0 font-bold text-[10px]`}>
                              {node.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </div>
                            <div className="space-y-0.5 text-[9px] font-mono text-slate-700 w-full">
                              <input
                                type="text"
                                value={node.email}
                                onChange={(e) => updateOrgNode(node.id, 'email', e.target.value)}
                                className="w-full bg-transparent border-none focus:outline-none truncate text-blue-900 cursor-text"
                              />
                              <input
                                type="text"
                                value={node.phone}
                                onChange={(e) => updateOrgNode(node.id, 'phone', e.target.value)}
                                className="w-full bg-transparent border-none focus:outline-none cursor-text"
                              />
                              <input
                                type="text"
                                value={node.location}
                                onChange={(e) => updateOrgNode(node.id, 'location', e.target.value)}
                                className="w-full bg-transparent border-none focus:outline-none font-bold text-slate-900 cursor-text"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(item.code === '(f.b)' || item.code === '(f)') && (
                  <div className="space-y-3 text-xs font-sans">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-950 uppercase font-mono text-[11px]">List of Contractor's Key Personnel Assigned to Contract</h4>
                      <button onClick={addKeyPersonnel} className="px-2 py-1 bg-blue-100 text-blue-950 font-bold text-[10px] rounded hover:underline print:hidden no-export">
                        + Add Key Personnel
                      </button>
                    </div>
                    <table className="w-full border-collapse border border-slate-900 text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 font-mono text-slate-900 font-bold border-b border-slate-900">
                          <th className="p-1.5 border-r border-slate-900">#</th>
                          <th className="p-1.5 border-r border-slate-900">Name</th>
                          <th className="p-1.5 border-r border-slate-900">Assigned Position</th>
                          <th className="p-1.5 border-r border-slate-900">Profession / PRC</th>
                          <th className="p-1.5 border-r border-slate-900">Total Exp.</th>
                          <th className="p-1.5 print:hidden no-export text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-400">
                        {keyPersonnel.map((person, idx) => (
                          <tr key={person.id}>
                            <td className="p-1.5 border-r border-slate-400 font-mono font-bold">{idx + 1}</td>
                            <td className="p-1.5 border-r border-slate-400 font-bold text-slate-950">{person.name}</td>
                            <td className="p-1.5 border-r border-slate-400">{person.position}</td>
                            <td className="p-1.5 border-r border-slate-400 font-mono text-[10px]">
                              <div>{person.profession}</div>
                              <div className="text-slate-500">{person.prcNo}</div>
                            </td>
                            <td className="p-1.5 border-r border-slate-400 font-mono">{person.totalExp}</td>
                            <td className="p-1.5 print:hidden no-export text-right">
                              <button onClick={() => removeKeyPersonnel(person.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
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
                      <h4 className="font-bold text-slate-950 uppercase font-mono text-[11px]">List of Contractor's Major Equipment Units</h4>
                      <button onClick={addEquipment} className="px-2 py-1 bg-blue-100 text-blue-950 font-bold text-[10px] rounded hover:underline print:hidden no-export">
                        + Add Equipment
                      </button>
                    </div>
                    <table className="w-full border-collapse border border-slate-900 text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 font-mono text-slate-900 font-bold border-b border-slate-900">
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

              </div>

              {/* Verification Footer Seal with Smartphone Scannable QR Code */}
              <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[9px] font-mono text-slate-700">
                <div className="flex items-center gap-3">
                  <DocumentQrCode
                    details={{
                      companyName: companyName,
                      documentName: `Item ${item.code} — ${item.name}`,
                      documentNumber: `EXHIBIT-${item.code.replace(/[^a-zA-Z0-9]/g, '')}-${projectRefNo || '2026-901283'}`,
                      projectTitle: projectTitle,
                      projectRefNo: projectRefNo,
                      procuringEntity: procuringEntity,
                      dateTimeSubmitted: new Date().toLocaleString()
                    }}
                    size={65}
                    showCaption={false}
                  />
                  <div className="space-y-0.5 font-mono text-[9px] text-slate-800">
                    <p className="font-bold text-slate-950 uppercase">{companyName}</p>
                    <p>PROJECT: <strong>{projectTitle}</strong></p>
                    <p>REF NO: <strong>{projectRefNo}</strong> • PROCURING ENTITY: <strong>{procuringEntity}</strong></p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ITEM (g): OFFICIAL 2-PAGE RA 12009 / GPPB OMNIBUS SWORN STATEMENT FORM */}
          {item.code === '(g)' && (
            <div className="space-y-8">

              {/* PAGE 1 OF 2 */}
              <div className="single-page-paper bg-white text-slate-900 font-sans p-8 sm:p-10 border-2 border-slate-900 rounded-2xl shadow-2xl space-y-6 max-w-[850px] min-h-[1100px] aspect-[8.5/13] mx-auto text-left relative flex flex-col justify-between print:m-0 print:border-none print:shadow-none">
                <div className="absolute inset-4 border-2 border-slate-900 pointer-events-none rounded-xl" />

                <div className="space-y-4 text-xs font-serif text-slate-900 leading-relaxed font-normal pt-2">
                  <div className="border-b-2 border-slate-900 pb-3 space-y-1 font-mono text-[11px] text-slate-950 font-bold mb-4">
                    <div className="flex items-center justify-between">
                      <span>PROJECT REF. NO: <strong className="text-blue-950">{projectRefNo}</strong></span>
                      <span>DATE: <strong>{todayStr}</strong></span>
                    </div>
                    <div>
                      <span>NAME OF PROJECT: <strong className="text-slate-950">{projectTitle}</strong></span>
                    </div>
                    <div>
                      <span>PROCURING ENTITY: <strong className="text-slate-950">{procuringEntity}</strong></span>
                    </div>
                  </div>

                  <div className="text-center font-serif space-y-1 mb-4">
                    <h3 className="text-base sm:text-lg font-bold uppercase tracking-wide border-b border-black pb-1">
                      Omnibus Sworn Statement Form
                    </h3>
                    <p className="text-[11px] italic text-slate-700">
                      [Note: The duly accomplished form shall be submitted with the Bid]
                    </p>
                  </div>

                  <p className="font-serif">
                    REPUBLIC OF THE PHILIPPINES)<br />
                    CITY/MUNICIPALITY OF ____________________ ) S.S.
                  </p>

                  <div className="text-center my-3 font-serif">
                    <h4 className="text-sm sm:text-base font-bold uppercase tracking-wide">OMNIBUS SWORN STATEMENT</h4>
                  </div>

                  <p className="font-serif leading-relaxed text-justify">
                    I, <strong><u>{signatoryName || '[Name of Affiant]'}</u></strong>, of legal age, <u>{affiantCivilStatus || 'Legal Age'}</u>, <u>{affiantNationality || 'Filipino'}</u>, and with residence at <strong><u>{companyAddress || '[Address of Affiant]'}</u></strong>, after having been duly sworn in accordance with law, do hereby depose and state that:
                  </p>

                  <ol className="list-decimal pl-6 space-y-6 font-serif leading-relaxed text-justify">
                    <li>
                      <span className="italic text-slate-700"></span>
                      <p className="mt-0.5">
                        • <em>Corporation,</em> I am the duly authorized and designated representative of <strong><u>{companyName}</u></strong> with office address at <strong><u>{companyAddress}</u></strong>;
                      </p>
                    </li>

                    <li>
                      <span className="italic text-slate-700"></span>
                      <p className="mt-0.5">
                        • <em>Corporation, </em> I am granted full power and authority to do, execute and perform any and all acts necessary to participate, submit the bid, and to sign and execute the ensuing contract for <strong><u>{projectTitle}</u></strong> of the <strong><u>{procuringEntity}</u></strong>, as supported by the attached duly notarized Special Power of Attorney, Board/Partnership Resolution, or Secretary's Certificate, whichever is applicable;
                      </p>
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
                      <span className="italic text-slate-700"></span>
                      <p className="mt-0.5">
                        • <em>Corporation,</em> The corporation  itself, and officers, directors, controlling stockholders and beneficial owners of <strong><u>{companyName}</u></strong> are not related by consanguinity or affinity up to the third civil degree to the Head of the Procuring Entity, Procurement Agent (if engaged), End-User or Implementing Unit, project consultants, head of the Project Management Office, or the members of the Bids and Awards Committee (BAC), the Technical Working Group, and the BAC Secretariat;
                      </p>
                    </li>

                    <li>
                      It is understood that failure to faithfully disclose its relationship with the Head of the Procuring Entity, members of the BAC, TWG, and Secretariat, or the project consultants of the Procuring Entity by consanguinity or affinity up to the third civil degree, as well as submission of beneficial ownership information containing false entries shall be subject to blacklisting under Section 100 of the IRR of RA No. 12009.
                      <p className="mt-0.5 font-semibold">
                        • <em>In case of corporations:</em> <strong><u>{companyName}</u></strong> declares its beneficial ownership information consistent with its updated General Information Sheet (GIS) or Beneficial Ownership Declaration Form duly submitted to the SEC in compliance with Sections 20.2.9.1, 81, and 82 of the IRR of RA No. 12009.
                      </p>
                    </li>

                    <li>
                      <strong><u>{companyName}</u></strong> complies with existing labor laws and standards; and
                    </li>

                    <li>
                      <strong><u>{companyName}</u></strong> is aware of and has undertaken the following responsibilities as a Bidder:
                      <ol className="list-[lower-alpha] pl-6 space-y-1 mt-1">
                        <li>Carefully examine all of the Bidding Documents;</li>
                        <li>Acknowledge all conditions, local or otherwise, affecting the implementation of the Contract;</li>
                        <li>Made an estimate of the facilities available and needed for the contract to be bid, if any; and</li>
                        <li>Inquire or secure Supplemental/Bid Bulletin(s) issued for the <strong><u>{projectTitle}</u></strong>.</li>
                      </ol>
                    </li>
                  </ol>
                </div>

                <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[9px] font-mono text-slate-700">
                  <div className="flex items-center gap-3">
                    <DocumentQrCode
                      details={{
                        companyName: companyName,
                        documentName: `Item (g) Omnibus Sworn Statement (Page 1 of 2)`,
                        documentNumber: `EXHIBIT-G-${projectRefNo || '2026-901283'}-P1`,
                        projectTitle: projectTitle,
                        projectRefNo: projectRefNo,
                        procuringEntity: procuringEntity,
                        dateTimeSubmitted: new Date().toLocaleString()
                      }}
                      size={55}
                      showCaption={false}
                    />
                    <div className="space-y-0.5 font-mono text-[9px] text-slate-800">
                      <p className="font-bold text-slate-950 uppercase">{companyName}</p>
                      <p>PROJECT: <strong>{projectTitle}</strong></p>
                      <p>REF NO: <strong>{projectRefNo}</strong> • PROCURING ENTITY: <strong>{procuringEntity}</strong></p>
                    </div>
                  </div>
                  <span className="font-bold font-mono">Page 1 of 2</span>
                </div>
              </div>

              {/* PAGE 2 OF 2 */}
              <div className="single-page-paper bg-white text-slate-900 font-sans p-8 sm:p-10 border-2 border-slate-900 rounded-2xl shadow-2xl space-y-6 max-w-[850px] min-h-[1100px] aspect-[8.5/13] mx-auto text-left relative flex flex-col justify-between print:m-0 print:border-none print:shadow-none">
                <div className="absolute inset-4 border-2 border-slate-900 pointer-events-none rounded-xl" />

                <div className="space-y-4 text-xs font-serif text-slate-900 leading-relaxed font-normal pt-2">
                  <div className="border-b-2 border-slate-900 pb-3 space-y-1 font-mono text-[11px] text-slate-950 font-bold mb-4">
                    <div className="flex items-center justify-between">
                      <span>PROJECT REF. NO: <strong className="text-blue-950">{projectRefNo}</strong></span>
                      <span>PAGE 2 OF 2 • DATE: <strong>{todayStr}</strong></span>
                    </div>
                    <div>
                      <span>NAME OF PROJECT: <strong className="text-slate-950">{projectTitle}</strong></span>
                    </div>
                    <div>
                      <span>PROCURING ENTITY: <strong className="text-slate-950">{procuringEntity}</strong></span>
                    </div>
                  </div>

                  <ol className="list-decimal pl-6 space-y-6 font-serif leading-relaxed text-justify" start={10}>
                    <li>
                      <strong><u>{companyName}</u></strong> did not give or pay directly or indirectly, any commission, amount, fee, or any form of consideration, pecuniary or otherwise, to any person or official, personnel or representative of the government in relation to any procurement project or activity.
                    </li>

                    <li>
                      In case advance payment was made or given to <strong><u>{companyName}</u></strong>, failure to perform or deliver any of the obligations and undertakings in the contract shall be sufficient grounds to constitute criminal liability under existing laws.
                    </li>
                  </ol>

                  <p className="font-serif pt-4 leading-relaxed">
                    IN WITNESS WHEREOF, I have hereunto set my hand this _____ day of __________, 20___ at ____________________, Philippines.
                  </p>

                  <div className="pt-6 flex flex-col items-end text-right font-serif space-y-1">

                    <p className="text-xs font-bold text-slate-900 w-80 text-center">Duly authorized to sign the Bid for and behalf of:</p>

                    <p className="font-bold text-slate-950 uppercase w-80 text-center pt-1 border-b border-black">{companyName}</p>
                    <div className="pt-4 text-center w-80">

                      <p className="font-bold text-slate-950 uppercase">{signatoryName}</p>

                      <p className="text-[11px] font-semibold text-slate-800">{signatoryTitle}</p>
                    </div>
                  </div>

                  <div className="pt-6 font-serif space-y-2 border-t border-slate-300">
                    <p className="font-bold text-center uppercase text-xs tracking-wider"></p>
                    <p className="text-[11px] font-serif leading-relaxed text-justify">
                      SUBSCRIBED AND SWORN to before me this _____ day of [month] [year] at [place of execution], Philippines. Affiant/s is/are personally known to me and was/were identified by me through competent evidence of identity as defined in the 2004 Rules on Notarial Practice (A.M. No. 02-8-13-SC). Affiant/s exhibited to me his/her {govIdType || 'Government Issued ID'} with no. {govIdNumber || '___________'}, with his/her photograph and signature appearing thereon.
                    </p>

                    <p className="text-[11px] font-serif pt-1">
                      WITNESS MY HAND AND SEAL this _____ day of ________  ________.
                    </p>

                    <div className="pt-4 flex items-start justify-between text-[10px] font-mono text-slate-700">
                      <div className="space-y-0.5">
                        <p>Doc. No. _________;</p>
                        <p>Page No. _________;</p>
                        <p>Book No. _________;</p>
                        <p>Series of _________.</p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p className="font-bold text-slate-950 uppercase">NAME OF NOTARY PUBLIC</p>

                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[9px] font-mono text-slate-700">
                  <div className="flex items-center gap-3">
                    <DocumentQrCode
                      details={{
                        companyName: companyName,
                        documentName: `Item (g) Omnibus Sworn Statement (Page 2 of 2)`,
                        documentNumber: `EXHIBIT-G-${projectRefNo || '2026-901283'}-P2`,
                        projectTitle: projectTitle,
                        projectRefNo: projectRefNo,
                        procuringEntity: procuringEntity,
                        dateTimeSubmitted: new Date().toLocaleString()
                      }}
                      size={55}
                      showCaption={false}
                    />
                    <div className="space-y-0.5 font-mono text-[9px] text-slate-800">
                      <p className="font-bold text-slate-950 uppercase">{companyName}</p>
                      <p>PROJECT: <strong>{projectTitle}</strong></p>
                      <p>REF NO: <strong>{projectRefNo}</strong> • PROCURING ENTITY: <strong>{procuringEntity}</strong></p>
                    </div>
                  </div>
                  <span className="font-bold font-mono">Page 2 of 2</span>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/95 sticky bottom-0 z-10 shrink-0 print:hidden no-export">
          <span className="text-xs text-slate-400 font-mono">
            Item {item.code} Statutory Exhibit • Accurate Inputs Loaded
          </span>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs transition">
              Close
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg transition flex items-center gap-2"
            >
              <FileSignature className="w-4 h-4" />
              <span>Save & Complete Exhibit</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TechnicalExhibitTemplateModal;

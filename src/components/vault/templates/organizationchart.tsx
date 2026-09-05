import React, { useState, useEffect, useRef } from 'react';
import { Tenant } from '../../../types';
import { PDFDocument } from 'pdf-lib';
import {
  X,
  Printer,
  Download,
  Plus,
  RotateCcw,
  Trash2,
  Edit3,
  Save,
  FileSpreadsheet,
  CheckCircle2,
  Eye,
  Workflow,
  Building2,
  Award,
  ShieldCheck,
  Zap,
  Radio,
  Network,
  Wrench,
  Lock
} from 'lucide-react';
import DocumentQrCode from '../../common/DocumentQrCode';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import html2canvas from 'html2canvas';

export interface OrgChartNode {
  id: string;
  name: string;
  position: string;
  prcLicense?: string;
  contact?: string;
  level: 1 | 2 | 3 | 4;
  parentId?: string;
  department?: string;
  color?: string;
}

export interface OrganizationalChartModalProps {
  item: { id: string; code: string; name: string };
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  solicitationNumber?: string;
  dateTimeSubmitted?: string;
  onSaveAndComplete: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose: () => void;
}

const defaultOrgNodes: OrgChartNode[] = [
  // Level 1: Executive Management / AMO
  {
    id: 'node-1',
    name: 'CLOUD OCAMPO',
    position: 'President & Authorized Managing Officer',
    prcLicense: 'Authorized Managing Officer (AMO) • Chief Executive Authority',
    contact: 'cloud@quantumcloudcorp.com',
    level: 1,
    department: 'EXECUTIVE MANAGEMENT & OVERALL PROJECT GOVERNANCE',
    color: 'border-slate-950 bg-slate-950 text-white'
  },

  // Level 2: Project Management Division
  {
    id: 'node-2',
    name: 'VIN OCAMPO',
    position: 'Project Manager 1',
    prcLicense: '10 Yrs Experience (Pasay City)',
    contact: '0917-111-2233',
    level: 2,
    parentId: 'node-1',
    department: 'PROJECT MANAGEMENT — SITE 1',
    color: 'border-blue-950 bg-blue-50/90'
  },
  {
    id: 'node-3',
    name: 'CHRISTIAN SAGUN',
    position: 'Project Manager 2',
    prcLicense: 'PUP Lopez (Calauag, Quezon)',
    contact: '0918-222-3344',
    level: 2,
    parentId: 'node-1',
    department: 'PROJECT MANAGEMENT — SITE 2',
    color: 'border-blue-950 bg-blue-50/90'
  },
  {
    id: 'node-4',
    name: 'MARK ARJAY VILLAGARCIA',
    position: 'Project Manager 3',
    prcLicense: 'ALS Sipocot (Camarines Sur)',
    contact: '0919-333-4455',
    level: 2,
    parentId: 'node-1',
    department: 'PROJECT MANAGEMENT — SITE 3',
    color: 'border-blue-950 bg-blue-50/90'
  },

  // Level 3: Specialized Engineers & Safety Officers
  {
    id: 'node-5',
    name: 'ALDRIN GODALLE',
    position: 'Project Communications Engineer',
    prcLicense: 'PRC Reg. No.: 0000-846 (T.I.P. Manila)',
    contact: '0920-444-5566',
    level: 3,
    parentId: 'node-2',
    department: 'COMMUNICATIONS & TELECOM',
    color: 'border-slate-900 bg-white'
  },
  {
    id: 'node-6',
    name: 'AARON JAMES CORTEZ',
    position: 'Project Electrical Engineer',
    prcLicense: 'PRC Reg. No.: 00-58229 (P.U.P. Manila)',
    contact: '0921-555-6677',
    level: 3,
    parentId: 'node-2',
    department: 'ELECTRICAL & POWER SYSTEMS',
    color: 'border-slate-900 bg-white'
  },
  {
    id: 'node-7',
    name: 'CONSTRUCTION SAFETY OFFICER',
    position: 'Safety & Health Personnel (COSH)',
    prcLicense: 'DOLE-Accredited Safety Practitioner',
    contact: 'safety@quantumcloudcorp.com',
    level: 3,
    parentId: 'node-3',
    department: 'HSE & OCCUPATIONAL SAFETY',
    color: 'border-slate-900 bg-white'
  },
  {
    id: 'node-8',
    name: 'HAL DAVID FORTUNA',
    position: 'Network Engineer / Lead Foreman',
    prcLicense: '25 Yrs Experience (P.M.I. College)',
    contact: '0922-666-7788',
    level: 3,
    parentId: 'node-4',
    department: 'NETWORK INFRASTRUCTURE',
    color: 'border-slate-900 bg-white'
  },
  {
    id: 'node-9',
    name: 'JOHN GERALD RIVERA',
    position: 'Network Engineer / Site Foreman',
    prcLicense: '15 Yrs Experience (DASMA, Cavite)',
    contact: '0923-777-8899',
    level: 3,
    parentId: 'node-4',
    department: 'SITE OPERATIONS & QA/QC',
    color: 'border-slate-900 bg-white'
  },

  // Level 4: Technical Field Operations Crew
  {
    id: 'node-10',
    name: 'NETWORK CABLING & RIGGING CREW',
    position: 'Structured Cabling & Backbone Installation Team',
    prcLicense: 'TESDA NC-II Certified Network Cablers & Riggers',
    contact: 'field.ops@quantumcloudcorp.com',
    level: 4,
    parentId: 'node-8',
    department: 'FIELD DEPLOYMENT — CABLING UNIT',
    color: 'border-emerald-900 bg-emerald-50/80'
  },
  {
    id: 'node-11',
    name: 'FIBER OPTIC SPLICING & TESTING TEAM',
    position: 'Fusion Splicing, OTDR & Power Meter Certification',
    prcLicense: 'FOA-Certified Fiber Optic Splicers & Inspectors',
    contact: 'fiber.qc@quantumcloudcorp.com',
    level: 4,
    parentId: 'node-8',
    department: 'FIELD DEPLOYMENT — FIBER SPLICING UNIT',
    color: 'border-emerald-900 bg-emerald-50/80'
  },
  {
    id: 'node-12',
    name: 'SYSTEMS COMMISSIONING & QA/QC TEAM',
    position: 'Hardware Racking, Configuration & Handover Specialists',
    prcLicense: 'Certified Enterprise Network Systems Technicians',
    contact: 'qa.handover@quantumcloudcorp.com',
    level: 4,
    parentId: 'node-9',
    department: 'FIELD DEPLOYMENT — COMMISSIONING & QA',
    color: 'border-emerald-900 bg-emerald-50/80'
  }
];

export const OrganizationalChartModal: React.FC<OrganizationalChartModalProps> = ({
  item,
  tenant,
  activeProjectRefNo,
  activeProjectTitle,
  activeProcuringEntity,
  solicitationNumber: initialSolNo,
  dateTimeSubmitted: initialDateTime,
  onSaveAndComplete,
  onClose
}) => {
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  // Project Metadata
  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo || '2026-901283');
  const [projectTitle, setProjectTitle] = useState(
    activeProjectTitle || 'Proposed Construction of Regional ICT Hub & Enterprise Infrastructure Project'
  );
  const [procuringEntity, setProcuringEntity] = useState(
    activeProcuringEntity || 'Department of Information and Communications Technology (DICT)'
  );
  const [solicitationNumber, setSolicitationNumber] = useState(initialSolNo || 'SOL-DICT-2026-089');
  const [dateTimeSubmitted, setDateTimeSubmitted] = useState(initialDateTime || '');

  // Signatory details
  const [signatoryName, setSignatoryName] = useState(
    tenant?.authorizedSignatory?.name || 'CLOUD OCAMPO'
  );
  const [signatoryTitle, setSignatoryTitle] = useState(
    tenant?.authorizedSignatory?.title || 'President & Authorized Managing Officer'
  );
  const [companyName, setCompanyName] = useState(
    tenant?.companyName || 'QUANTUM CLOUD CORPORATION'
  );

  // Nodes State
  const [nodes, setNodes] = useState<OrgChartNode[]>(defaultOrgNodes);
  const [activeTab, setActiveTab] = useState<'view' | 'edit'>('view');
  const [editingNode, setEditingNode] = useState<OrgChartNode | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  const paperRef = useRef<HTMLDivElement>(null);
  const todayStr = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const projectScopeKey = (projectRefNo || selectedOppId || activeProjectRefNo || 'default').replace(/[^a-zA-Z0-9]/g, '_');

  // Load opportunity projects
  useEffect(() => {
    const list = getOpportunityProjects(tenant?.id);
    setOppProjects(list);
    if (list.length > 0 && !selectedOppId) {
      const first = list[0];
      setSelectedOppId(first.id);
      setProjectRefNo(first.refNo);
      setProjectTitle(first.title);
      setProcuringEntity(first.procuringEntity);
      const solNo = (first as any).solicitationNo || (first as any).solicitationNumber;
      if (solNo) setSolicitationNumber(solNo);
      if (first.dateTimeSubmitted) setDateTimeSubmitted(first.dateTimeSubmitted);
    }
  }, [tenant?.id]);

  // Load saved nodes from localStorage
  useEffect(() => {
    if (!tenant?.id) return;
    const storageKey = `bidocs_org_chart_${tenant.id}_${projectScopeKey}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 8) {
          setNodes(parsed);
          return;
        }
      } catch (e) {
        console.error('[OrgChart] Error loading saved nodes:', e);
      }
    }
    setNodes(defaultOrgNodes);
  }, [tenant?.id, projectScopeKey]);

  // Save nodes to state & localStorage
  const saveNodes = (updated: OrgChartNode[]) => {
    setNodes(updated);
    if (tenant?.id) {
      const storageKey = `bidocs_org_chart_${tenant.id}_${projectScopeKey}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {
        console.error('[OrgChart] Error saving nodes:', e);
      }
    }
  };

  const resetToDefaults = () => {
    if (confirm('Reset Organizational Chart to official full-bleed defaults?')) {
      saveNodes(defaultOrgNodes);
    }
  };

  const handleAddNode = (level: 1 | 2 | 3 | 4) => {
    const newNode: OrgChartNode = {
      id: `node-${Date.now()}`,
      name: 'NEW PERSONNEL NAME',
      position: level === 2 ? 'Project Manager' : level === 3 ? 'Project Engineer / Specialist' : 'Field Technician Team',
      prcLicense: 'PRC Reg. No.: 00-00000',
      contact: '0900-000-0000',
      level: level,
      parentId: level === 2 ? 'node-1' : level === 3 ? 'node-2' : 'node-8',
      department: level === 2 ? 'PROJECT MANAGEMENT' : level === 3 ? 'ENGINEERING UNIT' : 'FIELD OPERATIONS',
      color: level === 1 ? 'border-slate-950 bg-slate-950 text-white' : level === 2 ? 'border-blue-950 bg-blue-50/90' : level === 3 ? 'border-slate-900 bg-white' : 'border-emerald-900 bg-emerald-50/80'
    };
    saveNodes([...nodes, newNode]);
    setEditingNode(newNode);
  };

  const handleDeleteNode = (id: string) => {
    saveNodes(nodes.filter(n => n.id !== id));
    if (editingNode && editingNode.id === id) {
      setEditingNode(null);
    }
  };

  const handleUpdateNode = (updatedNode: OrgChartNode) => {
    saveNodes(nodes.map(n => n.id === updatedNode.id ? updatedNode : n));
    setEditingNode(null);
  };

  // Robust High-Resolution PDF Generator for 8.5" x 13" Landscape (936pt x 612pt)
  const generateOrgChartPdfDataUrl = async (): Promise<string | null> => {
    const sheetEl = paperRef.current || (document.querySelector('.key-personnel-sheet') as HTMLElement);
    if (!sheetEl) {
      console.error('[OrgChart] Paper sheet element not found');
      return null;
    }

    try {
      const canvas = await html2canvas(sheetEl, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1300,
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll('input').forEach((inp) => {
            const span = clonedDoc.createElement('span');
            span.textContent = inp.value || '';
            span.className = inp.className;
            span.style.cssText = window.getComputedStyle(inp).cssText;
            span.style.display = 'inline-block';
            span.style.border = 'none';
            span.style.background = 'transparent';
            span.style.color = '#000000';
            if (inp.parentNode) inp.parentNode.replaceChild(span, inp);
          });
        },
        ignoreElements: (el) => {
          return (
            el.classList.contains('no-export') ||
            el.classList.contains('print:hidden') ||
            el.tagName === 'BUTTON'
          );
        }
      });

      const imgDataUrl = canvas.toDataURL('image/png');
      const pdfDoc = await PDFDocument.create();
      const legalLandscape: [number, number] = [936, 612];
      const page = pdfDoc.addPage(legalLandscape);
      const pngImage = await pdfDoc.embedPng(imgDataUrl);

      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: 936,
        height: 612
      });

      const pdfBytes = await pdfDoc.save();
      const rawBuffer = new ArrayBuffer(pdfBytes.length);
      new Uint8Array(rawBuffer).set(pdfBytes);
      const blob = new Blob([rawBuffer], { type: 'application/pdf' });

      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error('[OrgChart] Fatal PDF generation error:', err);
      return null;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    setIsProcessing(true);
    try {
      const dataUrl = await generateOrgChartPdfDataUrl();
      if (dataUrl) {
        const cleanCode = item.code.replace(/[^a-zA-Z0-9]/g, '');
        const fileName = `${projectRefNo || 'PROJECT'}_Item_${cleanCode}_Organizational_Chart_${todayStr}.pdf`;

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Could not export PDF automatically. Falling back to print dialog.');
        window.print();
      }
    } catch (e) {
      console.error('[OrgChart] Export error:', e);
      window.print();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAndComplete = async () => {
    setIsProcessing(true);
    try {
      const dataUrl = await generateOrgChartPdfDataUrl();
      onSaveAndComplete(dataUrl || undefined, item.name, projectRefNo, projectTitle);
      onClose();
    } catch (e) {
      console.error('[OrgChart] Save Error:', e);
      onSaveAndComplete(undefined, item.name, projectRefNo, projectTitle);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePreviewPdf = async () => {
    setIsProcessing(true);
    try {
      const dataUrl = await generateOrgChartPdfDataUrl();
      if (dataUrl) {
        setPreviewPdfUrl(dataUrl);
      } else {
        alert('Could not generate PDF preview.');
      }
    } catch (err) {
      console.error('[OrgChart] Preview PDF generation error:', err);
      alert('Failed to generate PDF preview.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Group nodes by hierarchy levels
  const level1Nodes = nodes.filter(n => n.level === 1);
  const level2Nodes = nodes.filter(n => n.level === 2);
  const level3Nodes = nodes.filter(n => n.level === 3);
  const level4Nodes = nodes.filter(n => n.level === 4);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">

      {/* PRINT STYLESHEET OVERRIDE FOR EXACT 8.5" x 13" LANDSCAPE */}
      <style>{`
        @media print {
          @page {
            size: 13in 8.5in landscape;
            margin: 0mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, nav, aside, button, .print\\:hidden, .no-print, .no-export {
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
          .key-personnel-sheet, .single-page-paper {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            position: relative !important;
            width: 13in !important;
            height: 8.5in !important;
            max-width: 13in !important;
            max-height: 8.5in !important;
            margin: 0 !important;
            padding: 0.25in 0.35in !important;
            border: 2px solid #000000 !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-[98vw] xl:max-w-[1360px] overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col print:border-none print:shadow-none print:max-h-none print:bg-white">

        {/* Modal Top Header Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-30 shrink-0 print:hidden no-export">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Item {item.code} — Organizational Chart for Contract to be Bid</span>
                <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 text-[10px] font-mono rounded border border-blue-700/50 font-bold">
                  8.5" × 13" Landscape (Legal)
                </span>
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 text-[10px] font-mono rounded border border-emerald-700/50 font-bold">
                  {nodes.length} Staff Units
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-serif">
                Official Class A Statutory Technical Exhibit • Complete Command Tree Hierarchy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View / Edit Mode Switcher */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
              <button
                onClick={() => setActiveTab('view')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  activeTab === 'view' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Chart View</span>
              </button>
              <button
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  activeTab === 'edit' ? 'bg-purple-600 text-white shadow' : 'text-purple-300 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Node Manager</span>
              </button>
            </div>

            {/* Quick Actions */}
            <button
              onClick={handlePreviewPdf}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              title="View compiled PDF in viewer modal"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>View PDF</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isProcessing}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow flex items-center gap-1.5 cursor-pointer"
              title="Export official vector PDF document"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Generating...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow flex items-center gap-1.5 cursor-pointer"
              title="Print document directly in Landscape format"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={handleSaveAndComplete}
              disabled={isProcessing}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition shadow flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>{isProcessing ? 'Saving...' : 'Save & Attach to Vault'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 bg-slate-950/60 flex flex-col items-center">

          {/* Project Header Config Toolbar (Screen only) */}
          <div className="w-full max-w-[1248px] bg-slate-900 border border-slate-800 rounded-xl p-3 print:hidden no-export flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-300 font-mono">Target Bidding Project:</span>
              </div>
              <select
                value={selectedOppId}
                onChange={(e) => {
                  const opp = oppProjects.find(p => p.id === e.target.value);
                  if (opp) {
                    setSelectedOppId(opp.id);
                    setProjectRefNo(opp.refNo);
                    setProjectTitle(opp.title);
                    setProcuringEntity(opp.procuringEntity);
                    const solNo = (opp as any).solicitationNo || (opp as any).solicitationNumber;
                    if (solNo) setSolicitationNumber(solNo);
                    if (opp.dateTimeSubmitted) setDateTimeSubmitted(opp.dateTimeSubmitted);
                  }
                }}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500"
              >
                {oppProjects.map(opp => (
                  <option key={opp.id} value={opp.id}>
                    {opp.refNo} — {opp.title.substring(0, 45)}...
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAddNode(2)}
                className="px-2.5 py-1 bg-blue-900/60 hover:bg-blue-900 text-blue-200 border border-blue-700/60 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ Level 2 (Manager)</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddNode(3)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ Level 3 (Engineer)</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddNode(4)}
                className="px-2.5 py-1 bg-emerald-900/60 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/60 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ Level 4 (Technician)</span>
              </button>
              <button
                type="button"
                onClick={resetToDefaults}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                title="Reset to official template defaults"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Node Editor Modal */}
          {editingNode && (
            <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4 animate-scaleIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-blue-400" />
                    <span>Edit Personnel Box</span>
                  </h3>
                  <button onClick={() => setEditingNode(null)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs font-sans">
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Personnel Full Name</label>
                    <input
                      type="text"
                      value={editingNode.name}
                      onChange={(e) => setEditingNode({ ...editingNode, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-bold uppercase focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Position / Official Designation</label>
                    <input
                      type="text"
                      value={editingNode.position}
                      onChange={(e) => setEditingNode({ ...editingNode, position: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">PRC License / Qualification Notes</label>
                    <input
                      type="text"
                      value={editingNode.prcLicense || ''}
                      onChange={(e) => setEditingNode({ ...editingNode, prcLicense: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-bold">Hierarchy Level</label>
                      <select
                        value={editingNode.level}
                        onChange={(e) => setEditingNode({ ...editingNode, level: Number(e.target.value) as any })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value={1}>Level 1: Executive Management</option>
                        <option value={2}>Level 2: Project Management</option>
                        <option value={3}>Level 3: Specialized Engineers</option>
                        <option value={4}>Level 4: Field Operations Crew</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-bold">Department / Division Header</label>
                      <input
                        type="text"
                        value={editingNode.department || ''}
                        onChange={(e) => setEditingNode({ ...editingNode, department: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500 uppercase"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleDeleteNode(editingNode.id)}
                    className="px-3 py-1.5 bg-red-950 text-red-300 hover:bg-red-900 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 border border-red-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Position</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingNode(null)}
                      className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateNode(editingNode)}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Apply Changes</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* OFFICIAL 8.5" x 13" LANDSCAPE ORGANIZATIONAL CHART SHEET */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div
            ref={paperRef}
            className="key-personnel-sheet single-page-paper landscape aspect-[13/8.5] bg-white text-slate-950 font-serif px-6 py-4 border-2 border-slate-900 rounded-xl shadow-2xl max-w-[1248px] w-full h-[816px] mx-auto text-left relative flex flex-col justify-between print:m-0 print:border-none print:shadow-none box-border overflow-hidden"
          >
            {/* Inner Proportional Layout */}
            <div className="flex-1 flex flex-col justify-between overflow-hidden">

              {/* 1. Header Section */}
              <div className="text-center space-y-0.5 border-b-2 border-slate-900 pb-1.5">
                <h1 className="text-[13px] font-bold uppercase tracking-wider text-slate-950 font-serif leading-tight">
                  ORGANIZATIONAL CHART FOR THE CONTRACT TO BE BID
                </h1>
                <p className="text-[8.5px] font-serif uppercase tracking-wide text-slate-800">
                  Philippine Bidding Documents (Infrastructure Projects & Statutory Technical Requirements)
                </p>
                <div className="flex items-center justify-between text-[7.5px] font-mono text-slate-700 pt-0.5 px-2">
                  <span><strong>PROJECT:</strong> {projectTitle}</span>
                  <span><strong>CONTRACT REF NO.:</strong> {projectRefNo}</span>
                  <span><strong>PROCURING ENTITY:</strong> {procuringEntity}</span>
                </div>
              </div>

              {/* 2. Hierarchical Organization Chart Canvas with Full Connected Tree */}
              <div className="flex-1 flex flex-col justify-between py-1 px-1 relative">

                {/* ─── LEVEL 1: EXECUTIVE / AMO ─── */}
                <div className="flex justify-center items-center pt-0.5">
                  {level1Nodes.map(node => (
                    <div
                      key={node.id}
                      onClick={() => setEditingNode(node)}
                      className="w-[480px] border-2 border-slate-950 rounded-lg overflow-hidden shadow-md text-center bg-white relative group hover:ring-2 hover:ring-blue-600 cursor-pointer transition"
                    >
                      <div className="bg-slate-950 text-white py-0.5 px-2 text-[7.5px] font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
                        <Building2 className="w-2.5 h-2.5 text-blue-300" />
                        <span>{node.department || 'EXECUTIVE MANAGEMENT & OVERALL PROJECT GOVERNANCE'}</span>
                      </div>
                      <div className="p-2 space-y-0.5">
                        <div className="text-[12px] font-bold text-slate-950 uppercase font-serif tracking-wider leading-tight">
                          {node.name}
                        </div>
                        <div className="text-[9px] font-bold text-blue-950 italic">
                          {node.position}
                        </div>
                        {node.prcLicense && (
                          <div className="text-[7.5px] font-mono font-semibold text-slate-700">
                            {node.prcLicense}
                          </div>
                        )}
                      </div>
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition print:hidden no-export">
                        <Edit3 className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* ─── TREE CONNECTOR 1 -> 2 (Stem + Bus + Droppers) ─── */}
                <div className="relative w-full h-[18px] flex flex-col items-center justify-center">
                  {/* Top Stem from Level 1 */}
                  <div className="w-0.5 h-[9px] bg-slate-950"></div>
                  {/* Horizontal Bus Bar for 3 Level 2 cards */}
                  <div className="w-[66.6%] h-0.5 bg-slate-950 relative">
                    {/* Dropper Left (Col 1) */}
                    <div className="absolute left-0 top-0 w-0.5 h-[9px] bg-slate-950"></div>
                    {/* Dropper Center (Col 2) */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 w-0.5 h-[9px] bg-slate-950"></div>
                    {/* Dropper Right (Col 3) */}
                    <div className="absolute right-0 top-0 w-0.5 h-[9px] bg-slate-950"></div>
                  </div>
                </div>

                {/* ─── LEVEL 2: PROJECT MANAGERS ─── */}
                <div className="grid grid-cols-3 gap-4 max-w-[1220px] w-full mx-auto">
                  {level2Nodes.map(node => (
                    <div
                      key={node.id}
                      onClick={() => setEditingNode(node)}
                      className="border-2 border-blue-950 rounded-lg overflow-hidden shadow-sm text-center bg-blue-50/70 relative group hover:ring-2 hover:ring-blue-600 cursor-pointer transition"
                    >
                      <div className="bg-blue-950 text-white py-0.5 px-2 text-[7px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                        <Award className="w-2.5 h-2.5 text-blue-300" />
                        <span>{node.department || 'PROJECT MANAGEMENT DIVISION'}</span>
                      </div>
                      <div className="p-1.5 space-y-0.5">
                        <div className="text-[10.5px] font-bold text-slate-950 uppercase font-serif tracking-wide leading-tight">
                          {node.name}
                        </div>
                        <div className="text-[8.5px] font-bold text-blue-950 italic">
                          {node.position}
                        </div>
                        {node.prcLicense && (
                          <div className="text-[7.5px] font-mono text-slate-700">
                            {node.prcLicense}
                          </div>
                        )}
                      </div>
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition print:hidden no-export">
                        <Edit3 className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* ─── TREE CONNECTOR 2 -> 3 (3 Stems + Bus + 5 Droppers) ─── */}
                <div className="relative w-full h-[18px] flex flex-col items-center justify-center">
                  {/* Top Stem from Level 2 Center */}
                  <div className="w-0.5 h-[9px] bg-slate-950"></div>
                  {/* Horizontal Bus Bar for 5 Level 3 cards */}
                  <div className="w-[90%] h-0.5 bg-slate-950 relative">
                    {/* Dropper 1 */}
                    <div className="absolute left-0 top-0 w-0.5 h-[9px] bg-slate-950"></div>
                    {/* Dropper 2 */}
                    <div className="absolute left-[22.5%] top-0 w-0.5 h-[9px] bg-slate-950"></div>
                    {/* Dropper 3 (Center) */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 w-0.5 h-[9px] bg-slate-950"></div>
                    {/* Dropper 4 */}
                    <div className="absolute right-[22.5%] top-0 w-0.5 h-[9px] bg-slate-950"></div>
                    {/* Dropper 5 */}
                    <div className="absolute right-0 top-0 w-0.5 h-[9px] bg-slate-950"></div>
                  </div>
                </div>

                {/* ─── LEVEL 3: ENGINEERS, HSE SAFETY & SITE FOREMEN ─── */}
                <div className="grid grid-cols-5 gap-2.5 max-w-[1220px] w-full mx-auto">
                  {level3Nodes.map(node => (
                    <div
                      key={node.id}
                      onClick={() => setEditingNode(node)}
                      className="border-2 border-slate-900 rounded-lg overflow-hidden shadow-xs text-center bg-white relative group hover:ring-2 hover:ring-blue-600 cursor-pointer transition flex flex-col justify-between"
                    >
                      <div className="bg-slate-900 text-white py-0.5 px-1 text-[6.5px] font-mono font-bold uppercase tracking-wider truncate">
                        {node.department || 'ENGINEERING DIVISION'}
                      </div>
                      <div className="p-1 space-y-0.5 flex-1 flex flex-col justify-center">
                        <div className="text-[9.5px] font-bold text-slate-950 uppercase font-serif leading-tight">
                          {node.name}
                        </div>
                        <div className="text-[8px] font-bold text-slate-900 italic leading-tight">
                          {node.position}
                        </div>
                        {node.prcLicense && (
                          <div className="text-[7px] font-mono text-slate-600 truncate mt-0.5">
                            {node.prcLicense}
                          </div>
                        )}
                      </div>
                      <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition print:hidden no-export">
                        <Edit3 className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* ─── TREE CONNECTOR 3 -> 4 (Stem + Bus + 3 Droppers) ─── */}
                <div className="relative w-full h-[18px] flex flex-col items-center justify-center">
                  {/* Top Stem from Level 3 Center */}
                  <div className="w-0.5 h-[9px] bg-slate-950"></div>
                  {/* Horizontal Bus Bar for 3 Level 4 cards */}
                  <div className="w-[66.6%] h-0.5 bg-slate-950 relative">
                    {/* Dropper Left */}
                    <div className="absolute left-0 top-0 w-0.5 h-[9px] bg-slate-950"></div>
                    {/* Dropper Center */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 w-0.5 h-[9px] bg-slate-950"></div>
                    {/* Dropper Right */}
                    <div className="absolute right-0 top-0 w-0.5 h-[9px] bg-slate-950"></div>
                  </div>
                </div>

                {/* ─── LEVEL 4: TECHNICAL FIELD OPERATIONS CREWS (FULL WIDTH) ─── */}
                <div className="grid grid-cols-3 gap-4 max-w-[1220px] w-full mx-auto">
                  {level4Nodes.map(node => (
                    <div
                      key={node.id}
                      onClick={() => setEditingNode(node)}
                      className="border-2 border-emerald-900 rounded-lg overflow-hidden shadow-xs text-center bg-emerald-50/80 relative group hover:ring-2 hover:ring-emerald-600 cursor-pointer transition"
                    >
                      <div className="bg-emerald-950 text-white py-0.5 px-2 text-[7px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                        <Wrench className="w-2.5 h-2.5 text-emerald-300" />
                        <span>{node.department || 'FIELD DEPLOYMENT UNIT'}</span>
                      </div>
                      <div className="p-1.5 space-y-0.5">
                        <div className="text-[10px] font-bold text-slate-950 uppercase font-serif leading-tight">
                          {node.name}
                        </div>
                        <div className="text-[8px] font-bold text-emerald-950 italic">
                          {node.position}
                        </div>
                        {node.prcLicense && (
                          <div className="text-[7px] font-mono text-slate-700">
                            {node.prcLicense}
                          </div>
                        )}
                      </div>
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition print:hidden no-export">
                        <Edit3 className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                  ))}
                </div>

              </div>

              {/* 3. Footer & Authorized Signatory Block (Zero Clipping Guarantee) */}
              <div className="pt-1 pb-0 border-t border-slate-900 space-y-0.5">
                <div className="text-[7.5px] font-serif text-slate-800">
                  <p><strong>Note:</strong> All proposed key personnel indicated in this organizational structure are fully assigned to the project pursuant to Section III (BDS) Clause 10.4 and Section VI (Specifications) of the Philippine Bidding Documents.</p>
                </div>

                <div className="flex items-end justify-between font-serif text-slate-950 pt-0.5">
                  {/* QR Code */}
                  <div className="flex items-center gap-2">
                    <DocumentQrCode
                      details={{
                        companyName: companyName,
                        documentName: `Item ${item.code} — ORGANIZATIONAL CHART`,
                        documentNumber: `EXHIBIT-${item.code.replace(/[^a-zA-Z0-9]/g, '')}-${projectRefNo || '2026-901283'}`,
                        projectTitle: projectTitle,
                        projectRefNo: projectRefNo,
                        procuringEntity: procuringEntity,
                        dateTimeSubmitted: dateTimeSubmitted || todayStr,
                        documentCategory: 'Technical Eligibility',
                        generatedBy: companyName
                      }}
                      size={38}
                      showCaption={false}
                    />
                    <div className="text-[7.5px] leading-tight">
                      <p className="font-bold">Official GPPB Exhibit</p>
                      <p className="font-mono text-slate-600">Scan QR to verify</p>
                    </div>
                  </div>

                  {/* Authorized Signatory */}
                  <div className="text-center space-y-0.5 font-serif text-slate-950 min-w-[280px]">
                    <div className="border-b border-slate-900 pb-0.5 mb-0.5 max-w-[260px] mx-auto">
                      <input
                        type="text"
                        value={signatoryName}
                        onChange={(e) => setSignatoryName(e.target.value)}
                        className="w-full bg-transparent border-none p-0 text-center font-bold text-[11px] uppercase tracking-wide focus:outline-none focus:bg-blue-50/50 font-serif text-slate-950"
                        placeholder="NAME OF AUTHORIZED OFFICIAL"
                      />
                    </div>
                    <div className="text-[8px] text-slate-800 italic">
                      Name and Signature of Authorized Official
                    </div>
                    <input
                      type="text"
                      value={signatoryTitle}
                      onChange={(e) => setSignatoryTitle(e.target.value)}
                      className="w-full bg-transparent border-none p-0 text-center text-[8.5px] focus:outline-none focus:bg-blue-50/50 font-serif text-slate-800 block"
                      placeholder="Title / Designation"
                    />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-transparent border-none p-0 text-center font-bold text-[9px] uppercase focus:outline-none focus:bg-blue-50/50 font-serif text-slate-950 block"
                      placeholder="Company Name"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* PDF Preview Modal */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-scaleIn">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold text-white">Organizational Chart — PDF Preview</span>
              </div>
              <button
                onClick={() => setPreviewPdfUrl(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 bg-slate-950 p-2">
              <iframe
                src={previewPdfUrl}
                className="w-full h-full rounded-xl border border-slate-800"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OrganizationalChartModal;

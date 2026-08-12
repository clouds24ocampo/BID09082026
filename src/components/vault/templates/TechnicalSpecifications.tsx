import React, { useState, useEffect } from 'react';
import { Tenant } from '../../../types';
import { PDFDocument } from 'pdf-lib';
import { generateAndDownloadThreeLayerPdf } from '../../../utils/pdfExportEngine';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import html2canvas from 'html2canvas';
import DocumentQrCode from '../../common/DocumentQrCode';
import {
  X,
  Printer,
  Download,
  FileSignature,
  Plus,
  Trash2,
  Building2,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Type,
  Check,
  AlertCircle,
  Paperclip,
  FileText,
  Upload,
  RefreshCw,
  Tag,
  Sparkles
} from 'lucide-react';

export interface TechSpecItem {
  id: string;
  itemNo: string;
  specification: string;
  quantity: string;
  compliance: 'Comply' | 'Not Comply';
  brandModel?: string;
  complianceEvidence?: string;
}

export interface TechnicalSpecificationsProps {
  item?: { id: string; code: string; name: string };
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose?: () => void;
}

const getNowDateTimeString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${mins}`;
};

const formatDateTimeDisplay = (raw: string): string => {
  if (!raw) return 'N/A';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return raw;
  }
};

const DEFAULT_SECTION_VI_ITEMS: TechSpecItem[] = [
  {
    id: '1',
    itemNo: '1',
    specification: 'Enterprise Server Rack Systems with High-Availability Redundancy, Dual Hot-Swappable 1200W Power Supplies, Rail Kits, and 5-Year OEM On-Site Warranty Support',
    quantity: '5 units',
    compliance: 'Comply',
    brandModel: 'Dell PowerEdge R750 / Rack Enclosure 42U',
    complianceEvidence: 'Supported by Manufacturer Un-amended Sales Brochure & Technical Data Sheet (Attachment A-1)'
  },
  {
    id: '2',
    itemNo: '2',
    specification: 'Managed Layer 3 Core Network Switches (48-Port PoE+ 740W, 4x 10G SFP+ Uplinks, Stacking Module, Redundant Power Module, Advanced L3 Routing License)',
    quantity: '10 units',
    compliance: 'Comply',
    brandModel: 'Cisco Catalyst 9300-48P-A',
    complianceEvidence: 'Cross-referenced to ISO 9001 Compliance Certificate & OEM Spec Sheet (Attachment A-2)'
  },
  {
    id: '3',
    itemNo: '3',
    specification: 'Uninterruptible Power Supply (UPS) 10kVA Online Double Conversion Tower/Rack Mountable with Extended Battery Module (EBM) and Network Management Card',
    quantity: '4 units',
    compliance: 'Comply',
    brandModel: 'APC Smart-UPS SRT 10000VA 230V',
    complianceEvidence: 'Supported by Independent Test Data & Factory Acceptance Certificate (Attachment A-3)'
  }
];

export const TechnicalSpecifications: React.FC<TechnicalSpecificationsProps> = ({
  item = { id: 'sec-7', code: 'SEC-VII', name: 'Section VII. Technical Specifications' },
  tenant,
  activeProjectRefNo = 'PRJ-2026-901283',
  activeProjectTitle = 'Infrastructure & IT Systems Modernization Project',
  activeProcuringEntity = 'Department of Information & Communications Technology',
  onSaveAndComplete,
  onClose
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [isExporting, setIsExporting] = useState(false);
  const [drawingPdfUrl, setDrawingPdfUrl] = useState<string | null>(null);
  const [drawingPdfName, setDrawingPdfName] = useState<string>('');
  const [fontSizeMode, setFontSizeMode] = useState<'fine' | 'xs' | 'sm'>('xs');
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo);
  const [solicitationNumber, setSolicitationNumber] = useState('SOL-2026-001');
  const [projectTitle, setProjectTitle] = useState(activeProjectTitle);
  const [procuringEntity, setProcuringEntity] = useState(activeProcuringEntity);
  const [dateTimeSubmitted, setDateTimeSubmitted] = useState<string>(getNowDateTimeString());

  const [companyName] = useState(tenant?.companyName || 'Bidding Entity Corporate Name');
  const [companyAddress] = useState(tenant?.address || 'Metro Manila, Philippines');
  const [signatoryName] = useState(tenant?.authorizedSignatory?.name || 'Authorized Signatory Name');
  const [signatoryTitle] = useState(tenant?.authorizedSignatory?.title || 'President / General Manager');

  const [items, setItems] = useState<TechSpecItem[]>(DEFAULT_SECTION_VI_ITEMS);

  useEffect(() => {
    const list = getOpportunityProjects(tenant?.id);
    setOppProjects(list);
    if (list.length > 0 && !selectedOppId) {
      const first = list[0];
      setSelectedOppId(first.id);
      setProjectRefNo(first.refNo);
      setSolicitationNumber(first.solicitationNo || 'SOL-2026-001');
      setProjectTitle(first.title);
      setProcuringEntity(first.procuringEntity);
      if (first.dateTimeSubmitted) {
        setDateTimeSubmitted(first.dateTimeSubmitted);
      }
    }
  }, [tenant?.id]);

  useEffect(() => {
    if (!projectRefNo) return;
    const tenantKey = tenant?.id || 'default';
    const secViKey = `bidocs_sec_vi_${tenantKey}_${projectRefNo}`;
    const savedSecVi = localStorage.getItem(secViKey);

    const techSpecsKey = `bidocs_tech_specs_${tenantKey}_${projectRefNo}`;
    const savedTechSpecs = localStorage.getItem(techSpecsKey);

    let baseItems = [...DEFAULT_SECTION_VI_ITEMS];

    if (savedSecVi) {
      try {
        const parsedVi = JSON.parse(savedSecVi);
        if (Array.isArray(parsedVi) && parsedVi.length > 0) {
          baseItems = parsedVi.map((viItem: any, idx: number) => ({
            id: viItem.id || String(idx + 1),
            itemNo: String(idx + 1),
            specification: viItem.description || '',
            quantity: viItem.quantity || '1 unit',
            compliance: 'Comply' as const,
            brandModel: '',
            complianceEvidence: 'Supported by Manufacturer Sales Literature and Technical Data Sheet.'
          }));
        }
      } catch (e) { }
    }

    if (savedTechSpecs) {
      try {
        const parsedTech = JSON.parse(savedTechSpecs);
        if (Array.isArray(parsedTech) && parsedTech.length > 0) {
          baseItems = baseItems.map((it, idx) => {
            const matched = parsedTech[idx];
            if (matched) {
              return {
                ...it,
                specification: matched.specification || it.specification,
                quantity: matched.quantity || it.quantity,
                compliance: matched.compliance || it.compliance,
                brandModel: matched.brandModel !== undefined ? matched.brandModel : it.brandModel,
                complianceEvidence: matched.complianceEvidence !== undefined ? matched.complianceEvidence : it.complianceEvidence
              };
            }
            return it;
          });
        }
      } catch (e) { }
    }

    setItems(baseItems);
  }, [projectRefNo, tenant?.id]);

  const saveSharedItems = (newItems: TechSpecItem[]) => {
    setItems(newItems);
    if (projectRefNo) {
      const storageKey = `bidocs_tech_specs_${tenant?.id || 'default'}_${projectRefNo}`;
      localStorage.setItem(storageKey, JSON.stringify(newItems));
    }
  };

  const handleFieldChange = (index: number, field: keyof TechSpecItem, value: any) => {
    const updated = items.map((it, idx) => (idx === index ? { ...it, [field]: value } : it));
    saveSharedItems(updated);
  };

  const handleComplyClick = (index: number) => {
    const currentEv = items[index]?.complianceEvidence || '';
    const cleanEv = currentEv.replace(/Not Comply/gi, '').trim();
    const finalEv = cleanEv.startsWith('Comply')
      ? cleanEv
      : (cleanEv ? `Supported by ${cleanEv.replace(/^[-—:]*\s*/, '')}` : 'Supported by Manufacturer Sales Literature and Technical Data Sheet.');

    const updated = items.map((it, idx) =>
      idx === index
        ? { ...it, compliance: 'Comply' as const, complianceEvidence: finalEv }
        : it
    );
    saveSharedItems(updated);
  };

  const handleNotComplyClick = (index: number) => {
    const updated = items.map((it, idx) =>
      idx === index
        ? {
          ...it,
          compliance: 'Not Comply' as const,
          complianceEvidence: 'Specification parameter does not meet mandatory requirement.'
        }
        : it
    );
    saveSharedItems(updated);
  };

  const handleAddItem = () => {
    const newItem: TechSpecItem = {
      id: Date.now().toString(),
      itemNo: String(items.length + 1),
      specification: '',
      quantity: '1 unit',
      compliance: 'Comply',
      brandModel: '',
      complianceEvidence: 'Supported by OEM Technical Data Sheet'
    };
    saveSharedItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    saveSharedItems(items.filter((_, idx) => idx !== index));
  };

  const handleSyncWithSectionVi = () => {
    if (!projectRefNo) return;
    const tenantKey = tenant?.id || 'default';
    const secViKey = `bidocs_sec_vi_${tenantKey}_${projectRefNo}`;
    const savedSecVi = localStorage.getItem(secViKey);

    if (savedSecVi) {
      try {
        const parsedVi = JSON.parse(savedSecVi);
        if (Array.isArray(parsedVi) && parsedVi.length > 0) {
          const synced = parsedVi.map((viItem: any, idx: number) => ({
            id: viItem.id || String(idx + 1),
            itemNo: String(idx + 1),
            specification: viItem.description || '',
            quantity: viItem.quantity || '1 unit',
            compliance: (items[idx]?.compliance === 'Not Comply' ? 'Not Comply' as const : 'Comply' as const),
            brandModel: items[idx]?.brandModel || '',
            complianceEvidence: items[idx]?.complianceEvidence || 'Supported by Manufacturer Sales Literature and Technical Data Sheet.'
          }));
          saveSharedItems(synced);
          return;
        }
      } catch (e) { }
    }
    saveSharedItems(DEFAULT_SECTION_VI_ITEMS);
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Please upload a valid PDF document for technical drawings.');
      return;
    }
    setDrawingPdfName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setDrawingPdfUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePdf = () => {
    setDrawingPdfUrl(null);
    setDrawingPdfName('');
  };

  const handlePrint = () => {
    window.print();
  };

  // FIXED EXPORT PDF FUNCTION
  const handleExportPdf = async () => {
    setIsExporting(true);
    await new Promise((r) => setTimeout(r, 200));
    try {
      const fileName = `${projectRefNo}_Section_VII_Technical_Specifications_${todayStr}.pdf`;
      const paperElem = document.getElementById('technical-specifications-paper');
      if (paperElem) {
        await generateAndDownloadThreeLayerPdf(
          null,
          paperElem,
          drawingPdfUrl || undefined,
          fileName
        );
      }
    } catch (err) {
      console.error('PDF Export Error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    const cleanProj = (projectRefNo || 'PRJ').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${cleanProj}_Technical_Specifications_${todayStr}.csv`;

    let csvContent = '\uFEFF';
    csvContent += `"SECTION VII. TECHNICAL SPECIFICATIONS"\n`;
    csvContent += `"Company Name:","${companyName.replace(/"/g, '""')}"\n`;
    csvContent += `"Company Address:","${companyAddress.replace(/"/g, '""')}"\n`;
    csvContent += `"Philgeps Ref No.:","${projectRefNo.replace(/"/g, '""')}"\n`;
    csvContent += `"Solicitation No.:","${solicitationNumber.replace(/"/g, '""')}"\n`;
    csvContent += `"Project Title:","${projectTitle.replace(/"/g, '""')}"\n`;
    csvContent += `"Procuring Entity:","${procuringEntity.replace(/"/g, '""')}"\n`;
    csvContent += `"Submission Date & Time:","${formatDateTimeDisplay(dateTimeSubmitted)}"\n`;
    if (drawingPdfName) {
      csvContent += `"Attached Drawing PDF:","${drawingPdfName.replace(/"/g, '""')}"\n`;
    }
    csvContent += `\n`;

    csvContent += `"Item","Maximum Quantity","Technical Specification / Scope of Work","Brand & Model Offered","Statement of Compliance"\n`;

    items.forEach((it, idx) => {
      const itemNum = `"${idx + 1}"`;
      const qty = `"${(it.quantity || '').replace(/"/g, '""')}"`;
      const spec = `"${(it.specification || '').replace(/"/g, '""')}"`;
      const bm = `"${(it.brandModel || 'N/A').replace(/"/g, '""')}"`;
      const compText = `"${(formatFullComplianceText(it)).replace(/"/g, '""')}"`;
      csvContent += `${itemNum},${qty},${spec},${bm},${compText}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderTechnicalSpecificationsPdfDataUrl = async (templateElem: HTMLElement): Promise<string | undefined> => {
    const canvas = await html2canvas(templateElem, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      ignoreElements: (element: Element) => {
        return (
          element.classList.contains('print:hidden') ||
          element.classList.contains('no-export') ||
          element.classList.contains('proof-column') ||
          element.classList.contains('actions-column') ||
          element.tagName === 'BUTTON'
        );
      }
    });

    const imgDataUrl = canvas.toDataURL('image/png');
    const pdfDoc = await PDFDocument.create();
    const pngImage = await pdfDoc.embedPng(imgDataUrl);
    const page = pdfDoc.addPage([canvas.width, canvas.height]);
    page.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleSave = async () => {
    setIsExporting(true);
    await new Promise((r) => setTimeout(r, 200));
    try {
      const templateElem = document.getElementById('technical-specifications-paper') as HTMLElement;
      let dataUrl: string | undefined = undefined;
      if (templateElem) {
        dataUrl = await renderTechnicalSpecificationsPdfDataUrl(templateElem);
      }
      if (onSaveAndComplete) {
        onSaveAndComplete(drawingPdfUrl || dataUrl, item.name, projectRefNo, projectTitle);
      }
    } catch (error) {
      console.error('Failed to generate Technical Specifications PDF:', error);
      if (onSaveAndComplete) {
        onSaveAndComplete(drawingPdfUrl || undefined, item.name, projectRefNo, projectTitle);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const formatFullComplianceText = (it: TechSpecItem): string => {
    if (it.compliance === 'Comply') {
      const cleanEvidence = (it.complianceEvidence || '').replace(/Not Comply/gi, '').replace(/^Comply\s*[-—:]*\s*/i, '').trim();
      const brandModelPart = it.brandModel ? ` (Offered Brand/Model: ${it.brandModel})` : '';
      const body = cleanEvidence || 'Supported by Manufacturer Sales Literature and Technical Data Sheet.';
      return `Comply${brandModelPart} — ${body}`;
    } else {
      const cleanEvidence = (it.complianceEvidence || '').replace(/Comply/gi, '').replace(/^Not Comply\s*[-—:]*\s*/i, '').trim();
      return `Not Comply — ${cleanEvidence || 'Specification parameter does not meet mandatory requirement.'}`;
    }
  };

  const getTableFontSizeClass = () => {
    if (fontSizeMode === 'fine') return 'text-[10px] leading-snug';
    if (fontSizeMode === 'xs') return 'text-xs leading-normal';
    return 'text-sm leading-relaxed';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <style>{`
        @media print {
          @page {
            size: 13in 8.5in;
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
            padding: 0.3in !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
          }
          .export-text {
            display: block !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col print:border-none print:shadow-none print:max-h-none print:bg-white">

        {/* Controls Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 shrink-0 print:hidden no-export">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Section VII. Technical Specifications</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                  100% Synced with Section VI
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-xl">
                Specification (56% width) • Statement of Compliance (34% width) • Drawing Attachment PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 transition shadow flex items-center gap-1.5 border border-emerald-500/40"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export to Excel</span>
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition shadow flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Exporting PDF...' : 'Export to PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Legal Landscape</span>
            </button>
            {onClose && (
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950 space-y-6 print:p-0 print:bg-white">

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 print:hidden no-export">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="block text-slate-200 font-mono text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-blue-300">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    Select Target Project from Opportunity Finder:
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold font-mono">⚡ 100% Synced with Section VI & Framework Agreement</span>
                </label>
                <select
                  value={selectedOppId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedOppId(val);
                    const found = oppProjects.find((p) => p.id === val || p.refNo === val);
                    if (found) {
                      setProjectRefNo(found.refNo);
                      setSolicitationNumber(found.solicitationNo || 'SOL-2026-001');
                      setProjectTitle(found.title);
                      setProcuringEntity(found.procuringEntity);
                      if (found.dateTimeSubmitted) {
                        setDateTimeSubmitted(found.dateTimeSubmitted);
                      }
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

              <div className="flex flex-wrap items-center gap-2 pt-4 sm:pt-0 shrink-0">
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                  <span className="text-slate-400 px-1.5 flex items-center gap-1 text-[11px]">
                    <Type className="w-3.5 h-3.5 text-blue-400" /> Font Size:
                  </span>
                  <button
                    type="button"
                    onClick={() => setFontSizeMode('fine')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${fontSizeMode === 'fine' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    9pt
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSizeMode('xs')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${fontSizeMode === 'xs' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    10pt
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSizeMode('sm')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${fontSizeMode === 'sm' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    11pt
                  </button>
                </div>

                <button
                  onClick={handleAddItem}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Row Item</span>
                </button>
                <button
                  onClick={handleSyncWithSectionVi}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Sync with Section VI</span>
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-purple-400" />
              <span>
                <strong>100% Automatic Synchronization:</strong> Section VII item descriptions and quantities automatically sync from Section VI Schedule of Requirements.
              </span>
            </div>

            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-purple-400" />
                  <span>Attach Technical Drawing / Architectural Schematic PDF:</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  Upload architectural plans, network diagrams, or engineering drawings (PDF format) to merge into the final exported PDF.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {drawingPdfName ? (
                  <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 px-3 py-1.5 rounded-xl text-xs font-mono text-purple-300">
                    <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="truncate max-w-[220px] font-semibold">{drawingPdfName}</span>
                    <button
                      type="button"
                      onClick={handleRemovePdf}
                      className="p-1 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 cursor-pointer shadow transition flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    <span>Upload Drawing PDF</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

          </div>

          {/* DOCUMENT SHEET */}
          <div id="technical-specifications-paper" className="single-page-paper print-document-sheet bg-white text-black p-6 sm:p-10 border-2 border-slate-900 shadow-2xl mx-auto rounded-md w-full max-w-[1150px] flex flex-col justify-between font-serif">
            <div>
              <div className="border-b-2 border-black pb-3 mb-5 space-y-2 font-serif">
                <div className="text-center pb-2 border-b border-slate-300">
                  <h2 className="text-lg sm:text-xl font-bold text-black uppercase tracking-wide font-serif">{companyName}</h2>
                  <p className="text-xs text-slate-700 font-serif mt-0.5">{companyAddress}</p>
                </div>

                <div className="space-y-1.5 text-xs font-serif text-black pt-1">
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <span className="font-bold">Philgeps Ref No.: </span>
                      <span className="font-mono font-semibold text-blue-950">{projectRefNo || 'N/A'}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold">SOLICITATION NO: </span>
                      <span className="font-mono font-semibold text-blue-950">{solicitationNumber || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <span className="font-bold">NAME OF PROJECT: </span>
                      <span className="font-semibold text-black">{projectTitle || 'N/A'}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="font-bold">DATE & TIME OF SUBMISSION: </span>
                      <span className="font-mono font-semibold text-blue-950">{formatDateTimeDisplay(dateTimeSubmitted)}</span>
                    </div>
                  </div>
                  <div>
                    <span className="font-bold">PROCURING ENTITY: </span>
                    <span className="text-slate-900">{procuringEntity || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="text-center mb-4">
                <h1 className="text-2xl sm:text-3xl font-bold font-serif italic text-black tracking-tight">
                  Section VII. Technical Specifications
                </h1>
                {drawingPdfName && (
                  <div className="mt-1 text-xs font-serif italic text-purple-950 font-semibold">
                    📎 Attached Technical Drawings / Schematics: {drawingPdfName}
                  </div>
                )}
              </div>

              <table className={`w-full border-collapse border-2 border-black text-black table-fixed ${getTableFontSizeClass()}`}>
                <thead>
                  <tr className="border-b-2 border-black bg-slate-50 font-serif">
                    <th className="border border-black px-1.5 py-2.5 text-center font-bold italic w-[4%]">
                      Item
                    </th>
                    <th className="border border-black px-1.5 py-2.5 text-center font-bold italic w-[6%]">
                      Maximum Quantity
                    </th>
                    <th className="border border-black px-3 py-2.5 text-center font-bold italic w-[56%]">
                      Technical Specifications / Scope of Work
                    </th>
                    <th className="border border-black px-3 py-2.5 text-left font-bold italic w-[34%]">
                      <div className="text-center font-bold text-black mb-1">Statement of Compliance</div>
                      <div className="text-[9px] font-serif leading-tight text-slate-800 font-normal normal-case p-2 bg-amber-50/60 rounded border border-amber-200/80">
                        [Bidders must state here either <strong>"Comply"</strong> or <strong>"Not Comply"</strong> against each of the individual parameters of each Specification stating the corresponding performance parameter of the equipment offered. Statements of "Comply" or "Not Comply" must be supported by evidence in a Bidders Bid and cross-referenced to that evidence. Evidence shall be in the form of manufacturer's un-amended sales literature, unconditional statements of specification and compliance issued by the manufacturer, samples, independent test data etc., as appropriate.]
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((rowItem, idx) => (
                    <tr key={rowItem.id} className="border-b border-black hover:bg-slate-50/50 transition-colors">
                      <td className="border border-black px-1.5 py-3 text-center font-serif font-bold align-top">
                        <div className="flex flex-col items-center justify-between h-full">
                          <span className="block pt-0.5">{idx + 1}</span>
                          {!isExporting && items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-red-500 hover:text-red-700 mt-2 print:hidden no-export p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="border border-black px-1.5 py-3 font-serif text-center align-top break-words">
                        {!isExporting ? (
                          <input
                            type="text"
                            value={rowItem.quantity}
                            onChange={(e) => handleFieldChange(idx, 'quantity', e.target.value)}
                            placeholder="Qty"
                            className={`w-full bg-transparent text-center outline-none font-serif text-black placeholder-slate-400 focus:bg-amber-50/40 print:hidden p-1 rounded border border-slate-200 hover:border-slate-400 ${getTableFontSizeClass()}`}
                          />
                        ) : null}
                        <div className={`${!isExporting ? 'hidden print:block' : 'block'} font-serif text-black text-center pt-0.5 font-normal break-words ${getTableFontSizeClass()}`}>
                          {rowItem.quantity || ''}
                        </div>
                      </td>

                      <td className="border border-black px-3 py-3 font-serif align-top break-words">
                        {!isExporting ? (
                          <textarea
                            rows={4}
                            value={rowItem.specification}
                            onChange={(e) => handleFieldChange(idx, 'specification', e.target.value)}
                            placeholder="Enter detailed technical specification parameter..."
                            className={`w-full bg-transparent resize-y outline-none font-serif text-black placeholder-slate-400 focus:bg-amber-50/40 print:hidden p-1 rounded border border-slate-200 hover:border-slate-400 ${getTableFontSizeClass()}`}
                          />
                        ) : null}
                        <div className={`${!isExporting ? 'hidden print:block' : 'block'} font-serif text-black pt-0.5 whitespace-pre-wrap font-normal break-words ${getTableFontSizeClass()}`}>
                          {rowItem.specification || ''}
                        </div>
                      </td>

                      <td className="border border-black px-3 py-3 font-serif align-top break-words bg-emerald-50/20">
                        <div className="space-y-2">
                          {!isExporting && (
                            <div className="flex items-center gap-1.5 print:hidden no-export">
                              <button
                                type="button"
                                onClick={() => handleComplyClick(idx)}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${rowItem.compliance === 'Comply'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                  }`}
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Comply</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleNotComplyClick(idx)}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${rowItem.compliance === 'Not Comply'
                                    ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-400'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                  }`}
                              >
                                <AlertCircle className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Not Comply</span>
                              </button>
                            </div>
                          )}

                          {!isExporting && rowItem.compliance === 'Comply' && (
                            <div className="space-y-1 print:hidden no-export">
                              <label className="text-[10px] font-mono font-bold text-slate-700 flex items-center gap-1">
                                <Tag className="w-3 h-3 text-blue-600" />
                                <span>Brand & Model Offered (Optional):</span>
                              </label>
                              <input
                                type="text"
                                value={rowItem.brandModel || ''}
                                onChange={(e) => handleFieldChange(idx, 'brandModel', e.target.value)}
                                placeholder="e.g. Cisco Catalyst 9300 / Dell PowerEdge R750"
                                className="w-full bg-blue-50/50 text-blue-950 border border-blue-300 rounded p-1 text-xs font-serif outline-none focus:border-blue-500 font-semibold"
                              />
                            </div>
                          )}

                          {!isExporting && (
                            <textarea
                              rows={2}
                              value={rowItem.complianceEvidence || ''}
                              onChange={(e) => handleFieldChange(idx, 'complianceEvidence', e.target.value)}
                              placeholder="State cross-reference supporting evidence (e.g. Manufacturer Sales Literature, Brochure Page 4)..."
                              className="w-full bg-white text-black border border-slate-300 rounded p-1.5 text-xs font-serif outline-none focus:border-blue-500 print:hidden"
                            />
                          )}

                          <div className={`${!isExporting ? 'hidden print:block' : 'block'} font-serif text-black text-xs leading-relaxed`}>
                            <div className={`font-bold mb-1 ${rowItem.compliance === 'Comply' ? 'text-emerald-950' : 'text-red-950'}`}>
                              Statement: {rowItem.compliance}
                            </div>
                            {rowItem.compliance === 'Comply' && rowItem.brandModel && (
                              <div className="font-semibold text-blue-950 mb-0.5">
                                Offered Brand & Model: {rowItem.brandModel}
                              </div>
                            )}
                            <div className="text-slate-900 whitespace-pre-wrap italic">
                              {formatFullComplianceText(rowItem)}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-300 flex items-end justify-between text-xs font-serif signatory-block">
              <div>
                <p className="font-bold text-black uppercase">{companyName}</p>
                <div className="mt-8 border-b border-black w-64"></div>
                <p className="font-bold text-black mt-1 uppercase">{signatoryName}</p>
                <p className="text-slate-700">{signatoryTitle}</p>
              </div>

              <div className="text-right flex flex-col items-end">
                <DocumentQrCode
                  details={{
                    companyName: companyName,
                    documentName: 'Section VII. Technical Specifications',
                    documentNumber: `SEC-VII-${projectRefNo || '2026-901283'}`,
                    projectTitle: projectTitle,
                    projectRefNo: projectRefNo,
                    procuringEntity: procuringEntity,
                    dateTimeSubmitted: formatDateTimeDisplay(dateTimeSubmitted),
                    documentCategory: 'Technical Eligibility',
                    generatedBy: companyName
                  }}
                  size={90}
                  showCaption={false}
                />
                <span className="text-[9px] font-mono text-slate-600 uppercase mt-1">
                  VERIFIED GPPB DOC • {projectRefNo}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900 shrink-0 print:hidden no-export">
          <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Class A Technical Exhibit — Legal Landscape Standard (13" × 8.5")</span>
          </div>

          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isExporting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition shadow-lg flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isExporting ? 'Saving PDF...' : 'Save & Complete Technical Specifications'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TechnicalSpecifications;
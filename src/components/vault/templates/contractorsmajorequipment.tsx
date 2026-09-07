import React, { useState, useEffect, useMemo } from 'react';
import { Tenant } from '../../../types';
import { PDFDocument } from 'pdf-lib';
import {
  X,
  Printer,
  Download,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  CheckCircle2,
  ShieldCheck,
  Eye
} from 'lucide-react';
import DocumentQrCode from '../../common/DocumentQrCode';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import { savePdfData, loadPdfData } from '../../../utils/vaultIndexedDB';
import html2canvas from 'html2canvas';

export interface EquipmentItemRow {
  id: string;
  description: string;
  modelCapacity: string;
  serialNo: string;
  status: 'Owned' | 'Leased' | 'Under Purchase';
  proofRef: string;
  attachedPdfId?: string;
  attachedPdfName?: string;
}

export interface PageRow {
  item: EquipmentItemRow;
  index: number;
}

export interface EquipmentPage {
  id: string;
  items: EquipmentItemRow[];
}

export interface ContractorsMajorEquipmentProps {
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

const defaultInitialEquipment: EquipmentItemRow[] = [
  {
    id: 'eq-1',
    description: 'Enterprise Fiber Optic Fusion Splicer System',
    modelCapacity: 'Fujikura 90S+ Core Alignment Splicer',
    serialNo: 'SN-90S-2026-88',
    status: 'Owned',
    proofRef: 'Official Receipt #89012 & Equipment Registration'
  },
  {
    id: 'eq-2',
    description: 'OTDR Network Testing & Certification Rig',
    modelCapacity: 'EXFO FTB-1v2 Quad Optical Time Domain Reflectometer',
    serialNo: 'SN-EXFO-1029',
    status: 'Owned',
    proofRef: 'OR/CR #10293 & Calibration Certificate'
  },
  {
    id: 'eq-3',
    description: 'Heavy-Duty Cable Pulling & Tensioning Winch',
    modelCapacity: 'Condux 9000-lb Hydraulic Pulling Winch',
    serialNo: 'SN-CDX-9901',
    status: 'Leased',
    proofRef: 'Lease Agreement #LA-2026-04 with Equipment Corp'
  },
  {
    id: 'eq-4',
    description: 'Digital Optical Power Meter & Light Source Kit',
    modelCapacity: 'Fluke MultiFiber Pro Optical Power Meter',
    serialNo: 'SN-FLK-8812',
    status: 'Owned',
    proofRef: 'Official Receipt #91024 & NIST Calibration'
  },
  {
    id: 'eq-5',
    description: '50kVA Silent Mobile Diesel Generator Set',
    modelCapacity: 'Denyo DCA-50SPH 3-Phase 220V/440V Genset',
    serialNo: 'SN-DEN-5012',
    status: 'Owned',
    proofRef: 'OR/CR #50124 & DENR Emissions Clearance'
  },
  {
    id: 'eq-6',
    description: 'Bucket Truck / Aerial Boom Lift Vehicle (15-Meter Reach)',
    modelCapacity: 'Isuzu Elf N-Series Hydraulic Bucket Truck',
    serialNo: 'Plate No. ABC-1234 / Engine 4HG1-9012',
    status: 'Owned',
    proofRef: 'LTO Official Receipt & Certificate of Registration #77102'
  },
  {
    id: 'eq-7',
    description: 'Concrete Cutter & Microtrenching Saw Unit',
    modelCapacity: 'Husqvarna FS400 LV Walk-Behind Concrete Cutter',
    serialNo: 'SN-HUS-4001',
    status: 'Under Purchase',
    proofRef: 'Approved Purchase Order #PO-2026-89 & Invoice'
  },
  {
    id: 'eq-8',
    description: 'Fiber Optic Underground Pipe Cable Locator & Identifier',
    modelCapacity: 'Radiodetection RD8200 Precision Cable & Pipe Locator',
    serialNo: 'SN-RD82-5019',
    status: 'Owned',
    proofRef: 'Official Receipt #78019 & Proof of Ownership'
  },
  {
    id: 'eq-9',
    description: 'Air Compressor & Pneumatic Conduit Blower Unit',
    modelCapacity: 'Atlas Copco XAS 185 Portable Diesel Compressor',
    serialNo: 'SN-ATL-1850',
    status: 'Leased',
    proofRef: 'Equipment Lease Agreement #LA-2026-09'
  }
];

export const ContractorsMajorEquipment: React.FC<ContractorsMajorEquipmentProps> = ({
  item,
  tenant,
  activeProjectRefNo,
  activeProjectTitle,
  activeProcuringEntity,
  solicitationNumber: propSolicitationNumber,
  dateTimeSubmitted: propDateTimeSubmitted,
  onSaveAndComplete,
  onClose
}) => {
  const todayStr = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  // Projects dropdown state
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  // Project Metadata
  const [companyName, setCompanyName] = useState(tenant?.companyName || '');
  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo || '');
  const [projectTitle, setProjectTitle] = useState(activeProjectTitle || '');
  const [procuringEntity, setProcuringEntity] = useState(activeProcuringEntity || '');
  const [, setSolicitationNumber] = useState(propSolicitationNumber || '');
  const [dateTimeSubmitted, setDateTimeSubmitted] = useState(propDateTimeSubmitted || todayStr);

  const [signatoryName, setSignatoryName] = useState(tenant?.authorizedSignatory?.name || '');
  const [signatoryTitle, setSignatoryTitle] = useState(tenant?.authorizedSignatory?.title || '');

  // Dynamic Project Scope Key
  const projectScopeKey = (projectRefNo || selectedOppId || activeProjectRefNo || 'default').replace(/[^a-zA-Z0-9]/g, '_');

  // Master Flat Items List - Clean Slate []
  const [items, setItems] = useState<EquipmentItemRow[]>([]);
  const [activeUploadTarget, setActiveUploadTarget] = useState<string | null>(null);
  const [showMetadataInputs, setShowMetadataInputs] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

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

  // Load saved equipment from localStorage
  useEffect(() => {
    if (!tenant?.id) return;
    const storageKey = `bidocs_equipment_${tenant.id}_${projectScopeKey}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setItems(parsed);
          return;
        }
      } catch (e) {
        console.error('[ContractorsMajorEquipment] Error loading saved items:', e);
      }
    }
    setItems([]);
  }, [tenant?.id, projectScopeKey]);

  // Save to state & storage
  const saveItems = (updated: EquipmentItemRow[]) => {
    setItems(updated);
    if (tenant?.id) {
      const storageKey = `bidocs_equipment_${tenant.id}_${projectScopeKey}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {
        console.error('[ContractorsMajorEquipment] Error saving items:', e);
      }
    }
  };

  // Add new equipment row directly after the last item row
  const handleAddNewEquipmentRow = () => {
    const newRowNumber = items.length + 1;
    const newRow: EquipmentItemRow = {
      id: `eq-${Date.now()}-${newRowNumber}`,
      description: `New Equipment Unit Description ${newRowNumber}`,
      modelCapacity: 'Model / Serial / Capacity Specification',
      serialNo: `SN-${Date.now().toString().slice(-6)}`,
      status: 'Owned',
      proofRef: 'Official Purchase Receipt / Certificate of Registration'
    };
    saveItems([...items, newRow]);
  };

  const handleRemoveEquipmentRow = (id: string) => {
    if (items.length <= 1) {
      alert('At least 1 equipment row must be maintained.');
      return;
    }
    saveItems(items.filter(it => it.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof EquipmentItemRow, value: any) => {
    saveItems(items.map(it => it.id === id ? { ...it, [field]: value } : it));
  };

  const handleResetToDefaults = () => {
    if (confirm('Reset equipment list to official defaults?')) {
      saveItems(defaultInitialEquipment);
    }
  };

  // Proof PDF Attachment Handler
  const handleProofPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadTarget) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a valid PDF file.');
      return;
    }

    const targetId = activeUploadTarget;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      if (dataUrl) {
        const pdfKey = `equip_proof_${targetId}_${Date.now()}`;
        try {
          await savePdfData(pdfKey, dataUrl);
          const updated = items.map(it =>
            it.id === targetId
              ? { ...it, attachedPdfId: pdfKey, attachedPdfName: file.name }
              : it
          );
          saveItems(updated);
          setActiveUploadTarget(null);
          alert(`✅ Proof PDF "${file.name}" attached successfully! It will be automatically included when you download or view the PDF.`);
        } catch (err) {
          console.error('[Equipment] Failed to store proof PDF:', err);
          alert('Could not save PDF to browser storage.');
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const viewAttachedProofPdf = async (pdfKey: string) => {
    try {
      const pdfDataUrl = await loadPdfData(pdfKey);
      if (pdfDataUrl) {
        const win = window.open();
        if (win) {
          win.document.write(`<iframe src="${pdfDataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        }
      } else {
        alert('Could not retrieve attached proof PDF file.');
      }
    } catch (err) {
      console.error('[Equipment] Error viewing proof PDF:', err);
    }
  };

  // --- CONTENT-AWARE ACCURATE PRINT-CALIBRATED CHUNKING (SECTION VI PATTERN) ---
  // Calculates dynamic row heights to maximize paper space and eliminate clipping & empty gaps
  const pageChunks = useMemo<PageRow[][]>(() => {
    if (items.length === 0) return [[]];

    const getRowHeight = (row: EquipmentItemRow) => {
      const desc = row.description || '';
      const lines = Math.max(1, Math.ceil((desc.length || 1) / 45));
      return Math.max(38, 16 + lines * 13);
    };

    const rowHeights = items.map((it) => getRowHeight(it));
    const totalContentHeight = rowHeights.reduce((sum, h) => sum + h, 0);

    // Single-page limit: fits up to ~20 rows cleanly alongside full header + signatory block
    const SINGLE_PAGE_MAX_HEIGHT = 800;

    if (totalContentHeight <= SINGLE_PAGE_MAX_HEIGHT) {
      return [items.map((it, idx) => ({ item: it, index: idx }))];
    }

    const pages: PageRow[][] = [];
    let currentChunk: PageRow[] = [];
    let currentHeight = 0;
    let pageIdx = 0;

    for (let idx = 0; idx < items.length; idx++) {
      const rowItem = items[idx];
      const rHeight = rowHeights[idx];
      const isPage1 = pageIdx === 0;

      // Calculate remaining height of items from idx to end
      let remainingHeight = 0;
      for (let r = idx; r < items.length; r++) {
        remainingHeight += rowHeights[r];
      }

      // Page 1 Continuation Limit: 720px
      // Subsequent Pages Continuation Limit: 820px
      // Final Page Limit (with Signatory Block): 540px on Page 1, 620px on Page 2+
      const finalPageLimit = isPage1 ? 540 : 620;
      const continuationPageLimit = isPage1 ? 720 : 820;

      // If all remaining items fit in final page limit alongside the signatory block, keep on current page
      if (currentHeight + remainingHeight <= finalPageLimit) {
        currentChunk.push({ item: rowItem, index: idx });
        currentHeight += rHeight;
        continue;
      }

      // If adding this item exceeds the continuation limit, finalize current page and start next page
      if (currentHeight + rHeight > continuationPageLimit && currentChunk.length > 0) {
        pages.push(currentChunk);
        pageIdx++;
        currentChunk = [{ item: rowItem, index: idx }];
        currentHeight = rHeight;
      } else {
        currentChunk.push({ item: rowItem, index: idx });
        currentHeight += rHeight;
      }
    }

    if (currentChunk.length > 0) {
      pages.push(currentChunk);
    }

    return pages;
  }, [items]);

  const totalPages = pageChunks.length;

  // Compile full 8.5" x 13" Portrait Legal PDF (612pt x 936pt)
  const generateEquipmentPdfDataUrl = async (): Promise<string | null> => {
    const sheets = document.querySelectorAll('.equipment-portrait-sheet');
    if (sheets.length === 0) {
      console.error('[ContractorsMajorEquipment] No portrait sheet elements found');
      return null;
    }

    try {
      const pdfDoc = await PDFDocument.create();
      const legalPortrait: [number, number] = [612, 936];

      for (let i = 0; i < sheets.length; i++) {
        const sheetEl = sheets[i] as HTMLElement;

        const canvas = await html2canvas(sheetEl, {
          scale: 2.5,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 850,
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
            clonedDoc.querySelectorAll('textarea').forEach((ta) => {
              const div = clonedDoc.createElement('div');
              div.textContent = ta.value || '';
              div.className = ta.className;
              div.style.cssText = window.getComputedStyle(ta).cssText;
              div.style.whiteSpace = 'pre-wrap';
              div.style.display = 'block';
              div.style.border = 'none';
              div.style.background = 'transparent';
              div.style.color = '#000000';
              if (ta.parentNode) ta.parentNode.replaceChild(div, ta);
            });
            clonedDoc.querySelectorAll('select').forEach((sel) => {
              const div = clonedDoc.createElement('div');
              div.textContent = sel.options[sel.selectedIndex]?.text || sel.value || '';
              div.className = sel.className;
              div.style.cssText = window.getComputedStyle(sel).cssText;
              div.style.textAlign = 'center';
              div.style.width = '100%';
              div.style.display = 'block';
              div.style.border = 'none';
              div.style.background = 'transparent';
              div.style.color = '#000000';
              if (sel.parentNode) sel.parentNode.replaceChild(div, sel);
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
        const pngImage = await pdfDoc.embedPng(imgDataUrl);
        const page = pdfDoc.addPage(legalPortrait);

        page.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: 612,
          height: 936
        });
      }

      // Append any attached Equipment Proof PDFs
      for (const it of items) {
        if (it.attachedPdfId) {
          try {
            console.log(`[ContractorsMajorEquipment] Loading proof PDF for ${it.description} (key: ${it.attachedPdfId})`);
            const proofPdfData = await loadPdfData(it.attachedPdfId);
            if (proofPdfData) {
              let pdfBytes: Uint8Array;
              if (proofPdfData.startsWith('data:')) {
                const commaIdx = proofPdfData.indexOf(',');
                const base64Str = commaIdx !== -1 ? proofPdfData.substring(commaIdx + 1) : proofPdfData;
                const binaryStr = atob(base64Str);
                pdfBytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) {
                  pdfBytes[i] = binaryStr.charCodeAt(i);
                }
              } else {
                const binaryStr = atob(proofPdfData);
                pdfBytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) {
                  pdfBytes[i] = binaryStr.charCodeAt(i);
                }
              }
              const srcPdf = await PDFDocument.load(pdfBytes);
              const copiedPages = await pdfDoc.copyPages(srcPdf, srcPdf.getPageIndices());
              copiedPages.forEach(p => pdfDoc.addPage(p));
              console.log(`[ContractorsMajorEquipment] Successfully appended ${copiedPages.length} proof pages for ${it.description}`);
            } else {
              console.warn(`[ContractorsMajorEquipment] No PDF data found for key ${it.attachedPdfId}`);
            }
          } catch (err) {
            console.error(`[ContractorsMajorEquipment] Error appending proof PDF for ${it.description}:`, err);
          }
        }
      }

      const mergedPdfBytes = await pdfDoc.save();
      const rawBuffer = new ArrayBuffer(mergedPdfBytes.length);
      new Uint8Array(rawBuffer).set(mergedPdfBytes);
      const blob = new Blob([rawBuffer], { type: 'application/pdf' });

      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error('[ContractorsMajorEquipment] Fatal PDF generation error:', err);
      return null;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    setIsProcessing(true);
    try {
      const dataUrl = await generateEquipmentPdfDataUrl();
      if (dataUrl) {
        const cleanCode = item.code.replace(/[^a-zA-Z0-9]/g, '');
        const fileName = `${projectRefNo || 'PROJECT'}_Item_${cleanCode}_Contractors_Major_Equipment_${todayStr}.pdf`;

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
      console.error('[ContractorsMajorEquipment] Export error:', e);
      window.print();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAndComplete = async () => {
    setIsProcessing(true);
    try {
      const dataUrl = await generateEquipmentPdfDataUrl();
      onSaveAndComplete(dataUrl || undefined, item.name, projectRefNo, projectTitle);
      onClose();
    } catch (e) {
      console.error('[ContractorsMajorEquipment] Save Error:', e);
      onSaveAndComplete(undefined, item.name, projectRefNo, projectTitle);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePreviewPdf = async () => {
    setIsProcessing(true);
    try {
      const dataUrl = await generateEquipmentPdfDataUrl();
      if (dataUrl) {
        setPreviewPdfUrl(dataUrl);
      } else {
        alert('Could not generate PDF preview.');
      }
    } catch (err) {
      console.error('[ContractorsMajorEquipment] Preview generation error:', err);
      alert('Failed to generate PDF preview.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">

      {/* PRINT STYLESHEET OVERRIDE FOR 100% 8.5" x 13" PORTRAIT LEGAL FIT */}
      <style>{`
        @media print {
          @page {
            size: 8.5in 13in portrait;
            margin: 0mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, nav, aside, button, input[type="file"], select, .print\\:hidden, .no-print, .no-export {
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
          .equipment-portrait-sheet {
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            position: relative !important;
            width: 8.5in !important;
            min-height: 13in !important;
            max-width: 8.5in !important;
            margin: 0 auto !important;
            padding: 0.4in 0.45in !important;
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

      {/* Hidden File Input for Proof PDF Upload */}
      <input
        type="file"
        id="equipment-proof-input"
        accept=".pdf"
        onChange={handleProofPdfUpload}
        className="hidden"
      />

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-[98vw] xl:max-w-[1100px] overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col print:border-none print:shadow-none print:max-h-none print:bg-white">

        {/* Modal Top Header Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-30 shrink-0 print:hidden no-export">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Item {item.code} — List of Contractor's Major Equipment Units</span>
                <span className="px-2 py-0.5 bg-emerald-900/50 text-emerald-300 text-[10px] font-mono rounded border border-emerald-700/50 font-bold">
                  8.5" × 13" Portrait (Legal)
                </span>
                <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 text-[10px] font-mono rounded border border-blue-700/50 font-bold">
                  {items.length} Units • {totalPages} Page{totalPages !== 1 ? 's' : ''}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-serif">
                Official Statutory Technical Exhibit • Auto-Adjusting Multi-Page Matrix Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
              title="Print document directly in 8.5x13 Portrait"
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
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-6 bg-slate-950/60 flex flex-col items-center">

          {/* Project Bidding Selector & Document Metadata Bar */}
          <div className="w-full max-w-[816px] bg-slate-900 border border-slate-800 rounded-xl p-3 print:hidden no-export space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-300 font-mono">Project Scope:</span>
                {oppProjects.length > 0 ? (
                  <select
                    value={selectedOppId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedOppId(id);
                      const proj = oppProjects.find(p => p.id === id);
                      if (proj) {
                        setProjectRefNo(proj.refNo);
                        setProjectTitle(proj.title);
                        setProcuringEntity(proj.procuringEntity);
                        const solNo = (proj as any).solicitationNo || (proj as any).solicitationNumber;
                        if (solNo) setSolicitationNumber(solNo);
                        if (proj.dateTimeSubmitted) setDateTimeSubmitted(proj.dateTimeSubmitted);
                      }
                    }}
                    className="bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-blue-500 max-w-[320px] truncate cursor-pointer"
                  >
                    {oppProjects.map(p => (
                      <option key={p.id} value={p.id}>
                        [{p.refNo}] {p.title.substring(0, 38)}...
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-slate-400 italic">No opportunity projects registered</span>
                )}

                <button
                  type="button"
                  onClick={() => setShowMetadataInputs(!showMetadataInputs)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                >
                  {showMetadataInputs ? 'Hide Project Fields' : 'Edit Project Fields'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="Reset to official template defaults"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {showMetadataInputs && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/80 text-xs">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Project Ref No</label>
                  <input
                    type="text"
                    value={projectRefNo}
                    onChange={(e) => setProjectRefNo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Project Title</label>
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Procuring Entity</label>
                  <input
                    type="text"
                    value={procuringEntity}
                    onChange={(e) => setProcuringEntity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* AUTO-PAGINATED 8.5" x 13" PORTRAIT LEGAL PAGES */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-8 flex flex-col items-center">
            {pageChunks.map((chunk, pageIdx) => {
              const isFirstPage = pageIdx === 0;
              const isLastPage = pageIdx === totalPages - 1;

              return (
                <div key={`page-${pageIdx}`} className="space-y-2 flex flex-col items-center">

                  {/* Page Indicator Tag (Screen Only) */}
                  <div className="w-full max-w-[816px] flex items-center justify-between text-xs font-mono text-slate-400 print:hidden no-export px-1">
                    <span className="font-bold text-slate-300">
                      Page {pageIdx + 1} of {totalPages} ({chunk.length} Units)
                    </span>
                  </div>

                  {/* 8.5" x 13" PORTRAIT SHEET (816px x 1248px) - SINGLE PRIMARY BORDER FRAME */}
                  <div
                    className="equipment-portrait-sheet single-page-paper portrait aspect-[8.5/13] bg-white text-slate-950 font-serif p-6 border-2 border-slate-900 shadow-2xl w-[816px] min-h-[1248px] h-auto text-left relative flex flex-col justify-start print:m-0 print:border-none print:shadow-none box-border"
                  >
                    {/* Top Section: Header */}
                    <div className="space-y-2 shrink-0">

                      {/* Page 1 Full Header vs Page 2+ Continuation Header */}
                      {isFirstPage ? (
                        <>
                          {/* Project Metadata Top Banner */}
                          <div className="border-b-2 border-slate-900 pb-1.5 space-y-0.5 font-mono text-[9px] text-slate-950 font-bold shrink-0">
                            <div className="flex items-center justify-between">
                              <span>PROJECT REF. NO: <strong className="text-blue-950">{projectRefNo}</strong></span>
                              <span>DATE: <strong>{dateTimeSubmitted}</strong></span>
                            </div>
                            <div className="truncate">
                              <span>NAME OF PROJECT: <strong className="text-slate-950">{projectTitle}</strong></span>
                            </div>
                            <div className="truncate">
                              <span>PROCURING ENTITY: <strong className="text-slate-950">{procuringEntity}</strong></span>
                            </div>
                          </div>

                          {/* Centered Main Document Title */}
                          <div className="text-center space-y-0.5 py-1.5 shrink-0">
                            <input
                              type="text"
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              className="w-full text-center font-bold text-sm text-slate-950 uppercase border-b border-dashed border-slate-400 focus:outline-none focus:bg-blue-50 font-serif tracking-wide truncate"
                            />
                            <h1 className="text-[11.5px] font-bold uppercase tracking-wider text-slate-950 font-serif leading-tight">
                              LIST OF CONTRACTOR'S MAJOR EQUIPMENT UNITS (OWNED, LEASED AND/OR UNDER PURCHASE)
                            </h1>
                            <p className="text-[8px] font-serif uppercase tracking-wide text-slate-700">
                              Proposed to be Specifically Assigned to the Project pursuant to BDS Clause 10.5
                            </p>
                          </div>
                        </>
                      ) : (
                        /* Page 2+ Continuation Header */
                        <div className="border-b-2 border-slate-900 pb-1.5 flex items-center justify-between font-mono text-[9px] font-bold text-slate-950 shrink-0 mb-1">
                          <div>COMPANY: <strong className="uppercase text-blue-950">{companyName}</strong></div>
                          <div className="font-serif text-[10.5px] font-bold uppercase tracking-wider text-slate-950">
                            LIST OF CONTRACTOR'S MAJOR EQUIPMENT UNITS (CONTINUATION)
                          </div>
                          <div>PAGE {pageIdx + 1} OF {totalPages}</div>
                        </div>
                      )}

                      {/* EQUIPMENT TABLE (PORTRAIT FIT) */}
                      <div className="overflow-hidden border-2 border-slate-900 rounded-lg">
                        <table className="w-full border-collapse text-[9.5px]">
                          <thead>
                            <tr className="bg-slate-900 text-white font-mono font-bold text-center border-b-2 border-slate-900">
                              <th className="py-1.5 px-1 border-r border-slate-700 w-8">#</th>
                              <th className="py-1.5 px-1.5 border-r border-slate-700 w-[300px]">Equipment Description</th>
                              <th className="py-1.5 px-1.5 border-r border-slate-700 w-[100px]">Capacity / Model / Serial No.</th>
                              <th className="py-1.5 px-1.5 border-r border-slate-700 w-[60px]">Status</th>
                              <th className="py-1.5 px-1.5 border-r border-slate-700 w-[100px]">Proof of Ownership / Reference</th>
                              <th className="py-1.5 px-1 w-8 print:hidden no-export">Act</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-300">
                            {chunk.map(({ item: rowItem, index: itemIdx }) => {
                              return (
                                <tr key={rowItem.id} className="hover:bg-slate-50 transition">
                                  <td className="py-1 px-1 border-r border-slate-300 text-center font-mono font-bold text-slate-950 text-[9px]">
                                    {itemIdx + 1}
                                  </td>

                                  {/* Equipment Description */}
                                  <td className="py-1 px-1.5 border-r border-slate-300 font-serif">
                                    <textarea
                                      rows={1}
                                      value={rowItem.description}
                                      onChange={(e) => handleUpdateItem(rowItem.id, 'description', e.target.value)}
                                      className="w-full bg-transparent border-none text-slate-950 font-bold focus:outline-none focus:bg-blue-50 font-serif resize-none text-[9.5px] py-0 leading-tight"
                                    />
                                  </td>

                                  {/* Capacity / Model / Serial No. */}
                                  <td className="py-1 px-1.5 border-r border-slate-300 font-mono text-[8.5px]">
                                    <input
                                      type="text"
                                      value={rowItem.modelCapacity}
                                      onChange={(e) => handleUpdateItem(rowItem.id, 'modelCapacity', e.target.value)}
                                      className="w-full bg-transparent border-none text-slate-950 font-bold focus:outline-none focus:bg-blue-50 font-mono text-[8.5px] py-0 leading-tight"
                                    />
                                    <input
                                      type="text"
                                      value={rowItem.serialNo}
                                      onChange={(e) => handleUpdateItem(rowItem.id, 'serialNo', e.target.value)}
                                      className="w-full bg-transparent border-none text-slate-600 focus:outline-none focus:bg-blue-50 font-mono text-[8px] py-0 leading-tight"
                                    />
                                  </td>

                                  {/* Status (Owned / Leased / Under Purchase) */}
                                  <td className="py-1 px-1 border-r border-slate-300 text-center align-middle">
                                    <select
                                      value={rowItem.status}
                                      onChange={(e) => handleUpdateItem(rowItem.id, 'status', e.target.value as any)}
                                      className="w-full bg-transparent border-0 border-none outline-none text-center font-bold font-serif text-[9px] text-slate-950 focus:bg-blue-50 cursor-pointer appearance-none py-0.5 tracking-wide"
                                    >
                                      <option value="Owned">Owned</option>
                                      <option value="Leased">Leased</option>
                                      <option value="Under Purchase">Under Purchase</option>
                                    </select>
                                  </td>

                                  {/* Proof Document / PDF Attachment */}
                                  <td className="py-1 px-1.5 border-r border-slate-300 font-mono text-[8px]">
                                    <input
                                      type="text"
                                      value={rowItem.proofRef}
                                      onChange={(e) => handleUpdateItem(rowItem.id, 'proofRef', e.target.value)}
                                      className="w-full bg-transparent border-none text-slate-950 focus:outline-none focus:bg-blue-50 font-mono text-[8px] py-0"
                                    />
                                    <div className="mt-0.5 flex items-center gap-1 print:hidden no-export">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveUploadTarget(rowItem.id);
                                          document.getElementById('equipment-proof-input')?.click();
                                        }}
                                        className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded text-[7.5px] font-bold flex items-center gap-0.5 transition cursor-pointer"
                                      >
                                        <Upload className="w-2.5 h-2.5" />
                                        <span>{rowItem.attachedPdfName ? 'Replace PDF' : 'Attach PDF'}</span>
                                      </button>

                                      {rowItem.attachedPdfId && (
                                        <div className="flex items-center gap-0.5">
                                          <button
                                            type="button"
                                            onClick={() => viewAttachedProofPdf(rowItem.attachedPdfId!)}
                                            className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded text-[7.5px] font-bold flex items-center gap-0.5 transition cursor-pointer"
                                            title={`View attached proof PDF: ${rowItem.attachedPdfName}`}
                                          >
                                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                            <span className="truncate max-w-[90px]">{rowItem.attachedPdfName || 'Attached PDF'}</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (confirm(`Remove attached PDF "${rowItem.attachedPdfName}"?`)) {
                                                const updated = items.map(it =>
                                                  it.id === rowItem.id
                                                    ? { ...it, attachedPdfId: undefined, attachedPdfName: undefined }
                                                    : it
                                                );
                                                saveItems(updated);
                                              }
                                            }}
                                            className="p-0.5 text-red-500 hover:text-red-700 rounded hover:bg-red-50 text-[8px] font-bold cursor-pointer"
                                            title="Remove attached PDF"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  {/* Action Column */}
                                  <td className="py-1 px-1 text-center print:hidden no-export">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveEquipmentRow(rowItem.id)}
                                      className="p-0.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition cursor-pointer"
                                      title="Remove Equipment Row"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}

                            {/* ─── ADD EQUIPMENT ROW (ALWAYS DIRECTLY AFTER LAST ITEM ROW) ─── */}
                            {isLastPage && (
                              <tr className="bg-slate-50 hover:bg-blue-50/60 transition print:hidden no-export border-t-2 border-dashed border-blue-400">
                                <td colSpan={6} className="py-2 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={handleAddNewEquipmentRow}
                                    className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold shadow transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add Equipment Row</span>
                                  </button>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Footer Section: Signatory Block strictly on the Last Page (DIRECTLY UNDER LAST ITEM) */}
                    {isLastPage && (
                      <div className="mt-8 pt-4 border-t-2 border-slate-900 flex items-end justify-between px-2 pb-2 bg-white shrink-0">
                        {/* Lower-Left: Official QR Verification Code */}
                        <div className="flex items-center gap-2.5">
                          <DocumentQrCode
                            details={{
                              companyName: companyName,
                              documentName: `Item ${item.code} — EQUIPMENT LIST (Page ${pageIdx + 1} of ${totalPages})`,
                              documentNumber: `EXHIBIT-${item.code.replace(/[^a-zA-Z0-9]/g, '')}-${projectRefNo || '2026-901283'}`,
                              projectTitle: projectTitle,
                              projectRefNo: projectRefNo,
                              procuringEntity: procuringEntity,
                              dateTimeSubmitted: dateTimeSubmitted || todayStr,
                              documentCategory: 'Technical Eligibility',
                              generatedBy: companyName
                            }}
                            size={42}
                            showCaption={false}
                          />
                          <div className="text-[8px] font-mono leading-tight text-slate-700 space-y-0.5">
                            <p className="font-bold text-slate-950 uppercase truncate max-w-[240px]">{companyName}</p>
                            <p className="truncate max-w-[240px]">PROJECT: {projectTitle}</p>
                            <p className="truncate max-w-[240px]">REF: {projectRefNo} • PAGE {pageIdx + 1} OF {totalPages}</p>
                          </div>
                        </div>

                        {/* Middle Action: Save & Attach to Vault (Screen Only, Hidden in Print & PDF Export) */}
                        <div className="flex flex-col items-center justify-center px-2 print:hidden no-export my-auto">
                          <button
                            type="button"
                            onClick={handleSaveAndComplete}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                            <span>{isProcessing ? 'Saving...' : 'Save & Attach to Vault'}</span>
                          </button>
                          <span className="text-[9px] text-slate-400 font-sans mt-0.5">Saves directly to Document Vault</span>
                        </div>

                        {/* Lower-Right: Authorized Signatory Block */}
                        <div className="text-center font-serif text-slate-950 min-w-[240px] pb-1 space-y-0.5">
                          <div className="border-b border-slate-900 pb-1 mb-1 max-w-[220px] mx-auto">
                            <input
                              type="text"
                              value={signatoryName}
                              onChange={(e) => setSignatoryName(e.target.value)}
                              className="w-full bg-transparent border-none p-0 text-center font-bold text-[10.5px] uppercase tracking-wide focus:outline-none focus:bg-blue-50 font-serif text-slate-950"
                              placeholder="NAME OF AUTHORIZED OFFICIAL"
                            />
                          </div>
                          <div className="text-[7.5px] text-slate-800 italic mb-0.5">
                            Name and Signature of Authorized Official
                          </div>
                          <input
                            type="text"
                            value={signatoryTitle}
                            onChange={(e) => setSignatoryTitle(e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[8px] focus:outline-none focus:bg-blue-50 font-serif text-slate-800 block"
                            placeholder="Title / Designation"
                          />
                          <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center font-bold text-[8.5px] uppercase focus:outline-none focus:bg-blue-50 font-serif text-slate-950 block"
                            placeholder="Company Name"
                          />
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

      {/* PDF Preview Modal */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-scaleIn">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold text-white">List of Major Equipment Units — PDF Preview</span>
              </div>
              <button
                onClick={() => setPreviewPdfUrl(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 bg-slate-950 p-2 relative flex flex-col">
              <object
                data={`${previewPdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                type="application/pdf"
                className="w-full h-full rounded-xl border border-slate-800 bg-slate-900"
              >
                <iframe
                  src={`${previewPdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                  className="w-full h-full rounded-xl border border-slate-800 bg-slate-900"
                  title="Equipment PDF Preview"
                />
              </object>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ContractorsMajorEquipment;

import React, { useState, useEffect } from 'react';
import { Tenant } from '../../../types';
import { PDFDocument } from 'pdf-lib';
import html2canvas from 'html2canvas';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import DocumentQrCode from '../../common/DocumentQrCode';
import VaultErrorBoundary from '../../common/VaultErrorBoundary';
import {
  X,
  Printer,
  Download,
  Plus,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Lock
} from 'lucide-react';

export interface WarrantyLotItem {
  id: string;
  lotNumber: string;
  warranty: string;
}

export interface AfterSaleModalProps {
  item?: { id: string; code: string; name: string };
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  solicitationNumber?: string;
  dateTimeSubmitted?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose?: () => void;
}

const DEFAULT_WARRANTY_LOTS: WarrantyLotItem[] = [
  { id: 'lot-1', lotNumber: 'Lot 1', warranty: '2 Years Warranty for all Parts and Labor' },
  { id: 'lot-2', lotNumber: 'Lot 2', warranty: '2 Years 24/7 Dedicated Technical Customer Support' },
  { id: 'lot-3', lotNumber: 'Lot 3', warranty: '2 Years Comprehensive Workmanship & Preventive Maintenance' }
];

export const AfterSaleModalContent: React.FC<AfterSaleModalProps> = ({
  item,
  tenant,
  activeProjectRefNo = '',
  activeProjectTitle = '',
  activeProcuringEntity = '',
  solicitationNumber: propSolicitationNumber = '',
  dateTimeSubmitted: propDateTimeSubmitted = '',
  onSaveAndComplete,
  onClose
}) => {
  const todayStr = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  // Opportunity Projects Dropdown State
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  // 100% Synchronized Project Information Fields
  const [companyName, setCompanyName] = useState<string>(tenant?.companyName || '');
  const [projectTitle, setProjectTitle] = useState<string>(activeProjectTitle || '');
  const [projectRefNo, setProjectRefNo] = useState<string>(activeProjectRefNo || '');
  const [solicitationNumber, setSolicitationNumber] = useState<string>(propSolicitationNumber || '');
  const [dateTimeSubmitted, setDateTimeSubmitted] = useState<string>(propDateTimeSubmitted || todayStr);

  const projectScopeKey = (projectRefNo || selectedOppId || activeProjectRefNo || 'default').replace(/[^a-zA-Z0-9]/g, '_');

  // Addressee / BAC Information
  const [procuringEntity, setProcuringEntity] = useState<string>(activeProcuringEntity || '');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [salutationEntity, setSalutationEntity] = useState<string>(activeProcuringEntity || '');

  // Warranty Lots List - Clean Slate []
  const [lots, setLots] = useState<WarrantyLotItem[]>([]);

  // Signatory Information
  const [signatoryName, setSignatoryName] = useState<string>(tenant?.authorizedSignatory?.name || '');
  const [signatoryTitle, setSignatoryTitle] = useState<string>(tenant?.authorizedSignatory?.title || '');

  // UI States
  const [showMetadataInputs, setShowMetadataInputs] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load Opportunity Projects & Synchronize Data 100%
  useEffect(() => {
    const tenantId = tenant?.id || 'default';
    const list = getOpportunityProjects(tenantId);
    setOppProjects(list);

    if (tenant?.companyName) setCompanyName(tenant.companyName);
    if (tenant?.authorizedSignatory?.name) setSignatoryName(tenant.authorizedSignatory.name);
    if (tenant?.authorizedSignatory?.title) setSignatoryTitle(tenant.authorizedSignatory.title);

    // Check LocalStorage scoped to tenant and project
    const storageKey = `bidocs_aftersale_${tenantId}_${projectScopeKey}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.projectTitle) setProjectTitle(parsed.projectTitle);
        if (parsed.projectRefNo) setProjectRefNo(parsed.projectRefNo);
        if (parsed.solicitationNumber) setSolicitationNumber(parsed.solicitationNumber);
        if (parsed.dateTimeSubmitted) setDateTimeSubmitted(parsed.dateTimeSubmitted);
        if (parsed.procuringEntity) setProcuringEntity(parsed.procuringEntity);
        if (parsed.deliveryAddress) setDeliveryAddress(parsed.deliveryAddress);
        if (parsed.salutationEntity) setSalutationEntity(parsed.salutationEntity);
        if (Array.isArray(parsed.lots) && parsed.lots.length > 0) setLots(parsed.lots);
        else setLots([]);
        if (parsed.signatoryName) setSignatoryName(parsed.signatoryName);
        if (parsed.signatoryTitle) setSignatoryTitle(parsed.signatoryTitle);
        return;
      }
    } catch (e) {
      console.error('[aftersale] Storage load error:', e);
    }
    setLots([]);

    // Auto-fill from active opportunity project if available
    if (list.length > 0 && !selectedOppId) {
      const match = activeProjectRefNo ? list.find(p => p.refNo === activeProjectRefNo) : null;
      const target = match || (activeProjectRefNo ? null : list[0]);
      if (target) {
        setSelectedOppId(target.id);
        setProjectTitle(target.title);
        setProjectRefNo(target.refNo);
        setProcuringEntity(target.procuringEntity);
        setSalutationEntity(target.procuringEntity);
        const sol = (target as any).solicitationNo || (target as any).solicitationNumber;
        if (sol) setSolicitationNumber(sol);
        if (target.dateTimeSubmitted) setDateTimeSubmitted(target.dateTimeSubmitted);
        const deliv = (target as any).deliveryAddress || (target as any).location || (target as any).provinceAddress;
        if (deliv) setDeliveryAddress(deliv);
      }
    }
  }, [tenant, activeProjectRefNo, projectScopeKey]);

  // Persist State
  const saveState = (updatedLots?: WarrantyLotItem[]) => {
    const tenantId = tenant?.id || 'default';
    const storageKey = `bidocs_aftersale_${tenantId}_${projectScopeKey}`;
    const payload = {
      companyName,
      projectTitle,
      projectRefNo,
      solicitationNumber,
      dateTimeSubmitted,
      procuringEntity,
      deliveryAddress,
      salutationEntity,
      lots: updatedLots || lots,
      signatoryName,
      signatoryTitle
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error('[aftersale] Storage save error:', e);
    }
  };

  const handleAddLot = () => {
    const newLot: WarrantyLotItem = {
      id: `lot-${Date.now()}`,
      lotNumber: `Lot ${lots.length + 1}`,
      warranty: '2 Years Warranty for Parts and Service'
    };
    const nextLots = [...lots, newLot];
    setLots(nextLots);
    saveState(nextLots);
  };

  const handleRemoveLot = (id: string) => {
    if (lots.length <= 1) {
      alert('At least 1 warranty lot row must be maintained.');
      return;
    }
    const nextLots = lots.filter(l => l.id !== id);
    setLots(nextLots);
    saveState(nextLots);
  };

  const handleLotChange = (id: string, field: 'lotNumber' | 'warranty', val: string) => {
    const nextLots = lots.map(l => l.id === id ? { ...l, [field]: val } : l);
    setLots(nextLots);
    saveState(nextLots);
  };

  const handleResetToDefaults = () => {
    if (confirm('Reset after-sales warranty terms to official template defaults?')) {
      setLots(DEFAULT_WARRANTY_LOTS);
      saveState(DEFAULT_WARRANTY_LOTS);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Compile High-Precision 8.5" x 13" Legal Portrait Vector PDF
  const generateAfterSalesPdf = async (): Promise<string | null> => {
    const sheetEl = document.getElementById('aftersale-paper-container');
    if (!sheetEl) return null;

    try {
      const pdfDoc = await PDFDocument.create();
      const legalPortrait: [number, number] = [612, 936];

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
            span.style.width = 'auto';
            span.style.maxWidth = '100%';
            span.style.whiteSpace = 'normal';
            span.style.overflow = 'visible';
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
      console.error('[aftersale] PDF Generation Error:', err);
      return null;
    }
  };

  const handleExportPdf = async () => {
    setIsSaving(true);
    try {
      const dataUrl = await generateAfterSalesPdf();
      if (dataUrl) {
        const fileName = `${projectRefNo || 'PROJECT'}_After_Sales_Services_${todayStr}.pdf`;
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.print();
      }
    } catch (err) {
      console.error('[aftersale] Export Error:', err);
      window.print();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    saveState();
    setIsSaving(true);
    try {
      const dataUrl = await generateAfterSalesPdf();
      if (onSaveAndComplete) {
        onSaveAndComplete(dataUrl || undefined, item?.name || 'After Sales Services', projectRefNo, projectTitle);
      }
      if (onClose) onClose();
    } catch (err) {
      console.error('[aftersale] Save Error:', err);
      if (onSaveAndComplete) {
        onSaveAndComplete(undefined, item?.name || 'After Sales Services', projectRefNo, projectTitle);
      }
      if (onClose) onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      
      {/* PRINT STYLESHEET OVERRIDE FOR 100% 8.5" x 13" LEGAL PORTRAIT */}
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
          .single-page-paper {
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            position: relative !important;
            width: 8.5in !important;
            min-height: 13in !important;
            max-width: 8.5in !important;
            margin: 0 auto !important;
            padding: 0.45in 0.5in !important;
            border: 2px solid #000000 !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-[98vw] xl:max-w-[1050px] overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col print:border-none print:shadow-none print:max-h-none print:bg-white">

        {/* Top Header Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-30 shrink-0 print:hidden no-export">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>After Sales Services & Warranty Undertaking</span>
                <span className="px-2 py-0.5 bg-emerald-900/50 text-emerald-300 text-[10px] font-mono rounded border border-emerald-700/50 font-bold">
                  8.5" × 13" Portrait (Legal)
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-serif">
                Official Technical Bidding Exhibit • 100% Synchronized Project Information
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow flex items-center gap-1.5 cursor-pointer"
              title="Download official PDF file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Generating...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow flex items-center gap-1.5 cursor-pointer"
              title="Print document"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition shadow flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>{isSaving ? 'Saving...' : 'Save & Attach to Vault'}</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
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
                        setProjectTitle(proj.title);
                        setProjectRefNo(proj.refNo);
                        setProcuringEntity(proj.procuringEntity);
                        setSalutationEntity(proj.procuringEntity);
                        const solNo = (proj as any).solicitationNo || (proj as any).solicitationNumber;
                        if (solNo) setSolicitationNumber(solNo);
                        if (proj.dateTimeSubmitted) setDateTimeSubmitted(proj.dateTimeSubmitted);
                        const deliv = (proj as any).deliveryAddress || (proj as any).location || (proj as any).provinceAddress;
                        if (deliv) setDeliveryAddress(deliv);
                        saveState();
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

                {(activeProjectRefNo || (selectedOppId && selectedOppId !== '')) && (
                  <span className="text-[10px] text-amber-400 font-bold font-mono flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>Project Locked</span>
                  </span>
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
                  title="Reset to template defaults"
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
                    onChange={(e) => { setProjectRefNo(e.target.value); saveState(); }}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Solicitation No</label>
                  <input
                    type="text"
                    value={solicitationNumber}
                    onChange={(e) => { setSolicitationNumber(e.target.value); saveState(); }}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Date & Time Submitted</label>
                  <input
                    type="text"
                    value={dateTimeSubmitted}
                    onChange={(e) => { setDateTimeSubmitted(e.target.value); saveState(); }}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Procuring Entity</label>
                  <input
                    type="text"
                    value={procuringEntity}
                    onChange={(e) => {
                      setProcuringEntity(e.target.value);
                      setSalutationEntity(e.target.value);
                      saveState();
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Delivery Address</label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => { setDeliveryAddress(e.target.value); saveState(); }}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 8.5" x 13" LEGAL PORTRAIT PAPER SHEET (816px x 1248px) */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div
            id="aftersale-paper-container"
            className="single-page-paper portrait aspect-[8.5/13] bg-white text-slate-950 font-serif p-8 border-2 border-slate-900 shadow-2xl w-[816px] min-h-[1248px] h-auto text-left relative flex flex-col justify-start print:m-0 print:border-none print:shadow-none box-border"
          >

            {/* 1. Header Information (Centered Company Name & Project Metadata) */}
            <div className="border-b-2 border-slate-900 pb-3 shrink-0 space-y-2">
              {/* Centered Company Name */}
              <div className="text-center py-1">
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => { setCompanyName(e.target.value); saveState(); }}
                  className="w-full bg-transparent border-b border-dashed border-slate-300 text-center font-serif font-bold text-sm text-slate-950 uppercase tracking-wider focus:outline-none focus:bg-blue-50"
                  placeholder="COMPANY NAME"
                />
              </div>

              {/* Project Metadata Section */}
              <div className="space-y-1 font-serif text-[11px] text-slate-950 leading-tight">
                <div className="flex items-start gap-1">
                  <span className="font-bold shrink-0">PROJECT TITLE:</span>
                  <textarea
                    rows={2}
                    value={projectTitle}
                    onChange={(e) => { setProjectTitle(e.target.value); saveState(); }}
                    className="w-full bg-transparent border-b border-dashed border-slate-300 font-serif font-bold text-[11px] uppercase focus:outline-none focus:bg-blue-50 resize-none leading-snug break-words"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="font-bold shrink-0">PROJECT REFERENCE NUMBER:</span>
                  <input
                    type="text"
                    value={projectRefNo}
                    onChange={(e) => { setProjectRefNo(e.target.value); saveState(); }}
                    className="w-full bg-transparent border-b border-dashed border-slate-300 font-mono font-semibold text-[10.5px] focus:outline-none focus:bg-blue-50 text-blue-950"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="font-bold shrink-0">SOLICITATION NO.:</span>
                  <input
                    type="text"
                    value={solicitationNumber}
                    onChange={(e) => { setSolicitationNumber(e.target.value); saveState(); }}
                    className="w-full bg-transparent border-b border-dashed border-slate-300 font-mono font-semibold text-[10.5px] focus:outline-none focus:bg-blue-50 text-slate-900"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="font-bold shrink-0">DATE OF SUBMISSION AND TIME:</span>
                  <input
                    type="text"
                    value={dateTimeSubmitted}
                    onChange={(e) => { setDateTimeSubmitted(e.target.value); saveState(); }}
                    className="w-full bg-transparent border-b border-dashed border-slate-300 font-mono font-semibold text-[10.5px] focus:outline-none focus:bg-blue-50 text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* 2. Main Centered Document Title */}
            <div className="text-center py-5 shrink-0">
              <h1 className="text-base sm:text-lg font-bold font-serif uppercase tracking-wider text-slate-950">
                AFTER SALES SERVICES
              </h1>
            </div>

            {/* 3. Recipient Addressee Block (Bids & Awards Committee, Procuring Entity, Delivery Address) */}
            <div className="space-y-0.5 font-serif text-[11px] text-slate-950 leading-snug shrink-0">
              <div className="font-bold">Bids and Awards Committee</div>
              <div>
                <input
                  type="text"
                  value={procuringEntity}
                  onChange={(e) => {
                    setProcuringEntity(e.target.value);
                    saveState();
                  }}
                  className="w-full bg-transparent border-none font-serif text-[11px] font-bold text-slate-950 focus:outline-none focus:bg-blue-50 p-0"
                  placeholder="Procuring Entity / Project Entity"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => { setDeliveryAddress(e.target.value); saveState(); }}
                  className="w-full bg-transparent border-none font-serif text-[11px] text-slate-800 focus:outline-none focus:bg-blue-50 p-0"
                  placeholder="Delivery Address"
                />
              </div>
            </div>

            {/* 4. Salutation (Dear [Procuring Entity / Recipient]:) */}
            <div className="font-serif text-[11px] text-slate-950 pt-4 pb-2 shrink-0">
              <div className="flex flex-wrap items-baseline gap-1">
                <span className="font-serif font-bold text-slate-950 shrink-0">Dear</span>
                <input
                  type="text"
                  value={salutationEntity || procuringEntity || "Sir / Madam"}
                  onChange={(e) => { setSalutationEntity(e.target.value); saveState(); }}
                  className="flex-1 min-w-[280px] w-auto max-w-full bg-transparent border-b border-dashed border-slate-400 font-serif font-bold text-[11px] text-slate-950 focus:outline-none focus:bg-blue-50 px-1 py-0.5"
                  placeholder="Recipient Name / Bids and Awards Committee / Procuring Entity"
                />
                <span className="font-serif font-bold text-slate-950 shrink-0">:</span>
              </div>
            </div>

            {/* 5. Body Paragraphs */}
            <div className="font-serif text-[11px] leading-relaxed text-slate-950 text-justify space-y-3 shrink-0">
              <p>
                In connection with the supply and delivery of{' '}
                <strong className="uppercase">{projectTitle}</strong> under Project Reference No.{' '}
                <strong className="font-mono">{projectRefNo}</strong>
                {solicitationNumber ? ` (Solicitation No. ${solicitationNumber})` : ''}, we hereby guaranty that the goods to be delivered are in quality or similar to the technical specification or as approved sample.
              </p>
              <p>
                That we are giving the end-user the full opportunity to inspect, test, and verify every item upon delivery at{' '}
                <strong>{deliveryAddress || 'the designated delivery address'}</strong> and return for immediate replacement if found defective through company or manufacturing defects. That we provide the following after-sales warranty terms:
              </p>
            </div>

            {/* 6. Warranty Lots Table */}
            <div className="pt-4 pb-2 shrink-0">
              <div className="overflow-hidden border-2 border-slate-900 rounded-lg">
                <table className="w-full border-collapse text-[10.5px] font-serif text-slate-950">
                  <thead>
                    <tr className="border-b-2 border-slate-900 bg-slate-900 text-white font-bold font-mono text-center">
                      <th className="py-1.5 px-3 border-r border-slate-700 w-28">Lot Number</th>
                      <th className="py-1.5 px-3 border-r border-slate-700">Warranty Coverage & After-Sales Commitments</th>
                      <th className="py-1.5 px-2 w-12 print:hidden no-export">Act</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {lots.map((lot) => (
                      <tr key={lot.id} className="hover:bg-slate-50 transition">
                        <td className="py-1.5 px-3 border-r border-slate-300 text-center font-mono font-bold text-slate-950 text-[10px]">
                          <input
                            type="text"
                            value={lot.lotNumber}
                            onChange={(e) => handleLotChange(lot.id, 'lotNumber', e.target.value)}
                            className="w-full bg-transparent border-none text-center font-mono font-bold text-[10px] text-slate-950 focus:outline-none focus:bg-blue-50 p-0"
                          />
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-300 font-serif">
                          <input
                            type="text"
                            value={lot.warranty}
                            onChange={(e) => handleLotChange(lot.id, 'warranty', e.target.value)}
                            className="w-full bg-transparent border-none font-serif text-[10.5px] text-slate-950 font-semibold focus:outline-none focus:bg-blue-50 p-0"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center print:hidden no-export">
                          <button
                            type="button"
                            onClick={() => handleRemoveLot(lot.id)}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition cursor-pointer"
                            title="Delete Lot Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Lot Button (Screen Only) */}
              <div className="pt-2 flex justify-start print:hidden no-export">
                <button
                  type="button"
                  onClick={handleAddLot}
                  className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Warranty Lot</span>
                </button>
              </div>
            </div>

            {/* 7. Signatory Block & Verification QR Code Footer */}
            <div className="mt-8 pt-4 border-t-2 border-slate-900 flex items-end justify-between px-1 pb-1 bg-white shrink-0">
              
              {/* Lower Left: Official QR Verification Code */}
              <div className="flex items-center gap-2">
                <DocumentQrCode
                  details={{
                    companyName: companyName,
                    documentName: 'AFTER SALES SERVICES & WARRANTY UNDERTAKING',
                    documentNumber: `EXHIBIT-AFTERSALE-${projectRefNo || '2026-901283'}`,
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
                <div className="text-[7.5px] font-mono leading-tight text-slate-700">
                  <p className="font-bold text-slate-950 uppercase truncate max-w-[240px]">{companyName}</p>
                  <p className="truncate max-w-[240px]">PROJECT: {projectTitle}</p>
                  <p className="truncate max-w-[240px]">REF: {projectRefNo} • {dateTimeSubmitted}</p>
                </div>
              </div>

              {/* Middle Action: Save & Attach to Vault (Screen Only) */}
              <div className="flex flex-col items-center justify-center px-2 print:hidden no-export my-auto">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>{isSaving ? 'Saving...' : 'Save & Attach to Vault'}</span>
                </button>
                <span className="text-[9px] text-slate-400 font-sans mt-0.5">Saves directly to Document Vault</span>
              </div>

              {/* Lower Right: Authorized Signatory Block */}
              <div className="text-center font-serif text-slate-950 min-w-[240px] pb-0.5">
                <div className="border-b border-slate-900 pb-0.5 mb-0.5 max-w-[220px] mx-auto">
                  <input
                    type="text"
                    value={signatoryName}
                    onChange={(e) => { setSignatoryName(e.target.value); saveState(); }}
                    className="w-full bg-transparent border-none p-0 text-center font-bold text-[11px] uppercase tracking-wide focus:outline-none focus:bg-blue-50 font-serif text-slate-950"
                    placeholder="NAME OF AUTHORIZED OFFICIAL"
                  />
                </div>
                <div className="text-[8px] text-slate-800 italic mb-0.5">
                  Name and Signature of Authorized Official
                </div>
                <input
                  type="text"
                  value={signatoryTitle}
                  onChange={(e) => { setSignatoryTitle(e.target.value); saveState(); }}
                  className="w-full bg-transparent border-none p-0 text-center text-[8.5px] focus:outline-none focus:bg-blue-50 font-serif text-slate-800 block"
                  placeholder="Title / Designation"
                />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => { setCompanyName(e.target.value); saveState(); }}
                  className="w-full bg-transparent border-none p-0 text-center font-bold text-[9px] uppercase focus:outline-none focus:bg-blue-50 font-serif text-slate-950 block"
                  placeholder="Company Name"
                />
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export const AfterSaleModal: React.FC<AfterSaleModalProps> = (props) => (
  <VaultErrorBoundary fallbackTitle="After Sales Services Modal">
    <AfterSaleModalContent {...props} />
  </VaultErrorBoundary>
);

export default AfterSaleModal;

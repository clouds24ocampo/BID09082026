import React, { useState, useEffect, useRef } from 'react';
import { Tenant } from '../../../types';
import { PDFDocument } from 'pdf-lib';
import html2canvas from 'html2canvas';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import { savePdfData, loadPdfData } from '../../../utils/vaultIndexedDB';
import VaultErrorBoundary from '../../common/VaultErrorBoundary';
import {
  X,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  Camera,
  Upload,
  FileText,
  Briefcase
} from 'lucide-react';

export interface ProgressPhotoItem {
  id: string;
  stage: 'BEFORE' | 'DURING' | 'AFTER';
  caption: string;
  station: string;
  dateTaken: string;
  imageDataUrl: string;
}

export interface ProgressphotoModalProps {
  item?: { id: string; code: string; name: string };
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  procuringEntityAddress?: string;
  procuringEntityContactPerson?: string;
  headOfProcuringEntity?: string;
  headOfProcuringEntityPosition?: string;
  solicitationNumber?: string;
  contractAmount?: number;
  projectLocation?: string;
  dateTimeSubmitted?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose?: () => void;
}

export const ProgressphotoModalContent: React.FC<ProgressphotoModalProps> = ({
  item,
  tenant,
  activeProjectRefNo = '',
  activeProjectTitle = '',
  activeProcuringEntity = '',
  procuringEntityAddress = '',
  procuringEntityContactPerson = '',
  headOfProcuringEntity: propHeadOfProcuringEntity = '',
  headOfProcuringEntityPosition: propHeadOfProcuringEntityPosition = '',
  solicitationNumber: propSolicitationNumber = '',
  contractAmount: propContractAmount = 0,
  projectLocation: propProjectLocation = '',
  dateTimeSubmitted: propDateTimeSubmitted = '',
  onSaveAndComplete,
  onClose
}) => {
  const todayStr = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  const [, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  const [companyName, setCompanyName] = useState<string>(tenant?.companyName || '');
  const [projectTitle, setProjectTitle] = useState<string>(activeProjectTitle || '');
  const [projectRefNo, setProjectRefNo] = useState<string>(activeProjectRefNo || '');
  const [procuringEntity, setProcuringEntity] = useState<string>(activeProcuringEntity || '');
  const [reportPeriod, setReportPeriod] = useState<string>(`Monthly Progress Report — ${todayStr}`);

  // Direct uploaded standalone PDF document (if user uploads a compiled PDF directly)
  const [directPdfDataUrl, setDirectPdfDataUrl] = useState<string>('');
  const [directPdfFileName, setDirectPdfFileName] = useState<string>('');

  // Structured photo list
  const [photos, setPhotos] = useState<ProgressPhotoItem[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeStageFilter, setActiveStageFilter] = useState<'ALL' | 'BEFORE' | 'DURING' | 'AFTER'>('ALL');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const projectScopeKey = (projectRefNo || selectedOppId || activeProjectRefNo || 'default').replace(/[^a-zA-Z0-9]/g, '_');

  useEffect(() => {
    const tenantId = tenant?.id || 'default';
    const list = getOpportunityProjects(tenantId);
    setOppProjects(list);

    if (tenant?.companyName) setCompanyName(tenant.companyName);

    const storageKey = `bidocs_progphoto_${tenantId}_${projectScopeKey}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.projectTitle) setProjectTitle(parsed.projectTitle);
        if (parsed.projectRefNo) setProjectRefNo(parsed.projectRefNo);
        if (parsed.procuringEntity) setProcuringEntity(parsed.procuringEntity);
        if (parsed.reportPeriod) setReportPeriod(parsed.reportPeriod);
        if (Array.isArray(parsed.photos)) setPhotos(parsed.photos);
        if (parsed.directPdfFileName) setDirectPdfFileName(parsed.directPdfFileName);
      }
    } catch (e) {
      console.error('[Progressphoto] Storage load error:', e);
    }

    // Load direct PDF from indexedDB if available
    const pdfDbKey = `proj_progphoto_pdf_${tenantId}_${projectScopeKey}`;
    loadPdfData(pdfDbKey).then((data) => {
      if (data) setDirectPdfDataUrl(data);
    }).catch(console.error);

    if (list.length > 0 && !selectedOppId) {
      const match = activeProjectRefNo ? list.find(p => p.refNo === activeProjectRefNo) : null;
      const target = match || list[0];
      if (target) {
        setSelectedOppId(target.id);
        setProjectTitle(target.title);
        setProjectRefNo(target.refNo);
        setProcuringEntity(target.procuringEntity);
      }
    }
  }, [tenant, activeProjectRefNo, projectScopeKey]);

  const handleSaveState = (newPhotos?: ProgressPhotoItem[], pdfName?: string) => {
    const tenantId = tenant?.id || 'default';
    const storageKey = `bidocs_progphoto_${tenantId}_${projectScopeKey}`;
    const payload = {
      companyName,
      projectTitle,
      projectRefNo,
      procuringEntity,
      reportPeriod,
      photos: newPhotos || photos,
      directPdfFileName: pdfName !== undefined ? pdfName : directPdfFileName
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error('[Progressphoto] Save state error:', e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newPhoto: ProgressPhotoItem = {
          id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          stage: 'DURING',
          caption: file.name.replace(/\.[^/.]+$/, ''),
          station: 'Station 0+000 / Site Location',
          dateTaken: todayStr,
          imageDataUrl: dataUrl
        };
        setPhotos((prev) => {
          const updated = [...prev, newPhoto];
          handleSaveState(updated);
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleDirectPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setDirectPdfDataUrl(dataUrl);
      setDirectPdfFileName(file.name);
      const tenantId = tenant?.id || 'default';
      const pdfDbKey = `proj_progphoto_pdf_${tenantId}_${projectScopeKey}`;
      await savePdfData(pdfDbKey, dataUrl);
      handleSaveState(undefined, file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = (id: string) => {
    const updated = photos.filter(p => p.id !== id);
    setPhotos(updated);
    handleSaveState(updated);
  };

  const handleUpdatePhoto = (id: string, field: keyof ProgressPhotoItem, value: any) => {
    const updated = photos.map(p => (p.id === id ? { ...p, [field]: value } : p));
    setPhotos(updated);
    handleSaveState(updated);
  };

  const generatePdf = async (): Promise<string | null> => {
    if (directPdfDataUrl) {
      return directPdfDataUrl;
    }
    const printArea = document.getElementById('progphoto-print-sheet');
    if (!printArea) return null;
    try {
      setIsSaving(true);
      handleSaveState();

      const canvas = await html2canvas(printArea, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfDoc = await PDFDocument.create();
      // Philippine Legal: 8.5" x 13" -> 612 x 936 pt
      const page = pdfDoc.addPage([612, 936]);
      const img = await pdfDoc.embedPng(imgData);

      const margin = 20;
      const printableWidth = 612 - margin * 2;
      const printableHeight = 936 - margin * 2;
      const imgAspect = canvas.width / canvas.height;

      let drawWidth = printableWidth;
      let drawHeight = printableWidth / imgAspect;

      if (drawHeight > printableHeight) {
        drawHeight = printableHeight;
        drawWidth = printableHeight * imgAspect;
      }

      const x = margin + (printableWidth - drawWidth) / 2;
      const y = 936 - margin - drawHeight;

      page.drawImage(img, { x, y, width: drawWidth, height: drawHeight });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error('[Progressphoto] Generate PDF error:', err);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = async () => {
    const dataUrl = await generatePdf();
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Progress_Photos_${projectRefNo || 'Project'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveAndComplete = async () => {
    const dataUrl = await generatePdf();
    if (dataUrl && onSaveAndComplete) {
      onSaveAndComplete(
        dataUrl,
        'Progress Photos Documentation (PDF)',
        projectRefNo,
        projectTitle
      );
    }
    if (onClose) onClose();
  };

  const filteredPhotos = activeStageFilter === 'ALL' ? photos : photos.filter(p => p.stage === activeStageFilter);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-600/20 text-purple-400 rounded-lg border border-purple-500/30">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              Progress Photos Documentation
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Upload PDF Only / Multi-Stage Photo Album (Before, During, After) • Philippine Legal (8.5" x 13")
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={isSaving}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={handleSaveAndComplete}
            disabled={isSaving}
            className="px-4 py-1.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-blue-600/30 border border-blue-400/40 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Save & Attach to Vault</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Side: Upload Controls (5 cols) */}
        <div className="lg:col-span-5 p-5 overflow-y-auto border-r border-slate-800 space-y-4 bg-slate-900/40">
          {/* Direct PDF Upload Option */}
          <div className="bg-slate-900 border border-purple-500/30 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Direct PDF Upload (Official Progress Report)
            </h3>
            <p className="text-xs text-slate-400">
              If your engineering team has already compiled the official Progress Photo Report in PDF format, upload it directly here:
            </p>

            <input
              type="file"
              ref={pdfInputRef}
              accept="application/pdf"
              onChange={handleDirectPdfUpload}
              className="hidden"
            />

            {directPdfDataUrl ? (
              <div className="p-3 bg-purple-950/40 border border-purple-800/60 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-xs font-mono text-white truncate">{directPdfFileName || 'Progress_Photos.pdf'}</span>
                </div>
                <button
                  onClick={() => {
                    setDirectPdfDataUrl('');
                    setDirectPdfFileName('');
                    handleSaveState(undefined, '');
                  }}
                  className="p-1 text-slate-400 hover:text-red-400 rounded transition"
                  title="Remove Direct PDF"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => pdfInputRef.current?.click()}
                className="w-full py-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Compiled Progress Photos (PDF)</span>
              </button>
            )}
          </div>

          {/* Project Header Info */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Project Information
            </h3>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Project Title</label>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Contract / Ref No.</label>
                <input
                  type="text"
                  value={projectRefNo}
                  onChange={(e) => setProjectRefNo(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Report Period</label>
                <input
                  type="text"
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Image Upload & Photo Cards */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" /> Photo Attachments ({photos.length})
              </h3>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Images
              </button>
            </div>

            {/* Stage Filter */}
            <div className="flex items-center gap-1 text-[10px]">
              {(['ALL', 'BEFORE', 'DURING', 'AFTER'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setActiveStageFilter(st)}
                  className={`px-2 py-0.5 rounded font-semibold transition ${
                    activeStageFilter === st
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="space-y-3 max-h-75 overflow-y-auto pr-1">
              {filteredPhotos.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                  No individual photos attached yet. Click "+ Add Images" to upload site pictures.
                </div>
              ) : (
                filteredPhotos.map((p) => (
                  <div key={p.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex gap-3">
                    <img
                      src={p.imageDataUrl}
                      alt={p.caption}
                      className="w-20 h-20 object-cover rounded border border-slate-700 shrink-0"
                    />
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <select
                          value={p.stage}
                          onChange={(e) => handleUpdatePhoto(p.id, 'stage', e.target.value as any)}
                          className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-bold text-blue-300"
                        >
                          <option value="BEFORE">BEFORE</option>
                          <option value="DURING">DURING</option>
                          <option value="AFTER">AFTER</option>
                        </select>
                        <button
                          onClick={() => handleRemovePhoto(p.id)}
                          className="p-1 text-slate-500 hover:text-red-400 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={p.caption}
                        onChange={(e) => handleUpdatePhoto(p.id, 'caption', e.target.value)}
                        placeholder="Photo description / work item"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white"
                      />

                      <div className="grid grid-cols-2 gap-1 text-[10px]">
                        <input
                          type="text"
                          value={p.station}
                          onChange={(e) => handleUpdatePhoto(p.id, 'station', e.target.value)}
                          placeholder="Station / Loc"
                          className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-300"
                        />
                        <input
                          type="text"
                          value={p.dateTaken}
                          onChange={(e) => handleUpdatePhoto(p.id, 'dateTaken', e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-300"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Preview Sheet or PDF Viewer (7 cols) */}
        <div className="lg:col-span-7 p-6 overflow-y-auto bg-slate-950 flex justify-center items-start">
          {directPdfDataUrl ? (
            <div className="w-full h-187.5 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col" style={{ height: '750px' }}>
              <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex justify-between items-center text-xs font-mono text-slate-300">
                <span>PDF Preview: {directPdfFileName || 'Progress Photos'}</span>
                <span className="text-emerald-400 font-bold">Uploaded Document Ready</span>
              </div>
              <iframe
                src={directPdfDataUrl}
                title="Progress Photos PDF"
                className="w-full flex-1 border-0"
              />
            </div>
          ) : (
            <div
              id="progphoto-print-sheet"
              className="w-204 min-h-312 bg-white text-slate-900 p-10 shadow-2xl rounded-sm flex flex-col justify-between text-[11.5px] leading-tight"
              style={{ boxSizing: 'border-box', width: '816px', minHeight: '1248px' }}
            >
              <div>
                {/* Letterhead */}
                <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
                  <h1 className="text-base font-black tracking-wide uppercase text-slate-900">{companyName || 'CONTRACTOR / FIRM NAME'}</h1>
                  <p className="text-[10px] text-slate-600 uppercase font-semibold">PROJECT PROGRESS PHOTOS DOCUMENTATION</p>
                  <p className="text-[10px] text-blue-900 font-bold mt-0.5">{reportPeriod}</p>
                </div>

                {/* Project Info Bar */}
                <div className="grid grid-cols-2 gap-4 mb-4 p-2.5 bg-slate-50 border border-slate-300 rounded text-[11px]">
                  <div>
                    <p><strong>Project Name:</strong> {projectTitle || 'N/A'}</p>
                    <p><strong>Procuring Entity:</strong> {procuringEntity || 'Government Agency'}</p>
                  </div>
                  <div>
                    <p><strong>Contract / Ref No.:</strong> <span className="font-mono">{projectRefNo || 'N/A'}</span></p>
                    <p><strong>Total Photos Attached:</strong> {photos.length} photos</p>
                  </div>
                </div>

                {/* Photo Grid Layout */}
                {photos.length === 0 ? (
                  <div className="p-16 text-center border-2 border-dashed border-slate-300 rounded text-slate-400 font-medium text-xs">
                    No progress photos loaded. Use the left panel to upload site photos or attach compiled PDF.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {photos.slice(0, 6).map((p) => (
                      <div key={p.id} className="border border-slate-300 rounded p-2 bg-slate-50 space-y-1.5">
                        <div className="w-full h-44 bg-slate-200 overflow-hidden rounded flex items-center justify-center">
                          <img
                            src={p.imageDataUrl}
                            alt={p.caption}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className={`px-1.5 py-0.5 rounded font-bold text-white ${
                            p.stage === 'BEFORE' ? 'bg-amber-600' : p.stage === 'DURING' ? 'bg-blue-600' : 'bg-emerald-600'
                          }`}>
                            {p.stage}
                          </span>
                          <span className="text-slate-500 font-mono text-[9px]">{p.dateTaken}</span>
                        </div>
                        <p className="font-bold text-slate-900 text-[10.5px] line-clamp-1">{p.caption}</p>
                        <p className="text-slate-600 text-[9.5px] line-clamp-1">Loc: {p.station}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Signatures & Certification */}
              <div className="pt-6 border-t border-slate-300 mt-6">
                <div className="flex justify-between items-end text-[10px]">
                  <div className="space-y-1">
                    <p className="text-slate-500">Photographed & Certified by:</p>
                    <p className="font-bold underline uppercase text-slate-900 pt-6">
                      {tenant?.authorizedSignatory?.name || 'CONTRACTOR PROJECT ENGINEER'}
                    </p>
                    <p className="text-slate-600">Materials / Quality Control & Safety Engineer</p>
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-100 flex justify-end items-center text-[9px] text-slate-400 font-mono">
                  <span>Page 1 of 1</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function ProgressphotoModal(props: ProgressphotoModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] h-[94vh] flex flex-col">
        <VaultErrorBoundary>
          <ProgressphotoModalContent {...props} />
        </VaultErrorBoundary>
      </div>
    </div>
  );
}

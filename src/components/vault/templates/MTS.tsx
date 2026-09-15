import React, { useState, useEffect } from 'react';
import { Tenant } from '../../../types';
import { PDFDocument } from 'pdf-lib';
import html2canvas from 'html2canvas';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import VaultErrorBoundary from '../../common/VaultErrorBoundary';
import {
  X,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  FlaskConical,
  Briefcase,
  Layers,
  ShieldCheck,
  Building2
} from 'lucide-react';

export interface MtsTestRow {
  id: string;
  sampleNo: string;
  materialName: string;
  sourceSupplier: string;
  dateSampled: string;
  dateTested: string;
  testStandard: string; // e.g., ASTM C39 / DPWH Standard
  requiredValue: string; // e.g., 3000 psi @ 28 days
  actualValue: string; // e.g., 3450 psi (115%)
  resultStatus: 'PASSED' | 'FAILED' | 'PENDING';
  testingLab: string;
}

export interface MtsModalProps {
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

const DEFAULT_MTS_ROWS: MtsTestRow[] = [
  { id: 'mts-1', sampleNo: 'CYL-001', materialName: 'Ready-Mix Concrete (Class A)', sourceSupplier: 'Holcim Batching Plant', dateSampled: '2026-08-10', dateTested: '2026-09-07', testStandard: 'ASTM C39 / DPWH Item 900', requiredValue: '3,000 psi (20.7 MPa)', actualValue: '3,480 psi (24.0 MPa)', resultStatus: 'PASSED', testingLab: 'DPWH Accredited Testing Lab' },
  { id: 'mts-2', sampleNo: 'RSB-014', materialName: 'Deformed Steel Bar (16mm Grade 40)', sourceSupplier: 'SteelAsia Mfg Corp', dateSampled: '2026-08-12', dateTested: '2026-08-15', testStandard: 'PNS 49 / ASTM A615', requiredValue: 'Yield: 275 MPa, Tensile: 480 MPa', actualValue: 'Yield: 310 MPa, Tensile: 520 MPa', resultStatus: 'PASSED', testingLab: 'Bureau of Research and Standards' },
  { id: 'mts-3', sampleNo: 'CHB-008', materialName: '100mm Concrete Hollow Blocks', sourceSupplier: 'Apex Precast Products', dateSampled: '2026-08-18', dateTested: '2026-08-22', testStandard: 'ASTM C90 / C140', requiredValue: 'Min. 5.5 MPa (800 psi)', actualValue: '6.2 MPa (899 psi)', resultStatus: 'PASSED', testingLab: 'DPWH District Materials Lab' },
  { id: 'mts-4', sampleNo: 'EMB-003', materialName: 'Selected Borrow (Base Course Item 200)', sourceSupplier: 'Angono Quarry', dateSampled: '2026-08-25', dateTested: '2026-08-27', testStandard: 'AASHTO T180 / FDT', requiredValue: 'CBR ≥ 80%, Compaction ≥ 95%', actualValue: 'CBR: 88%, Compaction: 98.2%', resultStatus: 'PASSED', testingLab: 'Materials QA Laboratory' }
];

export const MtsModalContent: React.FC<MtsModalProps> = ({
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

  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  const [companyName, setCompanyName] = useState<string>(tenant?.companyName || '');
  const [projectTitle, setProjectTitle] = useState<string>(activeProjectTitle || '');
  const [projectRefNo, setProjectRefNo] = useState<string>(activeProjectRefNo || '');
  const [procuringEntity, setProcuringEntity] = useState<string>(activeProcuringEntity || '');
  const [reportNo, setReportNo] = useState<string>('MTR-2026-01');
  const [reportDate, setReportDate] = useState<string>(todayStr);

  const [rows, setRows] = useState<MtsTestRow[]>(DEFAULT_MTS_ROWS);

  // Signatories
  const [materialsEngineer, setMaterialsEngineer] = useState<string>('Engr. Juan Dela Cruz, ME-II');
  const [meLicenseNo, setMeLicenseNo] = useState<string>('DPWH ME Accreditation No. 12845');
  const [qaInspector, setQaInspector] = useState<string>('Engr. Government Materials QA Inspector');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const projectScopeKey = (projectRefNo || selectedOppId || activeProjectRefNo || 'default').replace(/[^a-zA-Z0-9]/g, '_');

  useEffect(() => {
    const tenantId = tenant?.id || 'default';
    const list = getOpportunityProjects(tenantId);
    setOppProjects(list);

    if (tenant?.companyName) setCompanyName(tenant.companyName);

    const storageKey = `bidocs_mts_${tenantId}_${projectScopeKey}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.projectTitle) setProjectTitle(parsed.projectTitle);
        if (parsed.projectRefNo) setProjectRefNo(parsed.projectRefNo);
        if (parsed.procuringEntity) setProcuringEntity(parsed.procuringEntity);
        if (parsed.reportNo) setReportNo(parsed.reportNo);
        if (parsed.reportDate) setReportDate(parsed.reportDate);
        if (Array.isArray(parsed.rows) && parsed.rows.length > 0) setRows(parsed.rows);
        if (parsed.materialsEngineer) setMaterialsEngineer(parsed.materialsEngineer);
        if (parsed.meLicenseNo) setMeLicenseNo(parsed.meLicenseNo);
        if (parsed.qaInspector) setQaInspector(parsed.qaInspector);
        return;
      }
    } catch (e) {
      console.error('[MTS] Storage load error:', e);
    }

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

  const handleSaveState = (newRows?: MtsTestRow[]) => {
    const tenantId = tenant?.id || 'default';
    const storageKey = `bidocs_mts_${tenantId}_${projectScopeKey}`;
    const payload = {
      companyName,
      projectTitle,
      projectRefNo,
      procuringEntity,
      reportNo,
      reportDate,
      rows: newRows || rows,
      materialsEngineer,
      meLicenseNo,
      qaInspector
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error('[MTS] Save state error:', e);
    }
  };

  const handleAddRow = () => {
    const newRow: MtsTestRow = {
      id: `mts-${Date.now()}`,
      sampleNo: `SMPL-${rows.length + 1}`,
      materialName: 'Material Test Specimen',
      sourceSupplier: 'Local Approved Source',
      dateSampled: todayStr,
      dateTested: todayStr,
      testStandard: 'ASTM / DPWH Standard',
      requiredValue: 'Standard Specification',
      actualValue: 'Compliant Value',
      resultStatus: 'PASSED',
      testingLab: 'DPWH Accredited Testing Facility'
    };
    const updated = [...rows, newRow];
    setRows(updated);
    handleSaveState(updated);
  };

  const handleRemoveRow = (id: string) => {
    const updated = rows.filter(r => r.id !== id);
    setRows(updated);
    handleSaveState(updated);
  };

  const handleUpdateRow = (id: string, field: keyof MtsTestRow, value: any) => {
    const updated = rows.map(r => (r.id === id ? { ...r, [field]: value } : r));
    setRows(updated);
    handleSaveState(updated);
  };

  const generatePdf = async (): Promise<string | null> => {
    const printArea = document.getElementById('mts-print-sheet');
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
      console.error('[MTS] Generate PDF error:', err);
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
    a.download = `Materials_Testing_Report_${projectRefNo || 'Project'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveAndComplete = async () => {
    const dataUrl = await generatePdf();
    if (dataUrl && onSaveAndComplete) {
      onSaveAndComplete(
        dataUrl,
        'Materials Testing Reports (MTS)',
        projectRefNo,
        projectTitle
      );
    }
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/30">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              Materials Testing Reports (MTS) / Quality Control Summary
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              DPWH / ASTM Laboratory Quality Test Log • Accredited Laboratory Results • Philippine Legal (8.5" x 13")
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
            className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-blue-600/30 border border-blue-400/40 cursor-pointer disabled:opacity-50"
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

      {/* Grid Content */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Form (5 cols) */}
        <div className="lg:col-span-5 p-5 overflow-y-auto border-r border-slate-800 space-y-4 bg-slate-900/40">
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
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Report No.</label>
                <input
                  type="text"
                  value={reportNo}
                  onChange={(e) => setReportNo(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Date</label>
                <input
                  type="text"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
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
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Procuring Entity</label>
                <input
                  type="text"
                  value={procuringEntity}
                  onChange={(e) => setProcuringEntity(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Test Log Rows */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5" /> Tested Materials Specimen ({rows.length})
              </h3>
              <button
                onClick={handleAddRow}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Specimen
              </button>
            </div>

            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {rows.map((r) => (
                <div key={r.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={r.sampleNo}
                      onChange={(e) => handleUpdateRow(r.id, 'sampleNo', e.target.value)}
                      placeholder="Sample ID"
                      className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-emerald-400 font-bold"
                    />
                    <input
                      type="text"
                      value={r.materialName}
                      onChange={(e) => handleUpdateRow(r.id, 'materialName', e.target.value)}
                      placeholder="Material Description"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                    <button
                      onClick={() => handleRemoveRow(r.id)}
                      className="p-1 text-slate-500 hover:text-red-400 rounded transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={r.testStandard}
                      onChange={(e) => handleUpdateRow(r.id, 'testStandard', e.target.value)}
                      placeholder="Standard (ASTM/DPWH)"
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-[11px]"
                    />
                    <select
                      value={r.resultStatus}
                      onChange={(e) => handleUpdateRow(r.id, 'resultStatus', e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] font-bold text-emerald-400"
                    >
                      <option value="PASSED">PASSED</option>
                      <option value="FAILED">FAILED</option>
                      <option value="PENDING">PENDING</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={r.requiredValue}
                      onChange={(e) => handleUpdateRow(r.id, 'requiredValue', e.target.value)}
                      placeholder="Required Spec"
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-[11px]"
                    />
                    <input
                      type="text"
                      value={r.actualValue}
                      onChange={(e) => handleUpdateRow(r.id, 'actualValue', e.target.value)}
                      placeholder="Actual Test Result"
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-[11px] font-mono font-semibold"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Materials Engineer Signatory */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Materials Engineer Signatories
            </h3>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Materials Engineer Name & Title</label>
              <input
                type="text"
                value={materialsEngineer}
                onChange={(e) => setMaterialsEngineer(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Accreditation / PRC No.</label>
              <input
                type="text"
                value={meLicenseNo}
                onChange={(e) => setMeLicenseNo(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Right Preview Sheet (7 cols) */}
        <div className="lg:col-span-7 p-6 overflow-y-auto bg-slate-950 flex justify-center items-start">
          <div
            id="mts-print-sheet"
            className="w-[816px] min-h-[1248px] bg-white text-slate-900 p-10 shadow-2xl rounded-sm flex flex-col justify-between text-[11px] leading-tight"
            style={{ boxSizing: 'border-box' }}
          >
            <div>
              {/* Header */}
              <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
                <h1 className="text-base font-black tracking-wide uppercase text-slate-900">{companyName || 'CONTRACTOR / FIRM NAME'}</h1>
                <p className="text-[10px] text-slate-600 uppercase font-semibold">QUALITY CONTROL & MATERIALS TESTING SUMMARY REPORT</p>
                <p className="text-[10px] text-blue-900 font-bold mt-0.5">{reportNo} • Date: {reportDate}</p>
              </div>

              {/* Project Info */}
              <div className="grid grid-cols-2 gap-4 mb-4 p-2.5 bg-slate-50 border border-slate-300 rounded text-[10.5px]">
                <div>
                  <p><strong>Project Name:</strong> {projectTitle || 'N/A'}</p>
                  <p><strong>Procuring Entity:</strong> {procuringEntity || 'Government Agency'}</p>
                </div>
                <div>
                  <p><strong>Contract / Ref No.:</strong> <span className="font-mono">{projectRefNo || 'N/A'}</span></p>
                  <p><strong>Accreditation Standard:</strong> DPWH / BRS / ASTM Certified</p>
                </div>
              </div>

              {/* Table */}
              <table className="w-full border-collapse border border-slate-400 text-[10px] mb-4">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 text-center font-bold">
                    <th className="border border-slate-400 p-1 w-12">Sample ID</th>
                    <th className="border border-slate-400 p-1 text-left">Material Description & Source</th>
                    <th className="border border-slate-400 p-1 w-20">Standard</th>
                    <th className="border border-slate-400 p-1 w-24">Required Spec</th>
                    <th className="border border-slate-400 p-1 w-24">Actual Result</th>
                    <th className="border border-slate-400 p-1 w-14">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="border border-slate-400 p-1 text-center font-mono font-bold text-slate-800">{r.sampleNo}</td>
                      <td className="border border-slate-400 p-1">
                        <div className="font-semibold text-slate-900">{r.materialName}</div>
                        <div className="text-[9px] text-slate-500">Source: {r.sourceSupplier} • Lab: {r.testingLab}</div>
                      </td>
                      <td className="border border-slate-400 p-1 text-center font-mono text-[9px]">{r.testStandard}</td>
                      <td className="border border-slate-400 p-1 text-center font-mono text-[9px]">{r.requiredValue}</td>
                      <td className="border border-slate-400 p-1 text-center font-mono font-bold text-slate-900 text-[9px]">{r.actualValue}</td>
                      <td className="border border-slate-400 p-1 text-center font-bold">
                        <span className={`px-1 py-0.5 rounded text-[8.5px] ${
                          r.resultStatus === 'PASSED' ? 'bg-emerald-100 text-emerald-800' : r.resultStatus === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.resultStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-3 bg-slate-50 border border-slate-300 rounded text-[10px] space-y-1 text-slate-700">
                <p className="font-bold text-slate-900 uppercase">QUALITY ASSURANCE CERTIFICATION:</p>
                <p>
                  This is to certify that the materials incorporated into the project have been sampled and tested strictly in accordance with the DPWH Standard Specifications and ASTM Standards. All materials denoted as "PASSED" meet or exceed the specified minimum compressive/tensile strengths and engineering requirements.
                </p>
              </div>
            </div>

            {/* Bottom Signatures */}
            <div className="pt-6 border-t border-slate-300">
              <div className="grid grid-cols-2 gap-8 text-center text-[10px]">
                <div className="space-y-1">
                  <p className="text-slate-500">Certified by (Contractor):</p>
                  <div className="h-10"></div>
                  <p className="font-bold underline uppercase text-slate-900">{materialsEngineer}</p>
                  <p className="text-slate-600 font-mono text-[9px]">{meLicenseNo}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500">Witnessed & Verified by (Procuring Entity):</p>
                  <div className="h-10"></div>
                  <p className="font-bold underline uppercase text-slate-900">{qaInspector}</p>
                  <p className="text-slate-600 text-[9px]">Government Quality Assurance / Materials Inspector</p>
                </div>
              </div>

              <div className="mt-6 pt-2 border-t border-slate-200 flex justify-end items-center text-[9px] text-slate-400 font-mono">
                <span>Page 1 of 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function MtsModal(props: MtsModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] h-[94vh] flex flex-col">
        <VaultErrorBoundary>
          <MtsModalContent {...props} />
        </VaultErrorBoundary>
      </div>
    </div>
  );
}

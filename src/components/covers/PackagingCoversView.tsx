import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getOpportunityProjects, OpportunityProjectOption } from '../../utils/opportunityProjects';
import { generateAndDownloadThreeLayerPdf, exportMergedThreeLayerPdf, ExportDocumentUnit } from '../../utils/pdfExportEngine';
import MotherEnvelopeCoverPage from './MotherEnvelopeCoverPage';
import EnvelopeCoverPage from './EnvelopeCoverPage';
import FolderCoverPage from './FolderCoverPage';
import DocumentSeparatorCover from './DocumentSeparatorCover';
import {
  Box,
  Folder,
  ShieldCheck,
  FileText,
  Printer,
  Download,
  Edit3,
  Building2,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Layers,
  Check
} from 'lucide-react';

export type CoverTabType = 'MOTHER' | 'ENVELOPE' | 'FOLDER' | 'SEPARATOR';

export const PackagingCoversView: React.FC = () => {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id || 'default';

  // Opportunity Projects
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  // Active Cover Tab
  const [activeTab, setActiveTab] = useState<CoverTabType>('MOTHER');

  // Sub-Selectors
  const [selectedEnvelope, setSelectedEnvelope] = useState<'ENVELOPE_1' | 'ENVELOPE_2'>('ENVELOPE_1');
  const [selectedFolderCopy, setSelectedFolderCopy] = useState<'ORIGINAL' | 'COPY_1' | 'COPY_2'>('ORIGINAL');
  const [selectedSeparatorCategory, setSelectedSeparatorCategory] = useState<'LEGAL' | 'TECHNICAL' | 'FINANCIAL'>('LEGAL');

  // Configuration Form State (Live Editable)
  const [companyName, setCompanyName] = useState(currentTenant?.companyName || 'QUANTUM CLOUD CORPORATION');
  const [companyAddress, setCompanyAddress] = useState(currentTenant?.address || 'La Trinidad, Benguet, Cordillera Administrative Region, Philippines');
  const [tin, setTin] = useState(currentTenant?.tin || '000-000-000-000');
  const [philgepsPlatinumNo, setPhilgepsPlatinumNo] = useState(currentTenant?.philgepsPlatinumNo || '202106-237062-883905538');
  
  const [procuringEntity, setProcuringEntity] = useState('MUNICIPALITY OF LA TRINIDAD');
  const [projectTitle, setProjectTitle] = useState('SUPPLY, DELIVERY, INSTALLATION, TESTING, AND CONFIGURATION OF ICT EQUIPMENT, PERIPHERALS, SYSTEMS AND SOFTWARE FOR THE LA TRINIDAD COMMUNICATION, INFORMATION & NETWORK HUB');
  const [projectRefNo, setProjectRefNo] = useState('12795242');
  const [solicitationNo, setSolicitationNo] = useState('2025-12-4162-MO');
  const [abc, setAbc] = useState('₱12,500,000.00');
  const [submissionDeadline, setSubmissionDeadline] = useState('September 30, 2026 at 10:00 AM');
  
  const [signatoryName, setSignatoryName] = useState(currentTenant?.authorizedSignatory?.name || 'Mark-Vin F. Ocampo');
  const [signatoryTitle, setSignatoryTitle] = useState('President & Authorized Managing Officer (AMO)');

  // UI Drawer State
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Batch 1-Click Packaging Bundle State
  const [bundleScope, setBundleScope] = useState<'ALL_9_COVERS' | 'ORIGINAL_ONLY'>('ALL_9_COVERS');
  const [isExportingBundle, setIsExportingBundle] = useState(false);
  const [bundleProgress, setBundleProgress] = useState<{ percent: number; status: string } | null>(null);
  const [printMode, setPrintMode] = useState<'ACTIVE' | 'ALL'>('ACTIVE');

  // Initialize Opportunity Projects & Synchronize with Default
  useEffect(() => {
    const list = getOpportunityProjects(tenantId);
    setOppProjects(list);
    if (list.length > 0) {
      const first = list[0];
      setSelectedOppId(first.id);
      applyProjectData(first);
    }
  }, [tenantId]);

  const applyProjectData = (p: OpportunityProjectOption) => {
    setProjectRefNo(p.refNo);
    setProjectTitle(p.title);
    if (p.procuringEntity) {
      // Strip any existing BAC prefix from stored data so it displays cleanly as the entity name
      let pe = p.procuringEntity.trim();
      const prefixMatch = pe.match(/^(?:THE\s+BIDS\s+AND\s+AWARDS\s+COMMITTEE\s*\((?:BAC)?\)\s*[-—–:]\s*|BAC\s*[-—–:]\s*)/i);
      if (prefixMatch) {
        pe = pe.substring(prefixMatch[0].length).trim();
      }
      setProcuringEntity(pe.toUpperCase());
    }
    if (p.solicitationNo) setSolicitationNo(p.solicitationNo);
    if (p.abc) setAbc(p.abc);
    if (p.dateTimeSubmitted) setSubmissionDeadline(p.dateTimeSubmitted);
  };

  const handleSelectOpp = (id: string) => {
    setSelectedOppId(id);
    const found = oppProjects.find(p => p.id === id || p.refNo === id);
    if (found) {
      applyProjectData(found);
    }
  };

  // Print Active Single Cover
  const handlePrintActive = () => {
    setPrintMode('ACTIVE');
    setTimeout(() => {
      window.print();
    }, 50);
  };

  // 1-Click Print All Packaging Covers Sequentially
  const handlePrintBundle = () => {
    setPrintMode('ALL');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setPrintMode('ACTIVE');
      }, 1000);
    }, 150);
  };

  // Export Active Cover as PDF
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const elem = document.getElementById('packaging-cover-preview-container');
      if (elem) {
        const cleanRef = (projectRefNo || 'COVER').replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `${activeTab}_Cover_${cleanRef}.pdf`;
        await generateAndDownloadThreeLayerPdf(null, elem, undefined, filename);
      }
    } catch (err) {
      console.error('[PackagingCovers] Export PDF error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // 1-Click Batch Download Complete Packaging Covers as Legal Landscape PDF
  const handleExportBundlePdf = async () => {
    setIsExportingBundle(true);
    setBundleProgress({ percent: 5, status: 'Compiling statutory packaging covers...' });
    try {
      const targetItems: { id: string; title: string }[] = [
        { id: 'packaging-bundle-mother-cover', title: '01_Mother_Envelope_Master_Cover' },
        { id: 'packaging-bundle-env1-cover', title: '02_Envelope_1_Technical_Component_Cover' },
        { id: 'packaging-bundle-env2-cover', title: '03_Envelope_2_Financial_Component_Cover' },
        { id: 'packaging-bundle-folder-env1-orig-cover', title: '04_Folder_Envelope_1_Technical_ORIGINAL' },
        ...(bundleScope === 'ALL_9_COVERS' ? [
          { id: 'packaging-bundle-folder-env1-copy1-cover', title: '05_Folder_Envelope_1_Technical_COPY_1' },
          { id: 'packaging-bundle-folder-env1-copy2-cover', title: '06_Folder_Envelope_1_Technical_COPY_2' },
        ] : []),
        { id: 'packaging-bundle-folder-env2-orig-cover', title: bundleScope === 'ALL_9_COVERS' ? '07_Folder_Envelope_2_Financial_ORIGINAL' : '05_Folder_Envelope_2_Financial_ORIGINAL' },
        ...(bundleScope === 'ALL_9_COVERS' ? [
          { id: 'packaging-bundle-folder-env2-copy1-cover', title: '08_Folder_Envelope_2_Financial_COPY_1' },
          { id: 'packaging-bundle-folder-env2-copy2-cover', title: '09_Folder_Envelope_2_Financial_COPY_2' },
        ] : [])
      ];

      const units: ExportDocumentUnit[] = [];
      for (const item of targetItems) {
        const elem = document.getElementById(item.id);
        if (elem) {
          units.push({
            title: item.title,
            formElement: elem,
            isPristineAttachment: true
          });
        }
      }

      if (units.length === 0) {
        throw new Error('No packaging covers found to export.');
      }

      const cleanRef = (projectRefNo || 'BID').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Complete_Packaging_Covers_${cleanRef}.pdf`;

      await exportMergedThreeLayerPdf(units, filename, (progress) => {
        setBundleProgress({
          percent: progress.percent,
          status: progress.status
        });
      });
    } catch (err) {
      console.error('[PackagingCovers] Export bundle error:', err);
    } finally {
      setIsExportingBundle(false);
      setBundleProgress(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6 text-slate-100 flex flex-col space-y-6 print:p-0 print:bg-white">
      
      {/* TOP HEADER CONTROLS BAR */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-xl print:hidden no-export">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-950/40 shrink-0">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-white">Packaging Labels & Statutory Covers</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                1-Click Bundle Generation
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Mother Envelope Master Box, Component Envelopes (Technical & Financial), and Statutory Folder Covers (RA 12009 / RA 9184).
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Project Quick-Sync Dropdown */}
          {oppProjects.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
              <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <select
                value={selectedOppId}
                onChange={(e) => handleSelectOpp(e.target.value)}
                className="bg-transparent text-white font-mono text-xs font-bold focus:outline-none cursor-pointer max-w-[170px] truncate"
                title="Synchronize cover metadata from active Opportunity Finder project"
              >
                {oppProjects.map(p => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    [{p.refNo}] {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Bundle Scope Toggle */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setBundleScope('ALL_9_COVERS')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                bundleScope === 'ALL_9_COVERS'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Include Mother Box, 2 Envelopes, and 6 Folders (Original, Copy 1, Copy 2 for both envelopes)"
            >
              Full 9-Set (Orig, C1, C2)
            </button>
            <button
              type="button"
              onClick={() => setBundleScope('ORIGINAL_ONLY')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                bundleScope === 'ORIGINAL_ONLY'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Include Mother Box, 2 Envelopes, and 2 Folders (Original copy only)"
            >
              Original Only (5)
            </button>
          </div>

          {/* PRIMARY ONE-CLICK ACTIONS GROUP */}
          <div className="flex items-center gap-2">
            {/* 1-CLICK DOWNLOAD COMPLETE BUNDLE PDF */}
            <button
              onClick={handleExportBundlePdf}
              disabled={isExportingBundle}
              className="relative group px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-950/30 hover:shadow-amber-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="1-Click Download all statutory packaging covers (Mother Box, Envelopes & Folders) as a single Legal Landscape PDF"
            >
              {isExportingBundle ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Compiling...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>Download Complete Covers (PDF)</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-950 text-amber-300">
                    {bundleScope === 'ALL_9_COVERS' ? '9 Covers' : '5 Covers'}
                  </span>
                </>
              )}
            </button>

            {/* 1-CLICK PRINT COMPLETE SET */}
            <button
              onClick={handlePrintBundle}
              disabled={isExportingBundle}
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-950/30 active:scale-95"
              title="1-Click Print all statutory packaging covers sequentially on 13in x 8.5in Legal landscape"
            >
              <Printer className="w-4 h-4" />
              <span>Print Complete Set</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-blue-950 text-blue-200 border border-blue-400/30">
                All
              </span>
            </button>
          </div>

          {/* SECONDARY SINGLE ITEM & CONFIG ACTIONS */}
          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-2">
            <button
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                showConfigDrawer
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
              title="Toggle Live Editor & Configuration Panel"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{showConfigDrawer ? 'Hide' : 'Edit'}</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Export only the active single preview as PDF"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Active</span>
            </button>

            <button
              onClick={handlePrintActive}
              className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition flex items-center gap-1 cursor-pointer"
              title="Print only the active single preview"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Print Active</span>
            </button>
          </div>
        </div>
      </div>

      {/* BATCH COMPILATION PROGRESS BAR */}
      {isExportingBundle && bundleProgress && (
        <div className="glass-panel p-3.5 rounded-2xl border border-amber-500/40 bg-amber-950/20 shadow-xl flex flex-col gap-2 no-export animate-fadeIn">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-300 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              {bundleProgress.status}
            </span>
            <span className="font-mono font-bold text-amber-400">{bundleProgress.percent}%</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-amber-500/30">
            <div
              className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-300 rounded-full"
              style={{ width: `${bundleProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* 4 COVER TYPE SELECTOR TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-2 rounded-2xl border border-slate-800 shadow-lg print:hidden no-export">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('MOTHER')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'MOTHER'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>1. Mother Envelope Cover</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ENVELOPE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'ENVELOPE'
                ? 'bg-blue-600 text-white shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>2. Envelope Outer Cover</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('FOLDER')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'FOLDER'
                ? 'bg-emerald-600 text-white shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>3. Folder Cover Page</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SEPARATOR')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'SEPARATOR'
                ? 'bg-purple-600 text-white shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>4. Document Separator Sheet</span>
          </button>
        </div>

        {/* Dynamic Sub-Selectors based on Tab */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'ENVELOPE' && (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedEnvelope('ENVELOPE_1')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedEnvelope === 'ENVELOPE_1' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Envelope 1 (Technical)
              </button>
              <button
                type="button"
                onClick={() => setSelectedEnvelope('ENVELOPE_2')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedEnvelope === 'ENVELOPE_2' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Envelope 2 (Financial)
              </button>
            </div>
          )}

          {activeTab === 'FOLDER' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedEnvelope('ENVELOPE_1')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedEnvelope === 'ENVELOPE_1' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Env 1 (Technical)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEnvelope('ENVELOPE_2')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedEnvelope === 'ENVELOPE_2' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Env 2 (Financial)
                </button>
              </div>

              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['ORIGINAL', 'COPY_1', 'COPY_2'] as const).map(copy => (
                  <button
                    key={copy}
                    type="button"
                    onClick={() => setSelectedFolderCopy(copy)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      selectedFolderCopy === copy ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {copy === 'ORIGINAL' ? 'Original' : copy === 'COPY_1' ? 'Copy 1' : 'Copy 2'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'SEPARATOR' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['LEGAL', 'TECHNICAL', 'FINANCIAL'] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedSeparatorCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      selectedSeparatorCategory === cat ? 'bg-purple-600 text-white font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['ORIGINAL', 'COPY_1', 'COPY_2'] as const).map(copy => (
                  <button
                    key={copy}
                    type="button"
                    onClick={() => setSelectedFolderCopy(copy)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      selectedFolderCopy === copy ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {copy === 'ORIGINAL' ? 'Original' : copy === 'COPY_1' ? 'Copy 1' : 'Copy 2'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LIVE EDIT & CONFIGURATION DRAWER */}
      {showConfigDrawer && (
        <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-slate-900/95 space-y-4 shadow-2xl animate-fadeIn print:hidden no-export">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-black text-amber-300 font-mono flex items-center gap-2 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Live Configuration & Content Customizer
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Changes update on the live sample immediately
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 font-mono text-[10px] font-bold mb-1">Company Name:</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono text-[10px] font-bold mb-1">Company Address:</label>
              <input
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono text-[10px] font-bold mb-1">TIN:</label>
              <input
                type="text"
                value={tin}
                onChange={(e) => setTin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono text-[10px] font-bold mb-1">PhilGEPS Platinum No:</label>
              <input
                type="text"
                value={philgepsPlatinumNo}
                onChange={(e) => setPhilgepsPlatinumNo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-800">
            <div>
              <label className="block text-slate-400 font-mono text-[10px] font-bold mb-1">Procuring Entity:</label>
              <input
                type="text"
                value={procuringEntity}
                onChange={(e) => setProcuringEntity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono text-[10px] font-bold mb-1">PhilGEPS Ref No:</label>
              <input
                type="text"
                value={projectRefNo}
                onChange={(e) => setProjectRefNo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono text-[10px] font-bold mb-1">Solicitation No:</label>
              <input
                type="text"
                value={solicitationNo}
                onChange={(e) => setSolicitationNo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono text-[10px] font-bold mb-1">Approved Budget (ABC):</label>
              <input
                type="text"
                value={abc}
                onChange={(e) => setAbc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-800">
            <div className="col-span-full sm:col-span-1">
              <label className="block text-slate-400 font-mono text-[10px] font-bold mb-1">Scheduled Bid Opening Date & Time:</label>
              <input
                type="text"
                value={submissionDeadline}
                onChange={(e) => setSubmissionDeadline(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono text-[10px] font-bold mb-1">Authorized Signatory Name:</label>
              <input
                type="text"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono text-[10px] font-bold mb-1">Signatory Title & Designation:</label>
              <input
                type="text"
                value={signatoryTitle}
                onChange={(e) => setSignatoryTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <label className="block text-slate-400 font-mono text-[10px] font-bold mb-1">Full Project Name / Description:</label>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      )}

      {/* SAMPLE RENDERING CANVAS CONTAINER */}
      <div 
        id="packaging-cover-preview-container"
        className="w-full flex justify-center items-center py-4 print:p-0"
      >
        {activeTab === 'MOTHER' && (
          <MotherEnvelopeCoverPage
            tenant={currentTenant}
            companyName={companyName}
            companyAddress={companyAddress}
            tin={tin}
            philgepsPlatinumNo={philgepsPlatinumNo}
            procuringEntity={procuringEntity}
            projectTitle={projectTitle}
            projectRefNo={projectRefNo}
            solicitationNo={solicitationNo}
            abc={abc}
            submissionDeadline={submissionDeadline}
            signatoryName={signatoryName}
            signatoryTitle={signatoryTitle}
          />
        )}

        {activeTab === 'ENVELOPE' && (
          <EnvelopeCoverPage
            tenant={currentTenant}
            companyName={companyName}
            companyAddress={companyAddress}
            tin={tin}
            philgepsPlatinumNo={philgepsPlatinumNo}
            procuringEntity={procuringEntity}
            projectTitle={projectTitle}
            projectRefNo={projectRefNo}
            solicitationNo={solicitationNo}
            abc={abc}
            envelopeChoice={selectedEnvelope}
            submissionDeadline={submissionDeadline}
            signatoryName={signatoryName}
            signatoryTitle={signatoryTitle}
          />
        )}

        {activeTab === 'FOLDER' && (
          <FolderCoverPage
            tenant={currentTenant}
            companyName={companyName}
            companyAddress={companyAddress}
            tin={tin}
            philgepsPlatinumNo={philgepsPlatinumNo}
            procuringEntity={procuringEntity}
            projectTitle={projectTitle}
            projectRefNo={projectRefNo}
            solicitationNo={solicitationNo}
            abc={abc}
            folderCopy={selectedFolderCopy}
            envelopeChoice={selectedEnvelope}
            submissionDeadline={submissionDeadline}
            signatoryName={signatoryName}
            signatoryTitle={signatoryTitle}
          />
        )}

        {activeTab === 'SEPARATOR' && (
          <DocumentSeparatorCover
            item={{
              documentName: selectedSeparatorCategory === 'LEGAL'
                ? 'PhilGEPS Certificate of Registration and Membership (Platinum)'
                : selectedSeparatorCategory === 'TECHNICAL'
                  ? 'Statement of All Ongoing Government & Private Contracts'
                  : 'Net Financial Contracting Capacity (NFCC) Computation',
              category: selectedSeparatorCategory as any,
              projectTitle: projectTitle,
              philgepsRefNo: projectRefNo,
              procuringEntity: procuringEntity,
              approvedBudget: abc,
              submissionDeadline: submissionDeadline
            }}
            tenant={currentTenant}
            folderCopy={selectedFolderCopy}
            envelopeName={selectedSeparatorCategory === 'FINANCIAL' ? 'ENVELOPE 2: FINANCIAL BID PROPOSAL' : 'ENVELOPE 1: TECHNICAL & ELIGIBILITY COMPONENT'}
          />
        )}
      </div>

    </div>
  );
};

export default PackagingCoversView;

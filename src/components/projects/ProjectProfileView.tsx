import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PhilGEPSOpportunity, ProcurementType, SectorType, LegalRegime } from '../../types';
import { invalidateOpportunityProjectsCache } from '../../utils/opportunityProjects';
import { numberToWords } from '../../utils/numberToWords';
import { DocumentQrCode } from '../common/DocumentQrCode';
import { SpotlightCard } from '../common/SpotlightCard';
import { BorderBeam } from '../common/BorderBeam';
import { CyberBadge } from '../common/CyberBadge';
import {
  Briefcase,
  Search,
  Plus,
  Building2,
  Calendar,
  DollarSign,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Edit3,
  Trash2,
  Copy,
  Printer,
  X,
  FileCheck,
  FolderKanban,
  Box,
  MapPin,
  Phone,
  Mail,
  UserCheck,
  Layers
} from 'lucide-react';

interface ProjectProfileViewProps {
  setActiveTab: (tab: string) => void;
}

const formatPhpCurrency = (val: number | string): string => {
  if (val === '' || val === null || val === undefined) return '₱0.00';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return '₱0.00';
  return '₱' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parsePhpCurrency = (val: string): number => {
  const cleaned = val.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export const ProjectProfileView: React.FC<ProjectProfileViewProps> = ({ setActiveTab }) => {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id || '';

  // 1. Projects State
  const [projects, setProjects] = useState<PhilGEPSOpportunity[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeTabSection, setActiveTabSection] = useState<'general' | 'entity' | 'financial' | 'timeline' | 'team' | 'printable'>('general');

  // Modals & Drawers
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Active Project for the entire workspace
  const [activeWorkspaceRef, setActiveWorkspaceRef] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`bidocs_active_vault_project_${tenantId}`) || localStorage.getItem('bidocs_active_vault_project') || '';
      return saved;
    } catch {
      return '';
    }
  });

  // Load Projects from localStorage & hydrate
  const loadProjectsFromStorage = () => {
    if (!tenantId) return;
    try {
      const saved = localStorage.getItem(`bidocs_opportunities_${tenantId}`) || localStorage.getItem('bidocs_opportunities');
      if (saved) {
        const parsed: PhilGEPSOpportunity[] = JSON.parse(saved);
        setProjects(parsed);
        if (parsed.length > 0 && !selectedProjectId) {
          // If there's an active workspace project, select it first
          const matched = parsed.find(p => p.projectReferenceNumber === activeWorkspaceRef || p.philgepsRefNo === activeWorkspaceRef);
          setSelectedProjectId(matched ? matched.id : parsed[0].id);
        }
      } else {
        setProjects([]);
      }
    } catch (e) {
      console.error('[ProjectProfileView] Error loading projects:', e);
      setProjects([]);
    }
  };

  useEffect(() => {
    loadProjectsFromStorage();
  }, [tenantId]);

  // Active Selected Project Object
  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || (projects.length > 0 ? projects[0] : null);
  }, [projects, selectedProjectId]);

  // Form Edit / Add State
  const [formId, setFormId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formPhilgepsRefNo, setFormPhilgepsRefNo] = useState('');
  const [formSolNo, setFormSolNo] = useState('');
  const [formProjRefNo, setFormProjRefNo] = useState('');
  const [formCategory, setFormCategory] = useState<ProcurementType>('GOODS');
  const [formSector, setFormSector] = useState<SectorType>('Government');
  const [formRegime, setFormRegime] = useState<LegalRegime>('RA_9184');
  const [formAbc, setFormAbc] = useState<number>(0);
  const [formAbcInput, setFormAbcInput] = useState('');
  const [formEntityName, setFormEntityName] = useState('');
  const [formEntityAddress, setFormEntityAddress] = useState('');
  const [formEntityContactNumber, setFormEntityContactNumber] = useState('');
  const [formEntityEmail, setFormEntityEmail] = useState('');
  const [formEntityContactPerson, setFormEntityContactPerson] = useState('');
  const [formEntityPosition, setFormEntityPosition] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formPreBidDate, setFormPreBidDate] = useState('');
  const [formDeadlineDate, setFormDeadlineDate] = useState('');
  const [formBidOpeningDate, setFormBidOpeningDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'OPEN' | 'CLOSED' | 'AWARDED_TO_OTHERS' | 'CANCELLED'>('OPEN');

  // Open Modal for New Project
  const handleOpenNewProjectModal = () => {
    setIsEditing(false);
    const randomRef = 'PhilGEPS-' + Math.floor(10000000 + Math.random() * 9000000);
    const newId = 'proj_' + Date.now();
    setFormId(newId);
    setFormTitle('');
    setFormPhilgepsRefNo(randomRef);
    setFormSolNo('ITB-2026-' + Math.floor(100 + Math.random() * 900));
    setFormProjRefNo(randomRef);
    setFormCategory('GOODS');
    setFormSector('Government');
    setFormRegime(currentTenant?.preferredRegime || 'RA_9184');
    setFormAbc(1000000);
    setFormAbcInput('1,000,000.00');
    setFormEntityName(currentTenant?.companyName ? `BAC Secretariat - Procurement Office` : '');
    setFormEntityAddress(currentTenant?.address || '');
    setFormEntityContactNumber('');
    setFormEntityEmail('');
    setFormEntityContactPerson('');
    setFormEntityPosition('BAC Chairperson');
    setFormLocation('Metro Manila / Regional Office');
    
    const today = new Date();
    const in14Days = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    setFormPreBidDate(in7Days.toISOString().substring(0, 16));
    setFormDeadlineDate(in14Days.toISOString().substring(0, 16));
    setFormBidOpeningDate(in14Days.toISOString().substring(0, 16));
    setFormDescription('Procurement project registered in BiDOCS System.');
    setFormStatus('OPEN');
    setShowAddEditModal(true);
  };

  // Open Modal for Editing Existing Project
  const handleOpenEditModal = (proj: PhilGEPSOpportunity) => {
    setIsEditing(true);
    setFormId(proj.id);
    setFormTitle(proj.title);
    setFormPhilgepsRefNo(proj.philgepsRefNo);
    setFormSolNo(proj.solicitationNumber || '');
    setFormProjRefNo(proj.projectReferenceNumber || proj.philgepsRefNo);
    setFormCategory(proj.procurementType);
    setFormSector(proj.sector || 'Government');
    setFormRegime(proj.legalRegime || 'RA_9184');
    setFormAbc(proj.approvedBudget || 0);
    setFormAbcInput(proj.approvedBudget ? proj.approvedBudget.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '');
    setFormEntityName(proj.procuringEntity || '');
    setFormEntityAddress(proj.procuringEntityAddress || '');
    setFormEntityContactNumber(proj.procuringEntityContactNumber || '');
    setFormEntityEmail(proj.procuringEntityEmail || '');
    setFormEntityContactPerson(proj.procuringEntityContactPerson || '');
    setFormEntityPosition(proj.procuringEntityPosition || 'BAC Chairperson');
    setFormLocation(proj.location || proj.areaOfDelivery || '');
    setFormPreBidDate(proj.preBidConferenceDatetime || '');
    setFormDeadlineDate(proj.submissionDeadlineDatetime || proj.submissionDeadline || '');
    setFormBidOpeningDate(proj.bidOpeningDate || '');
    setFormDescription(proj.description || '');
    setFormStatus(proj.status || 'OPEN');
    setShowAddEditModal(true);
  };

  // Save Project Profile (Create or Update)
  const handleSaveProjectProfile = () => {
    if (!formTitle.trim()) {
      alert('Please enter a Project Title.');
      return;
    }
    if (!formPhilgepsRefNo.trim()) {
      alert('Please enter a PhilGEPS Reference Number.');
      return;
    }

    const budgetNum = formAbc || parsePhpCurrency(formAbcInput);

    const updatedItem: PhilGEPSOpportunity = {
      id: formId || ('proj_' + Date.now()),
      philgepsRefNo: formPhilgepsRefNo.trim(),
      projectReferenceNumber: formProjRefNo.trim() || formPhilgepsRefNo.trim(),
      solicitationNumber: formSolNo.trim() || 'ITB-2026-001',
      title: formTitle.trim(),
      procuringEntity: formEntityName.trim() || 'Government Procuring Entity',
      procuringEntityAddress: formEntityAddress.trim(),
      procuringEntityContactNumber: formEntityContactNumber.trim(),
      procuringEntityEmail: formEntityEmail.trim(),
      procuringEntityContactPerson: formEntityContactPerson.trim(),
      procuringEntityPosition: formEntityPosition.trim(),
      procurementType: formCategory,
      sector: formSector,
      legalRegime: formRegime,
      approvedBudget: budgetNum,
      datePublished: new Date().toISOString().substring(0, 10),
      preBidConferenceDatetime: formPreBidDate,
      submissionDeadlineDatetime: formDeadlineDate,
      submissionDeadline: formDeadlineDate ? formDeadlineDate.substring(0, 10) : '',
      bidOpeningDate: formBidOpeningDate,
      location: formLocation.trim() || 'Philippines',
      areaOfDelivery: formLocation.trim() || 'Philippines',
      description: formDescription.trim(),
      status: formStatus
    };

    let updatedList: PhilGEPSOpportunity[] = [];
    if (isEditing) {
      updatedList = projects.map(p => p.id === updatedItem.id ? { ...p, ...updatedItem } : p);
    } else {
      updatedList = [updatedItem, ...projects];
    }

    // Persist cleanly to localStorage
    try {
      localStorage.setItem(`bidocs_opportunities_${tenantId}`, JSON.stringify(updatedList));
      localStorage.setItem('bidocs_opportunities', JSON.stringify(updatedList));
      invalidateOpportunityProjectsCache();
    } catch (err) {
      console.error('[ProjectProfileView] Error saving to localStorage:', err);
    }

    setProjects(updatedList);
    setSelectedProjectId(updatedItem.id);
    setShowAddEditModal(false);
  };

  // Duplicate Project Profile
  const handleDuplicateProject = (proj: PhilGEPSOpportunity) => {
    const cloneId = 'proj_' + Date.now();
    const cloneRef = 'PhilGEPS-' + Math.floor(10000000 + Math.random() * 9000000);
    const cloned: PhilGEPSOpportunity = {
      ...proj,
      id: cloneId,
      title: `${proj.title} (Copy)`,
      philgepsRefNo: cloneRef,
      projectReferenceNumber: cloneRef,
      solicitationNumber: `${proj.solicitationNumber || 'ITB'}-COPY`,
      datePublished: new Date().toISOString().substring(0, 10)
    };

    const updatedList = [cloned, ...projects];
    try {
      localStorage.setItem(`bidocs_opportunities_${tenantId}`, JSON.stringify(updatedList));
      localStorage.setItem('bidocs_opportunities', JSON.stringify(updatedList));
      invalidateOpportunityProjectsCache();
    } catch (e) {
      console.error('[ProjectProfileView] Error duplicating:', e);
    }

    setProjects(updatedList);
    setSelectedProjectId(cloned.id);
  };

  // Delete Project Profile
  const handleDeleteProject = (proj: PhilGEPSOpportunity) => {
    if (confirm(`Are you sure you want to delete Project Profile: "${proj.title}" (${proj.philgepsRefNo})?`)) {
      const filtered = projects.filter(p => p.id !== proj.id);
      try {
        localStorage.setItem(`bidocs_opportunities_${tenantId}`, JSON.stringify(filtered));
        localStorage.setItem('bidocs_opportunities', JSON.stringify(filtered));
        invalidateOpportunityProjectsCache();
      } catch (e) {
        console.error('[ProjectProfileView] Error deleting:', e);
      }
      setProjects(filtered);
      if (filtered.length > 0) {
        setSelectedProjectId(filtered[0].id);
      } else {
        setSelectedProjectId('');
      }
    }
  };

  // Set as Active Workspace Project
  const handleSetActiveWorkspaceProject = (proj: PhilGEPSOpportunity) => {
    const activeRef = proj.projectReferenceNumber || proj.philgepsRefNo;
    const activeData = {
      refNo: activeRef,
      title: proj.title,
      procuringEntity: proj.procuringEntity,
      solicitationNo: proj.solicitationNumber,
      abc: proj.approvedBudget ? String(proj.approvedBudget) : '0',
      category: proj.procurementType,
      dateTimeSubmitted: proj.submissionDeadlineDatetime || proj.submissionDeadline || ''
    };

    try {
      localStorage.setItem(`bidocs_active_project_${tenantId}`, JSON.stringify(activeData));
      localStorage.setItem('bidocs_active_project', JSON.stringify(activeData));
      localStorage.setItem(`bidocs_active_vault_project_${tenantId}`, activeRef);
      localStorage.setItem('bidocs_active_vault_project', activeRef);
      setActiveWorkspaceRef(activeRef);
    } catch (e) {
      console.error('[ProjectProfileView] Error setting active project:', e);
    }
  };

  // Navigation shortcuts
  const handleJumpToVault = (proj: PhilGEPSOpportunity) => {
    handleSetActiveWorkspaceProject(proj);
    setActiveTab('vault');
  };

  const handleJumpToBidPackages = (proj: PhilGEPSOpportunity) => {
    handleSetActiveWorkspaceProject(proj);
    setActiveTab('bids');
  };

  const handleJumpToPackagingCovers = (proj: PhilGEPSOpportunity) => {
    handleSetActiveWorkspaceProject(proj);
    setActiveTab('covers');
  };

  // Filtered list of projects
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchSearch = searchQuery === '' ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.philgepsRefNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.procuringEntity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.location && p.location.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchCat = selectedCategory === 'ALL' ||
        p.procurementType.toUpperCase().includes(selectedCategory.toUpperCase());

      return matchSearch && matchCat;
    });
  }, [projects, searchQuery, selectedCategory]);

  // Pipeline Metrics
  const metrics = useMemo(() => {
    const totalCount = projects.length;
    const totalAbc = projects.reduce((acc, p) => acc + (p.approvedBudget || 0), 0);
    const goodsCount = projects.filter(p => (p.procurementType || '').toUpperCase().includes('GOOD')).length;
    const infraCount = projects.filter(p => (p.procurementType || '').toUpperCase().includes('INFRA')).length;
    const consultCount = projects.filter(p => (p.procurementType || '').toUpperCase().includes('CONSULT')).length;
    return { totalCount, totalAbc, goodsCount, infraCount, consultCount };
  }, [projects]);

  // Financial calculations for active project
  const financialDetails = useMemo(() => {
    if (!selectedProject) return null;
    const abc = selectedProject.approvedBudget || 0;
    const words = numberToWords(abc);
    const bidSecCash2Pct = abc * 0.02;
    const bidSecSurety5Pct = abc * 0.05;
    const slcc50Pct = abc * 0.50;
    const slcc25Pct = abc * 0.25;
    return {
      abc,
      words,
      bidSecCash2Pct,
      bidSecSurety5Pct,
      slcc50Pct,
      slcc25Pct
    };
  }, [selectedProject]);

  return (
    <div className="w-full min-h-screen text-slate-100 flex flex-col space-y-6 pb-16 font-sans">
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. TOP HEADER & METRICS BANNER                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-blue-600/30 to-indigo-600/20 text-blue-400 rounded-xl border border-blue-500/30 shadow-lg shadow-blue-500/10">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Project Profile Management
                </h1>
                <CyberBadge label="Procurement Registry" variant="blue" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized Bidding Specifications, ABC Parameters, BAC Secretariat Directory & Project Milestones
              </p>
            </div>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleOpenNewProjectModal}
            className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-blue-600/20 border border-blue-400/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Project Profile</span>
          </button>
          
          <button
            onClick={() => setActiveTab('opportunities')}
            className="px-3 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700/80 cursor-pointer"
            title="Import from Opportunity Finder"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span>Opportunity Finder</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 2. PIPELINE METRICS SUMMARY TILES                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <SpotlightCard className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total Projects</span>
            <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-1">{metrics.totalCount}</p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Active Project Profiles</p>
        </SpotlightCard>

        <SpotlightCard className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total ABC Pipeline</span>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1">{formatPhpCurrency(metrics.totalAbc)}</p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Cumulative Budget Value</p>
        </SpotlightCard>

        <SpotlightCard className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Goods & Supply</span>
            <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <Box className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-cyan-300 mt-1">{metrics.goodsCount}</p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Goods Opportunities</p>
        </SpotlightCard>

        <SpotlightCard className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Infrastructure</span>
            <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-300 mt-1">{metrics.infraCount}</p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Civil Works & Contracts</p>
        </SpotlightCard>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 3. MAIN DUAL-PANE WORKSPACE                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: PROJECT SELECTOR & FILTER (4 COLS) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 space-y-3.5 shadow-xl backdrop-blur-md">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search projects, ref #, BAC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700/70 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-semibold">
              {['ALL', 'GOODS', 'INFRA', 'CONSULT'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg transition shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat === 'ALL' ? 'All Types' : cat}
                </button>
              ))}
            </div>

            {/* Project List Items */}
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredProjects.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800 space-y-2">
                  <Briefcase className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">No project profiles found.</p>
                  <button
                    onClick={handleOpenNewProjectModal}
                    className="px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 rounded-lg text-xs font-semibold transition border border-blue-500/30 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Profile</span>
                  </button>
                </div>
              ) : (
                filteredProjects.map((proj) => {
                  const isSelected = selectedProjectId === proj.id;
                  const isWorkspaceActive = (proj.projectReferenceNumber === activeWorkspaceRef || proj.philgepsRefNo === activeWorkspaceRef);

                  return (
                    <div
                      key={proj.id}
                      onClick={() => setSelectedProjectId(proj.id)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer text-left relative group ${
                        isSelected
                          ? 'bg-blue-950/40 border-blue-500/60 shadow-lg shadow-blue-950/50 ring-1 ring-blue-500/30'
                          : 'bg-slate-950/50 hover:bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/50 truncate max-w-[170px]">
                          {proj.philgepsRefNo || 'NO REF'}
                        </span>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isWorkspaceActive && (
                            <span className="text-[9px] font-bold bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-700/50 flex items-center gap-1 font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              ACTIVE
                            </span>
                          )}
                          <span className="text-[9px] font-bold bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded uppercase font-mono">
                            {proj.procurementType?.substring(0, 5) || 'GOODS'}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-white mt-2 line-clamp-2 leading-snug">
                        {proj.title}
                      </h4>

                      <div className="text-[11px] text-slate-400 mt-2 space-y-0.5 font-sans">
                        <p className="truncate text-slate-300 font-medium">
                          {proj.procuringEntity || 'Procuring Entity'}
                        </p>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 mt-1.5 text-[11px]">
                          <span className="font-mono font-bold text-emerald-400">
                            {formatPhpCurrency(proj.approvedBudget || 0)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {proj.submissionDeadline ? `Due: ${proj.submissionDeadline.substring(0, 10)}` : 'No Deadline'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED PROJECT PROFILE INSPECTOR (8 COLS) */}
        <div className="lg:col-span-8 space-y-5">
          {selectedProject ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
              <BorderBeam size={250} duration={12} delay={9} />

              {/* Profile Top Hero Banner */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800/80 pb-5">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 bg-blue-950 text-blue-300 text-xs font-mono font-bold rounded-lg border border-blue-700/60 shadow-xs">
                      {selectedProject.philgepsRefNo}
                    </span>
                    <span className="px-2 py-0.5 bg-purple-950 text-purple-300 text-[11px] font-mono font-bold rounded-lg border border-purple-700/60">
                      {selectedProject.procurementType}
                    </span>
                    <span className="px-2 py-0.5 bg-amber-950 text-amber-300 text-[11px] font-mono font-bold rounded-lg border border-amber-700/60">
                      {selectedProject.legalRegime === 'RA_12009_NGPA' ? 'RA 12009 (NGPA)' : 'RA 9184 Standard'}
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
                    {selectedProject.title}
                  </h2>

                  <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>{selectedProject.procuringEntity}</span>
                    {selectedProject.location && (
                      <>
                        <span className="text-slate-600">•</span>
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{selectedProject.location}</span>
                      </>
                    )}
                  </p>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    onClick={() => handleSetActiveWorkspaceProject(selectedProject)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                      activeWorkspaceRef === (selectedProject.projectReferenceNumber || selectedProject.philgepsRefNo)
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-600/70 shadow-emerald-950/50'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700'
                    }`}
                    title="Set as active bidding project across Vault, Packages, and Covers"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {activeWorkspaceRef === (selectedProject.projectReferenceNumber || selectedProject.philgepsRefNo)
                        ? 'Active Project'
                        : 'Set Active'}
                    </span>
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(selectedProject)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition border border-slate-700 cursor-pointer"
                    title="Edit Project Profile"
                  >
                    <Edit3 className="w-4 h-4 text-blue-400" />
                  </button>

                  <button
                    onClick={() => handleDuplicateProject(selectedProject)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition border border-slate-700 cursor-pointer"
                    title="Duplicate Project Profile"
                  >
                    <Copy className="w-4 h-4 text-purple-400" />
                  </button>

                  <button
                    onClick={() => handleDeleteProject(selectedProject)}
                    className="p-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-xl transition border border-red-800/40 cursor-pointer"
                    title="Delete Project Profile"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tab Navigation for Detailed Sections */}
              <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-semibold">
                {[
                  { id: 'general', label: 'General & PhilGEPS', icon: Briefcase },
                  { id: 'entity', label: 'Procuring Entity / BAC', icon: Building2 },
                  { id: 'financial', label: 'Financial & ABC', icon: DollarSign },
                  { id: 'timeline', label: 'Timelines & Deadlines', icon: Calendar },
                  { id: 'team', label: 'Bidding Team', icon: UserCheck },
                  { id: 'printable', label: 'Print Summary Sheet', icon: Printer }
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTabSection === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTabSection(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white font-bold shadow-md'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* ═════════════════════════════════════════════════════════════ */}
              {/* TAB 1: GENERAL & PHILGEPS IDENTIFIERS                         */}
              {/* ═════════════════════════════════════════════════════════════ */}
              {activeTabSection === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">PhilGEPS Ref Number</span>
                      <p className="text-sm font-bold font-mono text-blue-400">{selectedProject.philgepsRefNo}</p>
                    </div>

                    <div className="p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Solicitation / ITB Number</span>
                      <p className="text-sm font-bold font-mono text-white">{selectedProject.solicitationNumber || 'N/A'}</p>
                    </div>

                    <div className="p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Internal Project Ref Number</span>
                      <p className="text-sm font-bold font-mono text-white">{selectedProject.projectReferenceNumber || selectedProject.philgepsRefNo}</p>
                    </div>

                    <div className="p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Procurement Category</span>
                      <p className="text-sm font-bold text-white">{selectedProject.procurementType}</p>
                    </div>

                    <div className="p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Sector / Regime</span>
                      <p className="text-sm font-bold text-white">
                        {selectedProject.sector || 'Government'} • {selectedProject.legalRegime === 'RA_12009_NGPA' ? 'RA 12009' : 'RA 9184'}
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Area of Delivery / Site</span>
                      <p className="text-sm font-bold text-white">{selectedProject.areaOfDelivery || selectedProject.location || 'Philippines'}</p>
                    </div>
                  </div>

                  {selectedProject.description && (
                    <div className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Project Scope & Description</span>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedProject.description}</p>
                    </div>
                  )}

                  {/* Cross-Module Quick Switchers */}
                  <div className="pt-2 flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => handleJumpToVault(selectedProject)}
                      className="px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <FileCheck className="w-4 h-4 text-blue-400" />
                      <span>Assemble in Document Vault</span>
                    </button>

                    <button
                      onClick={() => handleJumpToBidPackages(selectedProject)}
                      className="px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <FolderKanban className="w-4 h-4 text-indigo-400" />
                      <span>Build 3-Copy Bid Package</span>
                    </button>

                    <button
                      onClick={() => handleJumpToPackagingCovers(selectedProject)}
                      className="px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Box className="w-4 h-4 text-purple-400" />
                      <span>Generate Labels & Covers</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════ */}
              {/* TAB 2: PROCURING ENTITY & BAC DIRECTORY                       */}
              {/* ═════════════════════════════════════════════════════════════ */}
              {activeTabSection === 'entity' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1 sm:col-span-2">
                      <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Procuring Entity Name</span>
                      <p className="text-sm font-bold text-white">{selectedProject.procuringEntity}</p>
                    </div>

                    <div className="p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1 sm:col-span-2">
                      <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Office Address</span>
                      <p className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{selectedProject.procuringEntityAddress || 'Official BAC Office Address'}</span>
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">BAC Chairperson / Contact Person</span>
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                        <span>{selectedProject.procuringEntityContactPerson || 'BAC Chairperson'}</span>
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Position / Designation</span>
                      <p className="text-xs font-medium text-slate-300">{selectedProject.procuringEntityPosition || 'BAC Chairman / Secretariat'}</p>
                    </div>

                    <div className="p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Contact Number</span>
                      <p className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{selectedProject.procuringEntityContactNumber || '(02) 8000-0000'}</span>
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Official Email</span>
                      <p className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-amber-400" />
                        <span>{selectedProject.procuringEntityEmail || 'bac@procuringentity.gov.ph'}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════ */}
              {/* TAB 3: FINANCIAL BENCHMARKS & ABC PARAMETERS                  */}
              {/* ═════════════════════════════════════════════════════════════ */}
              {activeTabSection === 'financial' && financialDetails && (
                <div className="space-y-4">
                  {/* ABC Banner Card */}
                  <div className="p-4 bg-gradient-to-br from-emerald-950/60 to-slate-950/90 border border-emerald-500/40 rounded-2xl space-y-2 shadow-lg shadow-emerald-950/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase text-emerald-400">Approved Budget for the Contract (ABC)</span>
                      <CyberBadge label="Official Budget" variant="emerald" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono">
                      {formatPhpCurrency(financialDetails.abc)}
                    </p>
                    <p className="text-xs font-serif italic text-slate-300 bg-black/40 p-2.5 rounded-lg border border-emerald-900/40">
                      Amount in Words: <strong>{financialDetails.words}</strong>
                    </p>
                  </div>

                  {/* Statutory Computed Benchmarks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-blue-400 font-bold block">Bid Security (2% Cash / Bank Guarantee)</span>
                      <p className="text-base font-mono font-bold text-white">{formatPhpCurrency(financialDetails.bidSecCash2Pct)}</p>
                      <p className="text-[10px] text-slate-400">Cash, Cashier's/Manager's Check, Bank Draft/Guarantee</p>
                    </div>

                    <div className="p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-purple-400 font-bold block">Bid Security (5% Surety Bond)</span>
                      <p className="text-base font-mono font-bold text-white">{formatPhpCurrency(financialDetails.bidSecSurety5Pct)}</p>
                      <p className="text-[10px] text-slate-400">Callable upon demand issued by Insurance Commission licensed firm</p>
                    </div>

                    <div className="p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block">SLCC 50% Threshold Requirement</span>
                      <p className="text-base font-mono font-bold text-white">{formatPhpCurrency(financialDetails.slcc50Pct)}</p>
                      <p className="text-[10px] text-slate-400">Single Largest Completed Contract similar to project</p>
                    </div>

                    <div className="p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold block">SLCC 25% Threshold (Expendable Goods)</span>
                      <p className="text-base font-mono font-bold text-white">{formatPhpCurrency(financialDetails.slcc25Pct)}</p>
                      <p className="text-[10px] text-slate-400">Applicable for expendable supplies and goods contracts</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════ */}
              {/* TAB 4: TIMELINES & DEADLINES                                  */}
              {/* ═════════════════════════════════════════════════════════════ */}
              {activeTabSection === 'timeline' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-2 text-cyan-400">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs font-mono font-bold uppercase">Pre-Bid Conference</span>
                      </div>
                      <p className="text-sm font-bold text-white">
                        {selectedProject.preBidConferenceDatetime ? selectedProject.preBidConferenceDatetime.replace('T', ' ') : 'Not Scheduled / As per ITB'}
                      </p>
                      <p className="text-[10px] text-slate-400">Clarification and bidder inquiry conference</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-red-950/30 to-slate-950 border border-red-500/30 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-2 text-red-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-mono font-bold uppercase">Submission & Receipt Deadline</span>
                      </div>
                      <p className="text-sm font-bold text-red-300">
                        {selectedProject.submissionDeadlineDatetime ? selectedProject.submissionDeadlineDatetime.replace('T', ' ') : (selectedProject.submissionDeadline || 'As per ITB')}
                      </p>
                      <p className="text-[10px] text-slate-400">Strict closing time for bid submission</p>
                    </div>

                    <div className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs font-mono font-bold uppercase">Bid Opening Date</span>
                      </div>
                      <p className="text-sm font-bold text-white">
                        {selectedProject.bidOpeningDate ? selectedProject.bidOpeningDate.replace('T', ' ') : 'Immediately after deadline'}
                      </p>
                      <p className="text-[10px] text-slate-400">Public opening of Eligibility, Technical & Financial envelopes</p>
                    </div>

                    <div className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-2 text-purple-400">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-xs font-mono font-bold uppercase">Bid Validity Period</span>
                      </div>
                      <p className="text-sm font-bold text-white">120 Calendar Days</p>
                      <p className="text-[10px] text-slate-400">Statutory bid proposal validity pursuant to RA 9184 / RA 12009</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════ */}
              {/* TAB 5: BIDDING TEAM & ASSIGNED KEY PERSONNEL                  */}
              {/* ═════════════════════════════════════════════════════════════ */}
              {activeTabSection === 'team' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase text-blue-400">Authorized Bid Signatory</span>
                      <button
                        onClick={() => setActiveTab('profile')}
                        className="text-[11px] text-blue-400 hover:text-blue-300 underline cursor-pointer"
                      >
                        Edit in Company Profile
                      </button>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {currentTenant?.authorizedSignatory?.name || 'Authorized Managing Officer'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {currentTenant?.authorizedSignatory?.title || 'General Manager / President'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase text-emerald-400">Key Technical Personnel Matrix</span>
                      <button
                        onClick={() => setActiveTab('vault')}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                      >
                        Manage in Document Vault
                      </button>
                    </div>
                    <p className="text-xs text-slate-300">
                      Key Personnel matrix (Project Manager, Project Engineer, Materials Engineer, Safety Officer) is generated and stamped in 8.5" x 13" Legal landscape.
                    </p>
                  </div>
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════ */}
              {/* TAB 6: PRINTABLE OFFICIAL PROJECT PROFILE INFORMATION SHEET   */}
              {/* ═════════════════════════════════════════════════════════════ */}
              {activeTabSection === 'printable' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 print:hidden">
                    <span className="text-xs font-bold text-slate-400">
                      Official Government Procurement Project Summary Sheet
                    </span>
                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Document Sheet</span>
                    </button>
                  </div>

                  {/* Clean Official Printable Sheet */}
                  <div className="bg-white text-slate-950 p-6 sm:p-8 rounded-xl shadow-2xl border-2 border-slate-900 font-serif space-y-5 text-left text-xs max-w-[816px] mx-auto print:m-0 print:border-none print:shadow-none">
                    
                    {/* Header with QR & Seals */}
                    <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
                      <div>
                        <h3 className="text-base font-bold font-serif uppercase tracking-tight text-slate-900">
                          {currentTenant?.companyName || 'BIDDER ENTERPRISE'}
                        </h3>
                        <p className="text-[10px] text-slate-600">{currentTenant?.address || 'Official Business Address'}</p>
                        <p className="text-[10px] font-mono text-slate-600">TIN: {currentTenant?.tin || '000-000-000-000'} • PhilGEPS: {currentTenant?.philgepsPlatinumNo || 'PLATINUM-2026'}</p>
                      </div>

                      <DocumentQrCode
                        details={{
                          companyName: currentTenant?.companyName || '',
                          documentName: `Project Profile — ${selectedProject.philgepsRefNo}`,
                          documentNumber: selectedProject.philgepsRefNo,
                          projectTitle: selectedProject.title,
                          projectRefNo: selectedProject.projectReferenceNumber || selectedProject.philgepsRefNo,
                          procuringEntity: selectedProject.procuringEntity,
                          dateTimeSubmitted: selectedProject.submissionDeadlineDatetime || '',
                          documentCategory: 'Project Identification Registry'
                        }}
                        size={52}
                        showCaption={false}
                      />
                    </div>

                    {/* Title */}
                    <div className="text-center py-1">
                      <h2 className="text-sm font-bold uppercase tracking-wider underline">
                        OFFICIAL PROCUREMENT PROJECT PROFILE & BID SPECIFICATIONS
                      </h2>
                      <p className="text-[10px] font-mono text-slate-600">Pursuant to Philippine Bidding Documents (RA 9184 & RA 12009)</p>
                    </div>

                    {/* Specifications Grid */}
                    <table className="w-full border-collapse border border-slate-900 text-[10.5px]">
                      <tbody>
                        <tr className="border-b border-slate-900">
                          <td className="w-1/3 p-1.5 font-bold bg-slate-100 border-r border-slate-900">PROJECT TITLE:</td>
                          <td className="w-2/3 p-1.5 font-bold text-slate-950">{selectedProject.title}</td>
                        </tr>
                        <tr className="border-b border-slate-900">
                          <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-900">PHILGEPS REFERENCE NO.:</td>
                          <td className="p-1.5 font-mono font-bold text-blue-900">{selectedProject.philgepsRefNo}</td>
                        </tr>
                        <tr className="border-b border-slate-900">
                          <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-900">SOLICITATION / ITB NO.:</td>
                          <td className="p-1.5 font-mono">{selectedProject.solicitationNumber || 'N/A'}</td>
                        </tr>
                        <tr className="border-b border-slate-900">
                          <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-900">PROCURING ENTITY:</td>
                          <td className="p-1.5 font-bold">{selectedProject.procuringEntity}</td>
                        </tr>
                        <tr className="border-b border-slate-900">
                          <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-900">OFFICE ADDRESS / SITE:</td>
                          <td className="p-1.5">{selectedProject.procuringEntityAddress || selectedProject.location || 'Philippines'}</td>
                        </tr>
                        <tr className="border-b border-slate-900">
                          <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-900">APPROVED BUDGET (ABC):</td>
                          <td className="p-1.5 font-mono font-bold text-emerald-900">
                            {formatPhpCurrency(selectedProject.approvedBudget || 0)}
                            <span className="block text-[9.5px] font-serif font-normal italic text-slate-700">
                              ({numberToWords(selectedProject.approvedBudget || 0)})
                            </span>
                          </td>
                        </tr>
                        <tr className="border-b border-slate-900">
                          <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-900">CATEGORY & REGIME:</td>
                          <td className="p-1.5">{selectedProject.procurementType} • {selectedProject.legalRegime === 'RA_12009_NGPA' ? 'RA 12009 (NGPA)' : 'RA 9184'}</td>
                        </tr>
                        <tr className="border-b border-slate-900">
                          <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-900">SUBMISSION DEADLINE:</td>
                          <td className="p-1.5 font-mono font-bold text-red-900">
                            {selectedProject.submissionDeadlineDatetime ? selectedProject.submissionDeadlineDatetime.replace('T', ' ') : selectedProject.submissionDeadline}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-900">BID VALIDITY & SECURITY:</td>
                          <td className="p-1.5">120 Calendar Days • Bid Securing Declaration (BSD) / Cash / Surety Bond</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Signatory Footer */}
                    <div className="pt-6 flex items-end justify-between">
                      <div className="text-[9px] font-mono text-slate-600">
                        <p>Certified Project Identification Profile</p>
                        <p>Generated by BiDOCS Bidding Automation System</p>
                      </div>

                      <div className="text-center font-serif min-w-[220px]">
                        <div className="border-b border-slate-900 pb-0.5 mb-1 font-bold text-[11px]">
                          {currentTenant?.authorizedSignatory?.name || 'AUTHORIZED SIGNATORY'}
                        </div>
                        <p className="text-[10px] text-slate-700">{currentTenant?.authorizedSignatory?.title || 'President / General Manager'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 space-y-3">
              <Briefcase className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Project Selected</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Select a project profile from the list or create a new one to manage procurement specifications, ABC benchmarks, and timeline milestones.
              </p>
              <button
                onClick={handleOpenNewProjectModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Project Profile</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 4. MODAL: CREATE / EDIT PROJECT PROFILE                             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl space-y-4 p-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isEditing ? 'Edit Project Profile' : 'Create New Project Profile'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Enter bidding parameters, ABC details, and BAC Procuring Entity specifications.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddEditModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Project Title */}
              <div>
                <label className="block text-slate-400 font-mono mb-1">PROJECT TITLE / CONTRACT NAME *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Supply and Delivery of IT Equipment for Regional Offices"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Ref Numbers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">PHILGEPS REF NO. *</label>
                  <input
                    type="text"
                    value={formPhilgepsRefNo}
                    onChange={(e) => setFormPhilgepsRefNo(e.target.value)}
                    placeholder="PhilGEPS-13207699"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">SOLICITATION / ITB NO.</label>
                  <input
                    type="text"
                    value={formSolNo}
                    onChange={(e) => setFormSolNo(e.target.value)}
                    placeholder="ITB-2026-004"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">PROJECT REF NO.</label>
                  <input
                    type="text"
                    value={formProjRefNo}
                    onChange={(e) => setFormProjRefNo(e.target.value)}
                    placeholder="PROJECT-REF-01"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* Category, Sector, Regime */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">PROCUREMENT CATEGORY</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="GOODS">Goods & Supply</option>
                    <option value="INFRASTRUCTURE">Infrastructure</option>
                    <option value="CONSULTING_SERVICES">Consulting Services</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">SECTOR</label>
                  <select
                    value={formSector}
                    onChange={(e) => setFormSector(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Government">Government / Public</option>
                    <option value="Private">Private Commercial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">LEGAL REGIME</label>
                  <select
                    value={formRegime}
                    onChange={(e) => setFormRegime(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="RA_9184">RA 9184 (Standard)</option>
                    <option value="RA_12009_NGPA">RA 12009 (New NGPA)</option>
                  </select>
                </div>
              </div>

              {/* ABC (Budget) */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-emerald-400 font-mono font-bold">APPROVED BUDGET FOR THE CONTRACT (ABC in PHP) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₱</span>
                  <input
                    type="text"
                    value={formAbcInput}
                    onChange={(e) => {
                      setFormAbcInput(e.target.value);
                      setFormAbc(parsePhpCurrency(e.target.value));
                    }}
                    placeholder="1,500,000.00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-white font-mono font-bold text-sm"
                  />
                </div>
                <p className="text-[11px] font-serif italic text-slate-400">
                  Amount in words: {numberToWords(formAbc || parsePhpCurrency(formAbcInput))}
                </p>
              </div>

              {/* Procuring Entity Details */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-blue-400 font-mono uppercase">
                  Procuring Entity & BAC Secretariat
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">PROCURING ENTITY NAME *</label>
                    <input
                      type="text"
                      value={formEntityName}
                      onChange={(e) => setFormEntityName(e.target.value)}
                      placeholder="e.g. Provincial Government of Bohol"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">OFFICE ADDRESS / LOCATION</label>
                    <input
                      type="text"
                      value={formEntityAddress}
                      onChange={(e) => setFormEntityAddress(e.target.value)}
                      placeholder="e.g. Capitol Complex, Tagbilaran City"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">BAC CONTACT PERSON</label>
                    <input
                      type="text"
                      value={formEntityContactPerson}
                      onChange={(e) => setFormEntityContactPerson(e.target.value)}
                      placeholder="e.g. Atty. Juan Santos"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">CONTACT NUMBER</label>
                    <input
                      type="text"
                      value={formEntityContactNumber}
                      onChange={(e) => setFormEntityContactNumber(e.target.value)}
                      placeholder="e.g. (038) 411-2000"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">OFFICIAL EMAIL</label>
                    <input
                      type="email"
                      value={formEntityEmail}
                      onChange={(e) => setFormEntityEmail(e.target.value)}
                      placeholder="bac@bohol.gov.ph"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Timelines */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">PRE-BID DATE & TIME</label>
                  <input
                    type="datetime-local"
                    value={formPreBidDate}
                    onChange={(e) => setFormPreBidDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-red-400 font-mono mb-1 font-bold">SUBMISSION DEADLINE *</label>
                  <input
                    type="datetime-local"
                    value={formDeadlineDate}
                    onChange={(e) => setFormDeadlineDate(e.target.value)}
                    className="w-full bg-slate-950 border border-red-500/50 rounded-xl px-2.5 py-1.5 text-white text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">BID OPENING DATE</label>
                  <input
                    type="datetime-local"
                    value={formBidOpeningDate}
                    onChange={(e) => setFormBidOpeningDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white text-xs font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-400 font-mono mb-1">PROJECT NOTES & SPECIFICATIONS</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Additional project notes, scope items, or special instructions..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddEditModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProjectProfile}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Project Profile</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ProjectProfileView;

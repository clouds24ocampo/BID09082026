import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  FolderKanban,
  FileCheck,
  AlertTriangle,
  TrendingUp,
  Search,
  Plus,
  ArrowUpRight,
  Clock,
  Award,
  ShieldCheck,
  CheckCircle2,
  Layers,
  FileStack,
  ChevronRight
} from 'lucide-react';

import { loadVaultItems } from '../../utils/vaultIndexedDB';
import { SpotlightCard } from '../common/SpotlightCard';
import { BorderBeam } from '../common/BorderBeam';
import { HoloBadge3D } from '../common/HoloBadge3D';

interface DashboardViewProps {
  setActiveTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ setActiveTab }) => {
  const { currentTenant, currentUser } = useAuth();
  const activeTenantId = currentTenant?.id || '';

  const [vaultItems, setVaultItems] = React.useState<any[]>([]);

  // Load vault items from IndexedDB for active tenant
  React.useEffect(() => {
    loadVaultItems(activeTenantId).then((items) => {
      setVaultItems(items || []);
    }).catch(() => {
      const saved = localStorage.getItem(`bidocs_vault_items_${activeTenantId}`);
      if (saved) {
        try {
          setVaultItems(JSON.parse(saved));
        } catch (_) {
          setVaultItems([]);
        }
      } else {
        setVaultItems([]);
      }
    });
  }, [activeTenantId]);

  const opportunities = React.useMemo(() => {
    const saved = localStorage.getItem(`bidocs_opportunities_${activeTenantId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {
        return [];
      }
    }
    return [];
  }, [activeTenantId]);

  const totalAbc = React.useMemo(() => {
    return opportunities.reduce((acc: number, op: any) => acc + (op.approvedBudget || 0), 0);
  }, [opportunities]);

  const expiringDocs = React.useMemo(() => {
    return vaultItems.filter((doc: any) => doc.status === 'EXPIRING_SOON' || (doc.expiryDate && new Date(doc.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));
  }, [vaultItems]);

  const brandColor = currentTenant?.brandColor || '#1e40af';

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Welcome & Tenant Banner — HORIZONX / REACTBITS 3D GLOW BANNER */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-700/60 bg-gradient-to-br from-slate-900/90 via-[#0b1020]/95 to-slate-900/90 shadow-2xl p-6 sm:p-8">
        <BorderBeam size={260} duration={9} colorFrom={brandColor} colorTo="#8b5cf6" borderWidth={1.8} />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-1 rounded-md text-xs font-mono font-bold text-white shadow-lg"
                style={{ 
                  backgroundColor: brandColor,
                  boxShadow: `0 0 15px -3px ${brandColor}70`
                }}
              >
                {currentTenant?.brandCode || 'BIDOCS'}
              </span>
              <span className="text-xs text-slate-300 font-mono">
                TIN: {currentTenant?.tin || 'Not Configured'}
              </span>
              <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-slate-600" />
              <span className="hidden sm:inline text-xs text-emerald-400 font-mono font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                SYSTEM ONLINE
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Welcome back, <span className="text-shimmer">{currentUser?.fullName || 'User'}</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Enterprise workspace for <strong className="text-white font-semibold">{currentTenant?.companyName || 'Your Company'}</strong>. Operating under Philippine Republic Act 12009 (New Government Procurement Act) with certified 3-copy sealed package automation.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                onClick={() => setActiveTab('opportunities')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-xl transition-all duration-200 flex items-center gap-2 hover:opacity-95 hover:scale-[1.02] cursor-pointer"
                style={{ 
                  backgroundColor: brandColor,
                  boxShadow: `0 0 25px -5px ${brandColor}60`
                }}
              >
                <Search className="w-4 h-4" />
                <span>Explore PhilGEPS Bids</span>
              </button>
              <button
                onClick={() => setActiveTab('vault')}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 transition flex items-center gap-2 cursor-pointer shadow"
              >
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Upload Document to Vault</span>
              </button>
            </div>
          </div>

          {/* Interactive 3D Holographic Emblem Badge */}
          <div className="shrink-0 hidden md:block">
            <HoloBadge3D
              brandColor={brandColor}
              companyName={currentTenant?.companyName}
              brandCode={currentTenant?.brandCode}
              subText="RA 12009 NGPA Standard"
            />
          </div>
        </div>
      </div>

      {/* Metrics Cards — REACTBITS SPOTLIGHT CARDS WITH 3D TILT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Metric 1: Active Bidding Projects */}
        <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.22)" className="p-5 rounded-2xl glass-card-3d space-y-3 cursor-pointer" onClick={() => setActiveTab('opportunities')}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Active Bidding Projects</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_12px_-2px_rgba(59,130,246,0.3)]">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white tracking-tight">{opportunities.length} <span className="text-sm font-normal text-slate-400">Projects</span></span>
            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${opportunities.length > 0 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
              {opportunities.length > 0 ? 'ACTIVE' : 'READY'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">PhilGEPS Bids in Pipeline</p>
        </SpotlightCard>

        {/* Metric 2: Total ABC Pipeline Value */}
        <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.22)" className="p-5 rounded-2xl glass-card-3d space-y-3 cursor-pointer" onClick={() => setActiveTab('opportunities')}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Total ABC Pipeline Value</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_-2px_rgba(16,185,129,0.3)]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white tracking-tight">
              {totalAbc > 0 ? `₱${(totalAbc / 1000000).toFixed(1)}M` : '₱0.00'}
            </span>
            <span className="text-xs text-emerald-400 font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
              BUDGET
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">Sum of Target Contracts</p>
        </SpotlightCard>

        {/* Metric 3: Document Vault Items */}
        <SpotlightCard spotlightColor="rgba(168, 85, 247, 0.22)" className="p-5 rounded-2xl glass-card-3d space-y-3 cursor-pointer" onClick={() => setActiveTab('vault')}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Document Vault Items</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_12px_-2px_rgba(168,85,247,0.3)]">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white tracking-tight">{vaultItems.length} <span className="text-sm font-normal text-slate-400">Files</span></span>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${expiringDocs.length > 0 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'}`}>
              {expiringDocs.length > 0 ? `${expiringDocs.length} EXPIRING` : 'UP TO DATE'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">Class A & Statutory Exhibits</p>
        </SpotlightCard>

        {/* Metric 4: Compliance Pass Rate */}
        <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.22)" className="p-5 rounded-2xl glass-card-3d space-y-3 cursor-pointer" onClick={() => setActiveTab('bids')}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Compliance Rating</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_12px_-2px_rgba(245,158,11,0.3)]">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white tracking-tight">100%</span>
            <span className="text-xs text-amber-400 font-bold font-mono px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
              GPPB PASS
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">3-Copy Format Ready</p>
        </SpotlightCard>

      </div>

      {/* Critical Expiry Warning Banner (Only rendered if documents are expiring) */}
      {expiringDocs.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-amber-400">Action Required: {expiringDocs.length} Compliance Document(s) Expiring</p>
              <p className="text-slate-300">{expiringDocs[0]?.documentName} requires renewal in the Vault.</p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('vault')}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition flex items-center gap-1.5 shrink-0"
          >
            <span>Update Vault Version</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Two Column Section: Recent Opportunities & Active Bids */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Active Bids in Preparation */}
        <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.15)" className="lg:col-span-7 glass-card-3d p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-blue-400" />
                Active Bid Envelopes in Workspace
              </h2>
              <p className="text-[11px] text-slate-400">Envelope 1 (Eligibility & Technical) + Envelope 2 (Financial)</p>
            </div>
            <button
              onClick={() => setActiveTab('bids')}
              className="text-xs text-blue-400 hover:text-blue-300 transition flex items-center gap-1 cursor-pointer font-semibold"
            >
              <span>Manage Bids</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {opportunities.length === 0 ? (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-3 relative overflow-hidden">
                <BorderBeam size={180} duration={12} colorFrom="#3b82f6" colorTo="#8b5cf6" borderWidth={1.2} />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" />
                    Interactive Bid Assembly Guide (RA 12009 / RA 9184)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-mono font-bold border border-blue-500/30">Ready to Assemble</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Start by depositing your company’s statutory documents into the Vault, logging a PhilGEPS opportunity, and assembling your sealed 3-copy package (Original, Copy 1, Copy 2).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    onClick={() => setActiveTab('vault')}
                    className="p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-left transition-all duration-200 group cursor-pointer hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-950/30"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white group-hover:text-blue-400">
                      <span>1. Document Vault</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Upload DOC-1 to DOC-15 Class A items</p>
                  </button>
                  <button
                    onClick={() => setActiveTab('opportunities')}
                    className="p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-left transition-all duration-200 group cursor-pointer hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-950/30"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white group-hover:text-emerald-400">
                      <span>2. PhilGEPS Bids</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Find & track procurement opportunities</p>
                  </button>
                  <button
                    onClick={() => setActiveTab('forms')}
                    className="p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-left transition-all duration-200 group cursor-pointer hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-950/30"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white group-hover:text-purple-400">
                      <span>3. Legal Forms</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Generate BSD, OSS & Bid Forms</p>
                  </button>
                  <button
                    onClick={() => setActiveTab('bids')}
                    className="p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-left transition-all duration-200 group cursor-pointer hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-950/30"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white group-hover:text-amber-400">
                      <span>4. Build Bid Package</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Compile 3-copy sealed package in 1 click</p>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {opportunities.slice(0, 3).map((bid: any) => (
                <div
                  key={bid.id}
                  onClick={() => setActiveTab('bids')}
                  className="p-4 rounded-xl glass-card border border-slate-800 hover:border-slate-700 transition-all duration-200 cursor-pointer space-y-2 group hover:scale-[1.01]"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-mono text-[10px] font-semibold border border-blue-500/20">
                        {bid.procurementType}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-semibold border border-emerald-500/20">
                        {bid.legalRegime === 'RA_12009_NGPA' ? 'RA 12009 NGPA' : 'RA 9184 Legacy'}
                      </span>
                    </div>
                    <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Deadline: {new Date(bid.submissionDeadline).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-white group-hover:text-blue-400 transition leading-snug">
                    {bid.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">{bid.procuringEntity}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                    <span className="font-mono font-semibold text-slate-200">
                      ABC: ₱{(bid.approvedBudget || 0).toLocaleString()}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Workspace Ready
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SpotlightCard>

        {/* Right: PhilGEPS Feed */}
        <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.15)" className="lg:col-span-5 glass-card-3d p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-400" />
                Target Opportunities Overview
              </h2>
              <p className="text-[11px] text-slate-400">Tracked public bidding notices</p>
            </div>
            <button
              onClick={() => setActiveTab('opportunities')}
              className="text-xs text-blue-400 hover:text-blue-300 transition cursor-pointer font-semibold"
            >
              View All
            </button>
          </div>

          {opportunities.length === 0 ? (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-3 text-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Statutory Envelopes Standards
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">GPPB 6th Ed</span>
                </div>
                <div className="space-y-2 text-[11px] text-slate-300">
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-800/60 border border-slate-800">
                    <span className="w-2 h-2 rounded-full bg-blue-400 mt-1 shrink-0 animate-pulse-dot" />
                    <div>
                      <strong className="text-white block">Envelope 1: Legal & Technical</strong>
                      <span className="text-slate-400 text-[10px]">Class A (DOC-1 to DOC-15), Bid Securing, OSS, Manpower, Equipment</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-800/60 border border-slate-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0 animate-pulse-dot" />
                    <div>
                      <strong className="text-white block">Envelope 2: Financial Proposal</strong>
                      <span className="text-slate-400 text-[10px]">Bid Form, Price Schedule (Goods/Infra), BOQ, Cash Flow by Quarter</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('opportunities')}
                  className="w-full py-3 rounded-xl text-xs font-bold text-white shadow-xl transition-all duration-200 flex items-center justify-center gap-2 hover:opacity-95 hover:scale-[1.01] cursor-pointer"
                  style={{ 
                    backgroundColor: brandColor,
                    boxShadow: `0 0 25px -5px ${brandColor}60`
                  }}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Explore & Log Target Opportunity</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              {opportunities.slice(0, 3).map((op: any) => (
                <div key={op.id} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 hover:border-slate-700 transition">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono text-slate-400 font-semibold">{op.philgepsRefNo}</span>
                    <span className="text-amber-400 font-medium">{op.procurementType}</span>
                  </div>
                  <p className="font-semibold text-slate-200 leading-snug">{op.title}</p>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60">
                    <span className="text-slate-400 truncate max-w-[160px]">{op.procuringEntity}</span>
                    <span className="font-mono font-bold text-emerald-400">₱{(op.approvedBudget || 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SpotlightCard>

      </div>

    </div>
  );
};

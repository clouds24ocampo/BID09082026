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
  ShieldCheck,
  Building2,
  Clock,
  Award,
  FileText
} from 'lucide-react';

import { loadVaultItems } from '../../utils/vaultIndexedDB';

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
      setVaultItems(saved ? JSON.parse(saved) : []);
    });
  }, [activeTenantId]);

  const opportunities = React.useMemo(() => {
    const saved = localStorage.getItem(`bidocs_opportunities_${activeTenantId}`);
    return saved ? JSON.parse(saved) : [];
  }, [activeTenantId]);

  const totalAbc = React.useMemo(() => {
    return opportunities.reduce((acc: number, op: any) => acc + (op.approvedBudget || 0), 0);
  }, [opportunities]);

  const expiringDocs = React.useMemo(() => {
    return vaultItems.filter((doc: any) => doc.status === 'EXPIRING_SOON' || (doc.expiryDate && new Date(doc.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));
  }, [vaultItems]);

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Welcome & Tenant Banner */}
      <div
        className="p-6 sm:p-8 rounded-2xl relative overflow-hidden shadow-2xl border border-slate-800"
        style={{
          background: `linear-gradient(135deg, ${currentTenant?.brandColor || '#1e40af'}25 0%, rgba(15, 23, 42, 0.9) 100%)`
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="px-2.5 py-1 rounded-md text-xs font-mono font-bold text-white shadow"
                style={{ backgroundColor: currentTenant?.brandColor || '#1e40af' }}
              >
                {currentTenant?.brandCode || 'BIDOCS'}
              </span>
              <span className="text-xs text-slate-300 font-medium">
                TIN: {currentTenant?.tin || 'Not Configured'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Welcome back, {currentUser?.fullName || 'User'}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Workspace overview for <span className="font-semibold text-white">{currentTenant?.companyName || 'Your Company'}</span>. System active under Philippine RA 12009 (NGPA) transition guidelines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('opportunities')}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition flex items-center gap-2 hover:opacity-90"
              style={{ backgroundColor: currentTenant?.brandColor || '#1e40af' }}
            >
              <Search className="w-4 h-4" />
              <span>Explore PhilGEPS Bids</span>
            </button>
            <button
              onClick={() => setActiveTab('vault')}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Metric 1 */}
        <div className="glass-panel p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Bidding Projects</span>
            <FolderKanban className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white">{opportunities.length} Projects</span>
            <span className="text-xs text-emerald-400 font-medium">{opportunities.length > 0 ? 'Active' : 'Empty'}</span>
          </div>
          <p className="text-[11px] text-slate-400">PhilGEPS Bids Logged</p>
        </div>

        {/* Metric 2 */}
        <div className="glass-panel p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total ABC Pipeline Value</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white">
              {totalAbc > 0 ? `₱${(totalAbc / 1000000).toFixed(1)}M` : '₱0.00'}
            </span>
            <span className="text-xs text-emerald-400 font-medium">Approved Budget</span>
          </div>
          <p className="text-[11px] text-slate-400">Sum of Target Contracts</p>
        </div>

        {/* Metric 3 */}
        <div className="glass-panel p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Document Vault Items</span>
            <FileCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white">{vaultItems.length} Files</span>
            <span className={`text-xs font-medium ${expiringDocs.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {expiringDocs.length > 0 ? `${expiringDocs.length} Expiring Soon` : 'Up to date'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Compliance & Legal Permits</p>
        </div>

        {/* Metric 4 */}
        <div className="glass-panel p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Historical Win Rate</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white">0.0%</span>
            <span className="text-xs text-slate-400 font-medium">No Bids Submitted</span>
          </div>
          <p className="text-[11px] text-slate-400">Ready for First Award</p>
        </div>

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
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white">Active Bid Envelopes in Workspace</h2>
              <p className="text-[11px] text-slate-400">Envelope 1 (Eligibility & Technical) + Envelope 2 (Financial)</p>
            </div>
            <button
              onClick={() => setActiveTab('bids')}
              className="text-xs text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>Manage Bids</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {opportunities.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl space-y-3">
              <FolderKanban className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No active bid packages assembled yet.</p>
              <button
                onClick={() => setActiveTab('opportunities')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow"
                style={{ backgroundColor: currentTenant?.brandColor || '#1e40af' }}
              >
                Log Bidding Opportunity
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {opportunities.slice(0, 3).map((bid: any) => (
                <div
                  key={bid.id}
                  onClick={() => setActiveTab('bids')}
                  className="p-4 rounded-xl glass-card border border-slate-800 hover:border-slate-700 transition cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono text-[10px] font-semibold">
                        {bid.procurementType}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-semibold">
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
                    <span className="text-[11px] font-medium text-emerald-400">
                      Workspace Ready
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: PhilGEPS Feed */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white">Target Opportunities Overview</h2>
              <p className="text-[11px] text-slate-400">Tracked public bidding notices</p>
            </div>
            <button
              onClick={() => setActiveTab('opportunities')}
              className="text-xs text-blue-400 hover:underline"
            >
              View All
            </button>
          </div>

          {opportunities.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl space-y-3">
              <Search className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No opportunities tracked in workspace.</p>
              <button
                onClick={() => setActiveTab('opportunities')}
                className="text-xs text-blue-400 font-semibold hover:underline"
              >
                + Log an opportunity
              </button>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              {opportunities.slice(0, 3).map((op: any) => (
                <div key={op.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono text-slate-400">{op.philgepsRefNo}</span>
                    <span className="text-amber-400 font-medium">{op.procurementType}</span>
                  </div>
                  <p className="font-semibold text-slate-200 leading-snug">{op.title}</p>
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-400 truncate max-w-[160px]">{op.procuringEntity}</span>
                    <span className="font-mono font-bold text-emerald-400">₱{(op.approvedBudget || 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

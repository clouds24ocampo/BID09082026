import React from 'react';
import { FrontEnd3DShowcaseView } from '../3d/FrontEnd3DShowcaseView';
import {
  ShieldCheck,
  FileCheck2,
  Cpu,
  Layers,
  Sparkles,
  ArrowRight,
  Lock,
  Globe2,
  Building2,
  FileText,
  Boxes,
  CheckCircle,
  ExternalLink,
  Zap
} from 'lucide-react';

interface LandingWebsiteViewProps {
  onEnterApp: () => void;
  onLogin: () => void;
  onRegister: () => void;
}

export const LandingWebsiteView: React.FC<LandingWebsiteViewProps> = ({
  onEnterApp,
  onLogin,
  onRegister
}) => {
  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* 1. TOP GLOBAL NAVIGATION */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#030712]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-cyan-500 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.4)]">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-white">BiDOCS</span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded-full">
                  v2026.1
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">Quantum Cloud Corporation • Philippine Gov Bidding</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#3d-showcase" className="hover:text-cyan-400 transition-colors">3D Front-End Engine</a>
            <a href="#statutory-features" className="hover:text-cyan-400 transition-colors">RA 12009 Compliance</a>
            <a href="#packaging-standard" className="hover:text-cyan-400 transition-colors">Three-Layer Packaging</a>
            <a href="#node-backend" className="hover:text-cyan-400 transition-colors">Node.js API</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onLogin}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onEnterApp}
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-[0_0_20px_rgba(0,240,255,0.35)] transition-all flex items-center gap-1.5"
            >
              <span>Launch Bidding Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-mono font-medium shadow-[0_0_15px_rgba(0,240,255,0.15)]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Generation Philippine Public Procurement Architecture</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Immersive 3D Procurement &amp; Statutory Bidding Engine
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Engineered for <span className="text-white font-semibold">Quantum Cloud Corporation</span> under Republic Act No. 12009 (NGPA) &amp; RA 9184. Automated Three-Layer packaging, PhilGEPS radar, and zero-defect legal PDF compliance.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={onEnterApp}
              className="px-7 py-3.5 rounded-xl font-bold text-sm bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-[0_0_25px_rgba(0,240,255,0.4)] transition-all flex items-center gap-2"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Enter BiDOCS Enterprise Portal</span>
            </button>

            <button
              onClick={onRegister}
              className="px-7 py-3.5 rounded-xl font-semibold text-sm bg-slate-900/90 hover:bg-slate-800 text-white border border-white/15 transition-all flex items-center gap-2"
            >
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>Onboard New Tenant Company</span>
            </button>
          </div>
        </div>

        {/* 3. 3D SHOWCASE VIEWPORT COMPONENT */}
        <div id="3d-showcase" className="mt-14">
          <FrontEnd3DShowcaseView isStandalone={true} />
        </div>
      </section>

      {/* 4. TELEMETRY STATS GRID */}
      <section className="py-12 border-y border-white/10 bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center md:text-left">
            <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-500 font-mono">
              ₱107.45M
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mt-1">
              Active PhilGEPS ABC Tracked
            </div>
          </div>

          <div className="text-center md:text-left">
            <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-teal-500 font-mono">
              100.0%
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mt-1">
              RA 12009 Statutory Verification
            </div>
          </div>

          <div className="text-center md:text-left">
            <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-linear-to-r from-amber-400 to-orange-500 font-mono">
              27 Forms
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mt-1">
              GPPB Standard Form Templates
            </div>
          </div>

          <div className="text-center md:text-left">
            <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-linear-to-r from-violet-400 to-purple-500 font-mono">
              0.0 px
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mt-1">
              Zero-Whitespace Auto-Fit Standard
            </div>
          </div>
        </div>
      </section>

      {/* 5. ARCHITECTURAL PILLARS */}
      <section id="statutory-features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-mono text-cyan-400 tracking-widest uppercase">ENGINEERED FOR PHILIPPINE LAW</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Full-Spectrum Procurement Compliance</h2>
          <p className="text-slate-400 text-sm">
            Transitioning seamlessly from RA 9184 (2016 IRR) to Republic Act No. 12009 (New Government Procurement Act).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="p-8 rounded-2xl bg-linear-to-b from-slate-900/90 to-slate-950 border border-white/10 hover:border-cyan-500/40 transition-all shadow-xl group">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Three-Layer Packaging Standard</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Automated assembly of Original, Copy 1, and Copy 2 bid submissions. Strictly enforces statutory separation between Technical (Envelope 1) and Financial (Envelope 2) components.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-2xl bg-linear-to-b from-slate-900/90 to-slate-950 border border-white/10 hover:border-emerald-500/40 transition-all shadow-xl group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Zero-Whitespace PDF Engine</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Dynamically balanced table packing for legal 8.5" x 13" paper. Guarantees 100% page utilization, zero orphaned rows, and tamper-evident SHA-256 QR codes.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-2xl bg-linear-to-b from-slate-900/90 to-slate-950 border border-white/10 hover:border-violet-500/40 transition-all shadow-xl group">
            <div className="w-12 h-12 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-6 group-hover:scale-110 transition-transform">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Node.js Enterprise Backend</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Express server powering real-time PhilGEPS ingestion, document vault integrity monitoring, and statutory package validation with resilient port fallback.
            </p>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION FOOTER */}
      <footer className="border-t border-white/10 bg-slate-950/80 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Boxes className="w-3.5 h-3.5" />
            </div>
            <span>BiDOCS • Quantum Cloud Corporation • La Trinidad, Benguet, Philippines</span>
          </div>
          <div className="font-mono">
            Governing Law: RA 12009 (NGPA) / RA 9184 • GPPB Res. No. 02-2025
          </div>
        </div>
      </footer>
    </div>
  );
};

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Boxes,
  Building2,
  CheckCircle2,
  FileCheck,
  FileStack,
  FolderKanban,
  LockKeyhole,
  LogIn,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LandingWebsiteViewProps {
  onEnterApp?: () => void;
  onLogin: () => void;
  onRegister: () => void;
}

const FEATURES = [
  {
    icon: FileStack,
    title: '27+ statutory forms, generated',
    body: 'Omnibus Sworn Statement, Bid Securing Declaration, BOQ, Price Schedule, Cash Flow and more, filled from your company profile and laid out on Legal paper.',
    span: 'lg:col-span-2',
    accent: 'from-cyan-500/20',
  },
  {
    icon: FolderKanban,
    title: '3-copy sealed packages',
    body: 'Compile ORIGINAL, COPY 1 and COPY 2 with covers, separators and QR verification in one pass.',
    span: '',
    accent: 'from-blue-500/20',
  },
  {
    icon: FileCheck,
    title: 'Document vault',
    body: 'Class A eligibility matrix with expiry tracking for permits, clearances, PCAB and audited statements.',
    span: '',
    accent: 'from-emerald-500/20',
  },
  {
    icon: Search,
    title: 'Opportunity finder',
    body: 'Track PhilGEPS opportunities and turn any of them into a project profile in one click.',
    span: '',
    accent: 'from-violet-500/20',
  },
  {
    icon: Wallet,
    title: 'Payment documents',
    body: 'Final-payment checklist with FRS, LMEC and billing forms aligned to the procuring entity requirements.',
    span: '',
    accent: 'from-amber-500/20',
  },
  {
    icon: LockKeyhole,
    title: 'Local-first, zero-leak',
    body: 'Everything runs in your browser or desktop app. Your documents are stored on your device, never uploaded.',
    span: 'md:col-span-2 lg:col-span-3',
    accent: 'from-cyan-500/20',
  },
] as const;

const STEPS = [
  { n: '01', title: 'Register your company', body: 'Brand code, TIN, PCAB and authorized signatory feed every form automatically.' },
  { n: '02', title: 'Fill the vault', body: 'Upload eligibility documents once; the matrix shows what is still missing.' },
  { n: '03', title: 'Build the bid package', body: 'Pick forms per envelope, review live previews, resolve gaps before export.' },
  { n: '04', title: 'Export sealed copies', body: 'Download a merged, QR-verified PDF set sized for Legal paper.' },
] as const;

const STATS = [
  { value: '27+', label: 'Generated forms' },
  { value: '3', label: 'Sealed copies per package' },
  { value: '8.5×13', label: 'Legal paper, edge to edge' },
  { value: '100%', label: 'Stored on your device' },
] as const;

export const LandingWebsiteView: React.FC<LandingWebsiteViewProps> = ({
  onEnterApp,
  onLogin,
  onRegister,
}) => {
  const { hasAccounts: hasRegisteredAccounts, currentUser, currentTenant } = useAuth();
  const isAuthenticated = Boolean(currentUser && currentTenant && hasRegisteredAccounts);
  const reduce = useReducedMotion();

  const primary = () => (isAuthenticated && onEnterApp ? onEnterApp() : onLogin());

  const reveal = (delay = 0) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.05 },
          transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans relative overflow-x-clip">
      {/* ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[720px] overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[520px] rounded-full bg-cyan-500/12 blur-[140px]" />
        <div className="absolute top-24 -right-40 w-[520px] h-[420px] rounded-full bg-blue-600/14 blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.05] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000,transparent)]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '30px 30px' }}
        />
      </div>

      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#030712]/75 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-6xl h-16 px-4 sm:px-6 flex items-center justify-between gap-3">
          <a href="#top" className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 shrink-0 rounded-xl bg-linear-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_22px_rgba(0,240,255,0.3)]">
              <Boxes className="w-5 h-5 text-white" />
            </span>
            <span className="font-black text-lg tracking-tight text-white">BiDOCS</span>
            <span className="hidden min-[420px]:inline px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded-full">
              v2026.1
            </span>
          </a>
          <nav aria-label="Sections" className="hidden md:flex items-center gap-7 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
            <a href="#compliance" className="hover:text-white transition-colors">Compliance</a>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={primary}
              className="min-h-10 px-3.5 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              {isAuthenticated ? 'Open workspace' : 'Sign in'}
            </button>
            {!isAuthenticated && (
              <button
                type="button"
                onClick={onRegister}
                className="min-h-10 px-4 rounded-xl text-sm font-bold text-slate-950 bg-linear-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-[0_0_18px_rgba(0,240,255,0.25)] transition-all cursor-pointer"
              >
                Get started
              </button>
            )}
          </div>
        </div>
      </header>

      <main id="top" className="relative z-10">
        {/* HERO */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-14 sm:pt-20 pb-10 text-center">
          <motion.div {...reveal()} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-white/10 text-[11px] font-mono font-medium text-slate-300 backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>RA 12009 (NGPA) &amp; RA 9184 Statutory System</span>
          </motion.div>

          <motion.h1 {...reveal(0.05)} className="mt-6 text-[2.5rem] leading-[1.05] sm:text-6xl lg:text-7xl font-black tracking-tight text-white text-balance">
            Statutory Procurement
            <span className="block bg-linear-to-r from-cyan-300 via-sky-400 to-blue-500 bg-clip-text text-transparent">
              Portal
            </span>
          </motion.h1>

          <motion.p {...reveal(0.1)} className="mt-5 mx-auto max-w-2xl text-base sm:text-lg text-slate-400 text-pretty">
            Secure document vault, 3-copy sealed envelope compiler, and automated bidding compliance
            for Philippine government procurement.
          </motion.p>

          {isAuthenticated && (
            <motion.div {...reveal(0.12)} className="mt-8 mx-auto max-w-xl p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <div className="min-w-0 text-xs">
                  <p className="text-slate-300 truncate">Active Session: <strong className="text-white">{currentUser?.fullName}</strong></p>
                  <p className="text-[11px] text-cyan-300 font-mono truncate">{currentTenant?.companyName} ({currentTenant?.brandCode})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onEnterApp || onLogin}
                className="w-full sm:w-auto min-h-10 px-4 rounded-xl text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Resume Active Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          <motion.div {...reveal(0.15)} className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <button
              type="button"
              onClick={primary}
              className="group min-h-12 px-6 rounded-xl text-sm font-bold text-white bg-slate-800/90 hover:bg-slate-700 border border-white/10 hover:border-cyan-500/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-cyan-400" />
              <span>{isAuthenticated ? 'Open Active Workspace' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              type="button"
              onClick={onRegister}
              className="group relative min-h-12 px-6 rounded-xl text-sm font-bold text-slate-950 bg-linear-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-[0_0_28px_rgba(0,240,255,0.28)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              <span>Create New Account</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              {!hasRegisteredAccounts && (
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-slate-950 text-cyan-300 border border-cyan-500/40 text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />Start here
                </span>
              )}
            </button>
          </motion.div>

          {/* PRODUCT PREVIEW */}
          <motion.div {...reveal(0.2)} aria-hidden className="relative mt-14 mx-auto max-w-4xl">
            <div className="absolute -inset-px rounded-3xl bg-linear-to-b from-cyan-400/40 via-white/5 to-transparent" />
            <div className="relative rounded-3xl bg-[#070b16] border border-white/10 p-3 sm:p-4 shadow-[0_40px_120px_-30px_rgba(6,182,212,0.35)] text-left">
              <div className="flex items-center gap-1.5 pb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-3 text-[10px] font-mono text-slate-500 truncate">bidocs / bid-packages / envelope-1</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  ['Eligibility', '10 / 11', 'text-emerald-300', 'w-[91%]', 'bg-emerald-400'],
                  ['Technical envelope', '18 forms', 'text-cyan-300', 'w-[72%]', 'bg-cyan-400'],
                  ['Financial envelope', '6 forms', 'text-blue-300', 'w-[54%]', 'bg-blue-400'],
                ].map(([k, v, c, w, bar]) => (
                  <div key={k} className="rounded-2xl border border-white/8 bg-white/3 p-4">
                    <p className="text-[11px] text-slate-400">{k}</p>
                    <p className={`mt-1 text-2xl font-black ${c}`}>{v}</p>
                    <div className="mt-3 h-1.5 rounded-full bg-white/8 overflow-hidden"><div className={`h-full rounded-full ${w} ${bar}`} /></div>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-2xl border border-white/8 bg-white/3 divide-y divide-white/5">
                {['Omnibus Sworn Statement', 'Bid Securing Declaration', 'Bill of Quantities', 'Cash Flow & Payment Schedule'].map((d, i) => (
                  <div key={d} className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs">
                    <span className="flex items-center gap-2.5 text-slate-200 min-w-0"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /><span className="truncate">{d}</span></span>
                    <span className="font-mono text-[10px] text-slate-500 shrink-0">{i % 2 ? 'COPY 1' : 'ORIGINAL'}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        {/* STATS */}
        <section aria-label="At a glance" className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-white/8 bg-white/8">
            {STATS.map((s) => (
              <div key={s.label} className="bg-[#050a14] px-5 py-6 text-center">
                <dt className="sr-only">{s.label}</dt>
                <dd className="text-3xl sm:text-4xl font-black text-white tabular-nums">{s.value}</dd>
                <p className="mt-1 text-xs text-slate-400">{s.label}</p>
              </div>
            ))}
          </dl>
        </section>

        {/* FEATURES */}
        <section id="features" className="mx-auto max-w-6xl px-4 sm:px-6 py-16 scroll-mt-20">
          <motion.div {...reveal()} className="max-w-2xl">
            <p className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">Everything in one workspace</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-white text-balance">From eligibility to final payment, without leaving the page.</h2>
          </motion.div>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.article
                  key={f.title}
                  {...reveal(i * 0.04)}
                  className={`group relative overflow-hidden rounded-2xl border border-white/8 bg-slate-900/50 p-6 hover:border-cyan-500/40 transition-colors ${f.span}`}
                >
                  <div aria-hidden className={`absolute -top-16 -right-16 w-48 h-48 rounded-full bg-linear-to-br ${f.accent} to-transparent blur-3xl opacity-60 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative">
                    <span className="inline-flex w-11 h-11 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-cyan-300">
                      <Icon className="w-5 h-5" />
                    </span>
                    <h3 className="mt-5 text-lg font-bold text-white">{f.title}</h3>
                    <p className="mt-2 text-sm text-slate-400 leading-relaxed">{f.body}</p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>

        {/* WORKFLOW */}
        <section id="workflow" className="mx-auto max-w-6xl px-4 sm:px-6 py-16 scroll-mt-20">
          <motion.div {...reveal()} className="max-w-2xl">
            <p className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">Workflow</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-white text-balance">Four steps to a submission-ready package.</h2>
          </motion.div>
          <ol className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((s, i) => (
              <motion.li key={s.n} {...reveal(i * 0.05)} className="rounded-2xl border border-white/8 bg-slate-900/40 p-6">
                <span className="font-mono text-sm font-bold text-cyan-400">{s.n}</span>
                <h3 className="mt-3 text-base font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{s.body}</p>
              </motion.li>
            ))}
          </ol>
        </section>

        {/* COMPLIANCE / CTA */}
        <section id="compliance" className="mx-auto max-w-6xl px-4 sm:px-6 py-16 scroll-mt-20">
          <motion.div {...reveal()} className="relative overflow-hidden rounded-3xl border border-cyan-500/25 bg-linear-to-br from-cyan-950/50 via-[#07101f] to-blue-950/40 p-8 sm:p-12 text-center">
            <div aria-hidden className="absolute -top-24 left-1/2 -translate-x-1/2 w-[480px] h-[260px] rounded-full bg-cyan-400/15 blur-[100px]" />
            <div className="relative">
              <ShieldCheck className="w-10 h-10 mx-auto text-cyan-300" />
              <h2 className="mt-5 text-3xl sm:text-4xl font-black tracking-tight text-white text-balance">Built for RA 9184 and RA 12009 (NGPA).</h2>
              <p className="mt-4 mx-auto max-w-xl text-slate-300 text-pretty">
                Dual-regime support with forms laid out for Legal paper, so your package looks the way the BAC expects it.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <button type="button" onClick={onRegister} className="min-h-12 px-7 rounded-xl text-sm font-bold text-slate-950 bg-linear-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 transition-all cursor-pointer">
                  Create New Account
                </button>
                <button type="button" onClick={primary} className="min-h-12 px-7 rounded-xl text-sm font-bold text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-colors cursor-pointer">
                  {isAuthenticated ? 'Open Active Workspace' : 'Sign In to Workspace'}
                </button>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-8 px-4 text-center text-slate-500 text-[11px] font-mono pb-[calc(2rem+env(safe-area-inset-bottom))]">
        BiDOCS Enterprise • Government Procurement Portal • Zero-Leak Local Storage
      </footer>
    </div>
  );
};

import React from 'react';
import { motion } from 'framer-motion';
import {
  Boxes,
  LogIn,
  Building2,
  ArrowRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LandingWebsiteViewProps {
  onEnterApp?: () => void;
  onLogin: () => void;
  onRegister: () => void;
}

export const LandingWebsiteView: React.FC<LandingWebsiteViewProps> = ({
  onLogin,
  onRegister
}) => {
  const { tenants } = useAuth();
  const hasRegisteredAccounts = Boolean(tenants && tenants.length > 0);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden select-none font-sans">
      {/* Subtle Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[450px] h-[300px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Subtle Grid Backdrop */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}
      />

      {/* Top Header / Brand Pill */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="pt-4 z-10"
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-white/10 text-[11px] font-mono font-medium text-slate-300 shadow-lg backdrop-blur-md">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>RA 12009 (NGPA) &amp; RA 9184 Statutory System</span>
        </div>
      </motion.div>

      {/* Main Centered Gateway Section */}
      <div className="w-full max-w-2xl my-auto py-8 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4 mb-8"
        >
          {/* Logo & Platform Name */}
          <div className="inline-flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_25px_rgba(0,240,255,0.35)]">
              <Boxes className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="font-black text-2xl tracking-tight text-white">BiDOCS</span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded-full">
                  v2026.1
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">Philippine Public Bidding Engine</p>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Statutory Procurement Portal
            </h1>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Secure document vault, 3-copy sealed envelope compiler, and automated bidding compliance.
            </p>
          </div>
        </motion.div>

        {/* The Two Direct Actions: Log In & Register */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {/* 1. LOG IN CARD */}
          <div
            onClick={onLogin}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onLogin();
              }
            }}
            className="group relative p-6 rounded-2xl bg-slate-900/70 hover:bg-slate-900/95 border border-white/10 hover:border-cyan-500/50 transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] cursor-pointer flex flex-col justify-between backdrop-blur-xl text-left"
          >
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                <LogIn className="w-5 h-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                  Log In
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Sign in to your registered corporate workspace, document vault, and active bid packages.
                </p>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLogin();
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-cyan-600/90 border border-white/10 group-hover:border-cyan-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Sign In to Workspace</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* 2. REGISTER CARD */}
          <div
            onClick={onRegister}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRegister();
              }
            }}
            className={`group relative p-6 rounded-2xl bg-slate-900/70 hover:bg-slate-900/95 border transition-all duration-300 shadow-xl cursor-pointer flex flex-col justify-between backdrop-blur-xl text-left ${
              !hasRegisteredAccounts
                ? 'border-cyan-500/40 ring-1 ring-cyan-500/30 hover:shadow-[0_0_35px_rgba(0,240,255,0.2)]'
                : 'border-white/10 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]'
            }`}
          >
            {!hasRegisteredAccounts && (
              <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-[10px] uppercase tracking-wider shadow-md flex items-center gap-1">
                <Sparkles className="w-3 h-3 fill-current" />
                <span>Start Here</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                  Register Company
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Onboard a new contractor or supplier entity, configure your brand skin, and initialize admin access.
                </p>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRegister();
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-[0_0_15px_rgba(0,240,255,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Create New Account</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Clean Minimalist Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="w-full max-w-2xl py-4 border-t border-white/5 text-center text-slate-500 text-[11px] font-mono z-10"
      >
        BiDOCS Enterprise • Government Procurement Portal • Zero-Leak Local Storage
      </motion.footer>
    </div>
  );
};

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { SceneBackground } from '../fx/SceneBackground';
import { UserRole } from '../../types';
import {
  Building2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Briefcase,
  FileCheck,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Rocket,
  Globe2,
  Radio,
  Compass
} from 'lucide-react';

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToRegister }) => {
  const { login, resetUserPassword, resetAllData, tenants } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('COMPANY_OWNER');
  const [selectedTenantId, setSelectedTenantId] = useState(tenants[0]?.id || '');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const activeTenantPreview = tenants.find((t) => t.id === selectedTenantId) || tenants[0] || {
    brandCode: 'ARTEMIS',
    brandColor: '#0284c7',
    companyName: 'Lunar Command Base'
  };

  const handleForgotPasswordReset = () => {
    let targetEmail = email.trim();
    if (!targetEmail) {
      const promptEmail = prompt('Please enter the Work Email Address of the specific account password you wish to reset:');
      if (!promptEmail || !promptEmail.trim()) {
        setError('Email address is required to reset password for a specific account.');
        return;
      }
      targetEmail = promptEmail.trim();
      setEmail(targetEmail);
    }

    resetUserPassword(targetEmail);
    setPassword('BiDOCS#2026');
    setError('');
    alert(`Password for account [${targetEmail}] has been reset to default: BiDOCS#2026.\n\nPlease log in first using BiDOCS#2026. You will be prompted to change your password immediately upon logging in.`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your work email address.');
      return;
    }

    setIsLoading(true);
    const success = login(email, password, selectedRole, selectedTenantId);
    setIsLoading(false);
    if (!success) {
      setError('Invalid email or password. Please check your credentials and try again.');
    }
  };

  return (
    <div className="auth-stage min-h-screen text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans select-none">

      {/* ================= 3D IMMERSIVE DEEP SPACE SCENE ================= */}
      <SceneBackground intensity="full" color={activeTenantPreview.brandColor || '#38bdf8'} />

      {/* ================= MAIN CONTENT GRID ================= */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">

        {/* Left Column: Mission Space Telemetry & Platform Features */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="login-hero lg:col-span-6 space-y-6 pr-0 lg:pr-6"
        >
          {/* Artemis Space Telemetry Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-cyan-500/40 text-xs font-mono font-medium text-cyan-300 backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>{activeTenantPreview.companyName || 'BiDOCS Enterprise'}</span>
          </div>

          <div className="space-y-3">
            <h1 className="login-title text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              BiDOCS <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">Vault</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Philippine Public Bidding & Procurement Architect.
            </p>
          </div>

          {/* Artemis Spec Feature Highlights */}
          <div className="space-y-3 pt-2">
            {[
              {
                icon: Globe2,
                color: 'text-cyan-400',
                bg: 'bg-cyan-500/10 border-cyan-500/20',
                title: 'White-Label Branding Module',
                desc: 'Instant company skinning (Logo, T.I.N., P.C.A.B. License,) per corporate entity.'
              },
              {
                icon: FileCheck,
                color: 'text-amber-400',
                bg: 'bg-amber-500/10 border-amber-500/20',
                title: 'Encrypted Vault & Expiry Alerts',
                desc: "Automated tracking for Mayor's Permit, Tax Clearance, SEC/DTI & PCAB certificates."
              },
              {
                icon: Briefcase,
                color: 'text-sky-400',
                bg: 'bg-sky-500/10 border-sky-500/20',
                title: 'Dual-Regime Transition Engine',
                desc: 'Supports legacy RA 9184 (2016 IRR) & current RA 12009 (NGPA GPPB Res 02-2025).'
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                whileHover={{ x: 8, scale: 1.02 }}
                className="mission-feature flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/50 backdrop-blur-md transition-all shadow-md"
              >
                <div className={`mt-0.5 p-2 rounded-lg border ${feature.bg} ${feature.color}`}>
                  <feature.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-100">{feature.title}</p>
                  <p className="text-xs text-slate-400">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right Column: Floating Mission Control Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="login-console-wrap lg:col-span-6"
        >
          <div className="login-console bg-slate-950/85 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl shadow-[0_0_70px_rgba(0,0,0,0.95)] border border-slate-800/90 space-y-6 relative overflow-hidden">

            {/* Top Accent Line */}
            <div
              className="absolute top-0 left-0 right-0 h-1 transition-colors duration-500"
              style={{ backgroundColor: activeTenantPreview.brandColor || '#0284c7' }}
            />

            {/* Form Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span>Mission Control</span>
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                </h2>
                <p className="text-xs text-slate-400">Access your Bid Operations Center</p>
              </div>

              {/* Active Tenant / Base Badge */}
              <motion.div
                layout
                className="px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-medium transition-all shadow-inner backdrop-blur-md"
                style={{
                  borderColor: `${activeTenantPreview.brandColor || '#0284c7'}60`,
                  backgroundColor: `${activeTenantPreview.brandColor || '#0284c7'}20`,
                  color: '#ffffff'
                }}
              >
                <Building2 className="w-3.5 h-3.5" style={{ color: activeTenantPreview.brandColor || '#38bdf8' }} />
                <span className="truncate max-w-[150px] font-semibold">
                  {tenants.length > 0 ? activeTenantPreview.companyName : 'Register Company Account'}
                </span>
              </motion.div>
            </div>

            {/* Error Message Alert */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Select Corporate Tenant */}
              {tenants.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono space-y-1 text-center">
                  <p className="font-bold">No Registered Companies Found</p>
                  <p className="text-[11px] text-slate-400">Click "Register New Company Account" below to onboard your entity.</p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase tracking-wider">
                    Target Corporate Command Unit
                  </label>
                  <div className="relative">
                    <select
                      value={selectedTenantId}
                      onChange={(e) => setSelectedTenantId(e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition appearance-none cursor-pointer"
                    >
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.companyName} ({t.brandCode}) - TIN: {t.tin}
                        </option>
                      ))}
                    </select>
                    <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* User Role Toggle Buttons */}
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase tracking-wider">
                  Operator Clearance Scope
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-900/90 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('COMPANY_OWNER')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all relative ${selectedRole === 'COMPANY_OWNER' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    {selectedRole === 'COMPANY_OWNER' && (
                      <motion.div
                        layoutId="activeRoleSpaceTravel"
                        className="absolute inset-0 bg-cyan-600 rounded-lg shadow-[0_0_12px_rgba(8,145,178,0.5)]"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">Company Owner</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('BID_MANAGER')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all relative ${selectedRole === 'BID_MANAGER' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    {selectedRole === 'BID_MANAGER' && (
                      <motion.div
                        layoutId="activeRoleSpaceTravel"
                        className="absolute inset-0 bg-cyan-600 rounded-lg shadow-[0_0_12px_rgba(8,145,178,0.5)]"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">Bid Manager</span>
                  </button>
                </div>
              </div>

              {/* Work Email Address */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Work Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.ph"
                    required
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    Access Key / Password
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPasswordReset}
                    className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline font-bold transition"
                  >
                    Reset password (BiDOCS#2026)?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-200 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Launch Button */}
              <motion.button
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white shadow-[0_0_25px_rgba(2,132,199,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden"
                style={{ backgroundColor: activeTenantPreview.brandColor || '#0284c7' }}
              >
                {isLoading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Engage Deep Space Workspace</span>
                    <Rocket className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Registration Switcher & System Reset */}
            <div className="pt-4 border-t border-slate-800/80 text-center space-y-2">
              <p className="text-xs text-slate-400">
                Need to register a new entity?{' '}
                <button
                  onClick={onSwitchToRegister}
                  className="font-semibold text-cyan-400 hover:text-cyan-300 underline focus:outline-none transition"
                >
                  Onboard Corporate Account
                </button>
              </p>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Permanently clear all registered companies, accounts, vault documents, and IndexedDB files to start a fresh company registration?')) {
                    resetAllData();
                    alert('All company data and storage have been completely wiped. Redirecting to clean Registration...');
                    onSwitchToRegister();
                  }
                }}
                className="text-[11px] font-mono text-slate-500 hover:text-amber-400 underline transition block mx-auto pt-1"
              >
                Purge All Systems & Start Fresh Registration
              </button>
            </div>

          </div>
        </motion.div>

      </div>
    </div>
  );
};
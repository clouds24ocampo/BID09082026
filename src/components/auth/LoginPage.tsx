import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  Building2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Briefcase,
  FileCheck
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

  const activeTenantPreview = tenants.find(t => t.id === selectedTenantId) || tenants[0] || {
    brandCode: 'BIDOCS',
    brandColor: '#1e40af',
    companyName: 'Your Business Entity'
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
    setTimeout(() => {
      const success = login(email, password, selectedRole, selectedTenantId);
      setIsLoading(false);
      if (!success) {
        setError('Invalid email or password. Please check your credentials and try again.');
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-[128px] opacity-20 pointer-events-none transition-colors duration-500"
        style={{ backgroundColor: activeTenantPreview.brandColor || '#1e40af' }}
      />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-[128px] pointer-events-none" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">

        {/* Left Column: System Value Proposition & Philippine Compliance Overview */}
        <div className="lg:col-span-6 space-y-6 pr-0 lg:pr-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-emerald-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span> Bidding document compliant </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Quantum <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Cloud</span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed">
              Philippine Public Bidding Management Platform engineered for government procurement bids across Goods, Infrastructure, and Consulting Services.
            </p>
          </div>

          {/* Core Highlights */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 text-slate-300">
              <div className="mt-1 p-1 rounded bg-blue-500/10 text-blue-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-200">White-Label Engine</p>
                <p className="text-xs text-slate-400">Instant company skinning (Logo, TIN, PCAB License, Brand Color) per business instance.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-slate-300">
              <div className="mt-1 p-1 rounded bg-amber-500/10 text-amber-400">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-200">Encrypted Document Vault & Expiry Alerts</p>
                <p className="text-xs text-slate-400">Automated tracking for Mayor's Permit, Tax Clearance, SEC/DTI & PCAB certificates.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-slate-300">
              <div className="mt-1 p-1 rounded bg-indigo-500/10 text-indigo-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-200">Dual-Regime Transition Engine</p>
                <p className="text-xs text-slate-400">Supports legacy RA 9184 (2016 IRR) & current RA 12009 (NGPA GPPB Res 02-2025).</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Login Form */}
        <div className="lg:col-span-6">
          <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-800 space-y-6">

            {/* Header & Dynamic Tenant Preview Badge */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Sign In</h2>
                <p className="text-xs text-slate-400">Access your  Bid Workspace</p>
              </div>

              {/* Active Tenant Badge Preview */}
              <div
                className="px-3 py-1.5 rounded-lg border flex items-center gap-2 text-xs font-medium transition-colors"
                style={{
                  borderColor: `${activeTenantPreview.brandColor || '#1e40af'}50`,
                  backgroundColor: `${activeTenantPreview.brandColor || '#1e40af'}15`,
                  color: '#ffffff'
                }}
              >
                <Building2 className="w-3.5 h-3.5" style={{ color: activeTenantPreview.brandColor || '#3b82f6' }} />
                <span className="truncate max-w-[150px] font-semibold">
                  {tenants.length > 0 ? activeTenantPreview.companyName : 'Register Company Account'}
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <span>⚠️ {error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Select Corporate Tenant */}
              {tenants.length === 0 ? (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-mono space-y-1 text-center">
                  <p className="font-bold">No Registered Companies Found</p>
                  <p className="text-[11px] text-slate-400">Click "Register New Company Account" below to register your business entity.</p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Select Registered Corporate Profile / Tenant
                  </label>
                  <div className="relative">
                    <select
                      value={selectedTenantId}
                      onChange={(e) => setSelectedTenantId(e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition appearance-none cursor-pointer"
                    >
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.companyName} ({t.brandCode}) - TIN: {t.tin}
                        </option>
                      ))}
                    </select>
                    <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Select Role */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  User Role Scope
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-slate-900/90 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('COMPANY_OWNER')}
                    className={`py-1.5 px-3 rounded-md text-xs font-medium transition ${selectedRole === 'COMPANY_OWNER'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    Company Owner
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('BID_MANAGER')}
                    className={`py-1.5 px-3 rounded-md text-xs font-medium transition ${selectedRole === 'BID_MANAGER'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    Bid Manager
                  </button>
                </div>
              </div>

              {/* Email Input */}
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
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    Password
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
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-9 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0" />
                  <span className="text-xs text-slate-400">Remember company session</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg text-sm font-semibold text-white shadow-lg transition flex items-center justify-center gap-2"
                style={{ backgroundColor: activeTenantPreview.brandColor || '#1e40af' }}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Log In to Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Registration Switcher & System Reset */}
            <div className="pt-4 border-t border-slate-800 text-center space-y-2">
              <p className="text-xs text-slate-400">
                Need to onboard a new business entity?{' '}
                <button
                  onClick={onSwitchToRegister}
                  className="font-semibold text-blue-400 hover:text-blue-300 underline focus:outline-none"
                >
                  Register New Company Account
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
                Purge All Data & Start Fresh Registration
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

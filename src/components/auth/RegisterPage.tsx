import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LegalRegime, ProcurementType, UserRole } from '../../types';
import {
  Building2,
  Palette,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Award,
  Briefcase,
  Sparkles,
  Zap,
  Lock,
  Cpu,
  Layers,
  Globe2
} from 'lucide-react';
import { AuroraBackground } from '../common/AuroraBackground';
import { BorderBeam } from '../common/BorderBeam';
import { ShinyText } from '../common/ShinyText';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

const PRESET_COLORS = [
  { name: 'Electric Blue', hex: '#1e40af', glow: 'rgba(30, 64, 175, 0.4)' },
  { name: 'Emerald Cyber', hex: '#059669', glow: 'rgba(5, 150, 105, 0.4)' },
  { name: 'Neon Violet', hex: '#7c3aed', glow: 'rgba(124, 58, 237, 0.4)' },
  { name: 'Crimson Solar', hex: '#dc2626', glow: 'rgba(220, 38, 38, 0.4)' },
  { name: 'Cyan Flux', hex: '#0d9488', glow: 'rgba(13, 148, 136, 0.4)' },
  { name: 'Solar Amber', hex: '#d97706', glow: 'rgba(217, 119, 6, 0.4)' },
];

export const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin }) => {
  const { registerTenantAndUser } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: User Account
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('COMPANY_OWNER');

  // Step 2: Corporate Identifiers
  const [companyName, setCompanyName] = useState('');
  const [brandCode, setBrandCode] = useState('');
  const [tin, setTin] = useState('');
  const [secDtiRegNo, setSecDtiRegNo] = useState('');
  const [pcabLicenseNo, setPcabLicenseNo] = useState('');
  const [pcabCategory, setPcabCategory] = useState('');
  const [philgepsPlatinumNo, setPhilgepsPlatinumNo] = useState('');
  const [address, setAddress] = useState('');

  // Step 3: White-Label Branding
  const [brandColor, setBrandColor] = useState('#1e40af');
  const [signatoryName, setSignatoryName] = useState('');
  const [signatoryTitle, setSignatoryTitle] = useState('President & Authorized Managing Officer');
  const [signatoryTin, setSignatoryTin] = useState('');

  // Step 4: Legal Regime & Procurement
  const [primaryProcurementType, setPrimaryProcurementType] = useState<ProcurementType>('INFRASTRUCTURE');
  const [preferredRegime, setPreferredRegime] = useState<LegalRegime>('RA_12009_NGPA');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickFillDemo = () => {
    registerTenantAndUser(
      {
        companyName: 'Apex Cloud & Infrastructure Builders Corp.',
        brandCode: 'APEX',
        brandColor: '#1e40af',
        tin: '008-991-234-000',
        secDtiRegNo: 'SEC-CS2019-94120',
        pcabLicenseNo: 'PCAB-GE-94120',
        pcabCategory: 'AAA',
        philgepsPlatinumNo: 'PLATINUM-2026-009841',
        address: '14th Floor, Cyber Tower One, Ortigas Center, Pasig City, Metro Manila',
        authorizedSignatory: {
          name: 'Engr. Ferdinand R. Valenzuela',
          title: 'President & Authorized Managing Officer',
          tin: '194-882-019'
        },
        preferredRegime: 'RA_12009_NGPA',
        primaryProcurementType: 'INFRASTRUCTURE'
      },
      {
        email: 'f.valenzuela@apexcloudph.com',
        fullName: 'Engr. Ferdinand R. Valenzuela',
        role: 'COMPANY_OWNER',
        password: 'Password123!'
      }
    );
  };

  const handleNext = () => {
    setError('');
    if (currentStep === 1) {
      if (!fullName || !email || !password) {
        setError('Please complete all personal account fields.');
        return;
      }
    } else if (currentStep === 2) {
      if (!companyName || !tin || !secDtiRegNo) {
        setError('Company Name, TIN, and SEC/DTI registration are required.');
        return;
      }
    } else if (currentStep === 3) {
      if (!signatoryName) {
        setError('Authorized Managing Officer / Signatory Name is required.');
        return;
      }
    }
    setCurrentStep((prev) => (prev < 4 ? ((prev + 1) as any) : prev));
  };

  const handleBack = () => {
    setError('');
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as any) : prev));
  };

  const handleCompleteRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const success = registerTenantAndUser(
      {
        companyName,
        brandCode: brandCode || companyName.substring(0, 4).toUpperCase(),
        brandColor,
        tin,
        secDtiRegNo,
        pcabLicenseNo: pcabLicenseNo || undefined,
        pcabCategory: pcabCategory || undefined,
        philgepsPlatinumNo: philgepsPlatinumNo || 'PLATINUM-2026-PENDING',
        address: address || '',
        authorizedSignatory: {
          name: signatoryName,
          title: signatoryTitle,
          tin: signatoryTin || tin || '000-000-000-000'
        },
        preferredRegime,
        primaryProcurementType
      },
      {
        email,
        fullName,
        role,
        password: password || undefined
      }
    );
    setIsSubmitting(false);
    if (!success) {
      setError('Registration failed. Please review your details.');
    }
  };

  const displayCompanyName = companyName.trim() || 'Your Enterprise Corp.';
  const displayBrandCode = (brandCode.trim() || companyName.substring(0, 4) || 'BID').toUpperCase();
  const displaySignatory = signatoryName.trim() || fullName.trim() || 'Authorized Managing Officer';

  return (
    <AuroraBackground className="min-h-screen text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden font-sans">
      
      {/* HorizonX Ambient Lighting Spotlights */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[140px] opacity-25 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: brandColor }}
      />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Container: 3D Dual-Deck Grid */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 relative z-10 items-stretch my-auto">

        {/* ─── LEFT PANEL: 3D HOLOGRAPHIC COMMAND DECK (HorizonX Style) ─── */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-5">
          
          {/* Top Brand */}
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-xs shadow-lg transition-transform hover:scale-105"
              style={{ 
                backgroundColor: brandColor,
                boxShadow: `0 0 20px -2px ${brandColor}70` 
              }}
            >
              {displayBrandCode.substring(0, 3)}
            </div>
            <span className="font-black text-white text-lg tracking-tight">
              <ShinyText text="BiDOCS" speed={5} />
            </span>
          </div>

          <div className="space-y-4 my-auto py-4">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              Enterprise Procurement Workspace
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Automated Philippine government procurement compliance, multi-tenant digital vault, and 3-copy sealed package generation under RA 12009 (NGPA) and RA 9184.
            </p>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Statutory 3-Copy Sealed Packages</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Synchronized Original, Copy 1, and Copy 2 compilation with dynamic document separators, QR code verification, and automated pagination.
              </p>
            </div>
          </div>

          {/* Quick-Launch 1-Click Demo Button */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border border-blue-500/30 shadow-lg backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5 font-mono">
                <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> Instant Developer Sandbox
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-bold">
                1-CLICK
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Want to skip manual typing? Auto-provision a certified Philippine General Contractor entity for testing.
            </p>
            <button
              type="button"
              onClick={handleQuickFillDemo}
              className="w-full py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-blue-900/40 transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>⚡ 1-Click Launch Demo Enterprise</span>
            </button>
          </div>

          {/* HorizonX System Specs Pill */}
          <div className="hidden sm:flex items-center justify-between text-[11px] font-mono text-slate-500 px-1">
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" /> WebAssembly 3D Engine
            </span>
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-blue-400" /> 256-Bit Vault Storage
            </span>
          </div>

        </div>

        {/* ─── RIGHT PANEL: INTERACTIVE 3D ONBOARDING COCKPIT ─── */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#0a0f1d]/95 via-[#080d1a]/95 to-[#060914]/95 border border-slate-800/90 shadow-2xl backdrop-blur-2xl flex-1 flex flex-col justify-between overflow-hidden">
            <BorderBeam size={220} duration={12} colorFrom={brandColor} colorTo="#6366f1" />

            <div className="relative z-10 space-y-6">

              {/* Cockpit Header with Milestone Stepper */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest">
                      Milestone {currentStep} of 4
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {currentStep === 1 && 'Account Credentials'}
                    {currentStep === 2 && 'Corporate Identifiers'}
                    {currentStep === 3 && 'White-Label Branding'}
                    {currentStep === 4 && 'Legal Regime & Scope'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {currentStep === 1 && 'Create your administrator credentials to securely govern workspace assets.'}
                    {currentStep === 2 && 'Register your company identity, tax numbers, and statutory licensing.'}
                    {currentStep === 3 && 'Customize your corporate signature seal, brand palette, and AMO metadata.'}
                    {currentStep === 4 && 'Select your procurement line of business and governing procurement law.'}
                  </p>
                </div>

                {/* 3D Milestone Stepper Nodes */}
                <div className="flex items-center gap-2 shrink-0">
                  {[1, 2, 3, 4].map((step) => {
                    const isPassed = currentStep > step;
                    const isCurrent = currentStep === step;
                    return (
                      <div
                        key={step}
                        className={`w-9 h-9 rounded-xl text-xs font-black flex items-center justify-center transition-all duration-300 transform-gpu-3d ${
                          isCurrent
                            ? 'text-white shadow-lg scale-110 ring-2 ring-white/30'
                            : isPassed
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-slate-900/80 text-slate-500 border border-slate-800'
                        }`}
                        style={{
                          backgroundColor: isCurrent ? brandColor : undefined,
                          boxShadow: isCurrent ? `0 0 15px -2px ${brandColor}` : undefined
                        }}
                      >
                        {isPassed ? <Check className="w-4 h-4" /> : step}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 animate-fadeIn font-mono">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Wizard Form Content */}
              <form onSubmit={handleCompleteRegistration} className="space-y-5">

                {/* ─── STEP 1: USER ACCOUNT ─── */}
                {currentStep === 1 && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-300">Full Name</label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Engr. Juan Dela Cruz"
                          required
                          className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-inner"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-300">Corporate Email</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="juan@company.ph"
                          required
                          className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-300">Account Password</label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          required
                          className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-inner font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-300">Administrative Role Scope</label>
                        <select
                          value={role}
                          onChange={(e) => setRole(e.target.value as UserRole)}
                          className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-inner cursor-pointer"
                        >
                          <option value="COMPANY_OWNER">Company Owner & Authorized Managing Officer</option>
                          <option value="BID_MANAGER">Bid Manager</option>
                          <option value="Proposal_Team_Lead">Proposal Team Lead</option>
                          <option value="ADMIN">System Administrator</option>
                          <option value="COMPANY_AMO">Authorized Managing Officer</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── STEP 2: CORPORATE IDENTIFIERS ─── */}
                {currentStep === 2 && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="block text-xs font-bold text-slate-300">Legal Company Business Name</label>
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="e.g. Apex Cloud Infrastructure Builders Corp."
                          required
                          className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-inner"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-300">Brand Code</label>
                        <input
                          type="text"
                          value={brandCode}
                          onChange={(e) => setBrandCode(e.target.value.toUpperCase())}
                          placeholder="APEX"
                          maxLength={6}
                          className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-300">Tax Identification No. (TIN)</label>
                        <input
                          type="text"
                          value={tin}
                          onChange={(e) => setTin(e.target.value)}
                          placeholder="008-991-234-000"
                          required
                          className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-inner"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-300">SEC / DTI Registration No.</label>
                        <input
                          type="text"
                          value={secDtiRegNo}
                          onChange={(e) => setSecDtiRegNo(e.target.value)}
                          placeholder="SEC-CS2019-94120"
                          required
                          className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-300">PCAB License No. (If Infra)</label>
                        <input
                          type="text"
                          value={pcabLicenseNo}
                          onChange={(e) => setPcabLicenseNo(e.target.value)}
                          placeholder="PCAB-GE-94120"
                          className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-inner"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-300">PCAB Category</label>
                        <input
                          type="text"
                          value={pcabCategory}
                          onChange={(e) => setPcabCategory(e.target.value)}
                          placeholder="AAA - General Building"
                          className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-inner"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-300">PhilGEPS Platinum No.</label>
                        <input
                          type="text"
                          value={philgepsPlatinumNo}
                          onChange={(e) => setPhilgepsPlatinumNo(e.target.value)}
                          placeholder="PLATINUM-2026-009841"
                          className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300">Primary Business Address</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Street, Barangay, City, Province, Zip Code"
                        className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-inner"
                      />
                    </div>
                  </div>
                )}

                {/* ─── STEP 3: WHITE-LABEL BRANDING & SIGNATORIES ─── */}
                {currentStep === 3 && (
                  <div className="space-y-5 animate-fadeIn">
                    {/* Interactive 3D Color Swatches */}
                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 shadow-inner">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-200">
                          Select Brand Theme Accent (<span className="font-mono text-purple-400">{brandColor}</span>)
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">Updates 3D Hologram Live</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => setBrandColor(c.hex)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer ${
                              brandColor === c.hex
                                ? 'border-white bg-slate-800 text-white shadow-lg scale-105'
                                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                            }`}
                            style={{
                              boxShadow: brandColor === c.hex ? `0 0 15px -3px ${c.hex}` : undefined
                            }}
                          >
                            <span 
                              className="w-3.5 h-3.5 rounded-full shadow-inner ring-1 ring-white/30" 
                              style={{ backgroundColor: c.hex }} 
                            />
                            <span>{c.name}</span>
                          </button>
                        ))}

                        <div className="flex items-center gap-2 ml-auto">
                          <span className="text-xs text-slate-400 font-mono">Custom:</span>
                          <input
                            type="color"
                            value={brandColor}
                            onChange={(e) => setBrandColor(e.target.value)}
                            className="w-8 h-8 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Authorized Signatory Details */}
                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 shadow-inner">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                          <Award className="w-4 h-4 text-amber-400" />
                          Authorized Managing Officer (AMO) for Bid Documents
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono font-bold">
                          STATUTORY
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-300">Signatory Full Name</label>
                          <input
                            type="text"
                            value={signatoryName}
                            onChange={(e) => setSignatoryName(e.target.value)}
                            placeholder="Engr. Ferdinand R. Valenzuela"
                            required
                            className="w-full bg-slate-900/90 border border-slate-800 hover:border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-inner"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-300">Official Designation Title</label>
                          <input
                            type="text"
                            value={signatoryTitle}
                            onChange={(e) => setSignatoryTitle(e.target.value)}
                            placeholder="President & AMO"
                            required
                            className="w-full bg-slate-900/90 border border-slate-800 hover:border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-inner"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-300">Signatory Personal TIN</label>
                          <input
                            type="text"
                            value={signatoryTin}
                            onChange={(e) => setSignatoryTin(e.target.value)}
                            placeholder="194-882-019"
                            className="w-full bg-slate-900/90 border border-slate-800 hover:border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-inner"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── STEP 4: LEGAL REGIME & PROCUREMENT SCOPE ─── */}
                {currentStep === 4 && (
                  <div className="space-y-5 animate-fadeIn">
                    {/* Procurement Type Selection */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-200">
                        Primary Line of Business / Procurement Category
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { id: 'INFRASTRUCTURE', title: 'Infrastructure', desc: 'Civil works, buildings, roads, bridges', icon: Building2 },
                          { id: 'GOODS', title: 'Goods & Supplies', desc: 'Equipment, materials, IT hardware', icon: Layers },
                          { id: 'CONSULTING_SERVICES', title: 'Consulting Services', desc: 'Advisory, engineering, feasibility', icon: Globe2 }
                        ].map((p) => {
                          const Icon = p.icon;
                          const isSelected = primaryProcurementType === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setPrimaryProcurementType(p.id as ProcurementType)}
                              className={`p-3.5 text-left rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-2 ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-600/15 text-white shadow-lg shadow-blue-900/30'
                                  : 'border-slate-800/90 bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                                {isSelected && (
                                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-extrabold text-white">{p.title}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{p.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Legal Regime Selection */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-200">
                        Governing Philippine Procurement Law Preference
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setPreferredRegime('RA_12009_NGPA')}
                          className={`p-4 text-left rounded-2xl border transition-all duration-200 cursor-pointer space-y-1.5 ${
                            preferredRegime === 'RA_12009_NGPA'
                              ? 'border-emerald-500 bg-emerald-600/15 text-white shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                              : 'border-slate-800/90 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                            <span>RA 12009 (NGPA 2024–2026)</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                              ACTIVE STANDARD
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-snug">
                            Signed July 2024, IRR GPPB Res 02-2025. Required legal basis for modern PhilGEPS submissions.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPreferredRegime('RA_9184')}
                          className={`p-4 text-left rounded-2xl border transition-all duration-200 cursor-pointer space-y-1.5 ${
                            preferredRegime === 'RA_9184'
                              ? 'border-blue-500 bg-blue-600/15 text-white shadow-lg shadow-blue-950/40 ring-1 ring-blue-500/40'
                              : 'border-slate-800/90 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-blue-400">
                            <span>RA 9184 (2016 IRR Legacy)</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                              TRANSITION
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-snug">
                            Legacy 2003 GPRA IRR utilized by procuring agencies currently in the 3-year migration window.
                          </p>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Wizard Navigation Action Controls */}
                <div className="flex items-center justify-between pt-5 border-t border-slate-800/80">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition flex items-center gap-2 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onSwitchToLogin}
                      className="text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      Already registered? <span className="text-blue-400 underline font-bold">Log In</span>
                    </button>
                  )}

                  {currentStep < 4 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white transition-all duration-300 flex items-center gap-2 shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                      style={{ backgroundColor: brandColor }}
                    >
                      <span>Continue to Step {currentStep + 1}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-7 py-3 rounded-xl text-xs font-black text-white transition-all duration-300 flex items-center gap-2 shadow-2xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                      style={{
                        backgroundColor: brandColor,
                        boxShadow: `0 0 25px -3px ${brandColor}`
                      }}
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Complete Onboarding & Launch Workspace</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

              </form>

            </div>
          </div>
        </div>

      </div>

    </AuroraBackground>
  );
};

export default RegisterPage;

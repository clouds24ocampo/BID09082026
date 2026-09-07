import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LegalRegime, ProcurementType, UserRole } from '../../types';
import {
  Building2,
  User as UserIcon,
  Palette,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Award,
  Briefcase,
  Sparkles
} from 'lucide-react';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

const PRESET_COLORS = [
  { name: 'Navy Blue', hex: '#1e40af' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Royal Purple', hex: '#7c3aed' },
  { name: 'Crimson Red', hex: '#dc2626' },
  { name: 'Slate Teal', hex: '#0d9488' },
  { name: 'Deep Amber', hex: '#d97706' },
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

    const generatedCode = brandCode || companyName.split(' ')[0].toUpperCase();
    const success = registerTenantAndUser(
      {
        companyName,
        brandCode: generatedCode,
        brandColor,
        tin,
        secDtiRegNo,
        pcabLicenseNo,
        pcabCategory,
        philgepsPlatinumNo: philgepsPlatinumNo || '',
        address: address || '',
        authorizedSignatory: {
          name: signatoryName,
          title: signatoryTitle,
          tin: signatoryTin || tin
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

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Dynamic Background Glow */}
      <div
        className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[140px] opacity-20 pointer-events-none transition-colors duration-500"
        style={{ backgroundColor: brandColor }}
      />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-4xl glass-panel p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-800 relative z-10 space-y-6">

        {/* Registration Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-xs text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Multi-Tenant Onboarding Wizard</span>
              </div>
              <button
                type="button"
                onClick={handleQuickFillDemo}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-400/40 text-xs font-semibold transition shadow-sm cursor-pointer"
                title="Immediately setup a pre-configured Philippine Contractor profile for instant testing"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>⚡ 1-Click Launch Demo Enterprise</span>
              </button>
            </div>
            <h1 className="text-2xl font-bold text-white">Register Corporate Profile</h1>
            <p className="text-xs text-slate-400">Setup your company identity, legal credentials, and white-label theme.</p>
          </div>

          {/* Step Progress Pills */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition ${currentStep === step
                  ? 'text-white shadow-lg ring-2 ring-white/20'
                  : currentStep > step
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                style={{ backgroundColor: currentStep === step ? brandColor : undefined }}
              >
                {currentStep > step ? <Check className="w-4 h-4" /> : step}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Wizard Form Content */}
        <form onSubmit={handleCompleteRegistration} className="space-y-6">

          {/* STEP 1: Account Credentials */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-blue-400" />
                Step 1: User Account Credentials
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Engr. Juan Dela Cruz"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Work Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="juan@company.ph"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Role Scope</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="COMPANY_OWNER">Company Owner & Authorized Managing Officer</option>
                    <option value="BID_MANAGER">Bid Manager</option>
                    <option value="Proposal_Team_Lead">Proposal Team Lead</option>
                    <option value="ADMIN">Administrator</option>
                    <option value="COMPANY_AMO">Authorized Managing Officer</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Corporate Identifiers */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                Step 2: Corporate Identifiers & Registrations
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Legal Company Business Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Metro Builders & Development Corp."
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Short Brand Code</label>
                  <input
                    type="text"
                    value={brandCode}
                    onChange={(e) => setBrandCode(e.target.value.toUpperCase())}
                    placeholder="METRO"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tax Identification No. (TIN)</label>
                  <input
                    type="text"
                    value={tin}
                    onChange={(e) => setTin(e.target.value)}
                    placeholder="123-456-789-000"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">SEC / DTI Registration No.</label>
                  <input
                    type="text"
                    value={secDtiRegNo}
                    onChange={(e) => setSecDtiRegNo(e.target.value)}
                    placeholder="SEC-CS2023019283"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">PCAB License No. (If Infra)</label>
                  <input
                    type="text"
                    value={pcabLicenseNo}
                    onChange={(e) => setPcabLicenseNo(e.target.value)}
                    placeholder="PCAB-AAAA-10928"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">PCAB Category</label>
                  <input
                    type="text"
                    value={pcabCategory}
                    onChange={(e) => setPcabCategory(e.target.value)}
                    placeholder="AAA - General Building"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">PhilGEPS Platinum No.</label>
                  <input
                    type="text"
                    value={philgepsPlatinumNo}
                    onChange={(e) => setPhilgepsPlatinumNo(e.target.value)}
                    placeholder="202401-192831-P"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Primary Business Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, Barangay, City, Province"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* STEP 3: White-Label Branding & Signatories */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-400" />
                Step 3: White-Label Branding & Signatories
              </h2>

              {/* Color Palette Selector */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <label className="block text-xs font-medium text-slate-300">
                  Select Primary Brand Theme Color (<span className="font-mono text-purple-400">{brandColor}</span>)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setBrandColor(c.hex)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition ${brandColor === c.hex
                        ? 'border-white bg-slate-800 text-white shadow'
                        : 'border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      <span className="w-4 h-4 rounded-full shadow" style={{ backgroundColor: c.hex }} />
                      <span>{c.name}</span>
                    </button>
                  ))}

                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-slate-400">Custom:</span>
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                    />
                  </div>
                </div>

                {/* Live Button & Badge Preview */}
                <div className="pt-3 border-t border-slate-800 flex items-center gap-4 text-xs">
                  <span className="text-slate-400">Brand UI Preview:</span>
                  <div
                    className="px-3 py-1.5 rounded-lg text-white font-medium text-xs shadow flex items-center gap-1"
                    style={{ backgroundColor: brandColor }}
                  >
                    <span>Primary Action Button</span>
                  </div>
                  <div
                    className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold"
                    style={{ backgroundColor: `${brandColor}25`, color: brandColor, border: `1px solid ${brandColor}40` }}
                  >
                    {companyName ? companyName.toUpperCase() : 'YOUR BRAND'}
                  </div>
                </div>
              </div>

              {/* Authorized Signatory Details */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  Authorized Managing Officer (AMO) for Bid Documents
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Signatory Full Name</label>
                    <input
                      type="text"
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      placeholder="Engr. Fernando V. De La Cruz"
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Official Designation Title</label>
                    <input
                      type="text"
                      value={signatoryTitle}
                      onChange={(e) => setSignatoryTitle(e.target.value)}
                      placeholder="President & Authorized Managing Officer"
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Signatory Personal TIN</label>
                    <input
                      type="text"
                      value={signatoryTin}
                      onChange={(e) => setSignatoryTin(e.target.value)}
                      placeholder="000-123-456-000"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Legal & Compliance Configuration */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-fadeIn">
              <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                Step 4: Procurement Scope & Governing Legal Regime
              </h2>

              {/* Procurement Type Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Primary Line of Business / Procurement Category
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'INFRASTRUCTURE', title: 'Infrastructure Projects', desc: 'Civil works, buildings, roads, water systems' },
                    { id: 'GOODS', title: 'Goods & Supplies', desc: 'Equipment, materials, IT hardware, vehicles' },
                    { id: 'CONSULTING_SERVICES', title: 'Consulting Services', desc: 'Advisory, engineering designs, feasibility' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPrimaryProcurementType(p.id as ProcurementType)}
                      className={`p-3 text-left rounded-xl border transition ${primaryProcurementType === p.id
                        ? 'border-blue-500 bg-blue-600/10 text-white'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      <p className="text-xs font-semibold text-white">{p.title}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Legal Regime Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Governing Philippine Procurement Law Preference
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPreferredRegime('RA_12009_NGPA')}
                    className={`p-3 text-left rounded-xl border transition ${preferredRegime === 'RA_12009_NGPA'
                      ? 'border-emerald-500 bg-emerald-600/10 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400'
                      }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                      <span>RA 12009 (NGPA - New Procurement Act)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20">Current / Active</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1">
                      Signed Jul 2024, IRR GPPB Res 02-2025. Standard for new government bids.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreferredRegime('RA_9184')}
                    className={`p-3 text-left rounded-xl border transition ${preferredRegime === 'RA_9184'
                      ? 'border-blue-500 bg-blue-600/10 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400'
                      }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-blue-400">
                      <span>RA 9184 (2016 IRR Legacy)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20">Transition Mode</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1">
                      Legacy 2003 GPRA IRR applied by agencies in 3-year transition window.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Controls Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-xs font-medium text-slate-400 hover:text-slate-200"
              >
                Already have an account? <span className="text-blue-400 underline">Log In</span>
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-lg text-xs font-semibold text-white transition flex items-center gap-2 shadow-lg"
                style={{ backgroundColor: brandColor }}
              >
                <span>Continue to Step {currentStep + 1}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-lg text-xs font-bold text-white transition flex items-center gap-2 shadow-xl"
                style={{ backgroundColor: brandColor }}
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
  );
};

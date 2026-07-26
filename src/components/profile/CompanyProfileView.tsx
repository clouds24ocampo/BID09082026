import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Building2, 
  Upload, 
  Palette, 
  ShieldCheck, 
  Award, 
  Save, 
  CheckCircle2, 
  Image as ImageIcon,
  Trash2,
  Mail,
  Phone,
  MapPin,
  UserCheck,
  FileText
} from 'lucide-react';

const PRESET_COLORS = [
  { name: 'Navy Blue', hex: '#1e40af' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Royal Purple', hex: '#7c3aed' },
  { name: 'Crimson Red', hex: '#dc2626' },
  { name: 'Slate Teal', hex: '#0d9488' },
  { name: 'Deep Amber', hex: '#d97706' },
];

export const CompanyProfileView: React.FC = () => {
  const { currentTenant, updateTenantSettings } = useAuth();

  const [companyName, setCompanyName] = useState(currentTenant?.companyName || '');
  const [brandCode, setBrandCode] = useState(currentTenant?.brandCode || '');
  const [brandColor, setBrandColor] = useState(currentTenant?.brandColor || '#1e40af');
  const [logoUrl, setLogoUrl] = useState(currentTenant?.logoUrl || '');
  
  const [tin, setTin] = useState(currentTenant?.tin || '');
  const [secDtiRegNo, setSecDtiRegNo] = useState(currentTenant?.secDtiRegNo || '');
  const [philgepsPlatinumNo, setPhilgepsPlatinumNo] = useState(currentTenant?.philgepsPlatinumNo || '');
  const [address, setAddress] = useState(currentTenant?.address || '');

  const [signatoryName, setSignatoryName] = useState(currentTenant?.authorizedSignatory?.name || '');
  const [signatoryTitle, setSignatoryTitle] = useState(currentTenant?.authorizedSignatory?.title || '');

  const [isSaved, setIsSaved] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Invalid file type. Please upload an image file (.png, .jpg, .svg, .webp).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image file size exceeds maximum limit of 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoUrl(reader.result as string);
      setUploadError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTenantSettings({
      companyName,
      brandCode: brandCode.toUpperCase(),
      brandColor,
      logoUrl,
      tin,
      secDtiRegNo,
      philgepsPlatinumNo,
      address,
      authorizedSignatory: {
        name: signatoryName,
        title: signatoryTitle,
        tin: tin
      }
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span 
              className="w-3.5 h-3.5 rounded-full" 
              style={{ backgroundColor: brandColor }} 
            />
            <h1 className="text-2xl font-bold text-white">Company Profile & Branding Settings</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage your corporate profile logo, statutory registration details, and authorized signatory credentials for <span className="text-slate-200 font-semibold">{companyName || 'Your Enterprise'}</span>.
          </p>
        </div>

        {isSaved && (
          <div className="px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-semibold flex items-center gap-2 shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Company Profile & Logo Saved!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* SECTION 1: PROFILE LOGO & BRAND IDENTITY */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <ImageIcon className="w-4 h-4 text-blue-400" />
            Company Profile Logo & Brand Identity
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            
            {/* Logo Preview Container */}
            <div className="relative group shrink-0">
              <div 
                className="w-32 h-32 rounded-2xl border-2 border-slate-700 bg-slate-950 flex items-center justify-center p-3 shadow-xl overflow-hidden text-center"
                style={{ borderColor: brandColor }}
              >
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Company Profile Logo" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="space-y-1">
                    <div 
                      className="w-16 h-16 rounded-xl mx-auto flex items-center justify-center font-black text-2xl text-white shadow"
                      style={{ backgroundColor: brandColor }}
                    >
                      {brandCode.substring(0, 3) || 'LOGO'}
                    </div>
                    <span className="text-[10px] text-slate-500 block font-mono">No Custom Logo</span>
                  </div>
                )}
              </div>
            </div>

            {/* Logo Controls */}
            <div className="space-y-3 flex-1 text-xs">
              <h3 className="font-bold text-white text-sm">Corporate Profile Logo</h3>
              <p className="text-slate-400 leading-relaxed max-w-lg">
                Upload your official high-resolution corporate logo image. Supported formats: <span className="text-slate-200 font-mono">PNG, JPG, SVG, WebP</span> (Max 5 MB). The logo will render automatically on top headers and statutory Document Cover Pages.
              </p>

              <div className="flex items-center gap-3 pt-1">
                <label className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow cursor-pointer flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>Upload Profile Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>

                {logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 border border-red-500/30 transition flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remove Logo</span>
                  </button>
                )}
              </div>

              {uploadError && <p className="text-xs text-red-400 font-medium">{uploadError}</p>}
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-300 mb-1">Legal Company Business Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Brand Code (Acronym)</label>
              <input
                type="text"
                value={brandCode}
                onChange={(e) => setBrandCode(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono uppercase focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Theme Color Palette */}
          <div className="space-y-2 pt-2 text-xs">
            <label className="block font-medium text-slate-300">White-Label Brand Color Accent</label>
            <div className="flex items-center gap-3 flex-wrap">
              {PRESET_COLORS.map((col) => (
                <button
                  key={col.hex}
                  type="button"
                  onClick={() => setBrandColor(col.hex)}
                  className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition ${
                    brandColor === col.hex
                      ? 'border-white bg-slate-800 font-bold text-white shadow-lg'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: col.hex }} />
                  <span>{col.name}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* SECTION 2: STATUTORY REGISTRATION CREDENTIALS */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Award className="w-4 h-4 text-emerald-400" />
            Statutory Registration & Licensing Credentials
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-300 mb-1">PhilGEPS Platinum Reg. No.</label>
              <input
                type="text"
                value={philgepsPlatinumNo}
                onChange={(e) => setPhilgepsPlatinumNo(e.target.value)}
                required
                placeholder="2026-89102-PLAT"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Tax Identification Number (TIN)</label>
              <input
                type="text"
                value={tin}
                onChange={(e) => setTin(e.target.value)}
                required
                placeholder="000-123-456-000"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">SEC / DTI Registration No.</label>
              <input
                type="text"
                value={secDtiRegNo}
                onChange={(e) => setSecDtiRegNo(e.target.value)}
                required
                placeholder="SEC-REG-2026-9012"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: ADDRESS & CONTACT DETAILS */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <MapPin className="w-4 h-4 text-amber-400" />
            Address & Official Contact Details
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Official Corporate Registered Address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                rows={2}
                placeholder="DICT Building, C.P. Garcia Ave., Diliman, Quezon City, Metro Manila"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: AUTHORIZED SIGNATORY DETAILS */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <UserCheck className="w-4 h-4 text-blue-400" />
            Authorized Bidding Signatory Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Authorized Signatory Name</label>
              <input
                type="text"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                required
                placeholder="Engr. Juan Dela Cruz"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Official Designation / Title</label>
              <input
                type="text"
                value={signatoryTitle}
                onChange={(e) => setSignatoryTitle(e.target.value)}
                required
                placeholder="President & Managing Director"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl text-xs font-bold text-white shadow-xl transition flex items-center gap-2 hover:opacity-90"
            style={{ backgroundColor: brandColor }}
          >
            <Save className="w-4 h-4" />
            <span>Save Company Profile & Logo</span>
          </button>
        </div>

      </form>

    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Building2, 
  Palette, 
  Award, 
  Save, 
  CheckCircle2 
} from 'lucide-react';

const PRESET_COLORS = [
  { name: 'Navy Blue', hex: '#1e40af' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Royal Purple', hex: '#7c3aed' },
  { name: 'Crimson Red', hex: '#dc2626' },
  { name: 'Slate Teal', hex: '#0d9488' },
  { name: 'Deep Amber', hex: '#d97706' },
];

export const TenantSettingsView: React.FC = () => {
  const { currentTenant, updateTenantSettings, resetAllData } = useAuth();

  const [companyName, setCompanyName] = useState(currentTenant?.companyName || '');
  const [brandCode, setBrandCode] = useState(currentTenant?.brandCode || '');
  const [brandColor, setBrandColor] = useState(currentTenant?.brandColor || '#1e40af');
  const [tin, setTin] = useState(currentTenant?.tin || '');
  const [secDtiRegNo, setSecDtiRegNo] = useState(currentTenant?.secDtiRegNo || '');
  const [pcabLicenseNo, setPcabLicenseNo] = useState(currentTenant?.pcabLicenseNo || '');
  const [pcabCategory, setPcabCategory] = useState(currentTenant?.pcabCategory || '');
  const [philgepsPlatinumNo, setPhilgepsPlatinumNo] = useState(currentTenant?.philgepsPlatinumNo || '');
  const [address, setAddress] = useState(currentTenant?.address || '');

  const [signatoryName, setSignatoryName] = useState(currentTenant?.authorizedSignatory?.name || '');
  const [signatoryTitle, setSignatoryTitle] = useState(currentTenant?.authorizedSignatory?.title || '');

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTenantSettings({
      companyName,
      brandCode: brandCode.toUpperCase(),
      brandColor,
      tin,
      secDtiRegNo,
      pcabLicenseNo,
      pcabCategory,
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
    <div className="space-y-6 animate-fadeIn max-w-4xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: brandColor }} 
            />
            <h1 className="text-2xl font-bold text-white">White-Label Tenant Engine Settings</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Zero-hardcoding configuration file (`tenant.config.json` equivalent). Updating values re-skins the entire BIDOCS platform instantly.
          </p>
        </div>

        {isSaved && (
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Tenant Settings Saved & Re-skinned!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Brand Identity & Palette */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Palette className="w-4 h-4 text-purple-400" />
            White-Label Brand Identity & Theme Color
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Legal Company Business Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Brand Code</label>
              <input
                type="text"
                value={brandCode}
                onChange={(e) => setBrandCode(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Primary Brand Theme Color</label>
            <div className="flex flex-wrap items-center gap-3">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setBrandColor(c.hex)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    brandColor === c.hex
                      ? 'border-white bg-slate-800 text-white shadow'
                      : 'border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c.hex }} />
                  <span>{c.name}</span>
                </button>
              ))}

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-slate-400 font-mono">{brandColor}</span>
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Corporate Legal & Registration Identifiers */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            Corporate Legal & Registration Credentials
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Tax Identification No. (TIN)</label>
              <input
                type="text"
                value={tin}
                onChange={(e) => setTin(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">SEC / DTI Registration No.</label>
              <input
                type="text"
                value={secDtiRegNo}
                onChange={(e) => setSecDtiRegNo(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">PCAB License No.</label>
              <input
                type="text"
                value={pcabLicenseNo}
                onChange={(e) => setPcabLicenseNo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">PCAB Category</label>
              <input
                type="text"
                value={pcabCategory}
                onChange={(e) => setPcabCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">PhilGEPS Platinum No.</label>
              <input
                type="text"
                value={philgepsPlatinumNo}
                onChange={(e) => setPhilgepsPlatinumNo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Official Business Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>
        </div>

        {/* Authorized Signatory Details */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            Authorized Managing Officer (AMO) for GPPB Forms
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Signatory Full Name</label>
              <input
                type="text"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Official Title</label>
              <input
                type="text"
                value={signatoryTitle}
                onChange={(e) => setSignatoryTitle(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-xl transition flex items-center gap-2"
            style={{ backgroundColor: brandColor }}
          >
            <Save className="w-4 h-4" />
            <span>Save & Update Tenant Configuration</span>
          </button>
        </div>

      </form>

      {/* Reset & Clean Workspace Section */}
      <div className="glass-panel p-6 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider">Reset Workspace Storage</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Purges all saved local storage items (`bidocs_tenants`, `bidocs_users`, `bidocs_vault_items`, `bidocs_opportunities`) for a clean slate.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Are you sure you want to clear all local workspace data? This will log you out, purge IndexedDB document blobs, and reset all saved items.')) {
                resetAllData();
                window.location.reload();
              }
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600/80 hover:bg-red-600 text-white shadow transition shrink-0"
          >
            Purge & Reset All Local Data
          </button>
        </div>
      </div>

    </div>
  );
};

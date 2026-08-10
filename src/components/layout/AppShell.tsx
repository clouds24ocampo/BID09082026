import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Building2, 
  LayoutDashboard, 
  Search, 
  FileCheck, 
  FolderKanban, 
  Download, 
  Settings, 
  LogOut, 
  Bell, 
  ShieldCheck, 
  User as UserIcon, 
  ChevronDown, 
  Sparkles,
  Layers,
  Menu,
  X,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Key,
  CheckCircle2,
  Trash2
} from 'lucide-react';

interface AppShellProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ activeTab, setActiveTab, children }) => {
  const { currentUser, currentTenant, tenants, switchTenant, logout, updateUserPassword, resetAllData } = useAuth();
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // User-Specific Password Reset Enforcement State
  const [mustChangePassword, setMustChangePassword] = useState(() => {
    if (!currentUser) return false;
    const userEmail = currentUser.email.toLowerCase();
    const flag = localStorage.getItem(`bidocs_must_change_password_${userEmail}`);
    const pw = localStorage.getItem(`bidocs_user_password_${userEmail}`);
    return flag === 'true' || pw === 'BiDOCS#2026' || currentUser.mustChangePassword === true || currentUser.password === 'BiDOCS#2026';
  });

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const handlePasswordChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');

    if (!newPassword || newPassword.length < 6) {
      setPwError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword === 'BiDOCS#2026') {
      setPwError('You cannot reuse the default temporary password (BiDOCS#2026). Please choose a new secure password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwError('New Password and Confirm Password do not match.');
      return;
    }

    if (currentUser) {
      updateUserPassword(currentUser.id, newPassword);
    }
    setPwSuccess('Password updated successfully! System access secured.');
    setTimeout(() => {
      setMustChangePassword(false);
    }, 1000);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'opportunities', label: 'Opportunity Finder', icon: Search, badge: 'Philgeps' },
    { id: 'vault', label: 'Document Vault', icon: FileCheck, badge: 'Secure' },
    { id: 'bids', label: 'Bid Packages', icon: FolderKanban, badge: 'Envelopes' },
    { id: 'forms', label: 'Notarized Documents', icon: ShieldCheck, badge: 'Legal' },
    { id: 'profile', label: 'Company Profile', icon: Building2, badge: 'Profile' },
    { id: 'settings', label: 'Tenant Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col">
      
      {/* TOP BAR HEADER */}
      <header className="h-16 border-b border-slate-800 bg-[#0b0f19]/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
        
        {/* Left Branding & Mobile Toggle */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-white md:hidden"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('profile')}>
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-white text-sm shadow-md transition-transform hover:scale-105 overflow-hidden p-0.5"
              style={{ backgroundColor: currentTenant?.brandColor || '#1e40af' }}
            >
              {currentTenant?.logoUrl ? (
                <img src={currentTenant.logoUrl} alt="Logo" className="w-full h-full object-contain bg-white rounded-lg" />
              ) : (
                currentTenant?.brandCode?.substring(0, 3) || 'BID'
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight">BIDOCS</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono font-semibold border border-blue-500/20">
                  v2.5
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate max-w-37.5 sm:max-w-50">
                {currentTenant?.companyName}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Tenant Switcher Dropdown */}
        <div className="hidden md:flex items-center relative">
          <button
            onClick={() => setShowTenantDropdown(!showTenantDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition"
          >
            <Building2 className="w-3.5 h-3.5" style={{ color: currentTenant?.brandColor }} />
            <span className="font-semibold">{currentTenant?.companyName}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showTenantDropdown && (
            <div className="absolute top-10 left-0 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 space-y-1 z-50 animate-fadeIn">
              <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Switch Corporate Profile
              </div>
              {tenants.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    switchTenant(t.id);
                    setShowTenantDropdown(false);
                  }}
                  className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition ${
                    t.id === currentTenant?.id
                      ? 'bg-blue-600/10 border border-blue-500/30 text-white'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.brandColor }} />
                    <div className="truncate max-w-45">
                      <p className="font-medium text-white truncate">{t.companyName}</p>
                      <p className="text-[10px] text-slate-400">TIN: {t.tin}</p>
                    </div>
                  </div>
                  {t.id === currentTenant?.id && (
                    <span className="text-[10px] text-blue-400 font-semibold">Active</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-3">
          
          {/* Legal Regime Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>RA 12009 NGPA Mode</span>
          </div>

          {/* Expiry Notifications Alert */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-10 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-3 z-50 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white">Compliance Alerts</span>
                  <span className="text-[10px] text-amber-400 font-mono">2 Expiration Warnings</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-slate-200">
                    <p className="font-semibold text-amber-400">Tax Clearance Certificate</p>
                    <p className="text-[11px] text-slate-400">Expires in 14 days (Aug 8, 2026). Action required for Envelope 1.</p>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-slate-200">
                    <p className="font-semibold text-blue-400">Philgeps Scraper Sync</p>
                    <p className="text-[11px] text-slate-400">3 new Goods opportunities imported for Metro Manila.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Drawer Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
            >
              <div 
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: currentTenant?.brandColor || '#1e40af' }}
              >
                {currentUser?.fullName?.charAt(0) || 'U'}
              </div>
              <span className="hidden sm:inline text-xs font-medium text-slate-200">{currentUser?.fullName}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-10 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 space-y-1 animate-fadeIn">
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="text-xs font-semibold text-white truncate">{currentUser?.fullName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{currentUser?.email}</p>
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-semibold">
                    {currentUser?.role === 'COMPANY_OWNER' ? 'Company Owner' : 'Bid Manager'}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tenant & Branding Settings</span>
                </button>

                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-400" />
                  <span>Log Out Session</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm('Permanently purge all registered companies, accounts, vault documents, and IndexedDB files to register a clean company?')) {
                      resetAllData();
                      setShowUserMenu(false);
                      window.location.reload();
                    }
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2 border-t border-slate-800 mt-1 pt-2"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Purge Workspace & Clear Companies</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* BODY CONTENT AREA WITH SIDEBAR */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className={`w-64 bg-[#0b0f19] border-r border-slate-800 flex-col justify-between py-4 px-3 md:flex md:relative md:inset-auto md:shadow-none ${mobileMenuOpen ? 'flex absolute inset-y-16 left-0 z-30 shadow-2xl' : 'hidden'}`}>
          <div className="space-y-1">
            <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Bidding Modules
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                    isActive
                      ? 'bg-slate-800/90 text-white font-semibold shadow-sm border border-slate-700/80'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                  style={{
                    borderLeft: isActive ? `3px solid ${currentTenant?.brandColor || '#1e40af'}` : undefined
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Icon 
                      className="w-4 h-4" 
                      style={{ color: isActive ? currentTenant?.brandColor || '#3b82f6' : undefined }} 
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isActive ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer: Active Tenant Summary */}
          <div className="p-3 rounded-xl glass-card border border-slate-800 space-y-2 mt-4">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Tenant Scope</span>
              <span className="font-mono text-emerald-400">ONLINE</span>
            </div>
            <p className="text-xs font-bold text-white truncate">{currentTenant?.companyName}</p>
            <div className="text-[10px] text-slate-400 space-y-0.5 font-mono">
              <p>TIN: {currentTenant?.tin}</p>
              <p>PCAB: {currentTenant?.pcabLicenseNo || 'N/A'}</p>
            </div>
          </div>
        </aside>

        {/* MAIN VIEWPORT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#070a12] min-h-[calc(100vh-4rem)] min-w-0">
          <div className="w-full max-w-[1780px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* MANDATORY PASSWORD CHANGE OVERLAY MODAL */}
      {mustChangePassword && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scaleIn p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  Mandatory Password Change
                </h3>
                <p className="text-[11px] text-amber-400 font-mono">
                  Default Temporary Password Active (BiDOCS#2026)
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
              <p className="font-bold">⚠️ System Security Requirement:</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Your account password was reset to the default temporary password (<strong>BiDOCS#2026</strong>). For system security, you MUST change your password ASAP before continuing.
              </p>
            </div>

            {pwError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-medium">
                ⚠️ {pwError}
              </div>
            )}

            {pwSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{pwSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">New System Password <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter new password (min 6 chars)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Confirm New Password <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-enter new password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    {showConfirmPw ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-xl transition flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                <span>Update Password & Access System</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

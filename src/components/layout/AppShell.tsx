import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Building2,
  LayoutDashboard,
  Search,
  FileText,
  FileCheck,
  FolderKanban,
  Settings,
  LogOut,
  Bell,
  ShieldCheck,
  ChevronDown,
  Menu,
  X,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Key,
  Trash2,
  Box,
  Briefcase,
  FileSpreadsheet,
  Users,
  ArrowLeft,
  Globe2,
  Wallet,
  MoreHorizontal,
} from "lucide-react";

import { AuroraBackground } from "../common/AuroraBackground";
import { getRoleDisplayName, isApproverRole } from "../../types";

interface AppShellProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabHistory?: string[];
  onBack?: () => void;
  onBackToLanding?: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  setActiveTab,
  tabHistory = [],
  onBack,
  onBackToLanding,
  children,
}) => {
  const {
    currentUser,
    currentTenant,
    logout,
    updateUserPassword,
    deleteCompany,
  } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  // Admin-issued temporary passwords must be replaced before the app is usable.
  const mustChangePassword = currentUser?.mustChangePassword === true;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwError, setPwError] = useState("");

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");

    if (newPassword !== confirmPassword) {
      setPwError("New Password and Confirm Password do not match.");
      return;
    }
    if (!currentUser) return;

    const res = await updateUserPassword(currentUser.id, newPassword);
    if (!res.success) {
      setPwError(res.error || "Could not update password.");
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    {
      id: "tor",
      label: "Terms of Reference (TOR)",
      icon: FileText,
      badge: "Statutory",
    },
    {
      id: "pow",
      label: "Program of Work (POW)",
      icon: FileSpreadsheet,
      badge: "Scope",
    },
    {
      id: "opportunities",
      label: "Opportunity Finder",
      icon: Search,
      badge: "Philgeps",
    },
    {
      id: "project-profile",
      label: "Project Status",
      icon: Briefcase,
      badge: "Status",
    },
    { id: "vault", label: "Document Vault", icon: FileCheck, badge: "Secure" },
    {
      id: "bids",
      label: "Bid Packages",
      icon: FolderKanban,
      badge: "Envelopes",
    },
    {
      id: "payments",
      label: "Payment Documents",
      icon: Wallet,
      badge: "Final Billing",
    },
    { id: "covers", label: "Labels & Covers", icon: Box, badge: "Samples" },
    {
      id: "forms",
      label: "Notarized Documents",
      icon: ShieldCheck,
      badge: "Legal",
    },
    {
      id: "profile",
      label: "Company Profile",
      icon: Building2,
      badge: "Profile",
    },
    { id: "settings", label: "Tenant Settings", icon: Settings },
  ];

  const brandColor = currentTenant?.brandColor || "#1e40af";

  const currentTabItem = navItems.find((i) => i.id === activeTab);
  const currentTabLabel = currentTabItem?.label || activeTab;

  const previousTabId =
    tabHistory.length > 0
      ? tabHistory[tabHistory.length - 1]
      : activeTab !== "dashboard"
      ? "dashboard"
      : null;

  const previousTabItem = previousTabId
    ? navItems.find((i) => i.id === previousTabId)
    : null;
  const previousTabLabel =
    previousTabItem?.label ||
    (previousTabId ? previousTabId : onBackToLanding ? "Landing Portal" : null);

  return (
    <AuroraBackground className="min-h-screen flex flex-col">
      {/* TOP BAR HEADER — HORIZONX FLOATING GLASS WITH GLOW */}
      <header className="h-16 border-b border-slate-800/80 bg-[#090d1a]/85 backdrop-blur-xl sticky top-0 z-40 px-3 sm:px-6 flex items-center justify-between gap-2 shadow-lg shadow-black/30">
        {/* Left Branding & Mobile Toggle & Back Button */}
        <div className="flex items-center gap-1 sm:gap-3 min-w-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            className="p-2.5 -ml-1 rounded-lg text-slate-300 hover:text-white md:hidden cursor-pointer shrink-0"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          {/* Quick Back Button in Top Bar */}
          {(onBack || onBackToLanding) && (
            <button
              type="button"
              onClick={onBack || onBackToLanding}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 shadow-sm transition-all cursor-pointer group"
              title={previousTabLabel ? `Go back to ${previousTabLabel}` : "Go back to previous page"}
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back</span>
              {previousTabLabel && (
                <span className="hidden xl:inline text-[10px] text-slate-400 font-normal truncate max-w-28">
                  ({previousTabLabel})
                </span>
              )}
            </button>
          )}

          <div
            className="flex items-center gap-2.5 cursor-pointer group pl-1 sm:pl-2 min-w-0"
            onClick={() => setActiveTab("profile")}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-lg transition-transform group-hover:scale-105 overflow-hidden p-0.5"
              style={{
                backgroundColor: brandColor,
                boxShadow: `0 0 20px -3px ${brandColor}60`,
              }}
            >
              {currentTenant?.logoUrl ? (
                <img
                  src={currentTenant.logoUrl}
                  alt="Logo"
                  className="w-full h-full object-contain bg-white rounded-lg"
                />
              ) : (
                currentTenant?.brandCode?.substring(0, 3) || "BID"
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-base tracking-tight text-shimmer">
                  BIDOCS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate max-w-28 min-[420px]:max-w-40 sm:max-w-50 group-hover:text-slate-200 transition-colors">
                {currentTenant?.companyName}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Active company (accounts are bound to one company; no cross-company switching) */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 shadow-inner">
          <Building2 className="w-3.5 h-3.5" style={{ color: brandColor }} />
          <span className="font-semibold">{currentTenant?.companyName}</span>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Expiry Notifications Alert */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Compliance alerts"
              className="p-2.5 sm:p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white transition relative cursor-pointer hover:border-slate-700"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-12 w-[min(20rem,calc(100vw-1.5rem))] bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl p-3 z-50 space-y-2 animate-scaleIn backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white">
                    Compliance Alerts
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">
                    2 Expiration Warnings
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-slate-200">
                    <p className="font-semibold text-amber-400">
                      Tax Clearance Certificate
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Expires in 14 days (Aug 8, 2026). Action required for
                      Envelope 1.
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-slate-200">
                    <p className="font-semibold text-blue-400">
                      Philgeps Scraper Sync
                    </p>
                    <p className="text-[11px] text-slate-400">
                      3 new Goods opportunities imported for Metro Manila.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Drawer Toggle */}
          <div className="relative">
            <button
              data-testid="user-profile-menu-toggle"
              id="user-profile-menu-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-label="Account menu"
              className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                style={{ backgroundColor: brandColor }}
              >
                {currentUser?.fullName?.charAt(0) || "U"}
              </div>
              <span className="hidden sm:inline text-xs font-medium text-slate-200">
                {currentUser?.fullName}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-12 w-56 max-w-[calc(100vw-1.5rem)] bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 space-y-1 animate-scaleIn backdrop-blur-xl">
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="text-xs font-semibold text-white truncate">
                    {currentUser?.fullName}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {currentUser?.email}
                  </p>
                  <span
                    className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded font-bold font-mono border ${
                      isApproverRole(currentUser?.role)
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    }`}
                  >
                    {getRoleDisplayName(currentUser?.role)}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setActiveTab("settings");
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>Team Accounts &amp; Roles</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("settings");
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tenant &amp; Branding Settings</span>
                </button>

                {onBackToLanding && (
                  <button
                    onClick={() => {
                      onBackToLanding();
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-cyan-300 hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer"
                  >
                    <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Return to Landing Portal</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-400" />
                  <span>Log Out Session</span>
                </button>

                {isApproverRole(currentUser?.role) && (
                  <button
                    onClick={async () => {
                      const typed = prompt(
                        `This permanently deletes "${currentTenant?.companyName}", all of its accounts, projects and documents. Type the company name to confirm:`,
                      );
                      if (typed !== null && typed.trim() === currentTenant?.companyName) {
                        await deleteCompany();
                        window.location.reload();
                      }
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2 border-t border-slate-800 mt-1 pt-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Delete Company &amp; All Data</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* BODY CONTENT AREA WITH 3D SIDEBAR */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* SIDEBAR NAVIGATION — HORIZONX SLICK FROSTED ACRYLIC */}
        {mobileMenuOpen && (
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden fixed inset-0 top-16 z-40 bg-black/60 backdrop-blur-sm animate-fadeIn cursor-default"
          />
        )}
        <aside
          aria-label="Primary navigation"
          className={`w-64 bg-[#080c16] md:bg-[#080c16]/90 backdrop-blur-xl border-r border-slate-800/80 flex-col justify-between py-4 px-3 md:flex md:relative md:inset-auto md:shadow-none ${mobileMenuOpen ? "flex fixed top-16 bottom-0 left-0 z-50 w-[min(18rem,85vw)] overflow-y-auto shadow-2xl animate-fadeIn" : "hidden"}`}
        >
          <div className="space-y-1">
            <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Bidding Modules</span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse-dot" />
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-linear-to-r from-blue-600/20 via-slate-800/80 to-slate-800/40 text-white font-bold border border-blue-500/40 shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)] transition-colors"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                  style={{
                    borderLeft: isActive
                      ? `3px solid ${brandColor}`
                      : undefined,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-transform ${isActive ? "scale-110" : ""}`}
                      style={{ color: isActive ? brandColor : undefined }}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                        isActive
                          ? "bg-blue-500/25 text-blue-300 border border-blue-500/30"
                          : "bg-slate-800/80 text-slate-500 border border-slate-700/50"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer: Active Tenant Summary with 3D Border Glow */}
          <div className="p-3.5 rounded-xl glass-card-3d border border-slate-800/90 space-y-2 mt-4">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold">Tenant Scope</span>
              <span className="font-mono text-emerald-400 flex items-center gap-1 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
            </div>
            <p className="text-xs font-black text-white truncate">
              {currentTenant?.companyName}
            </p>
            <div className="text-[10px] text-slate-400 space-y-0.5 font-mono">
              <p>TIN: {currentTenant?.tin}</p>
              <p>PCAB: {currentTenant?.pcabLicenseNo || "N/A"}</p>
            </div>
          </div>
        </aside>

        {/* MAIN VIEWPORT */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-24 md:pb-8 min-h-[calc(100vh-4rem)] min-w-0">
          <div className="w-full max-w-[1780px] mx-auto space-y-5">
            {/* Top Workspace Navigation Bar with Back & Breadcrumb Controls */}
            <div className="flex items-center justify-between gap-2 p-2 sm:p-3 sm:px-4 rounded-2xl bg-[#0a0f1e]/85 border border-slate-800/90 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-2.5 min-w-0">
                {(onBack || onBackToLanding) && (
                  <button
                    type="button"
                    onClick={onBack || onBackToLanding}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700/90 border border-slate-700 hover:border-cyan-500/60 shadow-md transition-all cursor-pointer group"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
                    <span className="truncate max-w-36 sm:max-w-none"><span className="sm:hidden">Back</span><span className="hidden sm:inline">Back {previousTabLabel ? `to ${previousTabLabel}` : 'to Previous Page'}</span></span>
                  </button>
                )}

                <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-400 pl-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("dashboard")}
                    className="hover:text-cyan-400 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
                    <span>Workspace</span>
                  </button>
                  <span>/</span>
                  <span className="text-white font-bold">{currentTabLabel}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {activeTab !== "dashboard" && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("dashboard")}
                    className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden sm:inline">Dashboard Home</span>
                  </button>
                )}
                {onBackToLanding && (
                  <button
                    type="button"
                    onClick={onBackToLanding}
                    className="text-xs font-semibold text-cyan-300 hover:text-white px-3 py-1.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 hover:border-cyan-400 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden sm:inline">Landing Portal</span>
                  </button>
                )}
              </div>
            </div>

            {children}
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM TAB BAR - thumb-reach navigation for phones */}
      <nav
        aria-label="Quick navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-800/90 bg-[#080c16]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid grid-cols-5">
          {[
            { id: "dashboard", label: "Home", icon: LayoutDashboard },
            { id: "opportunities", label: "Finder", icon: Search },
            { id: "vault", label: "Vault", icon: FileCheck },
            { id: "bids", label: "Bids", icon: FolderKanban },
          ].map((t) => {
            const Icon = t.icon;
            const on = activeTab === t.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => { setActiveTab(t.id); setMobileMenuOpen(false); }}
                  aria-current={on ? "page" : undefined}
                  className={`w-full min-h-14 flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors cursor-pointer ${on ? "text-white" : "text-slate-400 active:text-slate-200"}`}
                >
                  <Icon className="w-5 h-5" style={{ color: on ? brandColor : undefined }} />
                  <span>{t.label}</span>
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-expanded={mobileMenuOpen}
              className={`w-full min-h-14 flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors cursor-pointer ${mobileMenuOpen ? "text-white" : "text-slate-400"}`}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>

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
                  Temporary Password Active
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
              <p className="font-bold">⚠️ System Security Requirement:</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                An administrator issued you a temporary password. Choose your own
                password (min 8 characters, letters and numbers) before continuing.
              </p>
            </div>

            {pwError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-medium">
                ⚠️ {pwError}
              </div>
            )}

            <form
              onSubmit={handlePasswordChangeSubmit}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  New System Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter new password (min 8 chars)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    {showNewPw ? (
                      <EyeOff className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Confirm New Password <span className="text-red-400">*</span>
                </label>
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
                    {showConfirmPw ? (
                      <EyeOff className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-400" />
                    )}
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
    </AuroraBackground>
  );
};

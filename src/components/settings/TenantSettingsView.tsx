import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  UserRole,
  isApproverRole,
  getRoleDisplayName,
} from "../../types";
import {
  Building2,
  Palette,
  Award,
  Save,
  CheckCircle2,
  Users,
  UserPlus,
  Trash2,
  KeyRound,
  AlertCircle,
} from "lucide-react";

const PRESET_COLORS = [
  { name: "Navy Blue", hex: "#1e40af" },
  { name: "Emerald Green", hex: "#059669" },
  { name: "Royal Purple", hex: "#7c3aed" },
  { name: "Crimson Red", hex: "#dc2626" },
  { name: "Slate Teal", hex: "#0d9488" },
  { name: "Deep Amber", hex: "#d97706" },
];

export const TenantSettingsView: React.FC = () => {
  const {
    currentTenant,
    currentUser,
    users,
    createTeamUser,
    deleteTeamUser,
    resetUserPassword,
    updateTenantSettings,
    deleteCompany,
  } = useAuth();

  // Team Accounts & User Management States
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("ESTIMATOR");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [userMsg, setUserMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const tenantUsers = users;

  const [companyName, setCompanyName] = useState(
    currentTenant?.companyName || "",
  );
  const [brandCode, setBrandCode] = useState(currentTenant?.brandCode || "");
  const [brandColor, setBrandColor] = useState(
    currentTenant?.brandColor || "#1e40af",
  );
  const [tin, setTin] = useState(currentTenant?.tin || "");
  const [secDtiRegNo, setSecDtiRegNo] = useState(
    currentTenant?.secDtiRegNo || "",
  );
  const [pcabLicenseNo, setPcabLicenseNo] = useState(
    currentTenant?.pcabLicenseNo || "",
  );
  const [pcabCategory, setPcabCategory] = useState(
    currentTenant?.pcabCategory || "",
  );
  const [philgepsPlatinumNo, setPhilgepsPlatinumNo] = useState(
    currentTenant?.philgepsPlatinumNo || "",
  );
  const [address, setAddress] = useState(currentTenant?.address || "");

  const [signatoryName, setSignatoryName] = useState(
    currentTenant?.authorizedSignatory?.name || "",
  );
  const [signatoryTitle, setSignatoryTitle] = useState(
    currentTenant?.authorizedSignatory?.title || "",
  );

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
        tin: tin,
      },
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
            <h1 className="text-2xl font-bold text-white">
              White-Label Tenant Engine Settings
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Zero-hardcoding configuration file (`tenant.config.json`
            equivalent). Updating values re-skins the entire BIDOCS platform
            instantly.
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
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Legal Company Business Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Brand Code
              </label>
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
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Primary Brand Theme Color
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setBrandColor(c.hex)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    brandColor === c.hex
                      ? "border-white bg-slate-800 text-white shadow"
                      : "border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span>{c.name}</span>
                </button>
              ))}

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-slate-400 font-mono">
                  {brandColor}
                </span>
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
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tax Identification No. (TIN)
              </label>
              <input
                type="text"
                value={tin}
                onChange={(e) => setTin(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                SEC / DTI Registration No.
              </label>
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
              <label className="block text-xs font-medium text-slate-300 mb-1">
                PCAB License No.
              </label>
              <input
                type="text"
                value={pcabLicenseNo}
                onChange={(e) => setPcabLicenseNo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                PCAB Category
              </label>
              <input
                type="text"
                value={pcabCategory}
                onChange={(e) => setPcabCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                PhilGEPS Platinum No.
              </label>
              <input
                type="text"
                value={philgepsPlatinumNo}
                onChange={(e) => setPhilgepsPlatinumNo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Official Business Address
            </label>
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
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Signatory Full Name
              </label>
              <input
                type="text"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Official Title
              </label>
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

      {/* TEAM ACCOUNTS & ROLE-BASED APPROVAL CONTROLS */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold border border-blue-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Team Accounts &amp; Role-Based Approval Controls</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                  Dual-Approval Active
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Estimator &amp; Staff accounts can prepare POW, Quotation, and
                Bidding Documents. Company Owner or Higher Manager approval is
                mandatory before official printing.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!isApproverRole(currentUser?.role)) {
                setUserMsg({
                  type: "error",
                  text: "Only an approver can create team accounts.",
                });
                return;
              }
              setShowAddUserModal(true);
              setUserMsg(null);
            }}
            disabled={!isApproverRole(currentUser?.role)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition shadow-lg shadow-blue-500/20 flex items-center gap-2 cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Create Team Member Account</span>
          </button>
        </div>

        {userMsg && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              userMsg.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-red-500/10 border-red-500/30 text-red-300"
            }`}
          >
            {userMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{userMsg.text}</span>
          </div>
        )}

        {/* Existing Accounts Table */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase font-mono">
            Registered Accounts for {currentTenant?.companyName} (
            {tenantUsers.length})
          </div>

          <div className="grid grid-cols-1 gap-3">
            {tenantUsers.map((u) => {
              const isCurrent = currentUser?.id === u.id;
              const isApprover = isApproverRole(u.role);

              return (
                <div
                  key={u.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                    isCurrent
                      ? "bg-blue-950/30 border-blue-500/50 shadow-md shadow-blue-950/50"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-md shrink-0"
                      style={{ backgroundColor: brandColor }}
                    >
                      {u.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">
                          {u.fullName}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold">
                            Active Session (You)
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                            isApprover
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                          }`}
                        >
                          {getRoleDisplayName(u.role)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-0.5">
                        <span>{u.email}</span>
                        <span>•</span>
                        <span>
                          {isApprover
                            ? "Authority: Review, Approve & Authorize Print"
                            : "Authority: Create & Draft (Needs Approval)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isCurrent && isApproverRole(currentUser?.role) && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm(`Issue a new temporary password for "${u.fullName}"? Their current password stops working.`)) return;
                          const res = await resetUserPassword(u.id);
                          if (res.success) {
                            window.prompt(
                              `Temporary password for ${u.email} (shown once - copy it now and share it securely). They must change it at next login:`,
                              res.tempPassword,
                            );
                            setUserMsg({ type: "success", text: `Temporary password issued for ${u.fullName}.` });
                          } else {
                            setUserMsg({ type: "error", text: res.error || "Could not reset password." });
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
                        title={`Issue a temporary password for ${u.fullName}`}
                      >
                        <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                        <span>Reset Password</span>
                      </button>
                    )}

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete user account "${u.fullName}" (${u.email})?`,
                            )
                          ) {
                            const removed = deleteTeamUser(u.id);
                            setUserMsg(
                              removed
                                ? { type: "success", text: `Account "${u.fullName}" removed successfully.` }
                                : { type: "error", text: "You are not permitted to remove that account." },
                            );
                          }
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-600/30 text-slate-400 hover:text-red-300 border border-slate-700 transition cursor-pointer"
                        title="Delete User Account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CREATE TEAM USER MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-5 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Create New Team Account
                  </h3>
                  <p className="text-xs text-slate-400">
                    For {currentTenant?.companyName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await createTeamUser({
                  fullName: newUserName,
                  email: newUserEmail,
                  role: newUserRole,
                  password: newUserPassword,
                });
                if (res.success) {
                  setUserMsg({
                    type: "success",
                    text: `Account created for "${newUserName}" as ${getRoleDisplayName(newUserRole)}! They must change the initial password at first login.`,
                  });
                  setShowAddUserModal(false);
                  setNewUserName("");
                  setNewUserEmail("");
                  setNewUserPassword("");
                } else {
                  alert(res.error || "Failed to create user account.");
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name (Engineer / Estimator / Manager) *
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Engr. Dexter S. Tan"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Work Email Address *
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="e.g. estimator@company.ph"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assigned Operational Role &amp; Permission Scope *
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="DOCUMENT_PREPARER">
                    📝 Document Preparer (Can create POW / Quotation / Bid Docs;
                    Needs Approval to Print)
                  </option>
                  <option value="ESTIMATOR">
                    🛠️ Technical Estimator (Can create POW/Quotation/Bidding
                    Docs; Needs Owner Approval to Print)
                  </option>
                  <option value="BID_MANAGER">
                    📋 Bid Manager (Can create POW/Quotation/Bidding Dossiers;
                    Needs Owner Approval to Print)
                  </option>
                  {currentUser?.role !== "HIGHER_MANAGER" && (
                    <>
                      <option value="HIGHER_MANAGER">
                        💼 Higher Manager (Approver: Authorizes &amp; Approves
                        Documents for Official Printing)
                      </option>
                      <option value="COMPANY_OWNER">
                        👑 Company Owner (Executive Approver &amp; Signing
                        Authority)
                      </option>
                    </>
                  )}
                </select>

                <p className="text-[11px] text-slate-400 mt-1.5 italic font-sans">
                  {newUserRole === "ESTIMATOR" || newUserRole === "BID_MANAGER"
                    ? "⚠️ This user can draft and edit POW, Quotation, and Bidding Documents, but the system will require Owner / Higher Manager approval before official printing or PDF export."
                    : "✅ This user will have full approval rights to review, approve, and authorize official printing."}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Min 8 characters, letters and numbers"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Temporary: the user must change it at first login.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition shadow-lg shadow-blue-500/25 cursor-pointer"
                >
                  Create Account &amp; Grant Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete company (approvers only; affects this company, never other companies) */}
      {isApproverRole(currentUser?.role) && (
        <div className="glass-panel p-6 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider">
                Delete Company
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Permanently deletes this company, its accounts, projects and uploaded documents. Other companies are not affected.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                const typed = window.prompt(
                  `Type the company name "${currentTenant?.companyName}" to permanently delete everything:`,
                );
                if (typed !== null && typed.trim() === currentTenant?.companyName) {
                  await deleteCompany();
                  window.location.reload();
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600/80 hover:bg-red-600 text-white shadow transition shrink-0"
            >
              Delete Company &amp; All Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

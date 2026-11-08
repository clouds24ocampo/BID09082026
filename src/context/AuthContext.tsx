import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { Tenant, User, UserRole, isApproverRole } from "../types";
import { purgeTenantData } from "../utils/vaultIndexedDB";
import { runUntracked } from "../sync/hooks";
import { safeGetItem, safeGetJson, safeSetJson, safeRemoveItem } from "../utils/safeStorage";
import {
  hashPassword,
  verifyPassword,
  validatePassword,
  generateTempPassword,
  LEGACY_DEFAULT_PASSWORD,
} from "../utils/passwordSecurity";

const SESSION_KEY = "bidocs_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_BASE_MS = 60 * 1000;
const LOCKOUT_MAX_MS = 15 * 60 * 1000;

type Result = { success: boolean; error?: string };

/** User record as stored (carries the password hash). Never exposed through the context. */
type StoredUser = User & { password?: string };

const readList = <T,>(key: string): T[] => {
  const parsed = safeGetJson<unknown>(key, []);
  return Array.isArray(parsed) ? (parsed as T[]) : [];
};

const publicUser = (u: StoredUser): User => {
  const { passwordHash: _h, passwordSalt: _s, password: _p, ...rest } = u;
  return rest;
};

const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

/** Owners/admins manage anyone; higher managers manage only non-approver roles. */
const canManageRole = (caller: UserRole | undefined, target: UserRole): boolean => {
  if (caller === "COMPANY_OWNER" || caller === "SYSTEM_ADMIN") return true;
  if (caller === "HIGHER_MANAGER") return !isApproverRole(target);
  return false;
};

const readSession = (): { userId: string; expiresAt: number } | null => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s && typeof s.userId === "string" && typeof s.expiresAt === "number" && s.expiresAt > Date.now()) {
      return s;
    }
  } catch {
    /* ignore */
  }
  return null;
};

const writeSession = (userId: string | null) => {
  try {
    if (userId) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId, expiresAt: Date.now() + SESSION_TTL_MS }));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    /* ignore */
  }
};

// Brute-force throttle (per email). Client-side only: slows casual guessing, not a substitute for a server.
type Attempts = Record<string, { count: number; lockedUntil: number }>;
const readAttempts = (): Attempts => safeGetJson<Attempts>("bidocs_login_attempts", {});
const recordFailure = (email: string) => {
  const all = readAttempts();
  const count = (all[email]?.count || 0) + 1;
  const lockedUntil =
    count >= MAX_FAILED_ATTEMPTS
      ? Date.now() + Math.min(LOCKOUT_BASE_MS * 2 ** (count - MAX_FAILED_ATTEMPTS), LOCKOUT_MAX_MS)
      : 0;
  all[email] = { count, lockedUntil };
  safeSetJson("bidocs_login_attempts", all);
};
const clearFailures = (email: string) => {
  const all = readAttempts();
  if (all[email]) {
    delete all[email];
    safeSetJson("bidocs_login_attempts", all);
  }
};

/** Legacy builds kept plaintext passwords and cross-company project data in these places. Scrubbed on startup. */
const scrubLegacySecrets = () => {
  for (const key of ["bidocs_current_user", "bidocs_opportunities", "bidocs_active_project", "bidocs_active_vault_project"]) {
    safeRemoveItem(key);
  }
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith("bidocs_system_")) localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
};

interface AuthContextType {
  currentUser: User | null;
  currentTenant: Tenant | null;
  /** True when at least one company account exists on this device. */
  hasAccounts: boolean;
  /** Users of the signed-in company only. */
  users: User[];
  login: (email: string, password: string) => Promise<Result>;
  logout: () => void;
  registerTenantAndUser: (
    tenantData: Omit<Tenant, "id" | "createdAt">,
    userData: { email: string; fullName: string; password: string },
  ) => Promise<Result>;
  createTeamUser: (userData: {
    fullName: string;
    email: string;
    role: UserRole;
    password: string;
  }) => Promise<Result>;
  deleteTeamUser: (userId: string) => boolean;
  updateTenantSettings: (updatedTenant: Partial<Tenant>) => void;
  /** Approver sets a one-time temporary password; the user must change it at next login. */
  resetUserPassword: (userId: string) => Promise<Result & { tempPassword?: string }>;
  updateUserPassword: (userId: string, newPassword: string) => Promise<Result>;
  /** Permanently deletes the signed-in company, its accounts and all of its data on this device. */
  deleteCompany: () => Promise<void>;
  /** True when this company id or login email already exists on this device (restore must not touch it). */
  companyExistsOnDevice: (tenantId: string, email: string) => boolean;
  /** Creates a company restored from the online account, with a new local owner login, and signs in. */
  importCloudCompany: (
    tenant: Tenant,
    userData: { email: string; fullName: string; password: string },
  ) => Promise<Result>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allTenants, setAllTenants] = useState<Tenant[]>(() => {
    scrubLegacySecrets();
    return readList<Tenant>("bidocs_tenants").filter((t) => t && t.id && t.companyName);
  });
  const [allUsers, setAllUsers] = useState<StoredUser[]>(() =>
    readList<StoredUser>("bidocs_users").filter((u) => u && u.id && u.email),
  );
  const [sessionUserId, setSessionUserId] = useState<string | null>(() => readSession()?.userId ?? null);

  const sessionUser = allUsers.find((u) => u.id === sessionUserId) || null;
  const currentTenant = (sessionUser && allTenants.find((t) => t.id === sessionUser.tenantId)) || null;
  // A session is only valid when both the account and its company exist.
  const currentUser = sessionUser && currentTenant ? publicUser(sessionUser) : null;
  const users = currentTenant
    ? allUsers.filter((u) => u.tenantId === currentTenant.id).map(publicUser)
    : [];

  useEffect(() => {
    document.documentElement.style.setProperty("--brand-primary", currentTenant?.brandColor || "#1e40af");
    document.documentElement.style.setProperty(
      "--brand-primary-hover",
      currentTenant?.brandColor ? adjustColorHex(currentTenant.brandColor, -20) : "#1d4ed8",
    );
  }, [currentTenant?.brandColor]);

  useEffect(() => {
    safeSetJson("bidocs_tenants", allTenants);
  }, [allTenants]);
  useEffect(() => {
    safeSetJson("bidocs_users", allUsers);
  }, [allUsers]);

  // Keep tabs consistent: another tab changed accounts (e.g. password change or deletion).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.newValue) return;
      try {
        if (e.key === "bidocs_users") setAllUsers(JSON.parse(e.newValue));
        else if (e.key === "bidocs_tenants") setAllTenants(JSON.parse(e.newValue));
      } catch {
        /* ignore malformed value */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Sync applied a newer company profile to storage: pick it up without a reload.
  useEffect(() => {
    const onTenants = () => setAllTenants(readList<Tenant>("bidocs_tenants").filter((t) => t && t.id && t.companyName));
    window.addEventListener("bidocs:tenants-updated", onTenants);
    return () => window.removeEventListener("bidocs:tenants-updated", onTenants);
  }, []);

  const endSession = useCallback(() => {
    writeSession(null);
    setSessionUserId(null);
  }, []);

  // Drop a session whose account/company no longer exists (e.g. deleted in another tab).
  useEffect(() => {
    if (sessionUserId && !currentUser) endSession();
  }, [sessionUserId, currentUser, endSession]);

  // Idle + absolute session timeout.
  const lastActivity = useRef(Date.now());
  useEffect(() => {
    if (!currentUser) return;
    lastActivity.current = Date.now();
    const touch = () => {
      lastActivity.current = Date.now();
    };
    const events = ["mousedown", "keydown", "touchstart", "scroll"] as const;
    events.forEach((ev) => window.addEventListener(ev, touch, { passive: true }));
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity.current > IDLE_TIMEOUT_MS || !readSession()) endSession();
    }, 30_000);
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, touch));
      window.clearInterval(timer);
    };
  }, [currentUser?.id, endSession]);

  const startSession = (user: StoredUser) => {
    writeSession(user.id);
    setSessionUserId(user.id);
  };

  const login = async (email: string, password: string): Promise<Result> => {
    const normalizedEmail = email.trim().toLowerCase();
    const generic: Result = { success: false, error: "Invalid email or password." };
    if (!crypto?.subtle) {
      return { success: false, error: "A secure (HTTPS) connection is required to sign in." };
    }

    const attempt = readAttempts()[normalizedEmail];
    if (attempt && attempt.lockedUntil > Date.now()) {
      const secs = Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
      return { success: false, error: `Too many failed attempts. Try again in ${secs}s.` };
    }

    const found = allUsers.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!found || !allTenants.some((t) => t.id === found.tenantId)) {
      recordFailure(normalizedEmail);
      return generic;
    }

    let updated: StoredUser = found;
    if (found.passwordHash && found.passwordSalt) {
      if (!(await verifyPassword(password, found.passwordHash, found.passwordSalt))) {
        recordFailure(normalizedEmail);
        return generic;
      }
    } else {
      // Legacy plaintext account: verify once, then upgrade to a salted hash and delete the plaintext.
      const legacyKey = `bidocs_user_password_${normalizedEmail}`;
      const legacyPw = safeGetItem(legacyKey) || found.password;
      if (!legacyPw || legacyPw !== password) {
        recordFailure(normalizedEmail);
        return generic;
      }
      const { password: _drop, ...rest } = found;
      updated = {
        ...rest,
        ...(await hashPassword(password)),
        mustChangePassword: found.mustChangePassword || password === LEGACY_DEFAULT_PASSWORD,
      };
      safeRemoveItem(legacyKey);
      safeRemoveItem(`bidocs_must_change_password_${normalizedEmail}`);
    }

    clearFailures(normalizedEmail);
    updated = { ...updated, lastLoginAt: new Date().toISOString() };
    setAllUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    startSession(updated);
    return { success: true };
  };

  const logout = () => endSession();

  const registerTenantAndUser: AuthContextType["registerTenantAndUser"] = async (tenantData, userData) => {
    const email = userData.email.trim().toLowerCase();
    if (!email || !userData.fullName.trim()) {
      return { success: false, error: "Full name and email are required." };
    }
    const pwError = validatePassword(userData.password);
    if (pwError) return { success: false, error: pwError };
    if (allUsers.some((u) => u.email.toLowerCase() === email)) {
      return { success: false, error: "An account with this email already exists." };
    }

    const tenant: Tenant = { ...tenantData, id: uid("tenant"), createdAt: new Date().toISOString() };
    const user: StoredUser = {
      id: uid("user"),
      tenantId: tenant.id,
      email,
      fullName: userData.fullName.trim(),
      role: "COMPANY_OWNER",
      ...(await hashPassword(userData.password)),
      mustChangePassword: false,
      lastLoginAt: new Date().toISOString(),
    };
    setAllTenants((prev) => [...prev, tenant]);
    setAllUsers((prev) => [...prev, user]);
    startSession(user);
    return { success: true };
  };

  const createTeamUser: AuthContextType["createTeamUser"] = async (userData) => {
    if (!currentTenant || !currentUser) return { success: false, error: "Not signed in." };
    if (!canManageRole(currentUser.role, userData.role)) {
      return { success: false, error: "You are not permitted to create an account with that role." };
    }
    const email = userData.email.trim().toLowerCase();
    if (!email || !userData.fullName.trim()) {
      return { success: false, error: "Full name and valid email are required." };
    }
    if (allUsers.some((u) => u.email.toLowerCase() === email)) {
      return { success: false, error: "An account with this email address already exists." };
    }
    const pwError = validatePassword(userData.password);
    if (pwError) return { success: false, error: pwError };

    const user: StoredUser = {
      id: uid("user"),
      tenantId: currentTenant.id,
      email,
      fullName: userData.fullName.trim(),
      role: userData.role,
      ...(await hashPassword(userData.password)),
      mustChangePassword: true,
    };
    setAllUsers((prev) => [...prev, user]);
    return { success: true };
  };

  const deleteTeamUser = (userId: string): boolean => {
    const target = allUsers.find((u) => u.id === userId);
    if (!currentUser || !target || target.tenantId !== currentUser.tenantId || target.id === currentUser.id) {
      return false;
    }
    if (!canManageRole(currentUser.role, target.role)) return false;
    setAllUsers((prev) => prev.filter((u) => u.id !== userId));
    return true;
  };

  const updateTenantSettings = (updatedFields: Partial<Tenant>) => {
    if (!currentTenant || !isApproverRole(currentUser?.role)) return;
    const { id: _id, ...fields } = updatedFields;
    setAllTenants((prev) => prev.map((t) => (t.id === currentTenant.id ? { ...t, ...fields } : t)));
  };

  const setPassword = async (target: StoredUser, newPassword: string, mustChange: boolean) => {
    const hashed = await hashPassword(newPassword);
    setAllUsers((prev) =>
      prev.map((u) => (u.id === target.id ? { ...u, ...hashed, password: undefined, mustChangePassword: mustChange } : u)),
    );
    clearFailures(target.email.toLowerCase());
  };

  const resetUserPassword: AuthContextType["resetUserPassword"] = async (userId) => {
    const target = allUsers.find((u) => u.id === userId);
    if (!currentUser || !target || target.tenantId !== currentUser.tenantId) {
      return { success: false, error: "Account not found." };
    }
    if (target.id === currentUser.id || !canManageRole(currentUser.role, target.role)) {
      return { success: false, error: "You are not permitted to reset this account." };
    }
    const tempPassword = generateTempPassword();
    await setPassword(target, tempPassword, true);
    return { success: true, tempPassword };
  };

  const updateUserPassword: AuthContextType["updateUserPassword"] = async (userId, newPassword) => {
    const target = allUsers.find((u) => u.id === userId);
    // Passwords are changed only for your own account; approvers use resetUserPassword for others.
    if (!currentUser || !target || target.id !== currentUser.id) {
      return { success: false, error: "You can only change your own password." };
    }
    const pwError = validatePassword(newPassword);
    if (pwError) return { success: false, error: pwError };
    await setPassword(target, newPassword, false);
    return { success: true };
  };

  const companyExistsOnDevice = (tenantId: string, email: string) =>
    allTenants.some((t) => t.id === tenantId) || allUsers.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());

  const importCloudCompany: AuthContextType["importCloudCompany"] = async (tenant, userData) => {
    const email = userData.email.trim().toLowerCase();
    if (!tenant || typeof tenant.id !== "string" || !tenant.id.startsWith("tenant-") || !tenant.companyName) {
      return { success: false, error: "The online company data is not valid." };
    }
    const pwError = validatePassword(userData.password);
    if (pwError) return { success: false, error: pwError };
    // Restore only creates a company this device does not have. A company or login that already exists here
    // must be opened with its local password: an online sign-in never replaces local credentials.
    if (allTenants.some((t) => t.id === tenant.id) || allUsers.some((u) => u.email.toLowerCase() === email)) {
      return {
        success: false,
        error: "This company or email already exists on this device. Use Log in with your local password.",
      };
    }
    const user: StoredUser = {
      id: uid("user"),
      tenantId: tenant.id,
      email,
      fullName: userData.fullName.trim() || email,
      role: "COMPANY_OWNER",
      ...(await hashPassword(userData.password)),
      mustChangePassword: false,
      lastLoginAt: new Date().toISOString(),
    };
    setAllTenants((prev) => [...prev, tenant]);
    setAllUsers((prev) => [...prev, user]);
    startSession(user);
    return { success: true };
  };

  const deleteCompany = async () => {
    if (!currentTenant || !isApproverRole(currentUser?.role)) return;
    const tenantId = currentTenant.id;
    let opportunityIds: string[] = [];
    try {
      const opps = JSON.parse(localStorage.getItem(`bidocs_opportunities_${tenantId}`) || "[]");
      if (Array.isArray(opps)) opportunityIds = opps.map((o: { id?: string }) => o?.id).filter(Boolean) as string[];
    } catch {
      /* ignore */
    }
    // Deleting a company here removes it from this device only. The online copy is kept
    // (and can be restored) until the owner deletes it explicitly from Settings > Online sync.
    await runUntracked(async () => {
      await purgeTenantData(tenantId, opportunityIds).catch((e) =>
        console.error("[AuthContext] Failed to purge company data:", e),
      );
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith("bidocs_") && key.includes(tenantId)) localStorage.removeItem(key);
        }
      } catch {
        /* ignore */
      }
    });
    endSession();
    setAllUsers((prev) => prev.filter((u) => u.tenantId !== tenantId));
    setAllTenants((prev) => prev.filter((t) => t.id !== tenantId));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentTenant,
        hasAccounts: allTenants.length > 0,
        users,
        login,
        logout,
        registerTenantAndUser,
        createTeamUser,
        deleteTeamUser,
        updateTenantSettings,
        resetUserPassword,
        updateUserPassword,
        deleteCompany,
        importCloudCompany,
        companyExistsOnDevice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Color utility helper
function adjustColorHex(hex: string, amount: number): string {
  let color = hex.replace("#", "");
  if (color.length === 3)
    color = color
      .split("")
      .map((c) => c + c)
      .join("");
  const num = parseInt(color, 16);
  if (Number.isNaN(num)) return hex;
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00ff) + amount;
  let b = (num & 0x0000ff) + amount;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

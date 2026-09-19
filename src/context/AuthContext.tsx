import React, { createContext, useContext, useState, useEffect } from "react";
import { Tenant, User, UserRole, isApproverRole } from "../types";
import {
  clearAllVaultData,
  purgeEntireApplicationStorage,
} from "../utils/vaultIndexedDB";
import { debugLog } from "../utils/debugLog";
import {
  safeGetItem,
  safeSetItem,
  safeGetJson,
  safeSetJson,
  safeRemoveItem,
} from "../utils/safeStorage";

const DEFAULT_TENANTS: Tenant[] = [];

const DEFAULT_USERS: User[] = [];

const FLUSH_KEY = "bidocs_live_clean_flush_v7_new_transaction";

// Automatic one-time clean flush for pristine new transaction
const purgeLegacyMockData = () => {
  try {
    if (typeof localStorage === "undefined") return;
    const isFlushedForLive = safeGetItem(FLUSH_KEY);
    if (!isFlushedForLive) {
      purgeEntireApplicationStorage().catch((e) =>
        console.error("[AuthContext] Error purging database:", e),
      );
      safeSetItem(FLUSH_KEY, "true");
      console.log(
        "[BiDOCS] Database and storage flushed clean for new transaction.",
      );
    }
  } catch (e) {
    console.error("[AuthContext] Error flushing legacy mock data:", e);
  }
};

purgeLegacyMockData();

const getSavedTenants = (): Tenant[] => {
  const parsed = safeGetJson<any[]>("bidocs_tenants", []);
  if (!parsed || !Array.isArray(parsed) || parsed.length === 0)
    return DEFAULT_TENANTS;
  const valid = parsed.filter(
    (t: any) => t && t.companyName && t.id && t.id !== "tenant-default-001",
  );
  return valid.length > 0 ? valid : DEFAULT_TENANTS;
};

const getSavedUsers = (): User[] => {
  const parsed = safeGetJson<any[]>("bidocs_users", []);
  if (!parsed || !Array.isArray(parsed) || parsed.length === 0)
    return DEFAULT_USERS;
  const valid = parsed.filter(
    (u: any) =>
      u && u.id !== "user-default-001" && u.email !== "admin@metrobuilders.ph",
  );
  return valid.length > 0 ? valid : DEFAULT_USERS;
};

interface AuthContextType {
  currentUser: User | null;
  currentTenant: Tenant | null;
  tenants: Tenant[];
  users: User[];
  login: (
    email: string,
    password: string,
    role?: UserRole,
    tenantId?: string,
  ) => boolean;
  logout: () => void;
  registerTenantAndUser: (
    tenantData: Omit<Tenant, "id" | "createdAt">,
    userData: Omit<User, "id" | "tenantId">,
  ) => boolean;
  createTeamUser: (userData: {
    fullName: string;
    email: string;
    role: UserRole;
    password?: string;
  }) => { success: boolean; error?: string };
  switchUser: (userId: string) => boolean;
  deleteTeamUser: (userId: string) => boolean;
  switchTenant: (tenantId: string) => void;
  updateTenantSettings: (updatedTenant: Partial<Tenant>) => void;
  resetUserPassword: (email: string) => boolean;
  updateUserPassword: (userId: string, newPassword: string) => void;
  resetAllData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tenants, setTenants] = useState<Tenant[]>(() => {
    return getSavedTenants();
  });

  const [users, setUsers] = useState<User[]>(() => {
    return getSavedUsers();
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedTenants = getSavedTenants();
    if (savedTenants.length === 0) return null;
    const u = safeGetJson<User | null>("bidocs_current_user", null);
    if (u && u.id && savedTenants.some((t) => t.id === u.tenantId)) {
      return u;
    }
    return null;
  });

  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(() => {
    const savedTenants = getSavedTenants();
    if (savedTenants.length === 0) return null;
    const u = safeGetJson<User | null>("bidocs_current_user", null);
    if (u && u.tenantId) {
      const matched = savedTenants.find((t: Tenant) => t.id === u.tenantId);
      if (matched) return matched;
    }
    return savedTenants[0] || null;
  });

  // Apply CSS primary brand color whenever active tenant changes
  useEffect(() => {
    if (currentTenant && currentTenant.brandColor) {
      document.documentElement.style.setProperty(
        "--brand-primary",
        currentTenant.brandColor,
      );
      document.documentElement.style.setProperty(
        "--brand-primary-hover",
        adjustColorHex(currentTenant.brandColor, -20),
      );
    } else {
      document.documentElement.style.setProperty("--brand-primary", "#1e40af");
      document.documentElement.style.setProperty(
        "--brand-primary-hover",
        "#1d4ed8",
      );
    }
  }, [currentTenant]);

  // Persist tenants and users
  useEffect(() => {
    safeSetJson("bidocs_tenants", tenants);
  }, [tenants]);

  useEffect(() => {
    safeSetJson("bidocs_users", users);
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      safeSetJson("bidocs_current_user", currentUser);
    } else {
      safeRemoveItem("bidocs_current_user");
    }
  }, [currentUser]);

  const login = (
    email: string,
    password: string,
    _role?: UserRole,
    _tenantId?: string,
  ): boolean => {
    const normalizedEmail = email.trim().toLowerCase();

    // Find registered user — do NOT auto-create unknown users
    const foundUser = users.find(
      (u) => u.email.toLowerCase() === normalizedEmail,
    );
    if (!foundUser) {
      // #region agent log
      debugLog(
        "AuthContext.tsx:login",
        "Login rejected: user not found",
        {
          normalizedEmail,
          userCount: users.length,
        },
        "D",
      );
      // #endregion
      return false; // Unknown email → reject login
    }

    // Validate password against stored password
    const storedPw =
      safeGetItem(`bidocs_user_password_${normalizedEmail}`) ||
      foundUser.password;
    if (!storedPw || storedPw !== password) {
      // #region agent log
      debugLog(
        "AuthContext.tsx:login",
        "Login rejected: password mismatch",
        {
          normalizedEmail,
          hasStoredPwKey: !!safeGetItem(
            `bidocs_user_password_${normalizedEmail}`,
          ),
          hasUserObjectPw: !!foundUser.password,
        },
        "D",
      );
      // #endregion
      return false; // Wrong password → reject login
    }

    const storedFlag = safeGetItem(
      `bidocs_must_change_password_${normalizedEmail}`,
    );
    const isMustChange =
      storedFlag === "true" ||
      storedPw === "BiDOCS#2026" ||
      foundUser.mustChangePassword === true;

    // Resolve tenant — must match the user's own tenantId
    const tenant = tenants.find((t) => t.id === foundUser.tenantId);
    if (!tenant) {
      return false; // User's tenant doesn't exist → reject login
    }

    const userToSet: User = {
      ...foundUser,
      password: storedPw,
      mustChangePassword: isMustChange,
      lastLoginAt: new Date().toISOString(),
    };

    setCurrentUser(userToSet);
    setCurrentTenant(tenant);
    // #region agent log
    debugLog(
      "AuthContext.tsx:login",
      "Login succeeded",
      {
        userId: userToSet.id,
        tenantId: tenant.id,
        mustChangePassword: isMustChange,
      },
      "D",
    );
    // #endregion
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentTenant(null);
  };

  const registerTenantAndUser = (
    tenantData: Omit<Tenant, "id" | "createdAt">,
    userData: Omit<User, "id" | "tenantId">,
  ): boolean => {
    const newTenantId = `tenant-${Date.now()}`;
    const newUserId = `user-${Date.now()}`;
    const userPw = userData.password || "BiDOCS#2026";

    const newTenant: Tenant = {
      ...tenantData,
      id: newTenantId,
      createdAt: new Date().toISOString(),
    };

    const newUser: User = {
      ...userData,
      id: newUserId,
      tenantId: newTenantId,
      password: userPw,
      mustChangePassword: false,
      lastLoginAt: new Date().toISOString(),
    };

    const userEmail = userData.email.trim().toLowerCase();
    safeSetItem(`bidocs_user_password_${userEmail}`, userPw);
    safeSetItem(`bidocs_must_change_password_${userEmail}`, "false");

    setTenants((prev) => [...prev, newTenant]);
    setUsers((prev) => [...prev, newUser]);

    setCurrentTenant(newTenant);
    setCurrentUser(newUser);

    return true;
  };

  const createTeamUser = (userData: {
    fullName: string;
    email: string;
    role: UserRole;
    password?: string;
  }): { success: boolean; error?: string } => {
    if (!currentTenant)
      return { success: false, error: "No active company profile." };
    if (!isApproverRole(currentUser?.role)) {
      return {
        success: false,
        error:
          "Only a Company Owner, Higher Manager, or System Administrator can create team accounts.",
      };
    }
    const normalizedEmail = userData.email.trim().toLowerCase();
    if (!normalizedEmail || !userData.fullName.trim()) {
      return {
        success: false,
        error: "Full name and valid email are required.",
      };
    }

    if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      return {
        success: false,
        error: "An account with this email address already exists.",
      };
    }

    const userPw = userData.password?.trim() || "BiDOCS#2026";
    const newUser: User = {
      id: `user-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      tenantId: currentTenant.id,
      email: normalizedEmail,
      fullName: userData.fullName.trim(),
      role: userData.role,
      password: userPw,
      mustChangePassword: false,
      lastLoginAt: new Date().toISOString(),
    };

    safeSetItem(`bidocs_user_password_${normalizedEmail}`, userPw);
    safeSetItem(`bidocs_must_change_password_${normalizedEmail}`, "false");

    setUsers((prev) => [...prev, newUser]);
    return { success: true };
  };

  const switchUser = (userId: string): boolean => {
    const target = users.find((u) => u.id === userId);
    if (!target) return false;

    const matchedTenant =
      tenants.find((t) => t.id === target.tenantId) || currentTenant;
    if (matchedTenant && matchedTenant.id !== currentTenant?.id) {
      setCurrentTenant(matchedTenant);
    }

    const userToSet: User = {
      ...target,
      lastLoginAt: new Date().toISOString(),
    };
    setCurrentUser(userToSet);
    safeSetJson("bidocs_current_user", userToSet);
    return true;
  };

  const deleteTeamUser = (userId: string): boolean => {
    if (currentUser?.id === userId) return false;
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    return true;
  };

  const switchTenant = (tenantId: string) => {
    const targetTenant = tenants.find((t) => t.id === tenantId);
    if (targetTenant) {
      setCurrentTenant(targetTenant);
      if (currentUser) {
        const updatedUser = { ...currentUser, tenantId: targetTenant.id };
        setCurrentUser(updatedUser);
      }
    }
  };

  const updateTenantSettings = (updatedFields: Partial<Tenant>) => {
    if (!currentTenant) return;
    const updated = { ...currentTenant, ...updatedFields };
    setCurrentTenant(updated);
    setTenants((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const resetUserPassword = (email: string): boolean => {
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) return false;

    setUsers((prev) => {
      const existing = prev.find((u) => u.email.toLowerCase() === targetEmail);
      if (existing) {
        return prev.map((u) =>
          u.email.toLowerCase() === targetEmail
            ? { ...u, password: "BiDOCS#2026", mustChangePassword: true }
            : u,
        );
      } else {
        const defaultTenantId = tenants[0]?.id || `tenant-${Date.now()}`;
        const newUser: User = {
          id: `user-${Date.now()}`,
          tenantId: defaultTenantId,
          email: email.trim(),
          fullName: email.split("@")[0].toUpperCase(),
          role: "COMPANY_OWNER",
          password: "BiDOCS#2026",
          mustChangePassword: true,
        };
        return [...prev, newUser];
      }
    });

    safeSetItem(`bidocs_user_password_${targetEmail}`, "BiDOCS#2026");
    safeSetItem(`bidocs_must_change_password_${targetEmail}`, "true");
    return true;
  };

  const updateUserPassword = (userId: string, newPassword: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId || (currentUser && u.email === currentUser.email)) {
          const updated = {
            ...u,
            password: newPassword,
            mustChangePassword: false,
          };
          safeSetItem(
            `bidocs_user_password_${u.email.toLowerCase()}`,
            newPassword,
          );
          safeSetItem(
            `bidocs_must_change_password_${u.email.toLowerCase()}`,
            "false",
          );
          return updated;
        }
        return u;
      }),
    );

    if (currentUser) {
      const updatedCurrent = {
        ...currentUser,
        password: newPassword,
        mustChangePassword: false,
      };
      setCurrentUser(updatedCurrent);
      safeSetItem(
        `bidocs_user_password_${currentUser.email.toLowerCase()}`,
        newPassword,
      );
      safeSetItem(
        `bidocs_must_change_password_${currentUser.email.toLowerCase()}`,
        "false",
      );
    }
  };

  const resetAllData = () => {
    purgeEntireApplicationStorage().catch((e) =>
      console.error("[AuthContext] Failed to purge application storage:", e),
    );
    try {
      localStorage.setItem(FLUSH_KEY, "true");
    } catch (_) {}
    setTenants([]);
    setUsers([]);
    setCurrentUser(null);
    setCurrentTenant(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentTenant,
        tenants,
        users,
        login,
        logout,
        registerTenantAndUser,
        createTeamUser,
        switchUser,
        deleteTeamUser,
        switchTenant,
        updateTenantSettings,
        resetUserPassword,
        updateUserPassword,
        resetAllData,
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
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00ff) + amount;
  let b = (num & 0x0000ff) + amount;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

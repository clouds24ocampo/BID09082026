import React, { createContext, useContext, useState, useEffect } from 'react';
import { Tenant, User, UserRole } from '../types';
import { clearAllVaultData } from '../utils/vaultIndexedDB';
import { debugLog } from '../utils/debugLog';



const DEFAULT_TENANTS: Tenant[] = [];

const DEFAULT_USERS: User[] = [];

// Automatic one-time clean flush for pristine real corporation onboarding
const purgeLegacyMockData = () => {
  try {
    if (typeof localStorage === 'undefined') return;
    const isFlushedForLive = localStorage.getItem('bidocs_live_clean_flush_v6');
    if (!isFlushedForLive) {
      localStorage.clear();
      if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
      if (typeof caches !== 'undefined') {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        }).catch(() => {});
      }
      clearAllVaultData().catch(() => {});
      try {
        if (typeof indexedDB !== 'undefined') {
          indexedDB.deleteDatabase('bidocs_vault_db');
        }
      } catch (_) {}
      localStorage.setItem('bidocs_live_clean_flush_v6', 'true');
    }
  } catch (e) {
    console.error('[AuthContext] Error flushing legacy mock data:', e);
  }
};

purgeLegacyMockData();

const getSavedTenants = (): Tenant[] => {
  const saved = localStorage.getItem('bidocs_tenants');
  if (!saved) return DEFAULT_TENANTS;
  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const valid = parsed.filter((t: any) => t && t.companyName && t.id && t.id !== 'tenant-default-001');
      return valid;
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_TENANTS;
};

const getSavedUsers = (): User[] => {
  const saved = localStorage.getItem('bidocs_users');
  if (!saved) return DEFAULT_USERS;
  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter((u: any) => u && u.id !== 'user-default-001' && u.email !== 'admin@metrobuilders.ph');
    }
  } catch (e) {
    debugLog('AuthContext.tsx:users-init', 'Failed to parse bidocs_users', { error: String(e) }, 'A');
  }
  return DEFAULT_USERS;
};

interface AuthContextType {
  currentUser: User | null;
  currentTenant: Tenant | null;
  tenants: Tenant[];
  login: (email: string, password: string, role?: UserRole, tenantId?: string) => boolean;
  logout: () => void;
  registerTenantAndUser: (tenantData: Omit<Tenant, 'id' | 'createdAt'>, userData: Omit<User, 'id' | 'tenantId'>) => boolean;
  switchTenant: (tenantId: string) => void;
  updateTenantSettings: (updatedTenant: Partial<Tenant>) => void;
  resetUserPassword: (email: string) => boolean;
  updateUserPassword: (userId: string, newPassword: string) => void;
  resetAllData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenants, setTenants] = useState<Tenant[]>(() => {
    return getSavedTenants();
  });

  const [users, setUsers] = useState<User[]>(() => {
    return getSavedUsers();
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedTenants = getSavedTenants();
    if (savedTenants.length === 0) return null;
    const saved = localStorage.getItem('bidocs_current_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u && u.id && savedTenants.some(t => t.id === u.tenantId)) {
          return u;
        }
      } catch (e) {
        debugLog('AuthContext.tsx:currentUser-init', 'Failed to parse bidocs_current_user', { error: String(e) }, 'A');
      }
    }
    return null;
  });

  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(() => {
    const savedTenants = getSavedTenants();
    if (savedTenants.length === 0) return null;
    const savedUserStr = localStorage.getItem('bidocs_current_user');
    if (savedUserStr) {
      try {
        const u = JSON.parse(savedUserStr);
        if (u && u.tenantId) {
          const matched = savedTenants.find((t: Tenant) => t.id === u.tenantId);
          if (matched) return matched;
        }
      } catch (e) {
        debugLog('AuthContext.tsx:currentTenant-init', 'Failed to parse bidocs_current_user for tenant lookup', { error: String(e) }, 'A');
      }
    }
    return savedTenants[0] || null;
  });

  // Apply CSS primary brand color whenever active tenant changes
  useEffect(() => {
    if (currentTenant && currentTenant.brandColor) {
      document.documentElement.style.setProperty('--brand-primary', currentTenant.brandColor);
      document.documentElement.style.setProperty('--brand-primary-hover', adjustColorHex(currentTenant.brandColor, -20));
    } else {
      document.documentElement.style.setProperty('--brand-primary', '#1e40af');
      document.documentElement.style.setProperty('--brand-primary-hover', '#1d4ed8');
    }
  }, [currentTenant]);

  // Persist tenants and users
  useEffect(() => {
    localStorage.setItem('bidocs_tenants', JSON.stringify(tenants));
  }, [tenants]);

  useEffect(() => {
    localStorage.setItem('bidocs_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('bidocs_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('bidocs_current_user');
    }
  }, [currentUser]);

  const login = (email: string, password: string, _role?: UserRole, _tenantId?: string): boolean => {
    const normalizedEmail = email.trim().toLowerCase();

    // Find registered user — do NOT auto-create unknown users
    const foundUser = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (!foundUser) {
      // #region agent log
      debugLog('AuthContext.tsx:login', 'Login rejected: user not found', {
        normalizedEmail,
        userCount: users.length
      }, 'D');
      // #endregion
      return false; // Unknown email → reject login
    }

    // Validate password against stored password
    const storedPw = localStorage.getItem(`bidocs_user_password_${normalizedEmail}`) || foundUser.password;
    if (!storedPw || storedPw !== password) {
      // #region agent log
      debugLog('AuthContext.tsx:login', 'Login rejected: password mismatch', {
        normalizedEmail,
        hasStoredPwKey: !!localStorage.getItem(`bidocs_user_password_${normalizedEmail}`),
        hasUserObjectPw: !!foundUser.password
      }, 'D');
      // #endregion
      return false; // Wrong password → reject login
    }

    const storedFlag = localStorage.getItem(`bidocs_must_change_password_${normalizedEmail}`);
    const isMustChange = storedFlag === 'true' || storedPw === 'BiDOCS#2026' || foundUser.mustChangePassword === true;

    // Resolve tenant — must match the user's own tenantId
    const tenant = tenants.find(t => t.id === foundUser.tenantId);
    if (!tenant) {
      return false; // User's tenant doesn't exist → reject login
    }

    const userToSet: User = {
      ...foundUser,
      password: storedPw,
      mustChangePassword: isMustChange,
      lastLoginAt: new Date().toISOString()
    };

    setCurrentUser(userToSet);
    setCurrentTenant(tenant);
    // #region agent log
    debugLog('AuthContext.tsx:login', 'Login succeeded', {
      userId: userToSet.id,
      tenantId: tenant.id,
      mustChangePassword: isMustChange
    }, 'D');
    // #endregion
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentTenant(null);
  };

  const registerTenantAndUser = (
    tenantData: Omit<Tenant, 'id' | 'createdAt'>,
    userData: Omit<User, 'id' | 'tenantId'>
  ): boolean => {
    const newTenantId = `tenant-${Date.now()}`;
    const newUserId = `user-${Date.now()}`;
    const userPw = userData.password || 'BiDOCS#2026';

    const newTenant: Tenant = {
      ...tenantData,
      id: newTenantId,
      createdAt: new Date().toISOString()
    };

    const newUser: User = {
      ...userData,
      id: newUserId,
      tenantId: newTenantId,
      password: userPw,
      mustChangePassword: false,
      lastLoginAt: new Date().toISOString()
    };

    const userEmail = userData.email.trim().toLowerCase();
    localStorage.setItem(`bidocs_user_password_${userEmail}`, userPw);
    localStorage.setItem(`bidocs_must_change_password_${userEmail}`, 'false');

    setTenants(prev => [...prev, newTenant]);
    setUsers(prev => [...prev, newUser]);
    
    setCurrentTenant(newTenant);
    setCurrentUser(newUser);

    return true;
  };

  const switchTenant = (tenantId: string) => {
    const targetTenant = tenants.find(t => t.id === tenantId);
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
    setTenants(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  const resetUserPassword = (email: string): boolean => {
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) return false;

    setUsers(prev => {
      const existing = prev.find(u => u.email.toLowerCase() === targetEmail);
      if (existing) {
        return prev.map(u => u.email.toLowerCase() === targetEmail ? { ...u, password: 'BiDOCS#2026', mustChangePassword: true } : u);
      } else {
        const defaultTenantId = tenants[0]?.id || `tenant-${Date.now()}`;
        const newUser: User = {
          id: `user-${Date.now()}`,
          tenantId: defaultTenantId,
          email: email.trim(),
          fullName: email.split('@')[0].toUpperCase(),
          role: 'COMPANY_OWNER',
          password: 'BiDOCS#2026',
          mustChangePassword: true
        };
        return [...prev, newUser];
      }
    });

    localStorage.setItem(`bidocs_user_password_${targetEmail}`, 'BiDOCS#2026');
    localStorage.setItem(`bidocs_must_change_password_${targetEmail}`, 'true');
    return true;
  };

  const updateUserPassword = (userId: string, newPassword: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId || (currentUser && u.email === currentUser.email)) {
        const updated = { ...u, password: newPassword, mustChangePassword: false };
        localStorage.setItem(`bidocs_user_password_${u.email.toLowerCase()}`, newPassword);
        localStorage.setItem(`bidocs_must_change_password_${u.email.toLowerCase()}`, 'false');
        return updated;
      }
      return u;
    }));

    if (currentUser) {
      const updatedCurrent = { ...currentUser, password: newPassword, mustChangePassword: false };
      setCurrentUser(updatedCurrent);
      localStorage.setItem(`bidocs_user_password_${currentUser.email.toLowerCase()}`, newPassword);
      localStorage.setItem(`bidocs_must_change_password_${currentUser.email.toLowerCase()}`, 'false');
    }
  };

  const resetAllData = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if (typeof caches !== 'undefined') {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        }).catch(() => {});
      }
      localStorage.setItem('bidocs_live_clean_flush_v6', 'true');
    } catch (e) {
      console.error('Failed to clear browser storage:', e);
    }
    clearAllVaultData().catch((e) => console.error('Failed to clear vault DB:', e));
    try {
      if (typeof indexedDB !== 'undefined') {
        indexedDB.deleteDatabase('bidocs_vault_db');
      }
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
        login,
        logout,
        registerTenantAndUser,
        switchTenant,
        updateTenantSettings,
        resetUserPassword,
        updateUserPassword,
        resetAllData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Color utility helper
function adjustColorHex(hex: string, amount: number): string {
  let color = hex.replace('#', '');
  if (color.length === 3) color = color.split('').map(c => c + c).join('');
  const num = parseInt(color, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

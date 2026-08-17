import React, { createContext, useContext, useState, useEffect } from 'react';
import { Tenant, User, UserRole } from '../types';
import { clearAllVaultData } from '../utils/vaultIndexedDB';
import { debugLog } from '../utils/debugLog';

const DEMO_TENANT: Tenant = {
  id: 'tenant-demo-bidocs',
  companyName: 'Demo Company',
  brandCode: 'DEMO',
  brandColor: '#1e40af',
  tin: '000-000-000-000',
  secDtiRegNo: 'DEMO-SEC-0001',
  philgepsPlatinumNo: 'PHILGEPS-DEMO-0001',
  address: 'Demo Address, Philippines',
  authorizedSignatory: {
    name: 'Demo Signatory',
    title: 'Authorized Representative',
    tin: '000-000-000-000'
  },
  preferredRegime: 'RA_12009_NGPA',
  primaryProcurementType: 'Goods & Supply',
  createdAt: new Date().toISOString()
};

const DEMO_USER: User = {
  id: 'user-demo-bidocs',
  tenantId: DEMO_TENANT.id,
  email: 'demo@bidocs.local',
  fullName: 'Demo User',
  role: 'SYSTEM_ADMIN',
  password: 'BiDOCS#2026',
  mustChangePassword: false,
  lastLoginAt: new Date().toISOString()
};

const getSavedTenants = (): Tenant[] => {
  const saved = localStorage.getItem('bidocs_tenants');
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      return parsed.filter((t: any) => t && t.companyName && t.id);
    }
  } catch (e) {
    console.error(e);
  }
  return [];
};

const getSavedUsers = (): User[] => {
  const saved = localStorage.getItem('bidocs_users');
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    debugLog('AuthContext.tsx:users-init', 'Failed to parse bidocs_users', { error: String(e) }, 'A');
    return [];
  }
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
    const saved = getSavedTenants();
    return saved.length > 0 ? saved : [DEMO_TENANT];
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = getSavedUsers();
    return saved.length > 0 ? saved : [DEMO_USER];
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('bidocs_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        debugLog('AuthContext.tsx:currentUser-init', 'Failed to parse bidocs_current_user', { error: String(e) }, 'A');
      }
    }
    return DEMO_USER;
  });

  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(() => {
    const savedTenants = getSavedTenants();
    const savedUserStr = localStorage.getItem('bidocs_current_user');
    if (savedUserStr && savedTenants.length > 0) {
      try {
        const u = JSON.parse(savedUserStr);
        return savedTenants.find((t: Tenant) => t.id === u.tenantId) || savedTenants[0];
      } catch (e) {
        debugLog('AuthContext.tsx:currentTenant-init', 'Failed to parse bidocs_current_user for tenant lookup', { error: String(e) }, 'A');
      }
    }
    return savedTenants[0] || DEMO_TENANT;
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

  const login = (email: string, password: string, role?: UserRole, tenantId?: string): boolean => {
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
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('bidocs_')) {
        localStorage.removeItem(key);
      }
    });
    clearAllVaultData().catch(e => console.error('Failed to clear vault DB:', e));
    setTenants([DEMO_TENANT]);
    setUsers([DEMO_USER]);
    setCurrentUser(DEMO_USER);
    setCurrentTenant(DEMO_TENANT);
    localStorage.setItem('bidocs_tenants', JSON.stringify([DEMO_TENANT]));
    localStorage.setItem('bidocs_users', JSON.stringify([DEMO_USER]));
    localStorage.setItem('bidocs_current_user', JSON.stringify(DEMO_USER));
    localStorage.setItem(`bidocs_user_password_${DEMO_USER.email.toLowerCase()}`, DEMO_USER.password || 'BiDOCS#2026');
    localStorage.setItem(`bidocs_must_change_password_${DEMO_USER.email.toLowerCase()}`, 'false');
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

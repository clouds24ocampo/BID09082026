import React, { createContext, useContext, useState, useEffect } from 'react';
import { Tenant, User, UserRole } from '../types';

// Default Initial State (No hardcoded seed data)
const SEED_TENANTS: Tenant[] = [];
const SEED_USERS: User[] = [];

interface AuthContextType {
  currentUser: User | null;
  currentTenant: Tenant | null;
  tenants: Tenant[];
  login: (email: string, role?: UserRole, tenantId?: string) => boolean;
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
    const saved = localStorage.getItem('bidocs_tenants');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter((t: any) => 
          t && 
          t.companyName && 
          !t.companyName.toLowerCase().includes('apex builder') && 
          !t.companyName.toLowerCase().includes('pacific solution') &&
          !t.companyName.toLowerCase().includes('philippine compliance enterprise') &&
          !t.companyName.toLowerCase().includes('corp') || t.isUserRegistered
        );
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('bidocs_users');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('bidocs_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(() => {
    const savedUserStr = localStorage.getItem('bidocs_current_user');
    const savedTenantsStr = localStorage.getItem('bidocs_tenants');
    let activeTenants: Tenant[] = [];
    if (savedTenantsStr) {
      try {
        const parsed = JSON.parse(savedTenantsStr);
        if (Array.isArray(parsed)) {
          activeTenants = parsed.filter((t: any) => 
            t && 
            t.companyName && 
            !t.companyName.toLowerCase().includes('apex builder') && 
            !t.companyName.toLowerCase().includes('pacific solution') &&
            !t.companyName.toLowerCase().includes('philippine compliance enterprise')
          );
        }
      } catch (e) {
        console.error(e);
      }
    }
    if (savedUserStr && activeTenants.length > 0) {
      const u = JSON.parse(savedUserStr);
      return activeTenants.find((t: Tenant) => t.id === u.tenantId) || activeTenants[0];
    }
    return activeTenants[0] || null;
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

  const login = (email: string, role?: UserRole, tenantId?: string): boolean => {
    let foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!foundUser) {
      // If logging in when no registered user exists, check if a target tenant exists
      let targetTenant = tenants.find(t => t.id === tenantId);
      if (!targetTenant && tenants.length > 0) {
        targetTenant = tenants[0];
      }

      if (!targetTenant) {
        // Return false if no registered company exists yet
        return false;
      }

      foundUser = {
        id: `user-${Date.now()}`,
        tenantId: targetTenant.id,
        email: email,
        fullName: email.split('@')[0].toUpperCase(),
        role: role || 'COMPANY_OWNER',
        lastLoginAt: new Date().toISOString()
      };
      setUsers(prev => [...prev, foundUser!]);
    }

    const storedPw = localStorage.getItem(`bidocs_user_password_${email.trim().toLowerCase()}`);
    const storedFlag = localStorage.getItem(`bidocs_must_change_password_${email.trim().toLowerCase()}`);

    const isMustChange = storedFlag === 'true' || storedPw === 'BiDOCS#2026' || foundUser.mustChangePassword === true || foundUser.password === 'BiDOCS#2026';

    const userToSet: User = {
      ...foundUser,
      password: storedPw || foundUser.password || 'BiDOCS#2026',
      mustChangePassword: isMustChange
    };

    const tenant = tenants.find(t => t.id === foundUser!.tenantId) || tenants[0];
    setCurrentUser(userToSet);
    setCurrentTenant(tenant);
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

    const newTenant: Tenant = {
      ...tenantData,
      id: newTenantId,
      createdAt: new Date().toISOString()
    };

    const newUser: User = {
      ...userData,
      id: newUserId,
      tenantId: newTenantId,
      lastLoginAt: new Date().toISOString()
    };

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
    localStorage.removeItem('bidocs_tenants');
    localStorage.removeItem('bidocs_users');
    localStorage.removeItem('bidocs_current_user');
    localStorage.removeItem('bidocs_vault_items');
    localStorage.removeItem('bidocs_opportunities');
    localStorage.removeItem('bidocs_bids');
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
  return `#${(g | (r << 8) | (b << 16)).toString(16).padStart(6, '0')}`;
}

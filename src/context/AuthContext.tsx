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
  resetAllData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenants, setTenants] = useState<Tenant[]>(() => {
    const saved = localStorage.getItem('bidocs_tenants');
    return saved ? JSON.parse(saved) : [];
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
    const activeTenants = savedTenantsStr ? JSON.parse(savedTenantsStr) : [];
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
      // If logging in when no user exists or registering on the fly
      let targetTenant = tenants.find(t => t.id === tenantId);

      if (!targetTenant) {
        if (tenants.length > 0) {
          targetTenant = tenants[0];
        } else {
          // Create default tenant for new user if none exists
          const newTenantId = `tenant-${Date.now()}`;
          const companyNameFromEmail = email.split('@')[1] ? email.split('@')[1].split('.')[0].toUpperCase() + ' Corp' : 'My Company';
          targetTenant = {
            id: newTenantId,
            companyName: companyNameFromEmail,
            brandCode: companyNameFromEmail.substring(0, 4).toUpperCase(),
            brandColor: '#1e40af',
            tin: '000-000-000-000',
            secDtiRegNo: '',
            pcabLicenseNo: '',
            pcabCategory: '',
            philgepsPlatinumNo: '',
            address: '',
            authorizedSignatory: {
              name: email.split('@')[0].toUpperCase(),
              title: 'Authorized Managing Officer',
              tin: ''
            },
            preferredRegime: 'RA_12009_NGPA',
            primaryProcurementType: 'GOODS',
            createdAt: new Date().toISOString()
          };
          setTenants([targetTenant]);
        }
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

    const tenant = tenants.find(t => t.id === foundUser!.tenantId) || tenants[0];
    setCurrentUser(foundUser);
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

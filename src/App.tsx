import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { AppShell } from './components/layout/AppShell';
import { DashboardView } from './components/dashboard/DashboardView';
import { DocumentVaultView } from './components/vault/DocumentVaultView';
import { OpportunityFinderView } from './components/opportunities/OpportunityFinderView';
import { BidPackageBuilderView } from './components/bids/bidpackage';
import { FormsDirectoryView } from './components/forms/FormsDirectoryView';
import { TenantSettingsView } from './components/settings/TenantSettingsView';
import { CompanyProfileView } from './components/profile/CompanyProfileView';

const MainApp: React.FC = () => {
  const { currentUser, currentTenant, tenants } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>(() => {
    return tenants.length === 0 ? 'register' : 'login';
  });
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!currentUser || !currentTenant || tenants.length === 0) {
    if (authMode === 'register' || tenants.length === 0) {
      return <RegisterPage onSwitchToLogin={() => setAuthMode('login')} />;
    }
    return <LoginPage onSwitchToRegister={() => setAuthMode('register')} />;
  }

  return (
    <AppShell activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && <DashboardView setActiveTab={setActiveTab} />}
      {activeTab === 'opportunities' && <OpportunityFinderView setActiveTab={setActiveTab} />}
      {activeTab === 'vault' && <DocumentVaultView />}
      {activeTab === 'bids' && <BidPackageBuilderView />}
      {activeTab === 'forms' && <FormsDirectoryView />}
      {activeTab === 'profile' && <CompanyProfileView />}
      {activeTab === 'settings' && <TenantSettingsView />}
    </AppShell>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;

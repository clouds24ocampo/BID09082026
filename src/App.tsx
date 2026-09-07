import React, { useState, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { AppShell } from './components/layout/AppShell';

// Route-level code splitting — each view's bundle downloads only when opened.
// Keeps initial load to shell + auth; heavy screens (vault 3.6k LOC, bids 3.5k LOC)
// stream in the background on demand.
const DashboardView = React.lazy(() =>
  import('./components/dashboard/DashboardView').then((m) => ({ default: m.DashboardView }))
);
const DocumentVaultView = React.lazy(() =>
  import('./components/vault/DocumentVaultView').then((m) => ({ default: m.DocumentVaultView }))
);
const OpportunityFinderView = React.lazy(() =>
  import('./components/opportunities/OpportunityFinderView').then((m) => ({ default: m.OpportunityFinderView }))
);
const BidPackageBuilderView = React.lazy(() =>
  import('./components/bids/bidpackage').then((m) => ({ default: m.BidPackageBuilderView }))
);
const FormsDirectoryView = React.lazy(() =>
  import('./components/forms/FormsDirectoryView').then((m) => ({ default: m.FormsDirectoryView }))
);
const TenantSettingsView = React.lazy(() =>
  import('./components/settings/TenantSettingsView').then((m) => ({ default: m.TenantSettingsView }))
);
const CompanyProfileView = React.lazy(() =>
  import('./components/profile/CompanyProfileView').then((m) => ({ default: m.CompanyProfileView }))
);

const ViewLoader: React.FC = () => (
  <div className="flex items-center justify-center py-24 animate-fadeIn" role="status" aria-label="Loading view">
    <div className="flex items-center gap-3 text-slate-400 text-xs font-mono">
      <span className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-brand-primary animate-spin" />
      <span>LOADING MODULE…</span>
    </div>
  </div>
);

// Warm the lazy view chunks in the background during idle time so tab
// switches are instant (no network stall on first navigation).
const prefetchViews = () => {
  void import('./components/dashboard/DashboardView');
  void import('./components/opportunities/OpportunityFinderView');
  void import('./components/vault/DocumentVaultView');
  void import('./components/bids/bidpackage');
  void import('./components/forms/FormsDirectoryView');
  void import('./components/profile/CompanyProfileView');
  void import('./components/settings/TenantSettingsView');
};

const MainApp: React.FC = () => {
  const { currentUser, currentTenant, tenants } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>(() => {
    return tenants.length === 0 ? 'register' : 'login';
  });
  const [activeTab, setActiveTab] = useState('dashboard');

  React.useEffect(() => {
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    if (ric) {
      const id = ric(prefetchViews, { timeout: 4000 });
      return () => (window as any).cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(prefetchViews, 2500);
    return () => window.clearTimeout(t);
  }, []);

  if (!currentUser || !currentTenant || tenants.length === 0) {
    if (authMode === 'register' || tenants.length === 0) {
      return <RegisterPage onSwitchToLogin={() => setAuthMode('login')} />;
    }
    return <LoginPage onSwitchToRegister={() => setAuthMode('register')} />;
  }

  return (
    <AppShell activeTab={activeTab} setActiveTab={setActiveTab}>
      <Suspense fallback={<ViewLoader />}>
        {activeTab === 'dashboard' && <DashboardView setActiveTab={setActiveTab} />}
        {activeTab === 'opportunities' && <OpportunityFinderView setActiveTab={setActiveTab} />}
        {activeTab === 'vault' && <DocumentVaultView />}
        {activeTab === 'bids' && <BidPackageBuilderView />}
        {activeTab === 'forms' && <FormsDirectoryView />}
        {activeTab === 'profile' && <CompanyProfileView />}
        {activeTab === 'settings' && <TenantSettingsView />}
      </Suspense>
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

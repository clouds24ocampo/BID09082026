import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./components/auth/LoginPage";
import { RegisterPage } from "./components/auth/RegisterPage";
import { LandingWebsiteView } from "./components/landing/LandingWebsiteView";
import { FrontEnd3DShowcaseView } from "./components/3d/FrontEnd3DShowcaseView";
import { AppShell } from "./components/layout/AppShell";
import { DashboardView } from "./components/dashboard/DashboardView";
import { DocumentVaultView } from "./components/vault/DocumentVaultView";
import { OpportunityFinderView } from "./components/opportunities/OpportunityFinderView";
import { BidPackageBuilderView } from "./components/bids/bidpackage";
import { FormsDirectoryView } from "./components/forms/FormsDirectoryView";
import { PackagingCoversView } from "./components/covers/PackagingCoversView";
import { TenantSettingsView } from "./components/settings/TenantSettingsView";
import { CompanyProfileView } from "./components/profile/CompanyProfileView";
import { ProjectProfileView } from "./components/projects/ProjectProfileView";
import PowModal from "./components/vault/templates/POW";
import TermsOfReferenceView from "./components/vault/templates/TOR";
import VaultErrorBoundary from "./components/common/VaultErrorBoundary";

const MainApp: React.FC = () => {
  const { currentUser, currentTenant, tenants } = useAuth();
  const [authMode, setAuthMode] = useState<"landing" | "login" | "register">("landing");
  const [activeTab, setActiveTab] = useState("dashboard");

  if (!currentUser || !currentTenant || tenants.length === 0) {
    if (authMode === "landing") {
      return (
        <LandingWebsiteView
          onEnterApp={() => setAuthMode(tenants.length === 0 ? "register" : "login")}
          onLogin={() => setAuthMode("login")}
          onRegister={() => setAuthMode("register")}
        />
      );
    }
    if (authMode === "register" || tenants.length === 0) {
      return (
        <RegisterPage
          onSwitchToLogin={() => setAuthMode("login")}
          onBackToLanding={() => setAuthMode("landing")}
        />
      );
    }
    return (
      <LoginPage
        onSwitchToRegister={() => setAuthMode("register")}
        onBackToLanding={() => setAuthMode("landing")}
      />
    );
  }

  return (
    <AppShell activeTab={activeTab} setActiveTab={setActiveTab}>
      <VaultErrorBoundary
        key={activeTab}
        fallbackTitle={`${activeTab.replace("-", " ").toUpperCase()} Module View`}
      >
        {activeTab === "3d-showcase" && (
          <FrontEnd3DShowcaseView onNavigateTab={setActiveTab} />
        )}
        {activeTab === "dashboard" && (
          <DashboardView setActiveTab={setActiveTab} />
        )}
        {activeTab === "tor" && (
          <TermsOfReferenceView
            tenant={currentTenant}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === "pow" && (
          <PowModal
            tenant={currentTenant}
            setActiveTab={setActiveTab}
            initialTab="matrix"
          />
        )}
        {activeTab === "opportunities" && (
          <OpportunityFinderView setActiveTab={setActiveTab} />
        )}
        {activeTab === "project-profile" && (
          <ProjectProfileView setActiveTab={setActiveTab} />
        )}
        {activeTab === "vault" && <DocumentVaultView />}
        {activeTab === "bids" && <BidPackageBuilderView />}
        {activeTab === "covers" && <PackagingCoversView />}
        {activeTab === "forms" && <FormsDirectoryView />}
        {activeTab === "profile" && <CompanyProfileView />}
        {activeTab === "settings" && <TenantSettingsView />}
      </VaultErrorBoundary>
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

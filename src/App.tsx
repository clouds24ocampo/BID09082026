import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./components/auth/LoginPage";
import { RegisterPage } from "./components/auth/RegisterPage";
import { LandingWebsiteView } from "./components/landing/LandingWebsiteView";
import { AppShell } from "./components/layout/AppShell";
import { DashboardView } from "./components/dashboard/DashboardView";
import { DocumentVaultView } from "./components/vault/DocumentVaultView";
import { OpportunityFinderView } from "./components/opportunities/OpportunityFinderView";
import { BidPackageBuilderView } from "./components/bids/bidpackage";
import { PaymentDocumentsView } from "./components/payments/PaymentDocumentsView";
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
  const [authMode, setAuthMode] = useState<"landing" | "login" | "register" | "app">(() => {
    if (typeof window !== "undefined" && typeof window.sessionStorage !== "undefined") {
      try {
        const saved = window.sessionStorage.getItem("bidocs_auth_mode");
        if (saved === "landing" || saved === "login" || saved === "register" || saved === "app") {
          return saved as "landing" | "login" | "register" | "app";
        }
      } catch (_) {}
    }
    return "landing";
  });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [tabHistory, setTabHistory] = useState<string[]>([]);

  const handleSetAuthMode = (mode: "landing" | "login" | "register" | "app") => {
    if (typeof window !== "undefined" && typeof window.sessionStorage !== "undefined") {
      try {
        window.sessionStorage.setItem("bidocs_auth_mode", mode);
      } catch (_) {}
    }
    setAuthMode(mode);
  };

  // Automatically transition to "app" when user logs in or registers
  React.useEffect(() => {
    if (
      currentUser &&
      currentTenant &&
      tenants.length > 0 &&
      (authMode === "login" || authMode === "register")
    ) {
      handleSetAuthMode("app");
    }
  }, [currentUser, currentTenant, tenants.length, authMode]);

  const handleNavigateTab = (newTab: string) => {
    if (newTab !== activeTab) {
      setTabHistory((prev) => [...prev, activeTab]);
      setActiveTab(newTab);
    }
  };

  const handleBackNavigation = () => {
    if (tabHistory.length > 0) {
      const prevTab = tabHistory[tabHistory.length - 1];
      setTabHistory((prev) => prev.slice(0, -1));
      setActiveTab(prevTab);
    } else if (activeTab !== "dashboard") {
      setActiveTab("dashboard");
    } else {
      handleSetAuthMode("landing");
    }
  };

  if (
    authMode !== "app" ||
    !currentUser ||
    !currentTenant ||
    tenants.length === 0
  ) {
    if (authMode === "register") {
      return (
        <RegisterPage
          onSwitchToLogin={() => handleSetAuthMode("login")}
          onBackToLanding={() => handleSetAuthMode("landing")}
        />
      );
    }
    if (authMode === "login") {
      return (
        <LoginPage
          onSwitchToRegister={() => handleSetAuthMode("register")}
          onBackToLanding={() => handleSetAuthMode("landing")}
        />
      );
    }
    return (
      <LandingWebsiteView
        onEnterApp={() => {
          if (currentUser && currentTenant && tenants.length > 0) {
            handleSetAuthMode("app");
          } else {
            handleSetAuthMode(tenants.length === 0 ? "register" : "login");
          }
        }}
        onLogin={() => handleSetAuthMode("login")}
        onRegister={() => handleSetAuthMode("register")}
      />
    );
  }

  return (
    <AppShell
      activeTab={activeTab}
      setActiveTab={handleNavigateTab}
      tabHistory={tabHistory}
      onBack={handleBackNavigation}
      onBackToLanding={() => handleSetAuthMode("landing")}
    >
      <VaultErrorBoundary
        key={activeTab}
        fallbackTitle={`${activeTab.replace("-", " ").toUpperCase()} Module View`}
      >
        {activeTab === "dashboard" && (
          <DashboardView setActiveTab={handleNavigateTab} />
        )}
        {activeTab === "tor" && (
          <TermsOfReferenceView
            tenant={currentTenant}
            setActiveTab={handleNavigateTab}
          />
        )}
        {activeTab === "pow" && (
          <PowModal
            tenant={currentTenant}
            setActiveTab={handleNavigateTab}
            initialTab="matrix"
          />
        )}
        {activeTab === "opportunities" && (
          <OpportunityFinderView setActiveTab={handleNavigateTab} />
        )}
        {activeTab === "project-profile" && (
          <ProjectProfileView setActiveTab={handleNavigateTab} />
        )}
        {activeTab === "vault" && <DocumentVaultView />}
        {activeTab === "bids" && <BidPackageBuilderView />}
        {activeTab === "payments" && <PaymentDocumentsView />}
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

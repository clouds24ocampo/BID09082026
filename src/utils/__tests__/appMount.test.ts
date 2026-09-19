import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Global mocks for Node environment
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (k: string) => store[k] || null,
  setItem: (k: string, v: string) => { store[k] = String(v); },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

if (!globalThis.localStorage) {
  (globalThis as any).localStorage = mockLocalStorage;
}
if (!globalThis.window) {
  (globalThis as any).window = {
    localStorage: mockLocalStorage,
    location: { href: 'http://localhost:3001/' },
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}
if (!globalThis.document) {
  (globalThis as any).document = {
    documentElement: { style: { setProperty: () => {} } },
    getElementById: () => ({ appendChild: () => {} }),
    body: { appendChild: () => {} }
  };
}

import App from '../../App';
import { AuthProvider } from '../../context/AuthContext';
import { DashboardView } from '../../components/dashboard/DashboardView';
import { DocumentVaultView } from '../../components/vault/DocumentVaultView';
import { OpportunityFinderView } from '../../components/opportunities/OpportunityFinderView';
import { BidPackageBuilderView } from '../../components/bids/bidpackage';
import { FormsDirectoryView } from '../../components/forms/FormsDirectoryView';
import { PackagingCoversView } from '../../components/covers/PackagingCoversView';
import { TenantSettingsView } from '../../components/settings/TenantSettingsView';
import { CompanyProfileView } from '../../components/profile/CompanyProfileView';
import { ProjectProfileView } from '../../components/projects/ProjectProfileView';
import PowModal from '../../components/vault/templates/POW';

describe('App Root Render Test', () => {
  it('should render Register/Login when unauthenticated without throwing exceptions', () => {
    mockLocalStorage.clear();
    const html = renderToString(React.createElement(App));
    expect(html.length).toBeGreaterThan(0);
  });

  it('should render all primary tabs with authenticated user without throwing exceptions', () => {
    const mockTenant = {
      id: "tenant-apex-01",
      companyName: "Apex Cloud Builders Corp.",
      brandCode: "APEX",
      brandColor: "#1e40af",
      tin: "008-991-234-000",
      address: "Ortigas Center, Pasig City",
      authorizedSignatory: {
        name: "Engr. Ferdinand R. Valenzuela",
        title: "President",
        tin: "194-882-019"
      },
      preferredRegime: "RA_12009_NGPA",
      primaryProcurementType: "INFRASTRUCTURE",
      createdAt: new Date().toISOString()
    };

    const mockOwnerUser = {
      id: "user-owner-01",
      tenantId: "tenant-apex-01",
      email: "f.valenzuela@apexcloudph.com",
      fullName: "Engr. Ferdinand R. Valenzuela",
      role: "COMPANY_OWNER",
      lastLoginAt: new Date().toISOString()
    };

    const mockEstimatorUser = {
      id: "user-estimator-01",
      tenantId: "tenant-apex-01",
      email: "estimator@apexcloudph.com",
      fullName: "Engr. Alex Reyes",
      role: "ESTIMATOR",
      lastLoginAt: new Date().toISOString()
    };

    store['bidocs_live_clean_flush_v7_new_transaction'] = 'true';
    store['bidocs_tenants'] = JSON.stringify([mockTenant]);
    store['bidocs_users'] = JSON.stringify([mockOwnerUser, mockEstimatorUser]);
    store['bidocs_current_user'] = JSON.stringify(mockOwnerUser);

    const fullAppHtml = renderToString(React.createElement(App));
    expect(fullAppHtml.length).toBeGreaterThan(0);

    const renderWithAuth = (el: React.ReactElement) => {
      return renderToString(React.createElement(AuthProvider, null, el));
    };

    // Verify individual view tabs render cleanly
    expect(renderWithAuth(React.createElement(DashboardView, { setActiveTab: () => {} }))).toBeDefined();
    expect(renderWithAuth(React.createElement(OpportunityFinderView, { setActiveTab: () => {} }))).toBeDefined();
    expect(renderWithAuth(React.createElement(ProjectProfileView, { setActiveTab: () => {} }))).toBeDefined();
    expect(renderWithAuth(React.createElement(DocumentVaultView))).toBeDefined();
    expect(renderWithAuth(React.createElement(BidPackageBuilderView))).toBeDefined();
    expect(renderWithAuth(React.createElement(PackagingCoversView))).toBeDefined();
    expect(renderWithAuth(React.createElement(FormsDirectoryView))).toBeDefined();
    expect(renderWithAuth(React.createElement(CompanyProfileView))).toBeDefined();
    expect(renderWithAuth(React.createElement(TenantSettingsView))).toBeDefined();
    expect(renderWithAuth(React.createElement(PowModal, { tenant: mockTenant as any, setActiveTab: () => {} }))).toBeDefined();
  });
});


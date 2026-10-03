import { describe, it, expect, vi } from 'vitest';
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

import { LoginPage } from '../../components/auth/LoginPage';
import { RegisterPage } from '../../components/auth/RegisterPage';
import { AppShell } from '../../components/layout/AppShell';
import { AuthProvider } from '../../context/AuthContext';

describe('Navigation Back Buttons Verification Suite', () => {
  it('should render multiple prominent Back to Portal buttons on LoginPage', () => {
    const handleBack = vi.fn();
    const handleSwitch = vi.fn();

    const html = renderToString(
      <AuthProvider>
        <LoginPage
          onSwitchToRegister={handleSwitch}
          onBackToLanding={handleBack}
        />
      </AuthProvider>
    );

    // Verify back buttons exist in output
    expect(html).toContain('Back to Portal Home');
  });

  it('should render prominent Back buttons on RegisterPage', () => {
    const handleBack = vi.fn();
    const handleSwitch = vi.fn();

    const html = renderToString(
      <AuthProvider>
        <RegisterPage
          onSwitchToLogin={handleSwitch}
          onBackToLanding={handleBack}
        />
      </AuthProvider>
    );

    expect(html).toContain('Back to Portal');
  });

  it('should render workspace Back navigation bar and history in AppShell', () => {
    const handleBack = vi.fn();
    const handleBackToLanding = vi.fn();
    const handleTabChange = vi.fn();

    const html = renderToString(
      <AuthProvider>
        <AppShell
          activeTab="vault"
          setActiveTab={handleTabChange}
          tabHistory={['dashboard', 'opportunities']}
          onBack={handleBack}
          onBackToLanding={handleBackToLanding}
        >
          <div id="test-content">Document Vault Content</div>
        </AppShell>
      </AuthProvider>
    );

    // Verify workspace back button and previous page label are rendered
    expect(html).toContain('Back');
    expect(html).toContain('Landing Portal');
    expect(html).toContain('Dashboard Home');
    expect(html).toContain('Document Vault Content');
  });
});

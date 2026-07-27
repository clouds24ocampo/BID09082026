import { describe, it, expect, beforeEach } from 'vitest';
import { getOpportunityProjects } from '../opportunityProjects';

// Simple in-memory localStorage mock for Node test environment
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  key: (i: number) => Object.keys(mockStorage)[i] || null,
  get length() { return Object.keys(mockStorage).length; }
};

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true
  });
}

describe('opportunityProjects - Strict Tenant Data Isolation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should retrieve opportunities strictly scoped to tenantA', () => {
    const oppTenantA = [
      { id: 'opp-1', projectReferenceNumber: 'PRJ-2026-A1', title: 'Project A1', procuringEntity: 'Agency A' }
    ];
    const oppTenantB = [
      { id: 'opp-2', projectReferenceNumber: 'PRJ-2026-B1', title: 'Project B1', procuringEntity: 'Agency B' }
    ];

    localStorage.setItem('bidocs_opportunities_tenantA', JSON.stringify(oppTenantA));
    localStorage.setItem('bidocs_opportunities_tenantB', JSON.stringify(oppTenantB));

    const resultA = getOpportunityProjects('tenantA');
    expect(resultA).toHaveLength(1);
    expect(resultA[0].refNo).toBe('PRJ-2026-A1');
    expect(resultA[0].title).toBe('Project A1');

    const resultB = getOpportunityProjects('tenantB');
    expect(resultB).toHaveLength(1);
    expect(resultB[0].refNo).toBe('PRJ-2026-B1');
  });

  it('should prevent cross-tenant data leakage', () => {
    const oppTenantB = [
      { id: 'opp-secret', projectReferenceNumber: 'PRJ-SECRET', title: 'Secret B Project', procuringEntity: 'Agency B' }
    ];

    localStorage.setItem('bidocs_opportunities_tenantB', JSON.stringify(oppTenantB));

    const resultA = getOpportunityProjects('tenantA');
    expect(resultA).toHaveLength(0);
  });
});

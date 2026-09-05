import { describe, it, expect } from 'vitest';
import { getProjectClassification, getProjectStorageKey } from '../projectClassification';

describe('Project Classification Engine (Single Source of Truth)', () => {
  it('strictly classifies as INFRASTRUCTURE when category is Infrastructure regardless of title keywords', () => {
    const project = {
      title: 'Procurement and Installation of Additional CCTV Cameras in Purok 1-4',
      category: 'Infrastructure',
      procurementType: 'Infrastructure'
    };
    expect(getProjectClassification(project)).toBe('INFRASTRUCTURE');
  });

  it('strictly classifies as GOODS when category is Goods', () => {
    const project = {
      title: 'Supply and Delivery of Office Furniture',
      category: 'Goods',
      procurementType: 'Goods'
    };
    expect(getProjectClassification(project)).toBe('GOODS');
  });

  it('strictly classifies as CONSULTING when category is Consulting', () => {
    const project = {
      title: 'Feasibility Study for Urban Drainage',
      category: 'Consulting',
      procurementType: 'Consulting Services'
    };
    expect(getProjectClassification(project)).toBe('CONSULTING');
  });

  it('infers INFRASTRUCTURE from title when category is missing', () => {
    const project = {
      title: 'Construction of 2-Storey Multi-Purpose Building',
      refNo: 'PRJ-2026-001'
    };
    expect(getProjectClassification(project)).toBe('INFRASTRUCTURE');
  });

  it('generates collision-proof project-scoped storage keys', () => {
    const key = getProjectStorageKey('BIDFORM_INFRA', 'tenant_1', 'PRJ-13202056');
    expect(key).toBe('bidocs_bidform_infra_tenant_1_PRJ-13202056');
  });
});

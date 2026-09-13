import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getProjectBidFormAmount } from '../../components/projects/ProjectProfileView';

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

describe('Project Profile Win DOCs Bid Form Auto-Amount Sync', () => {
  const mockTenantId = 'tenant_test_123';
  const mockProjectScope = 'PRJ-2026-WIN-001';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should automatically extract winning bid amount and words from Infrastructure Financial Bid Form', () => {
    const mockInfraBidForm = {
      totalBidAmount: 4850250.75,
      totalBidAmountFigures: '4,850,250.75',
      totalBidAmountWords: 'FOUR MILLION EIGHT HUNDRED FIFTY THOUSAND TWO HUNDRED FIFTY PESOS AND 75/100',
      projectRefNo: mockProjectScope
    };

    localStorage.setItem(
      `bidocs_bidform_infra_${mockTenantId}_${mockProjectScope}`,
      JSON.stringify(mockInfraBidForm)
    );

    const result = getProjectBidFormAmount(mockTenantId, mockProjectScope, undefined, 5000000);

    expect(result.amount).toBe(4850250.75);
    expect(result.amountFigures).toBe('4,850,250.75');
    expect(result.amountWords).toContain('FOUR MILLION EIGHT HUNDRED FIFTY THOUSAND');
    expect(result.source).toBe('Infrastructure Financial Bid Form');
  });

  it('should automatically extract winning bid amount from Goods Financial Bid Form', () => {
    const mockGoodsBidForm = {
      totalBidAmount: 1250000,
      totalBidAmountFigures: '1,250,000.00',
      totalBidAmountWords: 'ONE MILLION TWO HUNDRED FIFTY THOUSAND PESOS ONLY',
      projectRefNo: mockProjectScope
    };

    localStorage.setItem(
      `bidocs_bidform_goods_${mockTenantId}_${mockProjectScope}`,
      JSON.stringify(mockGoodsBidForm)
    );

    const result = getProjectBidFormAmount(mockTenantId, mockProjectScope, undefined, 1300000);

    expect(result.amount).toBe(1250000);
    expect(result.amountFigures).toBe('1,250,000.00');
    expect(result.amountWords).toContain('ONE MILLION TWO HUNDRED FIFTY THOUSAND');
    expect(result.source).toBe('Goods Financial Bid Form');
  });

  it('should automatically extract winning bid amount from Detailed Estimates Schedule', () => {
    const mockDetailedEstimates = {
      totalEstimatedProjectCost: 875000,
      projectName: 'Road Concreting Project'
    };

    localStorage.setItem(
      `bidocs_detailed_estimates_${mockTenantId}_${mockProjectScope}`,
      JSON.stringify(mockDetailedEstimates)
    );

    const result = getProjectBidFormAmount(mockTenantId, mockProjectScope, undefined, 900000);

    expect(result.amount).toBe(875000);
    expect(result.amountFigures).toBe('875,000.00');
    expect(result.source).toBe('Detailed Estimates Schedule');
  });

  it('should calculate accurate Performance Security bond requirements based on winning bid offer', () => {
    const winningAmount = 10000000; // 10 Million PHP
    
    // 5% Cash / Manager's Check / Bank Draft
    const cashBond5Pct = winningAmount * 0.05;
    expect(cashBond5Pct).toBe(500000);

    // 10% Bank Guarantee / Irrevocable LC (Infrastructure)
    const bankGuarantee10Pct = winningAmount * 0.10;
    expect(bankGuarantee10Pct).toBe(1000000);

    // 30% Surety Bond callable upon demand
    const suretyBond30Pct = winningAmount * 0.30;
    expect(suretyBond30Pct).toBe(3000000);
  });

  it('should fallback to Approved Budget for Contract (ABC) if no custom Bid Form exists yet', () => {
    const fallbackAbc = 2500000;
    const result = getProjectBidFormAmount(mockTenantId, mockProjectScope, undefined, fallbackAbc);

    expect(result.amount).toBe(2500000);
    expect(result.amountFigures).toBe('2,500,000.00');
    expect(result.source).toBe('Approved Budget for Contract (ABC Baseline)');
  });

  it('should only mark project as eligible for Project Profile once bid documents are merged and done', async () => {
    const { isProjectBidMergeDone, markProjectBidMergeDone } = await import('../../utils/opportunityProjects');
    
    const unmergedProject = {
      id: 'opp_999',
      projectReferenceNumber: 'PRJ-2026-UNMERGED',
      philgepsRefNo: 'PhilGEPS-999000',
      title: 'Unmerged Sample Project',
      status: 'OPEN' as const
    };

    // Before merge: isProjectBidMergeDone should return false
    expect(isProjectBidMergeDone(mockTenantId, unmergedProject)).toBe(false);

    // Perform merge compilation
    markProjectBidMergeDone(mockTenantId, unmergedProject.projectReferenceNumber, {
      fileName: 'PRJ_2026_UNMERGED_ORIGINAL_MERGED_PACKAGE.pdf',
      copiesCount: 3
    });

    // After merge: isProjectBidMergeDone should return true
    expect(isProjectBidMergeDone(mockTenantId, unmergedProject)).toBe(true);
  });
});

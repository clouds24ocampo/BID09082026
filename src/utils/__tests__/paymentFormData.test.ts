import { describe, it, expect, beforeEach } from 'vitest';
import { scopeSlug, formStorageKey, swaTotals, emptyFrs, frsResult, readFrs, readFormState } from '../paymentFormData';

const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
};

beforeEach(() => Object.keys(store).forEach((k) => delete store[k]));

describe('storage keys match the sibling forms', () => {
  it('slugifies like SWA/SOTE/CA do', () => {
    expect(scopeSlug('PR-2026-001')).toBe('PR_2026_001');
    expect(scopeSlug('')).toBe('default');
    expect(formStorageKey('swa', 't1', 'PR-2026-001')).toBe('bidocs_swa_t1_PR_2026_001');
  });
});

describe('swaTotals', () => {
  it('sums value of work to date and physical %', () => {
    const t = swaTotals({
      items: [
        { contractQty: 10, unitPrice: 100, prevQty: 4, thisQty: 6 }, // 1000 of 1000
        { contractQty: 10, unitPrice: 100, prevQty: 0, thisQty: 5 }, // 500 of 1000
      ],
    });
    expect(t.contractTotal).toBe(2000);
    expect(t.totalToDate).toBe(1500);
    expect(t.physicalPercent).toBe(75);
  });
  it('is zero for null / empty / garbage', () => {
    expect(swaTotals(null).totalToDate).toBe(0);
    expect(swaTotals({ items: [{} as any, { contractQty: NaN as any }] }).physicalPercent).toBe(0);
  });
});

describe('frsResult / readFrs', () => {
  it('reproduces payment.md example from a record', () => {
    const r = emptyFrs(10_000_000);
    r.variationOrders = [{ id: 'v', label: 'VO 1', amount: 500_000 }];
    r.deductiveOrders = [{ id: 'd', label: 'DO 1', amount: 100_000 }];
    r.finalValueOfWork = 10_400_000;
    r.previousPayments = [2_000_000, 3_000_000, 2_500_000].map((a, i) => ({ id: String(i), label: `PP ${i + 1}`, amount: a }));
    r.applyTaxes = false;
    const out = frsResult(r);
    expect(out.finalContractPrice).toBe(10_400_000);
    expect(out.currentGross).toBe(2_900_000);
    expect(out.retention).toBe(0); // 7.5M already billed (>50%) and on schedule
  });

  it('reads a saved record over defaults and ignores garbage', () => {
    expect(readFrs('t', 'X')).toBeNull();
    store[formStorageKey('frs', 't', 'X')] = JSON.stringify({ originalPrice: 5 });
    expect(readFrs('t', 'X')?.originalPrice).toBe(5);
    expect(readFrs('t', 'X')?.retentionRate).toBe(10);
    store[formStorageKey('frs', 't', 'Y')] = '{bad';
    expect(readFrs('t', 'Y')).toBeNull();
    expect(readFormState('swa', 't', 'Z')).toBeNull();
  });

  it('tolerates malformed row arrays', () => {
    const r: any = emptyFrs(100);
    r.previousPayments = null;
    r.variationOrders = [null, { amount: 'x' }];
    expect(() => frsResult(r)).not.toThrow();
  });
});

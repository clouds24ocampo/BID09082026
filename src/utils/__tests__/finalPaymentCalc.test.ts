import { describe, it, expect } from 'vitest';
import {
  computeFinalContractPrice,
  computeRetention,
  computeRecoupment,
  computeTaxes,
  computeTimeElapsed,
  computeLiquidatedDamages,
  computeReconciliation,
} from '../finalPaymentCalc';

describe('payment.md worked example', () => {
  it('final contract price = original + VO - deductive', () => {
    expect(computeFinalContractPrice({ originalPrice: 10_000_000, variationOrders: [500_000], deductiveOrders: [100_000] })).toBe(10_400_000);
  });

  it('current gross = final value of work - previous gross payments', () => {
    const r = computeReconciliation({
      originalPrice: 10_000_000,
      variationOrders: [500_000],
      deductiveOrders: [100_000],
      finalValueOfWork: 10_400_000,
      previousPayments: [2_000_000, 3_000_000, 2_500_000],
      onSchedule: true,
      advanceBalance: 0,
      applyTaxes: false,
    });
    expect(r.finalContractPrice).toBe(10_400_000);
    expect(r.previousGrossTotal).toBe(7_500_000);
    expect(r.currentGross).toBe(2_900_000);
  });
});

describe('retention (10% until 50%, none after if on schedule)', () => {
  const base = { finalContractPrice: 1_000_000, retentionRate: 10 };

  it('withholds 10% of a billing wholly below 50%', () => {
    expect(computeRetention({ ...base, cumulativeBefore: 0, billingGross: 300_000, onSchedule: true })).toBe(30_000);
  });

  it('splits a billing that crosses 50% at the line', () => {
    // 400k already billed; 300k billing -> only 100k is below the 500k line -> 10k
    expect(computeRetention({ ...base, cumulativeBefore: 400_000, billingGross: 300_000, onSchedule: true })).toBe(10_000);
  });

  it('withholds nothing above 50% when on schedule', () => {
    expect(computeRetention({ ...base, cumulativeBefore: 600_000, billingGross: 400_000, onSchedule: true })).toBe(0);
  });

  it('keeps withholding 10% above 50% when behind schedule', () => {
    expect(computeRetention({ ...base, cumulativeBefore: 600_000, billingGross: 400_000, onSchedule: false })).toBe(40_000);
  });

  it('honours a reduced 5% rate', () => {
    expect(computeRetention({ ...base, retentionRate: 5, cumulativeBefore: 0, billingGross: 200_000, onSchedule: true })).toBe(10_000);
  });

  it('returns 0 for a zero billing', () => {
    expect(computeRetention({ ...base, cumulativeBefore: 0, billingGross: 0, onSchedule: true })).toBe(0);
  });
});

describe('advance recoupment', () => {
  it('is rate x gross', () => expect(computeRecoupment({ billingGross: 100_000, rate: 15, advanceBalance: 1_000_000 })).toBe(15_000));
  it('is capped at the unrecouped balance', () => expect(computeRecoupment({ billingGross: 100_000, rate: 15, advanceBalance: 4_000 })).toBe(4_000));
});

describe('taxes (moved unchanged from SWA)', () => {
  it('uses the net-of-VAT base by default', () => {
    const t = computeTaxes({ billingGross: 112_000, vatRate: 5, ewtRate: 2, netOfVat: true });
    expect(t.vat).toBe(5_000);
    expect(t.ewt).toBe(2_000);
  });
  it('uses the gross base when toggle is off', () => {
    const t = computeTaxes({ billingGross: 100_000, vatRate: 5, ewtRate: 2, netOfVat: false });
    expect(t.vat).toBe(5_000);
    expect(t.ewt).toBe(2_000);
  });
});

describe('time elapsed', () => {
  it('120 days elapsed of 120 = 100% (inclusive of NTP day)', () => {
    const t = computeTimeElapsed({ ntpDate: '2026-01-01', originalDays: 120, extensionDays: [], suspensionDays: 0, actualCompletionDate: '2026-04-30' });
    expect(t.elapsedDays).toBe(120);
    expect(t.revisedDays).toBe(120);
    expect(t.timeElapsedPercent).toBe(100);
    expect(t.delayDays).toBe(0);
  });

  it('extensions change the denominator and revised completion date', () => {
    const t = computeTimeElapsed({ ntpDate: '2026-01-01', originalDays: 120, extensionDays: [10, 5], suspensionDays: 0, actualCompletionDate: '2026-04-30' });
    expect(t.revisedDays).toBe(135);
    expect(t.revisedCompletionDate).toBe('2026-05-15');
    expect(t.timeElapsedPercent).toBeCloseTo(88.89, 2);
    expect(t.delayDays).toBe(0);
  });

  it('suspension days do not count as elapsed and push the completion date', () => {
    const t = computeTimeElapsed({ ntpDate: '2026-01-01', originalDays: 120, extensionDays: [], suspensionDays: 10, actualCompletionDate: '2026-05-10' });
    expect(t.elapsedDays).toBe(120);
    expect(t.revisedCompletionDate).toBe('2026-05-10');
    expect(t.delayDays).toBe(0);
  });

  it('counts delay days past the revised completion date', () => {
    const t = computeTimeElapsed({ ntpDate: '2026-01-01', originalDays: 120, extensionDays: [], suspensionDays: 0, actualCompletionDate: '2026-05-10' });
    expect(t.delayDays).toBe(10);
  });

  it('returns zeros for missing or invalid dates instead of NaN', () => {
    const t = computeTimeElapsed({ ntpDate: '', originalDays: 120, extensionDays: [], suspensionDays: 0, actualCompletionDate: '' });
    expect(t.elapsedDays).toBe(0);
    expect(t.timeElapsedPercent).toBe(0);
    expect(Number.isNaN(t.delayDays)).toBe(false);
  });
});

describe('liquidated damages', () => {
  it('is 0 with no delay', () => expect(computeLiquidatedDamages({ delayDays: 0, unperformedPortion: 1_000_000 })).toBe(0));
  it('is delay x 1/10 of 1% x unperformed portion', () => expect(computeLiquidatedDamages({ delayDays: 10, unperformedPortion: 1_000_000 })).toBe(10_000));
  it('honours a custom rate', () => expect(computeLiquidatedDamages({ delayDays: 10, unperformedPortion: 1_000_000, ratePerDay: 0.0005 })).toBe(5_000));
});

describe('full reconciliation', () => {
  it('nets every deduction out of current gross', () => {
    const r = computeReconciliation({
      originalPrice: 1_000_000,
      variationOrders: [],
      deductiveOrders: [],
      finalValueOfWork: 1_000_000,
      previousPayments: [600_000],
      onSchedule: true,
      advanceBalance: 10_000,
      thirdPartyLiabilities: 1_000,
      uncorrectedDefects: 2_000,
      otherDeductions: 3_000,
      liquidatedDamages: 4_000,
      applyTaxes: true,
      vatRate: 5,
      ewtRate: 2,
      netOfVat: false,
    });
    expect(r.currentGross).toBe(400_000);
    expect(r.retention).toBe(0); // above 50% and on schedule
    expect(r.recoupment).toBe(10_000); // 15% of 400k = 60k, capped at balance
    expect(r.taxes.vat).toBe(20_000);
    expect(r.taxes.ewt).toBe(8_000);
    expect(r.totalDeductions).toBe(10_000 + 20_000 + 8_000 + 1_000 + 2_000 + 3_000 + 4_000);
    expect(r.netPayment).toBe(400_000 - r.totalDeductions);
  });
});

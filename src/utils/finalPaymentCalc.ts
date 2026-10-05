// Pure final-payment math shared by SWA, SOTE, FRS, BS and FPL.
// Rules follow payment.md (sections 4, 5, 19, 22). No React, no storage.

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

const num = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) ? n : 0);
const sum = (xs: number[] = []): number => xs.reduce((a, b) => a + num(b), 0);

// ── Contract price ─────────────────────────────────────────────────────────
export interface FinalContractPriceInput {
  originalPrice: number;
  variationOrders?: number[];
  deductiveOrders?: number[];
}

export const computeFinalContractPrice = (i: FinalContractPriceInput): number =>
  round2(num(i.originalPrice) + sum(i.variationOrders) - sum(i.deductiveOrders));

// ── Retention ──────────────────────────────────────────────────────────────
// 10% (editable, 5% on justifiable causes) is withheld on the part of each billing that falls
// below 50% of the final contract price. Above 50%, nothing more is withheld if work is
// satisfactory and on schedule; otherwise the rate continues on the whole billing.
export interface RetentionInput {
  finalContractPrice: number;
  cumulativeBefore: number; // gross value billed before this billing
  billingGross: number;
  retentionRate?: number; // percent, default 10
  onSchedule: boolean;
}

export const computeRetention = (i: RetentionInput): number => {
  const rate = (i.retentionRate ?? 10) / 100;
  const billing = Math.max(0, num(i.billingGross));
  if (billing === 0) return 0;
  const half = num(i.finalContractPrice) * 0.5;
  const base = i.onSchedule ? Math.min(billing, Math.max(0, half - Math.max(0, num(i.cumulativeBefore)))) : billing;
  return round2(base * rate);
};

// ── Advance recoupment ─────────────────────────────────────────────────────
export const computeRecoupment = (i: { billingGross: number; rate?: number; advanceBalance: number }): number =>
  round2(Math.max(0, Math.min((Math.max(0, num(i.billingGross)) * (i.rate ?? 15)) / 100, num(i.advanceBalance))));

// ── Taxes (5% VAT, 2% EWT; net-of-VAT base ÷1.12 by default, as in SWA) ───
export const computeTaxes = (i: { billingGross: number; vatRate?: number; ewtRate?: number; netOfVat?: boolean }) => {
  const base = (i.netOfVat ?? true) ? (num(i.billingGross) * 100) / 112 : num(i.billingGross);
  return {
    vat: round2((base * (i.vatRate ?? 5)) / 100),
    ewt: round2((base * (i.ewtRate ?? 2)) / 100),
  };
};

// ── Time ───────────────────────────────────────────────────────────────────
const DAY = 86_400_000;
const parseDay = (s: string): number | null => {
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const t = Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  return Number.isNaN(t) ? null : t;
};
const fmtDay = (t: number): string => new Date(t).toISOString().slice(0, 10);

export interface TimeElapsedInput {
  ntpDate: string; // YYYY-MM-DD
  originalDays: number;
  extensionDays: number[];
  suspensionDays: number;
  actualCompletionDate: string; // YYYY-MM-DD
}

export const computeTimeElapsed = (i: TimeElapsedInput) => {
  const revisedDays = num(i.originalDays) + sum(i.extensionDays);
  const ntp = parseDay(i.ntpDate);
  const actual = parseDay(i.actualCompletionDate);
  // NTP day is day 1; approved suspension days stop the clock and push the completion date.
  const revisedCompletion = ntp === null ? null : ntp + (revisedDays + num(i.suspensionDays) - 1) * DAY;
  const elapsedDays = ntp !== null && actual !== null ? Math.max(0, Math.round((actual - ntp) / DAY) + 1 - num(i.suspensionDays)) : 0;
  const delayDays = actual !== null && revisedCompletion !== null ? Math.max(0, Math.round((actual - revisedCompletion) / DAY)) : 0;
  return {
    revisedDays,
    revisedCompletionDate: revisedCompletion === null ? '' : fmtDay(revisedCompletion),
    elapsedDays,
    timeElapsedPercent: revisedDays > 0 ? round2((elapsedDays / revisedDays) * 100) : 0,
    delayDays,
  };
};

// ── Liquidated damages: 1/10 of 1% per day of the unperformed portion ─────
export const computeLiquidatedDamages = (i: { delayDays: number; unperformedPortion: number; ratePerDay?: number }): number =>
  round2(Math.max(0, num(i.delayDays)) * (i.ratePerDay ?? 0.001) * Math.max(0, num(i.unperformedPortion)));

// ── Reconciliation (payment.md section 22) ────────────────────────────────
export interface ReconciliationInput {
  originalPrice: number;
  variationOrders?: number[];
  deductiveOrders?: number[];
  finalValueOfWork: number; // cumulative gross value of work to date
  previousPayments?: number[]; // previous gross progress payments
  onSchedule: boolean;
  advanceBalance: number;
  retentionRate?: number;
  recoupmentRate?: number;
  thirdPartyLiabilities?: number;
  uncorrectedDefects?: number;
  otherDeductions?: number;
  liquidatedDamages?: number;
  applyTaxes?: boolean;
  vatRate?: number;
  ewtRate?: number;
  netOfVat?: boolean;
}

export const computeReconciliation = (i: ReconciliationInput) => {
  const finalContractPrice = computeFinalContractPrice(i);
  const previousGrossTotal = round2(sum(i.previousPayments));
  const currentGross = round2(num(i.finalValueOfWork) - previousGrossTotal);
  const retention = computeRetention({
    finalContractPrice,
    cumulativeBefore: previousGrossTotal,
    billingGross: currentGross,
    retentionRate: i.retentionRate,
    onSchedule: i.onSchedule,
  });
  const recoupment = computeRecoupment({ billingGross: currentGross, rate: i.recoupmentRate, advanceBalance: i.advanceBalance });
  const taxes = i.applyTaxes === false ? { vat: 0, ewt: 0 } : computeTaxes({ billingGross: currentGross, vatRate: i.vatRate, ewtRate: i.ewtRate, netOfVat: i.netOfVat });
  const thirdParty = round2(num(i.thirdPartyLiabilities));
  const defects = round2(num(i.uncorrectedDefects));
  const other = round2(num(i.otherDeductions));
  const ld = round2(num(i.liquidatedDamages));
  const totalDeductions = round2(retention + recoupment + taxes.vat + taxes.ewt + thirdParty + defects + other + ld);
  return {
    finalContractPrice,
    previousGrossTotal,
    currentGross,
    retention,
    recoupment,
    taxes,
    thirdParty,
    defects,
    other,
    ld,
    totalDeductions,
    netPayment: round2(currentGross - totalDeductions),
  };
};

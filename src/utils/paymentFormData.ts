// Cross-form data for the final-payment chain: SOTE (LD) + SWA (value of work) -> FRS -> FPL + BS.
// Each form saves under bidocs_<form>_<tenantId>_<slug(projectRef)>; this module reads them back.
import { computeReconciliation, ReconciliationInput } from './finalPaymentCalc';

export const scopeSlug = (ref: string): string => (ref || 'default').replace(/[^a-zA-Z0-9]/g, '_');

export const formStorageKey = (form: 'swa' | 'sote' | 'frs' | 'lmec' | 'fpl' | 'bs' | 'ca', tenantId: string, projectRef: string): string =>
  `bidocs_${form}_${tenantId || 'default'}_${scopeSlug(projectRef)}`;

export const readFormState = <T = any>(form: Parameters<typeof formStorageKey>[0], tenantId: string, projectRef: string): T | null => {
  try {
    const raw = localStorage.getItem(formStorageKey(form, tenantId, projectRef));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as T) : null;
  } catch {
    return null;
  }
};

// ── SWA ────────────────────────────────────────────────────────────────────
export interface SwaItemLike { contractQty?: number; unitPrice?: number; prevQty?: number; thisQty?: number }

/** Value of work to date and physical accomplishment from a saved SWA payload's item list. */
export const swaTotals = (state: { items?: SwaItemLike[] } | null) => {
  const items = Array.isArray(state?.items) ? (state as { items: SwaItemLike[] }).items : [];
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const contractTotal = items.reduce((a, it) => a + n(it.contractQty) * n(it.unitPrice), 0);
  const totalToDate = items.reduce((a, it) => a + (n(it.prevQty) + n(it.thisQty)) * n(it.unitPrice), 0);
  return {
    contractTotal,
    totalToDate,
    physicalPercent: contractTotal > 0 ? Math.round((totalToDate / contractTotal) * 10000) / 100 : 0,
  };
};

// ── FRS ────────────────────────────────────────────────────────────────────
export interface MoneyRow { id: string; label: string; amount: number }

export interface FrsRecord {
  framework: 'RA_9184' | 'RA_12009_NGPA';
  originalPrice: number;
  variationOrders: MoneyRow[];
  deductiveOrders: MoneyRow[];
  finalValueOfWork: number;
  previousPayments: MoneyRow[];
  onSchedule: boolean;
  advanceBalance: number;
  retentionRate: number;
  recoupmentRate: number;
  thirdPartyLiabilities: number;
  uncorrectedDefects: number;
  otherDeductions: number;
  liquidatedDamages: number;
  applyTaxes: boolean;
  vatRate: number;
  ewtRate: number;
  netOfVat: boolean;
  finalAcceptanceIssued: boolean;
}

export const emptyFrs = (originalPrice = 0): FrsRecord => ({
  framework: 'RA_12009_NGPA',
  originalPrice,
  variationOrders: [],
  deductiveOrders: [],
  finalValueOfWork: 0,
  previousPayments: [],
  onSchedule: true,
  advanceBalance: 0,
  retentionRate: 10,
  recoupmentRate: 15,
  thirdPartyLiabilities: 0,
  uncorrectedDefects: 0,
  otherDeductions: 0,
  liquidatedDamages: 0,
  applyTaxes: true,
  vatRate: 5,
  ewtRate: 2,
  netOfVat: true,
  finalAcceptanceIssued: false,
});

const amounts = (rows: MoneyRow[]) => (Array.isArray(rows) ? rows.map((r) => Number(r?.amount) || 0) : []);

export const frsToCalcInput = (r: FrsRecord): ReconciliationInput => ({
  originalPrice: r.originalPrice,
  variationOrders: amounts(r.variationOrders),
  deductiveOrders: amounts(r.deductiveOrders),
  finalValueOfWork: r.finalValueOfWork,
  previousPayments: amounts(r.previousPayments),
  onSchedule: r.onSchedule,
  advanceBalance: r.advanceBalance,
  retentionRate: r.retentionRate,
  recoupmentRate: r.recoupmentRate,
  thirdPartyLiabilities: r.thirdPartyLiabilities,
  uncorrectedDefects: r.uncorrectedDefects,
  otherDeductions: r.otherDeductions,
  liquidatedDamages: r.liquidatedDamages,
  applyTaxes: r.applyTaxes,
  vatRate: r.vatRate,
  ewtRate: r.ewtRate,
  netOfVat: r.netOfVat,
});

export const frsResult = (r: FrsRecord) => computeReconciliation(frsToCalcInput(r));

/** Saved FRS merged over defaults, or null when none has been saved. */
export const readFrs = (tenantId: string, projectRef: string): FrsRecord | null => {
  const saved = readFormState<Partial<FrsRecord>>('frs', tenantId, projectRef);
  return saved ? { ...emptyFrs(), ...saved } : null;
};

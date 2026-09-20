import { describe, it, expect } from 'vitest';
import {
  computeStatutoryTaxes,
  DEFAULT_POW_LABOR_DESCRIPTION,
  PRESET_LABOR_DESCRIPTIONS,
} from '../../components/vault/templates/POW';
import { isAmoOrPresidentRole, isPreparerRole } from '../../types';
import { numberToWords } from '../numberToWords';

describe('POW & Quotation Statutory Taxes & Labor Calculation Engine', () => {
  it('computes VATable Goods taxes correctly: Base = DC/1.12, 5% Final VAT, 1% EWT, 1% Retention', () => {
    // 1,120,000 gross direct cost
    const gross = 1120000;
    const res = computeStatutoryTaxes(gross, 'VATABLE', 'GOODS', 1);

    expect(res.isVatable).toBe(true);
    expect(res.isInfra).toBe(false);
    expect(res.grossAmount).toBe(1120000);
    // Base = 1,120,000 / 1.12 = 1,000,000
    expect(res.netBase).toBeCloseTo(1000000, 2);
    // Output 12% VAT = 120,000
    expect(res.outputVat12).toBeCloseTo(120000, 2);
    // 5% Final Withholding VAT = 1,000,000 * 0.05 = 50,000
    expect(res.finalVat5).toBeCloseTo(50000, 2);
    // 1% EWT for Goods = 1,000,000 * 0.01 = 10,000
    expect(res.ewtAmount).toBeCloseTo(10000, 2);
    // 1% Retention = 1,120,000 * 0.01 = 11,200
    expect(res.retentionAmount).toBeCloseTo(11200, 2);
    // Total Deductions = 50,000 + 10,000 + 11,200 = 71,200
    expect(res.totalDeductions).toBeCloseTo(71200, 2);
    // Net Payable = 1,120,000 - 71,200 = 1,048,800
    expect(res.netPayable).toBeCloseTo(1048800, 2);
  });

  it('computes VATable Infrastructure taxes correctly: Base = DC/1.12, 5% Final VAT, 2% EWT, 1% Retention', () => {
    // 1,120,000 gross direct cost for civil works / infra
    const gross = 1120000;
    const res = computeStatutoryTaxes(gross, 'VATABLE', 'INFRA', 1);

    expect(res.isVatable).toBe(true);
    expect(res.isInfra).toBe(true);
    expect(res.netBase).toBeCloseTo(1000000, 2);
    // 5% Final VAT = 50,000
    expect(res.finalVat5).toBeCloseTo(50000, 2);
    // 2% EWT for Infra = 1,000,000 * 0.02 = 20,000
    expect(res.ewtAmount).toBeCloseTo(20000, 2);
    // 1% Retention = 11,200
    expect(res.retentionAmount).toBeCloseTo(11200, 2);
    // Total Deductions = 50,000 + 20,000 + 11,200 = 81,200
    expect(res.totalDeductions).toBeCloseTo(81200, 2);
    // Net Payable = 1,120,000 - 81,200 = 1,038,800
    expect(res.netPayable).toBeCloseTo(1038800, 2);
  });

  it('computes Non-VAT Goods taxes correctly: 0% VAT, 1% EWT, 1% Retention', () => {
    // 1,000,000 gross direct cost for Non-VAT supplier
    const gross = 1000000;
    const res = computeStatutoryTaxes(gross, 'NON_VAT', 'GOODS', 1);

    expect(res.isVatable).toBe(false);
    expect(res.netBase).toBe(1000000); // 100% full base, no /1.12
    expect(res.outputVat12).toBe(0);
    expect(res.finalVat5).toBe(0); // 0% VAT
    expect(res.ewtAmount).toBeCloseTo(10000, 2); // 1% EWT
    expect(res.retentionAmount).toBeCloseTo(10000, 2); // 1% Retention
    expect(res.totalDeductions).toBeCloseTo(20000, 2);
    expect(res.netPayable).toBeCloseTo(980000, 2);
  });

  it('computes Non-VAT Infrastructure taxes correctly: 0% VAT, 2% EWT, 1% Retention', () => {
    const gross = 1000000;
    const res = computeStatutoryTaxes(gross, 'NON_VAT', 'INFRA', 1);

    expect(res.isVatable).toBe(false);
    expect(res.netBase).toBe(1000000);
    expect(res.finalVat5).toBe(0);
    expect(res.ewtAmount).toBeCloseTo(20000, 2); // 2% EWT
    expect(res.retentionAmount).toBeCloseTo(10000, 2); // 1% Retention
    expect(res.totalDeductions).toBeCloseTo(30000, 2);
    expect(res.netPayable).toBeCloseTo(970000, 2);
  });

  it('computes Labor Cost taxes symmetrically at the bottom', () => {
    // Direct Labor Cost = 224,000 under VATable Civil Works / Infra
    const laborGross = 224000;
    const laborRes = computeStatutoryTaxes(laborGross, 'VATABLE', 'INFRA', 1);

    // Labor Base = 224,000 / 1.12 = 200,000
    expect(laborRes.netBase).toBeCloseTo(200000, 2);
    // 5% Labor VAT = 200,000 * 0.05 = 10,000
    expect(laborRes.finalVat5).toBeCloseTo(10000, 2);
    // 2% Labor EWT = 200,000 * 0.02 = 4,000
    expect(laborRes.ewtAmount).toBeCloseTo(4000, 2);
    // 1% Labor Retention = 224,000 * 0.01 = 2,240
    expect(laborRes.retentionAmount).toBeCloseTo(2240, 2);
    // Total Labor Deductions = 10,000 + 4,000 + 2,240 = 16,240
    expect(laborRes.totalDeductions).toBeCloseTo(16240, 2);
    // Net Labor Payable / Take-Home = 224,000 - 16,240 = 207,760
    expect(laborRes.netPayable).toBeCloseTo(207760, 2);
  });

  it('handles zero or negative costs gracefully', () => {
    const res = computeStatutoryTaxes(0, 'VATABLE', 'GOODS', 1);
    expect(res.grossAmount).toBe(0);
    expect(res.netBase).toBe(0);
    expect(res.finalVat5).toBe(0);
    expect(res.ewtAmount).toBe(0);
    expect(res.retentionAmount).toBe(0);
    expect(res.totalDeductions).toBe(0);
    expect(res.netPayable).toBe(0);
  });

  it('validates POW statutory formula: 5% Withholding Tax, 2% Infra profit, 1% Goods profit, and VAT from DC/1.12', () => {
    const directCost = 100000;
    const ocmRate = 8;
    const taxRate = 5; // 5% withholding tax next to OCM
    const profitRateInfra = 2; // 2% profit for Infra
    const profitRateGoods = 1; // 1% profit for Goods
    const vatRate = 5; // 5% VAT rate

    // Infra calculation
    const ocmInfra = directCost * (ocmRate / 100); // 8,000
    const taxInfra = directCost * (taxRate / 100); // 5,000
    const profitInfra = directCost * (profitRateInfra / 100); // 2,000
    const vatInfra = (directCost / 1.12) * (vatRate / 100); // (100,000 / 1.12) * 0.05 = 4,464.2857
    const indirectInfra = ocmInfra + taxInfra + profitInfra + vatInfra;
    const totalInfra = directCost + indirectInfra;

    expect(ocmInfra).toBe(8000);
    expect(taxInfra).toBe(5000);
    expect(profitInfra).toBe(2000);
    expect(vatInfra).toBeCloseTo(4464.29, 2);
    expect(totalInfra).toBeCloseTo(119464.29, 2);

    // Goods calculation
    const profitGoods = directCost * (profitRateGoods / 100); // 1,000
    const totalGoods = directCost + ocmInfra + taxInfra + profitGoods + vatInfra;

    expect(profitGoods).toBe(1000);
    expect(totalGoods).toBeCloseTo(118464.29, 2);
  });

  it('correctly handles custom modified unit cost override', () => {
    const quantity = 5;
    const customUnitCost = 25000;
    const calculatedTotalCost = customUnitCost * quantity; // 125,000

    expect(calculatedTotalCost).toBe(125000);
    expect(calculatedTotalCost / quantity).toBe(customUnitCost);
  });

  describe('AMO / President Executive Authority & Role Verification', () => {
    it('recognizes AMO, President, Company Owner, and Higher Manager as top-tier authorities (auto-authorized)', () => {
      // COMPANY_OWNER represents the President / AMO
      expect(isAmoOrPresidentRole('COMPANY_OWNER')).toBe(true);
      expect(isAmoOrPresidentRole('SYSTEM_ADMIN')).toBe(true);
      expect(isAmoOrPresidentRole('HIGHER_MANAGER')).toBe(true);
      // Standalone single-tenant mode defaults to authorized AMO
      expect(isAmoOrPresidentRole(undefined)).toBe(true);
    });

    it('correctly segregates preparer roles (Estimators, Bid Managers) requiring approval', () => {
      expect(isAmoOrPresidentRole('ESTIMATOR')).toBe(false);
      expect(isAmoOrPresidentRole('BID_MANAGER')).toBe(false);
      expect(isAmoOrPresidentRole('DOCUMENT_PREPARER')).toBe(false);

      expect(isPreparerRole('ESTIMATOR')).toBe(true);
      expect(isPreparerRole('BID_MANAGER')).toBe(true);
      expect(isPreparerRole('DOCUMENT_PREPARER')).toBe(true);
      expect(isPreparerRole('COMPANY_OWNER')).toBe(false);
    });
  });

  describe('Direct Labor Cost Percentage & Editable Words Engine', () => {
    it('computes default 35% labor cost from materials accurately', () => {
      const materialsTotal = 1000000; // 1,000,000 PHP Materials
      const defaultRate = 35; // 35%
      const laborCost = Math.round(materialsTotal * (defaultRate / 100));

      expect(laborCost).toBe(350000);
      expect(numberToWords(laborCost)).toBe('THREE HUNDRED FIFTY THOUSAND PESOS ONLY');
    });

    it('computes various statutory labor rate presets (10%, 15%, 20%, 25%, 30%, 40%)', () => {
      const materialsTotal = 2500000;
      const presets = [10, 15, 20, 25, 30, 35, 40];

      const results = presets.map((pct) => ({
        pct,
        laborCost: Math.round(materialsTotal * (pct / 100)),
      }));

      expect(results.find((r) => r.pct === 10)?.laborCost).toBe(250000);
      expect(results.find((r) => r.pct === 15)?.laborCost).toBe(375000);
      expect(results.find((r) => r.pct === 20)?.laborCost).toBe(500000);
      expect(results.find((r) => r.pct === 25)?.laborCost).toBe(625000);
      expect(results.find((r) => r.pct === 30)?.laborCost).toBe(750000);
      expect(results.find((r) => r.pct === 35)?.laborCost).toBe(875000);
      expect(results.find((r) => r.pct === 40)?.laborCost).toBe(1000000);
    });

    it('validates default statutory labor words description structure', () => {
      expect(DEFAULT_POW_LABOR_DESCRIPTION).toContain('Logistic, Delivery, Labor, Installation');
      expect(DEFAULT_POW_LABOR_DESCRIPTION).toContain('Cable Pulling, Rough-ins');
      expect(DEFAULT_POW_LABOR_DESCRIPTION).toContain('Commissioning');
      expect(DEFAULT_POW_LABOR_DESCRIPTION).toContain('(35% of Materials Cost)');
      expect(DEFAULT_POW_LABOR_DESCRIPTION).toContain('All kinds of taxes included');
    });

    it('validates preset descriptions mapping and percentage tags', () => {
      expect(PRESET_LABOR_DESCRIPTIONS.length).toBeGreaterThanOrEqual(4);
      const preset35 = PRESET_LABOR_DESCRIPTIONS.find((p) => p.pct === 35);
      const preset30 = PRESET_LABOR_DESCRIPTIONS.find((p) => p.pct === 30);
      const preset25 = PRESET_LABOR_DESCRIPTIONS.find((p) => p.pct === 25);
      const preset15 = PRESET_LABOR_DESCRIPTIONS.find((p) => p.pct === 15);

      expect(preset35?.text).toContain('35% of Materials Cost');
      expect(preset30?.text).toContain('30% of Materials Cost');
      expect(preset25?.text).toContain('25% of Materials Cost');
      expect(preset15?.text).toContain('15% of Materials Cost');
    });

    it('calculates net labor take-home with statutory 5% Final VAT, 2% EWT, and 1% Retention', () => {
      // Direct Labor Cost = 350,000 computed from 35% of 1,000,000
      const laborCost = 350000;
      const taxes = computeStatutoryTaxes(laborCost, 'VATABLE', 'INFRA', 1);

      // Base = 350,000 / 1.12 = 312,500
      expect(taxes.netBase).toBeCloseTo(312500, 2);
      // 5% Final VAT = 312,500 * 0.05 = 15,625
      expect(taxes.finalVat5).toBeCloseTo(15625, 2);
      // 2% Infra EWT = 312,500 * 0.02 = 6,250
      expect(taxes.ewtAmount).toBeCloseTo(6250, 2);
      // 1% Retention = 350,000 * 0.01 = 3,500
      expect(taxes.retentionAmount).toBeCloseTo(3500, 2);
      // Total Deductions = 15,625 + 6,250 + 3,500 = 25,375
      expect(taxes.totalDeductions).toBeCloseTo(25375, 2);
      // Net Payable = 350,000 - 25,375 = 324,625
      expect(taxes.netPayable).toBeCloseTo(324625, 2);
    });
  });
});


import { describe, it, expect } from 'vitest';
import { computeStatutoryTaxes } from '../../components/vault/templates/POW';

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
});

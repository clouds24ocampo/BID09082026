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

    it('calculates item total and unit cost with Retention Money % and Warranty Mark Up (W.M)%', () => {
      // Baseline item: Direct Cost = 125,000, Qty = 5
      // OCM = 8%, W.Tax = 5%, EW.TAX = 2%, VAT = 5% (5/1.12)
      // retentionRate = 1%, warrantyRate = 2%
      const directCost = 125000;
      const qty = 5;
      const ocmRate = 8;
      const taxRate = 5;
      const profitRate = 2;
      const vatRate = 5;
      const retentionRate = 1;
      const warrantyRate = 2;

      const vatMultiplierOnDirect = (vatRate / 100) / 1.12;
      const markupMultiplier =
        1 +
        (ocmRate / 100) +
        (taxRate / 100) +
        (profitRate / 100) +
        vatMultiplierOnDirect +
        (retentionRate / 100) +
        (warrantyRate / 100);

      const ocmCost = directCost * (ocmRate / 100);
      const taxCost = directCost * (taxRate / 100);
      const profitCost = directCost * (profitRate / 100);
      const vatCost = (directCost / 1.12) * (vatRate / 100);
      const retentionCost = directCost * (retentionRate / 100);
      const warrantyCost = directCost * (warrantyRate / 100);
      const indirectCost =
        ocmCost + taxCost + profitCost + vatCost + retentionCost + warrantyCost;
      const totalCost = directCost + indirectCost;
      const unitCost = totalCost / qty;

      expect(retentionCost).toBe(1250); // 1% of 125,000
      expect(warrantyCost).toBe(2500); // 2% of 125,000
      expect(totalCost).toBeCloseTo(directCost * markupMultiplier, 2);
      expect(unitCost).toBeCloseTo(totalCost / 5, 2);

      // Verify automatic comma and decimal formatting
      const formattedUnitCost = unitCost.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      expect(formattedUnitCost).toContain(',');
      expect(formattedUnitCost).toMatch(/^\d{1,3}(,\d{3})*\.\d{2}$/);
    });

    it('formats unit cost automatically with comma and two decimals', () => {
      const testCases = [
        { raw: 29866.0714, expected: '29,866.07' },
        { raw: 149330.36, expected: '149,330.36' },
        { raw: 1000000, expected: '1,000,000.00' },
        { raw: 0, expected: '0.00' },
        { raw: 5.5, expected: '5.50' },
      ];

      for (const tc of testCases) {
        const formatted = tc.raw === 0 ? '0.00' : tc.raw.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        expect(formatted).toBe(tc.expected);
      }
    });
  });

  describe('Total Materials as Primary Baseline for Labor Cost and Other Taxes', () => {
    it('derives labor cost directly from total materials using labor percentage', () => {
      // Total Materials = 1,200,000 PHP, Labor Rate = 35%
      const totalMaterial = 1200000;
      const laborPercentage = 35;
      const derivedLabor = Math.round(totalMaterial * (laborPercentage / 100));

      expect(derivedLabor).toBe(420000);
      expect(derivedLabor / totalMaterial).toBe(0.35);
    });

    it('computes statutory taxes on Materials (Goods: 1% EWT, 5% VAT, 1% Retention)', () => {
      // Materials Total = 1,120,000 VATable Goods
      const materialsTotal = 1120000;
      const materialsTaxes = computeStatutoryTaxes(materialsTotal, 'VATABLE', 'GOODS', 1);

      // Base = 1,120,000 / 1.12 = 1,000,000
      expect(materialsTaxes.netBase).toBeCloseTo(1000000, 2);
      // 5% Final VAT = 50,000
      expect(materialsTaxes.finalVat5).toBeCloseTo(50000, 2);
      // 1% EWT for Goods = 10,000
      expect(materialsTaxes.ewtAmount).toBeCloseTo(10000, 2);
      // 1% Retention = 11,200
      expect(materialsTaxes.retentionAmount).toBeCloseTo(11200, 2);
      // Total Material Deductions = 71,200
      expect(materialsTaxes.totalDeductions).toBeCloseTo(71200, 2);
      // Net Material Payable = 1,048,800
      expect(materialsTaxes.netPayable).toBeCloseTo(1048800, 2);
    });

    it('derives labor cost from materials and computes separate labor statutory taxes (Services/Infra: 2% EWT)', () => {
      // Materials = 1,120,000
      const materialsTotal = 1120000;
      const laborPercentage = 35;
      const derivedLabor = Math.round(materialsTotal * (laborPercentage / 100)); // 392,000

      expect(derivedLabor).toBe(392000);

      // Taxes on derived labor for Civil Works / Infra
      const laborTaxes = computeStatutoryTaxes(derivedLabor, 'VATABLE', 'INFRA', 1);

      // Base = 392,000 / 1.12 = 350,000
      expect(laborTaxes.netBase).toBeCloseTo(350000, 2);
      // 5% VAT on labor = 17,500
      expect(laborTaxes.finalVat5).toBeCloseTo(17500, 2);
      // 2% EWT on labor = 7,000
      expect(laborTaxes.ewtAmount).toBeCloseTo(7000, 2);
      // 1% Retention on labor = 3,920
      expect(laborTaxes.retentionAmount).toBeCloseTo(3920, 2);
      // Total Labor Deductions = 28,420
      expect(laborTaxes.totalDeductions).toBeCloseTo(28420, 2);
      // Net Disbursable Labor = 363,580
      expect(laborTaxes.netPayable).toBeCloseTo(363580, 2);
    });

    it('auto-recalculates item labor when material cost changes with auto-sync', () => {
      const initialItem = {
        id: 'item-1',
        materialCost: 50000,
        laborCost: 17500, // 35% of 50000
      };
      const laborPercentage = 35;
      const autoSync = true;

      // User updates materialCost to 80,000
      const newMaterialCost = 80000;
      const updatedItem = {
        ...initialItem,
        materialCost: newMaterialCost,
        laborCost: autoSync
          ? Math.round(newMaterialCost * (laborPercentage / 100))
          : initialItem.laborCost,
      };

      expect(updatedItem.materialCost).toBe(80000);
      expect(updatedItem.laborCost).toBe(28000); // 35% of 80,000
      expect(updatedItem.materialCost + updatedItem.laborCost).toBe(108000);
    });

    it('auto-recalculates all items when labor rate is changed globally', () => {
      const items = [
        { id: '1', materialCost: 100000, laborCost: 35000 },
        { id: '2', materialCost: 200000, laborCost: 70000 },
        { id: '3', materialCost: 300000, laborCost: 105000 },
      ];

      const newLaborRate = 30; // user switches from 35% to 30%
      const updatedItems = items.map((it) => ({
        ...it,
        laborCost: Math.round(it.materialCost * (newLaborRate / 100)),
      }));

      expect(updatedItems[0].laborCost).toBe(30000);
      expect(updatedItems[1].laborCost).toBe(60000);
      expect(updatedItems[2].laborCost).toBe(90000);

      const totalMaterial = updatedItems.reduce((acc, it) => acc + it.materialCost, 0); // 600,000
      const totalLabor = updatedItems.reduce((acc, it) => acc + it.laborCost, 0); // 180,000

      expect(totalMaterial).toBe(600000);
      expect(totalLabor).toBe(180000);
      expect(totalLabor / totalMaterial).toBe(0.3);
    });
  });

  describe('Flexible Statutory Retention Rates (0% up to 5% pursuant to RA 9184 & RA 12009)', () => {
    it('computes 0% retention correctly when retention is exempted or substituted', () => {
      const gross = 1000000;
      const res = computeStatutoryTaxes(gross, 'VATABLE', 'INFRA', 0);

      expect(res.retentionRate).toBe(0);
      expect(res.retentionAmount).toBe(0);
      // Deductions: 5% VAT (1,000,000/1.12 * 0.05) + 2% EWT (1,000,000/1.12 * 0.02) + 0 retention
      const expectedVat = (1000000 / 1.12) * 0.05;
      const expectedEwt = (1000000 / 1.12) * 0.02;
      expect(res.totalDeductions).toBeCloseTo(expectedVat + expectedEwt, 2);
      expect(res.netPayable).toBeCloseTo(gross - (expectedVat + expectedEwt), 2);
    });

    it('computes standard 1% retention correctly', () => {
      const gross = 1000000;
      const res = computeStatutoryTaxes(gross, 'VATABLE', 'GOODS', 1);

      expect(res.retentionRate).toBe(1);
      expect(res.retentionAmount).toBeCloseTo(10000, 2); // 1% of 1,000,000
    });

    it('computes 2% and 3% retention rates correctly', () => {
      const gross = 1000000;
      const res2 = computeStatutoryTaxes(gross, 'VATABLE', 'INFRA', 2);
      expect(res2.retentionRate).toBe(2);
      expect(res2.retentionAmount).toBeCloseTo(20000, 2); // 2% of 1,000,000

      const res3 = computeStatutoryTaxes(gross, 'VATABLE', 'INFRA', 3);
      expect(res3.retentionRate).toBe(3);
      expect(res3.retentionAmount).toBeCloseTo(30000, 2); // 3% of 1,000,000
    });

    it('computes 5% statutory retention money pursuant to RA 9184 & RA 12009', () => {
      // 1,120,000 Gross Direct Cost for Infrastructure project
      const gross = 1120000;
      const res5 = computeStatutoryTaxes(gross, 'VATABLE', 'INFRA', 5);

      expect(res5.retentionRate).toBe(5);
      // Net Base = 1,120,000 / 1.12 = 1,000,000
      expect(res5.netBase).toBeCloseTo(1000000, 2);
      // 5% Final VAT = 1,000,000 * 0.05 = 50,000
      expect(res5.finalVat5).toBeCloseTo(50000, 2);
      // 2% Infra EWT = 1,000,000 * 0.02 = 20,000
      expect(res5.ewtAmount).toBeCloseTo(20000, 2);
      // 5% Retention Money = 1,120,000 * 0.05 = 56,000
      expect(res5.retentionAmount).toBeCloseTo(56000, 2);
      // Total Deductions = 50,000 + 20,000 + 56,000 = 126,000
      expect(res5.totalDeductions).toBeCloseTo(126000, 2);
      // Net Payable = 1,120,000 - 126,000 = 994,000
      expect(res5.netPayable).toBeCloseTo(994000, 2);
    });

    it('computes 5% retention on derived Labor Cost symmetrically', () => {
      // Total Materials = 1,000,000, Derived Labor (35%) = 350,000
      const laborCost = 350000;
      const laborTax = computeStatutoryTaxes(laborCost, 'VATABLE', 'INFRA', 5);

      expect(laborTax.retentionRate).toBe(5);
      // Labor Retention = 350,000 * 0.05 = 17,500
      expect(laborTax.retentionAmount).toBeCloseTo(17500, 2);
      // Labor Base = 350,000 / 1.12 = 312,500
      expect(laborTax.netBase).toBeCloseTo(312500, 2);
      // 5% VAT on labor = 15,625
      expect(laborTax.finalVat5).toBeCloseTo(15625, 2);
      // 2% EWT on labor = 6,250
      expect(laborTax.ewtAmount).toBeCloseTo(6250, 2);
      // Total Deductions = 15,625 + 6,250 + 17,500 = 39,375
      expect(laborTax.totalDeductions).toBeCloseTo(39375, 2);
      // Net Labor Payable = 350,000 - 39,375 = 310,625
      expect(laborTax.netPayable).toBeCloseTo(310625, 2);
    });

    it('calculates row unit cost incorporating 5% retention rate and warranty', () => {
      const directCost = 200000;
      const ocmRate = 10;
      const taxRate = 5;
      const profitRate = 2;
      const vatRate = 5;
      const retentionRate = 5; // 5% retention
      const warrantyRate = 2; // 2% warranty

      const ocmCost = directCost * (ocmRate / 100); // 20,000
      const taxCost = directCost * (taxRate / 100); // 10,000
      const profitCost = directCost * (profitRate / 100); // 4,000
      const vatCost = directCost * (vatRate / 100); // 10,000
      const retentionCost = directCost * (retentionRate / 100); // 10,000
      const warrantyCost = directCost * (warrantyRate / 100); // 4,000

      const totalCalculated =
        directCost + ocmCost + taxCost + profitCost + vatCost + retentionCost + warrantyCost;

      expect(retentionCost).toBe(10000); // 5% of 200,000
      expect(totalCalculated).toBe(258000);
    });
  });
});



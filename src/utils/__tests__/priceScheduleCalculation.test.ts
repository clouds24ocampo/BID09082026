import { describe, it, expect } from 'vitest';

/**
 * Price Schedule Calculation & Section VI Sync Logic Test Suite
 * 
 * Verifies exact breakdown calculations for Columns 5, 6, 7, 8, 9, 10
 * matching GPPB Resolution 09-2020 requirements.
 */

export interface PriceScheduleItemRow {
  id: string;
  itemNo: string;
  description: string;
  countryOfOrigin: string;
  quantity: number;
  unitPriceSec6: number;
}

export const computeRowBreakdown = (
  row: PriceScheduleItemRow,
  transpoPercent = 20,
  taxPercent = 5,
  servicesPercent = 15
) => {
  const sec6UnitPrice = row.unitPriceSec6 || 0;
  const transpoRate = (transpoPercent || 20) / 100;
  const taxRate = (taxPercent || 5) / 100;
  const servRate = (servicesPercent || 15) / 100;
  const divisor = 1 + transpoRate + taxRate + servRate; // 1.40

  const col5_EXW = sec6UnitPrice / (divisor || 1);
  const col6_Transpo = col5_EXW * transpoRate;
  const col7_Taxes = col5_EXW * taxRate;
  const col8_Services = col5_EXW * servRate;
  const col9_UnitTotal = col5_EXW + col6_Transpo + col7_Taxes + col8_Services;
  const col10_LineTotal = col9_UnitTotal * (row.quantity || 0);

  return {
    col5_EXW,
    col6_Transpo,
    col7_Taxes,
    col8_Services,
    col9_UnitTotal,
    col10_LineTotal
  };
};

describe('Price Schedule Breakdown Calculation Engine', () => {
  it('should accurately calculate 140 Pesos sample with 100 EXW, 20 Transpo, 5 Taxes, 15 Services', () => {
    const sampleRow: PriceScheduleItemRow = {
      id: 'row-1',
      itemNo: '1',
      description: 'High-Definition IP Security Camera System',
      countryOfOrigin: 'Philippines',
      quantity: 1,
      unitPriceSec6: 140
    };

    const breakdown = computeRowBreakdown(sampleRow, 20, 5, 15);

    expect(breakdown.col5_EXW).toBeCloseTo(100.00, 2);
    expect(breakdown.col6_Transpo).toBeCloseTo(20.00, 2);
    expect(breakdown.col7_Taxes).toBeCloseTo(5.00, 2);
    expect(breakdown.col8_Services).toBeCloseTo(15.00, 2);
    expect(breakdown.col9_UnitTotal).toBeCloseTo(140.00, 2);
    expect(breakdown.col10_LineTotal).toBeCloseTo(140.00, 2);
  });

  it('should accurately scale Col 10 Line Total when QTY > 1 (e.g. Qty = 5, Unit Price = 500,000)', () => {
    const sampleRow: PriceScheduleItemRow = {
      id: 'row-2',
      itemNo: '2',
      description: 'Enterprise Server Rack Systems',
      countryOfOrigin: 'Philippines',
      quantity: 5,
      unitPriceSec6: 500000
    };

    const breakdown = computeRowBreakdown(sampleRow, 20, 5, 15);

    // Sum of Col 5 + Col 6 + Col 7 + Col 8 MUST equal 500,000 exactly
    expect(breakdown.col9_UnitTotal).toBeCloseTo(500000.00, 2);
    // Line Total Col 10 MUST equal 500,000 * 5 = 2,500,000
    expect(breakdown.col10_LineTotal).toBeCloseTo(2500000.00, 2);
  });
});

import { describe, it, expect } from 'vitest';
import {
  getServicesCostAmount,
  getServicesCostDisplay,
  getGrandTotalWithServicesDisplay,
  ScheduleItem
} from '../../components/vault/templates/SectionViScheduleOfRequirements';

describe('Section VI to Detailed Estimates Labor/Services Calculation', () => {
  const sampleItems: ScheduleItem[] = [
    { id: '1', description: 'CCTV 4MP IP Cameras Outdoor', quantity: '4 Units', unitAmount: 'PHP 2,500.00', total: 'PHP 10,000.00', delivered: '30 Calendar Days' },
    { id: '2', description: '8-Channel NVR System', quantity: '1 Unit', unitAmount: 'PHP 6,500.00', total: 'PHP 6,500.00', delivered: '30 Calendar Days' },
    { id: '3', description: '2TB Surveillance Hard Drive', quantity: '1 Unit', unitAmount: 'PHP 3,800.00', total: 'PHP 3,800.00', delivered: '30 Calendar Days' },
    { id: '4', description: 'UTP Cable Cat6 305m Roll', quantity: '1 Roll', unitAmount: 'PHP 1,500.00', total: 'PHP 1,500.00', delivered: '30 Calendar Days' },
    { id: '5', description: 'RJ45 Connectors & Boots', quantity: '1 Box', unitAmount: 'PHP 533.00', total: 'PHP 533.00', delivered: '30 Calendar Days' },
    { id: '6', description: 'Auxiliary & Mounting Accessories', quantity: '1 Lot', unitAmount: 'PHP 1.00', total: 'PHP 1.00', delivered: '30 Calendar Days' },
  ];

  // Total Materials: 10000 + 6500 + 3800 + 1500 + 533 + 1 = 22,334.00
  it('should accurately calculate 35% default labor/services amount for 22,334 materials (₱7,816.90)', () => {
    const amount = getServicesCostAmount(sampleItems, 35);
    expect(amount).toBeCloseTo(7816.90, 2);
    expect(getServicesCostDisplay(sampleItems, 35)).toBe('PHP 7,816.90');
    expect(getGrandTotalWithServicesDisplay(sampleItems, 35)).toBe('PHP 30,150.90');
  });

  it('should accurately calculate custom exact amount when specified in Section VI', () => {
    const amount = getServicesCostAmount(sampleItems, 35, '5,000.00');
    expect(amount).toBe(5000);
    expect(getServicesCostDisplay(sampleItems, 35, '5,000.00')).toBe('PHP 5,000.00');
    expect(getGrandTotalWithServicesDisplay(sampleItems, 35, '5,000.00')).toBe('PHP 27,334.00');
  });

  it('should never mistakenly pick up Item 6 (1 Lot = ₱1.00) as the labor cost', () => {
    const item6Total = parseFloat(sampleItems[5].total.replace(/[^0-9.]/g, ''));
    expect(item6Total).toBe(1.00);

    const laborAmount = getServicesCostAmount(sampleItems, 35);
    expect(laborAmount).toBeGreaterThan(item6Total);
    expect(laborAmount).toBeCloseTo(7816.90, 2);
  });
});

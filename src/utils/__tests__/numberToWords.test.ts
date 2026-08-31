import { describe, it, expect } from 'vitest';
import { numberToWords } from '../numberToWords';

describe('numberToWords', () => {
  it('should convert standard currency amounts to English words correctly', () => {
    expect(numberToWords('1,250,000.00')).toBe('ONE MILLION TWO HUNDRED FIFTY THOUSAND PESOS ONLY');
    expect(numberToWords(1250000.50)).toBe('ONE MILLION TWO HUNDRED FIFTY THOUSAND PESOS AND 50/100');
    expect(numberToWords('1000000')).toBe('ONE MILLION PESOS ONLY');
    expect(numberToWords(0)).toBe('ZERO PESOS ONLY');
  });
});

import { describe, it, expect } from 'vitest';
import { PAYMENT_DOC_ROWS, PAYMENT_SECTIONS, NEW_FINAL_PAYMENT_SLOTS } from '../paymentDocsCatalog';
import { FINAL_PAYMENT_DOC_SLOTS, STATUTORY_DOCUMENT_SLOTS } from '../../components/projects/ProjectProfileView';

const WIN_SLOTS = ['dole_cert', 'performance_bond'];

describe('payment documents checklist', () => {
  it('has unique row keys and only known sections', () => {
    const keys = PAYMENT_DOC_ROWS.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    PAYMENT_DOC_ROWS.forEach((r) => expect(Object.keys(PAYMENT_SECTIONS)).toContain(r.section));
  });

  it('every section A-F has at least one row', () => {
    Object.keys(PAYMENT_SECTIONS).forEach((s) => expect(PAYMENT_DOC_ROWS.some((r) => r.section === s)).toBe(true));
  });

  it('every template row resolves to a statutory slot', () => {
    PAYMENT_DOC_ROWS.forEach((r) => {
      if (r.source.kind !== 'template') return;
      const type = r.source.type;
      expect(STATUTORY_DOCUMENT_SLOTS.some((s) => s.key === type.toLowerCase() && s.templateType === type), `${r.key} -> ${type}`).toBe(true);
    });
  });

  it('every upload row resolves to a real slot', () => {
    PAYMENT_DOC_ROWS.forEach((r) => {
      if (r.source.kind !== 'upload') return;
      const { category, slot } = r.source;
      const ok = category === 'FINAL_PAYMENT' ? FINAL_PAYMENT_DOC_SLOTS.some((s) => s.key === slot) : WIN_SLOTS.includes(slot);
      expect(ok, `${r.key} -> ${slot}`).toBe(true);
    });
  });

  it('new final-payment slots are appended to the Project Status tab slots exactly once', () => {
    NEW_FINAL_PAYMENT_SLOTS.forEach((n) => expect(FINAL_PAYMENT_DOC_SLOTS.filter((s) => s.key === n.key)).toHaveLength(1));
    const keys = FINAL_PAYMENT_DOC_SLOTS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

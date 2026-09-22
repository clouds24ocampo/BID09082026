/** Strict 2-envelope isolation for Philippine sealed bidding packages. */

export type BidEnvelope = 'ENVELOPE_1' | 'ENVELOPE_2';

const FINANCIAL_CODE_KEYS = [
  'FINANCIAL_BID_FORM',
  'GPPB-BIDFORM',
  'BILL_OF_QUANTITIES',
  'DETAILED_ESTIMATES',
  'PRICE_SCHEDULE',
  'PRICESCHED',
  'SUMMARY_BID',
  'CASH_FLOW',
  'CASHFLOW',
  'SF-INFR-56'
] as const;

const TECHNICAL_CODE_KEYS = [
  'ONGOING_CONTRACTS',
  'SLCC_STATEMENT',
  'SECTION_VI',
  'SEC_VI',
  'TECH_SPECS',
  'SECTION_VII',
  'SEC_VII',
  'FRAMEWORK_AGREEMENT',
  'ORGANIZATIONAL_CHART',
  'KEY_PERSONNEL',
  'MAJOR_EQUIPMENT',
  'AFTERSALES',
  'OMNIBUS',
  'BID_SECURING',
  'NFCC_COMPUTATION'
] as const;

export function isFormLDetailedEstimates(code: string, name: string): boolean {
  const c = (code || '').toUpperCase();
  const n = (name || '').toLowerCase();
  return (
    c.includes('DETAILED_ESTIMATES') ||
    c.includes('FORM_L') ||
    n.includes('detailed estimate') ||
    n.includes('form (l)') ||
    /\bform l\b/.test(n)
  );
}

export function isFinancialEnvelopeDoc(code: string, name: string): boolean {
  const c = (code || '').toUpperCase();
  const n = (name || '').toLowerCase();
  if (FINANCIAL_CODE_KEYS.some((k) => c.includes(k))) return true;
  if (c.includes('BOQ') && !c.includes('BOOK')) return true;
  if (isFormLDetailedEstimates(c, n)) return true;
  if (n.includes('financial bid form')) return true;
  if (n.includes('bill of quantities')) return true;
  if (n.includes('price schedule')) return true;
  if (n.includes('summary of bid') || n.includes('summary bid')) return true;
  if (n.includes('cash flow') || n.includes('sf-infr-56')) return true;
  return false;
}

export function isTechnicalEnvelopeDoc(code: string, name: string): boolean {
  if (isFinancialEnvelopeDoc(code, name)) return false;
  const c = (code || '').toUpperCase();
  const n = (name || '').toLowerCase();
  if (TECHNICAL_CODE_KEYS.some((k) => c.includes(k))) return true;
  if (n.includes('ongoing') || n.includes('slcc') || n.includes('single largest')) return true;
  if (n.includes('section vi') || n.includes('schedule of req')) return true;
  if (n.includes('section vii') || n.includes('technical spec')) return true;
  if (n.includes('framework agreement')) return true;
  if (n.includes('org chart') || n.includes('organizational chart')) return true;
  if (n.includes('key personnel') || n.includes('manpower')) return true;
  if (n.includes('major equipment') || (n.includes('equipment') && !isFormLDetailedEstimates(c, n) && !n.includes('bill of quantities'))) {
    return true;
  }
  if (n.includes('after-sale') || n.includes('aftersales') || n.includes('warranty')) return true;
  if (n.includes('omnibus') || n.includes('nfcc') || n.includes('bid secur')) return true;
  return false;
}

export function isMajorEquipmentDoc(code: string, name: string): boolean {
  if (isFormLDetailedEstimates(code, name)) return false;
  if (isFinancialEnvelopeDoc(code, name)) return false;
  const c = (code || '').toUpperCase();
  const n = (name || '').toLowerCase();
  if (c.includes('MAJOR_EQUIPMENT')) return true;
  if (c.includes('EQUIPMENT') && !c.includes('DETAILED')) return true;
  if (n.includes('major equipment') || n.includes('equipment utilization')) return true;
  if (n.includes('equipment') && !n.includes('detailed estimate') && !n.includes('form l') && !n.includes('form (l)')) {
    return true;
  }
  return false;
}

export function resolveBidEnvelope(
  code: string,
  name: string,
  declared?: string,
  statutoryDefault?: BidEnvelope
): BidEnvelope {
  if (isFinancialEnvelopeDoc(code, name)) return 'ENVELOPE_2';
  if (isTechnicalEnvelopeDoc(code, name)) return 'ENVELOPE_1';
  if (statutoryDefault === 'ENVELOPE_1' || statutoryDefault === 'ENVELOPE_2') return statutoryDefault;
  if (declared === 'ENVELOPE_1' || declared === 'ENVELOPE_2') return declared;
  return 'ENVELOPE_1';
}

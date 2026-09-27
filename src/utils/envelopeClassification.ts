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
    c.includes('FORM (L)') ||
    n.includes('detailed estimate') ||
    n.includes('form (l)') ||
    n.includes('form l') ||
    /\bform l\b/.test(n)
  );
}

export function isFinancialEnvelopeDoc(code: string, name: string): boolean {
  const c = (code || '').toUpperCase();
  const n = (name || '').toLowerCase();

  // 1. STRICT EXCLUSIONS: Technical and Legal documents must NEVER be classified as Financial,
  // even if their titles or codes contain "financial", "capacity", "statement", etc.
  if (
    c.includes('AUDITED') ||
    c.includes('AFS') ||
    n.includes('audited financial') ||
    n.includes('audited fs') ||
    n.includes('stamped received by bir') ||
    n.includes('balance sheet') ||
    n.includes('income statement')
  ) {
    return false; // Envelope 1 (Legal & Eligibility)
  }

  if (
    c.includes('NFCC') ||
    n.includes('net financial contracting capacity') ||
    n.includes('contracting capacity') ||
    n.includes('nfcc')
  ) {
    return false; // Envelope 1 (Technical & Eligibility)
  }

  if (
    c.includes('KEY_PERSONNEL') || n.includes('key personnel') || n.includes('manpower') ||
    (c.includes('EQUIPMENT') && !isFormLDetailedEstimates(c, n) && !c.includes('BILL_OF_QUANTITIES')) ||
    (n.includes('equipment') && !isFormLDetailedEstimates(c, n) && !n.includes('bill of quantities')) ||
    c.includes('ORG_CHART') || n.includes('organizational chart') ||
    c.includes('SECTION_VI') || n.includes('section vi') || n.includes('schedule of requirements') ||
    c.includes('SECTION_VII') || n.includes('section vii') || n.includes('technical specifications') ||
    c.includes('OMNIBUS') || n.includes('omnibus') || n.includes('oss') ||
    c.includes('BID_SECURING') || n.includes('bid securing') || n.includes('bsd') ||
    c.includes('ONGOING') || n.includes('ongoing contracts') ||
    c.includes('SLCC') || n.includes('slcc') || n.includes('single largest') ||
    c.includes('MAYOR') || n.includes('mayor') ||
    c.includes('PCAB') || n.includes('pcab') ||
    c.includes('PHILGEPS') || n.includes('philgeps') ||
    c.includes('TAX_CLEARANCE') || n.includes('tax clearance') ||
    c.includes('SECRETARY') || n.includes('secretary') ||
    c.includes('JVA') || n.includes('joint venture')
  ) {
    return false; // Envelope 1 (Technical & Legal)
  }

  // 2. EXCLUSIVE FINANCIAL DOCUMENTS (Envelope 2: Financial Proposal Component)
  if (isFormLDetailedEstimates(c, n)) return true;
  if (c.includes('FINANCIAL_BID_FORM') || c.includes('GPPB-BIDFORM')) return true;
  if (c.includes('BILL_OF_QUANTITIES') || (c.includes('BOQ') && !c.includes('BOOK'))) return true;
  if (c.includes('PRICE_SCHEDULE') || c.includes('PRICESCHED')) return true;
  if (c.includes('SUMMARY_BID') || c.includes('SUMMARY_BID_PRICES')) return true;
  if (c.includes('CASH_FLOW') || c.includes('CASHFLOW') || c.includes('SF-INFR-56')) return true;

  if (n.includes('financial bid form') || n.includes('bid form (goods') || n.includes('bid form (infra') || n.includes('bid form (consult')) return true;
  if (n.includes('bill of quantities') || n.includes('boq breakdown')) return true;
  if (n.includes('price schedule')) return true;
  if (n.includes('summary of bid prices') || n.includes('summary bid')) return true;
  if (n.includes('cash flow by quarter') || n.includes('payment schedule') || n.includes('sf-infr-56')) return true;

  return false;
}

export function isTechnicalEnvelopeDoc(code: string, name: string): boolean {
  return !isFinancialEnvelopeDoc(code, name);
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
  _declared?: string,
  _statutoryDefault?: BidEnvelope
): BidEnvelope {
  // STRICT STATUTORY SEGREGATION (RA 9184 & RA 12009 NGPA):
  // Financial envelope (Envelope 2) is EXCLUSIVELY for financial bid documents:
  // 1. Financial Bid Form
  // 2. Bill of Quantities (BOQ Breakdown)
  // 3. Form L - Detailed Estimates
  // 4. Detailed Price Schedule
  // 5. Summary of Bid Prices
  // 6. Cash Flow by Quarter / Payment Schedule (SF-INFR-56)
  // ALL OTHER DOCUMENTS (Legal, Technical, Eligibility, AFS, NFCC, Key Personnel, Equipment, Org Chart, Sec VI, Sec VII)
  // belong strictly and exclusively to ENVELOPE_1.
  if (isFinancialEnvelopeDoc(code, name)) {
    return 'ENVELOPE_2';
  }
  return 'ENVELOPE_1';
}

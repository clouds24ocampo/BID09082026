---
name: philippine-procurement-statutory
description: Use for Philippine government procurement rules in BiDOCS - RA 9184 and RA 12009 (NGPA), Legal paper, Goods/Infrastructure/Consulting eligibility, SLCC, NFCC, envelope split, statutory form content and compliance audits.
---

# Philippine Procurement (Statutory)

## Regimes
`LegalRegime = 'RA_9184' | 'RA_12009_NGPA'` (`src/types/index.ts`). RA 12009 (NGPA) replaces RA 9184 with a transition period; keep both paths until the repo says otherwise. `/api/regime/status` in `server.js` reports it. Verify any legal citation against the current GPPB text before writing it into a form; do not invent clause numbers.

## Project types
`getProjectClassification()` in `src/utils/projectClassification.ts` → `INFRASTRUCTURE | GOODS | CONSULTING`. Infrastructure needs PCAB license and Form L-style detailed estimates; goods need price schedule.

## Eligibility numbers
- SLCC: single largest completed contract, similar nature, usually >= 50% of ABC (Goods/Infra). Computed from `StatementSlccModal`.
- NFCC: net financial contracting capacity = (current assets − current liabilities) × K − value of outstanding/ongoing contracts. K = 15 for a single contract (check current GPPB IRR). See `nfcc.tsx`, `StatementOngoingContractsModal.tsx`.
- Tests: `projectClassification.test.ts`, `powTaxAndLaborCalculations.test.ts`, `priceScheduleCalculation.test.ts`.

## Envelopes (`src/utils/envelopeClassification.ts`)
`ENVELOPE_1` technical/eligibility, `ENVELOPE_2` financial. Financial keys: bid form, BOQ, detailed estimates, price schedule, summary of bid, cash flow. Never mix; `isFormLDetailedEstimates` is the Section VI sync hook.

## Format
Legal 8.5×13 only. Amounts in words via `numberToWords`. Signatories and QR verification block on every statutory form.

## Audit output
List: requirement, source (RA/IRR section if known, else "verify"), status in app, file:line.

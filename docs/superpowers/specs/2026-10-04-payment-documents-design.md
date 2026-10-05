# Payment Documents tab — design

Date: 2026-10-04 · Source requirements: `payment.md` (repo root) · Status: draft for review

## Goal

Add a **Payment Documents** tab next to **Bid Packages**. It tracks the final-payment package for a won infrastructure project and generates the core forms. Every number across the forms must reconcile, because SWA, time elapsed, final quantities and payment computation must "tell the same story" (payment.md §25).

Success criteria:
1. New sidebar tab after Bid Packages, project-scoped like the other tabs.
2. Checklist A–F from payment.md with live status per item.
3. Existing forms (RLA/SWA/SOTE/CA/FPL/BS) are reused, not copied, and their computations match payment.md.
4. One shared calculation module, covered by tests that use payment.md's worked example.
5. `npx tsc --noEmit`, `npm test` and `npm run validate` pass before and after (AGENTS.md T-1). PDF rules PDF-1..7 hold.

## What exists today (audited)

| Item | State | Misalignment with payment.md |
|:--|:--|:--|
| SWA [SWA.tsx:190](../../../src/components/vault/templates/SWA.tsx#L190) | progress billing | Retention is a flat 10% of every billing (rule: 10% until 50% complete, none after if satisfactory and on schedule). No final reconciliation (variation orders, final contract price, previous payments). |
| BS [Bs.tsx:70](../../../src/components/vault/templates/Bs.tsx#L70) | invoice computation | Hardcoded demo defaults (35% gross, 15% recoup, 10% retention). Not linked to SWA. |
| FPL [FPL.tsx:71](../../../src/components/vault/templates/FPL.tsx#L71) | final payment letter | Final billing defaults to 15% of contract. Always states 100% complete and requests retention release before acceptance. Missing contract no., NTP, durations, actual completion date. |
| SOTE [sote.tsx:88](../../../src/components/vault/templates/sote.tsx#L88) | time elapsed | Revised-duration math is right. Missing liquidated damages, suspension/resume orders, multiple extension orders. |
| CA [CA.tsx](../../../src/components/vault/templates/CA.tsx) | affidavit | Static text. Missing contract no. and disclosure of outstanding obligations. |
| Final-payment slots [ProjectProfileView.tsx:195](../../../src/components/projects/ProjectProfileView.tsx#L195) | upload only | Certificate of completion/acceptance, S-curve, final inspection: upload slots, which is correct (agency documents). |
| Missing | n/a | Final reconciliation sheet; labor/materials/equipment payment certificate. |

## Architecture

```
paymentDocsCatalog.ts ──► PaymentDocumentsView (new tab)
                               │ opens
                               ▼
                    StatutoryModalHost (extracted)  ◄── ProjectProfileView (now also uses host)
                               │ saves via
                               ▼
                    projectDocStore.ts (extracted save/load, same storage keys)

finalPaymentCalc.ts (pure) ◄── SWA, SOTE, FRS, BS, FPL
```

Data flow, one direction: **SOTE (LD) + SWA (value of work) → FRS → FPL + BS**. Each downstream form reads the saved state of the upstream form for its defaults and offers an explicit "Fill from …" button. Nothing is silently overwritten.

### New files
- `src/utils/finalPaymentCalc.ts` — pure functions, no React, no storage.
- `src/utils/paymentDocsCatalog.ts` — checklist definition (data only).
- `src/utils/projectDocStore.ts` — `saveStatutoryDoc`, `loadProjectDocMeta` extracted from `ProjectProfileView` (same keys: `bidocs_statutory_docs_*`, `bidocs_final_payment_docs_*`, IndexedDB `proj_statutory_*`). No storage format change.
- `src/components/vault/templates/StatutoryModalHost.tsx` — the 16 modal blocks now at [ProjectProfileView.tsx:5808-6320](../../../src/components/projects/ProjectProfileView.tsx#L5808), extracted so both views mount them with the same props. ProjectProfileView switches to the host (net deletion of ~500 lines).
- `src/components/payments/PaymentDocumentsView.tsx` — the tab.
- `src/components/vault/templates/FRS.tsx` — Final Payment Reconciliation (sibling pattern: modal, html2canvas → pdf-lib, Legal 612×936).
- `src/components/vault/templates/LMEC.tsx` — Certificate of Payment of Labor, Materials and Equipment (same pattern).
- Tests: `src/utils/__tests__/finalPaymentCalc.test.ts`, `paymentDocsCatalog.test.ts`.

### Edited files
`AppShell.tsx` (nav item `payments`, after `bids`), `App.tsx` (route), `ProjectProfileView.tsx` (use host/store), `SWA.tsx`, `sote.tsx`, `Bs.tsx`, `FPL.tsx`, `CA.tsx`, `appMount.test.ts`/`navigationBackButtons.test.tsx` if they enumerate tabs.

## The tab

- Project picker (same `getOpportunityProjects` source as Bid Packages; no auto-select).
- Header: overall progress, applicable-law selector (RA 9184 | RA 12009), stored with the reconciliation record, used only for letter wording.
- Six collapsible sections A–F. Each row: name, status (Missing | Draft saved | Attached), action (Open form | Upload | Preview).
- Row sources:

| Section | Row | Source |
|:--|:--|:--|
| A | Letter request for final payment | template FPL |
| A | Final SWA / progress billing | template SWA |
| A | Final monthly certificate of payment | template BS |
| A | Statement of time elapsed | template SOTE |
| A | Contractor's affidavit | template CA |
| A | Certificate of payment (labor, materials, equipment) | **new** LMEC |
| A | Back-up computations, previous payment records | **new** FRS |
| A | Tax documents | upload slot (`bir_tax_clearance`) |
| B | Final inspection report | upload (new slot `final_inspection`) |
| B | Certificate of completion / acceptance | upload slot (`cert_completion_acceptance`) |
| B | Final as-built plans | template ABP |
| B | Material test reports | template MTS |
| B | Geotagged photographs | template PROGRESS_PHOTO |
| B | Defect correction documentation | upload (new slot `defect_correction`) |
| C | Approved schedule, PERT/CPM | template PERT |
| C | S-curve | upload slot (`s_curve`) |
| C | Time extension / suspension orders | upload (new slot `time_orders`) |
| D | Manpower, equipment, methodology | templates MPDS, EUP, CMS |
| D | CSHP / DOLE | win-doc slot `dole_cert` |
| E | Performance security | win-doc slot `performance_bond` |
| E | Warranty security | template WS |
| E | Retention computation | derived from FRS |
| F | Turnover documents | template TOA |
| F | O&M manuals, warranties, keys/accessories | upload (new slot `turnover_misc`) |

Status is read from existing localStorage keys; the tab adds only the new upload slots (`final_inspection`, `defect_correction`, `time_orders`, `turnover_misc`) to the existing `bidocs_final_payment_docs_*` map.

## Calculation rules (`finalPaymentCalc.ts`)

All amounts in pesos, rounded to centavos at the end of each derived figure only.

1. **Final contract price** = original price + Σ variation orders − Σ deductive orders. (Example: 10,000,000 + 500,000 − 100,000 = 10,400,000.)
2. **Current gross billing** = final value of work accomplished − Σ previous gross payments. (10,400,000 − 7,500,000 = 2,900,000.)
3. **Retention** (RA 9184 IRR / payment.md §19): rate 10% (editable down to 5% for justifiable causes) is withheld on the portion of cumulative accomplishment up to 50% of the final contract price. Above 50%, no further retention if work is satisfactory and on schedule; otherwise 10% continues. A billing that crosses 50% is split at the line. Retention withheld to date is tracked; this billing's retention = rule applied cumulatively − already withheld. Released on final acceptance only.
4. **Advance recoupment** = recoupment rate (default 15%) × current gross, capped at the unrecouped advance balance.
5. **Taxes**: 5% VAT and 2% EWT, with the existing "net of VAT (÷1.12)" toggle, moved unchanged from SWA. payment.md names "withholding taxes" without rates, so the rates stay editable.
6. **Net payment** = current gross − retention − recoupment − third-party liabilities − uncorrected defects − taxes − other.
7. **Time**: revised duration = original + Σ extensions. Elapsed days counted inclusively from NTP, excluding approved suspension days. Time elapsed % = elapsed ÷ revised duration × 100 against the **revised** completion date, never the original. Slippage = actual accomplishment % − planned accomplishment % (existing SOTE definition).
8. **Liquidated damages** = delay days × rate × unperformed portion at the revised completion date. Delay days = max(0, actual completion − revised completion). Default rate 1/10 of 1% per day (editable). Unperformed portion is derived from an "accomplishment at revised completion date %" input (default 100% → LD 0).

## Form changes

- **SWA**: retention via rule 3. Show cumulative retention withheld. Persist `totalToDateCost` and `retentionWithheldToDate` in its saved payload for FRS.
- **SOTE**: multiple extension and suspension rows, LD block (rule 8), revised completion date shown. Persist LD amount.
- **FRS (new)**: original price, VO list, previous payments list, final value of work (default from SWA), deductions from rules 3–6, LD (default from SOTE), net payment. Persists record `bidocs_frs_{tenant}_{scope}` including law framework.
- **BS**: remove hardcoded 35% defaults; defaults come from FRS, else zero. Button "Fill from reconciliation".
- **FPL**: amounts and dates from FRS/SOTE; delete the 15% default. Add contract no., NTP, original and revised duration, actual completion date. Physical accomplishment from SWA, not hardcoded. Retention-release paragraph appears only when the user marks "Certificate of Final Acceptance issued" (payment.md §3: acceptance is an act of the Procuring Entity). Otherwise the letter requests final inspection and acceptance.
- **CA**: add contract no., contract price, outstanding-obligations disclosure (labor, suppliers; default "None"). Keep notarial block and ID fields.
- **LMEC (new)**: rows of category, payee, description, amount, date paid, proof; totals by category; certification sentence from payment.md §7.

PDF compliance: Legal only (PDF-2), tables via `autoFitEngine` (PDF-7) where a table can exceed one page (FRS lists, LMEC rows), off-screen containers per PDF-4, `blobToDataUrl` untouched (PDF-6).

## Testing

- `finalPaymentCalc.test.ts`: payment.md worked example (10.4M final price, 2.9M gross); retention below 50%, above 50% on schedule, above 50% behind schedule, crossing 50%; recoupment cap; revised-duration time elapsed (120/120 = 100%; extensions change the denominator); LD zero and nonzero; tax toggle parity with current SWA numbers.
- `paymentDocsCatalog.test.ts`: every checklist row resolves to a template, slot, or derived source; no duplicate keys.
- Existing suites unchanged and green (nav, mount, PDF).
- Manual check in the browser: open tab, pick project, generate SWA → FRS → FPL, confirm figures match.

## Out of scope (first release)

Generated PERT/CPM, S-curve, manpower, equipment, photo index, certificate of completion/acceptance, final inspection report (agency documents, upload only). No Supabase sync. No change to bid-package behavior.

## Assumptions to confirm

1. payment.md's legal citations (RA 12009 IRR §71.2.8, DOLE DO 252 s.2025) are not verified here. Retention follows the rule as written in payment.md.
2. payment.md's worked example deducts a flat 10% retention (₱290,000) on the final billing. That conflicts with its own §19 rule if the project passed 50% on schedule. The spec follows §19; the example is treated as illustrative.
3. Elapsed-day counting (inclusive of NTP day, excluding suspensions) and LD rate (1/10 of 1% per day of the unperformed portion) follow common GPPB practice; confirm against the contract's SCC.
4. 5% VAT / 2% EWT defaults are carried over from the current SWA, not from payment.md.

# BiDOCS Debugging Guide

This guide defines the standard debugging workflow for the BiDOCS application. Debugging must produce evidence, preserve security boundaries, and leave a regression check behind.

## 1. Classify the Failure

Record:

- Expected behavior
- Actual behavior
- Reproduction steps
- Affected user flow and environment
- First known good commit, if available
- Console error, stack trace, network response, or generated-file symptom

Classify the issue as one or more of:

- Type or build failure
- Runtime exception
- Incorrect state or data flow
- Browser or layout defect
- PDF pagination or rendering defect
- Persistence or synchronization failure
- Authentication, authorization, or security defect
- Performance regression

## 2. Reproduce Before Editing

1. Confirm the failure on the smallest available input.
2. Reduce the scenario without removing the condition that triggers it.
3. Capture the exact error and the nearest owning function or component.
4. Form one falsifiable hypothesis.
5. Run the cheapest check that could disprove the hypothesis.

Do not patch symptoms, add broad error suppression, or change unrelated code while the failure location is unknown.

## 3. Standard Validation Commands

Run the narrowest relevant check first, then widen validation as needed.

```powershell
# Type safety
npx tsc --noEmit

# Unit and integration tests
npm test

# Project validation, including PDF guards
npm run validate

# Dependency security audit
npm audit

# Production build
npm run build
```

Use the repository's package scripts as the source of truth. Do not replace a failing assertion with a skipped test or weaken a compiler/linter rule to obtain green output.

## 4. Frontend and Browser Debugging

Check the following in order:

1. Browser console errors and warnings.
2. Failed network requests, status codes, and response payloads.
3. Component props, context values, and state transitions.
4. Loading, empty, error, and retry states.
5. Responsive layout at desktop and mobile widths.
6. DOM measurement, overflow, clipping, and focus behavior.
7. Browser storage and IndexedDB records when persistence is involved.

For visual defects, inspect computed dimensions rather than guessing from screenshots. Confirm that text, controls, dialogs, tables, and generated previews do not overlap or shift their parent layout.

## 5. PDF Debugging

Before changing PDF code, read:

- `.agents/skills/bidocs-pdf-system/SKILL.md`
- `.agents/skills/zero-whitespace-pdf-master/SKILL.md`
- `GEMINI.md`

Required checks:

- Legal Portrait is `[612, 936]`; Legal Landscape is `[936, 612]`.
- `buildMergedThreeLayerPdfDataUrl` returns a base64 data URL through `blobToDataUrl`.
- No `URL.createObjectURL` is used for generated PDF iframe content.
- Off-screen render containers use `left: '-9999px'`, `top: '0px'`, `width: '816px'`, and `zIndex: -1`.
- Cover and TOC elements use dedicated IDs, not broad selectors.
- `blobToDataUrl` remains available in `src/utils/pdfExportEngine.ts`.
- Progress is driven by the engine callback and does not jump to an arbitrary percentage.
- Tables do not clip, collide, split incorrectly, or leave orphan rows.
- No accidental blank pages are created.
- No large awkward trailing whitespace appears on a page.
- Mandatory headers, footers, totals, signatures, QR codes, notices, and attachments remain present.
- ORIGINAL, COPY 1, and COPY 2 stamps appear on the correct copies.

Use measured row heights and `autoFitPageChunks` rather than hardcoded row counts. Zero whitespace means balanced page use while preserving readable legal margins and complete statutory content.

## 6. Security Debugging

Treat every external value as untrusted. Check:

- Input validation at API, form, upload, and callback boundaries
- Authorization and tenant ownership, not only authentication
- Parameterized database queries and Supabase RLS
- Safe output encoding and sanitized rich text
- File type, file size, and filename restrictions
- CSP, HTTPS, secure cookies, and CORS allowlists
- Secrets absent from source, logs, tests, screenshots, and error messages
- Dependency audit results and newly introduced packages

Never print, commit, or paste secrets into an issue, chat, test fixture, or debug log. If a credential may be exposed, stop and rotate it through the approved operational process.

## 7. Persistence and Data Flow

For IndexedDB, Supabase, or cross-view state issues:

1. Identify the source of truth.
2. Log identifiers and lifecycle events, never sensitive payloads.
3. Verify serialization and schema compatibility.
4. Check stale cache, optimistic rollback, retry, and offline paths.
5. Confirm tenant and record ownership at every read and write.
6. Add a focused test for the broken transition.

## 8. Performance Debugging

Measure before optimizing. Capture:

- Operation or render duration
- Input size and record count
- Network latency and payload size
- Memory growth or repeated work
- Bundle or chunk impact

Fix the measured bottleneck without trading away correctness, accessibility, security, or PDF fidelity.

## 9. Regression Protection

Every fix should leave at least one of:

- A focused unit or integration test
- A browser test or reproducible DOM assertion
- A PDF page-count, dimension, text, or layout assertion
- A validation guard or lint rule
- A documented manual verification step when automation is not feasible

Run the focused check immediately after the edit, then run the wider applicable validation commands.

## 10. Debug Report Format

Use this structure when handing off or closing an investigation:

```text
Problem:
Reproduction:
Evidence:
Root cause:
Fix:
Validation:
Residual risk:
Files changed:
```

A debugging task is complete only when the cause is understood, the fix is verified, and the remaining uncertainty is explicit.

---
name: system-diagnostics-debugger
description: Use to debug BiDOCS failures end to end - blank PDF iframes, progress bar glitches, unhandled rejections, IndexedDB/state bugs, tab-switch unmounts, memory growth. Follows DEBUGGING.md; extends systematic-debugging.
---

# System Diagnostics Debugger (BiDOCS)

Full procedure: `DEBUGGING.md` (repo root). Compact loop:

1. Record expected / actual / repro / error text.
2. Reproduce on smallest input before editing. One falsifiable hypothesis, cheapest check first.
3. Fix root cause at the shared function, not per caller.
4. Leave a regression test or guard.
5. Validate: `npx tsc --noEmit` → `npm test` → `npm run validate`.

## Symptom → first suspect
| Symptom | Look at |
|---|---|
| Blank PDF iframe after re-render | blob URL in data-URL path (PDF-1), `blobToDataUrl` |
| Progress bar jumps | pre-set progress in `MergedPackageViewerModal` (PDF-3) |
| Cover/page missing in PDF | off-screen container style (PDF-4), element id lookup (PDF-5) |
| Wrong page size | inner-scope size constants (PDF-2) |
| Quota / lost data | base64 in localStorage; use `vault-local-storage` |
| Data from other project/tenant | missing tenantId/project filter |
| Unhandled promise rejection | un-awaited async in effect; add catch + stale guard |
| Memory growth | unrevoked object URLs, LRU bypass, retained canvases |

Report format: Problem / Reproduction / Evidence / Root cause / Fix / Validation / Residual risk / Files changed.

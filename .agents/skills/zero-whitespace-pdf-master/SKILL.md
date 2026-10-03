---
name: zero-whitespace-pdf-master
description: Use when building or changing paginated statutory tables/forms in BiDOCS so Legal pages are fully used with no orphan rows or footer collisions. Covers src/utils/autoFitEngine.ts (calculateRowHeight, autoFitPageChunks, getAutoFitTypographyClass) and Rule PDF-7.
---

# Zero-Whitespace PDF Master

Read `bidocs-pdf-system` too. Rules PDF-1..6 still apply.

## API (`src/utils/autoFitEngine.ts`)
- `calculateRowHeight(text, charsPerLine=65, lineHeightPx=13.5, basePaddingPx=8, minHeightPx=22)` → px. Word-wrap model, 12% ragged slack.
- `autoFitPageChunks(items, getRowHeightFn, config: AutoFitConfig): T[][]` → items per page. Never loses items.
- `getAutoFitTypographyClass(totalChars, totalItems)` → font-scale class.
- `AutoFitConfig.strategy`: `'greedy'` fill page first, `'balanced'` even spread (prevents orphan last page).

## Geometry (96dpi)
Portrait sheet 1248px, landscape 816px. Usable = sheet − padding (40 / 28). Keep `headerHeightPx` (page 1), `footerHeightPx` (totals + signatories + QR, last page only), `runningFooterPx` (page number), `safetyBufferPx` honest. Wrong numbers cause clipped footers or blank gaps.

## Workflow
1. Measure rows with `calculateRowHeight`; never hardcode rows-per-page.
2. Chunk with `autoFitPageChunks`; render one `.print-document-sheet` per chunk.
3. Last page must hold footer block + at least 2 rows (use `balanced` if not).
4. Test: add/extend a case in `src/utils/__tests__/autoFitEngine.test.ts` (no item loss, no page overflow, no 1-row last page).
5. `npx tsc --noEmit` before and after.

Zero whitespace = balanced page use inside legal margins. Never cut statutory content to fill a page.

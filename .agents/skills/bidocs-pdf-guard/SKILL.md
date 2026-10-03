---
name: bidocs-pdf-guard
description: Use to verify or enforce BiDOCS PDF rules PDF-1..PDF-7 before commit or after touching pdfExportEngine.ts, MergedPackageViewerModal.tsx, MergedPdfViewerModal.tsx or off-screen render containers.
---

# BiDOCS PDF Guard

## Run
```
node scripts/bidocs-pdf-guard.js    # = npm run lint:pdf, also in .husky/pre-commit
npm run validate                    # tsc --noEmit + guard
```
Guard checks PDF-1..PDF-6 by source scan. PDF-7 (zero whitespace) is review + test only, see `zero-whitespace-pdf-master`.

## Rules (source of truth: AGENTS.md)
- PDF-1 `buildMergedThreeLayerPdfDataUrl` returns `blobToDataUrl(blob)`.
- PDF-2 `LEGAL_PORTRAIT [612,936]`, `LEGAL_LANDSCAPE [936,612]` at module scope only.
- PDF-3 no progress pre-jump; engine `onProgress` drives bar.
- PDF-4 off-screen: `left:'-9999px', top:'0px', width:'816px', zIndex:-1`; no `overflow:hidden`.
- PDF-5 lookup by id (`bundle-cover-${doc.id}`, `preview-cover-${folderCopy}-${doc.id}`), never `.print-document-sheet` selectors.
- PDF-6 keep `blobToDataUrl` exported in `pdfExportEngine.ts`.
- PDF-7 use autoFitEngine for tables.

## Allowed `URL.createObjectURL`
Only in `buildMergedThreeLayerPdfBlobUrl` (explicit blob API, not for iframes) and `exportMergedThreeLayerPdf` (download link, revoked after 1s). Any other use in the data-URL path is a violation.

## Fix a violation
Restore the rule, rerun guard, rerun `npx tsc --noEmit` and `npm test`. Never edit the guard or ESLint plugin to make it pass.

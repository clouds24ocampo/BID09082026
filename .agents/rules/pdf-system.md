# BiDOCS PDF System — Permanent Rules

These rules protect the PDF generation system from regressions.
They MUST be respected by every agent on every task.

## RULE 1: buildMergedThreeLayerPdfDataUrl returns base64, never blob URL

The function `buildMergedThreeLayerPdfDataUrl` in `src/utils/pdfExportEngine.ts` MUST
return a true `data:application/pdf;base64,...` string via `blobToDataUrl(blob)`.

Blob URLs (`URL.createObjectURL`) are NOT stable across React re-renders and cause
blank white iframes. This was the primary bug. Do not revert this.

## RULE 2: LEGAL_LANDSCAPE and LEGAL_PORTRAIT are module-scope constants

Never redeclare `[936, 612]` or `[612, 936]` inside function bodies or if-blocks.
Use the exported constants `LEGAL_LANDSCAPE` and `LEGAL_PORTRAIT` only.

## RULE 3: No pre-progress-jump in MergedPackageViewerModal

Never add `setCompileProgress({percent: 85})` or similar before calling
`buildMergedThreeLayerPdfDataUrl`. The engine callbacks drive the bar.

## RULE 4: Off-screen containers use left:-9999px, not overflow:hidden

html2canvas requires elements to be renderable. overflow:hidden on the container
clips elements and breaks capture. Use `left: '-9999px'` instead.

## RULE 5: Use dedicated element IDs for cover page lookup

Use `document.getElementById('bundle-cover-' + doc.id)` NOT
`document.querySelectorAll('.print-document-sheet')` which is too broad.

## RULE 6: All PDFs use Philippine Legal paper size

Legal Portrait:  612pt x 936pt | 816px x 1248px
Legal Landscape: 936pt x 612pt | 1248px x 816px
NEVER use A4 or Letter. Legal is required by RA 9184.

## RULE 7: blobToDataUrl helper must stay in pdfExportEngine.ts

Do not remove or replace this private helper function. It is the core of Rule 1.

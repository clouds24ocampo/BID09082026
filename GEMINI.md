# BiDOCS — Workspace Rules & Critical System Constraints

> These rules are **non-negotiable** and must be followed in every session without exception.
> Any AI agent working on this project MUST read this file before touching any code.

---

## 🔴 CRITICAL: PDF System Rules (DO NOT BREAK)

The PDF generation system (`pdfExportEngine.ts`, `MergedPackageViewerModal.tsx`, `MergedPdfViewerModal.tsx`) has been carefully debugged and stabilized. **These rules protect it from regressions.**

### Rule PDF-1: `buildMergedThreeLayerPdfDataUrl` MUST return a base64 Data URL

**NEVER** change `buildMergedThreeLayerPdfDataUrl` to return a Blob URL (`URL.createObjectURL`).
Blob URLs get garbage-collected and cause **blank PDF iframes** on React re-renders.

CORRECT — function must use blobToDataUrl() which returns `data:application/pdf;base64,...`:
```ts
export async function buildMergedThreeLayerPdfDataUrl(...): Promise<string> {
  const pdfBytes = await buildMergedThreeLayerPdfBytes(...);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  return await blobToDataUrl(blob); // returns true base64 data URL
}
```

NEVER do this (causes blank iframes after re-render):
```ts
const blobUrl = URL.createObjectURL(blob);
return blobUrl; // WRONG — blob URL is not stable across re-renders
```

---

### Rule PDF-2: Page dimensions — use top-level constants only

In `pdfExportEngine.ts`, page size constants are defined at **module scope**:
```ts
const LEGAL_LANDSCAPE: [number, number] = [936, 612]; // 13" x 8.5"
const LEGAL_PORTRAIT:  [number, number] = [612, 936]; // 8.5" x 13"
```

NEVER redeclare these inside functions or `if` blocks. Inner-scope redeclarations are dead code.

---

### Rule PDF-3: No pre-jumping the progress bar in MergedPackageViewerModal

NEVER call `setCompileProgress({ percent: 85 })` BEFORE calling `buildMergedThreeLayerPdfDataUrl`.
The engine's own `onProgress` callback drives the bar smoothly.

CORRECT:
```tsx
const dataUrl = await buildMergedThreeLayerPdfDataUrl(units, fileName, (progress) => {
  setCompileProgress(progress);
  setStatusMessage(progress.status);
});
```

WRONG — causes bar to jump 0 to 85 then back to 5:
```tsx
setCompileProgress({ percent: 85, status: 'Stamping...' }); // NEVER — remove this
const dataUrl = await buildMergedThreeLayerPdfDataUrl(...);
```

---

### Rule PDF-4: Off-screen render containers MUST use `left: -9999px`

CORRECT — elements stay fully renderable by html2canvas:
```tsx
style={{ left: '-9999px', top: '0px', width: '816px', zIndex: -1 }}
```

WRONG — overflow:hidden clips elements and breaks html2canvas:
```tsx
style={{ left: '0', top: '0', overflow: 'hidden', height: '0px' }}
```

---

### Rule PDF-5: Cover page elements MUST be referenced by dedicated ID

CORRECT:
```tsx
const coverEl = document.getElementById(`bundle-cover-${doc.id}`) as HTMLElement;
const tocEl = document.getElementById(`preview-toc-${folderCopy}`) as HTMLElement;
```

NEVER USE — too broad, grabs wrong elements from other open modals:
```tsx
document.querySelectorAll('.print-document-sheet') // WRONG
```

---

### Rule PDF-6: Never remove `blobToDataUrl` helper from pdfExportEngine.ts

This private helper is essential for stable iframe embedding. Do NOT remove or replace it.

---

## 🟡 IMPORTANT: Architecture Reference

| File | Purpose |
|------|---------|
| `src/utils/pdfExportEngine.ts` | Core PDF merge engine |
| `src/utils/systemDocumentPdfGenerator.ts` | 27-document-type system generator |
| `src/components/vault/MergedPackageViewerModal.tsx` | 3-copy merge viewer (ORIGINAL/COPY_1/COPY_2) |
| `src/components/vault/MergedPdfViewerModal.tsx` | Bundle organizer + PDF export |
| `src/components/vault/DocumentCoverPage.tsx` | Official cover separator page |
| `src/components/vault/PdfPreviewModal.tsx` | Single PDF viewer |

### Legal Paper Dimensions (Philippine Gov Procurement Standard)

```
Legal Portrait:  8.5" x 13" = 612pt x 936pt (72dpi) = 816px x 1248px (96dpi)
Legal Landscape: 13" x 8.5" = 936pt x 612pt (72dpi) = 1248px x 816px (96dpi)
```

ALL generated PDFs use Legal size — NOT A4, NOT Letter.
This is required by RA 9184 / RA 12009 (Philippine Gov Procurement Act).

---

## 🟢 Before Touching Any PDF File

1. Read `.agents/skills/bidocs-pdf-system/SKILL.md` for full technical context
2. Run `npx tsc --noEmit` before AND after changes
3. Never change exported function signatures in `pdfExportEngine.ts`

*Last updated: September 2026 — BiDOCS PDF System Stabilization*

---
name: bidocs-pdf-system
description: >
  Complete technical reference for the BiDOCS PDF generation and merging system.
  Use when touching ANY file in: pdfExportEngine.ts, MergedPackageViewerModal.tsx,
  MergedPdfViewerModal.tsx, PdfPreviewModal.tsx, DocumentCoverPage.tsx, or
  systemDocumentPdfGenerator.ts. Contains all known bugs, their root causes,
  the exact fixes applied, and the rules that must never be violated.
---

# BiDOCS PDF System — Technical Skill

## 🗺️ File Map

| File | Role | Key Exports |
|------|------|-------------|
| `src/utils/pdfExportEngine.ts` | Core merge engine | `buildMergedThreeLayerPdfBytes`, `buildMergedThreeLayerPdfDataUrl`, `buildMergedThreeLayerPdfBlobUrl`, `exportMergedThreeLayerPdf`, `generateAndDownloadThreeLayerPdf`, `generateThreeLayerPdfDataUrl` |
| `src/utils/systemDocumentPdfGenerator.ts` | 27-type system generator | `resolveDocumentPdfAttachment`, `generate*Pdf` functions |
| `src/components/vault/MergedPackageViewerModal.tsx` | 3-copy folder merge viewer | `MergedPackageViewerModal` |
| `src/components/vault/MergedPdfViewerModal.tsx` | Bundle organizer + export | `MergedPdfViewerModal` |
| `src/components/vault/DocumentCoverPage.tsx` | Cover separator page component | `DocumentCoverPage` |
| `src/components/vault/PdfPreviewModal.tsx` | Single PDF viewer | `PdfPreviewModal` |
| `src/utils/autoFitEngine.ts` | Page chunking algorithm | `autoFitPageChunks`, `calculateRowHeight` |
| `src/utils/vaultIndexedDB.ts` | PDF binary storage (IndexedDB) | `savePdfData`, `loadPdfData` |

---

## ⚙️ Core Architecture

### PDF Build Pipeline

```
compileFolderPdf() [MergedPackageViewerModal]
  │
  ├── resolveDocumentPdfAttachment() [systemDocumentPdfGenerator]
  │     ├── Check vaultDocId → IndexedDB → fileDataUrl
  │     ├── Check matching project vault doc
  │     ├── Generate system doc (ONGOING, SLCC, BOQ, etc.)
  │     └── Return null if no attachment
  │
  └── buildMergedThreeLayerPdfDataUrl() [pdfExportEngine]
        ├── buildMergedThreeLayerPdfBytes()
        │     ├── For each unit:
        │     │   ├── html2canvas(coverElement) → embedJpg → addPage
        │     │   ├── html2canvas(formElement) → slice → addPage(s)
        │     │   └── PDFDocument.load(fileDataUrl) → copyPages → addPage(s)
        │     └── Stamp "Page X of Y" on all pages
        ├── Convert bytes → Blob
        └── blobToDataUrl(blob) → "data:application/pdf;base64,..."  ← CRITICAL
```

### `URL.createObjectURL` is allowed in only two places
`buildMergedThreeLayerPdfBlobUrl` (explicit blob API) and `exportMergedThreeLayerPdf` (download link, revoked after 1s). The iframe/data-URL path must never use it.

### Legal Paper Sizes (ALL PDFs use these — Philippine RA 9184 standard)

```
LEGAL_LANDSCAPE: [936, 612]   pt (72dpi)  ←  13" × 8.5"  ←  1248px × 816px (96dpi)
LEGAL_PORTRAIT:  [612, 936]   pt (72dpi)  ←  8.5" × 13"  ←  816px × 1248px (96dpi)
```

---

## 🐛 Known Bugs (All Fixed — Do NOT Revert)

### Bug 1: Blank PDF iframe after re-render [FIXED]
- **Root cause:** `buildMergedThreeLayerPdfDataUrl` was returning `URL.createObjectURL(blob)` — a Blob URL. Blob URLs are tied to a browser memory lifetime. After React re-renders, the component could lose the reference or the GC could invalidate the blob.
- **Fix:** Changed to call `blobToDataUrl(blob)` which returns a true `data:application/pdf;base64,...` string. Base64 data URLs are self-contained and survive all re-renders.
- **Location:** `pdfExportEngine.ts` → `buildMergedThreeLayerPdfDataUrl()`

### Bug 2: Dead variables fitScale, scaleX, scaleY [FIXED]
- **Root cause:** Three variables were computed but never used. `fitScale = Math.min(scaleX, scaleY)` was calculated but `drawWidth = pageSize[0]` and `drawHeight = pageSize[1]` were used directly (full-bleed), so fitScale had zero effect.
- **Fix:** Removed all three dead vars. Full-bleed is correct for cover pages.
- **Location:** `pdfExportEngine.ts` → `buildMergedThreeLayerPdfBytes()` → cover page block

### Bug 3: Duplicate LEGAL_LANDSCAPE declarations [FIXED]
- **Root cause:** `const legalLandscape: [number, number] = [936, 612]` was declared at module scope (line ~128) AND again inside the `if (unit.coverElement)` block AND inside the `if (unit.formElement)` block. Dead redundant code.
- **Fix:** Promoted to two module-scope constants: `LEGAL_LANDSCAPE` and `LEGAL_PORTRAIT`. Used everywhere.
- **Location:** `pdfExportEngine.ts`

### Bug 4: Progress bar jumping 0→85→5→... [FIXED]
- **Root cause:** `MergedPackageViewerModal.compileFolderPdf()` was calling `setCompileProgress({ percent: 85, status: 'Stamping...' })` BEFORE calling `buildMergedThreeLayerPdfDataUrl`. Then the engine's own `onProgress` callback reset it to ~5% for the first document.
- **Fix:** Removed the pre-jump call. Engine's callbacks now drive the bar from 0% to 100%.
- **Location:** `MergedPackageViewerModal.tsx` → `compileFolderPdf()`

### Bug 5: Off-screen container bleeding into visible UI [FIXED]
- **Root cause:** Hidden render containers were `fixed left-0 top-0` with `opacity: 1, visibility: visible, z-index: -9999`. With `z-index: -9999` and some browser compositing behaviors, they could bleed through.
- **Fix:** Changed to `left: -9999px` which positions them completely off-screen (no z-index tricks needed). Elements remain fully renderable by html2canvas.
- **Location:** `MergedPackageViewerModal.tsx` and `MergedPdfViewerModal.tsx` → hidden render divs

### Bug 6: Wrong cover elements grabbed in export [FIXED]
- **Root cause:** `MergedPdfViewerModal.handleExportBundle` used `document.querySelectorAll('.print-document-sheet')` — a global selector that would grab cover pages from ANY open modal on the page, not just the bundle being exported.
- **Fix:** Use `document.getElementById('bundle-cover-' + doc.id)` which only gets the specific element rendered for that document.
- **Location:** `MergedPdfViewerModal.tsx` → `handleExportBundle()`

---

## 📋 Critical Implementation Patterns

### Pattern: Adding a new PDF generation function

```ts
// In systemDocumentPdfGenerator.ts
export async function generateMyNewDocumentPdf(ctx: DocResolveContext): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // ALWAYS use Legal Portrait for single-page forms
  const page = pdfDoc.addPage(LEGAL_PORTRAIT);  // [612, 936]

  // Use drawOfficialHeader / drawOfficialFooter helpers
  drawOfficialHeader(page, fontBold, fontReg, ctx.tenant, 'MY DOCUMENT', 'subtitle', ctx.projectRefNo, ctx.projectTitle, false /* isLandscape */);

  // ... draw content ...

  return await exportPdfDocAsDataUri(pdfDoc); // Always use this helper
}
```

### Pattern: Triggering a PDF merge

```tsx
// In a modal component
const dataUrl = await buildMergedThreeLayerPdfDataUrl(
  units,              // ExportDocumentUnit[]
  outputFileName,     // string
  (progress) => {     // PdfProgressInfo callback — drive the progress bar HERE only
    setCompileProgress(progress);
    setStatusMessage(progress.status);
  }
);
// dataUrl is "data:application/pdf;base64,..." — safe to use in <object> or <iframe>
```

### Pattern: Off-screen cover page rendering

```tsx
{/* CORRECT — elements at left:-9999px are fully renderable by html2canvas */}
<div
  className="fixed pointer-events-none"
  style={{ left: '-9999px', top: '0px', width: '816px', zIndex: -1 }}
  aria-hidden="true"
>
  {items.map((doc) => (
    <div key={`cover-${doc.id}`} id={`cover-${doc.id}`} style={{ width: '800px' }}>
      <DocumentCoverPage item={doc} tenant={tenant} incrementNumber={idx + 1} />
    </div>
  ))}
</div>
```

---

## 🔁 resolveDocumentPdfAttachment — Resolution Order

When called for a document, it tries these sources in order:

1. **Direct vault doc ID match** → `vaultDocs.find(v => v.id === doc.vaultDocId)`
2. **IndexedDB binary** → `loadPdfData(doc.vaultDocId)`
3. **Project-scoped vault doc match** → fuzzy name match within same philgepsRefNo
4. **System-generated statutory docs** → ONGOING, SLCC, SEC_VI, TECH_SPECS, FAL, ORG_CHART, KEY_PERSONNEL, EQUIPMENT, WARRANTY, NFCC
5. **System-generated financial docs** → BID_FORM, BOQ, DETAILED_ESTIMATES, PRICE_SCHEDULE, SUMMARY_BID, CASH_FLOW
6. **Uploaded legal/eligibility docs** → PHILGEPS, SEC/DTI, MAYOR, TAX, AFS, PCAB, SECRETARY_CERT, JVA
7. **IndexedDB fallback by doc.id**
8. **Returns null** if nothing found

---

## 🏗️ ExportDocumentUnit Structure

```ts
interface ExportDocumentUnit {
  title: string;              // Document title (for logging)
  coverElement?: HTMLElement; // DOM element to capture via html2canvas (cover page)
  formElement?: HTMLElement | HTMLElement[]; // Form template pages (html2canvas)
  fileDataUrl?: string;       // Attached PDF/image as data URL or blob URL
  fileSource?: PdfAttachmentSource; // Alternative: ArrayBuffer/Uint8Array/Blob
  documentName?: string;      // Document name for display
}
```

The merge engine processes each unit as: `coverElement pages → formElement pages → fileDataUrl pages`

---

## 🚦 Validation Checklist (Run After Every PDF Change)

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] Open Merged Packages modal → progress bar animates 0%→100% smoothly
- [ ] PDF loads in iframe without being blank or white
- [ ] Download button produces a valid non-corrupted PDF
- [ ] Cover page is correct size (not stretched, not squished)
- [ ] "Page X of Y" is stamped on all pages
- [ ] All 3 folder copies (ORIGINAL, COPY_1, COPY_2) compile correctly

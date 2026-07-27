---
name: document-layout-printing-manager
description: Manage and enforce document layout, PDF export rendering, vector PDF importing, readable text resolution, and browser print layout standards across all Class A Legal, Technical, and Financial bidding documents (PhilGEPS, DTI/SEC, Mayor's Permit, Tax Clearance, PCAB, AFS, NFCC, Ongoing Contracts, SLCC, JVA, Bid Security, Key Personnel, Equipment, and Omnibus Sworn Statement).
---

# System-Wide Document Layout, PDF Engine, Import/Export & Print Manager Skill

## 1. Zero Black-Screen Crash Architecture
- **Error Boundaries**: Wrap all document views and modal editors inside `<VaultErrorBoundary fallbackTitle="...">`.
- **IndexedDB PDF Binary Storage**: Heavy PDF/PNG base64 strings generated from multi-page document canvas renders MUST be stored in IndexedDB (`savePdfData(id, dataUrl)` in `vaultIndexedDB.ts`).
- **Quota Exceeded Protection**: Never store raw base64 data URLs in `localStorage`. Wrap all `localStorage` writes in `try/catch` blocks.
- **Unique List Keys**: Every React list item MUST use `key={item.id}` to avoid DOM reconciliation crashes.

## 2. Perfect PDF Layout Standards
- **Legal Dimensions**:
  - Portrait: `8.5in` × `13in` (`215.9mm` × `330.2mm` / 612pt × 936pt).
  - Landscape: `13in` × `8.5in` (`330.2mm` × `215.9mm` / 936pt × 612pt).
- **Typography**: Cambria Court Legal Font (`var(--font-legal)`).
- **Auto-Fit Cell Heights**: Dynamic row height adjustment prevents cell clipping in tables.
- **Zero Proof Column Spillover**: Hide proofing columns and web UI actions during export/print via `.no-print`, `.no-export`, `.proof-column`.

## 3. High-Resolution PDF Rendering & Importing
- **Canvas Slicing & Resolution**: Render document pages using `html2canvas` at `scale: 2` or `scale: 3` with background `#ffffff` to guarantee crisp, legible text.
- **Vector PDF Preservation**: Uploaded external PDF attachments are merged using native `copyPages()` via `pdf-lib` to preserve original vector crispness without pixel degradation.
- **Zero Trailing Blank Pages**: Suppress trailing page breaks on final elements (`:last-child { page-break-after: avoid !important; }`) and ignore residual canvas whitespace (< 30px) in `pdfExportEngine.ts`.

## 4. Perfect Print Layout
- **Print CSS**: Enforce `@page { size: 8.5in 13in; margin: 0mm; }` in a `<style>` block.
- **Pure Paper Output**: Hide all web UI buttons, sidebars, top headers, and dark backdrops during `window.print()`.

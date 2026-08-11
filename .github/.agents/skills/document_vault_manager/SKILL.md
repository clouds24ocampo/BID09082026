---
name: document-vault-manager
description: Manage Class A & B document vault validation, GPPB legal templates (Ongoing Contracts, SLCC, JVA, BSD, Key Personnel, Equipment, OSS, AFS, NFCC), Three-Layer PDF Export compilation, multi-project document isolation, and zero-crash vault architecture.
---

# System-Wide Document Vault & Multi-Project Isolation Manager Skill

## 1. System-Wide Zero Black-Screen Rule
- Every vault view, document registry, form directory, and modal editor MUST be wrapped in a `<VaultErrorBoundary>`.
- Offload all heavy base64 PDF binaries to IndexedDB (`savePdfData`) instead of `localStorage`.
- Enforce unique primary keying (`id`) for all document items and React `key={item.id}` attributes.

## 2. Multi-Project Isolation & Storage Rule
- **No Data Leakage**: Documents created for Project A (`projectRefNo`) MUST NEVER overwrite, leak into, or hide documents created for Project B.
- **Multi-Entry Support**: Never use `.filter(item => item.documentCode !== code)` when saving new documents. Support multiple instances of any document type across projects.
- **Dedicated Project Filtering**: Every document vault view and completed forms tab MUST support filtering strictly by target `projectRefNo`.

## 3. High-Quality PDF Engine Integration
- Compile multi-layer bidding packages via `exportMergedThreeLayerPdf()` in `pdfExportEngine.ts`.
- Enforce Legal 8.5" × 13" Portrait and 13" × 8.5" Landscape paper standards.
- Stitch high-res multi-page canvases at 2x/3x scale without trailing blank pages.
- Embed scannable document verification QR codes (`DocumentQrCode`) on all generated legal exhibits.

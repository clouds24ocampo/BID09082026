---
name: notarized-document-vault-safety
description: Standard operating procedure and safety rules for saving, completing, rendering, and printing notarized document forms (Omnibus Sworn Statement, Bid Securing Declaration, Technical Exhibits) without black-screen crashes, localStorage QuotaExceededError, or multi-project data loss.
---

# Notarized Document Vault Safety & Zero Black-Screen Architecture

## 1. Core Rule: Heavy PDF Binary Offloading (IndexedDB)
- **Problem**: Multi-page high-resolution canvas documents (e.g. 2-page Omnibus Sworn Statement or Bid Securing Declaration) generate base64 PNG/PDF data URLs ranging from 3MB to 8MB+.
- **Constraint**: `localStorage` has a strict 5MB total browser quota. Invoking `localStorage.setItem(...)` on raw base64 data URLs throws an uncaught `DOMException: QuotaExceededError`, causing React render crashes (Black Screen).
- **Mandatory Solution**:
  1. Always offload heavy `fileDataUrl` strings into IndexedDB (`savePdfData(id, dataUrl)` via `vaultIndexedDB.ts`).
  2. Strip `fileDataUrl` when writing metadata arrays to `localStorage`.
  3. Wrap all `localStorage.setItem(...)` calls in `try / catch` blocks to catch and log quota exceptions safely without interrupting React state updates.
  4. Auto-hydrate `fileDataUrl` from IndexedDB asynchronously on component mount or view/print actions.

## 2. Core Rule: Multi-Project Data Isolation & Unique Keying
- **Primary Keys**: Every document item must have a unique generated UUID (`form.id = notarized-oss-${Date.now()}-${random}`).
- **Zero Wiping**: Never use `.filter(f => f.formCode !== code)` when saving new forms. Always use `.filter(f => f.id !== newForm.id)` to preserve multiple documents of the same type across different bidding projects.
- **Unique React Keys**: Every mapped list element in React MUST use `key={form.id}`, NEVER `key={form.formCode}` or `key={form.title}`, to prevent React DOM key collision reconciliation crashes.

## 3. Core Rule: UI Resilience & Error Boundaries
- **Component Error Boundary**: Every top-level view (Document Vault, Forms Directory) must be wrapped inside `<VaultErrorBoundary fallbackTitle="...">`.
- **Null & Undefined Guards**: Always use optional chaining (`form?.fileDataUrl`, `form?.projectTitle`) and array guards (`(completedForms || []).map(...)`) when looping or rendering properties.

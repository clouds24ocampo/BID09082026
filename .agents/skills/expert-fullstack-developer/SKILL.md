---
name: expert-fullstack-developer
description: Use for high-risk BiDOCS full-stack work needing crash-proof behavior - fault-tolerant views, error boundaries, storage quota safety, memory limits, large PDF handling. Extends senior-fullstack-engineer.
---

# Expert Full-Stack (BiDOCS)

Start from `senior-fullstack-engineer`. Add:

## Crash-proof checklist
- View wrapped in `VaultErrorBoundary`; app root in `GlobalErrorBoundary`. Errors show retry UI, never blank screen.
- Storage writes via `safeStorage` / IndexedDB helpers; handle `false` return. See `vault-local-storage`.
- Large PDFs: no binary in localStorage, use `loadPdfData` lazily, rely on LRU (25 entries / 64MB). Use `yieldToMain()` (`storageScalability.ts`) in long loops.
- Async effects: cancel/ignore stale results on unmount or tab switch; revoke any object URL you create.
- Parse external/stored JSON with `safeGetJson` default; validate shape before use.
- Never block render on PDF build; show engine progress (`onProgress`).

## Verify
`npx tsc --noEmit`, `npm test`, `npm run validate`; for UI run the app and exercise empty, error and large-data paths.

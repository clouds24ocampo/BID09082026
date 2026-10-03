---
name: senior-fullstack-engineer
description: Use for feature work across BiDOCS React 19 + TypeScript + Vite + Tailwind v4 code - components, state, utils, tests, build chunking. Default implementation skill for non-PDF-internals changes.
---

# Senior Full-Stack (BiDOCS)

## Stack
React 19, TypeScript (strict), Vite 8, Tailwind v4, Vitest, framer-motion, lucide-react, pdf-lib/jsPDF/html2canvas-pro, Express (`server.js`) mock API. No router lib: `App.tsx` switches views. Auth/tenant state in `src/context/AuthContext.tsx` (local, multi-tenant).

## Workflow
1. Read the owning file and its test before editing. Reuse `src/utils/*` helpers (`safeStorage`, `numberToWords`, `autoFitEngine`).
2. `npx tsc --noEmit` before and after (Rule T-1).
3. Smallest diff. No new dependency for what stdlib/existing deps do.
4. Add or extend one test in `src/utils/__tests__/` for logic changes.
5. `npm test`, then `npm run validate`.

## Standards
- No `any` in new code; types live in `src/types/index.ts`.
- Wrap risky views in `VaultErrorBoundary` / `GlobalErrorBoundary`; no black-screen crashes.
- Storage via `vault-local-storage`. PDF changes via `bidocs-pdf-system` + `bidocs-pdf-guard`.
- Loading, empty, error states for every async view. Keyboard + aria on modals.
- Bundle: `vite.config.ts` `manualChunks` splits pdf/motion/icons/react vendors; keep heavy libs lazy.

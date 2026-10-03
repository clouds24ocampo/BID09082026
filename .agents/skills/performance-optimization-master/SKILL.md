---
name: performance-optimization-master
description: Use for measured BiDOCS performance work - Vite chunking, bundle size, render cost, IndexedDB throughput, memory in 3-copy PDF compile. Measure first. Extends performance-optimization.
---

# Performance Master (BiDOCS)

Start from `performance-optimization`. Rule: measure, change one thing, re-measure.

## Measure
- Bundle: `npm run build`, inspect `dist/assets` sizes. Chunks defined in `vite.config.ts` `manualChunks` (pdf-engine-vendor, motion-vendor, lucide-icons, react vendors).
- Runtime: `measurePerformance()` and `getStorageEstimate()` in `src/utils/storageScalability.ts`; `getVaultMemoryCacheStats()` for LRU hits.
- PDF compile: time `buildMergedThreeLayerPdfBytes` per unit via `onProgress`; watch heap in DevTools during COPY_1/COPY_2.

## Known levers
- Lazy-load heavy views/libs (pdf-lib, html2canvas, three is a dependency but unused in `src/` - remove if confirmed).
- html2canvas scale/quality is the dominant PDF cost; reduce only if legibility tests pass.
- Batch IndexedDB via `loadMultiplePdfData`, `upsertVaultItems`; avoid full-table wipes.
- Yield with `yieldToMain()` in long loops; keep LRU 25 entries / 64MB.

## Never trade away
PDF fidelity (Legal size, stamps, rules PDF-1..7), tenant isolation, accessibility. Verify with `npm test` and `npm run validate`.

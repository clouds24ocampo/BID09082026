# System-Wide Bidding Document Architect & Vault Manager Rules

## 1. ZERO BLACK SCREEN CRASH GUARANTEE (SYSTEM-WIDE)
- **Error Boundaries**: Every document view, vault module, template editor, and form directory MUST be wrapped inside a `<VaultErrorBoundary>` component to intercept unhandled exceptions gracefully and prevent black screens.
- **IndexedDB PDF Binary Offloading**: Never store raw base64 PDF/PNG data URLs inside `localStorage`. Heavy binary strings MUST be offloaded to IndexedDB (`savePdfData(id, dataUrl)` in `vaultIndexedDB.ts`), supporting 200MB+ storage without throwing browser `QuotaExceededError` exceptions.
- **Safe Storage Writes**: Every `localStorage.setItem` call MUST be wrapped in a `try/catch` block to handle quota exceptions safely without interrupting React state updates.
- **Unique List Keys**: Every mapped list element in React MUST use a unique primary key (`key={item.id}`), NEVER document type codes (`documentCode`), to prevent React DOM key collision crashes.
- **Null Safety**: Always use optional chaining (`item?.projectTitle`, `form?.fileDataUrl`) and array fallback guards (`(items || []).map(...)`) across all render functions.

## 2. PERFECT PDF LAYOUT, IMPORT, EXPORT & PRINTING STANDARDS
- **Paper Dimensions**: All Philippine government bidding documents enforce exact Legal standards:
  - Legal Portrait: `8.5in` × `13in` (`215.9mm` × `330.2mm` / 612pt × 936pt).
  - Legal Landscape: `13in` × `8.5in` (`330.2mm` × `215.9mm` / 936pt × 612pt).
- **High-Resolution Crisp Rendering**: Multi-page document export canvas stitching must render at scale 2x/3x with explicit white background (`#ffffff`) to ensure 100% crisp, readable text without blurred edges or transparent artifacts.
- **Native Vector PDF Preservation**: When merging uploaded PDF attachments, preserve original vector pages using `copyPages()` via `pdf-lib` without loss of resolution.
- **Zero Trailing Blank Pages**: Suppress trailing page breaks on final elements (`:last-child { page-break-after: avoid !important; }`) and ignore canvas residual whitespace (< 30px) in `pdfExportEngine.ts`.
- **Clean Printing Layout**: Enforce clean print CSS `@page { size: 8.5in 13in; margin: 0mm; }` without web app UI elements, sidebars, or headers spilling onto printed paper.

## 3. STRICT MULTI-PROJECT DATA ISOLATION RULE
- **Zero Cross-Project Data Leakage**: Ongoing Contracts, SLCC Contracts, Technical Exhibits, Notarized Forms, and Bidding Packages created for **Project A (`projectRefNo`)** MUST NEVER be merged, cross-populated, or leaked into **Project B (`projectRefNo`)**.
- **Scoped Storage Keys & IDs**:
  - Ongoing Contracts: `bidocs_ongoing_${tenantId}_${projectRefNo}`
  - SLCC Contracts: `bidocs_slcc_${tenantId}_${projectRefNo}`
  - Notarized Forms: `bidocs_completed_notarized_${tenantId}`
  - Opportunity Finder Entries: `bidocs_opportunities_${tenantId}`
  - Vault Items: IndexedDB / `bidocs_vault_items_${tenantId}`
- **Project Filter Isolation**: Selecting a bidding project in the workspace filter MUST strictly display documents tagged with that exact `projectRefNo`.
- **Project Switch Enforcement**: Whenever a user switches bidding projects, all legal templates clear transient state and load ONLY entries associated with the target `projectRefNo`.

---
name: document-vault-manager
description: Manage Class A & B document vault validation, GPPB legal templates (Ongoing Contracts, SLCC, JVA, BSD, Key Personnel, Equipment, OSS, AFS, NFCC), Three-Layer PDF Export compilation, and system-wide Legal 8.5" x 13" Portrait/Landscape standard enforcement.
---

# Document Vault Manager Agent Skill

This agent skill enforces document integrity, template compliance, and three-layer PDF export compilation across all Class A Legal, Technical, and Financial documents in BiDOCS.

## Operational Workflow

1. **GPPB Legal Template & Vault Standards**:
   - **Class A Legal Documents** (`DOC-1` to `DOC-13`): PhilGEPS, DTI/SEC, Mayor's Permit, Tax Clearance, PCAB License, Secretary Certificate. Enforce issue/expiry date validation and verification status.
   - **Item (b) Statement of Ongoing Contracts**: Enforce Legal size (8.5" × 13") format, auto-filled header, "No Ongoing" declaration, structured form pop-up, per-row supporting PDF upload, and signatory footer.
   - **Item (c) Statement of SLCC**: Enforce Legal size (8.5" × 13") format, auto-filled header, "No SLCC" declaration, structured form pop-up, per-row supporting PDF upload, and signatory footer.
   - **Class A Financial & Technical Exhibits**: NFCC Computation, AFS BIR Stamped pages, Bid Securing Declaration, Key Personnel & Equipment lists, Omnibus Sworn Statement.

2. **Three-Layer PDF Merge Engine**:
   - **Layer 1**: Auto-generated Legal size (8.5" × 13") Portrait Front Cover Page (Company Header Logo, Classification Label, Document Name/Number, Project Info Block, Verification Seal, Scannable Vector QR Code).
   - **Layer 2**: Formatted template document in Legal 8.5" × 13" format with 9pt font tables, 100% width, fixed column widths, solid 1px borders, static text values, and column stripping for Proof/Actions.
   - **Layer 3**: Uploaded PDF pages auto-scaled (`fit-to-page`, `object-contain`) to fit printable area on 8.5" × 13" Legal sheets without cut-offs or drifting margins.

3. **Export & Print Enforcement**:
   - Enforce file naming standard: `[ProjectRefNo]_[DocumentName]_[Date].pdf`.
   - Enforce `@page { size: 8.5in 13in; margin: 0.4in; }` in CSS with zero dark web page UI spillover.
   - Refer to `document-layout-printing-manager` skill for detailed layout element filtering (`ignoreElements`) and CSS `@media print` viewport resets.

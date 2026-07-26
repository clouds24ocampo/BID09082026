---
name: document-vault-manager
description: Manage Class A & B document vault validation, GPPB legal templates (Ongoing Contracts, SLCC, JVA, BSD, Key Personnel, Equipment, OSS, AFS, NFCC), Three-Layer PDF Export compilation, and strict project isolation monitoring.
---

# Document Vault Manager & Strict Project Isolation Agent Skill

This agent skill enforces document integrity, template compliance, strict project isolation, and three-layer PDF export compilation across all Class A Legal, Technical, and Financial documents in BiDOCS.

## STRICT PROJECT ISOLATION MANDATE

- **Strict Project Scoping**: Ongoing contracts, SLCC contracts, technical exhibits, and bidding packages created for **Project 1 (`projectRefNo`)** MUST NEVER be merged, mixed, or cross-populated into **Project 2 (`projectRefNo`)**.
- **Tenant & Opportunity Storage Key Scoping**:
  - `bidocs_ongoing_${tenantId}_${projectRefNo}`
  - `bidocs_slcc_${tenantId}_${projectRefNo}`
  - `bidocs_opportunities_${tenantId}`
- Every document package, vault entry, and contract declaration MUST be strictly isolated by `tenantId` AND `projectRefNo`.

## Operational Workflow

1. **GPPB Legal Template & Vault Standards**:
   - **Class A Legal Documents** (`DOC-1` to `DOC-13`): PhilGEPS, DTI/SEC, Mayor's Permit, Tax Clearance, PCAB License, Secretary Certificate. Enforce issue/expiry date validation and verification status.
   - **Item (b) Statement of Ongoing Contracts**: Enforce Legal Landscape (13" × 8.5") format, auto-filled header, "No Ongoing" & "No Private Ongoing" declarations, structured form pop-up, auto-adjusting table layout, verification QR code, and signatory footer.
   - **Item (c) Statement of SLCC**: Enforce Legal Landscape (13" × 8.5") format, auto-filled header, "No SLCC" & "No Private SLCC" declarations, structured form pop-up, auto-adjusting table layout, verification QR code, and signatory footer.
   - **Class A Financial & Technical Exhibits**: NFCC Computation, AFS BIR Stamped pages, Bid Securing Declaration, Key Personnel & Equipment lists, Omnibus Sworn Statement.

2. **Three-Layer PDF Merge Engine**:
   - **Layer 1**: Auto-generated Legal size Front Cover Page (Company Header Logo, Classification Label, Document Name/Number, Project Info Block, Verification Seal, Scannable Vector QR Code).
   - **Layer 2**: Formatted template document in Legal 13" × 8.5" Landscape format with 9pt font tables, 100% width, fixed column widths, solid 1px borders, static text values, and column stripping for Proof/Actions.
   - **Layer 3**: Uploaded PDF pages auto-scaled (`fit-to-page`, `object-contain`) to fit printable area on Legal sheets without cut-offs or drifting margins.

3. **Export & Print Enforcement**:
   - Enforce file naming standard: `[ProjectRefNo]_[DocumentName]_[Date].pdf`.
   - Enforce `@page { size: 13in 8.5in; margin: 0.4in; }` in CSS with zero dark web page UI spillover.

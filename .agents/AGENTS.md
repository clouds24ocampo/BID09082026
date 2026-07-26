# Project Monitoring & Document Vault Manager Agent Rules

## STRICT PROJECT DATA ISOLATION RULE
- **Zero Cross-Project Data Leakage**: Ongoing Contracts, SLCC Contracts, Technical Exhibits, and Bidding Packages created for **Project A (`projectRefNo`)** MUST NEVER be merged, cross-populated, or leaked into **Project B (`projectRefNo`)**.
- **Scoped Storage Keys**:
  - Ongoing Contracts: `bidocs_ongoing_${tenantId}_${projectRefNo}`
  - SLCC Contracts: `bidocs_slcc_${tenantId}_${projectRefNo}`
  - Opportunity Finder Entries: `bidocs_opportunities_${tenantId}`
  - Vault Items: IndexedDB / `bidocs_vault_items_${tenantId}`
- **Project Switch Enforcement**: Whenever a user selects a project from Opportunity Finder or switches bidding projects, all legal templates (Ongoing, SLCC, Technical Exhibits) MUST clear transient state and load ONLY the contract entries strictly associated with that exact `projectRefNo`.

## COMPLIANCE & LEGAL TEMPLATE STANDARDS
- All GPPB legal templates (Ongoing, SLCC, Technical Exhibits) enforce Legal 13" x 8.5" Landscape printable standard, auto-adjusting cell height formatting, scannable document verification QR codes, and zero proof column spillover on final output.

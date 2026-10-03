---
name: bid-package-management
description: Use when working on BiDOCS bid package assembly - PhilGEPS opportunities, project profiles, checklist requirements, envelope split, 3-copy merged packages, approval workflow and bid lifecycle status.
---

# Bid Package Management

## Flow
PhilGEPS opportunity (`OpportunityFinderView`, `/api/opportunities`) → project (`opportunityProjects.ts`, `ProjectProfileView`) → vault docs + system forms → `bidpackage.tsx` (envelope dossier) → approval gate → merged package (`MergedPackageViewerModal`) → saved via `mergedBidPackages.ts`.

## Key types (`src/types/index.ts`)
`PhilGEPSOpportunity`, `ChecklistRequirement`, `BidPackage`, `DocumentVaultItem`, `BidLifecycleStatus`, `DocStatus`, `UserRole` (`isApproverRole`, `isPreparerRole`).

## Rules
- Envelope split comes from `envelopeClassification.ts`; Envelope 1 technical/eligibility, Envelope 2 financial.
- Approval: `getDocumentApproval / saveDocumentApproval`; only approver roles approve (`ApprovalGateModal`). Preparers cannot self-approve.
- Merge: three copies `ORIGINAL`, `COPY_1`, `COPY_2`; mark done with `markProjectBidMergeDone`; check `isProjectBidMergeDone`.
- Attachment resolution order is in `bidocs-pdf-system` (`resolveDocumentPdfAttachment`).
- Matching vault doc to checklist item: keep project isolation (tenant + project ref). Test: `documentAttachmentMatchingAccuracy.test.ts`, `projectProfileWinDocsSync.test.ts`, `approvalWorkflowAndAccountRoles.test.ts`.
- Mandatory covers: bid securing + OSS (`bidSecuringAndOssMandatoryCovers.test.ts`).

Statutory content questions → `philippine-procurement-statutory`.

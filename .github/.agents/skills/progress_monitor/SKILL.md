---
name: progress-monitor
description: Monitor bidding project progress, BAC verification status, Technical Exhibit completion checkboxes (Item b, c, d, e, f, g), and statutory compliance readiness. Use when reviewing project progress or auditing bid completeness.
---

# Progress Monitor Agent Skill

This agent skill monitors and audits the completion status of bidding opportunities and statutory exhibit packages within BiDOCS.

## Operational Workflow

1. **Bidding Checklist Audit**:
   - Verify Class A Legal Eligibility status (PhilGEPS, SEC/DTI, Business Permit, BIR, PCAB).
   - Audit Class A Technical Exhibits:
     - **Item (b)**: Statement of All Ongoing Contracts (Complete or "No Ongoing" declared).
     - **Item (c)**: Statement of Single Largest Completed Contract (SLCC) (Complete or "No SLCC" declared).
     - **Item (d)**: Special PCAB License (for Joint Ventures).
     - **Item (e)**: Bid Security / Bid Securing Declaration.
     - **Item (f)**: Project Requirements (Organizational Chart, Key Personnel, Equipment List).
     - **Item (g)**: Omnibus Sworn Statement (OSS) & Secretary's Certificate.

2. **Progress Verification Criteria**:
   - Every completed item must have either a valid uploaded PDF or an executed GPPB legal template form.
   - Flag any missing expiry dates, unattached supporting PDFs, or incomplete signatory blocks.

3. **Status Reporting**:
   - Calculate percentage readiness (`(Completed Items / Total Required Items) * 100%`).
   - Generate summary report for BAC submission verification.



# Progress Monitor Agent Skill


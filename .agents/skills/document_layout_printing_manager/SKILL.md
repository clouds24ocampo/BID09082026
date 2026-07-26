---
name: document-layout-printing-manager
description: Manage and enforce document layout, PDF export rendering, and browser print layout standards across all Class A Legal, Technical, and Financial bidding documents (PhilGEPS, DTI/SEC, Mayor's Permit, Tax Clearance, PCAB, AFS, NFCC, Ongoing Contracts, SLCC, JVA, Bid Security, Key Personnel, Equipment, and Omnibus Sworn Statement).
---

# Universal Document Layout, PDF Layout & Printing Layout Manager Skill

This skill enforces system-wide standards for document layouts, PDF export compilation, and browser print rendering across **ALL Class A Legal, Technical, and Financial Bidding Documents** in the BiDOCS platform.

---

## 1. System-Wide Document Registry & Categories

This skill applies universally across all 3 major bidding document classes:

### 🏛️ **Class A Legal Documents**
1. **PhilGEPS Platinum Certificate** (`DOC-1`)
2. **DTI / SEC Certificate of Registration** (`DOC-2`)
3. **Mayor's / Business Permit** (`DOC-3`)
4. **Barangay Business Permit** (`DOC-4`)
5. **Business Plate** (`DOC-5`)
6. **BIR Certificate of Registration - Form 2303** (`DOC-6`)
7. **BIR Tax Clearance for Bidding** (`DOC-7`)
8. **PCAB License** (`DOC-8`)
9. **DOLE COSH / BOSH Safety Certificate** (`DOC-9`)
10. **Occupancy Permit** (`DOC-10`)
11. **Sanitary Permit** (`DOC-11`)
12. **Fire Safety Inspection Permit** (`DOC-12`)
13. **Secretary Certificate / Board Resolution** (`DOC-13`)

### 🛠️ **Technical Exhibits & GPPB Standard Forms**
1. **Item (b) Statement of Ongoing Contracts** (Government & Private)
2. **Item (c) Statement of SLCC** (Single Largest Completed Contract)
3. **Item (d) Special PCAB License & JVA Registration**
4. **Item (e) Original Bid Security / Bid Securing Declaration (BSD)**
5. **Item (f) Project Requirements**:
   - `(f.a)` Organizational Chart for the Contract
   - `(f.b)` List of Contractor's Key Personnel & Qualifications
   - `(f.c)` List of Major Equipment Units & Proof of Ownership/Lease
6. **Item (g) Original Notarized Omnibus Sworn Statement (OSS)**

### 💰 **Class A Financial Documents**
1. **Audited Financial Statements (AFS)** stamped "Received" by BIR/Authorized Agent Bank
2. **Computation of Net Financial Contracting Capacity (NFCC)** or Credit Line Commitment

---

## 2. Document Layout Standards

- **Paper Format**: Enforce Legal size (`8.5" × 13"`) Portrait and Landscape standards with uniform margins (`0.4" - 0.5"`).
- **Clean Template Output Rules**:
  - The official printable and exportable Legal Templates MUST ONLY contain official GPPB legal columns.
  - Interactive UI columns such as **Proof PDF** (file upload status) and **Actions** (Edit/Delete controls) are strictly for screen editing and MUST be hidden on print and PDF export.
- **Class Tagging Standard**:
  - Apply `print:hidden no-export proof-column` to `Proof PDF` `<th>` and `<td>` elements.
  - Apply `print:hidden no-export actions-column` to `Actions` `<th>` and `<td>` elements.

---

## 3. PDF Export & Rendering Layout (`html2canvas` + `pdf-lib`)

- **Ignore Elements Filter**:
  When invoking `html2canvas` inside `pdfExportEngine.ts`, always configure `ignoreElements` to strip non-document UI:
  ```typescript
  ignoreElements: (element: Element) => {
    return (
      element.classList.contains('print:hidden') ||
      element.classList.contains('no-export') ||
      element.classList.contains('proof-column') ||
      element.classList.contains('actions-column') ||
      element.tagName === 'BUTTON'
    );
  }
  ```
- **High Resolution Rendering**: Set `scale: 3` for 300+ DPI vector-like clarity.
- **Page Dimensions**:
  - Legal Portrait: `612pt × 936pt` (8.5" × 13")
  - Legal Landscape: `936pt × 612pt` (13" × 8.5")
- **Multi-Layer Vector Preservation**: Copy uploaded PDF page streams using `pdfDoc.copyPages()` to preserve original vector sharpness without quality degradation.

---

## 4. Printing Layout Standards (`@media print` & `window.print()`)

- **Print Viewport Reset**:
  Modal overlays (`.fixed`, `.backdrop-blur-md`, `.bg-slate-900`, `.bg-slate-950`) must be reset during print to prevent viewport clipping and small fraction artifacts:
  ```css
  @media print {
    @page {
      size: 8.5in 13in;
      margin: 0.4in;
    }
    header, nav, aside, button, .print\:hidden, .no-print, .no-export, .proof-column, .actions-column, .sticky {
      display: none !important;
    }
    html, body, #root, .fixed, .backdrop-blur-md, .bg-slate-900, .bg-slate-950 {
      position: static !important;
      background: #ffffff !important;
      color: #000000 !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
      border: none !important;
      box-shadow: none !important;
    }
    .single-page-paper, .print-document-sheet {
      display: block !important;
      position: relative !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 auto !important;
      padding: 0.25in !important;
      border: none !important;
      box-shadow: none !important;
      background: #ffffff !important;
      color: #000000 !important;
      overflow: visible !important;
    }
  }
  ```
- **Zero Dark UI Spillover**: Ensure background panels, dark themes, and navigation buttons disappear 100% during native browser print previews across all document types.

import React, { useState } from 'react';
import VaultErrorBoundary from '../../common/VaultErrorBoundary';
import {
  X,
  Search,
  BookOpen,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  Briefcase,
  FileText,
  HelpCircle,
  ExternalLink,
  Receipt,
  Layers,
  Award
} from 'lucide-react';

export interface StatutoryDocGuideItem {
  code: string;
  templateType: string;
  name: string;
  category: 'MOBILIZATION' | 'PROGRESS_BILLING' | 'PROJECT_CLOSEOUT';
  legalBasis: string;
  submissionTiming: string;
  summary: string;
  howToAnswer: {
    field: string;
    description: string;
    recommendedValue: string;
    auditTip?: string;
  }[];
  attachmentsChecklist: string[];
  requiredSignatories: string[];
  coaAuditTraps: string[];
  officialCopySnippet: string;
}

export const STATUTORY_GUIDES: StatutoryDocGuideItem[] = [
  {
    code: 'RLA',
    templateType: 'RLA',
    name: 'Request Letter for Advance Payment / 15% Mobilization',
    category: 'MOBILIZATION',
    legalBasis: 'Annex "E", Section 4 of Revised IRR of RA 9184 / RA 12009 (NGPA) Section 64',
    submissionTiming: 'Submitted after Notice of Award (NOA) and Contract Agreement signing, upon issuance or prior to Notice to Proceed (NTP).',
    summary: 'Statutory formal request by the winning contractor for the release of an advance payment not exceeding fifteen percent (15%) of the total contract price to fund site mobilization, initial materials, and equipment staging.',
    howToAnswer: [
      {
        field: 'Procuring Entity & Address',
        description: 'Exact official name and office address of the government department, LGU, state university, or GOCC as stated in the Bidding Documents.',
        recommendedValue: 'e.g. DPWH First District Engineering Office / City Government of Pasig / Department of Agriculture',
        auditTip: 'Must exactly match the name in the Contract Agreement; discrepancies delay LGU/accounting disbursement.'
      },
      {
        field: 'Head of Procuring Entity (HoPE)',
        description: 'Name and designation of the Agency Head, Secretary, Governor, City/Municipal Mayor, or Regional/District Engineer.',
        recommendedValue: 'e.g. Hon. Victor Ma. Regis N. Sotto (City Mayor) or Engr. Juan Dela Cruz (District Engineer)'
      },
      {
        field: 'Contract / Reference No.',
        description: 'Official Contract ID, Project Reference Number, or PhilGEPS Solicitation Number.',
        recommendedValue: 'e.g. 26-INFRA-PASIG-008 / PR No. 2026-04-129'
      },
      {
        field: 'Contract Amount & Advance Rate',
        description: 'Total Awarded Contract Price and requested mobilization percentage (Statutory maximum is 15.00%).',
        recommendedValue: 'Rate: 15% (e.g. ₱ 1,500,000.00 for a ₱ 10,000,000.00 contract)',
        auditTip: 'COA will immediately disallow any claim exceeding 15% of the total contract price.'
      },
      {
        field: 'Security Instrument Type & Bond No.',
        description: 'The type of irrevocable security posted equal to 100% of the advance amount.',
        recommendedValue: 'Irrevocable Standby Letter of Credit / Bank Guarantee / Surety Bond (e.g. Bond No. G(16) 0987654)',
        auditTip: 'Surety bonds must be issued by an Insurance Commission-accredited surety company and confirmed by the Procuring Entity.'
      },
      {
        field: 'Legal Framework Toggle',
        description: 'Select between RA 9184 (Annex E) and RA 12009 (New Government Procurement Act).',
        recommendedValue: 'RA 9184 for existing projects, RA 12009 for NGPA-governed procurements.'
      }
    ],
    attachmentsChecklist: [
      'Original Irrevocable Standby Letter of Credit / Bank Guarantee / Surety Bond callable on demand (equal to 15% advance amount)',
      'Certificate of Accreditation from the Insurance Commission (for surety bonds)',
      'Signed and Notarized Contract Agreement',
      'Copy of Notice of Award (NOA) and Notice to Proceed (NTP)',
      'Approved Contractor’s Program of Work / Equipment Mobilization Schedule'
    ],
    requiredSignatories: [
      'Authorized Managing Officer (AMO) or President of the Construction Enterprise'
    ],
    coaAuditTraps: [
      'Claiming advance payment without a valid, unexpired Bank Guarantee or Surety Bond.',
      'Surety bond expiry date is earlier than the contract completion date.',
      'Failing to recoup the advance payment proportionately starting on the first progress billing.'
    ],
    officialCopySnippet: `In accordance with Annex E, Section 4 of the Revised Implementing Rules and Regulations (IRR) of Republic Act No. 9184 and the terms of the Contract Agreement, we hereby formally request the release of Fifteen Percent (15%) Advance Payment / Mobilization Fund in the amount of [PHP Amount in Words and Figures]. To support this request, we attach the required [Bank Guarantee / Irrevocable Standby Letter of Credit / Callable Surety Bond No. ________] equal in value to the requested advance payment.`
  },
  {
    code: 'SWA',
    templateType: 'SWA',
    name: 'Statement of Work Accomplished (SWA)',
    category: 'PROGRESS_BILLING',
    legalBasis: 'Annex "E", Section 5 (Progress Payments) & Annex "F" of RA 9184 / DPWH Standard SWA Matrix',
    submissionTiming: 'Submitted monthly or at designated milestone accomplishment intervals (e.g. 15%, 30%, 50%, 85%, 100%).',
    summary: 'The primary statutory document detailing all work items completed to date, quantifying physical accomplishment percentages, calculating gross payable amounts, and executing statutory deductions (Retention, Recoupment, EWT, VAT).',
    howToAnswer: [
      {
        field: 'Columns A, B, C (Qty, Unit, Unit Cost)',
        description: 'Physical bill of quantities exactly synced from Section VI / Detailed Estimates of the approved bid.',
        recommendedValue: 'Auto-sync via "Sync Section VI Inputs" button in BiDOCS SWA editor.',
        auditTip: 'Quantities and unit prices must match the approved Bill of Quantities item-for-item without unauthorized deviation.'
      },
      {
        field: 'Column E (Weight %)',
        description: 'Percentage weight of each line item relative to the Total Contract Value (TCV).',
        recommendedValue: 'Formula: (Item Total Amount ÷ TCV) × 100. Sum of Column E across all items must equal 100.00%.'
      },
      {
        field: 'Column G (Qty This Billing)',
        description: 'Actual physical quantity of work inspected and verified during the current billing period.',
        recommendedValue: 'Must not cause Total Quantity to Date (Column H = F + G) to exceed Contract Quantity (Column A) unless covered by an approved Variation Order.'
      },
      {
        field: '15% Advance Recoupment',
        description: 'Deduction to recover the initial mobilization fund released to the contractor.',
        recommendedValue: 'Formula: 15% × Gross Accomplishment for the Period, until 100% of the advance payment is fully recovered.'
      },
      {
        field: '10% Retention Money',
        description: 'Mandatory statutory retention money under RA 9184 Section 6 (Annex E).',
        recommendedValue: 'Formula: 10% × Gross Accomplishment for the Period, retained until final project acceptance or warranty bond substitution.'
      },
      {
        field: '2% EWT & 5% Final VAT',
        description: 'Government withholding taxes on contractor progress billings.',
        recommendedValue: '2% Expanded Withholding Tax (EWT) and 5% Final Withholding VAT computed on the net VAT-exclusive base (Amount × 100/112).'
      }
    ],
    attachmentsChecklist: [
      'Monthly Certificate of Payment / Billing Statement (BS)',
      'Statement of Time Elapsed and Work Accomplished (SOTE/STEWA)',
      'Geotagged Progress Photos (Before, During, After with GPS and timestamps)',
      'Materials Testing Reports (MTS) showing passing compressive/tensile tests',
      'Contractor’s Affidavit on Payment of Labor and Materials (CA)',
      'Site Weather Chart / Approved Suspension or Extension Orders (if any)'
    ],
    requiredSignatories: [
      'Prepared by: Contractor Project Manager / Authorized Signatory',
      'Checked & Verified by: City/Municipal/Provincial Resident Engineer',
      'Recommended by: Supervising Engineer / Chief of Construction',
      'Approved by: Head of Procuring Entity (Mayor / Governor / District Engineer)',
      'Conformed by: End-User Department Representative'
    ],
    coaAuditTraps: [
      'Billed accomplishment exceeds verified physical work observed during COA technical inspection.',
      'Failure to deduct 15% advance payment recoupment and 10% retention money on each billing.',
      'Missing geotagged photos or materials testing certifications for concrete pouring/structural steel.'
    ],
    officialCopySnippet: `I hereby certify that the items of work accomplished herein have been actually performed, inspected, and verified in strict accordance with the approved Plans and Specifications, and that the calculated deductions for advance payment recoupment, retention money, and withholding taxes are accurate.`
  },
  {
    code: 'PHOTO',
    templateType: 'PROGRESS_PHOTO',
    name: 'Progress Photos Documentation',
    category: 'PROGRESS_BILLING',
    legalBasis: 'DPWH Department Order No. 193, Series of 2016 / COA Circular 2012-001 Section 9.1',
    submissionTiming: 'Submitted alongside every monthly billing and final billing package.',
    summary: 'Photographic evidence verifying actual physical work execution taken from fixed camera reference points across project milestones (Before, During, After).',
    howToAnswer: [
      {
        field: 'Stationing / Location Reference',
        description: 'Exact station or chainage coordinate (e.g. Sta. 10+250 to Sta. 10+500, or Grid Line A-D/2-5).',
        recommendedValue: 'e.g. Sta. 0+150 (Poblacion Bridge Abutment A) / Ground Floor Slab Grid 3-6'
      },
      {
        field: 'Geotagging Metadata',
        description: 'GPS Latitude, Longitude, Date, and Time recorded on the photo image.',
        recommendedValue: 'Latitude: 14.5821° N, Longitude: 121.0614° E, Date: Sept 15, 2026, 09:30 AM',
        auditTip: 'COA technical audit engineers reject photos that lack embedded GPS geotags and timestamps.'
      },
      {
        field: 'Milestone Stage Categorization',
        description: 'Label whether each photo represents Before Construction, During Construction, or Completed Accomplishment.',
        recommendedValue: 'Clear 3-stage visual comparison from the exact same camera angle.'
      }
    ],
    attachmentsChecklist: [
      'High-resolution PDF photo album (minimum 300 DPI)',
      'Camera stationing layout map identifying photo shooting points',
      'Weather report for rainy days documented on site'
    ],
    requiredSignatories: [
      'Contractor Quality Control / Safety Officer',
      'Procuring Entity Site Inspector / Resident Engineer'
    ],
    coaAuditTraps: [
      'Using stock or digitally manipulated photos.',
      'Photos taken from differing angles that do not prove work progression.',
      'Missing date stamps corresponding to the billing period.'
    ],
    officialCopySnippet: `Geotagged photographic documentation certifying actual physical progress and structural milestone completion in accordance with DPWH D.O. 193 s.2016 and COA Circular 2012-001.`
  },
  {
    code: 'MTS',
    templateType: 'MTS',
    name: 'Materials Testing Reports (MTS)',
    category: 'PROGRESS_BILLING',
    legalBasis: 'DPWH Standard Specifications for Public Works and Highways (Blue Book) / ASTM Standards',
    submissionTiming: 'Submitted prior to and alongside progress billings covering structural concrete, rebar, asphalt, or subbase.',
    summary: 'Official laboratory test registry certifying that all construction materials incorporated into the infrastructure comply with minimum testing requirements and strength thresholds.',
    howToAnswer: [
      {
        field: 'Specimen Identification & Batch No.',
        description: 'Specific component tested, batch number, and delivery date.',
        recommendedValue: 'e.g. Ready-Mix Concrete Class A (3,000 PSI) Batch #2026-088 / Grade 40 Deformed Bar 16mmØ'
      },
      {
        field: 'Test Standard & Testing Laboratory',
        description: 'Applicable standard (ASTM C39 for concrete cylinder compression, ASTM A615 for steel tensile) and name of accredited laboratory.',
        recommendedValue: 'DPWH Bureau of Research and Standards (BRS) or DOST-Accredited Private Testing Lab'
      },
      {
        field: 'Compressive / Tensile Strength Results',
        description: 'Actual test results at 7-day, 14-day, and 28-day curing intervals.',
        recommendedValue: 'e.g. 28-Day Compressive Strength: 3,450 PSI (Specified: 3,000 PSI) -> PASSED',
        auditTip: 'Concrete must reach at least 100% of specified 28-day compressive strength. If below 85%, core testing is mandated.'
      }
    ],
    attachmentsChecklist: [
      'Original signed Laboratory Test Certificates from BRS/DOST accredited laboratory',
      'Mill Certificates and Manufacturer’s Quality Guarantees for steel and cement',
      'Batching plant delivery tickets indicating mix design and water-cement ratio'
    ],
    requiredSignatories: [
      'Contractor Materials Engineer (DPWH ME-I or ME-II Accredited)',
      'Government Materials Engineer / QA In-Charge'
    ],
    coaAuditTraps: [
      'Testing frequency falls below the DPWH Minimum Testing Requirements schedule.',
      'Submitting test results signed by an expired or non-accredited Materials Engineer.',
      'Failing to perform field density tests (FDT) on road subbase compaction.'
    ],
    officialCopySnippet: `This is to certify that the samples described herein were tested in accordance with standard DPWH / ASTM testing procedures and that the results show full compliance with the contract specifications.`
  },
  {
    code: 'CA',
    templateType: 'CA',
    name: "Contractor's Affidavit on Labor & Materials (CA)",
    category: 'PROGRESS_BILLING',
    legalBasis: 'COA Circular No. 2012-001 Section 9.1.1 / Article 1707 Civil Code of the Philippines',
    submissionTiming: 'Mandatory notarized attachment for every progress billing and final payment release.',
    summary: 'A formal sworn notarial affidavit by the contractor certifying under oath that all laborers, materials suppliers, subcontractors, and statutory taxes for the billing period have been fully settled without any unpaid claims or liens.',
    howToAnswer: [
      {
        field: 'Affiant Information & Venue',
        description: 'Name of the Authorized Managing Officer (AMO), citizenship, civil status, and notarial venue (City/Municipality where notarized).',
        recommendedValue: 'e.g. Republic of the Philippines, City of Pasig, S.S.'
      },
      {
        field: 'Government-Issued ID / CTC Details',
        description: 'Competent evidence of identity under the 2004 Rules on Notarial Practice.',
        recommendedValue: 'Passport No. / PRC ID No. / Driver’s License No. with date and place of issue',
        auditTip: 'Under current Philippine Notarial Law, a Community Tax Certificate (CTC) alone is NOT sufficient without a valid government photo ID.'
      },
      {
        field: 'Affidavit Declarations',
        description: 'Four statutory attestations: (1) Full payment of laborer wages in accordance with DOLE minimum wage, (2) Settlement of all material and equipment rental suppliers, (3) Payment of BIR withholding taxes and social security contributions, (4) Free from any third-party liens or garnishments.',
        recommendedValue: 'Standard statutory phrasing pre-configured in BiDOCS CA template.'
      },
      {
        field: 'Notary Public Jurat (Doc/Page/Book/Series)',
        description: 'Notarial registry details completed by the Notary Public upon swearing.',
        recommendedValue: 'Must be filled by the commissioning attorney with valid IBP/PTR and Notarial Commission number.'
      }
    ],
    attachmentsChecklist: [
      'Duly Notarized Contractor’s Affidavit with wet notary dry seal',
      'DOLE Wage Order compliance certification (or certified payroll summary)',
      'BIR Form 2307 / withholding tax proof'
    ],
    requiredSignatories: [
      'Affiant: Authorized Managing Officer (AMO) or President',
      'Commissioned Notary Public with active roll number and seal'
    ],
    coaAuditTraps: [
      'Submitting an unnotarized affidavit or an affidavit notarized by an expired notarial commission.',
      'Unpaid laborer complaints filed before the DOLE or procuring entity which suspends billing release.',
      'Discrepancy between the contract title stated in the affidavit and the official contract title.'
    ],
    officialCopySnippet: `I, [Name of Affiant], of legal age, Filipino, under oath, depose and state that all laborers and workers employed in the project have been fully paid their wages; that all materials, supplies, and equipment utilized have been fully paid; and that no third-party claims or liens exist against the Procuring Entity.`
  },
  {
    code: 'ABP',
    templateType: 'ABP',
    name: 'As-Built Plan (ABP)',
    category: 'PROJECT_CLOSEOUT',
    legalBasis: 'DPWH Department Order No. 56, Series of 1995 / COA Circular No. 2012-001 Section 9.1.3',
    submissionTiming: 'Required at 100% project completion prior to final inspection and final payment release.',
    summary: 'Complete architectural, structural, sanitary, mechanical, and electrical drawings reflecting all actual on-site constructed dimensions, verified field adjustments, and approved variation orders.',
    howToAnswer: [
      {
        field: 'Drawing Sheet Registry',
        description: 'Comprehensive index of all as-built sheets (General Notes, Site Plan, Architectural, Structural, MEPFS).',
        recommendedValue: 'e.g. Sheet A-1 to A-5 (Architectural), S-1 to S-8 (Structural), E-1 to E-4 (Electrical), P-1 to P-3 (Plumbing)'
      },
      {
        field: 'Variation Order Deviations',
        description: 'Specific notes identifying approved deviations from the original bidding drawings.',
        recommendedValue: 'e.g. Foundation depth adjusted to -2.50m per approved Variation Order No. 1'
      },
      {
        field: 'Cad File & Blueprint Verification',
        description: 'Confirmation that electronic CAD (.dwg) and full-size blueprint copies (20" x 30" or 24" x 36") have been submitted.',
        recommendedValue: 'Attached CAD file index and signed blueprint sheets.'
      }
    ],
    attachmentsChecklist: [
      'Complete set of As-Built Plans signed and dry-sealed by licensed professionals (Architect, Civil/Structural Engineer, Professional Electrical Engineer, Master Plumber)',
      'Copy of approved Variation Orders (VO) and Change Orders (CO)',
      'Joint Field Inspection Clearance from the Procuring Entity Inspection Team'
    ],
    requiredSignatories: [
      'Contractor Licensed Professionals (Civil Engineer, Architect, PECE, PEE, PME)',
      'Contractor Project Manager & AMO',
      'Procuring Entity Planning & Design Division Chief',
      'Head of Procuring Entity / District Engineer (Final Approval)'
    ],
    coaAuditTraps: [
      'Final payment processed without approved As-Built Plans (leads to automatic COA Audit Notice of Disallowance).',
      'Missing dry seals or signatures of licensed professionals on individual blueprint sheets.',
      'As-built drawings not reflecting actual on-site measurements verified during post-construction audit.'
    ],
    officialCopySnippet: `We hereby certify that this As-Built Plan represents the actual, final configuration of the project as constructed on site, incorporating all approved Change Orders and field adjustments in full compliance with engineering standards.`
  },
  {
    code: 'WS',
    templateType: 'WS',
    name: 'Warranty Security (WS)',
    category: 'PROJECT_CLOSEOUT',
    legalBasis: 'Section 62.2 of Revised IRR of RA 9184 / RA 12009 Section 78',
    submissionTiming: 'Submitted upon project completion and issuance of the Certificate of Acceptance.',
    summary: 'Statutory warranty security posted by the contractor guaranteeing the infrastructure against structural defects and failures for a warranty period of one (1) to fifteen (15) years depending on project classification.',
    howToAnswer: [
      {
        field: 'Warranty Instrument Type',
        description: 'One of three statutory options: (1) Cash or Letter of Credit (5%), (2) Bank Guarantee (10%), (3) Callable Surety Bond (30%).',
        recommendedValue: 'Surety Bond (30% of Total Contract Price) issued by an accredited surety company.',
        auditTip: 'If using retention money substitution, the 5% cash retention may be held until the end of the warranty period.'
      },
      {
        field: 'Structural Classification & Warranty Period',
        description: 'Permanent Structures (15 years, e.g. buildings, bridges), Semi-Permanent Structures (5 years, e.g. feeder roads), Other Structures (2 years).',
        recommendedValue: 'Permanent: 15 Years / Semi-Permanent: 5 Years as defined in Section 62.2.3.2'
      },
      {
        field: 'Coverage Obligation',
        description: 'Express undertaking to repair any defect or failure arising from structural defects, inferior materials, or poor workmanship at contractor’s own expense within 90 days.',
        recommendedValue: 'Full liability coverage pursuant to RA 9184 Section 62.'
      }
    ],
    attachmentsChecklist: [
      'Original Warranty Security Instrument (Surety Bond, Bank Guarantee, or Cash Escrow Certificate)',
      'Insurance Commission Certificate of Authority (for surety bonds)',
      'Official Certificate of Final Acceptance issued by the Procuring Entity'
    ],
    requiredSignatories: [
      'Contractor Authorized Managing Officer',
      'Surety Underwriter / Bank Officer',
      'Head of Procuring Entity (Acceptance)'
    ],
    coaAuditTraps: [
      'Releasing 100% of retention money before the Warranty Security is posted and validated.',
      'Surety bond validity period is shorter than the statutory defect liability period.',
      'Accepting a surety company that is blacklisted or not in good standing with the Insurance Commission.'
    ],
    officialCopySnippet: `The undersigned Contractor hereby binds itself to warrant the faithful performance of the completed works and to repair or replace any defect or failure in materials or workmanship occurring within the statutory warranty period at its sole cost and expense.`
  },
  {
    code: 'BS',
    templateType: 'BS',
    name: 'Billing Statement (Statement of Account)',
    category: 'PROGRESS_BILLING',
    legalBasis: 'Section 5 of Annex "E" of RA 9184 / COA Circular No. 2012-001 Section 9.1',
    submissionTiming: 'Submitted simultaneously with each progress billing and the final billing.',
    summary: 'The commercial and financial statement of account issued by the contractor to the government procuring entity requesting payment disbursement and detailing all statutory deductions.',
    howToAnswer: [
      {
        field: 'Billing Statement Number & Date',
        description: 'Sequential invoice reference (e.g. BS-01 for 1st billing, BS-FINAL for final payment).',
        recommendedValue: 'e.g. BS-2026-001 / Sept 15, 2026'
      },
      {
        field: 'Gross Work Accomplished This Billing',
        description: 'Total peso value of verified physical accomplishment for the current billing cycle.',
        recommendedValue: 'Exact figure from Column P of the approved Statement of Work Accomplished (SWA).'
      },
      {
        field: 'Statutory Deductions Calculation',
        description: 'Advance Payment Recoupment (15%), Retention Money (10%), EWT (2%), Final VAT (5%).',
        recommendedValue: 'Calculated automatically in BiDOCS Billing Statement module.',
        auditTip: 'The net billing amount must equal: Gross Accomplishment minus Recoupment minus Retention minus Taxes.'
      },
      {
        field: 'Bank Remittance Details',
        description: 'Official corporate bank account of the contractor for LDDAP-ADA government e-payment.',
        recommendedValue: 'Land Bank of the Philippines / Development Bank of the Philippines (DBP) corporate account'
      }
    ],
    attachmentsChecklist: [
      'Approved Statement of Work Accomplished (SWA)',
      'Disbursement Voucher (DV) ready for accounting certification',
      'Contractor’s Official BIR Registered Sales Invoice or Official Receipt'
    ],
    requiredSignatories: [
      'Contractor Finance Officer & Authorized Managing Officer',
      'Procuring Entity Chief Accountant (for Box A Certificate of Availability of Funds)'
    ],
    coaAuditTraps: [
      'Discrepancy between Billing Statement gross figures and SWA Column P totals.',
      'Using an unregistered or expired BIR official receipt / sales invoice.',
      'Bank account name does not match the contractor entity name in the contract.'
    ],
    officialCopySnippet: `We respectfully submit this Statement of Account for work accomplished on the above project, requesting payment of the Net Amount Due of [PHP Amount] after all statutory deductions pursuant to RA 9184 and applicable BIR tax regulations.`
  },
  {
    code: 'CMS',
    templateType: 'CMS',
    name: 'Construction Method Statement (CMS)',
    category: 'MOBILIZATION',
    legalBasis: 'DPWH Standard Specifications / DOLE D.O. 13 s. 1998 (Construction Safety and Health)',
    submissionTiming: 'Submitted prior to physical site groundbreaking and within 10 days of NOA.',
    summary: 'Detailed technical engineering methodology detailing site mobilization, heavy equipment staging, safety protocols, environmental mitigations, and execution sequencing.',
    howToAnswer: [
      {
        field: 'Scope of Works Breakdown',
        description: 'Chronological phases: Mobilization, Earthworks, Structural Concrete, Finishing, Demobilization.',
        recommendedValue: 'Divided into clear engineering stages matching the PERT/CPM and BOQ.'
      },
      {
        field: 'Equipment & Staging Logistics',
        description: 'Site layout, heavy equipment ingress/egress routes, storage of aggregates and fuel.',
        recommendedValue: 'Includes traffic management plan and environmental waste disposal procedures.'
      },
      {
        field: 'Safety & DOLE Compliance',
        description: 'Approved Construction Safety and Health Program (CSHP) reference and PPE mandates.',
        recommendedValue: 'Reference DOLE-approved CSHP No. and on-site Safety Officer protocol.'
      }
    ],
    attachmentsChecklist: [
      'Site Layout and Staging Area Blueprint',
      'Approved DOLE Construction Safety and Health Program (CSHP)',
      'Local LGU Traffic Management & Excavation Permit'
    ],
    requiredSignatories: [
      'Contractor Project Manager (Civil Engineer)',
      'Contractor DOLE-Accredited Safety Officer (SO-2 or SO-3)',
      'Procuring Entity Project Engineer (Approval)'
    ],
    coaAuditTraps: [
      'Commencing excavation without approved traffic management or safety measures.',
      'Lack of an approved Construction Method Statement during initial COA physical site inspection.'
    ],
    officialCopySnippet: `This Construction Method Statement defines the engineering sequence, safety precautions, quality assurance controls, and environmental safeguards to be implemented for the project.`
  },
  {
    code: 'EUP',
    templateType: 'EUP',
    name: 'Equipment Utilization Plan (EUP)',
    category: 'MOBILIZATION',
    legalBasis: 'DPWH Standard Procurement Manual / Section VIII Clause 10.1 of Philippine Bidding Documents',
    submissionTiming: 'Submitted prior to site mobilization and updated quarterly or upon milestone transitions.',
    summary: 'Comprehensive deployment schedule of major construction equipment, specifying plate numbers, motor/chassis serials, ownership status (owned/leased), and monthly deployment bars.',
    howToAnswer: [
      {
        field: 'Equipment Description & Capacity',
        description: 'Exact make, model, and rated operating capacity of required heavy equipment.',
        recommendedValue: 'e.g. Hydraulic Excavator (0.80 m³ bucket), 10-Wheeler Dump Truck (14 m³), One-Bagger Concrete Mixer'
      },
      {
        field: 'Plate / Chassis / Motor Number',
        description: 'Official identification numbers for verification during field inspection.',
        recommendedValue: 'Must match LTO Registration / Deed of Sale / Lease Agreement submitted during bidding.',
        auditTip: 'Procuring entity resident engineers verify that deployed equipment matches the listed plate and chassis numbers.'
      },
      {
        field: 'Monthly Deployment Bar Chart',
        description: 'Gantt schedule showing active operational months on site.',
        recommendedValue: 'Synchronized with the PERT/CPM earthworks and concrete pouring timelines.'
      }
    ],
    attachmentsChecklist: [
      'Copies of LTO Official Receipts (OR) and Certificates of Registration (CR) for owned equipment',
      'Notarized Lease Agreements and Certificates of Availability for leased equipment',
      'Third-party equipment inspection safety certificates (DOLE/PESA)'
    ],
    requiredSignatories: [
      'Contractor Equipment Superintendent / Project Manager',
      'Procuring Entity Resident Engineer'
    ],
    coaAuditTraps: [
      'Pledged major equipment not actually present on site during surprise COA inspection (counts as breach of contract).',
      'Equipment deployed is in non-working or broken condition leading to project slippage.'
    ],
    officialCopySnippet: `This Equipment Utilization Plan establishes the mobilization timeline, capacity commitments, and operational deployment of all major construction machinery pledged for the project.`
  },
  {
    code: 'FPL',
    templateType: 'FPL',
    name: 'Final Payment Letter & Request for Retention Release',
    category: 'PROJECT_CLOSEOUT',
    legalBasis: 'Annex "E", Section 7 of RA 9184 / COA Circular No. 2012-001 Section 9.1.3',
    submissionTiming: 'Submitted after 100% physical completion, joint punch-list rectification, and issuance of Certificate of Completion.',
    summary: 'The contractor’s final statutory letter formally requesting the release of the final billing (last milestone), issuance of the Certificate of Final Acceptance, and the release of retention money upon posting of the Warranty Security.',
    howToAnswer: [
      {
        field: 'Completion Date & Punchlist Clearance',
        description: 'Exact date of 100% physical completion and date of punch-list rectification.',
        recommendedValue: 'Must match the official Certificate of Project Completion issued by the Resident Engineer.'
      },
      {
        field: 'Final Billing Amount & Retention Release',
        description: 'Final milestone payable and total accumulated retention money (typically 10% of total contract price).',
        recommendedValue: 'e.g. Final Billing: ₱ 1,500,000.00 / Retention Money: ₱ 1,000,000.00'
      },
      {
        field: 'Warranty Security Posting Reference',
        description: 'Details of the 30% Surety Bond or Bank Guarantee submitted to replace retention money.',
        recommendedValue: 'Reference Warranty Security Bond No. and Surety Company name.'
      }
    ],
    attachmentsChecklist: [
      'Official Certificate of Project Completion issued by Procuring Entity',
      'Joint Final Inspection & Punch-list Rectification Report',
      'Approved As-Built Plans (ABP)',
      'Final Contractor’s Affidavit on Labor, Materials, and Taxes (CA)',
      'Warranty Security Instrument (WS)',
      'Barangay Clearance & Certificate of Acceptance from End-User'
    ],
    requiredSignatories: [
      'Authorized Managing Officer (AMO)',
      'Head of Procuring Entity (Action & Approval)'
    ],
    coaAuditTraps: [
      'Releasing final payment while punch-list defects remain uncorrected.',
      'Processing final payment without approved As-Built Plans and Warranty Security.',
      'Unresolved liquidated damages resulting from unapproved contract time overruns.'
    ],
    officialCopySnippet: `We respectfully notify the Procuring Entity that the project has achieved 100% physical completion with all punch-list items satisfactorily rectified. In accordance with RA 9184 Annex E, we hereby formally request the release of Final Payment and the release of Retention Money, with the required Warranty Security attached.`
  },
  {
    code: 'MPDS',
    templateType: 'MPDS',
    name: 'Manpower Deployment Schedule (MPDS)',
    category: 'MOBILIZATION',
    legalBasis: 'DPWH Standard Procurement Manual / Section VIII of Philippine Bidding Documents',
    submissionTiming: 'Submitted prior to site mobilization and updated quarterly.',
    summary: 'A monthly labor workforce distribution matrix detailing the headcount of key technical personnel and skilled/unskilled labor required for project execution.',
    howToAnswer: [
      {
        field: 'Key Technical Personnel List',
        description: 'Project Manager, Project Engineer, Materials Engineer, Safety Officer, Electrical/Sanitary In-Charge.',
        recommendedValue: 'Must exactly match the names pledged in the Technical Envelope during bid submission.'
      },
      {
        field: 'Monthly Labor Headcount Distribution',
        description: 'Number of Foremen, Carpenters, Masons, Steelmen, Welders, and Laborers per project month.',
        recommendedValue: 'Reflects the manpower S-curve (peaks during active structural works).'
      },
      {
        field: 'Total Monthly Man-Hours',
        description: 'Estimated total labor man-days and man-hours per month.',
        recommendedValue: 'Formula: Total Laborers × 8 hours/day × 26 working days/month.'
      }
    ],
    attachmentsChecklist: [
      'PRC Licenses and Curriculum Vitae of Key Technical Personnel',
      'DOLE Construction Safety Training Certificates (COSH/BOSH for Safety Officers)',
      'DPWH Materials Engineer Accreditation IDs (ME-I / ME-II)'
    ],
    requiredSignatories: [
      'Contractor Project Manager',
      'Procuring Entity Resident Engineer'
    ],
    coaAuditTraps: [
      'Key personnel assigned to the project are concurrently working full-time on another active project without approved replacement.',
      'Severe labor shortage on site causing delay without manpower catch-up adjustment.'
    ],
    officialCopySnippet: `This Manpower Deployment Schedule establishes the monthly labor commitments, supervisory key personnel allocations, and workforce histogram required for the completion of the project within the contract duration.`
  },
  {
    code: 'PERT',
    templateType: 'PERT',
    name: 'PERT/CPM Network Schedule',
    category: 'MOBILIZATION',
    legalBasis: 'Annex "E", Section 1 of RA 9184 / DPWH Department Order No. 193 s. 2016',
    submissionTiming: 'Submitted within ten (10) calendar days from receipt of NOA prior to contract signing.',
    summary: 'Precedence diagram and critical path network establishing activity dependencies, earliest/latest start and finish dates, total float, and the project critical path.',
    howToAnswer: [
      {
        field: 'Activity Identification & Description',
        description: 'Work breakdown structure (WBS) codes corresponding to the Bill of Quantities items.',
        recommendedValue: 'e.g. Act A: Mobilization, Act B: Foundation Excavation, Act C: Substructure Concrete'
      },
      {
        field: 'Predecessor Dependencies & Duration (Days)',
        description: 'Preceding tasks that must finish before the activity starts and estimated duration in calendar days.',
        recommendedValue: 'e.g. Act C requires Act B (Finish-to-Start dependency, Duration: 30 days)'
      },
      {
        field: 'Critical Path Determination',
        description: 'Sequence of activities where Total Float equals ZERO (0). Any delay on these tasks directly delays the whole project.',
        recommendedValue: 'Clearly marked in RED or with an asterisk (*) on the network schedule.'
      }
    ],
    attachmentsChecklist: [
      'Detailed PERT/CPM Precedence Diagram / Network Chart',
      'Gantt Bar Chart with S-Curve Financial/Physical Cash Flow',
      'Monthly Cash Flow & Equipment Commitment Projection'
    ],
    requiredSignatories: [
      'Contractor Project Planning Engineer & AMO',
      'Procuring Entity Project Engineer & Head of Planning Division'
    ],
    coaAuditTraps: [
      'Total calendar days in the PERT/CPM exceed the contract duration specified in the Bidding Documents.',
      'S-curve plotted with unrealistic front-loading designed to draw advance funds prematurely.'
    ],
    officialCopySnippet: `The contractor hereby submits this PERT/CPM Network Schedule and S-Curve representing the critical path logic and milestone progression for the project duration of [Number] Calendar Days.`
  },
  {
    code: 'SOTE',
    templateType: 'SOTE',
    name: 'Statement of Time Elapsed (STEWA)',
    category: 'PROGRESS_BILLING',
    legalBasis: 'Annex "E", Section 8 of RA 9184 / DPWH Department Order No. 193, Series of 2016',
    submissionTiming: 'Submitted monthly with progress billings to monitor contract time and compute project slippage.',
    summary: 'The official progress and time monitoring report tracking contract duration, effectivity date, calendar days elapsed, remaining days, approved time extensions, and project slippage percentage.',
    howToAnswer: [
      {
        field: 'Contract Effectivity & Original Expiry Date',
        description: 'Date indicated in the Notice to Proceed (NTP) and original completion deadline.',
        recommendedValue: 'e.g. NTP: March 1, 2026, Effectivity: March 8, 2026, Duration: 180 Calendar Days'
      },
      {
        field: 'Approved Time Extensions & Suspensions',
        description: 'Valid calendar day adjustments formally approved by the Head of Procuring Entity.',
        recommendedValue: 'Only include extensions supported by a signed Suspension Order or Variation Order.'
      },
      {
        field: 'Slippage Percentage Formula',
        description: 'Slippage = Actual Accomplishment % minus Planned Accomplishment %.',
        recommendedValue: 'Positive (+) means Ahead of Schedule; Negative (-) means Behind Schedule.',
        auditTip: 'Negative slippage of 10% or more triggers mandatory Calibrated Actions (Early Warning, catch-up program, or contract termination).'
      }
    ],
    attachmentsChecklist: [
      'Copy of Notice to Proceed (NTP)',
      'Approved Time Extension / Suspension Orders (if any)',
      'Approved Catch-Up Schedule (mandatory if negative slippage exceeds 5%)'
    ],
    requiredSignatories: [
      'Prepared by: Contractor Project Engineer',
      'Checked by: Government Resident Engineer',
      'Approved by: Head of Procuring Entity / District Engineer'
    ],
    coaAuditTraps: [
      'Failing to impose liquidated damages when contract time has expired without an approved extension.',
      'Claims of weather delay without official PAGASA rainfall certifications.',
      'Negative slippage of 15% without formal default notice or termination warning.'
    ],
    officialCopySnippet: `This Statement of Time Elapsed and Work Accomplished certifies the consumed calendar days, remaining duration, and calculated project slippage of [Slippage %] as of [Reporting Date].`
  },
  {
    code: 'TOA',
    templateType: 'TOA',
    name: 'Turn-Over Agreement (TOA) & Joint Custody MOA',
    category: 'PROJECT_CLOSEOUT',
    legalBasis: 'COA Circular No. 2012-001 Section 9.1.3 / Local Government Code Section 383',
    submissionTiming: 'Executed upon 100% completion and final acceptance prior to facility hand-over to end-user.',
    summary: 'The formal tripartite memorandum of agreement executed among the Contractor, the Procuring Entity, and the Beneficiary LGU/School/Hospital transferring full physical custody, operation, and maintenance of the completed infrastructure.',
    howToAnswer: [
      {
        field: 'Parties to the Agreement',
        description: 'Names of the Contractor, Procuring Entity (e.g. DPWH/LGU), and the Receiving End-User (e.g. DepEd School Principal / Barangay Captain).',
        recommendedValue: 'e.g. Contractor AMO, City Mayor, and School Principal / Facility Administrator'
      },
      {
        field: 'Facility Description & Inventory',
        description: 'Detailed description of the completed building, road, drainage, or water system, including installed fixtures and keys.',
        recommendedValue: 'List room count, utility meters, operating manuals, and master keys turned over.'
      },
      {
        field: 'Warranty & Maintenance Boundary',
        description: 'Affirmation that the contractor remains liable under the Warranty Security for structural defects, while the recipient assumes operational care.',
        recommendedValue: 'Standard statutory phrasing pre-loaded in BiDOCS TOA template.'
      }
    ],
    attachmentsChecklist: [
      'Certificate of Final Inspection and Project Acceptance',
      'Inventory list of turned-over fixtures, equipment, and keys',
      'Operations and Maintenance (O&M) Manuals and warranty cards'
    ],
    requiredSignatories: [
      'Turned Over by: Contractor Authorized Managing Officer',
      'Inspected & Endorsed by: Procuring Entity Head / City Engineer',
      'Accepted & Received by: Beneficiary End-User / LGU Head / School Principal'
    ],
    coaAuditTraps: [
      'Completed project standing idle and not turned over to end-users (cited by COA as "Unutilized Government Assets").',
      'Missing inventory of turned-over equipment or failure to transfer property accountability.'
    ],
    officialCopySnippet: `The Contractor hereby formally turns over and transfers physical custody, control, and operational responsibility of the completed project to the Procuring Entity and End-User Beneficiary, subject to the statutory warranty obligations under RA 9184.`
  }
];

export interface StatutoryDocumentsGuideModalProps {
  initialCode?: string;
  onClose: () => void;
}

export const StatutoryDocumentsGuideModal: React.FC<StatutoryDocumentsGuideModalProps> = ({
  initialCode,
  onClose
}) => {
  const [selectedCode, setSelectedCode] = useState<string>(initialCode || 'RLA');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'MOBILIZATION' | 'PROGRESS_BILLING' | 'PROJECT_CLOSEOUT'>('ALL');
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);

  const filteredGuides = STATUTORY_GUIDES.filter(guide => {
    if (categoryFilter !== 'ALL' && guide.category !== categoryFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      guide.code.toLowerCase().includes(q) ||
      guide.name.toLowerCase().includes(q) ||
      guide.legalBasis.toLowerCase().includes(q) ||
      guide.summary.toLowerCase().includes(q)
    );
  });

  const activeGuide = STATUTORY_GUIDES.find(g => g.code === selectedCode) || STATUTORY_GUIDES[0];

  const handleCopySnippet = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] h-[94vh] flex flex-col">
        <VaultErrorBoundary fallbackTitle="Statutory Documents Guide Error">
          {/* Top Modal Header */}
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Philippine Statutory Procurement Documents Guide</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                    RA 9184 & RA 12009 (NGPA) • COA & DPWH Standard
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Step-by-step instructions on how to answer, compile, and submit all 15 post-award statutory documents without COA audit disallowances.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title="Close Guide"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="px-6 py-3 bg-slate-900/50 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guide by document, law, or field..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 text-xs font-mono">
              <button
                type="button"
                onClick={() => setCategoryFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  categoryFilter === 'ALL'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                ALL (15)
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('MOBILIZATION')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  categoryFilter === 'MOBILIZATION'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                MOBILIZATION (5)
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('PROGRESS_BILLING')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  categoryFilter === 'PROGRESS_BILLING'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                PROGRESS BILLING (6)
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('PROJECT_CLOSEOUT')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  categoryFilter === 'PROJECT_CLOSEOUT'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                CLOSEOUT (4)
              </button>
            </div>
          </div>

          {/* Main Content Area: Left Sidebar (List) + Right Detail Panel */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            
            {/* Left Nav List (4 Cols) */}
            <div className="lg:col-span-4 p-4 overflow-y-auto border-r border-slate-800 space-y-2 bg-slate-950/40">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block px-2 mb-1">
                Select Document to View Step-by-Step Guide
              </span>

              {filteredGuides.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No documents found matching "{searchQuery}"
                </div>
              ) : (
                filteredGuides.map((guide) => {
                  const isSelected = guide.code === selectedCode;
                  return (
                    <button
                      key={guide.code}
                      type="button"
                      onClick={() => setSelectedCode(guide.code)}
                      className={`w-full text-left p-3 rounded-xl border transition flex items-start justify-between gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-emerald-950/60 to-slate-900 border-emerald-500/60 shadow-md shadow-emerald-950/40'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            isSelected
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {guide.code}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 uppercase">
                            {guide.category.replace('_', ' ')}
                          </span>
                        </div>
                        <p className={`text-xs font-bold leading-snug line-clamp-1 ${
                          isSelected ? 'text-white' : 'text-slate-300'
                        }`}>
                          {guide.name}
                        </p>
                        <p className="text-[10px] text-slate-400 line-clamp-1">
                          {guide.legalBasis}
                        </p>
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Right Guide Viewer Panel (8 Cols) */}
            <div className="lg:col-span-8 p-6 overflow-y-auto space-y-6 bg-slate-950">
              
              {/* Header of Active Document Guide */}
              <div className="border-b border-slate-800 pb-5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-mono font-bold">
                    FORM CODE: {activeGuide.code}
                  </span>
                  <span className="px-2.5 py-1 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-lg text-xs font-mono">
                    STAGE: {activeGuide.category.replace('_', ' ')}
                  </span>
                </div>

                <h1 className="text-xl font-bold text-white leading-tight">
                  {activeGuide.name}
                </h1>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeGuide.summary}
                </p>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4 text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Legal Basis: {activeGuide.legalBasis}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-cyan-300">
                    <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Submission: {activeGuide.submissionTiming}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 1: FIELD-BY-FIELD INSTRUCTIONS */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>How to Answer Every Field (Step-by-Step Instructions)</span>
                </h3>

                <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800 bg-slate-900/40">
                  {activeGuide.howToAnswer.map((item, idx) => (
                    <div key={idx} className="p-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <span>{item.field}</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed pl-6">
                        {item.description}
                      </p>
                      <div className="pl-6 pt-1 space-y-1">
                        <div className="p-2 rounded bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-cyan-300">
                          <span className="text-slate-500 mr-2">Recommended:</span>
                          <span>{item.recommendedValue}</span>
                        </div>
                        {item.auditTip && (
                          <div className="p-2 rounded bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-300 flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <span><strong>Audit Note:</strong> {item.auditTip}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 2: MANDATORY ATTACHMENTS & SUPPORTING DOCUMENTS */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  <span>Mandatory Supporting Attachments Checklist</span>
                </h3>

                <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2">
                  {activeGuide.attachmentsChecklist.map((att, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                      <div className="p-0.5 rounded bg-blue-500/20 text-blue-400 shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <span>{att}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: REQUIRED SIGNATORIES & ACCREDITATIONS */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-400" />
                  <span>Required Signatories & Professional Accreditation</span>
                </h3>

                <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2">
                  {activeGuide.requiredSignatories.map((sig, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-200 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                      <span>{sig}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 4: COA AUDIT TRAPS & COMMON AUDIT FINDINGS */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>COA Audit Traps & Common Red Flags to Avoid</span>
                </h3>

                <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl space-y-2">
                  {activeGuide.coaAuditTraps.map((trap, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-red-200 leading-relaxed">
                      <span className="text-red-400 font-bold">•</span>
                      <span>{trap}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 5: OFFICIAL STATUTORY COPY SNIPPET (1-CLICK COPY) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Copy className="w-4 h-4 text-teal-400" />
                    <span>Official Statutory Phrasing & Legal Clause</span>
                  </h3>

                  <button
                    type="button"
                    onClick={() => handleCopySnippet(activeGuide.officialCopySnippet)}
                    className="px-3 py-1 bg-teal-600/30 hover:bg-teal-600 text-teal-300 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-teal-500/40 cursor-pointer"
                  >
                    {copiedSnippet ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Standard Clause</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 font-mono leading-relaxed select-all">
                  "{activeGuide.officialCopySnippet}"
                </div>
              </div>

            </div>
          </div>
        </VaultErrorBoundary>
      </div>
    </div>
  );
};

export default StatutoryDocumentsGuideModal;

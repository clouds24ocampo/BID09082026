import React, { useState, useEffect, useMemo } from "react";
import {
  Tenant,
  isApproverRole,
  getRoleDisplayName,
} from "../../../types";
import { useAuth } from "../../../context/AuthContext";
import { PDFDocument } from "pdf-lib";
import html2canvas from "html2canvas";
import { blobToDataUrl } from "../../../utils/pdfExportEngine";
import {
  getDocumentApproval,
  saveDocumentApproval,
  DocumentApprovalRecord,
} from "../../../utils/opportunityProjects";
import { computeStatutoryTaxes, TaxType, ProjectTaxCategory, generateDateTimeTrackingId } from "./POW";
import ApprovalGateModal from "../../common/ApprovalGateModal";
import {
  FileText,
  Building2,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Download,
  Printer,
  X,
  Layers,
  Plus,
  Trash2,
  RefreshCw,
  UserCheck,
  Scale,
  Sparkles,
  Lock,
  Clock,
} from "lucide-react";
import {
  TorAnnexesWorkbench,
  LTCISCC_SCOPE_ITEMS,
  LTCISCC_KEY_PERSONNEL,
  LTCISCC_EQUIPMENT_REQUIREMENTS,
  LTCISCC_SIGNATORIES,
  GRAND_TOTAL_ABC,
} from "./torAnnexesData";

export type TorPresetType =
  | "LTCISCC_COMMAND_CENTER"
  | "DPWH_INFRA"
  | "LGU_GOODS_SERVICES"
  | "BARANGAY_COMMUNITY";

export interface TorScopeItem {
  id: string;
  itemNo: string;
  description: string;
  quantity: number;
  unit: string;
  specificationDetails?: string;
  timelineMilestone?: string;
}

export interface TorPersonnelItem {
  id: string;
  position: string;
  qualification: string;
  count: number;
}

export interface TorEquipmentItem {
  id: string;
  description: string;
  capacity: string;
  units: number;
}

export interface TorSignatory {
  role: "PREPARED_BY" | "CHECKED_BY" | "RECOMMENDING" | "APPROVED_BY";
  label: string;
  name: string;
  title: string;
  officeOrLicense: string;
}

export interface TermsOfReferenceData {
  presetType: TorPresetType;
  trackingNumber: string;
  projectRefNo: string;
  projectTitle: string;
  procuringEntity: string;
  implementingOffice: string;
  projectLocation: string;
  sourceOfFunds: string;
  contractDurationDays: number;
  abcAmount: number;
  taxType: TaxType;
  projectCategory: ProjectTaxCategory;
  retentionRate: number;
  backgroundRationale: string;
  generalObjectives: string[];
  scopeItems: TorScopeItem[];
  technicalStandards: string[];
  keyPersonnel: TorPersonnelItem[];
  equipmentRequirements: TorEquipmentItem[];
  deliveryTerms: string[];
  inspectionAndAcceptance: string[];
  paymentTerms: string[];
  warrantyAndLiquidatedDamages: string[];
  signatories: TorSignatory[];
}

export function validateTorData(data: TermsOfReferenceData): string[] {
  const errors: string[] = [];

  if (!data.projectTitle.trim()) errors.push("Project title is required.");
  if (!data.projectRefNo.trim())
    errors.push("Project reference number is required.");
  if (!data.procuringEntity.trim())
    errors.push("Procuring entity is required.");
  if (!data.backgroundRationale.trim())
    errors.push("Background and statutory rationale are required.");
  if (data.generalObjectives.filter(Boolean).length === 0)
    errors.push("At least one project objective is required.");
  if (data.scopeItems.length === 0)
    errors.push("At least one scope item is required.");
  if (data.scopeItems.some((item) => !item.description.trim()))
    errors.push("Every scope item must include a description.");
  if (data.scopeItems.some((item) => !item.specificationDetails?.trim()))
    errors.push("Every scope item must include technical specifications.");
  if (data.scopeItems.some((item) => !item.timelineMilestone?.trim()))
    errors.push("Every scope item must include a target milestone.");
  if (data.technicalStandards.filter(Boolean).length === 0)
    errors.push("Technical standards are required.");
  if (data.deliveryTerms.filter(Boolean).length === 0)
    errors.push("Delivery or implementation terms are required.");
  if (data.inspectionAndAcceptance.filter(Boolean).length === 0)
    errors.push("Inspection and acceptance terms are required.");
  if (data.paymentTerms.filter(Boolean).length === 0)
    errors.push("Payment terms are required.");
  if (data.warrantyAndLiquidatedDamages.filter(Boolean).length === 0)
    errors.push("Warranty and liquidated damages terms are required.");
  if (
    data.signatories.some(
      (signatory) => !signatory.name.trim() || !signatory.title.trim(),
    )
  ) {
    errors.push("Every signatory must include a name and title.");
  }

  return errors;
}

export const TOR_PRESET_TEMPLATES: Record<
  TorPresetType,
  Omit<
    TermsOfReferenceData,
    | "trackingNumber"
    | "projectRefNo"
    | "projectTitle"
    | "procuringEntity"
    | "abcAmount"
  >
> = {
  LTCISCC_COMMAND_CENTER: {
    presetType: "LTCISCC_COMMAND_CENTER",
    implementingOffice:
      "Municipal Disaster Risk Reduction and Management Office (MDRRMO) / Office of the Municipal Mayor",
    projectLocation:
      "Km. 5, Pico, Municipality of La Trinidad, Benguet (46 Strategic Municipal Nodes)",
    sourceOfFunds:
      "LGU General Fund / 20% Municipal Development Fund / LDRRM Trust Fund (Municipal Ordinance No. 28-2017)",
    contractDurationDays: 180,
    taxType: "VATABLE",
    projectCategory: "GOODS",
    retentionRate: 1,
    backgroundRationale:
      "Pursuant to Republic Act No. 7160 (Local Government Code of 1991), Republic Act No. 9184, Republic Act No. 12009 (New Government Procurement Act - NGPA), Republic Act No. 10121 (PDRRM Act of 2010), Republic Act No. 6975 (DILG Act), Republic Act No. 10173 (Data Privacy Act of 2012), and La Trinidad Municipal Ordinance No. 28-2017, the Municipality of La Trinidad establishes the La Trinidad Communication, Information and Surveillance Command Center (LTCISCC) as a permanent, centralized, mission-critical facility. Operating 24/7 across normal, heightened alert, and emergency modes, the Command Center consolidates real-time video surveillance, AI risk intelligence, emergency dispatch coordination, traffic management, and executive decision-support while safeguarding public rights through network-segregated digital services.",
    generalObjectives: [
      "Establish a permanent, centralized, 24/7 mission-critical Command Center facility integrating physical infrastructure, core computing, storage, video wall displays, and 46 strategic field nodes.",
      "Deploy and commission enterprise platforms: iVMS-4200 Video Management System, HikCentral Professional Security Management backbone, Integrated Weather Monitoring & Risk Intelligence, and Footage Hub Multimedia Intelligence Platform.",
      "Establish the official Municipal Digital Landing Page providing public-safe multi-source weather advisories and a controlled, approval-governed CCTV footage request system fully compliant with RA 10173 data privacy rules.",
      "Deploy high-availability single-core armored fiber optic rings and wireless bridge networks with mandatory Three (3)-Hour on-site emergency technical response SLA.",
    ],
    scopeItems: LTCISCC_SCOPE_ITEMS,
    technicalStandards: [
      "All equipment and installations must comply with RA 9184, RA 12009 (NGPA), DICT ICT Governance Policies, and ISO 9001:2015 standards.",
      "The primary video surveillance infrastructure must run on iVMS-4200 and HikCentral Professional enterprise management backbone with centralized audit logging.",
      "All fiber optic aerial and underground runs must achieve <= 0.1 dB splice loss and be 100% verified using calibrated OTDR trace reports prior to acceptance.",
      "Network architecture must enforce strict logical and physical segmentation between the internal Command Center systems and the public Municipal Digital Landing Page.",
      "All video evidence handling, exports, and retention must strictly conform to RA 10173 (Data Privacy Act of 2012) and National Privacy Commission (NPC) advisories.",
      "The CCTV feeds must support 24/7 continuous recording with a minimum retention period of 30 calendar days at native 4MP 25/30fps resolution.",
      "All outdoor devices (cameras, switches, enclosures) must carry minimum IP66/IP67 ingress protection and 6kV lightning surge suppression.",
      "Power conditioning must deliver continuous uninterruptible clean power via double-conversion UPS with auto-switching to municipal backup generator.",
    ],
    keyPersonnel: LTCISCC_KEY_PERSONNEL,
    equipmentRequirements: LTCISCC_EQUIPMENT_REQUIREMENTS,
    deliveryTerms: [
      "Contract execution commences immediately upon issuance of the official Notice to Proceed (NTP) with an overall contract duration of one hundred eighty (180) calendar days.",
      "Work shall be implemented in five (5) progressive phases across forty-six (46) designated municipal node sites under MDRRMO supervision.",
      "Mandatory Three (3)-Hour on-site technical response time is strictly required for any critical CCTV feed outage or core infrastructure disruption.",
      "Weekly progress milestone reporting and coordination meetings with the Municipal Technical Working Group (TWG) and MDRRMO.",
    ],
    inspectionAndAcceptance: [
      "Phase-by-phase inspection and milestone sign-off by the LGU Inspectorate Team, MDRRMO Head, and Municipal TWG.",
      "Factory Acceptance Testing (FAT) data verification and 100% on-site optical OTDR loss verification for every fiber strand prior to acceptance.",
      "Mandatory 72-hour continuous burn-in test of all AI models, video wall displays, and recording servers under simulated full network load.",
      "Issuance of Certificate of Completion followed by a three (3) year comprehensive warranty and maintenance agreement.",
    ],
    paymentTerms: [
      "Advance mobilization payment of up to fifteen percent (15%) against an irrevocable standby letter of credit or bank guarantee pursuant to RA 9184 and RA 12009.",
      "Progress billings based on verified physical and technical accomplishment across the 5 project phases, less statutory deductions: 5% Final Withholding VAT, 1% EWT (Goods) / 2% (Services), and 1% Statutory Retention Money.",
      "Final payment released upon issuance of the Certificate of Final Acceptance and submission of the 3-Year Warranty Security.",
    ],
    warrantyAndLiquidatedDamages: [
      "Comprehensive three (3) year warranty covering newly installed CCTV cameras, integrated legacy units, servers, switches, and video wall displays.",
      "Mandatory 3-Hour Emergency On-Site Response SLA for critical system down events; 24-hour resolution guarantee for minor component failures.",
      "Liquidated damages equivalent to one-tenth of one percent (1/10 of 1%) of the unperformed portion per calendar day of delay.",
    ],
    signatories: LTCISCC_SIGNATORIES,
  },
  DPWH_INFRA: {
    presetType: "DPWH_INFRA",
    implementingOffice:
      "DPWH District Engineering Office - Planning & Design Section",
    projectLocation: "Sta. 10+250 to Sta. 12+800, Secondary National Highway",
    sourceOfFunds:
      "GAA FY 2026 Regular Infrastructure Program (SARO No. 2026-09-0412)",
    contractDurationDays: 120,
    taxType: "VATABLE",
    projectCategory: "INFRA",
    retentionRate: 1,
    backgroundRationale:
      "Pursuant to Republic Act No. 9184 and Republic Act No. 12009 (New Government Procurement Act - NGPA), the Department of Public Works and Highways requires the rehabilitation and widening of vulnerable roadway sections to ensure all-weather transport connectivity, enhance public safety, and eliminate severe seasonal road erosion under DPWH Standard Design Guidelines, Criteria, and Standards (DGCS).",
    generalObjectives: [
      "Execute complete earthworks, structural drainage, subbase preparation, and PCCP pavement construction in strict conformity with DPWH Blue Book Standard Specifications Vol. II.",
      "Implement full DOLE-mandated Construction Safety and Health Program (CSHP) and traffic management to protect the travelling public throughout construction.",
      "Achieve 100% compliant physical completion within the stipulated contract duration of one hundred twenty (120) calendar days.",
    ],
    scopeItems: [
      {
        id: "dpwh-1",
        itemNo: "Part A",
        description:
          "Facilities for the Engineer & Provision of Field Office/Living Quarters",
        quantity: 4,
        unit: "months",
        specificationDetails: "DPWH Item A.1.1(8) Maintenance of Field Office",
        timelineMilestone: "Month 1 - Month 4",
      },
      {
        id: "dpwh-2",
        itemNo: "Part B",
        description:
          "Project Billboard, Occupational Safety and Health Program & Traffic Management",
        quantity: 1,
        unit: "lot",
        specificationDetails: "DOLE D.O. 13 & DPWH D.O. 56 Compliance",
        timelineMilestone: "Mobilization - Completion",
      },
      {
        id: "dpwh-3",
        itemNo: "Item 102(2)",
        description: "Surplus Common Roadway Excavation & Disposal",
        quantity: 2450,
        unit: "cu.m.",
        specificationDetails: "DPWH Standard Specifications 2013 Vol II",
        timelineMilestone: "Day 15 - Day 45",
      },
      {
        id: "dpwh-4",
        itemNo: "Item 200(1)",
        description:
          "Aggregate Subbase Course (Graded Crushed Aggregate Base, 200mm thk)",
        quantity: 1820,
        unit: "cu.m.",
        specificationDetails: "Compacted to 100% maximum dry density",
        timelineMilestone: "Day 40 - Day 75",
      },
      {
        id: "dpwh-5",
        itemNo: "Item 311(1)e1",
        description:
          "Portland Cement Concrete Pavement (Unreinforced, 0.28m thick, 14 Days)",
        quantity: 5600,
        unit: "sq.m.",
        specificationDetails: "Compressive Strength >= 3,500 psi (24.1 MPa)",
        timelineMilestone: "Day 60 - Day 110",
      },
      {
        id: "dpwh-6",
        itemNo: "Item 505(2)a",
        description: "Grouted Riprap (Class A) & Stone Masonry Retaining Wall",
        quantity: 480,
        unit: "cu.m.",
        specificationDetails:
          "Mortar Proportion 1:3 with weep holes at 2.0m spacing",
        timelineMilestone: "Day 30 - Day 90",
      },
    ],
    technicalStandards: [
      "All civil works must strictly satisfy DPWH Standard Specifications for Public Works and Highways (Blue Book Volume II).",
      "Quality Control cylinder and core compressive tests must be conducted by a DPWH Bureau of Research and Standards (BRS) accredited materials laboratory.",
      "Approved PERT/CPM Network and detailed S-Curve progress histogram must be submitted within ten (10) calendar days from receipt of Notice to Proceed.",
    ],
    keyPersonnel: [
      {
        id: "kp-1",
        position: "Project Manager / Project Engineer",
        qualification:
          "Licensed Civil Engineer (PRC), minimum 5 years in road construction",
        count: 1,
      },
      {
        id: "kp-2",
        position: "Materials Engineer I / II",
        qualification:
          "DPWH-Accredited Materials Engineer with valid accreditation card",
        count: 1,
      },
      {
        id: "kp-3",
        position: "Construction Safety & Health Officer",
        qualification: "DOLE-certified (COSH 40-hour training) SO2 or SO3",
        count: 1,
      },
      {
        id: "kp-4",
        position: "Construction Foreman",
        qualification:
          "Minimum 5 years supervisory experience in road concrete paving",
        count: 1,
      },
    ],
    equipmentRequirements: [
      {
        id: "eq-1",
        description: "Hydraulic Excavator / Backhoe",
        capacity: "0.80 cu.m. bucket capacity",
        units: 1,
      },
      {
        id: "eq-2",
        description: "Dump Truck",
        capacity: "10 - 12 cu.m. / 14 cu.yd.",
        units: 2,
      },
      {
        id: "eq-3",
        description: "Transit Mixer",
        capacity: "5 - 6 cu.m. capacity",
        units: 2,
      },
      {
        id: "eq-4",
        description: "Motorized Road Grader",
        capacity: "125 HP (G710A or equivalent)",
        units: 1,
      },
      {
        id: "eq-5",
        description: "Vibratory Steel Drum Roller",
        capacity: "10 Metric Tons",
        units: 1,
      },
      {
        id: "eq-6",
        description: "Concrete Vibrator & Plate Compactor",
        capacity: "5.5 HP Gas Engine",
        units: 2,
      },
    ],
    deliveryTerms: [
      "Contract execution commences immediately upon receipt of the official Notice to Proceed (NTP).",
      "Site possession shall be granted by the DPWH District Engineering Office upon joint verification of right-of-way.",
      "Weather-related suspension orders shall only be credited upon verified climatological reports from PAGASA.",
    ],
    inspectionAndAcceptance: [
      "Monthly joint inspection by the DPWH Project Inspector and Contractor Project Engineer for progress billing verification.",
      "Final Inspection conducted by the DPWH District Inspectorate Team upon 100% physical accomplishment.",
      "Issuance of Certificate of Completion followed by a mandatory one (1) year Defects Liability Period prior to Certificate of Final Acceptance.",
    ],
    paymentTerms: [
      "Advance mobilization payment not exceeding fifteen percent (15%) of the total contract price upon submission of an irrevocable letter of credit or bank guarantee.",
      "Monthly progress billings proportional to validated physical work accomplishment, subject to 5% Final Withholding VAT, 2% Expanded Withholding Tax (BIR Form 2307), and 1% Statutory Retention Money.",
      "Retention money released upon issuance of Certificate of Final Acceptance and submission of required warranty security.",
    ],
    warrantyAndLiquidatedDamages: [
      "One (1) year Defects Liability Period during which the Contractor shall repair all structural defects at own expense within fifteen (15) calendar days from notice.",
      "Warranty Security in accordance with Section 62.2.3.2 of the Revised IRR of RA 9184 and RA 12009.",
      "Liquidated damages equivalent to one-tenth of one percent (1/10 of 1%) of the cost of unperformed portion per calendar day of delay.",
    ],
    signatories: [
      {
        role: "PREPARED_BY",
        label: "Prepared By:",
        name: "Engr. Mark Angelo D. Santos",
        title: "Project Engineer / Cost Estimator",
        officeOrLicense: "PRC Reg. No. 0149822 | PTR No. 8921044",
      },
      {
        role: "CHECKED_BY",
        label: "Checked / Reviewed By:",
        name: "Engr. Carmela R. Bautista",
        title: "Chief, Planning & Design Section",
        officeOrLicense: "Planning & Design Section, DPWH DEO",
      },
      {
        role: "RECOMMENDING",
        label: "Recommending Approval:",
        name: "Engr. Roberto M. Gomez",
        title: "Assistant District Engineer / BAC Chairman",
        officeOrLicense: "Bids and Awards Committee",
      },
      {
        role: "APPROVED_BY",
        label: "Approved By (HOPE):",
        name: "Engr. Juanito C. Dela Cruz",
        title: "District Engineer",
        officeOrLicense: "Head of Procuring Entity (HOPE)",
      },
    ],
  },

  LGU_GOODS_SERVICES: {
    presetType: "LGU_GOODS_SERVICES",
    implementingOffice:
      "City / Municipal General Services Office (GSO) & Bids and Awards Committee",
    projectLocation:
      "City / Municipal Hall Compound, Central Logistics Warehouse",
    sourceOfFunds:
      "20% Local Development Fund (EDF) / General Fund Budget FY 2026",
    contractDurationDays: 30,
    taxType: "VATABLE",
    projectCategory: "GOODS",
    retentionRate: 1,
    backgroundRationale:
      "Under Republic Act No. 7160 (Local Government Code), Republic Act No. 9184, and Republic Act No. 12009 (New Government Procurement Act), the Local Government Unit requires the supply, delivery, and deployment of institutional goods and equipment to sustain frontline public service delivery and community disaster resilience.",
    generalObjectives: [
      "Procure brand-new, premium-grade supplies and equipment in strict compliance with Section 18 of RA 9184 / RA 12009 prohibiting proprietary brand names.",
      "Enforce Green Public Procurement (GPP) energy efficiency and environmental standards mandated by the GPPB.",
      "Ensure complete delivery, assembly, and testing at FOB Destination within thirty (30) calendar days from receipt of Notice to Proceed.",
    ],
    scopeItems: [
      {
        id: "lgu-1",
        itemNo: "Item 1",
        description:
          "High-Performance Enterprise Workstation / Computing Terminals",
        quantity: 15,
        unit: "sets",
        specificationDetails:
          'Latest gen octa-core processor, 32GB RAM, 1TB NVMe, 27" IPS Monitor, licensed OS',
        timelineMilestone: "15 Calendar Days from NTP",
      },
      {
        id: "lgu-2",
        itemNo: "Item 2",
        description:
          "Heavy-Duty Network Laser Multifunction Copier/Scanner/Printer",
        quantity: 3,
        unit: "units",
        specificationDetails:
          "Duplex A3/A4, network Gigabit LAN/Wi-Fi, 45 ppm, continuous toner system",
        timelineMilestone: "20 Calendar Days from NTP",
      },
      {
        id: "lgu-3",
        itemNo: "Item 3",
        description:
          "Pure Sine Wave Smart Uninterruptible Power Supply (UPS) 2000VA",
        quantity: 15,
        unit: "units",
        specificationDetails:
          "AVR, LCD display, hot-swappable batteries, USB management interface",
        timelineMilestone: "20 Calendar Days from NTP",
      },
      {
        id: "lgu-4",
        itemNo: "Item 4",
        description:
          "On-Site Technical Deployment, Cabling, Network Configuration & User Training",
        quantity: 1,
        unit: "lot",
        specificationDetails:
          "Certified systems engineer deployment and 8-hour operator training",
        timelineMilestone: "30 Calendar Days from NTP",
      },
    ],
    technicalStandards: [
      "All delivered goods must be 100% brand-new, factory-sealed, and sourced from official authorized distributors in the Philippines.",
      "Equipment must meet Philippine Energy Labeling Program (PELP) 4-Star energy efficiency or international Energy Star certification.",
      "Supplier must provide authentic Certificate of Origin and standard Manufacturer Warranty Certificates.",
    ],
    keyPersonnel: [
      {
        id: "lgu-kp-1",
        position: "Technical Project In-Charge",
        qualification:
          "Degree in Engineering or Computer Science with 3+ years experience",
        count: 1,
      },
      {
        id: "lgu-kp-2",
        position: "Certified Field Support Technician",
        qualification:
          "CompTIA / OEM Certified Hardware and Network Specialist",
        count: 2,
      },
      {
        id: "lgu-kp-3",
        position: "Customer Support Representative",
        qualification:
          "Dedicated account manager for warranty calls and spare parts",
        count: 1,
      },
    ],
    equipmentRequirements: [
      {
        id: "lgu-eq-1",
        description: "Covered Delivery Cargo Van / Truck",
        capacity: "4-Wheeler Closed Van with GPS",
        units: 1,
      },
      {
        id: "lgu-eq-2",
        description: "Precision Diagnostic & Network Testing Toolkit",
        capacity: "Fluke / Klein Tools certified set",
        units: 2,
      },
    ],
    deliveryTerms: [
      "Delivery shall be Free on Board (FOB) Destination at the City / Municipal General Services Office (GSO) Warehouse.",
      "Delivery hours strictly during regular government working days, 8:00 AM to 4:00 PM, with prior 48-hour delivery notification.",
      "Supplier shall shoulder all insurance, freight, unloading, handling, and installation expenses.",
    ],
    inspectionAndAcceptance: [
      "Inspection shall be conducted by the LGU Inspection and Acceptance Committee (IAC) in the presence of the GSO Property Custodian and End-User.",
      "Items subject to physical count, benchmark testing, and verification against approved technical specifications.",
      "Certificate of Acceptance and Property Transfer Report (PTR) issued only upon zero-defect operational turnover.",
    ],
    paymentTerms: [
      "Single full payment via Land Bank of the Philippines (LBP) List of Due and Demandable Accounts Payable (LDDAP-ADA) upon issuance of Certificate of Acceptance.",
      "Statutory deductions: 5% Final Withholding VAT and 1% Expanded Withholding Tax (BIR Form 2307 for Goods), plus 1% Retention Money.",
      "Retention money released after three (3) months expiration of the supplies warranty or upon submission of a Special Bank Guarantee.",
    ],
    warrantyAndLiquidatedDamages: [
      "Minimum one (1) year full comprehensive on-site warranty covering parts and labor; next-business-day response time.",
      "Liquidated damages: 1/10 of 1% (0.001) of the cost of unperformed goods for every day of delay until actual delivery.",
      "Rejection of non-compliant items with mandatory replacement within five (5) working days at supplier expense.",
    ],
    signatories: [
      {
        role: "PREPARED_BY",
        label: "Prepared By (End-User):",
        name: "Maria Elena C. Reyes",
        title: "Head, General Services Office (GSO)",
        officeOrLicense: "LGU General Services Department",
      },
      {
        role: "CHECKED_BY",
        label: "Reviewed By (BAC Secretariat):",
        name: "Atty. Patricia S. Lim",
        title: "Head, BAC Secretariat & TWG",
        officeOrLicense: "Bids and Awards Committee",
      },
      {
        role: "RECOMMENDING",
        label: "Recommending Approval:",
        name: "Engr. Ricardo V. Morales",
        title: "City / Municipal BAC Chairperson",
        officeOrLicense: "Bids and Awards Committee",
      },
      {
        role: "APPROVED_BY",
        label: "Approved By (HOPE):",
        name: "Hon. Juanito C. Dela Cruz",
        title: "City / Municipal Mayor",
        officeOrLicense: "Head of Procuring Entity (HOPE)",
      },
    ],
  },

  BARANGAY_COMMUNITY: {
    presetType: "BARANGAY_COMMUNITY",
    implementingOffice:
      "Barangay Council & Barangay Bids and Awards Committee (BAC)",
    projectLocation: "Barangay Hall Complex, Purok 1 to Purok 7",
    sourceOfFunds:
      "Barangay Annual Budget FY 2026 / 20% Barangay Development Fund (BDF)",
    contractDurationDays: 15,
    taxType: "VATABLE",
    projectCategory: "GOODS",
    retentionRate: 1,
    backgroundRationale:
      "Pursuant to Republic Act No. 12009 (New Government Procurement Act - NGPA) provisions on Community-Participatory Procurement, DILG-GPPB Joint Memorandum Circulars, and Sangguniang Barangay Appropriation Ordinance No. 04-2026, Barangay procurement is conducted to empower local community initiatives, rehabilitate communal pathways, and provide vital disaster preparedness materials with maximum transparency and speed.",
    generalObjectives: [
      "Procure essential community development materials and disaster preparedness equipment with verified quality and competitive local pricing.",
      "Promote local economic recovery and community livelihood participation in conformity with RA 12009 Section 38.",
      "Complete 100% delivery and distribution within fifteen (15) calendar days from issuance of the Barangay Purchase Order.",
    ],
    scopeItems: [
      {
        id: "brgy-1",
        itemNo: "Item 1",
        description: "Portland Cement Type 1 (40kg bag, PNS 07 certified)",
        quantity: 300,
        unit: "bags",
        specificationDetails:
          "Fresh stock, moisture-proof wrapping, valid BPS mark",
        timelineMilestone: "Within 5 Days from PO",
      },
      {
        id: "brgy-2",
        itemNo: "Item 2",
        description:
          "Deformed Reinforcing Steel Bars 10mm dia. x 6.0m (Grade 33)",
        quantity: 200,
        unit: "lengths",
        specificationDetails: "Standard diameter embossed, PNS 49 compliant",
        timelineMilestone: "Within 5 Days from PO",
      },
      {
        id: "brgy-3",
        itemNo: "Item 3",
        description:
          "Washed River Sand (Fine Aggregate, free from organic silt)",
        quantity: 25,
        unit: "cu.m.",
        specificationDetails:
          "Screened clean gravel/sand blend for concrete pathway",
        timelineMilestone: "Within 7 Days from PO",
      },
      {
        id: "brgy-4",
        itemNo: "Item 4",
        description:
          'Crushed Gravel 3/4" (Coarse Aggregate, hard angular stone)',
        quantity: 40,
        unit: "cu.m.",
        specificationDetails:
          "High-density quarry aggregate for pathway paving",
        timelineMilestone: "Within 7 Days from PO",
      },
      {
        id: "brgy-5",
        itemNo: "Item 5",
        description: "Emergency Rescue First Aid Response Kits with Hard Case",
        quantity: 10,
        unit: "kits",
        specificationDetails:
          "Comprehensive medical supplies for Barangay Tanod/BHW response",
        timelineMilestone: "Within 10 Days from PO",
      },
    ],
    technicalStandards: [
      "All materials delivered must carry official Philippine National Standards (PNS) certification marks where applicable.",
      "Aggregates and cement must be properly stored in covered areas provided by the Barangay Council.",
      "Supplier must be a duly registered business with valid Mayor's/Barangay permit and BIR Certificate of Registration.",
    ],
    keyPersonnel: [
      {
        id: "brgy-kp-1",
        position: "Barangay Project Coordinator",
        qualification:
          "Barangay Committee Chairman on Infrastructure or Public Works",
        count: 1,
      },
      {
        id: "brgy-kp-2",
        position: "Community Master Tradesman",
        qualification:
          "Skilled local mason/carpenter with TESDA NC II certification",
        count: 1,
      },
    ],
    equipmentRequirements: [
      {
        id: "brgy-eq-1",
        description: "One-Bagger Concrete Mixer",
        capacity: "1 bagger gas engine powered",
        units: 1,
      },
      {
        id: "brgy-eq-2",
        description: "Utility Multi-Cab / Hauler",
        capacity: "Light transport vehicle for localized material drop-off",
        units: 1,
      },
    ],
    deliveryTerms: [
      "Direct delivery to the Barangay Hall or designated Barangay Purok drop points.",
      "Delivery must occur during regular daytime hours with unloading assisted by local community logistics.",
      "Inspection and delivery receipt must be countersigned upon arrival.",
    ],
    inspectionAndAcceptance: [
      "Joint physical inspection by the Barangay Inspection Officer, Barangay Treasurer, and Punong Barangay.",
      "Immediate verification against the approved Purchase Order / Scope of Requirements.",
      "Issuance of Barangay Certificate of Inspection and Acceptance.",
    ],
    paymentTerms: [
      "Payment made via official Barangay Check signed by the Barangay Treasurer and countersigned by the Punong Barangay.",
      "Statutory BIR withholding taxes deducted in accordance with BIR Revenue Regulations applicable to Barangay LGUs (Form 2306/2307).",
      "Prompt payment processing within seven (7) working days upon complete delivery and submission of sales invoice.",
    ],
    warrantyAndLiquidatedDamages: [
      "Defective or substandard materials must be replaced within forty-eight (48) hours at supplier expense.",
      "Liquidated damages: 1/10 of 1% (0.001) of the delayed items per calendar day of delay.",
      "Retention of 1% or standard manufacturer warranty slip for equipment.",
    ],
    signatories: [
      {
        role: "PREPARED_BY",
        label: "Prepared By (BAC Secretariat):",
        name: "Kagawad Antonio M. Ramos",
        title: "Chairman, Committee on Appropriations",
        officeOrLicense: "Barangay Council / BAC Secretariat",
      },
      {
        role: "CHECKED_BY",
        label: "Certified Funds Available:",
        name: "Consolacion P. Santos",
        title: "Barangay Treasurer",
        officeOrLicense: "Barangay Treasury Office",
      },
      {
        role: "RECOMMENDING",
        label: "Recommending Approval:",
        name: "Kagawad Rodrigo B. Diaz",
        title: "Barangay BAC Chairperson",
        officeOrLicense: "Barangay Bids and Awards Committee",
      },
      {
        role: "APPROVED_BY",
        label: "Approved By (HOPE):",
        name: "Hon. Juanito C. Dela Cruz",
        title: "Punong Barangay",
        officeOrLicense: "Head of Procuring Entity (HOPE)",
      },
    ],
  },
};

export interface TermsOfReferenceProps {
  initialPreset?: TorPresetType;
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  activeAbcAmount?: number;
  activeTrackingNumber?: string;
  powScopeItems?: any[]; // Pass items from POW to sync
  onSaveAndComplete?: (
    pdfDataUrl: string,
    docName: string,
    refNo?: string,
    title?: string,
  ) => void;
  onClose?: () => void;
  isEmbedded?: boolean; // When rendered inside POW tab 4
}

export const TermsOfReferenceContent: React.FC<TermsOfReferenceProps> = ({
  initialPreset = "LTCISCC_COMMAND_CENTER",
  tenant,
  activeProjectRefNo = "LTCISCC-ITB-2026-001",
  activeProjectTitle = "Equipment Outlay of the La Trinidad Communication, Information and Surveillance Command Center (LTCISCC)",
  activeProcuringEntity = "Municipality of La Trinidad, Province of Benguet",
  activeAbcAmount = GRAND_TOTAL_ABC,
  activeTrackingNumber,
  powScopeItems,
  onSaveAndComplete,
  onClose,
  isEmbedded = false,
}) => {
  const { currentUser } = useAuth();

  // Selected Preset
  const [selectedPreset, setSelectedPreset] =
    useState<TorPresetType>(initialPreset);

  // Active Workbench Tab: Executive TOR vs Annexes
  const [activeWorkbenchTab, setActiveWorkbenchTab] = useState<
    "executive" | "annex-c" | "annex-ae" | "annex-bg" | "annex-di"
  >("executive");

  // Form State
  const [torData, setTorData] = useState<TermsOfReferenceData>(() => {
    const basePreset = TOR_PRESET_TEMPLATES[initialPreset];
    return {
      ...basePreset,
      trackingNumber: activeTrackingNumber || generateDateTimeTrackingId(),
      projectRefNo: activeProjectRefNo,
      projectTitle: activeProjectTitle,
      procuringEntity: activeProcuringEntity,
      abcAmount: activeAbcAmount,
    };
  });

  // Keep Tracking Number and Active Details in sync if props change
  useEffect(() => {
    setTorData((prev) => ({
      ...prev,
      trackingNumber:
        activeTrackingNumber || prev.trackingNumber || generateDateTimeTrackingId(),
      projectRefNo: activeProjectRefNo || prev.projectRefNo,
      projectTitle: activeProjectTitle || prev.projectTitle,
      procuringEntity: activeProcuringEntity || prev.procuringEntity,
      abcAmount:
        activeAbcAmount !== undefined ? activeAbcAmount : prev.abcAmount,
    }));
  }, [
    activeTrackingNumber,
    activeProjectRefNo,
    activeProjectTitle,
    activeProcuringEntity,
    activeAbcAmount,
  ]);

  // Handle Preset Switching
  const handleSwitchPreset = (preset: TorPresetType) => {
    setSelectedPreset(preset);
    const template = TOR_PRESET_TEMPLATES[preset];
    setTorData((prev) => ({
      ...prev,
      ...template,
      presetType: preset,
      trackingNumber: prev.trackingNumber || generateDateTimeTrackingId(),
      projectRefNo:
        preset === "LTCISCC_COMMAND_CENTER"
          ? "LTCISCC-ITB-2026-001"
          : prev.projectRefNo,
      projectTitle:
        preset === "LTCISCC_COMMAND_CENTER"
          ? "Equipment Outlay of the La Trinidad Communication, Information and Surveillance Command Center (LTCISCC)"
          : prev.projectTitle,
      procuringEntity:
        preset === "LTCISCC_COMMAND_CENTER"
          ? "Municipality of La Trinidad, Province of Benguet"
          : preset === "DPWH_INFRA"
            ? "Department of Public Works and Highways"
            : preset === "LGU_GOODS_SERVICES"
              ? "City Government Procurement Office"
              : "Barangay Council / Bids and Awards Committee",
      abcAmount:
        preset === "LTCISCC_COMMAND_CENTER"
          ? GRAND_TOTAL_ABC
          : prev.abcAmount,
    }));
  };

  // Sync Deliverables from POW Items if available
  const handleSyncFromPow = () => {
    if (!powScopeItems || powScopeItems.length === 0) {
      alert(
        "No POW items available to sync. You can add scope items manually below.",
      );
      return;
    }
    const syncedItems: TorScopeItem[] = powScopeItems.map((item, idx) => ({
      id: `synced-${item.id || idx}`,
      itemNo: item.itemNo || `Item ${idx + 1}`,
      description: item.description || "Deliverable Work Item",
      quantity: Number(item.quantity) || 1,
      unit: item.unit || "lot",
      specificationDetails:
        item.brandModel || item.part || "Standard Statutory Specifications",
      timelineMilestone: `Milestone Phase ${idx + 1}`,
    }));

    setTorData((prev) => ({
      ...prev,
      scopeItems: syncedItems,
    }));
    alert(
      `✅ Successfully synchronized ${syncedItems.length} deliverable items from Program of Work / Quotation!`,
    );
  };

  const updateListField = (
    field:
      | "technicalStandards"
      | "deliveryTerms"
      | "inspectionAndAcceptance"
      | "paymentTerms"
      | "warrantyAndLiquidatedDamages",
    value: string,
  ) => {
    setTorData((prev) => ({
      ...prev,
      [field]: value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    }));
  };

  const validateBeforeFinalization = (): boolean => {
    const errors = validateTorData(torData);
    if (errors.length > 0) {
      alert(`TOR cannot be finalized yet:\n\n• ${errors.join("\n• ")}`);
      return false;
    }
    return true;
  };

  // Tax Calculations on the ABC Amount
  const taxSummary = useMemo(() => {
    return computeStatutoryTaxes(
      torData.abcAmount,
      torData.taxType,
      torData.projectCategory,
      torData.retentionRate,
    );
  }, [
    torData.abcAmount,
    torData.taxType,
    torData.projectCategory,
    torData.retentionRate,
  ]);

  // Approval Gate & PDF Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [generatedPdfPreview, setGeneratedPdfPreview] = useState<string | null>(
    null,
  );
  const [showApprovalGate, setShowApprovalGate] = useState<boolean>(false);
  const [approvalActionTarget, setApprovalActionTarget] = useState<
    "EXPORT" | "SAVE"
  >("EXPORT");
  const [approvalRecord, setApprovalRecord] =
    useState<DocumentApprovalRecord | null>(null);

  // Check initial approval record
  useEffect(() => {
    const docKey = `TOR_${torData.projectRefNo}_${torData.trackingNumber || "ACTIVE"}`;
    const rec = getDocumentApproval(tenant?.id || "default", docKey);
    setApprovalRecord(rec);
  }, [tenant?.id, torData.projectRefNo, torData.trackingNumber]);

  // Check if current user role can bypass approval gate
  const userIsApprover = isApproverRole(currentUser?.role);
  const isDocumentApproved = approvalRecord?.status === "APPROVED";

  // Format Peso Helper
  const fmtPeso = (val: number): string => {
    if (isNaN(val) || val === 0) return "0.00";
    return val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Render & Generate Legal 8.5" x 13" PDF Data URL
  const generateTorPdfDataUrl = async (): Promise<string | null> => {
    const sheetEl = document.getElementById("tor-print-sheet");
    if (!sheetEl) return null;

    // Legal Portrait: 8.5" x 13" = 612pt x 936pt
    const pageWidth = 612;
    const pageHeight = 936;

    const canvas = await html2canvas(sheetEl, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const img = await pdfDoc.embedPng(imgData);

    const margin = 20;
    const printableWidth = pageWidth - margin * 2;
    const printableHeight = pageHeight - margin * 2;
    const imgAspect = canvas.width / canvas.height;

    let drawWidth = printableWidth;
    let drawHeight = printableWidth / imgAspect;

    if (drawHeight > printableHeight) {
      drawHeight = printableHeight;
      drawWidth = printableHeight * imgAspect;
    }

    const x = margin + (printableWidth - drawWidth) / 2;
    const y = pageHeight - margin - drawHeight;

    page.drawImage(img, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
    return await blobToDataUrl(blob);
  };

  // Handle Export Standalone PDF
  const handleExportPdf = async () => {
    if (!validateBeforeFinalization()) return;

    // If not approved and user is not an approver, show approval gate
    if (!isDocumentApproved && !userIsApprover) {
      setApprovalActionTarget("EXPORT");
      setShowApprovalGate(true);
      return;
    }

    try {
      setIsExporting(true);
      const dataUrl = await generateTorPdfDataUrl();
      if (!dataUrl) {
        alert("Failed to generate PDF. Please try again.");
        return;
      }

      const a = document.createElement("a");
      a.href = dataUrl;
      const fileName = `${torData.projectRefNo}_TERMS_OF_REFERENCE_${torData.presetType}.pdf`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Export TOR PDF Error:", err);
      alert("An error occurred during PDF generation.");
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Save and Link to POW / Vault
  const handleSaveAndComplete = async () => {
    if (!validateBeforeFinalization()) return;

    if (!isDocumentApproved && !userIsApprover) {
      setApprovalActionTarget("SAVE");
      setShowApprovalGate(true);
      return;
    }

    try {
      setIsExporting(true);
      const dataUrl = await generateTorPdfDataUrl();
      if (!dataUrl) {
        alert("Failed to render Terms of Reference PDF.");
        return;
      }

      const docName = `Terms of Reference (TOR) - [${torData.projectRefNo}]`;
      const fileName = `${torData.projectRefNo}_TERMS_OF_REFERENCE_${torData.presetType}.pdf`;
      if (onSaveAndComplete) {
        onSaveAndComplete(
          dataUrl,
          docName,
          torData.projectRefNo,
          torData.projectTitle,
        );
      } else {
        setGeneratedPdfPreview(dataUrl);
        alert("✅ Terms of Reference successfully generated!");
      }

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Save TOR Error:", err);
      alert("An error occurred while saving.");
    } finally {
      setIsExporting(false);
    }
  };

  // Native Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* HEADER CONTROLS & PRESET SELECTOR */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Statutory Terms of Reference (TOR) Generator
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  RA 9184 &amp; RA 12009 (NGPA)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generate authentic statutory specifications, scopes of work, and
                delivery milestones for DPWH, LGU, or Barangay
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {powScopeItems && powScopeItems.length > 0 && (
              <button
                type="button"
                onClick={handleSyncFromPow}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 cursor-pointer transition"
                title="Synchronize items from Program of Work / Quotation"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                <span>Sync Scope from POW ({powScopeItems.length} items)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 cursor-pointer transition"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Legal PDF</span>
            </button>

            {onSaveAndComplete && (
              <button
                type="button"
                onClick={handleSaveAndComplete}
                disabled={isExporting}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 cursor-pointer shadow-lg transition disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {isEmbedded
                    ? "Generate & Append to Package"
                    : "Save TOR to Project Records"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* 4 STATUTORY PRESET SELECTORS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* PRESET 1: LTCISCC COMMAND CENTER (FLAGSHIP) */}
          <div
            onClick={() => handleSwitchPreset("LTCISCC_COMMAND_CENTER")}
            className={`p-3.5 rounded-xl border cursor-pointer transition text-left space-y-1.5 relative overflow-hidden ${
              selectedPreset === "LTCISCC_COMMAND_CENTER"
                ? "bg-linear-to-br from-blue-900/30 via-slate-900 to-indigo-900/30 border-blue-500 text-white shadow-xl shadow-blue-950/50"
                : "bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-blue-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>LTCISCC Command Center</span>
              </span>
              {selectedPreset === "LTCISCC_COMMAND_CENTER" && (
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
              )}
            </div>
            <p className="text-[11px] text-slate-200 font-semibold truncate">
              Municipality of La Trinidad, Benguet
            </p>
            <p className="text-[10px] text-slate-400 leading-tight">
              Ord. 28-2017 &amp; RA 12009: 46 field nodes, iVMS-4200, HikCentral, AI Models, Armored Fiber &amp; 3-Hr SLA.
            </p>
            <div className="flex items-center gap-1.5 pt-1 text-[10px] font-mono text-blue-300 flex-wrap">
              <span className="px-1.5 py-0.5 rounded bg-blue-500/20 font-bold text-amber-300">
                ₱14M ABC
              </span>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/20">
                5% VAT
              </span>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/20">
                3-Yr SLA
              </span>
            </div>
          </div>

          {/* PRESET 2: DPWH */}
          <div
            onClick={() => handleSwitchPreset("DPWH_INFRA")}
            className={`p-3.5 rounded-xl border cursor-pointer transition text-left space-y-1.5 ${
              selectedPreset === "DPWH_INFRA"
                ? "bg-amber-500/10 border-amber-500 text-white shadow-lg"
                : "bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                <span>DPWH Standard</span>
              </span>
              {selectedPreset === "DPWH_INFRA" && (
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <p className="text-[11px] text-slate-300 font-medium truncate">
              Civil Works &amp; Infrastructure
            </p>
            <p className="text-[10px] text-slate-400 leading-tight">
              Blue Book Standard Specs, Stationing, PRC Project Engineer,
              Materials Engineer I/II, DOLE CSHP &amp; Heavy Equipment.
            </p>
            <div className="flex items-center gap-1.5 pt-1 text-[10px] font-mono text-amber-300">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20">
                5% VAT
              </span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20">
                2% EWT
              </span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20">
                1% Retention
              </span>
            </div>
          </div>

          {/* PRESET 3: LGU */}
          <div
            onClick={() => handleSwitchPreset("LGU_GOODS_SERVICES")}
            className={`p-3.5 rounded-xl border cursor-pointer transition text-left space-y-1.5 ${
              selectedPreset === "LGU_GOODS_SERVICES"
                ? "bg-blue-500/10 border-blue-500 text-white shadow-lg"
                : "bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                <span>LGU Standard</span>
              </span>
              {selectedPreset === "LGU_GOODS_SERVICES" && (
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
              )}
            </div>
            <p className="text-[11px] text-slate-300 font-medium truncate">
              Provincial / City / Municipal
            </p>
            <p className="text-[10px] text-slate-400 leading-tight">
              RA 7160 &amp; GPPB Res. 03-2025, Non-brand specs, Green Public
              Procurement, FOB Destination, IAC Inspection &amp; Warranty.
            </p>
            <div className="flex items-center gap-1.5 pt-1 text-[10px] font-mono text-blue-300">
              <span className="px-1.5 py-0.5 rounded bg-blue-500/20">
                5% VAT
              </span>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/20">
                1% EWT
              </span>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/20">
                1% Retention
              </span>
            </div>
          </div>

          {/* PRESET 4: BARANGAY */}
          <div
            onClick={() => handleSwitchPreset("BARANGAY_COMMUNITY")}
            className={`p-3.5 rounded-xl border cursor-pointer transition text-left space-y-1.5 ${
              selectedPreset === "BARANGAY_COMMUNITY"
                ? "bg-emerald-500/10 border-emerald-500 text-white shadow-lg"
                : "bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                <span>Barangay Standard</span>
              </span>
              {selectedPreset === "BARANGAY_COMMUNITY" && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <p className="text-[11px] text-slate-300 font-medium truncate">
              Community Procurement (RA 12009)
            </p>
            <p className="text-[10px] text-slate-400 leading-tight">
              Community Participation Sec. 38, Punong Barangay HoPE, Barangay
              Treasurer Funds Certificate &amp; Localized inspection.
            </p>
            <div className="flex items-center gap-1.5 pt-1 text-[10px] font-mono text-emerald-300">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20">
                Form 2306/2307
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20">
                Community BAC
              </span>
            </div>
          </div>
        </div>

        {/* TRACKING ID & APPROVAL BANNER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Tracking Number:</span>
            <span className="font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
              {torData.trackingNumber || "AUTO-GENERATING..."}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              (Strictly Non-Editable)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isDocumentApproved ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  Approved by {approvalRecord?.approvedBy || "Manager"}
                </span>
              </span>
            ) : userIsApprover ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                <span>
                  Approver Role: {getRoleDisplayName(currentUser?.role)}
                </span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                <span>Pending Executive Manager Approval</span>
              </span>
            )}
          </div>
        </div>

        {/* INTERACTIVE WORKBENCH VIEW TABS */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveWorkbenchTab("executive")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeWorkbenchTab === "executive"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Executive TOR (Sections I–XIV)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveWorkbenchTab("annex-c")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeWorkbenchTab === "annex-c"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Annex C: BOQ &amp; Cost Breakdown (₱14,000,000.00)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveWorkbenchTab("annex-ae")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeWorkbenchTab === "annex-ae"
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Annex A &amp; E: Core Compute &amp; Software Specs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveWorkbenchTab("annex-bg")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeWorkbenchTab === "annex-bg"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Annex B &amp; G: SOPs &amp; 3-Hour SLA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveWorkbenchTab("annex-di")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeWorkbenchTab === "annex-di"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Annex D &amp; I: Data Privacy (RA 10173) &amp; TWG Directives</span>
          </button>
        </div>
      </div>

      {activeWorkbenchTab !== "executive" ? (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <TorAnnexesWorkbench
            activeTab={activeWorkbenchTab}
            onTabChange={setActiveWorkbenchTab}
          />
        </div>
      ) : (
        <>
          {/* EDITABLE STATUTORY PARAMETERS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: GENERAL PROJECT DETAILS */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>Project &amp; Procuring Entity Metadata</span>
          </h4>

          <div className="space-y-3">
            <div>
              <label className="block text-slate-400 mb-1">Project Title</label>
              <textarea
                rows={2}
                value={torData.projectTitle}
                onChange={(e) =>
                  setTorData({ ...torData, projectTitle: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-medium focus:border-amber-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">
                  Project Ref / Solicitation
                </label>
                <input
                  type="text"
                  value={torData.projectRefNo}
                  onChange={(e) =>
                    setTorData({ ...torData, projectRefNo: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Duration (Calendar Days)
                </label>
                <input
                  type="number"
                  value={torData.contractDurationDays}
                  onChange={(e) =>
                    setTorData({
                      ...torData,
                      contractDurationDays: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                Procuring Entity
              </label>
              <input
                type="text"
                value={torData.procuringEntity}
                onChange={(e) =>
                  setTorData({ ...torData, procuringEntity: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-medium focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                Implementing Office / Unit
              </label>
              <input
                type="text"
                value={torData.implementingOffice}
                onChange={(e) =>
                  setTorData({ ...torData, implementingOffice: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                Project Stationing / Location
              </label>
              <input
                type="text"
                value={torData.projectLocation}
                onChange={(e) =>
                  setTorData({ ...torData, projectLocation: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                Source of Funds &amp; Appropriation
              </label>
              <input
                type="text"
                value={torData.sourceOfFunds}
                onChange={(e) =>
                  setTorData({ ...torData, sourceOfFunds: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:border-amber-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: APPROVED BUDGET & STATUTORY TAXES */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Approved Budget &amp; Statutory Tax Schedule</span>
          </h4>

          <div className="space-y-3">
            <div>
              <label className="block text-slate-400 mb-1">
                Approved Budget for Contract (ABC in PHP)
              </label>
              <input
                type="number"
                step="0.01"
                value={torData.abcAmount}
                onChange={(e) =>
                  setTorData({
                    ...torData,
                    abcAmount: Number(e.target.value) || 0,
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-emerald-400 font-mono font-bold text-sm focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">
                  Tax Classification
                </label>
                <select
                  value={torData.taxType}
                  onChange={(e) =>
                    setTorData({
                      ...torData,
                      taxType: e.target.value as TaxType,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:border-emerald-500 outline-none"
                >
                  <option value="VATABLE">VATable (Base / 1.12)</option>
                  <option value="NON_VAT">Non-VAT (Direct 100%)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Statutory Category
                </label>
                <select
                  value={torData.projectCategory}
                  onChange={(e) =>
                    setTorData({
                      ...torData,
                      projectCategory: e.target.value as ProjectTaxCategory,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:border-emerald-500 outline-none"
                >
                  <option value="INFRA">Infrastructure (2% EWT)</option>
                  <option value="GOODS">Goods / Supplies (1% EWT)</option>
                </select>
              </div>
            </div>

            {/* COMPUTED TAX BREAKDOWN TABLE */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>Gross ABC Amount:</span>
                <span className="text-white font-bold">
                  ₱ {fmtPeso(taxSummary.grossAmount)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>
                  Net Direct Base ({taxSummary.isVatable ? "÷ 1.12" : "100%"}):
                </span>
                <span className="text-slate-300">
                  ₱ {fmtPeso(taxSummary.netBase)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>12% Output VAT:</span>
                <span className="text-slate-300">
                  ₱ {fmtPeso(taxSummary.outputVat12)}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-1.5 space-y-1.5">
                <div className="flex justify-between text-amber-400">
                  <span>5% Final Withholding VAT:</span>
                  <span>- ₱ {fmtPeso(taxSummary.finalVat5)}</span>
                </div>
                <div className="flex justify-between text-blue-400">
                  <span>{taxSummary.ewtRate}% Expanded Withholding (EWT):</span>
                  <span>- ₱ {fmtPeso(taxSummary.ewtAmount)}</span>
                </div>
                <div className="flex justify-between text-purple-400">
                  <span>{taxSummary.retentionRate}% Statutory Retention:</span>
                  <span>- ₱ {fmtPeso(taxSummary.retentionAmount)}</span>
                </div>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-xs">
                <span className="text-emerald-400">
                  Net Take-Home / Disbursable:
                </span>
                <span className="text-emerald-400">
                  ₱ {fmtPeso(taxSummary.netPayable)}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 italic">
              Computed in strict compliance with BIR Revenue Regulations and RA
              9184 / RA 12009 statutory withholding rules.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: 4-TIER SIGNATORIES */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
            <UserCheck className="w-4 h-4 text-purple-400" />
            <span>Official 4-Tier Signatory Hierarchy</span>
          </h4>

          <div className="space-y-3">
            {torData.signatories.map((sig, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                  <span>{sig.label}</span>
                  <span className="text-slate-600 font-mono">
                    Tier {idx + 1}
                  </span>
                </div>
                <input
                  type="text"
                  value={sig.name}
                  onChange={(e) => {
                    const updated = [...torData.signatories];
                    updated[idx].name = e.target.value;
                    setTorData({ ...torData, signatories: updated });
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-bold text-xs"
                />
                <input
                  type="text"
                  value={sig.title}
                  onChange={(e) => {
                    const updated = [...torData.signatories];
                    updated[idx].title = e.target.value;
                    setTorData({ ...torData, signatories: updated });
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-slate-300 text-[11px]"
                />
                <input
                  type="text"
                  value={sig.officeOrLicense}
                  onChange={(e) => {
                    const updated = [...torData.signatories];
                    updated[idx].officeOrLicense = e.target.value;
                    setTorData({ ...torData, signatories: updated });
                  }}
                  placeholder="Office or License Details"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-slate-400 text-[10px]"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SCOPE OF DELIVERABLES TABLE (INTERACTIVE) */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white">
              Itemized Scope of Deliverables &amp; Technical Requirements
            </h4>
            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
              {torData.scopeItems.length} items
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              const newItem: TorScopeItem = {
                id: `manual-${Date.now()}`,
                itemNo: `Item ${torData.scopeItems.length + 1}`,
                description: "Additional statutory work scope / deliverable",
                quantity: 1,
                unit: "lot",
                specificationDetails: "Statutory compliance details",
                timelineMilestone: "Within stipulated duration",
              };
              setTorData({
                ...torData,
                scopeItems: [...torData.scopeItems, newItem],
              });
            }}
            className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 flex items-center gap-1 cursor-pointer transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border border-slate-800">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[11px]">
              <tr>
                <th className="p-2.5 border-b border-slate-800 w-16">
                  Item No.
                </th>
                <th className="p-2.5 border-b border-slate-800">
                  Description of Work / Supply
                </th>
                <th className="p-2.5 border-b border-slate-800 w-24">Qty</th>
                <th className="p-2.5 border-b border-slate-800 w-20">Unit</th>
                <th className="p-2.5 border-b border-slate-800">
                  Technical Specification Details
                </th>
                <th className="p-2.5 border-b border-slate-800 w-36">
                  Timeline Milestone
                </th>
                <th className="p-2.5 border-b border-slate-800 w-12 text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {torData.scopeItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-850/50">
                  <td className="p-2">
                    <input
                      type="text"
                      value={item.itemNo}
                      onChange={(e) => {
                        const updated = [...torData.scopeItems];
                        updated[idx].itemNo = e.target.value;
                        setTorData({ ...torData, scopeItems: updated });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-white font-mono text-center"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => {
                        const updated = [...torData.scopeItems];
                        updated[idx].description = e.target.value;
                        setTorData({ ...torData, scopeItems: updated });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => {
                        const updated = [...torData.scopeItems];
                        updated[idx].quantity = Number(e.target.value) || 0;
                        setTorData({ ...torData, scopeItems: updated });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono text-right"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => {
                        const updated = [...torData.scopeItems];
                        updated[idx].unit = e.target.value;
                        setTorData({ ...torData, scopeItems: updated });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-white text-center"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={item.specificationDetails || ""}
                      onChange={(e) => {
                        const updated = [...torData.scopeItems];
                        updated[idx].specificationDetails = e.target.value;
                        setTorData({ ...torData, scopeItems: updated });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={item.timelineMilestone || ""}
                      onChange={(e) => {
                        const updated = [...torData.scopeItems];
                        updated[idx].timelineMilestone = e.target.value;
                        setTorData({ ...torData, scopeItems: updated });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 font-mono text-[11px]"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = torData.scopeItems.filter(
                          (_, i) => i !== idx,
                        );
                        setTorData({ ...torData, scopeItems: updated });
                      }}
                      className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* LGU-STYLE COMPLIANCE SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(
          [
            [
              "technicalStandards",
              "Technical Standards / Specifications",
              torData.technicalStandards,
            ],
            [
              "deliveryTerms",
              "Delivery / Implementation Terms",
              torData.deliveryTerms,
            ],
            [
              "inspectionAndAcceptance",
              "Inspection and Acceptance",
              torData.inspectionAndAcceptance,
            ],
            ["paymentTerms", "Payment Terms", torData.paymentTerms],
            [
              "warrantyAndLiquidatedDamages",
              "Warranty and Liquidated Damages",
              torData.warrantyAndLiquidatedDamages,
            ],
          ] as const
        ).map(([field, label, values]) => (
          <div
            key={field}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="font-bold text-white uppercase tracking-wider">
                {label}
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">
                One requirement per line
              </span>
            </div>
            <textarea
              rows={Math.min(8, Math.max(4, values.length + 1))}
              value={values.join("\n")}
              onChange={(e) => updateListField(field, e.target.value)}
              className="w-full min-h-28 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 leading-relaxed focus:border-amber-500 outline-none resize-y"
            />
          </div>
        ))}
      </div>
    </>
  )}

      {/* OFF-SCREEN LEGAL 8.5" x 13" SHEET FOR HTML2CANVAS & PRINTING (RULE PDF-4) */}
      <div
        id="tor-print-sheet"
        style={{
          position: "absolute",
          left: "-9999px",
          top: "0px",
          width: "816px", // Standard 8.5" at 96 DPI (Legal width)
          minHeight: "1248px", // Standard 13" at 96 DPI (Legal height)
          backgroundColor: "#ffffff",
          color: "#0f172a",
          padding: "36px 42px",
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          boxSizing: "border-box",
        }}
      >
        {/* REPUBLIC OF THE PHILIPPINES OFFICIAL HEADER */}
        <div
          style={{
            textAlign: "center",
            borderBottom: "2px solid #0f172a",
            paddingBottom: "12px",
            marginBottom: "16px",
          }}
        >
          <p
            style={{
              margin: "0",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "1px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Republic of the Philippines
          </p>
          <h2
            style={{
              margin: "3px 0 0 0",
              fontSize: "15px",
              fontWeight: 800,
              textTransform: "uppercase",
              color: "#0f172a",
            }}
          >
            {torData.procuringEntity}
          </h2>
          <p
            style={{
              margin: "2px 0 0 0",
              fontSize: "11px",
              fontWeight: 600,
              color: "#334155",
            }}
          >
            {torData.implementingOffice}
          </p>
          <p
            style={{ margin: "2px 0 0 0", fontSize: "10px", color: "#64748b" }}
          >
            {torData.projectLocation}
          </p>
          <div
            style={{
              marginTop: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "10px",
              fontFamily: "monospace",
            }}
          >
            <span>
              Project Ref: <strong>{torData.projectRefNo}</strong>
            </span>
            <span>
              Certified Tracking ID:{" "}
              <strong>{torData.trackingNumber || "2026-09-001-AUTO"}</strong>
            </span>
          </div>
        </div>

        {/* DOCUMENT TITLE & STATUTORY MANDATE */}
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <h1
            style={{
              margin: "0",
              fontSize: "16px",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "#0f172a",
            }}
          >
            Official Terms of Reference (TOR)
          </h1>
          <p
            style={{
              margin: "3px 0 0 0",
              fontSize: "12px",
              fontWeight: 700,
              color: "#1e3a8a",
            }}
          >
            {torData.projectTitle}
          </p>
          <p
            style={{
              margin: "3px 0 0 0",
              fontSize: "9.5px",
              color: "#64748b",
              fontStyle: "italic",
            }}
          >
            Formulated Pursuant to Republic Act No. 9184 and Republic Act No.
            12009 (New Government Procurement Act - NGPA)
          </p>
        </div>

        {/* SECTION 1: BACKGROUND & STATUTORY BASIS */}
        <div style={{ marginBottom: "14px" }}>
          <h3
            style={{
              margin: "0 0 4px 0",
              fontSize: "11px",
              fontWeight: 800,
              textTransform: "uppercase",
              borderBottom: "1px solid #cbd5e1",
              paddingBottom: "2px",
              color: "#1e293b",
            }}
          >
            I. Background and Statutory Rationale
          </h3>
          <p
            style={{
              margin: "0",
              fontSize: "9.5px",
              lineHeight: "1.45",
              color: "#334155",
              textAlign: "justify",
            }}
          >
            {torData.backgroundRationale}
          </p>
        </div>

        {/* SECTION 2: OBJECTIVES */}
        <div style={{ marginBottom: "14px" }}>
          <h3
            style={{
              margin: "0 0 4px 0",
              fontSize: "11px",
              fontWeight: 800,
              textTransform: "uppercase",
              borderBottom: "1px solid #cbd5e1",
              paddingBottom: "2px",
              color: "#1e293b",
            }}
          >
            II. Project Objectives
          </h3>
          <ul
            style={{
              margin: "0",
              paddingLeft: "18px",
              fontSize: "9.5px",
              lineHeight: "1.4",
              color: "#334155",
            }}
          >
            {torData.generalObjectives.map((obj, i) => (
              <li key={i} style={{ marginBottom: "2px" }}>
                {obj}
              </li>
            ))}
          </ul>
        </div>

        {/* SECTION 3: SCOPE OF DELIVERABLES TABLE */}
        <div style={{ marginBottom: "14px" }}>
          <h3
            style={{
              margin: "0 0 4px 0",
              fontSize: "11px",
              fontWeight: 800,
              textTransform: "uppercase",
              borderBottom: "1px solid #cbd5e1",
              paddingBottom: "2px",
              color: "#1e293b",
            }}
          >
            III. Scope of Deliverables and Technical Specifications
          </h3>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "9px",
              marginTop: "4px",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "#f1f5f9",
                  borderTop: "1px solid #0f172a",
                  borderBottom: "1px solid #0f172a",
                }}
              >
                <th
                  style={{ padding: "4px", textAlign: "center", width: "50px" }}
                >
                  Item
                </th>
                <th style={{ padding: "4px", textAlign: "left" }}>
                  Description
                </th>
                <th
                  style={{ padding: "4px", textAlign: "right", width: "45px" }}
                >
                  Qty
                </th>
                <th
                  style={{ padding: "4px", textAlign: "center", width: "40px" }}
                >
                  Unit
                </th>
                <th style={{ padding: "4px", textAlign: "left" }}>
                  Technical Standards / Specifications
                </th>
                <th
                  style={{ padding: "4px", textAlign: "left", width: "110px" }}
                >
                  Target Milestone
                </th>
              </tr>
            </thead>
            <tbody>
              {torData.scopeItems.map((it, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td
                    style={{
                      padding: "4px",
                      textAlign: "center",
                      fontWeight: 700,
                      fontFamily: "monospace",
                    }}
                  >
                    {it.itemNo}
                  </td>
                  <td style={{ padding: "4px", fontWeight: 600 }}>
                    {it.description}
                  </td>
                  <td
                    style={{
                      padding: "4px",
                      textAlign: "right",
                      fontFamily: "monospace",
                    }}
                  >
                    {it.quantity}
                  </td>
                  <td style={{ padding: "4px", textAlign: "center" }}>
                    {it.unit}
                  </td>
                  <td style={{ padding: "4px", color: "#475569" }}>
                    {it.specificationDetails}
                  </td>
                  <td
                    style={{
                      padding: "4px",
                      color: "#475569",
                      fontSize: "8.5px",
                    }}
                  >
                    {it.timelineMilestone}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SECTION 4: APPROVED BUDGET & BIR STATUTORY TAX BREAKDOWN */}
        <div style={{ marginBottom: "14px" }}>
          <h3
            style={{
              margin: "0 0 4px 0",
              fontSize: "11px",
              fontWeight: 800,
              textTransform: "uppercase",
              borderBottom: "1px solid #cbd5e1",
              paddingBottom: "2px",
              color: "#1e293b",
            }}
          >
            IV. Approved Budget for Contract (ABC) &amp; Statutory BIR Tax
            Schedule
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              fontSize: "9px",
              backgroundColor: "#f8fafc",
              padding: "8px",
              border: "1px solid #e2e8f0",
              borderRadius: "4px",
            }}
          >
            <div>
              <p style={{ margin: "0 0 3px 0" }}>
                Approved Budget for Contract (ABC):{" "}
                <strong>PHP {fmtPeso(taxSummary.grossAmount)}</strong>
              </p>
              <p style={{ margin: "0 0 3px 0" }}>
                Source of Appropriation:{" "}
                <strong>{torData.sourceOfFunds}</strong>
              </p>
              <p style={{ margin: "0" }}>
                Contract Duration:{" "}
                <strong>{torData.contractDurationDays} Calendar Days</strong>
              </p>
            </div>
            <div>
              <p style={{ margin: "0 0 2px 0", color: "#0f172a" }}>
                Net Cost Base (
                {taxSummary.isVatable ? "Direct ÷ 1.12" : "Non-VAT"}):{" "}
                <strong>PHP {fmtPeso(taxSummary.netBase)}</strong>
              </p>
              <p style={{ margin: "0 0 2px 0", color: "#b45309" }}>
                Final Withholding VAT (5%):{" "}
                <strong>- PHP {fmtPeso(taxSummary.finalVat5)}</strong>
              </p>
              <p style={{ margin: "0 0 2px 0", color: "#1d4ed8" }}>
                Expanded Withholding Tax ({taxSummary.ewtRate}% EWT):{" "}
                <strong>- PHP {fmtPeso(taxSummary.ewtAmount)}</strong>
              </p>
              <p style={{ margin: "0 0 2px 0", color: "#7e22ce" }}>
                Statutory Retention ({taxSummary.retentionRate}%):{" "}
                <strong>- PHP {fmtPeso(taxSummary.retentionAmount)}</strong>
              </p>
              <p
                style={{
                  margin: "2px 0 0 0",
                  fontWeight: 800,
                  color: "#047857",
                }}
              >
                Net Disbursable Take-Home:{" "}
                <strong>PHP {fmtPeso(taxSummary.netPayable)}</strong>
              </p>
            </div>
          </div>
        </div>

        {[
          [
            "V. Technical Standards and Quality Requirements",
            torData.technicalStandards,
          ],
          ["VI. Delivery and Implementation Terms", torData.deliveryTerms],
          [
            "VII. Inspection, Testing, and Acceptance",
            torData.inspectionAndAcceptance,
          ],
          ["VIII. Payment and Documentary Requirements", torData.paymentTerms],
          [
            "IX. Warranty, Defects Liability, and Liquidated Damages",
            torData.warrantyAndLiquidatedDamages,
          ],
        ].map(([heading, entries]) => (
          <div key={String(heading)} style={{ marginBottom: "14px" }}>
            <h3
              style={{
                margin: "0 0 4px 0",
                fontSize: "11px",
                fontWeight: 800,
                textTransform: "uppercase",
                borderBottom: "1px solid #cbd5e1",
                paddingBottom: "2px",
                color: "#1e293b",
              }}
            >
              {heading}
            </h3>
            <ul
              style={{
                margin: "0",
                paddingLeft: "18px",
                fontSize: "9.5px",
                lineHeight: "1.4",
                color: "#334155",
              }}
            >
              {(entries as string[]).map((entry, i) => (
                <li key={i} style={{ marginBottom: "2px" }}>
                  {entry}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* SECTION 10: SIGNATORIES */}
        <div style={{ marginTop: "20px" }}>
          <h3
            style={{
              margin: "0 0 8px 0",
              fontSize: "10px",
              fontWeight: 800,
              textTransform: "uppercase",
              color: "#1e293b",
            }}
          >
            X. Official Approvals &amp; Concurrence
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "8px",
              textAlign: "center",
              fontSize: "8.5px",
            }}
          >
            {torData.signatories.map((sig, i) => (
              <div
                key={i}
                style={{ borderTop: "1px solid #0f172a", paddingTop: "6px" }}
              >
                <p
                  style={{
                    margin: "0 0 16px 0",
                    fontSize: "8px",
                    textTransform: "uppercase",
                    color: "#64748b",
                  }}
                >
                  {sig.label}
                </p>
                <p
                  style={{
                    margin: "0",
                    fontWeight: 800,
                    fontSize: "9px",
                    textDecoration: "underline",
                  }}
                >
                  {sig.name}
                </p>
                <p
                  style={{
                    margin: "2px 0 0 0",
                    fontWeight: 600,
                    color: "#334155",
                  }}
                >
                  {sig.title}
                </p>
                <p
                  style={{
                    margin: "1px 0 0 0",
                    fontSize: "7.5px",
                    color: "#64748b",
                  }}
                >
                  {sig.officeOrLicense}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* APPROVAL GATE MODAL */}
      <ApprovalGateModal
        isOpen={showApprovalGate}
        onClose={() => setShowApprovalGate(false)}
        docTitle={`Terms of Reference (TOR) - [${torData.projectRefNo}]`}
        trackingOrRefNo={torData.trackingNumber || torData.projectRefNo}
        approvalRecord={approvalRecord}
        onSubmitForApproval={() => {
          const newRec: DocumentApprovalRecord = {
            recordId: torData.trackingNumber || torData.projectRefNo,
            docType: "TOR",
            status: "PENDING_APPROVAL",
            submittedBy: currentUser?.fullName || "Preparer",
            submittedByRole: getRoleDisplayName(currentUser?.role),
            submittedAt: new Date().toISOString(),
          };
          saveDocumentApproval(tenant?.id || "default", newRec);
          setApprovalRecord(newRec);
          setShowApprovalGate(false);
          alert("Submitted for Manager / Owner approval!");
        }}
        onApprove={(notes) => {
          const newRec: DocumentApprovalRecord = {
            recordId: torData.trackingNumber || torData.projectRefNo,
            docType: "TOR",
            status: "APPROVED",
            approvedBy: currentUser?.fullName || "Authorized Approver",
            approvedByRole: getRoleDisplayName(currentUser?.role),
            approvedAt: new Date().toISOString(),
            notes: notes,
          };
          saveDocumentApproval(tenant?.id || "default", newRec);
          setApprovalRecord(newRec);
          setShowApprovalGate(false);
          if (approvalActionTarget === "EXPORT") {
            setTimeout(() => handleExportPdf(), 300);
          } else {
            setTimeout(() => handleSaveAndComplete(), 300);
          }
        }}
      />

      {generatedPdfPreview && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">
                  Generated Terms of Reference (TOR) PDF
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={generatedPdfPreview}
                  download={`${torData.projectRefNo}_TERMS_OF_REFERENCE_${torData.presetType}.pdf`}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => setGeneratedPdfPreview(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  title="Close PDF preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <iframe
              src={generatedPdfPreview}
              title="Generated Terms of Reference PDF preview"
              className="w-full flex-1 bg-slate-950"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const TermsOfReferenceModal: React.FC<TermsOfReferenceProps> = (
  props,
) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl max-h-[92vh] overflow-y-auto shadow-2xl animate-scaleIn my-auto">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Philippine Government Terms of Reference (TOR)
              </h3>
              <p className="text-xs text-slate-400">
                RA 9184 &amp; RA 12009 Statutory Procurement Template Hub
              </p>
            </div>
          </div>
          {props.onClose && (
            <button
              onClick={props.onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6">
          <TermsOfReferenceContent {...props} />
        </div>
      </div>
    </div>
  );
};

export const TOR: React.FC<TermsOfReferenceProps> = TermsOfReferenceModal;
export const TorModal: React.FC<TermsOfReferenceProps> = TermsOfReferenceModal;

export default TOR;

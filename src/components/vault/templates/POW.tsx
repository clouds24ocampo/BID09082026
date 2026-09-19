import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Tenant,
  PhilGEPSOpportunity,
  ProcurementType,
  isApproverRole,
  getRoleDisplayName,
} from "../../../types";
import { useAuth } from "../../../context/AuthContext";
import { PDFDocument } from "pdf-lib";
import html2canvas from "html2canvas";
import {
  getOpportunityProjects,
  OpportunityProjectOption,
  invalidateOpportunityProjectsCache,
  getDocumentApproval,
  saveDocumentApproval,
  DocumentApprovalRecord,
} from "../../../utils/opportunityProjects";
import {
  savePdfData,
  loadPdfData,
  deletePdfData,
} from "../../../utils/vaultIndexedDB";
import {
  buildMergedThreeLayerPdfDataUrl,
  ExportDocumentUnit,
} from "../../../utils/pdfExportEngine";
import { numberToWords } from "../../../utils/numberToWords";
import VaultErrorBoundary from "../../common/VaultErrorBoundary";
import ApprovalGateModal from "../../common/ApprovalGateModal";
import {
  X,
  Download,
  Plus,
  Trash2,
  FileCheck,
  CheckCircle2,
  Building2,
  FileSpreadsheet,
  DollarSign,
  Briefcase,
  Layers,
  Calculator,
  Eye,
  Upload,
  FileText,
  ShieldCheck,
  Sparkles,
  Tag,
  Receipt,
  UserCheck,
  Truck,
  RefreshCw,
  ArrowRight,
  FolderPlus,
  FileUp,
  Lock,
  Scale,
} from "lucide-react";
import { TermsOfReferenceContent } from "./TOR";

export type PowDocumentMode = "POW" | "QUOTATION";
export type TaxType = "VATABLE" | "NON_VAT";
export type ProjectTaxCategory = "GOODS" | "INFRA";

export interface TaxCalculationResult {
  isVatable: boolean;
  isInfra: boolean;
  grossAmount: number;
  netBase: number;
  outputVat12: number;
  finalVatRate: number; // 5% or 0%
  finalVat5: number;
  ewtRate: number; // 1% for Goods, 2% for Infra
  ewtAmount: number;
  retentionRate: number; // 1% statutory retention
  retentionAmount: number;
  totalDeductions: number;
  netPayable: number;
}

/**
 * Computes statutory Philippine Government taxes & deductions under BIR & RA 9184 / RA 12009:
 * - When VATable: Net base = Direct Cost / 1.12; 5% Final Withholding VAT applies.
 * - When Non-VAT: Net base = Direct Cost; 0% VAT applies.
 * - EWT (Income Withholding Tax): 1% if Goods & Supply; 2% if Infrastructure & Civil Works.
 * - Retention Money: 1% statutory retention for both Goods and Infra.
 * Also applied symmetrically to Labor Cost at the bottom.
 */
export function computeStatutoryTaxes(
  amount: number,
  taxType: TaxType = "VATABLE",
  projectCategory: ProjectTaxCategory = "GOODS",
  retentionPercent: number = 1,
): TaxCalculationResult {
  const grossAmount = Math.max(0, amount || 0);
  const isVatable = taxType === "VATABLE";
  const isInfra = projectCategory === "INFRA";
  const ewtRate = isInfra ? 2 : 1; // 1% Goods, 2% Infra
  const finalVatRate = isVatable ? 5 : 0;
  const retentionRate = retentionPercent > 0 ? retentionPercent : 1;

  // Direct / Labor Cost Base: direct cost / 1.12 if VATable
  const netBase = isVatable ? grossAmount / 1.12 : grossAmount;
  const outputVat12 = isVatable ? (grossAmount / 1.12) * 0.12 : 0;

  // 5% Final Withholding VAT
  const finalVat5 = isVatable ? (grossAmount / 1.12) * (finalVatRate / 100) : 0;

  // Expanded Withholding Tax (EWT: 1% Goods, 2% Infra on net base)
  const ewtAmount = netBase * (ewtRate / 100);

  // 1% Statutory Retention Money (1% of gross amount)
  const retentionAmount = grossAmount * (retentionRate / 100);

  // Total Statutory Deductions
  const totalDeductions = finalVat5 + ewtAmount + retentionAmount;

  // Net Disbursable / Take-Home
  const netPayable = grossAmount - totalDeductions;

  return {
    isVatable,
    isInfra,
    grossAmount,
    netBase,
    outputVat12,
    finalVatRate,
    finalVat5,
    ewtRate,
    ewtAmount,
    retentionRate,
    retentionAmount,
    totalDeductions,
    netPayable,
  };
}

export interface PowItem {
  id: string;
  itemNo: string;
  part: string;
  description: string;
  brandModel?: string; // Brand & Model specification for quotation
  quantity: number;
  unit: string;
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  ocmRate: number; // % Overhead, Contingency, Misc (standard: 8% - 12%)
  profitRate: number; // % Contractor Profit (standard: 8% - 10%)
  vatRate: number; // % Value Added Tax (standard: 5% - 12%)
  directUnitPrice?: number; // Direct quotation unit price override if desired
  statementOfCompliance?: string; // e.g. "COMPLY" / "BIDDER COMPLIED"
}

export type PowTabType = "matrix" | "summary" | "signatories" | "tor" | "dr" | "print";

export interface PowModalProps {
  item?: { id: string; code: string; name: string };
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  procuringEntityAddress?: string;
  procuringEntityContactPerson?: string;
  headOfProcuringEntity?: string;
  headOfProcuringEntityPosition?: string;
  solicitationNumber?: string;
  contractAmount?: number;
  projectLocation?: string;
  dateTimeSubmitted?: string;
  initialMode?: PowDocumentMode;
  initialTab?: PowTabType;
  onSaveAndComplete?: (
    fileDataUrl?: string,
    customName?: string,
    projectRefNo?: string,
    projectTitle?: string,
  ) => void;
  onClose?: () => void;
  setActiveTab?: (tab: string) => void;
}

const fmtPeso = (val: number): string => {
  if (val === 0 || isNaN(val)) return "0.00";
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Generates an automatic immutable tracking identifier in statutory datetime format:
 * YYYY-MM-DD-HHmm-[ALPHANUMERIC]
 * Example: 2026-01-01-1300-8F2K (Year 2026, Month 01, Day 01, Time 13:00 / 1pm, 4-character alphanumeric)
 * Cannot be edited nor changed.
 */
export const generateDateTimeTrackingId = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  // Random 4-character uppercase alphanumeric code (A-Z, 0-9)
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let randStr = "";
  for (let i = 0; i < 4; i++) {
    randStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `${year}-${month}-${day}-${hours}${minutes}-${randStr}`;
};

export function getPowCompletionMessage(
  docMode: PowDocumentMode,
  hasProjectCallback: boolean,
): string {
  const label =
    docMode === "POW" ? "Program of Work (POW)" : "Formal Price Quotation";

  if (hasProjectCallback) {
    return `${label} saved to this project's statutory records next to the Terms of Reference (TOR) and not added to the bidding document vault.`;
  }
  return `${label} saved to project records next to the TOR. It was not submitted to the bidding document vault.`;
}

// ─── Standard Presets ─────────────────────────────────────────────────────────

const PRESET_ROAD_DRAINAGE: PowItem[] = [
  {
    id: "pow-rd-1",
    itemNo: "A.1.1(8)",
    part: "PART A: FACILITIES FOR THE ENGINEER",
    description: "Provision of Field Office for the Engineer (Rental Basis)",
    brandModel: "Standard Site Facility",
    quantity: 5.0,
    unit: "mo.",
    materialCost: 0,
    laborCost: 0,
    equipmentCost: 125000,
    ocmRate: 8,
    profitRate: 8,
    vatRate: 5,
    statementOfCompliance: "COMPLY",
  },
  {
    id: "pow-rd-2",
    itemNo: "B.5",
    part: "PART B: OTHER GENERAL REQUIREMENTS",
    description:
      "Project Billboard / Signboard (8ft x 8ft DPWH & COA Specifications)",
    brandModel: 'Tarpaulin on 1/2" Marine Plywood w/ Coco Lumber Frame',
    quantity: 2.0,
    unit: "ea.",
    materialCost: 12000,
    laborCost: 4500,
    equipmentCost: 1500,
    ocmRate: 8,
    profitRate: 8,
    vatRate: 5,
    statementOfCompliance: "COMPLY",
  },
  {
    id: "pow-rd-3",
    itemNo: "B.7(2)",
    part: "PART B: OTHER GENERAL REQUIREMENTS",
    description:
      "Occupational Safety and Health Program (PPE, First Aid, Safety Signages)",
    brandModel: "DOLE-OSH Certified Standard Kit",
    quantity: 1.0,
    unit: "l.s.",
    materialCost: 65000,
    laborCost: 45000,
    equipmentCost: 10000,
    ocmRate: 8,
    profitRate: 8,
    vatRate: 5,
    statementOfCompliance: "COMPLY",
  },
  {
    id: "pow-rd-4",
    itemNo: "101(1)",
    part: "PART C: EARTHWORK",
    description:
      "Clearing and Grubbing (with Disposal of Unsuitable Materials)",
    brandModel: "Heavy Equipment Clearing",
    quantity: 3200.0,
    unit: "sq.m.",
    materialCost: 0,
    laborCost: 48000,
    equipmentCost: 128000,
    ocmRate: 9,
    profitRate: 8,
    vatRate: 5,
    statementOfCompliance: "COMPLY",
  },
  {
    id: "pow-rd-5",
    itemNo: "200(1)",
    part: "PART D: SUBBASE AND BASE COURSE",
    description:
      "Aggregate Subbase Course (200mm compacted thickness, Item 200 specifications)",
    brandModel: "DPWH Item 200 Calibrated Aggregates",
    quantity: 640.0,
    unit: "cu.m.",
    materialCost: 768000,
    laborCost: 89600,
    equipmentCost: 179200,
    ocmRate: 8,
    profitRate: 8,
    vatRate: 5,
    statementOfCompliance: "COMPLY",
  },
  {
    id: "pow-rd-6",
    itemNo: "311(1)a",
    part: "PART E: SURFACE COURSES",
    description:
      "Portland Cement Concrete Pavement (Unreinforced, 280mm thk, 14 days, Class A)",
    brandModel: "Ready-Mix Concrete (3,500 psi @ 14 days)",
    quantity: 3200.0,
    unit: "sq.m.",
    materialCost: 3840000,
    laborCost: 384000,
    equipmentCost: 512000,
    ocmRate: 7,
    profitRate: 8,
    vatRate: 5,
    statementOfCompliance: "COMPLY",
  },
];

const PRESET_GOODS_QUOTATION: PowItem[] = [
  {
    id: "quote-1",
    itemNo: "Item 1",
    part: "IT EQUIPMENT & COMPUTING HARDWARE",
    description:
      "Executive Workstation Laptop (Core i7-13th Gen / Ryzen 7, 32GB DDR5, 1TB NVMe SSD, Win 11 Pro)",
    brandModel: "Dell Latitude 5540 / Lenovo ThinkPad E16 Gen 2",
    quantity: 8,
    unit: "units",
    materialCost: 520000,
    laborCost: 15000,
    equipmentCost: 0,
    ocmRate: 4,
    profitRate: 8,
    vatRate: 5,
    statementOfCompliance: "COMPLY",
  },
  {
    id: "quote-2",
    itemNo: "Item 2",
    part: "OFFICE AUTOMATION & PRINTING",
    description:
      "Heavy-Duty Network Monochrome Laser Multi-Function Printer (A4/Legal Duplex, ADF, 42 ppm, Network/Wi-Fi)",
    brandModel: "HP LaserJet Enterprise MFP M528dn",
    quantity: 3,
    unit: "units",
    materialCost: 165000,
    laborCost: 8000,
    equipmentCost: 0,
    ocmRate: 4,
    profitRate: 8,
    vatRate: 5,
    statementOfCompliance: "COMPLY",
  },
  {
    id: "quote-3",
    itemNo: "Item 3",
    part: "POWER BACKUP & VOLTAGE REGULATION",
    description:
      "1500VA / 900W Line-Interactive Uninterruptible Power Supply (UPS) with Automatic Voltage Regulation (AVR)",
    brandModel: "APC Smart-UPS SMC1500IC",
    quantity: 8,
    unit: "units",
    materialCost: 120000,
    laborCost: 5000,
    equipmentCost: 0,
    ocmRate: 4,
    profitRate: 8,
    vatRate: 5,
    statementOfCompliance: "COMPLY",
  },
  {
    id: "quote-4",
    itemNo: "Item 4",
    part: "TECHNICAL SERVICES & DEPLOYMENT",
    description:
      "Delivery, On-site Hardware Staging, OS Licensing Activation, Local Domain Integration, and User Orientation",
    brandModel: "Turnkey Technical Implementation",
    quantity: 1,
    unit: "l.s.",
    materialCost: 0,
    laborCost: 35000,
    equipmentCost: 5000,
    ocmRate: 4,
    profitRate: 8,
    vatRate: 5,
    statementOfCompliance: "COMPLY",
  },
];

export const POWModalContent: React.FC<PowModalProps> = ({
  item,
  tenant,
  activeProjectRefNo = "",
  activeProjectTitle = "",
  activeProcuringEntity = "",
  procuringEntityAddress = "",
  procuringEntityContactPerson = "",
  headOfProcuringEntity: propHeadOfProcuringEntity = "",
  headOfProcuringEntityPosition: propHeadOfProcuringEntityPosition = "",
  solicitationNumber: propSolicitationNumber = "",
  contractAmount: propContractAmount = 0,
  projectLocation: propProjectLocation = "",
  dateTimeSubmitted: propDateTimeSubmitted = "",
  initialMode = "POW",
  initialTab,
  onSaveAndComplete,
  onClose,
  setActiveTab: setAppActiveTab,
}) => {
  const todayStr = new Date().toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Mode: Program of Work vs Formal Price Quotation (RFQ)
  const [docMode, setDocMode] = useState<PowDocumentMode>(initialMode);

  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>(
    [],
  );
  const [selectedOppId, setSelectedOppId] = useState<string>("");

  // Government Header Fields
  const [procuringEntity, setProcuringEntity] = useState<string>(
    activeProjectTitle
      ? activeProcuringEntity || "DEPARTMENT OF PUBLIC WORKS AND HIGHWAYS"
      : "DEPARTMENT OF PUBLIC WORKS AND HIGHWAYS",
  );
  const [implementingOffice, setImplementingOffice] = useState<string>(
    "Planning & Design Section / Bids and Awards Committee",
  );
  const [projectTitle, setProjectTitle] = useState<string>(
    activeProjectTitle ||
      "CONSTRUCTION / REHABILITATION OF PUBLIC INFRASTRUCTURE & SUPPLY",
  );
  const [projectRefNo, setProjectRefNo] = useState<string>(
    activeProjectRefNo || "PRJ-2026-INFRA-001",
  );
  const [projectLocation, setProjectLocation] = useState<string>(
    propProjectLocation || "Metro Manila, Philippines",
  );
  const [sourceOfFunds, setSourceOfFunds] = useState<string>(
    "GAA FY 2026 / Local Development Fund",
  );
  const [projectDurationDays, setProjectDurationDays] =
    useState<string>("150 Calendar Days");
  const [appropriationAmount, setAppropriationAmount] = useState<number>(
    propContractAmount ? propContractAmount * 1.05 : 10000000,
  );
  const [targetStartDate, setTargetStartDate] = useState<string>(
    "Upon Issuance of Notice to Proceed (NTP)",
  );
  const [targetCompletionDate, setTargetCompletionDate] =
    useState<string>("150 Days after NTP");
  const [contractorName, setContractorName] = useState<string>(
    tenant?.companyName || "Apex Cloud & Infrastructure Builders Corp.",
  );
  const [contractorAddress, setContractorAddress] = useState<string>(
    tenant?.address || "Ortigas Center, Pasig City, Metro Manila",
  );
  const [contractorTin, setContractorTin] = useState<string>(
    tenant?.tin || "008-991-234-000",
  );
  const [contractorPhilgeps, setContractorPhilgeps] = useState<string>(
    tenant?.philgepsPlatinumNo || "PLATINUM-2026-009841",
  );

  // Quotation Specific Fields
  const [rfqNumber, setRfqNumber] = useState<string>(
    activeProjectRefNo ? `RFQ-${activeProjectRefNo}` : "RFQ-2026-09-0042",
  );
  const [canvassDate] = useState<string>(todayStr);
  const [priceValidity, setPriceValidity] =
    useState<string>("90 Calendar Days");
  const [deliveryPeriod, setDeliveryPeriod] = useState<string>(
    "15 Calendar Days upon receipt of Purchase Order / NTP",
  );
  const [paymentTerms, setPaymentTerms] = useState<string>(
    "Government Net 30 Days upon inspection and final acceptance",
  );
  const [warrantyTerms, setWarrantyTerms] = useState<string>(
    "One (1) Year for Equipment / Parts, 3 Months for Services",
  );
  const [canvasserName, setCanvasserName] = useState<string>(
    procuringEntityContactPerson || "BAC Canvasser / Secretariat",
  );

  // Unique Document Tracking Identifier: System Auto-Generated, strictly immutable (YYYY-MM-DD-HHmm-XXXX)
  const [trackingNumber, setTrackingNumber] = useState<string>(() =>
    generateDateTimeTrackingId(),
  );

  // Procurement Route: 'BIDDING' (Auto-inputs to Section VI) vs 'DIRECT_PURCHASE' (Auto-generates Delivery Receipt)
  const [procurementPurpose, setProcurementPurpose] = useState<
    "BIDDING" | "DIRECT_PURCHASE"
  >(initialMode === "POW" ? "BIDDING" : "DIRECT_PURCHASE");

  // Statutory Tax Regime & Government Deductions (BIR / RA 9184 / RA 12009)
  // VATable (Base = Direct Cost / 1.12) vs Non-VAT (Base = Direct Cost)
  const [taxType, setTaxType] = useState<TaxType>("VATABLE");
  // Goods (5% VAT + 1% EWT + 1% Retention) vs Infra (5% VAT + 2% EWT + 1% Retention)
  const [projectTaxCategory, setProjectTaxCategory] =
    useState<ProjectTaxCategory>(initialMode === "POW" ? "INFRA" : "GOODS");
  // Statutory 1% Retention Money
  const [retentionRate, setRetentionRate] = useState<number>(1);

  const { currentUser } = useAuth();

  // Approval Workflow State
  const [approvalStatus, setApprovalStatus] = useState<
    "DRAFT" | "PENDING_APPROVAL" | "APPROVED"
  >("DRAFT");
  const [submittedByUserName, setSubmittedByUserName] = useState<string>("");
  const [submittedByRole, setSubmittedByRole] = useState<string>("");
  const [submittedAt, setSubmittedAt] = useState<string>("");
  const [approvedByUserName, setApprovedByUserName] = useState<string>("");
  const [approvedByRole, setApprovedByRole] = useState<string>("");
  const [approvedAt, setApprovedAt] = useState<string>("");
  const [approvalNotes, setApprovalNotes] = useState<string>("");
  const [showApprovalGateModal, setShowApprovalGateModal] =
    useState<boolean>(false);
  const [deliveryReceiptNo, setDeliveryReceiptNo] = useState<string>(
    () => `DR-${generateDateTimeTrackingId()}`,
  );
  const [syncNotification, setSyncNotification] = useState<string>("");
  const [isExportingDr, setIsExportingDr] = useState<boolean>(false);

  // Opportunity Finder Bridge & PhilGEPS PDF Ingestion State
  const [showCreateOpportunityModal, setShowCreateOpportunityModal] =
    useState<boolean>(false);
  const [philgepsNoticePdfFile, setPhilgepsNoticePdfFile] =
    useState<File | null>(null);
  const [philgepsNoticePdfName, setPhilgepsNoticePdfName] =
    useState<string>("");
  const [philgepsNoticePdfDataUrl, setPhilgepsNoticePdfDataUrl] =
    useState<string>("");
  const [oppPhilgepsRefNo, setOppPhilgepsRefNo] = useState<string>("11823901");
  const [oppSolicitationNo, setOppSolicitationNo] = useState<string>(
    () => `SOL-${generateDateTimeTrackingId()}`,
  );
  const [oppTitle, setOppTitle] = useState<string>(
    activeProjectTitle ||
      "CONSTRUCTION / REHABILITATION OF PUBLIC INFRASTRUCTURE & SUPPLY",
  );
  const [oppProcuringEntity, setOppProcuringEntity] = useState<string>(
    activeProcuringEntity || "DEPARTMENT OF PUBLIC WORKS AND HIGHWAYS",
  );
  const [oppLocation, setOppLocation] = useState<string>(
    propProjectLocation || "Metro Manila, Philippines",
  );
  const [oppAbc, setOppAbc] = useState<number>(
    propContractAmount ? propContractAmount * 1.05 : 10000000,
  );
  const [oppProcurementType, setOppProcurementType] = useState<ProcurementType>(
    initialMode === "POW" ? "Infrastructure" : "Goods & Supply",
  );
  const [oppDeadline, setOppDeadline] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 21);
    d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [isCreatingOpp, setIsCreatingOpp] = useState<boolean>(false);
  const [createdOppResult, setCreatedOppResult] =
    useState<PhilGEPSOpportunity | null>(null);

  const philgepsInputRef = useRef<HTMLInputElement>(null);

  // Items
  const [items, setItems] = useState<PowItem[]>(PRESET_ROAD_DRAINAGE);

  // Active View Tab: 'matrix' | 'summary' | 'signatories' | 'tor' | 'dr' | 'print'
  const [activeTab, setActiveTab] = useState<PowTabType>(
    initialTab || (initialMode === "POW" ? "matrix" : "matrix"),
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Terms of Reference (TOR) Upload & PDF Storage
  const [torPdfDataUrl, setTorPdfDataUrl] = useState<string>("");
  const [torPdfFileName, setTorPdfFileName] = useState<string>("");
  const [torPdfFileSize, setTorPdfFileSize] = useState<string>("");
  const [torPdfUploadDate, setTorPdfUploadDate] = useState<string>("");
  const [appendTorToPdf, setAppendTorToPdf] = useState<boolean>(true);
  const [showTorPreviewModal, setShowTorPreviewModal] =
    useState<boolean>(false);
  const [torMode, setTorMode] = useState<"GENERATE" | "UPLOAD">("GENERATE");

  // Signatories (POW Standard 4-Tier Hierarchy)
  const [preparedByName, setPreparedByName] = useState<string>(
    "Engr. Mark Angelo D. Santos",
  );
  const [preparedByTitle, setPreparedByTitle] = useState<string>(
    "Project Engineer / Cost Estimator",
  );
  const [preparedByPrc, setPreparedByPrc] = useState<string>(
    "PRC Reg. No. 0149822 | PTR No. 8921044",
  );

  const [checkedByName, setCheckedByName] = useState<string>(
    "Engr. Carmela R. Bautista",
  );
  const [checkedByTitle, setCheckedByTitle] = useState<string>(
    "Chief, Planning & Design Section",
  );
  const [checkedByOffice, setCheckedByOffice] = useState<string>(
    "Planning & Design Section",
  );

  const [recommendingApprovalName, setRecommendingApprovalName] =
    useState<string>("Engr. Roberto M. Gomez");
  const [recommendingApprovalTitle, setRecommendingApprovalTitle] =
    useState<string>("BAC Chairperson / Assistant District Engineer");
  const [recommendingApprovalOffice, setRecommendingApprovalOffice] =
    useState<string>("Bids and Awards Committee");

  const [approvedByName, setApprovedByName] = useState<string>(
    propHeadOfProcuringEntity || "Hon. Juanito C. Dela Cruz",
  );
  const [approvedByTitle, setApprovedByTitle] = useState<string>(
    propHeadOfProcuringEntityPosition || "Head of Procuring Entity (HOPE)",
  );
  const [approvedByOffice, setApprovedByOffice] = useState<string>(
    "Head of the Procuring Entity",
  );

  // Signatories (Quotation Standard)
  const [canvasserTitle, setCanvasserTitle] = useState<string>(
    "BAC Secretariat / Official Canvasser",
  );
  const [canvasserOffice, setCanvasserOffice] = useState<string>(
    procuringEntity || "Procuring Entity",
  );
  const [signatoryName, setSignatoryName] = useState<string>(
    tenant?.authorizedSignatory?.name || "Engr. Ferdinand R. Valenzuela",
  );
  const [signatoryTitle, setSignatoryTitle] = useState<string>(
    tenant?.authorizedSignatory?.title ||
      "President & Authorized Managing Officer",
  );

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [printOrientation, setPrintOrientation] = useState<
    "landscape" | "portrait"
  >("landscape");

  const torInputRef = useRef<HTMLInputElement>(null);
  const projectScopeKey = (
    projectRefNo ||
    selectedOppId ||
    activeProjectRefNo ||
    "default"
  ).replace(/[^a-zA-Z0-9]/g, "_");

  // Mathematical Calculations
  const calculatedRows = useMemo(() => {
    const isVatable = taxType === "VATABLE";
    return items.map((it) => {
      const directCost =
        (it.materialCost || 0) + (it.laborCost || 0) + (it.equipmentCost || 0);
      const ocmCost = directCost * ((it.ocmRate || 0) / 100);
      const profitCost = directCost * ((it.profitRate || 0) / 100);
      // Effective VAT: 0% if Non-VAT; configured rate if VATable
      const effectiveVatRate = isVatable ? (it.vatRate ?? 5) : 0;
      const vatCost =
        (directCost + ocmCost + profitCost) * (effectiveVatRate / 100);
      const indirectCost = ocmCost + profitCost + vatCost;
      const totalCost = directCost + indirectCost;
      const unitCost = it.quantity > 0 ? totalCost / it.quantity : totalCost;

      // Item Statutory Tax Calculation
      const itemTax = computeStatutoryTaxes(
        directCost,
        taxType,
        projectTaxCategory,
        retentionRate,
      );
      const laborTax = computeStatutoryTaxes(
        it.laborCost || 0,
        taxType,
        projectTaxCategory,
        retentionRate,
      );

      return {
        ...it,
        directCost,
        ocmCost,
        profitCost,
        vatCost,
        indirectCost,
        totalCost,
        unitCost,
        itemTax,
        laborTax,
      };
    });
  }, [items, taxType, projectTaxCategory, retentionRate]);

  const totals = useMemo(() => {
    let totalMaterial = 0;
    let totalLabor = 0;
    let totalEquipment = 0;
    let totalDirect = 0;
    let totalOcm = 0;
    let totalProfit = 0;
    let totalVat = 0;
    let totalIndirect = 0;
    let grandTotal = 0;

    for (const r of calculatedRows) {
      totalMaterial += r.materialCost || 0;
      totalLabor += r.laborCost || 0;
      totalEquipment += r.equipmentCost || 0;
      totalDirect += r.directCost;
      totalOcm += r.ocmCost;
      totalProfit += r.profitCost;
      totalVat += r.vatCost;
      totalIndirect += r.indirectCost;
      grandTotal += r.totalCost;
    }

    // Comprehensive Statutory Tax & Retention Schedule (Direct Cost)
    const directCostTax = computeStatutoryTaxes(
      totalDirect,
      taxType,
      projectTaxCategory,
      retentionRate,
    );

    // Comprehensive Labor Cost Specific Tax Schedule (Labor Cost at the bottom with same tax)
    const laborTax = computeStatutoryTaxes(
      totalLabor,
      taxType,
      projectTaxCategory,
      retentionRate,
    );

    const rowsWithWeight = calculatedRows.map((r) => ({
      ...r,
      weightPercent: grandTotal > 0 ? (r.totalCost / grandTotal) * 100 : 0,
    }));

    return {
      totalMaterial,
      totalLabor,
      totalEquipment,
      totalDirect,
      totalOcm,
      totalProfit,
      totalVat,
      totalIndirect,
      grandTotal,
      rowsWithWeight,
      // Direct Cost Tax & Retention
      directCostTax,
      // Labor Cost Tax & Retention
      laborTax,
      // Convenience aliases
      isVatable: directCostTax.isVatable,
      isInfra: directCostTax.isInfra,
      ewtRate: directCostTax.ewtRate,
      finalVatRate: directCostTax.finalVatRate,
      retentionRate: directCostTax.retentionRate,
      directCostNetBase: directCostTax.netBase,
      directCostFinalVat5: directCostTax.finalVat5,
      directCostEwt: directCostTax.ewtAmount,
      directCostRetention: directCostTax.retentionAmount,
      directCostTotalDeductions: directCostTax.totalDeductions,
      directCostNetPayable: directCostTax.netPayable,
      // Labor Breakdown aliases
      laborNetBase: laborTax.netBase,
      laborFinalVat5: laborTax.finalVat5,
      laborEwt: laborTax.ewtAmount,
      laborRetention: laborTax.retentionAmount,
      laborTotalDeductions: laborTax.totalDeductions,
      netLaborPayable: laborTax.netPayable,
    };
  }, [calculatedRows, taxType, projectTaxCategory, retentionRate]);

  // Load from Storage
  useEffect(() => {
    const tenantId = tenant?.id || "default";
    const list = getOpportunityProjects(tenantId);
    setOppProjects(list);

    if (tenant?.companyName) setContractorName(tenant.companyName);
    if (tenant?.address) setContractorAddress(tenant.address);
    if (tenant?.tin) setContractorTin(tenant.tin);
    if (tenant?.philgepsPlatinumNo)
      setContractorPhilgeps(tenant.philgepsPlatinumNo);
    if (tenant?.authorizedSignatory?.name)
      setSignatoryName(tenant.authorizedSignatory.name);
    if (tenant?.authorizedSignatory?.title)
      setSignatoryTitle(tenant.authorizedSignatory.title);

    const storageKey = `bidocs_pow_${tenantId}_${projectScopeKey}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.docMode) setDocMode(parsed.docMode);
        if (parsed.procuringEntity) setProcuringEntity(parsed.procuringEntity);
        if (parsed.implementingOffice)
          setImplementingOffice(parsed.implementingOffice);
        if (parsed.projectTitle) setProjectTitle(parsed.projectTitle);
        if (parsed.projectRefNo) setProjectRefNo(parsed.projectRefNo);
        if (parsed.projectLocation) setProjectLocation(parsed.projectLocation);
        if (parsed.sourceOfFunds) setSourceOfFunds(parsed.sourceOfFunds);
        if (parsed.projectDurationDays)
          setProjectDurationDays(parsed.projectDurationDays);
        if (parsed.appropriationAmount)
          setAppropriationAmount(parsed.appropriationAmount);
        if (parsed.targetStartDate) setTargetStartDate(parsed.targetStartDate);
        if (parsed.targetCompletionDate)
          setTargetCompletionDate(parsed.targetCompletionDate);
        if (parsed.contractorName) setContractorName(parsed.contractorName);
        if (parsed.rfqNumber) setRfqNumber(parsed.rfqNumber);
        if (parsed.priceValidity) setPriceValidity(parsed.priceValidity);
        if (parsed.deliveryPeriod) setDeliveryPeriod(parsed.deliveryPeriod);
        if (parsed.paymentTerms) setPaymentTerms(parsed.paymentTerms);
        if (parsed.warrantyTerms) setWarrantyTerms(parsed.warrantyTerms);
        if (parsed.canvasserName) setCanvasserName(parsed.canvasserName);
        if (
          parsed.items &&
          Array.isArray(parsed.items) &&
          parsed.items.length > 0
        ) {
          setItems(parsed.items);
        }
        if (parsed.torPdfFileName) setTorPdfFileName(parsed.torPdfFileName);
        if (parsed.torPdfFileSize) setTorPdfFileSize(parsed.torPdfFileSize);
        if (parsed.torPdfUploadDate)
          setTorPdfUploadDate(parsed.torPdfUploadDate);
        if (parsed.preparedByName) setPreparedByName(parsed.preparedByName);
        if (parsed.preparedByTitle) setPreparedByTitle(parsed.preparedByTitle);
        if (parsed.preparedByPrc) setPreparedByPrc(parsed.preparedByPrc);
        if (parsed.checkedByName) setCheckedByName(parsed.checkedByName);
        if (parsed.checkedByTitle) setCheckedByTitle(parsed.checkedByTitle);
        if (parsed.checkedByOffice) setCheckedByOffice(parsed.checkedByOffice);
        if (parsed.recommendingApprovalName)
          setRecommendingApprovalName(parsed.recommendingApprovalName);
        if (parsed.recommendingApprovalTitle)
          setRecommendingApprovalTitle(parsed.recommendingApprovalTitle);
        if (parsed.recommendingApprovalOffice)
          setRecommendingApprovalOffice(parsed.recommendingApprovalOffice);
        if (parsed.approvedByName) setApprovedByName(parsed.approvedByName);
        if (parsed.approvedByTitle) setApprovedByTitle(parsed.approvedByTitle);
        if (parsed.approvedByOffice)
          setApprovedByOffice(parsed.approvedByOffice);
        if (parsed.canvasserTitle) setCanvasserTitle(parsed.canvasserTitle);
        if (parsed.canvasserOffice) setCanvasserOffice(parsed.canvasserOffice);
        if (parsed.signatoryName) setSignatoryName(parsed.signatoryName);
        if (parsed.signatoryTitle) setSignatoryTitle(parsed.signatoryTitle);
        if (parsed.trackingNumber) {
          // Strip any POW or RFQ in the beginning
          const cleanTracking = parsed.trackingNumber.replace(
            /^(POW|RFQ|QUOT)-?/i,
            "",
          );
          const isOldDummy =
            /^\d{4}-\d{2}-\d{3,4}$/.test(cleanTracking) ||
            cleanTracking === "2026-INFRA-001" ||
            cleanTracking === "2026-09-0022" ||
            cleanTracking === "2026-09-001" ||
            /^(POW|RFQ)/i.test(parsed.trackingNumber);
          if (
            isOldDummy ||
            !/^\d{4}-\d{2}-\d{2}-\d{4}-[A-Z0-9]+/i.test(cleanTracking)
          ) {
            const upgraded = generateDateTimeTrackingId();
            setTrackingNumber(upgraded);
            setDeliveryReceiptNo(`DR-${upgraded}`);
          } else {
            setTrackingNumber(cleanTracking);
            if (parsed.deliveryReceiptNo) {
              setDeliveryReceiptNo(
                parsed.deliveryReceiptNo.replace(
                  /^DR-(POW|RFQ|QUOT)-?/i,
                  "DR-",
                ),
              );
            } else {
              setDeliveryReceiptNo(`DR-${cleanTracking}`);
            }
          }
        }
        if (parsed.procurementPurpose)
          setProcurementPurpose(parsed.procurementPurpose);
        if (parsed.approvalStatus) setApprovalStatus(parsed.approvalStatus);
        if (parsed.submittedByUserName)
          setSubmittedByUserName(parsed.submittedByUserName);
        if (parsed.submittedByRole) setSubmittedByRole(parsed.submittedByRole);
        if (parsed.submittedAt) setSubmittedAt(parsed.submittedAt);
        if (parsed.approvedByName || parsed.approvedByUserName)
          setApprovedByUserName(
            parsed.approvedByUserName || parsed.approvedByName,
          );
        if (parsed.approvedByRole) setApprovedByRole(parsed.approvedByRole);
        if (parsed.approvedAt) setApprovedAt(parsed.approvedAt);
        if (parsed.approvalNotes) setApprovalNotes(parsed.approvalNotes);

        if (parsed.taxType) setTaxType(parsed.taxType);
        if (parsed.projectTaxCategory)
          setProjectTaxCategory(parsed.projectTaxCategory);
        if (parsed.retentionRate !== undefined)
          setRetentionRate(parsed.retentionRate);

        // Check canonical approval record
        const activeTrack =
          parsed.trackingNumber?.replace(/^(POW|RFQ|QUOT)-?/i, "") ||
          trackingNumber;
        const appRec = getDocumentApproval(tenantId, activeTrack);
        if (appRec) {
          setApprovalStatus(appRec.status);
          if (appRec.submittedBy) setSubmittedByUserName(appRec.submittedBy);
          if (appRec.submittedByRole)
            setSubmittedByRole(appRec.submittedByRole);
          if (appRec.submittedAt) setSubmittedAt(appRec.submittedAt);
          if (appRec.approvedBy) setApprovedByUserName(appRec.approvedBy);
          if (appRec.approvedByRole) setApprovedByRole(appRec.approvedByRole);
          if (appRec.approvedAt) setApprovedAt(appRec.approvedAt);
          if (appRec.notes) setApprovalNotes(appRec.notes);
        }
      }
    } catch (e) {
      console.error("[POW] Storage load error:", e);
    }

    // Load TOR PDF from IndexedDB
    const torDbKey = `proj_pow_tor_pdf_${tenantId}_${projectScopeKey}`;
    loadPdfData(torDbKey)
      .then((data) => {
        if (data) setTorPdfDataUrl(data);
      })
      .catch(console.error);

    // Link Opportunity if found
    if (list.length > 0 && !selectedOppId) {
      const match = activeProjectRefNo
        ? list.find((p) => p.refNo === activeProjectRefNo)
        : null;
      const target = match || list[0];
      if (target) {
        setSelectedOppId(target.id);
        setProjectTitle(target.title);
        setProjectRefNo(target.refNo);
        setRfqNumber(`RFQ-${target.refNo}`);
        setProcuringEntity(target.procuringEntity);
        const amt = Number(
          (target as any).abc || (target as any).contractAmount || 0,
        );
        if (amt > 0) setAppropriationAmount(amt * 1.05);
      }
    }
  }, [tenant, activeProjectRefNo, projectScopeKey]);

  const handleSaveState = (
    customItems?: PowItem[],
    newTorName?: string,
    overrideMode?: PowDocumentMode,
    customSignatories?: {
      preparedByName?: string;
      preparedByTitle?: string;
      preparedByPrc?: string;
      checkedByName?: string;
      checkedByTitle?: string;
      checkedByOffice?: string;
      recommendingApprovalName?: string;
      recommendingApprovalTitle?: string;
      recommendingApprovalOffice?: string;
      approvedByName?: string;
      approvedByTitle?: string;
      approvedByOffice?: string;
      canvasserName?: string;
      canvasserTitle?: string;
      canvasserOffice?: string;
      signatoryName?: string;
      signatoryTitle?: string;
    },
    customTracking?: {
      trackingNumber?: string;
      procurementPurpose?: "BIDDING" | "DIRECT_PURCHASE";
      approvalStatus?: "DRAFT" | "PENDING_APPROVAL" | "APPROVED";
      submittedByUserName?: string;
      submittedByRole?: string;
      submittedAt?: string;
      approvedByUserName?: string;
      approvedByRole?: string;
      approvedAt?: string;
      approvalNotes?: string;
      deliveryReceiptNo?: string;
    },
    customTax?: {
      taxType?: TaxType;
      projectTaxCategory?: ProjectTaxCategory;
      retentionRate?: number;
    },
  ) => {
    const tenantId = tenant?.id || "default";
    const storageKey = `bidocs_pow_${tenantId}_${projectScopeKey}`;
    const payload = {
      docMode: overrideMode || docMode,
      taxType: customTax?.taxType !== undefined ? customTax.taxType : taxType,
      projectTaxCategory:
        customTax?.projectTaxCategory !== undefined
          ? customTax.projectTaxCategory
          : projectTaxCategory,
      retentionRate:
        customTax?.retentionRate !== undefined
          ? customTax.retentionRate
          : retentionRate,
      procuringEntity,
      implementingOffice,
      projectTitle,
      projectRefNo,
      projectLocation,
      sourceOfFunds,
      projectDurationDays,
      appropriationAmount,
      targetStartDate,
      targetCompletionDate,
      contractorName,
      contractorAddress,
      contractorTin,
      contractorPhilgeps,
      rfqNumber,
      canvassDate,
      priceValidity,
      deliveryPeriod,
      paymentTerms,
      warrantyTerms,
      trackingNumber:
        customTracking?.trackingNumber !== undefined
          ? customTracking.trackingNumber
          : trackingNumber,
      procurementPurpose:
        customTracking?.procurementPurpose !== undefined
          ? customTracking.procurementPurpose
          : procurementPurpose,
      approvalStatus:
        customTracking?.approvalStatus !== undefined
          ? customTracking.approvalStatus
          : approvalStatus,
      submittedByUserName:
        customTracking?.submittedByUserName !== undefined
          ? customTracking.submittedByUserName
          : submittedByUserName,
      submittedByRole:
        customTracking?.submittedByRole !== undefined
          ? customTracking.submittedByRole
          : submittedByRole,
      submittedAt:
        customTracking?.submittedAt !== undefined
          ? customTracking.submittedAt
          : submittedAt,
      approvedByUserName:
        customTracking?.approvedByUserName !== undefined
          ? customTracking.approvedByUserName
          : approvedByUserName,
      approvedByRole:
        customTracking?.approvedByRole !== undefined
          ? customTracking.approvedByRole
          : approvedByRole,
      approvedAt:
        customTracking?.approvedAt !== undefined
          ? customTracking.approvedAt
          : approvedAt,
      approvalNotes:
        customTracking?.approvalNotes !== undefined
          ? customTracking.approvalNotes
          : approvalNotes,
      deliveryReceiptNo:
        customTracking?.deliveryReceiptNo !== undefined
          ? customTracking.deliveryReceiptNo
          : deliveryReceiptNo,
      canvasserName:
        customSignatories?.canvasserName !== undefined
          ? customSignatories.canvasserName
          : canvasserName,
      canvasserTitle:
        customSignatories?.canvasserTitle !== undefined
          ? customSignatories.canvasserTitle
          : canvasserTitle,
      canvasserOffice:
        customSignatories?.canvasserOffice !== undefined
          ? customSignatories.canvasserOffice
          : canvasserOffice,
      items: customItems || items,
      torPdfFileName: newTorName !== undefined ? newTorName : torPdfFileName,
      torPdfFileSize,
      torPdfUploadDate,
      preparedByName:
        customSignatories?.preparedByName !== undefined
          ? customSignatories.preparedByName
          : preparedByName,
      preparedByTitle:
        customSignatories?.preparedByTitle !== undefined
          ? customSignatories.preparedByTitle
          : preparedByTitle,
      preparedByPrc:
        customSignatories?.preparedByPrc !== undefined
          ? customSignatories.preparedByPrc
          : preparedByPrc,
      checkedByName:
        customSignatories?.checkedByName !== undefined
          ? customSignatories.checkedByName
          : checkedByName,
      checkedByTitle:
        customSignatories?.checkedByTitle !== undefined
          ? customSignatories.checkedByTitle
          : checkedByTitle,
      checkedByOffice:
        customSignatories?.checkedByOffice !== undefined
          ? customSignatories.checkedByOffice
          : checkedByOffice,
      recommendingApprovalName:
        customSignatories?.recommendingApprovalName !== undefined
          ? customSignatories.recommendingApprovalName
          : recommendingApprovalName,
      recommendingApprovalTitle:
        customSignatories?.recommendingApprovalTitle !== undefined
          ? customSignatories.recommendingApprovalTitle
          : recommendingApprovalTitle,
      recommendingApprovalOffice:
        customSignatories?.recommendingApprovalOffice !== undefined
          ? customSignatories.recommendingApprovalOffice
          : recommendingApprovalOffice,
      approvedByName:
        customSignatories?.approvedByName !== undefined
          ? customSignatories.approvedByName
          : approvedByName,
      approvedByTitle:
        customSignatories?.approvedByTitle !== undefined
          ? customSignatories.approvedByTitle
          : approvedByTitle,
      approvedByOffice:
        customSignatories?.approvedByOffice !== undefined
          ? customSignatories.approvedByOffice
          : approvedByOffice,
      signatoryName:
        customSignatories?.signatoryName !== undefined
          ? customSignatories.signatoryName
          : signatoryName,
      signatoryTitle:
        customSignatories?.signatoryTitle !== undefined
          ? customSignatories.signatoryTitle
          : signatoryTitle,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error("[POW] Save state error:", e);
    }
  };

  const handleApplySignatoryPreset = (
    type: "dpwh" | "lgu" | "company" | "reset",
  ) => {
    if (type === "dpwh") {
      const pName = "Engr. Mark Angelo D. Santos";
      const pTitle = "Project Engineer / Cost Estimator";
      const pPrc = "PRC Reg. No. 0149822 | PTR No. 8921044";
      const cName = "Engr. Carmela R. Bautista";
      const cTitle = "Chief, Planning & Design Section";
      const cOffice = "Planning & Design Section";
      const rName = "Engr. Roberto M. Gomez";
      const rTitle = "BAC Chairperson / Assistant District Engineer";
      const rOffice = "Bids and Awards Committee";
      const aName = propHeadOfProcuringEntity || "Hon. Juanito C. Dela Cruz";
      const aTitle =
        propHeadOfProcuringEntityPosition || "District Engineer / HOPE";
      const aOffice = "Office of the District Engineer";

      setPreparedByName(pName);
      setPreparedByTitle(pTitle);
      setPreparedByPrc(pPrc);
      setCheckedByName(cName);
      setCheckedByTitle(cTitle);
      setCheckedByOffice(cOffice);
      setRecommendingApprovalName(rName);
      setRecommendingApprovalTitle(rTitle);
      setRecommendingApprovalOffice(rOffice);
      setApprovedByName(aName);
      setApprovedByTitle(aTitle);
      setApprovedByOffice(aOffice);

      handleSaveState(undefined, undefined, undefined, {
        preparedByName: pName,
        preparedByTitle: pTitle,
        preparedByPrc: pPrc,
        checkedByName: cName,
        checkedByTitle: cTitle,
        checkedByOffice: cOffice,
        recommendingApprovalName: rName,
        recommendingApprovalTitle: rTitle,
        recommendingApprovalOffice: rOffice,
        approvedByName: aName,
        approvedByTitle: aTitle,
        approvedByOffice: aOffice,
      });
    } else if (type === "lgu") {
      const pName = "Engr. Dexter S. Tan";
      const pTitle = "City Engineer's Office / Estimator";
      const pPrc = "PRC Reg. No. 0188732 | PTR No. 9104521";
      const cName = "Engr. Luisa M. Soriano";
      const cTitle = "Assistant City Engineer";
      const cOffice = "City Engineering Office";
      const rName = "Atty. Gerardo P. Ramos";
      const rTitle = "BAC Chairperson / City Administrator";
      const rOffice = "City Bids and Awards Committee";
      const aName = "Hon. Maria Corazon E. Santos";
      const aTitle = "City Mayor / Head of Procuring Entity";
      const aOffice = "Office of the City Mayor";

      setPreparedByName(pName);
      setPreparedByTitle(pTitle);
      setPreparedByPrc(pPrc);
      setCheckedByName(cName);
      setCheckedByTitle(cTitle);
      setCheckedByOffice(cOffice);
      setRecommendingApprovalName(rName);
      setRecommendingApprovalTitle(rTitle);
      setRecommendingApprovalOffice(rOffice);
      setApprovedByName(aName);
      setApprovedByTitle(aTitle);
      setApprovedByOffice(aOffice);

      handleSaveState(undefined, undefined, undefined, {
        preparedByName: pName,
        preparedByTitle: pTitle,
        preparedByPrc: pPrc,
        checkedByName: cName,
        checkedByTitle: cTitle,
        checkedByOffice: cOffice,
        recommendingApprovalName: rName,
        recommendingApprovalTitle: rTitle,
        recommendingApprovalOffice: rOffice,
        approvedByName: aName,
        approvedByTitle: aTitle,
        approvedByOffice: aOffice,
      });
    } else if (type === "company") {
      if (tenant?.authorizedSignatory?.name) {
        setSignatoryName(tenant.authorizedSignatory.name);
      }
      if (tenant?.authorizedSignatory?.title) {
        setSignatoryTitle(tenant.authorizedSignatory.title);
      }
      handleSaveState(undefined, undefined, undefined, {
        signatoryName: tenant?.authorizedSignatory?.name || signatoryName,
        signatoryTitle: tenant?.authorizedSignatory?.title || signatoryTitle,
      });
    } else if (type === "reset") {
      setPreparedByName("");
      setPreparedByTitle("");
      setPreparedByPrc("");
      setCheckedByName("");
      setCheckedByTitle("");
      setCheckedByOffice("");
      setRecommendingApprovalName("");
      setRecommendingApprovalTitle("");
      setRecommendingApprovalOffice("");
      setApprovedByName("");
      setApprovedByTitle("");
      setApprovedByOffice("");
      handleSaveState(undefined, undefined, undefined, {
        preparedByName: "",
        preparedByTitle: "",
        preparedByPrc: "",
        checkedByName: "",
        checkedByTitle: "",
        checkedByOffice: "",
        recommendingApprovalName: "",
        recommendingApprovalTitle: "",
        recommendingApprovalOffice: "",
        approvedByName: "",
        approvedByTitle: "",
        approvedByOffice: "",
      });
    }
  };

  const handleModeSwitch = (newMode: PowDocumentMode) => {
    setDocMode(newMode);
    // Preserves trackingNumber - system auto-generated, cannot be edited nor change!
    setProcurementPurpose(newMode === "POW" ? "BIDDING" : "DIRECT_PURCHASE");
    setDeliveryReceiptNo(
      `DR-${trackingNumber.replace(/^(POW|RFQ|QUOT)-/i, "")}`,
    );
    handleSaveState(undefined, undefined, newMode, undefined, {
      trackingNumber,
      procurementPurpose: newMode === "POW" ? "BIDDING" : "DIRECT_PURCHASE",
    });
  };

  const handleSubmitForApproval = () => {
    const tenantKey = tenant?.id || "default";
    const nowStr = new Date().toLocaleString("en-PH");
    const subName =
      currentUser?.fullName || preparedByName || "Technical Estimator";
    const subRole = currentUser?.role
      ? getRoleDisplayName(currentUser.role)
      : "Technical Estimator";

    setApprovalStatus("PENDING_APPROVAL");
    setSubmittedByUserName(subName);
    setSubmittedByRole(subRole);
    setSubmittedAt(nowStr);

    const rec: DocumentApprovalRecord = {
      recordId: trackingNumber,
      docType: docMode === "POW" ? "POW" : "QUOTATION",
      status: "PENDING_APPROVAL",
      submittedBy: subName,
      submittedByRole: subRole,
      submittedAt: nowStr,
    };
    saveDocumentApproval(tenantKey, rec);

    handleSaveState(undefined, undefined, undefined, undefined, {
      approvalStatus: "PENDING_APPROVAL",
      submittedByUserName: subName,
      submittedByRole: subRole,
      submittedAt: nowStr,
    });

    setSyncNotification(
      `📩 Submitted for Approval! Tracking ID [${trackingNumber}] has been sent to Company Owner / Higher Manager.`,
    );
  };

  const handleRevertToDraft = () => {
    const tenantKey = tenant?.id || "default";
    setApprovalStatus("DRAFT");
    const rec: DocumentApprovalRecord = {
      recordId: trackingNumber,
      docType: docMode === "POW" ? "POW" : "QUOTATION",
      status: "DRAFT",
    };
    saveDocumentApproval(tenantKey, rec);
    handleSaveState(undefined, undefined, undefined, undefined, {
      approvalStatus: "DRAFT",
    });
    setSyncNotification(`Document status reverted to DRAFT.`);
  };

  const handleApproveAndSync = (customNotes?: string) => {
    const tenantKey = tenant?.id || "default";
    const nowStr = new Date().toLocaleString("en-PH");
    const appName = currentUser?.fullName || approvedByName || "Company Owner";
    const appRole = currentUser?.role
      ? getRoleDisplayName(currentUser.role)
      : "Company Owner";

    setApprovalStatus("APPROVED");
    setApprovedAt(nowStr);
    setApprovedByUserName(appName);
    setApprovedByRole(appRole);
    if (customNotes) setApprovalNotes(customNotes);

    const rec: DocumentApprovalRecord = {
      recordId: trackingNumber,
      docType: docMode === "POW" ? "POW" : "QUOTATION",
      status: "APPROVED",
      submittedBy: submittedByUserName || preparedByName,
      submittedByRole: submittedByRole || "Technical Estimator",
      submittedAt: submittedAt,
      approvedBy: appName,
      approvedByRole: appRole,
      approvedAt: nowStr,
      notes: customNotes || approvalNotes,
    };
    saveDocumentApproval(tenantKey, rec);

    const registryKey = `bidocs_approved_pow_rfq_registry_${tenantKey}`;
    let registry: any[] = [];
    try {
      const existing = localStorage.getItem(registryKey);
      if (existing) registry = JSON.parse(existing);
    } catch (e) {}

    const currentRecord = {
      id: trackingNumber,
      trackingNumber,
      docMode,
      procurementPurpose,
      approvalStatus: "APPROVED",
      approvedAt: nowStr,
      approvedByName: appName,
      approvedByTitle: appRole,
      projectRefNo,
      projectTitle,
      procuringEntity,
      selectedOppId,
      itemCount: items.length,
      grandTotal: totals.grandTotal,
      deliveryReceiptNo: `DR-${trackingNumber.replace(/^(POW|RFQ|QUOT)-/i, "")}`,
    };

    const filtered = registry.filter(
      (r: any) => r.trackingNumber !== trackingNumber,
    );
    filtered.push(currentRecord);
    try {
      localStorage.setItem(registryKey, JSON.stringify(filtered));
    } catch (e) {}

    if (procurementPurpose === "BIDDING") {
      // 🎯 AUTO-INPUT INTO SECTION VI (Schedule of Requirements)
      const convertedSectionViItems: any[] = calculatedRows.map((it, idx) => {
        const qtyStr = `${it.quantity} ${it.unit}`.trim();
        const unitCostVal =
          it.unitCost ||
          (it.quantity > 0 ? it.totalCost / it.quantity : it.totalCost);
        const unitCostStr = `PHP ${fmtPeso(unitCostVal)}`;
        const totalStr = `PHP ${fmtPeso(it.totalCost)}`;
        const descStr =
          docMode === "QUOTATION" && it.brandModel
            ? `${it.description} (Brand/Model: ${it.brandModel})`
            : it.description;

        return {
          id: (idx + 1).toString(),
          description: descStr,
          quantity: qtyStr,
          unitAmount: unitCostStr,
          total: totalStr,
          delivered:
            deliveryPeriod ||
            projectDurationDays ||
            "30 Calendar Days upon receipt of NTP",
        };
      });

      const secViKeys = [
        projectScopeKey ? `bidocs_sec_vi_${tenantKey}_${projectScopeKey}` : "",
        selectedOppId ? `bidocs_sec_vi_${tenantKey}_${selectedOppId}` : "",
        projectRefNo ? `bidocs_sec_vi_${tenantKey}_${projectRefNo}` : "",
      ].filter(Boolean);

      secViKeys.forEach((k) => {
        try {
          localStorage.setItem(k, JSON.stringify(convertedSectionViItems));
        } catch (e) {}
      });

      // Also store services if indirect cost exists
      if (totals.totalIndirect > 0) {
        const svcJson = JSON.stringify({
          description:
            "Labor, Indirect Costs, Overhead, Contingencies, Profit & Taxes",
          percentage:
            totals.grandTotal > 0
              ? (totals.totalIndirect / totals.grandTotal) * 100
              : 0,
          customAmount: fmtPeso(totals.totalIndirect),
          computedAmount: totals.totalIndirect,
        });
        const secViSvcKeys = [
          projectScopeKey
            ? `bidocs_sec_vi_services_${tenantKey}_${projectScopeKey}`
            : "",
          selectedOppId
            ? `bidocs_sec_vi_services_${tenantKey}_${selectedOppId}`
            : "",
          projectRefNo
            ? `bidocs_sec_vi_services_${tenantKey}_${projectRefNo}`
            : "",
        ].filter(Boolean);
        secViSvcKeys.forEach((k) => {
          try {
            localStorage.setItem(k, svcJson);
          } catch (e) {}
        });
      }

      // Trigger live reload event for Section VI
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("bidocs:section_vi_synced", {
            detail: {
              projectScopeKey,
              trackingNumber,
              itemCount: items.length,
              docMode,
            },
          }),
        );
      }

      setSyncNotification(
        `✅ Approved [${trackingNumber}] by ${appName}! Successfully authorized and auto-inputted ${items.length} deliverables into Section VI Schedule of Requirements.`,
      );
    } else {
      // 📦 AUTO-INPUT INTO DELIVERY RECEIPT (DR)
      const drNum = `DR-${trackingNumber.replace(/^(POW|RFQ|QUOT)-/i, "")}`;
      setDeliveryReceiptNo(drNum);

      const drRecord = {
        drNumber: drNum,
        referenceTrackingNo: trackingNumber,
        docMode,
        dateDelivered: todayStr,
        procuringEntity,
        deliveryLocation: projectLocation,
        contractorName,
        contractorAddress,
        contractorTin,
        contractorPhilgeps,
        canvasserName,
        items: calculatedRows.map((it, idx) => ({
          itemNo: it.itemNo || `Item ${idx + 1}`,
          description: it.description,
          brandModel: it.brandModel || "Compliant with TOR Specs",
          quantity: it.quantity,
          unit: it.unit,
          unitPrice:
            it.unitCost ||
            (it.quantity > 0 ? it.totalCost / it.quantity : it.totalCost),
          totalAmount: it.totalCost,
        })),
        totalAmount: totals.grandTotal,
        signatories: {
          deliveredByName: signatoryName,
          deliveredByTitle: signatoryTitle,
          receivedByName: canvasserName || "Property & Supply Custodian",
          receivedByTitle: "Authorized Receiving Personnel",
          inspectedByName:
            checkedByName || "Inspection & Acceptance Committee Member",
        },
      };

      const drKeys = [
        projectScopeKey ? `bidocs_dr_${tenantKey}_${projectScopeKey}` : "",
        selectedOppId ? `bidocs_dr_${tenantKey}_${selectedOppId}` : "",
        projectRefNo ? `bidocs_dr_${tenantKey}_${projectRefNo}` : "",
      ].filter(Boolean);

      drKeys.forEach((k) => {
        try {
          localStorage.setItem(k, JSON.stringify(drRecord));
        } catch (e) {}
      });

      setSyncNotification(
        `✅ Approved [${trackingNumber}] by ${appName}! Official Delivery Receipt ${drNum} generated and ready for direct purchase delivery.`,
      );
    }

    handleSaveState(undefined, undefined, undefined, undefined, {
      approvalStatus: "APPROVED",
      approvedAt: nowStr,
      approvedByUserName: appName,
      approvedByRole: appRole,
      approvalNotes: customNotes || approvalNotes,
    });
  };

  const handleOpenOpportunityModal = () => {
    setOppTitle(projectTitle);
    setOppProcuringEntity(procuringEntity);
    setOppLocation(projectLocation);
    setOppAbc(appropriationAmount || totals.grandTotal || 10000000);
    setOppSolicitationNo(`SOL-${trackingNumber}`);
    setOppProcurementType(
      docMode === "POW" ? "Infrastructure" : "Goods & Supply",
    );
    setCreatedOppResult(null);
    setShowCreateOpportunityModal(true);
  };

  const handlePhilgepsPdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !file.name.toLowerCase().endsWith(".pdf") &&
      file.type !== "application/pdf"
    ) {
      alert(
        "Only PDF documents (.pdf) are accepted for PhilGEPS tender files.",
      );
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      alert("File size exceeds maximum allowed limit of 100 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhilgepsNoticePdfDataUrl(reader.result as string);
      setPhilgepsNoticePdfFile(file);
      setPhilgepsNoticePdfName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateOpportunityFromPow = async () => {
    const tenantId = tenant?.id || "default";
    setIsCreatingOpp(true);

    try {
      const newOpId = `op-${Date.now()}`;
      const finalPhilgepsRefNo =
        oppPhilgepsRefNo.trim() ||
        `PHILGEPS-${Math.floor(10000000 + Math.random() * 90000000)}`;
      const finalProjectRefNo = trackingNumber || `PRJ-${newOpId}`;
      const finalSolicitation =
        oppSolicitationNo.trim() || `SOL-${finalProjectRefNo}`;
      const finalTitle =
        oppTitle.trim() || projectTitle || "Target Bidding Project";
      const finalEntity =
        oppProcuringEntity.trim() || procuringEntity || "Procuring Entity";
      const finalLocation =
        oppLocation.trim() || projectLocation || "Metro Manila, Philippines";
      const finalAbc =
        oppAbc > 0
          ? oppAbc
          : totals.grandTotal > 0
            ? totals.grandTotal
            : 1000000;
      const todayIso = new Date().toISOString().split("T")[0];

      // 1. Offload heavy PDF binary to IndexedDB
      if (philgepsNoticePdfDataUrl) {
        await savePdfData(`op_pdf_${newOpId}`, philgepsNoticePdfDataUrl).catch(
          console.error,
        );
      }

      // 2. Build PhilGEPSOpportunity record
      const newOpportunity: PhilGEPSOpportunity = {
        id: newOpId,
        philgepsRefNo: finalPhilgepsRefNo,
        projectReferenceNumber: finalProjectRefNo,
        solicitationNumber: finalSolicitation,
        areaOfDelivery: finalLocation,
        sector: "Government",
        title: finalTitle,
        procuringEntity: finalEntity,
        procuringEntityAddress: contractorAddress || finalLocation,
        procurementType: oppProcurementType,
        legalRegime: "RA_12009_NGPA",
        approvedBudget: finalAbc,
        dateCreated: todayIso,
        datePublished: todayIso,
        submissionDeadlineDatetime: oppDeadline,
        submissionDeadline: oppDeadline
          ? new Date(oppDeadline).toISOString()
          : new Date().toISOString(),
        bidOpeningDate: oppDeadline
          ? new Date(oppDeadline).toISOString()
          : new Date().toISOString(),
        pdfFileName: philgepsNoticePdfName || "PhilGEPS_Bid_Notice.pdf",
        pdfFileSize: philgepsNoticePdfFile?.size || 1024,
        pdfFileDataUrl: philgepsNoticePdfDataUrl || undefined,
        status: "OPEN",
        location: finalLocation,
        description: `${finalTitle} — Procured by ${finalEntity} (Approved POW/RFQ: ${trackingNumber})`,
      };

      // 3. Persist to opportunities storage (both tenant-scoped and general)
      const tenantKey = `bidocs_opportunities_${tenantId}`;
      let existingOps: PhilGEPSOpportunity[] = [];
      try {
        const raw = localStorage.getItem(tenantKey);
        if (raw) existingOps = JSON.parse(raw);
      } catch (e) {}

      // Strip heavy data URL for clean metadata storage
      const { pdfFileDataUrl: _omit, ...cleanMeta } = newOpportunity;
      const updatedOps = [
        cleanMeta as PhilGEPSOpportunity,
        ...existingOps.filter(
          (o) =>
            o.id !== newOpId && o.projectReferenceNumber !== finalProjectRefNo,
        ),
      ];

      localStorage.setItem(tenantKey, JSON.stringify(updatedOps));
      localStorage.setItem("bidocs_opportunities", JSON.stringify(updatedOps));

      // Invalidate project options cache so dropdowns update immediately
      invalidateOpportunityProjectsCache();

      // 4. Set as the Global Active Project across Document Vault and entire system
      const activeData = {
        refNo: finalProjectRefNo,
        title: finalTitle,
        procuringEntity: finalEntity,
      };
      localStorage.setItem(
        `bidocs_active_project_${tenantId}`,
        JSON.stringify(activeData),
      );
      localStorage.setItem("bidocs_active_project", JSON.stringify(activeData));
      localStorage.setItem(
        `bidocs_active_vault_project_${tenantId}`,
        finalProjectRefNo,
      );
      localStorage.setItem("bidocs_active_vault_project", finalProjectRefNo);

      // 5. Automatically synchronize deliverables into Section VI (Schedule of Requirements)
      const convertedSectionViItems: any[] = calculatedRows.map((it, idx) => {
        const qtyStr = `${it.quantity} ${it.unit}`.trim();
        const unitCostVal =
          it.unitCost ||
          (it.quantity > 0 ? it.totalCost / it.quantity : it.totalCost);
        const unitCostStr = `PHP ${fmtPeso(unitCostVal)}`;
        const totalStr = `PHP ${fmtPeso(it.totalCost)}`;
        const descStr =
          docMode === "QUOTATION" && it.brandModel
            ? `${it.description} (Brand/Model: ${it.brandModel})`
            : it.description;

        return {
          id: (idx + 1).toString(),
          description: descStr,
          quantity: qtyStr,
          unitAmount: unitCostStr,
          total: totalStr,
          delivered:
            deliveryPeriod ||
            projectDurationDays ||
            "30 Calendar Days upon receipt of NTP",
        };
      });

      const secViKey = `bidocs_sec_vi_${tenantId}_${finalProjectRefNo}`;
      localStorage.setItem(secViKey, JSON.stringify(convertedSectionViItems));

      if (totals.totalIndirect > 0) {
        const svcJson = JSON.stringify({
          description:
            "Labor, Indirect Costs, Overhead, Contingencies, Profit & Taxes",
          percentage:
            totals.grandTotal > 0
              ? (totals.totalIndirect / totals.grandTotal) * 100
              : 0,
          customAmount: fmtPeso(totals.totalIndirect),
          computedAmount: totals.totalIndirect,
        });
        localStorage.setItem(
          `bidocs_sec_vi_services_${tenantId}_${finalProjectRefNo}`,
          svcJson,
        );
      }

      // 6. Register in approved POW/RFQ registry
      const nowStr = new Date().toLocaleString("en-PH");
      const regKey = `bidocs_approved_pow_rfq_registry_${tenantId}`;
      let regList: any[] = [];
      try {
        const rRaw = localStorage.getItem(regKey);
        if (rRaw) regList = JSON.parse(rRaw);
      } catch (e) {}

      const filteredReg = regList.filter(
        (r: any) => r.trackingNumber !== trackingNumber,
      );
      filteredReg.push({
        id: trackingNumber,
        trackingNumber,
        docMode,
        procurementPurpose: "BIDDING",
        approvalStatus: "APPROVED",
        approvedAt: nowStr,
        projectRefNo: finalProjectRefNo,
        projectTitle: finalTitle,
        procuringEntity: finalEntity,
        itemCount: items.length,
        grandTotal: totals.grandTotal,
        opportunityId: newOpId,
        philgepsRefNo: finalPhilgepsRefNo,
      });
      localStorage.setItem(regKey, JSON.stringify(filteredReg));

      // 7. Update local approval status
      setApprovalStatus("APPROVED");
      setApprovedAt(nowStr);
      setCreatedOppResult(newOpportunity);

      // 8. Dispatch event for live UI listeners
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("bidocs:section_vi_synced", {
            detail: {
              projectScopeKey: finalProjectRefNo,
              trackingNumber,
              itemCount: items.length,
              docMode,
            },
          }),
        );
      }
    } catch (err) {
      console.error("[POW] Create opportunity error:", err);
      alert("Error creating Bidding Opportunity. Please check form inputs.");
    } finally {
      setIsCreatingOpp(false);
    }
  };

  const handleTorUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + " MB";
    const nowStr = new Date().toLocaleString("en-PH");

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setTorPdfDataUrl(dataUrl);
      setTorPdfFileName(file.name);
      setTorPdfFileSize(sizeFormatted);
      setTorPdfUploadDate(nowStr);

      const tenantId = tenant?.id || "default";
      const torDbKey = `proj_pow_tor_pdf_${tenantId}_${projectScopeKey}`;
      await savePdfData(torDbKey, dataUrl);
      handleSaveState(undefined, file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleTorDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to remove the uploaded Terms of Reference (TOR) PDF?",
      )
    )
      return;
    setTorPdfDataUrl("");
    setTorPdfFileName("");
    setTorPdfFileSize("");
    setTorPdfUploadDate("");

    const tenantId = tenant?.id || "default";
    const torDbKey = `proj_pow_tor_pdf_${tenantId}_${projectScopeKey}`;
    await deletePdfData(torDbKey);
    handleSaveState(undefined, "");
  };

  const handleTorGenerated = async (dataUrl: string, docName: string) => {
    const sizeFormatted =
      ((dataUrl.length * 0.75) / (1024 * 1024)).toFixed(2) + " MB";
    const nowStr = new Date().toLocaleString("en-PH");
    const fileName = `${projectRefNo}_STATUTORY_TOR.pdf`;

    setTorPdfDataUrl(dataUrl);
    setTorPdfFileName(fileName);
    setTorPdfFileSize(sizeFormatted);
    setTorPdfUploadDate(nowStr);
    setAppendTorToPdf(true);
    setActiveTab("tor");
    setShowTorPreviewModal(true);

    const tenantId = tenant?.id || "default";
    const torDbKey = `proj_pow_tor_pdf_${tenantId}_${projectScopeKey}`;
    await savePdfData(torDbKey, dataUrl);
    handleSaveState(undefined, fileName);
    alert(
      `✅ Statutory Terms of Reference successfully generated, saved alongside the ${docMode === "POW" ? "Program of Work (POW)" : "Formal Price Quotation"} in project records, and linked to the final package.`,
    );
  };

  const handleAddItem = () => {
    const newItem: PowItem = {
      id: `pow-item-${Date.now()}`,
      itemNo: `Item ${items.length + 1}`,
      part:
        docMode === "POW"
          ? "PART B: OTHER GENERAL REQUIREMENTS"
          : "GENERAL SPECIFICATIONS",
      description:
        docMode === "POW"
          ? "New Scope of Work / Construction Activity"
          : "Brand New Equipment / Delivery & Services",
      brandModel:
        docMode === "QUOTATION" ? "Standard OEM / Compliant Model" : "",
      quantity: 1.0,
      unit: docMode === "POW" ? "l.s." : "units",
      materialCost: 50000,
      laborCost: 15000,
      equipmentCost: 5000,
      ocmRate: docMode === "POW" ? 8 : 4,
      profitRate: 8,
      vatRate: 5,
      statementOfCompliance: "COMPLY",
    };
    const updated = [...items, newItem];
    setItems(updated);
    handleSaveState(updated);
  };

  const handleRemoveItem = (id: string) => {
    const updated = items.filter((it) => it.id !== id);
    setItems(updated);
    handleSaveState(updated);
  };

  const handleUpdateItem = (id: string, field: keyof PowItem, val: any) => {
    const updated = items.map((it) =>
      it.id === id ? { ...it, [field]: val } : it,
    );
    setItems(updated);
    handleSaveState(updated);
  };

  const generatePowPdfDataUrl = async (): Promise<string | null> => {
    const printArea = document.getElementById("pow-print-sheet");
    if (!printArea) return null;

    const isLand = printOrientation === "landscape";
    const pageWidth = isLand ? 936 : 612;
    const pageHeight = isLand ? 612 : 936;

    const canvas = await html2canvas(printArea, {
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

    const powPdfBytes = await pdfDoc.save();
    const powBlob = new Blob([powPdfBytes as any], { type: "application/pdf" });

    const reader = new FileReader();
    const powDataUrl: string = await new Promise((resolve) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(powBlob);
    });

    // If append TOR PDF is enabled and uploaded, combine them seamlessly
    if (appendTorToPdf && torPdfDataUrl) {
      const units: ExportDocumentUnit[] = [
        {
          title:
            docMode === "POW"
              ? "Program of Work (POW) Statutory Sheet"
              : "Price Quotation (RFQ) Formal Sheet",
          fileSource: powDataUrl,
        },
        {
          title: "Attached Terms of Reference (TOR)",
          fileSource: torPdfDataUrl,
        },
      ];

      const mergedDataUrl = await buildMergedThreeLayerPdfDataUrl(
        units,
        `${projectRefNo}_${docMode === "POW" ? "PROGRAM_OF_WORK" : "PRICE_QUOTATION"}_COMPLETE.pdf`,
      );
      return mergedDataUrl;
    }

    return powDataUrl;
  };

  const handleDownloadPdf = async () => {
    if (approvalStatus !== "APPROVED") {
      setShowApprovalGateModal(true);
      return;
    }
    setIsExporting(true);
    try {
      const dataUrl = await generatePowPdfDataUrl();
      if (!dataUrl) {
        alert("Could not generate document PDF. Please check form fields.");
        return;
      }
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${projectRefNo || "PROJECT"}_${docMode === "POW" ? "PROGRAM_OF_WORK" : "PRICE_QUOTATION"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("[POW] Download PDF error:", e);
      alert("Failed to compile PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadDrPdf = async () => {
    if (approvalStatus !== "APPROVED") {
      setShowApprovalGateModal(true);
      return;
    }
    setIsExportingDr(true);
    try {
      const printArea = document.getElementById("dr-print-sheet");
      if (!printArea) {
        alert("Delivery receipt print sheet not found.");
        return;
      }

      // Legal Portrait: 612pt x 936pt (8.5" x 13" at 72dpi)
      const pageWidth = 612;
      const pageHeight = 936;

      const canvas = await html2canvas(printArea, {
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
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const link = document.createElement("a");
        link.href = base64data;
        link.download = `${deliveryReceiptNo || "DELIVERY_RECEIPT"}_${projectRefNo || "DIRECT_PURCHASE"}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error("[DR] Download PDF error:", e);
      alert("Failed to compile Delivery Receipt PDF.");
    } finally {
      setIsExportingDr(false);
    }
  };

  const handleSaveAndCompleteFlow = async () => {
    setIsSaving(true);
    try {
      handleSaveState();
      const finalPdf = await generatePowPdfDataUrl();
      const tenantId = tenant?.id || "default";
      const pdfDbKey = `proj_pow_generated_${tenantId}_${projectScopeKey}`;

      // POW / quotation output stays in project-scoped records and must not be treated as
      // a generic document-vault entry. The Document Vault remains reserved for bidding documents only.
      if (finalPdf && !onSaveAndComplete) {
        await savePdfData(pdfDbKey, finalPdf);
      }

      if (onSaveAndComplete) {
        onSaveAndComplete(
          finalPdf || undefined,
          `${projectRefNo} - ${docMode === "POW" ? "Program of Work (POW)" : "Formal Price Quotation (RFQ)"} with TOR`,
          projectRefNo,
          projectTitle,
        );
      }

      if (finalPdf) {
        const link = document.createElement("a");
        link.href = finalPdf;
        link.download = `${projectRefNo || "PROJECT"}_${docMode === "POW" ? "PROGRAM_OF_WORK" : "PRICE_QUOTATION"}${appendTorToPdf && torPdfDataUrl ? "_WITH_TOR" : ""}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      alert(getPowCompletionMessage(docMode, Boolean(onSaveAndComplete)));
    } catch (e) {
      console.error("[POW] Save and complete error:", e);
      alert("Failed to save document.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderSignatoriesEditor = (context: "full-tab" | "embedded") => (
    <div
      className={`p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 ${context === "embedded" ? "mt-6 shadow-xl" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>
                {docMode === "POW"
                  ? "Statutory Signatories & Approvals (4-Tier Hierarchy)"
                  : "Quotation Canvass & Bidder Signatories"}
              </span>
              <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Live Synchronized
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {docMode === "POW"
                ? "Update the 4 official signatories below (names, designations, PRC licenses, offices). Changes appear live on the document and Legal PDF."
                : "Update the official Government Canvasser and Bidder Authorized Representative details."}
            </p>
          </div>
        </div>

        {docMode === "POW" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">
              Quick Presets:
            </span>
            <button
              type="button"
              onClick={() => handleApplySignatoryPreset("dpwh")}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-blue-400 border border-slate-700 cursor-pointer transition"
            >
              DPWH Standard
            </button>
            <button
              type="button"
              onClick={() => handleApplySignatoryPreset("lgu")}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-purple-400 border border-slate-700 cursor-pointer transition"
            >
              LGU Standard
            </button>
            <button
              type="button"
              onClick={() => handleApplySignatoryPreset("reset")}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-400 border border-slate-700 cursor-pointer transition"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {docMode === "POW" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tier 1: Prepared By */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                1. Prepared by
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Estimator
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                Full Name &amp; Title
              </label>
              <input
                type="text"
                value={preparedByName}
                onChange={(e) => {
                  setPreparedByName(e.target.value);
                  handleSaveState(undefined, undefined, undefined, {
                    preparedByName: e.target.value,
                  });
                }}
                placeholder="e.g. Engr. Mark Angelo D. Santos"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                Designation / Role
              </label>
              <input
                type="text"
                value={preparedByTitle}
                onChange={(e) => {
                  setPreparedByTitle(e.target.value);
                  handleSaveState(undefined, undefined, undefined, {
                    preparedByTitle: e.target.value,
                  });
                }}
                placeholder="e.g. Project Engineer / Cost Estimator"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                PRC / PTR Registration
              </label>
              <input
                type="text"
                value={preparedByPrc}
                onChange={(e) => {
                  setPreparedByPrc(e.target.value);
                  handleSaveState(undefined, undefined, undefined, {
                    preparedByPrc: e.target.value,
                  });
                }}
                placeholder="e.g. PRC Reg. No. 0149822 | PTR No. 8921044"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Tier 2: Checked & Reviewed By */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                2. Checked / Reviewed by
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Section Chief
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                Full Name &amp; Title
              </label>
              <input
                type="text"
                value={checkedByName}
                onChange={(e) => {
                  setCheckedByName(e.target.value);
                  handleSaveState(undefined, undefined, undefined, {
                    checkedByName: e.target.value,
                  });
                }}
                placeholder="e.g. Engr. Carmela R. Bautista"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                Designation / Role
              </label>
              <input
                type="text"
                value={checkedByTitle}
                onChange={(e) => {
                  setCheckedByTitle(e.target.value);
                  handleSaveState(undefined, undefined, undefined, {
                    checkedByTitle: e.target.value,
                  });
                }}
                placeholder="e.g. Chief, Planning & Design Section"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                Office / Division
              </label>
              <input
                type="text"
                value={checkedByOffice}
                onChange={(e) => {
                  setCheckedByOffice(e.target.value);
                  handleSaveState(undefined, undefined, undefined, {
                    checkedByOffice: e.target.value,
                  });
                }}
                placeholder="e.g. Planning & Design Section"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Tier 3: Recommending Approval */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                3. Recommending Approval
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                BAC Chair
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                Full Name &amp; Title
              </label>
              <input
                type="text"
                value={recommendingApprovalName}
                onChange={(e) => {
                  setRecommendingApprovalName(e.target.value);
                  handleSaveState(undefined, undefined, undefined, {
                    recommendingApprovalName: e.target.value,
                  });
                }}
                placeholder="e.g. Engr. Roberto M. Gomez"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                Designation / Role
              </label>
              <input
                type="text"
                value={recommendingApprovalTitle}
                onChange={(e) => {
                  setRecommendingApprovalTitle(e.target.value);
                  handleSaveState(undefined, undefined, undefined, {
                    recommendingApprovalTitle: e.target.value,
                  });
                }}
                placeholder="e.g. BAC Chairperson / Assistant District Engineer"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                Office / Committee
              </label>
              <input
                type="text"
                value={recommendingApprovalOffice}
                onChange={(e) => {
                  setRecommendingApprovalOffice(e.target.value);
                  handleSaveState(undefined, undefined, undefined, {
                    recommendingApprovalOffice: e.target.value,
                  });
                }}
                placeholder="e.g. Bids and Awards Committee"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Tier 4: Approved by HOPE */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                4. Approved by
              </span>
              <span className="text-[10px] text-slate-500 font-mono">HOPE</span>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                Full Name &amp; Title
              </label>
              <input
                type="text"
                value={approvedByName}
                onChange={(e) => {
                  setApprovedByName(e.target.value);
                  handleSaveState(undefined, undefined, undefined, {
                    approvedByName: e.target.value,
                  });
                }}
                placeholder="e.g. Hon. Juanito C. Dela Cruz"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                Designation / Role
              </label>
              <input
                type="text"
                value={approvedByTitle}
                onChange={(e) => {
                  setApprovedByTitle(e.target.value);
                  handleSaveState(undefined, undefined, undefined, {
                    approvedByTitle: e.target.value,
                  });
                }}
                placeholder="e.g. Head of Procuring Entity (HOPE) / District Engineer"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                Office / Entity
              </label>
              <input
                type="text"
                value={approvedByOffice}
                onChange={(e) => {
                  setApprovedByOffice(e.target.value);
                  handleSaveState(undefined, undefined, undefined, {
                    approvedByOffice: e.target.value,
                  });
                }}
                placeholder="e.g. Head of the Procuring Entity"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Quotation Signatories (Canvasser & Bidder AMO) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Canvassed by */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Canvassed &amp; Acknowledged by
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Government Side
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                Canvasser Name
              </label>
              <input
                type="text"
                value={canvasserName}
                onChange={(e) => {
                  setCanvasserName(e.target.value);
                  handleSaveState(undefined, undefined, undefined, {
                    canvasserName: e.target.value,
                  });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                Designation / Role
              </label>
              <input
                type="text"
                value={canvasserTitle}
                onChange={(e) => {
                  setCanvasserTitle(e.target.value);
                  handleSaveState(undefined, undefined, undefined, {
                    canvasserTitle: e.target.value,
                  });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                Procuring Agency / Unit
              </label>
              <input
                type="text"
                value={canvasserOffice}
                onChange={(e) => {
                  setCanvasserOffice(e.target.value);
                  handleSaveState(undefined, undefined, undefined, {
                    canvasserOffice: e.target.value,
                  });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Submitted by Bidder */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Submitted by (Authorized Managing Officer)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Bidder Side
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                Signatory Full Name
              </label>
              <input
                type="text"
                value={signatoryName}
                onChange={(e) => {
                  setSignatoryName(e.target.value);
                  handleSaveState(undefined, undefined, undefined, {
                    signatoryName: e.target.value,
                  });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                Position / Official Title
              </label>
              <input
                type="text"
                value={signatoryTitle}
                onChange={(e) => {
                  setSignatoryTitle(e.target.value);
                  handleSaveState(undefined, undefined, undefined, {
                    signatoryTitle: e.target.value,
                  });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                  Company TIN
                </label>
                <input
                  type="text"
                  value={contractorTin}
                  onChange={(e) => {
                    setContractorTin(e.target.value);
                    handleSaveState();
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                  PhilGEPS No.
                </label>
                <input
                  type="text"
                  value={contractorPhilgeps}
                  onChange={(e) => {
                    setContractorPhilgeps(e.target.value);
                    handleSaveState();
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full max-h-[92vh] bg-slate-950 text-slate-100 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Top Header Bar */}
      <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border transition ${
              docMode === "POW"
                ? "bg-blue-600/20 border-blue-500/30 text-blue-400"
                : "bg-emerald-600/20 border-emerald-500/30 text-emerald-400"
            }`}
          >
            {docMode === "POW" ? (
              <FileSpreadsheet className="w-5 h-5" />
            ) : (
              <Receipt className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                {docMode === "POW"
                  ? "PROGRAM OF WORK (POW)"
                  : "FORMAL PRICE QUOTATION (RFQ)"}
              </h2>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                  docMode === "POW"
                    ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                    : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                }`}
              >
                {docMode === "POW"
                  ? "RA 9184 & RA 12009 / DPWH Standard"
                  : "Section 53.9 SVP / Sec 52 Shopping"}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {docMode === "POW"
                ? "Itemized Detailed Cost Estimate, Direct vs Indirect Markups, and Terms of Reference (TOR)"
                : "Official Government Supplier Price Canvass, Brand/Model Specifications, and Delivery Undertaking"}
            </p>
          </div>
        </div>

        {/* Dual Mode Switcher & Top Actions */}
        <div className="flex items-center gap-3">
          {/* Segmented Mode Control */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
            <button
              onClick={() => handleModeSwitch("POW")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                docMode === "POW"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Program of Work (POW)</span>
            </button>
            <button
              onClick={() => handleModeSwitch("QUOTATION")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                docMode === "QUOTATION"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Formal Quotation (RFQ)</span>
            </button>
          </div>

          <button
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition disabled:opacity-50 ${
              approvalStatus === "APPROVED"
                ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                : "bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-500/40"
            }`}
            title={
              approvalStatus === "APPROVED"
                ? "Download Legal PDF"
                : "Executive Approval Required to Print / Download"
            }
          >
            {approvalStatus === "APPROVED" ? (
              <Download className="w-4 h-4 text-emerald-400" />
            ) : (
              <Lock className="w-4 h-4 text-amber-400" />
            )}
            <span>
              {isExporting
                ? "Compiling..."
                : approvalStatus === "APPROVED"
                  ? "Download PDF"
                  : "Download PDF 🔒"}
            </span>
          </button>

          <button
            onClick={handleSaveAndCompleteFlow}
            disabled={isSaving}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold text-white shadow-lg flex items-center gap-2 cursor-pointer transition disabled:opacity-50 ${
              docMode === "POW"
                ? "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20"
                : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaving ? "Saving..." : "Save & Download PDF"}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Tracking Identifier & Workflow Routing Strip */}
      <div className="px-6 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-blue-400" />
            <span>TRACKING ID:</span>
          </span>
          <div className="flex items-center gap-1.5">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-white font-mono font-bold text-xs select-all shadow-inner cursor-default"
              title="System Auto-Generated Immutable Tracking ID (Cannot be edited or changed)"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-blue-300 tracking-wider font-extrabold">
                {trackingNumber.replace(/^(POW|RFQ|QUOT)-?/i, "")}
              </span>
              <span className="text-[9px] font-sans font-semibold text-slate-400 bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700/60 uppercase tracking-tight">
                Immutable
              </span>
            </div>
          </div>

          {/* Purpose Switch */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 ml-1">
            <button
              type="button"
              onClick={() => {
                setProcurementPurpose("BIDDING");
                handleSaveState(undefined, undefined, undefined, undefined, {
                  procurementPurpose: "BIDDING",
                });
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer ${
                procurementPurpose === "BIDDING"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>🎯 For Public Bidding (Section VI)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setProcurementPurpose("DIRECT_PURCHASE");
                handleSaveState(undefined, undefined, undefined, undefined, {
                  procurementPurpose: "DIRECT_PURCHASE",
                });
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer ${
                procurementPurpose === "DIRECT_PURCHASE"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>📦 For Direct Purchase (Delivery Receipt)</span>
            </button>
          </div>
        </div>

        {/* Approval Status & Role-Based Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">
              Approval:
            </span>
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${
                approvalStatus === "APPROVED"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : approvalStatus === "PENDING_APPROVAL"
                    ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                    : "bg-amber-500/20 text-amber-300 border-amber-500/30"
              }`}
            >
              {approvalStatus === "APPROVED" ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>APPROVED ({approvedByUserName || "Owner"})</span>
                </>
              ) : approvalStatus === "PENDING_APPROVAL" ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <span>PENDING OWNER APPROVAL</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>DRAFT (NEEDS APPROVAL)</span>
                </>
              )}
            </span>
          </div>

          {/* Role-Adaptive Approval Controls */}
          {isApproverRole(currentUser?.role) ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleApproveAndSync()}
                className={`px-3.5 py-1 rounded-lg text-xs font-bold text-white shadow-md flex items-center gap-1.5 cursor-pointer transition ${
                  approvalStatus === "APPROVED"
                    ? "bg-emerald-700 hover:bg-emerald-600 shadow-emerald-700/20"
                    : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 ring-1 ring-emerald-400/50"
                }`}
                title="Authorize and officially approve document for print & export"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {approvalStatus === "APPROVED"
                    ? "Re-Sync Approval ✓"
                    : "Approve & Authorize Print ✓"}
                </span>
              </button>
              {approvalStatus === "APPROVED" && (
                <button
                  type="button"
                  onClick={handleRevertToDraft}
                  className="px-2 py-1 rounded text-[10px] font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                  title="Revert status to draft for revisions"
                >
                  Revert
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {approvalStatus === "DRAFT" && (
                <button
                  type="button"
                  onClick={handleSubmitForApproval}
                  className="px-3.5 py-1 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/25 flex items-center gap-1.5 cursor-pointer transition"
                  title="Submit to Company Owner or Higher Manager for review and print approval"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Submit for Owner Approval ➔</span>
                </button>
              )}
              {approvalStatus === "PENDING_APPROVAL" && (
                <button
                  type="button"
                  onClick={() => setShowApprovalGateModal(true)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold text-blue-300 bg-blue-950/60 border border-blue-500/40 flex items-center gap-1.5 cursor-pointer hover:bg-blue-900/40 transition"
                  title="Document is pending owner approval. Click to view status or switch account."
                >
                  <Lock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Pending Owner Review</span>
                </button>
              )}
              {approvalStatus === "APPROVED" && (
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Authorized to Print</span>
                </span>
              )}
            </div>
          )}

          {procurementPurpose === "BIDDING" && (
            <button
              type="button"
              onClick={handleOpenOpportunityModal}
              className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-indigo-600/25 flex items-center gap-1.5 cursor-pointer transition hover:scale-105 active:scale-95 border border-indigo-400/30"
              title="Create Bidding Opportunity in Opportunity Finder & Upload PhilGEPS PDF"
            >
              <FolderPlus className="w-3.5 h-3.5 text-amber-300" />
              <span>Create Opportunity &amp; PhilGEPS PDF ➔</span>
            </button>
          )}
        </div>
      </div>

      {/* Statutory Tax Regime & BIR Withholding Deductions Bar */}
      <div className="px-6 py-2 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex flex-wrap items-center gap-4">
          {/* VAT Status Switch */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tax Regime:</span>
            </span>
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setTaxType("VATABLE");
                  handleSaveState(
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    { taxType: "VATABLE" },
                  );
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                  taxType === "VATABLE"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
                title="VATable: Net Base = Direct Cost / 1.12; 5% Final Withholding VAT applies"
              >
                <span>🏢 VATable (Base: Direct Cost / 1.12)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTaxType("NON_VAT");
                  handleSaveState(
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    { taxType: "NON_VAT" },
                  );
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                  taxType === "NON_VAT"
                    ? "bg-amber-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Non-VAT: Net Base = Direct Cost; 0% VAT"
              >
                <span>📄 Non-VAT (Exempt / 0% VAT)</span>
              </button>
            </div>
          </div>

          {/* Project Procurement Category: Goods vs Infra */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-purple-400" />
              <span>Procurement Class:</span>
            </span>
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setProjectTaxCategory("GOODS");
                  handleSaveState(
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    { projectTaxCategory: "GOODS" },
                  );
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                  projectTaxCategory === "GOODS"
                    ? "bg-purple-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Goods & Supply: 5% Final VAT + 1% EWT + 1% Retention"
              >
                <span>📦 Goods (5% VAT + 1% EWT)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProjectTaxCategory("INFRA");
                  handleSaveState(
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    { projectTaxCategory: "INFRA" },
                  );
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                  projectTaxCategory === "INFRA"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Infrastructure & Civil Works: 5% Final VAT + 2% EWT + 1% Retention"
              >
                <span>🏗️ Infra (5% VAT + 2% EWT)</span>
              </button>
            </div>
          </div>

          {/* 1% Mandatory Retention Badge */}
          <div
            className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] text-amber-300 font-semibold"
            title="1% Statutory Retention Money deducted per billing milestone until final acceptance (RA 9184 & RA 12009)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>1% Retention Active</span>
          </div>
        </div>

        {/* Live Statutory Tax Summary Pill */}
        <div className="hidden xl:flex items-center gap-3 text-[11px] font-mono text-slate-300 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
          <span>
            Base:{" "}
            <strong className="text-white">
              {taxType === "VATABLE" ? "DC ÷ 1.12" : "DC"}
            </strong>
          </span>
          <span className="text-slate-600">•</span>
          <span>
            Deductions:{" "}
            <strong className="text-emerald-400">
              {taxType === "VATABLE" ? "5% VAT" : "0% VAT"}
            </strong>{" "}
            +{" "}
            <strong className="text-purple-400">
              {projectTaxCategory === "INFRA" ? "2% EWT" : "1% EWT"}
            </strong>{" "}
            + <strong className="text-amber-400">1% Ret</strong>
          </span>
          <span className="text-slate-600">•</span>
          <span>
            Labor Deductions:{" "}
            <strong className="text-blue-400">
              ₱{fmtPeso(totals.laborTotalDeductions)}
            </strong>
          </span>
        </div>
      </div>

      {/* Sync Confirmation Banner */}
      {syncNotification && (
        <div className="px-6 py-2.5 bg-emerald-950/70 border-b border-emerald-500/40 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-300 shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{syncNotification}</span>
          </div>
          <div className="flex items-center gap-2">
            {procurementPurpose === "BIDDING" && (
              <button
                type="button"
                onClick={handleOpenOpportunityModal}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-200" />
                <span>Upload PhilGEPS PDF &amp; Register Opportunity ➔</span>
              </button>
            )}
            <button
              onClick={() => setSyncNotification("")}
              className="p-1 text-emerald-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="px-6 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("tor")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer transition ${
              activeTab === "tor"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Terms of Reference (TOR) {torPdfFileName && "✓"}</span>
          </button>

          <button
            onClick={() => setActiveTab("matrix")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer transition ${
              activeTab === "matrix"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>
              {docMode === "POW"
                ? "POW Scope Matrix"
                : "Itemized Quotation Offer"}{" "}
              ({items.length} Items)
            </span>
          </button>

          <button
            onClick={() => setActiveTab("summary")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer transition ${
              activeTab === "summary"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>
              {docMode === "POW" ? "Cost Analysis" : "Commercial Terms"}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("signatories")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer transition ${
              activeTab === "signatories"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Signatories &amp; Approvals</span>
          </button>

          <button
            onClick={() => setActiveTab("dr")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer transition ${
              activeTab === "dr"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Delivery Receipt (DR)</span>
          </button>

          <button
            onClick={() => setActiveTab("print")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer transition ${
              activeTab === "print"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {docMode === "POW" ? "POW Print Sheet" : "Quotation Form"}
            </span>
          </button>
        </div>

        {/* Project Quick Selector */}
        {oppProjects.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Linked Project:</span>
            <select
              value={selectedOppId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedOppId(id);
                const found = oppProjects.find((p) => p.id === id);
                if (found) {
                  setProjectTitle(found.title);
                  setProjectRefNo(found.refNo);
                  setRfqNumber(`RFQ-${found.refNo}`);
                  setProcuringEntity(found.procuringEntity);
                  const amt = Number(
                    (found as any).abc || (found as any).contractAmount || 0,
                  );
                  if (amt > 0) setAppropriationAmount(amt * 1.05);
                }
              }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white max-w-xs truncate"
            >
              {oppProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.refNo} - {p.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Project Header Config Box */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
              Procuring Entity / Agency
            </label>
            <input
              type="text"
              value={procuringEntity}
              onChange={(e) => {
                setProcuringEntity(e.target.value);
                handleSaveState();
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
              Implementing Office / End-User
            </label>
            <input
              type="text"
              value={implementingOffice}
              onChange={(e) => {
                setImplementingOffice(e.target.value);
                handleSaveState();
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
              Project Name / Scope
            </label>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => {
                setProjectTitle(e.target.value);
                handleSaveState();
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
              {docMode === "POW"
                ? "Project Ref / Contract ID"
                : "RFQ / Canvass Reference No."}
            </label>
            <input
              type="text"
              value={docMode === "POW" ? projectRefNo : rfqNumber}
              onChange={(e) => {
                if (docMode === "POW") setProjectRefNo(e.target.value);
                else setRfqNumber(e.target.value);
                handleSaveState();
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
              Project Location
            </label>
            <input
              type="text"
              value={projectLocation}
              onChange={(e) => {
                setProjectLocation(e.target.value);
                handleSaveState();
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
              {docMode === "POW"
                ? "Duration / Calendar Days"
                : "Price Validity"}
            </label>
            <input
              type="text"
              value={docMode === "POW" ? projectDurationDays : priceValidity}
              onChange={(e) => {
                if (docMode === "POW") setProjectDurationDays(e.target.value);
                else setPriceValidity(e.target.value);
                handleSaveState();
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
              {docMode === "POW" ? "Source of Funds" : "Delivery Period"}
            </label>
            <input
              type="text"
              value={docMode === "POW" ? sourceOfFunds : deliveryPeriod}
              onChange={(e) => {
                if (docMode === "POW") setSourceOfFunds(e.target.value);
                else setDeliveryPeriod(e.target.value);
                handleSaveState();
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
            />
          </div>
        </div>

        {/* TAB 1: MASTER MATRIX (POW OR QUOTATION) */}
        {activeTab === "matrix" && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">
                  Quick Presets:
                </span>
                {docMode === "POW" ? (
                  <>
                    <button
                      onClick={() => {
                        setItems(PRESET_ROAD_DRAINAGE);
                        handleSaveState(PRESET_ROAD_DRAINAGE);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-blue-400 border border-slate-700 cursor-pointer"
                    >
                      Road &amp; Drainage POW
                    </button>
                    <button
                      onClick={() => {
                        setItems(PRESET_GOODS_QUOTATION);
                        handleSaveState(PRESET_GOODS_QUOTATION);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-purple-400 border border-slate-700 cursor-pointer"
                    >
                      IT &amp; General Works POW
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setItems(PRESET_GOODS_QUOTATION);
                        handleSaveState(PRESET_GOODS_QUOTATION);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-emerald-400 border border-slate-700 cursor-pointer"
                    >
                      IT Equipment RFQ
                    </button>
                    <button
                      onClick={() => {
                        setItems(PRESET_ROAD_DRAINAGE);
                        handleSaveState(PRESET_ROAD_DRAINAGE);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-blue-400 border border-slate-700 cursor-pointer"
                    >
                      Civil Works RFQ
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddItem}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer shadow ${
                    docMode === "POW"
                      ? "bg-blue-600 hover:bg-blue-500"
                      : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {docMode === "POW" ? "Add POW Item" : "Add Quotation Item"}
                  </span>
                </button>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800/90 text-[11px] text-slate-300 uppercase border-b border-slate-700">
                    <th className="p-2.5 w-20">Item No.</th>
                    <th className="p-2.5 min-w-55">
                      {docMode === "POW"
                        ? "Scope of Work / Description"
                        : "Technical Specifications & Description"}
                    </th>
                    {docMode === "QUOTATION" && (
                      <th className="p-2.5 min-w-37.5">
                        Brand &amp; Model Offered
                      </th>
                    )}
                    <th className="p-2.5 w-16 text-center">Qty</th>
                    <th className="p-2.5 w-16 text-center">Unit</th>
                    {docMode === "POW" ? (
                      <>
                        <th className="p-2.5 text-right w-24">Direct Cost</th>
                        <th className="p-2.5 text-right w-16">OCM%</th>
                        <th className="p-2.5 text-right w-16">Profit%</th>
                        <th className="p-2.5 text-right w-16">VAT%</th>
                      </>
                    ) : (
                      <>
                        <th className="p-2.5 text-right w-24">
                          Unit Price (₱)
                        </th>
                        <th className="p-2.5 text-center w-24">Compliance</th>
                      </>
                    )}
                    <th className="p-2.5 text-right w-28">Total Cost</th>
                    {docMode === "POW" && (
                      <th className="p-2.5 text-right w-24">Unit Cost</th>
                    )}
                    <th className="p-2.5 text-center w-16">% Wt</th>
                    <th className="p-2.5 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {totals.rowsWithWeight.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-800/40 transition"
                    >
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.itemNo}
                          onChange={(e) =>
                            handleUpdateItem(row.id, "itemNo", e.target.value)
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-xs text-white font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) =>
                            handleUpdateItem(
                              row.id,
                              "description",
                              e.target.value,
                            )
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                        />
                      </td>
                      {docMode === "QUOTATION" && (
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.brandModel || ""}
                            onChange={(e) =>
                              handleUpdateItem(
                                row.id,
                                "brandModel",
                                e.target.value,
                              )
                            }
                            placeholder="e.g. Brand & Model"
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-emerald-300 font-mono"
                          />
                        </td>
                      )}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          value={row.quantity}
                          onChange={(e) =>
                            handleUpdateItem(
                              row.id,
                              "quantity",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded px-1 py-1 text-xs text-center text-white font-mono"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="text"
                          value={row.unit}
                          onChange={(e) =>
                            handleUpdateItem(row.id, "unit", e.target.value)
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded px-1 py-1 text-xs text-center text-slate-300 font-mono"
                        />
                      </td>

                      {docMode === "POW" ? (
                        <>
                          <td className="p-2 text-right font-mono font-medium text-slate-200">
                            ₱{fmtPeso(row.directCost)}
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              value={row.ocmRate}
                              onChange={(e) =>
                                handleUpdateItem(
                                  row.id,
                                  "ocmRate",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="w-12 bg-slate-950 border border-slate-800 rounded px-1 py-1 text-xs text-right text-slate-300 font-mono"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              value={row.profitRate}
                              onChange={(e) =>
                                handleUpdateItem(
                                  row.id,
                                  "profitRate",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="w-12 bg-slate-950 border border-slate-800 rounded px-1 py-1 text-xs text-right text-slate-300 font-mono"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              value={row.vatRate}
                              onChange={(e) =>
                                handleUpdateItem(
                                  row.id,
                                  "vatRate",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="w-12 bg-slate-950 border border-slate-800 rounded px-1 py-1 text-xs text-right text-slate-300 font-mono"
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-2 text-right font-mono font-bold text-emerald-400">
                            ₱{fmtPeso(row.unitCost)}
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="text"
                              value={row.statementOfCompliance || "COMPLY"}
                              onChange={(e) =>
                                handleUpdateItem(
                                  row.id,
                                  "statementOfCompliance",
                                  e.target.value,
                                )
                              }
                              className="w-20 bg-slate-950 border border-slate-800 rounded px-1 py-1 text-[11px] text-center text-emerald-400 font-bold"
                            />
                          </td>
                        </>
                      )}

                      <td className="p-2 text-right font-mono font-bold text-white">
                        ₱{fmtPeso(row.totalCost)}
                      </td>
                      {docMode === "POW" && (
                        <td className="p-2 text-right font-mono text-slate-300">
                          ₱{fmtPeso(row.unitCost)}
                        </td>
                      )}
                      <td className="p-2 text-center font-mono text-[11px] text-blue-400">
                        {row.weightPercent.toFixed(2)}%
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleRemoveItem(row.id)}
                          className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/20 cursor-pointer"
                          title="Remove row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 font-bold border-t-2 border-slate-700 text-xs">
                    <td
                      colSpan={docMode === "POW" ? 4 : 5}
                      className="p-3 text-right uppercase text-slate-400"
                    >
                      {docMode === "POW"
                        ? "Total Program of Work:"
                        : "Total Quotation Offer:"}
                    </td>
                    {docMode === "POW" && (
                      <>
                        <td className="p-3 text-right font-mono text-slate-200">
                          ₱{fmtPeso(totals.totalDirect)}
                        </td>
                        <td
                          colSpan={3}
                          className="p-3 text-right font-mono text-amber-400"
                        >
                          ₱{fmtPeso(totals.totalIndirect)}
                        </td>
                      </>
                    )}
                    {docMode === "QUOTATION" && <td></td>}
                    <td className="p-3 text-right font-mono text-emerald-400 text-sm">
                      ₱{fmtPeso(totals.grandTotal)}
                    </td>
                    {docMode === "POW" && <td></td>}
                    <td className="p-3 text-center font-mono text-blue-400">
                      100.00%
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Quick Direct Cost Details & Statutory Tax / Labor Deductions Panel */}
            <div className="space-y-3">
              {/* Direct Cost Components & Total */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-semibold">
                      Total Materials
                    </span>
                    <span className="font-mono text-sm font-bold text-white">
                      ₱{fmtPeso(totals.totalMaterial)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-semibold">
                      Total Labor
                    </span>
                    <span className="font-mono text-sm font-bold text-white">
                      ₱{fmtPeso(totals.totalLabor)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-semibold">
                      Total Equipment
                    </span>
                    <span className="font-mono text-sm font-bold text-white">
                      ₱{fmtPeso(totals.totalEquipment)}
                    </span>
                  </div>
                  <div className="border-l border-slate-700 pl-6">
                    <span className="text-[10px] uppercase text-slate-400 block font-semibold">
                      Total Direct Cost (EDC)
                    </span>
                    <span className="font-mono text-sm font-bold text-blue-400">
                      ₱{fmtPeso(totals.totalDirect)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase text-slate-400 block font-semibold">
                    {docMode === "POW"
                      ? "Total Program of Work"
                      : "Total Quotation (Inclusive of VAT)"}
                  </span>
                  <span className="font-mono text-base font-black text-emerald-400">
                    ₱{fmtPeso(totals.grandTotal)}
                  </span>
                </div>
              </div>

              {/* Statutory Government Taxes & Retention Schedule (Direct Cost) */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white uppercase text-[11px] tracking-wide">
                      Government Statutory Tax &amp; Retention Schedule (Direct
                      Cost)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {totals.isVatable
                        ? "VATable (Base: Direct Cost ÷ 1.12)"
                        : "Non-VAT (100% Base)"}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {totals.isInfra
                        ? "Infrastructure (2% EWT)"
                        : "Goods & Supply (1% EWT)"}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    RA 9184 &amp; RA 12009 Statutory Deductions
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Net Base ({totals.isVatable ? "÷ 1.12" : "Full"}):
                    </span>
                    <span className="font-mono font-bold text-slate-200">
                      ₱{fmtPeso(totals.directCostNetBase)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      5% Final VAT ({totals.isVatable ? "5% of Net" : "0%"}):
                    </span>
                    <span className="font-mono font-bold text-red-400">
                      - ₱{fmtPeso(totals.directCostFinalVat5)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      {totals.ewtRate}% EWT (
                      {totals.isInfra ? "Infra" : "Goods"}):
                    </span>
                    <span className="font-mono font-bold text-red-400">
                      - ₱{fmtPeso(totals.directCostEwt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      1% Retention Money:
                    </span>
                    <span className="font-mono font-bold text-amber-400">
                      - ₱{fmtPeso(totals.directCostRetention)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Total Deductions:
                    </span>
                    <span className="font-mono font-bold text-red-300">
                      - ₱{fmtPeso(totals.directCostTotalDeductions)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Net Direct Payable:
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      ₱{fmtPeso(totals.directCostNetPayable)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dedicated Direct Labor Cost Schedule at Bottom */}
              <div className="p-4 rounded-xl bg-linear-to-r from-blue-950/40 via-slate-950 to-slate-950 border border-blue-500/30 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                    <span className="font-bold text-white uppercase text-[11px] tracking-wide">
                      Direct Labor Cost &amp; Statutory Labor Taxes (At Bottom)
                    </span>
                    <span className="text-[10px] text-blue-300 bg-blue-950 px-2 py-0.5 rounded border border-blue-500/30">
                      Symmetric Taxes on Labor Component
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Direct Labor Aggregated from Scope Items
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Total Labor Cost:
                    </span>
                    <span className="font-mono font-bold text-white">
                      ₱{fmtPeso(totals.totalLabor)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Labor Base ({totals.isVatable ? "÷ 1.12" : "Full"}):
                    </span>
                    <span className="font-mono font-bold text-slate-300">
                      ₱{fmtPeso(totals.laborNetBase)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      5% Labor VAT:
                    </span>
                    <span className="font-mono font-bold text-red-400">
                      - ₱{fmtPeso(totals.laborFinalVat5)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      {totals.ewtRate}% Labor EWT:
                    </span>
                    <span className="font-mono font-bold text-red-400">
                      - ₱{fmtPeso(totals.laborEwt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      1% Labor Retention:
                    </span>
                    <span className="font-mono font-bold text-amber-400">
                      - ₱{fmtPeso(totals.laborRetention)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Net Take-Home Labor:
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      ₱{fmtPeso(totals.netLaborPayable)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DIRECT VS INDIRECT COST / COMMERCIAL TERMS */}
        {activeTab === "summary" && (
          <div className="space-y-6">
            {docMode === "POW" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-500" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        A. Direct Costs Breakdown
                      </h3>
                    </div>
                    <span className="font-mono text-sm font-bold text-blue-400">
                      {totals.grandTotal > 0
                        ? (
                            (totals.totalDirect / totals.grandTotal) *
                            100
                          ).toFixed(1)
                        : 0}
                      % of POW
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">
                        1. Total Material Cost:
                      </span>
                      <span className="font-mono font-semibold text-white">
                        ₱{fmtPeso(totals.totalMaterial)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">
                        2. Total Labor Cost:
                      </span>
                      <span className="font-mono font-semibold text-white">
                        ₱{fmtPeso(totals.totalLabor)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">
                        3. Total Equipment Operating Cost:
                      </span>
                      <span className="font-mono font-semibold text-white">
                        ₱{fmtPeso(totals.totalEquipment)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 text-sm font-bold text-blue-300">
                      <span>Subtotal Direct Cost (EDC):</span>
                      <span className="font-mono">
                        ₱{fmtPeso(totals.totalDirect)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        B. Indirect Costs &amp; Markups
                      </h3>
                    </div>
                    <span className="font-mono text-sm font-bold text-amber-400">
                      {totals.grandTotal > 0
                        ? (
                            (totals.totalIndirect / totals.grandTotal) *
                            100
                          ).toFixed(1)
                        : 0}
                      % of POW
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">
                        1. Overhead, Contingencies &amp; Misc. (OCM):
                      </span>
                      <span className="font-mono font-semibold text-white">
                        ₱{fmtPeso(totals.totalOcm)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">
                        2. Contractor&apos;s Profit Margin (CP):
                      </span>
                      <span className="font-mono font-semibold text-white">
                        ₱{fmtPeso(totals.totalProfit)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">
                        3. Value-Added Tax / Gov Withholding Tax (VAT):
                      </span>
                      <span className="font-mono font-semibold text-white">
                        ₱{fmtPeso(totals.totalVat)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 text-sm font-bold text-amber-300">
                      <span>Subtotal Indirect Cost:</span>
                      <span className="font-mono">
                        ₱{fmtPeso(totals.totalIndirect)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Government Commercial Canvass Terms
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                      Payment Terms
                    </label>
                    <input
                      type="text"
                      value={paymentTerms}
                      onChange={(e) => {
                        setPaymentTerms(e.target.value);
                        handleSaveState();
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                      Warranty Period
                    </label>
                    <input
                      type="text"
                      value={warrantyTerms}
                      onChange={(e) => {
                        setWarrantyTerms(e.target.value);
                        handleSaveState();
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                      Canvasser / Authorized Contact
                    </label>
                    <input
                      type="text"
                      value={canvasserName}
                      onChange={(e) => {
                        setCanvasserName(e.target.value);
                        handleSaveState();
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Grand Total Comparison Card */}
            <div className="p-6 rounded-2xl bg-linear-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
                  {docMode === "POW"
                    ? "Official Program of Work Total"
                    : "Total Quotation Offer (VAT Inclusive)"}
                </span>
                <p className="text-2xl font-black text-white font-mono mt-1">
                  ₱{fmtPeso(totals.grandTotal)}
                </p>
                <p className="text-xs text-slate-400 italic mt-0.5">
                  Amount in words: {numberToWords(totals.grandTotal)}
                </p>
              </div>

              <div className="text-right border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-6">
                <span className="text-xs text-slate-400 uppercase">
                  Approved Budget for Contract (ABC)
                </span>
                <p className="text-lg font-bold text-slate-200 font-mono">
                  ₱{fmtPeso(appropriationAmount)}
                </p>
                <span className="text-[11px] text-emerald-400 font-semibold">
                  Variance to ABC: ₱
                  {fmtPeso(appropriationAmount - totals.grandTotal)} (Within
                  Statutory Limit)
                </span>
              </div>
            </div>

            {/* C. Government Statutory Taxes & Retention Schedule */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    C. Government Statutory Taxes &amp; Retention Schedule (RA
                    9184 &amp; BIR Compliant)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      totals.isVatable
                        ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    }`}
                  >
                    {totals.isVatable
                      ? "VATable (Direct Cost ÷ 1.12)"
                      : "Non-VAT (100% Direct Base)"}
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {totals.isInfra
                      ? "Civil Works / Infra (2% EWT)"
                      : "Goods & Supply (1% EWT)"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">
                      Total Direct Cost (EDC):
                    </span>
                    <span className="font-mono font-bold text-white">
                      ₱{fmtPeso(totals.totalDirect)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">
                      Statutory Tax Base (
                      {totals.isVatable ? "Direct Cost ÷ 1.12" : "Full Base"}):
                    </span>
                    <span className="font-mono font-bold text-blue-300">
                      ₱{fmtPeso(totals.directCostNetBase)}
                    </span>
                  </div>
                  {totals.isVatable && (
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">
                        12% Embedded VAT Component (12% of Net Base):
                      </span>
                      <span className="font-mono text-slate-300">
                        ₱{fmtPeso(totals.directCostTax.outputVat12)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-slate-800/80 text-red-400">
                    <span>
                      1. 5% Final Withholding VAT (
                      {totals.isVatable ? "5% of Net Base" : "0% (Non-VAT)"}):
                    </span>
                    <span className="font-mono font-bold">
                      - ₱{fmtPeso(totals.directCostFinalVat5)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80 text-red-400">
                    <span>
                      2. {totals.ewtRate}% Expanded Withholding Tax (EWT):
                    </span>
                    <span className="font-mono font-bold">
                      - ₱{fmtPeso(totals.directCostEwt)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80 text-amber-400">
                    <span>
                      3. 1% Mandatory Retention Money (RA 9184 &amp; RA 12009):
                    </span>
                    <span className="font-mono font-bold">
                      - ₱{fmtPeso(totals.directCostRetention)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 font-bold text-red-300 text-sm">
                    <span>Total Statutory Deductions:</span>
                    <span className="font-mono">
                      - ₱{fmtPeso(totals.directCostTotalDeductions)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-between bg-linear-to-br from-emerald-950/40 via-slate-950 to-slate-950 p-5 rounded-xl border border-emerald-500/30">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                      Net Estimated Direct Disbursement
                    </span>
                    <p className="text-2xl font-black text-white font-mono">
                      ₱{fmtPeso(totals.directCostNetPayable)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                      This represents the net government payment released to the
                      contractor after BIR mandatory tax withholdings (
                      {totals.isVatable ? "5% VAT + " : ""}
                      {totals.ewtRate}% EWT) and 1% statutory retention money
                      pursuant to RA 9184 &amp; RA 12009.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-800/80 mt-4 text-[11px] text-slate-300 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Retention Released Upon:
                      </span>
                      <strong className="text-amber-300">
                        Final Acceptance &amp; Warranty Security
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        BIR Tax Form Certificate:
                      </span>
                      <strong className="text-white">
                        BIR Form 2307 / 2306
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* D. Direct Labor Cost & Statutory Taxes Schedule (At Bottom) */}
            <div className="p-6 rounded-2xl bg-linear-to-r from-blue-950/30 via-slate-900 to-slate-900 border border-blue-500/40 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    D. Direct Labor Cost &amp; Statutory Labor Taxes Schedule
                    (At Bottom)
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-blue-300 bg-blue-950 px-2.5 py-0.5 rounded border border-blue-500/30">
                  Labor Aggregated from Detailed Item Estimates
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">
                      Total Direct Labor Component:
                    </span>
                    <span className="font-mono font-bold text-white">
                      ₱{fmtPeso(totals.totalLabor)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">
                      Labor Tax Base (
                      {totals.isVatable ? "Labor ÷ 1.12" : "Full Labor"}):
                    </span>
                    <span className="font-mono font-bold text-blue-300">
                      ₱{fmtPeso(totals.laborNetBase)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80 text-red-400">
                    <span>
                      1. 5% Labor Withholding VAT (
                      {totals.isVatable ? "5% of Labor Base" : "0% (Non-VAT)"}):
                    </span>
                    <span className="font-mono font-bold">
                      - ₱{fmtPeso(totals.laborFinalVat5)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80 text-red-400">
                    <span>
                      2. {totals.ewtRate}% Labor EWT (
                      {totals.isInfra ? "2% Infra" : "1% Goods"}):
                    </span>
                    <span className="font-mono font-bold">
                      - ₱{fmtPeso(totals.laborEwt)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80 text-amber-400">
                    <span>3. 1% Labor Retention Money:</span>
                    <span className="font-mono font-bold">
                      - ₱{fmtPeso(totals.laborRetention)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 font-bold text-red-300 text-sm">
                    <span>Total Labor Taxes &amp; Retention:</span>
                    <span className="font-mono">
                      - ₱{fmtPeso(totals.laborTotalDeductions)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-between bg-linear-to-br from-blue-950/40 via-slate-950 to-slate-950 p-5 rounded-xl border border-blue-500/30">
                  <div>
                    <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block mb-1">
                      Net Take-Home Labor / Labor Payable
                    </span>
                    <p className="text-2xl font-black text-white font-mono">
                      ₱{fmtPeso(totals.netLaborPayable)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                      Symmetric government tax computation applied specifically
                      to the project labor force and technical service component
                      ({totals.isVatable ? "5% VAT + " : ""}
                      {totals.ewtRate}% EWT + 1% Retention).
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-800/80 mt-4 text-[11px] text-slate-300 flex justify-between">
                    <span className="text-slate-400">
                      Labor Share of Total Direct Cost:
                    </span>
                    <strong className="text-blue-300 font-mono">
                      {totals.totalDirect > 0
                        ? (
                            (totals.totalLabor / totals.totalDirect) *
                            100
                          ).toFixed(1)
                        : 0}
                      % of EDC
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Embedded Signatories Control */}
            {renderSignatoriesEditor("embedded")}
          </div>
        )}

        {/* TAB 3: SIGNATORIES & APPROVALS HIERARCHY */}
        {activeTab === "signatories" && (
          <div className="space-y-6">{renderSignatoriesEditor("full-tab")}</div>
        )}

        {/* TAB 4: TERMS OF REFERENCE (TOR) MANAGER */}
        {activeTab === "tor" && (
          <div className="space-y-6">
            {/* SUB-TAB TOGGLE: GENERATE VS UPLOAD */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Terms of Reference (TOR) Procurement Hub
                  </h3>
                  <p className="text-xs text-slate-400">
                    Formulate statutory specifications under RA 9184 / RA 12009
                    or attach pre-signed procuring entity documents
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setTorMode("GENERATE")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      torMode === "GENERATE"
                        ? "bg-amber-500 text-slate-950 shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>Statutory Generator</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTorMode("UPLOAD")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      torMode === "UPLOAD"
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload PDF</span>
                  </button>
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer ml-2">
                  <input
                    type="checkbox"
                    checked={appendTorToPdf}
                    onChange={(e) => setAppendTorToPdf(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Append to Final Package</span>
                </label>
              </div>
            </div>

            {/* CURRENT ATTACHED / LINKED TOR STATUS CARD */}
            {torPdfDataUrl && (
              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white">
                        {torPdfFileName}
                      </p>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Linked to {docMode === "POW" ? "POW" : "Quotation"}{" "}
                        Package
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono mt-0.5">
                      <span>Size: {torPdfFileSize}</span>
                      <span>•</span>
                      <span>Date: {torPdfUploadDate}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold">
                        IndexedDB Stored
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTorPreviewModal(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    <span>Preview TOR</span>
                  </button>

                  <button
                    onClick={handleTorDelete}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Unlink / Delete</span>
                  </button>
                </div>
              </div>
            )}

            {/* MODE 1: INTERACTIVE STATUTORY TOR GENERATOR */}
            {torMode === "GENERATE" && (
              <TermsOfReferenceContent
                tenant={tenant}
                activeProjectRefNo={projectRefNo}
                activeProjectTitle={projectTitle}
                activeProcuringEntity={procuringEntity}
                activeAbcAmount={totals.grandTotal}
                activeTrackingNumber={trackingNumber}
                powScopeItems={items}
                initialPreset={
                  initialTab === "tor"
                    ? "LTCISCC_COMMAND_CENTER"
                    : "LTCISCC_COMMAND_CENTER"
                }
                isEmbedded={true}
                onSaveAndComplete={handleTorGenerated}
              />
            )}

            {/* MODE 2: UPLOAD SCANNED TOR PDF */}
            {torMode === "UPLOAD" && (
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <input
                  type="file"
                  ref={torInputRef}
                  accept="application/pdf"
                  onChange={handleTorUpload}
                  className="hidden"
                />

                <div
                  onClick={() => torInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-8 text-center cursor-pointer transition bg-slate-950/50 hover:bg-blue-950/10 space-y-3"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-400 mx-auto flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      Click to Upload Terms of Reference (TOR) PDF
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Accepts standard government PDF (Scope of Work, Technical
                      Specifications, TOR)
                    </p>
                  </div>
                  <span className="inline-block px-3 py-1 rounded-full text-[11px] font-mono bg-slate-800 text-slate-300">
                    Legal &amp; A4 Compatible (Auto-Normalized to Legal
                    8.5&quot; x 13&quot;)
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/30 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300 space-y-1">
                    <p className="font-bold text-white">
                      Philippine Procurement Statutory Standard:
                    </p>
                    <p className="text-slate-400">
                      Pursuant to Section 17.7 of RA 9184 and RA 12009 (NGPA),
                      the Terms of Reference (TOR) define the definitive
                      statutory scope of project deliverables. Attached TOR
                      documents maintain 100% resolution with all BAC stamps and
                      digital signatures preserved.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: OFFICIAL DELIVERY RECEIPT (DR) */}
        {activeTab === "dr" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Official Delivery Receipt (DR) — For Direct Delivery /
                  Invoicing
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {deliveryReceiptNo}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    approvalStatus === "APPROVED"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-amber-500/20 text-amber-300"
                  }`}
                >
                  {approvalStatus}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadDrPdf}
                  disabled={isExportingDr}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer shadow transition disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {isExportingDr ? "Compiling..." : "Download DR PDF (Legal)"}
                  </span>
                </button>
              </div>
            </div>

            {/* Official DR Printable Sheet */}
            <div className="overflow-x-auto flex justify-center py-4 bg-slate-900/40 rounded-xl border border-slate-800">
              <div
                id="dr-print-sheet"
                style={{
                  width: "816px",
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                  fontFamily: '"Times New Roman", Times, serif',
                  padding: "36px 44px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                }}
                className="select-text"
              >
                {/* Letterhead */}
                <div className="text-center space-y-1 border-b-2 border-black pb-3 mb-4">
                  <h2 className="text-[13pt] font-black uppercase tracking-wide">
                    {contractorName}
                  </h2>
                  <p className="text-[8.5pt] italic">{contractorAddress}</p>
                  <p className="text-[8pt] font-mono">
                    VAT Reg. TIN: {contractorTin} | PhilGEPS Platinum:{" "}
                    {contractorPhilgeps}
                  </p>
                  <div className="pt-2">
                    <h1 className="text-[14pt] font-black uppercase tracking-wider underline">
                      OFFICIAL DELIVERY RECEIPT
                    </h1>
                    <p className="text-[8pt] font-bold uppercase tracking-wider text-slate-700">
                      (PROPERTY &amp; SUPPLY CUSTODIAL RECEIVING COPY)
                    </p>
                  </div>
                </div>

                {/* DR Header Info */}
                <table className="w-full text-[8.5pt] mb-4 border-collapse">
                  <tbody>
                    <tr>
                      <td className="w-28 font-bold py-0.5">Delivered to:</td>
                      <td className="font-bold uppercase py-0.5">
                        {procuringEntity}
                      </td>
                      <td className="w-28 font-bold py-0.5">DR Number:</td>
                      <td className="w-40 font-mono font-bold py-0.5 text-red-700">
                        {deliveryReceiptNo}
                      </td>
                    </tr>
                    <tr>
                      <td className="font-bold py-0.5">Delivery Site:</td>
                      <td className="py-0.5">{projectLocation}</td>
                      <td className="font-bold py-0.5">Delivery Date:</td>
                      <td className="py-0.5">{todayStr}</td>
                    </tr>
                    <tr>
                      <td className="font-bold py-0.5">Project / Order:</td>
                      <td className="py-0.5 uppercase">{projectTitle}</td>
                      <td className="font-bold py-0.5">Reference No.:</td>
                      <td className="font-mono py-0.5 font-bold">
                        {trackingNumber}
                      </td>
                    </tr>
                    <tr>
                      <td className="font-bold py-0.5">Canvasser / Contact:</td>
                      <td className="py-0.5">{canvasserName}</td>
                      <td className="font-bold py-0.5">Payment Terms:</td>
                      <td className="py-0.5">{paymentTerms}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Delivered Items Table */}
                <table className="w-full text-[8pt] border-collapse border border-black mb-4">
                  <thead>
                    <tr className="bg-slate-100 text-center font-bold border-b border-black">
                      <th className="border border-black p-1.5 w-14">Item #</th>
                      <th className="border border-black p-1.5 text-left">
                        Description of Delivered Goods &amp; Brand/Model
                      </th>
                      <th className="border border-black p-1.5 w-16">Qty</th>
                      <th className="border border-black p-1.5 w-14">Unit</th>
                      <th className="border border-black p-1.5 w-24">
                        Unit Price (₱)
                      </th>
                      <th className="border border-black p-1.5 w-28">
                        Total Amount (₱)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {totals.rowsWithWeight.map((it) => (
                      <tr key={it.id} className="border-b border-slate-300">
                        <td className="border border-black p-1.5 text-center font-mono font-semibold">
                          {it.itemNo}
                        </td>
                        <td className="border border-black p-1.5 text-left">
                          <p className="font-semibold">{it.description}</p>
                          {it.brandModel && (
                            <p className="text-[7pt] text-slate-600 font-mono mt-0.5">
                              Brand / Model: {it.brandModel}
                            </p>
                          )}
                        </td>
                        <td className="border border-black p-1.5 text-center font-mono font-bold">
                          {it.quantity.toLocaleString()}
                        </td>
                        <td className="border border-black p-1.5 text-center">
                          {it.unit}
                        </td>
                        <td className="border border-black p-1.5 text-right font-mono">
                          ₱{fmtPeso(it.unitCost)}
                        </td>
                        <td className="border border-black p-1.5 text-right font-mono font-bold">
                          ₱{fmtPeso(it.totalCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-black">
                      <td
                        colSpan={5}
                        className="border border-black p-1.5 text-right uppercase"
                      >
                        Total Amount of Delivered Goods (VAT Inclusive):
                      </td>
                      <td className="border border-black p-1.5 text-right font-mono text-[9pt]">
                        ₱{fmtPeso(totals.grandTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Receiving Acknowledgment Statement */}
                <div className="border border-black p-2.5 text-[7.5pt] mb-6 space-y-1 bg-slate-50">
                  <p className="font-bold underline">
                    RECEIVING AND CUSTODIAL UNDERTAKING:
                  </p>
                  <p>
                    Received from <strong>{contractorName}</strong> the
                    above-described goods, materials, and equipment in brand new
                    condition, complete quantity, and in accordance with the
                    specifications set forth in the purchase request/order.
                  </p>
                  <p className="italic">
                    Total Delivered Amount in Words:{" "}
                    <strong>{numberToWords(totals.grandTotal)}</strong>
                  </p>
                </div>

                {/* 3 Signatures Block */}
                <div className="grid grid-cols-3 gap-6 text-[7.5pt] pt-2 border-t border-black text-center">
                  <div>
                    <p className="uppercase text-slate-500 mb-8">
                      Delivered by / Carrier:
                    </p>
                    <p className="font-bold uppercase border-b border-black pb-0.5">
                      {signatoryName}
                    </p>
                    <p className="text-[7pt]">{signatoryTitle}</p>
                    <p className="text-[6.5pt] text-slate-500">
                      {contractorName}
                    </p>
                  </div>

                  <div>
                    <p className="uppercase text-slate-500 mb-8">
                      Received in Good Order by:
                    </p>
                    <p className="font-bold uppercase border-b border-black pb-0.5">
                      {canvasserName || "Property Custodian"}
                    </p>
                    <p className="text-[7pt]">
                      Property &amp; Supply Custodian / Authorized Receiver
                    </p>
                    <p className="text-[6.5pt] text-slate-500">
                      {procuringEntity}
                    </p>
                  </div>

                  <div>
                    <p className="uppercase text-slate-500 mb-8">
                      Inspected &amp; Verified by:
                    </p>
                    <p className="font-bold uppercase border-b border-black pb-0.5">
                      {checkedByName || "Inspector"}
                    </p>
                    <p className="text-[7pt]">
                      Inspection &amp; Acceptance Committee (IAR)
                    </p>
                    <p className="text-[6.5pt] text-slate-500">
                      Government Inspection Unit
                    </p>
                  </div>
                </div>

                <div className="pt-4 text-center text-[6.5pt] text-slate-500 border-t border-slate-200 mt-6">
                  Official Delivery Receipt compliant with Republic Act 9184
                  &amp; Republic Act 12009 (NGPA) and COA Circular No. 2023-004.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PRINT PREVIEW (POW OR QUOTATION SHEET) */}
        {activeTab === "print" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400">
                  Print Sheet Orientation:
                </span>
                <button
                  onClick={() => setPrintOrientation("landscape")}
                  className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                    printOrientation === "landscape"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  Legal Landscape (13&quot; x 8.5&quot;)
                </button>
                <button
                  onClick={() => setPrintOrientation("portrait")}
                  className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                    printOrientation === "portrait"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  Legal Portrait (8.5&quot; x 13&quot;)
                </button>
              </div>

              <span className="text-xs text-slate-400 italic">
                {docMode === "POW"
                  ? "Official DPWH / Government POW Layout"
                  : "Official Canvass / Quotation Form Layout"}
              </span>
            </div>

            {/* Official Printable Sheet Container */}
            <div className="overflow-x-auto flex justify-center py-4 bg-slate-900/40 rounded-xl border border-slate-800">
              <div
                id="pow-print-sheet"
                style={{
                  width: printOrientation === "landscape" ? "1248px" : "816px",
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                  fontFamily: '"Times New Roman", Times, serif',
                  padding: "36px 44px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                }}
                className="select-text"
              >
                {docMode === "POW" ? (
                  /* ─── POW GOVERNMENT SHEET ─── */
                  <>
                    <div className="text-center space-y-1 border-b-2 border-black pb-3 mb-4">
                      <p className="text-[10pt] uppercase tracking-widest font-normal">
                        Republic of the Philippines
                      </p>
                      <p className="text-[12pt] font-bold uppercase tracking-wide">
                        {procuringEntity}
                      </p>
                      <p className="text-[9.5pt] uppercase">
                        {implementingOffice}
                      </p>
                      <p className="text-[9pt] italic">{projectLocation}</p>
                      <div className="pt-2">
                        <h1 className="text-[14pt] font-black uppercase tracking-wider underline">
                          PROGRAM OF WORK (POW)
                        </h1>
                        <p className="text-[8.5pt] font-bold uppercase tracking-wider">
                          (DETAILED COST ESTIMATE &amp; SCOPE OF WORK BREAKDOWN)
                        </p>
                        <div className="flex items-center justify-center gap-3 pt-1 text-[8pt] font-mono">
                          <span className="font-bold text-blue-950">
                            Tracking ID: {trackingNumber}
                          </span>
                          <span>•</span>
                          <span
                            className={
                              approvalStatus === "APPROVED"
                                ? "text-emerald-700 font-bold"
                                : approvalStatus === "PENDING_APPROVAL"
                                  ? "text-blue-700 font-bold"
                                  : "text-amber-700 font-bold"
                            }
                          >
                            Status:{" "}
                            {approvalStatus === "APPROVED"
                              ? `OFFICIALLY APPROVED (${approvedAt || todayStr})`
                              : approvalStatus === "PENDING_APPROVAL"
                                ? "PENDING OWNER REVIEW"
                                : "DRAFT ESTIMATE (UNAPPROVED)"}
                          </span>
                        </div>
                      </div>

                      {/* Official Approval Stamp / Clearance Block */}
                      {approvalStatus === "APPROVED" ? (
                        <div className="mt-2.5 mx-auto max-w-lg border-2 border-emerald-700 bg-emerald-50/90 p-2 rounded text-emerald-950 text-[7.5pt] flex items-center justify-between font-sans">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-black flex items-center justify-center text-[10px]">
                              ✓
                            </span>
                            <div className="text-left">
                              <p className="font-black uppercase tracking-wider text-[8pt] text-emerald-900 leading-tight">
                                OFFICIALLY APPROVED &amp; AUTHORIZED FOR
                                PROCUREMENT
                              </p>
                              <p className="text-[6.5pt] text-emerald-800">
                                Approved by:{" "}
                                <strong>
                                  {approvedByUserName || approvedByName}
                                </strong>{" "}
                                ({approvedByRole || "Company Owner"}) • Verified
                                on: {approvedAt || todayStr}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono text-[7pt] font-bold text-emerald-900 border border-emerald-600 px-2 py-0.5 rounded bg-emerald-100 uppercase">
                            OFFICIAL RELEASE
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2.5 mx-auto max-w-lg border-2 border-dashed border-amber-600 bg-amber-50/90 p-2 rounded text-amber-950 text-[7.5pt] flex items-center justify-between font-sans">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-black flex items-center justify-center text-[10px]">
                              !
                            </span>
                            <div className="text-left">
                              <p className="font-black uppercase tracking-wider text-[8pt] text-amber-900 leading-tight">
                                {approvalStatus === "PENDING_APPROVAL"
                                  ? "PENDING HIGHER MANAGEMENT REVIEW & APPROVAL"
                                  : "DRAFT ESTIMATE — NOT VALID FOR OFFICIAL SUBMISSION"}
                              </p>
                              <p className="text-[6.5pt] text-amber-800">
                                Prepared by:{" "}
                                <strong>
                                  {submittedByUserName || preparedByName}
                                </strong>{" "}
                                • Official printing and BAC submission gated
                                until Owner / Manager sign-off.
                              </p>
                            </div>
                          </div>
                          <span className="font-mono text-[7pt] font-bold text-amber-900 border border-amber-600 px-2 py-0.5 rounded bg-amber-100 uppercase">
                            {approvalStatus === "PENDING_APPROVAL"
                              ? "REVIEW PENDING"
                              : "DRAFT"}
                          </span>
                        </div>
                      )}
                    </div>

                    <table className="w-full text-[8.5pt] mb-4 border-collapse">
                      <tbody>
                        <tr>
                          <td className="w-28 font-bold py-0.5">
                            Project Name:
                          </td>
                          <td className="font-bold uppercase py-0.5">
                            {projectTitle}
                          </td>
                          <td className="w-28 font-bold py-0.5">
                            Date Prepared:
                          </td>
                          <td className="w-36 py-0.5">{todayStr}</td>
                        </tr>
                        <tr>
                          <td className="font-bold py-0.5">
                            Project Location:
                          </td>
                          <td className="py-0.5">{projectLocation}</td>
                          <td className="font-bold py-0.5">
                            Project Ref. No.:
                          </td>
                          <td className="font-mono py-0.5 font-bold">
                            {projectRefNo}
                          </td>
                        </tr>
                        <tr>
                          <td className="font-bold py-0.5">
                            Appropriation (ABC):
                          </td>
                          <td className="py-0.5 font-mono font-bold">
                            ₱{fmtPeso(appropriationAmount)}
                          </td>
                          <td className="font-bold py-0.5">Calendar Days:</td>
                          <td className="py-0.5 font-mono">
                            {projectDurationDays}
                          </td>
                        </tr>
                        <tr>
                          <td className="font-bold py-0.5">Source of Funds:</td>
                          <td className="py-0.5">{sourceOfFunds}</td>
                          <td className="font-bold py-0.5">
                            Target Completion:
                          </td>
                          <td className="py-0.5">{targetCompletionDate}</td>
                        </tr>
                      </tbody>
                    </table>

                    <table className="w-full text-[8pt] border-collapse border border-black mb-4">
                      <thead>
                        <tr className="bg-slate-100 text-center font-bold border-b border-black">
                          <th className="border border-black p-1 w-16">
                            Item No.
                          </th>
                          <th className="border border-black p-1 text-left">
                            Description of Work / Specifications
                          </th>
                          <th className="border border-black p-1 w-14">Qty</th>
                          <th className="border border-black p-1 w-12">Unit</th>
                          <th className="border border-black p-1 w-24">
                            Direct Cost
                          </th>
                          <th className="border border-black p-1 w-12">OCM</th>
                          <th className="border border-black p-1 w-12">
                            Profit
                          </th>
                          <th className="border border-black p-1 w-12">VAT</th>
                          <th className="border border-black p-1 w-24">
                            Total Cost
                          </th>
                          <th className="border border-black p-1 w-20">
                            Unit Cost
                          </th>
                          <th className="border border-black p-1 w-12">% Wt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {totals.rowsWithWeight.map((it) => (
                          <tr key={it.id} className="border-b border-slate-300">
                            <td className="border border-black p-1 text-center font-mono font-semibold">
                              {it.itemNo}
                            </td>
                            <td className="border border-black p-1 text-left">
                              {it.description}
                            </td>
                            <td className="border border-black p-1 text-center font-mono">
                              {it.quantity.toLocaleString()}
                            </td>
                            <td className="border border-black p-1 text-center">
                              {it.unit}
                            </td>
                            <td className="border border-black p-1 text-right font-mono">
                              ₱{fmtPeso(it.directCost)}
                            </td>
                            <td className="border border-black p-1 text-right font-mono">
                              {it.ocmRate}%
                            </td>
                            <td className="border border-black p-1 text-right font-mono">
                              {it.profitRate}%
                            </td>
                            <td className="border border-black p-1 text-right font-mono">
                              {it.vatRate}%
                            </td>
                            <td className="border border-black p-1 text-right font-mono font-bold">
                              ₱{fmtPeso(it.totalCost)}
                            </td>
                            <td className="border border-black p-1 text-right font-mono">
                              ₱{fmtPeso(it.unitCost)}
                            </td>
                            <td className="border border-black p-1 text-center font-mono">
                              {it.weightPercent.toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold border-t-2 border-black">
                          <td
                            colSpan={4}
                            className="border border-black p-1.5 text-right uppercase"
                          >
                            Total Estimated Cost of Work:
                          </td>
                          <td className="border border-black p-1.5 text-right font-mono">
                            ₱{fmtPeso(totals.totalDirect)}
                          </td>
                          <td
                            colSpan={3}
                            className="border border-black p-1.5 text-right font-mono"
                          >
                            ₱{fmtPeso(totals.totalIndirect)}
                          </td>
                          <td className="border border-black p-1.5 text-right font-mono text-[9pt]">
                            ₱{fmtPeso(totals.grandTotal)}
                          </td>
                          <td className="border border-black p-1.5 text-center">
                            -
                          </td>
                          <td className="border border-black p-1.5 text-center font-mono">
                            100.00%
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    <div className="grid grid-cols-2 gap-4 text-[8pt] border border-black p-2.5 mb-5 bg-slate-50">
                      <div>
                        <p className="font-bold underline mb-1">
                          A. DIRECT COST BREAKDOWN:
                        </p>
                        <div className="flex justify-between py-0.5">
                          <span>Materials Total:</span>
                          <span className="font-mono font-semibold">
                            ₱{fmtPeso(totals.totalMaterial)}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span>Labor Total:</span>
                          <span className="font-mono font-semibold">
                            ₱{fmtPeso(totals.totalLabor)}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span>Equipment Rental Total:</span>
                          <span className="font-mono font-semibold">
                            ₱{fmtPeso(totals.totalEquipment)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-black font-bold">
                          <span>Total Estimated Direct Cost (EDC):</span>
                          <span className="font-mono">
                            ₱{fmtPeso(totals.totalDirect)}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="font-bold underline mb-1">
                          B. INDIRECT COST &amp; MARKUPS:
                        </p>
                        <div className="flex justify-between py-0.5">
                          <span>
                            Overhead, Contingencies &amp; Misc. (OCM):
                          </span>
                          <span className="font-mono font-semibold">
                            ₱{fmtPeso(totals.totalOcm)}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span>Contractor&apos;s Profit Margin (CP):</span>
                          <span className="font-mono font-semibold">
                            ₱{fmtPeso(totals.totalProfit)}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span>
                            Output VAT Component (
                            {totals.isVatable ? "12% VAT" : "0% Non-VAT"}):
                          </span>
                          <span className="font-mono font-semibold">
                            ₱{fmtPeso(totals.totalVat)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-black font-bold">
                          <span>Total Program of Work (Grand Total):</span>
                          <span className="font-mono text-[9pt]">
                            ₱{fmtPeso(totals.grandTotal)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-black">
                        <p className="font-bold underline mb-1">
                          C. STATUTORY TAXES &amp; RETENTION (
                          {totals.isVatable
                            ? "VATABLE - BASE: DIRECT COST / 1.12"
                            : "NON-VAT"}
                          ):
                        </p>
                        <div className="flex justify-between py-0.5">
                          <span>
                            Tax Base (
                            {totals.isVatable
                              ? "Direct Cost ÷ 1.12"
                              : "Full Base"}
                            ):
                          </span>
                          <span className="font-mono font-semibold">
                            ₱{fmtPeso(totals.directCostNetBase)}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5 text-red-800">
                          <span>
                            5% Final Withholding VAT (
                            {totals.isVatable ? "5% of Base" : "0%"}):
                          </span>
                          <span className="font-mono font-semibold">
                            - ₱{fmtPeso(totals.directCostFinalVat5)}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5 text-red-800">
                          <span>
                            {totals.ewtRate}% Expanded Withholding Tax (
                            {totals.isInfra ? "2% Infra" : "1% Goods"}):
                          </span>
                          <span className="font-mono font-semibold">
                            - ₱{fmtPeso(totals.directCostEwt)}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5 text-red-800">
                          <span>1% Mandatory Retention Money (RA 9184):</span>
                          <span className="font-mono font-semibold">
                            - ₱{fmtPeso(totals.directCostRetention)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-black font-bold">
                          <span>Net Estimated Direct Disbursement:</span>
                          <span className="font-mono text-emerald-900">
                            ₱{fmtPeso(totals.directCostNetPayable)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-black">
                        <p className="font-bold underline mb-1">
                          D. DIRECT LABOR COST &amp; LABOR TAXES (AT BOTTOM):
                        </p>
                        <div className="flex justify-between py-0.5">
                          <span>Total Direct Labor Component:</span>
                          <span className="font-mono font-semibold">
                            ₱{fmtPeso(totals.totalLabor)}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span>
                            Labor Net Base (
                            {totals.isVatable ? "Labor ÷ 1.12" : "Full Labor"}):
                          </span>
                          <span className="font-mono font-semibold">
                            ₱{fmtPeso(totals.laborNetBase)}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5 text-red-800">
                          <span>5% Labor Withholding VAT:</span>
                          <span className="font-mono font-semibold">
                            - ₱{fmtPeso(totals.laborFinalVat5)}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5 text-red-800">
                          <span>
                            {totals.ewtRate}% Labor EWT (
                            {totals.isInfra ? "2% Infra" : "1% Goods"}):
                          </span>
                          <span className="font-mono font-semibold">
                            - ₱{fmtPeso(totals.laborEwt)}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5 text-red-800">
                          <span>1% Labor Retention Money:</span>
                          <span className="font-mono font-semibold">
                            - ₱{fmtPeso(totals.laborRetention)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-black font-bold">
                          <span>Net Disbursable Labor Amount:</span>
                          <span className="font-mono text-emerald-900">
                            ₱{fmtPeso(totals.netLaborPayable)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-[8pt] pt-2 border-t border-black text-center">
                      <div>
                        <p className="text-[7.5pt] uppercase text-slate-500 mb-6">
                          Prepared by:
                        </p>
                        <p className="font-bold uppercase border-b border-black pb-0.5">
                          {preparedByName}
                        </p>
                        <p className="text-[7pt]">{preparedByTitle}</p>
                        <p className="text-[6.5pt] text-slate-500">
                          {preparedByPrc}
                        </p>
                      </div>

                      <div>
                        <p className="text-[7.5pt] uppercase text-slate-500 mb-6">
                          Checked / Reviewed by:
                        </p>
                        <p className="font-bold uppercase border-b border-black pb-0.5">
                          {checkedByName}
                        </p>
                        <p className="text-[7pt]">{checkedByTitle}</p>
                        <p className="text-[6.5pt] text-slate-500">
                          {checkedByOffice || "Planning & Design Section"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[7.5pt] uppercase text-slate-500 mb-6">
                          Recommending Approval:
                        </p>
                        <p className="font-bold uppercase border-b border-black pb-0.5">
                          {recommendingApprovalName}
                        </p>
                        <p className="text-[7pt]">
                          {recommendingApprovalTitle}
                        </p>
                        <p className="text-[6.5pt] text-slate-500">
                          {recommendingApprovalOffice ||
                            "Bids and Awards Committee"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[7.5pt] uppercase text-slate-500 mb-6">
                          Approved by:
                        </p>
                        <p className="font-bold uppercase border-b border-black pb-0.5">
                          {approvedByName}
                        </p>
                        <p className="text-[7pt]">{approvedByTitle}</p>
                        <p className="text-[6.5pt] text-slate-500">
                          {approvedByOffice || "Head of the Procuring Entity"}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  /* ─── FORMAL PRICE QUOTATION (RFQ) SHEET ─── */
                  <>
                    {/* Contractor Letterhead */}
                    <div className="text-center space-y-1 border-b-2 border-black pb-3 mb-4">
                      <h2 className="text-[13pt] font-black uppercase tracking-wide">
                        {contractorName}
                      </h2>
                      <p className="text-[9pt] italic">{contractorAddress}</p>
                      <p className="text-[8pt] font-mono">
                        TIN: {contractorTin} | PhilGEPS Registration No.:{" "}
                        {contractorPhilgeps}
                      </p>
                      <div className="pt-2">
                        <h1 className="text-[13pt] font-black uppercase tracking-wider underline">
                          FORMAL PRICE QUOTATION &amp; CANVASS OFFER
                        </h1>
                        <p className="text-[8pt] font-bold uppercase tracking-wider text-slate-600">
                          (Pursuant to Alternative Methods of Procurement under
                          RA 9184 &amp; RA 12009 NGPA)
                        </p>
                        <div className="flex items-center justify-center gap-3 pt-1 text-[8pt] font-mono">
                          <span className="font-bold text-blue-950">
                            Tracking ID: {trackingNumber}
                          </span>
                          <span>•</span>
                          <span
                            className={
                              approvalStatus === "APPROVED"
                                ? "text-emerald-700 font-bold"
                                : approvalStatus === "PENDING_APPROVAL"
                                  ? "text-blue-700 font-bold"
                                  : "text-amber-700 font-bold"
                            }
                          >
                            Status:{" "}
                            {approvalStatus === "APPROVED"
                              ? `OFFICIALLY APPROVED (${approvedAt || todayStr})`
                              : approvalStatus === "PENDING_APPROVAL"
                                ? "PENDING OWNER REVIEW"
                                : "DRAFT QUOTATION (UNAPPROVED)"}
                          </span>
                        </div>
                      </div>

                      {/* Official Approval Stamp / Clearance Block */}
                      {approvalStatus === "APPROVED" ? (
                        <div className="mt-2.5 mx-auto max-w-lg border-2 border-emerald-700 bg-emerald-50/90 p-2 rounded text-emerald-950 text-[7.5pt] flex items-center justify-between font-sans">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-black flex items-center justify-center text-[10px]">
                              ✓
                            </span>
                            <div className="text-left">
                              <p className="font-black uppercase tracking-wider text-[8pt] text-emerald-900 leading-tight">
                                OFFICIALLY APPROVED &amp; AUTHORIZED CANVASS
                                OFFER
                              </p>
                              <p className="text-[6.5pt] text-emerald-800">
                                Approved by:{" "}
                                <strong>
                                  {approvedByUserName || approvedByName}
                                </strong>{" "}
                                ({approvedByRole || "Company Owner"}) • Verified
                                on: {approvedAt || todayStr}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono text-[7pt] font-bold text-emerald-900 border border-emerald-600 px-2 py-0.5 rounded bg-emerald-100 uppercase">
                            OFFICIAL RELEASE
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2.5 mx-auto max-w-lg border-2 border-dashed border-amber-600 bg-amber-50/90 p-2 rounded text-amber-950 text-[7.5pt] flex items-center justify-between font-sans">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-black flex items-center justify-center text-[10px]">
                              !
                            </span>
                            <div className="text-left">
                              <p className="font-black uppercase tracking-wider text-[8pt] text-amber-900 leading-tight">
                                {approvalStatus === "PENDING_APPROVAL"
                                  ? "PENDING HIGHER MANAGEMENT REVIEW & APPROVAL"
                                  : "DRAFT QUOTATION — NOT VALID FOR OFFICIAL SUBMISSION"}
                              </p>
                              <p className="text-[6.5pt] text-amber-800">
                                Prepared by:{" "}
                                <strong>
                                  {submittedByUserName || preparedByName}
                                </strong>{" "}
                                • Official printing and submission gated until
                                Owner / Manager sign-off.
                              </p>
                            </div>
                          </div>
                          <span className="font-mono text-[7pt] font-bold text-amber-900 border border-amber-600 px-2 py-0.5 rounded bg-amber-100 uppercase">
                            {approvalStatus === "PENDING_APPROVAL"
                              ? "REVIEW PENDING"
                              : "DRAFT"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quotation Details Header */}
                    <table className="w-full text-[8.5pt] mb-4 border-collapse">
                      <tbody>
                        <tr>
                          <td className="w-28 font-bold py-0.5">
                            Procuring Entity:
                          </td>
                          <td className="font-bold uppercase py-0.5">
                            {procuringEntity}
                          </td>
                          <td className="w-28 font-bold py-0.5">
                            Quotation Ref No.:
                          </td>
                          <td className="w-40 font-mono font-bold py-0.5">
                            {rfqNumber}
                          </td>
                        </tr>
                        <tr>
                          <td className="font-bold py-0.5">Project Title:</td>
                          <td className="py-0.5 uppercase">{projectTitle}</td>
                          <td className="font-bold py-0.5">Canvass Date:</td>
                          <td className="py-0.5">{canvassDate}</td>
                        </tr>
                        <tr>
                          <td className="font-bold py-0.5">
                            Delivery Location:
                          </td>
                          <td className="py-0.5">{projectLocation}</td>
                          <td className="font-bold py-0.5">Price Validity:</td>
                          <td className="py-0.5">{priceValidity}</td>
                        </tr>
                        <tr>
                          <td className="font-bold py-0.5">Delivery Period:</td>
                          <td className="py-0.5">{deliveryPeriod}</td>
                          <td className="font-bold py-0.5">Payment Terms:</td>
                          <td className="py-0.5">{paymentTerms}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Quotation Items Table */}
                    <table className="w-full text-[8pt] border-collapse border border-black mb-4">
                      <thead>
                        <tr className="bg-slate-100 text-center font-bold border-b border-black">
                          <th className="border border-black p-1 w-14">
                            Item No.
                          </th>
                          <th className="border border-black p-1 text-left">
                            Detailed Technical Specifications &amp; Scope
                          </th>
                          <th className="border border-black p-1 w-44 text-left">
                            Brand &amp; Model Offered
                          </th>
                          <th className="border border-black p-1 w-14">Qty</th>
                          <th className="border border-black p-1 w-12">Unit</th>
                          <th className="border border-black p-1 w-24">
                            Unit Price (₱)
                          </th>
                          <th className="border border-black p-1 w-28">
                            Total Amount (₱)
                          </th>
                          <th className="border border-black p-1 w-16">
                            Compliance
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {totals.rowsWithWeight.map((it) => (
                          <tr key={it.id} className="border-b border-slate-300">
                            <td className="border border-black p-1 text-center font-mono font-semibold">
                              {it.itemNo}
                            </td>
                            <td className="border border-black p-1 text-left">
                              {it.description}
                            </td>
                            <td className="border border-black p-1 text-left font-mono font-semibold text-[7.5pt]">
                              {it.brandModel || "Compliant with TOR"}
                            </td>
                            <td className="border border-black p-1 text-center font-mono">
                              {it.quantity.toLocaleString()}
                            </td>
                            <td className="border border-black p-1 text-center">
                              {it.unit}
                            </td>
                            <td className="border border-black p-1 text-right font-mono">
                              ₱{fmtPeso(it.unitCost)}
                            </td>
                            <td className="border border-black p-1 text-right font-mono font-bold">
                              ₱{fmtPeso(it.totalCost)}
                            </td>
                            <td className="border border-black p-1 text-center font-bold text-[7.5pt]">
                              {it.statementOfCompliance || "COMPLY"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold border-t-2 border-black">
                          <td
                            colSpan={6}
                            className="border border-black p-1.5 text-right uppercase"
                          >
                            Total Quotation Offer (Inclusive of all Taxes,
                            Delivery &amp; Charges):
                          </td>
                          <td className="border border-black p-1.5 text-right font-mono text-[9pt]">
                            ₱{fmtPeso(totals.grandTotal)}
                          </td>
                          <td className="border border-black p-1.5 text-center font-bold">
                            COMPLIED
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* Statutory Taxes & Labor Schedule Breakdown */}
                    <div className="grid grid-cols-2 gap-4 text-[7.5pt] border border-black p-2.5 mb-4 bg-slate-50">
                      <div>
                        <p className="font-bold underline mb-1">
                          GOVERNMENT TAXES &amp; RETENTION (
                          {totals.isVatable
                            ? "VATABLE - BASE: DIRECT COST / 1.12"
                            : "NON-VAT REGISTERED"}
                          ):
                        </p>
                        <div className="flex justify-between py-0.5">
                          <span>Gross Quotation Amount:</span>
                          <span className="font-mono font-semibold">
                            ₱{fmtPeso(totals.grandTotal)}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span>
                            Statutory Net Base (
                            {totals.isVatable ? "Cost ÷ 1.12" : "100% Base"}):
                          </span>
                          <span className="font-mono font-semibold">
                            ₱{fmtPeso(totals.directCostNetBase)}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5 text-red-800">
                          <span>
                            Less: 5% Final Withholding VAT (
                            {totals.isVatable
                              ? "5% of Net Base"
                              : "0% (Non-VAT)"}
                            ):
                          </span>
                          <span className="font-mono font-semibold">
                            - ₱{fmtPeso(totals.directCostFinalVat5)}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5 text-red-800">
                          <span>
                            Less: {totals.ewtRate}% Expanded Withholding Tax (
                            {totals.isInfra ? "2% Infra" : "1% Goods"}):
                          </span>
                          <span className="font-mono font-semibold">
                            - ₱{fmtPeso(totals.directCostEwt)}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5 text-red-800">
                          <span>
                            Less: 1% Statutory Retention Money (RA 9184):
                          </span>
                          <span className="font-mono font-semibold">
                            - ₱{fmtPeso(totals.directCostRetention)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-black font-bold text-slate-900">
                          <span>Total Deductions &amp; Retention:</span>
                          <span className="font-mono">
                            - ₱{fmtPeso(totals.directCostTotalDeductions)}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="font-bold underline mb-1">
                          DIRECT LABOR COST &amp; LABOR TAXES (AT BOTTOM):
                        </p>
                        <div className="flex justify-between py-0.5">
                          <span>Total Labor Component:</span>
                          <span className="font-mono font-semibold">
                            ₱{fmtPeso(totals.totalLabor)}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span>
                            Labor Net Base (
                            {totals.isVatable ? "Labor ÷ 1.12" : "100% Base"}):
                          </span>
                          <span className="font-mono font-semibold">
                            ₱{fmtPeso(totals.laborNetBase)}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5 text-red-800">
                          <span>Less: 5% Labor Withholding VAT:</span>
                          <span className="font-mono font-semibold">
                            - ₱{fmtPeso(totals.laborFinalVat5)}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5 text-red-800">
                          <span>
                            Less: {totals.ewtRate}% Labor EWT (
                            {totals.isInfra ? "2% Infra" : "1% Goods"}):
                          </span>
                          <span className="font-mono font-semibold">
                            - ₱{fmtPeso(totals.laborEwt)}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5 text-red-800">
                          <span>Less: 1% Labor Retention Money:</span>
                          <span className="font-mono font-semibold">
                            - ₱{fmtPeso(totals.laborRetention)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-black font-bold text-emerald-900">
                          <span>Net Labor Payable / Take-Home:</span>
                          <span className="font-mono">
                            ₱{fmtPeso(totals.netLaborPayable)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Commercial Undertaking Clauses */}
                    <div className="border border-black p-3 text-[7.5pt] mb-5 space-y-1.5 bg-slate-50">
                      <p className="font-bold underline">
                        TERMS AND CONDITIONS OF QUOTATION:
                      </p>
                      <p>
                        1. All prices quoted above are valid for{" "}
                        <strong>{priceValidity}</strong> from the date of
                        submission and are inclusive of 12% VAT, government
                        taxes, freight, handling, and delivery to project
                        location.
                      </p>
                      <p>
                        2. Delivery shall be made strictly within{" "}
                        <strong>{deliveryPeriod}</strong> upon receipt of the
                        approved Purchase Order / Notice to Proceed.
                      </p>
                      <p>
                        3. Warranty coverage: <strong>{warrantyTerms}</strong>{" "}
                        against defects in materials and workmanship.
                      </p>
                      <p>
                        4. Payment terms: <strong>{paymentTerms}</strong>{" "}
                        through government check / ADA after final inspection,
                        testing, and acceptance.
                      </p>
                      <p className="italic">
                        Total Quotation Amount in Words:{" "}
                        <strong>{numberToWords(totals.grandTotal)}</strong>
                      </p>
                    </div>

                    {/* Quotation Signatures Block */}
                    <div className="grid grid-cols-2 gap-8 text-[8pt] pt-2 border-t border-black">
                      <div>
                        <p className="text-[7.5pt] uppercase text-slate-500 mb-8">
                          Canvassed &amp; Acknowledged by:
                        </p>
                        <p className="font-bold uppercase border-b border-black pb-0.5">
                          {canvasserName}
                        </p>
                        <p className="text-[7pt]">
                          {canvasserTitle ||
                            "BAC Secretariat / Official Canvasser"}
                        </p>
                        <p className="text-[6.5pt] text-slate-500">
                          {canvasserOffice || procuringEntity}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[7.5pt] uppercase text-slate-500 mb-8">
                          Submitted by / Authorized Representative:
                        </p>
                        <p className="font-bold uppercase border-b border-black pb-0.5 inline-block min-w-55 text-center">
                          {signatoryName}
                        </p>
                        <p className="text-[7pt]">{signatoryTitle}</p>
                        <p className="text-[6.5pt] text-slate-500">
                          {contractorName} | TIN: {contractorTin}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Footer Statutory Note */}
                <div className="pt-4 text-center text-[6.5pt] text-slate-500 border-t border-slate-200 mt-4">
                  Official Document generated under Republic Act 9184 and
                  Republic Act 12009 (New Government Procurement Act). All
                  items, unit prices, and indirect markups strictly conform to
                  government statutory guidelines.
                </div>
              </div>
            </div>

            {/* Embedded Live Signatories Editor below Print Sheet */}
            {renderSignatoriesEditor("embedded")}
          </div>
        )}
      </div>

      {/* TOR Preview Modal */}
      {showTorPreviewModal && torPdfDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">
                  Terms of Reference (TOR) Preview: {torPdfFileName}
                </span>
              </div>
              <button
                onClick={() => setShowTorPreviewModal(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 bg-slate-950 p-2">
              <iframe
                src={torPdfDataUrl}
                title="TOR Preview"
                className="w-full h-full rounded border border-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      {/* 🚀 CREATE BIDDING OPPORTUNITY & UPLOAD PHILGEPS PDF MODAL */}
      {showCreateOpportunityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-linear-to-r from-slate-950 via-blue-950/40 to-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold">
                  <FolderPlus className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>
                      Create Bidding Opportunity &amp; Ingest PhilGEPS PDF
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                      {trackingNumber}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Register this project into Opportunity Finder, upload the
                    official PhilGEPS tender notice, and initialize complete
                    Bidding Documents.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCreateOpportunityModal(false);
                  setCreatedOppResult(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {createdOppResult ? (
                /* SUCCESS VIEW */
                <div className="space-y-6 py-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-lg font-bold text-white">
                      Bidding Opportunity Successfully Created &amp; Linked!
                    </h4>
                    <p className="text-slate-300 max-w-lg mx-auto">
                      <strong>{createdOppResult.title}</strong> has been
                      registered in Opportunity Finder and set as the{" "}
                      <strong>Active Bidding Project</strong> across BiDOCS.
                    </p>
                  </div>

                  {/* Highlights Card */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-left max-w-lg mx-auto space-y-2.5 font-mono text-[11px]">
                    <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">
                        Project Reference No:
                      </span>
                      <span className="text-blue-300 font-bold">
                        {createdOppResult.projectReferenceNumber}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">
                        PhilGEPS Reference No:
                      </span>
                      <span className="text-emerald-400 font-bold">
                        {createdOppResult.philgepsRefNo}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">Procuring Entity:</span>
                      <span className="text-slate-200">
                        {createdOppResult.procuringEntity}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">
                        Approved Budget (ABC):
                      </span>
                      <span className="text-amber-400 font-bold">
                        ₱{fmtPeso(createdOppResult.approvedBudget)}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">PhilGEPS PDF File:</span>
                      <span className="text-slate-200 font-semibold truncate max-w-50">
                        {createdOppResult.pdfFileName || "Attached"}
                      </span>
                    </div>
                    <div className="flex justify-between pt-0.5">
                      <span className="text-slate-400">
                        Section VI Deliverables:
                      </span>
                      <span className="text-purple-300 font-bold">
                        {items.length} Items Auto-Inputted ✓
                      </span>
                    </div>
                  </div>

                  {/* Navigation Choice Buttons */}
                  <div className="space-y-3 pt-2 max-w-lg mx-auto">
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      Where would you like to go next?
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateOpportunityModal(false);
                          if (setAppActiveTab) setAppActiveTab("vault");
                        }}
                        className="p-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30 cursor-pointer transition hover:scale-102"
                      >
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4" />
                          <span>Document Vault</span>
                        </div>
                        <span className="text-[10px] font-normal text-blue-200">
                          Generate Bidding Docs (Sec VI, Tech Specs, Bid Form)
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateOpportunityModal(false);
                          if (setAppActiveTab) setAppActiveTab("opportunities");
                        }}
                        className="p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex flex-col items-center justify-center gap-1.5 border border-slate-700 cursor-pointer transition hover:scale-102"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-emerald-400" />
                          <span>Opportunity Finder</span>
                        </div>
                        <span className="text-[10px] font-normal text-slate-400">
                          View in Opportunity Registry
                        </span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateOpportunityModal(false);
                        if (setAppActiveTab) setAppActiveTab("bids");
                      }}
                      className="w-full py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-semibold flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <Layers className="w-4 h-4 text-purple-400" />
                      <span>Assemble 3-Envelope Sealed Bid Package</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* FORM INPUT VIEW */
                <div className="space-y-5">
                  {/* STEP 1: UPLOAD PHILGEPS PDF */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-blue-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                          1
                        </span>
                        <label className="text-xs font-bold text-white uppercase tracking-wider">
                          Upload Official PhilGEPS Notice / Tender PDF
                        </label>
                      </div>
                      <span className="text-[10px] text-blue-300 font-mono font-medium">
                        RA 9184 / RA 12009 Standard
                      </span>
                    </div>

                    <div
                      onClick={() => philgepsInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                        philgepsNoticePdfName
                          ? "border-emerald-500/60 bg-emerald-950/20"
                          : "border-slate-700 hover:border-blue-500/60 bg-slate-900/50 hover:bg-slate-900"
                      }`}
                    >
                      <input
                        ref={philgepsInputRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={handlePhilgepsPdfUpload}
                        className="hidden"
                      />
                      {philgepsNoticePdfName ? (
                        <div className="flex items-center justify-center gap-3 text-emerald-300">
                          <FileCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                          <div className="text-left">
                            <p className="font-bold text-xs text-white">
                              {philgepsNoticePdfName}
                            </p>
                            <p className="text-[10px] text-emerald-400 font-mono">
                              {philgepsNoticePdfFile
                                ? `${(philgepsNoticePdfFile.size / (1024 * 1024)).toFixed(2)} MB`
                                : "Attached"}{" "}
                              • Ready for Ingestion
                            </p>
                          </div>
                          <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold">
                            Click to change
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1.5 py-2">
                          <FileUp className="w-8 h-8 text-blue-400 mx-auto" />
                          <p className="text-xs font-bold text-slate-200">
                            Drop PhilGEPS Bid Notice Abstract, Invitation to
                            Bid, or Bidding Documents PDF here
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Accepts official PDF up to 100MB (PCAB, ITB, or Bid
                            Bulletin)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* STEP 2: OPPORTUNITY METADATA */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                        2
                      </span>
                      <label className="text-xs font-bold text-white uppercase tracking-wider">
                        Confirm Bidding Opportunity Details (Auto-Filled from{" "}
                        {docMode})
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                      <div>
                        <label className="text-slate-400 font-mono text-[11px] block mb-1">
                          PhilGEPS Reference Number *
                        </label>
                        <input
                          type="text"
                          value={oppPhilgepsRefNo}
                          onChange={(e) => setOppPhilgepsRefNo(e.target.value)}
                          placeholder="e.g. 11823901"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-slate-400 font-mono text-[11px] block mb-1">
                          Project Reference Number (POW/RFQ Tracking) *
                        </label>
                        <input
                          type="text"
                          value={trackingNumber}
                          readOnly
                          className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-blue-300 font-mono text-xs cursor-not-allowed font-bold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-slate-400 font-mono text-[11px] block mb-1">
                          Bidding Project Title *
                        </label>
                        <input
                          type="text"
                          value={oppTitle}
                          onChange={(e) => setOppTitle(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 focus:outline-none font-medium"
                        />
                      </div>

                      <div>
                        <label className="text-slate-400 font-mono text-[11px] block mb-1">
                          Procuring Entity (Agency / LGU) *
                        </label>
                        <input
                          type="text"
                          value={oppProcuringEntity}
                          onChange={(e) =>
                            setOppProcuringEntity(e.target.value)
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-slate-400 font-mono text-[11px] block mb-1">
                          Approved Budget for Contract (ABC in PHP) *
                        </label>
                        <input
                          type="number"
                          value={oppAbc}
                          onChange={(e) =>
                            setOppAbc(parseFloat(e.target.value) || 0)
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-emerald-400 font-mono font-bold text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-slate-400 font-mono text-[11px] block mb-1">
                          Procurement Category / Type *
                        </label>
                        <select
                          value={oppProcurementType}
                          onChange={(e) =>
                            setOppProcurementType(
                              e.target.value as ProcurementType,
                            )
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 focus:outline-none cursor-pointer"
                        >
                          <option value="Infrastructure">
                            Infrastructure (Civil Works / POW)
                          </option>
                          <option value="Goods & Supply">
                            Goods &amp; Supply
                          </option>
                          <option value="Goods & Supply with Installation">
                            Goods &amp; Supply with Installation
                          </option>
                          <option value="Consulting">Consulting</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400 font-mono text-[11px] block mb-1">
                          Area of Delivery / Project Location
                        </label>
                        <input
                          type="text"
                          value={oppLocation}
                          onChange={(e) => setOppLocation(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-slate-400 font-mono text-[11px] block mb-1">
                          Submission Deadline &amp; Bid Opening Date/Time
                        </label>
                        <input
                          type="datetime-local"
                          value={oppDeadline}
                          onChange={(e) => setOppDeadline(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-slate-400 font-mono text-[11px] block mb-1">
                          Solicitation Number
                        </label>
                        <input
                          type="text"
                          value={oppSolicitationNo}
                          onChange={(e) => setOppSolicitationNo(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Auto-Sync Deliverables Info Callout */}
                  <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-300 flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
                    <span>
                      All <strong>{items.length} item deliverables</strong> with
                      units, costs, and terms from this{" "}
                      {docMode === "POW" ? "Program of Work" : "Quotation"} will
                      be automatically imported into{" "}
                      <strong>Section VI (Schedule of Requirements)</strong> and
                      the <strong>Framework Agreement</strong>.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {!createdOppResult && (
              <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateOpportunityModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleCreateOpportunityFromPow}
                  disabled={isCreatingOpp}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer transition"
                >
                  {isCreatingOpp ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating Opportunity &amp; Ingesting PDF...</span>
                    </>
                  ) : (
                    <>
                      <FolderPlus className="w-4 h-4 text-amber-300" />
                      <span>
                        Create Opportunity &amp; Launch Bidding Documents ➔
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🔒 OWNER / HIGHER MANAGER APPROVAL GATE MODAL */}
      <ApprovalGateModal
        isOpen={showApprovalGateModal}
        onClose={() => setShowApprovalGateModal(false)}
        docTitle={
          docMode === "POW"
            ? "Program of Work (POW)"
            : "Formal Price Quotation (RFQ)"
        }
        trackingOrRefNo={trackingNumber}
        approvalRecord={{
          recordId: trackingNumber,
          docType: docMode === "POW" ? "POW" : "QUOTATION",
          status: approvalStatus,
          submittedBy: submittedByUserName || preparedByName,
          submittedByRole: submittedByRole || "Technical Estimator",
          submittedAt: submittedAt,
          approvedBy: approvedByUserName,
          approvedByRole: approvedByRole,
          approvedAt: approvedAt,
          notes: approvalNotes,
        }}
        onSubmitForApproval={() => {
          handleSubmitForApproval();
          setShowApprovalGateModal(false);
        }}
        onApprove={(notes) => {
          handleApproveAndSync(notes);
          setShowApprovalGateModal(false);
        }}
        onRevertToDraft={() => {
          handleRevertToDraft();
          setShowApprovalGateModal(false);
        }}
      />
    </div>
  );
};

export const PowModal: React.FC<PowModalProps> = (props) => {
  return (
    <VaultErrorBoundary fallbackTitle="Program of Work & Quotation Module">
      <POWModalContent {...props} />
    </VaultErrorBoundary>
  );
};

export default PowModal;

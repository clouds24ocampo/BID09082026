export type UserRole = 'COMPANY_OWNER' | 'BID_MANAGER' | 'SYSTEM_ADMIN';

export type ProcurementType = 
  | 'GOODS' 
  | 'INFRASTRUCTURE' 
  | 'CONSULTING_SERVICES' 
  | 'Goods & Supply' 
  | 'Goods & Supply with Installation' 
  | 'Infrastructure' 
  | 'Consulting';

export type SectorType = 'Government' | 'Private';

export type LegalRegime = 'RA_9184' | 'RA_12009_NGPA';

export type DocCategory = 'ELIGIBILITY_CLASS_A' | 'ELIGIBILITY_CLASS_B' | 'TECHNICAL' | 'FINANCIAL' | 'CORPORATE_LEGAL';

export type DocStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'ARCHIVED' | 'NOT_UPLOADED';

export type BidLifecycleStatus = 
  | 'INTENT_TO_BID'
  | 'PACKAGE_ASSEMBLING'
  | 'DOCUMENTS_REVIEWED'
  | 'SUBMITTED'
  | 'OPENED'
  | 'POST_QUALIFICATION'
  | 'AWARDED'
  | 'LOST'
  | 'DISQUALIFIED';

export interface Signatory {
  name: string;
  title: string;
  tin: string;
}

export interface Tenant {
  id: string;
  companyName: string;
  brandCode: string;
  logoUrl?: string;
  brandColor: string;
  tin: string;
  secDtiRegNo: string;
  pcabLicenseNo?: string;
  pcabCategory?: string;
  philgepsPlatinumNo: string;
  address: string;
  authorizedSignatory: Signatory;
  preferredRegime: LegalRegime;
  primaryProcurementType: ProcurementType;
  createdAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: UserRole;
  password?: string;
  mustChangePassword?: boolean;
  avatarUrl?: string;
  lastLoginAt?: string;
}

export interface DocumentVersion {
  versionNumber: number;
  documentNumber?: string;
  fileHash: string;
  uploadedAt: string;
  uploadedByName: string;
  fileName: string;
  fileSizeBytes: number;
  fileDataUrl?: string;
}

export interface DocumentVaultItem {
  id: string;
  tenantId: string;
  documentCode?: string; // Fixed Code 1..13 for Class A
  documentName: string;
  documentNumber?: string;
  category: DocCategory;
  procurementApplicability: ProcurementType[];
  legalBasisReference: string;
  versionNumber: number;
  fileHash: string;
  fileSizeBytes: number;
  fileName?: string;
  fileDataUrl?: string;
  issuedDate?: string;
  expiryDate?: string;
  status: DocStatus;
  uploadedByName: string;
  isOptional: boolean;
  requiresIssueDate: boolean;
  requiresExpiryDate: boolean;
  conditionalRuleNote?: string;
  // Project Identification Link
  projectId?: string;
  projectTitle?: string;
  philgepsRefNo?: string;
  // Revision History
  previousVersions?: DocumentVersion[];
}

export interface OpportunityPdfAttachment {
  fileName: string;
  fileSizeBytes: number;
  uploadedAt: string;
  fileDataUrl?: string;
}

export interface PhilGEPSOpportunity {
  id: string;
  philgepsRefNo: string;
  projectReferenceNumber: string;
  solicitationNumber: string;
  areaOfDelivery?: string;
  sector?: SectorType;
  title: string;
  procuringEntity: string;
  procuringEntityContactNumber?: string;
  procuringEntityAddress?: string;
  procuringEntityEmail?: string;
  procuringEntityPosition?: string;
  procuringEntityContactPerson?: string;
  procurementType: ProcurementType;
  legalRegime: LegalRegime;
  approvedBudget: number;
  dateCreated?: string;
  datePublished?: string;
  preBidConferenceDatetime?: string;
  submissionDeadlineDatetime?: string;
  submissionDeadline: string;
  bidOpeningDate: string;
  pdfFileName?: string;
  pdfFileSize?: number;
  pdfFileDataUrl?: string;
  status: 'OPEN' | 'CLOSED' | 'AWARDED_TO_OTHERS' | 'CANCELLED';
  location: string;
  description: string;
  pdfAttachments?: {
    bidBulletin?: OpportunityPdfAttachment;
    supplementalDocs?: OpportunityPdfAttachment;
    procuringEntityDocs?: OpportunityPdfAttachment;
    receiptOfBidDocs?: OpportunityPdfAttachment;
  };
}

export interface ChecklistRequirement {
  id: string;
  requirementCode: string;
  requirementName: string;
  envelope: 'ENVELOPE_1_ELIGIBILITY_TECHNICAL' | 'ENVELOPE_2_FINANCIAL';
  isMandatory: boolean;
  legalRegime: LegalRegime;
  status: 'MISSING' | 'ATTACHED' | 'VERIFIED_VALID' | 'EXPIRED' | 'NOT_APPLICABLE';
  linkedDocId?: string;
}

export interface BidPackage {
  id: string;
  tenantId: string;
  opportunityId: string;
  opportunityTitle: string;
  philgepsRefNo: string;
  procuringEntity: string;
  procurementType: ProcurementType;
  approvedBudget: number;
  bidPriceOffered?: number;
  assignedManagerName: string;
  status: BidLifecycleStatus;
  checklists: ChecklistRequirement[];
  updatedAt: string;
}

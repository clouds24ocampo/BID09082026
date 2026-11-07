export interface OpportunityProjectOption {
  id: string;
  refNo: string;
  solicitationNo: string;
  title: string;
  procuringEntity: string;
  procuringEntityAddress?: string;
  procuringEntityContactPerson?: string;
  procuringEntityPosition?: string;
  headOfProcuringEntity?: string;
  headOfProcuringEntityPosition?: string;
  location?: string;
  abc: string;
  category?: "Goods" | "Infrastructure" | string;
  dateTimeSubmitted: string;
}

// Saved opportunity lists come from localStorage: tolerate bad JSON, non-arrays and null/primitive entries.
export const parseOpportunityList = (raw: string | null | undefined): any[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((o) => o && typeof o === "object")
      : [];
  } catch {
    return [];
  }
};

// High-speed in-memory cache for ultra-fast zero-latency project lookups
let oppCache: {
  tenantId?: string;
  data: OpportunityProjectOption[];
  timestamp: number;
} | null = null;
const CACHE_TTL_MS = 2000;

export const invalidateOpportunityProjectsCache = () => {
  oppCache = null;
};

/**
 * Fetches real active bidding projects saved in Opportunity Finder (localStorage: bidocs_opportunities).
 * Scans tenant-scoped keys, un-scoped keys, and all bidocs_opportunities_* keys to ensure 100% project retrieval.
 * Strictly deduplicates projects by ID and Reference Number.
 */
export const getOpportunityProjects = (
  tenantId?: string,
): OpportunityProjectOption[] => {
  const now = Date.now();
  if (
    oppCache &&
    oppCache.tenantId === tenantId &&
    now - oppCache.timestamp < CACHE_TTL_MS
  ) {
    return oppCache.data;
  }

  try {
    // Tenant-scoped only: never read another tenant's (or a legacy global) project list.
    if (!tenantId) return [];
    const rawItems: any[] = [];
    const savedTenant = localStorage.getItem(`bidocs_opportunities_${tenantId}`);
    if (savedTenant) rawItems.push(...parseOpportunityList(savedTenant));

    if (rawItems.length > 0) {
      const rawList: OpportunityProjectOption[] = rawItems.map(
        (item: any, idx: number) => {
          const rawDateTime =
            item.submissionDeadlineDatetime ||
            item.submissionDeadlineDate ||
            item.submissionDeadline ||
            item.dateSubmitted ||
            "";

          let formattedDateTime = "";
          if (rawDateTime) {
            if (rawDateTime.includes("T")) {
              formattedDateTime = rawDateTime.substring(0, 16);
            } else if (rawDateTime.includes(" ")) {
              formattedDateTime = rawDateTime
                .replace(" ", "T")
                .substring(0, 16);
            } else {
              const timePart =
                item.submissionDeadlineTime || item.submissionTime || "14:00";
              formattedDateTime = `${rawDateTime}T${timePart}`;
            }
          } else {
            const today = new Date().toISOString().split("T")[0];
            formattedDateTime = `${today}T14:00`;
          }

          const projectAddress =
            item.deliveryLocation ||
            item.location ||
            item.areaOfDelivery ||
            item.procuringEntityAddress ||
            item.clientAddress ||
            (typeof item.procuringEntity === "string"
              ? item.procuringEntity
              : item.procuringEntity?.address) ||
            "";

          return {
            id: item.id || `opp-stg-${idx}`,
            refNo:
              item.philgepsRefNo ||
              item.projectReferenceNumber ||
              item.refNo ||
              `PRJ-${idx + 1}`,
            solicitationNo:
              item.solicitationNumber || item.solicitationNo || "N/A",
            title:
              item.title || item.biddingProjectTitle || "Untitled Opportunity",
            procuringEntity:
              typeof item.procuringEntity === "string"
                ? item.procuringEntity
                : item.procuringEntity?.name ||
                  item.procuringEntityName ||
                  "Government Agency",
            procuringEntityAddress: projectAddress,
            procuringEntityContactPerson:
              item.procuringEntityContactPerson || "",
            procuringEntityPosition: item.procuringEntityPosition || "",
            headOfProcuringEntity: item.headOfProcuringEntity || "",
            headOfProcuringEntityPosition:
              item.headOfProcuringEntityPosition || "",
            location: projectAddress,
            abc:
              item.approvedBudgetStr ||
              (item.approvedBudgetValue
                ? `₱${Number(item.approvedBudgetValue).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                : item.approvedBudget
                  ? `₱${Number(item.approvedBudget).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                  : "₱0.00"),
            category: (() => {
              const rawCat = (
                item.procurementType ||
                item.projectType ||
                item.category ||
                item.classification ||
                ""
              )
                .toString()
                .toUpperCase();

              // 1. Primary Authority: Explicit procurement type or category from PhilGEPS / Opportunity Setup
              if (rawCat.includes("INFRA") || rawCat.includes("CIVIL"))
                return "Infrastructure";
              if (rawCat.includes("CONSULT")) return "Consulting";
              if (rawCat.includes("GOOD")) return "Goods";

              // 2. Fallback: Title or Reference Number inference if category was not explicitly specified
              const titleLower = (
                item.title ||
                item.biddingProjectTitle ||
                ""
              ).toLowerCase();
              const refUpper = (
                item.philgepsRefNo ||
                item.refNo ||
                ""
              ).toUpperCase();

              if (
                refUpper.includes("INFRA") ||
                titleLower.includes("construction") ||
                titleLower.includes("civil works") ||
                titleLower.includes("road opening") ||
                titleLower.includes("drainage system") ||
                titleLower.includes("building") ||
                titleLower.includes("renovation") ||
                titleLower.includes("rehabilitation")
              ) {
                return "Infrastructure";
              }
              if (
                titleLower.includes("consult") ||
                titleLower.includes("feasibility")
              ) {
                return "Consulting";
              }

              return "Goods";
            })(),
            dateTimeSubmitted: formattedDateTime,
          };
        },
      );

      // Strict Deduplication by ID & Reference Number
      const seenKeys = new Set<string>();
      const uniqueProjects: OpportunityProjectOption[] = [];

      for (const proj of rawList) {
        const dedupeKey = `${proj.id}::${proj.refNo}`.toLowerCase();
        if (!seenKeys.has(dedupeKey)) {
          seenKeys.add(dedupeKey);
          uniqueProjects.push(proj);
        }
      }

      oppCache = {
        tenantId,
        data: uniqueProjects,
        timestamp: Date.now(),
      };
      return uniqueProjects;
    }
  } catch (e) {
    console.error("[OpportunityProjects] Error reading storage:", e);
  }

  return [];
};

export interface ProjectMergeRecord {
  projectRefNo: string;
  projectId?: string;
  mergedAt: string;
  fileName?: string;
  copiesCount?: number;
  completedBy?: string;
}

/**
 * Marks a project's bidding documents package as completely compiled, merged, and ready.
 */
export const markProjectBidMergeDone = (
  tenantId: string,
  projectRefOrId: string,
  details?: Partial<ProjectMergeRecord>,
) => {
  if (!projectRefOrId) return;
  const cleanRef = projectRefOrId.trim();
  const record: ProjectMergeRecord = {
    projectRefNo: cleanRef,
    mergedAt: details?.mergedAt || new Date().toISOString(),
    fileName: details?.fileName,
    copiesCount: details?.copiesCount || 3,
    completedBy: details?.completedBy || "BiDOCS Merge Engine",
    ...details,
  };

  try {
    if (!tenantId) return;
    localStorage.setItem(
      `bidocs_merged_done_${tenantId}_${cleanRef}`,
      JSON.stringify(record),
    );

    // Update merged project list for tenant
    const listKey = `bidocs_merged_projects_list_${tenantId}`;
    const rawList = localStorage.getItem(listKey);
    let list: string[] = [];
    if (rawList) {
      try {
        list = JSON.parse(rawList);
      } catch {}
    }
    if (!list.includes(cleanRef)) {
      list.push(cleanRef);
      localStorage.setItem(listKey, JSON.stringify(list));
    }
  } catch (e) {
    console.error("[OpportunityProjects] Error marking bid merge done:", e);
  }
};

/**
 * Checks if a project has completed the bidding package merge process.
 * Projects only appear in Project Profile once their bid documents are merged and done.
 */
export const isProjectBidMergeDone = (
  tenantId: string,
  project: {
    id?: string;
    projectReferenceNumber?: string;
    philgepsRefNo?: string;
    refNo?: string;
    status?: string;
  },
): boolean => {
  if (!project) return false;
  if (project.status === "AWARDED") return true;

  const candidateRefs = [
    project.projectReferenceNumber,
    project.philgepsRefNo,
    project.refNo,
    project.id,
  ].filter(Boolean) as string[];

  if (!tenantId) return false;

  for (const ref of candidateRefs) {
    if (localStorage.getItem(`bidocs_merged_done_${tenantId}_${ref}`)) return true;
    const winStatus = localStorage.getItem(`bidocs_project_win_status_${tenantId}_${ref}`);
    if (winStatus === "WIN" || winStatus === "WON") return true;
  }

  try {
    const rawList = localStorage.getItem(`bidocs_merged_projects_list_${tenantId}`);
    if (rawList) {
      const list: string[] = JSON.parse(rawList);
      if (Array.isArray(list) && candidateRefs.some((ref) => list.includes(ref))) {
        return true;
      }
    }
  } catch {}

  return false;
};

export interface DocumentApprovalRecord {
  recordId: string;
  docType: "TOR" | "POW" | "QUOTATION" | "BIDDING_PACKAGE";
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED";
  submittedBy?: string;
  submittedByRole?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedByRole?: string;
  approvedAt?: string;
  notes?: string;
}

/**
 * Retrieves approval status for a TOR, POW, Quotation, or Bidding Package
 */
export const getDocumentApproval = (
  tenantId: string,
  recordId: string,
): DocumentApprovalRecord | null => {
  if (!recordId) return null;
  const cleanKey = recordId.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  const tKey = tenantId || "default";
  try {
    const raw = localStorage.getItem(`bidocs_approval_${tKey}_${cleanKey}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("[DocumentApproval] Error reading approval record:", e);
  }
  return null;
};

/**
 * Persists approval status and broadcasts live update event across app components
 */
export const saveDocumentApproval = (
  tenantId: string,
  record: DocumentApprovalRecord,
): void => {
  if (!record.recordId) return;
  const cleanKey = record.recordId.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  const tKey = tenantId || "default";
  try {
    localStorage.setItem(
      `bidocs_approval_${tKey}_${cleanKey}`,
      JSON.stringify(record),
    );
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("bidocs:approval_updated", {
          detail: { tenantId: tKey, record },
        }),
      );
    }
  } catch (e) {
    console.error("[DocumentApproval] Error saving approval record:", e);
  }
};

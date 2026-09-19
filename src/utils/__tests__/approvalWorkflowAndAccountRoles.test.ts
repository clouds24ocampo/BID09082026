import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isApproverRole,
  isPreparerRole,
  getRoleDisplayName,
  UserRole,
} from "../../types";
import {
  getDocumentApproval,
  saveDocumentApproval,
  DocumentApprovalRecord,
} from "../opportunityProjects";
import { generateDateTimeTrackingId } from "../../components/vault/templates/POW";

// In-memory localStorage mock for test environment
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  },
  key: (i: number) => Object.keys(mockStorage)[i] || null,
  get length() {
    return Object.keys(mockStorage).length;
  },
};

if (typeof globalThis.localStorage === "undefined") {
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
}

// Window event dispatch mock if in Node
if (typeof globalThis.window === "undefined") {
  const listeners: Record<string, Function[]> = {};
  (globalThis as any).window = {
    addEventListener: (event: string, fn: Function) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    },
    removeEventListener: (event: string, fn: Function) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((f) => f !== fn);
      }
    },
    dispatchEvent: (event: any) => {
      const fns = listeners[event.type] || [];
      fns.forEach((fn) => fn(event));
      return true;
    },
  };
  (globalThis as any).CustomEvent = class CustomEvent {
    type: string;
    detail: any;
    constructor(type: string, params: any) {
      this.type = type;
      this.detail = params?.detail;
    }
  };
}

describe("Dual-Approval & Multi-Account Roles Workflow", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("Role Permissions Classification", () => {
    it("correctly classifies Approver roles (Owner, Higher Manager, System Admin)", () => {
      expect(isApproverRole("COMPANY_OWNER")).toBe(true);
      expect(isApproverRole("HIGHER_MANAGER")).toBe(true);
      expect(isApproverRole("SYSTEM_ADMIN")).toBe(true);
      expect(isApproverRole("ESTIMATOR")).toBe(false);
      expect(isApproverRole("BID_MANAGER")).toBe(false);
      expect(isApproverRole(undefined)).toBe(false);
    });

    it("correctly classifies document preparer roles", () => {
      expect(isPreparerRole("ESTIMATOR")).toBe(true);
      expect(isPreparerRole("BID_MANAGER")).toBe(true);
      expect(isPreparerRole("DOCUMENT_PREPARER")).toBe(true);
      expect(isPreparerRole("COMPANY_OWNER")).toBe(false);
      expect(isPreparerRole("HIGHER_MANAGER")).toBe(false);
      expect(isPreparerRole(undefined)).toBe(false);
    });

    it("provides clear statutory display names for each role", () => {
      expect(getRoleDisplayName("COMPANY_OWNER")).toContain("Company Owner");
      expect(getRoleDisplayName("HIGHER_MANAGER")).toContain("Higher Manager");
      expect(getRoleDisplayName("ESTIMATOR")).toContain("Estimator");
      expect(getRoleDisplayName("BID_MANAGER")).toContain("Bid Manager");
      expect(getRoleDisplayName("DOCUMENT_PREPARER")).toContain(
        "Document Preparer",
      );
    });
  });

  describe("Tracking ID Statutory Format", () => {
    it("generates immutable tracking ID in statutory YYYY-MM-DD-HHmm-XXXX format without POW prefix", () => {
      const id = generateDateTimeTrackingId();
      expect(id).toMatch(/^\d{4}-\d{2}-\d{2}-\d{4}-[A-Z0-9]{4}$/);
      expect(id.startsWith("POW")).toBe(false);
      expect(id.startsWith("RFQ")).toBe(false);
    });
  });

  describe("Document Approval Persistence & Cross-Component Sync", () => {
    const tenantId = "test-tenant-101";
    const trackingId = "2026-09-19-1430-8K2Q";

    it("returns null when document approval record does not exist", () => {
      const result = getDocumentApproval(tenantId, trackingId);
      expect(result).toBeNull();
    });

    it("persists and retrieves PENDING_APPROVAL submission by an Estimator", () => {
      const record: DocumentApprovalRecord = {
        recordId: trackingId,
        docType: "POW",
        status: "PENDING_APPROVAL",
        submittedBy: "Engr. Alex Reyes",
        submittedByRole: "Technical Estimator (Preparer)",
        submittedAt: "2026-09-19 14:30:00",
      };

      saveDocumentApproval(tenantId, record);
      const loaded = getDocumentApproval(tenantId, trackingId);

      expect(loaded).not.toBeNull();
      expect(loaded?.status).toBe("PENDING_APPROVAL");
      expect(loaded?.submittedBy).toBe("Engr. Alex Reyes");
      expect(loaded?.submittedByRole).toBe("Technical Estimator (Preparer)");
    });

    it("persists official executive approval by Company Owner / Higher Manager", () => {
      const record: DocumentApprovalRecord = {
        recordId: trackingId,
        docType: "POW",
        status: "APPROVED",
        submittedBy: "Engr. Alex Reyes",
        submittedByRole: "Technical Estimator",
        submittedAt: "2026-09-19 14:30:00",
        approvedBy: "Hon. Maria Clara Santos",
        approvedByRole: "Company Owner (Executive Approver)",
        approvedAt: "2026-09-19 15:00:00",
        notes: "Verified against TOR specs and approved for official printing.",
      };

      saveDocumentApproval(tenantId, record);
      const loaded = getDocumentApproval(tenantId, trackingId);

      expect(loaded).not.toBeNull();
      expect(loaded?.status).toBe("APPROVED");
      expect(loaded?.approvedBy).toBe("Hon. Maria Clara Santos");
      expect(loaded?.approvedByRole).toContain("Company Owner");
      expect(loaded?.notes).toContain("Verified against TOR specs");
    });

    it("dispatches custom event bidocs:approval_updated on save", () => {
      let eventFired = false;
      let eventDetail: any = null;

      const handler = (e: any) => {
        eventFired = true;
        eventDetail = e.detail;
      };

      window.addEventListener("bidocs:approval_updated", handler);

      const record: DocumentApprovalRecord = {
        recordId: "PRJ-2026-INFRA-001",
        docType: "BIDDING_PACKAGE",
        status: "APPROVED",
        approvedBy: "CEO Ferdinand Valenzuela",
      };

      saveDocumentApproval(tenantId, record);

      expect(eventFired).toBe(true);
      expect(eventDetail?.record?.recordId).toBe("PRJ-2026-INFRA-001");
      expect(eventDetail?.record?.status).toBe("APPROVED");

      window.removeEventListener("bidocs:approval_updated", handler);
    });
  });
});

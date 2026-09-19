import { describe, it, expect } from "vitest";
import {
  TOR_PRESET_TEMPLATES,
  TermsOfReferenceData,
  validateTorData,
} from "../../components/vault/templates/TOR";
import {
  computeStatutoryTaxes,
  getPowCompletionMessage,
} from "../../components/vault/templates/POW";

describe("Statutory Terms of Reference (TOR) Presets & Procurement Law Alignment", () => {
  it("verifies DPWH Infrastructure Standard Preset matches DPWH Blue Book & RA 9184/12009 standards", () => {
    const dpwh = TOR_PRESET_TEMPLATES.DPWH_INFRA;

    expect(dpwh.presetType).toBe("DPWH_INFRA");
    expect(dpwh.projectCategory).toBe("INFRA");
    expect(dpwh.taxType).toBe("VATABLE");
    expect(dpwh.retentionRate).toBe(1);

    // Legal Basis & Citations
    expect(dpwh.backgroundRationale).toContain("Republic Act No. 9184");
    expect(dpwh.backgroundRationale).toContain("Republic Act No. 12009");
    expect(dpwh.backgroundRationale).toContain("DGCS");

    // Key Personnel Requirements (DPWH Standard: Project Engineer, Materials Engineer, Safety Officer)
    const positions = dpwh.keyPersonnel.map((k) => k.position);
    expect(positions.some((p) => p.includes("Project Engineer"))).toBe(true);
    expect(positions.some((p) => p.includes("Materials Engineer"))).toBe(true);
    expect(positions.some((p) => p.includes("Safety & Health"))).toBe(true);

    // Heavy Equipment Pledges
    const equipment = dpwh.equipmentRequirements.map((e) => e.description);
    expect(equipment.some((e) => e.includes("Excavator"))).toBe(true);
    expect(equipment.some((e) => e.includes("Dump Truck"))).toBe(true);
    expect(equipment.some((e) => e.includes("Transit Mixer"))).toBe(true);

    // 4-Tier Signatory Structure (DPWH Standard: Project Engineer -> Section Chief -> Assistant District Engineer -> District Engineer)
    expect(dpwh.signatories).toHaveLength(4);
    expect(dpwh.signatories[0].role).toBe("PREPARED_BY");
    expect(dpwh.signatories[0].title).toContain("Project Engineer");
    expect(dpwh.signatories[1].role).toBe("CHECKED_BY");
    expect(dpwh.signatories[1].title).toContain("Planning & Design");
    expect(dpwh.signatories[2].role).toBe("RECOMMENDING");
    expect(dpwh.signatories[2].title).toContain("Assistant District Engineer");
    expect(dpwh.signatories[3].role).toBe("APPROVED_BY");
    expect(dpwh.signatories[3].title).toContain("District Engineer");

    // Tax Engine: Infra gets 2% EWT
    const tax = computeStatutoryTaxes(
      5600000,
      dpwh.taxType,
      dpwh.projectCategory,
      dpwh.retentionRate,
    );
    expect(tax.isInfra).toBe(true);
    expect(tax.ewtRate).toBe(2);
    expect(tax.finalVatRate).toBe(5);
    expect(tax.retentionRate).toBe(1);
  });

  it("verifies LGU Standard Preset conforms to RA 7160, GPPB Res. 03-2025, and FOB Destination terms", () => {
    const lgu = TOR_PRESET_TEMPLATES.LGU_GOODS_SERVICES;

    expect(lgu.presetType).toBe("LGU_GOODS_SERVICES");
    expect(lgu.projectCategory).toBe("GOODS");
    expect(lgu.taxType).toBe("VATABLE");

    // Legal Citations
    expect(lgu.backgroundRationale).toContain("Republic Act No. 7160");
    expect(lgu.backgroundRationale).toContain("Republic Act No. 12009");

    // Section 18 Non-Brand Rule & Green Public Procurement
    expect(lgu.generalObjectives[0]).toContain("Section 18");
    expect(lgu.generalObjectives[1]).toContain("Green Public Procurement");

    // Inspection & Acceptance Committee (IAC)
    expect(lgu.inspectionAndAcceptance[0]).toContain(
      "Inspection and Acceptance Committee (IAC)",
    );

    // 4-Tier Signatories (LGU Standard: GSO End-User -> BAC Secretariat -> BAC Chair -> Mayor/Governor HoPE)
    expect(lgu.signatories).toHaveLength(4);
    expect(lgu.signatories[0].title).toContain("General Services Office");
    expect(lgu.signatories[1].title).toContain("BAC Secretariat");
    expect(lgu.signatories[2].title).toContain("BAC Chairperson");
    expect(lgu.signatories[3].title).toContain("Mayor");

    // Tax Engine: Goods get 1% EWT
    const tax = computeStatutoryTaxes(
      1120000,
      lgu.taxType,
      lgu.projectCategory,
      lgu.retentionRate,
    );
    expect(tax.isInfra).toBe(false);
    expect(tax.ewtRate).toBe(1);
    expect(tax.finalVatRate).toBe(5);
    expect(tax.retentionRate).toBe(1);
  });

  it("verifies Barangay Standard Preset aligns with Community-Participatory Procurement under RA 12009", () => {
    const brgy = TOR_PRESET_TEMPLATES.BARANGAY_COMMUNITY;

    expect(brgy.presetType).toBe("BARANGAY_COMMUNITY");

    // Legal Citations: Community Participation Section 38
    expect(brgy.backgroundRationale).toContain(
      "Community-Participatory Procurement",
    );
    expect(brgy.backgroundRationale).toContain("Republic Act No. 12009");
    expect(brgy.generalObjectives[1]).toContain("Section 38");

    // Signatories: Punong Barangay HoPE and Barangay Treasurer
    expect(brgy.signatories).toHaveLength(4);
    const titles = brgy.signatories.map((s) => s.title);
    expect(titles.some((t) => t.includes("Barangay Treasurer"))).toBe(true);
    expect(titles.some((t) => t.includes("Punong Barangay"))).toBe(true);

    // Tax Treatment
    expect(brgy.paymentTerms[1]).toContain("Form 2306/2307");
  });

  it("keeps POW output out of the bidding document vault and stores it next to TOR in project records", () => {
    const withProjectCallback = getPowCompletionMessage("POW", true);
    const withoutProjectCallback = getPowCompletionMessage("POW", false);

    expect(withProjectCallback).toContain("next to the Terms of Reference");
    expect(withProjectCallback).toContain(
      "not added to the bidding document vault",
    );
    expect(withoutProjectCallback).toContain("project records next to the TOR");
    expect(withoutProjectCallback).toContain(
      "not submitted to the bidding document vault",
    );
  });

  it("requires the LGU TOR sections before it can be finalized", () => {
    const lgu = TOR_PRESET_TEMPLATES.LGU_GOODS_SERVICES;
    const completeTor: TermsOfReferenceData = {
      ...lgu,
      trackingNumber: "TOR-2026-001",
      projectRefNo: "ITB-2026-001",
      projectTitle: "Supply and Delivery of ICT Equipment",
      procuringEntity: "City Government",
      abcAmount: 1000000,
    };

    expect(validateTorData(completeTor)).toEqual([]);
    expect(validateTorData({ ...completeTor, paymentTerms: [] })).toContain(
      "Payment terms are required.",
    );
    expect(
      validateTorData({
        ...completeTor,
        scopeItems: [
          { ...completeTor.scopeItems[0], specificationDetails: "" },
        ],
      }),
    ).toContain("Every scope item must include technical specifications.");
  });
});

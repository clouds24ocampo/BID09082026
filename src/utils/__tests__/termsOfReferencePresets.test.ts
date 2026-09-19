import { describe, it, expect } from "vitest";
import {
  TermsOfReferenceContent,
  TermsOfReferenceModal,
  TOR,
} from "../../components/vault/templates/TOR";
import { getPowCompletionMessage } from "../../components/vault/templates/POW";

describe("Terms of Reference (TOR) Clean Slate Architecture", () => {
  it("exports clean slate TermsOfReferenceContent component ready to build from scratch", () => {
    expect(TermsOfReferenceContent).toBeDefined();
    expect(typeof TermsOfReferenceContent).toBe("function");
    expect(TermsOfReferenceModal).toBeDefined();
    expect(TOR).toBeDefined();
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
});

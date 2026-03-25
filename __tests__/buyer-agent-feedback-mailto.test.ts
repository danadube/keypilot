import {
  buildBuyerAgentFeedbackMailtoHref,
  BUYER_AGENT_FEEDBACK_MAILTO_MAX_LENGTH,
} from "@/components/showing-hq/ShowingBuyerAgentFeedbackDraftPanel";

describe("buildBuyerAgentFeedbackMailtoHref", () => {
  it("builds mailto with encoded subject and body", () => {
    const href = buildBuyerAgentFeedbackMailtoHref(
      "agent@example.com",
      "Hello & welcome",
      "Line 1\nLine 2"
    );
    expect(href).toBe(
      "mailto:agent%40example.com?subject=Hello+%26+welcome&body=Line+1%0ALine+2"
    );
  });

  it("returns null when recipient or content missing", () => {
    expect(buildBuyerAgentFeedbackMailtoHref("", "S", "B")).toBeNull();
    expect(buildBuyerAgentFeedbackMailtoHref("  ", "S", "B")).toBeNull();
    expect(buildBuyerAgentFeedbackMailtoHref("a@b.com", "", "B")).toBeNull();
    expect(buildBuyerAgentFeedbackMailtoHref("a@b.com", "S", "")).toBeNull();
  });

  it("documents practical URL length guard used by the panel", () => {
    expect(BUYER_AGENT_FEEDBACK_MAILTO_MAX_LENGTH).toBeGreaterThan(1000);
    expect(BUYER_AGENT_FEEDBACK_MAILTO_MAX_LENGTH).toBeLessThan(2500);
  });
});

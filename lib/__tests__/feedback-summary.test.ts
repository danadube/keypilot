import { aggregateFeedbackSummary } from "../feedback-summary";

const baseRow = {
  id: "fr-1",
  status: "RESPONDED" as const,
  interestLevel: "LOVED_IT" as const,
  reasons: [] as unknown,
  note: null as string | null,
  respondedAt: new Date("2025-03-15T14:00:00Z"),
};

describe("aggregateFeedbackSummary", () => {
  it("returns zeros when no requests", () => {
    const summary = aggregateFeedbackSummary([]);
    expect(summary.totalRequests).toBe(0);
    expect(summary.totalResponses).toBe(0);
    expect(summary.responseRate).toBe(0);
    expect(summary.byInterest.LOVED_IT).toBe(0);
    expect(summary.byReason.PRICE).toBe(0);
    expect(summary.recentResponses).toEqual([]);
  });

  it("counts only RESPONDED as responses", () => {
    const summary = aggregateFeedbackSummary([
      { ...baseRow, id: "1", status: "PENDING", interestLevel: null, respondedAt: null },
      { ...baseRow, id: "2", status: "RESPONDED" },
    ]);
    expect(summary.totalRequests).toBe(2);
    expect(summary.totalResponses).toBe(1);
    expect(summary.responseRate).toBe(0.5);
  });

  it("aggregates interest levels", () => {
    const summary = aggregateFeedbackSummary([
      { ...baseRow, id: "1", interestLevel: "LOVED_IT" },
      { ...baseRow, id: "2", interestLevel: "LOVED_IT" },
      { ...baseRow, id: "3", interestLevel: "NOT_A_FIT" },
    ]);
    expect(summary.byInterest.LOVED_IT).toBe(2);
    expect(summary.byInterest.NOT_A_FIT).toBe(1);
    expect(summary.byInterest.LIKED_IT).toBe(0);
  });

  it("aggregates reasons from JSON array", () => {
    const summary = aggregateFeedbackSummary([
      { ...baseRow, id: "1", reasons: ["PRICE", "LAYOUT"] },
      { ...baseRow, id: "2", reasons: ["PRICE"] },
    ]);
    expect(summary.byReason.PRICE).toBe(2);
    expect(summary.byReason.LAYOUT).toBe(1);
    expect(summary.byReason.KITCHEN).toBe(0);
  });

  it("returns recent responses sorted by respondedAt desc", () => {
    const summary = aggregateFeedbackSummary(
      [
        { ...baseRow, id: "1", respondedAt: new Date("2025-03-10T12:00:00Z") },
        { ...baseRow, id: "2", respondedAt: new Date("2025-03-15T14:00:00Z") },
        { ...baseRow, id: "3", respondedAt: new Date("2025-03-12T10:00:00Z") },
      ],
      2
    );
    expect(summary.recentResponses).toHaveLength(2);
    expect(summary.recentResponses[0].id).toBe("2");
    expect(summary.recentResponses[1].id).toBe("3");
  });

  it("truncates note to notePreview", () => {
    const longNote = "a".repeat(150);
    const summary = aggregateFeedbackSummary([
      { ...baseRow, id: "1", note: longNote },
    ]);
    expect(summary.recentResponses[0].notePreview).toHaveLength(101);
    expect(summary.recentResponses[0].notePreview).toMatch(/…$/);
  });
});

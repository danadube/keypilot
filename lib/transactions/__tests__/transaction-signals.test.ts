import {
  computeTransactionSignals,
  formatTransactionAttentionPrimaryLine,
  isClosingSoon,
  TRANSACTION_CLOSING_SOON_DAYS,
} from "@/lib/transactions/transaction-signals";

describe("transaction-signals", () => {
  it("isClosingSoon is false for terminal statuses", () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    expect(isClosingSoon(future.toISOString(), "CLOSED")).toBe(false);
    expect(isClosingSoon(future.toISOString(), "FALLEN_APART")).toBe(false);
  });

  it("computeTransactionSignals flags setup and closing", () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 10);
    const s = computeTransactionSignals({
      status: "PENDING",
      salePrice: null,
      closingDate: soon.toISOString(),
      brokerageName: "KW",
      incompleteChecklistCount: 0,
    });
    expect(s.setupIncomplete).toBe(true);
    expect(s.closingSoon).toBe(true);
    expect(s.hasAttention).toBe(true);
  });

  it("documents default closing horizon", () => {
    expect(TRANSACTION_CLOSING_SOON_DAYS).toBe(30);
  });

  it("computeTransactionSignals surfaces incomplete checklist count without duplicate rules", () => {
    const far = new Date();
    far.setDate(far.getDate() + 90);
    const s = computeTransactionSignals({
      status: "PENDING",
      salePrice: "400000",
      closingDate: far.toISOString(),
      brokerageName: "KW",
      incompleteChecklistCount: 3,
    });
    expect(s.incompleteChecklistCount).toBe(3);
    expect(s.hasAttention).toBe(true);
    expect(
      formatTransactionAttentionPrimaryLine("41745 Harrison Drive", s)
    ).toContain("3 checklist items still open");
  });
});

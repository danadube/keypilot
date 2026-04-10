import { TX_STATUS_LABEL } from "@/lib/transactions/transaction-status-labels";

describe("transaction-patch-activities helpers", () => {
  it("TX_STATUS_LABEL covers all enum keys used in summaries", () => {
    expect(TX_STATUS_LABEL.PENDING).toBe("Pending");
    expect(TX_STATUS_LABEL.CLOSED).toBe("Closed");
  });
});

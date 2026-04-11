import { computeTransactionFinancialsCore } from "@/lib/transactions/transaction-financials-core";

describe("computeTransactionFinancialsCore", () => {
  it("matches KW sale NCI from pure core (aligns with persisted path)", () => {
    const r = computeTransactionFinancialsCore({
      transactionKind: "SALE",
      salePrice: 500_000,
      brokerageName: "KW",
      commissionInputsJson: { commissionPct: 0.03 },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.gci).toBeCloseTo(15_000, 1);
      expect(r.nci).toBeCloseTo(12_600, 1);
    }
  });

  it("referral received with NCI override", () => {
    const r = computeTransactionFinancialsCore({
      transactionKind: "REFERRAL_RECEIVED",
      salePrice: null,
      brokerageName: null,
      commissionInputsJson: {
        referralFeeReceived: 5000,
        nci: 4200,
      },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.gci).toBeCloseTo(5000, 1);
      expect(r.nci).toBeCloseTo(4200, 1);
    }
  });
});

import {
  getProductionValueDisplay,
  type ProductionListRowInput,
} from "@/lib/transactions/production-list-value";

function row(p: Partial<ProductionListRowInput> & Pick<ProductionListRowInput, "transactionKind">): ProductionListRowInput {
  return {
    salePrice: null,
    gci: null,
    nci: null,
    commissionInputs: {},
    ...p,
  };
}

describe("getProductionValueDisplay", () => {
  it("sale: missing price → incomplete", () => {
    const d = getProductionValueDisplay(
      row({
        transactionKind: "SALE",
        salePrice: null,
        commissionInputs: { commissionPct: 0.03 },
      })
    );
    expect(d).toEqual({ type: "incomplete", message: "Needs sale price" });
  });

  it("sale: missing commission % → incomplete", () => {
    const d = getProductionValueDisplay(
      row({
        transactionKind: "SALE",
        salePrice: 500_000,
        commissionInputs: {},
      })
    );
    expect(d).toEqual({ type: "incomplete", message: "Needs commission %" });
  });

  it("sale: uses closedPrice in commissionInputs when sale price absent", () => {
    const d = getProductionValueDisplay(
      row({
        transactionKind: "SALE",
        salePrice: null,
        gci: 15_000,
        nci: 12_600,
        commissionInputs: { closedPrice: 500_000, commissionPct: 0.03 },
      })
    );
    expect(d).toEqual({ type: "nci", amount: 12_600 });
  });

  it("sale: shows NCI when inputs and persisted net present", () => {
    const d = getProductionValueDisplay(
      row({
        transactionKind: "SALE",
        salePrice: 500_000,
        gci: 15_000,
        nci: 12_600,
        commissionInputs: { commissionPct: 0.03 },
      })
    );
    expect(d).toEqual({ type: "nci", amount: 12_600 });
  });

  it("sale: accepts commission percent whole number (e.g. 3)", () => {
    const d = getProductionValueDisplay(
      row({
        transactionKind: "SALE",
        salePrice: 200_000,
        gci: 6000,
        nci: 6000,
        commissionInputs: { commissionPct: 3 },
      })
    );
    expect(d).toEqual({ type: "nci", amount: 6000 });
  });

  it("sale: GCI fallback when NCI null but GCI present", () => {
    const d = getProductionValueDisplay(
      row({
        transactionKind: "SALE",
        salePrice: 100_000,
        gci: 3000,
        nci: null,
        commissionInputs: { commissionPct: 0.03 },
      })
    );
    expect(d.type).toBe("gci");
    if (d.type === "gci") {
      expect(d.amount).toBe(3000);
    }
  });

  it("referral: missing fee → incomplete", () => {
    const d = getProductionValueDisplay(
      row({
        transactionKind: "REFERRAL_RECEIVED",
        commissionInputs: {},
      })
    );
    expect(d).toEqual({ type: "incomplete", message: "Needs referral fee" });
  });

  it("referral: NCI when override in inputs", () => {
    const d = getProductionValueDisplay(
      row({
        transactionKind: "REFERRAL_RECEIVED",
        gci: 5000,
        nci: 4200,
        commissionInputs: { referralFeeReceived: 5000, nci: 4200 },
      })
    );
    expect(d).toEqual({ type: "nci", amount: 4200 });
  });

  it("referral: gross fallback when fee present but net not set", () => {
    const d = getProductionValueDisplay(
      row({
        transactionKind: "REFERRAL_RECEIVED",
        gci: 5000,
        nci: 0,
        commissionInputs: { referralFeeReceived: 5000 },
      })
    );
    expect(d.type).toBe("gci");
    if (d.type === "gci") {
      expect(d.amount).toBe(5000);
      expect(d.hint).toContain("Net not set");
    }
  });
});

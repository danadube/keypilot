import { calculateCommission } from "@/lib/transactions/commission-calculations";

describe("calculateCommission", () => {
  it("KW sale: applies default 6% royalty and 10% company dollar on adjusted GCI", () => {
    const r = calculateCommission({
      brokerage: "KW",
      transactionType: "Sale",
      closedPrice: 500_000,
      commissionPct: 0.03,
      referralPct: 0,
    });
    expect(parseFloat(r.gci)).toBeCloseTo(15_000, 2);
    expect(parseFloat(r.adjustedGci)).toBeCloseTo(15_000, 2);
    expect(parseFloat(r.royalty ?? "0")).toBeCloseTo(900, 2);
    expect(parseFloat(r.companyDollar ?? "0")).toBeCloseTo(1500, 2);
    expect(parseFloat(r.totalBrokerageFees)).toBeCloseTo(2400, 2);
    expect(parseFloat(r.nci)).toBeCloseTo(12_600, 2);
    expect(parseFloat(r.netVolume)).toBeCloseTo(500_000, 2);
  });

  it("KW sale: referral paid reduces adjusted GCI before brokerage fees", () => {
    const r = calculateCommission({
      brokerage: "Keller Williams",
      closedPrice: 100_000,
      commissionPct: 0.03,
      referralPct: 0.2,
    });
    expect(parseFloat(r.gci)).toBeCloseTo(3000, 2);
    expect(parseFloat(r.referralDollar)).toBeCloseTo(600, 2);
    expect(parseFloat(r.adjustedGci)).toBeCloseTo(2400, 2);
    expect(parseFloat(r.nci)).toBeLessThan(parseFloat(r.adjustedGci));
  });

  it("BDH sale: computes pre-split, BDH split, and NCI", () => {
    const r = calculateCommission({
      brokerage: "BDH",
      closedPrice: 400_000,
      commissionPct: 0.03,
      referralPct: 0,
      adminFee: 100,
    });
    const gci = 12_000;
    const adj = gci;
    const preSplit = adj - adj * 0.06 - 10;
    const bdhSplit = preSplit * 0.1;
    const expectedNci = preSplit - bdhSplit - 100;
    expect(parseFloat(r.gci)).toBeCloseTo(gci, 2);
    expect(parseFloat(r.preSplitDeduction ?? "0")).toBeCloseTo(preSplit, 2);
    expect(parseFloat(r.bdhSplit ?? "0")).toBeCloseTo(bdhSplit, 2);
    expect(parseFloat(r.nci)).toBeCloseTo(expectedNci, 2);
  });

  it("Referral received: uses CSV NCI when provided", () => {
    const r = calculateCommission({
      brokerage: "KW",
      transactionType: "Referral $ Received",
      closedPrice: 0,
      commissionPct: 0,
      referralFeeReceived: 5000,
      nci: 4200,
    });
    expect(parseFloat(r.gci)).toBeCloseTo(5000, 2);
    expect(parseFloat(r.nci)).toBeCloseTo(4200, 2);
    expect(parseFloat(r.totalBrokerageFees)).toBeCloseTo(800, 2);
  });

  it("Generic brokerage: NCI equals adjusted GCI with no fee rules", () => {
    const r = calculateCommission({
      brokerage: "Independent",
      closedPrice: 200_000,
      commissionPct: 3,
      referralPct: 0,
    });
    expect(parseFloat(r.gci)).toBeCloseTo(6000, 2);
    expect(parseFloat(r.totalBrokerageFees)).toBe(0);
    expect(parseFloat(r.nci)).toBeCloseTo(parseFloat(r.adjustedGci), 2);
  });
});

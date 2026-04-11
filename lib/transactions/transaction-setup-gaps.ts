/** Fields required for “needs setup” / attention signals (aligned with production list inputs). */
export type TransactionSetupGap = "salePrice" | "closingDate" | "brokerageName";

export function getTransactionSetupGaps(t: {
  salePrice: string | number | null;
  closingDate: string | null;
  brokerageName: string | null;
}): TransactionSetupGap[] {
  const gaps: TransactionSetupGap[] = [];
  if (t.salePrice == null || t.salePrice === "") gaps.push("salePrice");
  if (!t.closingDate) gaps.push("closingDate");
  if (!t.brokerageName?.trim()) gaps.push("brokerageName");
  return gaps;
}

export function setupGapLabel(gap: TransactionSetupGap) {
  switch (gap) {
    case "salePrice":
      return "sale price";
    case "closingDate":
      return "closing date";
    case "brokerageName":
      return "brokerage";
  }
}

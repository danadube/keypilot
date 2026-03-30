import type { Prisma } from "@prisma/client";

type TxRow = {
  salePrice: Prisma.Decimal | null | undefined;
  gci?: Prisma.Decimal | null;
  adjustedGci?: Prisma.Decimal | null;
  referralDollar?: Prisma.Decimal | null;
  totalBrokerageFees?: Prisma.Decimal | null;
  nci?: Prisma.Decimal | null;
  netVolume?: Prisma.Decimal | null;
};

function n(d: unknown): number | null {
  if (d == null) return null;
  if (typeof d === "number") return Number.isFinite(d) ? d : null;
  if (typeof d === "string") {
    const x = parseFloat(d);
    return Number.isNaN(x) ? null : x;
  }
  if (typeof d === "object" && "toNumber" in d && typeof (d as { toNumber: () => number }).toNumber === "function") {
    try {
      const x = (d as Prisma.Decimal).toNumber();
      return Number.isFinite(x) ? x : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Serialize transaction for JSON API (decimals → numbers). */
export function serializeTransactionDecimals<T extends TxRow>(row: T): T & {
  salePrice: number | null;
  gci: number | null;
  adjustedGci: number | null;
  referralDollar: number | null;
  totalBrokerageFees: number | null;
  nci: number | null;
  netVolume: number | null;
} {
  return {
    ...row,
    salePrice: n(row.salePrice),
    gci: n(row.gci),
    adjustedGci: n(row.adjustedGci),
    referralDollar: n(row.referralDollar),
    totalBrokerageFees: n(row.totalBrokerageFees),
    nci: n(row.nci),
    netVolume: n(row.netVolume),
  };
}

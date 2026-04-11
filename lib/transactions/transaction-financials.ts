import { Prisma } from "@prisma/client";
import type { TransactionKind } from "@prisma/client";
import { computeTransactionFinancialsCore } from "./transaction-financials-core";

function toDecimalString(n: number): Prisma.Decimal {
  return new Prisma.Decimal(n);
}

function salePriceToNumber(
  salePrice: Prisma.Decimal | number | null | undefined
): number | null {
  if (salePrice == null) return null;
  if (typeof salePrice === "number") return Number.isFinite(salePrice) ? salePrice : null;
  try {
    const x = salePrice.toNumber();
    return Number.isFinite(x) ? x : null;
  } catch {
    return null;
  }
}

export type FinancialComputeOk = {
  ok: true;
  commissionInputs: Prisma.InputJsonValue;
  gci: Prisma.Decimal | null;
  adjustedGci: Prisma.Decimal | null;
  referralDollar: Prisma.Decimal | null;
  totalBrokerageFees: Prisma.Decimal | null;
  nci: Prisma.Decimal | null;
  netVolume: Prisma.Decimal | null;
};

export type FinancialComputeErr = { ok: false; error: string };

/**
 * Validates commission JSON, runs the commission engine, returns Prisma-ready columns.
 */
export function computeTransactionFinancials(params: {
  transactionKind: TransactionKind;
  salePrice: Prisma.Decimal | number | null | undefined;
  brokerageName: string | null | undefined;
  commissionInputsJson: unknown;
}): FinancialComputeOk | FinancialComputeErr {
  const core = computeTransactionFinancialsCore({
    transactionKind: params.transactionKind,
    salePrice: salePriceToNumber(params.salePrice),
    brokerageName: params.brokerageName,
    commissionInputsJson: params.commissionInputsJson,
  });
  if (!core.ok) return core;

  return {
    ok: true,
    commissionInputs: core.commissionInputs as Prisma.InputJsonValue,
    gci: toDecimalString(core.gci),
    adjustedGci: toDecimalString(core.adjustedGci),
    referralDollar: toDecimalString(core.referralDollar),
    totalBrokerageFees: toDecimalString(core.totalBrokerageFees),
    nci: toDecimalString(core.nci),
    netVolume: toDecimalString(core.netVolume),
  };
}

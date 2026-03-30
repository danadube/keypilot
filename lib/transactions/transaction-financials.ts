import { Prisma } from "@prisma/client";
import type { TransactionKind } from "@prisma/client";
import { calculateCommission, type TransactionInput } from "./commission-calculations";
import { CommissionInputsSchema, type CommissionInputs } from "./commission-inputs";

function toDecimalString(s: string): Prisma.Decimal {
  return new Prisma.Decimal(s);
}

function salePriceToNumber(
  salePrice: Prisma.Decimal | number | null | undefined
): number {
  if (salePrice == null) return 0;
  if (typeof salePrice === "number") return salePrice;
  return salePrice.toNumber();
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
  const raw =
    params.commissionInputsJson && typeof params.commissionInputsJson === "object"
      ? params.commissionInputsJson
      : {};
  const parsed = CommissionInputsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid commission inputs",
    };
  }

  const data = parsed.data as CommissionInputs;
  const saleNum = salePriceToNumber(params.salePrice);
  const closedFromInputs =
    data.closedPrice !== undefined && data.closedPrice !== null && data.closedPrice !== ""
      ? parseFloat(String(data.closedPrice)) || 0
      : null;
  const closedPrice = closedFromInputs !== null ? closedFromInputs : saleNum;

  const brokerage =
    data.brokerage != null && String(data.brokerage).trim() !== ""
      ? String(data.brokerage).trim()
      : params.brokerageName?.trim() ?? "";

  const transactionType =
    params.transactionKind === "REFERRAL_RECEIVED"
      ? "Referral $ Received"
      : data.transactionType != null && String(data.transactionType).trim() !== ""
        ? String(data.transactionType)
        : "Sale";

  const input: TransactionInput = {
    ...data,
    brokerage,
    closedPrice,
    transactionType,
  };

  const result = calculateCommission(input);

  return {
    ok: true,
    commissionInputs: parsed.data as Prisma.InputJsonValue,
    gci: toDecimalString(result.gci),
    adjustedGci: toDecimalString(result.adjustedGci),
    referralDollar: toDecimalString(result.referralDollar),
    totalBrokerageFees: toDecimalString(result.totalBrokerageFees),
    nci: toDecimalString(result.nci),
    netVolume: toDecimalString(result.netVolume),
  };
}

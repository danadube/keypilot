import type { TransactionKind } from "@prisma/client";
import { calculateCommission, type TransactionInput } from "./commission-calculations";
import { CommissionInputsSchema, type CommissionInputs } from "./commission-inputs";

function salePriceToNumber(salePrice: number | null | undefined): number {
  if (salePrice == null) return 0;
  if (typeof salePrice === "number") return Number.isFinite(salePrice) ? salePrice : 0;
  const n = parseFloat(String(salePrice));
  return Number.isFinite(n) ? n : 0;
}

function parseEngineMoney(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export type FinancialCoreOk = {
  ok: true;
  commissionInputs: CommissionInputs;
  gci: number;
  adjustedGci: number;
  referralDollar: number;
  totalBrokerageFees: number;
  nci: number;
  netVolume: number;
};

export type FinancialCoreErr = { ok: false; error: string };

/**
 * Pure commission compute (plain numbers). Shared by Prisma persist path and client preview.
 */
export function computeTransactionFinancialsCore(params: {
  transactionKind: TransactionKind;
  salePrice: number | null | undefined;
  brokerageName: string | null | undefined;
  commissionInputsJson: unknown;
}): FinancialCoreOk | FinancialCoreErr {
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
  const saleNum = salePriceToNumber(params.salePrice ?? null);
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
    commissionInputs: parsed.data as CommissionInputs,
    gci: parseEngineMoney(result.gci),
    adjustedGci: parseEngineMoney(result.adjustedGci),
    referralDollar: parseEngineMoney(result.referralDollar),
    totalBrokerageFees: parseEngineMoney(result.totalBrokerageFees),
    nci: parseEngineMoney(result.nci),
    netVolume: parseEngineMoney(result.netVolume),
  };
}

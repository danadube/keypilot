/**
 * Derives scan-first money display for the Transactions production list.
 * Uses persisted API fields only (no client-side engine recompute).
 */

export type ProductionValueDisplay =
  | { type: "nci"; amount: number }
  | { type: "gci"; amount: number; hint: string }
  | { type: "incomplete"; message: string };

type TxKind = "SALE" | "REFERRAL_RECEIVED";

function asRecord(x: unknown): Record<string, unknown> {
  if (x && typeof x === "object" && !Array.isArray(x)) {
    return x as Record<string, unknown>;
  }
  return {};
}

function numish(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function hasNciOverride(ci: Record<string, unknown>): boolean {
  return ci.nci !== undefined && ci.nci !== null && ci.nci !== "";
}

/** Effective closed price: sale price or commissionInputs.closedPrice. */
function effectivePrice(salePrice: number | null, ci: Record<string, unknown>): number {
  const sp = salePrice != null && Number.isFinite(salePrice) ? salePrice : null;
  if (sp != null && sp > 0) return sp;
  const closed = numish(ci.closedPrice);
  return closed != null && closed > 0 ? closed : 0;
}

function hasPositiveCommissionPct(ci: Record<string, unknown>): boolean {
  const n = numish(ci.commissionPct);
  if (n == null || n <= 0) return false;
  return true;
}

function referralFeeReceived(ci: Record<string, unknown>): number {
  const n = numish(ci.referralFeeReceived);
  return n != null && n > 0 ? n : 0;
}

export type ProductionListRowInput = {
  transactionKind: TxKind;
  salePrice: number | null;
  gci: number | null;
  nci: number | null;
  commissionInputs: unknown;
};

/** Same rules as production list "Needs setup"; used to gate client-side live preview. */
export type MoneyPreviewGateInput = {
  transactionKind: TxKind;
  salePrice: number | null;
  commissionInputs: unknown;
};

export function moneyPreviewBlockingMessage(input: MoneyPreviewGateInput): string | null {
  const kind = input.transactionKind ?? "SALE";
  const ci = asRecord(input.commissionInputs);
  if (kind === "REFERRAL_RECEIVED") {
    return referralFeeReceived(ci) <= 0 ? "Needs referral fee" : null;
  }
  if (effectivePrice(input.salePrice, ci) <= 0) {
    return "Needs sale price";
  }
  if (!hasPositiveCommissionPct(ci)) {
    return "Needs commission %";
  }
  return null;
}

/**
 * NCI is primary when inputs are sufficient and the persisted net is meaningful,
 * or when the user set an explicit NCI override (e.g. imports).
 */
export function getProductionValueDisplay(row: ProductionListRowInput): ProductionValueDisplay {
  const kind = row.transactionKind ?? "SALE";
  const ci = asRecord(row.commissionInputs);
  const gci = row.gci != null && Number.isFinite(row.gci) ? row.gci : null;
  const nci = row.nci != null && Number.isFinite(row.nci) ? row.nci : null;

  if (kind === "REFERRAL_RECEIVED") {
    const fee = referralFeeReceived(ci);
    if (fee <= 0) {
      return { type: "incomplete", message: "Needs referral fee" };
    }
    if (hasNciOverride(ci) || (nci != null && nci > 0)) {
      const show = nci ?? 0;
      return { type: "nci", amount: show };
    }
    const gross = gci != null && gci > 0 ? gci : fee;
    return {
      type: "gci",
      amount: gross,
      hint: "Net not set — add NCI on detail",
    };
  }

  const price = effectivePrice(row.salePrice, ci);
  if (price <= 0) {
    return { type: "incomplete", message: "Needs sale price" };
  }
  if (!hasPositiveCommissionPct(ci)) {
    return { type: "incomplete", message: "Needs commission %" };
  }

  if (nci != null) {
    return { type: "nci", amount: nci };
  }
  if (gci != null && gci > 0) {
    return {
      type: "gci",
      amount: gci,
      hint: "Open detail to refresh net",
    };
  }

  return { type: "incomplete", message: "Financials incomplete" };
}

export const TRANSACTION_KIND_LABELS: Record<TxKind, string> = {
  SALE: "Sale",
  REFERRAL_RECEIVED: "Referral",
};

function formatUsdCompact(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/**
 * Second line under the primary commission figure on deal cards (scan context only).
 */
export function getDealCardCommissionSubline(
  row: ProductionListRowInput,
  money: ProductionValueDisplay
): string | null {
  const kind = row.transactionKind ?? "SALE";
  const gci = row.gci != null && Number.isFinite(row.gci) ? row.gci : null;
  const nci = row.nci != null && Number.isFinite(row.nci) ? row.nci : null;

  if (money.type === "incomplete") return null;

  if (money.type === "nci") {
    if (kind === "REFERRAL_RECEIVED") {
      return "Referral — net to you";
    }
    if (gci != null && gci > 0 && nci != null && Math.abs(gci - nci) > 0.5) {
      return `${formatUsdCompact(gci)} GCI → ${formatUsdCompact(nci)} net`;
    }
    return "Net after brokerage, splits & fees";
  }

  if (money.type === "gci") {
    return money.hint;
  }

  return null;
}

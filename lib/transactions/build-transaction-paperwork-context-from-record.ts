import type { TransactionPaperworkContext } from "@/lib/forms-engine/types";
import { buildTransactionPaperworkContext } from "@/lib/transactions/build-transaction-paperwork-context";

/**
 * Pull optional boolean flags from commissionInputs JSON (passthrough + future UI).
 * Supports top-level keys and a nested `paperworkFlags` object.
 */
export function extractPaperworkFlagsFromCommissionInputs(
  commissionInputs: unknown
): Record<string, boolean> | undefined {
  if (!commissionInputs || typeof commissionInputs !== "object" || Array.isArray(commissionInputs)) {
    return undefined;
  }
  const o = commissionInputs as Record<string, unknown>;
  const out: Record<string, boolean> = {};

  const nested = o.paperworkFlags;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    for (const [k, v] of Object.entries(nested as Record<string, unknown>)) {
      if (typeof v === "boolean") out[k] = v;
    }
  }

  const topLevelBooleans = [
    "probate",
    "trustSale",
    "trust",
    "tenantOccupied",
    "shortSale",
    "reo",
  ] as const;
  for (const k of topLevelBooleans) {
    if (typeof o[k] === "boolean") out[k] = o[k] as boolean;
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

export type TransactionRecordForPaperwork = {
  transactionId: string;
  propertyState: string | null | undefined;
  side: "BUY" | "SELL";
  /** When set, passed as brokerageId for rule overlays (string id or brokerage name). */
  brokerageName?: string | null;
  commissionInputs?: unknown;
  propertyType?: string | null;
  yearBuilt?: number | null;
  hasHoa?: boolean | null;
  occupancyType?: string | null;
  agentUserId?: string | null;
  agentDisplayName?: string | null;
};

/**
 * Single place to build `TransactionPaperworkContext` from persisted transaction/property
 * data (client detail view, API sync, tests). Missing optional fields are omitted.
 */
export function buildTransactionPaperworkContextFromRecord(
  input: TransactionRecordForPaperwork
): TransactionPaperworkContext | null {
  const flags = extractPaperworkFlagsFromCommissionInputs(input.commissionInputs);
  const brokerageId = input.brokerageName?.trim() || undefined;

  return buildTransactionPaperworkContext({
    transactionId: input.transactionId,
    propertyState: input.propertyState,
    side: input.side,
    propertyType: input.propertyType,
    yearBuilt: input.yearBuilt ?? undefined,
    hasHoa: input.hasHoa ?? undefined,
    occupancyType: input.occupancyType,
    flags,
    brokerageId: brokerageId ?? null,
    agentUserId: input.agentUserId,
    agentDisplayName: input.agentDisplayName,
  });
}

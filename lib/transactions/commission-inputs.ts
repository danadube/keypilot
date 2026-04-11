import { z } from "zod";

const looseNum = z.union([z.number(), z.string()]).optional();

/** Optional fields mirrored from FarmTrackr `TransactionInput` (all optional). */
export const CommissionInputsSchema = z
  .object({
    brokerage: z.string().optional(),
    transactionType: z.string().optional(),
    closedPrice: looseNum,
    commissionPct: looseNum,
    referralPct: looseNum,
    referralFeeReceived: looseNum,
    eo: looseNum,
    royalty: z.union([z.number(), z.string(), z.literal("")]).optional(),
    companyDollar: z.union([z.number(), z.string(), z.literal("")]).optional(),
    hoaTransfer: looseNum,
    homeWarranty: looseNum,
    kwCares: looseNum,
    kwNextGen: looseNum,
    boldScholarship: looseNum,
    tcConcierge: looseNum,
    jelmbergTeam: looseNum,
    bdhSplitPct: looseNum,
    preSplitDeduction: z.union([z.number(), z.string(), z.literal("")]).optional(),
    asf: looseNum,
    foundation10: looseNum,
    adminFee: looseNum,
    brokerageSplit: looseNum,
    brokerageSplitPct: looseNum,
    otherDeductions: looseNum,
    buyersAgentSplit: looseNum,
    nci: looseNum,
  })
  .passthrough();

export type CommissionInputs = z.infer<typeof CommissionInputsSchema>;

export function mergeCommissionInputs(existing: unknown, patch: unknown): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const p =
    patch && typeof patch === "object" && !Array.isArray(patch)
      ? (patch as Record<string, unknown>)
      : {};
  const out = { ...base };
  for (const [k, v] of Object.entries(p)) {
    if (v === null) delete out[k];
    else out[k] = v;
  }
  return out;
}

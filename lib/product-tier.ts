import type { ProductTier } from "@prisma/client";

/**
 * CRM features (tags, notes, reminders, status, assign-to, log call/email)
 * require FULL_CRM tier. OPEN_HOUSE gets minimal contact visibility only.
 */
export function hasCrmAccess(tier: ProductTier | string | null | undefined): boolean {
  return tier === "FULL_CRM";
}

/**
 * Throws if user does not have CRM access. Use in API routes that are CRM-only.
 */
export function requireCrmAccess(tier: ProductTier | string | null | undefined): void {
  if (!hasCrmAccess(tier)) {
    const err = new Error("CRM access required");
    (err as Error & { code?: string }).code = "CRM_ACCESS_REQUIRED";
    throw err;
  }
}

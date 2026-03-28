import type { NextRequest } from "next/server";

/**
 * Cron-only: allow Vercel’s job runner header or a shared secret. All other callers get 401.
 *
 * - Vercel: exact header `x-vercel-cron: 1`
 * - External: `Authorization: Bearer <CRON_SECRET>` with no alternate schemes or casing
 */
export function isAuthorizedCronRequest(req: NextRequest): boolean {
  if (req.headers.get("x-vercel-cron") === "1") {
    return true;
  }
  const secret = process.env.CRON_SECRET;
  if (!secret?.trim()) {
    return false;
  }
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

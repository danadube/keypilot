import type { NextRequest } from "next/server";

/**
 * Authorize Vercel Cron (`x-vercel-cron: 1`) or `Authorization: Bearer ${CRON_SECRET}`.
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

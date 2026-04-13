import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { fetchDailyBriefing } from "@/lib/daily-briefing/fetch-daily-briefing";

export const dynamic = "force-dynamic";

const QuerySchema = z
  .object({
    dayStartIso: z.string().optional(),
    dayEndIso: z.string().optional(),
  })
  .refine(
    (o) =>
      (o.dayStartIso == null && o.dayEndIso == null) ||
      (o.dayStartIso != null && o.dayEndIso != null),
    { message: "Provide both dayStartIso and dayEndIso, or neither" }
  );

/**
 * Daily Briefing — aggregated, action-first snapshot for email and future in-app surfaces.
 * Reuses Command Center aggregation and the same schedule merge as the dashboard.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      dayStartIso: searchParams.get("dayStartIso") ?? undefined,
      dayEndIso: searchParams.get("dayEndIso") ?? undefined,
    });
    if (!parsed.success) {
      return apiError(parsed.error.flatten().formErrors.join("; ") || "Invalid query", 400);
    }

    const briefing = await fetchDailyBriefing(user, {
      dayStartIso: parsed.data.dayStartIso,
      dayEndIso: parsed.data.dayEndIso,
    });

    return NextResponse.json({ data: briefing });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

/**
 * GET — suggest existing showings near a time for one property or a small set of candidate properties.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { ShowingSuggestQuerySchema } from "@/lib/validations/showing-hq-suggest";
import { suggestShowingsForUser } from "@/lib/showing-hq/suggest-matches";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const sp = req.nextUrl.searchParams;
    const raw = ShowingSuggestQuerySchema.safeParse({
      propertyId: (sp.get("propertyId") ?? "").trim() || undefined,
      candidatePropertyIds: sp.get("candidatePropertyIds") ?? undefined,
      scheduledAt: sp.get("scheduledAt") ?? sp.get("at") ?? "",
      windowHours: sp.get("windowHours") ?? undefined,
    });
    if (!raw.success) {
      const msg = raw.error.issues[0]?.message ?? "Invalid query";
      return apiError(msg, 400, "VALIDATION_ERROR");
    }

    const scheduledAt = new Date(raw.data.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      return apiError("scheduledAt must be a valid date/time", 400, "VALIDATION_ERROR");
    }

    const candidateParts =
      raw.data.candidatePropertyIds
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) ?? [];

    const suggestions = await suggestShowingsForUser(prismaAdmin, user.id, {
      propertyId: raw.data.propertyId,
      candidatePropertyIds: candidateParts.length > 0 ? candidateParts : undefined,
      scheduledAt,
      windowHours: raw.data.windowHours,
    });

    return NextResponse.json({
      data: {
        suggestions: suggestions.map((s) => ({
          id: s.id,
          propertyId: s.propertyId,
          property: s.property,
          scheduledAt: s.scheduledAt.toISOString(),
          minutesDelta: s.minutesDelta,
        })),
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

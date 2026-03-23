/**
 * GET — suggest existing showings near a time for a property (same host user).
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
      propertyId: sp.get("propertyId") ?? "",
      scheduledAt: sp.get("scheduledAt") ?? sp.get("at") ?? "",
      windowHours: sp.get("windowHours") ?? undefined,
    });
    if (!raw.success) {
      return apiError("propertyId and scheduledAt (ISO) are required", 400, "VALIDATION_ERROR");
    }

    const scheduledAt = new Date(raw.data.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      return apiError("scheduledAt must be a valid date/time", 400, "VALIDATION_ERROR");
    }

    const suggestions = await suggestShowingsForUser(prismaAdmin, user.id, {
      propertyId: raw.data.propertyId,
      scheduledAt,
      windowHours: raw.data.windowHours,
    });

    return NextResponse.json({
      data: {
        suggestions: suggestions.map((s) => ({
          id: s.id,
          scheduledAt: s.scheduledAt.toISOString(),
          minutesDelta: s.minutesDelta,
        })),
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { GoogleCalendarOutboundSourceType } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { retryOutboundSyncForSource } from "@/lib/google-calendar/outbound-sync";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  sourceType: z.enum([
    "SHOWING",
    "TASK",
    "FOLLOW_UP",
    "TRANSACTION_CHECKLIST",
    "TRANSACTION_CLOSING",
  ]),
  sourceId: z.string().uuid(),
});

/**
 * Re-run KeyPilot → Google outbound sync for one entity (after ERROR or transient failure).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return apiError("sourceType and sourceId (UUID) are required", 400);
    }
    await retryOutboundSyncForSource(
      user.id,
      parsed.data.sourceType as GoogleCalendarOutboundSourceType,
      parsed.data.sourceId
    );
    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

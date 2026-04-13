import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { withRLSContext } from "@/lib/db-context";
import { DailyBriefingDeliveryPatchSchema } from "@/lib/validations/daily-briefing-delivery";

export const dynamic = "force-dynamic";

function serializeDelivery(row: {
  emailEnabled: boolean;
  sendLocalMinuteOfDay: number;
  timeZone: string;
  deliveryEmailOverride: string | null;
  lastSentLocalDate: string | null;
}) {
  return {
    emailEnabled: row.emailEnabled,
    sendLocalMinuteOfDay: row.sendLocalMinuteOfDay,
    timeZone: row.timeZone,
    deliveryEmailOverride: row.deliveryEmailOverride,
    lastSentLocalDate: row.lastSentLocalDate,
  };
}

/**
 * GET — current daily briefing email delivery preferences (defaults if never configured).
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    const testSendAllowed = process.env.DAILY_BRIEFING_TEST_SEND_ENABLED?.trim() === "true";
    return await withRLSContext(user.id, async (tx) => {
      const row = await tx.userDailyBriefingDelivery.findUnique({
        where: { userId: user.id },
      });
      if (!row) {
        return NextResponse.json({
          data: {
            ...serializeDelivery({
              emailEnabled: false,
              sendLocalMinuteOfDay: 480,
              timeZone: "America/Los_Angeles",
              deliveryEmailOverride: null,
              lastSentLocalDate: null,
            }),
            accountEmail: user.email,
            isProvisioned: false,
            testSendAllowed,
          },
        });
      }
      return NextResponse.json({
        data: {
          ...serializeDelivery(row),
          accountEmail: user.email,
          isProvisioned: true,
          testSendAllowed,
        },
      });
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

/**
 * PATCH — update delivery preferences (upsert).
 */
export async function PATCH(req: NextRequest) {
  try {
    const testSendAllowed = process.env.DAILY_BRIEFING_TEST_SEND_ENABLED?.trim() === "true";
    const user = await getCurrentUser();
    const body: unknown = await req.json().catch(() => ({}));
    const parsed = DailyBriefingDeliveryPatchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.flatten().formErrors.join("; ") || "Invalid body", 400);
    }

    const input = parsed.data;
    const override =
      input.deliveryEmailOverride === undefined
        ? undefined
        : input.deliveryEmailOverride === ""
          ? null
          : input.deliveryEmailOverride;

    return await withRLSContext(user.id, async (tx) => {
      const row = await tx.userDailyBriefingDelivery.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          emailEnabled: input.emailEnabled ?? false,
          sendLocalMinuteOfDay: input.sendLocalMinuteOfDay ?? 480,
          timeZone: input.timeZone ?? "America/Los_Angeles",
          deliveryEmailOverride: override ?? null,
        },
        update: {
          ...(input.emailEnabled !== undefined ? { emailEnabled: input.emailEnabled } : {}),
          ...(input.sendLocalMinuteOfDay !== undefined ? { sendLocalMinuteOfDay: input.sendLocalMinuteOfDay } : {}),
          ...(input.timeZone !== undefined ? { timeZone: input.timeZone } : {}),
          ...(override !== undefined ? { deliveryEmailOverride: override } : {}),
        },
      });

      return NextResponse.json({
        data: {
          ...serializeDelivery(row),
          accountEmail: user.email,
          isProvisioned: true,
          testSendAllowed,
        },
      });
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

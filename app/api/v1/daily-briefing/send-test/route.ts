import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { zonedDayBoundsContaining } from "@/lib/datetime/zoned-day-bounds";
import { fetchDailyBriefing } from "@/lib/daily-briefing/fetch-daily-briefing";
import {
  buildDailyBriefingEmailSubject,
  renderDailyBriefingEmailHtml,
  renderDailyBriefingEmailPlainText,
} from "@/lib/daily-briefing/email/render-daily-briefing-email";
import { persistDailyBriefingSendAttemptLog } from "@/lib/daily-briefing/persist-daily-briefing-send-log";
import { resolveDailyBriefingDeliveryEmail, zonedDateKey } from "@/lib/daily-briefing/run-daily-briefing-send";
import type { DailyBriefingSendAttemptResult } from "@/lib/daily-briefing/send-attempt-types";
import { sendDailyBriefingEmail } from "@/lib/email/send-daily-briefing-email";
import { withRLSContextOrFallbackAdmin } from "@/lib/db-context";
import { DailyBriefingSendLogSource } from "@prisma/client";

export const dynamic = "force-dynamic";

const LOG = "[daily-briefing-send-test]";

/**
 * POST — send one test email to the current user (does not update last-sent dedupe).
 * Gated by `DAILY_BRIEFING_TEST_SEND_ENABLED=true` for safe internal use.
 */
export async function POST() {
  try {
    if (process.env.DAILY_BRIEFING_TEST_SEND_ENABLED?.trim() !== "true") {
      return apiError("Test sends are disabled", 403, "TEST_SEND_DISABLED");
    }

    const user = await getCurrentUser();
    const delivery = await withRLSContextOrFallbackAdmin(user.id, "POST /api/v1/daily-briefing/send-test delivery", (tx) =>
      tx.userDailyBriefingDelivery.findUnique({
        where: { userId: user.id },
      })
    );
    if (!delivery) {
      return apiError("Save delivery settings at least once before sending a test.", 400);
    }

    const utcNow = new Date();
    const tz = delivery.timeZone.trim() || "America/Los_Angeles";
    const { start, end } = zonedDayBoundsContaining(utcNow, tz);

    const briefing = await fetchDailyBriefing(user, {
      now: utcNow,
      dayStartIso: start.toISOString(),
      dayEndIso: end.toISOString(),
    });

    const to = resolveDailyBriefingDeliveryEmail(user, delivery);
    const localDateKey = zonedDateKey(utcNow, tz);
    const subject = `[Test] ${buildDailyBriefingEmailSubject(briefing)}`;
    const html = renderDailyBriefingEmailHtml(briefing);
    const text = renderDailyBriefingEmailPlainText(briefing);

    const result = await sendDailyBriefingEmail({ to, subject, html, text });
    const attemptResult: DailyBriefingSendAttemptResult = result.ok
      ? { status: "sent", messageId: result.messageId }
      : result.skipped
        ? { status: "skipped", reason: `send_env_unavailable:${result.error}` }
        : { status: "failed", error: result.error };

    await persistDailyBriefingSendAttemptLog({
      userId: user.id,
      targetEmail: to,
      localDateKey,
      result: attemptResult,
      source: DailyBriefingSendLogSource.test,
    });

    if (!result.ok) {
      console.error(`${LOG} failed userId=${user.id}`, result);
      return apiError(
        result.error,
        result.skipped ? 503 : 502,
        result.skipped ? "RESEND_UNAVAILABLE" : "SEND_FAILED"
      );
    }

    console.log(`${LOG} ok userId=${user.id} to=${to} messageId=${result.messageId ?? ""}`);
    return NextResponse.json({
      data: { to, messageId: result.messageId },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

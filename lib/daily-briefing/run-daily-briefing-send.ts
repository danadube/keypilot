import type { User, UserDailyBriefingDelivery } from "@prisma/client";
import { DailyBriefingSendLogSource } from "@prisma/client";
import { zonedDayBoundsContaining } from "@/lib/datetime/zoned-day-bounds";
import { fetchDailyBriefing } from "@/lib/daily-briefing/fetch-daily-briefing";
import {
  buildDailyBriefingEmailSubject,
  renderDailyBriefingEmailHtml,
  renderDailyBriefingEmailPlainText,
} from "@/lib/daily-briefing/email/render-daily-briefing-email";
import {
  isDailyBriefingCronSendsEnabled,
  isUserEligibleForDailyBriefingRollout,
} from "@/lib/daily-briefing/delivery-rollout";
import { persistDailyBriefingSendAttemptLog } from "@/lib/daily-briefing/persist-daily-briefing-send-log";
import type { DailyBriefingSendAttemptResult } from "@/lib/daily-briefing/send-attempt-types";
import { sendDailyBriefingEmail } from "@/lib/email/send-daily-briefing-email";
import { prismaAdmin } from "@/lib/db";

export type { DailyBriefingSendAttemptResult };

/** YYYY-MM-DD for `utc` in `timeZone` (briefing local calendar day key). */
export function zonedDateKey(utc: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(utc);
}

export function resolveDailyBriefingDeliveryEmail(user: User, delivery: UserDailyBriefingDelivery): string {
  const override = delivery.deliveryEmailOverride?.trim();
  if (override) {
    return override;
  }
  return user.email.trim();
}

/**
 * Whether `utcNow` is on or after today's local send instant, and we have not recorded a send for this local date.
 */
export function isDueForSend(utcNow: Date, delivery: UserDailyBriefingDelivery): boolean {
  const tz = delivery.timeZone.trim() || "America/Los_Angeles";
  const todayKey = zonedDateKey(utcNow, tz);
  if (delivery.lastSentLocalDate === todayKey) {
    return false;
  }
  const { start } = zonedDayBoundsContaining(utcNow, tz);
  const minute = delivery.sendLocalMinuteOfDay;
  if (minute < 0 || minute > 1439) {
    return false;
  }
  const due = new Date(start.getTime() + minute * 60 * 1000);
  return utcNow.getTime() >= due.getTime();
}

const LOG_PREFIX = "[daily-briefing-send]";

/**
 * Attempts one send for a user (caller filters eligibility and due time for scheduled cron).
 * Persists a send log row for every outcome (cron source).
 */
export async function attemptDailyBriefingSendForUser(
  user: User,
  delivery: UserDailyBriefingDelivery,
  utcNow: Date
): Promise<DailyBriefingSendAttemptResult> {
  const tz = delivery.timeZone.trim() || "America/Los_Angeles";
  const localDateKey = zonedDateKey(utcNow, tz);
  const to = resolveDailyBriefingDeliveryEmail(user, delivery);

  let result: DailyBriefingSendAttemptResult;

  if (!delivery.emailEnabled) {
    result = { status: "skipped", reason: "email_disabled" };
  } else if (!isDailyBriefingCronSendsEnabled()) {
    console.log(`${LOG_PREFIX} skip userId=${user.id} reason=cron_sends_disabled`);
    result = { status: "skipped", reason: "cron_sends_disabled" };
  } else if (!to.includes("@")) {
    result = { status: "skipped", reason: "invalid_delivery_email" };
  } else if (!isUserEligibleForDailyBriefingRollout(user, to)) {
    console.log(`${LOG_PREFIX} skip userId=${user.id} reason=rollout_not_eligible`);
    result = { status: "skipped", reason: "rollout_not_eligible" };
  } else if (!isDueForSend(utcNow, delivery)) {
    result = { status: "skipped", reason: "not_due" };
  } else {
    const { start, end } = zonedDayBoundsContaining(utcNow, tz);

    let briefing;
    try {
      briefing = await fetchDailyBriefing(user, {
        now: utcNow,
        dayStartIso: start.toISOString(),
        dayEndIso: end.toISOString(),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`${LOG_PREFIX} fetch failed userId=${user.id}`, e);
      result = { status: "failed", error: `fetchDailyBriefing: ${msg}` };
      await persistDailyBriefingSendAttemptLog({
        userId: user.id,
        targetEmail: to,
        localDateKey,
        result,
        source: DailyBriefingSendLogSource.cron,
      });
      return result;
    }

    const subject = buildDailyBriefingEmailSubject(briefing);
    const html = renderDailyBriefingEmailHtml(briefing);
    const text = renderDailyBriefingEmailPlainText(briefing);

    const sendResult = await sendDailyBriefingEmail({ to, subject, html, text });
    if (!sendResult.ok) {
      if (sendResult.skipped) {
        console.log(`${LOG_PREFIX} skip userId=${user.id} reason=send_env_unavailable detail=${sendResult.error}`);
        result = { status: "skipped", reason: `send_env_unavailable:${sendResult.error}` };
      } else {
        result = { status: "failed", error: sendResult.error };
      }
    } else {
      const todayKey = zonedDateKey(utcNow, tz);
      await prismaAdmin.userDailyBriefingDelivery.update({
        where: { userId: user.id },
        data: { lastSentLocalDate: todayKey },
      });

      console.log(
        `${LOG_PREFIX} sent userId=${user.id} to=${to} messageId=${sendResult.messageId ?? ""} localDate=${todayKey}`
      );
      result = { status: "sent", messageId: sendResult.messageId };
    }
  }

  await persistDailyBriefingSendAttemptLog({
    userId: user.id,
    targetEmail: to,
    localDateKey,
    result,
    source: DailyBriefingSendLogSource.cron,
  });
  return result;
}

export type RunDailyBriefingCronSummary = {
  utcNow: string;
  candidates: number;
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  results: { userId: string; status: string; detail?: string }[];
};

export async function runDailyBriefingCron(utcNow: Date = new Date()): Promise<RunDailyBriefingCronSummary> {
  const rows = await prismaAdmin.userDailyBriefingDelivery.findMany({
    where: { emailEnabled: true },
    include: { user: true },
  });

  const results: RunDailyBriefingCronSummary["results"] = [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let processed = 0;

  for (const delivery of rows) {
    const user = delivery.user;
    processed += 1;
    if (!isDueForSend(utcNow, delivery)) {
      skipped += 1;
      results.push({ userId: user.id, status: "skipped", detail: "not_due" });
      continue;
    }
    const attempt = await attemptDailyBriefingSendForUser(user, delivery, utcNow);
    if (attempt.status === "sent") {
      sent += 1;
      results.push({ userId: user.id, status: "sent", detail: attempt.messageId });
    } else if (attempt.status === "skipped") {
      skipped += 1;
      results.push({ userId: user.id, status: "skipped", detail: attempt.reason });
    } else {
      failed += 1;
      results.push({ userId: user.id, status: "failed", detail: attempt.error });
    }
  }

  console.log(
    `${LOG_PREFIX} cron summary candidates=${rows.length} processed=${processed} sent=${sent} skipped=${skipped} failed=${failed}`
  );

  return {
    utcNow: utcNow.toISOString(),
    candidates: rows.length,
    processed,
    sent,
    skipped,
    failed,
    results: results.slice(0, 100),
  };
}

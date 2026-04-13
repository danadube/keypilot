import type { User, UserDailyBriefingDelivery } from "@prisma/client";
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
import { sendDailyBriefingEmail } from "@/lib/email/send-daily-briefing-email";
import { prismaAdmin } from "@/lib/db";

function zonedDateKey(utc: Date, timeZone: string): string {
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

export type DailyBriefingSendAttemptResult =
  | { status: "sent"; messageId?: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

const LOG_PREFIX = "[daily-briefing-send]";

/**
 * Attempts one send for a user (caller filters eligibility and due time).
 */
export async function attemptDailyBriefingSendForUser(
  user: User,
  delivery: UserDailyBriefingDelivery,
  utcNow: Date
): Promise<DailyBriefingSendAttemptResult> {
  if (!delivery.emailEnabled) {
    return { status: "skipped", reason: "email_disabled" };
  }
  if (!isDailyBriefingCronSendsEnabled()) {
    console.log(`${LOG_PREFIX} skip userId=${user.id} reason=cron_sends_disabled`);
    return { status: "skipped", reason: "cron_sends_disabled" };
  }
  const to = resolveDailyBriefingDeliveryEmail(user, delivery);
  if (!to.includes("@")) {
    return { status: "skipped", reason: "invalid_delivery_email" };
  }
  if (!isUserEligibleForDailyBriefingRollout(user, to)) {
    console.log(`${LOG_PREFIX} skip userId=${user.id} reason=rollout_not_eligible`);
    return { status: "skipped", reason: "rollout_not_eligible" };
  }
  if (!isDueForSend(utcNow, delivery)) {
    return { status: "skipped", reason: "not_due" };
  }

  const tz = delivery.timeZone.trim() || "America/Los_Angeles";
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
    return { status: "failed", error: `fetchDailyBriefing: ${msg}` };
  }

  const subject = buildDailyBriefingEmailSubject(briefing);
  const html = renderDailyBriefingEmailHtml(briefing);
  const text = renderDailyBriefingEmailPlainText(briefing);

  const sendResult = await sendDailyBriefingEmail({ to, subject, html, text });
  if (!sendResult.ok) {
    if (sendResult.skipped) {
      return { status: "failed", error: sendResult.error };
    }
    return { status: "failed", error: sendResult.error };
  }

  const todayKey = zonedDateKey(utcNow, tz);
  await prismaAdmin.userDailyBriefingDelivery.update({
    where: { userId: user.id },
    data: { lastSentLocalDate: todayKey },
  });

  console.log(
    `${LOG_PREFIX} sent userId=${user.id} to=${to} messageId=${sendResult.messageId ?? ""} localDate=${todayKey}`
  );
  return { status: "sent", messageId: sendResult.messageId };
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

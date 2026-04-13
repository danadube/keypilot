import { DailyBriefingSendLogSource, DailyBriefingSendLogStatus } from "@prisma/client";
import type { DailyBriefingSendAttemptResult } from "@/lib/daily-briefing/send-attempt-types";
import { prismaAdmin } from "@/lib/db";

const LOG = "[daily-briefing-send-log]";

function mapStatus(
  result: DailyBriefingSendAttemptResult
): DailyBriefingSendLogStatus {
  if (result.status === "sent") {
    return DailyBriefingSendLogStatus.SENT;
  }
  if (result.status === "skipped") {
    return DailyBriefingSendLogStatus.SKIPPED;
  }
  return DailyBriefingSendLogStatus.FAILED;
}

function mapDetail(result: DailyBriefingSendAttemptResult): string | null {
  if (result.status === "sent") {
    return null;
  }
  if (result.status === "skipped") {
    return result.reason;
  }
  return result.error;
}

/** Skip reason when the send window has not arrived; intentionally not persisted (see Settings UI). */
export const DAILY_BRIEFING_SKIP_NOT_DUE = "not_due" as const;

/**
 * Persists one attempt row (postgres / BYPASSRLS). Failures are logged and do not throw.
 * Does not persist `not_due` skips so uncron callers cannot flood the DB if pre-filtering is omitted.
 */
export async function persistDailyBriefingSendAttemptLog(args: {
  userId: string;
  targetEmail: string;
  localDateKey: string;
  result: DailyBriefingSendAttemptResult;
  source: DailyBriefingSendLogSource;
}): Promise<void> {
  if (args.result.status === "skipped" && args.result.reason === DAILY_BRIEFING_SKIP_NOT_DUE) {
    return;
  }

  const detail = mapDetail(args.result);
  try {
    await prismaAdmin.userDailyBriefingSendLog.create({
      data: {
        userId: args.userId,
        targetEmail: args.targetEmail.trim().slice(0, 320),
        localDateKey: args.localDateKey,
        status: mapStatus(args.result),
        detail: detail ? detail.slice(0, 2000) : null,
        resendMessageId: args.result.status === "sent" ? (args.result.messageId ?? null) : null,
        source: args.source,
      },
    });
  } catch (e) {
    console.error(`${LOG} persist failed userId=${args.userId}`, e);
  }
}

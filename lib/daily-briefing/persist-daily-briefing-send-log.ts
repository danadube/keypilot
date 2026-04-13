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

/**
 * Persists one attempt row (postgres / BYPASSRLS). Failures are logged and do not throw.
 */
export async function persistDailyBriefingSendAttemptLog(args: {
  userId: string;
  targetEmail: string;
  localDateKey: string;
  result: DailyBriefingSendAttemptResult;
  source: DailyBriefingSendLogSource;
}): Promise<void> {
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

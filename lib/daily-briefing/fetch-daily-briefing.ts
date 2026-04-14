import type { User } from "@prisma/client";
import { getCommandCenterPayload } from "@/lib/dashboard/command-center-payload";
import { localDayBounds } from "@/lib/dashboard/unified-schedule-merge";
import { buildDailyBriefing } from "@/lib/daily-briefing/build-daily-briefing";
import type { DailyBriefing } from "@/lib/daily-briefing/daily-briefing-types";
import { loadScheduleContextForBriefing } from "@/lib/daily-briefing/load-schedule-context";

export type FetchDailyBriefingOptions = {
  /** Inclusive start of the calendar day for schedule merge (ISO). */
  dayStartIso?: string;
  /** Exclusive end of that day (ISO), same contract as `GET /api/v1/dashboard/schedule-day`. */
  dayEndIso?: string;
  /** Defaults to `new Date()` when omitted. */
  now?: Date;
};

/**
 * One call site for email jobs and APIs: Command Center payload + unified schedule inputs.
 */
export async function fetchDailyBriefing(user: User, options?: FetchDailyBriefingOptions): Promise<DailyBriefing> {
  const now = options?.now ?? new Date();
  let dayStart: Date;
  let dayEnd: Date;
  let scheduleBoundsNote: string | null = null;

  if (options?.dayStartIso && options?.dayEndIso) {
    dayStart = new Date(options.dayStartIso);
    dayEnd = new Date(options.dayEndIso);
    if (Number.isNaN(dayStart.getTime()) || Number.isNaN(dayEnd.getTime())) {
      throw new Error("Invalid dayStartIso or dayEndIso");
    }
    if (dayEnd <= dayStart) {
      throw new Error("dayEndIso must be after dayStartIso");
    }
  } else {
    const b = localDayBounds(now);
    dayStart = b.start;
    dayEnd = b.end;
    scheduleBoundsNote =
      "Schedule bounds use the server’s local calendar day for this request. Pass dayStartIso and dayEndIso for the user’s timezone.";
  }

  // Sequential: heavy read aggregations (direct prismaAdmin queries, no $transaction).
  const commandCenter = await getCommandCenterPayload(user);
  const scheduleCtx = await loadScheduleContextForBriefing(user.id, { dayStart, dayEnd, now });

  return buildDailyBriefing({
    commandCenter,
    selectedDay: dayStart,
    now,
    showings: scheduleCtx.showings,
    followUps: scheduleCtx.followUps,
    openTasks: scheduleCtx.openTasks,
    checklistItems: scheduleCtx.checklistItems,
    scheduleBoundsNote,
  });
}

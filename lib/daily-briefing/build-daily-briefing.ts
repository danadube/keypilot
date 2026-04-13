import type { CommandCenterPayload } from "@/lib/dashboard/command-center-types";
import { mergeUnifiedScheduleForDay } from "@/lib/dashboard/unified-schedule-merge";
import type { DailyBriefing, DailyBriefingNudge } from "@/lib/daily-briefing/daily-briefing-types";

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildNudges(cc: CommandCenterPayload, scheduleCount: number): DailyBriefingNudge[] {
  const nudges: DailyBriefingNudge[] = [];
  let i = 0;
  const add = (text: string, href: string | null, kind: DailyBriefingNudge["kind"]) => {
    nudges.push({ id: `nudge-${i++}`, text, href, kind });
  };

  if (cc.attention) {
    add(
      `${cc.attention.addressLine}: ${cc.attention.closingLabel}${
        cc.attention.checklistOpenCount > 0
          ? ` — ${cc.attention.checklistOpenCount} checklist item${cc.attention.checklistOpenCount === 1 ? "" : "s"} open`
          : ""
      }`,
      cc.attention.hrefTransaction,
      "attention"
    );
  }

  if (cc.snapshot.tasksOverdue > 0) {
    add(
      `You have ${cc.snapshot.tasksOverdue} overdue task${cc.snapshot.tasksOverdue === 1 ? "" : "s"} in Task Pilot.`,
      "/task-pilot",
      "tasks"
    );
  } else if (cc.snapshot.tasksDueTotal > 0) {
    add(
      `${cc.snapshot.tasksDueTotal} task${cc.snapshot.tasksDueTotal === 1 ? "" : "s"} due today or overdue — stay ahead in Task Pilot.`,
      "/task-pilot",
      "tasks"
    );
  }

  if (cc.crmAvailable && cc.snapshot.nextClosing) {
    add(
      `${cc.snapshot.nextClosing.label}: ${cc.snapshot.nextClosing.addressLine}`,
      cc.snapshot.nextClosing.href,
      "pipeline"
    );
  }

  if (!cc.crmAvailable && cc.snapshot.pipelineActiveDealsCount > 0) {
    add(
      `${cc.snapshot.pipelineActiveDealsCount} active deal${cc.snapshot.pipelineActiveDealsCount === 1 ? "" : "s"} in your pipeline.`,
      "/deals",
      "pipeline"
    );
  }

  if (scheduleCount === 0 && cc.priorityTasks.length === 0) {
    add("Clear calendar — use the time to follow up or advance a deal.", "/dashboard", "schedule");
  }

  if (cc.snapshot.ytdPercentToGoal != null && cc.snapshot.ytdPercentToGoal < 25) {
    add(
      `Year-to-date GCI is under a quarter of your annual goal — focus on pipeline and closings.`,
      "/transactions/pipeline",
      "goal"
    );
  } else if (cc.snapshot.ytdPercentToGoal != null && cc.snapshot.ytdPercentToGoal >= 100) {
    add(`You've reached or exceeded your annual GCI goal — strong year.`, "/transactions/pipeline", "goal");
  }

  return nudges.slice(0, 8);
}

type BuildArgs = {
  commandCenter: CommandCenterPayload;
  selectedDay: Date;
  now: Date;
  showings: Parameters<typeof mergeUnifiedScheduleForDay>[0]["showings"];
  followUps: Parameters<typeof mergeUnifiedScheduleForDay>[0]["followUps"];
  openTasks: Parameters<typeof mergeUnifiedScheduleForDay>[0]["tasks"];
  checklistItems: Parameters<typeof mergeUnifiedScheduleForDay>[0]["checklistItems"];
  scheduleBoundsNote: string | null;
};

export function buildDailyBriefing(args: BuildArgs): DailyBriefing {
  const { commandCenter: cc, selectedDay, now, showings, followUps, openTasks, checklistItems } = args;

  const merged = mergeUnifiedScheduleForDay({
    selectedDay,
    now,
    showings,
    followUps,
    tasks: openTasks,
    checklistItems,
  });

  const urgentDeal: DailyBriefing["urgentDeal"] = cc.attention
    ? {
        headline: `${cc.attention.closingLabel} — ${cc.attention.addressLine}`,
        subline: null,
        closingLabel: cc.attention.closingLabel,
        checklistOpenCount: cc.attention.checklistOpenCount,
        estimatedGci: cc.attention.estimatedGci,
        href: cc.attention.hrefTransaction,
        transactionId: cc.attention.transactionId,
      }
    : null;

  const priorityPool = cc.priorityTasks;
  const truncated = priorityPool.length >= 12;

  return {
    meta: {
      generatedAt: now.toISOString(),
      dayLabel: formatDayLabel(selectedDay),
      scheduleBoundsNote: args.scheduleBoundsNote,
    },
    urgentDeal,
    todaysSchedule: {
      items: merged.map((m) => ({
        kind: m.kind,
        at: m.at.toISOString(),
        title: m.title,
        subline: m.subline,
        href: m.href,
        badge: m.badge,
      })),
      emptyMessage:
        merged.length === 0
          ? "Nothing on the unified schedule for this day — private showings, follow-ups, tasks, and checklist due items all clear."
          : "",
    },
    priorityTasks: {
      items: priorityPool.map((t) => ({
        id: t.id,
        title: t.title,
        subline: t.subline,
        overdue: t.overdue,
        href: t.href,
        sourceTag: t.sourceTag,
      })),
      truncated,
      count: priorityPool.length,
    },
    pipeline: {
      crmAvailable: cc.crmAvailable,
      activeTransactionsCount: cc.snapshot.pipelineActiveTransactionsCount,
      activeDealsCount: cc.snapshot.pipelineActiveDealsCount,
      estimatedPipelineGci: cc.snapshot.pipelineEstimatedGci,
      ytdGci: cc.snapshot.ytdGci,
      annualGciGoal: cc.snapshot.annualGciGoal,
      ytdPercentToGoal: cc.snapshot.ytdPercentToGoal,
      nextClosing: cc.snapshot.nextClosing
        ? {
            label: cc.snapshot.nextClosing.label,
            addressLine: cc.snapshot.nextClosing.addressLine,
            href: cc.snapshot.nextClosing.href,
            daysUntil: cc.snapshot.nextClosing.daysUntil,
          }
        : null,
      tasksDueTotal: cc.snapshot.tasksDueTotal,
      tasksOverdue: cc.snapshot.tasksOverdue,
      activeListingsCount: cc.snapshot.activeListingsCount,
    },
    smartNudges: buildNudges(cc, merged.length),
    recentActivity: cc.recentActivity.map((a) => ({
      occurredAt: a.occurredAt,
      title: a.title,
      subline: a.subline,
      sourceTag: a.visualTag,
      href: a.href,
    })),
  };
}

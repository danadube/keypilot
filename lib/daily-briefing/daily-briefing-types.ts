import type { ScheduleKind } from "@/lib/dashboard/unified-schedule-merge";

export type DailyBriefingNudgeKind = "attention" | "tasks" | "pipeline" | "schedule" | "goal";

export type DailyBriefingNudge = {
  id: string;
  text: string;
  href: string | null;
  kind: DailyBriefingNudgeKind;
};

export type DailyBriefingUrgentDeal = {
  headline: string;
  subline: string | null;
  closingLabel: string | null;
  checklistOpenCount: number | null;
  estimatedGci: number | null;
  href: string | null;
  transactionId: string | null;
} | null;

export type DailyBriefingScheduleItem = {
  kind: ScheduleKind;
  at: string;
  title: string;
  subline: string | null;
  href: string;
  badge?: "now" | "next" | "overdue";
};

export type DailyBriefingPriorityTask = {
  id: string;
  title: string;
  subline: string | null;
  overdue: boolean;
  href: string;
  sourceTag: string;
};

export type DailyBriefingPipeline = {
  crmAvailable: boolean;
  activeTransactionsCount: number;
  activeDealsCount: number;
  estimatedPipelineGci: number | null;
  ytdGci: number | null;
  annualGciGoal: number;
  ytdPercentToGoal: number | null;
  nextClosing: {
    label: string;
    addressLine: string;
    href: string;
    daysUntil: number | null;
  } | null;
  tasksDueTotal: number;
  tasksOverdue: number;
  activeListingsCount: number;
};

export type DailyBriefingActivityLine = {
  occurredAt: string;
  title: string;
  subline: string | null;
  sourceTag: string;
  href: string | null;
};

/**
 * Stable, email- and notification-friendly shape. Populated from Command Center aggregation
 * plus unified schedule merge — no duplicate Prisma logic.
 */
export type DailyBriefing = {
  meta: {
    generatedAt: string;
    /** Human label for the briefing day (locale default). */
    dayLabel: string;
    /**
     * When `dayStartIso` / `dayEndIso` were omitted, bounds use the server clock at request time.
     * Callers that need the user’s local calendar day should pass explicit ISO bounds (same as schedule-day).
     */
    scheduleBoundsNote: string | null;
  };
  urgentDeal: DailyBriefingUrgentDeal;
  todaysSchedule: {
    items: DailyBriefingScheduleItem[];
    emptyMessage: string;
  };
  priorityTasks: {
    items: DailyBriefingPriorityTask[];
    /** True when Command Center cap (12) may have cut additional tasks. */
    truncated: boolean;
    count: number;
  };
  pipeline: DailyBriefingPipeline;
  smartNudges: DailyBriefingNudge[];
  recentActivity: DailyBriefingActivityLine[];
};

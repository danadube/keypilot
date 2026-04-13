import type { DailyBriefing } from "@/lib/daily-briefing/daily-briefing-types";

/**
 * Rich fixture for email preview and tests. Not used in production aggregation.
 */
export const SAMPLE_DAILY_BRIEFING: DailyBriefing = {
  meta: {
    generatedAt: "2026-04-13T12:30:00.000Z",
    dayLabel: "Monday, April 13, 2026",
    scheduleBoundsNote: null,
  },
  urgentDeal: {
    headline: "Closing Apr 28 — 742 Evergreen Terrace",
    subline: "Attorney review in progress",
    closingLabel: "Closing Apr 28",
    checklistOpenCount: 3,
    estimatedGci: 18500,
    href: "/transactions/pipeline",
    transactionId: "txn_sample_1",
  },
  todaysSchedule: {
    items: [
      {
        kind: "SHOWING",
        at: "2026-04-13T14:00:00.000Z",
        title: "Private showing — 220 Oak Lane",
        subline: "Buyer: Chen",
        href: "/showing-hq",
        badge: "next",
      },
      {
        kind: "FOLLOW_UP",
        at: "2026-04-13T15:30:00.000Z",
        title: "Call back — listing inquiry",
        subline: "Maple St duplex",
        href: "/contacts",
      },
      {
        kind: "TASK",
        at: "2026-04-13T17:00:00.000Z",
        title: "Submit disclosure package",
        subline: "Task Pilot",
        href: "/task-pilot",
        badge: "overdue",
      },
    ],
    emptyMessage: "",
  },
  priorityTasks: {
    items: [
      {
        id: "t1",
        title: "Counter offer — review with seller",
        subline: "Riverside ranch",
        overdue: true,
        href: "/task-pilot",
        sourceTag: "Deal",
      },
      {
        id: "t2",
        title: "Order staging photos",
        subline: "New listing",
        overdue: false,
        href: "/task-pilot",
        sourceTag: "Listing",
      },
    ],
    truncated: false,
    count: 2,
  },
  pipeline: {
    crmAvailable: true,
    activeTransactionsCount: 4,
    activeDealsCount: 6,
    estimatedPipelineGci: 128400,
    ytdGci: 342000,
    annualGciGoal: 750000,
    ytdPercentToGoal: 45.6,
    nextClosing: {
      label: "Closing May 2",
      addressLine: "88 Harbor View Rd",
      href: "/transactions/pipeline",
      daysUntil: 19,
    },
    tasksDueTotal: 7,
    tasksOverdue: 2,
    activeListingsCount: 3,
  },
  smartNudges: [
    {
      id: "n1",
      text: "2 overdue tasks in Task Pilot — clear the queue before showings.",
      href: "/task-pilot",
      kind: "tasks",
    },
    {
      id: "n2",
      text: "Next closing: Closing May 2 — 88 Harbor View Rd",
      href: "/transactions/pipeline",
      kind: "pipeline",
    },
  ],
  recentActivity: [
    {
      occurredAt: "2026-04-13T10:15:00.000Z",
      title: "Visitor signed in — Open house",
      subline: "45 Pine St",
      sourceTag: "Open house",
      href: "/showing-hq",
    },
    {
      occurredAt: "2026-04-12T16:40:00.000Z",
      title: "Follow-up marked done",
      subline: "Buyer tour follow-up",
      sourceTag: "Follow-up",
      href: null,
    },
  ],
};

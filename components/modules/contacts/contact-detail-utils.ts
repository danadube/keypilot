import type { StatusBadge } from "@/components/ui/status-badge";
import type { ComponentProps } from "react";
import { formatActivityTimelineDateTime } from "@/lib/activity/format-activity-timeline-datetime";

export function contactStatusBadgeVariant(
  s: string | null | undefined
): ComponentProps<typeof StatusBadge>["variant"] {
  switch (s) {
    case "FARM":
      return "draft";
    case "LEAD":
      return "pending";
    case "CONTACTED":
      return "upcoming";
    case "NURTURING":
      return "active";
    case "READY":
      return "sold";
    case "LOST":
      return "cancelled";
    default:
      return "pending";
  }
}

export const formatContactDateTime = formatActivityTimelineDateTime;

export function formatReminderDue(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export type ReminderDueKind = "overdue" | "today" | "soon" | "later";

export type ReminderDueClassification = {
  kind: ReminderDueKind;
  /** Short label for chips and emphasis, e.g. "Overdue" */
  label: string;
  /** When the follow-up is due (time included when useful) */
  detail: string;
};

const SOON_HORIZON_MS = 48 * 60 * 60 * 1000;

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Classifies a follow-up due time for operational emphasis (overdue, today, soon, later).
 * Uses the viewer's local timezone.
 */
export function classifyReminderDue(dueAtIso: string): ReminderDueClassification {
  const due = new Date(dueAtIso);
  const now = new Date();
  const dueMs = due.getTime();
  const nowMs = now.getTime();
  const deltaMs = dueMs - nowMs;

  const dateLine = formatReminderDue(dueAtIso);
  const timePart = due.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (deltaMs < 0) {
    return { kind: "overdue", label: "Overdue", detail: dateLine };
  }

  if (startOfLocalDay(due) === startOfLocalDay(now)) {
    return { kind: "today", label: "Due today", detail: timePart };
  }

  if (deltaMs <= SOON_HORIZON_MS) {
    return { kind: "soon", label: "Due soon", detail: dateLine };
  }

  return { kind: "later", label: "Scheduled", detail: dateLine };
}

/** Overdue and due-today first, then by due time ascending. */
export function sortRemindersForContact<T extends { dueAt: string }>(reminders: T[]): T[] {
  return [...reminders].sort((a, b) => {
    const ca = classifyReminderDue(a.dueAt);
    const cb = classifyReminderDue(b.dueAt);
    const rank: Record<ReminderDueKind, number> = {
      overdue: 0,
      today: 1,
      soon: 2,
      later: 3,
    };
    const dr = rank[ca.kind] - rank[cb.kind];
    if (dr !== 0) return dr;
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });
}

export function summarizeReminderCounts(reminders: { dueAt: string }[]): {
  overdue: number;
  dueToday: number;
  dueSoon: number;
  total: number;
} {
  let overdue = 0;
  let dueToday = 0;
  let dueSoon = 0;
  for (const r of reminders) {
    const c = classifyReminderDue(r.dueAt);
    if (c.kind === "overdue") overdue += 1;
    else if (c.kind === "today") dueToday += 1;
    else if (c.kind === "soon") dueSoon += 1;
  }
  return { overdue, dueToday, dueSoon, total: reminders.length };
}

/** Short relative phrase for “last touch” line */
export function formatRelativeTouch(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - t) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 48) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 14) return `${diffDay}d ago`;
  return formatActivityTimelineDateTime(iso);
}

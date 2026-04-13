import type { SerializedAgentFollowUp } from "@/lib/follow-ups/agent-follow-up-buckets";
import type { SerializedTask } from "@/lib/tasks/task-serialize";
import type { ScheduleChecklistItem } from "@/lib/dashboard/command-center-types";

/** Matches ShowingHQ private showing rows used by the command center schedule. */
export type CommandCenterScheduleShowing = {
  id: string;
  scheduledAt: string;
  buyerName?: string | null;
  property?: { address1: string; city: string; state: string } | null;
};

export type ScheduleKind = "SHOWING" | "FOLLOW_UP" | "TASK" | "CHECKLIST";

export type UnifiedScheduleItem = {
  id: string;
  kind: ScheduleKind;
  at: Date;
  title: string;
  subline: string | null;
  href: string;
  badge?: "now" | "next" | "overdue";
};

export function localDayParts(d: Date) {
  return {
    y: d.getFullYear(),
    m: d.getMonth(),
    day: d.getDate(),
  };
}

export function isSameLocalDay(a: Date, b: Date) {
  const pa = localDayParts(a);
  const pb = localDayParts(b);
  return pa.y === pb.y && pa.m === pb.m && pa.day === pb.day;
}

export function dayKey(y: number, m: number, day: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function localDayBounds(d: Date) {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/**
 * Same merge rules as `CommandCenterSchedulePanel` — single source of truth for
 * unified “today” / selected-day schedule used by dashboard and Daily Briefing.
 */
export function mergeUnifiedScheduleForDay(args: {
  selectedDay: Date;
  now: Date;
  showings: CommandCenterScheduleShowing[];
  followUps: SerializedAgentFollowUp[];
  tasks: SerializedTask[];
  checklistItems: ScheduleChecklistItem[];
}): UnifiedScheduleItem[] {
  const { selectedDay, now, showings, followUps, tasks, checklistItems } = args;
  const { start: dayStart, end: dayEnd } = localDayBounds(selectedDay);
  const todayStart = localDayBounds(now).start;
  const selectedIsToday = isSameLocalDay(selectedDay, now);

  const items: UnifiedScheduleItem[] = [];

  for (const s of showings) {
    const t = new Date(s.scheduledAt);
    if (Number.isNaN(t.getTime())) continue;
    if (!isSameLocalDay(t, selectedDay)) continue;
    const addr = s.property ? `${s.property.address1}, ${s.property.city}` : null;
    items.push({
      id: `showing-${s.id}`,
      kind: "SHOWING",
      at: t,
      title: s.buyerName?.trim() || "Private showing",
      subline: addr,
      href: `/showing-hq/showings/${s.id}`,
    });
  }

  for (const f of followUps) {
    const t = new Date(f.dueAt);
    if (Number.isNaN(t.getTime())) continue;
    const onDay = t >= dayStart && t < dayEnd;
    const overdueOnToday = selectedIsToday && t < todayStart;
    if (!onDay && !overdueOnToday) continue;
    const name = `${f.contact.firstName} ${f.contact.lastName}`.trim();
    items.push({
      id: `fu-${f.id}`,
      kind: "FOLLOW_UP",
      at: onDay ? t : todayStart,
      title: f.title?.trim() || "Follow-up",
      subline: name,
      href: "/showing-hq/follow-ups",
      badge: overdueOnToday ? "overdue" : undefined,
    });
  }

  for (const task of tasks) {
    if (task.status !== "OPEN" || !task.dueAt) continue;
    const t = new Date(task.dueAt);
    if (Number.isNaN(t.getTime())) continue;
    const onDay = t >= dayStart && t < dayEnd;
    const overdueOnToday = selectedIsToday && t < todayStart;
    if (!onDay && !overdueOnToday) continue;
    const sub =
      task.property?.address1 != null
        ? `${task.property.address1}, ${task.property.city}`
        : task.contact
          ? `${task.contact.firstName} ${task.contact.lastName}`.trim()
          : null;
    items.push({
      id: `task-${task.id}`,
      kind: "TASK",
      at: onDay ? t : todayStart,
      title: task.title,
      subline: sub,
      href: "/task-pilot",
      badge: overdueOnToday ? "overdue" : undefined,
    });
  }

  for (const c of checklistItems) {
    const t = new Date(c.dueAt);
    if (Number.isNaN(t.getTime())) continue;
    items.push({
      id: `chk-${c.id}`,
      kind: "CHECKLIST",
      at: t,
      title: c.title,
      subline: c.addressLine,
      href: c.href,
    });
  }

  items.sort((a, b) => a.at.getTime() - b.at.getTime());
  return items;
}

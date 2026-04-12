"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, ListTodo, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { apiFetcher } from "@/lib/fetcher";
import type { SerializedAgentFollowUp } from "@/lib/follow-ups/agent-follow-up-buckets";
import type { SerializedTask } from "@/lib/tasks/task-serialize";
import type { ScheduleChecklistItem } from "@/lib/dashboard/command-center-types";

export type CommandCenterScheduleShowing = {
  id: string;
  scheduledAt: string;
  buyerName?: string | null;
  property?: { address1: string; city: string; state: string } | null;
};

type ScheduleKind = "SHOWING" | "FOLLOW_UP" | "TASK" | "CHECKLIST";

export type UnifiedScheduleItem = {
  id: string;
  kind: ScheduleKind;
  at: Date;
  title: string;
  subline: string | null;
  href: string;
  badge?: "now" | "next" | "overdue";
};

function localDayParts(d: Date) {
  return {
    y: d.getFullYear(),
    m: d.getMonth(),
    day: d.getDate(),
  };
}

function isSameLocalDay(a: Date, b: Date) {
  const pa = localDayParts(a);
  const pb = localDayParts(b);
  return pa.y === pb.y && pa.m === pb.m && pa.day === pb.day;
}

function dayKey(y: number, m: number, day: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const pad = first.getDay();
  const daysInMonth = last.getDate();
  const cells: ({ type: "empty" } | { type: "day"; day: number })[] = [];
  for (let i = 0; i < pad; i++) cells.push({ type: "empty" });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ type: "day", day: d });
  while (cells.length % 7 !== 0) cells.push({ type: "empty" });
  return cells;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function localDayBounds(d: Date) {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function mergeScheduleItems(args: {
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

export function CommandCenterSchedulePanel({
  showings,
  followUpsAll,
  openTasks,
  loading,
}: {
  showings: CommandCenterScheduleShowing[];
  followUpsAll: SerializedAgentFollowUp[];
  openTasks: SerializedTask[];
  loading: boolean;
}) {
  const today = useMemo(() => new Date(), []);

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  const [selectedDay, setSelectedDay] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  });

  const { start: boundsStart, end: boundsEnd } = localDayBounds(selectedDay);

  const { data: scheduleExtra, isLoading: checklistLoading } = useSWR<{
    checklistItems: ScheduleChecklistItem[];
  }>(
    `/api/v1/dashboard/schedule-day?dayStartIso=${encodeURIComponent(boundsStart.toISOString())}&dayEndIso=${encodeURIComponent(boundsEnd.toISOString())}`,
    apiFetcher
  );

  const showingKeys = useMemo(() => {
    const set = new Set<string>();
    for (const s of showings) {
      const d = new Date(s.scheduledAt);
      if (Number.isNaN(d.getTime())) continue;
      const { y, m, day } = localDayParts(d);
      set.add(dayKey(y, m, day));
    }
    return set;
  }, [showings]);

  const vy = visibleMonth.getFullYear();
  const vm = visibleMonth.getMonth();
  const grid = useMemo(() => buildMonthGrid(vy, vm), [vy, vm]);

  const merged = useMemo(
    () =>
      mergeScheduleItems({
        selectedDay,
        now: today,
        showings,
        followUps: followUpsAll,
        tasks: openTasks,
        checklistItems: scheduleExtra?.checklistItems ?? [],
      }),
    [selectedDay, today, showings, followUpsAll, openTasks, scheduleExtra]
  );

  const selectedIsToday = isSameLocalDay(selectedDay, today);
  const nowMs = Date.now();
  let scheduleNowIndex = -1;
  let scheduleNextIndex = -1;
  if (selectedIsToday && merged.length > 0) {
    const times = merged.map((s) => s.at.getTime());
    for (let i = times.length - 1; i >= 0; i--) {
      if (!Number.isNaN(times[i]) && times[i]! <= nowMs) {
        scheduleNowIndex = i;
        break;
      }
    }
    for (let i = 0; i < times.length; i++) {
      if (!Number.isNaN(times[i]) && times[i]! > nowMs) {
        scheduleNextIndex = i;
        break;
      }
    }
  }

  const goPrevMonth = useCallback(() => {
    setVisibleMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }, []);

  const goNextMonth = useCallback(() => {
    setVisibleMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }, []);

  const monthTitle = visibleMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const scheduleTitle = selectedIsToday
    ? "Today's schedule"
    : selectedDay.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      });

  const busy = loading || checklistLoading;

  const kindLabel = (k: ScheduleKind) => {
    switch (k) {
      case "SHOWING":
        return "Showing";
      case "FOLLOW_UP":
        return "Follow-up";
      case "TASK":
        return "Task";
      case "CHECKLIST":
        return "Transaction";
      default:
        return "";
    }
  };

  return (
    <div className="rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-4">
        <div className="flex min-h-[240px] flex-col border-kp-outline lg:min-h-[280px] lg:border-r lg:pr-4">
          <div className="mb-3 flex shrink-0 items-start justify-between gap-2">
            <h3 className="min-w-0 font-headline text-lg font-semibold tracking-tight text-kp-on-surface">
              {scheduleTitle}
            </h3>
            <div className="flex shrink-0 gap-1">
              <Button
                asChild
                variant="outline"
                size="sm"
                className={cn(kpBtnSecondary, "h-8 gap-1 px-2.5 text-xs font-semibold")}
              >
                <Link href="/showing-hq/showings/new" aria-label="Add showing">
                  <Plus className="h-3.5 w-3.5" />
                  Showing
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(kpBtnSecondary, "h-8 gap-1 px-2.5 text-xs font-semibold")}
                asChild
              >
                <Link href="/task-pilot" aria-label="Add task">
                  <ListTodo className="h-3.5 w-3.5" />
                  Task
                </Link>
              </Button>
            </div>
          </div>

          <div
            className={cn(
              "min-h-[160px] flex-1 overflow-y-auto overscroll-y-contain pr-0.5 lg:max-h-[min(480px,58vh)]",
              selectedIsToday && "rounded-lg bg-kp-surface-high/20"
            )}
            tabIndex={0}
            aria-label="Schedule for selected day"
          >
            {busy ? (
              <ul className="space-y-2" aria-busy="true">
                {[0, 1, 2].map((k) => (
                  <li
                    key={k}
                    className="h-11 animate-pulse rounded-lg bg-kp-surface-high/40"
                    aria-hidden
                  />
                ))}
              </ul>
            ) : merged.length === 0 ? (
              <div className="flex flex-col gap-3 py-2">
                <p className="text-sm leading-relaxed text-kp-on-surface-muted">
                  {selectedIsToday ? "Clear schedule" : "No calendar events"}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm" className={kpBtnSecondary}>
                    <Link href="/showing-hq/showings/new">Add showing</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className={kpBtnSecondary}>
                    <Link href="/task-pilot">Add task</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <ul className="space-y-2 pb-1">
                {merged.map((s, index) => {
                  const t = s.at;
                  const timeStr = Number.isNaN(t.getTime())
                    ? ""
                    : t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
                  const isNow = selectedIsToday && index === scheduleNowIndex;
                  const isNext = selectedIsToday && index === scheduleNextIndex;
                  const overdue = s.badge === "overdue";
                  return (
                    <li key={s.id}>
                      <Link
                        href={s.href}
                        className={cn(
                          "block rounded-lg border px-3 py-2.5 transition-colors",
                          overdue
                            ? "border-amber-500/40 bg-amber-500/[0.07] ring-1 ring-amber-500/25"
                            : isNext
                              ? "border-kp-teal/45 bg-kp-teal/[0.08] ring-1 ring-kp-teal/30 hover:border-kp-teal/55 hover:bg-kp-teal/[0.11]"
                              : isNow
                                ? "border-kp-teal/35 bg-kp-surface-high/35 hover:border-kp-teal/40 hover:bg-kp-surface-high/45"
                                : "border-kp-outline/80 bg-kp-surface-high/15 hover:border-kp-teal/25 hover:bg-kp-surface-high/35"
                        )}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-muted">
                            {kindLabel(s.kind)}
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-kp-teal/85">
                            {timeStr}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-medium text-kp-on-surface">{s.title}</p>
                          {overdue ? (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-amber-600">
                              Overdue
                            </span>
                          ) : isNow || isNext ? (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-kp-on-surface-muted">
                              {isNow ? "Now" : "Next"}
                            </span>
                          ) : null}
                        </div>
                        {s.subline ? (
                          <p className="mt-0.5 truncate text-xs text-kp-on-surface-muted">{s.subline}</p>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div
          className="flex flex-col border-t border-kp-outline pt-4 lg:border-t-0 lg:pt-0 lg:pl-4"
          aria-label="Date picker"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-kp-teal/80" aria-hidden />
              <h3 className="truncate font-headline text-sm font-semibold text-kp-on-surface">
                Pick a date
              </h3>
            </div>
            <div className="flex shrink-0 items-center gap-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={goPrevMonth}
                className="h-8 w-8 text-kp-on-surface-variant hover:bg-kp-surface-high/60 hover:text-kp-on-surface"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={goNextMonth}
                className="h-8 w-8 text-kp-on-surface-variant hover:bg-kp-surface-high/60 hover:text-kp-on-surface"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="mb-3 text-center text-xs font-semibold tabular-nums text-kp-on-surface">
            {monthTitle}
          </p>
          <p className="mb-2 text-[10px] leading-snug text-kp-on-surface-muted">
            Tap a day to preview what is on deck. Full planning moves to Calendar when we ship sync.
          </p>
          <div className="grid grid-cols-7 gap-y-0.5 text-center text-[10px] font-medium uppercase tracking-wide text-kp-on-surface-muted">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 leading-none">
                {w}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-0.5">
            {grid.map((cell, i) => {
              if (cell.type === "empty") {
                return <div key={`e-${i}`} className="h-8" />;
              }
              const { day } = cell;
              const key = dayKey(vy, vm, day);
              const hasShowing = showingKeys.has(key);
              const cellDate = new Date(vy, vm, day);
              const isTodayCell = isSameLocalDay(cellDate, today);
              const isSelected = isSameLocalDay(cellDate, selectedDay);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(cellDate)}
                  className={cn(
                    "relative flex h-8 items-center justify-center rounded-md text-[11px] font-medium tabular-nums transition-colors",
                    "text-kp-on-surface-variant hover:bg-kp-surface-high/50 hover:text-kp-on-surface",
                    isTodayCell &&
                      "ring-1 ring-kp-teal/40 bg-kp-surface-high/25 text-kp-on-surface",
                    isSelected && "bg-kp-teal/12 text-kp-on-surface ring-1 ring-kp-teal/35"
                  )}
                  aria-label={`${monthTitle} ${day}`}
                  aria-pressed={isSelected}
                >
                  {day}
                  {hasShowing ? (
                    <span
                      className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-kp-gold/85"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

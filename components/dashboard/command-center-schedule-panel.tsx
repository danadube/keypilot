"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { apiFetcher } from "@/lib/fetcher";
import type { SerializedAgentFollowUp } from "@/lib/follow-ups/agent-follow-up-buckets";
import type { SerializedTask } from "@/lib/tasks/task-serialize";
import type { ScheduleChecklistItem } from "@/lib/dashboard/command-center-types";
import {
  commandCenterSourceChipClass,
  scheduleKindSourceTag,
} from "@/lib/dashboard/command-center-visual";

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

const addMenuItemClass =
  "block w-full px-3 py-2 text-left text-xs text-kp-on-surface transition-colors hover:bg-kp-surface-high";

function ScheduleAddMenu({ onNewTask }: { onNewTask: () => void }) {
  return (
    <details className="group relative">
      <summary
        className={cn(
          kpBtnSecondary,
          "flex h-8 cursor-pointer list-none items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold",
          "[&::-webkit-details-marker]:hidden"
        )}
      >
        <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Add
        <span className="sr-only">Open add menu</span>
      </summary>
      <div
        className="absolute right-0 z-40 mt-1 hidden min-w-[12.5rem] rounded-lg border border-kp-outline bg-kp-surface py-1 shadow-lg group-open:block"
        role="menu"
      >
        <Link className={addMenuItemClass} href="/showing-hq/showings/new" role="menuitem">
          New showing
        </Link>
        <Link className={addMenuItemClass} href="/open-houses/new" role="menuitem">
          New open house
        </Link>
        <button type="button" className={addMenuItemClass} role="menuitem" onClick={() => onNewTask()}>
          New task
        </button>
        <Link className={addMenuItemClass} href="/showing-hq/follow-ups" role="menuitem">
          Follow-up
        </Link>
        <Link className={addMenuItemClass} href="/transactions?new=1" role="menuitem">
          New transaction
        </Link>
        <Link className={addMenuItemClass} href="/settings/connections" role="menuitem">
          Calendar &amp; email
        </Link>
      </div>
    </details>
  );
}

export function CommandCenterSchedulePanel({
  showings,
  followUpsAll,
  openTasks,
  loading,
  onNewTask,
  fillHeight,
  className,
}: {
  showings: CommandCenterScheduleShowing[];
  followUpsAll: SerializedAgentFollowUp[];
  openTasks: SerializedTask[];
  loading: boolean;
  onNewTask: () => void;
  /** Stretch to parent height (dashboard Today’s work column). */
  fillHeight?: boolean;
  className?: string;
}) {
  /** Advances over time so "today", overdue-on-today, and calendar markers stay correct past midnight. */
  const [currentTime, setCurrentTime] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setCurrentTime(new Date());
    const id = setInterval(tick, 60_000);
    const onVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") tick();
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisible);
    }
    return () => {
      clearInterval(id);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisible);
      }
    };
  }, []);

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
        now: currentTime,
        showings,
        followUps: followUpsAll,
        tasks: openTasks,
        checklistItems: scheduleExtra?.checklistItems ?? [],
      }),
    [selectedDay, currentTime, showings, followUpsAll, openTasks, scheduleExtra]
  );

  const selectedIsToday = isSameLocalDay(selectedDay, currentTime);
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
    ? "Schedule"
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
    <div
      className={cn(
        "rounded-xl border border-kp-outline bg-kp-surface p-2.5 shadow-sm sm:p-3",
        fillHeight && "flex h-full min-h-0 flex-col",
        className
      )}
    >
      <div
        className={cn(
          "grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4",
          fillHeight && "min-h-0 flex-1"
        )}
      >
        {/* Date picker first (left on lg) — quieter chrome */}
        <div
          className="order-1 flex flex-col rounded-lg border border-kp-outline/50 bg-kp-surface-high/[0.04] p-2.5 lg:p-3"
          aria-label="Date picker"
        >
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-kp-on-surface-muted" aria-hidden />
              <h3 className="truncate text-xs font-semibold uppercase tracking-wide text-kp-on-surface-muted">
                Pick a date
              </h3>
            </div>
            <div className="flex shrink-0 items-center gap-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={goPrevMonth}
                className="h-7 w-7 text-kp-on-surface-muted hover:bg-kp-surface-high/50"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={goNextMonth}
                className="h-7 w-7 text-kp-on-surface-muted hover:bg-kp-surface-high/50"
                aria-label="Next month"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <p className="mb-1.5 text-center text-[11px] font-medium tabular-nums text-kp-on-surface-muted">
            {monthTitle}
          </p>
          <p className="mb-1.5 text-[10px] leading-snug text-kp-on-surface-muted/90">
            Tap a day to load the schedule. Full sync lives on Calendar.
          </p>
          <div className="grid grid-cols-7 gap-y-0.5 text-center text-[9px] font-medium uppercase tracking-wide text-kp-on-surface-muted/90">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-0.5 leading-none">
                {w}
              </div>
            ))}
          </div>
          <div className="mt-0.5 grid grid-cols-7 gap-0.5">
            {grid.map((cell, i) => {
              if (cell.type === "empty") {
                return <div key={`e-${i}`} className="h-7" />;
              }
              const { day } = cell;
              const key = dayKey(vy, vm, day);
              const hasShowing = showingKeys.has(key);
              const cellDate = new Date(vy, vm, day);
              const isTodayCell = isSameLocalDay(cellDate, currentTime);
              const isSelected = isSameLocalDay(cellDate, selectedDay);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(cellDate)}
                  className={cn(
                    "relative flex h-7 items-center justify-center rounded text-[10px] font-medium tabular-nums transition-colors",
                    "text-kp-on-surface-muted hover:bg-kp-surface-high/40 hover:text-kp-on-surface",
                    isTodayCell && "ring-1 ring-kp-teal/30 bg-kp-surface-high/20 text-kp-on-surface",
                    isSelected && "bg-kp-teal/10 font-semibold text-kp-on-surface ring-1 ring-kp-teal/25"
                  )}
                  aria-label={`${monthTitle} ${day}`}
                  aria-pressed={isSelected}
                >
                  {day}
                  {hasShowing ? (
                    <span
                      className="absolute bottom-0.5 left-1/2 h-0.5 w-0.5 -translate-x-1/2 rounded-full bg-kp-gold/70"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Schedule (right on lg) — primary detail */}
        <div
          className={cn(
            "order-2 flex flex-col",
            fillHeight ? "min-h-0 flex-1" : "min-h-[160px] lg:min-h-[220px]"
          )}
        >
          <div className="mb-1.5 flex shrink-0 items-start justify-between gap-2 border-b border-kp-outline/40 pb-1.5">
            <div className="min-w-0">
              <h3 className="font-headline text-base font-semibold tracking-tight text-kp-on-surface">
                {scheduleTitle}
              </h3>
              <p className="text-[11px] text-kp-on-surface-muted">
                {selectedIsToday ? "What's on deck today" : "Selected day"}
              </p>
            </div>
            <ScheduleAddMenu onNewTask={onNewTask} />
          </div>

          <div
            className={cn(
              "flex-1 overflow-y-auto overscroll-y-contain pr-0.5",
              fillHeight ? "min-h-[3.5rem]" : "min-h-[100px] lg:max-h-[min(320px,48vh)]",
              selectedIsToday && "rounded-lg bg-kp-surface-high/[0.12]"
            )}
            tabIndex={0}
            aria-label="Schedule for selected day"
          >
            {busy ? (
              <ul className="space-y-2" aria-busy="true">
                {[0, 1, 2].map((k) => (
                  <li
                    key={k}
                    className="h-10 animate-pulse rounded-lg bg-kp-surface-high/40"
                    aria-hidden
                  />
                ))}
              </ul>
            ) : merged.length === 0 ? (
              <div className="flex flex-col gap-0.5 py-0.5">
                <p className="text-sm font-medium text-kp-on-surface-muted">No calendar events</p>
                <p className="text-[11px] leading-snug text-kp-on-surface-muted/85">
                  Nothing this day — use <span className="font-medium text-kp-on-surface-variant">Add</span> above.
                </p>
                <p className="pt-0.5 text-[11px]">
                  <Link
                    href="/settings/connections"
                    className="text-kp-on-surface-muted underline-offset-2 hover:text-kp-teal hover:underline"
                  >
                    Connect calendar
                  </Link>
                </p>
              </div>
            ) : (
              <ul className="space-y-1.5 pb-1">
                {merged.map((s, index) => {
                  const t = s.at;
                  const timeStr = Number.isNaN(t.getTime())
                    ? ""
                    : t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
                  const isNow = selectedIsToday && index === scheduleNowIndex;
                  const isNext = selectedIsToday && index === scheduleNextIndex;
                  const overdue = s.badge === "overdue";
                  const tag = scheduleKindSourceTag(s.kind);
                  return (
                    <li key={s.id}>
                      <Link
                        href={s.href}
                        className={cn(
                          "block rounded-md border px-2.5 py-2 transition-colors",
                          overdue
                            ? "border-amber-500/35 bg-amber-500/[0.06]"
                            : isNext
                              ? "border-kp-teal/40 bg-kp-teal/[0.06] ring-1 ring-kp-teal/20"
                              : isNow
                                ? "border-kp-teal/30 bg-kp-surface-high/30"
                                : "border-kp-outline/70 bg-kp-surface-high/10 hover:border-kp-teal/20"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span
                              className={commandCenterSourceChipClass(tag)}
                              title={kindLabel(s.kind)}
                            >
                              {tag}
                            </span>
                            <span className="truncate text-[10px] font-medium uppercase tracking-wide text-kp-on-surface-muted">
                              {kindLabel(s.kind)}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span className="text-[11px] font-semibold tabular-nums text-kp-teal/90">
                              {timeStr}
                            </span>
                            {overdue ? (
                              <span className="text-[9px] font-bold uppercase text-amber-600">Overdue</span>
                            ) : isNow || isNext ? (
                              <span className="text-[9px] font-bold uppercase text-kp-on-surface-muted">
                                {isNow ? "Now" : "Next"}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-0.5 truncate text-sm font-medium leading-snug text-kp-on-surface">
                          {s.title}
                        </p>
                        {s.subline ? (
                          <p className="mt-0.5 truncate text-[11px] text-kp-on-surface-muted">{s.subline}</p>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

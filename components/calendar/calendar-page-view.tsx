"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  PageHeader,
  PageHeaderActionButton,
  PageHeaderActionItem,
  PageHeaderActionsMenuSeparator,
  PageHeaderPrimaryAddMenu,
} from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { apiFetcher } from "@/lib/fetcher";
import type { CalendarEvent } from "@/lib/calendar/calendar-event-types";
import {
  CalendarWeekView,
  type CalendarWeekEmptyHint,
} from "@/components/calendar/calendar-week-view";
import { NewTaskModal } from "@/components/tasks/new-task-modal";

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfWeekSunday(d: Date): Date {
  const s = startOfLocalDay(d);
  const dow = s.getDay();
  s.setDate(s.getDate() - dow);
  return s;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type ViewMode = "week" | "month";

type FilterKey = "all" | "showing" | "task" | "follow_up" | "transaction";

const NO_EVENTS: CalendarEvent[] = [];

function filterEvents(events: CalendarEvent[], key: FilterKey): CalendarEvent[] {
  if (key === "all") return events;
  return events.filter((e) => e.sourceType === key);
}

function CalendarMonthOverview({
  visibleMonth,
  events,
  onDayClick,
  activeWeekStart,
}: {
  visibleMonth: Date;
  events: CalendarEvent[];
  /** Opens Quick Add with prefilled day (and optional week context in parent). */
  onDayClick: (d: Date) => void;
  activeWeekStart: Date;
}) {
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) {
      const start = new Date(e.start);
      const dk =
        (e.metadata as { dateKey?: string } | undefined)?.dateKey ?? localDateKey(start);
      m.set(dk, (m.get(dk) ?? 0) + 1);
    }
    return m;
  }, [events]);

  const grid = useMemo(() => {
    const first = startOfMonth(visibleMonth);
    const last = addDays(addMonths(first, 1), -1);
    const cells: { date: Date | null }[] = [];
    const pad = first.getDay();
    for (let i = 0; i < pad; i++) cells.push({ date: null });
    for (let day = 1; day <= last.getDate(); day++) {
      cells.push({ date: new Date(first.getFullYear(), first.getMonth(), day) });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null });
    return cells;
  }, [visibleMonth]);

  const title = visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const weekBandStart = startOfLocalDay(activeWeekStart);
  const weekBandEnd = addDays(weekBandStart, 7);

  return (
    <div className="rounded-xl border border-kp-outline bg-kp-surface shadow-sm">
      <div className="border-b border-kp-outline/70 bg-kp-surface-high/[0.08] px-4 py-3">
        <p className="font-headline text-base font-semibold tracking-tight text-kp-on-surface">{title}</p>
        <p className="mt-1 text-xs leading-snug text-kp-on-surface-muted">
          Dots show load; the teal band is the week you see in Week view. Click a day to quick-add a task.
        </p>
      </div>
      <div className="p-3 sm:p-4">
        <div className="overflow-hidden rounded-lg border border-kp-outline/80 bg-kp-bg shadow-inner">
          <div className="grid grid-cols-7 border-b border-kp-outline/70 bg-kp-surface-high/[0.12] text-center text-[10px] font-bold uppercase tracking-wide text-kp-on-surface-muted">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
              <div key={w} className="border-l border-kp-outline/50 py-2 first:border-l-0">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {grid.map((cell, i) => {
              const colFirst = i % 7 === 0;
              if (cell.date == null) {
                return (
                  <div
                    key={`e-${i}`}
                    className={cn(
                      "min-h-[3.25rem] border-b border-l border-kp-outline/40 bg-kp-surface-high/[0.04]",
                      colFirst && "border-l-0"
                    )}
                  />
                );
              }
              const d = cell.date;
              const key = localDateKey(d);
              const n = counts.get(key) ?? 0;
              const isToday = localDateKey(d) === localDateKey(new Date());
              const dayStart = startOfLocalDay(d);
              const inActiveWeek = dayStart >= weekBandStart && dayStart < weekBandEnd;
              const filledDots = n <= 0 ? 0 : Math.min(n, 3);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onDayClick(d);
                  }}
                  className={cn(
                    "relative flex min-h-[3.25rem] cursor-pointer flex-col items-center border-b border-l border-kp-outline/45 bg-kp-surface px-0.5 pb-1 pt-1.5 text-center transition-colors hover:z-[1] hover:bg-kp-surface-high/30",
                    colFirst && "border-l-0",
                    inActiveWeek && "bg-kp-teal/[0.09]",
                    isToday && !inActiveWeek && "ring-1 ring-inset ring-kp-teal/40",
                    isToday && inActiveWeek && "ring-2 ring-inset ring-kp-teal/55"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                      isToday
                        ? "bg-kp-teal text-white shadow-md ring-2 ring-kp-teal/30"
                        : "text-kp-on-surface"
                    )}
                  >
                    {d.getDate()}
                  </span>
                  <span className="mt-1 flex h-3.5 items-center justify-center gap-0.5" aria-hidden>
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full transition-colors",
                          dot < filledDots ? "bg-kp-teal/80" : "bg-kp-outline/25"
                        )}
                      />
                    ))}
                  </span>
                  <span className="mt-0.5 min-h-[0.875rem] text-[9px] font-medium tabular-nums text-kp-on-surface-muted">
                    {n > 0 ? (n > 9 ? "9+" : n) : <span className="invisible">0</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CalendarPageView() {
  const [view, setView] = useState<ViewMode>("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeekSunday(new Date()));
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [filter, setFilter] = useState<FilterKey>("all");
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  /** When opening New task from the calendar, set due date/time for the form. Cleared when the modal closes. */
  const [taskDuePrefill, setTaskDuePrefill] = useState<{ date: string; time: string } | null>(null);

  const range = useMemo(() => {
    if (view === "week") {
      const start = startOfLocalDay(weekStart);
      const end = addDays(start, 7);
      return { start, end };
    }
    const first = startOfMonth(visibleMonth);
    const end = addMonths(first, 1);
    return { start: first, end };
  }, [view, weekStart, visibleMonth]);

  const { data, isLoading, mutate } = useSWR<{ events: CalendarEvent[] }>(
    `/api/v1/calendar/events?rangeStartIso=${encodeURIComponent(range.start.toISOString())}&rangeEndIso=${encodeURIComponent(range.end.toISOString())}`,
    apiFetcher
  );

  const events = data?.events ?? NO_EVENTS;
  const filtered = useMemo(() => filterEvents(events, filter), [events, filter]);

  const weekLabel = useMemo(() => {
    const a = weekStart;
    const b = addDays(a, 6);
    const sameMonth = a.getMonth() === b.getMonth();
    const left = a.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const right = b.toLocaleDateString(undefined, {
      month: sameMonth ? undefined : "short",
      day: "numeric",
      year: "numeric",
    });
    return `${left} – ${right}`;
  }, [weekStart]);

  const goToday = useCallback(() => {
    const t = new Date();
    setWeekStart(startOfWeekSunday(t));
    setVisibleMonth(startOfMonth(t));
  }, []);

  const goPrevWeek = useCallback(() => {
    setWeekStart((w) => addDays(w, -7));
  }, []);

  const goNextWeek = useCallback(() => {
    setWeekStart((w) => addDays(w, 7));
  }, []);

  const openTaskModal = useCallback((prefill: { date: string; time: string } | null) => {
    setTaskDuePrefill(prefill);
    setNewTaskOpen(true);
  }, []);

  const onNewTaskOpenChange = useCallback((open: boolean) => {
    setNewTaskOpen(open);
    if (!open) setTaskDuePrefill(null);
  }, []);

  const onMonthDayClick = useCallback(
    (d: Date) => {
      setWeekStart(startOfWeekSunday(d));
      setVisibleMonth(startOfMonth(d));
      openTaskModal({ date: localDateKey(d), time: "09:00" });
    },
    [openTaskModal]
  );

  const chipClass = (k: FilterKey) =>
    cn(
      "rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors",
      filter === k
        ? "border-kp-teal/45 bg-kp-teal/12 text-kp-on-surface shadow-sm"
        : "border-transparent bg-kp-surface-high/[0.08] text-kp-on-surface-muted hover:bg-kp-surface-high/18 hover:text-kp-on-surface"
    );

  const weekEmptyHint: CalendarWeekEmptyHint = useMemo(() => {
    if (isLoading || view !== "week") return "none";
    if (events.length === 0) return "no-events";
    if (filtered.length === 0) return "filter-empty";
    return "none";
  }, [isLoading, view, events.length, filtered.length]);

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Calendar"
        subtitle="Plan your week across showings, follow-ups, tasks, and transactions."
        primaryAction={
          <PageHeaderPrimaryAddMenu summaryLabel="Quick add">
            <PageHeaderActionItem href="/showing-hq/showings/new">New showing</PageHeaderActionItem>
            <PageHeaderActionItem href="/open-houses/new">New open house</PageHeaderActionItem>
            <PageHeaderActionButton type="button" onClick={() => openTaskModal(null)}>
              New task
            </PageHeaderActionButton>
            <PageHeaderActionItem href="/showing-hq/follow-ups">Follow-up</PageHeaderActionItem>
            <PageHeaderActionItem href="/transactions?new=1">New transaction</PageHeaderActionItem>
            <PageHeaderActionsMenuSeparator />
            <PageHeaderActionItem href="/settings/connections">Calendar &amp; email</PageHeaderActionItem>
          </PageHeaderPrimaryAddMenu>
        }
      />

      {/* Toolbar: navigation + view mode + filters */}
      <div className="rounded-xl border border-kp-outline/90 bg-kp-surface-high/[0.06] p-2 shadow-sm sm:p-2.5">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(kpBtnSecondary, "h-8 shrink-0 px-3 text-xs font-semibold")}
              onClick={goToday}
            >
              Today
            </Button>
            <div
              className="flex min-w-0 flex-1 items-center gap-0.5 sm:max-w-md"
              aria-label={view === "week" ? "Week range" : "Month"}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-kp-on-surface-muted hover:bg-kp-surface-high/40 hover:text-kp-on-surface"
                onClick={view === "week" ? goPrevWeek : () => setVisibleMonth((m) => addMonths(m, -1))}
                aria-label={view === "week" ? "Previous week" : "Previous month"}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold tabular-nums text-kp-on-surface">
                {view === "week" ? weekLabel : visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-kp-on-surface-muted hover:bg-kp-surface-high/40 hover:text-kp-on-surface"
                onClick={view === "week" ? goNextWeek : () => setVisibleMonth((m) => addMonths(m, 1))}
                aria-label={view === "week" ? "Next week" : "Next month"}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div
              className="inline-flex shrink-0 rounded-lg border border-kp-outline/70 bg-kp-bg/80 p-0.5 shadow-sm"
              role="group"
              aria-label="Calendar view"
            >
              <button
                type="button"
                onClick={() => setView("week")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors sm:px-3",
                  view === "week"
                    ? "bg-kp-teal/20 text-kp-on-surface shadow-sm"
                    : "text-kp-on-surface-muted hover:text-kp-on-surface"
                )}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => setView("month")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors sm:px-3",
                  view === "month"
                    ? "bg-kp-teal/20 text-kp-on-surface shadow-sm"
                    : "text-kp-on-surface-muted hover:text-kp-on-surface"
                )}
              >
                Month
              </button>
            </div>
          </div>

          <div
            className="flex flex-wrap items-center gap-1 border-t border-kp-outline/50 pt-2.5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-3"
            aria-label="Event filters"
          >
            <span className="mr-0.5 hidden text-[10px] font-bold uppercase tracking-wide text-kp-on-surface-muted sm:inline">
              Show
            </span>
            <button type="button" className={chipClass("all")} onClick={() => setFilter("all")}>
              All
            </button>
            <button type="button" className={chipClass("showing")} onClick={() => setFilter("showing")}>
              Showings
            </button>
            <button type="button" className={chipClass("task")} onClick={() => setFilter("task")}>
              Tasks
            </button>
            <button type="button" className={chipClass("follow_up")} onClick={() => setFilter("follow_up")}>
              Follow-ups
            </button>
            <button type="button" className={chipClass("transaction")} onClick={() => setFilter("transaction")}>
              Deals
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-kp-surface-high/30" aria-busy aria-label="Loading calendar" />
      ) : view === "week" ? (
        <div className="rounded-xl border border-kp-outline/90 bg-kp-surface p-1.5 shadow-md sm:p-2.5">
          <CalendarWeekView
            weekStart={weekStart}
            events={filtered}
            emptyHint={weekEmptyHint}
            onTimeGridCreate={({ dateKey, timeLocal }) =>
              openTaskModal({ date: dateKey, time: timeLocal })
            }
            onAllDayCreate={({ dateKey }) => openTaskModal({ date: dateKey, time: "" })}
          />
        </div>
      ) : view === "month" ? (
        <CalendarMonthOverview
          visibleMonth={visibleMonth}
          events={filterEvents(events, filter)}
          onDayClick={onMonthDayClick}
          activeWeekStart={weekStart}
        />
      ) : null}

      <NewTaskModal
        open={newTaskOpen}
        onOpenChange={onNewTaskOpenChange}
        initialDueDate={taskDuePrefill?.date ?? null}
        initialDueTime={taskDuePrefill?.time ?? null}
        onCreated={() => void mutate()}
      />
    </div>
  );
}

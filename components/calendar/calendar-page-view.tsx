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
import { CalendarWeekView } from "@/components/calendar/calendar-week-view";
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

function CalendarMonthPlaceholder({
  visibleMonth,
  events,
  onSelectDay,
}: {
  visibleMonth: Date;
  events: CalendarEvent[];
  onSelectDay: (d: Date) => void;
}) {
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) {
      const start = new Date(e.start);
      const dk =
        (e.metadata as { dateKey?: string } | undefined)?.dateKey ??
        (e.allDay ? localDateKey(start) : localDateKey(start));
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

  return (
    <div className="rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm">
      <p className="mb-3 text-sm font-medium text-kp-on-surface">{title}</p>
      <p className="mb-3 text-xs leading-snug text-kp-on-surface-muted">
        Month view shows how busy each day is. Switch to Week for timed planning and links.
      </p>
      <div className="grid grid-cols-7 gap-px rounded-lg border border-kp-outline/60 bg-kp-outline/40 text-center text-[10px] font-medium uppercase text-kp-on-surface-muted">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((w) => (
          <div key={w} className="bg-kp-surface-high/[0.06] py-1">
            {w}
          </div>
        ))}
        {grid.map((cell, i) => {
          if (cell.date == null) {
            return <div key={`e-${i}`} className="min-h-[2.25rem] bg-kp-surface-high/[0.03]" />;
          }
          const d = cell.date;
          const key = localDateKey(d);
          const n = counts.get(key) ?? 0;
          const isToday = localDateKey(d) === localDateKey(new Date());
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                onSelectDay(d);
              }}
              className={cn(
                "relative min-h-[2.25rem] bg-kp-surface py-1 text-xs font-medium tabular-nums text-kp-on-surface transition-colors hover:bg-kp-surface-high/30",
                isToday && "ring-1 ring-kp-teal/35"
              )}
            >
              {d.getDate()}
              {n > 0 ? (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-kp-teal/80" aria-hidden />
              ) : null}
            </button>
          );
        })}
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

  const onSelectMonthDay = useCallback((d: Date) => {
    setWeekStart(startOfWeekSunday(d));
    setView("week");
  }, []);

  const chipClass = (k: FilterKey) =>
    cn(
      "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
      filter === k
        ? "border-kp-teal/50 bg-kp-teal/10 text-kp-on-surface"
        : "border-kp-outline/70 bg-kp-surface-high/[0.06] text-kp-on-surface-muted hover:border-kp-teal/25"
    );

  const emptyAll = !isLoading && view === "week" && events.length === 0;
  const emptyFilter = !isLoading && view === "week" && events.length > 0 && filtered.length === 0;

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Calendar"
        subtitle="Plan your week across showings, follow-ups, tasks, and transactions."
        primaryAction={
          <PageHeaderPrimaryAddMenu summaryLabel="Quick add">
            <PageHeaderActionItem href="/showing-hq/showings/new">New showing</PageHeaderActionItem>
            <PageHeaderActionItem href="/open-houses/new">New open house</PageHeaderActionItem>
            <PageHeaderActionButton type="button" onClick={() => setNewTaskOpen(true)}>
              New task
            </PageHeaderActionButton>
            <PageHeaderActionItem href="/showing-hq/follow-ups">Follow-up</PageHeaderActionItem>
            <PageHeaderActionItem href="/transactions?new=1">New transaction</PageHeaderActionItem>
            <PageHeaderActionsMenuSeparator />
            <PageHeaderActionItem href="/settings/connections">Calendar &amp; email</PageHeaderActionItem>
          </PageHeaderPrimaryAddMenu>
        }
      />

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(kpBtnSecondary, "h-8 text-xs")}
            onClick={goToday}
          >
            Today
          </Button>
          {view === "week" ? (
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-kp-on-surface-muted"
                onClick={goPrevWeek}
                aria-label="Previous week"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="min-w-[10rem] text-center text-sm font-semibold tabular-nums text-kp-on-surface">
                {weekLabel}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-kp-on-surface-muted"
                onClick={goNextWeek}
                aria-label="Next week"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-kp-on-surface-muted"
                onClick={() => setVisibleMonth((m) => addMonths(m, -1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="min-w-[10rem] text-center text-sm font-semibold text-kp-on-surface">
                {visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-kp-on-surface-muted"
                onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg border border-kp-outline/80 p-0.5"
            role="group"
            aria-label="Calendar view"
          >
            <button
              type="button"
              onClick={() => setView("week")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                view === "week"
                  ? "bg-kp-teal/15 text-kp-on-surface"
                  : "text-kp-on-surface-muted hover:text-kp-on-surface"
              )}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setView("month")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                view === "month"
                  ? "bg-kp-teal/15 text-kp-on-surface"
                  : "text-kp-on-surface-muted hover:text-kp-on-surface"
              )}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5" aria-label="Event filters">
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
        <button
          type="button"
          className={chipClass("transaction")}
          onClick={() => setFilter("transaction")}
        >
          Deals
        </button>
      </div>

      {emptyAll ? (
        <div className="rounded-lg border border-dashed border-kp-outline/70 bg-kp-surface-high/[0.04] px-4 py-6 text-center">
          <p className="text-sm font-medium text-kp-on-surface-muted">No events this week</p>
          <p className="mt-1 text-xs text-kp-on-surface-muted">
            When you add showings, tasks, follow-ups, and transaction dates, they land here automatically.
          </p>
        </div>
      ) : null}
      {emptyFilter ? (
        <div className="rounded-lg border border-dashed border-kp-outline/60 bg-kp-surface-high/[0.04] px-4 py-4 text-center">
          <p className="text-sm text-kp-on-surface-muted">Nothing in this category for this view.</p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-kp-surface-high/30" aria-busy aria-label="Loading calendar" />
      ) : view === "week" && !emptyAll && !emptyFilter ? (
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-2 shadow-sm sm:p-3">
          <CalendarWeekView weekStart={weekStart} events={filtered} />
        </div>
      ) : view === "month" ? (
        <CalendarMonthPlaceholder
          visibleMonth={visibleMonth}
          events={filterEvents(events, filter)}
          onSelectDay={onSelectMonthDay}
        />
      ) : null}

      <NewTaskModal open={newTaskOpen} onOpenChange={setNewTaskOpen} onCreated={() => void mutate()} />
    </div>
  );
}

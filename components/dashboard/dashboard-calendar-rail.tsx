"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";

export type DashboardScheduleShowing = {
  id: string;
  scheduledAt: string;
  buyerName?: string | null;
  property?: { address1: string; city: string; state: string } | null;
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

const cardClass =
  "rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm transition-colors";

/**
 * Today stats (2/3) + calendar (1/3, row-span-2) + schedule (2/3) on lg+.
 * Stacked on small screens: stats → calendar → schedule.
 */
export function DashboardTodayCalendarScheduleGrid({
  showings,
  loading,
  todayStats,
}: {
  showings: DashboardScheduleShowing[];
  loading: boolean;
  todayStats: ReactNode;
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

  const vy = visibleMonth.getFullYear();
  const vm = visibleMonth.getMonth();

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

  const grid = useMemo(() => buildMonthGrid(vy, vm), [vy, vm]);

  const itemsForSelected = useMemo(() => {
    const sy = selectedDay.getFullYear();
    const sm = selectedDay.getMonth();
    const sd = selectedDay.getDate();
    const list = showings.filter((s) => {
      const d = new Date(s.scheduledAt);
      if (Number.isNaN(d.getTime())) return false;
      return isSameLocalDay(d, new Date(sy, sm, sd));
    });
    list.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    return list;
  }, [showings, selectedDay]);

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

  const selectedIsToday = isSameLocalDay(selectedDay, today);

  const scheduleTitle = selectedIsToday
    ? "Today's schedule"
    : selectedDay.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-6">
      <div className="min-w-0 lg:col-span-2">{todayStats}</div>

      <div className="min-w-0 lg:col-span-1 lg:row-span-2 lg:self-stretch">
        <div
          className={cn(cardClass, "lg:flex lg:h-full lg:min-h-0 lg:flex-col")}
          aria-label="Calendar"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-kp-teal/80" aria-hidden />
              <h3 className="truncate font-headline text-sm font-semibold text-kp-on-surface">
                Calendar
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

      <div className="min-w-0 lg:col-span-2">
        <div className={cardClass} aria-label="Today's schedule">
          <div className="mb-3 flex items-start justify-between gap-2">
            <h3 className="min-w-0 font-headline text-sm font-semibold text-kp-on-surface">
              {scheduleTitle}
            </h3>
            <Button
              asChild
              variant="outline"
              size="sm"
              className={cn(
                kpBtnSecondary,
                "h-8 shrink-0 gap-1 px-2.5 text-xs font-semibold"
              )}
            >
              <Link href="/showing-hq/showings/new" aria-label="Add showing">
                <Plus className="h-3.5 w-3.5" />
                Add
              </Link>
            </Button>
          </div>

          {loading ? (
            <ul className="space-y-2" aria-busy="true">
              {[0, 1].map((k) => (
                <li
                  key={k}
                  className="h-10 animate-pulse rounded-md bg-kp-surface-high/40"
                  aria-hidden
                />
              ))}
            </ul>
          ) : itemsForSelected.length === 0 ? (
            <p className="text-sm leading-snug text-kp-on-surface-muted">
              No appointments for this day.
            </p>
          ) : (
            <ul className="space-y-2">
              {itemsForSelected.map((s) => {
                const t = new Date(s.scheduledAt);
                const timeStr = Number.isNaN(t.getTime())
                  ? ""
                  : t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
                const addr = s.property
                  ? `${s.property.address1}, ${s.property.city}`
                  : null;
                const title = s.buyerName?.trim() || "Showing";
                return (
                  <li key={s.id}>
                    <Link
                      href={`/showing-hq/showings/${s.id}`}
                      className="block rounded-lg border border-kp-outline/80 bg-kp-surface-high/15 px-3 py-2 transition-colors hover:border-kp-teal/25 hover:bg-kp-surface-high/35"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-semibold tabular-nums text-kp-teal/85">
                          {timeStr}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-sm font-medium text-kp-on-surface">
                        {title}
                      </p>
                      {addr ? (
                        <p className="mt-0.5 truncate text-xs text-kp-on-surface-muted">
                          {addr}
                        </p>
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
  );
}

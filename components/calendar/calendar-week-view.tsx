"use client";

import Link from "next/link";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarSourceType } from "@/lib/calendar/calendar-event-types";
import { layoutOverlappingIntervals } from "@/lib/calendar/overlap-layout";

const GRID_START_HOUR = 8;
const GRID_END_HOUR = 18;
const GRID_MINUTES = (GRID_END_HOUR - GRID_START_HOUR) * 60;

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function minutesSinceLocalMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function clipToVisibleGrid(
  start: Date,
  end: Date,
  dayMidnight: Date
): { topFrac: number; heightFrac: number } | null {
  const winStart = new Date(dayMidnight);
  winStart.setHours(GRID_START_HOUR, 0, 0, 0);
  const winEnd = new Date(dayMidnight);
  winEnd.setHours(GRID_END_HOUR, 0, 0, 0);
  const s = Math.max(start.getTime(), winStart.getTime());
  const e = Math.min(end.getTime(), winEnd.getTime());
  if (e <= s) return null;
  const topMin = (s - winStart.getTime()) / 60000;
  const durMin = (e - s) / 60000;
  return {
    topFrac: topMin / GRID_MINUTES,
    heightFrac: Math.max(durMin / GRID_MINUTES, 0.028),
  };
}

const SOURCE_RING: Record<CalendarSourceType, string> = {
  showing: "border-l-[#2dd4bf] bg-[#2dd4bf]/[0.09]",
  task: "border-l-amber-500 bg-amber-500/[0.08]",
  follow_up: "border-l-sky-500 bg-sky-500/[0.08]",
  transaction: "border-l-amber-600 bg-amber-600/[0.10]",
  external: "border-l-slate-400 bg-slate-500/[0.08]",
};

export function CalendarWeekView({
  weekStart,
  events,
  className,
}: {
  weekStart: Date;
  events: CalendarEvent[];
  className?: string;
}) {
  const dayStarts = useMemo(() => {
    const start = startOfLocalDay(weekStart);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [weekStart]);

  const { allDayByCol, timedByCol, overflowEarly, overflowLate } = useMemo(() => {
    const allDay: CalendarEvent[][] = Array.from({ length: 7 }, () => []);
    const timed: CalendarEvent[][] = Array.from({ length: 7 }, () => []);
    const early: CalendarEvent[][] = Array.from({ length: 7 }, () => []);
    const late: CalendarEvent[][] = Array.from({ length: 7 }, () => []);

    for (const ev of events) {
      if (ev.allDay) {
        const dk = (ev.metadata as { dateKey?: string } | undefined)?.dateKey;
        const start = new Date(ev.start);
        const key = dk ?? localDateKey(start);
        for (let i = 0; i < 7; i++) {
          if (localDateKey(dayStarts[i]!) === key) {
            allDay[i]!.push(ev);
            break;
          }
        }
        continue;
      }

      const start = new Date(ev.start);
      const end = new Date(ev.end);
      for (let i = 0; i < 7; i++) {
        const mid = dayStarts[i]!;
        const dayKey = localDateKey(mid);
        if (localDateKey(start) !== dayKey) continue;

        const msStart = minutesSinceLocalMidnight(start);
        const winStartMin = GRID_START_HOUR * 60;
        const winEndMin = GRID_END_HOUR * 60;
        if (msStart < winStartMin) {
          early[i]!.push(ev);
          break;
        }
        if (msStart >= winEndMin) {
          late[i]!.push(ev);
          break;
        }

        const clip = clipToVisibleGrid(start, end, mid);
        if (clip) timed[i]!.push(ev);
        break;
      }
    }

    return {
      allDayByCol: allDay,
      timedByCol: timed,
      overflowEarly: early,
      overflowLate: late,
    };
  }, [events, dayStarts]);

  const hourLabels = useMemo(() => {
    const out: { label: string; hour: number }[] = [];
    for (let h = GRID_START_HOUR; h < GRID_END_HOUR; h++) {
      const d = new Date(2000, 0, 1, h, 0, 0, 0);
      out.push({
        hour: h,
        label: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
      });
    }
    return out;
  }, []);

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="inline-block min-w-[880px] w-full">
        {/* Column headers */}
        <div
          className="grid border-b border-kp-outline/80 bg-kp-surface-high/[0.06]"
          style={{
            gridTemplateColumns: `3.5rem repeat(7, minmax(0, 1fr))`,
          }}
        >
          <div className="p-2" />
          {dayStarts.map((d, i) => {
            const isToday = localDateKey(d) === localDateKey(new Date());
            return (
              <div
                key={i}
                className={cn(
                  "border-l border-kp-outline/60 px-1 py-2 text-center",
                  isToday && "bg-kp-teal/[0.06]"
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-muted">
                  {d.toLocaleDateString(undefined, { weekday: "short" })}
                </p>
                <p
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    isToday ? "text-kp-teal" : "text-kp-on-surface"
                  )}
                >
                  {d.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* All-day row */}
        <div
          className="grid border-b border-kp-outline/80"
          style={{
            gridTemplateColumns: `3.5rem repeat(7, minmax(0, 1fr))`,
          }}
        >
          <div className="flex items-start justify-end border-r border-kp-outline/50 px-1 py-1.5 text-[10px] font-medium text-kp-on-surface-muted">
            All day
          </div>
          {dayStarts.map((_, col) => (
            <div
              key={`allday-${col}`}
              className="min-h-[2rem] border-l border-kp-outline/40 px-0.5 py-1"
            >
              <ul className="flex flex-col gap-1">
                {allDayByCol[col]!.map((ev) => (
                  <li key={ev.id}>
                    <EventPill ev={ev} compact />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: `3.5rem repeat(7, minmax(0, 1fr))`,
          }}
        >
          <div className="relative border-r border-kp-outline/50">
            {hourLabels.map(({ label, hour }) => (
              <div
                key={hour}
                className="h-12 border-b border-kp-outline/25 pr-1 text-right text-[10px] text-kp-on-surface-muted"
              >
                <span className="-mt-1 inline-block">{label}</span>
              </div>
            ))}
          </div>

          {dayStarts.map((dayMidnight, col) => (
            <DayColumn
              key={col}
              dayMidnight={dayMidnight}
              timedEvents={timedByCol[col] ?? []}
              early={overflowEarly[col] ?? []}
              late={overflowLate[col] ?? []}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function EventPill({ ev, compact }: { ev: CalendarEvent; compact?: boolean }) {
  const ring = SOURCE_RING[ev.sourceType] ?? SOURCE_RING.external;
  const start = new Date(ev.start);
  const timeStr = ev.allDay
    ? "All day"
    : Number.isNaN(start.getTime())
      ? ""
      : start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return (
    <Link
      href={ev.relatedRoute}
      className={cn(
        "block rounded-md border border-kp-outline/50 border-l-[3px] px-1.5 py-1 text-left shadow-sm transition-colors hover:bg-kp-surface-high/40",
        ring,
        compact ? "text-[10px] leading-snug" : "text-[11px] leading-snug"
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-[9px] font-semibold uppercase text-kp-on-surface-muted">
          {ev.sourceLabel}
        </span>
        <span className="shrink-0 text-[9px] tabular-nums text-kp-on-surface-muted">{timeStr}</span>
      </div>
      <p className={cn("mt-0.5 truncate font-medium text-kp-on-surface", compact ? "text-[10px]" : "text-[11px]")}>
        {ev.title}
      </p>
    </Link>
  );
}

function DayColumn({
  dayMidnight,
  timedEvents,
  early,
  late,
}: {
  dayMidnight: Date;
  timedEvents: CalendarEvent[];
  early: CalendarEvent[];
  late: CalendarEvent[];
}) {
  const placements = useMemo(() => {
    const intervals = timedEvents.map((ev) => ({
      id: ev.id,
      startMs: new Date(ev.start).getTime(),
      endMs: new Date(ev.end).getTime(),
    }));
    return layoutOverlappingIntervals(intervals);
  }, [timedEvents]);

  return (
    <div className="relative border-l border-kp-outline/40">
      {/* hour lines */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => (
          <div key={i} className="h-12 border-b border-kp-outline/25" />
        ))}
      </div>

      {early.length > 0 ? (
        <div className="absolute left-0 right-0 top-0 z-10 space-y-0.5 px-0.5 pt-0.5">
          {early.map((ev) => (
            <div key={ev.id} className="rounded border border-dashed border-kp-outline/60 bg-kp-bg/90 px-1 py-0.5 text-[9px] text-kp-on-surface-muted">
              <span className="font-medium text-kp-on-surface-variant">Before 8:00</span> ·{" "}
              <Link href={ev.relatedRoute} className="underline-offset-2 hover:text-kp-teal hover:underline">
                {ev.title}
              </Link>
            </div>
          ))}
        </div>
      ) : null}

      <div className="relative" style={{ height: `${(GRID_END_HOUR - GRID_START_HOUR) * 3}rem` }}>
        {timedEvents.map((ev) => {
          const start = new Date(ev.start);
          const end = new Date(ev.end);
          const clip = clipToVisibleGrid(start, end, dayMidnight);
          if (!clip) return null;
          const place = placements.get(ev.id);
          const col = place?.col ?? 0;
          const cols = Math.max(1, place?.maxCols ?? 1);
          const widthPct = 100 / cols;
          const leftPct = col * widthPct;
          const ring = SOURCE_RING[ev.sourceType] ?? SOURCE_RING.external;
          return (
            <Link
              key={ev.id}
              href={ev.relatedRoute}
              className={cn(
                "absolute z-[5] overflow-hidden rounded border border-kp-outline/45 border-l-[3px] px-1 py-0.5 text-[10px] shadow-sm transition-colors hover:z-[6] hover:brightness-[1.03]",
                ring
              )}
              style={{
                top: `${clip.topFrac * 100}%`,
                height: `${clip.heightFrac * 100}%`,
                left: `${leftPct + 0.5}%`,
                width: `${widthPct - 1}%`,
                minHeight: "1.35rem",
              }}
            >
              <div className="flex items-start justify-between gap-0.5">
                <span className="shrink-0 font-mono text-[8px] font-bold uppercase text-kp-on-surface-muted">
                  {ev.sourceLabel}
                </span>
              </div>
              <p className="line-clamp-2 font-medium leading-tight text-kp-on-surface">{ev.title}</p>
              <p className="mt-0.5 text-[8px] tabular-nums text-kp-on-surface-muted">
                {Number.isNaN(start.getTime())
                  ? ""
                  : `${start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} – ${end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
              </p>
            </Link>
          );
        })}
      </div>

      {late.length > 0 ? (
        <div className="space-y-0.5 border-t border-kp-outline/40 px-0.5 py-1">
          {late.map((ev) => (
            <div key={ev.id} className="rounded border border-dashed border-kp-outline/60 bg-kp-surface-high/20 px-1 py-0.5 text-[9px] text-kp-on-surface-muted">
              <span className="font-medium text-kp-on-surface-variant">After 6:00</span> ·{" "}
              <Link href={ev.relatedRoute} className="underline-offset-2 hover:text-kp-teal hover:underline">
                {ev.title}
              </Link>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

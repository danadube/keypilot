"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarSourceType } from "@/lib/calendar/calendar-event-types";
import { layoutOverlappingIntervals } from "@/lib/calendar/overlap-layout";

const GRID_START_HOUR = 0;
const GRID_END_HOUR = 24;
const GRID_MINUTES = (GRID_END_HOUR - GRID_START_HOUR) * 60;
/** Per-hour row height; full day scrolls vertically (24 rows) */
const HOUR_ROW_PX = 40;
const HOUR_ROW_REM = `${HOUR_ROW_PX / 16}rem`;
/** Room for 11px time labels without clipping */
const TIME_GUTTER_REM = "3.375rem";
/** Max height of the timed grid scroll area (viewport-relative, cap for very tall screens) */
const TIME_GRID_MAX_HEIGHT = "min(72vh,56rem)";

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

function clipToVisibleGrid(
  start: Date,
  end: Date,
  dayMidnight: Date
): { topFrac: number; heightFrac: number } | null {
  const winStart = new Date(dayMidnight);
  winStart.setHours(0, 0, 0, 0);
  const winEnd = new Date(dayMidnight);
  winEnd.setHours(24, 0, 0, 0);
  const s = Math.max(start.getTime(), winStart.getTime());
  const e = Math.min(end.getTime(), winEnd.getTime());
  if (e <= s) return null;
  const topMin = (s - winStart.getTime()) / 60000;
  const durMin = (e - s) / 60000;
  return {
    topFrac: topMin / GRID_MINUTES,
    heightFrac: Math.max(durMin / GRID_MINUTES, 0.012),
  };
}

const SOURCE_RING: Record<CalendarSourceType, string> = {
  showing: "border-l-[#14b8a6] bg-teal-500/[0.14] shadow-sm",
  task: "border-l-amber-500 bg-amber-400/[0.16] shadow-sm",
  follow_up: "border-l-sky-500 bg-sky-500/[0.14] shadow-sm",
  transaction: "border-l-amber-700 bg-amber-600/[0.14] shadow-sm",
  external:
    "border-l-slate-400 bg-slate-500/[0.11] shadow-sm ring-1 ring-slate-400/20 ring-inset",
  holiday: "border-l-rose-400 bg-rose-500/[0.13] shadow-sm ring-1 ring-rose-400/20 ring-inset",
};

function useNowTickMs() {
  const [ms, setMs] = useState(() => Date.now());
  useEffect(() => {
    const t = () => setMs(Date.now());
    const id = window.setInterval(t, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return ms;
}

/** `referenceNow` comes from a single parent tick so we do not mount N intervals in day columns. */
function nowIndicatorFrac(dayMidnight: Date, referenceNow: Date): number | null {
  if (localDateKey(referenceNow) !== localDateKey(dayMidnight)) return null;
  const mins = referenceNow.getHours() * 60 + referenceNow.getMinutes();
  if (mins < 0 || mins > GRID_MINUTES) return null;
  return mins / GRID_MINUTES;
}

/** Floor Y position in the time grid to start-of-slot time (30-minute slots), full local day. */
function snappedHourMinuteFromGridClick(clientY: number, rectTop: number, rectHeight: number): {
  hour: number;
  minute: number;
} {
  const y = clientY - rectTop;
  const safeH = Math.max(rectHeight, 1);
  const frac = Math.max(0, Math.min(1, y / safeH));
  const slotMin = Math.floor((frac * GRID_MINUTES) / 30) * 30;
  const clamped = Math.min(slotMin, GRID_MINUTES - 30);
  return { hour: Math.floor(clamped / 60), minute: clamped % 60 };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export type CalendarWeekEmptyHint = "none" | "no-events" | "filter-empty";

function CalendarWeekViewContent({
  weekStart,
  events,
  className,
  emptyHint = "none",
  onTimeGridCreate,
  onAllDayBackgroundClick,
  onExternalEventOpen,
  onHolidayEventOpen,
  onInternalEventOpen,
}: {
  weekStart: Date;
  events: CalendarEvent[];
  className?: string;
  /** In-grid empty messaging; does not replace the grid. */
  emptyHint?: CalendarWeekEmptyHint;
  /** Click on a timed slot (empty area); time is 30-min floored from click Y. */
  onTimeGridCreate?: (args: { dateKey: string; timeLocal: string }) => void;
  /** Click empty all-day row background — e.g. open day agenda (not quick-add). */
  onAllDayBackgroundClick?: (args: { dateKey: string }) => void;
  /** Google Calendar and other read-only external blocks. */
  onExternalEventOpen?: (ev: CalendarEvent) => void;
  /** Built-in holiday layer (read-only). */
  onHolidayEventOpen?: (ev: CalendarEvent) => void;
  /** KeyPilot-sourced events — detail modal before navigating to the owning workspace. */
  onInternalEventOpen?: (ev: CalendarEvent) => void;
}) {
  const dayStarts = useMemo(() => {
    const start = startOfLocalDay(weekStart);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [weekStart]);

  const { allDayByCol, timedByCol } = useMemo(() => {
    const allDay: CalendarEvent[][] = Array.from({ length: 7 }, () => []);
    const timed: CalendarEvent[][] = Array.from({ length: 7 }, () => []);

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

        const clip = clipToVisibleGrid(start, end, mid);
        if (clip) timed[i]!.push(ev);
        break;
      }
    }

    return {
      allDayByCol: allDay,
      timedByCol: timed,
    };
  }, [events, dayStarts]);

  const hourLabels = useMemo(() => {
    const out: { label: string; hour: number }[] = [];
    for (let h = 0; h < 24; h++) {
      const d = new Date(2000, 0, 1, h, 0, 0, 0);
      out.push({
        hour: h,
        label: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      });
    }
    return out;
  }, []);

  const nowMs = useNowTickMs();
  const now = new Date(nowMs);

  const emptyOverlay =
    emptyHint === "none" ? null : (
      <div
        className="pointer-events-none absolute inset-0 z-[15] flex items-center justify-center px-6 py-10"
        role="status"
      >
        <div className="max-w-md rounded-lg border border-kp-outline/40 bg-kp-surface/85 px-4 py-3 text-center shadow-sm backdrop-blur-[2px]">
          {emptyHint === "no-events" ? (
            <>
              <p className="text-sm font-medium text-kp-on-surface-muted">No events this week</p>
              <p className="mt-1 text-xs leading-snug text-kp-on-surface-muted">
                Click a time slot to add, or use the all-day row to review the day.
              </p>
            </>
          ) : (
            <p className="text-sm text-kp-on-surface-muted">Nothing in this category for this view.</p>
          )}
        </div>
      </div>
    );

  return (
    <div
      className={cn(
        "w-full min-w-0 max-lg:overflow-x-auto lg:overflow-x-visible",
        className
      )}
    >
      <div className="relative w-full min-w-0 max-lg:inline-block max-lg:min-w-[28rem]">
        {emptyOverlay}
        {/* Weekday + all-day: fixed above the scrollable timed grid (no horizontal compression) */}
        <div className="border-b border-kp-outline/50 bg-kp-surface">
          <div
            className="grid border-b border-kp-outline/70 bg-kp-surface-high/[0.1]"
            style={{
              gridTemplateColumns: `${TIME_GUTTER_REM} repeat(7, minmax(0, 1fr))`,
            }}
          >
            <div className="border-r border-kp-outline/50 p-1.5" aria-hidden />
            {dayStarts.map((d, i) => {
              const isToday = localDateKey(d) === localDateKey(now);
              return (
                <div
                  key={i}
                  className={cn(
                    "border-l border-kp-outline/50 px-0.5 py-2 text-center",
                    isToday && "bg-gradient-to-b from-kp-teal/14 to-kp-teal/[0.04] ring-1 ring-inset ring-kp-teal/25"
                  )}
                >
                  <p
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wide",
                      isToday ? "text-kp-teal" : "text-kp-on-surface-muted"
                    )}
                  >
                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 inline-flex min-w-[1.75rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[13px] font-bold tabular-nums leading-none",
                      isToday
                        ? "bg-kp-teal text-white shadow-md ring-2 ring-kp-teal/25"
                        : "text-kp-on-surface"
                    )}
                  >
                    {d.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          <div
            className="grid border-b border-kp-outline/70 bg-kp-bg/50"
            style={{
              gridTemplateColumns: `${TIME_GUTTER_REM} repeat(7, minmax(0, 1fr))`,
            }}
          >
            <div className="flex items-start justify-end border-r border-kp-outline/50 bg-kp-surface-high/[0.08] px-1.5 py-2 text-right">
              <span className="text-[11px] font-semibold leading-tight text-kp-on-surface/80">All day</span>
            </div>
            {dayStarts.map((d, col) => {
              const isToday = localDateKey(d) === localDateKey(now);
              const dk = localDateKey(d);
              return (
                <div
                  key={`allday-${col}`}
                  className={cn(
                    "relative min-h-[2.5rem] border-l border-kp-outline/45 px-1 py-1",
                    isToday && "bg-kp-teal/[0.05]"
                  )}
                >
                  {onAllDayBackgroundClick ? (
                    <button
                      type="button"
                      aria-label="View this day or add to calendar"
                      className="absolute inset-0 z-[1] cursor-pointer rounded-sm bg-transparent transition-colors hover:bg-kp-teal/[0.06]"
                      onClick={() => onAllDayBackgroundClick({ dateKey: dk })}
                    />
                  ) : null}
                  <ul className="relative z-[10] flex flex-col gap-1">
                    {allDayByCol[col]!.map((ev) => (
                      <li key={ev.id}>
                        <EventPill
                          ev={ev}
                          compact
                          onExternalOpen={onExternalEventOpen}
                          onHolidayOpen={onHolidayEventOpen}
                          onInternalOpen={onInternalEventOpen}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Full 24-hour timed grid — scrolls inside the calendar canvas */}
        <div
          className="overflow-y-auto overscroll-y-contain border-b border-kp-outline/60 bg-kp-bg/25"
          style={{ maxHeight: TIME_GRID_MAX_HEIGHT }}
          aria-label="Week time grid"
        >
          <div
            className="grid min-w-0"
            style={{
              gridTemplateColumns: `${TIME_GUTTER_REM} repeat(7, minmax(0, 1fr))`,
            }}
          >
            <div className="relative border-r border-kp-outline/50 bg-kp-surface-high/[0.1]">
              {hourLabels.map(({ label, hour }) => (
                <div
                  key={hour}
                  className="relative flex items-start justify-end border-b border-kp-outline/35 pt-0.5 pr-2"
                  style={{ height: HOUR_ROW_REM, minHeight: HOUR_ROW_REM }}
                >
                  <span className="text-[11px] font-medium tabular-nums leading-none text-kp-on-surface/75">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {dayStarts.map((dayMidnight, col) => (
              <DayColumn
                key={col}
                dayMidnight={dayMidnight}
                timedEvents={timedByCol[col] ?? []}
                isTodayCol={localDateKey(dayMidnight) === localDateKey(now)}
                nowMs={nowMs}
                gridHeightRem={(GRID_END_HOUR - GRID_START_HOUR) * (HOUR_ROW_PX / 16)}
                onTimeGridCreate={onTimeGridCreate}
                onExternalOpen={onExternalEventOpen}
                onHolidayOpen={onHolidayEventOpen}
                onInternalOpen={onInternalEventOpen}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CalendarWeekView(props: Parameters<typeof CalendarWeekViewContent>[0]) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div
        className={cn(
          "w-full min-w-0 max-lg:overflow-x-auto lg:overflow-x-visible",
          props.className
        )}
        aria-hidden
      >
        <div className="relative w-full min-h-[min(56rem,85vh)] rounded-lg border border-kp-outline/35 bg-kp-surface-high/20 animate-pulse" />
      </div>
    );
  }
  return <CalendarWeekViewContent {...props} />;
}

function EventPill({
  ev,
  compact,
  onExternalOpen,
  onHolidayOpen,
  onInternalOpen,
}: {
  ev: CalendarEvent;
  compact?: boolean;
  onExternalOpen?: (ev: CalendarEvent) => void;
  onHolidayOpen?: (ev: CalendarEvent) => void;
  onInternalOpen?: (ev: CalendarEvent) => void;
}) {
  const ring = SOURCE_RING[ev.sourceType] ?? SOURCE_RING.external;
  const start = new Date(ev.start);
  const timeStr = ev.allDay
    ? "All day"
    : Number.isNaN(start.getTime())
      ? ""
      : start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const meta = ev.metadata as { calendarName?: string; subline?: string } | undefined;
  const sub = meta?.calendarName ?? meta?.subline;
  const shellClass = cn(
    "relative z-10 block w-full rounded-md border border-kp-outline/50 border-l-[3px] px-1.5 py-1 text-left shadow-sm transition-colors hover:brightness-[1.02]",
    ring,
    compact ? "text-[10px] leading-snug" : "text-[11px] leading-snug"
  );
  const inner = (
    <>
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-[9px] font-semibold uppercase tracking-wide text-kp-on-surface/70">
          {ev.sourceLabel}
        </span>
        <span className="shrink-0 text-[9px] tabular-nums text-kp-on-surface-muted">{timeStr}</span>
      </div>
      <p className={cn("mt-0.5 truncate font-semibold leading-snug text-kp-on-surface", compact ? "text-[10px]" : "text-[11px]")}>
        {ev.title}
      </p>
      {ev.sourceType === "external" && sub ? (
        <p className="mt-0.5 truncate text-[9px] text-kp-on-surface-muted">{sub}</p>
      ) : null}
      {ev.sourceType === "holiday" && meta?.subline ? (
        <p className="mt-0.5 truncate text-[9px] text-kp-on-surface-muted">{meta.subline}</p>
      ) : null}
    </>
  );
  if (ev.sourceType === "external") {
    return (
      <button
        type="button"
        className={shellClass}
        onClick={() => onExternalOpen?.(ev)}
      >
        {inner}
      </button>
    );
  }
  if (ev.sourceType === "holiday") {
    return (
      <button type="button" className={shellClass} onClick={() => onHolidayOpen?.(ev)}>
        {inner}
      </button>
    );
  }
  if (onInternalOpen) {
    return (
      <button type="button" className={shellClass} onClick={() => onInternalOpen(ev)}>
        {inner}
      </button>
    );
  }
  return (
    <Link href={ev.relatedRoute} onClick={(e) => e.stopPropagation()} className={shellClass}>
      {inner}
    </Link>
  );
}

function DayColumn({
  dayMidnight,
  timedEvents,
  isTodayCol,
  nowMs,
  gridHeightRem,
  onTimeGridCreate,
  onExternalOpen,
  onHolidayOpen,
  onInternalOpen,
}: {
  dayMidnight: Date;
  timedEvents: CalendarEvent[];
  isTodayCol: boolean;
  /** Wall clock from parent {@link CalendarWeekView}'s single `useNowTickMs` — avoids N intervals. */
  nowMs: number;
  gridHeightRem: number;
  onTimeGridCreate?: (args: { dateKey: string; timeLocal: string }) => void;
  onExternalOpen?: (ev: CalendarEvent) => void;
  onHolidayOpen?: (ev: CalendarEvent) => void;
  onInternalOpen?: (ev: CalendarEvent) => void;
}) {
  const placements = useMemo(() => {
    const intervals = timedEvents.map((ev) => ({
      id: ev.id,
      startMs: new Date(ev.start).getTime(),
      endMs: new Date(ev.end).getTime(),
    }));
    return layoutOverlappingIntervals(intervals);
  }, [timedEvents]);

  const nowFrac = nowIndicatorFrac(dayMidnight, new Date(nowMs));

  return (
    <div
      className={cn(
        "relative border-l border-kp-outline/45",
        isTodayCol && "bg-kp-teal/[0.035] shadow-[inset_1px_0_0_0_rgba(45,180,170,0.14)]"
      )}
    >
      {/* hour + half-hour lines (24 hours) */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 24 }, (_, i) => (
          <div
            key={i}
            className="relative border-b border-kp-outline/40"
            style={{ height: HOUR_ROW_REM }}
          >
            <div className="absolute left-0 right-0 top-1/2 border-b border-dotted border-kp-outline/25" />
          </div>
        ))}
      </div>

      {nowFrac != null ? (
        <div
          className="pointer-events-none absolute left-0 right-0 z-20 border-t-2 border-kp-teal/70"
          style={{ top: `${nowFrac * 100}%` }}
          aria-hidden
        >
          <span className="absolute -left-px -top-2.5 rounded bg-kp-teal px-1 py-px text-[8px] font-bold uppercase tracking-wide text-white shadow-sm">
            Now
          </span>
        </div>
      ) : null}

      <div className="relative" style={{ height: `${gridHeightRem}rem` }}>
        {onTimeGridCreate ? (
          <button
            type="button"
            aria-label="Add to calendar at this time"
            className="absolute inset-0 z-[2] cursor-pointer rounded-sm bg-transparent transition-colors hover:bg-kp-teal/[0.05]"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const { hour, minute } = snappedHourMinuteFromGridClick(e.clientY, r.top, r.height);
              onTimeGridCreate({
                dateKey: localDateKey(dayMidnight),
                timeLocal: `${pad2(hour)}:${pad2(minute)}`,
              });
            }}
          />
        ) : null}
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
          const blockClass = cn(
            "absolute z-[5] overflow-hidden rounded-md border border-kp-outline/45 border-l-[3px] px-1 py-px text-left text-[10px] shadow-sm transition-colors hover:z-[6] hover:brightness-[1.03]",
            ring
          );
          /** Narrow gutter between side-by-side overlapping columns for separation */
          const gapPct = 0.9;
          const blockStyle = {
            top: `${clip.topFrac * 100}%`,
            height: `${clip.heightFrac * 100}%`,
            left: `calc(${leftPct}% + ${gapPct / 2}%)`,
            width: `calc(${widthPct}% - ${gapPct}%)`,
            minHeight: "1.35rem",
          } as const;
          const blockBody = (
            <>
              <div className="flex items-start justify-between gap-0.5">
                <span className="line-clamp-1 shrink min-w-0 text-[8px] font-semibold uppercase tracking-wide text-kp-on-surface/65">
                  {ev.sourceLabel}
                </span>
              </div>
              <p className="line-clamp-2 font-semibold leading-[1.15] text-kp-on-surface">{ev.title}</p>
              <p className="mt-0.5 text-[9px] tabular-nums leading-tight text-kp-on-surface-muted">
                {Number.isNaN(start.getTime())
                  ? ""
                  : `${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} – ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
              </p>
            </>
          );
          if (ev.sourceType === "external") {
            return (
              <button
                key={ev.id}
                type="button"
                className={blockClass}
                style={blockStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  onExternalOpen?.(ev);
                }}
              >
                {blockBody}
              </button>
            );
          }
          if (ev.sourceType === "holiday") {
            return (
              <button
                key={ev.id}
                type="button"
                className={blockClass}
                style={blockStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  onHolidayOpen?.(ev);
                }}
              >
                {blockBody}
              </button>
            );
          }
          if (onInternalOpen) {
            return (
              <button
                key={ev.id}
                type="button"
                className={blockClass}
                style={blockStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  onInternalOpen(ev);
                }}
              >
                {blockBody}
              </button>
            );
          }
          return (
            <Link
              key={ev.id}
              href={ev.relatedRoute}
              onClick={(e) => e.stopPropagation()}
              className={blockClass}
              style={blockStyle}
            >
              {blockBody}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

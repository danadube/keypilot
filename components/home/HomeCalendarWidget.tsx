"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { showingHqOpenHouseWorkspaceHref } from "@/lib/showing-hq/showing-workflow-hrefs";

export type EventType = "showing" | "open_house" | "task" | "campaign";

export interface CalendarEvent {
  id: string;
  type: EventType;
  title: string;
  startAt: string;
  endAt?: string;
  meta?: string;
  href?: string;
  /** Future: connectionId for multi-calendar aggregation */
  connectionId?: string;
}

const EVENT_COLORS: Record<EventType, string> = {
  showing: "bg-[#2563EB]",      // blue
  open_house: "bg-[#22C55E]",    // green
  task: "bg-[#D97706]",          // orange
  campaign: "bg-[#7C3AED]",      // purple
};

const EVENT_BORDER: Record<EventType, string> = {
  showing: "border-l-[#2563EB]",
  open_house: "border-l-[#22C55E]",
  task: "border-l-[#D97706]",
  campaign: "border-l-[#7C3AED]",
};

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekDays(anchor: Date): Date[] {
  const day = anchor.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/** Generate mock events for demo. Merges with real open house data. */
function buildEvents(
  recentOpenHouses: { id: string; title: string; startAt: string; property: { address1: string; city: string } }[],
  todayStart: Date
): CalendarEvent[] {
  const events: CalendarEvent[] = recentOpenHouses.map((oh) => ({
    id: oh.id,
    type: "open_house",
    title: oh.title,
    startAt: oh.startAt,
    meta: `${oh.property.address1}, ${oh.property.city}`,
    href: showingHqOpenHouseWorkspaceHref(oh.id),
  }));

  // Mock events for demo
  const mock: CalendarEvent[] = [
    { id: "m1", type: "showing", title: "Buyer showing - 123 Oak St", startAt: addDays(todayStart, 0, 10), meta: "9:00 AM", href: "/open-houses" },
    { id: "m2", type: "task", title: "Send follow-up to Smith", startAt: addDays(todayStart, 1, 14), meta: "TaskPilot" },
    { id: "m3", type: "open_house", title: "Weekend open house", startAt: addDays(todayStart, 2, 11), meta: "11:00 AM - 2:00 PM" },
    { id: "m4", type: "campaign", title: "Farm area mail drop", startAt: addDays(todayStart, 3, 9), meta: "FarmTrackr" },
    { id: "m5", type: "task", title: "Review seller report draft", startAt: addDays(todayStart, 0, 15), meta: "Due today" },
    { id: "m6", type: "showing", title: "Private showing", startAt: addDays(todayStart, -1, 16), meta: "Yesterday" },
  ];

  return [...events, ...mock].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

function addDays(date: Date, days: number, hour: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export function HomeCalendarWidget({
  recentOpenHouses = [],
}: {
  recentOpenHouses?: { id: string; title: string; startAt: string; property: { address1: string; city: string } }[];
}) {
  const [anchor, setAnchor] = useState(() => new Date());
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const weekDays = useMemo(() => getWeekDays(anchor), [anchor]);
  const events = useMemo(() => buildEvents(recentOpenHouses, todayStart), [recentOpenHouses]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      const d = new Date(e.startAt);
      const key = toDateKey(d);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
    return map;
  }, [events]);

  const [selectedKey, setSelectedKey] = useState<string>(() => toDateKey(today));
  const selectedEvents = eventsByDay[selectedKey] ?? [];
  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedKey.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedKey]);

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const formatDayLabel = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2);
  const formatDayNum = (d: Date) => d.getDate();
  const formatSelectedLabel = (d: Date) =>
    d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const goPrevWeek = () => {
    const d = new Date(anchor);
    d.setDate(d.getDate() - 7);
    setAnchor(d);
  };
  const goNextWeek = () => {
    const d = new Date(anchor);
    d.setDate(d.getDate() + 7);
    setAnchor(d);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Compact week strip */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={goPrevWeek}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--brand-text-muted)] hover:bg-[var(--brand-surface-alt)] hover:text-[var(--brand-text)]"
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex flex-1 justify-between gap-1">
          {weekDays.map((d) => {
            const key = toDateKey(d);
            const isToday = key === toDateKey(today);
            const count = (eventsByDay[key] ?? []).length;
            const isSelected = key === selectedKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedKey(key)}
                className={cn(
                  "flex min-w-[2.25rem] flex-1 flex-col items-center rounded-md py-2 text-xs transition-colors",
                  isSelected && "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-medium",
                  !isSelected && "text-[var(--brand-text-muted)] hover:bg-[var(--brand-surface-alt)] hover:text-[var(--brand-text)]",
                  isToday && !isSelected && "ring-1 ring-[var(--brand-primary)]/40"
                )}
              >
                <span className="opacity-80">{formatDayLabel(d)}</span>
                <span className="mt-0.5 font-medium">{formatDayNum(d)}</span>
                {count > 0 && (
                  <span className="mt-1 flex gap-0.5">
                    {(eventsByDay[key] ?? []).slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className={cn("h-1.5 w-1.5 rounded-full", EVENT_COLORS[e.type])}
                        aria-hidden
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={goNextWeek}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--brand-text-muted)] hover:bg-[var(--brand-surface-alt)] hover:text-[var(--brand-text)]"
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Event list for selected day */}
      <div>
        <p className="mb-2 text-xs font-medium text-[var(--brand-text-muted)]">
          {formatSelectedLabel(selectedDate)}
        </p>
        {selectedEvents.length === 0 ? (
          <p className="rounded-md border border-[var(--brand-border)] py-4 text-center text-sm text-[var(--brand-text-muted)]">
            No events
          </p>
        ) : (
          <div className="space-y-1.5">
            {selectedEvents.slice(0, 5).map((e) => {
              const content = (
                <div
                  className={cn(
                    "flex items-start gap-2 rounded-md border-l-4 border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-2.5 text-left transition-colors hover:bg-[var(--brand-surface)]",
                    EVENT_BORDER[e.type]
                  )}
                >
                  <span
                    className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", EVENT_COLORS[e.type])}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--brand-text)] text-sm leading-tight">{e.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--brand-text-muted)]">{e.meta ?? formatTime(e.startAt)}</p>
                  </div>
                </div>
              );
              return e.href ? (
                <Link key={e.id} href={e.href} className="block">
                  {content}
                </Link>
              ) : (
                <div key={e.id}>{content}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

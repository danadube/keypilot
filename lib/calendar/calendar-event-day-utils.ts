import type { CalendarEvent, CalendarSourceType } from "@/lib/calendar/calendar-event-types";

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Whether a normalized calendar event should appear on this local calendar day. */
export function eventTouchesLocalDay(ev: CalendarEvent, day: Date): boolean {
  const dayStart = startOfLocalDay(day);
  const dayEnd = addDays(dayStart, 1);
  const meta = ev.metadata as { dateKey?: string } | undefined;

  if (ev.allDay) {
    const dk = meta?.dateKey ?? localDateKey(new Date(ev.start));
    return dk === localDateKey(day);
  }

  const s = new Date(ev.start);
  const e = new Date(ev.end);
  if (Number.isNaN(s.getTime())) return false;
  const endT = Number.isNaN(e.getTime()) ? s : e;
  return s.getTime() < dayEnd.getTime() && endT.getTime() > dayStart.getTime();
}

export function filterEventsForLocalDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((ev) => eventTouchesLocalDay(ev, day));
}

/** All-day first, then by start instant. */
export function sortAgendaDayEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });
}

export function parseLocalDateKeyToNoon(dateKey: string): Date {
  const m = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return new Date(NaN);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return new Date(y, mo - 1, d, 12, 0, 0, 0);
}

/**
 * Subline for Google-sourced rows in agenda/lists: account email and calendar name when available.
 */
export function formatExternalGoogleAgendaSubline(ev: CalendarEvent): string {
  const m = ev.metadata as {
    calendarName?: string;
    subline?: string;
    googleAccountEmail?: string;
  };
  const cal = (m.calendarName ?? m.subline)?.trim();
  const email = m.googleAccountEmail?.trim();
  const parts: string[] = [];
  if (email) parts.push(email);
  if (cal) parts.push(cal);
  if (parts.length === 0) return "Google Calendar";
  return parts.join(" · ");
}

export function formatAgendaRowTime(ev: CalendarEvent): string {
  if (ev.allDay) return "All day";
  const start = new Date(ev.start);
  const end = new Date(ev.end);
  if (Number.isNaN(start.getTime())) return "";
  const a = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (Number.isNaN(end.getTime())) return a;
  const b = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${a} – ${b}`;
}

/** When line for calendar detail modals (timed range, all-day date, or Google-style day + range). */
export function formatCalendarWhenForDetail(ev: CalendarEvent): string {
  if (ev.allDay) {
    const meta = ev.metadata as { dateKey?: string } | undefined;
    const dk = meta?.dateKey?.trim();
    if (dk) {
      const fromKey = parseLocalDateKeyToNoon(dk);
      if (!Number.isNaN(fromKey.getTime())) {
        return `${fromKey.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })} · All day`;
      }
    }
    const start = new Date(ev.start);
    if (Number.isNaN(start.getTime())) return "All day";
    return `${start.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })} · All day`;
  }
  const start = new Date(ev.start);
  const end = new Date(ev.end);
  if (Number.isNaN(start.getTime())) return "";
  const dayPart = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startClock = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (Number.isNaN(end.getTime())) return `${dayPart} · ${startClock}`;
  const endClock = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${dayPart} · ${startClock} – ${endClock}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function addMonthsLocal(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

/** Every local day in `visibleMonth` → sorted events touching that day (for month grid previews). */
export function buildEventsByDayMapForMonth(events: CalendarEvent[], visibleMonth: Date): Map<string, CalendarEvent[]> {
  const first = startOfMonth(visibleMonth);
  const monthEnd = addMonthsLocal(first, 1);
  const map = new Map<string, CalendarEvent[]>();
  for (let cur = new Date(first); cur < monthEnd; cur = addDays(cur, 1)) {
    const list = sortAgendaDayEvents(filterEventsForLocalDay(events, cur));
    map.set(localDateKey(cur), list);
  }
  return map;
}

/** Left border accent for month cell preview lines (subtle source hint). */
export const MONTH_CELL_SOURCE_ACCENT: Record<CalendarSourceType, string> = {
  showing: "border-l-[#14b8a6]",
  task: "border-l-amber-500",
  follow_up: "border-l-sky-500",
  transaction: "border-l-amber-700",
  external: "border-l-slate-400",
  holiday: "border-l-rose-400",
};

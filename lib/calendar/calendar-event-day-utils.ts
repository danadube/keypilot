import type { CalendarEvent } from "@/lib/calendar/calendar-event-types";

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

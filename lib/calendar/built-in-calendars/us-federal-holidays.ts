import type { CalendarEvent } from "@/lib/calendar/calendar-event-types";

/**
 * Built-in US federal holiday layer for the calendar aggregate.
 * Dates are computed in UTC civil calendar components (stable for `[dateKey]` matching).
 * More regional calendars can follow the same pattern (separate module + `sourceType: "holiday"` + metadata.kind).
 */

const KIND = "us-federal" as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymdKey(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Monday = 1 … Sunday = 0 (Date.getUTCDay()). */
function nthWeekdayOfMonthUTC(year: number, monthIndex: number, weekday: number, n: number): string {
  const first = new Date(Date.UTC(year, monthIndex, 1, 12, 0, 0, 0));
  const firstDow = first.getUTCDay();
  const delta = (weekday - firstDow + 7) % 7;
  const dayOfMonth = 1 + delta + (n - 1) * 7;
  const dt = new Date(Date.UTC(year, monthIndex, dayOfMonth, 12, 0, 0, 0));
  return ymdKey(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

function lastWeekdayOfMonthUTC(year: number, monthIndex: number, weekday: number): string {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0, 12, 0, 0, 0));
  while (last.getUTCDay() !== weekday) {
    last.setUTCDate(last.getUTCDate() - 1);
  }
  return ymdKey(last.getUTCFullYear(), last.getUTCMonth() + 1, last.getUTCDate());
}

function fourthThursdayNovemberUTC(year: number): string {
  return nthWeekdayOfMonthUTC(year, 10, 4, 4);
}

type NamedHoliday = { dateKey: string; holidayKey: string; title: string };

function holidaysForYearUTC(year: number): NamedHoliday[] {
  const list: NamedHoliday[] = [
    { dateKey: ymdKey(year, 1, 1), holidayKey: "new-years", title: "New Year's Day" },
    { dateKey: nthWeekdayOfMonthUTC(year, 0, 1, 3), holidayKey: "mlk", title: "Martin Luther King Jr. Day" },
    { dateKey: nthWeekdayOfMonthUTC(year, 1, 1, 3), holidayKey: "presidents", title: "Presidents' Day" },
    { dateKey: lastWeekdayOfMonthUTC(year, 4, 1), holidayKey: "memorial", title: "Memorial Day" },
    { dateKey: ymdKey(year, 6, 19), holidayKey: "juneteenth", title: "Juneteenth National Independence Day" },
    { dateKey: ymdKey(year, 7, 4), holidayKey: "independence", title: "Independence Day" },
    { dateKey: nthWeekdayOfMonthUTC(year, 8, 1, 1), holidayKey: "labor", title: "Labor Day" },
    { dateKey: nthWeekdayOfMonthUTC(year, 9, 1, 2), holidayKey: "columbus", title: "Columbus Day" },
    { dateKey: ymdKey(year, 11, 11), holidayKey: "veterans", title: "Veterans Day" },
    { dateKey: fourthThursdayNovemberUTC(year), holidayKey: "thanksgiving", title: "Thanksgiving Day" },
    { dateKey: ymdKey(year, 12, 25), holidayKey: "christmas", title: "Christmas Day" },
  ];
  return list;
}

function allDayBoundsFromDateKey(dateKey: string): { start: string; end: string } {
  const m = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    const now = new Date();
    const dk = ymdKey(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate());
    return allDayBoundsFromDateKey(dk);
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const start = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0, 0));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Inclusive start, exclusive end — matches `/api/v1/calendar/events` range semantics. */
export function buildUSHolidayEventsForRange(rangeStart: Date, rangeEnd: Date): CalendarEvent[] {
  const startKey = rangeStart.toISOString().slice(0, 10);
  const endKey = rangeEnd.toISOString().slice(0, 10);

  const y0 = rangeStart.getUTCFullYear();
  const y1 = rangeEnd.getUTCFullYear();
  const out: CalendarEvent[] = [];

  for (let y = y0; y <= y1; y++) {
    for (const h of holidaysForYearUTC(y)) {
      if (h.dateKey < startKey || h.dateKey >= endKey) continue;
      const { start, end } = allDayBoundsFromDateKey(h.dateKey);
      out.push({
        id: `holiday-${KIND}-${h.dateKey}-${h.holidayKey}`,
        title: h.title,
        start,
        end,
        allDay: true,
        sourceType: "holiday",
        sourceLabel: "US",
        relatedRoute: "/calendar",
        relatedEntityId: `${KIND}-${h.dateKey}-${h.holidayKey}`,
        metadata: {
          dateKey: h.dateKey,
          kind: KIND,
          holidayKey: h.holidayKey,
          readOnly: true,
          subline: "US federal holidays",
        },
      });
    }
  }

  return out;
}

import type { CalendarEvent } from "@/lib/calendar/calendar-event-types";

const EM = "\u2014";

/** Local 12h time for month cells: `9a`, `12p`, `2:30p`. */
export function formatMonthCompactLocalTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const h24 = d.getHours();
  const min = d.getMinutes();
  const ap = h24 >= 12 ? "p" : "a";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  if (min === 0) return `${h12}${ap}`;
  return `${h12}:${String(min).padStart(2, "0")}${ap}`;
}

/** Strip API “Type — title” prefixes; month cells rely on color/accent instead. */
export function monthCellStrippedTitle(ev: CalendarEvent): string {
  const raw = ev.title.trim();

  if (ev.sourceType === "task") {
    const plain = (ev.metadata as { taskPlainTitle?: string | null } | undefined)?.taskPlainTitle?.trim();
    if (plain) return plain;
    const p = `Task ${EM} `;
    if (raw.startsWith(p)) return raw.slice(p.length).trim() || raw;
    return raw;
  }

  if (ev.sourceType === "follow_up") {
    const p = `Follow-up ${EM} `;
    if (raw.startsWith(p)) return raw.slice(p.length).trim() || raw;
    return raw;
  }

  if (ev.sourceType === "showing") {
    const p = `Showing ${EM} `;
    if (raw.startsWith(p)) return raw.slice(p.length).trim() || raw;
    return raw;
  }

  if (ev.sourceType === "transaction") {
    const p = `Closing ${EM} `;
    if (raw.startsWith(p)) return raw.slice(p.length).trim() || raw;
    return raw;
  }

  return raw;
}

/** Single line for month preview: timed → `[compact time] [title]`; all-day → title only. */
export function formatMonthCellPreviewLine(ev: CalendarEvent): string {
  const title = monthCellStrippedTitle(ev);
  if (ev.allDay) return title;
  const t = formatMonthCompactLocalTime(ev.start);
  return t ? `${t} ${title}` : title;
}

export function monthCellPreviewTooltip(ev: CalendarEvent): string {
  if (ev.sourceType === "external") {
    const cal = (ev.metadata as { calendarName?: string } | undefined)?.calendarName ?? "Calendar";
    return `${ev.title} (Google · ${cal})`;
  }
  return formatMonthCellPreviewLine(ev);
}

/**
 * Prefill from a calendar click (week slot, all-day row, or month day).
 * - `time` empty string = date-only / all-day context (tasks: due date without time).
 * - `time` `"09:00"` etc. = snapped or default clock time.
 */
export type CalendarQuickAddPrefill = {
  date: string;
  time: string;
};

function parseYmdLocal(ymd: string): Date | null {
  const m = ymd.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function formatCalendarQuickAddSummary(prefill: CalendarQuickAddPrefill): string {
  const dt = parseYmdLocal(prefill.date);
  const datePart = dt
    ? dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    : prefill.date;
  const t = prefill.time.trim();
  if (!t) return `${datePart} · No set time`;
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const mi = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(mi)) return `${datePart} · ${t}`;
  const clock = new Date(2000, 0, 1, h, mi, 0, 0).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} · ${clock}`;
}

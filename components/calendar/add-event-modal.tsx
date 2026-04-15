import { localDateKey } from "@/lib/calendar/calendar-event-day-utils";

/**
 * Prefill from a calendar click (week slot, all-day row, or month day).
 * - `time` empty string = date-only / all-day context (tasks: due date without time).
 * - `time` `"09:00"` etc. = snapped or default clock time.
 */
export type CalendarQuickAddPrefill = {
  date: string;
  time: string;
};

const QUICK_ADD_DEFAULT_STEP_MIN = 15;

function roundLocalNowToStepMinutes(stepMin: number): string {
  const now = new Date();
  const totalMin = now.getHours() * 60 + now.getMinutes();
  const rounded = Math.round(totalMin / stepMin) * stepMin;
  const maxMin = 23 * 60 + 45;
  const capped = Math.min(rounded, maxMin);
  const h = Math.floor(capped / 60);
  const m = capped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * When the caller leaves `time` empty, choose a sensible default so quick-add does not
 * fall back to midnight: today → rounded “now”; other days → 09:00 (aligned with day agenda).
 */
export function withDefaultQuickAddTime(prefill: CalendarQuickAddPrefill): CalendarQuickAddPrefill {
  const date = prefill.date.trim();
  const time = prefill.time.trim();
  if (time) return { date, time };
  if (!date) return prefill;
  const todayKey = localDateKey(new Date());
  if (date === todayKey) {
    return { date, time: roundLocalNowToStepMinutes(QUICK_ADD_DEFAULT_STEP_MIN) };
  }
  return { date, time: "09:00" };
}

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

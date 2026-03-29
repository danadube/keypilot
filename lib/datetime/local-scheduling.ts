/**
 * Local calendar date + time helpers for scheduling UIs.
 *
 * Avoid `new Date("YYYY-MM-DD")` — in JS that is interpreted as UTC midnight and can
 * shift the calendar day in local time. Use explicit local components instead.
 */

const DATE_PART = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PART = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

/** HH:mm for `<input type="time" step={60} />` values (strips seconds if present). */
export function normalizeTimeHm(timeHm: string): string {
  const t = timeHm.trim();
  const m = t.match(TIME_PART);
  if (!m) return t;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(mi)) return t;
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

export function localDateTimeFromParts(dateYmd: string, timeHm: string): Date {
  const dm = dateYmd.trim().match(DATE_PART);
  const tm = normalizeTimeHm(timeHm).match(TIME_PART);
  if (!dm || !tm) return new Date(NaN);
  const y = Number(dm[1]);
  const mo = Number(dm[2]);
  const d = Number(dm[3]);
  const h = Number(tm[1]);
  const mi = Number(tm[2]);
  const s = tm[3] !== undefined ? Number(tm[3]) : 0;
  if ([y, mo, d, h, mi, s].some((n) => Number.isNaN(n))) return new Date(NaN);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || h < 0 || mi > 59 || mi < 0 || s > 59 || s < 0) {
    return new Date(NaN);
  }
  const built = new Date(y, mo - 1, d, h, mi, s, 0);
  if (built.getFullYear() !== y || built.getMonth() !== mo - 1 || built.getDate() !== d) {
    return new Date(NaN);
  }
  return built;
}

export function localDateTimePartsValid(dateYmd: string, timeHm: string): boolean {
  const dt = localDateTimeFromParts(dateYmd, timeHm);
  return !Number.isNaN(dt.getTime());
}

/** Merge local YYYY-MM-DD + HH:mm to ISO UTC string, or null if invalid. */
export function combineLocalDateAndTimeToIso(dateYmd: string, timeHm: string): string | null {
  const dt = localDateTimeFromParts(dateYmd, timeHm);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

export function isoToLocalDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isoToLocalTimeInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function dateToLocalDateInput(dt: Date): string {
  if (Number.isNaN(dt.getTime())) return "";
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function dateToLocalTimeInput(dt: Date): string {
  if (Number.isNaN(dt.getTime())) return "";
  return `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

/** Value for `<input type="datetime-local" />` from an ISO instant, in local zone. */
export function isoToDatetimeLocalInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = dateToLocalDateInput(d);
  const time = dateToLocalTimeInput(d);
  return `${date}T${time}`;
}

/**
 * Parse `<input type="datetime-local" />` value to ISO. Browser supplies local
 * interpretation for `YYYY-MM-DDTHH:mm`.
 */
export function datetimeLocalInputValueToIso(value: string): string | null {
  if (!value || !value.includes("T")) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function splitDatetimeLocalInputValue(
  value: string
): { date: string; time: string } | null {
  const [date, rest] = value.split("T");
  if (!date || !rest) return null;
  const head = rest.match(/^(\d{1,2}):(\d{2})/);
  if (!head) return null;
  const time = normalizeTimeHm(`${head[1]}:${head[2]}`);
  if (!DATE_PART.test(date) || !TIME_PART.test(time)) return null;
  return { date, time };
}

export function mergeLocalPartsToDatetimeLocalValue(date: string, time: string): string {
  return `${date.trim()}T${normalizeTimeHm(time)}`;
}

export type QuickTimePreset = "now" | "+30m" | "+1h" | "tomorrow10am";

export const TIME_QUICK_LABELS: Record<QuickTimePreset, string> = {
  now: "Now",
  "+30m": "+30 min",
  "+1h": "+1 hour",
  tomorrow10am: "Tomorrow 10am",
};

function toDateTimeParts(dt: Date): { date: string; time: string } {
  if (Number.isNaN(dt.getTime())) {
    return toDateTimeParts(new Date());
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
    time: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
  };
}

/**
 * Quick presets for single date+time fields. Uses current field values when they parse
 * as a valid local instant; otherwise falls back to the real “now”.
 */
export function applyQuickTimePreset(
  preset: QuickTimePreset,
  current: { date: string; time: string } | null | undefined
): { date: string; time: string } {
  if (preset === "now") {
    return toDateTimeParts(new Date());
  }

  const base =
    current?.date &&
    current?.time &&
    localDateTimePartsValid(current.date, current.time)
      ? localDateTimeFromParts(current.date, current.time)
      : new Date();

  if (Number.isNaN(base.getTime())) {
    return toDateTimeParts(new Date());
  }

  const dt = new Date(base.getTime());

  if (preset === "+30m") {
    dt.setMinutes(dt.getMinutes() + 30);
    return toDateTimeParts(dt);
  }
  if (preset === "+1h") {
    dt.setHours(dt.getHours() + 1);
    return toDateTimeParts(dt);
  }
  if (preset === "tomorrow10am") {
    dt.setDate(dt.getDate() + 1);
    dt.setHours(10, 0, 0, 0);
    return toDateTimeParts(dt);
  }

  return toDateTimeParts(new Date());
}

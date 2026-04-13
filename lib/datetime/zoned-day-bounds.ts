/**
 * Calendar day bounds in a specific IANA time zone, expressed as UTC `Date` instants.
 * Used for daily briefing schedule alignment without extra dependencies.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function zonedDateKey(utc: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(utc);
}

/**
 * First instant `t` (approximately) such that `zonedDateKey(t, timeZone) === targetKey`.
 */
function findFirstInstantOnLocalCalendarDate(targetKey: string, timeZone: string, seedUtc: Date): Date {
  const keyAt = (ms: number) => zonedDateKey(new Date(ms), timeZone);

  let lo = seedUtc.getTime() - 2 * MS_PER_DAY;
  let hi = seedUtc.getTime() + 2 * MS_PER_DAY;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (keyAt(mid) < targetKey) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  // hi is ~first ms on targetKey; tighten upward
  lo = hi - MS_PER_DAY;
  hi = hi + 1;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (keyAt(mid) === targetKey) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return new Date(Math.ceil(hi));
}

function parseYmd(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) {
    throw new Error(`Invalid YYYY-MM-DD key: ${key}`);
  }
  return { y, m, d };
}

function addGregorianDays(y: number, m: number, d: number, delta: number): { y: number; m: number; d: number } {
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

/**
 * Inclusive start (local midnight) and exclusive end (next local midnight) for the calendar day
 * containing `utc` in `timeZone`.
 */
export function zonedDayBoundsContaining(utc: Date, timeZone: string): { start: Date; end: Date } {
  const key = zonedDateKey(utc, timeZone);
  const { y, m, d } = parseYmd(key);
  const start = findFirstInstantOnLocalCalendarDate(key, timeZone, utc);
  const next = addGregorianDays(y, m, d, 1);
  const nextKey = `${next.y}-${String(next.m).padStart(2, "0")}-${String(next.d).padStart(2, "0")}`;
  const end = findFirstInstantOnLocalCalendarDate(nextKey, timeZone, new Date(start.getTime() + MS_PER_DAY));
  return { start, end };
}

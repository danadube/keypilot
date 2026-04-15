import { prismaAdmin } from "@/lib/db";

const DEFAULT_IANA = "America/Los_Angeles";

/**
 * Google Calendar API: when `timeZone` is set on `start`/`end`, `dateTime` must be a local
 * wall time **without** a UTC offset (RFC3339 date-time with no `Z` / `±hh:mm`). Pairing
 * `toISOString()` (`...Z`) with `timeZone: "UTC"` misaligns with how Google renders events
 * in the user’s calendar timezone and can shift wall times.
 *
 * @see https://developers.google.com/calendar/api/v3/reference/events#resource
 */
export function formatInstantForGoogleCalendarDateTime(instant: Date, timeZone: string): string {
  const tz = normalizeIanaTimeZone(timeZone);
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  const y = get("year");
  const mo = get("month");
  const da = get("day");
  const h = get("hour");
  const min = get("minute");
  const sec = get("second");
  return `${y}-${mo}-${da}T${h}:${min}:${sec}`;
}

/** YYYY-MM-DD for `instant` in `timeZone` (all-day `date` fields). */
export function formatDateKeyInTimeZone(instant: Date, timeZone: string): string {
  const tz = normalizeIanaTimeZone(timeZone);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** Next calendar day after `ymd` (`YYYY-MM-DD`), for exclusive all-day `end.date`. */
export function addOneGregorianDayYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map((x) => Number.parseInt(x, 10));
  const t = Date.UTC(y, m - 1, d) + 24 * 60 * 60 * 1000;
  return new Date(t).toISOString().slice(0, 10);
}

function normalizeIanaTimeZone(raw: string): string {
  const s = raw.trim();
  if (s.length < 2) return DEFAULT_IANA;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: s }).format(new Date());
    return s;
  } catch {
    return DEFAULT_IANA;
  }
}

/** User’s IANA zone for outbound mirroring; briefing delivery is the canonical stored preference. */
export async function resolveUserIanaTimeZoneForGoogleOutbound(userId: string): Promise<string> {
  const row = await prismaAdmin.userDailyBriefingDelivery.findUnique({
    where: { userId },
    select: { timeZone: true },
  });
  const tz = row?.timeZone?.trim();
  if (tz && tz.length >= 2) {
    return normalizeIanaTimeZone(tz);
  }
  return DEFAULT_IANA;
}

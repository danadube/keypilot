/**
 * Google Calendar adapter - fetches events and normalizes to shared structures.
 * Reusable pattern for future Outlook and Apple adapters.
 */

import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";
import { ensureValidGoogleOAuth2Client } from "@/lib/oauth/google-connection-auth";
import type { NormalizedCalendarEvent } from "./calendar-types";
import type { CalendarEvent } from "@/lib/calendar/calendar-event-types";

export interface GoogleCalendarConnection {
  id: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  accountEmail: string | null;
}

const DEFAULT_MAX_HOME = 50;
const DEFAULT_MAX_AGGREGATION = 500;

function addOneDayYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map((x) => Number.parseInt(x, 10));
  const t = Date.UTC(y, m - 1, d) + 24 * 60 * 60 * 1000;
  return new Date(t).toISOString().slice(0, 10);
}

/** Google all-day end.date is exclusive; expand to each `YYYY-MM-DD` key in the range. */
function expandAllDayDateKeys(startYmd: string, endExclusiveYmd: string): string[] {
  const keys: string[] = [];
  let cur = startYmd;
  while (cur < endExclusiveYmd) {
    keys.push(cur);
    cur = addOneDayYmd(cur);
  }
  return keys;
}

function closingStyleAllDayBounds(dateKeyYmd: string): { start: string; end: string } {
  const [y, mo, da] = dateKeyYmd.split("-").map((x) => Number.parseInt(x, 10));
  const start = new Date(Date.UTC(y, mo - 1, da, 12, 0, 0, 0));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function listPrimaryCalendarEvents(
  conn: GoogleCalendarConnection,
  options: { timeMin: Date; timeMax: Date; maxResults: number }
): Promise<calendar_v3.Schema$Event[]> {
  const auth = await ensureValidGoogleOAuth2Client(conn);
  const calendar = google.calendar({ version: "v3", auth });

  const out: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;
  const perPage = 250;

  while (out.length < options.maxResults) {
    const remaining = options.maxResults - out.length;
    const { data } = await calendar.events.list({
      calendarId: "primary",
      timeMin: options.timeMin.toISOString(),
      timeMax: options.timeMax.toISOString(),
      maxResults: Math.min(perPage, remaining),
      singleEvents: true,
      orderBy: "startTime",
      pageToken,
    });
    out.push(...(data.items ?? []));
    pageToken = data.nextPageToken ?? undefined;
    if (!pageToken) break;
  }

  return out;
}

/**
 * Fetch upcoming events from Google Calendar (primary calendar).
 * Normalizes to NormalizedCalendarEvent for Home widget.
 */
export async function fetchGoogleCalendarEvents(
  conn: GoogleCalendarConnection,
  options: { timeMin?: Date; timeMax?: Date; maxResults?: number } = {}
): Promise<NormalizedCalendarEvent[]> {
  const timeMin = options.timeMin ?? new Date();
  const timeMax = options.timeMax ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const maxResults = options.maxResults ?? DEFAULT_MAX_HOME;

  const items = await listPrimaryCalendarEvents(conn, { timeMin, timeMax, maxResults });
  const events: NormalizedCalendarEvent[] = [];

  for (const item of items) {
    const start = item.start?.dateTime ?? item.start?.date;
    if (!start) continue;

    const startAt = typeof start === "string" ? start : String(start);
    const end = item.end?.dateTime ?? item.end?.date;
    const endAt = end ? (typeof end === "string" ? end : String(end)) : undefined;

    events.push({
      id: `gc-${conn.id}-${item.id ?? Math.random().toString(36).slice(2)}`,
      type: "external",
      title: item.summary ?? "(No title)",
      startAt,
      endAt,
      meta: item.location ?? undefined,
      connectionId: conn.id,
    });
  }

  return events;
}

const GCAL_LABEL = "GCAL";

/**
 * Primary-calendar read sync for `/calendar` aggregation: maps to KeyPilot CalendarEvent rows.
 * Expands multi-day all-day events to one row per day for month/week density and placement.
 */
export async function fetchGoogleCalendarKeyPilotEvents(
  conn: GoogleCalendarConnection,
  options: { timeMin: Date; timeMax: Date; maxResults?: number }
): Promise<CalendarEvent[]> {
  const maxResults = options.maxResults ?? DEFAULT_MAX_AGGREGATION;
  const items = await listPrimaryCalendarEvents(conn, {
    timeMin: options.timeMin,
    timeMax: options.timeMax,
    maxResults,
  });

  const calendarSummary = conn.accountEmail ?? "Google Calendar";
  const out: CalendarEvent[] = [];

  for (const item of items) {
    const googleEventId = item.id ?? `unknown-${Math.random().toString(36).slice(2)}`;
    const title = (item.summary ?? "").trim() ? (item.summary as string).trim() : "(No title)";
    const location = (item.location ?? "").trim() || undefined;
    const htmlLink = item.htmlLink ?? undefined;

    const startDay = item.start?.date;
    const endDay = item.end?.date;
    const startDt = item.start?.dateTime;
    const endDt = item.end?.dateTime;

    if (startDay && endDay) {
      const keys = expandAllDayDateKeys(startDay, endDay);
      for (const dateKey of keys) {
        const { start, end } = closingStyleAllDayBounds(dateKey);
        const id = `gcal-${conn.id}-${googleEventId}-${dateKey}`;
        out.push({
          id,
          title,
          start,
          end,
          allDay: true,
          sourceType: "external",
          sourceLabel: GCAL_LABEL,
          relatedRoute: "/calendar",
          relatedEntityId: googleEventId,
          metadata: {
            dateKey,
            subline: calendarSummary,
            googleEventId,
            calendarName: calendarSummary,
            readOnly: true,
            location,
            htmlLink,
            connectionId: conn.id,
          },
        });
      }
      continue;
    }

    if (startDt) {
      const start = new Date(startDt);
      const end = endDt ? new Date(endDt) : new Date(start.getTime() + 60 * 60 * 1000);
      if (Number.isNaN(start.getTime())) continue;

      out.push({
        id: `gcal-${conn.id}-${googleEventId}`,
        title,
        start: start.toISOString(),
        end: end.toISOString(),
        allDay: false,
        sourceType: "external",
        sourceLabel: GCAL_LABEL,
        relatedRoute: "/calendar",
        relatedEntityId: googleEventId,
        metadata: {
          subline: calendarSummary,
          googleEventId,
          calendarName: calendarSummary,
          readOnly: true,
          location,
          htmlLink,
          connectionId: conn.id,
        },
      });
    }
  }

  out.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return out;
}

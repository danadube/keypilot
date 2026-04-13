/**
 * Google Calendar adapter - fetches events and normalizes to shared structures.
 * Reusable pattern for future Outlook and Apple adapters.
 */

import { createHash } from "crypto";
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

export type GoogleCalendarListEntry = {
  id: string;
  summary: string;
  primary: boolean;
  selected: boolean;
};

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

/** Timed event end from Google: invalid `endDt` or end before start would make `.toISOString()` throw or mis-render. */
function safeTimedEventEnd(start: Date, endDt: string | null | undefined): Date {
  const fallback = new Date(start.getTime() + 60 * 60 * 1000);
  if (endDt == null || endDt === "") return fallback;
  const end = new Date(endDt);
  if (Number.isNaN(end.getTime()) || end.getTime() < start.getTime()) return fallback;
  return end;
}

function stableCalIdSegment(calendarId: string): string {
  return createHash("sha256").update(calendarId).digest("hex").slice(0, 16);
}

async function listCalendarEventsForCalendarId(
  conn: GoogleCalendarConnection,
  calendarId: string,
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
      calendarId,
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

/** @deprecated use listCalendarEventsForCalendarId with calendarId "primary" */
async function listPrimaryCalendarEvents(
  conn: GoogleCalendarConnection,
  options: { timeMin: Date; timeMax: Date; maxResults: number }
): Promise<calendar_v3.Schema$Event[]> {
  return listCalendarEventsForCalendarId(conn, "primary", options);
}

/**
 * Calendars visible to the user (for Settings + sync selection).
 */
export async function listGoogleAccountCalendars(
  conn: GoogleCalendarConnection
): Promise<{ id: string; summary: string; primary: boolean }[]> {
  const auth = await ensureValidGoogleOAuth2Client(conn);
  const calendar = google.calendar({ version: "v3", auth });
  const out: { id: string; summary: string; primary: boolean }[] = [];
  let pageToken: string | undefined;
  do {
    const { data } = await calendar.calendarList.list({
      minAccessRole: "reader",
      maxResults: 250,
      pageToken,
      showHidden: true,
    });
    for (const item of data.items ?? []) {
      const id = item.id;
      if (!id) continue;
      out.push({
        id,
        summary: (item.summary ?? id).trim() || id,
        primary: Boolean(item.primary),
      });
    }
    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken);

  out.sort((a, b) => {
    if (a.primary !== b.primary) return a.primary ? -1 : 1;
    return a.summary.localeCompare(b.summary, undefined, { sensitivity: "base" });
  });
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

function mapItemsToKeyPilotEvents(
  items: calendar_v3.Schema$Event[],
  conn: GoogleCalendarConnection,
  calendarId: string,
  calendarDisplayName: string
): CalendarEvent[] {
  const calSeg = stableCalIdSegment(calendarId);
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
        const id = `gcal-${conn.id}-${calSeg}-${googleEventId}-${dateKey}`;
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
            subline: calendarDisplayName,
            googleEventId,
            googleCalendarId: calendarId,
            calendarName: calendarDisplayName,
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
      if (Number.isNaN(start.getTime())) continue;
      const end = safeTimedEventEnd(start, endDt);

      out.push({
        id: `gcal-${conn.id}-${calSeg}-${googleEventId}`,
        title,
        start: start.toISOString(),
        end: end.toISOString(),
        allDay: false,
        sourceType: "external",
        sourceLabel: GCAL_LABEL,
        relatedRoute: "/calendar",
        relatedEntityId: googleEventId,
        metadata: {
          subline: calendarDisplayName,
          googleEventId,
          googleCalendarId: calendarId,
          calendarName: calendarDisplayName,
          readOnly: true,
          location,
          htmlLink,
          connectionId: conn.id,
        },
      });
    }
  }

  return out;
}

/**
 * When `calendar.list` succeeds but omits a selected ID (deleted calendar, revoked access, stale
 * `syncPreferences`), fill `labelMap` so event rows get a per-calendar label — not the generic
 * account fallback used when the key is missing entirely.
 */
export function ensureLabelMapForSelectedGoogleCalendars(
  selectedIds: string[],
  labelMap: Record<string, string>,
  accountEmail: string | null
): void {
  const acct = accountEmail?.trim() || "Google Calendar";
  for (const cid of selectedIds) {
    if (!cid.trim()) continue;
    if (labelMap[cid]?.trim()) continue;
    if (cid === "primary") {
      labelMap[cid] = `Primary calendar · ${acct}`;
      continue;
    }
    labelMap[cid] = `Google calendar (${formatStaleCalendarIdForLabel(cid)})`;
  }
}

function formatStaleCalendarIdForLabel(id: string): string {
  if (id.length <= 44) return id;
  return `${id.slice(0, 18)}…${id.slice(-12)}`;
}

/**
 * Read sync for `/calendar` aggregation. Fetches only selected calendar IDs.
 * `calendarLabels` maps calendarId → display name (from calendar list).
 */
export async function fetchGoogleCalendarKeyPilotEvents(
  conn: GoogleCalendarConnection,
  options: { timeMin: Date; timeMax: Date; maxResults?: number },
  calendarIds: string[],
  calendarLabels: Record<string, string> = {}
): Promise<CalendarEvent[]> {
  const maxTotal = options.maxResults ?? DEFAULT_MAX_AGGREGATION;
  const ids = calendarIds.filter((id) => id.trim().length > 0);
  if (ids.length === 0) return [];

  const perCal = Math.max(40, Math.floor(maxTotal / ids.length));
  const accountFallback = conn.accountEmail ?? "Google Calendar";
  const merged: CalendarEvent[] = [];

  for (const calendarId of ids) {
    const items = await listCalendarEventsForCalendarId(conn, calendarId, {
      timeMin: options.timeMin,
      timeMax: options.timeMax,
      maxResults: perCal,
    });
    const label = calendarLabels[calendarId]?.trim() || accountFallback;
    merged.push(...mapItemsToKeyPilotEvents(items, conn, calendarId, label));
  }

  merged.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return merged;
}

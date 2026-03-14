/**
 * Google Calendar adapter - fetches events and normalizes to shared structure.
 * Reusable pattern for future Outlook and Apple adapters.
 */

import { google } from "googleapis";
import type { NormalizedCalendarEvent } from "./calendar-types";

export interface GoogleCalendarConnection {
  id: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  accountEmail: string | null;
}

function getOAuth2Client(conn: GoogleCalendarConnection) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/v1/auth/google/callback`
  );

  oauth2.setCredentials({
    access_token: conn.accessToken,
    refresh_token: conn.refreshToken ?? undefined,
    expiry_date: conn.tokenExpiresAt?.getTime(),
  });

  return oauth2;
}

async function ensureValidToken(conn: GoogleCalendarConnection) {
  const oauth2 = getOAuth2Client(conn);
  const now = Date.now();
  const expiresAt = conn.tokenExpiresAt?.getTime() ?? 0;
  if (expiresAt > 0 && now >= expiresAt - 5 * 60 * 1000) {
    await oauth2.refreshAccessToken();
  }
  return oauth2;
}

/**
 * Fetch upcoming events from Google Calendar (primary calendar).
 * Normalizes to NormalizedCalendarEvent for Home widget.
 */
export async function fetchGoogleCalendarEvents(
  conn: GoogleCalendarConnection,
  options: { timeMin?: Date; timeMax?: Date; maxResults?: number } = {}
): Promise<NormalizedCalendarEvent[]> {
  const auth = await ensureValidToken(conn);
  const calendar = google.calendar({ version: "v3", auth });

  const timeMin = options.timeMin ?? new Date();
  const timeMax = options.timeMax ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const maxResults = options.maxResults ?? 50;

  const { data } = await calendar.events.list({
    calendarId: "primary",
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
  });

  const events: NormalizedCalendarEvent[] = [];

  for (const item of data.items ?? []) {
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

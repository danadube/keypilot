import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { apiErrorFromCaught } from "@/lib/api-response";
import { fetchGoogleCalendarEvents } from "@/lib/adapters/google-calendar";
import type { NormalizedCalendarEvent } from "@/lib/adapters/calendar-types";

export const dynamic = "force-dynamic";

/** GET /api/v1/calendar/events - Fetch events from connected calendars (read-only) */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    const timeMin = req.nextUrl.searchParams.get("timeMin");
    const timeMax = req.nextUrl.searchParams.get("timeMax");

    const connections = await prismaAdmin.connection.findMany({
      where: {
        userId: user.id,
        provider: "GOOGLE",
        service: "GOOGLE_CALENDAR",
        status: "CONNECTED",
        isEnabled: true,
        enabledForCalendar: true,
        accessToken: { not: null },
      },
    });

    const allEvents: NormalizedCalendarEvent[] = [];

    for (const conn of connections) {
      if (!conn.accessToken) continue;
      try {
        const events = await fetchGoogleCalendarEvents(
          {
            id: conn.id,
            accessToken: conn.accessToken,
            refreshToken: conn.refreshToken,
            tokenExpiresAt: conn.tokenExpiresAt,
            accountEmail: conn.accountEmail,
          },
          {
            timeMin: timeMin ? new Date(timeMin) : undefined,
            timeMax: timeMax ? new Date(timeMax) : undefined,
          }
        );
        allEvents.push(...events);
      } catch (err) {
        console.error("[calendar/events] fetch failed for", conn.id, err);
      }
    }

    const sorted = allEvents.sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );

    const hasCalendarConnection = connections.length > 0;
    return NextResponse.json({
      data: { events: sorted, hasCalendarConnection },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

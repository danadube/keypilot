import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { listGoogleAccountCalendars } from "@/lib/adapters/google-calendar";
import { getGoogleCalendarSelectedIds } from "@/lib/google-calendar-sync-preferences";
import { getGoogleCalendarListUserFacingError } from "@/lib/calendar/google-calendar-user-messages";
import { apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * Calendar page: which Google calendars are synced (read-only) for layer toggles.
 * Deeper edits stay under Settings → Connections.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    const connections = await withRLSContext(user.id, async (tx) =>
      tx.connection.findMany({
        where: {
          userId: user.id,
          provider: "GOOGLE",
          service: "GOOGLE_CALENDAR",
          status: "CONNECTED",
          isEnabled: true,
          enabledForCalendar: true,
          accessToken: { not: null },
        },
        orderBy: { createdAt: "asc" },
      })
    );

    const googleAccounts: Array<{
      connectionId: string;
      accountEmail: string | null;
      fetchError: string | null;
      calendars: Array<{ id: string; summary: string; primary: boolean; selected: boolean }>;
    }> = [];

    for (const conn of connections) {
      if (!conn.accessToken) continue;
      try {
        const calendars = await listGoogleAccountCalendars({
          id: conn.id,
          accessToken: conn.accessToken,
          refreshToken: conn.refreshToken,
          tokenExpiresAt: conn.tokenExpiresAt,
          accountEmail: conn.accountEmail,
        });
        const selectedIds = getGoogleCalendarSelectedIds(conn.syncPreferences);
        const idSet = new Set(calendars.map((c) => c.id));
        const sanitized = selectedIds.filter((sid) => idSet.has(sid));
        const effective = sanitized.length > 0 ? sanitized : ["primary"];

        googleAccounts.push({
          connectionId: conn.id,
          accountEmail: conn.accountEmail,
          fetchError: null,
          calendars: calendars
            .filter((c) => effective.includes(c.id))
            .map((c) => ({
              id: c.id,
              summary: c.summary,
              primary: c.primary,
              selected: effective.includes(c.id),
            })),
        });
      } catch (e) {
        console.error("[calendar/display-context]", conn.id, e);
        googleAccounts.push({
          connectionId: conn.id,
          accountEmail: conn.accountEmail,
          fetchError: getGoogleCalendarListUserFacingError(e),
          calendars: [],
        });
      }
    }

    return NextResponse.json({
      data: {
        googleAccounts,
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

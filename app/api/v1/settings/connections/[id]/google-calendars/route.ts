import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { listGoogleAccountCalendars } from "@/lib/adapters/google-calendar";
import {
  getGoogleCalendarOutboundPreferences,
  getGoogleCalendarSelectedIds,
} from "@/lib/google-calendar-sync-preferences";

export const dynamic = "force-dynamic";

/** GET — list Google calendars for this connection + current selection (read-sync settings). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const result = await withRLSContext(user.id, async (tx) => {
      const conn = await tx.connection.findFirst({
        where: { id, userId: user.id },
      });
      if (!conn) return null;
      if (conn.provider !== "GOOGLE" || conn.service !== "GOOGLE_CALENDAR") {
        return { kind: "wrong_service" as const };
      }
      if (conn.status !== "CONNECTED" || !conn.accessToken) {
        return { kind: "not_connected" as const };
      }
      return { kind: "ok" as const, conn };
    });

    if (!result) {
      return NextResponse.json({ error: { message: "Connection not found" } }, { status: 404 });
    }
    if (result.kind === "wrong_service") {
      return apiError("This endpoint is only for Google Calendar connections", 400);
    }
    if (result.kind === "not_connected") {
      return apiError("Connect Google Calendar first", 400);
    }

    const { conn } = result;

    try {
      const calendars = await listGoogleAccountCalendars({
        id: conn.id,
        accessToken: conn.accessToken!,
        refreshToken: conn.refreshToken,
        tokenExpiresAt: conn.tokenExpiresAt,
        accountEmail: conn.accountEmail,
      });
      const writableCalendars = await listGoogleAccountCalendars(
        {
          id: conn.id,
          accessToken: conn.accessToken!,
          refreshToken: conn.refreshToken,
          tokenExpiresAt: conn.tokenExpiresAt,
          accountEmail: conn.accountEmail,
        },
        { minAccessRole: "writer" }
      );
      const selectedIds = getGoogleCalendarSelectedIds(conn.syncPreferences);
      const idSet = new Set(calendars.map((c) => c.id));
      const sanitizedSelected = selectedIds.filter((sid) => idSet.has(sid));

      const outbound = getGoogleCalendarOutboundPreferences(conn.syncPreferences);

      return NextResponse.json({
        data: {
          calendars: calendars.map((c) => ({
            id: c.id,
            summary: c.summary,
            primary: c.primary,
            selected: sanitizedSelected.includes(c.id),
          })),
          selectedIds: sanitizedSelected.length > 0 ? sanitizedSelected : ["primary"],
          writableCalendars: writableCalendars.map((c) => ({
            id: c.id,
            summary: c.summary,
            primary: c.primary,
          })),
          outbound,
        },
      });
    } catch (e) {
      console.error("[google-calendars]", id, e);
      const msg = e instanceof Error ? e.message : "Could not load Google calendars";
      return apiError(
        `${msg} Reconnect Google Calendar if this persists (calendar list access is required).`,
        502
      );
    }
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

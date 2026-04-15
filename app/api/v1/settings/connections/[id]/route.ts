import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { prismaAdmin } from "@/lib/db";
import {
  buildGoogleCalendarsSyncPatch,
  getGoogleCalendarOutboundPreferences,
  mergeGoogleCalendarOutboundIntoSyncPreferences,
  type ConnectionSyncPreferencesShape,
} from "@/lib/google-calendar-sync-preferences";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PATCH_BODY = z.object({
  isDefault: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  enabledForAi: z.boolean().optional(),
  enabledForCalendar: z.boolean().optional(),
  enabledForPriorityInbox: z.boolean().optional(),
  accountLabel: z.string().nullable().optional(),
  /** Merge into Connection.syncPreferences (e.g. calendar list selection). */
  syncPreferences: z.record(z.string(), z.unknown()).optional(),
  /** Shortcut: persists `googleCalendars.selectedIds` under syncPreferences. */
  googleCalendarSelectedIds: z.array(z.string()).min(1).optional(),
  /** KeyPilot → Google outbound mirror for this Google Calendar connection. */
  googleCalendarOutboundSync: z
    .object({
      enabled: z.boolean(),
      writeCalendarId: z.string().min(1),
      /** Display name for the writable target (from calendar list). */
      writeCalendarSummary: z.string().nullable().optional(),
    })
    .optional(),
});

/** PATCH /api/v1/settings/connections/[id] - Update connection settings */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const body = await req.json();
    const data = PATCH_BODY.parse(body);

    if (data.googleCalendarOutboundSync !== undefined) {
      const pre = await prismaAdmin.connection.findFirst({
        where: { id, userId: user.id },
        select: { provider: true, service: true },
      });
      if (!pre) {
        return NextResponse.json(
          { error: { message: "Connection not found" } },
          { status: 404 }
        );
      }
      if (pre.provider !== "GOOGLE" || pre.service !== "GOOGLE_CALENDAR") {
        return apiError("Outbound sync only applies to Google Calendar connections", 400);
      }
    }

    // withRLSContext runs the entire operation inside one transaction as
    // keypilot_app, so RLS policies enforce that conn.userId === user.id at
    // the DB level. The findFirst + updateMany + update are also atomic.
    const found = await withRLSContext(user.id, async (tx) => {
      const conn = await tx.connection.findFirst({
        where: { id, userId: user.id },
      });
      if (!conn) return null;

      if (data.isDefault === true) {
        await tx.connection.updateMany({
          where: { userId: user.id, provider: conn.provider },
          data: { isDefault: false },
        });
      }

      let nextSync: Prisma.InputJsonValue | undefined;
      if (data.googleCalendarSelectedIds) {
        const prev = (conn.syncPreferences as Record<string, unknown> | null) ?? {};
        const prevGc = (prev as ConnectionSyncPreferencesShape).googleCalendars;
        nextSync = {
          ...prev,
          ...buildGoogleCalendarsSyncPatch(data.googleCalendarSelectedIds, prevGc),
        } as Prisma.InputJsonValue;
      } else if (data.syncPreferences !== undefined) {
        const prev = (conn.syncPreferences as Record<string, unknown> | null) ?? {};
        nextSync = { ...prev, ...data.syncPreferences } as Prisma.InputJsonValue;
      }

      if (data.googleCalendarOutboundSync !== undefined) {
        const prev = (nextSync !== undefined
          ? { ...(nextSync as Record<string, unknown>) }
          : { ...((conn.syncPreferences as Record<string, unknown> | null) ?? {}) });
        const { enabled, writeCalendarId, writeCalendarSummary } = data.googleCalendarOutboundSync;
        nextSync = mergeGoogleCalendarOutboundIntoSyncPreferences(prev, {
          enabled,
          writeCalendarId,
          writeCalendarSummary,
        }) as Prisma.InputJsonValue;

        if (enabled) {
          const others = await tx.connection.findMany({
            where: {
              userId: user.id,
              provider: "GOOGLE",
              service: "GOOGLE_CALENDAR",
              id: { not: id },
            },
          });
          for (const o of others) {
            const oPrev = (o.syncPreferences as Record<string, unknown> | null) ?? {};
            const oPref = getGoogleCalendarOutboundPreferences(o.syncPreferences);
            const merged = mergeGoogleCalendarOutboundIntoSyncPreferences(oPrev, {
              enabled: false,
              writeCalendarId: oPref.writeCalendarId ?? writeCalendarId,
              writeCalendarSummary: oPref.writeCalendarSummary,
            });
            await tx.connection.update({
              where: { id: o.id },
              data: { syncPreferences: merged as Prisma.InputJsonValue },
            });
          }
        }
      }

      await tx.connection.update({
        where: { id },
        data: {
          ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
          ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
          ...(data.enabledForAi !== undefined && { enabledForAi: data.enabledForAi }),
          ...(data.enabledForCalendar !== undefined && { enabledForCalendar: data.enabledForCalendar }),
          ...(data.enabledForPriorityInbox !== undefined && { enabledForPriorityInbox: data.enabledForPriorityInbox }),
          ...(data.accountLabel !== undefined && { accountLabel: data.accountLabel }),
          ...(nextSync !== undefined && { syncPreferences: nextSync }),
        },
      });

      return true;
    });

    if (!found) {
      return NextResponse.json(
        { error: { message: "Connection not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { success: true } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

/** DELETE /api/v1/settings/connections/[id] - Disconnect an account */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const found = await withRLSContext(user.id, async (tx) => {
      const conn = await tx.connection.findFirst({
        where: { id, userId: user.id },
      });
      if (!conn) return null;

      await tx.connection.delete({ where: { id } });
      return true;
    });

    if (!found) {
      return NextResponse.json(
        { error: { message: "Connection not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { success: true } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

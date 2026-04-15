import { NextRequest, NextResponse } from "next/server";
import { TransactionStatus } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { withRLSContext } from "@/lib/db-context";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import type { CalendarEvent } from "@/lib/calendar/calendar-event-types";
import {
  ensureLabelMapForSelectedGoogleCalendars,
  fetchGoogleCalendarKeyPilotEvents,
  listGoogleAccountCalendars,
} from "@/lib/adapters/google-calendar";
import {
  getGoogleCalendarOutboundPreferences,
  getGoogleCalendarSelectedIds,
} from "@/lib/google-calendar-sync-preferences";
import { loadOutboundMirroredGoogleEventKeys } from "@/lib/google-calendar/outbound-sync";
import { buildUSHolidayEventsForRange } from "@/lib/calendar/built-in-calendars/us-federal-holidays";
import { getGoogleCalendarListUserFacingError } from "@/lib/calendar/google-calendar-user-messages";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  rangeStartIso: z.string(),
  rangeEndIso: z.string(),
});

const TERMINAL: TransactionStatus[] = ["CLOSED", "FALLEN_APART"];

const SHOWING_DURATION_MS = 60 * 60 * 1000;
const DEFAULT_BLOCK_MS = 30 * 60 * 1000;

function dateKeyUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function labelForGoogleCalendarId(calendarId: string): string {
  return calendarId === "primary" ? "Primary calendar" : calendarId;
}

function buildGoogleOutboundMetadata(
  row: {
    connectionId: string;
    googleCalendarId: string;
    status: string;
    lastSyncedAt: Date | null;
    lastError: string | null;
    googleEventHtmlLink: string | null;
  },
  connById: Map<
    string,
    { syncPreferences: unknown; accountEmail: string | null }
  >
) {
  const conn = connById.get(row.connectionId);
  const prefs = getGoogleCalendarOutboundPreferences(conn?.syncPreferences);
  const targetCalendarSummary =
    row.googleCalendarId === prefs.writeCalendarId && prefs.writeCalendarSummary
      ? prefs.writeCalendarSummary
      : labelForGoogleCalendarId(row.googleCalendarId);
  return {
    status: row.status,
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
    lastError: row.lastError,
    googleCalendarId: row.googleCalendarId,
    targetCalendarSummary,
    openInGoogleUrl: row.googleEventHtmlLink,
    googleAccountEmail: conn?.accountEmail ?? null,
  };
}

function outboundKeyFromCalendarEvent(ev: CalendarEvent): string | null {
  switch (ev.sourceType) {
    case "showing":
      return `SHOWING:${ev.relatedEntityId}`;
    case "task":
      return `TASK:${ev.relatedEntityId}`;
    case "follow_up":
      return `FOLLOW_UP:${ev.relatedEntityId}`;
    case "transaction": {
      const m = ev.metadata as { milestoneKind?: string; kind?: string } | undefined;
      if (m?.milestoneKind === "closing" || m?.kind === "closing") {
        return `TRANSACTION_CLOSING:${ev.relatedEntityId}`;
      }
      return `TRANSACTION_CHECKLIST:${ev.relatedEntityId}`;
    }
    default:
      return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      rangeStartIso: searchParams.get("rangeStartIso") ?? "",
      rangeEndIso: searchParams.get("rangeEndIso") ?? "",
    });
    if (!parsed.success) {
      return apiError("rangeStartIso and rangeEndIso (ISO strings) are required", 400);
    }
    const rangeStart = new Date(parsed.data.rangeStartIso);
    const rangeEnd = new Date(parsed.data.rangeEndIso);
    if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
      return apiError("Invalid date bounds", 400);
    }
    if (rangeEnd <= rangeStart) {
      return apiError("rangeEnd must be after rangeStart", 400);
    }

    const nativeEvents: CalendarEvent[] = await withRLSContext(user.id, async (tx) => {
      const out: CalendarEvent[] = [];

      const [showings, tasks, followUps, checklistRows, closings] = await Promise.all([
        tx.showing.findMany({
          where: {
            hostUserId: user.id,
            deletedAt: null,
            scheduledAt: { gte: rangeStart, lt: rangeEnd },
          },
          include: {
            property: { select: { address1: true, city: true, state: true } },
          },
          orderBy: { scheduledAt: "asc" },
          take: 200,
        }),
        tx.task.findMany({
          where: {
            userId: user.id,
            status: "OPEN",
            dueAt: { not: null, gte: rangeStart, lt: rangeEnd },
          },
          include: {
            contact: { select: { id: true, firstName: true, lastName: true } },
            property: { select: { address1: true, city: true, state: true } },
          },
          orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
          take: 200,
        }),
        tx.followUp.findMany({
          where: {
            createdByUserId: user.id,
            deletedAt: null,
            status: { not: "CLOSED" },
            dueAt: { gte: rangeStart, lt: rangeEnd },
          },
          include: {
            contact: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { dueAt: "asc" },
          take: 200,
        }),
        tx.transactionChecklistItem.findMany({
          where: {
            isComplete: false,
            dueDate: { not: null, gte: rangeStart, lt: rangeEnd },
            transaction: { userId: user.id, deletedAt: null },
          },
          include: {
            transaction: {
              select: {
                id: true,
                property: { select: { address1: true, city: true, state: true } },
              },
            },
          },
          orderBy: [{ dueDate: "asc" }, { sortOrder: "asc" }],
          take: 200,
        }),
        tx.transaction.findMany({
          where: {
            userId: user.id,
            deletedAt: null,
            status: { notIn: TERMINAL },
            closingDate: { not: null, gte: rangeStart, lt: rangeEnd },
          },
          select: {
            id: true,
            closingDate: true,
            property: { select: { address1: true, city: true, state: true } },
          },
          orderBy: { closingDate: "asc" },
          take: 100,
        }),
      ]);

      for (const s of showings) {
        const start = s.scheduledAt;
        const end = new Date(start.getTime() + SHOWING_DURATION_MS);
        const addr = s.property ? `${s.property.address1}, ${s.property.city}` : null;
        const buyer = s.buyerName?.trim();
        out.push({
          id: `showing-${s.id}`,
          title: buyer ? `Showing — ${buyer}` : "Private showing",
          start: start.toISOString(),
          end: end.toISOString(),
          allDay: false,
          sourceType: "showing",
          sourceLabel: "SHQ",
          relatedRoute: `/showing-hq/showings/${s.id}`,
          relatedEntityId: s.id,
          metadata: {
            subline: addr,
            propertyAddress: addr,
            workspace: "ShowingHQ",
          },
        });
      }

      for (const t of tasks) {
        const due = t.dueAt!;
        const end = new Date(due.getTime() + DEFAULT_BLOCK_MS);
        const sub =
          t.property?.address1 != null
            ? `${t.property.address1}, ${t.property.city}`
            : t.contact
              ? `${t.contact.firstName} ${t.contact.lastName}`.trim()
              : null;
        out.push({
          id: `task-${t.id}`,
          title: t.title.trim() ? `Task — ${t.title.trim()}` : "Task",
          start: due.toISOString(),
          end: end.toISOString(),
          allDay: false,
          sourceType: "task",
          sourceLabel: "TASK",
          relatedRoute: "/task-pilot",
          relatedEntityId: t.id,
          metadata: {
            subline: sub,
            workspace: "Task Pilot",
            taskPlainTitle: t.title.trim() || null,
          },
        });
      }

      for (const f of followUps) {
        const due = f.dueAt;
        const end = new Date(due.getTime() + DEFAULT_BLOCK_MS);
        const name = `${f.contact.firstName} ${f.contact.lastName}`.trim();
        out.push({
          id: `follow_up-${f.id}`,
          title: f.title?.trim() ? `Follow-up — ${f.title.trim()}` : "Follow-up",
          start: due.toISOString(),
          end: end.toISOString(),
          allDay: false,
          sourceType: "follow_up",
          sourceLabel: "CRM",
          relatedRoute: `/contacts/${f.contact.id}`,
          relatedEntityId: f.id,
          metadata: {
            subline: name,
            contactName: name,
            contactId: f.contact.id,
            workspace: "ClientKeep",
          },
        });
      }

      for (const c of checklistRows) {
        const due = c.dueDate!;
        const end = new Date(due.getTime() + DEFAULT_BLOCK_MS);
        const line = `${c.transaction.property.address1}, ${c.transaction.property.city}`;
        out.push({
          id: `txn-checklist-${c.id}`,
          title: c.title.trim() ? c.title.trim() : "Transaction item",
          start: due.toISOString(),
          end: end.toISOString(),
          allDay: false,
          sourceType: "transaction",
          sourceLabel: "TXN",
          relatedRoute: `/transactions/${c.transactionId}#txn-pipeline-workspace`,
          relatedEntityId: c.id,
          metadata: {
            subline: line,
            transactionId: c.transactionId,
            workspace: "TransactionHQ",
            milestoneKind: "checklist",
          },
        });
      }

      for (const txn of closings) {
        const cd = txn.closingDate!;
        const dk = dateKeyUtc(cd);
        const [y, mo, da] = dk.split("-").map((x) => Number.parseInt(x, 10));
        const start = new Date(Date.UTC(y, mo - 1, da, 12, 0, 0, 0));
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        const line = `${txn.property.address1}, ${txn.property.city}`;
        out.push({
          id: `txn-closing-${txn.id}`,
          title: `Closing — ${txn.property.address1}`,
          start: start.toISOString(),
          end: end.toISOString(),
          allDay: true,
          sourceType: "transaction",
          sourceLabel: "TXN",
          relatedRoute: `/transactions/${txn.id}`,
          relatedEntityId: txn.id,
          metadata: {
            subline: line,
            kind: "closing",
            dateKey: dk,
            workspace: "TransactionHQ",
            milestoneKind: "closing",
          },
        });
      }

      out.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      return out;
    });

    const outboundRows = await prismaAdmin.googleCalendarOutboundSync.findMany({
      where: { userId: user.id },
    });
    const outboundLookup = new Map(outboundRows.map((r) => [`${r.sourceType}:${r.sourceId}`, r]));

    const outboundConnIds = Array.from(new Set(outboundRows.map((r) => r.connectionId)));
    const outboundConnections =
      outboundConnIds.length > 0
        ? await prismaAdmin.connection.findMany({
            where: { userId: user.id, id: { in: outboundConnIds } },
            select: { id: true, syncPreferences: true, accountEmail: true },
          })
        : [];
    const outboundConnById = new Map(outboundConnections.map((c) => [c.id, c]));

    const events: CalendarEvent[] = nativeEvents.map((ev) => {
      const key = outboundKeyFromCalendarEvent(ev);
      if (!key) return ev;
      const row = outboundLookup.get(key);
      if (!row) return ev;
      return {
        ...ev,
        metadata: {
          ...(ev.metadata ?? {}),
          googleOutbound: buildGoogleOutboundMetadata(row, outboundConnById),
        },
      };
    });

    let googleCalendarConnected = false;
    let googleCalendarFetchError: string | null = null;

    try {
      const calendarConns = await prismaAdmin.connection.findMany({
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
      googleCalendarConnected = calendarConns.length > 0;

      const mirroredKeys = await loadOutboundMirroredGoogleEventKeys(user.id);

      for (const conn of calendarConns) {
        if (!conn.accessToken) continue;
        try {
          const selectedIds = getGoogleCalendarSelectedIds(conn.syncPreferences);
          const labelMap: Record<string, string> = {};
          try {
            const allCals = await listGoogleAccountCalendars({
              id: conn.id,
              accessToken: conn.accessToken,
              refreshToken: conn.refreshToken,
              tokenExpiresAt: conn.tokenExpiresAt,
              accountEmail: conn.accountEmail,
            });
            const allowed = new Set(selectedIds);
            for (const c of allCals) {
              if (allowed.has(c.id)) labelMap[c.id] = c.summary;
            }
          } catch (listErr) {
            console.error("[calendar/events] Google calendar list failed; using account label only", conn.id, listErr);
            for (const cid of selectedIds) {
              labelMap[cid] = conn.accountEmail ?? "Google Calendar";
            }
          }

          ensureLabelMapForSelectedGoogleCalendars(selectedIds, labelMap, conn.accountEmail);

          const gEvents = await fetchGoogleCalendarKeyPilotEvents(
            {
              id: conn.id,
              accessToken: conn.accessToken,
              refreshToken: conn.refreshToken,
              tokenExpiresAt: conn.tokenExpiresAt,
              accountEmail: conn.accountEmail,
            },
            { timeMin: rangeStart, timeMax: rangeEnd },
            selectedIds,
            labelMap
          );
          for (const ge of gEvents) {
            const m = ge.metadata as {
              connectionId?: string;
              googleCalendarId?: string;
              googleEventId?: string;
            };
            if (
              m?.connectionId &&
              m?.googleCalendarId &&
              m?.googleEventId &&
              mirroredKeys.has(`${m.connectionId}\t${m.googleCalendarId}\t${m.googleEventId}`)
            ) {
              continue;
            }
            events.push(ge);
          }
        } catch (err) {
          console.error("[calendar/events] Google Calendar fetch failed", conn.id, err);
          googleCalendarFetchError =
            googleCalendarFetchError ?? getGoogleCalendarListUserFacingError(err);
        }
      }

      events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    } catch (err) {
      console.error("[calendar/events] Google connection lookup failed", err);
    }

    events.push(...buildUSHolidayEventsForRange(rangeStart, rangeEnd));
    events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return NextResponse.json({
      data: {
        events,
        integrations: {
          googleCalendarConnected,
          googleCalendarFetchError,
        },
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

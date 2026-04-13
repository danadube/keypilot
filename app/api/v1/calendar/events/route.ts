import { NextRequest, NextResponse } from "next/server";
import { TransactionStatus } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { withRLSContext } from "@/lib/db-context";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import type { CalendarEvent } from "@/lib/calendar/calendar-event-types";
import {
  fetchGoogleCalendarKeyPilotEvents,
  listGoogleAccountCalendars,
} from "@/lib/adapters/google-calendar";
import { getGoogleCalendarSelectedIds } from "@/lib/google-calendar-sync-preferences";
import { buildUSHolidayEventsForRange } from "@/lib/calendar/built-in-calendars/us-federal-holidays";

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

    const events: CalendarEvent[] = await withRLSContext(user.id, async (tx) => {
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
          metadata: { subline: sub },
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
          metadata: { subline: name, contactName: name },
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
          metadata: { subline: line, transactionId: c.transactionId },
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
          metadata: { subline: line, kind: "closing", dateKey: dk },
        });
      }

      out.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      return out;
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
          events.push(...gEvents);
        } catch (err) {
          console.error("[calendar/events] Google Calendar fetch failed", conn.id, err);
          const msg = err instanceof Error ? err.message : "Google Calendar unavailable";
          googleCalendarFetchError = googleCalendarFetchError ?? msg;
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

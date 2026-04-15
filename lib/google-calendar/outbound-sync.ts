import type { calendar_v3 } from "googleapis";
import {
  Prisma,
  TransactionStatus,
  type GoogleCalendarOutboundSourceType,
} from "@prisma/client";
import {
  deleteGoogleCalendarEvent,
  insertGoogleCalendarEvent,
  patchGoogleCalendarEvent,
  type GoogleCalendarConnection,
} from "@/lib/adapters/google-calendar";
import { getGoogleCalendarOutboundPreferences } from "@/lib/google-calendar-sync-preferences";
import { prismaAdmin } from "@/lib/db";
import { resolveAppOrigin } from "@/lib/daily-briefing/email/app-origin";

const SHOWING_DURATION_MS = 60 * 60 * 1000;
const DEFAULT_BLOCK_MS = 30 * 60 * 1000;
const TERMINAL: TransactionStatus[] = ["CLOSED", "FALLEN_APART"];

function connectionToAdapter(conn: {
  id: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  accountEmail: string | null;
}): GoogleCalendarConnection {
  return {
    id: conn.id,
    accessToken: conn.accessToken,
    refreshToken: conn.refreshToken,
    tokenExpiresAt: conn.tokenExpiresAt,
    accountEmail: conn.accountEmail,
  };
}

/** Use when Prisma still types `accessToken` as nullable but the row was loaded with `accessToken: { not: null }`. */
function connectionToAdapterFromNullableRow(conn: {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  accountEmail: string | null;
}): GoogleCalendarConnection | null {
  const token = conn.accessToken?.trim();
  if (!token) return null;
  return connectionToAdapter({ ...conn, accessToken: token });
}

async function findOutboundWriteContext(userId: string): Promise<{
  connection: {
    id: string;
    accessToken: string;
    refreshToken: string | null;
    tokenExpiresAt: Date | null;
    accountEmail: string | null;
  };
  writeCalendarId: string;
} | null> {
  const conns = await prismaAdmin.connection.findMany({
    where: {
      userId,
      provider: "GOOGLE",
      service: "GOOGLE_CALENDAR",
      status: "CONNECTED",
      isEnabled: true,
      enabledForCalendar: true,
      accessToken: { not: null },
    },
    orderBy: { updatedAt: "desc" },
  });
  for (const c of conns) {
    const token = c.accessToken?.trim();
    if (!token) continue;
    const prefs = getGoogleCalendarOutboundPreferences(c.syncPreferences);
    if (prefs.enabled && prefs.writeCalendarId) {
      return {
        connection: {
          id: c.id,
          accessToken: token,
          refreshToken: c.refreshToken,
          tokenExpiresAt: c.tokenExpiresAt,
          accountEmail: c.accountEmail,
        },
        writeCalendarId: prefs.writeCalendarId,
      };
    }
  }
  return null;
}

async function upsertMappingRow(params: {
  userId: string;
  connectionId: string;
  sourceType: GoogleCalendarOutboundSourceType;
  sourceId: string;
  googleCalendarId: string;
  googleEventId: string;
  googleEventHtmlLink?: string | null;
  status: "SYNCED" | "ERROR" | "PENDING";
  lastError: string | null;
}): Promise<void> {
  const now = new Date();
  const htmlLink =
    params.googleEventHtmlLink !== undefined
      ? params.googleEventHtmlLink
      : undefined;
  await prismaAdmin.googleCalendarOutboundSync.upsert({
    where: {
      userId_sourceType_sourceId: {
        userId: params.userId,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
      },
    },
    create: {
      userId: params.userId,
      connectionId: params.connectionId,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      googleCalendarId: params.googleCalendarId,
      googleEventId: params.googleEventId,
      googleEventHtmlLink: htmlLink ?? null,
      status: params.status,
      lastSyncedAt: params.status === "SYNCED" ? now : null,
      lastError: params.lastError,
    },
    update: {
      connectionId: params.connectionId,
      googleCalendarId: params.googleCalendarId,
      googleEventId: params.googleEventId,
      ...(htmlLink !== undefined ? { googleEventHtmlLink: htmlLink } : {}),
      status: params.status,
      lastSyncedAt: params.status === "SYNCED" ? now : null,
      lastError: params.lastError,
    },
  });
}

export async function deleteOutboundMirror(
  userId: string,
  sourceType: GoogleCalendarOutboundSourceType,
  sourceId: string
): Promise<void> {
  const existing = await prismaAdmin.googleCalendarOutboundSync.findUnique({
    where: {
      userId_sourceType_sourceId: { userId, sourceType, sourceId },
    },
  });
  if (!existing) return;

  const connRow = await prismaAdmin.connection.findFirst({
    where: { id: existing.connectionId, userId, accessToken: { not: null } },
  });
  const canDeleteRemote =
    existing.googleEventId.length > 0 &&
    !existing.googleEventId.startsWith("__kp_");
  const delAdapter = connRow ? connectionToAdapterFromNullableRow(connRow) : null;
  if (delAdapter && canDeleteRemote) {
    try {
      await deleteGoogleCalendarEvent(
        delAdapter,
        existing.googleCalendarId,
        existing.googleEventId
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/404|Not Found|410|deleted/i.test(msg)) {
        console.warn("[google-calendar outbound] delete remote event", sourceType, sourceId, e);
      }
    }
  }

  await prismaAdmin.googleCalendarOutboundSync.delete({
    where: { id: existing.id },
  });
}

function trimError(err: unknown): string {
  const s = err instanceof Error ? err.message : String(err);
  return s.length > 1900 ? `${s.slice(0, 1897)}...` : s;
}

async function pushToGoogle(params: {
  userId: string;
  sourceType: GoogleCalendarOutboundSourceType;
  sourceId: string;
  body: calendar_v3.Schema$Event;
}): Promise<void> {
  const ctx = await findOutboundWriteContext(params.userId);
  if (!ctx) {
    await deleteOutboundMirror(params.userId, params.sourceType, params.sourceId);
    return;
  }

  const conn = connectionToAdapter(ctx.connection);
  const calId = ctx.writeCalendarId;

  let existing = await prismaAdmin.googleCalendarOutboundSync.findUnique({
    where: {
      userId_sourceType_sourceId: {
        userId: params.userId,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
      },
    },
  });

  if (
    existing &&
    (existing.connectionId !== ctx.connection.id || existing.googleCalendarId !== calId) &&
    existing.googleEventId.length > 0 &&
    !existing.googleEventId.startsWith("__kp_")
  ) {
    const oldConnRow = await prismaAdmin.connection.findFirst({
      where: { id: existing.connectionId, userId: params.userId, accessToken: { not: null } },
    });
    const oldAd = oldConnRow ? connectionToAdapterFromNullableRow(oldConnRow) : null;
    if (oldAd) {
      try {
        await deleteGoogleCalendarEvent(
          oldAd,
          existing.googleCalendarId,
          existing.googleEventId
        );
      } catch {
        /* best-effort */
      }
    }
    await prismaAdmin.googleCalendarOutboundSync.delete({ where: { id: existing.id } });
    existing = null;
  }

  try {
    if (
      existing &&
      existing.googleCalendarId === calId &&
      existing.connectionId === ctx.connection.id &&
      !existing.googleEventId.startsWith("__kp_")
    ) {
      try {
        const patched = await patchGoogleCalendarEvent(
          conn,
          calId,
          existing.googleEventId,
          params.body
        );
        await upsertMappingRow({
          userId: params.userId,
          connectionId: ctx.connection.id,
          sourceType: params.sourceType,
          sourceId: params.sourceId,
          googleCalendarId: calId,
          googleEventId: existing.googleEventId,
          googleEventHtmlLink: patched.htmlLink ?? null,
          status: "SYNCED",
          lastError: null,
        });
        return;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!/404|Not Found|410/i.test(msg)) throw e;
      }
    }

    const created = await insertGoogleCalendarEvent(conn, calId, params.body);
    if (!created.id) throw new Error("Google Calendar insert missing id");
    await upsertMappingRow({
      userId: params.userId,
      connectionId: ctx.connection.id,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      googleCalendarId: calId,
      googleEventId: created.id,
      googleEventHtmlLink: created.htmlLink ?? null,
      status: "SYNCED",
      lastError: null,
    });
  } catch (e) {
    console.error("[google-calendar outbound] push failed", params.sourceType, params.sourceId, e);
    if (existing && !existing.googleEventId.startsWith("__kp_")) {
      await prismaAdmin.googleCalendarOutboundSync.update({
        where: { id: existing.id },
        data: {
          status: "ERROR",
          lastError: trimError(e),
          lastSyncedAt: null,
          googleEventHtmlLink: null,
        },
      });
    } else {
      await prismaAdmin.googleCalendarOutboundSync.upsert({
        where: {
          userId_sourceType_sourceId: {
            userId: params.userId,
            sourceType: params.sourceType,
            sourceId: params.sourceId,
          },
        },
        create: {
          userId: params.userId,
          connectionId: ctx.connection.id,
          sourceType: params.sourceType,
          sourceId: params.sourceId,
          googleCalendarId: calId,
          googleEventId: "__kp_error__",
          status: "ERROR",
          lastError: trimError(e),
          googleEventHtmlLink: null,
        },
        update: {
          connectionId: ctx.connection.id,
          googleCalendarId: calId,
          status: "ERROR",
          lastError: trimError(e),
          lastSyncedAt: null,
          googleEventHtmlLink: null,
        },
      });
    }
  }
}

function kpLink(path: string): string {
  const origin = resolveAppOrigin();
  return path.startsWith("/") ? `${origin}${path}` : `${origin}/${path}`;
}

export async function syncShowingOutbound(userId: string, showingId: string): Promise<void> {
  const row = await prismaAdmin.showing.findFirst({
    where: { id: showingId, hostUserId: userId },
    include: { property: { select: { address1: true, city: true, state: true } } },
  });
  if (!row || row.deletedAt) {
    await deleteOutboundMirror(userId, "SHOWING", showingId);
    return;
  }

  const start = row.scheduledAt;
  const end = new Date(start.getTime() + SHOWING_DURATION_MS);
  const addr = row.property ? `${row.property.address1}, ${row.property.city}` : null;
  const buyer = row.buyerName?.trim();
  const title = buyer ? `Showing — ${buyer}` : "Private showing";
  const description = [
    "KeyPilot · ShowingHQ (synced from KeyPilot)",
    addr ? `Property: ${addr}` : null,
    kpLink(`/showing-hq/showings/${row.id}`),
  ]
    .filter(Boolean)
    .join("\n");

  await pushToGoogle({
    userId,
    sourceType: "SHOWING",
    sourceId: showingId,
    body: {
      summary: title,
      description,
      start: { dateTime: start.toISOString(), timeZone: "UTC" },
      end: { dateTime: end.toISOString(), timeZone: "UTC" },
      extendedProperties: {
        private: {
          keypilotOutbound: "1",
          keypilotSourceType: "SHOWING",
          keypilotSourceId: showingId,
        },
      },
    },
  });
}

export async function syncTaskOutbound(userId: string, taskId: string): Promise<void> {
  const row = await prismaAdmin.task.findFirst({
    where: { id: taskId, userId },
    include: {
      contact: { select: { firstName: true, lastName: true } },
      property: { select: { address1: true, city: true } },
    },
  });
  if (!row || row.status !== "OPEN" || !row.dueAt) {
    await deleteOutboundMirror(userId, "TASK", taskId);
    return;
  }

  const due = row.dueAt;
  const end = new Date(due.getTime() + DEFAULT_BLOCK_MS);
  const sub =
    row.property?.address1 != null
      ? `${row.property.address1}, ${row.property.city}`
      : row.contact
        ? `${row.contact.firstName} ${row.contact.lastName}`.trim()
        : null;
  const title = row.title.trim() ? `Task — ${row.title.trim()}` : "Task";

  await pushToGoogle({
    userId,
    sourceType: "TASK",
    sourceId: taskId,
    body: {
      summary: title,
      description: [
        "KeyPilot · Task Pilot (synced from KeyPilot)",
        sub ? `Context: ${sub}` : null,
        kpLink("/task-pilot"),
      ]
        .filter(Boolean)
        .join("\n"),
      start: { dateTime: due.toISOString(), timeZone: "UTC" },
      end: { dateTime: end.toISOString(), timeZone: "UTC" },
      extendedProperties: {
        private: {
          keypilotOutbound: "1",
          keypilotSourceType: "TASK",
          keypilotSourceId: taskId,
        },
      },
    },
  });
}

export async function syncFollowUpOutbound(userId: string, followUpId: string): Promise<void> {
  const row = await prismaAdmin.followUp.findFirst({
    where: { id: followUpId, createdByUserId: userId, deletedAt: null },
    include: { contact: { select: { firstName: true, lastName: true } } },
  });
  if (!row || row.status === "CLOSED") {
    await deleteOutboundMirror(userId, "FOLLOW_UP", followUpId);
    return;
  }

  const due = row.dueAt;
  const end = new Date(due.getTime() + DEFAULT_BLOCK_MS);
  const name = `${row.contact.firstName} ${row.contact.lastName}`.trim();
  const title = row.title?.trim() ? `Follow-up — ${row.title.trim()}` : "Follow-up";

  await pushToGoogle({
    userId,
    sourceType: "FOLLOW_UP",
    sourceId: followUpId,
    body: {
      summary: title,
      description: [
        "KeyPilot · ClientKeep (synced from KeyPilot)",
        `Contact: ${name}`,
        kpLink(`/contacts/${row.contactId}`),
      ].join("\n"),
      start: { dateTime: due.toISOString(), timeZone: "UTC" },
      end: { dateTime: end.toISOString(), timeZone: "UTC" },
      extendedProperties: {
        private: {
          keypilotOutbound: "1",
          keypilotSourceType: "FOLLOW_UP",
          keypilotSourceId: followUpId,
        },
      },
    },
  });
}

export async function syncTransactionChecklistOutbound(
  userId: string,
  itemId: string
): Promise<void> {
  const row = await prismaAdmin.transactionChecklistItem.findFirst({
    where: { id: itemId },
    include: {
      transaction: {
        select: {
          id: true,
          userId: true,
          deletedAt: true,
          property: { select: { address1: true, city: true } },
        },
      },
    },
  });
  if (!row || row.transaction.userId !== userId || row.transaction.deletedAt) {
    await deleteOutboundMirror(userId, "TRANSACTION_CHECKLIST", itemId);
    return;
  }
  if (row.isComplete || !row.dueDate) {
    await deleteOutboundMirror(userId, "TRANSACTION_CHECKLIST", itemId);
    return;
  }

  const due = row.dueDate;
  const end = new Date(due.getTime() + DEFAULT_BLOCK_MS);
  const line = `${row.transaction.property.address1}, ${row.transaction.property.city}`;
  const title = row.title.trim() ? row.title.trim() : "Transaction item";

  await pushToGoogle({
    userId,
    sourceType: "TRANSACTION_CHECKLIST",
    sourceId: itemId,
    body: {
      summary: title,
      description: [
        "KeyPilot · TransactionHQ (synced from KeyPilot)",
        `Property: ${line}`,
        kpLink(`/transactions/${row.transactionId}#txn-pipeline-workspace`),
      ].join("\n"),
      start: { dateTime: due.toISOString(), timeZone: "UTC" },
      end: { dateTime: end.toISOString(), timeZone: "UTC" },
      extendedProperties: {
        private: {
          keypilotOutbound: "1",
          keypilotSourceType: "TRANSACTION_CHECKLIST",
          keypilotSourceId: itemId,
        },
      },
    },
  });
}

export async function syncTransactionClosingOutbound(
  userId: string,
  transactionId: string
): Promise<void> {
  const txn = await prismaAdmin.transaction.findFirst({
    where: { id: transactionId, userId },
    include: { property: { select: { address1: true, city: true } } },
  });
  if (
    !txn ||
    txn.deletedAt ||
    !txn.closingDate ||
    TERMINAL.includes(txn.status as TransactionStatus)
  ) {
    await deleteOutboundMirror(userId, "TRANSACTION_CLOSING", transactionId);
    return;
  }

  const cd = txn.closingDate;
  const dk = cd.toISOString().slice(0, 10);
  const [y, mo, da] = dk.split("-").map((x) => Number.parseInt(x, 10));
  const nextDay = new Date(Date.UTC(y, mo - 1, da) + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const line = `${txn.property.address1}, ${txn.property.city}`;
  const title = `Closing — ${txn.property.address1}`;

  await pushToGoogle({
    userId,
    sourceType: "TRANSACTION_CLOSING",
    sourceId: transactionId,
    body: {
      summary: title,
      description: [
        "KeyPilot · TransactionHQ (synced from KeyPilot)",
        `Property: ${line}`,
        kpLink(`/transactions/${txn.id}`),
      ].join("\n"),
      start: { date: dk, timeZone: "UTC" },
      end: { date: nextDay, timeZone: "UTC" },
      extendedProperties: {
        private: {
          keypilotOutbound: "1",
          keypilotSourceType: "TRANSACTION_CLOSING",
          keypilotSourceId: transactionId,
        },
      },
    },
  });
}

/**
 * Remove outbound rows (and remote Google events) for TRANSACTION_CHECKLIST sources whose
 * checklist rows no longer exist. Catches edge cases where cascade delete removed a checklist
 * row but the id was not included in a batched outbound cleanup list.
 */
export async function cleanupOrphanTransactionChecklistOutboundSyncs(userId: string): Promise<void> {
  const orphans = await prismaAdmin.$queryRaw<Array<{ sourceId: string }>>(
    Prisma.sql`
      SELECT g."sourceId" FROM "google_calendar_outbound_syncs" g
      WHERE g."userId" = ${userId}
        AND g."sourceType" = 'TRANSACTION_CHECKLIST'::"GoogleCalendarOutboundSourceType"
        AND NOT EXISTS (
          SELECT 1 FROM "transaction_checklist_items" t WHERE t."id" = g."sourceId"
        )
    `
  );
  for (const row of orphans) {
    await deleteOutboundMirror(userId, "TRANSACTION_CHECKLIST", row.sourceId);
  }
}

/** For filtering read-sync: hide Google rows that are our own outbound mirrors. */
export async function loadOutboundMirroredGoogleEventKeys(userId: string): Promise<Set<string>> {
  const rows = await prismaAdmin.googleCalendarOutboundSync.findMany({
    where: { userId, status: "SYNCED" },
    select: { connectionId: true, googleCalendarId: true, googleEventId: true },
  });
  return new Set(
    rows.map((r) => `${r.connectionId}\t${r.googleCalendarId}\t${r.googleEventId}`)
  );
}

export function scheduleOutboundSync(fn: () => Promise<void>): void {
  void fn().catch((e) => console.error("[google-calendar outbound] scheduled sync failed", e));
}

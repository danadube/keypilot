/**
 * ClientKeep Communications workbench — prioritized communication work (GET).
 * Reuses CRM data only; no schema changes.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { getDashboardVisibleContactIds } from "@/lib/contacts/contact-access";
import { formatUserActivityTypeLabel } from "@/lib/activity/user-activity-type-label";
import {
  clientKeepCommunicationsResponseSchema,
  type ClientKeepCommunicationsResponse,
} from "@/lib/validations/client-keep-communications";

export const dynamic = "force-dynamic";

const DO_FIRST_PRIORITY: Record<string, number> = {
  overdue_reminder: 0,
  overdue_follow_up: 1,
  draft: 2,
};

function contactName(c: { firstName: string; lastName: string }): string {
  return `${c.firstName} ${c.lastName}`.trim() || "Contact";
}

function contactHref(contactId: string): string {
  return `/contacts/${encodeURIComponent(contactId)}`;
}

function userActivityHref(row: {
  contactId: string | null;
  propertyId: string | null;
}): string {
  if (row.contactId) return contactHref(row.contactId);
  if (row.propertyId) return `/properties/${row.propertyId}`;
  return "/showing-hq/activity";
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const now = new Date();
    const contactIds = await getDashboardVisibleContactIds(user.id);

    if (contactIds.length === 0) {
      const empty: ClientKeepCommunicationsResponse = {
        doFirst: [],
        scheduled: [],
        recent: [],
      };
      return NextResponse.json({ data: empty });
    }

    const idSet = new Set(contactIds);

    const [
      overdueReminders,
      overdueFollowUps,
      openDrafts,
      upcomingReminders,
      upcomingFollowUps,
      scheduledUserActivities,
      recentUserActivities,
    ] = await withRLSContext(user.id, async (tx) =>
      Promise.all([
        tx.followUpReminder.findMany({
          where: {
            userId: user.id,
            status: "PENDING",
            dueAt: { lt: now },
            contactId: { in: contactIds },
          },
          include: {
            contact: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { dueAt: "asc" },
          take: 12,
        }),
        tx.followUp.findMany({
          where: {
            createdByUserId: user.id,
            deletedAt: null,
            dueAt: { lt: now },
            status: { in: ["NEW", "PENDING", "CONTACTED", "NURTURE"] },
            contactId: { in: contactIds },
          },
          include: {
            contact: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { dueAt: "asc" },
          take: 12,
        }),
        tx.followUpDraft.findMany({
          where: {
            openHouse: { hostUserId: user.id, deletedAt: null },
            deletedAt: null,
            status: { in: ["DRAFT", "REVIEWED"] },
            contactId: { in: contactIds },
          },
          include: {
            contact: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 12,
        }),
        tx.followUpReminder.findMany({
          where: {
            userId: user.id,
            status: "PENDING",
            dueAt: { gte: now },
            contactId: { in: contactIds },
          },
          include: {
            contact: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { dueAt: "asc" },
          take: 20,
        }),
        tx.followUp.findMany({
          where: {
            createdByUserId: user.id,
            deletedAt: null,
            dueAt: { gte: now },
            status: { in: ["NEW", "PENDING", "CONTACTED", "NURTURE"] },
            contactId: { in: contactIds },
          },
          include: {
            contact: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { dueAt: "asc" },
          take: 20,
        }),
        tx.userActivity.findMany({
          where: {
            userId: user.id,
            completedAt: null,
            dueAt: { gte: now },
            type: { in: ["CALL", "EMAIL", "FOLLOW_UP", "TASK", "NOTE"] },
          },
          include: {
            contact: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { dueAt: "asc" },
          take: 24,
        }),
        tx.userActivity.findMany({
          where: {
            userId: user.id,
            type: { in: ["CALL", "EMAIL", "FOLLOW_UP", "NOTE"] },
          },
          include: {
            contact: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 12,
        }),
      ])
    );

    type DoFirst = ClientKeepCommunicationsResponse["doFirst"][number];
    const rawDo: DoFirst[] = [];

    for (const r of overdueReminders) {
      if (!idSet.has(r.contactId)) continue;
      const firstLine =
        r.body.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() ??
        "Reminder";
      rawDo.push({
        kind: "overdue_reminder",
        id: r.id,
        headline: "Overdue reminder",
        subline: firstLine.length > 90 ? `${firstLine.slice(0, 89)}…` : firstLine,
        dueAt: r.dueAt.toISOString(),
        href: contactHref(r.contactId),
        contactId: r.contactId,
        contactName: contactName(r.contact),
      });
    }

    for (const f of overdueFollowUps) {
      if (!idSet.has(f.contactId)) continue;
      rawDo.push({
        kind: "overdue_follow_up",
        id: f.id,
        headline: "Overdue follow-up",
        subline: f.title,
        dueAt: f.dueAt.toISOString(),
        href: contactHref(f.contactId),
        contactId: f.contactId,
        contactName: contactName(f.contact),
      });
    }

    for (const d of openDrafts) {
      if (!idSet.has(d.contactId)) continue;
      rawDo.push({
        kind: "draft",
        id: d.id,
        headline: "Follow-up draft",
        subline: d.subject,
        href: `/showing-hq/follow-ups/draft/${encodeURIComponent(d.id)}`,
        contactId: d.contactId,
        contactName: contactName(d.contact),
      });
    }

    rawDo.sort((a, b) => {
      const pa = DO_FIRST_PRIORITY[a.kind] ?? 99;
      const pb = DO_FIRST_PRIORITY[b.kind] ?? 99;
      if (pa !== pb) return pa - pb;
      const da = a.dueAt ? new Date(a.dueAt).getTime() : 0;
      const db = b.dueAt ? new Date(b.dueAt).getTime() : 0;
      return da - db;
    });

    const seenContactDo = new Set<string>();
    const doFirst: DoFirst[] = [];
    for (const row of rawDo) {
      if (seenContactDo.has(row.contactId)) continue;
      seenContactDo.add(row.contactId);
      doFirst.push(row);
      if (doFirst.length >= 10) break;
    }

    type Scheduled = ClientKeepCommunicationsResponse["scheduled"][number];
    const scheduledRaw: Scheduled[] = [];

    for (const r of upcomingReminders) {
      if (!idSet.has(r.contactId)) continue;
      const firstLine =
        r.body.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() ??
        "Reminder";
      scheduledRaw.push({
        kind: "reminder",
        id: r.id,
        label: contactName(r.contact),
        subline: firstLine.length > 120 ? `${firstLine.slice(0, 119)}…` : firstLine,
        dueAt: r.dueAt.toISOString(),
        href: contactHref(r.contactId),
        contactId: r.contactId,
        contactName: contactName(r.contact),
      });
    }

    for (const f of upcomingFollowUps) {
      if (!idSet.has(f.contactId)) continue;
      scheduledRaw.push({
        kind: "follow_up_task",
        id: f.id,
        label: contactName(f.contact),
        subline: f.title,
        dueAt: f.dueAt.toISOString(),
        href: contactHref(f.contactId),
        contactId: f.contactId,
        contactName: contactName(f.contact),
      });
    }

    for (const a of scheduledUserActivities) {
      if (a.contactId && !idSet.has(a.contactId)) continue;
      if (!a.dueAt) continue;
      const title = a.title?.trim() || formatUserActivityTypeLabel(a.type);
      scheduledRaw.push({
        kind: "crm_task",
        id: a.id,
        label:
          a.contactId && a.contact
            ? contactName(a.contact)
            : title,
        subline:
          a.contactId && a.contact
            ? `${formatUserActivityTypeLabel(a.type)} · ${title}`
            : formatUserActivityTypeLabel(a.type),
        dueAt: a.dueAt.toISOString(),
        href: userActivityHref(a),
        contactId: a.contactId,
        contactName: a.contact ? contactName(a.contact) : undefined,
      });
    }

    scheduledRaw.sort(
      (x, y) => new Date(x.dueAt).getTime() - new Date(y.dueAt).getTime()
    );
    const scheduled = scheduledRaw.slice(0, 12);

    type Recent = ClientKeepCommunicationsResponse["recent"][number];
    const recent: Recent[] = [];
    for (const a of recentUserActivities) {
      if (a.contactId && !idSet.has(a.contactId)) continue;
      const title = a.title?.trim() || formatUserActivityTypeLabel(a.type);
      const desc = a.description?.trim();
      recent.push({
        id: a.id,
        typeLabel: formatUserActivityTypeLabel(a.type),
        title,
        subline:
          desc && desc !== title
            ? desc.length > 140
              ? `${desc.slice(0, 139)}…`
              : desc
            : undefined,
        eventAt: a.updatedAt.toISOString(),
        href: userActivityHref(a),
        contactName: a.contact ? contactName(a.contact) : undefined,
      });
      if (recent.length >= 6) break;
    }

    const payload: ClientKeepCommunicationsResponse = {
      doFirst,
      scheduled,
      recent,
    };

    const parsed = clientKeepCommunicationsResponseSchema.safeParse(payload);
    if (!parsed.success) {
      console.error(
        "client-keep communications response shape",
        parsed.error.flatten()
      );
      return apiError("Communications data could not be assembled", 500);
    }

    return NextResponse.json({ data: parsed.data });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

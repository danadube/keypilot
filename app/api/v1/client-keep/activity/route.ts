/**
 * ClientKeep — unified feed of follow-ups (drafts + reminders) and user CRM activities (GET only).
 *
 * Each item includes `eventAt` (ISO string): sourced from the row’s `updatedAt` so the feed
 * reflects recency (edits, status changes). Sorted descending by `eventAt`.
 *
 * `entityId` plus reminder `status` / activity `completedAt` support quick actions on the client.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { formatUserActivityTypeLabel } from "@/lib/activity/user-activity-type-label";

export const dynamic = "force-dynamic";

const FETCH_CAP = 40;
const RESULT_CAP = 50;

/** Feed ordering / display time: last update on the underlying record. */
function feedEventTime(row: { updatedAt: Date }): Date {
  return row.updatedAt;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function formatFollowUpDraftStatus(status: string): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "REVIEWED":
      return "Reviewed";
    case "SENT_MANUAL":
      return "Sent manually";
    case "ARCHIVED":
      return "Archived";
    default:
      return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function reminderStatusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Still due";
    case "DONE":
      return "Done";
    case "DISMISSED":
      return "Dismissed";
    default:
      return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

const ACTIVITY_HUB_HREF = "/showing-hq/activity";

type FeedSubkind = "draft" | "reminder" | "user_activity";

function contactHref(contactId: string): string {
  return `/contacts/${encodeURIComponent(contactId)}`;
}

function userActivityHref(row: {
  contactId: string | null;
  propertyId: string | null;
}): string {
  if (row.contactId) return contactHref(row.contactId);
  if (row.propertyId) return `/properties/${row.propertyId}`;
  return ACTIVITY_HUB_HREF;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const [drafts, reminders, userActivities] = await withRLSContext(
      user.id,
      async (tx) =>
        Promise.all([
          tx.followUpDraft.findMany({
            where: {
              openHouse: { hostUserId: user.id, deletedAt: null },
              deletedAt: null,
            },
            select: {
              id: true,
              subject: true,
              body: true,
              contactId: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { updatedAt: "desc" },
            take: FETCH_CAP,
          }),
          tx.followUpReminder.findMany({
            where: { userId: user.id },
            select: {
              id: true,
              body: true,
              contactId: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { updatedAt: "desc" },
            take: FETCH_CAP,
          }),
          tx.userActivity.findMany({
            where: { userId: user.id },
            select: {
              id: true,
              title: true,
              description: true,
              type: true,
              contactId: true,
              propertyId: true,
              completedAt: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { updatedAt: "desc" },
            take: FETCH_CAP,
          }),
        ])
    );

    const items: {
      id: string;
      entityId: string;
      type: "follow_up" | "activity";
      subkind: FeedSubkind;
      href: string;
      title: string;
      /** Short label for the row chip (draft / reminder / activity type). */
      kindLabel: string;
      description?: string;
      contactId?: string;
      propertyId?: string;
      eventAt: string;
      /** Present when `subkind === "reminder"` */
      status?: string;
      /** Present when `subkind === "user_activity"` */
      completedAt?: string | null;
    }[] = [];

    for (const d of drafts) {
      items.push({
        id: `follow-up-draft:${d.id}`,
        entityId: d.id,
        type: "follow_up",
        subkind: "draft",
        href: `/showing-hq/follow-ups/draft/${d.id}`,
        title: d.subject,
        kindLabel: "Follow-up draft",
        description: `${formatFollowUpDraftStatus(d.status)} · ${truncate(d.body, 200)}`,
        contactId: d.contactId,
        eventAt: feedEventTime(d).toISOString(),
      });
    }

    for (const r of reminders) {
      const firstLine =
        r.body.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() ??
        "Reminder";
      items.push({
        id: `follow-up-reminder:${r.id}`,
        entityId: r.id,
        type: "follow_up",
        subkind: "reminder",
        href: contactHref(r.contactId),
        title: truncate(firstLine, 120),
        kindLabel: "Reminder",
        description: reminderStatusLabel(r.status),
        contactId: r.contactId,
        status: r.status,
        eventAt: feedEventTime(r).toISOString(),
      });
    }

    for (const a of userActivities) {
      const title = a.title?.trim() ?? "";
      const desc = a.description?.trim() ?? "";
      const secondary =
        desc && desc !== title
          ? desc.length > 200
            ? truncate(desc, 200)
            : desc
          : formatUserActivityTypeLabel(a.type);
      items.push({
        id: `activity:${a.id}`,
        entityId: a.id,
        type: "activity",
        subkind: "user_activity",
        href: userActivityHref(a),
        title: title || formatUserActivityTypeLabel(a.type),
        kindLabel: formatUserActivityTypeLabel(a.type),
        description: secondary,
        contactId: a.contactId ?? undefined,
        propertyId: a.propertyId ?? undefined,
        completedAt: a.completedAt ? a.completedAt.toISOString() : null,
        eventAt: feedEventTime(a).toISOString(),
      });
    }

    items.sort(
      (x, y) =>
        new Date(y.eventAt).getTime() - new Date(x.eventAt).getTime()
    );

    return NextResponse.json({
      data: items.slice(0, RESULT_CAP),
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

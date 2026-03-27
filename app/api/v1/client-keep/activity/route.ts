/**
 * ClientKeep — unified read-only feed of follow-ups (drafts + reminders) and user CRM activities.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const FETCH_CAP = 40;
const RESULT_CAP = 50;

function feedRecencyTime(row: { createdAt: Date; updatedAt: Date }): Date {
  return row.updatedAt;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function formatFollowUpStatus(status: string): string {
  return status.replace(/_/g, " ").toLowerCase();
}

function formatUserActivityType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const [drafts, reminders, userActivities] = await Promise.all([
      prismaAdmin.followUpDraft.findMany({
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
      prismaAdmin.followUpReminder.findMany({
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
      withRLSContext(user.id, (tx) =>
        tx.userActivity.findMany({
          where: { userId: user.id },
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            contactId: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
          take: FETCH_CAP,
        })
      ),
    ]);

    const items: {
      id: string;
      type: "follow_up" | "activity";
      title: string;
      description?: string;
      contactId?: string;
      createdAt: string;
    }[] = [];

    for (const d of drafts) {
      items.push({
        id: `follow-up-draft:${d.id}`,
        type: "follow_up",
        title: d.subject,
        description: `${formatFollowUpStatus(d.status)} · ${truncate(d.body, 200)}`,
        contactId: d.contactId,
        createdAt: feedRecencyTime(d).toISOString(),
      });
    }

    for (const r of reminders) {
      const firstLine =
        r.body.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() ??
        "Reminder";
      items.push({
        id: `follow-up-reminder:${r.id}`,
        type: "follow_up",
        title: truncate(firstLine, 120),
        description: `Reminder · ${r.status.toLowerCase()}`,
        contactId: r.contactId,
        createdAt: feedRecencyTime(r).toISOString(),
      });
    }

    for (const a of userActivities) {
      const secondary =
        a.description?.trim() ?? formatUserActivityType(a.type);
      items.push({
        id: `activity:${a.id}`,
        type: "activity",
        title: a.title,
        description:
          secondary.length > 200 ? truncate(secondary, 200) : secondary,
        contactId: a.contactId ?? undefined,
        createdAt: feedRecencyTime(a).toISOString(),
      });
    }

    items.sort(
      (x, y) =>
        new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()
    );

    return NextResponse.json({
      data: items.slice(0, RESULT_CAP),
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

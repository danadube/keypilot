import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

type ContactRowForSort = {
  createdAt: Date;
  followUpReminders?: { dueAt: Date }[];
};

/** Overdue first (most overdue first), then upcoming (soonest first), then no pending (newest contact first). */
function sortContactsByFollowUpUrgency<T extends ContactRowForSort>(
  rows: T[],
  nowMs: number
): T[] {
  const score = (c: T) => {
    const pending = c.followUpReminders ?? [];
    if (pending.length === 0) {
      return { tier: 2 as const, key: new Date(c.createdAt).getTime() };
    }
    const times = pending.map((r) => new Date(r.dueAt).getTime());
    const overdueTimes = times.filter((t) => t < nowMs);
    if (overdueTimes.length > 0) {
      return { tier: 0 as const, key: Math.min(...overdueTimes) };
    }
    return { tier: 1 as const, key: Math.min(...times) };
  };

  return [...rows].sort((a, b) => {
    const sa = score(a);
    const sb = score(b);
    if (sa.tier !== sb.tier) return sa.tier - sb.tier;
    if (sa.tier === 2) return sb.key - sa.key;
    return sa.key - sb.key;
  });
}

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();

    // Contacts scoped to those created via current user's open houses
    const openHouses = await prismaAdmin.openHouse.findMany({
      where: { hostUserId: user.id, deletedAt: null },
      select: { id: true },
    });
    const openHouseIds = openHouses.map((oh) => oh.id);

    const visitors = await prismaAdmin.openHouseVisitor.findMany({
      where: { openHouseId: { in: openHouseIds } },
      select: { contactId: true },
      distinct: ["contactId"],
    });
    const contactIds = Array.from(new Set(visitors.map((v) => v.contactId)));

    const { searchParams } = new URL(_req.url);
    const status = searchParams.get("status")?.toUpperCase();

    const statusFilter =
      status && ["LEAD", "CONTACTED", "NURTURING", "READY", "LOST"].includes(status)
        ? { status: status as "LEAD" | "CONTACTED" | "NURTURING" | "READY" | "LOST" }
        : {};

    const tagIdParam = searchParams.get("tagId")?.trim();
    let tagFilter: { contactTags: { some: { tagId: string } } } | object = {};
    if (tagIdParam) {
      const ownedTag = await prismaAdmin.tag.findFirst({
        where: { id: tagIdParam, userId: user.id },
        select: { id: true },
      });
      if (!ownedTag) {
        return apiError("Tag not found", 404);
      }
      tagFilter = { contactTags: { some: { tagId: ownedTag.id } } };
    }

    const needsFollowUp = searchParams.get("followUp") === "needs";
    const sortRecent = searchParams.get("sort") === "recent";
    const followUpFilter = needsFollowUp
      ? {
          followUpReminders: {
            some: { userId: user.id, status: "PENDING" as const },
          },
        }
      : {};

    const contacts = await prismaAdmin.contact.findMany({
      where: {
        id: { in: contactIds },
        deletedAt: null,
        ...statusFilter,
        ...tagFilter,
        ...followUpFilter,
      },
      include: {
        assignedToUser: { select: { id: true, name: true } },
        contactTags: { include: { tag: true } },
        followUpReminders: {
          where: { userId: user.id, status: "PENDING" },
          select: { id: true, dueAt: true, body: true },
          orderBy: { dueAt: "asc" },
        },
        _count: {
          select: {
            followUpReminders: {
              where: { userId: user.id, status: "PENDING" },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const nowMs = Date.now();
    const ordered = sortRecent
      ? contacts
      : sortContactsByFollowUpUrgency(contacts, nowMs);

    return NextResponse.json({ data: ordered });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

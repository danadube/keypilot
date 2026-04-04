import { NextRequest, NextResponse } from "next/server";
import { ContactFarmMembershipStatus } from "@prisma/client";
import { z } from "zod";
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

const uuidParam = z.string().uuid();

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();

    const { searchParams } = new URL(_req.url);
    const farmAreaRaw = searchParams.get("farmAreaId")?.trim() ?? "";
    const farmTerritoryRaw = searchParams.get("farmTerritoryId")?.trim() ?? "";
    const farmAreaUuid = uuidParam.safeParse(farmAreaRaw);
    const farmTerritoryUuid = uuidParam.safeParse(farmTerritoryRaw);

    type FarmScopeMeta = {
      farmScope: { kind: "area" | "territory"; id: string; name: string };
    };
    let farmMeta: FarmScopeMeta | undefined;

    let contactIds: string[];

    if (farmAreaUuid.success) {
      const area = await prismaAdmin.farmArea.findFirst({
        where: {
          id: farmAreaUuid.data,
          userId: user.id,
          deletedAt: null,
        },
        select: { id: true, name: true },
      });
      if (!area) {
        return apiError("Farm area not found", 404);
      }
      const memberships = await prismaAdmin.contactFarmMembership.findMany({
        where: {
          farmAreaId: area.id,
          userId: user.id,
          status: ContactFarmMembershipStatus.ACTIVE,
        },
        select: { contactId: true },
        distinct: ["contactId"],
      });
      contactIds = memberships.map((m) => m.contactId);
      farmMeta = {
        farmScope: { kind: "area", id: area.id, name: area.name },
      };
    } else if (farmTerritoryUuid.success) {
      const territory = await prismaAdmin.farmTerritory.findFirst({
        where: {
          id: farmTerritoryUuid.data,
          userId: user.id,
          deletedAt: null,
        },
        select: { id: true, name: true },
      });
      if (!territory) {
        return apiError("Territory not found", 404);
      }
      const areasInTerritory = await prismaAdmin.farmArea.findMany({
        where: {
          territoryId: territory.id,
          userId: user.id,
          deletedAt: null,
        },
        select: { id: true },
      });
      const areaIds = areasInTerritory.map((a) => a.id);
      if (areaIds.length === 0) {
        contactIds = [];
      } else {
        const memberships = await prismaAdmin.contactFarmMembership.findMany({
          where: {
            farmAreaId: { in: areaIds },
            userId: user.id,
            status: ContactFarmMembershipStatus.ACTIVE,
          },
          select: { contactId: true },
        });
        contactIds = Array.from(new Set(memberships.map((m) => m.contactId)));
      }
      farmMeta = {
        farmScope: {
          kind: "territory",
          id: territory.id,
          name: territory.name,
        },
      };
    } else {
      // Default: contacts tied to current user's open-house visitors
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
      contactIds = Array.from(new Set(visitors.map((v) => v.contactId)));
    }

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

    if (contactIds.length === 0) {
      return NextResponse.json(
        farmMeta ? { data: [], meta: farmMeta } : { data: [] }
      );
    }

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

    return NextResponse.json(
      farmMeta ? { data: ordered, meta: farmMeta } : { data: ordered }
    );
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

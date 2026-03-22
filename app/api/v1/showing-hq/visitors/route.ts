/**
 * ShowingHQ visitors API — list all open house visitors with search/filter.
 * Uses existing open_house_visitors table. Links to contact when available.
 */

import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get("q")?.trim() ?? "";
    const openHouseId = searchParams.get("openHouseId")?.trim();
    const sort = searchParams.get("sort")?.trim() || "date-desc"; // date-desc | date-asc | name-asc | name-desc

    const where: Prisma.OpenHouseVisitorWhereInput = {
      openHouse: {
        hostUserId: user.id,
        deletedAt: null,
        ...(openHouseId ? { id: openHouseId } : {}),
      },
    };

    if (q) {
      const searchTerms = q.split(/\s+/).filter(Boolean);
      if (searchTerms.length > 0) {
        where.OR = searchTerms.flatMap((term) => [
          { contact: { firstName: { contains: term, mode: "insensitive" } } },
          { contact: { lastName: { contains: term, mode: "insensitive" } } },
          { contact: { email: { contains: term, mode: "insensitive" } } },
          { contact: { phone: { contains: term } } },
        ]);
      }
    }

    const orderBy: Prisma.OpenHouseVisitorOrderByWithRelationInput[] =
      sort === "date-asc"
        ? [{ submittedAt: "asc" }]
        : sort === "name-asc"
          ? [{ contact: { lastName: "asc" } }, { contact: { firstName: "asc" } }]
          : sort === "name-desc"
            ? [{ contact: { lastName: "desc" } }, { contact: { firstName: "desc" } }]
            : [{ submittedAt: "desc" }];

    const visitors = await prismaAdmin.openHouseVisitor.findMany({
      where,
      include: {
        contact: true,
        openHouse: {
          include: { property: true },
        },
      },
      orderBy,
      take: 100,
    });

    const openHouses = await prismaAdmin.openHouse.findMany({
      where: { hostUserId: user.id, deletedAt: null },
      select: { id: true, title: true, startAt: true, property: true },
      orderBy: { startAt: "desc" },
      take: 50,
    });

    const visitorPairs = visitors.map((v) => ({ contactId: v.contactId, openHouseId: v.openHouseId }));
    const draftStatusMap = new Map<string, string>();
    if (visitorPairs.length > 0) {
      const drafts = await prismaAdmin.followUpDraft.findMany({
        where: {
          OR: visitorPairs.map((p) => ({ contactId: p.contactId, openHouseId: p.openHouseId })),
          deletedAt: null,
        },
        select: { contactId: true, openHouseId: true, status: true },
      });
      for (const d of drafts) {
        draftStatusMap.set(`${d.contactId}:${d.openHouseId}`, d.status);
      }
    }

    return NextResponse.json({
      data: {
        visitors: visitors.map((v) => ({
          id: v.id,
          leadStatus: v.leadStatus,
          interestLevel: v.interestLevel,
          signInMethod: v.signInMethod,
          submittedAt: v.submittedAt,
          flyerEmailSentAt: v.flyerEmailSentAt?.toISOString() ?? null,
          flyerLinkClickedAt: v.flyerLinkClickedAt?.toISOString() ?? null,
          flyerEmailStatus: v.flyerEmailStatus,
          followUpStatus: draftStatusMap.get(`${v.contactId}:${v.openHouseId}`) ?? null,
          contact: v.contact,
          openHouse: {
            id: v.openHouse.id,
            title: v.openHouse.title,
            startAt: v.openHouse.startAt,
            property: v.openHouse.property,
          },
        })),
        openHouses,
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

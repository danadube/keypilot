/**
 * ShowingHQ visitors API — list all open house visitors with search/filter.
 * Uses existing open_house_visitors table. Links to contact when available.
 */

import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get("q")?.trim() ?? "";
    const openHouseId = searchParams.get("openHouseId")?.trim();

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

    const visitors = await prisma.openHouseVisitor.findMany({
      where,
      include: {
        contact: true,
        openHouse: {
          include: { property: true },
        },
      },
      orderBy: { submittedAt: "desc" },
      take: 100,
    });

    const openHouses = await prisma.openHouse.findMany({
      where: { hostUserId: user.id, deletedAt: null },
      select: { id: true, title: true, startAt: true, property: true },
      orderBy: { startAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      data: {
        visitors: visitors.map((v) => ({
          id: v.id,
          signInMethod: v.signInMethod,
          submittedAt: v.submittedAt,
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

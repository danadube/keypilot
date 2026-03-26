import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

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

    const contacts = await prismaAdmin.contact.findMany({
      where: {
        id: { in: contactIds },
        deletedAt: null,
        ...statusFilter,
        ...tagFilter,
      },
      include: {
        assignedToUser: { select: { id: true, name: true } },
        contactTags: { include: { tag: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: contacts });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

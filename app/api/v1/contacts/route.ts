import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { apiErrorFromCaught } from "@/lib/api-response";

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

    const contacts = await prismaAdmin.contact.findMany({
      where: {
        id: { in: contactIds },
        deletedAt: null,
        ...statusFilter,
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

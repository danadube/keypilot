import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();

    // Contacts scoped to those created via current user's open houses
    const openHouses = await prisma.openHouse.findMany({
      where: { hostUserId: user.id, deletedAt: null },
      select: { id: true },
    });
    const openHouseIds = openHouses.map((oh) => oh.id);

    const visitors = await prisma.openHouseVisitor.findMany({
      where: { openHouseId: { in: openHouseIds } },
      select: { contactId: true },
      distinct: ["contactId"],
    });
    const contactIds = Array.from(new Set(visitors.map((v) => v.contactId)));

    const contacts = await prisma.contact.findMany({
      where: {
        id: { in: contactIds },
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: contacts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: { message } },
      { status: err instanceof Error && message === "Unauthorized" ? 401 : 500 }
    );
  }
}

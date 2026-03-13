import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { apiErrorFromCaught } from "@/lib/api-response";

async function canAccessContact(contactId: string, userId: string): Promise<boolean> {
  const openHouses = await prisma.openHouse.findMany({
    where: { hostUserId: userId, deletedAt: null },
    select: { id: true },
  });
  const openHouseIds = openHouses.map((oh) => oh.id);

  const visitor = await prisma.openHouseVisitor.findFirst({
    where: {
      contactId,
      openHouseId: { in: openHouseIds },
    },
  });

  return !!visitor;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const canAccess = await canAccessContact(params.id, user.id);

    if (!canAccess) {
      return NextResponse.json(
        { error: { message: "Contact not found" } },
        { status: 404 }
      );
    }

    const activities = await prisma.activity.findMany({
      where: { contactId: params.id },
      orderBy: { occurredAt: "desc" },
    });

    return NextResponse.json({ data: activities });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

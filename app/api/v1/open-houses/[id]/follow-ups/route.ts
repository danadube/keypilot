import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { apiErrorFromCaught } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id: openHouseId } = await params;

    const openHouse = await prismaAdmin.openHouse.findFirst({
      where: {
        id: openHouseId,
        deletedAt: null,
        OR: [
          { hostUserId: user.id },
          { listingAgentId: user.id },
          { hostAgentId: user.id },
        ],
      },
      include: {
        visitors: { select: { id: true } },
        drafts: {
          where: { deletedAt: null },
          include: { contact: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!openHouse) {
      return NextResponse.json(
        { error: { message: "Open house not found" } },
        { status: 404 }
      );
    }

    const visitorIds = openHouse.visitors.map((v) => v.id);
    const followUps = await prismaAdmin.followUp.findMany({
      where: {
        createdByUserId: user.id,
        deletedAt: null,
        sourceType: "OPEN_HOUSE",
        sourceId: { in: [...visitorIds, openHouseId] },
      },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
      },
      orderBy: [{ dueAt: "asc" }],
    });

    return NextResponse.json({
      data: { drafts: openHouse.drafts, followUps },
    });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

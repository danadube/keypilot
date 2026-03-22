import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { apiErrorFromCaught } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const openHouseId = params.id;

    const openHouse = await prismaAdmin.openHouse.findFirst({
      where: {
        id: openHouseId,
        hostUserId: user.id,
        deletedAt: null,
      },
      include: {
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

    return NextResponse.json({ data: openHouse.drafts });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

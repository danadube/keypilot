import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const openHouseId = params.id;

    const openHouse = await prisma.openHouse.findFirst({
      where: {
        id: openHouseId,
        hostUserId: user.id,
        deletedAt: null,
      },
      include: {
        visitors: {
          include: { contact: true },
          orderBy: { submittedAt: "desc" },
        },
      },
    });

    if (!openHouse) {
      return NextResponse.json(
        { error: { message: "Open house not found" } },
        { status: 404 }
      );
    }

    const visitors = openHouse.visitors.map((v) => ({
      ...v,
      contact: v.contact,
    }));

    return NextResponse.json({ data: visitors });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: { message } },
      { status: err instanceof Error && message === "Unauthorized" ? 401 : 500 }
    );
  }
}

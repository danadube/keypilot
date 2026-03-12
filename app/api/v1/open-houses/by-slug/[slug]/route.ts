import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Public API - no auth required.
 * Returns open house info by QR slug for the public sign-in page.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const openHouse = await prisma.openHouse.findFirst({
      where: {
        qrSlug: slug,
        deletedAt: null,
        status: { in: ["SCHEDULED", "ACTIVE"] },
      },
      include: { property: true },
    });
    if (!openHouse) {
      return NextResponse.json(
        { error: { message: "Open house not found" } },
        { status: 404 }
      );
    }
    return NextResponse.json({
      data: {
        id: openHouse.id,
        title: openHouse.title,
        startAt: openHouse.startAt,
        endAt: openHouse.endAt,
        property: {
          address1: openHouse.property.address1,
          address2: openHouse.property.address2,
          city: openHouse.property.city,
          state: openHouse.property.state,
          zip: openHouse.property.zip,
        },
      },
    });
  } catch {
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}

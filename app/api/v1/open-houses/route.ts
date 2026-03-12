import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreateOpenHouseSchema } from "@/lib/validations/open-house";
import { generateQrSlug } from "@/lib/slugify";
import { ActivityType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const openHouses = await prisma.openHouse.findMany({
      where: {
        hostUserId: user.id,
        deletedAt: null,
        ...(status ? { status: status as "DRAFT" | "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED" } : {}),
      },
      include: {
        property: true,
        _count: { select: { visitors: true } },
      },
      orderBy: { startAt: "desc" },
    });
    return NextResponse.json({ data: openHouses });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json(
      { error: { message } },
      { status: e instanceof Error && e.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const parsed = CreateOpenHouseSchema.parse(body);
    let qrSlug = generateQrSlug();
    let exists = await prisma.openHouse.findUnique({
      where: { qrSlug },
    });
    while (exists) {
      qrSlug = generateQrSlug();
      exists = await prisma.openHouse.findUnique({ where: { qrSlug } });
    }
    const openHouse = await prisma.openHouse.create({
      data: {
        ...parsed,
        hostUserId: user.id,
        qrSlug,
      },
      include: { property: true },
    });
    const address = [
      openHouse.property.address1,
      openHouse.property.city,
      openHouse.property.state,
    ].join(", ");
    await prisma.activity.create({
      data: {
        activityType: ActivityType.OPEN_HOUSE_CREATED,
        body: `Open house created for ${address}`,
        occurredAt: new Date(),
        openHouseId: openHouse.id,
      },
    });
    return NextResponse.json({ data: openHouse });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }
    const zod = (e as { errors?: unknown[] })?.errors;
    const message = zod?.length
      ? "Validation failed"
      : e instanceof Error ? e.message : "Failed to create open house";
    return NextResponse.json(
      { error: { message } },
      { status: zod?.length ? 400 : 500 }
    );
  }
}

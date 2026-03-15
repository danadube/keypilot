import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreateOpenHouseSchema } from "@/lib/validations/open-house";
import { generateQrSlug } from "@/lib/slugify";
import { ActivityType } from "@prisma/client";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { trackUsageEvent } from "@/lib/track-usage";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const openHouses = await prisma.openHouse.findMany({
      where: {
        OR: [
          { hostUserId: user.id },
          { listingAgentId: user.id },
          { hostAgentId: user.id },
        ],
        deletedAt: null,
        ...(status ? { status: status as "DRAFT" | "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED" } : {}),
      },
      include: {
        property: true,
        listingAgent: { select: { id: true, name: true, email: true } },
        hostAgent: { select: { id: true, name: true, email: true } },
        _count: { select: { visitors: true } },
      },
      orderBy: { startAt: "desc" },
    });
    return NextResponse.json({ data: openHouses });
  } catch (e) {
    return apiErrorFromCaught(e);
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
    const property = await prisma.property.findUnique({
      where: { id: parsed.propertyId },
    });
    if (!property) return apiError("Property not found", 404);
    const listingAgentId = parsed.listingAgentId ?? property.createdByUserId;
    const hostAgentId = parsed.hostAgentId ?? listingAgentId;

    const openHouse = await prisma.openHouse.create({
      data: {
        propertyId: parsed.propertyId,
        title: parsed.title,
        startAt: parsed.startAt,
        endAt: parsed.endAt,
        notes: parsed.notes?.trim() || null,
        agentName: parsed.agentName?.trim() || null,
        agentEmail: parsed.agentEmail?.trim() || null,
        agentPhone: parsed.agentPhone?.trim() || null,
        hostUserId: user.id,
        listingAgentId,
        hostAgentId,
        qrSlug,
      },
      include: { property: true, listingAgent: true, hostAgent: true },
    });

    await prisma.openHouseHost.upsert({
      where: {
        openHouseId_userId: { openHouseId: openHouse.id, userId: listingAgentId },
      },
      create: {
        openHouseId: openHouse.id,
        userId: listingAgentId,
        role: "LISTING_AGENT",
      },
      update: { role: "LISTING_AGENT" },
    });
    const address = [
      openHouse.property.address1,
      openHouse.property.city,
      openHouse.property.state,
    ].join(", ");
    await prisma.activity.create({
      data: {
        activityType: ActivityType.OPEN_HOUSE_CREATED,
        body: `Showing created for ${address}`,
        occurredAt: new Date(),
        openHouseId: openHouse.id,
      },
    });
    void trackUsageEvent(user.id, "open_house_created", { openHouseId: openHouse.id });
    return NextResponse.json({ data: openHouse });
  } catch (e) {
    const zod = (e as { errors?: unknown[] })?.errors;
    if (zod?.length) return apiError("Validation failed", 400);
    return apiErrorFromCaught(e);
  }
}

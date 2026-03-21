import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UpdateOpenHouseSchema } from "@/lib/validations/open-house";
import { generateQrCodeDataUrl } from "@/lib/qr";
import { OpenHouseStatus } from "@prisma/client";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const openHouse = await prisma.openHouse.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { hostUserId: user.id },
          { listingAgentId: user.id },
          { hostAgentId: user.id },
        ],
      },
      include: {
        property: true,
        listingAgent: { select: { id: true, name: true, email: true } },
        hostAgent: { select: { id: true, name: true, email: true } },
        visitors: {
          include: { contact: true },
        },
        drafts: {
          where: { deletedAt: null },
        },
      },
    });
    if (!openHouse) {
      return NextResponse.json(
        { error: { message: "Open house not found" } },
        { status: 404 }
      );
    }
    const total = openHouse.visitors.length;
    const hasAgentTrue = openHouse.visitors.filter(
      (v) => v.contact.hasAgent === true
    ).length;
    const hasAgentFalse = openHouse.visitors.filter(
      (v) => v.contact.hasAgent === false
    ).length;
    const unknownAgentStatus = openHouse.visitors.filter(
      (v) => v.contact.hasAgent === null
    ).length;
    const draftStatusCounts = {
      DRAFT: openHouse.drafts.filter((d) => d.status === "DRAFT").length,
      REVIEWED: openHouse.drafts.filter((d) => d.status === "REVIEWED").length,
      SENT_MANUAL: openHouse.drafts.filter((d) => d.status === "SENT_MANUAL")
        .length,
      ARCHIVED: openHouse.drafts.filter((d) => d.status === "ARCHIVED").length,
    };
    const qrCodeDataUrl = await generateQrCodeDataUrl(openHouse.qrSlug);
    return NextResponse.json({
      data: {
        ...openHouse,
        _count: { visitors: total },
        visitorBreakdown: {
          total,
          hasAgentTrue,
          hasAgentFalse,
          unknownAgentStatus,
        },
        draftStatusCounts,
        qrCodeDataUrl,
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const existing = await prisma.openHouse.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { hostUserId: user.id },
          { listingAgentId: user.id },
          { hostAgentId: user.id },
        ],
      },
    });
    if (!existing) {
      return NextResponse.json(
        { error: { message: "Open house not found" } },
        { status: 404 }
      );
    }
    const body = await req.json();
    const parsed = UpdateOpenHouseSchema.parse(body);
    const {
      propertyId,
      title,
      startAt,
      endAt,
      status,
      listingAgentId,
      hostAgentId,
      agentName,
      agentEmail,
      agentPhone,
      notes,
      trafficLevel,
      feedbackTags,
      hostNotes,
    } = parsed;
    const updateData: Record<string, unknown> = {};
    if (propertyId !== undefined) updateData.propertyId = propertyId;
    if (title !== undefined) updateData.title = title;
    if (startAt !== undefined) updateData.startAt = startAt;
    if (endAt !== undefined) updateData.endAt = endAt;
    if (status !== undefined) updateData.status = status;
    if (listingAgentId !== undefined) updateData.listingAgentId = listingAgentId;
    if (hostAgentId !== undefined) updateData.hostAgentId = hostAgentId;
    if (agentName !== undefined) updateData.agentName = agentName?.trim() || null;
    if (agentEmail !== undefined) updateData.agentEmail = agentEmail?.trim() || null;
    if (agentPhone !== undefined) updateData.agentPhone = agentPhone?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (trafficLevel !== undefined) updateData.trafficLevel = trafficLevel;
    if (feedbackTags !== undefined) updateData.feedbackTags = feedbackTags;
    if (hostNotes !== undefined) updateData.hostNotes = hostNotes?.trim() || null;
    const openHouse = await prisma.openHouse.update({
      where: { id },
      data: updateData,
      include: { property: true, listingAgent: true, hostAgent: true },
    });
    // Sync denormalized columns → open_house_hosts junction table (Option A: denorm is authority).
    // When listingAgentId or hostAgentId changes, upsert the new agent's junction record.
    // Stale records from prior agents are left in the junction table — they are harmless
    // under Option A because open_house_hosts RLS cascades through open_houses, which
    // checks the current denormalized columns, not junction rows.
    const effectiveListingAgentId = openHouse.listingAgentId ?? openHouse.hostUserId;
    await prisma.openHouseHost.upsert({
      where: {
        openHouseId_userId: { openHouseId: id, userId: effectiveListingAgentId },
      },
      create: {
        openHouseId: id,
        userId: effectiveListingAgentId,
        role: "LISTING_AGENT",
      },
      update: { role: "LISTING_AGENT" },
    });
    if (openHouse.hostAgentId && openHouse.hostAgentId !== effectiveListingAgentId) {
      await prisma.openHouseHost.upsert({
        where: {
          openHouseId_userId: { openHouseId: id, userId: openHouse.hostAgentId },
        },
        create: {
          openHouseId: id,
          userId: openHouse.hostAgentId,
          role: "HOST_AGENT",
        },
        update: { role: "HOST_AGENT" },
      });
    }
    return NextResponse.json({ data: openHouse });
  } catch (e) {
    const zod = (e as { errors?: unknown[] })?.errors;
    if (zod?.length) return apiError("Validation failed", 400);
    return apiErrorFromCaught(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const openHouse = await prisma.openHouse.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { hostUserId: user.id },
          { listingAgentId: user.id },
          { hostAgentId: user.id },
        ],
      },
    });
    if (!openHouse) {
      return NextResponse.json(
        { error: { message: "Open house not found" } },
        { status: 404 }
      );
    }
    if (
      openHouse.status === OpenHouseStatus.SCHEDULED ||
      openHouse.status === OpenHouseStatus.ACTIVE
    ) {
      await prisma.openHouse.update({
        where: { id },
        data: { status: OpenHouseStatus.CANCELLED },
      });
    } else {
      await prisma.openHouse.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    }
    return NextResponse.json({ data: { deleted: true } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

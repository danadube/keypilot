import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import {
  ArchiveOpenHouseBodySchema,
  RestoreOpenHouseBodySchema,
  UpdateOpenHouseSchema,
} from "@/lib/validations/open-house";
import { generateQrCodeDataUrl } from "@/lib/qr";
import { type Prisma } from "@prisma/client";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

type OpenHouseVisitorWithContact = Prisma.OpenHouseVisitorGetPayload<{
  include: { contact: true };
}>;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const openHouseBase = await prismaAdmin.openHouse.findFirst({
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
        hosts: {
          where: { role: { in: ["HOST_AGENT", "ASSISTANT"] } },
          select: { id: true },
        },
      },
    });
    if (!openHouseBase) {
      return NextResponse.json(
        { error: { message: "Open house not found" } },
        { status: 404 }
      );
    }

    let visitors: OpenHouseVisitorWithContact[] = [];
    try {
      visitors = await prismaAdmin.openHouseVisitor.findMany({
        where: { openHouseId: id },
        include: { contact: true },
      });
    } catch (e) {
      console.error("[open-houses GET] visitors_load_failed", e);
    }

    let drafts: Awaited<ReturnType<typeof prismaAdmin.followUpDraft.findMany>> =
      [];
    try {
      drafts = await prismaAdmin.followUpDraft.findMany({
        where: { openHouseId: id, deletedAt: null },
      });
    } catch (e) {
      console.error("[open-houses GET] drafts_load_failed", e);
    }

    const openHouse = {
      ...openHouseBase,
      property: openHouseBase.property
        ? {
            ...openHouseBase.property,
            listingPrice:
              openHouseBase.property.listingPrice != null
                ? Number(openHouseBase.property.listingPrice)
                : null,
          }
        : openHouseBase.property,
      visitors,
      drafts,
    };

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
    const visitorIds = openHouse.visitors.map((v) => v.id);
    const sourceIdsForOh = [...visitorIds, id];
    let taskFollowUps: Awaited<ReturnType<typeof prismaAdmin.followUp.findMany>> = [];
    try {
      taskFollowUps = await prismaAdmin.followUp.findMany({
        where: {
          createdByUserId: user.id,
          deletedAt: null,
          sourceType: "OPEN_HOUSE",
          sourceId: { in: sourceIdsForOh },
        },
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
        },
        orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      });
    } catch (e) {
      console.error("[open-houses GET] taskFollowUps_failed", e);
    }

    let qrCodeDataUrl: string | null = null;
    try {
      qrCodeDataUrl = await generateQrCodeDataUrl(openHouse.qrSlug);
    } catch (e) {
      console.error("[open-houses GET] qr_failed", e);
    }

    const [draftRowCount, sellerReportCount] = await Promise.all([
      prismaAdmin.followUpDraft.count({
        where: { openHouseId: id, deletedAt: null },
      }),
      prismaAdmin.sellerReport.count({ where: { openHouseId: id } }),
    ]);

    return NextResponse.json({
      data: {
        ...openHouse,
        taskFollowUps,
        _count: { visitors: total },
        visitorBreakdown: {
          total,
          hasAgentTrue,
          hasAgentFalse,
          unknownAgentStatus,
        },
        draftStatusCounts,
        qrCodeDataUrl,
        usage: {
          visitors: total,
          followUpDrafts: draftRowCount,
          sellerReports: sellerReportCount,
        },
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
    const body = await req.json();

    const openHouseAccessWhere = {
      id,
      deletedAt: null,
      OR: [
        { hostUserId: user.id },
        { listingAgentId: user.id },
        { hostAgentId: user.id },
      ],
    };

    if (ArchiveOpenHouseBodySchema.safeParse(body).success) {
      const row = await prismaAdmin.openHouse.findFirst({
        where: openHouseAccessWhere,
      });
      if (!row) {
        return NextResponse.json(
          { error: { message: "Open house not found" } },
          { status: 404 }
        );
      }
      await prismaAdmin.openHouse.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return NextResponse.json({ data: { archived: true, id } });
    }

    if (RestoreOpenHouseBodySchema.safeParse(body).success) {
      const archived = await prismaAdmin.openHouse.findFirst({
        where: {
          id,
          deletedAt: { not: null },
          OR: [
            { hostUserId: user.id },
            { listingAgentId: user.id },
            { hostAgentId: user.id },
          ],
        },
      });
      if (!archived) {
        return NextResponse.json(
          { error: { message: "Open house not found or not archived" } },
          { status: 404 }
        );
      }
      await prismaAdmin.openHouse.update({
        where: { id },
        data: { deletedAt: null },
      });
      return NextResponse.json({ data: { restored: true, id } });
    }

    const active = await prismaAdmin.openHouse.findFirst({
      where: openHouseAccessWhere,
    });
    if (!active) {
      return NextResponse.json(
        { error: { message: "Open house not found" } },
        { status: 404 }
      );
    }

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
      prepChecklistFlags,
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
    if (prepChecklistFlags !== undefined) {
      updateData.prepChecklistFlags = prepChecklistFlags;
    }
    const openHouse = await prismaAdmin.openHouse.update({
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
    await prismaAdmin.openHouseHost.upsert({
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
      await prismaAdmin.openHouseHost.upsert({
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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const force = req.nextUrl.searchParams.get("force") === "1";
    const openHouse = await prismaAdmin.openHouse.findFirst({
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
    const [visitorCount, draftCount, sellerReportCount] = await Promise.all([
      prismaAdmin.openHouseVisitor.count({ where: { openHouseId: id } }),
      prismaAdmin.followUpDraft.count({
        where: { openHouseId: id, deletedAt: null },
      }),
      prismaAdmin.sellerReport.count({ where: { openHouseId: id } }),
    ]);
    if (!force && (visitorCount > 0 || draftCount > 0 || sellerReportCount > 0)) {
      return NextResponse.json(
        {
          error: {
            code: "HAS_DEPENDENCIES",
            message:
              "This open house has visitors, drafts, or seller reports. Archive it instead, or delete with confirmation.",
            visitors: visitorCount,
            followUpDrafts: draftCount,
            sellerReports: sellerReportCount,
          },
        },
        { status: 409 }
      );
    }
    await prismaAdmin.openHouse.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ data: { deleted: true } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

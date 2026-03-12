import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UpdateOpenHouseSchema } from "@/lib/validations/open-house";
import { generateQrCodeDataUrl } from "@/lib/qr";
import { OpenHouseStatus } from "@prisma/client";

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
        hostUserId: user.id,
        deletedAt: null,
      },
      include: {
        property: true,
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
    const message = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json(
      { error: { message } },
      { status: e instanceof Error && e.message === "Unauthorized" ? 401 : 500 }
    );
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
        hostUserId: user.id,
        deletedAt: null,
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
    const openHouse = await prisma.openHouse.update({
      where: { id },
      data: parsed,
      include: { property: true },
    });
    return NextResponse.json({ data: openHouse });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }
    const zod = (e as { errors?: unknown[] })?.errors;
    const message = zod?.length
      ? "Validation failed"
      : e instanceof Error ? e.message : "Failed to update open house";
    return NextResponse.json(
      { error: { message } },
      { status: zod?.length ? 400 : 500 }
    );
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
        hostUserId: user.id,
        deletedAt: null,
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
    const message = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json(
      { error: { message } },
      { status: e instanceof Error && e.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ActivityType } from "@prisma/client";
import type { SellerReportMetrics } from "@/types";
import { apiErrorFromCaught } from "@/lib/api-response";

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
    });

    if (!openHouse) {
      return NextResponse.json(
        { error: { message: "Open house not found" } },
        { status: 404 }
      );
    }

    const report = await prisma.sellerReport.findFirst({
      where: { openHouseId },
      orderBy: { createdAt: "desc" },
    });

    if (!report) {
      return NextResponse.json(
        { error: { message: "No report found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: report });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

export async function POST(
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
        visitors: { include: { contact: true } },
        drafts: { where: { deletedAt: null } },
      },
    });

    if (!openHouse) {
      return NextResponse.json(
        { error: { message: "Open house not found" } },
        { status: 404 }
      );
    }

    const visitors = openHouse.visitors;
    const totalVisitors = visitors.length;
    const representedBuyers = visitors.filter(
      (v) => v.contact.hasAgent === true
    ).length;
    const unrepresentedBuyers = visitors.filter(
      (v) => v.contact.hasAgent === false
    ).length;
    const unknownAgentStatus = visitors.filter(
      (v) => v.contact.hasAgent === null || v.contact.hasAgent === undefined
    ).length;
    const followUpDraftsCreated = openHouse.drafts.length;
    const visitorComments = visitors
      .map((v) => v.contact.notes)
      .filter((n): n is string => Boolean(n && n.trim()));

    const reportJson: SellerReportMetrics = {
      totalVisitors,
      representedBuyers,
      unrepresentedBuyers,
      unknownAgentStatus,
      followUpDraftsCreated,
      visitorComments,
    };

    const report = await prisma.sellerReport.create({
      data: {
        openHouseId,
        generatedByUserId: user.id,
        reportJson: reportJson as object,
      },
    });

    await prisma.activity.create({
      data: {
        openHouseId,
        activityType: ActivityType.SELLER_REPORT_GENERATED,
        body: "Seller report generated",
        occurredAt: new Date(),
      },
    });

    return NextResponse.json({ data: report });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

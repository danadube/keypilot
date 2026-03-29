/**
 * Property-level seller report for ShowingHQ.
 * Returns traffic (visitors, flyer sent/opened), engagement (follow-ups sent), and feedback summary.
 * Prepared for future email/weekly delivery; no automation in this pass.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import {
  aggregateFeedbackSummary,
  excerptEmailFeedbackRaw,
  type FeedbackEmailReplyEntry,
} from "@/lib/feedback-summary";
import { apiErrorFromCaught } from "@/lib/api-response";
import type { SellerReportData } from "@/lib/seller-report";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { propertyId } = await params;

    const property = await prismaAdmin.property.findFirst({
      where: {
        id: propertyId,
        createdByUserId: user.id,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!property) {
      return NextResponse.json(
        { error: { message: "Property not found" } },
        { status: 404 }
      );
    }

    const openHouses = await prismaAdmin.openHouse.findMany({
      where: {
        propertyId,
        hostUserId: user.id,
        deletedAt: null,
      },
      select: { id: true },
    });
    const openHouseIds = openHouses.map((oh) => oh.id);

    let traffic = {
      visitorCount: 0,
      flyerSentCount: 0,
      flyerOpenedCount: 0,
    };

    if (openHouseIds.length > 0) {
      const visitors = await prismaAdmin.openHouseVisitor.findMany({
        where: { openHouseId: { in: openHouseIds } },
        select: {
          id: true,
          flyerEmailSentAt: true,
          flyerLinkClickedAt: true,
        },
      });
      traffic = {
        visitorCount: visitors.length,
        flyerSentCount: visitors.filter((v) => v.flyerEmailSentAt != null).length,
        flyerOpenedCount: visitors.filter((v) => v.flyerLinkClickedAt != null).length,
      };
    }

    const followUpsSentCount =
      openHouseIds.length === 0
        ? 0
        : await prismaAdmin.followUpDraft.count({
            where: {
              openHouseId: { in: openHouseIds },
              status: "SENT_MANUAL",
              deletedAt: null,
            },
          });

    const requests = await prismaAdmin.feedbackRequest.findMany({
      where: { propertyId },
      select: {
        id: true,
        status: true,
        interestLevel: true,
        reasons: true,
        note: true,
        respondedAt: true,
      },
    });
    const feedback = aggregateFeedbackSummary(requests);

    const replyRows = await prismaAdmin.showing.findMany({
      where: {
        propertyId,
        hostUserId: user.id,
        deletedAt: null,
        buyerAgentEmailReplyAt: { not: null },
      },
      select: {
        id: true,
        buyerAgentEmailReplyAt: true,
        buyerAgentEmailReplyFrom: true,
        buyerAgentEmailReplyRaw: true,
        buyerAgentEmailReplyParsed: true,
      },
      orderBy: { buyerAgentEmailReplyAt: "desc" },
      take: 20,
    });

    const feedbackEmailReplies: FeedbackEmailReplyEntry[] = replyRows.map((r) => ({
      id: `email-${r.id}`,
      showingId: r.id,
      source: "EMAIL_REPLY",
      receivedAt: (r.buyerAgentEmailReplyAt ?? new Date()).toISOString(),
      from: r.buyerAgentEmailReplyFrom,
      excerpt: excerptEmailFeedbackRaw(r.buyerAgentEmailReplyRaw),
      rawAvailable: Boolean(r.buyerAgentEmailReplyRaw?.trim()),
      parsed: r.buyerAgentEmailReplyParsed,
    }));

    const data: SellerReportData = {
      traffic,
      engagement: { followUpsSentCount },
      feedback,
      feedbackEmailReplies,
    };

    return NextResponse.json({ data });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

/**
 * Property-level feedback summary for ShowingHQ.
 * Aggregates FeedbackRequest data for a property (owned by current user).
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { aggregateFeedbackSummary } from "@/lib/feedback-summary";
import { apiErrorFromCaught } from "@/lib/api-response";

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
    });
    if (!property) {
      return NextResponse.json(
        { error: { message: "Property not found" } },
        { status: 404 }
      );
    }

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

    const summary = aggregateFeedbackSummary(requests);

    return NextResponse.json({
      data: {
        ...summary,
        byInterest: summary.byInterest,
        byReason: summary.byReason,
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

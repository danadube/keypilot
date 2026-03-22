/**
 * ShowingHQ feedback requests — list FeedbackRequest records for the current user.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();

    const requests = await prismaAdmin.feedbackRequest.findMany({
      where: { hostUserId: user.id },
      include: {
        showing: { select: { scheduledAt: true, buyerAgentName: true, buyerAgentEmail: true } },
        property: { select: { address1: true, city: true, state: true } },
      },
      orderBy: { requestedAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      data: requests.map((r) => ({
        id: r.id,
        token: r.token,
        status: r.status,
        requestedAt: r.requestedAt.toISOString(),
        expiresAt: r.expiresAt?.toISOString() ?? null,
        interestLevel: r.interestLevel,
        reasons: Array.isArray(r.reasons) ? r.reasons : r.reasons,
        note: r.note,
        respondedAt: r.respondedAt?.toISOString() ?? null,
        showing: {
          scheduledAt: r.showing.scheduledAt.toISOString(),
          buyerAgentName: r.showing.buyerAgentName,
          buyerAgentEmail: r.showing.buyerAgentEmail,
        },
        property: r.property,
      })),
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

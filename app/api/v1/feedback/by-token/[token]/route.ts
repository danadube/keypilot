/**
 * Public API - no auth. Load feedback request by token for the response form.
 */

import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token?.trim()) {
      return NextResponse.json(
        { error: { message: "Invalid link" } },
        { status: 400 }
      );
    }

    const request = await prismaAdmin.feedbackRequest.findUnique({
      where: { token: token.trim() },
      include: {
        property: { select: { address1: true, address2: true, city: true, state: true, zip: true } },
        showing: { select: { scheduledAt: true, buyerAgentName: true } },
      },
    });

    if (!request) {
      return NextResponse.json(
        { error: { message: "Feedback link not found" } },
        { status: 404 }
      );
    }

    if (request.status === "RESPONDED") {
      return NextResponse.json({
        data: {
          status: "RESPONDED",
          message: "Thank you — we already received your feedback.",
          property: request.property,
        },
      });
    }

    if (request.status === "EXPIRED") {
      return NextResponse.json({
        data: {
          status: "EXPIRED",
          message: "This feedback link has expired.",
          property: request.property,
        },
      });
    }

    return NextResponse.json({
      data: {
        status: "PENDING",
        property: request.property,
        scheduledAt: request.showing.scheduledAt,
        buyerAgentName: request.showing.buyerAgentName,
      },
    });
  } catch (e) {
    console.error("[feedback by-token]", e);
    return NextResponse.json(
      { error: { message: "Something went wrong" } },
      { status: 500 }
    );
  }
}

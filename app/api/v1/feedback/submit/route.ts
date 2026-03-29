/**
 * Public API - no auth. Submit feedback for a request (by token).
 */

import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/db";
import { SubmitFeedbackSchema } from "@/lib/validations/feedback";
import { apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SubmitFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: "Invalid input", code: "VALIDATION_ERROR" } },
        { status: 400 }
      );
    }

    const request = await prismaAdmin.feedbackRequest.findUnique({
      where: { token: parsed.data.token.trim() },
    });

    if (!request) {
      return NextResponse.json(
        { error: { message: "Feedback link not found" } },
        { status: 404 }
      );
    }

    if (request.status !== "PENDING") {
      return NextResponse.json(
        { error: { message: "This feedback link is no longer accepting responses." } },
        { status: 400 }
      );
    }

    const now = new Date();
    if (request.expiresAt && request.expiresAt.getTime() < now.getTime()) {
      return NextResponse.json(
        { error: { message: "This feedback link has expired." } },
        { status: 410 }
      );
    }

    await prismaAdmin.feedbackRequest.update({
      where: { id: request.id },
      data: {
        status: "RESPONDED",
        interestLevel: parsed.data.interestLevel,
        reasons: parsed.data.reasons?.length ? parsed.data.reasons : [],
        note: parsed.data.note?.trim() || null,
        respondedAt: now,
      },
    });

    await prismaAdmin.showing.update({
      where: { id: request.showingId },
      data: { feedbackRequestStatus: "RECEIVED" },
    });

    return NextResponse.json({
      data: { success: true, message: "Thank you for your feedback." },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

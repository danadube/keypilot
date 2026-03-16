/**
 * Public API - no auth. Submit feedback for a request (by token).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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

    const request = await prisma.feedbackRequest.findUnique({
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
        { error: { message: "This feedback request is no longer accepting responses" } },
        { status: 400 }
      );
    }

    const now = new Date();
    await prisma.feedbackRequest.update({
      where: { id: request.id },
      data: {
        status: "RESPONDED",
        interestLevel: parsed.data.interestLevel,
        reasons: parsed.data.reasons?.length ? parsed.data.reasons : [],
        note: parsed.data.note?.trim() || null,
        respondedAt: now,
      },
    });

    await prisma.showing.update({
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

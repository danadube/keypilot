/**
 * Host feedback API — token-authenticated (no Clerk).
 * Allows invited hosts to update traffic, tags, notes.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { HostFeedbackSchema } from "@/lib/validations/open-house";
import { apiErrorFromCaught } from "@/lib/api-response";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const invite = await prisma.openHouseHostInvite.findFirst({
      where: { token, expiresAt: { gt: new Date() }, acceptedAt: null },
      include: { openHouse: true },
    });
    if (!invite) {
      return NextResponse.json(
        { error: { message: "Invite not found or expired" } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = HostFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: parsed.error.issues[0]?.message ?? "Invalid input" } },
        { status: 400 }
      );
    }

    const { trafficLevel, feedbackTags, hostNotes } = parsed.data;
    await prisma.openHouse.update({
      where: { id: invite.openHouseId },
      data: {
        trafficLevel: trafficLevel ?? null,
        feedbackTags: feedbackTags === null ? Prisma.JsonNull : feedbackTags,
        hostNotes: hostNotes ?? null,
      },
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

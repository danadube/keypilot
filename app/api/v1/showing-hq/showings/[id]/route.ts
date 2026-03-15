/**
 * PATCH /api/v1/showing-hq/showings/[id] — reschedule a showing (e.g. from calendar drag).
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RescheduleShowingSchema } from "@/lib/validations/showing";
import { apiErrorFromCaught } from "@/lib/api-response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const body = await req.json();
    const parsed = RescheduleShowingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: "Validation failed", code: "VALIDATION_ERROR" } },
        { status: 400 }
      );
    }

    const existing = await prisma.showing.findFirst({
      where: { id, hostUserId: user.id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json(
        { error: { message: "Showing not found" } },
        { status: 404 }
      );
    }

    const showing = await prisma.showing.update({
      where: { id },
      data: { scheduledAt: parsed.data.scheduledAt },
      include: { property: true },
    });

    return NextResponse.json({ data: showing });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

/**
 * GET /api/v1/showing-hq/showings/[id] — fetch one showing for edit modal.
 * PATCH — reschedule and/or update property, notes.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { UpdateShowingSchema } from "@/lib/validations/showing";
import { apiErrorFromCaught } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const showing = await prismaAdmin.showing.findFirst({
      where: { id, hostUserId: user.id, deletedAt: null },
      include: {
        property: true,
        feedbackRequests: { orderBy: { requestedAt: "desc" }, take: 1 },
      },
    });
    if (!showing) {
      return NextResponse.json(
        { error: { message: "Showing not found" } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: showing });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateShowingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: "Validation failed", code: "VALIDATION_ERROR" } },
        { status: 400 }
      );
    }

    const existing = await prismaAdmin.showing.findFirst({
      where: { id, hostUserId: user.id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json(
        { error: { message: "Showing not found" } },
        { status: 404 }
      );
    }

    const updateData: {
      scheduledAt?: Date;
      propertyId?: string;
      notes?: string | null;
      feedbackRequestStatus?: string;
    } = {};
    if (parsed.data.scheduledAt !== undefined) updateData.scheduledAt = parsed.data.scheduledAt;
    if (parsed.data.propertyId !== undefined) updateData.propertyId = parsed.data.propertyId;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes ?? null;
    if (parsed.data.feedbackRequestStatus !== undefined) {
      updateData.feedbackRequestStatus = parsed.data.feedbackRequestStatus;
    }

    const showing = await prismaAdmin.showing.update({
      where: { id },
      data: updateData,
      include: { property: true },
    });

    return NextResponse.json({ data: showing });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

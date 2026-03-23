/**
 * Single Supra queue item — fetch and update (review workflow).
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { UpdateSupraQueueItemSchema } from "@/lib/validations/supra-queue";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import type { Prisma } from "@prisma/client";
import { SupraQueueState } from "@prisma/client";

export const dynamic = "force-dynamic";

const itemInclude = {
  matchedProperty: {
    select: { id: true, address1: true, city: true, state: true, zip: true },
  },
  matchedShowing: {
    select: { id: true, scheduledAt: true, propertyId: true },
  },
} as const;

const terminalStates: SupraQueueState[] = [
  SupraQueueState.DISMISSED,
  SupraQueueState.DUPLICATE,
  SupraQueueState.APPLIED,
  SupraQueueState.FAILED_PARSE,
];

async function assertPropertyOwned(userId: string, propertyId: string | null | undefined) {
  if (propertyId == null) return;
  const p = await prismaAdmin.property.findFirst({
    where: { id: propertyId, createdByUserId: userId, deletedAt: null },
  });
  if (!p) {
    const err = new Error("Property not found");
    (err as Error & { code?: string }).code = "NOT_FOUND";
    throw err;
  }
}

async function assertShowingOwned(userId: string, showingId: string | null | undefined) {
  if (showingId == null) return;
  const s = await prismaAdmin.showing.findFirst({
    where: { id: showingId, hostUserId: userId, deletedAt: null },
  });
  if (!s) {
    const err = new Error("Showing not found");
    (err as Error & { code?: string }).code = "NOT_FOUND";
    throw err;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const item = await prismaAdmin.supraQueueItem.findFirst({
      where: { id, hostUserId: user.id },
      include: itemInclude,
    });
    if (!item) {
      return apiError("Queue item not found", 404, "NOT_FOUND");
    }
    return NextResponse.json({ data: item });
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
    const existing = await prismaAdmin.supraQueueItem.findFirst({
      where: { id, hostUserId: user.id },
    });
    if (!existing) {
      return apiError("Queue item not found", 404, "NOT_FOUND");
    }

    const body = await req.json();
    const parsed = UpdateSupraQueueItemSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, "VALIDATION_ERROR");
    }

    const d = parsed.data;
    if (d.matchedPropertyId !== undefined) {
      await assertPropertyOwned(user.id, d.matchedPropertyId);
    }
    if (d.matchedShowingId !== undefined) {
      await assertShowingOwned(user.id, d.matchedShowingId);
    }

    const data: Prisma.SupraQueueItemUpdateInput = {};
    if (d.subject !== undefined) data.subject = d.subject;
    if (d.rawBodyText !== undefined) data.rawBodyText = d.rawBodyText;
    if (d.sender !== undefined) data.sender = d.sender;
    if (d.parsedAddress1 !== undefined) data.parsedAddress1 = d.parsedAddress1;
    if (d.parsedCity !== undefined) data.parsedCity = d.parsedCity;
    if (d.parsedState !== undefined) data.parsedState = d.parsedState;
    if (d.parsedZip !== undefined) data.parsedZip = d.parsedZip;
    if (d.parsedScheduledAt !== undefined) data.parsedScheduledAt = d.parsedScheduledAt;
    if (d.parsedEventKind !== undefined) data.parsedEventKind = d.parsedEventKind;
    if (d.parsedStatus !== undefined) data.parsedStatus = d.parsedStatus;
    if (d.parsedAgentName !== undefined) data.parsedAgentName = d.parsedAgentName;
    if (d.parsedAgentEmail !== undefined)
      data.parsedAgentEmail = d.parsedAgentEmail?.trim() || null;
    if (d.parseConfidence !== undefined) data.parseConfidence = d.parseConfidence;
    if (d.proposedAction !== undefined) data.proposedAction = d.proposedAction;
    if (d.matchedPropertyId !== undefined) {
      data.matchedProperty = d.matchedPropertyId
        ? { connect: { id: d.matchedPropertyId } }
        : { disconnect: true };
    }
    if (d.matchedShowingId !== undefined) {
      data.matchedShowing = d.matchedShowingId
        ? { connect: { id: d.matchedShowingId } }
        : { disconnect: true };
    }
    if (d.propertyMatchStatus !== undefined)
      data.propertyMatchStatus = d.propertyMatchStatus;
    if (d.showingMatchStatus !== undefined)
      data.showingMatchStatus = d.showingMatchStatus;
    if (d.resolutionNotes !== undefined) data.resolutionNotes = d.resolutionNotes;

    if (d.queueState !== undefined) {
      data.queueState = d.queueState;
      if (terminalStates.includes(d.queueState)) {
        data.reviewedAt = new Date();
        data.reviewedBy = { connect: { id: user.id } };
      }
    }

    const item = await prismaAdmin.supraQueueItem.update({
      where: { id },
      data,
      include: itemInclude,
    });

    return NextResponse.json({ data: item });
  } catch (e) {
    const code = e instanceof Error ? (e as Error & { code?: string }).code : undefined;
    if (code === "NOT_FOUND") {
      return apiError("Property or showing not found", 404, "NOT_FOUND");
    }
    return apiErrorFromCaught(e);
  }
}

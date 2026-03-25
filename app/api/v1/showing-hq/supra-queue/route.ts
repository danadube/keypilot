/**
 * Supra review queue — list and manual create (testing / future ingestion).
 */

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { CreateSupraQueueItemSchema } from "@/lib/validations/supra-queue";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { SupraQueueState } from "@prisma/client";

export const dynamic = "force-dynamic";

const listInclude = {
  matchedProperty: {
    select: { id: true, address1: true, city: true, state: true, zip: true },
  },
  matchedShowing: {
    select: { id: true, scheduledAt: true },
  },
} as const;

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const stateParam = req.nextUrl.searchParams.get("state")?.trim();
    let queueState: SupraQueueState | undefined;
    if (stateParam) {
      const allowed = Object.values(SupraQueueState) as string[];
      if (!allowed.includes(stateParam)) {
        return apiError("Invalid state filter", 400, "VALIDATION_ERROR");
      }
      queueState = stateParam as SupraQueueState;
    }

    const items = await prismaAdmin.supraQueueItem.findMany({
      where: {
        hostUserId: user.id,
        ...(queueState ? { queueState } : {}),
      },
      orderBy: { receivedAt: "desc" },
      take: 200,
      include: listInclude,
    });

    return NextResponse.json({ data: items });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const parsed = CreateSupraQueueItemSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, "VALIDATION_ERROR");
    }

    const d = parsed.data;
    const hasParsed =
      d.parsedAddress1 ||
      d.parsedCity ||
      d.parsedScheduledAt != null ||
      d.parsedEventKind;

    const queueState =
      d.queueState ??
      (hasParsed ? SupraQueueState.NEEDS_REVIEW : SupraQueueState.INGESTED);

    const item = await prismaAdmin.supraQueueItem.create({
      data: {
        hostUserId: user.id,
        externalMessageId: d.externalMessageId.trim(),
        subject: d.subject.trim(),
        receivedAt: d.receivedAt,
        rawBodyText: d.rawBodyText,
        sender: d.sender?.trim() || null,
        parsedAddress1: d.parsedAddress1?.trim() || null,
        parsedCity: d.parsedCity?.trim() || null,
        parsedState: d.parsedState?.trim() || null,
        parsedZip: d.parsedZip?.trim() || null,
        parsedScheduledAt: d.parsedScheduledAt ?? null,
        parsedShowingBeganAt: d.parsedShowingBeganAt ?? null,
        parsedEventKind: d.parsedEventKind?.trim() || null,
        parsedStatus: d.parsedStatus?.trim() || null,
        parsedAgentName: d.parsedAgentName?.trim() || null,
        parsedAgentEmail: d.parsedAgentEmail?.trim() || null,
        parseConfidence: d.parseConfidence ?? undefined,
        proposedAction: d.proposedAction ?? undefined,
        queueState,
        propertyMatchStatus: d.propertyMatchStatus ?? undefined,
        showingMatchStatus: d.showingMatchStatus ?? undefined,
      },
      include: listInclude,
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return apiError("A queue item with this message id already exists", 409, "DUPLICATE");
    }
    return apiErrorFromCaught(e);
  }
}

/**
 * Run stub/manual parser on raw queue content → fills parsed proposal fields, NEEDS_REVIEW.
 * Swap `buildManualParseDraftFromRaw` for the real parser when ready.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { SupraQueueState } from "@prisma/client";
import { buildManualParseDraftFromRaw } from "@/lib/integrations/supra/manual-parse-stub";

export const dynamic = "force-dynamic";

const listInclude = {
  matchedProperty: {
    select: { id: true, address1: true, city: true, state: true },
  },
  matchedShowing: {
    select: { id: true, scheduledAt: true },
  },
} as const;

const BLOCKED: SupraQueueState[] = [
  SupraQueueState.APPLIED,
  SupraQueueState.DISMISSED,
  SupraQueueState.DUPLICATE,
];

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const item = await prismaAdmin.supraQueueItem.findFirst({
      where: { id, hostUserId: user.id },
    });
    if (!item) {
      return apiError("Queue item not found", 404, "NOT_FOUND");
    }

    if (BLOCKED.includes(item.queueState)) {
      return apiError(
        "Cannot generate a parse draft for this queue state.",
        400,
        "INVALID_STATE"
      );
    }

    const draft = buildManualParseDraftFromRaw({
      subject: item.subject,
      rawBodyText: item.rawBodyText,
      sender: item.sender,
    });

    const updated = await prismaAdmin.supraQueueItem.update({
      where: { id },
      data: {
        parsedAddress1: draft.parsedAddress1,
        parsedCity: draft.parsedCity,
        parsedState: draft.parsedState,
        parsedZip: draft.parsedZip,
        parsedScheduledAt: draft.parsedScheduledAt,
        parsedEventKind: draft.parsedEventKind,
        parsedStatus: draft.parsedStatus,
        parsedAgentName: draft.parsedAgentName,
        parsedAgentEmail: draft.parsedAgentEmail,
        parseConfidence: draft.parseConfidence,
        proposedAction: draft.proposedAction,
        queueState: SupraQueueState.NEEDS_REVIEW,
      },
      include: listInclude,
    });

    return NextResponse.json({
      data: {
        item: updated,
        stub: true,
        message:
          "Draft fields were filled by the stub parser (low confidence). Review and edit before apply.",
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

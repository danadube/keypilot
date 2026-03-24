/**
 * Run Supra v1 email parser on raw queue content → fills parsed proposal fields, NEEDS_REVIEW.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { SupraQueueState } from "@prisma/client";
import { applySupraV1ParseDraftToQueueItem } from "@/lib/showing-hq/supra-queue-apply-parse-draft";

export const dynamic = "force-dynamic";

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
      select: { queueState: true },
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

    const result = await applySupraV1ParseDraftToQueueItem({
      hostUserId: user.id,
      queueItemId: id,
    });

    if (!result.ok) {
      if (result.code === "NOT_FOUND") {
        return apiError("Queue item not found", 404, "NOT_FOUND");
      }
      return apiError(
        "Cannot generate a parse draft for this queue state.",
        400,
        "INVALID_STATE"
      );
    }

    return NextResponse.json({
      data: {
        item: result.item,
        parserVersion: "supra_v1",
        message:
          "Draft fields were filled by the Supra v1 parser. Review all fields before apply — especially date/time and address.",
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

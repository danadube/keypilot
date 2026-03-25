/**
 * Dev/testing: bulk-delete Supra queue rows for the current user.
 * Default: removes all rows except APPLIED (does not touch Property or Showing records).
 */

import { NextResponse } from "next/server";
import { SupraQueueState } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** Kept for audit trail of rows that already wrote to KeyPilot. */
const KEEP_STATE = SupraQueueState.APPLIED;

export async function POST() {
  try {
    const user = await getCurrentUser();

    const result = await prismaAdmin.supraQueueItem.deleteMany({
      where: {
        hostUserId: user.id,
        queueState: { not: KEEP_STATE },
      },
    });

    return NextResponse.json({
      data: {
        deletedCount: result.count,
        keptState: KEEP_STATE,
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

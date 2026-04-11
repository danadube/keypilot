import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { userHasFarmTrackrAccess } from "@/lib/farm-trackr/require-module";
import { ContactFarmMembershipStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/** Soft-remove a contact from a farm area. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!userHasFarmTrackrAccess(user)) {
      return apiError("FarmTrackr is not enabled for this account", 403);
    }
    const { id } = await params;
    const now = new Date();

    const ok = await withRLSContext(user.id, async (tx) => {
      const existing = await tx.contactFarmMembership.findFirst({
        where: {
          id,
          userId: user.id,
          status: ContactFarmMembershipStatus.ACTIVE,
          archivedAt: null,
        },
      });
      if (!existing) return false;
      await tx.contactFarmMembership.update({
        where: { id },
        data: {
          status: ContactFarmMembershipStatus.ARCHIVED,
          archivedAt: now,
        },
      });
      return true;
    });

    if (!ok) return apiError("Membership not found", 404);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

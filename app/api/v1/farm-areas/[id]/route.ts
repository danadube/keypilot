import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { userHasFarmTrackrAccess } from "@/lib/farm-trackr/require-module";
import { PatchFarmAreaSchema } from "@/lib/validations/farm-segmentation";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!userHasFarmTrackrAccess(user)) {
      return apiError("FarmTrackr is not enabled for this account", 403);
    }
    const { id } = await params;
    const body = await req.json();
    const parsed = PatchFarmAreaSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Validation error", 400);
    }

    const updated = await withRLSContext(user.id, async (tx) => {
      const existing = await tx.farmArea.findFirst({
        where: { id, userId: user.id, deletedAt: null },
      });
      if (!existing) return null;

      const data = parsed.data;
      return tx.farmArea.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        },
      });
    });

    if (!updated) return apiError("Farm area not found", 404);
    return NextResponse.json({ data: updated });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

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
      const existing = await tx.farmArea.findFirst({
        where: { id, userId: user.id, deletedAt: null },
      });
      if (!existing) return false;

      await tx.contactFarmMembership.updateMany({
        where: { farmAreaId: id, userId: user.id, deletedAt: null },
        data: { deletedAt: now },
      });
      await tx.farmArea.update({
        where: { id },
        data: { deletedAt: now },
      });
      return true;
    });

    if (!ok) return apiError("Farm area not found", 404);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { userHasFarmTrackrAccess } from "@/lib/farm-trackr/require-module";
import { CreateFarmAreaSchema } from "@/lib/validations/farm-segmentation";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!userHasFarmTrackrAccess(user)) {
      return apiError("FarmTrackr is not enabled for this account", 403);
    }
    const { id: territoryId } = await params;
    const body = await req.json();
    const parsed = CreateFarmAreaSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Validation error", 400);
    }

    const row = await withRLSContext(user.id, async (tx) => {
      const territory = await tx.farmTerritory.findFirst({
        where: { id: territoryId, userId: user.id, deletedAt: null },
      });
      if (!territory) return null;

      return tx.farmArea.create({
        data: {
          territoryId,
          userId: user.id,
          name: parsed.data.name.trim(),
          description: parsed.data.description?.trim() || null,
          sortOrder: parsed.data.sortOrder ?? 0,
        },
      });
    });

    if (!row) return apiError("Territory not found", 404);
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { userHasFarmTrackrAccess } from "@/lib/farm-trackr/require-module";
import { CreateFarmTerritorySchema } from "@/lib/validations/farm-segmentation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!userHasFarmTrackrAccess(user)) {
      return apiError("FarmTrackr is not enabled for this account", 403);
    }

    const territories = await withRLSContext(user.id, (tx) =>
      tx.farmTerritory.findMany({
        where: { userId: user.id, deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          areas: {
            where: { deletedAt: null },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: {
              id: true,
              name: true,
              description: true,
              sortOrder: true,
              createdAt: true,
            },
          },
        },
      })
    );

    return NextResponse.json({ data: territories });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!userHasFarmTrackrAccess(user)) {
      return apiError("FarmTrackr is not enabled for this account", 403);
    }

    const body = await req.json();
    const parsed = CreateFarmTerritorySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Validation error", 400);
    }

    const row = await withRLSContext(user.id, (tx) =>
      tx.farmTerritory.create({
        data: {
          userId: user.id,
          name: parsed.data.name.trim(),
          description: parsed.data.description?.trim() || null,
          sortOrder: parsed.data.sortOrder ?? 0,
        },
      })
    );

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

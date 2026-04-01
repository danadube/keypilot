import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext, withRLSContextOrFallbackAdmin } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const CreateTerritorySchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const { territories, areas } = await withRLSContextOrFallbackAdmin(
      user.id,
      "farm-territories:get",
      async (tx) => {
        const territories = await tx.farmTerritory.findMany({
          where: { userId: user.id, deletedAt: null },
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
          },
          orderBy: { name: "asc" },
        });

        const areas = await tx.farmArea.findMany({
          where: { userId: user.id, deletedAt: null },
          select: { id: true, territoryId: true },
        });

        return { territories, areas };
      }
    );

    const areaCountByTerritoryId = new Map<string, number>();
    for (const area of areas) {
      areaCountByTerritoryId.set(
        area.territoryId,
        (areaCountByTerritoryId.get(area.territoryId) ?? 0) + 1
      );
    }

    return NextResponse.json({
      data: territories.map((territory) => ({
        ...territory,
        areaCount: areaCountByTerritoryId.get(territory.id) ?? 0,
      })),
    });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const body = await req.json();
    const parsed = CreateTerritorySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const territory = await withRLSContext(user.id, (tx) =>
      tx.farmTerritory.create({
        data: {
          userId: user.id,
          name: parsed.data.name,
          description: parsed.data.description ?? null,
        },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
        },
      })
    );

    return NextResponse.json({ data: { ...territory, areaCount: 0 } }, { status: 201 });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

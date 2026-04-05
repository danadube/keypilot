import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext, withRLSContextOrFallbackAdmin } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { parseFarmStructureVisibility } from "@/lib/validations/farm-structure-visibility";

export const dynamic = "force-dynamic";

function territoryWhere(
  userId: string,
  visibility: ReturnType<typeof parseFarmStructureVisibility>
): Prisma.FarmTerritoryWhereInput {
  const base: Prisma.FarmTerritoryWhereInput = { userId };
  if (visibility === "active") return { ...base, deletedAt: null };
  if (visibility === "archived") return { ...base, deletedAt: { not: null } };
  return base;
}

function areaCountWhere(
  territoryId: string,
  visibility: ReturnType<typeof parseFarmStructureVisibility>
): Prisma.FarmAreaWhereInput {
  const base: Prisma.FarmAreaWhereInput = { territoryId };
  if (visibility === "active") return { ...base, deletedAt: null };
  if (visibility === "archived") return { ...base, deletedAt: { not: null } };
  return base;
}

const territorySelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  deletedAt: true,
} as const;

const CreateTerritorySchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const visibility = parseFarmStructureVisibility(
      new URL(req.url).searchParams.get("visibility")
    );

    const territories = await withRLSContextOrFallbackAdmin(
      user.id,
      "farm-territories:get",
      async (tx) => {
        if (visibility === "archived") {
          const [deletedTerritories, activeWithArchivedAreas] = await Promise.all([
            tx.farmTerritory.findMany({
              where: { userId: user.id, deletedAt: { not: null } },
              select: territorySelect,
            }),
            tx.farmTerritory.findMany({
              where: {
                userId: user.id,
                deletedAt: null,
                areas: { some: { deletedAt: { not: null } } },
              },
              select: territorySelect,
            }),
          ]);

          const byId = new Map<string, (typeof deletedTerritories)[0]>();
          for (const t of deletedTerritories) byId.set(t.id, t);
          for (const t of activeWithArchivedAreas) byId.set(t.id, t);
          const rows = Array.from(byId.values()).sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          );

          const counts = await Promise.all(
            rows.map((t) =>
              tx.farmArea.count({
                where: areaCountWhere(t.id, "archived"),
              })
            )
          );

          return rows.map((t, i) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            createdAt: t.createdAt,
            archived: t.deletedAt != null,
            areaCount: counts[i] ?? 0,
          }));
        }

        const rows = await tx.farmTerritory.findMany({
          where: territoryWhere(user.id, visibility),
          select: territorySelect,
          orderBy: { name: "asc" },
        });

        const counts = await Promise.all(
          rows.map((t) =>
            tx.farmArea.count({
              where: areaCountWhere(t.id, visibility),
            })
          )
        );

        return rows.map((t, i) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          createdAt: t.createdAt,
          archived: t.deletedAt != null,
          areaCount: counts[i] ?? 0,
        }));
      }
    );

    return NextResponse.json({ data: territories });
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

    return NextResponse.json(
      { data: { ...territory, areaCount: 0, archived: false } },
      { status: 201 }
    );
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { ContactFarmMembershipStatus } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { parseFarmStructureVisibility } from "@/lib/validations/farm-structure-visibility";

export const dynamic = "force-dynamic";

function farmAreaListWhere(
  userId: string,
  visibility: ReturnType<typeof parseFarmStructureVisibility>
): Prisma.FarmAreaWhereInput {
  const base: Prisma.FarmAreaWhereInput = { userId };
  if (visibility === "active") {
    return {
      ...base,
      deletedAt: null,
      territory: { deletedAt: null },
    };
  }
  if (visibility === "archived") {
    return {
      ...base,
      OR: [{ deletedAt: { not: null } }, { territory: { deletedAt: { not: null } } }],
    };
  }
  return base;
}

const CreateFarmAreaSchema = z
  .object({
    territoryId: z.string().min(1),
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

    // prismaAdmin + strict userId: farm RLS is not universally deployed; avoids 500 when
    // SET LOCAL ROLE / keypilot_app setup fails while DATABASE_URL is a BYPASSRLS role.
    const areas = await prismaAdmin.farmArea.findMany({
      where: farmAreaListWhere(user.id, visibility),
      select: {
        id: true,
        name: true,
        territoryId: true,
        description: true,
        deletedAt: true,
        territory: {
          select: { id: true, name: true, deletedAt: true },
        },
      },
      orderBy: [{ territory: { name: "asc" } }, { name: "asc" }],
    });

    const areaIds = areas.map((area) => area.id);
    const membershipCountByAreaId = new Map<string, number>();
    if (areaIds.length > 0) {
      const membershipRows = await prismaAdmin.contactFarmMembership.findMany({
        where: {
          userId: user.id,
          farmAreaId: { in: areaIds },
          status: ContactFarmMembershipStatus.ACTIVE,
        },
        select: { farmAreaId: true },
      });
      for (const row of membershipRows) {
        membershipCountByAreaId.set(
          row.farmAreaId,
          (membershipCountByAreaId.get(row.farmAreaId) ?? 0) + 1
        );
      }
    }

    return NextResponse.json({
      data: areas.map((area) => {
        const { deletedAt: areaDeletedAt, territory, ...rest } = area;
        const archived = areaDeletedAt != null || territory.deletedAt != null;
        return {
          ...rest,
          territory: { id: territory.id, name: territory.name },
          archived,
          membershipCount: membershipCountByAreaId.get(area.id) ?? 0,
        };
      }),
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
    const parsed = CreateFarmAreaSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const territory = await prismaAdmin.farmTerritory.findFirst({
      where: {
        id: parsed.data.territoryId,
        userId: user.id,
        deletedAt: null,
      },
      select: { id: true, name: true },
    });
    if (!territory) {
      return apiError("Territory not found", 404);
    }

    const area = await prismaAdmin.farmArea.create({
      data: {
        userId: user.id,
        territoryId: parsed.data.territoryId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
      },
      select: {
        id: true,
        name: true,
        territoryId: true,
        description: true,
        territory: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(
      { data: { ...area, membershipCount: 0, archived: false } },
      { status: 201 }
    );
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

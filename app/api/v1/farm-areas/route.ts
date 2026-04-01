import { NextRequest, NextResponse } from "next/server";
import { ContactFarmMembershipStatus } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext, withRLSContextOrFallbackAdmin } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const CreateFarmAreaSchema = z
  .object({
    territoryId: z.string().min(1),
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

    const { areas, membershipCountByAreaId } = await withRLSContextOrFallbackAdmin(
      user.id,
      "farm-areas:get",
      async (tx) => {
        const areas = await tx.farmArea.findMany({
          where: {
            userId: user.id,
            deletedAt: null,
            territory: { deletedAt: null },
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
          orderBy: [{ territory: { name: "asc" } }, { name: "asc" }],
        });

        const areaIds = areas.map((area) => area.id);
        const membershipCountByAreaId = new Map<string, number>();
        if (areaIds.length > 0) {
          const membershipRows = await tx.contactFarmMembership.findMany({
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

        return { areas, membershipCountByAreaId };
      }
    );

    return NextResponse.json({
      data: areas.map((area) => ({
        ...area,
        membershipCount: membershipCountByAreaId.get(area.id) ?? 0,
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
    const parsed = CreateFarmAreaSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const territory = await withRLSContext(user.id, (tx) =>
      tx.farmTerritory.findFirst({
        where: {
          id: parsed.data.territoryId,
          userId: user.id,
          deletedAt: null,
        },
        select: { id: true, name: true },
      })
    );
    if (!territory) {
      return apiError("Territory not found", 404);
    }

    const area = await withRLSContext(user.id, (tx) =>
      tx.farmArea.create({
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
      })
    );

    return NextResponse.json(
      { data: { ...area, membershipCount: 0 } },
      { status: 201 }
    );
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

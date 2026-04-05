import { NextRequest, NextResponse } from "next/server";
import { ContactFarmMembershipStatus } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const UpdateTerritorySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();

const ArchiveTerritorySchema = z.object({ archive: z.literal(true) }).strict();

const RestoreTerritorySchema = z.object({ restore: z.literal(true) }).strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return apiError("Territory not found", 404);
    }

    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const body = await req.json();
    const restoreParse = RestoreTerritorySchema.safeParse(body);
    if (restoreParse.success) {
      const archivedRow = await withRLSContext(user.id, (tx) =>
        tx.farmTerritory.findFirst({
          where: { id, userId: user.id, deletedAt: { not: null } },
          select: { id: true },
        })
      );
      if (!archivedRow) {
        return apiError("Archived territory not found", 404);
      }

      const { updated, areaCount } = await withRLSContext(user.id, async (tx) => {
        await tx.farmTerritory.update({
          where: { id },
          data: { deletedAt: null },
        });
        await tx.farmArea.updateMany({
          where: { territoryId: id, userId: user.id, deletedAt: { not: null } },
          data: { deletedAt: null },
        });
        const updated = await tx.farmTerritory.findFirstOrThrow({
          where: { id },
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
          },
        });
        const areaCount = await tx.farmArea.count({
          where: { territoryId: id, userId: user.id, deletedAt: null },
        });
        return { updated, areaCount };
      });

      return NextResponse.json({
        data: { ...updated, areaCount, archived: false },
      });
    }

    const existing = await withRLSContext(user.id, (tx) =>
      tx.farmTerritory.findFirst({
        where: { id, userId: user.id, deletedAt: null },
        select: { id: true },
      })
    );
    if (!existing) {
      return apiError("Territory not found", 404);
    }

    const archiveParse = ArchiveTerritorySchema.safeParse(body);
    if (archiveParse.success) {
      const now = new Date();
      await withRLSContext(user.id, async (tx) => {
        const areas = await tx.farmArea.findMany({
          where: {
            territoryId: id,
            userId: user.id,
            deletedAt: null,
          },
          select: { id: true },
        });
        const areaIds = areas.map((area) => area.id);
        await tx.farmTerritory.update({
          where: { id },
          data: { deletedAt: now },
        });
        await tx.farmArea.updateMany({
          where: { id: { in: areaIds } },
          data: { deletedAt: now },
        });
        if (areaIds.length > 0) {
          await tx.contactFarmMembership.updateMany({
            where: {
              farmAreaId: { in: areaIds },
              status: ContactFarmMembershipStatus.ACTIVE,
            },
            data: {
              status: ContactFarmMembershipStatus.ARCHIVED,
              archivedAt: now,
            },
          });
        }
      });

      return NextResponse.json({ data: { archived: true, id } });
    }

    const parsed = UpdateTerritorySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }
    if (Object.keys(parsed.data).length === 0) {
      return apiError("No changes submitted", 400);
    }

    const { updated, areaCount } = await withRLSContext(user.id, async (tx) => {
      const updated = await tx.farmTerritory.update({
        where: { id },
        data: parsed.data,
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
        },
      });

      const areaCount = await tx.farmArea.count({
        where: { territoryId: id, deletedAt: null },
      });

      return { updated, areaCount };
    });

    return NextResponse.json({
      data: { ...updated, areaCount, archived: false },
    });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

/** Permanent removal: territory, its areas, and all area memberships (contacts unchanged). DB cascades areas from territory. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return apiError("Territory not found", 404);
    }

    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const deleted = await withRLSContext(user.id, async (tx) => {
      const territory = await tx.farmTerritory.findFirst({
        where: { id, userId: user.id, deletedAt: null },
        select: { id: true },
      });
      if (!territory) {
        return false;
      }
      const areaRows = await tx.farmArea.findMany({
        where: { territoryId: id, userId: user.id, deletedAt: null },
        select: { id: true },
      });
      const areaIds = areaRows.map((a) => a.id);
      if (areaIds.length > 0) {
        await tx.contactFarmMembership.deleteMany({
          where: { farmAreaId: { in: areaIds }, userId: user.id },
        });
      }
      await tx.farmArea.deleteMany({
        where: { territoryId: id, userId: user.id },
      });
      await tx.farmTerritory.delete({ where: { id } });
      return true;
    });

    if (!deleted) {
      return apiError("Territory not found", 404);
    }

    return NextResponse.json({ data: { deleted: true, id } });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

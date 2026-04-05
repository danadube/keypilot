import { NextRequest, NextResponse } from "next/server";
import { ContactFarmMembershipStatus } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const UpdateFarmAreaSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();

const ArchiveFarmAreaSchema = z.object({ archive: z.literal(true) }).strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return apiError("Farm area not found", 404);
    }

    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const existing = await withRLSContext(user.id, (tx) =>
      tx.farmArea.findFirst({
        where: {
          id,
          userId: user.id,
          deletedAt: null,
          territory: { deletedAt: null },
        },
        select: { id: true },
      })
    );
    if (!existing) {
      return apiError("Farm area not found", 404);
    }

    const body = await req.json();
    const archiveParse = ArchiveFarmAreaSchema.safeParse(body);
    if (archiveParse.success) {
      const now = new Date();
      await withRLSContext(user.id, async (tx) => {
        await tx.farmArea.update({
          where: { id },
          data: { deletedAt: now },
        });
        await tx.contactFarmMembership.updateMany({
          where: {
            farmAreaId: id,
            status: ContactFarmMembershipStatus.ACTIVE,
          },
          data: {
            status: ContactFarmMembershipStatus.ARCHIVED,
          },
        });
      });
      return NextResponse.json({ data: { archived: true, id } });
    }

    const parsed = UpdateFarmAreaSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }
    if (Object.keys(parsed.data).length === 0) {
      return apiError("No changes submitted", 400);
    }

    const { updated, membershipCount } = await withRLSContext(user.id, async (tx) => {
      const updated = await tx.farmArea.update({
        where: { id },
        data: parsed.data,
        select: {
          id: true,
          name: true,
          territoryId: true,
          description: true,
          territory: { select: { id: true, name: true } },
        },
      });

      const membershipCount = await tx.contactFarmMembership.count({
        where: {
          farmAreaId: id,
          status: ContactFarmMembershipStatus.ACTIVE,
        },
      });

      return { updated, membershipCount };
    });

    return NextResponse.json({ data: { ...updated, membershipCount } });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

/** Permanent removal: memberships for this area, then the area row (contacts unchanged). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return apiError("Farm area not found", 404);
    }

    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const deleted = await withRLSContext(user.id, async (tx) => {
      const area = await tx.farmArea.findFirst({
        where: {
          id,
          userId: user.id,
          deletedAt: null,
          territory: { deletedAt: null },
        },
        select: { id: true },
      });
      if (!area) {
        return false;
      }
      await tx.contactFarmMembership.deleteMany({
        where: { farmAreaId: id, userId: user.id },
      });
      await tx.farmArea.delete({ where: { id } });
      return true;
    });

    if (!deleted) {
      return apiError("Farm area not found", 404);
    }

    return NextResponse.json({ data: { deleted: true, id } });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

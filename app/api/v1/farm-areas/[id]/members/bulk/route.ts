import { NextRequest, NextResponse } from "next/server";
import { ContactFarmMembershipStatus } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { filterAccessibleContactIds } from "@/lib/contacts/contact-access";
import { prismaAdmin } from "@/lib/db";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const MAX_IDS = 100;

const idList = z.array(z.string().min(1)).min(1).max(MAX_IDS);

const BulkBodySchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("add"),
      contactIds: idList,
    })
    .strict(),
  z
    .object({
      action: z.literal("archive"),
      contactIds: idList,
    })
    .strict(),
  z
    .object({
      action: z.literal("move"),
      contactIds: idList,
      targetFarmAreaId: z.string().min(1),
    })
    .strict(),
]);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const raw = await req.json();
    const parsed = BulkBodySchema.safeParse(raw);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const body = parsed.data;
    const farmAreaId = params.id;

    if (body.action === "move" && body.targetFarmAreaId === farmAreaId) {
      return apiError("Choose a different farm area to move contacts into", 400);
    }

    const accessible = await filterAccessibleContactIds(body.contactIds, user.id);
    const inaccessible = body.contactIds.length - accessible.length;

    const summary = await prismaAdmin.$transaction(async (tx) => {
      const sourceArea = await tx.farmArea.findFirst({
        where: {
          id: farmAreaId,
          userId: user.id,
          deletedAt: null,
          territory: { deletedAt: null },
        },
        select: { id: true },
      });
      if (!sourceArea) {
        throw new Error("AREA_NOT_FOUND");
      }

      if (body.action === "add") {
        let created = 0;
        let reactivated = 0;
        let skipped = 0;

        for (const contactId of accessible) {
          const existing = await tx.contactFarmMembership.findFirst({
            where: { contactId, farmAreaId },
            select: { id: true, status: true },
          });
          if (existing?.status === ContactFarmMembershipStatus.ACTIVE) {
            skipped += 1;
            continue;
          }
          if (existing) {
            await tx.contactFarmMembership.update({
              where: { id: existing.id },
              data: {
                userId: user.id,
                status: ContactFarmMembershipStatus.ACTIVE,
                archivedAt: null,
              },
            });
            reactivated += 1;
          } else {
            await tx.contactFarmMembership.create({
              data: {
                userId: user.id,
                contactId,
                farmAreaId,
                status: ContactFarmMembershipStatus.ACTIVE,
              },
            });
            created += 1;
          }
        }

        return {
          action: "add" as const,
          created,
          reactivated,
          skipped,
          archived: 0,
          moved: 0,
          inaccessible,
        };
      }

      if (body.action === "archive") {
        const archivedAt = new Date();
        const res = await tx.contactFarmMembership.updateMany({
          where: {
            farmAreaId,
            userId: user.id,
            status: ContactFarmMembershipStatus.ACTIVE,
            contactId: { in: accessible },
          },
          data: {
            status: ContactFarmMembershipStatus.ARCHIVED,
            archivedAt,
          },
        });
        return {
          action: "archive" as const,
          created: 0,
          reactivated: 0,
          skipped: accessible.length - res.count,
          archived: res.count,
          moved: 0,
          inaccessible,
        };
      }

      const targetArea = await tx.farmArea.findFirst({
        where: {
          id: body.targetFarmAreaId,
          userId: user.id,
          deletedAt: null,
          territory: { deletedAt: null },
        },
        select: { id: true },
      });
      if (!targetArea) {
        throw new Error("TARGET_NOT_FOUND");
      }

      let moved = 0;
      let skipped = 0;

      for (const contactId of accessible) {
        const sourceMembership = await tx.contactFarmMembership.findFirst({
          where: {
            contactId,
            farmAreaId,
            userId: user.id,
            status: ContactFarmMembershipStatus.ACTIVE,
          },
          select: { id: true },
        });
        if (!sourceMembership) {
          skipped += 1;
          continue;
        }

        await tx.contactFarmMembership.update({
          where: { id: sourceMembership.id },
          data: {
            status: ContactFarmMembershipStatus.ARCHIVED,
            archivedAt: new Date(),
          },
        });

        const existingTarget = await tx.contactFarmMembership.findFirst({
          where: { contactId, farmAreaId: body.targetFarmAreaId },
          select: { id: true, status: true },
        });
        if (existingTarget?.status === ContactFarmMembershipStatus.ACTIVE) {
          moved += 1;
          continue;
        }
        if (existingTarget) {
          await tx.contactFarmMembership.update({
            where: { id: existingTarget.id },
            data: {
              userId: user.id,
              status: ContactFarmMembershipStatus.ACTIVE,
              archivedAt: null,
            },
          });
        } else {
          await tx.contactFarmMembership.create({
            data: {
              userId: user.id,
              contactId,
              farmAreaId: body.targetFarmAreaId,
              status: ContactFarmMembershipStatus.ACTIVE,
            },
          });
        }
        moved += 1;
      }

      return {
        action: "move" as const,
        created: 0,
        reactivated: 0,
        skipped,
        archived: 0,
        moved,
        inaccessible,
      };
    });

    return NextResponse.json({ data: summary });
  } catch (err) {
    if (err instanceof Error && err.message === "AREA_NOT_FOUND") {
      return apiError("Farm area not found", 404);
    }
    if (err instanceof Error && err.message === "TARGET_NOT_FOUND") {
      return apiError("Target farm area not found", 404);
    }
    return apiErrorFromCaught(err);
  }
}

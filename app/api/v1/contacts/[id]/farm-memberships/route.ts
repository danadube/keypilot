import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { ContactFarmMembershipStatus } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

const CreateFarmMembershipSchema = z
  .object({
    farmAreaId: z.string().min(1),
    notes: z.string().max(5000).optional().nullable(),
  })
  .strict();

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    void req;
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const memberships = await withRLSContext(user.id, async (tx) => {
      const allowed = await tx.contact.findFirst({
        where: {
          id: params.id,
          deletedAt: null,
          ...contactAccessScope(user.id),
        },
        select: { id: true },
      });
      if (!allowed) {
        throw new Error("CONTACT_NOT_FOUND");
      }

      return tx.contactFarmMembership.findMany({
        where: {
          contactId: params.id,
          userId: user.id,
          status: ContactFarmMembershipStatus.ACTIVE,
          farmArea: {
            deletedAt: null,
            territory: { deletedAt: null },
          },
        },
        select: {
          id: true,
          status: true,
          notes: true,
          createdAt: true,
          farmArea: {
            select: {
              id: true,
              name: true,
              territory: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: [{ farmArea: { territory: { name: "asc" } } }, { farmArea: { name: "asc" } }],
      });
    });

    return NextResponse.json({ data: memberships });
  } catch (err) {
    if (err instanceof Error && err.message === "CONTACT_NOT_FOUND") {
      return apiError("Contact not found", 404);
    }
    return apiErrorFromCaught(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const body = await req.json();
    const parsed = CreateFarmMembershipSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const membership = await withRLSContext(user.id, async (tx) => {
      const allowed = await tx.contact.findFirst({
        where: {
          id: params.id,
          deletedAt: null,
          ...contactAccessScope(user.id),
        },
        select: { id: true },
      });
      if (!allowed) {
        throw new Error("CONTACT_NOT_FOUND");
      }

      const area = await tx.farmArea.findFirst({
        where: {
          id: parsed.data.farmAreaId,
          userId: user.id,
          deletedAt: null,
          territory: { deletedAt: null },
        },
        select: { id: true },
      });
      if (!area) {
        throw new Error("AREA_NOT_FOUND");
      }

      const existing = await tx.contactFarmMembership.findFirst({
        where: {
          contactId: params.id,
          farmAreaId: parsed.data.farmAreaId,
        },
        select: { id: true },
      });

      const membership = existing
        ? await tx.contactFarmMembership.update({
            where: { id: existing.id },
            data: {
              userId: user.id,
              status: ContactFarmMembershipStatus.ACTIVE,
              archivedAt: null,
              notes: parsed.data.notes ?? null,
            },
            select: {
              id: true,
              status: true,
              notes: true,
              createdAt: true,
              farmArea: {
                select: {
                  id: true,
                  name: true,
                  territory: { select: { id: true, name: true } },
                },
              },
            },
          })
        : await tx.contactFarmMembership.create({
            data: {
              userId: user.id,
              contactId: params.id,
              farmAreaId: parsed.data.farmAreaId,
              notes: parsed.data.notes ?? null,
              status: ContactFarmMembershipStatus.ACTIVE,
            },
            select: {
              id: true,
              status: true,
              notes: true,
              createdAt: true,
              farmArea: {
                select: {
                  id: true,
                  name: true,
                  territory: { select: { id: true, name: true } },
                },
              },
            },
          });
      return { membership, existing: Boolean(existing) };
    });

    return NextResponse.json({ data: membership.membership }, { status: membership.existing ? 200 : 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "CONTACT_NOT_FOUND") {
      return apiError("Contact not found", 404);
    }
    if (err instanceof Error && err.message === "AREA_NOT_FOUND") {
      return apiError("Farm area not found", 404);
    }
    return apiErrorFromCaught(err);
  }
}

function contactAccessScope(userId: string): Prisma.ContactWhereInput {
  return {
    OR: [
      { assignedToUserId: userId },
      {
        openHouseVisits: {
          some: {
            openHouse: { hostUserId: userId, deletedAt: null },
          },
        },
      },
      { deals: { some: { userId } } },
      {
        followUps: {
          some: { createdByUserId: userId, deletedAt: null },
        },
      },
      { followUpReminders: { some: { userId } } },
      { userActivities: { some: { userId } } },
      { contactTags: { some: { tag: { userId } } } },
    ],
  };
}

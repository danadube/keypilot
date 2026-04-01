import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { ContactFarmMembershipStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; membershipId: string } }
) {
  try {
    void req;
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const membershipId = await withRLSContext(user.id, async (tx) => {
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

      const membership = await tx.contactFarmMembership.findFirst({
        where: {
          id: params.membershipId,
          contactId: params.id,
          userId: user.id,
        },
        select: { id: true },
      });
      if (!membership) {
        throw new Error("MEMBERSHIP_NOT_FOUND");
      }

      await tx.contactFarmMembership.update({
        where: { id: membership.id },
        data: {
          status: ContactFarmMembershipStatus.ARCHIVED,
          archivedAt: new Date(),
        },
      });

      return membership.id;
    });

    return NextResponse.json({ data: { archived: true, id: membershipId } });
  } catch (err) {
    if (err instanceof Error && err.message === "CONTACT_NOT_FOUND") {
      return apiError("Contact not found", 404);
    }
    if (err instanceof Error && err.message === "MEMBERSHIP_NOT_FOUND") {
      return apiError("Membership not found", 404);
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

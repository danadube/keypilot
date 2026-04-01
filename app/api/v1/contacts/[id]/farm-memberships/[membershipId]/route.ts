import { NextResponse } from "next/server";
import { ContactFarmMembershipStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { canAccessContact } from "@/lib/contacts/contact-access";
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

    const allowed = await canAccessContact(params.id, user.id);
    if (!allowed) {
      return apiError("Contact not found", 404);
    }

    const membership = await prismaAdmin.contactFarmMembership.findFirst({
      where: {
        id: params.membershipId,
        contactId: params.id,
        userId: user.id,
      },
      select: { id: true },
    });
    if (!membership) {
      return apiError("Membership not found", 404);
    }

    await prismaAdmin.contactFarmMembership.update({
      where: { id: membership.id },
      data: {
        status: ContactFarmMembershipStatus.ARCHIVED,
        archivedAt: new Date(),
      },
    });

    return NextResponse.json({ data: { archived: true, id: membership.id } });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

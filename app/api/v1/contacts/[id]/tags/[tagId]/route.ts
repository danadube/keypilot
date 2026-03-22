import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/db";
import { withRLSContext } from "@/lib/db-context";
import { getCurrentUser } from "@/lib/auth";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

async function canAccessContact(contactId: string, userId: string) {
  const openHouses = await prismaAdmin.openHouse.findMany({
    where: { hostUserId: userId, deletedAt: null },
    select: { id: true },
  });
  const openHouseIds = openHouses.map((oh) => oh.id);
  const visitor = await prismaAdmin.openHouseVisitor.findFirst({
    where: {
      contactId,
      openHouseId: { in: openHouseIds },
    },
  });
  return !!visitor;
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    const { id: contactId, tagId } = await params;

    if (!(await canAccessContact(contactId, user.id))) {
      return apiError("Contact not found", 404);
    }

    const deleted = await withRLSContext(user.id, async (tx) => {
      const tag = await tx.tag.findFirst({ where: { id: tagId, userId: user.id } });
      if (!tag) return false;
      await tx.contactTag.deleteMany({ where: { contactId, tagId } });
      return true;
    });

    if (!deleted) return apiError("Tag not found", 404);

    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

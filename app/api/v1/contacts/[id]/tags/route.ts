import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/db";
import { withRLSContext } from "@/lib/db-context";
import { getCurrentUser } from "@/lib/auth";
import { hasCrmAccess } from "@/lib/product-tier";
import { AddTagToContactSchema } from "@/lib/validations/tag";
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    const { id: contactId } = await params;

    if (!(await canAccessContact(contactId, user.id))) {
      return apiError("Contact not found", 404);
    }

    const contactTags = await withRLSContext(user.id, (tx) =>
      tx.contactTag.findMany({
        where: { contactId },
        include: { tag: true },
      })
    );
    return NextResponse.json({ data: contactTags.map((ct) => ct.tag) });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    const { id: contactId } = await params;

    if (!(await canAccessContact(contactId, user.id))) {
      return apiError("Contact not found", 404);
    }

    const body = await req.json();
    const parsed = AddTagToContactSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message ?? "Validation failed",
        400
      );
    }

    const contactTag = await withRLSContext(user.id, async (tx) => {
      const tag = await tx.tag.upsert({
        where: { name_userId: { name: parsed.data.tagName, userId: user.id } },
        create: { name: parsed.data.tagName, userId: user.id },
        update: {},
      });
      return tx.contactTag.upsert({
        where: { contactId_tagId: { contactId, tagId: tag.id } },
        create: { contactId, tagId: tag.id },
        update: {},
        include: { tag: true },
      });
    });

    return NextResponse.json({ data: contactTag.tag });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

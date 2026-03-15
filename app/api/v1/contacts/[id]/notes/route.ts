import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requireCrmAccess } from "@/lib/product-tier";
import { AddNoteSchema } from "@/lib/validations/note";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

async function getContactIfOwned(contactId: string, userId: string) {
  const openHouses = await prisma.openHouse.findMany({
    where: { hostUserId: userId, deletedAt: null },
    select: { id: true },
  });
  const openHouseIds = openHouses.map((oh) => oh.id);

  const visitor = await prisma.openHouseVisitor.findFirst({
    where: {
      contactId,
      openHouseId: { in: openHouseIds },
    },
  });

  if (!visitor) return null;

  return prisma.contact.findFirst({
    where: { id: contactId, deletedAt: null },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    requireCrmAccess(user.productTier);
    const { id: contactId } = await params;

    const contact = await getContactIfOwned(contactId, user.id);
    if (!contact) {
      return apiError("Contact not found", 404);
    }

    const body = await req.json();
    const parsed = AddNoteSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message ?? "Validation failed",
        400
      );
    }

    const activity = await prisma.activity.create({
      data: {
        contactId,
        activityType: "NOTE_ADDED",
        body: parsed.data.body.trim(),
        occurredAt: new Date(),
      },
    });

    return NextResponse.json({ data: activity });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

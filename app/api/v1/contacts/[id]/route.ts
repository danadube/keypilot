import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasCrmAccess } from "@/lib/product-tier";
import { UpdateContactSchema } from "@/lib/validations/contact";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

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
    include: {
      contactTags: { include: { tag: true } },
      followUpReminders: {
        where: { userId, status: "PENDING" },
        orderBy: { dueAt: "asc" },
        take: 10,
      },
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const contact = await getContactIfOwned(params.id, user.id);

    if (!contact) {
      return NextResponse.json(
        { error: { message: "Contact not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: contact });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const contact = await getContactIfOwned(params.id, user.id);

    if (!contact) {
      return NextResponse.json(
        { error: { message: "Contact not found" } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = UpdateContactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: parsed.error.issues[0]?.message ?? "Validation error" } },
        { status: 400 }
      );
    }

    const data = { ...parsed.data };
    const updatingCrmFields =
      data.status !== undefined || data.assignedToUserId !== undefined;
    if (updatingCrmFields && !hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    if (data.assignedToUserId !== undefined && data.assignedToUserId !== null) {
      if (data.assignedToUserId !== user.id) {
        return NextResponse.json(
          { error: { message: "Can only assign contacts to yourself" } },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.contact.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

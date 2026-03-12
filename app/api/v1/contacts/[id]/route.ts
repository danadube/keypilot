import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { UpdateContactSchema } from "@/lib/validations/contact";

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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: { message } },
      { status: err instanceof Error && message === "Unauthorized" ? 401 : 500 }
    );
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

    const updated = await prisma.contact.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: { message } },
      { status: err instanceof Error && message === "Unauthorized" ? 401 : 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { LinkPrimaryContactBodySchema } from "@/lib/validations/property";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { canAccessContact } from "@/lib/contacts/contact-access";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id: propertyId } = await params;

    const property = await prismaAdmin.property.findFirst({
      where: {
        id: propertyId,
        createdByUserId: user.id,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!property) {
      return NextResponse.json({ error: { message: "Property not found" } }, { status: 404 });
    }

    const raw = await req.json();
    const parsed = LinkPrimaryContactBodySchema.safeParse(raw);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid body", 400);
    }
    const { contactId } = parsed.data;

    const allowed = await canAccessContact(contactId, user.id);
    if (!allowed) {
      return NextResponse.json({ error: { message: "Contact not found" } }, { status: 404 });
    }

    const updated = await prismaAdmin.property.update({
      where: { id: propertyId },
      data: { primaryLinkedContactId: contactId },
      include: {
        primaryLinkedContact: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json({
      data: {
        propertyId: updated.id,
        primaryLinkedContact: updated.primaryLinkedContact,
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { LinkPrimaryContactBodySchema } from "@/lib/validations/property";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import {
  canAccessContact,
  getContactIfAccessible,
} from "@/lib/contacts/contact-access";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id: propertyId } = await params;

    const property = await withRLSContext(user.id, (tx) =>
      tx.property.findFirst({
        where: { id: propertyId, deletedAt: null },
        select: { id: true },
      })
    );
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

    await withRLSContext(user.id, (tx) =>
      tx.property.update({
        where: { id: propertyId },
        data: { primaryLinkedContactId: contactId },
        select: { id: true },
      })
    );

    // Hydrate contact outside the RLS transaction: `contacts` RLS is narrower than
    // {@link canAccessContact} / {@link contactAccessScope} (e.g. manual `createdByUserId`),
    // so a nested `include` on `property.update` could yield null for a valid link.
    const contactRow = await getContactIfAccessible(contactId, user.id);
    if (!contactRow) {
      return NextResponse.json({ error: { message: "Contact not found" } }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        propertyId,
        primaryLinkedContact: {
          id: contactRow.id,
          firstName: contactRow.firstName,
          lastName: contactRow.lastName,
        },
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

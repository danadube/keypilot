import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessContact } from "@/lib/contacts/contact-access";
import { requireCrmAccess } from "@/lib/product-tier";
import { AddNoteSchema } from "@/lib/validations/note";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

async function getContactIfAccessible(contactId: string, userId: string) {
  const allowed = await canAccessContact(contactId, userId);
  if (!allowed) return null;
  return prismaAdmin.contact.findFirst({
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

    const contact = await getContactIfAccessible(contactId, user.id);
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

    const activity = await prismaAdmin.activity.create({
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

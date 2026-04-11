import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requireCrmAccess } from "@/lib/product-tier";
import { AddNoteSchema } from "@/lib/validations/note";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { canAccessContact } from "@/lib/contacts/contact-access";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    requireCrmAccess(user.productTier);
    const { id: contactId } = await params;

    if (!(await canAccessContact(contactId, user.id))) {
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

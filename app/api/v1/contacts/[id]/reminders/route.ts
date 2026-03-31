import { NextRequest, NextResponse } from "next/server";
import { withRLSContext } from "@/lib/db-context";
import { getCurrentUser } from "@/lib/auth";
import { hasCrmAccess } from "@/lib/product-tier";
import { CreateReminderSchema } from "@/lib/validations/reminder";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { canAccessContact } from "@/lib/contacts/contact-access";

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

    const reminders = await withRLSContext(user.id, (tx) =>
      tx.followUpReminder.findMany({
        where: { contactId, userId: user.id },
        orderBy: { dueAt: "asc" },
      })
    );
    return NextResponse.json({ data: reminders });
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
    const parsed = CreateReminderSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message ?? "Validation failed",
        400
      );
    }

    const reminder = await withRLSContext(user.id, (tx) =>
      tx.followUpReminder.create({
        data: {
          contactId,
          userId: user.id,
          dueAt: new Date(parsed.data.dueAt),
          body: parsed.data.body.trim(),
        },
      })
    );
    return NextResponse.json({ data: reminder });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasCrmAccess } from "@/lib/product-tier";
import { LogCommunicationSchema } from "@/lib/validations/communication";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { canAccessContact } from "@/lib/contacts/contact-access";

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
    const parsed = LogCommunicationSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message ?? "Validation failed",
        400
      );
    }

    const activityType =
      parsed.data.channel === "CALL" ? "CALL_LOGGED" : "EMAIL_LOGGED";
    const prefix =
      parsed.data.channel === "CALL" ? "Call logged: " : "Email logged: ";

    const activity = await prismaAdmin.activity.create({
      data: {
        contactId,
        activityType,
        body: prefix + parsed.data.body.trim(),
        occurredAt: new Date(),
      },
    });
    return NextResponse.json({ data: activity });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

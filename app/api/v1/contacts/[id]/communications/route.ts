import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasCrmAccess } from "@/lib/product-tier";
import { LogCommunicationSchema } from "@/lib/validations/communication";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { withRLSContextOrFallbackAdmin } from "@/lib/db-context";
import { appendContactOpenHouseTimelineActivity } from "@/lib/contacts/write-open-house-timeline-activity";

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

    const activity = await withRLSContextOrFallbackAdmin(
      user.id,
      "POST /api/v1/contacts/[id]/communications",
      async (tx) => {
        const c = await tx.contact.findFirst({
          where: { id: contactId, deletedAt: null },
          select: { id: true },
        });
        if (!c) {
          throw Object.assign(new Error("Contact not found or not accessible"), {
            status: 404,
          });
        }
        return appendContactOpenHouseTimelineActivity({
          contactId,
          activityType,
          body: prefix + parsed.data.body.trim(),
        });
      }
    );
    return NextResponse.json({ data: activity });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    if (e.status === 404) {
      return apiError(e.message ?? "Contact not found", 404);
    }
    return apiErrorFromCaught(err);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireCrmAccess } from "@/lib/product-tier";
import { AddNoteSchema } from "@/lib/validations/note";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { withRLSContextOrFallbackAdmin } from "@/lib/db-context";
import { appendContactOpenHouseTimelineActivity } from "@/lib/contacts/write-open-house-timeline-activity";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    requireCrmAccess(user.productTier);
    const { id: contactId } = await params;

    const body = await req.json();
    const parsed = AddNoteSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message ?? "Validation failed",
        400
      );
    }

    const activity = await withRLSContextOrFallbackAdmin(
      user.id,
      "POST /api/v1/contacts/[id]/notes",
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
          activityType: "NOTE_ADDED",
          body: parsed.data.body.trim(),
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

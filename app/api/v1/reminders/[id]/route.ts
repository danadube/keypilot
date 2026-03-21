import { NextRequest, NextResponse } from "next/server";
import { withRLSContext } from "@/lib/db-context";
import { getCurrentUser } from "@/lib/auth";
import { hasCrmAccess } from "@/lib/product-tier";
import { UpdateReminderSchema } from "@/lib/validations/reminder";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    const { id } = await params;

    const body = await req.json();
    const parsed = UpdateReminderSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message ?? "Validation failed",
        400
      );
    }

    const updated = await withRLSContext(user.id, async (tx) => {
      const existing = await tx.followUpReminder.findFirst({
        where: { id, userId: user.id },
        select: { id: true },
      });
      if (!existing) return null;
      return tx.followUpReminder.update({
        where: { id },
        data: { status: parsed.data.status },
      });
    });

    if (!updated) return apiError("Reminder not found", 404);
    return NextResponse.json({ data: updated });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

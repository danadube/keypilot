import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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

    const reminder = await prisma.followUpReminder.findFirst({
      where: { id, userId: user.id },
    });
    if (!reminder) {
      return apiError("Reminder not found", 404);
    }

    const body = await req.json();
    const parsed = UpdateReminderSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message ?? "Validation failed",
        400
      );
    }

    const updated = await prisma.followUpReminder.update({
      where: { id },
      data: { status: parsed.data.status },
    });
    return NextResponse.json({ data: updated });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

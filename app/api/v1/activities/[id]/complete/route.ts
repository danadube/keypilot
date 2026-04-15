import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { completeUserActivity } from "@/lib/activity-foundation";
import { recordFollowUpCompletionUserActivity } from "@/lib/activity/record-follow-up-completion-user-activity";
import { withRLSContext } from "@/lib/db-context";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { CompleteUserActivityBodySchema } from "@/lib/validations/user-activity";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const raw = await req.json().catch(() => ({}));
    const parsed = CompleteUserActivityBodySchema.safeParse(raw);
    if (!parsed.success) {
      return apiError("Invalid input", 400);
    }

    const activity = await withRLSContext(user.id, async (tx) => {
      const updated = await completeUserActivity(tx, {
        id,
        userId: user.id,
        completedAt: parsed.data.completedAt,
      });
      if (updated?.type === "FOLLOW_UP") {
        await recordFollowUpCompletionUserActivity(tx, {
          userId: user.id,
          title: updated.title,
          propertyId: updated.propertyId,
          contactId: updated.contactId,
        });
      }
      return updated;
    });

    if (!activity) {
      return NextResponse.json(
        { error: { message: "Activity not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: activity });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

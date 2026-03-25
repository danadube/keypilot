import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateUserActivity } from "@/lib/activity-foundation";
import { withRLSContext } from "@/lib/db-context";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { UpdateUserActivitySchema } from "@/lib/validations/user-activity";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateUserActivitySchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", 400);
    }

    const activity = await withRLSContext(user.id, (tx) =>
      updateUserActivity(tx, { id, userId: user.id, patch: parsed.data })
    );

    if (!activity) {
      return NextResponse.json(
        { error: { message: "Activity not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: activity });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    if (err.status === 404) {
      return NextResponse.json({ error: { message: err.message } }, { status: 404 });
    }
    return apiErrorFromCaught(e);
  }
}

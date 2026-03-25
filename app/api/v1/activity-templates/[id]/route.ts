import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateActivityTemplate } from "@/lib/activity-foundation";
import { withRLSContext } from "@/lib/db-context";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { UpdateActivityTemplateSchema } from "@/lib/validations/user-activity";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateActivityTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", 400);
    }

    const template = await withRLSContext(user.id, (tx) =>
      updateActivityTemplate(tx, { id, userId: user.id, patch: parsed.data })
    );

    if (!template) {
      return NextResponse.json(
        { error: { message: "Template not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: template });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

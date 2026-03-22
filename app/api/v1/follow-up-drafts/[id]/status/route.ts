import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { UpdateFollowUpStatusSchema } from "@/lib/validations/follow-up-draft";
import { apiErrorFromCaught } from "@/lib/api-response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const draft = await prismaAdmin.followUpDraft.findFirst({
      where: {
        id,
        deletedAt: null,
        openHouse: {
          hostUserId: user.id,
          deletedAt: null,
        },
      },
    });

    if (!draft) {
      return NextResponse.json(
        { error: { message: "Draft not found" } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = UpdateFollowUpStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: parsed.error.issues[0]?.message ?? "Validation failed" } },
        { status: 400 }
      );
    }

    const { status: newStatus } = parsed.data;

    // Do not allow transition to SENT_MANUAL without status being REVIEWED first
    if (newStatus === "SENT_MANUAL" && draft.status !== "REVIEWED") {
      return NextResponse.json(
        { error: { message: "Draft must be REVIEWED before marking as SENT_MANUAL" } },
        { status: 400 }
      );
    }

    const updated = await prismaAdmin.followUpDraft.update({
      where: { id },
      data: { status: newStatus },
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

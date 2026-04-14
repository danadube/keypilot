import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { UpdateFollowUpTaskSchema } from "@/lib/validations/follow-up-task";
import { scheduleOutboundSync, syncFollowUpOutbound } from "@/lib/google-calendar/outbound-sync";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateFollowUpTaskSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.flatten().formErrors.join("; ") || "Invalid body", 400);
    }

    const data: Prisma.FollowUpUpdateInput = {};
    if (parsed.data.title !== undefined) data.title = parsed.data.title.trim();
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes?.trim() || null;
    if (parsed.data.dueAt !== undefined) {
      const d = new Date(parsed.data.dueAt);
      if (Number.isNaN(d.getTime())) return apiError("Invalid dueAt", 400);
      data.dueAt = d;
    }
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.priority !== undefined) data.priority = parsed.data.priority;
    if (parsed.data.completedAt !== undefined) {
      data.completedAt =
        parsed.data.completedAt === null ? null : new Date(parsed.data.completedAt);
    }
    if (parsed.data.status === "CLOSED" && parsed.data.completedAt === undefined) {
      data.completedAt = new Date();
    }

    const ok = await withRLSContext(user.id, async (tx) => {
      const row = await tx.followUp.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      });
      if (!row) return false;
      await tx.followUp.update({ where: { id }, data });
      return true;
    });

    if (!ok) {
      return NextResponse.json({ error: { message: "Follow-up not found" } }, { status: 404 });
    }

    scheduleOutboundSync(() => syncFollowUpOutbound(user.id, id));

    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

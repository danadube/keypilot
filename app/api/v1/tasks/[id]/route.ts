import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { UpdateTaskSchema } from "@/lib/validations/task";
import { parseOptionalTaskDueAt } from "@/lib/tasks/parse-task-due-at";
import { recordTaskPilotCompletionUserActivity } from "@/lib/tasks/record-task-completion-user-activity";
import { scheduleOutboundSync, syncTaskOutbound } from "@/lib/google-calendar/outbound-sync";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.flatten().formErrors.join("; ") || "Invalid body", 400);
    }

    const data: Prisma.TaskUpdateInput = {};
    if (parsed.data.title !== undefined) data.title = parsed.data.title.trim();
    if (parsed.data.description !== undefined) data.description = parsed.data.description?.trim() || null;
    if (parsed.data.dueAt !== undefined) {
      data.dueAt =
        parsed.data.dueAt === null ? null : parseOptionalTaskDueAt(parsed.data.dueAt);
    }
    if (parsed.data.priority !== undefined) data.priority = parsed.data.priority;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.completedAt !== undefined) {
      data.completedAt =
        parsed.data.completedAt === null ? null : new Date(parsed.data.completedAt);
    }
    if (parsed.data.status === "COMPLETED" && parsed.data.completedAt === undefined) {
      data.completedAt = new Date();
    }
    if (parsed.data.status === "OPEN") {
      data.completedAt = null;
    }

    const nextStatusFromBody =
      parsed.data.status !== undefined ? parsed.data.status : undefined;

    const ok = await withRLSContext(user.id, async (tx) => {
      const row = await tx.task.findFirst({
        where: { id, userId: user.id },
        select: {
          id: true,
          status: true,
          title: true,
          propertyId: true,
          contactId: true,
        },
      });
      if (!row) return false;

      const nextStatus = nextStatusFromBody ?? row.status;
      const becameCompleted =
        row.status !== "COMPLETED" && nextStatus === "COMPLETED";

      await tx.task.update({ where: { id }, data });

      if (becameCompleted) {
        await recordTaskPilotCompletionUserActivity(tx, {
          userId: user.id,
          taskTitle: row.title,
          propertyId: row.propertyId,
          contactId: row.contactId,
        });
      }

      return true;
    });

    if (!ok) {
      return NextResponse.json({ error: { message: "Task not found" } }, { status: 404 });
    }

    scheduleOutboundSync(() => syncTaskOutbound(user.id, id));

    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const deleted = await withRLSContext(user.id, async (tx) => {
      const row = await tx.task.findFirst({
        where: { id, userId: user.id },
        select: { id: true },
      });
      if (!row) return false;
      await tx.task.delete({ where: { id } });
      return true;
    });

    if (!deleted) {
      return NextResponse.json({ error: { message: "Task not found" } }, { status: 404 });
    }

    scheduleOutboundSync(() => syncTaskOutbound(user.id, id));

    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

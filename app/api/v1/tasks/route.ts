import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContextOrFallbackAdmin } from "@/lib/db-context";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { CreateTaskSchema } from "@/lib/validations/task";
import { serializeTask, type TaskRow } from "@/lib/tasks/task-serialize";
import { bucketOpenTasksByDue } from "@/lib/tasks/task-buckets";
import { parseOptionalTaskDueAt } from "@/lib/tasks/parse-task-due-at";
import { scheduleOutboundSync, syncTaskOutbound } from "@/lib/google-calendar/outbound-sync";
import { recordTaskPilotCreatedUserActivity } from "@/lib/tasks/record-task-completion-user-activity";

export const dynamic = "force-dynamic";

const taskInclude = {
  contact: {
    select: { id: true, firstName: true, lastName: true },
  },
  property: {
    select: { id: true, address1: true, city: true, state: true, zip: true },
  },
} as const;

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const contactRaw = searchParams.get("contactId")?.trim() ?? "";
    if (contactRaw) {
      const p = z.string().uuid().safeParse(contactRaw);
      if (!p.success) return apiError("Invalid contactId", 400);
    }
    const contactFilter = contactRaw ? { contactId: contactRaw } : {};

    const propertyRaw = searchParams.get("propertyId")?.trim() ?? "";
    if (propertyRaw) {
      const p = z.string().uuid().safeParse(propertyRaw);
      if (!p.success) return apiError("Invalid propertyId", 400);
    }
    const propertyFilter = propertyRaw ? { propertyId: propertyRaw } : {};

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const { overdue, dueToday, upcoming, completed } = await withRLSContextOrFallbackAdmin(
      user.id,
      "GET /api/v1/tasks",
      async (tx) => {
        const openRows = await tx.task.findMany({
          where: {
            userId: user.id,
            status: "OPEN",
            ...contactFilter,
            ...propertyFilter,
          },
          include: taskInclude,
          orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
          take: 200,
        });
        const completedRows = await tx.task.findMany({
          where: {
            userId: user.id,
            status: "COMPLETED",
            ...contactFilter,
            ...propertyFilter,
          },
          include: taskInclude,
          orderBy: { completedAt: "desc" },
          take: 80,
        });
        const openSerialized = openRows.map((r) => serializeTask(r as TaskRow));
        const buckets = bucketOpenTasksByDue(openSerialized, todayStart, todayEnd);
        return {
          overdue: buckets.overdue,
          dueToday: buckets.dueToday,
          upcoming: buckets.upcoming,
          completed: completedRows.map((r) => serializeTask(r as TaskRow)),
        };
      }
    );

    const counts = {
      openOverdue: overdue.length,
      openDueToday: dueToday.length,
      openUpcoming: upcoming.length,
      completedShown: completed.length,
    };

    return NextResponse.json({
      data: {
        counts,
        overdue,
        dueToday,
        upcoming,
        completed,
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const parsed = CreateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.flatten().formErrors.join("; ") || "Invalid body", 400);
    }

    const { title, description, dueAt, priority, contactId, propertyId } = parsed.data;
    const due = parseOptionalTaskDueAt(dueAt ?? null);

    const createdId = await withRLSContextOrFallbackAdmin(user.id, "POST /api/v1/tasks", async (tx) => {
      if (contactId) {
        const c = await tx.contact.findFirst({
          where: { id: contactId, deletedAt: null },
          select: { id: true },
        });
        if (!c) {
          throw Object.assign(new Error("Contact not found or not accessible"), { status: 404 });
        }
      }
      if (propertyId) {
        const p = await tx.property.findFirst({
          where: { id: propertyId, deletedAt: null },
          select: { id: true },
        });
        if (!p) {
          throw Object.assign(new Error("Property not found or not accessible"), { status: 404 });
        }
      }
      const row = await tx.task.create({
        data: {
          userId: user.id,
          title: title.trim(),
          description: description?.trim() || null,
          dueAt: due,
          priority: priority ?? "MEDIUM",
          contactId: contactId ?? null,
          propertyId: propertyId ?? null,
          status: "OPEN",
        },
        select: { id: true },
      });
      await recordTaskPilotCreatedUserActivity(tx, {
        userId: user.id,
        taskTitle: title.trim(),
        propertyId: propertyId ?? null,
        contactId: contactId ?? null,
      });
      return row.id;
    });

    scheduleOutboundSync(() => syncTaskOutbound(user.id, createdId));

    return NextResponse.json({ data: { id: createdId } });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    if (err.status === 404) {
      return NextResponse.json({ error: { message: err.message ?? "Not found" } }, { status: 404 });
    }
    return apiErrorFromCaught(e);
  }
}

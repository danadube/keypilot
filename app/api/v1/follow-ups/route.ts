import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { CreateFollowUpTaskSchema } from "@/lib/validations/follow-up-task";
import { verifyFollowUpSourceAccess } from "@/lib/follow-ups/verify-follow-up-source";
import {
  bucketAgentFollowUpsByDue,
  serializeAgentFollowUpRow,
} from "@/lib/follow-ups/agent-follow-up-buckets";

export const dynamic = "force-dynamic";

/** GET — list active follow-ups for ShowingHQ (due today, overdue, next 7 days). */
export async function GET() {
  try {
    const user = await getCurrentUser();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 8);

    let overdue: ReturnType<typeof serializeAgentFollowUpRow>[] = [];
    let dueToday: ReturnType<typeof serializeAgentFollowUpRow>[] = [];
    let upcoming: ReturnType<typeof serializeAgentFollowUpRow>[] = [];
    let all: ReturnType<typeof serializeAgentFollowUpRow>[] = [];
    try {
      const rows = await withRLSContext(user.id, (tx) =>
        tx.followUp.findMany({
          where: {
            createdByUserId: user.id,
            deletedAt: null,
            status: { not: "CLOSED" },
            dueAt: { lte: weekEnd },
          },
          include: {
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: { dueAt: "asc" },
          take: 80,
        })
      );
      all = rows.map(serializeAgentFollowUpRow);
      const buckets = bucketAgentFollowUpsByDue(all, todayStart, todayEnd);
      overdue = buckets.overdue;
      dueToday = buckets.dueToday;
      upcoming = buckets.upcoming;
    } catch (e) {
      console.error("[follow-ups GET]", e);
    }

    return NextResponse.json({
      data: {
        overdue,
        dueToday,
        upcoming,
        all,
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
    const parsed = CreateFollowUpTaskSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.flatten().formErrors.join("; ") || "Invalid body", 400);
    }
    const { contactId, sourceType, sourceId, title, notes, dueAt, priority } = parsed.data;

    const due = new Date(dueAt);
    if (Number.isNaN(due.getTime())) return apiError("Invalid dueAt", 400);

    const result = await withRLSContext(user.id, async (tx) => {
      const v = await verifyFollowUpSourceAccess({
        tx,
        userId: user.id,
        sourceType,
        sourceId,
        contactId,
      });
      if (v) return { error: v as string };
      const created = await tx.followUp.create({
        data: {
          createdByUserId: user.id,
          contactId,
          sourceType,
          sourceId,
          title: title.trim(),
          notes: notes?.trim() || null,
          dueAt: due,
          priority: priority ?? "MEDIUM",
          status: "NEW",
        },
        select: { id: true },
      });
      return { id: created.id };
    });

    if ("error" in result)
      return apiError(result.error ?? "Could not create follow-up", 400);

    return NextResponse.json({ data: { id: result.id } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import type { ScheduleChecklistItem } from "@/lib/dashboard/command-center-types";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  dayStartIso: z.string(),
  dayEndIso: z.string(),
});

/**
 * Checklist rows due in [dayStart, dayEnd) — day bounds should be computed client-side in local TZ.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      dayStartIso: searchParams.get("dayStartIso") ?? "",
      dayEndIso: searchParams.get("dayEndIso") ?? "",
    });
    if (!parsed.success) {
      return apiError("dayStartIso and dayEndIso (ISO strings) are required", 400);
    }
    const dayStart = new Date(parsed.data.dayStartIso);
    const dayEnd = new Date(parsed.data.dayEndIso);
    if (Number.isNaN(dayStart.getTime()) || Number.isNaN(dayEnd.getTime())) {
      return apiError("Invalid date bounds", 400);
    }
    if (dayEnd <= dayStart) {
      return apiError("dayEnd must be after dayStart", 400);
    }

    const rows = await withRLSContext(user.id, (tx) =>
      tx.transactionChecklistItem.findMany({
        where: {
          isComplete: false,
          dueDate: { not: null, gte: dayStart, lt: dayEnd },
          transaction: { userId: user.id, deletedAt: null },
        },
        include: {
          transaction: {
            select: {
              id: true,
              property: { select: { address1: true, city: true, state: true } },
            },
          },
        },
        orderBy: [{ dueDate: "asc" }, { sortOrder: "asc" }],
        take: 80,
      })
    );

    const checklistItems: ScheduleChecklistItem[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      dueAt: r.dueDate!.toISOString(),
      transactionId: r.transactionId,
      addressLine: `${r.transaction.property.address1}, ${r.transaction.property.city}`,
      href: `/transactions/${r.transactionId}#txn-pipeline-workspace`,
    }));

    return NextResponse.json({ data: { checklistItems } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

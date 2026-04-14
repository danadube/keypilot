import { prismaAdmin } from "@/lib/db";
import { transactionPropertySelect } from "@/lib/transactions/create-transaction";
import {
  serializeAgentFollowUpRow,
  type SerializedAgentFollowUp,
} from "@/lib/follow-ups/agent-follow-up-buckets";
import { serializeTask, type TaskRow } from "@/lib/tasks/task-serialize";
import type { ScheduleChecklistItem } from "@/lib/dashboard/command-center-types";
import type { CommandCenterScheduleShowing } from "@/lib/dashboard/unified-schedule-merge";

const taskInclude = {
  contact: {
    select: { id: true, firstName: true, lastName: true },
  },
  property: {
    select: { id: true, address1: true, city: true, state: true, zip: true },
  },
} as const;

/**
 * Loads the same raw inputs the command center schedule panel merges:
 * private showings in the window, follow-ups (ShowingHQ window), open tasks, checklist rows.
 * Aligns with `/api/v1/follow-ups`, `/api/v1/tasks` (open pool), `/api/v1/dashboard/schedule-day`.
 */
export async function loadScheduleContextForBriefing(
  userId: string,
  args: { dayStart: Date; dayEnd: Date; now: Date }
): Promise<{
  showings: CommandCenterScheduleShowing[];
  followUps: SerializedAgentFollowUp[];
  openTasks: ReturnType<typeof serializeTask>[];
  checklistItems: ScheduleChecklistItem[];
}> {
  const { dayStart, dayEnd, now } = args;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 8);

  // Read-only: explicit user / host scoping (no interactive $transaction).
  const [showingRows, followRows, openTaskRows, checklistRows] = await Promise.all([
    prismaAdmin.showing.findMany({
        where: {
          hostUserId: userId,
          deletedAt: null,
          scheduledAt: { gte: dayStart, lt: dayEnd },
        },
        include: {
          property: { select: { address1: true, city: true, state: true } },
        },
        orderBy: { scheduledAt: "asc" },
        take: 80,
      }),
    prismaAdmin.followUp.findMany({
        where: {
          createdByUserId: userId,
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
      }),
    prismaAdmin.task.findMany({
        where: { userId, status: "OPEN" },
        include: taskInclude,
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        take: 200,
      }),
    prismaAdmin.transactionChecklistItem.findMany({
        where: {
          isComplete: false,
          dueDate: { not: null, gte: dayStart, lt: dayEnd },
          transaction: { userId, deletedAt: null },
        },
        include: {
          transaction: {
            select: {
              id: true,
              property: { select: transactionPropertySelect },
            },
          },
        },
        orderBy: [{ dueDate: "asc" }, { sortOrder: "asc" }],
        take: 80,
      }),
  ]);

  const showings: CommandCenterScheduleShowing[] = showingRows.map((s) => ({
      id: s.id,
      scheduledAt: s.scheduledAt.toISOString(),
      buyerName: s.buyerName,
      property: s.property
        ? {
            address1: s.property.address1,
            city: s.property.city,
            state: s.property.state,
          }
        : null,
    }));

  const followUps = followRows.map(serializeAgentFollowUpRow);
  const openTasks = openTaskRows.map((r) => serializeTask(r as TaskRow));

  const checklistItems: ScheduleChecklistItem[] = checklistRows.map((r) => ({
      id: r.id,
      title: r.title,
      dueAt: r.dueDate!.toISOString(),
      transactionId: r.transactionId,
      addressLine: `${r.transaction.property.address1}, ${r.transaction.property.city}`,
      href: `/transactions/${r.transactionId}#txn-pipeline-workspace`,
  }));

  return { showings, followUps, openTasks, checklistItems };
}

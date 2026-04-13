import {
  DealStatus,
  TransactionStatus,
  type User,
  type UserActivityType,
  type Prisma,
} from "@prisma/client";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { transactionPropertySelect } from "@/lib/transactions/create-transaction";
import {
  computeTransactionSignals,
  formatTransactionAttentionPrimaryLine,
} from "@/lib/transactions/transaction-signals";
import type { TransactionAttentionItem } from "@/lib/transactions/transaction-attention-types";
import type { TxStatus } from "@/components/modules/transactions/transactions-shared";
import { incompleteChecklistCountsByTransactionIds } from "@/lib/transactions/incomplete-checklist-counts";
import { inferTaskSourceTag } from "@/lib/dashboard/infer-task-source-tag";
import { serializeTask, type TaskRow } from "@/lib/tasks/task-serialize";
import { bucketOpenTasksByDue } from "@/lib/tasks/task-buckets";
import type {
  CommandCenterActivityRow,
  CommandCenterAttentionStrip,
  CommandCenterListingRow,
  CommandCenterPayload,
  CommandCenterPriorityTask,
  CommandCenterSnapshot,
} from "@/lib/dashboard/command-center-types";
import type { CommandCenterSourceTag, ListingStageChip } from "@/lib/dashboard/command-center-visual";

const ACTIVE_TX_STATUSES: TransactionStatus[] = [
  "LEAD",
  "UNDER_CONTRACT",
  "IN_ESCROW",
  "PENDING",
];

const TERMINAL_TX: TransactionStatus[] = ["CLOSED", "FALLEN_APART"];

const INACTIVE_DEAL: DealStatus[] = ["CLOSED", "LOST"];

function decimalToNumber(d: Prisma.Decimal | null | undefined): number | null {
  if (d == null) return null;
  const n = Number(d);
  return Number.isFinite(n) ? n : null;
}

function pickMoneyGci(
  gci: Prisma.Decimal | null | undefined,
  adjusted: Prisma.Decimal | null | undefined
): number | null {
  return decimalToNumber(adjusted) ?? decimalToNumber(gci);
}

function compareAttention(a: TransactionAttentionItem, b: TransactionAttentionItem): number {
  const sa = a.signals;
  const sb = b.signals;
  const aDays = sa.daysUntilClose ?? 999;
  const bDays = sb.daysUntilClose ?? 999;
  if (sa.closingSoon && sb.closingSoon && aDays !== bDays) return aDays - bDays;
  if (sa.closingSoon !== sb.closingSoon) return sa.closingSoon ? -1 : 1;
  const ac = sa.incompleteChecklistCount;
  const bc = sb.incompleteChecklistCount;
  if (ac !== bc) return bc - ac;
  if (sa.setupIncomplete !== sb.setupIncomplete) return sa.setupIncomplete ? -1 : 1;
  return a.address1.localeCompare(b.address1);
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function activityVisualTagForUserActivity(type: UserActivityType): CommandCenterSourceTag {
  if (type === "SHOWING") return "SHQ";
  return "CRM";
}

function listingStageFromTxn(
  txn: { status: TransactionStatus; closingDate: Date | null } | undefined,
  todayStart: Date,
  hasListingPrice: boolean
): { chip: ListingStageChip; label: string } {
  if (txn?.closingDate) {
    const closeDay = startOfLocalDay(txn.closingDate);
    const days = Math.round((closeDay.getTime() - todayStart.getTime()) / 86400000);
    if (days >= 0 && days <= 14) {
      return { chip: "CLOSING", label: "Closing" };
    }
  }
  if (!txn) {
    if (hasListingPrice) return { chip: "ACTIVE", label: "Active" };
    return { chip: "COMING_SOON", label: "Coming soon" };
  }
  switch (txn.status) {
    case "LEAD":
      return { chip: "DRAFT", label: "Draft" };
    case "UNDER_CONTRACT":
    case "IN_ESCROW":
    case "PENDING":
      return { chip: "PENDING", label: "Pending" };
    default:
      return { chip: "ACTIVE", label: "Active" };
  }
}

function transactionActivityTitle(summary: string, type: string): string {
  if (summary?.trim()) return summary.trim();
  switch (type) {
    case "STATUS_CHANGED":
      return "Transaction status updated";
    case "CHECKLIST_ITEM_COMPLETED":
      return "Checklist item completed";
    case "CHECKLIST_ITEM_ADDED":
      return "Checklist item added";
    case "TRANSACTION_CREATED":
      return "Transaction created";
    case "TRANSACTION_UPDATED":
      return "Transaction updated";
    default:
      return "Transaction update";
  }
}

/**
 * Shared aggregation used by Command Center API and Daily Briefing.
 * Mirrors `GET /api/v1/dashboard/command-center`.
 */
export async function getCommandCenterPayload(user: User): Promise<CommandCenterPayload> {
  const crm = hasCrmAccess(user.productTier);
  const now = new Date();
  const yearStart = startOfYear(now);
  const todayStart = startOfLocalDay(now);

  const annualGoal = (() => {
    const raw = process.env.KEYPILOT_ANNUAL_GCI_GOAL_DOLLARS;
    if (raw == null || raw.trim() === "") return 300_000;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 300_000;
  })();

  return withRLSContext(user.id, async (tx) => {
    const [
      openTaskRows,
      dealRows,
      propertyRows,
      propertyTotalCount,
      userActivities,
      transactionActivities,
    ] = await Promise.all([
      tx.task.findMany({
        where: { userId: user.id, status: "OPEN" },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          property: {
            select: { id: true, address1: true, city: true, state: true, zip: true },
          },
        },
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        take: 200,
      }),
      tx.deal.findMany({
        where: { userId: user.id, status: { notIn: INACTIVE_DEAL } },
        select: { id: true },
      }),
      tx.property.findMany({
        where: { createdByUserId: user.id, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 8,
        select: {
          id: true,
          address1: true,
          city: true,
          state: true,
          zip: true,
          listingPrice: true,
          updatedAt: true,
        },
      }),
      tx.property.count({
        where: { createdByUserId: user.id, deletedAt: null },
      }),
      tx.userActivity.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 14,
        include: {
          property: { select: { id: true, address1: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      crm
        ? tx.transactionActivity.findMany({
            where: { transaction: { userId: user.id, deletedAt: null } },
            orderBy: { createdAt: "desc" },
            take: 14,
            include: {
              transaction: {
                select: {
                  id: true,
                  property: { select: { address1: true } },
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const serializedOpen = openTaskRows.map((r) => serializeTask(r as TaskRow));
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const buckets = bucketOpenTasksByDue(serializedOpen, todayStart, todayEnd);
    const tasksOverdue = buckets.overdue.length;
    const tasksDueToday = buckets.dueToday.length;
    const tasksDueTotal = tasksOverdue + tasksDueToday;

    const priorityPool = [...buckets.overdue, ...buckets.dueToday, ...buckets.upcoming.slice(0, 24)];
    priorityPool.sort((a, b) => {
      const ad = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
      const bd = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
      const aOver = a.dueAt ? new Date(a.dueAt) < todayStart : false;
      const bOver = b.dueAt ? new Date(b.dueAt) < todayStart : false;
      if (aOver !== bOver) return aOver ? -1 : 1;
      if (ad !== bd) return ad - bd;
      return (b.priority === "HIGH" ? 1 : 0) - (a.priority === "HIGH" ? 1 : 0);
    });

    const priorityTasks: CommandCenterPriorityTask[] = priorityPool.slice(0, 12).map((t) => {
      const overdue = t.dueAt ? new Date(t.dueAt) < todayStart : false;
      const sub =
        t.property?.address1 != null
          ? `${t.property.address1}, ${t.property.city}`
          : t.contact
            ? `${t.contact.firstName} ${t.contact.lastName}`.trim()
            : null;
      return {
        id: t.id,
        title: t.title,
        dueAt: t.dueAt,
        createdAt: t.createdAt,
        href: "/task-pilot",
        overdue,
        sourceTag: inferTaskSourceTag(t),
        subline: sub,
      };
    });

    let attention: CommandCenterAttentionStrip | null = null;
    let ytdGci: number | null = null;
    let pipelineEstimatedGci: number | null = null;
    const pipelineActiveDealsCount = dealRows.length;
    let pipelineActiveTransactionsCount = 0;
    let nextClosing: CommandCenterSnapshot["nextClosing"] = null;

    if (crm) {
      const ytdRows = await tx.transaction.findMany({
        where: {
          userId: user.id,
          deletedAt: null,
          status: "CLOSED",
          closingDate: { gte: yearStart, lte: now },
        },
        select: { gci: true, adjustedGci: true },
      });
      ytdGci = ytdRows.reduce((sum, r) => {
        const m = pickMoneyGci(r.gci, r.adjustedGci);
        return sum + (m ?? 0);
      }, 0);
      if (ytdGci === 0) ytdGci = null;

      const pipelineTx = await tx.transaction.findMany({
        where: {
          userId: user.id,
          deletedAt: null,
          status: { notIn: TERMINAL_TX },
        },
        select: {
          id: true,
          gci: true,
          adjustedGci: true,
        },
      });
      pipelineActiveTransactionsCount = pipelineTx.length;
      pipelineEstimatedGci = pipelineTx.reduce((sum, r) => {
        const m = pickMoneyGci(r.gci, r.adjustedGci);
        return sum + (m ?? 0);
      }, 0);
      if (pipelineEstimatedGci === 0) pipelineEstimatedGci = null;

      const nextRow = await tx.transaction.findFirst({
        where: {
          userId: user.id,
          deletedAt: null,
          status: { notIn: TERMINAL_TX },
          closingDate: { gte: todayStart },
        },
        orderBy: { closingDate: "asc" },
        select: {
          id: true,
          closingDate: true,
          property: { select: transactionPropertySelect },
        },
      });
      if (nextRow?.closingDate) {
        const closeDay = startOfLocalDay(nextRow.closingDate);
        const msPerDay = 86400000;
        const daysUntil = Math.round((closeDay.getTime() - todayStart.getTime()) / msPerDay);
        nextClosing = {
          daysUntil,
          label:
            daysUntil === 0
              ? "Closing today"
              : daysUntil === 1
                ? "Closing tomorrow"
                : `Closing in ${daysUntil} days`,
          addressLine: nextRow.property.address1,
          href: `/transactions/${nextRow.id}`,
        };
      }

      const attentionTx = await tx.transaction.findMany({
        where: {
          userId: user.id,
          deletedAt: null,
          status: { in: ACTIVE_TX_STATUSES },
        },
        select: {
          id: true,
          status: true,
          salePrice: true,
          closingDate: true,
          brokerageName: true,
          gci: true,
          adjustedGci: true,
          property: { select: transactionPropertySelect },
        },
      });

      const checklistCounts = await incompleteChecklistCountsByTransactionIds(
        tx,
        attentionTx.map((t) => t.id)
      );

      const items: TransactionAttentionItem[] = [];
      for (const t of attentionTx) {
        const incompleteChecklistCount = checklistCounts.get(t.id) ?? 0;
        const signals = computeTransactionSignals({
          status: t.status as TxStatus,
          salePrice: t.salePrice?.toString() ?? null,
          closingDate: t.closingDate?.toISOString() ?? null,
          brokerageName: t.brokerageName,
          incompleteChecklistCount,
        });
        if (!signals.hasAttention) continue;
        const address1 = t.property.address1;
        const primaryLine = formatTransactionAttentionPrimaryLine(address1, signals);
        items.push({
          transactionId: t.id,
          href: `/transactions/${t.id}`,
          address1,
          city: t.property.city,
          state: t.property.state,
          zip: t.property.zip,
          primaryLine,
          signals,
        });
      }
      items.sort(compareAttention);
      const top = items[0];
      if (top) {
        const topRow = attentionTx.find((x) => x.id === top.transactionId);
        const est = pickMoneyGci(topRow?.gci, topRow?.adjustedGci);
        const closingLabel =
          top.signals.daysUntilClose == null
            ? "Closing date TBD"
            : top.signals.daysUntilClose === 0
              ? "Closing today"
              : top.signals.daysUntilClose === 1
                ? "Closing in 1 day"
                : `Closing in ${top.signals.daysUntilClose} days`;
        attention = {
          transactionId: top.transactionId,
          addressLine: `${top.address1}, ${top.city}, ${top.state}`,
          city: top.city,
          state: top.state,
          daysUntilClose: top.signals.daysUntilClose,
          closingLabel,
          checklistOpenCount: top.signals.incompleteChecklistCount,
          estimatedGci: est,
          hrefTransaction: `/transactions/${top.transactionId}`,
          hrefChecklist: `/transactions/${top.transactionId}#txn-pipeline-workspace`,
        };
      }
    }

    const ytdPercentToGoal =
      ytdGci != null && annualGoal > 0 ? Math.min(100, (ytdGci / annualGoal) * 100) : null;

    const snapshot: CommandCenterSnapshot = {
      ytdGci,
      annualGciGoal: annualGoal,
      ytdPercentToGoal,
      pipelineActiveTransactionsCount,
      pipelineActiveDealsCount,
      pipelineEstimatedGci,
      nextClosing,
      tasksDueTotal,
      tasksOverdue,
      activeListingsCount: propertyTotalCount,
    };

    const propertyIds = propertyRows.map((p) => p.id);
    const txnsForProps =
      propertyIds.length === 0
        ? []
        : await tx.transaction.findMany({
            where: {
              userId: user.id,
              deletedAt: null,
              propertyId: { in: propertyIds },
              status: { notIn: TERMINAL_TX },
            },
            select: {
              id: true,
              propertyId: true,
              closingDate: true,
              status: true,
            },
          });

    const checklistByTxn = await incompleteChecklistCountsByTransactionIds(
      tx,
      txnsForProps.map((x) => x.id)
    );

    const showingCounts =
      propertyIds.length === 0
        ? []
        : await tx.showing.groupBy({
            by: ["propertyId"],
            where: {
              hostUserId: user.id,
              deletedAt: null,
              propertyId: { in: propertyIds },
              scheduledAt: { gte: todayStart },
            },
            _count: { _all: true },
          });
    const showingMap = new Map(showingCounts.map((s) => [s.propertyId, s._count._all]));

    const activeListings: CommandCenterListingRow[] = propertyRows.map((p) => {
      const txnForProp = txnsForProps
        .filter((t) => t.propertyId === p.id)
        .sort((a, b) => {
          const ac = a.closingDate ? a.closingDate.getTime() : 0;
          const bc = b.closingDate ? b.closingDate.getTime() : 0;
          return ac - bc;
        })[0];
      const openCheck = txnForProp ? checklistByTxn.get(txnForProp.id) ?? 0 : 0;
      const showN = showingMap.get(p.id) ?? 0;
      const price = decimalToNumber(p.listingPrice);
      const hasListPrice = price != null;
      const { chip: stageChip, label: stageLabel } = listingStageFromTxn(txnForProp, todayStart, hasListPrice);

      const factsLine = `${p.city}, ${p.state}${hasListPrice ? " · Listed" : " · No list price"}`;

      const parts: string[] = [];
      if (txnForProp?.closingDate) {
        const closeDay = startOfLocalDay(txnForProp.closingDate);
        const days = Math.round((closeDay.getTime() - todayStart.getTime()) / 86400000);
        if (days >= 0 && days <= 60) {
          parts.push(days === 0 ? "Closing today" : days === 1 ? "Closing tomorrow" : `Closing in ${days}d`);
        }
      }
      if (openCheck > 0) parts.push(`${openCheck} checklist open`);
      if (showN > 0) parts.push(`${showN} showing${showN === 1 ? "" : "s"} ahead`);

      return {
        propertyId: p.id,
        addressLine: p.address1,
        city: p.city,
        state: p.state,
        listingPrice: price,
        factsLine,
        stageChip,
        stageLabel,
        urgencyLine: parts.length > 0 ? parts.join(" · ") : "On track",
        href: `/properties/${p.id}`,
      };
    });

    const activityMerged: CommandCenterActivityRow[] = [];

    for (const a of userActivities) {
      const name = `${a.type.replace(/_/g, " ")}`.toLowerCase();
      const title = a.title?.trim() || name;
      const sub =
        a.property?.address1 != null
          ? a.property.address1
          : a.contact
            ? `${a.contact.firstName} ${a.contact.lastName}`.trim()
            : null;
      activityMerged.push({
        id: `ua-${a.id}`,
        kind: "CRM",
        visualTag: activityVisualTagForUserActivity(a.type),
        occurredAt: a.createdAt.toISOString(),
        title,
        subline: sub,
        href: a.propertyId ? `/properties/${a.propertyId}` : a.contactId ? `/contacts/${a.contactId}` : null,
      });
    }

    for (const a of transactionActivities) {
      const addr = a.transaction.property.address1;
      activityMerged.push({
        id: `ta-${a.id}`,
        kind: "TRANSACTION",
        visualTag: "TXN",
        occurredAt: a.createdAt.toISOString(),
        title: transactionActivityTitle(a.summary, a.type),
        subline: addr,
        href: `/transactions/${a.transaction.id}`,
      });
    }

    activityMerged.sort(
      (x, y) => new Date(y.occurredAt).getTime() - new Date(x.occurredAt).getTime()
    );
    const recentActivity = activityMerged.slice(0, 18);

    const result: CommandCenterPayload = {
      crmAvailable: crm,
      attention,
      snapshot,
      priorityTasks,
      activeListings,
      recentActivity,
    };
    return result;
  });
}

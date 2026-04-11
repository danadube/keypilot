/**
 * TransactionHQ attention signals — shared, composable rules for UI + APIs.
 *
 * v1 assumptions (documented):
 * - closingSoon: closing date is in [today, today + CLOSING_SOON_DAYS], local calendar days;
 *   never true for CLOSED / FALLEN_APART.
 * - setupIncomplete: same fields as {@link getTransactionSetupGaps} / needs-setup on list.
 * - incompleteChecklistCount: count of incomplete persisted `TransactionChecklistItem` rows;
 *   detail + attention APIs supply real counts; use 0 only when the count is intentionally omitted.
 */

import type { TransactionStatus } from "@prisma/client";
import {
  getTransactionSetupGaps,
  setupGapLabel,
} from "@/lib/transactions/transaction-setup-gaps";
import type { TxStatus } from "@/components/modules/transactions/transactions-shared";

/** Default horizon for “closing soon” — aligned with transaction detail UX. */
export const TRANSACTION_CLOSING_SOON_DAYS = 30;

const TERMINAL: TxStatus[] = ["CLOSED", "FALLEN_APART"];

export type TransactionSignalInput = {
  status: TxStatus | TransactionStatus | string;
  salePrice: string | number | null | undefined;
  closingDate: string | Date | null | undefined;
  brokerageName: string | null | undefined;
  /** When unknown, use 0. */
  incompleteChecklistCount: number;
};

function normalizeSetupFields(
  input: Pick<TransactionSignalInput, "salePrice" | "closingDate" | "brokerageName">
) {
  const closingDate =
    input.closingDate == null
      ? null
      : typeof input.closingDate === "string"
        ? input.closingDate
        : input.closingDate.toISOString();
  return {
    salePrice: input.salePrice ?? null,
    closingDate,
    brokerageName: input.brokerageName ?? null,
  };
}

export type TransactionSignals = {
  closingSoon: boolean;
  /** Days from start of today to closing date (inclusive of today); null if not closingSoon. */
  daysUntilClose: number | null;
  incompleteChecklistCount: number;
  setupIncomplete: boolean;
  /** True if any signal warrants operator attention. */
  hasAttention: boolean;
};

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Whether the closing is within the next {@link TRANSACTION_CLOSING_SOON_DAYS} calendar days
 * (and not already past). Terminal statuses never qualify.
 */
export function isClosingSoon(
  closingDate: string | Date | null | undefined,
  status: TxStatus | TransactionStatus | string
): boolean {
  if (TERMINAL.includes(status as TxStatus)) return false;
  if (closingDate == null) return false;
  const end = closingDate instanceof Date ? closingDate : new Date(closingDate);
  if (Number.isNaN(end.getTime())) return false;
  const now = new Date();
  const startToday = startOfLocalDay(now);
  const endDay = startOfLocalDay(end);
  const msPerDay = 86400000;
  const days = Math.round((endDay - startToday) / msPerDay);
  if (days < 0) return false;
  return days <= TRANSACTION_CLOSING_SOON_DAYS;
}

export function daysUntilClosingDate(
  closingDate: string | Date | null | undefined
): number | null {
  if (closingDate == null) return null;
  const end = closingDate instanceof Date ? closingDate : new Date(closingDate);
  if (Number.isNaN(end.getTime())) return null;
  const now = new Date();
  const startToday = startOfLocalDay(now);
  const endDay = startOfLocalDay(end);
  return Math.round((endDay - startToday) / 86400000);
}

export function computeTransactionSignals(input: TransactionSignalInput): TransactionSignals {
  const setupGaps = getTransactionSetupGaps(normalizeSetupFields(input));
  const setupIncomplete = setupGaps.length > 0;
  const incompleteChecklistCount = Math.max(0, Math.floor(input.incompleteChecklistCount));
  const closingSoon = isClosingSoon(input.closingDate, input.status);
  const daysUntilClose =
    closingSoon && input.closingDate != null ? daysUntilClosingDate(input.closingDate) : null;

  const hasAttention =
    closingSoon || incompleteChecklistCount > 0 || setupIncomplete;

  return {
    closingSoon,
    daysUntilClose,
    incompleteChecklistCount,
    setupIncomplete,
    hasAttention,
  };
}

/** Human-readable reasons for Command Center / list copy (no trailing period). */
export function formatTransactionAttentionReasons(s: TransactionSignals): string[] {
  const parts: string[] = [];
  if (s.closingSoon && s.daysUntilClose != null) {
    if (s.daysUntilClose === 0) parts.push("closing today");
    else if (s.daysUntilClose === 1) parts.push("closing in 1 day");
    else parts.push(`closing in ${s.daysUntilClose} days`);
  }
  if (s.incompleteChecklistCount > 0) {
    const n = s.incompleteChecklistCount;
    parts.push(`${n} checklist item${n === 1 ? "" : "s"} still open`);
  }
  if (s.setupIncomplete) {
    parts.push("setup incomplete");
  }
  return parts;
}

export function formatTransactionAttentionPrimaryLine(
  address1: string,
  signals: TransactionSignals
): string {
  const reasons = formatTransactionAttentionReasons(signals);
  if (reasons.length === 0) return address1;
  return `${address1} — ${reasons.join(" · ")}`;
}

/** Setup gap labels for detail signals card (reuse shared labels). */
export function setupGapLabelsFromInput(
  input: Pick<TransactionSignalInput, "salePrice" | "closingDate" | "brokerageName">
): string[] {
  return getTransactionSetupGaps(normalizeSetupFields(input)).map((g) => setupGapLabel(g));
}

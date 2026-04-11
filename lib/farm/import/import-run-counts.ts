import type { FarmImportSummary } from "./types";

/**
 * Maps apply summary into audit counters for `FarmImportRun`.
 * - created: new contacts, memberships, territories, areas
 * - updated: reactivated contacts, memberships, territories, areas
 * - skipped: preview/apply skips (invalid rows, duplicates, already active member)
 */
export function farmImportSummaryToRunCounts(summary: FarmImportSummary): {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
} {
  return {
    createdCount:
      summary.createdContacts +
      summary.createdMemberships +
      summary.createdTerritories +
      summary.createdAreas,
    updatedCount:
      summary.reactivatedContacts +
      summary.reactivatedMemberships +
      summary.reactivatedTerritories +
      summary.reactivatedAreas,
    skippedCount: summary.skippedRows,
  };
}

export function truncateFarmImportErrorSummary(message: string, maxLen = 500): string {
  const t = message.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

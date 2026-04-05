import {
  farmImportSummaryToRunCounts,
  truncateFarmImportErrorSummary,
} from "@/lib/farm/import/import-run-counts";
import type { FarmImportSummary } from "@/lib/farm/import/types";

describe("farmImportSummaryToRunCounts", () => {
  it("aggregates created and updated from apply-style summary", () => {
    const summary: FarmImportSummary = {
      totalRows: 10,
      matchedContacts: 3,
      createdContacts: 2,
      reactivatedContacts: 1,
      createdMemberships: 4,
      reactivatedMemberships: 1,
      skippedRows: 2,
      createdTerritories: 1,
      reactivatedTerritories: 0,
      createdAreas: 1,
      reactivatedAreas: 1,
    };
    expect(farmImportSummaryToRunCounts(summary)).toEqual({
      createdCount: 8,
      updatedCount: 3,
      skippedCount: 2,
    });
  });
});

describe("truncateFarmImportErrorSummary", () => {
  it("truncates long messages", () => {
    const long = "x".repeat(600);
    const out = truncateFarmImportErrorSummary(long, 500);
    expect(out.length).toBe(500);
    expect(out.endsWith("…")).toBe(true);
  });
});

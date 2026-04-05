import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasModuleAccess, type ModuleAccessMap } from "@/lib/module-access";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { withRLSContext } from "@/lib/db-context";
import {
  farmImportSummaryToRunCounts,
  truncateFarmImportErrorSummary,
} from "@/lib/farm/import/import-run-counts";
import { applyFarmImport } from "@/lib/farm/import/pipeline";
import { FarmImportMappingSchema } from "@/lib/farm/import/mapping-schema";

export const dynamic = "force-dynamic";

const ApplyBodySchema = z.object({
  rows: z.array(z.record(z.string(), z.string())).max(1000),
  mapping: FarmImportMappingSchema,
  defaultTerritoryName: z.string().nullish(),
  defaultAreaName: z.string().nullish(),
  /** Client-reported source; defaults to CSV when omitted (older clients). */
  sourceType: z.enum(["CSV", "XLSX"]).optional(),
  fileName: z.string().trim().max(512).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const accessMap = user.moduleAccess as ModuleAccessMap | null | undefined;
    if (!hasModuleAccess(accessMap, "farm-trackr")) {
      return NextResponse.json(
        { error: { message: "Farm imports require CRM access." } },
        { status: 403 }
      );
    }

    const body = ApplyBodySchema.parse(await req.json());
    const sourceType = body.sourceType ?? "CSV";
    const fileName =
      body.fileName && body.fileName.length > 0 ? body.fileName.slice(0, 512) : null;

    let applied: Awaited<ReturnType<typeof applyFarmImport>>;
    try {
      applied = await withRLSContext(user.id, async (tx) => {
        const result = await applyFarmImport(tx, user.id, {
          rows: body.rows,
          mapping: body.mapping,
          defaultTerritoryName: body.defaultTerritoryName,
          defaultAreaName: body.defaultAreaName,
        });
        const counts = farmImportSummaryToRunCounts(result.summary);
        await tx.farmImportRun.create({
          data: {
            userId: user.id,
            completedAt: new Date(),
            sourceType,
            fileName,
            totalRows: result.summary.totalRows,
            createdCount: counts.createdCount,
            updatedCount: counts.updatedCount,
            skippedCount: counts.skippedCount,
            failedCount: 0,
            status: "COMPLETED",
            errorSummary: null,
          },
        });
        return result;
      });
    } catch (importApplyErr) {
      console.error("IMPORT APPLY ERROR:", importApplyErr);
      try {
        await withRLSContext(user.id, async (tx) => {
          await tx.farmImportRun.create({
            data: {
              userId: user.id,
              completedAt: new Date(),
              sourceType,
              fileName,
              totalRows: body.rows.length,
              createdCount: 0,
              updatedCount: 0,
              skippedCount: 0,
              failedCount: body.rows.length,
              status: "FAILED",
              errorSummary: truncateFarmImportErrorSummary(
                importApplyErr instanceof Error
                  ? importApplyErr.message
                  : String(importApplyErr)
              ),
            },
          });
        });
      } catch (auditErr) {
        console.error("FARM_IMPORT_AUDIT_WRITE_FAILED:", auditErr);
      }
      const exposeApplyDebug =
        process.env.FARM_IMPORT_APPLY_DEBUG === "1" ||
        process.env.NODE_ENV === "development";
      if (exposeApplyDebug && importApplyErr instanceof Error) {
        return NextResponse.json(
          {
            error: {
              message: importApplyErr.message,
              stack: importApplyErr.stack,
              code: "FARM_IMPORT_APPLY_FAILED",
            },
          },
          { status: 500 }
        );
      }
      throw importApplyErr;
    }
    return NextResponse.json({ data: applied });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (/row-level security policy/i.test(msg) && /contacts/i.test(msg)) {
      return apiError(
        "Could not create a contact for this import (database access check failed). Ensure you are signed in and try again.",
        403,
        "FARM_IMPORT_CONTACT_RLS"
      );
    }
    return apiErrorFromCaught(error);
  }
}

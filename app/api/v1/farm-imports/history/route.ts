import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasModuleAccess, type ModuleAccessMap } from "@/lib/module-access";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { withRLSContextOrFallbackAdmin } from "@/lib/db-context";

export const dynamic = "force-dynamic";

const HistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const accessMap = user.moduleAccess as ModuleAccessMap | null | undefined;
    if (!hasModuleAccess(accessMap, "farm-trackr")) {
      return NextResponse.json(
        { error: { message: "Farm imports require CRM access." } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const parsed = HistoryQuerySchema.safeParse({
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid query", 400);
    }
    const { limit } = parsed.data;

    const runs = await withRLSContextOrFallbackAdmin(
      user.id,
      "farm-imports:history",
      async (tx) =>
        tx.farmImportRun.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: limit,
          select: {
            id: true,
            createdAt: true,
            completedAt: true,
            sourceType: true,
            fileName: true,
            totalRows: true,
            createdCount: true,
            updatedCount: true,
            skippedCount: true,
            failedCount: true,
            status: true,
            errorSummary: true,
          },
        })
    );

    return NextResponse.json({ data: runs });
  } catch (error) {
    return apiErrorFromCaught(error);
  }
}

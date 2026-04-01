import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasModuleAccess, type ModuleAccessMap } from "@/lib/module-access";
import { apiErrorFromCaught } from "@/lib/api-response";
import { parseCsvText } from "@/lib/farm/import/csv";

export const dynamic = "force-dynamic";

const ParseCsvBodySchema = z.object({
  csvText: z.string().min(1, "CSV content is required"),
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

    const body = ParseCsvBodySchema.parse(await req.json());
    const parsed = parseCsvText(body.csvText);

    return NextResponse.json({
      data: {
        headers: parsed.headers,
        rows: parsed.rows.slice(0, 1000),
        rowCount: parsed.rows.length,
      },
    });
  } catch (error) {
    return apiErrorFromCaught(error);
  }
}

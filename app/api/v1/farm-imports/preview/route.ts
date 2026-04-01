import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasModuleAccess, type ModuleAccessMap } from "@/lib/module-access";
import { apiErrorFromCaught } from "@/lib/api-response";
import { withRLSContext } from "@/lib/db-context";
import { previewFarmImport } from "@/lib/farm/import/pipeline";

export const dynamic = "force-dynamic";

const MappingSchema = z.object({
  email: z.string().nullish(),
  phone: z.string().nullish(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  fullName: z.string().nullish(),
  territory: z.string().nullish(),
  area: z.string().nullish(),
});

const PreviewBodySchema = z.object({
  rows: z.array(z.record(z.string(), z.string())).max(1000),
  mapping: MappingSchema,
  defaultTerritoryName: z.string().nullish(),
  defaultAreaName: z.string().nullish(),
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

    const body = PreviewBodySchema.parse(await req.json());
    const preview = await withRLSContext(user.id, (tx) =>
      previewFarmImport(tx, user.id, {
        rows: body.rows,
        mapping: body.mapping,
        defaultTerritoryName: body.defaultTerritoryName,
        defaultAreaName: body.defaultAreaName,
      })
    );

    return NextResponse.json({ data: preview });
  } catch (error) {
    return apiErrorFromCaught(error);
  }
}

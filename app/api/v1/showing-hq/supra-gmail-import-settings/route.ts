import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  automationEnabled: z.boolean(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    const row = await withRLSContext(user.id, (tx) =>
      tx.supraGmailImportSettings.findUnique({
        where: { userId: user.id },
      })
    );

    return NextResponse.json({
      data: {
        automationEnabled: row?.automationEnabled ?? true,
        lastRunAt: row?.lastRunAt?.toISOString() ?? null,
        lastRunSuccess: row?.lastRunSuccess ?? null,
        lastRunSource: row?.lastRunSource ?? null,
        lastRunImported: row?.lastRunImported ?? null,
        lastRunRefreshed: row?.lastRunRefreshed ?? null,
        lastRunSkipped: row?.lastRunSkipped ?? null,
        lastRunScanned: row?.lastRunScanned ?? null,
        lastRunAutoParsed: row?.lastRunAutoParsed ?? null,
        lastRunError: row?.lastRunError ?? null,
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid body", 400, "VALIDATION_ERROR");
    }

    const row = await withRLSContext(user.id, (tx) =>
      tx.supraGmailImportSettings.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          automationEnabled: parsed.data.automationEnabled,
        },
        update: {
          automationEnabled: parsed.data.automationEnabled,
        },
      })
    );

    return NextResponse.json({
      data: {
        automationEnabled: row.automationEnabled,
        lastRunAt: row.lastRunAt?.toISOString() ?? null,
        lastRunSuccess: row.lastRunSuccess,
        lastRunSource: row.lastRunSource,
        lastRunImported: row.lastRunImported,
        lastRunRefreshed: row.lastRunRefreshed,
        lastRunSkipped: row.lastRunSkipped,
        lastRunScanned: row.lastRunScanned,
        lastRunAutoParsed: row.lastRunAutoParsed,
        lastRunError: row.lastRunError,
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

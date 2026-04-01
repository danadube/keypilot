import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { FarmMailingRecipientsQuerySchema } from "@/lib/validations/farm-mailing";
import { loadFarmMailingRecipients } from "@/lib/farm/mailing/load-farm-mailing-recipients";
import { AVERY_5160 } from "@/lib/farm/labels/label-formats";
import { buildAvery5160PrintHtml } from "@/lib/farm/labels/render-label-sheet";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const sp = req.nextUrl.searchParams;
    const raw = {
      territoryId: sp.get("territoryId") ?? undefined,
      farmAreaId: sp.get("farmAreaId") ?? undefined,
      format: (sp.get("format") as "json" | "html" | null) ?? "json",
    };
    const parsed = FarmMailingRecipientsQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid query", 400);
    }

    const { territoryId, farmAreaId, format } = parsed.data;
    const scope =
      farmAreaId != null
        ? ({ kind: "area" as const, farmAreaId })
        : ({ kind: "territory" as const, territoryId: territoryId! });

    const { recipients, scopeLabel } = await withRLSContext(user.id, (tx) =>
      loadFarmMailingRecipients(tx, user.id, scope)
    );

    if (format === "html") {
      const html = buildAvery5160PrintHtml(recipients);
      return new NextResponse(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const labelPages =
      recipients.length === 0
        ? 0
        : Math.ceil(recipients.length / AVERY_5160.labelsPerPage);

    return NextResponse.json({
      data: {
        recipients,
        scopeLabel,
        summary: {
          contactCount: recipients.length,
          labelPages,
          labelsPerPage: AVERY_5160.labelsPerPage,
        },
      },
    });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    if (err.status === 404) return apiError(err.message ?? "Not found", 404);
    return apiErrorFromCaught(e);
  }
}

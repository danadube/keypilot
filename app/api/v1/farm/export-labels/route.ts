import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { FarmExportLabelsBodySchema } from "@/lib/validations/farm-mailing";
import {
  buildFarmLabelExportCsv,
  type FarmLabelCsvRow,
} from "@/lib/farm/mailing/mailing-list-csv";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const raw = await req.json();
    const parsed = FarmExportLabelsBodySchema.safeParse(raw);
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message ?? "Validation failed",
        400
      );
    }

    const uniqueIds = Array.from(new Set(parsed.data.contactIds));

    const csv = await withRLSContext(user.id, async (tx) => {
      const contacts = await tx.contact.findMany({
        where: { id: { in: uniqueIds }, deletedAt: null },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          mailingStreet1: true,
          mailingStreet2: true,
          mailingCity: true,
          mailingState: true,
          mailingZip: true,
        },
      });
      const byId = new Map(contacts.map((c) => [c.id, c]));
      const rows: FarmLabelCsvRow[] = [];
      for (const id of uniqueIds) {
        const c = byId.get(id);
        if (!c) continue;
        rows.push({
          firstName: (c.firstName ?? "").trim(),
          lastName: (c.lastName ?? "").trim(),
          mailingStreet1: (c.mailingStreet1 ?? "").trim(),
          mailingStreet2: (c.mailingStreet2 ?? "").trim(),
          mailingCity: (c.mailingCity ?? "").trim(),
          mailingState: (c.mailingState ?? "").trim(),
          mailingZip: (c.mailingZip ?? "").trim(),
        });
      }
      return buildFarmLabelExportCsv(rows);
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="farm-labels.csv"',
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { applyChecklistTemplateToTransaction } from "@/lib/transactions/apply-checklist-template";
import { ApplyChecklistTemplateSchema } from "@/lib/validations/transaction-checklist";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    const { id: transactionId } = await params;

    const body = await req.json();
    const parsed = ApplyChecklistTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const result = await withRLSContext(user.id, async (tx) =>
      applyChecklistTemplateToTransaction(tx, {
        transactionId,
        actorUserId: user.id,
        side: parsed.data.side,
      })
    );

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    if (err.status === 409) return apiError(err.message ?? "Conflict", 409);
    if (err.status === 404) return apiError(err.message ?? "Not found", 404);
    return apiErrorFromCaught(e);
  }
}

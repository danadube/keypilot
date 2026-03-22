import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { UpdateCommissionSchema } from "@/lib/validations/transaction";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commissionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    const { id: transactionId, commissionId } = await params;

    const body = await req.json();
    const parsed = UpdateCommissionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const commission = await withRLSContext(user.id, async (tx) => {
      // Confirm transaction ownership, then confirm commission belongs to it —
      // all in one transaction to close the TOCTOU window.
      const transaction = await tx.transaction.findFirst({
        where: { id: transactionId, userId: user.id },
        select: { id: true },
      });
      if (!transaction) return null;

      const existing = await tx.commission.findFirst({
        where: { id: commissionId, transactionId },
        select: { id: true },
      });
      if (!existing) return null;

      return tx.commission.update({
        where: { id: commissionId },
        data: parsed.data,
      });
    });

    if (!commission) return apiError("Commission not found", 404);
    return NextResponse.json({ data: commission });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; commissionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    const { id: transactionId, commissionId } = await params;

    const deleted = await withRLSContext(user.id, async (tx) => {
      const transaction = await tx.transaction.findFirst({
        where: { id: transactionId, userId: user.id },
        select: { id: true },
      });
      if (!transaction) return false;

      const existing = await tx.commission.findFirst({
        where: { id: commissionId, transactionId },
        select: { id: true },
      });
      if (!existing) return false;

      await tx.commission.delete({ where: { id: commissionId } });
      return true;
    });

    if (!deleted) return apiError("Commission not found", 404);
    return NextResponse.json({ data: { deleted: true } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

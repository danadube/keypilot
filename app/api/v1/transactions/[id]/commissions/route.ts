import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { CreateCommissionSchema } from "@/lib/validations/transaction";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    const { id: transactionId } = await params;

    const commissions = await withRLSContext(user.id, async (tx) => {
      // Confirm transaction ownership before listing commissions.
      const transaction = await tx.transaction.findFirst({
        where: { id: transactionId, userId: user.id },
        select: { id: true },
      });
      if (!transaction) return null;

      return tx.commission.findMany({
        where: { transactionId },
        orderBy: { createdAt: "asc" },
      });
    });

    if (!commissions) return apiError("Transaction not found", 404);
    return NextResponse.json({ data: commissions });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

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
    const parsed = CreateCommissionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const commission = await withRLSContext(user.id, async (tx) => {
      // Transaction ownership check + commission create in one atomic transaction.
      // commissions INSERT policy cascades via transactions RLS, so this is
      // redundant at the DB level — but keeps 404 semantics clean.
      const transaction = await tx.transaction.findFirst({
        where: { id: transactionId, userId: user.id },
        select: { id: true },
      });
      if (!transaction) return null;

      return tx.commission.create({
        data: { transactionId, ...parsed.data },
      });
    });

    if (!commission) return apiError("Transaction not found", 404);
    return NextResponse.json({ data: commission }, { status: 201 });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

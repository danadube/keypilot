import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import {
  responseIfDealIdUniqueViolation,
  transactionLinkedDealSelect,
} from "@/lib/transaction-deal-link";
import { CreateTransactionSchema } from "@/lib/validations/transaction";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import {
  createTransactionForUser,
  transactionPropertySelect,
} from "@/lib/transactions/create-transaction";
import { TransactionStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as TransactionStatus | null;
    const showArchived = searchParams.get("showArchived") === "1";

    const transactions = await withRLSContext(user.id, (tx) =>
      tx.transaction.findMany({
        where: {
          userId: user.id,
          ...(showArchived ? {} : { deletedAt: null }),
          ...(status ? { status } : {}),
        },
        include: {
          property: { select: transactionPropertySelect },
          deal: { select: transactionLinkedDealSelect },
        },
        orderBy: { createdAt: "desc" },
      })
    );

    return NextResponse.json({ data: transactions });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const body = await req.json();
    const parsed = CreateTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const transaction = await withRLSContext(user.id, (tx) =>
      createTransactionForUser({
        tx,
        userId: user.id,
        input: parsed.data,
      })
    );

    return NextResponse.json({ data: transaction }, { status: 201 });
  } catch (e) {
    const uniqueResp = responseIfDealIdUniqueViolation(e);
    if (uniqueResp) return uniqueResp;
    const err = e as { status?: number; message?: string };
    if (err.status === 404) {
      return apiError(err.message ?? "Not found", 404);
    }
    if (err.status === 400) {
      return apiError(err.message ?? "Invalid request", 400);
    }
    return apiErrorFromCaught(e);
  }
}

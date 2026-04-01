import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import {
  assertValidTransactionDealLink,
  responseIfDealIdUniqueViolation,
  transactionLinkedDealSelect,
} from "@/lib/transaction-deal-link";
import { CreateTransactionSchema } from "@/lib/validations/transaction";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { TransactionStatus } from "@prisma/client";

const propertySelect = {
  id: true,
  address1: true,
  city: true,
  state: true,
  zip: true,
} as const;

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
          property: { select: propertySelect },
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

    const {
      propertyId,
      dealId,
      status: createStatus,
      salePrice,
      closingDate,
      brokerageName,
      notes,
    } = parsed.data;

    const transaction = await withRLSContext(user.id, async (tx) => {
      // FK scope validation — runs under RLS so findFirst returns null if the
      // property belongs to another user (properties RLS: createdByUserId = current).
      const property = await tx.property.findFirst({
        where: { id: propertyId },
        select: { id: true },
      });
      if (!property) {
        throw Object.assign(new Error("Property not found or not accessible"), {
          status: 404,
        });
      }

      if (dealId) {
        await assertValidTransactionDealLink(tx, {
          userId: user.id,
          propertyId,
          dealId,
        });
      }

      return tx.transaction.create({
        data: {
          propertyId,
          userId: user.id,
          ...(dealId !== undefined && { dealId }),
          ...(createStatus !== undefined && { status: createStatus }),
          ...(salePrice !== undefined && { salePrice }),
          ...(closingDate !== undefined && { closingDate }),
          ...(brokerageName !== undefined && { brokerageName }),
          ...(notes !== undefined && { notes }),
        },
        include: {
          property: { select: propertySelect },
          deal: { select: transactionLinkedDealSelect },
        },
      });
    });

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

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";

/** Minimal deal payload included on transaction read responses (UI-ready). */
export const transactionLinkedDealSelect = {
  id: true,
  status: true,
  contact: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} as const;

/**
 * Unique violation on transactions.dealId — another row already links to this deal.
 */
export function responseIfDealIdUniqueViolation(e: unknown): NextResponse | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    const target = e.meta?.target;
    const parts = Array.isArray(target)
      ? target.map(String)
      : target != null
        ? [String(target)]
        : [];
    if (parts.includes("dealId") || parts.some((p) => p.includes("dealId"))) {
      return apiError("Another transaction is already linked to this deal", 409);
    }
  }
  return null;
}

/**
 * Ensures dealId can be set on a transaction: same user, same property as the transaction.
 * Call inside withRLSContext so deal visibility matches the API.
 */
export async function assertValidTransactionDealLink(
  tx: Prisma.TransactionClient,
  params: { userId: string; propertyId: string; dealId: string }
): Promise<void> {
  const deal = await tx.deal.findFirst({
    where: { id: params.dealId, userId: params.userId },
    select: { id: true, propertyId: true },
  });
  if (!deal) {
    throw Object.assign(new Error("Deal not found or not accessible"), {
      status: 404,
    });
  }
  if (deal.propertyId !== params.propertyId) {
    throw Object.assign(
      new Error("Linked deal must be for the same property as this transaction"),
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { Prisma, TransactionSide, TransactionStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext, withRLSContextOrFallbackAdmin } from "@/lib/db-context";
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
import { ACTIVE_TRANSACTION_STATUSES } from "@/lib/transactions/list-query";

function parseStatusFilter(raw: string | null): "ACTIVE" | TransactionStatus | null {
  if (raw == null || raw.trim() === "") return null;
  const u = raw.trim().toUpperCase();
  if (u === "ACTIVE") return "ACTIVE";
  if (Object.values(TransactionStatus).includes(u as TransactionStatus)) {
    return u as TransactionStatus;
  }
  return null;
}

function parseSideFilter(raw: string | null): TransactionSide | null {
  if (raw == null || raw.trim() === "") return null;
  const u = raw.trim().toUpperCase();
  if (u === "BUY" || u === "SELL") return u as TransactionSide;
  return null;
}

function buildSearchWhere(term: string): Prisma.TransactionWhereInput {
  const t = term.trim();
  if (t.length === 0) return {};
  const contains: Prisma.StringFilter = { contains: t, mode: "insensitive" };
  return {
    OR: [
      { property: { address1: contains } },
      { property: { city: contains } },
      { brokerageName: contains },
      { notes: contains },
      {
        deal: {
          is: {
            contact: {
              OR: [{ firstName: contains }, { lastName: contains }],
            },
          },
        },
      },
    ],
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const { searchParams } = new URL(req.url);
    const showArchived = searchParams.get("showArchived") === "1" || searchParams.get("archived") === "1";
    const setupOnly = searchParams.get("setup") === "1";
    const statusRaw = searchParams.get("status");
    const sideParsed = parseSideFilter(searchParams.get("side"));
    const qRaw = searchParams.get("q");
    const q = typeof qRaw === "string" ? qRaw.trim().slice(0, 200) : "";

    const statusFilter = parseStatusFilter(statusRaw);

    const andParts: Prisma.TransactionWhereInput[] = [
      { userId: user.id },
      ...(showArchived ? [] : [{ deletedAt: null }]),
    ];

    if (statusFilter === "ACTIVE") {
      andParts.push({ status: { in: ACTIVE_TRANSACTION_STATUSES } });
    } else if (statusFilter != null) {
      andParts.push({ status: statusFilter });
    }

    if (sideParsed) {
      andParts.push({ side: sideParsed });
    }

    if (setupOnly) {
      andParts.push({
        OR: [
          { salePrice: null },
          { closingDate: null },
          { brokerageName: null },
          { brokerageName: "" },
        ],
      });
    }

    const searchWhere = buildSearchWhere(q);
    if (Object.keys(searchWhere).length > 0) {
      andParts.push(searchWhere);
    }

    const where: Prisma.TransactionWhereInput =
      andParts.length === 1 ? andParts[0]! : { AND: andParts };

    const transactions = await withRLSContextOrFallbackAdmin(
      user.id,
      "api/v1/transactions:get",
      (tx) =>
        tx.transaction.findMany({
          where,
          include: {
            property: { select: transactionPropertySelect },
            deal: { select: transactionLinkedDealSelect },
          },
          orderBy: { createdAt: "desc" },
        })
    );

    return NextResponse.json({ data: transactions });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("[GET /api/v1/transactions] Prisma", {
        code: e.code,
        meta: e.meta,
      });
      return apiErrorFromCaught(e, { log: false });
    }
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
    if (parsed.data.side === undefined) {
      return apiError("Transaction side (BUY or SELL) is required", 400);
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

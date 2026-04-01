import { NextRequest, NextResponse } from "next/server";
import { TransactionImportStatus } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { createTransactionForUser } from "@/lib/transactions/create-transaction";
import {
  CreateCommissionSchema,
  CreateTransactionSchema,
} from "@/lib/validations/transaction";
import {
  getCommitBlockReason,
  pickFinalStatementPayload,
  resolveSelectedBrokerageName,
} from "@/lib/transactions/commission-import-review";
import { responseIfDealIdUniqueViolation } from "@/lib/transaction-deal-link";

const CommitTransactionImportSchema = z
  .object({
    editedPayload: z.record(z.string(), z.unknown()).optional(),
    transaction: z
      .object({
        propertyId: z.string().min(1),
        dealId: z.string().uuid().optional(),
        status: z
          .enum([
            "LEAD",
            "UNDER_CONTRACT",
            "IN_ESCROW",
            "PENDING",
            "CLOSED",
            "FALLEN_APART",
          ])
          .optional(),
        salePrice: z.number().positive().optional().nullable(),
        closingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
        brokerageName: z.string().max(200).optional().nullable(),
        notes: z.string().max(5000).optional().nullable(),
      })
      .strict(),
    commissions: z.array(CreateCommissionSchema).optional(),
  })
  .strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    const { id } = await params;

    const body = await req.json();
    const parsedBody = CommitTransactionImportSchema.safeParse(body);
    if (!parsedBody.success) {
      return apiError(parsedBody.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const result = await withRLSContext(user.id, async (tx) => {
      const session = await tx.transactionImportSession.findFirst({
        where: { id, userId: user.id },
      });
      if (!session) {
        throw Object.assign(new Error("Import session not found"), { status: 404 });
      }
      if (session.status === TransactionImportStatus.COMMITTED) {
        return { transactionId: session.committedTransactionId };
      }

      const statement = pickFinalStatementPayload({
        parsedPayload: session.parsedPayload,
        editedPayload: parsedBody.data.editedPayload,
      });
      const blockReason = getCommitBlockReason(statement);
      if (blockReason) {
        throw Object.assign(new Error(blockReason), { status: 400 });
      }
      const editedPayloadForSession =
        parsedBody.data.editedPayload !== undefined
          ? JSON.parse(JSON.stringify(statement))
          : undefined;

      const createCandidate = {
        propertyId: parsedBody.data.transaction.propertyId,
        dealId: parsedBody.data.transaction.dealId,
        status: parsedBody.data.transaction.status ?? "PENDING",
        salePrice:
          parsedBody.data.transaction.salePrice ??
          statement.extracted.salePrice ??
          null,
        closingDate:
          parsedBody.data.transaction.closingDate ??
          statement.extracted.closeDate ??
          null,
        brokerageName:
          parsedBody.data.transaction.brokerageName ??
          statement.extracted.brokerageName ??
          null,
        notes:
          parsedBody.data.transaction.notes ??
          `Imported from statement (${statement.source.fileName})`,
      };

      const createInputParsed = CreateTransactionSchema.safeParse(createCandidate);
      if (!createInputParsed.success) {
        throw Object.assign(
          new Error(createInputParsed.error.issues[0]?.message ?? "Invalid input"),
          { status: 400 }
        );
      }

      const transaction = await createTransactionForUser({
        tx,
        userId: user.id,
        input: createInputParsed.data,
      });

      if (parsedBody.data.commissions?.length) {
        for (const commission of parsedBody.data.commissions) {
          const commissionParsed = CreateCommissionSchema.safeParse(commission);
          if (!commissionParsed.success) {
            throw Object.assign(
              new Error(
                commissionParsed.error.issues[0]?.message ?? "Invalid commission input"
              ),
              { status: 400 }
            );
          }
          await tx.commission.create({
            data: {
              transactionId: transaction.id,
              ...commissionParsed.data,
            },
          });
        }
      }

      await tx.transactionImportSession.update({
        where: { id: session.id },
        data: {
          ...(editedPayloadForSession !== undefined && {
            editedPayload: editedPayloadForSession,
          }),
          selectedBrokerage: resolveSelectedBrokerageName({
            overrideBrokerageName: parsedBody.data.transaction.brokerageName,
            statement,
          }),
          parserProfile:
            statement.source.parserProfile ??
            session.parserProfile ??
            "generic",
          parserProfileVersion:
            statement.source.parserProfileVersion ??
            session.parserProfileVersion ??
            "v1",
          status: TransactionImportStatus.COMMITTED,
          committedTransactionId: transaction.id,
        },
      });

      return { transactionId: transaction.id };
    });

    return NextResponse.json(result);
  } catch (e) {
    const uniqueResp = responseIfDealIdUniqueViolation(e);
    if (uniqueResp) return uniqueResp;
    const err = e as { status?: number; message?: string };
    if (err.status === 404) return apiError(err.message ?? "Not found", 404);
    if (err.status === 400) return apiError(err.message ?? "Invalid request", 400);
    return apiErrorFromCaught(e);
  }
}

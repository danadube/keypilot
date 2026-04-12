import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { recordTransactionActivity } from "@/lib/transactions/record-transaction-activity";
import { getCaPipelineDocs } from "@/lib/transactions/ca-pipeline-definitions";
import type { PipelineSide } from "@/lib/transactions/ca-pipeline-definitions";
import {
  buildInitialMeta,
  serializePipelineMeta,
  tryParsePipelineMeta,
} from "@/lib/transactions/pipeline-checklist-metadata";
import { SeedCaPipelineSchema } from "@/lib/validations/transaction-checklist";

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

    const body = await req.json().catch(() => null);
    const parsed = SeedCaPipelineSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const side: PipelineSide = parsed.data.side;

    const result = await withRLSContext(user.id, async (tx) => {
      const owned = await tx.transaction.findFirst({
        where: { id: transactionId, userId: user.id },
        select: { id: true },
      });
      if (!owned) return null;

      const existing = await tx.transactionChecklistItem.findMany({
        where: { transactionId },
        select: { id: true, notes: true },
      });
      const hasPipeline = existing.some((r) => tryParsePipelineMeta(r.notes) !== null);
      if (hasPipeline) {
        const err = new Error("Pipeline checklist already exists for this transaction") as Error & {
          status?: number;
        };
        err.status = 409;
        throw err;
      }

      const defs = getCaPipelineDocs(side);
      const maxOrder = await tx.transactionChecklistItem.aggregate({
        where: { transactionId },
        _max: { sortOrder: true },
      });
      let sortOrder = (maxOrder._max.sortOrder ?? 0);

      const created: { id: string; title: string }[] = [];
      for (const def of defs) {
        sortOrder += 1;
        const meta = buildInitialMeta({
          code: def.code,
          side,
          stage: def.stage,
          requirement: def.requirement,
        });
        const title = `${def.code} — ${def.label}`;
        const row = await tx.transactionChecklistItem.create({
          data: {
            transactionId,
            title,
            sortOrder,
            notes: serializePipelineMeta(meta),
          },
          select: { id: true, title: true },
        });
        created.push(row);
      }

      await recordTransactionActivity(tx, {
        transactionId,
        actorUserId: user.id,
        type: "TRANSACTION_UPDATED",
        summary: `Seeded California ${side === "SELL" ? "listing" : "buyer"} document pipeline (${created.length} items)`,
        metadata: { pipelineSeed: true, side, count: created.length },
      });

      return { count: created.length, side };
    });

    if (result === null) return apiError("Transaction not found", 404);

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    if (err.status === 409) return apiError(err.message ?? "Conflict", 409);
    return apiErrorFromCaught(e);
  }
}

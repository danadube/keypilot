import type { Prisma, TransactionPaperworkDocument } from "@prisma/client";
import type { TransactionDocumentInstance } from "@/lib/forms-engine/types";
import { tryParseFormEngineChecklistNotes } from "@/lib/transactions/form-engine-checklist-notes";
import { buildTransactionPaperworkContext } from "@/lib/transactions/build-transaction-paperwork-context";
import { tryMvpTransactionPaperwork } from "@/lib/transactions/try-mvp-transaction-paperwork";
import {
  initialPaperworkDocStatusFromEngine,
  paperworkDocStatusFromApi,
} from "@/lib/transactions/paperwork-doc-status";
import type { DocumentStatus } from "@/lib/transactions/ca-pipeline-definitions";

const transactionForPaperworkSyncSelect = {
  id: true,
  side: true,
  property: { select: { state: true } },
} satisfies Prisma.TransactionSelect;

/**
 * Idempotent sync: inserts rows for each current engine instance key (`sourceRuleId`) that
 * is missing in the DB. Never updates existing rows (user edits are preserved).
 * Hydrates new rows from legacy checklist `KP_FORM_ENGINE_META` notes when present.
 */
export async function syncTransactionPaperworkDocuments(
  db: Prisma.TransactionClient,
  transactionId: string
): Promise<TransactionPaperworkDocument[]> {
  const txn = await db.transaction.findFirst({
    where: { id: transactionId },
    select: transactionForPaperworkSyncSelect,
  });

  if (!txn?.property?.state) {
    return db.transactionPaperworkDocument.findMany({
      where: { transactionId },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });
  }

  if (txn.side !== "BUY" && txn.side !== "SELL") {
    return db.transactionPaperworkDocument.findMany({
      where: { transactionId },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });
  }

  const ctx = buildTransactionPaperworkContext({
    transactionId: txn.id,
    propertyState: txn.property.state,
    side: txn.side,
  });

  const engine = tryMvpTransactionPaperwork(ctx);
  if (!engine.ok) {
    return db.transactionPaperworkDocument.findMany({
      where: { transactionId },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });
  }

  const existing = await db.transactionPaperworkDocument.findMany({
    where: { transactionId },
    select: { sourceRuleId: true },
  });
  const have = new Set(existing.map((r) => r.sourceRuleId));

  const checklistRows = await db.transactionChecklistItem.findMany({
    where: { transactionId },
    select: { notes: true, dueDate: true },
  });

  const legacyByRule = new Map<
    string,
    { docStatus: DocumentStatus; due: Date | null; url?: string; comments?: string }
  >();
  for (const row of checklistRows) {
    const meta = tryParseFormEngineChecklistNotes(row.notes);
    if (!meta) continue;
    legacyByRule.set(meta.sourceRuleId, {
      docStatus: meta.docStatus,
      due: row.dueDate,
      url: meta.docUrl,
      comments: meta.comments,
    });
  }

  const toCreate: TransactionDocumentInstance[] = [];
  for (const inst of engine.instances) {
    if (have.has(inst.sourceRuleId)) continue;
    toCreate.push(inst);
  }

  for (const inst of toCreate) {
    const legacy = legacyByRule.get(inst.sourceRuleId);
    const docStatus =
      legacy?.docStatus != null
        ? paperworkDocStatusFromApi(legacy.docStatus) ??
          initialPaperworkDocStatusFromEngine(inst.status)
        : initialPaperworkDocStatusFromEngine(inst.status);

    const dueDate = legacy?.due ?? null;
    const notes = legacy?.comments?.trim() ? legacy.comments.trim() : null;
    const url = legacy?.url?.trim() ? legacy.url.trim() : null;
    const isHttp = url && (url.startsWith("http://") || url.startsWith("https://"));

    await db.transactionPaperworkDocument.create({
      data: {
        transactionId,
        sourceRuleId: inst.sourceRuleId,
        formId: inst.formId,
        revisionId: inst.revisionId,
        shortCode: inst.shortCode,
        title: inst.title,
        stageHint: inst.stageHint ?? null,
        sortOrder: inst.sortOrder,
        requirementBucket: inst.bucket,
        formFamily: inst.formFamily,
        providerId: inst.providerId ?? null,
        metadataSnapshot: inst.metadata as unknown as Prisma.InputJsonValue,
        docStatus,
        dueDate,
        notes,
        executedDocumentUrl: isHttp ? url : null,
        executedDocumentFilePath: isHttp ? null : url,
        executedDocumentLabel: null,
      },
    });
  }

  return db.transactionPaperworkDocument.findMany({
    where: { transactionId },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
}

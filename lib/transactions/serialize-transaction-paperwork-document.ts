import type { TransactionPaperworkDocument } from "@prisma/client";
import type { DocumentStatus } from "@/lib/transactions/ca-pipeline-definitions";
import { paperworkDocStatusToApi } from "@/lib/transactions/paperwork-doc-status";

export type SerializedTransactionPaperworkDocument = {
  id: string;
  transactionId: string;
  sourceRuleId: string;
  formId: string;
  revisionId: string;
  shortCode: string;
  title: string;
  stageHint: string | null;
  sortOrder: number;
  requirementBucket: string;
  formFamily: string;
  providerId: string | null;
  docStatus: DocumentStatus;
  dueDate: string | null;
  notes: string | null;
  executedDocumentUrl: string | null;
  executedDocumentFilePath: string | null;
  executedDocumentLabel: string | null;
  createdAt: string;
  updatedAt: string;
  metadataSnapshot: unknown;
};

export function serializeTransactionPaperworkDocument(
  row: TransactionPaperworkDocument
): SerializedTransactionPaperworkDocument {
  return {
    id: row.id,
    transactionId: row.transactionId,
    sourceRuleId: row.sourceRuleId,
    formId: row.formId,
    revisionId: row.revisionId,
    shortCode: row.shortCode,
    title: row.title,
    stageHint: row.stageHint,
    sortOrder: row.sortOrder,
    requirementBucket: row.requirementBucket,
    formFamily: row.formFamily,
    providerId: row.providerId,
    docStatus: paperworkDocStatusToApi(row.docStatus),
    dueDate: row.dueDate?.toISOString() ?? null,
    notes: row.notes,
    executedDocumentUrl: row.executedDocumentUrl,
    executedDocumentFilePath: row.executedDocumentFilePath,
    executedDocumentLabel: row.executedDocumentLabel,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    metadataSnapshot: row.metadataSnapshot,
  };
}

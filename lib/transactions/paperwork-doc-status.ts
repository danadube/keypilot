import type { TransactionPaperworkDocStatus } from "@prisma/client";
import type { DocumentStatus } from "@/lib/transactions/ca-pipeline-definitions";
import type { TransactionDocumentInstanceStatus } from "@/lib/forms-engine/types";

const API_TO_PRISMA: Record<DocumentStatus, TransactionPaperworkDocStatus> = {
  not_started: "NOT_STARTED",
  sent: "SENT",
  signed: "SIGNED",
  uploaded: "UPLOADED",
  complete: "COMPLETE",
};

const PRISMA_TO_API: Record<TransactionPaperworkDocStatus, DocumentStatus> = {
  NOT_STARTED: "not_started",
  SENT: "sent",
  SIGNED: "signed",
  UPLOADED: "uploaded",
  COMPLETE: "complete",
};

export function paperworkDocStatusToApi(status: TransactionPaperworkDocStatus): DocumentStatus {
  return PRISMA_TO_API[status] ?? "not_started";
}

export function paperworkDocStatusFromApi(status: string): TransactionPaperworkDocStatus | null {
  if (status in API_TO_PRISMA) {
    return API_TO_PRISMA[status as DocumentStatus];
  }
  return null;
}

/** Initial DB status when materializing a generated engine instance. */
export function initialPaperworkDocStatusFromEngine(
  instanceStatus: TransactionDocumentInstanceStatus
): TransactionPaperworkDocStatus {
  switch (instanceStatus) {
    case "not_started":
      return "NOT_STARTED";
    case "in_progress":
      return "SENT";
    case "complete":
      return "COMPLETE";
    case "waived":
    case "not_applicable":
      return "COMPLETE";
    default:
      return "NOT_STARTED";
  }
}

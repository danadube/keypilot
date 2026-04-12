import { z } from "zod";

export const UpdateTransactionPaperworkDocumentSchema = z.object({
  docStatus: z.enum(["not_started", "sent", "signed", "uploaded", "complete"]).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  notes: z.string().max(8000).nullable().optional(),
  executedDocumentUrl: z.string().max(4000).nullable().optional(),
  executedDocumentFilePath: z.string().max(4000).nullable().optional(),
  executedDocumentLabel: z.string().max(500).nullable().optional(),
});

export type UpdateTransactionPaperworkDocumentInput = z.infer<
  typeof UpdateTransactionPaperworkDocumentSchema
>;

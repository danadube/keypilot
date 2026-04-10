import { z } from "zod";

export const CreateTransactionChecklistItemSchema = z.object({
  title: z.string().min(1).max(500),
});

export const PatchTransactionChecklistItemSchema = z.object({
  isComplete: z.boolean(),
});

export type CreateTransactionChecklistItemInput = z.infer<
  typeof CreateTransactionChecklistItemSchema
>;
export type PatchTransactionChecklistItemInput = z.infer<
  typeof PatchTransactionChecklistItemSchema
>;

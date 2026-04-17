import { z } from "zod";

export const clientKeepFocusAttentionKindSchema = z.enum([
  "reminder",
  "follow_up_task",
  "stale_contact",
  "draft",
]);

export const clientKeepFocusAttentionItemSchema = z.object({
  kind: clientKeepFocusAttentionKindSchema,
  id: z.string(),
  headline: z.string(),
  subline: z.string().optional(),
  dueAt: z.string().optional(),
  href: z.string(),
  contactId: z.string(),
  contactName: z.string(),
});

export const clientKeepFocusPipelineDealSchema = z.object({
  id: z.string(),
  status: z.string(),
  statusLabel: z.string(),
  contactId: z.string(),
  contactName: z.string(),
  propertyLabel: z.string(),
  href: z.string(),
});

export const clientKeepFocusPipelineTransactionSchema = z.object({
  id: z.string(),
  status: z.string(),
  statusLabel: z.string(),
  contactId: z.string(),
  contactName: z.string(),
  propertyLabel: z.string(),
  href: z.string(),
});

export const clientKeepFocusNewContactSchema = z.object({
  id: z.string(),
  contactName: z.string(),
  status: z.string().nullable(),
  source: z.string(),
  createdAt: z.string(),
  href: z.string(),
});

export const clientKeepFocusResponseSchema = z.object({
  needsAttention: z.array(clientKeepFocusAttentionItemSchema),
  pipeline: z.object({
    deals: z.array(clientKeepFocusPipelineDealSchema),
    transactions: z.array(clientKeepFocusPipelineTransactionSchema),
  }),
  newOrUnworked: z.array(clientKeepFocusNewContactSchema),
});

export type ClientKeepFocusResponse = z.infer<typeof clientKeepFocusResponseSchema>;

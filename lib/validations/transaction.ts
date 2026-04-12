import { z } from "zod";

const TransactionStatusEnum = z.enum([
  "LEAD",
  "UNDER_CONTRACT",
  "IN_ESCROW",
  "PENDING",
  "CLOSED",
  "FALLEN_APART",
]);

export const TransactionKindEnum = z.enum(["SALE", "REFERRAL_RECEIVED"]);

/** GET /api/v1/transactions list filters (all optional). */
export const TransactionsListQuerySchema = z.object({
  status: TransactionStatusEnum.optional(),
  transactionKind: TransactionKindEnum.optional(),
  brokerage: z.string().max(200).optional(),
  q: z.string().max(200).optional(),
  closingYear: z.coerce.number().int().min(1990).max(2100).optional(),
  /** Filter to deals for a single property (e.g. property detail workspace). */
  propertyId: z.string().uuid().optional(),
});

/** Loose JSON object for broker-specific commission assumptions (validated again in domain). */
const CommissionInputsJsonSchema = z.record(z.string(), z.unknown()).optional().nullable();

export const CreateTransactionSchema = z.object({
  // Accept any non-empty string — DB FK constraint handles invalid IDs.
  // z.string().uuid() would couple validation to the ID generation strategy.
  propertyId: z.string().min(1),
  /** Optional CRM deal; API enforces same user and same property as this transaction. */
  dealId: z.string().uuid().optional(),
  status: TransactionStatusEnum.optional(),
  transactionKind: TransactionKindEnum.optional(),
  primaryContactId: z.string().uuid().optional().nullable(),
  externalSource: z.string().max(100).optional().nullable(),
  externalSourceId: z.string().max(500).optional().nullable(),
  closingDate: z.coerce.date().optional().nullable(),
  salePrice: z.number().positive().optional().nullable(),
  brokerageName: z.string().max(200).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  commissionInputs: CommissionInputsJsonSchema,
});

export const UpdateTransactionSchema = z.object({
  /** Listing vs buyer — drives document pipeline; set from deal detail or Financial & records. */
  side: z.enum(["BUY", "SELL"]).nullable().optional(),
  /** Set to unlink; omit to leave unchanged. */
  dealId: z.string().uuid().nullable().optional(),
  status: TransactionStatusEnum.optional(),
  transactionKind: TransactionKindEnum.optional(),
  primaryContactId: z.string().uuid().nullable().optional(),
  externalSource: z.string().max(100).optional().nullable(),
  externalSourceId: z.string().max(500).optional().nullable(),
  // z.coerce.date() accepts "2026-04-15" (plain date) and ISO datetime strings,
  // normalizing both to a Date object for Prisma. nullable() allows clearing the field.
  closingDate: z.coerce.date().optional().nullable(),
  salePrice: z.number().positive().optional().nullable(),
  brokerageName: z.string().max(200).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  commissionInputs: CommissionInputsJsonSchema,
});

export const CreateCommissionSchema = z.object({
  role: z.string().min(1).max(100),
  amount: z.number().positive(),
  percent: z.number().min(0).max(100).optional().nullable(),
  // agentId is optional — commissions can be for external parties without a user row.
  // DB FK constraint on commissions.agentId → users.id handles invalid IDs.
  agentId: z.string().min(1).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const UpdateCommissionSchema = CreateCommissionSchema.partial();

export const ArchiveTransactionBodySchema = z.object({
  archive: z.literal(true),
});

export const UnarchiveTransactionBodySchema = z.object({
  unarchive: z.literal(true),
});

export const CreateTransactionChecklistItemSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(500),
  dueDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  isComplete: z.boolean().optional(),
});

export const UpdateTransactionChecklistItemSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  isComplete: z.boolean().optional(),
  dueDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type TransactionsListQuery = z.infer<typeof TransactionsListQuerySchema>;

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;
export type CreateCommissionInput = z.infer<typeof CreateCommissionSchema>;
export type UpdateCommissionInput = z.infer<typeof UpdateCommissionSchema>;

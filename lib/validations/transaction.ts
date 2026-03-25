import { z } from "zod";

const TransactionStatusEnum = z.enum([
  "LEAD",
  "UNDER_CONTRACT",
  "IN_ESCROW",
  "PENDING",
  "CLOSED",
  "FALLEN_APART",
]);

export const CreateTransactionSchema = z.object({
  // Accept any non-empty string — DB FK constraint handles invalid IDs.
  // z.string().uuid() would couple validation to the ID generation strategy.
  propertyId: z.string().min(1),
  /** Optional CRM deal; API enforces same user and same property as this transaction. */
  dealId: z.string().uuid().optional(),
  status: TransactionStatusEnum.optional(),
  closingDate: z.coerce.date().optional().nullable(),
  salePrice: z.number().positive().optional().nullable(),
  brokerageName: z.string().max(200).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export const UpdateTransactionSchema = z.object({
  /** Set to unlink; omit to leave unchanged. */
  dealId: z.string().uuid().nullable().optional(),
  status: TransactionStatusEnum.optional(),
  // z.coerce.date() accepts "2026-04-15" (plain date) and ISO datetime strings,
  // normalizing both to a Date object for Prisma. nullable() allows clearing the field.
  closingDate: z.coerce.date().optional().nullable(),
  salePrice: z.number().positive().optional().nullable(),
  brokerageName: z.string().max(200).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
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

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;
export type CreateCommissionInput = z.infer<typeof CreateCommissionSchema>;
export type UpdateCommissionInput = z.infer<typeof UpdateCommissionSchema>;

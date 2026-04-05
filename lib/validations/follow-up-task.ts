import { z } from "zod";

export const FollowUpSourceTypeSchema = z.enum([
  "OPEN_HOUSE",
  "FEEDBACK",
  "SHOWING",
  "MANUAL",
]);

export const FollowUpTaskStatusSchema = z.enum([
  "NEW",
  "PENDING",
  "CONTACTED",
  "NURTURE",
  "CLOSED",
]);

export const FollowUpTaskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const CreateFollowUpTaskSchema = z.object({
  contactId: z.string().uuid(),
  sourceType: FollowUpSourceTypeSchema,
  sourceId: z.string().min(1).max(200),
  title: z.string().min(1).max(500),
  notes: z.string().max(20000).optional().nullable(),
  dueAt: z.string().datetime({ offset: true }),
  priority: FollowUpTaskPrioritySchema.optional(),
});

export type CreateFollowUpTaskInput = z.infer<typeof CreateFollowUpTaskSchema>;

const BULK_FOLLOW_UP_MAX_CONTACTS = 200;

/** FarmTrackr / bulk: one MANUAL follow-up per contact (RLS-scoped). */
export const BulkCreateFollowUpsSchema = z.object({
  contactIds: z
    .array(z.string().min(1))
    .min(1, "Select at least one contact")
    .max(BULK_FOLLOW_UP_MAX_CONTACTS),
  title: z.string().trim().min(1, "Title is required").max(500),
  dueDate: z.string().max(40).optional().nullable(),
  notes: z.string().max(20000).optional().nullable(),
});

export type BulkCreateFollowUpsInput = z.infer<typeof BulkCreateFollowUpsSchema>;

export const UpdateFollowUpTaskSchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    notes: z.string().max(20000).optional().nullable(),
    dueAt: z.string().datetime({ offset: true }).optional(),
    status: FollowUpTaskStatusSchema.optional(),
    priority: FollowUpTaskPrioritySchema.optional(),
    completedAt: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: "No updates provided" });

export type UpdateFollowUpTaskInput = z.infer<typeof UpdateFollowUpTaskSchema>;

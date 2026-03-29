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

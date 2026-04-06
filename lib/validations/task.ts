import { z } from "zod";

export const TaskStatusSchema = z.enum(["OPEN", "COMPLETED"]);

export const TaskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const CreateTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(500),
  description: z.string().max(20000).optional().nullable(),
  /** ISO 8601 datetime (e.g. from combined date + time inputs). */
  dueAt: z.string().max(100).optional().nullable(),
  priority: TaskPrioritySchema.optional(),
  contactId: z.string().uuid().optional().nullable(),
  propertyId: z.string().uuid().optional().nullable(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(500).optional(),
    description: z.string().max(20000).optional().nullable(),
    dueAt: z.union([z.string().max(100), z.null()]).optional(),
    status: TaskStatusSchema.optional(),
    priority: TaskPrioritySchema.optional(),
    completedAt: z.union([z.string().datetime({ offset: true }), z.null()]).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: "No updates provided" });

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

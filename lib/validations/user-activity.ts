import { z } from "zod";

export const UserActivityTypeSchema = z.enum([
  "CALL",
  "EMAIL",
  "NOTE",
  "TASK",
  "SHOWING",
  "FOLLOW_UP",
]);

export const CreateUserActivitySchema = z.object({
  userId: z.string().uuid(),
  propertyId: z.string().uuid().nullable().optional(),
  contactId: z.string().uuid().nullable().optional(),
  type: UserActivityTypeSchema,
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(10_000).nullable().optional(),
  dueAt: z.coerce.date().nullable().optional(),
});

export const UpdateUserActivitySchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(10_000).nullable().optional(),
    dueAt: z.coerce.date().nullable().optional(),
    completedAt: z.coerce.date().nullable().optional(),
    type: UserActivityTypeSchema.optional(),
    propertyId: z.string().uuid().nullable().optional(),
    contactId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const CreateActivityTemplateSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(200),
  type: UserActivityTypeSchema,
  titleTemplate: z.string().min(1).max(500),
  descriptionTemplate: z.string().max(10_000).nullable().optional(),
  offsetDays: z.number().int().min(-3650).max(3650).nullable().optional(),
});

export const UpdateActivityTemplateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    type: UserActivityTypeSchema.optional(),
    titleTemplate: z.string().min(1).max(500).optional(),
    descriptionTemplate: z.string().max(10_000).nullable().optional(),
    offsetDays: z.number().int().min(-3650).max(3650).nullable().optional(),
  })
  .strict();

export type CreateUserActivityInput = z.infer<typeof CreateUserActivitySchema>;
export type UpdateUserActivityInput = z.infer<typeof UpdateUserActivitySchema>;
export type CreateActivityTemplateInput = z.infer<typeof CreateActivityTemplateSchema>;
export type UpdateActivityTemplateInput = z.infer<typeof UpdateActivityTemplateSchema>;

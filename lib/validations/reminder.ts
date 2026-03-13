import { z } from "zod";

export const CreateReminderSchema = z.object({
  dueAt: z.string().datetime(),
  body: z.string().min(1, "Reminder required").max(500),
});

export const UpdateReminderSchema = z.object({
  status: z.enum(["PENDING", "DONE", "DISMISSED"]),
});

export type CreateReminderInput = z.infer<typeof CreateReminderSchema>;
export type UpdateReminderInput = z.infer<typeof UpdateReminderSchema>;

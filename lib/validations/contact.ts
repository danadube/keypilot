import { z } from "zod";

const ContactStatusEnum = z.enum([
  "LEAD",
  "CONTACTED",
  "NURTURING",
  "READY",
  "LOST",
]);

export const UpdateContactSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  hasAgent: z.boolean().optional().nullable(),
  timeline: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: ContactStatusEnum.optional().nullable(),
  assignedToUserId: z.string().uuid().optional().nullable(),
});

export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;

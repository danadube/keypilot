import { z } from "zod";

export const CreateShowingSchema = z.object({
  propertyId: z.string().uuid(),
  scheduledAt: z.coerce.date(),
  buyerAgentName: z.string().optional().nullable(),
  buyerAgentEmail: z.string().email().optional().or(z.literal("")),
  buyerName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  feedbackRequired: z.boolean().optional().default(false),
});

export const RescheduleShowingSchema = z.object({
  scheduledAt: z.coerce.date(),
});

/** PATCH body for editing a showing (date/time, property, notes) */
export const UpdateShowingSchema = z.object({
  scheduledAt: z.coerce.date().optional(),
  propertyId: z.string().uuid().optional(),
  notes: z.string().max(5000).optional().nullable(),
});

export type CreateShowingInput = z.infer<typeof CreateShowingSchema>;
export type RescheduleShowingInput = z.infer<typeof RescheduleShowingSchema>;
export type UpdateShowingInput = z.infer<typeof UpdateShowingSchema>;

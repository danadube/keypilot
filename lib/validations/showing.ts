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

export type CreateShowingInput = z.infer<typeof CreateShowingSchema>;
export type RescheduleShowingInput = z.infer<typeof RescheduleShowingSchema>;

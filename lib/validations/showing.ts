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

export type CreateShowingInput = z.infer<typeof CreateShowingSchema>;

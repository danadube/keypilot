import { z } from "zod";

/** Stored as JSON on Showing — boolean map only (merge on PATCH in the client). */
export const ShowingPrepChecklistFlagsSchema = z.record(z.string(), z.boolean());

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

const optionalBuyerAgentEmail = z
  .union([z.string().email(), z.literal("")])
  .optional()
  .nullable();

export const UpdateShowingSchema = z.object({
  scheduledAt: z.coerce.date().optional(),
  propertyId: z.string().uuid().optional(),
  notes: z.string().max(5000).optional().nullable(),
  buyerAgentName: z.string().max(500).optional().nullable(),
  buyerAgentEmail: optionalBuyerAgentEmail,
  /** Buyer-agent email draft workflow — user confirmed they sent the draft from their mail client. */
  feedbackRequestStatus: z.literal("SENT").optional(),
  /** Omit to leave unchanged; `null` clears stored JSON (SQL NULL). */
  prepChecklistFlags: ShowingPrepChecklistFlagsSchema.nullable().optional(),
});

export type CreateShowingInput = z.infer<typeof CreateShowingSchema>;
export type RescheduleShowingInput = z.infer<typeof RescheduleShowingSchema>;
export type UpdateShowingInput = z.infer<typeof UpdateShowingSchema>;

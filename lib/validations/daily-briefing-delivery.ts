import { z } from "zod";

export const DailyBriefingDeliveryPatchSchema = z.object({
  emailEnabled: z.boolean().optional(),
  sendLocalMinuteOfDay: z.number().int().min(0).max(1439).optional(),
  timeZone: z.string().min(2).max(80).optional(),
  /** Empty string clears override (use account email). */
  deliveryEmailOverride: z.union([z.string().email(), z.literal("")]).optional().nullable(),
});

export type DailyBriefingDeliveryPatchInput = z.infer<typeof DailyBriefingDeliveryPatchSchema>;

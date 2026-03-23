import { z } from "zod";

export const PropertySuggestQuerySchema = z.object({
  address1: z.string().min(1).max(500),
  city: z.string().min(1).max(120),
  state: z.string().min(2).max(32),
});

export const ShowingSuggestQuerySchema = z.object({
  propertyId: z.string().uuid(),
  scheduledAt: z.string().min(1).max(80),
  windowHours: z.coerce.number().int().min(2).max(4).optional().default(3),
});

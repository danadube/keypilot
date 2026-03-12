import { z } from "zod";

export const CreatePropertySchema = z.object({
  address1: z.string().min(1, "Address is required"),
  address2: z.string().optional().nullable(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z.string().min(1, "ZIP is required"),
  listingPrice: z.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const UpdatePropertySchema = z.object({
  address1: z.string().min(1).optional(),
  address2: z.string().optional().nullable(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  zip: z.string().min(1).optional(),
  listingPrice: z.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreatePropertyInput = z.infer<typeof CreatePropertySchema>;
export type UpdatePropertyInput = z.infer<typeof UpdatePropertySchema>;

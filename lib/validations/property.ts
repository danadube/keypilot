import { z } from "zod";

export const CreatePropertySchema = z.object({
  mlsNumber: z.string().optional().nullable(),
  address1: z.string().min(1, "Address is required"),
  address2: z.string().optional().nullable(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z.string().min(1, "ZIP is required"),
  listingPrice: z.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const UpdatePropertySchema = z.object({
  mlsNumber: z.string().optional().nullable(),
  address1: z.string().min(1).optional(),
  address2: z.string().optional().nullable(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  zip: z.string().min(1).optional(),
  listingPrice: z.number().positive().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  notes: z.string().optional().nullable(),
});

/** Soft-archive a property (sets deletedAt). Body must be only `{ "archive": true }`. */
export const ArchivePropertyBodySchema = z.object({
  archive: z.literal(true),
});

/** POST /api/v1/properties/[id]/primary-contact — link ClientKeep contact as listing primary client. */
export const LinkPrimaryContactBodySchema = z.object({
  contactId: z.string().uuid(),
});

export type CreatePropertyInput = z.infer<typeof CreatePropertySchema>;
export type UpdatePropertyInput = z.infer<typeof UpdatePropertySchema>;

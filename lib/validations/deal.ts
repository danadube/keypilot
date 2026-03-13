import { z } from "zod";

const DealStatusEnum = z.enum([
  "INTERESTED",
  "SHOWING",
  "OFFER",
  "NEGOTIATION",
  "UNDER_CONTRACT",
  "CLOSED",
  "LOST",
]);

export const CreateDealSchema = z.object({
  contactId: z.string().uuid(),
  propertyId: z.string().uuid(),
});

export const UpdateDealSchema = z.object({
  status: DealStatusEnum.optional(),
  notes: z.string().max(5000).optional().nullable(),
});

export type CreateDealInput = z.infer<typeof CreateDealSchema>;
export type UpdateDealInput = z.infer<typeof UpdateDealSchema>;

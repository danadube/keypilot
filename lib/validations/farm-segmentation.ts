import { z } from "zod";

export const CreateFarmTerritorySchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(5000).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const PatchFarmTerritorySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const CreateFarmAreaSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(5000).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const PatchFarmAreaSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const CreateContactFarmMembershipSchema = z.object({
  contactId: z.string().uuid(),
  farmAreaId: z.string().uuid(),
  notes: z.string().max(2000).optional().nullable(),
});

export type CreateFarmTerritoryInput = z.infer<typeof CreateFarmTerritorySchema>;
export type CreateFarmAreaInput = z.infer<typeof CreateFarmAreaSchema>;

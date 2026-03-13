import { z } from "zod";

export const CreateTagSchema = z.object({
  name: z.string().min(1, "Tag name required").max(50).trim(),
});

export const AddTagToContactSchema = z.object({
  tagName: z.string().min(1, "Tag name required").max(50).trim(),
});

export type CreateTagInput = z.infer<typeof CreateTagSchema>;
export type AddTagToContactInput = z.infer<typeof AddTagToContactSchema>;

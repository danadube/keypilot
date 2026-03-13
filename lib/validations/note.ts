import { z } from "zod";

export const AddNoteSchema = z
  .object({
    body: z.string().max(5000),
  })
  .refine((data) => data.body.trim().length >= 1, {
    message: "Note cannot be empty",
    path: ["body"],
  });

export type AddNoteInput = z.infer<typeof AddNoteSchema>;

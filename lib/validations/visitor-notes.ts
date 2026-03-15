import { z } from "zod";

export const VisitorNotesSchema = z.object({
  visitorNotes: z.string().max(2000).optional().nullable().or(z.literal("")),
  visitorTags: z.array(z.string().max(50)).max(10).optional().nullable(),
});

export type VisitorNotesInput = z.infer<typeof VisitorNotesSchema>;

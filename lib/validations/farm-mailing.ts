import { z } from "zod";

export const FarmMailingRecipientsQuerySchema = z
  .object({
    territoryId: z.string().uuid().optional(),
    farmAreaId: z.string().uuid().optional(),
    format: z.enum(["json", "html"]).optional().default("json"),
    /** When true, response omits `recipients` (same server-side resolution; smaller payload). */
    summaryOnly: z.boolean().optional().default(false),
  })
  .strict()
  .refine(
    (q) => Boolean(q.territoryId) !== Boolean(q.farmAreaId),
    { message: "Provide exactly one of territoryId or farmAreaId", path: ["territoryId"] }
  );

export type FarmMailingRecipientsQuery = z.infer<typeof FarmMailingRecipientsQuerySchema>;

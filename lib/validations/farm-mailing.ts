import { z } from "zod";

export const FarmMailingRecipientsQuerySchema = z
  .object({
    territoryId: z.string().uuid().optional(),
    farmAreaId: z.string().uuid().optional(),
    format: z.enum(["json", "html"]).optional().default("json"),
  })
  .strict()
  .refine(
    (q) => Boolean(q.territoryId) !== Boolean(q.farmAreaId),
    { message: "Provide exactly one of territoryId or farmAreaId", path: ["territoryId"] }
  );

export type FarmMailingRecipientsQuery = z.infer<typeof FarmMailingRecipientsQuerySchema>;

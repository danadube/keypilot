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

const EXPORT_LABELS_MAX_IDS = 200;

export const FarmExportLabelsBodySchema = z.object({
  contactIds: z
    .array(z.string().min(1))
    .min(1, "Select at least one contact")
    .max(EXPORT_LABELS_MAX_IDS),
});

export type FarmExportLabelsBody = z.infer<typeof FarmExportLabelsBodySchema>;

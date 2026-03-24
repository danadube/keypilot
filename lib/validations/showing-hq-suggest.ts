import { z } from "zod";

function hasZip5(zip: string): boolean {
  const d = zip.replace(/\D/g, "");
  return d.length >= 5;
}

export const PropertySuggestQuerySchema = z
  .object({
    address1: z.string().min(1).max(500),
    city: z.string().max(120).optional().default(""),
    state: z.string().min(2).max(32),
    zip: z.string().max(32).optional().default(""),
  })
  .refine((d) => d.city.trim().length > 0 || hasZip5(d.zip), {
    message: "city or a ZIP (at least 5 digits) is required",
    path: ["city"],
  });

const uuid = z.string().uuid();

export const ShowingSuggestQuerySchema = z
  .object({
    propertyId: z.string().uuid().optional(),
    candidatePropertyIds: z.string().max(500).optional(),
    scheduledAt: z.string().min(1).max(80),
    windowHours: z.coerce.number().int().min(2).max(6).optional().default(4),
  })
  .superRefine((data, ctx) => {
    const parts =
      data.candidatePropertyIds
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) ?? [];
    if (!data.propertyId && parts.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "propertyId or candidatePropertyIds is required",
        path: ["propertyId"],
      });
    }
    if (parts.length > 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "at most 5 candidate property ids",
        path: ["candidatePropertyIds"],
      });
    }
    for (const id of parts) {
      const r = uuid.safeParse(id);
      if (!r.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "candidatePropertyIds must be comma-separated UUIDs",
          path: ["candidatePropertyIds"],
        });
        break;
      }
    }
  });

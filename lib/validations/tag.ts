import { z } from "zod";

export const CreateTagSchema = z.object({
  name: z.string().min(1, "Tag name required").max(50).trim(),
});

export const AddTagToContactSchema = z.object({
  tagName: z.string().min(1, "Tag name required").max(50).trim(),
});

const BULK_TAG_MAX_CONTACTS = 200;

/** Bulk-assign a tag to many contacts (FarmTrackr / CRM). Provide tagId or tagName (not required together). */
export const BulkTagContactsSchema = z
  .object({
    contactIds: z
      .array(z.string().min(1))
      .min(1, "Select at least one contact")
      .max(BULK_TAG_MAX_CONTACTS),
    tagId: z.string().min(1).optional(),
    tagName: z.string().max(50).optional(),
  })
  .superRefine((val, ctx) => {
    const name = val.tagName?.trim() ?? "";
    const hasName = name.length > 0;
    const hasId = !!val.tagId?.trim();
    if (!hasId && !hasName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose an existing tag or enter a new tag name",
        path: ["tagName"],
      });
    }
  });

export type CreateTagInput = z.infer<typeof CreateTagSchema>;
export type AddTagToContactInput = z.infer<typeof AddTagToContactSchema>;

import { z } from "zod";

const ContactStatusEnum = z.enum([
  "FARM",
  "LEAD",
  "CONTACTED",
  "NURTURING",
  "READY",
  "LOST",
]);

/** Dashboard/manual create (POST /api/v1/contacts). Email and phone optional; dedupe on server. */
export const CreateContactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.preprocess(
    (v) => {
      if (v === undefined || v === null) return null;
      if (typeof v !== "string") return v;
      const t = v.trim();
      return t === "" ? null : t;
    },
    z.union([z.null(), z.string().email("Enter a valid email")])
  ),
  phone: z.preprocess(
    (v) => {
      if (v === undefined || v === null) return null;
      if (typeof v !== "string") return v;
      const t = v.trim();
      return t === "" ? null : t;
    },
    z.union([z.null(), z.string()])
  ),
  notes: z.preprocess(
    (v) => {
      if (v === undefined || v === null) return null;
      if (typeof v !== "string") return v;
      const t = v.trim();
      return t === "" ? null : t;
    },
    z.union([z.null(), z.string()])
  ),
});

export type CreateContactInput = z.infer<typeof CreateContactSchema>;

const optionalTrimmedNullable = z.preprocess(
  (v) => {
    if (v === undefined) return undefined;
    if (v === null) return null;
    if (typeof v !== "string") return v;
    const t = v.trim();
    return t === "" ? null : t;
  },
  z.union([z.null(), z.string()]).optional()
);

const optionalEmailTrimmed = z.preprocess(
  (v) => {
    if (v === undefined) return undefined;
    if (v === null) return null;
    if (typeof v !== "string") return v;
    const t = v.trim();
    return t === "" ? null : t.toLowerCase();
  },
  z.union([z.null(), z.string().email("Enter a valid email")]).optional()
);

export const UpdateContactSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  email2: optionalEmailTrimmed,
  email3: optionalEmailTrimmed,
  email4: optionalEmailTrimmed,
  phone2: optionalTrimmedNullable,
  hasAgent: z.boolean().optional().nullable(),
  timeline: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: ContactStatusEnum.optional().nullable(),
  assignedToUserId: z.string().uuid().optional().nullable(),
  mailingStreet1: optionalTrimmedNullable,
  mailingStreet2: optionalTrimmedNullable,
  mailingCity: optionalTrimmedNullable,
  mailingState: optionalTrimmedNullable,
  mailingZip: optionalTrimmedNullable,
  siteStreet1: optionalTrimmedNullable,
  siteStreet2: optionalTrimmedNullable,
  siteCity: optionalTrimmedNullable,
  siteState: optionalTrimmedNullable,
  siteZip: optionalTrimmedNullable,
});

const BULK_PROMOTE_FARM_TO_LEAD_MAX = 200;

/** Promote contacts from FARM → LEAD. Non-FARM or inaccessible IDs are skipped. */
export const BulkPromoteFarmToLeadSchema = z.object({
  contactIds: z
    .array(z.string().min(1))
    .min(1, "Select at least one contact")
    .max(BULK_PROMOTE_FARM_TO_LEAD_MAX),
});

export type BulkPromoteFarmToLeadInput = z.infer<typeof BulkPromoteFarmToLeadSchema>;

export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;

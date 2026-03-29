import { z } from "zod";

export const VisitorSignInSchema = z
  .object({
    openHouseId: z.string().uuid(),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    hasAgent: z.boolean().optional().nullable(),
    interestLevel: z.enum(["VERY_INTERESTED", "MAYBE_INTERESTED", "JUST_BROWSING"]).optional().nullable(),
    timeline: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    signInMethod: z.enum(["TABLET", "QR", "MANUAL"]),
  })
  .refine(
    (data) => {
      const hasEmail = data.email && data.email.trim().length > 0;
      const hasPhone = data.phone && data.phone.trim().length > 0;
      return hasEmail || hasPhone;
    },
    { message: "At least email or phone must be provided", path: ["email"] }
  );

export type VisitorSignInInput = z.infer<typeof VisitorSignInSchema>;

export const VisitorLeadStatusEnum = z.enum([
  "NEW",
  "INTERESTED",
  "HOT_BUYER",
  "SELLER_LEAD",
  "NEIGHBOR",
  "ARCHIVED",
]);

const optionalContactEmail = z
  .union([z.string().email(), z.literal("")])
  .optional()
  .nullable();

export const UpdateVisitorContactPatchSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: optionalContactEmail,
  phone: z.string().optional().nullable(),
});

export const UpdateVisitorSchema = z
  .object({
    leadStatus: VisitorLeadStatusEnum.optional(),
    interestLevel: z
      .enum(["VERY_INTERESTED", "MAYBE_INTERESTED", "JUST_BROWSING"])
      .optional()
      .nullable(),
    contact: UpdateVisitorContactPatchSchema.optional(),
  })
  .refine(
    (data) =>
      data.leadStatus !== undefined ||
      data.interestLevel !== undefined ||
      data.contact !== undefined,
    { message: "No updates provided" }
  );

export type UpdateVisitorInput = z.infer<typeof UpdateVisitorSchema>;

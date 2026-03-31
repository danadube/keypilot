import { z } from "zod";

const ContactStatusEnum = z.enum([
  "LEAD",
  "CONTACTED",
  "NURTURING",
  "READY",
  "LOST",
]);

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/** Dashboard + New → Contact (dedupes within contacts the user already sees). */
export const CreateContactSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.union([z.string().email(), z.literal("")]).optional(),
    phone: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const email = data.email?.trim() ?? "";
    const phoneDigits = digitsOnly(data.phone?.trim() ?? "");
    if (!email && phoneDigits.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid email or a phone number with at least 10 digits",
        path: ["email"],
      });
    }
  });

export type CreateContactInput = z.infer<typeof CreateContactSchema>;

export const UpdateContactSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  hasAgent: z.boolean().optional().nullable(),
  timeline: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: ContactStatusEnum.optional().nullable(),
  assignedToUserId: z.string().uuid().optional().nullable(),
});

export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;

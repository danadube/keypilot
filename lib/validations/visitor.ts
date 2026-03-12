import { z } from "zod";

export const VisitorSignInSchema = z
  .object({
    openHouseId: z.string().uuid(),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    hasAgent: z.boolean().optional().nullable(),
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

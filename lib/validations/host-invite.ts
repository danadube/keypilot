import { z } from "zod";

const HOST_ROLES = ["LISTING_AGENT", "HOST_AGENT", "ASSISTANT"] as const;

export const CreateHostInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(HOST_ROLES).default("HOST_AGENT"),
});

export type CreateHostInviteInput = z.infer<typeof CreateHostInviteSchema>;

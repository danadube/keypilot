import { z } from "zod";

const FollowUpStatusEnum = z.enum([
  "DRAFT",
  "REVIEWED",
  "SENT_MANUAL",
  "ARCHIVED",
]);

export const UpdateFollowUpDraftSchema = z.object({
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
});

export const UpdateFollowUpStatusSchema = z.object({
  status: FollowUpStatusEnum,
});

export type UpdateFollowUpDraftInput = z.infer<typeof UpdateFollowUpDraftSchema>;
export type UpdateFollowUpStatusInput = z.infer<
  typeof UpdateFollowUpStatusSchema
>;

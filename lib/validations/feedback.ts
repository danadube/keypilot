import { z } from "zod";

export const FEEDBACK_INTEREST_LEVELS = [
  "LOVED_IT",
  "LIKED_IT",
  "NEUTRAL",
  "NOT_A_FIT",
] as const;

export const FEEDBACK_REASONS = [
  "PRICE",
  "LAYOUT",
  "KITCHEN",
  "BACKYARD",
  "LOCATION",
  "CONDITION",
  "OTHER",
] as const;

export const SubmitFeedbackSchema = z.object({
  token: z.string().min(1, "Token required"),
  interestLevel: z.enum(FEEDBACK_INTEREST_LEVELS),
  reasons: z.array(z.enum(FEEDBACK_REASONS)).optional().default([]),
  note: z.string().max(2000).optional().nullable(),
});

export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackSchema>;

import { z } from "zod";

export const LogCommunicationSchema = z.object({
  channel: z.enum(["CALL", "EMAIL"]),
  body: z.string().min(1, "Note required").max(2000),
});

export type LogCommunicationInput = z.infer<typeof LogCommunicationSchema>;

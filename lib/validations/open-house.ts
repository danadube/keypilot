import { z } from "zod";

export const CreateOpenHouseSchema = z
  .object({
    propertyId: z.string().uuid(),
    title: z.string().min(1, "Title is required"),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    agentName: z.string().optional().nullable(),
    agentEmail: z.string().optional().nullable(),
    agentPhone: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .refine((data) => data.endAt > data.startAt, {
    message: "End time must be after start time",
    path: ["endAt"],
  });

export const UpdateOpenHouseSchema = z
  .object({
    propertyId: z.string().uuid().optional(),
    title: z.string().min(1).optional(),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
    agentName: z.string().optional().nullable(),
    agentEmail: z.string().optional().nullable(),
    agentPhone: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startAt && data.endAt) return data.endAt > data.startAt;
      return true;
    },
    { message: "End time must be after start time", path: ["endAt"] }
  );

export type CreateOpenHouseInput = z.infer<typeof CreateOpenHouseSchema>;
export type UpdateOpenHouseInput = z.infer<typeof UpdateOpenHouseSchema>;

import { z } from "zod";

/** Full enum for list GET `status=` (includes DRAFT). */
export const OPEN_HOUSE_LIST_STATUSES_FOR_GET = [
  "DRAFT",
  "SCHEDULED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
] as const;

export const OpenHousesListGetQuerySchema = z.object({
  status: z.enum(OPEN_HOUSE_LIST_STATUSES_FOR_GET).optional(),
  q: z.string().max(400).optional(),
});

export type OpenHousesListGetQuery = z.infer<typeof OpenHousesListGetQuerySchema>;

export const CreateOpenHouseSchema = z
  .object({
    propertyId: z.string().uuid(),
    title: z.string().min(1, "Title is required"),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    listingAgentId: z.string().uuid().optional(),
    hostAgentId: z.string().uuid().optional().nullable(),
    agentName: z.string().optional().nullable(),
    agentEmail: z.string().optional().nullable(),
    agentPhone: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .refine((data) => data.endAt > data.startAt, {
    message: "End time must be after start time",
    path: ["endAt"],
  });

export const HOST_FEEDBACK_TAGS = [
  "price high",
  "kitchen dated",
  "layout liked",
  "backyard liked",
  "location concern",
] as const;

export const TRAFFIC_LEVELS = ["LOW", "MODERATE", "HIGH", "VERY_HIGH"] as const;

export const HostFeedbackSchema = z.object({
  trafficLevel: z.enum(["LOW", "MODERATE", "HIGH", "VERY_HIGH"]).optional().nullable(),
  feedbackTags: z.array(z.enum(HOST_FEEDBACK_TAGS)).optional().nullable(),
  hostNotes: z.string().max(2000).optional().nullable(),
});

/** Stored as JSON on OpenHouse — boolean map only (client merges before PUT). */
export const OpenHousePrepChecklistFlagsSchema = z.record(z.string(), z.boolean());

export const OPEN_HOUSE_STATUSES = ["SCHEDULED", "ACTIVE", "COMPLETED", "CANCELLED"] as const;

export const UpdateOpenHouseSchema = z
  .object({
    propertyId: z.string().uuid().optional(),
    title: z.string().min(1).optional(),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
    status: z.enum(OPEN_HOUSE_STATUSES).optional(),
    listingAgentId: z.string().uuid().optional().nullable(),
    hostAgentId: z.string().uuid().optional().nullable(),
    agentName: z.string().optional().nullable(),
    agentEmail: z.string().optional().nullable(),
    agentPhone: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    prepChecklistFlags: OpenHousePrepChecklistFlagsSchema.optional(),
    ...HostFeedbackSchema.shape,
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
export type HostFeedbackInput = z.infer<typeof HostFeedbackSchema>;

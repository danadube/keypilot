import { z } from "zod";

/** Normalized calendar row — view layer over module data; room for `external` later (e.g. Google). */
export const CalendarSourceTypeSchema = z.enum([
  "showing",
  "task",
  "follow_up",
  "transaction",
  "external",
  /** Built-in read-only layers (e.g. US federal holidays). */
  "holiday",
]);

export type CalendarSourceType = z.infer<typeof CalendarSourceTypeSchema>;

export const CalendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  start: z.string(),
  end: z.string(),
  allDay: z.boolean(),
  sourceType: CalendarSourceTypeSchema,
  sourceLabel: z.string(),
  relatedRoute: z.string(),
  relatedEntityId: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

export const CalendarEventsResponseSchema = z.object({
  events: z.array(CalendarEventSchema),
});

export type CalendarEventsResponse = z.infer<typeof CalendarEventsResponseSchema>;

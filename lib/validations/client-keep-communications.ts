import { z } from "zod";

export const clientKeepCommunicationsDoFirstKindSchema = z.enum([
  "overdue_reminder",
  "overdue_follow_up",
  "draft",
]);

export const clientKeepCommunicationsDoFirstItemSchema = z.object({
  kind: clientKeepCommunicationsDoFirstKindSchema,
  id: z.string(),
  headline: z.string(),
  subline: z.string().optional(),
  dueAt: z.string().optional(),
  href: z.string(),
  contactId: z.string(),
  contactName: z.string(),
});

export const clientKeepCommunicationsScheduledKindSchema = z.enum([
  "reminder",
  "follow_up_task",
  "crm_task",
]);

export const clientKeepCommunicationsScheduledItemSchema = z.object({
  kind: clientKeepCommunicationsScheduledKindSchema,
  id: z.string(),
  label: z.string(),
  subline: z.string(),
  dueAt: z.string(),
  href: z.string(),
  contactId: z.string().nullable().optional(),
  contactName: z.string().optional(),
});

export const clientKeepCommunicationsRecentItemSchema = z.object({
  id: z.string(),
  typeLabel: z.string(),
  title: z.string(),
  subline: z.string().optional(),
  eventAt: z.string(),
  href: z.string(),
  contactName: z.string().optional(),
});

export const clientKeepCommunicationsResponseSchema = z.object({
  doFirst: z.array(clientKeepCommunicationsDoFirstItemSchema),
  scheduled: z.array(clientKeepCommunicationsScheduledItemSchema),
  recent: z.array(clientKeepCommunicationsRecentItemSchema),
});

export type ClientKeepCommunicationsResponse = z.infer<
  typeof clientKeepCommunicationsResponseSchema
>;

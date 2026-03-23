import { z } from "zod";
import {
  SupraQueueState,
  SupraParseConfidence,
  SupraPropertyMatchStatus,
  SupraShowingMatchStatus,
  SupraProposedAction,
} from "@prisma/client";

export const CreateSupraQueueItemSchema = z.object({
  externalMessageId: z.string().min(1).max(500),
  subject: z.string().min(1).max(500),
  receivedAt: z.coerce.date(),
  rawBodyText: z.string().min(1).max(500_000),
  sender: z.string().max(500).optional().nullable(),
  parsedAddress1: z.string().max(500).optional().nullable(),
  parsedCity: z.string().max(200).optional().nullable(),
  parsedState: z.string().max(50).optional().nullable(),
  parsedZip: z.string().max(20).optional().nullable(),
  parsedScheduledAt: z.coerce.date().optional().nullable(),
  parsedEventKind: z.string().max(200).optional().nullable(),
  parsedStatus: z.string().max(200).optional().nullable(),
  parsedAgentName: z.string().max(300).optional().nullable(),
  parsedAgentEmail: z
    .union([z.string().email(), z.literal("")])
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v)),
  parseConfidence: z.nativeEnum(SupraParseConfidence).optional(),
  proposedAction: z.nativeEnum(SupraProposedAction).optional(),
  queueState: z.nativeEnum(SupraQueueState).optional(),
  propertyMatchStatus: z.nativeEnum(SupraPropertyMatchStatus).optional(),
  showingMatchStatus: z.nativeEnum(SupraShowingMatchStatus).optional(),
});

export const UpdateSupraQueueItemSchema = z
  .object({
    subject: z.string().min(1).max(500).optional(),
    rawBodyText: z.string().min(1).max(500_000).optional(),
    sender: z.string().max(500).optional().nullable(),
    parsedAddress1: z.string().max(500).optional().nullable(),
    parsedCity: z.string().max(200).optional().nullable(),
    parsedState: z.string().max(50).optional().nullable(),
    parsedZip: z.string().max(20).optional().nullable(),
    parsedScheduledAt: z.coerce.date().optional().nullable(),
    parsedEventKind: z.string().max(200).optional().nullable(),
    parsedStatus: z.string().max(200).optional().nullable(),
    parsedAgentName: z.string().max(300).optional().nullable(),
    parsedAgentEmail: z
      .union([z.string().email(), z.literal("")])
      .optional()
      .nullable()
      .transform((v) => (v === "" ? null : v)),
    parseConfidence: z.nativeEnum(SupraParseConfidence).optional(),
    proposedAction: z.nativeEnum(SupraProposedAction).optional(),
    matchedPropertyId: z.string().uuid().optional().nullable(),
    matchedShowingId: z.string().uuid().optional().nullable(),
    propertyMatchStatus: z.nativeEnum(SupraPropertyMatchStatus).optional(),
    showingMatchStatus: z.nativeEnum(SupraShowingMatchStatus).optional(),
    queueState: z.nativeEnum(SupraQueueState).optional(),
    resolutionNotes: z.string().max(10_000).optional().nullable(),
  })
  .strict();

export type CreateSupraQueueItemInput = z.infer<typeof CreateSupraQueueItemSchema>;
export type UpdateSupraQueueItemInput = z.infer<typeof UpdateSupraQueueItemSchema>;

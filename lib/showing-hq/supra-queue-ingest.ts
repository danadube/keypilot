/**
 * Shared Supra queue ingestion (manual paste, Gmail import, future sources).
 * Creates INGESTED rows only — parse/apply stay elsewhere.
 */

import { prismaAdmin } from "@/lib/db";
import {
  SupraParseConfidence,
  SupraProposedAction,
  SupraPropertyMatchStatus,
  SupraQueueState,
  SupraShowingMatchStatus,
} from "@prisma/client";

export const supraQueueListInclude = {
  matchedProperty: {
    select: { id: true, address1: true, city: true, state: true, zip: true },
  },
  matchedShowing: {
    select: { id: true, scheduledAt: true, propertyId: true },
  },
} as const;

export type IngestedSupraQueueInput = {
  externalMessageId: string;
  subject: string;
  rawBodyText: string;
  sender: string | null;
  receivedAt: Date;
};

/** Create a new INGESTED row (caller must ensure externalMessageId is unused). */
export async function createIngestedSupraQueueItem(
  hostUserId: string,
  input: IngestedSupraQueueInput
) {
  return prismaAdmin.supraQueueItem.create({
    data: {
      hostUserId,
      externalMessageId: input.externalMessageId,
      subject: input.subject.trim().slice(0, 500),
      rawBodyText: input.rawBodyText,
      sender: input.sender
        ? input.sender.trim().slice(0, 500) || null
        : null,
      receivedAt: input.receivedAt,
      queueState: SupraQueueState.INGESTED,
    },
    include: supraQueueListInclude,
  });
}

/** Do not overwrite bodies for rows that are finalized or deduped. */
const GMAIL_BODY_REFRESH_SKIP_STATES: SupraQueueState[] = [
  SupraQueueState.APPLIED,
  SupraQueueState.DUPLICATE,
];

export type SupraGmailIngestStatus = "imported" | "skipped" | "refreshed";

/**
 * Gmail idempotent ingest: create new row, or refresh body/metadata for an existing row
 * (so improved HTML/plain extraction can replace stale `rawBodyText` on re-import).
 * Skips only APPLIED / DUPLICATE. Refresh clears parsed + match fields and resets to INGESTED.
 */
export async function ingestSupraQueueItemIfNew(
  hostUserId: string,
  input: IngestedSupraQueueInput
): Promise<{ status: SupraGmailIngestStatus }> {
  const existing = await prismaAdmin.supraQueueItem.findUnique({
    where: {
      hostUserId_externalMessageId: {
        hostUserId,
        externalMessageId: input.externalMessageId,
      },
    },
    select: { id: true, queueState: true },
  });

  if (!existing) {
    await createIngestedSupraQueueItem(hostUserId, input);
    return { status: "imported" };
  }

  if (GMAIL_BODY_REFRESH_SKIP_STATES.includes(existing.queueState)) {
    return { status: "skipped" };
  }

  await prismaAdmin.supraQueueItem.update({
    where: { id: existing.id },
    data: {
      subject: input.subject.trim().slice(0, 500),
      rawBodyText: input.rawBodyText,
      sender: input.sender
        ? input.sender.trim().slice(0, 500) || null
        : null,
      receivedAt: input.receivedAt,
      parsedAddress1: null,
      parsedCity: null,
      parsedState: null,
      parsedZip: null,
      parsedScheduledAt: null,
      parsedEventKind: null,
      parsedStatus: null,
      parsedAgentName: null,
      parsedAgentEmail: null,
      parseConfidence: SupraParseConfidence.LOW,
      proposedAction: SupraProposedAction.UNKNOWN,
      queueState: SupraQueueState.INGESTED,
      matchedPropertyId: null,
      matchedShowingId: null,
      propertyMatchStatus: SupraPropertyMatchStatus.UNSET,
      showingMatchStatus: SupraShowingMatchStatus.UNSET,
      reviewedAt: null,
      reviewedByUserId: null,
      resolutionNotes: null,
    },
  });

  return { status: "refreshed" };
}

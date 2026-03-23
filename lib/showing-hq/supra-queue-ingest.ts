/**
 * Shared Supra queue ingestion (manual paste, Gmail import, future sources).
 * Creates INGESTED rows only — parse/apply stay elsewhere.
 */

import { prismaAdmin } from "@/lib/db";
import { SupraQueueState } from "@prisma/client";

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

/** Idempotent ingest: skip if hostUserId + externalMessageId already exists. */
export async function ingestSupraQueueItemIfNew(
  hostUserId: string,
  input: IngestedSupraQueueInput
): Promise<{ status: "imported" | "skipped" }> {
  const existing = await prismaAdmin.supraQueueItem.findUnique({
    where: {
      hostUserId_externalMessageId: {
        hostUserId,
        externalMessageId: input.externalMessageId,
      },
    },
    select: { id: true },
  });
  if (existing) return { status: "skipped" };
  await createIngestedSupraQueueItem(hostUserId, input);
  return { status: "imported" };
}

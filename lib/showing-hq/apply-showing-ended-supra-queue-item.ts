/**
 * Record a Supra end-of-showing notification on the matched Showing and close the queue row.
 * Does not change Showing.scheduledAt (that stays the appointment start); appends an audit line from the parsed end time.
 */

import {
  ShowingSource,
  SupraPropertyMatchStatus,
  SupraQueueState,
  SupraShowingMatchStatus,
} from "@prisma/client";
import { prismaAdmin } from "@/lib/db";

const BLOCKED: SupraQueueState[] = [
  SupraQueueState.APPLIED,
  SupraQueueState.DISMISSED,
  SupraQueueState.DUPLICATE,
];

const MAX_NOTES_CHARS = 12_000;

function buildEndedNote(parsedEndAt: Date | null): string {
  if (parsedEndAt && !Number.isNaN(parsedEndAt.getTime())) {
    const when = parsedEndAt.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    return `Supra: private showing ended (per notification) at ${when}.`;
  }
  return "Supra: private showing ended (per notification — end time not parsed).";
}

export async function applyShowingEndedSupraQueueItem(args: {
  hostUserId: string;
  queueItemId: string;
  reviewedByUserId?: string | null;
}): Promise<
  | { ok: true }
  | {
      ok: false;
      code:
        | "NOT_FOUND"
        | "BLOCKED"
        | "NOT_END_EVENT"
        | "NO_MATCHED_SHOWING"
        | "SHOWING_NOT_FOUND"
        | "PROPERTY_MISMATCH";
    }
> {
  const item = await prismaAdmin.supraQueueItem.findFirst({
    where: { id: args.queueItemId, hostUserId: args.hostUserId },
  });
  if (!item) return { ok: false, code: "NOT_FOUND" };
  if (BLOCKED.includes(item.queueState)) return { ok: false, code: "BLOCKED" };
  if (item.parsedStatus !== "showing_ended") return { ok: false, code: "NOT_END_EVENT" };

  const sid = item.matchedShowingId?.trim();
  if (!sid) return { ok: false, code: "NO_MATCHED_SHOWING" };

  const showing = await prismaAdmin.showing.findFirst({
    where: { id: sid, hostUserId: args.hostUserId, deletedAt: null },
  });
  if (!showing) return { ok: false, code: "SHOWING_NOT_FOUND" };

  const resolvedPropertyId = item.matchedPropertyId?.trim() || showing.propertyId;
  if (resolvedPropertyId !== showing.propertyId) {
    return { ok: false, code: "PROPERTY_MISMATCH" };
  }

  const endedLine = buildEndedNote(item.parsedScheduledAt);
  const merged = [showing.notes?.trim(), endedLine].filter(Boolean).join("\n\n");
  const notesOut =
    merged.length > MAX_NOTES_CHARS
      ? `${merged.slice(0, MAX_NOTES_CHARS - 1)}…`
      : merged;

  await prismaAdmin.$transaction([
    prismaAdmin.showing.update({
      where: { id: showing.id },
      data: {
        notes: notesOut || null,
        source: ShowingSource.SUPRA_SCRAPE,
      },
    }),
    prismaAdmin.supraQueueItem.update({
      where: { id: item.id },
      data: {
        queueState: SupraQueueState.APPLIED,
        matchedPropertyId: resolvedPropertyId,
        matchedShowingId: sid,
        propertyMatchStatus: SupraPropertyMatchStatus.MATCHED,
        showingMatchStatus: SupraShowingMatchStatus.MATCHED,
        reviewedAt: new Date(),
        reviewedByUserId: args.reviewedByUserId ?? null,
      },
    }),
  ]);

  return { ok: true };
}

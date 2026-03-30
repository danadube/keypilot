/**
 * Apply Supra v1 email parser output to a queue row (shared by parse-draft API and Gmail import).
 */

import type { Prisma } from "@prisma/client";
import { SupraQueueState } from "@prisma/client";
import { prismaAdmin } from "@/lib/db";
import {
  buildManualParseDraftFromRaw,
  type SupraManualParseDraft,
} from "@/lib/integrations/supra/manual-parse-stub";
import { applyShowingEndedSupraQueueItem } from "@/lib/showing-hq/apply-showing-ended-supra-queue-item";
import { linkShowingEndedSupraQueueItem } from "@/lib/showing-hq/link-showing-ended-supra-queue-item";

export const supraQueueParseDraftListInclude = {
  matchedProperty: {
    select: { id: true, address1: true, city: true, state: true, zip: true },
  },
  matchedShowing: {
    select: { id: true, scheduledAt: true, propertyId: true },
  },
} as const;

export type SupraQueueItemAfterParse = Prisma.SupraQueueItemGetPayload<{
  include: typeof supraQueueParseDraftListInclude;
}>;

const PARSE_DRAFT_BLOCKED_STATES: SupraQueueState[] = [
  SupraQueueState.APPLIED,
  SupraQueueState.DISMISSED,
  SupraQueueState.DUPLICATE,
];

export type PersistedVsParserFieldKey =
  | "parsedAddress1"
  | "parsedCity"
  | "parsedState"
  | "parsedZip"
  | "parsedScheduledAt"
  | "parsedShowingBeganAt"
  | "parsedEventKind"
  | "parsedStatus"
  | "parsedAgentName"
  | "parsedAgentEmail"
  | "parseConfidence"
  | "proposedAction";

/** Compare DB row to what buildManualParseDraftFromRaw would write (same as POST parse-draft). */
export function comparePersistedToManualDraft(
  item: {
    parsedAddress1: string | null;
    parsedCity: string | null;
    parsedState: string | null;
    parsedZip: string | null;
    parsedScheduledAt: Date | null;
    parsedShowingBeganAt: Date | null;
    parsedEventKind: string | null;
    parsedStatus: string | null;
    parsedAgentName: string | null;
    parsedAgentEmail: string | null;
    parseConfidence: SupraManualParseDraft["parseConfidence"];
    proposedAction: SupraManualParseDraft["proposedAction"];
  },
  draft: SupraManualParseDraft
): Record<PersistedVsParserFieldKey, boolean> {
  const dateEq = (a: Date | null, b: Date | null) =>
    (a == null && b == null) ||
    (a != null && b != null && a.getTime() === b.getTime());

  return {
    parsedAddress1: item.parsedAddress1 === draft.parsedAddress1,
    parsedCity: item.parsedCity === draft.parsedCity,
    parsedState: item.parsedState === draft.parsedState,
    parsedZip: item.parsedZip === draft.parsedZip,
    parsedScheduledAt: dateEq(item.parsedScheduledAt, draft.parsedScheduledAt),
    parsedShowingBeganAt: dateEq(item.parsedShowingBeganAt, draft.parsedShowingBeganAt),
    parsedEventKind: item.parsedEventKind === draft.parsedEventKind,
    parsedStatus: item.parsedStatus === draft.parsedStatus,
    parsedAgentName: item.parsedAgentName === draft.parsedAgentName,
    parsedAgentEmail: item.parsedAgentEmail === draft.parsedAgentEmail,
    parseConfidence: item.parseConfidence === draft.parseConfidence,
    proposedAction: item.proposedAction === draft.proposedAction,
  };
}

export function allPersistedFieldsMatchManualDraft(
  item: Parameters<typeof comparePersistedToManualDraft>[0],
  draft: SupraManualParseDraft
): boolean {
  const row = comparePersistedToManualDraft(item, draft);
  return (Object.values(row) as boolean[]).every(Boolean);
}

export async function applySupraV1ParseDraftToQueueItem(args: {
  hostUserId: string;
  queueItemId: string;
}): Promise<
  | { ok: true; item: SupraQueueItemAfterParse }
  | { ok: false; code: "NOT_FOUND" | "BLOCKED_STATE" }
> {
  const item = await prismaAdmin.supraQueueItem.findFirst({
    where: { id: args.queueItemId, hostUserId: args.hostUserId },
  });
  if (!item) return { ok: false, code: "NOT_FOUND" };
  if (PARSE_DRAFT_BLOCKED_STATES.includes(item.queueState)) {
    return { ok: false, code: "BLOCKED_STATE" };
  }

  const draft = buildManualParseDraftFromRaw({
    subject: item.subject,
    rawBodyText: item.rawBodyText,
    sender: item.sender,
  });

  await prismaAdmin.supraQueueItem.update({
    where: { id: args.queueItemId },
    data: {
      parsedAddress1: draft.parsedAddress1,
      parsedCity: draft.parsedCity,
      parsedState: draft.parsedState,
      parsedZip: draft.parsedZip,
      parsedScheduledAt: draft.parsedScheduledAt,
      parsedShowingBeganAt: draft.parsedShowingBeganAt,
      parsedEventKind: draft.parsedEventKind,
      parsedStatus: draft.parsedStatus,
      parsedAgentName: draft.parsedAgentName,
      parsedAgentEmail: draft.parsedAgentEmail,
      parseConfidence: draft.parseConfidence,
      proposedAction: draft.proposedAction,
      queueState: SupraQueueState.NEEDS_REVIEW,
    },
  });

  try {
    const linked = await linkShowingEndedSupraQueueItem({
      hostUserId: args.hostUserId,
      queueItemId: args.queueItemId,
    });
    if (linked) {
      const applied = await applyShowingEndedSupraQueueItem({
        hostUserId: args.hostUserId,
        queueItemId: args.queueItemId,
        reviewedByUserId: null,
      });
      if (!applied.ok) {
        console.error("[supra-parse] auto-apply showing ended failed", {
          queueItemId: args.queueItemId,
          code: applied.code,
        });
      }
    }
  } catch (e) {
    console.error("[supra-parse] link showing ended failed (non-fatal)", e);
  }

  const afterLink = await prismaAdmin.supraQueueItem.findFirst({
    where: { id: args.queueItemId },
    include: supraQueueParseDraftListInclude,
  });
  if (!afterLink) return { ok: false, code: "NOT_FOUND" };

  return { ok: true, item: afterLink };
}

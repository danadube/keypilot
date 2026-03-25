/**
 * After Supra v1 parse: conservatively link an end-of-showing queue row to an existing Showing.
 * Does not create/update showings — only sets queue match fields when exactly one candidate fits.
 */

import {
  SupraPropertyMatchStatus,
  SupraShowingMatchStatus,
} from "@prisma/client";
import { prismaAdmin } from "@/lib/db";

/** Tight window around "that began" vs Showing.scheduledAt (same appointment, parsing tolerance) */
export const SHOWING_ENDED_LINK_BEGAN_WINDOW_MS = 30 * 60 * 1000;

function normAddrPart(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

function zipComparable(z: string): string {
  const t = z.trim();
  const m = t.match(/^(\d{5})(?:-(\d{4}))?$/);
  return m ? `${m[1]}${m[2] ? `-${m[2]}` : ""}` : normAddrPart(t);
}

function hasFullParsedAddress(args: {
  parsedAddress1: string | null;
  parsedCity: string | null;
  parsedState: string | null;
  parsedZip: string | null;
}): boolean {
  return Boolean(
    args.parsedAddress1?.trim() &&
      args.parsedCity?.trim() &&
      args.parsedState?.trim() &&
      args.parsedZip?.trim()
  );
}

async function resolvePropertyIdsForUser(args: {
  hostUserId: string;
  matchedPropertyId: string | null;
  parsedAddress1: string | null;
  parsedCity: string | null;
  parsedState: string | null;
  parsedZip: string | null;
}): Promise<string[] | null> {
  if (args.matchedPropertyId?.trim()) {
    const p = await prismaAdmin.property.findFirst({
      where: {
        id: args.matchedPropertyId.trim(),
        createdByUserId: args.hostUserId,
        deletedAt: null,
      },
      select: { id: true },
    });
    return p ? [p.id] : null;
  }

  if (!hasFullParsedAddress(args)) return null;

  const a1 = normAddrPart(args.parsedAddress1!);
  const city = normAddrPart(args.parsedCity!);
  const st = args.parsedState!.trim().toUpperCase();
  const z = zipComparable(args.parsedZip!);

  const rows = await prismaAdmin.property.findMany({
    where: {
      createdByUserId: args.hostUserId,
      deletedAt: null,
    },
    select: { id: true, address1: true, city: true, state: true, zip: true },
  });

  return rows
    .filter((r) => {
      if (normAddrPart(r.address1) !== a1) return false;
      if (normAddrPart(r.city) !== city) return false;
      if (r.state.trim().toUpperCase() !== st) return false;
      return zipComparable(r.zip) === z;
    })
    .map((r) => r.id);
}

function normEmail(e: string | null | undefined): string | null {
  const t = e?.trim().toLowerCase();
  return t ? t : null;
}

/**
 * If the queue item is a parsed end-of-showing row with a "began" time, try to set
 * matchedShowingId (and property match fields when resolved from address).
 * Returns true when a link was written.
 */
export async function linkShowingEndedSupraQueueItem(args: {
  hostUserId: string;
  queueItemId: string;
}): Promise<boolean> {
  const item = await prismaAdmin.supraQueueItem.findFirst({
    where: { id: args.queueItemId, hostUserId: args.hostUserId },
  });
  if (!item) return false;

  if (item.parsedStatus !== "showing_ended" || !item.parsedShowingBeganAt) {
    return false;
  }

  if (item.matchedShowingId?.trim()) {
    return false;
  }

  const propertyIds = await resolvePropertyIdsForUser({
    hostUserId: args.hostUserId,
    matchedPropertyId: item.matchedPropertyId,
    parsedAddress1: item.parsedAddress1,
    parsedCity: item.parsedCity,
    parsedState: item.parsedState,
    parsedZip: item.parsedZip,
  });

  if (!propertyIds || propertyIds.length === 0) return false;

  const began = item.parsedShowingBeganAt;
  const winStart = new Date(began.getTime() - SHOWING_ENDED_LINK_BEGAN_WINDOW_MS);
  const winEnd = new Date(began.getTime() + SHOWING_ENDED_LINK_BEGAN_WINDOW_MS);

  const candidates = await prismaAdmin.showing.findMany({
    where: {
      hostUserId: args.hostUserId,
      deletedAt: null,
      propertyId: { in: propertyIds },
      scheduledAt: { gte: winStart, lte: winEnd },
    },
    select: {
      id: true,
      propertyId: true,
      scheduledAt: true,
      buyerAgentEmail: true,
    },
  });

  let picked: { id: string; propertyId: string } | null = null;

  if (candidates.length === 1) {
    picked = { id: candidates[0].id, propertyId: candidates[0].propertyId };
  } else if (candidates.length > 1) {
    const email = normEmail(item.parsedAgentEmail);
    if (!email) return false;
    const narrowed = candidates.filter(
      (c) => normEmail(c.buyerAgentEmail) === email
    );
    if (narrowed.length === 1) {
      picked = { id: narrowed[0].id, propertyId: narrowed[0].propertyId };
    }
  }

  if (!picked) return false;

  await prismaAdmin.supraQueueItem.update({
    where: { id: args.queueItemId },
    data: {
      matchedShowingId: picked.id,
      matchedPropertyId: item.matchedPropertyId?.trim() || picked.propertyId,
      showingMatchStatus: SupraShowingMatchStatus.MATCHED,
      propertyMatchStatus: SupraPropertyMatchStatus.MATCHED,
    },
  });

  return true;
}

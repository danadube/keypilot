/**
 * Lightweight property/showing suggestions for Supra review (assist, don't decide).
 * No fuzzy scoring — exact normalized line + city/state, then contains on address1.
 */

import type { PrismaClient } from "@prisma/client";

const DEFAULT_PROPERTY_LIMIT = 5;
const DEFAULT_SHOWING_LIMIT = 10;
const MIN_PARTIAL_LEN = 4;

export function normalizeAddressLine(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type PropertySuggestionRow = {
  id: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
};

export type PropertySuggestion = PropertySuggestionRow & {
  matchKind: "exact" | "partial";
};

/**
 * Rank in-memory candidates: exact address1 (normalized) first, then partial contains.
 */
export function rankPropertySuggestions(
  candidates: PropertySuggestionRow[],
  parsed: { address1: string; city: string; state: string },
  max = DEFAULT_PROPERTY_LIMIT
): PropertySuggestion[] {
  const a1 = normalizeAddressLine(parsed.address1);
  if (!a1 || a1.length < MIN_PARTIAL_LEN) return [];

  const exact: PropertySuggestion[] = [];
  const partial: PropertySuggestion[] = [];
  const seen = new Set<string>();

  for (const p of candidates) {
    const db = normalizeAddressLine(p.address1);
    if (db === a1) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        exact.push({ ...p, matchKind: "exact" });
      }
    }
  }

  for (const p of candidates) {
    if (seen.has(p.id)) continue;
    const db = normalizeAddressLine(p.address1);
    const partialHit =
      (a1.length >= MIN_PARTIAL_LEN && db.includes(a1)) ||
      (db.length >= MIN_PARTIAL_LEN && a1.includes(db));
    if (partialHit) {
      seen.add(p.id);
      partial.push({ ...p, matchKind: "partial" });
    }
  }

  return [...exact, ...partial].slice(0, max);
}

export async function suggestPropertiesForUser(
  prisma: PrismaClient,
  userId: string,
  input: { address1: string; city: string; state: string }
): Promise<PropertySuggestion[]> {
  const city = input.city?.trim();
  const state = input.state?.trim();
  const address1 = input.address1?.trim();
  if (!city || !state || !address1) return [];

  const candidates = await prisma.property.findMany({
    where: {
      createdByUserId: userId,
      deletedAt: null,
      city: { equals: city, mode: "insensitive" },
      state: { equals: state, mode: "insensitive" },
    },
    select: {
      id: true,
      address1: true,
      city: true,
      state: true,
      zip: true,
    },
    take: 80,
  });

  return rankPropertySuggestions(candidates, { address1, city, state });
}

export type ShowingSuggestion = {
  id: string;
  scheduledAt: Date;
  /** Absolute difference from target in minutes */
  minutesDelta: number;
};

export function rankShowingsByTimeProximity(
  rows: { id: string; scheduledAt: Date }[],
  target: Date,
  windowMs: number,
  max = DEFAULT_SHOWING_LIMIT
): ShowingSuggestion[] {
  const t = target.getTime();
  const out: ShowingSuggestion[] = [];
  for (const r of rows) {
    const st = r.scheduledAt.getTime();
    const deltaMs = Math.abs(st - t);
    if (deltaMs <= windowMs) {
      out.push({
        id: r.id,
        scheduledAt: r.scheduledAt,
        minutesDelta: Math.round(deltaMs / 60000),
      });
    }
  }
  out.sort((a, b) => a.minutesDelta - b.minutesDelta);
  return out.slice(0, max);
}

export async function suggestShowingsForUser(
  prisma: PrismaClient,
  userId: string,
  input: { propertyId: string; scheduledAt: Date; windowHours: number }
): Promise<ShowingSuggestion[]> {
  const windowMs = Math.max(1, Math.min(6, input.windowHours)) * 60 * 60 * 1000;
  const start = new Date(input.scheduledAt.getTime() - windowMs);
  const end = new Date(input.scheduledAt.getTime() + windowMs);

  const owned = await prisma.property.findFirst({
    where: {
      id: input.propertyId,
      createdByUserId: userId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!owned) return [];

  const rows = await prisma.showing.findMany({
    where: {
      hostUserId: userId,
      propertyId: input.propertyId,
      deletedAt: null,
      scheduledAt: { gte: start, lte: end },
    },
    select: { id: true, scheduledAt: true },
    orderBy: { scheduledAt: "asc" },
    take: 40,
  });

  return rankShowingsByTimeProximity(rows, input.scheduledAt, windowMs);
}

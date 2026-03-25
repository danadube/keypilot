/**
 * Property/showing suggestions for Supra review (assist, don't decide).
 * Conservative matching: normalized address comparison, optional zip+state fallback,
 * ranked exact → zip-aligned partial → other partial.
 */

import type { PrismaClient } from "@prisma/client";

const DEFAULT_PROPERTY_LIMIT = 5;
const DEFAULT_SHOWING_LIMIT = 10;
const MIN_PARTIAL_LEN = 4;

/** US ZIP: first 5 digits when present */
export function parseZip5(zip: string | undefined | null): string | null {
  const d = (zip ?? "").replace(/\D/g, "");
  return d.length >= 5 ? d.slice(0, 5) : null;
}

const STREET_ABBR: Record<string, string> = {
  dr: "drive",
  st: "street",
  ave: "avenue",
  rd: "road",
  ln: "lane",
  blvd: "boulevard",
  ct: "court",
  cir: "circle",
  pl: "place",
  ter: "terrace",
  pkwy: "parkway",
  hwy: "highway",
};

/**
 * Human-visible normalization (legacy); prefer normalizeAddressForMatch for equality.
 */
export function normalizeAddressLine(s: string): string {
  return normalizeAddressForMatch(s);
}

/**
 * Collapse punctuation, units, accents; expand common street-type abbreviations for matching.
 */
export function normalizeAddressForMatch(s: string): string {
  const t = s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,#'"/]/g, " ")
    .replace(/\b(unit|apt|apartment|ste|suite|bldg|building)\b\.?\s*[\w-]*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const parts = t.split(" ").filter(Boolean);
  const expanded = parts.map((p) => STREET_ABBR[p] ?? p);
  return expanded.join(" ");
}

function addressMatchTokens(norm: string): Set<string> {
  const STOP = new Set([
    "the",
    "n",
    "s",
    "e",
    "w",
    "ne",
    "nw",
    "se",
    "sw",
    "north",
    "south",
    "east",
    "west",
  ]);
  return new Set(
    norm
      .split(" ")
      .filter((w) => w.length > 0 && !STOP.has(w))
  );
}

function tokenOverlapScore(aNorm: string, bNorm: string): number {
  const A = addressMatchTokens(aNorm);
  const B = addressMatchTokens(bNorm);
  if (A.size === 0 || B.size === 0) return 0;
  let n = 0;
  A.forEach((x) => {
    if (B.has(x)) n += 1;
  });
  return n;
}

function leadingStreetNumber(norm: string): string | null {
  const m = norm.match(/^(\d+[a-z]?)\b/);
  return m ? m[1]! : null;
}

export type PropertySuggestionRow = {
  id: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
};

export type PropertyMatchKind = "exact" | "partial_zip" | "partial";

export type PropertySuggestion = PropertySuggestionRow & {
  matchKind: PropertyMatchKind;
};

export type ParsedPropertySuggestInput = {
  address1: string;
  city: string;
  state: string;
  /** When set, enables zip+state DB path and zip-boosted ranking */
  zip?: string;
};

/**
 * Rank candidates: exact (normalized) first, then partial with ZIP alignment, then other partials.
 * Within partials, prefer higher token overlap and matching leading street numbers.
 */
export function rankPropertySuggestions(
  candidates: PropertySuggestionRow[],
  parsed: ParsedPropertySuggestInput,
  max = DEFAULT_PROPERTY_LIMIT
): PropertySuggestion[] {
  const rawLine = parsed.address1?.trim() ?? "";
  const a1 = normalizeAddressForMatch(rawLine);
  if (!a1 || a1.length < MIN_PARTIAL_LEN) return [];

  const parsedZip5 = parseZip5(parsed.zip);
  const numA = leadingStreetNumber(a1);

  const exact: PropertySuggestion[] = [];
  const partialZip: PropertySuggestion[] = [];
  const partialOther: PropertySuggestion[] = [];
  const seen = new Set<string>();

  for (const p of candidates) {
    const db = normalizeAddressForMatch(p.address1);
    if (db === a1) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        exact.push({ ...p, matchKind: "exact" });
      }
    }
  }

  const zipMatchesParsed = (p: PropertySuggestionRow): boolean => {
    if (!parsedZip5) return false;
    const z5 = parseZip5(p.zip);
    return z5 === parsedZip5;
  };

  for (const p of candidates) {
    if (seen.has(p.id)) continue;
    const db = normalizeAddressForMatch(p.address1);
    const contains =
      (a1.length >= MIN_PARTIAL_LEN && db.includes(a1)) ||
      (db.length >= MIN_PARTIAL_LEN && a1.includes(db));
    const overlap = tokenOverlapScore(a1, db);
    const numB = leadingStreetNumber(db);
    const numbersConflict = numA && numB && numA !== numB;

    if (!contains && overlap < 2) continue;
    if (numbersConflict && overlap < 3) continue;

    seen.add(p.id);
    const row: PropertySuggestion = {
      ...p,
      matchKind: zipMatchesParsed(p) ? "partial_zip" : "partial",
    };
    if (row.matchKind === "partial_zip") partialZip.push(row);
    else partialOther.push(row);
  }

  const scorePartial = (p: PropertySuggestion): number => {
    const db = normalizeAddressForMatch(p.address1);
    const overlap = tokenOverlapScore(a1, db);
    const numB = leadingStreetNumber(db);
    const numBonus = numA && numB && numA === numB ? 2 : 0;
    return overlap * 10 + numBonus;
  };

  partialZip.sort((a, b) => scorePartial(b) - scorePartial(a));
  partialOther.sort((a, b) => scorePartial(b) - scorePartial(a));

  return [...exact, ...partialZip, ...partialOther].slice(0, max);
}

export async function suggestPropertiesForUser(
  prisma: PrismaClient,
  userId: string,
  input: ParsedPropertySuggestInput
): Promise<PropertySuggestion[]> {
  const city = input.city?.trim();
  const state = input.state?.trim();
  const address1 = input.address1?.trim();
  const zip5 = parseZip5(input.zip);

  if (!state || !address1) return [];
  if (!city && !zip5) return [];

  const baseUser = { createdByUserId: userId, deletedAt: null };
  const ids = new Set<string>();
  const candidates: PropertySuggestionRow[] = [];

  const merge = (rows: PropertySuggestionRow[]) => {
    for (const r of rows) {
      if (!ids.has(r.id)) {
        ids.add(r.id);
        candidates.push(r);
      }
    }
  };

  if (city) {
    const byCity = await prisma.property.findMany({
      where: {
        ...baseUser,
        city: { equals: city, mode: "insensitive" },
        state: { equals: state, mode: "insensitive" },
      },
      select: { id: true, address1: true, city: true, state: true, zip: true },
      take: 80,
    });
    merge(byCity);
  }

  if (zip5) {
    const byZip = await prisma.property.findMany({
      where: {
        ...baseUser,
        state: { equals: state, mode: "insensitive" },
        OR: [
          { zip: { equals: zip5, mode: "insensitive" } },
          { zip: { startsWith: `${zip5}-`, mode: "insensitive" } },
        ],
      },
      select: { id: true, address1: true, city: true, state: true, zip: true },
      take: 60,
    });
    merge(byZip);
  }

  return rankPropertySuggestions(candidates, {
    address1,
    city: city ?? "",
    state,
    zip: input.zip,
  });
}

export type ShowingSuggestionProperty = {
  id: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
};

export type ShowingSuggestion = {
  id: string;
  propertyId: string;
  property: ShowingSuggestionProperty;
  scheduledAt: Date;
  /** Absolute difference from target in minutes */
  minutesDelta: number;
};

export function rankShowingsByTimeProximity(
  rows: { id: string; scheduledAt: Date; propertyId: string; property: ShowingSuggestionProperty }[],
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
        propertyId: r.propertyId,
        property: r.property,
        scheduledAt: r.scheduledAt,
        minutesDelta: Math.round(deltaMs / 60000),
      });
    }
  }
  out.sort((a, b) => {
    if (a.minutesDelta !== b.minutesDelta) return a.minutesDelta - b.minutesDelta;
    return a.scheduledAt.getTime() - b.scheduledAt.getTime();
  });
  return out.slice(0, max);
}

export type SuggestShowingsInput = {
  scheduledAt: Date;
  windowHours: number;
  /** Single linked property (reviewer picked or from queue) */
  propertyId?: string;
  /** When property not chosen yet: search across these owned properties (max 5) */
  candidatePropertyIds?: string[];
};

export async function suggestShowingsForUser(
  prisma: PrismaClient,
  userId: string,
  input: SuggestShowingsInput
): Promise<ShowingSuggestion[]> {
  const windowMs = Math.max(1, Math.min(6, input.windowHours)) * 60 * 60 * 1000;
  const start = new Date(input.scheduledAt.getTime() - windowMs);
  const end = new Date(input.scheduledAt.getTime() + windowMs);

  const requestedIds = [
    ...(input.propertyId ? [input.propertyId] : []),
    ...(input.candidatePropertyIds ?? []),
  ];
  const uniqueIds = Array.from(new Set(requestedIds.map((id) => id.trim()).filter(Boolean))).slice(0, 8);

  if (uniqueIds.length === 0) return [];

  const owned = await prisma.property.findMany({
    where: {
      id: { in: uniqueIds },
      createdByUserId: userId,
      deletedAt: null,
    },
    select: { id: true },
  });
  const allowed = new Set(owned.map((p) => p.id));
  const propertyIds = uniqueIds.filter((id) => allowed.has(id));
  if (propertyIds.length === 0) return [];

  const rows = await prisma.showing.findMany({
    where: {
      hostUserId: userId,
      propertyId: { in: propertyIds },
      deletedAt: null,
      scheduledAt: { gte: start, lte: end },
    },
    select: {
      id: true,
      scheduledAt: true,
      propertyId: true,
      property: {
        select: { id: true, address1: true, city: true, state: true, zip: true },
      },
    },
    orderBy: { scheduledAt: "asc" },
    take: 80,
  });

  const normalized = rows.map((r) => ({
    id: r.id,
    scheduledAt: r.scheduledAt,
    propertyId: r.propertyId,
    property: r.property,
  }));

  return rankShowingsByTimeProximity(normalized, input.scheduledAt, windowMs);
}

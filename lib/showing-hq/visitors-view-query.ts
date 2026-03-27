/**
 * Canonical ShowingHQ visitors list grammar for /showing-hq/visitors and
 * GET /api/v1/showing-hq/visitors. URL and fetch share this module (R5).
 */

import { parseQFromSearchParams } from "./list-search-q";

export const VISITORS_BASE_PATH = "/showing-hq/visitors";

export const VISITORS_SORT_VALUES = [
  "date-desc",
  "date-asc",
  "name-asc",
  "name-desc",
] as const;

export type VisitorsSort = (typeof VISITORS_SORT_VALUES)[number];

const SORT_SET = new Set<string>(VISITORS_SORT_VALUES);

export const DEFAULT_VISITORS_SORT: VisitorsSort = "date-desc";

/** Invalid or missing → date-desc (matches API fallback). */
export function normalizeVisitorsSortParam(
  raw: string | null | undefined
): VisitorsSort {
  if (raw == null) return DEFAULT_VISITORS_SORT;
  const t = raw.trim().toLowerCase();
  return SORT_SET.has(t) ? (t as VisitorsSort) : DEFAULT_VISITORS_SORT;
}

/** null = all open houses. Trim; empty or "all" → null. */
export function normalizeVisitorsOpenHouseId(
  raw: string | null | undefined
): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t || t.toLowerCase() === "all") return null;
  return t;
}

export type NormalizedVisitorsView = {
  openHouseId: string | null;
  sort: VisitorsSort;
  q: string | null;
};

export { parseQFromSearchParams };

export function parseVisitorsViewFromSearchParams(
  sp: URLSearchParams
): NormalizedVisitorsView {
  return {
    openHouseId: normalizeVisitorsOpenHouseId(sp.get("openHouseId")),
    sort: normalizeVisitorsSortParam(sp.get("sort")),
    q: parseQFromSearchParams(sp),
  };
}

/** Write canonical params; omit defaults and empty q. */
export function applyVisitorsViewToSearchParams(
  view: NormalizedVisitorsView,
  params: URLSearchParams
): void {
  if (view.openHouseId) params.set("openHouseId", view.openHouseId);
  if (view.sort !== DEFAULT_VISITORS_SORT) params.set("sort", view.sort);
  if (view.q) params.set("q", view.q);
}

export function visitorsViewToHref(view: NormalizedVisitorsView): string {
  const params = new URLSearchParams();
  applyVisitorsViewToSearchParams(view, params);
  const qs = params.toString();
  return qs ? `${VISITORS_BASE_PATH}?${qs}` : VISITORS_BASE_PATH;
}

export function buildVisitorsListApiUrl(view: NormalizedVisitorsView): string {
  const params = new URLSearchParams();
  if (view.q) params.set("q", view.q);
  if (view.openHouseId) params.set("openHouseId", view.openHouseId);
  if (view.sort !== DEFAULT_VISITORS_SORT) params.set("sort", view.sort);
  const qs = params.toString();
  return qs
    ? `/api/v1/showing-hq/visitors?${qs}`
    : "/api/v1/showing-hq/visitors";
}

/** True when URL encodes at least one saveable filter (not default-only, empty q). */
export function hasVisitorsSaveableFiltersInSearchParams(
  sp: URLSearchParams
): boolean {
  const v = parseVisitorsViewFromSearchParams(sp);
  return (
    v.openHouseId !== null ||
    v.sort !== DEFAULT_VISITORS_SORT ||
    v.q !== null
  );
}

/** Stable fingerprint for VISITORS dedupe (includes surface for storage layer). */
export function visitorsViewFingerprint(view: NormalizedVisitorsView): string {
  return JSON.stringify({
    openHouseId: view.openHouseId,
    q: view.q,
    sort: view.sort,
    surface: "VISITORS",
  });
}

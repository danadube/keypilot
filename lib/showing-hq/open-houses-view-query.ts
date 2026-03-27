/**
 * Canonical Open Houses list grammar for /open-houses and list fetch via
 * GET /api/v1/open-houses?q=… The list page applies `status` client-side after
 * fetch so tab counts stay accurate; API `status` remains for other callers.
 */

import { parseQFromSearchParams } from "./list-search-q";

export const OPEN_HOUSES_BASE_PATH = "/open-houses";

export const OPEN_HOUSE_LIST_STATUS_VALUES = [
  "DRAFT",
  "SCHEDULED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
] as const;

export type OpenHouseListStatus =
  (typeof OPEN_HOUSE_LIST_STATUS_VALUES)[number];

const STATUS_SET = new Set<string>(OPEN_HOUSE_LIST_STATUS_VALUES);

/** Invalid or empty → null (show all statuses in URL / saved record). */
export function normalizeOpenHouseListStatusParam(
  raw: string | null | undefined
): OpenHouseListStatus | null {
  if (raw == null) return null;
  const u = raw.trim().toUpperCase();
  if (!u) return null;
  return STATUS_SET.has(u) ? (u as OpenHouseListStatus) : null;
}

export type NormalizedOpenHousesListView = {
  /** Narrow filter encoded in the URL; null = all statuses. */
  status: OpenHouseListStatus | null;
  q: string | null;
};

export { parseQFromSearchParams };

export function parseOpenHousesListViewFromSearchParams(
  sp: URLSearchParams
): NormalizedOpenHousesListView {
  return {
    status: normalizeOpenHouseListStatusParam(sp.get("status")),
    q: parseQFromSearchParams(sp),
  };
}

export function applyOpenHousesListViewToSearchParams(
  view: NormalizedOpenHousesListView,
  params: URLSearchParams
): void {
  if (view.status) params.set("status", view.status);
  if (view.q) params.set("q", view.q);
}

export function openHousesListViewToHref(
  view: NormalizedOpenHousesListView
): string {
  const params = new URLSearchParams();
  applyOpenHousesListViewToSearchParams(view, params);
  const qs = params.toString();
  return qs ? `${OPEN_HOUSES_BASE_PATH}?${qs}` : OPEN_HOUSES_BASE_PATH;
}

/**
 * List fetch for the open-houses dashboard: `q` only so results include all
 * statuses for tab badges; apply `status` from the URL on the client.
 */
export function buildOpenHousesListFetchApiUrl(
  view: NormalizedOpenHousesListView
): string {
  const params = new URLSearchParams();
  if (view.q) params.set("q", view.q);
  const qs = params.toString();
  return qs ? `/api/v1/open-houses?${qs}` : "/api/v1/open-houses";
}

/** True when URL encodes a saveable filter (status slice or search). */
export function hasOpenHousesSaveableFiltersInSearchParams(
  sp: URLSearchParams
): boolean {
  const v = parseOpenHousesListViewFromSearchParams(sp);
  return v.status !== null || v.q !== null;
}

export function openHousesListViewFingerprint(
  view: NormalizedOpenHousesListView
): string {
  return JSON.stringify({
    q: view.q,
    status: view.status,
    surface: "OPEN_HOUSES",
  });
}

/** Matches SectionTabs on the open-houses list (subset of statuses). */
export type OpenHousesListTabValue =
  | "all"
  | "live"
  | "upcoming"
  | "completed";

export function openHousesListStatusFromTab(
  tab: OpenHousesListTabValue
): OpenHouseListStatus | null {
  switch (tab) {
    case "live":
      return "ACTIVE";
    case "upcoming":
      return "SCHEDULED";
    case "completed":
      return "COMPLETED";
    default:
      return null;
  }
}

/** DRAFT / CANCELLED (or null) map to "all" tab selection; URL status still applies. */
export function tabFromOpenHousesListStatus(
  status: OpenHouseListStatus | null
): OpenHousesListTabValue {
  if (!status) return "all";
  if (status === "ACTIVE") return "live";
  if (status === "SCHEDULED") return "upcoming";
  if (status === "COMPLETED") return "completed";
  return "all";
}

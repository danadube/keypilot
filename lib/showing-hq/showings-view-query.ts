/**
 * Canonical ShowingHQ private showings list grammar for /showing-hq/showings and
 * GET /api/v1/showing-hq/showings. `openShowing` is a deep-link param only — never
 * part of saved views or fingerprints (implementation plan).
 */

import { parseQFromSearchParams } from "./list-search-q";

export const SHOWINGS_BASE_PATH = "/showing-hq/showings";

export const SHOWINGS_SOURCE_VALUES = ["MANUAL", "SUPRA_SCRAPE"] as const;

export type ShowingsSource = (typeof SHOWINGS_SOURCE_VALUES)[number];

const SOURCE_SET = new Set<string>(SHOWINGS_SOURCE_VALUES);

export function normalizeShowingsSourceParam(
  raw: string | null | undefined
): ShowingsSource | null {
  if (raw == null) return null;
  const u = raw.trim().toUpperCase();
  if (!u) return null;
  return SOURCE_SET.has(u) ? (u as ShowingsSource) : null;
}

/** True only when query is exactly `feedbackOnly=true`. */
export function normalizeShowingsFeedbackOnlyFromSearchParams(
  sp: URLSearchParams
): boolean {
  return sp.get("feedbackOnly") === "true";
}

export type NormalizedShowingsListView = {
  source: ShowingsSource | null;
  feedbackOnly: boolean;
  q: string | null;
};

export { parseQFromSearchParams };

export function parseShowingsListViewFromSearchParams(
  sp: URLSearchParams
): NormalizedShowingsListView {
  return {
    source: normalizeShowingsSourceParam(sp.get("source")),
    feedbackOnly: normalizeShowingsFeedbackOnlyFromSearchParams(sp),
    q: parseQFromSearchParams(sp),
  };
}

/** Deep-link only — not merged into list view / API URL builders. */
export function parseOpenShowingFromSearchParams(
  sp: URLSearchParams
): string | null {
  const v = sp.get("openShowing")?.trim();
  return v || null;
}

export function applyShowingsListViewToSearchParams(
  view: NormalizedShowingsListView,
  target: URLSearchParams
): void {
  if (view.source) target.set("source", view.source);
  if (view.feedbackOnly) target.set("feedbackOnly", "true");
  if (view.q) target.set("q", view.q);
}

/** List + search filters — never includes `openShowing`. */
export function showingsListViewToHref(view: NormalizedShowingsListView): string {
  const params = new URLSearchParams();
  applyShowingsListViewToSearchParams(view, params);
  const qs = params.toString();
  return qs ? `${SHOWINGS_BASE_PATH}?${qs}` : SHOWINGS_BASE_PATH;
}

export function buildShowingsListApiUrl(
  view: NormalizedShowingsListView
): string {
  const params = new URLSearchParams();
  if (view.source) params.set("source", view.source);
  if (view.feedbackOnly) params.set("feedbackOnly", "true");
  if (view.q) params.set("q", view.q);
  const qs = params.toString();
  return qs
    ? `/api/v1/showing-hq/showings?${qs}`
    : "/api/v1/showing-hq/showings";
}

/**
 * True when URL encodes a saveable list filter (source, feedback-only, or q).
 * `openShowing` alone does not enable Save (transient deep link; excluded from storage).
 */
export function hasShowingsSaveableFiltersInSearchParams(
  sp: URLSearchParams
): boolean {
  const v = parseShowingsListViewFromSearchParams(sp);
  return (
    v.source !== null || v.feedbackOnly === true || v.q !== null
  );
}

/** Dedupe / storage fingerprint — list + q only (no openShowing). */
export function showingsListViewFingerprint(
  view: NormalizedShowingsListView
): string {
  return JSON.stringify({
    feedbackOnly: view.feedbackOnly,
    q: view.q,
    source: view.source,
    surface: "SHOWINGS",
  });
}

/**
 * Optional list search query param `q` for ShowingHQ URL grammar (Visitors, Showings,
 * Open Houses list).
 * Trim, collapse whitespace, length cap; safe for URLSearchParams (no manual encode needed).
 */

export const MAX_SHOWINGHQ_LIST_SEARCH_Q_LENGTH = 200;

export function normalizeShowingHqListSearchQ(
  raw: string | null | undefined
): string | null {
  if (raw == null) return null;
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t) return null;
  return t.slice(0, MAX_SHOWINGHQ_LIST_SEARCH_Q_LENGTH);
}

export function parseQFromSearchParams(sp: URLSearchParams): string | null {
  return normalizeShowingHqListSearchQ(sp.get("q"));
}

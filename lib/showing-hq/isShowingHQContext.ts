/**
 * Route grouping: ShowingHQ product surfaces include `/showing-hq/*` and
 * all `/open-houses/*` tools (list, new event, host sign-in, follow-ups, etc.).
 */

export function isShowingHQContext(pathname: string): boolean {
  const base = normalizePathnameBase(pathname);
  return base.startsWith("/showing-hq") || base.startsWith("/open-houses");
}

/** `/open-houses` list manager only (not `/open-houses/new` or `/open-houses/sign-in`). */
export function isOpenHousesListPath(pathname: string): boolean {
  const base = pathname.split("?")[0] ?? "";
  return base === "/open-houses" || base === "/open-houses/";
}

function normalizePathnameBase(pathname: string): string {
  const raw = pathname.split("?")[0] ?? "";
  if (raw === "" || raw === "/") return "/";
  return raw.replace(/\/$/, "") || "/";
}

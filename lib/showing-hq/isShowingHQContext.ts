/**
 * Route grouping: ShowingHQ product surfaces include `/showing-hq/*` and
 * all `/open-houses/*` tools (list, new event, host sign-in, follow-ups, etc.).
 */

export function isShowingHQContext(pathname: string): boolean {
  const base = normalizePathnameBase(pathname);
  return base.startsWith("/showing-hq") || base.startsWith("/open-houses");
}

/**
 * Shell alignment: same header height, sticky sidebar, and date line as ShowingHQ.
 * Includes FarmTrackr (`/farm-trackr/*`), PropertyVault (`/property-vault/*`, `/properties/*`),
 * ClientKeep (`/client-keep/*`, `/contacts/*`), plus ShowingHQ surfaces.
 */
export function isWorkspaceContext(pathname: string): boolean {
  const base = normalizePathnameBase(pathname);
  return (
    base.startsWith("/showing-hq") ||
    base.startsWith("/open-houses") ||
    base.startsWith("/farm-trackr") ||
    base.startsWith("/property-vault") ||
    base.startsWith("/properties") ||
    base.startsWith("/client-keep") ||
    base.startsWith("/contacts")
  );
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

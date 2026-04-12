/**
 * When the URL is under `/properties/[id]/*` (not `/properties/new`), returns the property id for nav menus.
 */
export function getPropertyIdFromPropertiesPathname(pathname: string): string | null {
  const path = pathname.split("?")[0] ?? "";
  const m = path.match(/^\/properties\/([^/]+)/);
  if (!m) return null;
  const seg = m[1];
  if (seg === "new") return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) return null;
  return seg;
}

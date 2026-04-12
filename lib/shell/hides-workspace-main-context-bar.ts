import { isShowingHQContext } from "@/lib/showing-hq/isShowingHQContext";

/**
 * When true, {@link WorkspaceMainContextBar} is hidden so the route can rely on
 * in-page {@link PageHeader} (title + subtitle + Actions + Add) without duplicating
 * the module identity strip. See `docs/platform/page-structure-contract.md`.
 */
export function hidesWorkspaceMainContextBar(pathname: string): boolean {
  if (isShowingHQContext(pathname)) return true;
  const raw = pathname.split("?")[0] ?? "";
  const base = raw === "" || raw === "/" ? "/" : raw.replace(/\/$/, "") || "/";

  if (base.startsWith("/transactions")) return true;
  if (base.startsWith("/contacts") || base.startsWith("/client-keep")) return true;
  if (base.startsWith("/property-vault") || base.startsWith("/properties")) return true;
  if (base.startsWith("/farm-trackr")) return true;
  if (base.startsWith("/task-pilot")) return true;
  if (base === "/calendar") return true;

  return false;
}

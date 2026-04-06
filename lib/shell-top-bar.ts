import { isWorkspaceContext } from "@/lib/showing-hq/isShowingHQContext";

function operationalHomeBase(pathname: string): string {
  const raw = pathname.split("?")[0] ?? "";
  return raw.replace(/\/$/, "") || "/";
}

/**
 * Shared shell top row: sidebar logo strip + main header must share the same
 * fixed height and border treatment so the bottom edge aligns across the seam.
 *
 * Workspace modules (`/showing-hq/*`, `/open-houses/*`, `/farm-trackr/*`, `/property-vault/*`,
 * `/properties/*`, `/client-keep/*`, `/contacts/*`) use a taller band so the title + client date/time line fit;
 * operational home (`/dashboard`) uses a slightly shorter rail; other routes use the default compact rail.
 */
export function shellTopRowHeightClass(pathname: string | null | undefined): string {
  const path = pathname ?? "";
  if (isWorkspaceContext(path)) return "h-[58px]";
  if (operationalHomeBase(path) === "/dashboard") return "h-[48px]";
  return "h-[52px]";
}

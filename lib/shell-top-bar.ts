import { isWorkspaceContext } from "@/lib/showing-hq/isShowingHQContext";

/**
 * Shared shell top row: sidebar logo strip + main header must share the same
 * fixed height and border treatment so the bottom edge aligns across the seam.
 *
 * Workspace modules (including `/dashboard`, `/showing-hq/*`, `/open-houses/*`, `/farm-trackr/*`,
 * `/property-vault/*`, `/properties/*`, `/client-keep/*`, `/contacts/*`, `/transactions/*`) use a taller band so the title +
 * client date/time line fit; other routes use the default compact rail.
 */
export function shellTopRowHeightClass(pathname: string | null | undefined): string {
  const path = pathname ?? "";
  if (isWorkspaceContext(path)) return "h-[58px]";
  return "h-[52px]";
}

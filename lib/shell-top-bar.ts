import { isWorkspaceContext } from "@/lib/showing-hq/isShowingHQContext";

/**
 * Shared shell top row: sidebar logo strip + main header must share the same
 * fixed height and border treatment so the bottom edge aligns across the seam.
 *
 * Workspace modules (`/showing-hq/*`, `/open-houses/*`, `/client-keep/*`, `/contacts/*`) use a
 * taller band so the title + client date/time line fit; other routes keep the compact rail.
 */
export function shellTopRowHeightClass(pathname: string | null | undefined): string {
  const path = pathname ?? "";
  return isWorkspaceContext(path) ? "h-[58px]" : "h-[52px]";
}

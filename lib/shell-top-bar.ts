import { isShowingHQContext } from "@/lib/showing-hq/isShowingHQContext";

/**
 * Shared shell top row: sidebar logo strip + main header must share the same
 * fixed height and border treatment so the bottom edge aligns across the seam.
 *
 * ShowingHQ workspace (`/showing-hq/*`, `/open-houses/*`) uses one taller band so
 * the workbench home date line fits; other modules keep the compact rail.
 */
export function shellTopRowHeightClass(pathname: string | null | undefined): string {
  const path = pathname ?? "";
  if (isShowingHQContext(path)) return "h-[58px] min-h-[58px]";
  return "h-[52px] min-h-[52px]";
}

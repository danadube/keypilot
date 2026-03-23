/**
 * Shared shell top row: sidebar logo strip + main header must share the same
 * fixed height and border treatment so the bottom edge aligns across the seam.
 */
export function shellTopRowHeightClass(pathname: string | null | undefined): string {
  return pathname === "/showing-hq" ? "h-[58px] min-h-[58px]" : "h-[52px] min-h-[52px]";
}

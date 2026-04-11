/**
 * Global app header height — sidebar offset and main chrome align to this.
 */
export const KP_APP_HEADER_HEIGHT_PX = 72;

export const KP_APP_HEADER_HEIGHT_CLASS = "min-h-[72px] h-[72px]";

/** Fixed sidebar sits below the global header. */
export const KP_SIDEBAR_TOP_CLASS = "top-[72px]";

export const KP_SIDEBAR_HEIGHT_CLASS = "h-[calc(100vh-72px)]";

/**
 * @deprecated Pathname no longer changes height; kept for call-site compatibility.
 */
export function shellTopRowHeightClass(pathname: string | null | undefined): string {
  void pathname;
  return KP_APP_HEADER_HEIGHT_CLASS;
}

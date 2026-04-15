export type HeaderNewMenuItem = {
  label: string;
  href: string;
};

/**
 * Fixed-order + New menu for every authenticated dashboard page.
 * Same labels and targets everywhere (no pathname routing).
 */
export const GLOBAL_HEADER_NEW_MENU_ITEMS: readonly HeaderNewMenuItem[] = [
  { label: "New Showing", href: "/showing-hq/showings/new" },
  { label: "New Open House", href: "/open-houses/new" },
  { label: "New Transaction", href: "/transactions?new=1" },
  { label: "New CRM Deal", href: "/deals?new=1" },
  { label: "New Property", href: "/properties/new" },
  { label: "New Contact", href: "/contacts?new=1" },
] as const;

export function getHeaderNewMenuItems(): HeaderNewMenuItem[] {
  return [...GLOBAL_HEADER_NEW_MENU_ITEMS];
}

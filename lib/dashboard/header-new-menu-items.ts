import { isShowingHQContext } from "@/lib/showing-hq/isShowingHQContext";

export type HeaderNewMenuItem = {
  label: string;
  href: string;
};

function normalizePathnameBase(pathname: string): string {
  const raw = pathname.split("?")[0] ?? "";
  if (raw === "" || raw === "/") return "/";
  return raw.replace(/\/$/, "") || "/";
}

const DEFAULT_MENU: HeaderNewMenuItem[] = [
  { label: "Showing", href: "/showing-hq/showings/new" },
  { label: "Open house", href: "/open-houses/new" },
  { label: "Property", href: "/properties/new" },
  { label: "Contact", href: "/contacts" },
  { label: "Transaction", href: "/transactions?new=1" },
  { label: "Deal", href: "/deals?new=1" },
];

/**
 * Context-aware + New dropdown items. Same trigger everywhere; entries follow current module.
 */
export function getHeaderNewMenuItems(pathname: string): HeaderNewMenuItem[] {
  const base = normalizePathnameBase(pathname);

  if (base.startsWith("/transactions")) {
    return [
      { label: "Transaction", href: "/transactions?new=1" },
      { label: "Property", href: "/properties/new" },
      { label: "Open house", href: "/open-houses/new" },
      { label: "Contact", href: "/contacts" },
    ];
  }

  if (base.startsWith("/deals")) {
    return [
      { label: "Deal", href: "/deals?new=1" },
      { label: "Contact", href: "/contacts" },
      { label: "Property", href: "/properties/new" },
    ];
  }

  if (base.startsWith("/property-vault") || base.startsWith("/properties")) {
    return [
      { label: "Property", href: "/properties/new" },
      { label: "Open house", href: "/open-houses/new" },
    ];
  }

  if (base.startsWith("/client-keep") || base.startsWith("/contacts")) {
    return [
      { label: "Contact", href: "/contacts" },
      { label: "Deal", href: "/deals?new=1" },
    ];
  }

  if (isShowingHQContext(pathname)) {
    return [
      { label: "Showing", href: "/showing-hq/showings/new" },
      { label: "Open house", href: "/open-houses/new" },
      { label: "Property", href: "/properties/new" },
      { label: "Contact", href: "/contacts" },
    ];
  }

  return DEFAULT_MENU;
}

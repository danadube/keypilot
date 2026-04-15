import {
  GLOBAL_HEADER_NEW_MENU_ITEMS,
  getHeaderNewMenuItems,
} from "@/lib/dashboard/header-new-menu-items";

const EXPECTED = [
  { label: "New Showing", href: "/showing-hq/showings/new" },
  { label: "New Open House", href: "/open-houses/new" },
  { label: "New Transaction", href: "/transactions?new=1" },
  { label: "New CRM Deal", href: "/deals?new=1" },
  { label: "New Property", href: "/properties/new" },
  { label: "New Contact", href: "/contacts?new=1" },
] as const;

describe("header + New menu (global)", () => {
  it("exports a fixed ordered list", () => {
    expect([...GLOBAL_HEADER_NEW_MENU_ITEMS]).toEqual([...EXPECTED]);
  });

  it("getHeaderNewMenuItems returns the same list on every call", () => {
    expect(getHeaderNewMenuItems()).toEqual(EXPECTED);
    expect(getHeaderNewMenuItems()).toEqual(getHeaderNewMenuItems());
  });
});

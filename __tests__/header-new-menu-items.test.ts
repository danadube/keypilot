import { getHeaderNewMenuItems } from "@/lib/dashboard/header-new-menu-items";

describe("getHeaderNewMenuItems", () => {
  it("prioritizes Transaction on /transactions", () => {
    const items = getHeaderNewMenuItems("/transactions");
    expect(items[0]).toEqual({ label: "Transaction", href: "/transactions?new=1" });
  });

  it("ShowingHQ context includes Showing first", () => {
    const items = getHeaderNewMenuItems("/showing-hq/showings");
    expect(items.map((i) => i.label)).toEqual([
      "Showing",
      "Open house",
      "Property",
      "Contact",
    ]);
  });

  it("default menu lists common creates", () => {
    const items = getHeaderNewMenuItems("/settings/account");
    expect(items.some((i) => i.label === "Transaction")).toBe(true);
    expect(items.some((i) => i.label === "Deal")).toBe(true);
  });
});

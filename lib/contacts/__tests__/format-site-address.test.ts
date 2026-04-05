import { formatSiteAddressLine } from "../format-site-address";

describe("formatSiteAddressLine", () => {
  it("joins street, city/state, and zip", () => {
    expect(
      formatSiteAddressLine({
        siteStreet1: "123 Main St",
        siteCity: "Palm Springs",
        siteState: "CA",
        siteZip: "92262",
      })
    ).toBe("123 Main St, Palm Springs, CA 92262");
  });

  it("includes street 2 when present", () => {
    expect(
      formatSiteAddressLine({
        siteStreet1: "123 Main St",
        siteStreet2: "Unit 4",
        siteCity: "Palm Springs",
        siteState: "CA",
      })
    ).toBe("123 Main St, Unit 4, Palm Springs, CA");
  });

  it("returns empty string when no parts", () => {
    expect(formatSiteAddressLine({})).toBe("");
  });
});

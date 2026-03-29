import {
  isOpenHousesListPath,
  isShowingHQContext,
} from "@/lib/showing-hq/isShowingHQContext";

describe("isShowingHQContext", () => {
  it("is true for showing-hq and open-houses prefixes", () => {
    expect(isShowingHQContext("/showing-hq")).toBe(true);
    expect(isShowingHQContext("/showing-hq/showings")).toBe(true);
    expect(isShowingHQContext("/open-houses")).toBe(true);
    expect(isShowingHQContext("/open-houses/abc/sign-in")).toBe(true);
  });

  it("ignores query string for prefix checks", () => {
    expect(isShowingHQContext("/open-houses?tab=all")).toBe(true);
  });

  it("is false outside ShowingHQ surfaces", () => {
    expect(isShowingHQContext("/contacts")).toBe(false);
    expect(isShowingHQContext("/")).toBe(false);
  });
});

describe("isOpenHousesListPath", () => {
  it("matches list route only", () => {
    expect(isOpenHousesListPath("/open-houses")).toBe(true);
    expect(isOpenHousesListPath("/open-houses/")).toBe(true);
    expect(isOpenHousesListPath("/open-houses/new")).toBe(false);
    expect(isOpenHousesListPath("/open-houses/sign-in")).toBe(false);
    expect(isOpenHousesListPath("/open-houses/x/report")).toBe(false);
  });
});

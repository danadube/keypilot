/**
 * @jest-environment node
 */

import {
  buildOpenHousesListFetchApiUrl,
  hasOpenHousesSaveableFiltersInSearchParams,
  normalizeOpenHouseListStatusParam,
  openHousesListViewFingerprint,
  openHousesListViewToHref,
  parseOpenHousesListViewFromSearchParams,
  tabFromOpenHousesListStatus,
  openHousesListStatusFromTab,
} from "../open-houses-view-query";

describe("open-houses-view-query", () => {
  describe("normalizeOpenHouseListStatusParam", () => {
    it("returns null for invalid or empty", () => {
      expect(normalizeOpenHouseListStatusParam(null)).toBe(null);
      expect(normalizeOpenHouseListStatusParam("")).toBe(null);
      expect(normalizeOpenHouseListStatusParam("FAKE")).toBe(null);
    });
    it("accepts known statuses case-insensitively", () => {
      expect(normalizeOpenHouseListStatusParam("active")).toBe("ACTIVE");
      expect(normalizeOpenHouseListStatusParam(" draft ")).toBe("DRAFT");
    });
  });

  describe("openHousesListViewToHref and fetch URL", () => {
    it("omits params when default", () => {
      const v = parseOpenHousesListViewFromSearchParams(new URLSearchParams());
      expect(openHousesListViewToHref(v)).toBe("/open-houses");
      expect(buildOpenHousesListFetchApiUrl(v)).toBe("/api/v1/open-houses");
    });
    it("includes status in page href only", () => {
      const v = parseOpenHousesListViewFromSearchParams(
        new URLSearchParams("status=ACTIVE")
      );
      expect(openHousesListViewToHref(v)).toBe("/open-houses?status=ACTIVE");
      expect(buildOpenHousesListFetchApiUrl(v)).toBe("/api/v1/open-houses");
    });
    it("includes q in href and fetch URL", () => {
      const v = parseOpenHousesListViewFromSearchParams(
        new URLSearchParams("status=SCHEDULED&q=main%20st")
      );
      expect(v.q).toBe("main st");
      expect(openHousesListViewToHref(v)).toBe(
        "/open-houses?status=SCHEDULED&q=main+st"
      );
      expect(buildOpenHousesListFetchApiUrl(v)).toBe(
        "/api/v1/open-houses?q=main+st"
      );
    });
  });

  describe("hasOpenHousesSaveableFiltersInSearchParams", () => {
    it("is false for default empty URL", () => {
      expect(
        hasOpenHousesSaveableFiltersInSearchParams(new URLSearchParams())
      ).toBe(false);
    });
    it("is true for status or q", () => {
      expect(
        hasOpenHousesSaveableFiltersInSearchParams(
          new URLSearchParams("status=DRAFT")
        )
      ).toBe(true);
      expect(
        hasOpenHousesSaveableFiltersInSearchParams(new URLSearchParams("q=x"))
      ).toBe(true);
    });
  });

  describe("openHousesListViewFingerprint", () => {
    it("is stable for equivalent views", () => {
      const a = openHousesListViewFingerprint({
        status: "ACTIVE",
        q: null,
      });
      const b = openHousesListViewFingerprint({
        status: "ACTIVE",
        q: null,
      });
      expect(a).toBe(b);
    });
    it("differs when q differs", () => {
      expect(
        openHousesListViewFingerprint({
          status: null,
          q: "a",
        })
      ).not.toEqual(
        openHousesListViewFingerprint({
          status: null,
          q: "b",
        })
      );
    });
  });

  describe("tab helpers", () => {
    it("maps tab to status and back for primary tabs", () => {
      expect(openHousesListStatusFromTab("live")).toBe("ACTIVE");
      expect(tabFromOpenHousesListStatus("ACTIVE")).toBe("live");
      expect(tabFromOpenHousesListStatus(null)).toBe("all");
    });
    it("maps DRAFT to all tab (URL-only slice)", () => {
      expect(tabFromOpenHousesListStatus("DRAFT")).toBe("all");
    });
  });
});

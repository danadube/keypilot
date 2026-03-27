/**
 * @jest-environment node
 */

import {
  DEFAULT_VISITORS_SORT,
  buildVisitorsListApiUrl,
  hasVisitorsSaveableFiltersInSearchParams,
  normalizeVisitorsOpenHouseId,
  normalizeVisitorsSortParam,
  parseVisitorsViewFromSearchParams,
  visitorsViewFingerprint,
  visitorsViewToHref,
} from "../visitors-view-query";

describe("visitors-view-query", () => {
  describe("normalizeVisitorsSortParam", () => {
    it("defaults invalid to date-desc", () => {
      expect(normalizeVisitorsSortParam("bogus")).toBe(DEFAULT_VISITORS_SORT);
      expect(normalizeVisitorsSortParam("")).toBe(DEFAULT_VISITORS_SORT);
      expect(normalizeVisitorsSortParam(null)).toBe(DEFAULT_VISITORS_SORT);
    });
    it("accepts known sorts (case-insensitive)", () => {
      expect(normalizeVisitorsSortParam("NAME-ASC")).toBe("name-asc");
      expect(normalizeVisitorsSortParam("  date-asc  ")).toBe("date-asc");
    });
  });

  describe("normalizeVisitorsOpenHouseId", () => {
    it("maps all / empty to null", () => {
      expect(normalizeVisitorsOpenHouseId("all")).toBe(null);
      expect(normalizeVisitorsOpenHouseId("ALL")).toBe(null);
      expect(normalizeVisitorsOpenHouseId("  ")).toBe(null);
    });
    it("trims uuid-like ids", () => {
      expect(normalizeVisitorsOpenHouseId("  oh-1  ")).toBe("oh-1");
    });
  });

  describe("visitorsViewToHref and API URL parity", () => {
    it("omits default sort and all-houses", () => {
      const sp = new URLSearchParams();
      const v = parseVisitorsViewFromSearchParams(sp);
      expect(visitorsViewToHref(v)).toBe("/showing-hq/visitors");
      expect(buildVisitorsListApiUrl(v)).toBe("/api/v1/showing-hq/visitors");
    });
    it("includes openHouseId", () => {
      const v = parseVisitorsViewFromSearchParams(
        new URLSearchParams("openHouseId=x")
      );
      expect(visitorsViewToHref(v)).toBe("/showing-hq/visitors?openHouseId=x");
      expect(buildVisitorsListApiUrl(v)).toBe(
        "/api/v1/showing-hq/visitors?openHouseId=x"
      );
    });
    it("includes non-default sort without openHouseId", () => {
      const v = parseVisitorsViewFromSearchParams(
        new URLSearchParams("sort=name-asc")
      );
      expect(visitorsViewToHref(v)).toBe("/showing-hq/visitors?sort=name-asc");
      expect(buildVisitorsListApiUrl(v)).toBe(
        "/api/v1/showing-hq/visitors?sort=name-asc"
      );
    });
    it("passes q only for API helper", () => {
      const v = parseVisitorsViewFromSearchParams(new URLSearchParams());
      expect(buildVisitorsListApiUrl(v, { q: "  jane  " })).toBe(
        "/api/v1/showing-hq/visitors?q=jane"
      );
    });
  });

  describe("hasVisitorsSaveableFiltersInSearchParams", () => {
    it("is false for empty / defaults", () => {
      expect(
        hasVisitorsSaveableFiltersInSearchParams(new URLSearchParams())
      ).toBe(false);
      expect(
        hasVisitorsSaveableFiltersInSearchParams(
          new URLSearchParams("sort=date-desc")
        )
      ).toBe(false);
    });
    it("is true when open house or non-default sort", () => {
      expect(
        hasVisitorsSaveableFiltersInSearchParams(
          new URLSearchParams("openHouseId=a")
        )
      ).toBe(true);
      expect(
        hasVisitorsSaveableFiltersInSearchParams(
          new URLSearchParams("sort=name-desc")
        )
      ).toBe(true);
    });
  });

  describe("visitorsViewFingerprint", () => {
    it("is stable for equivalent views", () => {
      const a = visitorsViewFingerprint({
        openHouseId: "x",
        sort: "date-desc",
      });
      const b = visitorsViewFingerprint({
        openHouseId: "x",
        sort: "date-desc",
      });
      expect(a).toBe(b);
    });
    it("differs when filters differ", () => {
      expect(
        visitorsViewFingerprint({
          openHouseId: "x",
          sort: "date-desc",
        })
      ).not.toEqual(
        visitorsViewFingerprint({
          openHouseId: "y",
          sort: "date-desc",
        })
      );
    });
  });
});

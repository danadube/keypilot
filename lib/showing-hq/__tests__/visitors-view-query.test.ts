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
    it("includes q in href and API when set", () => {
      const v = parseVisitorsViewFromSearchParams(
        new URLSearchParams("q=%20jane%20")
      );
      expect(v.q).toBe("jane");
      expect(visitorsViewToHref(v)).toBe("/showing-hq/visitors?q=jane");
      expect(buildVisitorsListApiUrl(v)).toBe(
        "/api/v1/showing-hq/visitors?q=jane"
      );
    });
    it("URL and API use same param order for list search", () => {
      const v = parseVisitorsViewFromSearchParams(
        new URLSearchParams(
          "openHouseId=oh1&q=foo&sort=name-asc"
        )
      );
      const api = buildVisitorsListApiUrl(v);
      expect(api).toContain("q=foo");
      expect(api).toContain("openHouseId=oh1");
      expect(api).toContain("sort=name-asc");
      const href = visitorsViewToHref(v);
      expect(href).toContain("q=foo");
      expect(href).toContain("openHouseId=oh1");
      expect(href).toContain("sort=name-asc");
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
    it("is true when open house, non-default sort, or q", () => {
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
      expect(
        hasVisitorsSaveableFiltersInSearchParams(new URLSearchParams("q=test"))
      ).toBe(true);
    });
  });

  describe("visitorsViewFingerprint", () => {
    it("is stable for equivalent views", () => {
      const a = visitorsViewFingerprint({
        openHouseId: "x",
        sort: "date-desc",
        q: null,
      });
      const b = visitorsViewFingerprint({
        openHouseId: "x",
        sort: "date-desc",
        q: null,
      });
      expect(a).toBe(b);
    });
    it("differs when filters differ", () => {
      expect(
        visitorsViewFingerprint({
          openHouseId: "x",
          sort: "date-desc",
          q: null,
        })
      ).not.toEqual(
        visitorsViewFingerprint({
          openHouseId: "y",
          sort: "date-desc",
          q: null,
        })
      );
    });
    it("differs when q differs", () => {
      expect(
        visitorsViewFingerprint({
          openHouseId: "x",
          sort: "date-desc",
          q: "a",
        })
      ).not.toEqual(
        visitorsViewFingerprint({
          openHouseId: "x",
          sort: "date-desc",
          q: "b",
        })
      );
    });
  });
});

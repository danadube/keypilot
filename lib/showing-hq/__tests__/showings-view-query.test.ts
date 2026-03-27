/**
 * @jest-environment node
 */

import {
  buildShowingsListApiUrl,
  hasShowingsSaveableFiltersInSearchParams,
  normalizeShowingsSourceParam,
  parseOpenShowingFromSearchParams,
  parseShowingsListViewFromSearchParams,
  showingsListViewFingerprint,
  showingsListViewToHref,
} from "../showings-view-query";

describe("showings-view-query", () => {
  describe("normalizeShowingsSourceParam", () => {
    it("returns null for invalid or empty", () => {
      expect(normalizeShowingsSourceParam(null)).toBe(null);
      expect(normalizeShowingsSourceParam("")).toBe(null);
      expect(normalizeShowingsSourceParam("FAKE")).toBe(null);
    });
    it("accepts known sources case-insensitively", () => {
      expect(normalizeShowingsSourceParam("manual")).toBe("MANUAL");
      expect(normalizeShowingsSourceParam(" supra_scrape ")).toBe(
        "SUPRA_SCRAPE"
      );
    });
  });

  describe("showingsListViewToHref and API parity", () => {
    it("omits params when default (all sources, no feedback filter)", () => {
      const sp = new URLSearchParams();
      const v = parseShowingsListViewFromSearchParams(sp);
      expect(showingsListViewToHref(v)).toBe("/showing-hq/showings");
      expect(buildShowingsListApiUrl(v)).toBe("/api/v1/showing-hq/showings");
    });
    it("includes source", () => {
      const v = parseShowingsListViewFromSearchParams(
        new URLSearchParams("source=MANUAL")
      );
      expect(showingsListViewToHref(v)).toBe(
        "/showing-hq/showings?source=MANUAL"
      );
      expect(buildShowingsListApiUrl(v)).toBe(
        "/api/v1/showing-hq/showings?source=MANUAL"
      );
    });
    it("includes feedbackOnly=true only when set", () => {
      const v = parseShowingsListViewFromSearchParams(
        new URLSearchParams("feedbackOnly=true")
      );
      expect(showingsListViewToHref(v)).toBe(
        "/showing-hq/showings?feedbackOnly=true"
      );
    });
    it("does not put openShowing in href builder (parse separately)", () => {
      const sp = new URLSearchParams(
        "source=MANUAL&openShowing=abc&feedbackOnly=true"
      );
      const v = parseShowingsListViewFromSearchParams(sp);
      expect(showingsListViewToHref(v)).toBe(
        "/showing-hq/showings?source=MANUAL&feedbackOnly=true"
      );
      expect(parseOpenShowingFromSearchParams(sp)).toBe("abc");
    });
    it("includes q in href and API when set", () => {
      const v = parseShowingsListViewFromSearchParams(
        new URLSearchParams("source=MANUAL&q=oak%20ridge")
      );
      expect(v.q).toBe("oak ridge");
      expect(showingsListViewToHref(v)).toBe(
        "/showing-hq/showings?source=MANUAL&q=oak+ridge"
      );
      expect(buildShowingsListApiUrl(v)).toBe(
        "/api/v1/showing-hq/showings?q=oak+ridge&source=MANUAL"
      );
    });
  });

  describe("hasShowingsSaveableFiltersInSearchParams", () => {
    it("is false for defaults and openShowing alone", () => {
      expect(
        hasShowingsSaveableFiltersInSearchParams(new URLSearchParams())
      ).toBe(false);
      expect(
        hasShowingsSaveableFiltersInSearchParams(
          new URLSearchParams("openShowing=x")
        )
      ).toBe(false);
    });
    it("is true for source, feedbackOnly, or q", () => {
      expect(
        hasShowingsSaveableFiltersInSearchParams(
          new URLSearchParams("source=MANUAL")
        )
      ).toBe(true);
      expect(
        hasShowingsSaveableFiltersInSearchParams(
          new URLSearchParams("feedbackOnly=true")
        )
      ).toBe(true);
      expect(
        hasShowingsSaveableFiltersInSearchParams(new URLSearchParams("q=find-me"))
      ).toBe(true);
    });
  });

  describe("showingsListViewFingerprint", () => {
    it("is stable for equivalent views", () => {
      const a = showingsListViewFingerprint({
        source: "MANUAL",
        feedbackOnly: false,
        q: null,
      });
      const b = showingsListViewFingerprint({
        source: "MANUAL",
        feedbackOnly: false,
        q: null,
      });
      expect(a).toBe(b);
    });
    it("differs when filters differ", () => {
      expect(
        showingsListViewFingerprint({
          source: "MANUAL",
          feedbackOnly: false,
          q: null,
        })
      ).not.toEqual(
        showingsListViewFingerprint({
          source: "MANUAL",
          feedbackOnly: true,
          q: null,
        })
      );
    });
    it("differs when q differs", () => {
      expect(
        showingsListViewFingerprint({
          source: "MANUAL",
          feedbackOnly: false,
          q: "x",
        })
      ).not.toEqual(
        showingsListViewFingerprint({
          source: "MANUAL",
          feedbackOnly: false,
          q: "y",
        })
      );
    });
  });
});

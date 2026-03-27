import {
  buildContactsApiUrl,
  hasSegmentFiltersInSearchParams,
  parseSegmentFromSearchParams,
  parseStatusTabFromSearchParams,
  parseTagIdFromSearchParams,
  savedStatusToTab,
  segmentToHref,
  tabToSavedStatus,
} from "../contact-segment-query";

function sp(q: string): URLSearchParams {
  return new URLSearchParams(q);
}

describe("contact-segment-query", () => {
  describe("parseStatusTabFromSearchParams", () => {
    it("returns __all__ when status is missing", () => {
      expect(parseStatusTabFromSearchParams(sp(""))).toBe("__all__");
    });

    it("returns __all__ for invalid status", () => {
      expect(parseStatusTabFromSearchParams(sp("status=FOO"))).toBe("__all__");
      expect(parseStatusTabFromSearchParams(sp("status=__all__"))).toBe("__all__");
    });

    it("accepts valid statuses case-insensitively", () => {
      expect(parseStatusTabFromSearchParams(sp("status=lead"))).toBe("LEAD");
      expect(parseStatusTabFromSearchParams(sp("status=LeAd"))).toBe("LEAD");
    });

    it("trims whitespace on status", () => {
      expect(parseStatusTabFromSearchParams(sp("status=%20LEAD%20"))).toBe(
        "LEAD"
      );
      expect(parseStatusTabFromSearchParams(sp("status=  ready  "))).toBe(
        "READY"
      );
    });
  });

  describe("parseTagIdFromSearchParams", () => {
    it("returns null when missing or empty", () => {
      expect(parseTagIdFromSearchParams(sp(""))).toBeNull();
      expect(parseTagIdFromSearchParams(sp("tagId="))).toBeNull();
      expect(parseTagIdFromSearchParams(sp("tagId=%20%20"))).toBeNull();
    });

    it("trims tagId", () => {
      expect(parseTagIdFromSearchParams(sp("tagId=  abc-123  "))).toBe(
        "abc-123"
      );
    });
  });

  describe("parseSegmentFromSearchParams", () => {
    it("combines status and tagId", () => {
      expect(parseSegmentFromSearchParams(sp("status=NURTURING&tagId=t1"))).toEqual({
        status: "NURTURING",
        tagId: "t1",
      });
    });
  });

  describe("segmentToHref", () => {
    it("returns /contacts when no filters", () => {
      expect(segmentToHref("__all__", null)).toBe("/contacts");
    });

    it("builds query string for status only", () => {
      expect(segmentToHref("LEAD", null)).toBe("/contacts?status=LEAD");
    });

    it("builds query for tag only", () => {
      expect(segmentToHref("__all__", "x")).toBe("/contacts?tagId=x");
    });

    it("orders params consistently", () => {
      expect(segmentToHref("LOST", "tid")).toBe(
        "/contacts?status=LOST&tagId=tid"
      );
    });
  });

  describe("buildContactsApiUrl", () => {
    it("mirrors segment paths under /api/v1/contacts", () => {
      expect(buildContactsApiUrl("CONTACTED", "z")).toBe(
        "/api/v1/contacts?status=CONTACTED&tagId=z"
      );
      expect(buildContactsApiUrl("__all__", null)).toBe("/api/v1/contacts");
    });
  });

  describe("savedStatusToTab", () => {
    it("maps null/undefined/empty to __all__", () => {
      expect(savedStatusToTab(null)).toBe("__all__");
      expect(savedStatusToTab(undefined)).toBe("__all__");
      expect(savedStatusToTab("")).toBe("__all__");
    });

    it("normalizes valid stored status", () => {
      expect(savedStatusToTab("  lead  ")).toBe("LEAD");
    });

    it("invalid stored status becomes __all__", () => {
      expect(savedStatusToTab("nope")).toBe("__all__");
    });
  });

  describe("tabToSavedStatus", () => {
    it("maps __all__ to null", () => {
      expect(tabToSavedStatus("__all__")).toBeNull();
    });

    it("passes through CRM status", () => {
      expect(tabToSavedStatus("READY")).toBe("READY");
    });
  });

  describe("hasSegmentFiltersInSearchParams", () => {
    it("is false for bare /contacts", () => {
      expect(hasSegmentFiltersInSearchParams(sp(""))).toBe(false);
    });

    it("is true when status is set", () => {
      expect(hasSegmentFiltersInSearchParams(sp("status=LEAD"))).toBe(true);
    });

    it("is true when tagId is set", () => {
      expect(hasSegmentFiltersInSearchParams(sp("tagId=u1"))).toBe(true);
    });

    it("is false when status is invalid (ignored)", () => {
      expect(hasSegmentFiltersInSearchParams(sp("status=INVALID"))).toBe(
        false
      );
    });
  });
});

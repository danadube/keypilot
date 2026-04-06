import {
  buildContactsApiUrl,
  hasSegmentFiltersInSearchParams,
  parseContactsFarmScopeFromSearchParams,
  parseContactsHealthQueryFromSearchParams,
  parseContactsListSortFromSearchParams,
  parseFollowUpNeedsFromSearchParams,
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
      expect(parseStatusTabFromSearchParams(sp("status=farm"))).toBe("FARM");
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
      expect(segmentToHref("FARM", null)).toBe("/contacts?status=FARM");
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

    it("includes followUp=needs when requested", () => {
      expect(segmentToHref("__all__", null, true)).toBe(
        "/contacts?followUp=needs"
      );
      expect(segmentToHref("LEAD", null, true)).toBe(
        "/contacts?status=LEAD&followUp=needs"
      );
    });

    it("includes sort=recent when sort mode is recent", () => {
      expect(segmentToHref("__all__", null, false, "recent")).toBe(
        "/contacts?sort=recent"
      );
      expect(segmentToHref("LEAD", "t1", true, "recent")).toBe(
        "/contacts?status=LEAD&tagId=t1&followUp=needs&sort=recent"
      );
    });

    it("includes farmAreaId when set (wins over territory)", () => {
      expect(
        segmentToHref("__all__", null, false, "followups", {
          farmAreaId: "a1",
          farmTerritoryId: "t9",
        })
      ).toBe("/contacts?farmAreaId=a1");
    });

    it("includes farmTerritoryId when area absent", () => {
      expect(
        segmentToHref("LEAD", null, false, "followups", {
          farmAreaId: null,
          farmTerritoryId: "terr-1",
        })
      ).toBe("/contacts?status=LEAD&farmTerritoryId=terr-1");
    });

    it("includes missing and readyToPromote when set", () => {
      expect(
        segmentToHref("__all__", null, false, "followups", {
          farmAreaId: "a1",
          farmTerritoryId: null,
        }, {
          missing: "email",
          readyToPromote: false,
          farmHealthScope: null,
        })
      ).toBe("/contacts?farmAreaId=a1&missing=email");
      expect(
        segmentToHref("__all__", null, false, "followups", {
          farmAreaId: "a1",
          farmTerritoryId: null,
        }, {
          missing: null,
          readyToPromote: true,
          farmHealthScope: null,
        })
      ).toBe("/contacts?farmAreaId=a1&readyToPromote=1");
    });

    it("includes farmHealthScope only without farm area/territory", () => {
      expect(
        segmentToHref("__all__", null, false, "followups", {
          farmAreaId: null,
          farmTerritoryId: null,
        }, {
          missing: "mailing",
          readyToPromote: false,
          farmHealthScope: "active",
        })
      ).toBe("/contacts?missing=mailing&farmHealthScope=active");
    });
  });

  describe("buildContactsApiUrl", () => {
    it("mirrors segment paths under /api/v1/contacts", () => {
      expect(buildContactsApiUrl("CONTACTED", "z")).toBe(
        "/api/v1/contacts?status=CONTACTED&tagId=z"
      );
      expect(buildContactsApiUrl("__all__", null)).toBe("/api/v1/contacts");
      expect(buildContactsApiUrl("__all__", null, true)).toBe(
        "/api/v1/contacts?followUp=needs"
      );
      expect(buildContactsApiUrl("__all__", null, false, "recent")).toBe(
        "/api/v1/contacts?sort=recent"
      );
      expect(
        buildContactsApiUrl("__all__", null, false, "followups", {
          farmAreaId: "area-x",
          farmTerritoryId: null,
        })
      ).toBe("/api/v1/contacts?farmAreaId=area-x");
    });

    it("includes health query params", () => {
      expect(
        buildContactsApiUrl("__all__", null, false, "followups", {
          farmAreaId: null,
          farmTerritoryId: null,
        }, {
          missing: "site",
          readyToPromote: true,
          farmHealthScope: "archived",
        })
      ).toBe("/api/v1/contacts?missing=site&readyToPromote=1&farmHealthScope=archived");
    });
  });

  describe("parseContactsHealthQueryFromSearchParams", () => {
    it("parses missing, readyToPromote, farmHealthScope", () => {
      expect(
        parseContactsHealthQueryFromSearchParams(
          sp("missing=EMAIL&readyToPromote=1&farmHealthScope=active")
        )
      ).toEqual({
        missing: "email",
        readyToPromote: true,
        farmHealthScope: "active",
      });
    });

    it("drops farmHealthScope when farm area is set", () => {
      expect(
        parseContactsHealthQueryFromSearchParams(
          sp("farmAreaId=x&farmHealthScope=active&missing=phone")
        )
      ).toEqual({
        missing: "phone",
        readyToPromote: false,
        farmHealthScope: null,
      });
    });
  });

  describe("parseContactsFarmScopeFromSearchParams", () => {
    it("reads farmAreaId and farmTerritoryId", () => {
      expect(
        parseContactsFarmScopeFromSearchParams(
          sp("farmAreaId=  x  &farmTerritoryId=y")
        )
      ).toEqual({ farmAreaId: "x", farmTerritoryId: "y" });
    });

    it("returns nulls when missing or blank", () => {
      expect(parseContactsFarmScopeFromSearchParams(sp(""))).toEqual({
        farmAreaId: null,
        farmTerritoryId: null,
      });
    });
  });

  describe("parseContactsListSortFromSearchParams", () => {
    it("defaults to followups", () => {
      expect(parseContactsListSortFromSearchParams(sp(""))).toBe("followups");
    });

    it("reads sort=recent", () => {
      expect(parseContactsListSortFromSearchParams(sp("sort=recent"))).toBe(
        "recent"
      );
    });
  });

  describe("parseFollowUpNeedsFromSearchParams", () => {
    it("detects followUp=needs", () => {
      expect(parseFollowUpNeedsFromSearchParams(sp("followUp=needs"))).toBe(
        true
      );
      expect(parseFollowUpNeedsFromSearchParams(sp(""))).toBe(false);
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

    it("is true when followUp=needs", () => {
      expect(hasSegmentFiltersInSearchParams(sp("followUp=needs"))).toBe(true);
    });

    it("is false when status is invalid (ignored)", () => {
      expect(hasSegmentFiltersInSearchParams(sp("status=INVALID"))).toBe(
        false
      );
    });

    it("is true for FarmTrackr health cleanup params", () => {
      expect(hasSegmentFiltersInSearchParams(sp("missing=email"))).toBe(true);
      expect(hasSegmentFiltersInSearchParams(sp("readyToPromote=1"))).toBe(true);
      expect(hasSegmentFiltersInSearchParams(sp("farmHealthScope=active"))).toBe(
        true
      );
    });
  });
});

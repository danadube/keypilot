/**
 * @jest-environment node
 */

import {
  MAX_SHOWINGHQ_LIST_SEARCH_Q_LENGTH,
  normalizeShowingHqListSearchQ,
  parseQFromSearchParams,
} from "../list-search-q";

describe("list-search-q", () => {
  describe("normalizeShowingHqListSearchQ", () => {
    it("returns null for empty or whitespace-only", () => {
      expect(normalizeShowingHqListSearchQ(null)).toBe(null);
      expect(normalizeShowingHqListSearchQ("")).toBe(null);
      expect(normalizeShowingHqListSearchQ("   \t ")).toBe(null);
    });
    it("trims and collapses internal whitespace", () => {
      expect(normalizeShowingHqListSearchQ("  a \t b  c  ")).toBe("a b c");
    });
    it("caps length", () => {
      const long = "x".repeat(MAX_SHOWINGHQ_LIST_SEARCH_Q_LENGTH + 40);
      const out = normalizeShowingHqListSearchQ(long);
      expect(out).toHaveLength(MAX_SHOWINGHQ_LIST_SEARCH_Q_LENGTH);
    });
  });

  describe("parseQFromSearchParams", () => {
    it("normalizes from q param", () => {
      const sp = new URLSearchParams("q=  hi%20there  ");
      expect(parseQFromSearchParams(sp)).toBe("hi there");
    });
  });
});

/**
 * @jest-environment node
 */

import {
  SHOWINGHQ_SAVED_VIEWS_STORAGE_KEY,
  addSavedShowingsView,
  addSavedVisitorsView,
  loadSavedViews,
  persistSavedViews,
  renameSavedView,
  deleteSavedView,
} from "../saved-views-storage";

describe("saved-views-storage", () => {
  let store: Record<string, string>;
  let prevWindow: typeof global.window;

  beforeEach(() => {
    store = {};
    prevWindow = global.window;
    (global as unknown as { window: Window & typeof globalThis }).window = {
      localStorage: {
        getItem: (k: string) => (k in store ? store[k] : null),
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
        key: () => null,
        length: 0,
        clear: () => {
          store = {};
        },
      },
    } as unknown as Window & typeof globalThis;
    Object.defineProperty(global, "crypto", {
      value: { randomUUID: () => "00000000-0000-4000-8000-000000000001" },
      configurable: true,
    });
  });

  afterEach(() => {
    (global as unknown as { window?: typeof global.window }).window =
      prevWindow;
  });

  describe("loadSavedViews", () => {
    it("returns empty when key missing", () => {
      expect(loadSavedViews()).toEqual([]);
    });
    it("returns empty for corrupt JSON", () => {
      window.localStorage.setItem(SHOWINGHQ_SAVED_VIEWS_STORAGE_KEY, "{");
      expect(loadSavedViews()).toEqual([]);
    });
    it("normalizes SHOWINGS rows (invalid source dropped)", () => {
      window.localStorage.setItem(
        SHOWINGHQ_SAVED_VIEWS_STORAGE_KEY,
        JSON.stringify([
          {
            id: "s1",
            name: "Supra",
            surface: "SHOWINGS",
            source: " supra_scrape ",
            feedbackOnly: true,
          },
          {
            id: "s2",
            name: "Bad source",
            surface: "SHOWINGS",
            source: "nope",
            feedbackOnly: null,
          },
        ])
      );
      const rows = loadSavedViews();
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        surface: "SHOWINGS",
        source: "SUPRA_SCRAPE",
        feedbackOnly: true,
      });
      expect(rows[1]).toMatchObject({
        surface: "SHOWINGS",
        source: null,
        feedbackOnly: null,
      });
    });

    it("drops bad items and normalizes VISITORS rows", () => {
      window.localStorage.setItem(
        SHOWINGHQ_SAVED_VIEWS_STORAGE_KEY,
        JSON.stringify([
          {
            id: "a",
            name: "One",
            surface: "VISITORS",
            openHouseId: " oh1 ",
            sort: "NAME-ASC",
          },
          "bad",
          { id: "", name: "x", surface: "VISITORS" },
        ])
      );
      const rows = loadSavedViews();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id: "a",
        name: "One",
        surface: "VISITORS",
        openHouseId: "oh1",
        sort: "name-asc",
      });
    });
  });

  describe("addSavedShowingsView", () => {
    it("rejects duplicate fingerprint (source + feedbackOnly)", () => {
      addSavedShowingsView({
        name: "A",
        source: "MANUAL",
        feedbackOnly: true,
      });
      const dup = addSavedShowingsView({
        name: "B",
        source: "MANUAL",
        feedbackOnly: true,
      });
      expect(dup.ok).toBe(false);
      if (!dup.ok) expect(dup.reason).toBe("duplicate");
    });
    it("allows same source with different feedback flag", () => {
      const a = addSavedShowingsView({
        name: "A",
        source: "MANUAL",
        feedbackOnly: false,
      });
      const b = addSavedShowingsView({
        name: "B",
        source: "MANUAL",
        feedbackOnly: true,
      });
      expect(a.ok).toBe(true);
      expect(b.ok).toBe(true);
      expect(loadSavedViews()).toHaveLength(2);
    });
  });

  describe("addSavedVisitorsView", () => {
    it("rejects duplicate fingerprint", () => {
      addSavedVisitorsView({
        name: "First",
        openHouseId: "x",
        sort: "date-desc",
      });
      const dup = addSavedVisitorsView({
        name: "Second",
        openHouseId: "x",
        sort: "date-desc",
      });
      expect(dup.ok).toBe(false);
      if (!dup.ok) expect(dup.reason).toBe("duplicate");
    });
    it("rejects empty name", () => {
      const r = addSavedVisitorsView({
        name: "   ",
        openHouseId: null,
        sort: "name-desc",
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("empty_name");
    });
  });

  describe("renameSavedView / deleteSavedView", () => {
    it("rename requires non-empty name", () => {
      addSavedVisitorsView({
        name: "A",
        openHouseId: "z",
        sort: "date-desc",
      });
      const id = loadSavedViews()[0]!.id;
      expect(renameSavedView(id, "  ")).toBe(false);
      expect(renameSavedView(id, "B")).toBe(true);
      expect(loadSavedViews()[0]!.name).toBe("B");
    });
    it("delete removes row", () => {
      addSavedVisitorsView({
        name: "A",
        openHouseId: "z",
        sort: "date-desc",
      });
      const id = loadSavedViews()[0]!.id;
      deleteSavedView(id);
      expect(loadSavedViews()).toHaveLength(0);
    });
  });

  describe("persistSavedViews", () => {
    it("does not throw on write", () => {
      persistSavedViews([]);
      expect(loadSavedViews()).toEqual([]);
    });
  });
});

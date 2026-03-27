/**
 * @jest-environment node
 */
import {
  SAVED_SEGMENTS_STORAGE_KEY,
  addSavedSegment,
  loadSavedSegments,
  normalizedSegmentFilters,
  persistSavedSegments,
} from "../saved-segments-storage";

describe("saved-segments-storage", () => {
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

  describe("loadSavedSegments", () => {
    it("returns empty array when key missing", () => {
      expect(loadSavedSegments()).toEqual([]);
    });

    it("returns empty array for invalid JSON (safe fallback)", () => {
      window.localStorage.setItem(SAVED_SEGMENTS_STORAGE_KEY, "not-json{");
      expect(loadSavedSegments()).toEqual([]);
    });

    it("returns empty array for non-array JSON", () => {
      window.localStorage.setItem(
        SAVED_SEGMENTS_STORAGE_KEY,
        JSON.stringify({ x: 1 })
      );
      expect(loadSavedSegments()).toEqual([]);
    });

    it("drops malformed items and normalizes valid rows", () => {
      window.localStorage.setItem(
        SAVED_SEGMENTS_STORAGE_KEY,
        JSON.stringify([
          { id: "a", name: "One", status: "  lead  ", tagId: " t1 " },
          "bad",
          { id: "", name: "x" },
          { id: "b", name: "Two", status: "FAKE", tagId: null },
        ])
      );
      const rows = loadSavedSegments();
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        id: "a",
        name: "One",
        status: "LEAD",
        tagId: "t1",
      });
      expect(rows[1]).toMatchObject({
        id: "b",
        name: "Two",
        status: null,
        tagId: null,
      });
    });
  });

  describe("addSavedSegment", () => {
    it("returns empty_name when name is whitespace", () => {
      expect(
        addSavedSegment({ name: "   ", status: "LEAD", tagId: null })
      ).toEqual({ ok: false, reason: "empty_name" });
    });

    it("persists normalized filters and returns ok", () => {
      const r = addSavedSegment({
        name: "My view",
        status: " lead ",
        tagId: null,
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.record.status).toBe("LEAD");
      expect(r.record.tagId).toBeNull();
      const loaded = loadSavedSegments();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].name).toBe("My view");
    });

    it("detects duplicate filter combo", () => {
      addSavedSegment({ name: "A", status: "LEAD", tagId: "x" });
      const dup = addSavedSegment({
        name: "B",
        status: "LEAD",
        tagId: "x",
      });
      expect(dup).toEqual({ ok: false, reason: "duplicate" });
      expect(loadSavedSegments()).toHaveLength(1);
    });

    it("treats equivalent normalization as duplicate", () => {
      addSavedSegment({ name: "A", status: "LEAD", tagId: null });
      const dup = addSavedSegment({
        name: "B",
        status: " lead ",
        tagId: null,
      });
      expect(dup).toEqual({ ok: false, reason: "duplicate" });
    });

    it("allows same name with different filters", () => {
      expect(addSavedSegment({ name: "X", status: "LEAD", tagId: null }).ok).toBe(
        true
      );
      expect(
        addSavedSegment({ name: "X", status: "READY", tagId: null }).ok
      ).toBe(true);
      expect(loadSavedSegments()).toHaveLength(2);
    });
  });

  describe("normalizedSegmentFilters", () => {
    it("normalizes status and tag for fingerprinting", () => {
      expect(normalizedSegmentFilters("contacted", "  z  ")).toEqual({
        status: "CONTACTED",
        tagId: "z",
      });
    });
  });

  describe("persistSavedSegments", () => {
    it("writes valid JSON round-trip", () => {
      persistSavedSegments([
        { id: "1", name: "N", status: null, tagId: "t" },
      ]);
      const raw = window.localStorage.getItem(SAVED_SEGMENTS_STORAGE_KEY);
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw!)).toEqual([
        { id: "1", name: "N", status: null, tagId: "t" },
      ]);
    });
  });
});

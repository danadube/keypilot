/**
 * @jest-environment node
 */
import {
  FARMTRACKR_SAVED_LIST_SCOPES_KEY,
  addSavedListScope,
  deleteSavedListScopeById,
  loadSavedListScopes,
  persistSavedListScopes,
} from "../farmtrackr-saved-list-scopes-storage";

describe("farmtrackr-saved-list-scopes-storage", () => {
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
    (global as unknown as { window?: typeof global.window }).window = prevWindow;
  });

  it("load returns empty when missing", () => {
    expect(loadSavedListScopes()).toEqual([]);
  });

  it("load returns empty for bad JSON", () => {
    window.localStorage.setItem(FARMTRACKR_SAVED_LIST_SCOPES_KEY, "{");
    expect(loadSavedListScopes()).toEqual([]);
  });

  it("addSavedListScope persists territory scope", () => {
    const r = addSavedListScope({
      name: "East",
      kind: "territory",
      territoryId: "t1",
      farmAreaId: null,
      label: "Territory · East",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const rows = loadSavedListScopes();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: "East",
      kind: "territory",
      territoryId: "t1",
      farmAreaId: null,
    });
  });

  it("rejects duplicate fingerprint", () => {
    addSavedListScope({
      name: "A",
      kind: "territory",
      territoryId: "t1",
      farmAreaId: null,
      label: "x",
    });
    const r = addSavedListScope({
      name: "B",
      kind: "territory",
      territoryId: "t1",
      farmAreaId: null,
      label: "y",
    });
    expect(r).toEqual({ ok: false, reason: "duplicate" });
  });

  it("deleteSavedListScopeById removes row", () => {
    addSavedListScope({
      id: "id-1",
      name: "A",
      kind: "farm_area",
      territoryId: null,
      farmAreaId: "a1",
      label: "Area",
    });
    deleteSavedListScopeById("id-1");
    expect(loadSavedListScopes()).toEqual([]);
  });

  it("persist round-trip", () => {
    persistSavedListScopes([
      {
        id: "x",
        name: "N",
        kind: "farm_area",
        territoryId: null,
        farmAreaId: "fa",
        label: "L",
      },
    ]);
    expect(loadSavedListScopes()).toHaveLength(1);
  });
});

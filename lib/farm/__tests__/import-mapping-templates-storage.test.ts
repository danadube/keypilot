/**
 * @jest-environment node
 */

import {
  EMPTY_FARM_IMPORT_MAPPING_FIELDS,
  FARMTRACKR_IMPORT_MAPPING_TEMPLATES_KEY,
  addImportMappingTemplate,
  applyTemplateMappingToHeaders,
  deleteImportMappingTemplateById,
  loadImportMappingTemplates,
  persistImportMappingTemplates,
  renameImportMappingTemplate,
} from "../import-mapping-templates-storage";

describe("import-mapping-templates-storage", () => {
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
      value: { randomUUID: () => "00000000-0000-4000-8000-000000000099" },
      configurable: true,
    });
  });

  afterEach(() => {
    (global as unknown as { window?: typeof global.window }).window = prevWindow;
  });

  it("applyTemplateMappingToHeaders keeps matches and reports unmatched", () => {
    const template = {
      ...EMPTY_FARM_IMPORT_MAPPING_FIELDS,
      email: "Email",
      phone: "Mobile",
      territory: "Territory",
      area: "MissingCol",
    };
    const { mapping, unmatchedColumnNames } = applyTemplateMappingToHeaders(template, [
      "Email",
      "Territory",
    ]);
    expect(mapping.email).toBe("Email");
    expect(mapping.phone).toBeNull();
    expect(mapping.territory).toBe("Territory");
    expect(mapping.area).toBeNull();
    expect(unmatchedColumnNames.sort()).toEqual(["MissingCol", "Mobile"].sort());
  });

  it("loadImportMappingTemplates returns empty on bad JSON", () => {
    window.localStorage.setItem(FARMTRACKR_IMPORT_MAPPING_TEMPLATES_KEY, "{");
    expect(loadImportMappingTemplates()).toEqual([]);
  });

  it("add, rename, delete round-trip", () => {
    const add = addImportMappingTemplate({
      name: "  MLS  ",
      mapping: {
        ...EMPTY_FARM_IMPORT_MAPPING_FIELDS,
        email: "e",
      },
      defaultTerritoryName: "T",
      defaultAreaName: "A",
    });
    expect(add.ok).toBe(true);
    if (!add.ok) return;
    const list = loadImportMappingTemplates();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("MLS");

    expect(renameImportMappingTemplate(add.record.id, "Renamed")).toEqual({ ok: true });
    expect(loadImportMappingTemplates()[0].name).toBe("Renamed");

    deleteImportMappingTemplateById(add.record.id);
    expect(loadImportMappingTemplates()).toHaveLength(0);
  });

  it("persistImportMappingTemplates stores valid JSON array", () => {
    const rec = {
      id: "x",
      name: "n",
      mapping: { ...EMPTY_FARM_IMPORT_MAPPING_FIELDS },
      defaultTerritoryName: "",
      defaultAreaName: "",
      updatedAt: new Date().toISOString(),
    };
    persistImportMappingTemplates([rec]);
    const raw = window.localStorage.getItem(FARMTRACKR_IMPORT_MAPPING_TEMPLATES_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toEqual([rec]);
  });
});

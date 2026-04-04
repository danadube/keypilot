/**
 * Browser-local import column mapping templates for FarmTrackr (v1).
 * Same discipline as kp_farmtrackr_saved_list_scopes_v1.
 */

export const FARMTRACKR_IMPORT_MAPPING_TEMPLATES_KEY =
  "kp_farmtrackr_import_mapping_templates_v1";

export const MAX_IMPORT_MAPPING_TEMPLATES = 30;

export const MAX_IMPORT_MAPPING_TEMPLATE_NAME_LENGTH = 80;

/** Column picks only; defaults are separate strings on the record. */
export type FarmImportMappingTemplateFields = {
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  territory: string | null;
  area: string | null;
};

export type FarmImportMappingTemplateRecord = {
  id: string;
  name: string;
  mapping: FarmImportMappingTemplateFields;
  defaultTerritoryName: string;
  defaultAreaName: string;
  updatedAt: string;
};

const EMPTY_MAPPING: FarmImportMappingTemplateFields = {
  email: null,
  phone: null,
  firstName: null,
  lastName: null,
  fullName: null,
  territory: null,
  area: null,
};

const MAPPING_KEYS: (keyof FarmImportMappingTemplateFields)[] = [
  "email",
  "phone",
  "firstName",
  "lastName",
  "fullName",
  "territory",
  "area",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeMapping(raw: unknown): FarmImportMappingTemplateFields {
  if (!isRecord(raw)) return { ...EMPTY_MAPPING };
  const out: FarmImportMappingTemplateFields = { ...EMPTY_MAPPING };
  for (const key of MAPPING_KEYS) {
    const v = raw[key];
    if (v === null || v === undefined) {
      out[key] = null;
    } else if (typeof v === "string") {
      const t = v.trim();
      out[key] = t.length > 0 ? t : null;
    } else {
      out[key] = null;
    }
  }
  return out;
}

function normalizeRecord(raw: unknown): FarmImportMappingTemplateRecord | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const defaultTerritoryName =
    typeof raw.defaultTerritoryName === "string" ? raw.defaultTerritoryName : "";
  const defaultAreaName =
    typeof raw.defaultAreaName === "string" ? raw.defaultAreaName : "";
  const updatedAt =
    typeof raw.updatedAt === "string" && raw.updatedAt.trim().length > 0
      ? raw.updatedAt.trim()
      : new Date(0).toISOString();
  if (!id || !name) return null;
  return {
    id,
    name: name.slice(0, MAX_IMPORT_MAPPING_TEMPLATE_NAME_LENGTH),
    mapping: normalizeMapping(raw.mapping),
    defaultTerritoryName: defaultTerritoryName.slice(0, 200),
    defaultAreaName: defaultAreaName.slice(0, 200),
    updatedAt,
  };
}

export function loadImportMappingTemplates(): FarmImportMappingTemplateRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FARMTRACKR_IMPORT_MAPPING_TEMPLATES_KEY);
    if (!raw || raw.trim() === "") return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: FarmImportMappingTemplateRecord[] = [];
    for (const item of parsed) {
      const rec = normalizeRecord(item);
      if (rec) out.push(rec);
    }
    return out.slice(0, MAX_IMPORT_MAPPING_TEMPLATES);
  } catch {
    return [];
  }
}

export function persistImportMappingTemplates(
  templates: FarmImportMappingTemplateRecord[]
): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = templates.slice(0, MAX_IMPORT_MAPPING_TEMPLATES);
    window.localStorage.setItem(
      FARMTRACKR_IMPORT_MAPPING_TEMPLATES_KEY,
      JSON.stringify(trimmed)
    );
  } catch {
    /* quota / private mode */
  }
}

export type AddImportMappingTemplateResult =
  | { ok: true; record: FarmImportMappingTemplateRecord }
  | { ok: false; reason: "empty_name" | "limit" };

export function addImportMappingTemplate(input: {
  name: string;
  mapping: FarmImportMappingTemplateFields;
  defaultTerritoryName: string;
  defaultAreaName: string;
}): AddImportMappingTemplateResult {
  const name = input.name.trim().slice(0, MAX_IMPORT_MAPPING_TEMPLATE_NAME_LENGTH);
  if (!name) return { ok: false, reason: "empty_name" };
  const list = loadImportMappingTemplates();
  if (list.length >= MAX_IMPORT_MAPPING_TEMPLATES) {
    return { ok: false, reason: "limit" };
  }
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `ft-import-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const record: FarmImportMappingTemplateRecord = {
    id,
    name,
    mapping: { ...input.mapping },
    defaultTerritoryName: input.defaultTerritoryName.trim().slice(0, 200),
    defaultAreaName: input.defaultAreaName.trim().slice(0, 200),
    updatedAt: new Date().toISOString(),
  };
  persistImportMappingTemplates([record, ...list]);
  return { ok: true, record };
}

export function deleteImportMappingTemplateById(id: string): void {
  const list = loadImportMappingTemplates().filter((r) => r.id !== id);
  persistImportMappingTemplates(list);
}

export type RenameImportMappingTemplateResult =
  | { ok: true }
  | { ok: false; reason: "empty_name" | "not_found" };

export function renameImportMappingTemplate(
  id: string,
  newName: string
): RenameImportMappingTemplateResult {
  const name = newName.trim().slice(0, MAX_IMPORT_MAPPING_TEMPLATE_NAME_LENGTH);
  if (!name) return { ok: false, reason: "empty_name" };
  const list = loadImportMappingTemplates();
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return { ok: false, reason: "not_found" };
  const next = [...list];
  next[idx] = {
    ...next[idx],
    name,
    updatedAt: new Date().toISOString(),
  };
  persistImportMappingTemplates(next);
  return { ok: true };
}

/**
 * Apply saved column picks to the current file's headers. Missing columns → null mapping + listed in unmatched.
 */
export function applyTemplateMappingToHeaders(
  templateMapping: FarmImportMappingTemplateFields,
  headers: string[]
): {
  mapping: FarmImportMappingTemplateFields;
  unmatchedColumnNames: string[];
} {
  const headerSet = new Set(headers);
  const mapping: FarmImportMappingTemplateFields = { ...EMPTY_MAPPING };
  const unmatched: string[] = [];
  for (const key of MAPPING_KEYS) {
    const col = templateMapping[key];
    if (col == null || col === "") continue;
    if (headerSet.has(col)) {
      mapping[key] = col;
    } else {
      unmatched.push(col);
    }
  }
  return {
    mapping,
    unmatchedColumnNames: Array.from(new Set(unmatched)),
  };
}

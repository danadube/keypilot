/**
 * Deterministic header → FarmTrackr import column mapping (alias dictionary).
 * Extend IMPORT_HEADER_ALIASES with new normalized keys only; keep matches exact after normalize.
 *
 * Columns like address / city / state / zip are not import targets today — omit from aliases until the
 * API supports them.
 */

export type ImportFieldKey =
  | "email"
  | "phone"
  | "firstName"
  | "lastName"
  | "fullName"
  | "territory"
  | "area";

export type ImportMappingLike = Record<ImportFieldKey, string | null>;

export const EMPTY_IMPORT_MAPPING: ImportMappingLike = {
  email: null,
  phone: null,
  firstName: null,
  lastName: null,
  fullName: null,
  territory: null,
  area: null,
};

/**
 * Lowercase, trim, underscores → spaces, collapse whitespace.
 */
export function normalizeImportHeaderLabel(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Normalized header label → import field. Only high-confidence synonyms; omit ambiguous keys (e.g. "farm" alone).
 * Multiple dictionary keys may target the same field.
 */
export const IMPORT_HEADER_ALIASES: Readonly<Record<string, ImportFieldKey>> = {
  // Email
  email: "email",
  "email address": "email",
  "e-mail": "email",
  "e mail": "email",
  "e-mail address": "email",
  "primary email": "email",

  // Phone
  phone: "phone",
  mobile: "phone",
  cell: "phone",
  telephone: "phone",
  tel: "phone",
  "phone number": "phone",
  "phone #": "phone",
  "mobile phone": "phone",
  "cell phone": "phone",
  "cellphone": "phone",
  "home phone": "phone",
  "work phone": "phone",

  // First name
  "first name": "firstName",
  firstname: "firstName",
  fname: "firstName",
  "given name": "firstName",
  "first": "firstName",

  // Last name
  "last name": "lastName",
  lastname: "lastName",
  lname: "lastName",
  surname: "lastName",
  "family name": "lastName",
  "last": "lastName",

  // Full name (avoid short tokens shared with other meanings)
  "full name": "fullName",
  fullname: "fullName",
  name: "fullName",
  "contact name": "fullName",
  "display name": "fullName",
  "owner name": "fullName",

  // Territory
  territory: "territory",
  "territory name": "territory",
  "farm territory": "territory",

  // Farm area (explicit phrases only)
  area: "area",
  "farm area": "area",
  farmarea: "area",
  neighborhood: "area",
  neighbourhood: "area",
  "farm name": "area",
};

/**
 * Apply alias dictionary only (deterministic, exact match after normalize).
 * Does not overwrite non-null entries in `base` (e.g. user or template selections).
 */
export function buildImportMappingFromHeaders(
  headers: string[],
  base: ImportMappingLike = { ...EMPTY_IMPORT_MAPPING }
): { mapping: ImportMappingLike; smartMappedFieldCount: number } {
  const mapping: ImportMappingLike = { ...base };
  const smartFields = new Set<ImportFieldKey>();

  for (const header of headers) {
    const norm = normalizeImportHeaderLabel(header);
    const field = IMPORT_HEADER_ALIASES[norm];
    if (!field || mapping[field] != null) continue;
    mapping[field] = header;
    smartFields.add(field);
  }

  return { mapping, smartMappedFieldCount: smartFields.size };
}

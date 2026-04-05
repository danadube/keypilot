/**
 * Deterministic header → FarmTrackr import column mapping.
 * Strong vs weak tiers: same normalized label lookup, first matching column in file wins per target field.
 */

export type ImportFieldKey =
  | "email"
  | "phone"
  | "firstName"
  | "lastName"
  | "fullName"
  | "territory"
  | "area"
  | "mailingStreet1"
  | "mailingStreet2"
  | "mailingCity"
  | "mailingState"
  | "mailingZip"
  | "siteStreet1"
  | "siteStreet2"
  | "siteCity"
  | "siteState"
  | "siteZip"
  | "email2"
  | "email3"
  | "email4"
  | "phone2";

export type ImportMappingLike = Record<ImportFieldKey, string | null>;

/** Match quality for auto-mapped columns (UI: teal vs amber). */
export type ImportFieldMatchTier = "strong" | "weak";

export const EMPTY_IMPORT_MAPPING: ImportMappingLike = {
  email: null,
  phone: null,
  firstName: null,
  lastName: null,
  fullName: null,
  territory: null,
  area: null,
  mailingStreet1: null,
  mailingStreet2: null,
  mailingCity: null,
  mailingState: null,
  mailingZip: null,
  siteStreet1: null,
  siteStreet2: null,
  siteCity: null,
  siteState: null,
  siteZip: null,
  email2: null,
  email3: null,
  email4: null,
  phone2: null,
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
 * High-confidence phrases (multi-word or unambiguous tokens).
 */
export const IMPORT_HEADER_STRONG: Readonly<Record<string, ImportFieldKey>> = {
  // —— Email (primary) ——
  "email address": "email",
  "e-mail": "email",
  "e mail": "email",
  "e-mail address": "email",
  "primary email": "email",
  "main email": "email",
  "work email": "email",
  "home email": "email",
  "personal email": "email",
  "email 1": "email",
  "contact email": "email",
  "owner email": "email",

  // —— Phone primary ——
  "phone number": "phone",
  "phone #": "phone",
  "home phone": "phone",
  "work phone": "phone",
  "office phone": "phone",
  "day phone": "phone",
  "evening phone": "phone",
  "land line": "phone",
  landline: "phone",
  "primary phone": "phone",
  "main phone": "phone",
  "business phone": "phone",

  // —— Phone 2 / mobile ——
  mobile: "phone2",
  cell: "phone2",
  cellphone: "phone2",
  "mobile phone": "phone2",
  "cell phone": "phone2",
  "phone 2": "phone2",
  phone2: "phone2",
  "second phone": "phone2",
  "alternate phone": "phone2",
  "alt phone": "phone2",
  "alt. phone": "phone2",
  "secondary phone": "phone2",
  "other phone": "phone2",
  "additional phone": "phone2",

  // —— Identity names ——
  "first name": "firstName",
  firstname: "firstName",
  fname: "firstName",
  "given name": "firstName",

  "last name": "lastName",
  lastname: "lastName",
  lname: "lastName",
  surname: "lastName",
  "family name": "lastName",

  "full name": "fullName",
  fullname: "fullName",
  "contact name": "fullName",
  "display name": "fullName",
  "owner name": "fullName",
  "contact full name": "fullName",

  // —— Territory / farm ——
  territory: "territory",
  "territory name": "territory",
  "farm territory": "territory",
  "territory id": "territory",
  "geo territory": "territory",

  "farm area": "area",
  farmarea: "area",
  neighborhood: "area",
  neighbourhood: "area",
  "farm name": "area",
  "area name": "area",
  "farm neighborhood": "area",
  precinct: "area",
  "farm zone": "area",

  // —— Mailing ——
  "mailing street 1": "mailingStreet1",
  "mailing street": "mailingStreet1",
  "mail street 1": "mailingStreet1",
  "mail street": "mailingStreet1",
  "mailing address": "mailingStreet1",
  "mailing address line 1": "mailingStreet1",
  "mail address": "mailingStreet1",
  "mail addr 1": "mailingStreet1",
  "mailing line 1": "mailingStreet1",
  "billing address": "mailingStreet1",
  "billing street": "mailingStreet1",
  "residential address": "mailingStreet1",
  "postal address": "mailingStreet1",

  "mailing street 2": "mailingStreet2",
  "mail street 2": "mailingStreet2",
  "mailing address line 2": "mailingStreet2",
  "mail addr 2": "mailingStreet2",

  "mailing city": "mailingCity",
  "mail city": "mailingCity",
  "mailing municipality": "mailingCity",

  "mailing state": "mailingState",
  "mail state": "mailingState",

  "mailing zip": "mailingZip",
  "mail zip": "mailingZip",
  "mailing postal": "mailingZip",
  "mailing zip code": "mailingZip",
  "mailing postcode": "mailingZip",

  // —— Site / situs ——
  "site street 1": "siteStreet1",
  "site address": "siteStreet1",
  "property address": "siteStreet1",
  "situs address": "siteStreet1",
  "property street": "siteStreet1",
  "site line 1": "siteStreet1",
  "parcel address": "siteStreet1",
  "listing address": "siteStreet1",

  "site street 2": "siteStreet2",
  "site address line 2": "siteStreet2",

  "site city": "siteCity",
  "property city": "siteCity",

  "site state": "siteState",
  "property state": "siteState",

  "site zip": "siteZip",
  "property zip": "siteZip",

  // —— Alternate emails ——
  "email 2": "email2",
  email2: "email2",
  "alternate email": "email2",
  "secondary email": "email2",
  "second email": "email2",
  "alt email": "email2",
  "alt. email": "email2",
  "email address 2": "email2",
  "additional email": "email2",

  "email 3": "email3",
  email3: "email3",
  "alternate email 2": "email3",
  "third email": "email3",

  "email 4": "email4",
  email4: "email4",
  "alternate email 3": "email4",
  "fourth email": "email4",
};

/**
 * Generic tokens — still exact after normalize; may need operator review (e.g. "city" vs mailing vs site).
 */
export const IMPORT_HEADER_WEAK: Readonly<Record<string, ImportFieldKey>> = {
  email: "email",
  phone: "phone",
  telephone: "phone",
  tel: "phone",

  name: "fullName",
  first: "firstName",
  last: "lastName",

  city: "mailingCity",
  state: "mailingState",
  st: "mailingState",
  zip: "mailingZip",
  "zip code": "mailingZip",
  postal: "mailingZip",
  postcode: "mailingZip",

  address: "mailingStreet1",
  "street address": "mailingStreet1",
  street: "mailingStreet1",

  area: "area",
};

/**
 * @deprecated Prefer IMPORT_HEADER_STRONG / IMPORT_HEADER_WEAK. Merged for tests and diagnostics (strong wins on key collision).
 */
export const IMPORT_HEADER_ALIASES: Readonly<Record<string, ImportFieldKey>> = {
  ...IMPORT_HEADER_WEAK,
  ...IMPORT_HEADER_STRONG,
};

export type SmartImportMappingResult = {
  mapping: ImportMappingLike;
  /** Tier for each field filled by this pass (not set for preserved `base` values). */
  confidence: Partial<Record<ImportFieldKey, ImportFieldMatchTier>>;
  smartMappedFieldCount: number;
  strongMappedCount: number;
  weakMappedCount: number;
};

/**
 * Apply alias dictionaries only (deterministic). First matching header in file order wins per field.
 * Does not overwrite non-null entries in `base` (e.g. user or template selections).
 */
export function buildImportMappingFromHeaders(
  headers: string[],
  base: ImportMappingLike = { ...EMPTY_IMPORT_MAPPING }
): SmartImportMappingResult {
  const mapping: ImportMappingLike = { ...base };
  const confidence: Partial<Record<ImportFieldKey, ImportFieldMatchTier>> = {};
  const filledByAuto = new Set<ImportFieldKey>();

  let strongMappedCount = 0;
  let weakMappedCount = 0;

  for (const header of headers) {
    const norm = normalizeImportHeaderLabel(header);
    const strongField = IMPORT_HEADER_STRONG[norm];
    const weakField = IMPORT_HEADER_WEAK[norm];
    const field = strongField ?? weakField;
    const tier: ImportFieldMatchTier | null = strongField
      ? "strong"
      : weakField
        ? "weak"
        : null;
    if (!field || !tier) continue;
    if (mapping[field] != null) continue;
    if (filledByAuto.has(field)) continue;

    mapping[field] = header;
    confidence[field] = tier;
    filledByAuto.add(field);
    if (tier === "strong") strongMappedCount += 1;
    else weakMappedCount += 1;
  }

  return {
    mapping,
    confidence,
    smartMappedFieldCount: strongMappedCount + weakMappedCount,
    strongMappedCount,
    weakMappedCount,
  };
}

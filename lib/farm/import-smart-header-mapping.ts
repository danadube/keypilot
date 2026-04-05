/**
 * Deterministic header → FarmTrackr import column mapping (alias dictionary).
 * Extend IMPORT_HEADER_ALIASES with new normalized keys only; keep matches exact after normalize.
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

  // Phone (primary / landline-style labels)
  phone: "phone",
  telephone: "phone",
  tel: "phone",
  "phone number": "phone",
  "phone #": "phone",
  "home phone": "phone",
  "work phone": "phone",
  "office phone": "phone",

  // Phone 2 (mobile / alternate)
  mobile: "phone2",
  cell: "phone2",
  cellphone: "phone2",
  "mobile phone": "phone2",
  "cell phone": "phone2",
  "phone 2": "phone2",
  "phone2": "phone2",
  "second phone": "phone2",
  "alternate phone": "phone2",
  "alt phone": "phone2",

  // First name
  "first name": "firstName",
  firstname: "firstName",
  fname: "firstName",
  "given name": "firstName",
  first: "firstName",

  // Last name
  "last name": "lastName",
  lastname: "lastName",
  lname: "lastName",
  surname: "lastName",
  "family name": "lastName",
  last: "lastName",

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

  // Mailing address
  "mailing street 1": "mailingStreet1",
  "mailing street": "mailingStreet1",
  "mail street 1": "mailingStreet1",
  "mail street": "mailingStreet1",
  "mailing address": "mailingStreet1",
  "mailing address line 1": "mailingStreet1",
  "mail address": "mailingStreet1",
  "mail addr 1": "mailingStreet1",
  address: "mailingStreet1",
  "street address": "mailingStreet1",
  "mailing line 1": "mailingStreet1",

  "mailing street 2": "mailingStreet2",
  "mail street 2": "mailingStreet2",
  "mailing address line 2": "mailingStreet2",
  "mail addr 2": "mailingStreet2",

  "mailing city": "mailingCity",
  "mail city": "mailingCity",
  city: "mailingCity",

  "mailing state": "mailingState",
  "mail state": "mailingState",
  state: "mailingState",
  st: "mailingState",

  "mailing zip": "mailingZip",
  "mail zip": "mailingZip",
  zip: "mailingZip",
  "zip code": "mailingZip",
  postal: "mailingZip",

  // Site / property address
  "site street 1": "siteStreet1",
  "site address": "siteStreet1",
  "property address": "siteStreet1",
  "situs address": "siteStreet1",
  "property street": "siteStreet1",
  "site line 1": "siteStreet1",

  "site street 2": "siteStreet2",
  "site address line 2": "siteStreet2",

  "site city": "siteCity",
  "property city": "siteCity",

  "site state": "siteState",
  "property state": "siteState",

  "site zip": "siteZip",
  "property zip": "siteZip",

  // Alternate emails
  "email 2": "email2",
  email2: "email2",
  "alternate email": "email2",
  "secondary email": "email2",
  "second email": "email2",
  "alt email": "email2",

  "email 3": "email3",
  email3: "email3",

  "email 4": "email4",
  email4: "email4",
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

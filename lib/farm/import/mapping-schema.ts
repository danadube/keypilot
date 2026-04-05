import { z } from "zod";

/** Column header names (exact strings from CSV/XLSX) sent with farm import preview/apply. */
const headerRef = z.string().nullish();

/**
 * Zod schema for API bodies — keep in sync with `FarmImportColumnMapping` in `./types`.
 */
export const FarmImportMappingSchema = z.object({
  email: headerRef,
  phone: headerRef,
  firstName: headerRef,
  lastName: headerRef,
  fullName: headerRef,
  territory: headerRef,
  area: headerRef,
  mailingStreet1: headerRef,
  mailingStreet2: headerRef,
  mailingCity: headerRef,
  mailingState: headerRef,
  mailingZip: headerRef,
  siteStreet1: headerRef,
  siteStreet2: headerRef,
  siteCity: headerRef,
  siteState: headerRef,
  siteZip: headerRef,
  email2: headerRef,
  email3: headerRef,
  email4: headerRef,
  phone2: headerRef,
});

export type FarmImportMappingPayload = z.infer<typeof FarmImportMappingSchema>;

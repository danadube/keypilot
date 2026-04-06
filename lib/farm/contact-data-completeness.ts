import type { ContactStatus } from "@prisma/client";
import { hasUsableMailingAddress, type ContactMailingFields } from "@/lib/farm/mailing/recipients";

/** Fields needed for FarmTrackr data-health signals (read paths only). */
export type ContactDataCompletenessFields = Pick<
  ContactMailingFields,
  | "id"
  | "firstName"
  | "lastName"
  | "mailingStreet1"
  | "mailingStreet2"
  | "mailingCity"
  | "mailingState"
  | "mailingZip"
> & {
  email: string | null;
  email2: string | null;
  email3: string | null;
  email4: string | null;
  phone: string | null;
  phone2: string | null;
  siteStreet1: string | null;
  siteCity: string | null;
  siteState: string | null;
  siteZip: string | null;
  status: ContactStatus | null;
};

function nonEmptyTrimmed(s: string | null | undefined): boolean {
  return (s ?? "").trim().length > 0;
}

export function contactHasAnyEmail(c: ContactDataCompletenessFields): boolean {
  return (
    nonEmptyTrimmed(c.email) ||
    nonEmptyTrimmed(c.email2) ||
    nonEmptyTrimmed(c.email3) ||
    nonEmptyTrimmed(c.email4)
  );
}

export function contactHasAnyPhone(c: ContactDataCompletenessFields): boolean {
  return nonEmptyTrimmed(c.phone) || nonEmptyTrimmed(c.phone2);
}

export function contactHasUsableMailingAddress(c: ContactDataCompletenessFields): boolean {
  return hasUsableMailingAddress({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    mailingStreet1: c.mailingStreet1,
    mailingStreet2: c.mailingStreet2,
    mailingCity: c.mailingCity,
    mailingState: c.mailingState,
    mailingZip: c.mailingZip,
  });
}

/** Same bar as mailing: street + city + state + zip (situs / property address). */
export function contactHasUsableSiteAddress(c: ContactDataCompletenessFields): boolean {
  const s1 = (c.siteStreet1 ?? "").trim();
  const city = (c.siteCity ?? "").trim();
  const state = (c.siteState ?? "").trim();
  const zip = (c.siteZip ?? "").trim();
  return s1.length > 0 && city.length > 0 && state.length > 0 && zip.length > 0;
}

/** FARM-stage contact with at least one reachable channel (email or phone). */
export function contactIsFarmStageReadyToPromote(c: ContactDataCompletenessFields): boolean {
  return c.status === "FARM" && (contactHasAnyEmail(c) || contactHasAnyPhone(c));
}

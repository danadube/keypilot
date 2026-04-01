/**
 * Mailing list rows for FarmTrackr exports (CSV + Avery sheets).
 */

export type FarmMailingRecipient = {
  contactId: string;
  name: string;
  street: string;
  street2: string | null;
  city: string;
  state: string;
  zip: string;
};

export type ContactMailingFields = {
  id: string;
  firstName: string;
  lastName: string;
  mailingStreet1: string | null;
  mailingStreet2: string | null;
  mailingCity: string | null;
  mailingState: string | null;
  mailingZip: string | null;
};

export function hasUsableMailingAddress(c: ContactMailingFields): boolean {
  const s1 = (c.mailingStreet1 ?? "").trim();
  const city = (c.mailingCity ?? "").trim();
  const state = (c.mailingState ?? "").trim();
  const zip = (c.mailingZip ?? "").trim();
  return s1.length > 0 && city.length > 0 && state.length > 0 && zip.length > 0;
}

export function contactToMailingRecipient(c: ContactMailingFields): FarmMailingRecipient | null {
  if (!hasUsableMailingAddress(c)) return null;
  const street2 = (c.mailingStreet2 ?? "").trim();
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  return {
    contactId: c.id,
    name: name.length > 0 ? name : "—",
    street: (c.mailingStreet1 ?? "").trim(),
    street2: street2.length > 0 ? street2 : null,
    city: (c.mailingCity ?? "").trim(),
    state: (c.mailingState ?? "").trim(),
    zip: (c.mailingZip ?? "").trim(),
  };
}

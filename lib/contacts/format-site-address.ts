/**
 * Single-line site/property address for tables and summaries.
 * Example: "123 Main St, Palm Springs, CA 92262"
 */
export function formatSiteAddressLine(contact: {
  siteStreet1?: string | null;
  siteStreet2?: string | null;
  siteCity?: string | null;
  siteState?: string | null;
  siteZip?: string | null;
}): string {
  const street = [contact.siteStreet1, contact.siteStreet2].filter(Boolean).join(", ");
  const cityState = [contact.siteCity, contact.siteState].filter(Boolean).join(", ");
  const tail = [cityState, contact.siteZip].filter(Boolean).join(" ").trim();
  if (street && tail) return `${street}, ${tail}`;
  return street || tail || "";
}

/** UUID v4 pattern for dashboard / focus links. */
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export function contactIdFromAppHref(href: string): string | null {
  const m = href.trim().match(new RegExp(`^/contacts/(${UUID})(?:/|$)`, "i"));
  return m?.[1] ?? null;
}

export function propertyIdFromAppHref(href: string): string | null {
  const m = href.trim().match(new RegExp(`^/properties/(${UUID})(?:/|$)`, "i"));
  return m?.[1] ?? null;
}

/**
 * Whitelisted plain-text placeholders for Activity Templates (v1).
 * Used by the ShowingHQ activity UI and by POST /api/v1/activities for parity.
 * Unknown tokens are left unchanged. Known tokens with no data resolve to "".
 */

export type ActivityTemplatePlaceholderContactInput = {
  firstName: string;
  lastName: string;
  email: string | null;
};

export type ActivityTemplatePlaceholderPropertyInput = {
  address1: string;
  city: string;
  state: string;
  zip: string;
};

export type ActivityTemplatePlaceholderContext = {
  contact?: ActivityTemplatePlaceholderContactInput | null;
  property?: ActivityTemplatePlaceholderPropertyInput | null;
};

/** Fixed whitelist — order does not matter for replacement. */
export const ACTIVITY_TEMPLATE_PLACEHOLDER_KEYS = [
  "{{contact.firstName}}",
  "{{contact.lastName}}",
  "{{contact.fullName}}",
  "{{contact.email}}",
  "{{property.address1}}",
  "{{property.city}}",
  "{{property.state}}",
  "{{property.zip}}",
  "{{property.fullAddress}}",
] as const;

export type ActivityTemplatePlaceholderKey =
  (typeof ACTIVITY_TEMPLATE_PLACEHOLDER_KEYS)[number];

function trimToPlain(s: string): string {
  return s.trim();
}

function contactFullName(c: ActivityTemplatePlaceholderContactInput): string {
  return [c.firstName, c.lastName].filter((p) => trimToPlain(p) !== "").join(" ").trim();
}

function propertyFullAddress(p: ActivityTemplatePlaceholderPropertyInput): string {
  const a1 = trimToPlain(p.address1);
  const city = trimToPlain(p.city);
  const st = trimToPlain(p.state);
  const zip = trimToPlain(p.zip);
  const cityPart = [city, st].filter(Boolean).join(", ");
  const loc = [cityPart, zip].filter(Boolean).join(" ").trim();
  return [a1, loc].filter(Boolean).join(", ");
}

function buildReplacementMap(
  ctx: ActivityTemplatePlaceholderContext
): Record<ActivityTemplatePlaceholderKey, string> {
  const c = ctx.contact ?? null;
  const p = ctx.property ?? null;

  const firstName = c ? trimToPlain(c.firstName) : "";
  const lastName = c ? trimToPlain(c.lastName) : "";
  const email = c?.email != null ? trimToPlain(c.email) : "";

  const address1 = p ? trimToPlain(p.address1) : "";
  const city = p ? trimToPlain(p.city) : "";
  const state = p ? trimToPlain(p.state) : "";
  const zip = p ? trimToPlain(p.zip) : "";

  const fullName = c ? contactFullName(c) : "";
  const fullAddress = p ? propertyFullAddress(p) : "";

  return {
    "{{contact.firstName}}": firstName,
    "{{contact.lastName}}": lastName,
    "{{contact.fullName}}": fullName,
    "{{contact.email}}": email,
    "{{property.address1}}": address1,
    "{{property.city}}": city,
    "{{property.state}}": state,
    "{{property.zip}}": zip,
    "{{property.fullAddress}}": fullAddress,
  };
}

/**
 * Substitute only whitelisted `{{...}}` tokens. Other `{{...}}` substrings are untouched.
 */
export function substituteActivityTemplatePlaceholders(
  text: string,
  ctx: ActivityTemplatePlaceholderContext
): string {
  if (text === "") return "";
  const map = buildReplacementMap(ctx);
  let out = text;
  for (const key of ACTIVITY_TEMPLATE_PLACEHOLDER_KEYS) {
    const value = map[key];
    out = out.split(key).join(value);
  }
  return out;
}

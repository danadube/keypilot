import type { JurisdictionProfile, TransactionTemplate } from "@/lib/forms-engine/types";

const US_STATE_RE = /^[A-Z]{2}$/;

/** Normalize user/property input to uppercase state code */
export function normalizeStateCode(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const u = raw.trim().toUpperCase();
  return US_STATE_RE.test(u) ? u : null;
}

/**
 * Resolve jurisdiction profile by state. MVP: one profile per state id `US-{STATE}`.
 */
export function resolveJurisdictionProfile(
  stateCode: string | null | undefined,
  profilesById: Record<string, JurisdictionProfile>
): JurisdictionProfile | null {
  const code = normalizeStateCode(stateCode ?? "");
  if (!code) return null;
  const direct = profilesById[`US-${code}`] ?? profilesById[code];
  if (direct) return direct;
  return Object.values(profilesById).find((p) => p.stateCode === code) ?? null;
}

export type TemplateMatchKey = `${string}:${string}:${string}`;

export function templateMatchKey(
  profileId: string,
  propertyType: string,
  side: "SELL" | "BUY" | "*"
): TemplateMatchKey {
  return `${profileId}:${propertyType}:${side}` as TemplateMatchKey;
}

/**
 * Pick a TransactionTemplate id from profile.templateIdsByKey.
 * Keys are `${profileId}:${propertyType}:${side}` or fallbacks with `*` wildcards (MVP simple).
 */
export function resolveTransactionTemplateId(
  profile: JurisdictionProfile,
  propertyType: string,
  side: "SELL" | "BUY"
): string | null {
  const exact = profile.templateIdsByKey[templateMatchKey(profile.id, propertyType, side)];
  if (exact) return exact;
  const anyType = profile.templateIdsByKey[templateMatchKey(profile.id, "*", side)];
  if (anyType) return anyType;
  const anySide = profile.templateIdsByKey[templateMatchKey(profile.id, propertyType, "*")];
  if (anySide) return anySide;
  const fallback = profile.templateIdsByKey[templateMatchKey(profile.id, "*", "*")];
  return fallback ?? null;
}

export function getTemplateOrThrow(
  templateId: string,
  templatesById: Record<string, TransactionTemplate>
): TransactionTemplate {
  const t = templatesById[templateId];
  if (!t) throw new Error(`TransactionTemplate not found: ${templateId}`);
  return t;
}

/** Verify template applies to side / property type (MVP) */
export function templateAppliesToContext(
  template: TransactionTemplate,
  propertyType: string,
  side: "SELL" | "BUY"
): boolean {
  if (template.side !== "BOTH" && template.side !== side) return false;
  if (template.propertyTypes.length === 0) return true;
  return template.propertyTypes.includes(propertyType) || template.propertyTypes.includes("*");
}

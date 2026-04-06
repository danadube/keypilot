import type { FarmStructureVisibility } from "@/lib/validations/farm-structure-visibility";

export type FarmHealthCleanupMissing = "email" | "phone" | "mailing" | "site";

function buildContactsCleanupSearchParams(
  q: { missing?: FarmHealthCleanupMissing; readyToPromote?: boolean }
): URLSearchParams {
  const p = new URLSearchParams();
  if (q.missing) p.set("missing", q.missing);
  if (q.readyToPromote) p.set("readyToPromote", "1");
  return p;
}

/** Contacts filtered to one farm area + health slice (ClientKeep list). */
export function contactsCleanupHrefFromArea(
  farmAreaId: string,
  q: { missing?: FarmHealthCleanupMissing; readyToPromote?: boolean }
): string {
  const p = buildContactsCleanupSearchParams(q);
  p.set("farmAreaId", farmAreaId);
  return `/contacts?${p.toString()}`;
}

/** Contacts filtered to a territory’s farm areas + health slice. */
export function contactsCleanupHrefFromTerritory(
  farmTerritoryId: string,
  q: { missing?: FarmHealthCleanupMissing; readyToPromote?: boolean }
): string {
  const p = buildContactsCleanupSearchParams(q);
  p.set("farmTerritoryId", farmTerritoryId);
  return `/contacts?${p.toString()}`;
}

/**
 * All contacts in farm areas for the given structure visibility (matches FarmTrackr health scope),
 * plus optional health slice.
 */
export function contactsCleanupHrefAllFarmScope(
  visibility: FarmStructureVisibility,
  q: { missing?: FarmHealthCleanupMissing; readyToPromote?: boolean }
): string {
  const p = buildContactsCleanupSearchParams(q);
  p.set("farmHealthScope", visibility);
  return `/contacts?${p.toString()}`;
}

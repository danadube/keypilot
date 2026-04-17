/**
 * Canonical contact segment query grammar for /contacts/all (full list) and GET /api/v1/contacts.
 * Single source of truth for URL-driven filters (status, tagId, follow-up, sort, farm scope, health).
 */

import type { FarmStructureVisibility } from "@/lib/validations/farm-structure-visibility";
import { parseFarmStructureVisibility } from "@/lib/validations/farm-structure-visibility";

/** Values accepted by GET /api/v1/contacts?status= */
export const CONTACT_SEGMENT_STATUS_VALUES = [
  "FARM",
  "LEAD",
  "CONTACTED",
  "NURTURING",
  "READY",
  "LOST",
] as const;

export type ContactSegmentStatus =
  (typeof CONTACT_SEGMENT_STATUS_VALUES)[number];

const STATUS_QUERY_SET = new Set<string>(CONTACT_SEGMENT_STATUS_VALUES);

/**
 * Normalize a raw `status` query value to a known CRM status, or null if missing/invalid.
 * Trims and uppercases; unknown values become null (caller treats as "all").
 */
export function normalizeQueryableStatusParam(
  raw: string | null | undefined
): ContactSegmentStatus | null {
  if (raw == null) return null;
  const u = raw.trim().toUpperCase();
  if (!u) return null;
  return STATUS_QUERY_SET.has(u) ? (u as ContactSegmentStatus) : null;
}

/** Normalize tagId from URL or storage: trim; empty string → null. */
export function normalizeSavedTagIdValue(
  tagId: string | null | undefined
): string | null {
  if (tagId == null) return null;
  const t = tagId.trim();
  return t || null;
}

/** Tab state: explicit "all" vs a single CRM status */
export type ContactSegmentStatusTab = ContactSegmentStatus | "__all__";

export const STATUS_TAB_VALUES = [
  { label: "All", value: "__all__" as const },
  { label: "Farm", value: "FARM" as const },
  { label: "Lead", value: "LEAD" as const },
  { label: "Contacted", value: "CONTACTED" as const },
  { label: "Nurturing", value: "NURTURING" as const },
  { label: "Ready", value: "READY" as const },
  { label: "Lost", value: "LOST" as const },
] as const;

export function parseSegmentFromSearchParams(sp: URLSearchParams): {
  status: ContactSegmentStatusTab;
  tagId: string | null;
} {
  return {
    status: parseStatusTabFromSearchParams(sp),
    tagId: parseTagIdFromSearchParams(sp),
  };
}

export function parseStatusTabFromSearchParams(
  sp: URLSearchParams
): ContactSegmentStatusTab {
  const v = normalizeQueryableStatusParam(sp.get("status"));
  return v ?? "__all__";
}

export function parseTagIdFromSearchParams(sp: URLSearchParams): string | null {
  return normalizeSavedTagIdValue(sp.get("tagId"));
}

/** FarmTrackr → ClientKeep deep link: filter contacts by active farm membership. */
export type ContactsFarmScopeInput = {
  farmAreaId: string | null;
  farmTerritoryId: string | null;
};

export function parseContactsFarmScopeFromSearchParams(
  sp: URLSearchParams
): ContactsFarmScopeInput {
  return {
    farmAreaId: normalizeSavedTagIdValue(sp.get("farmAreaId")),
    farmTerritoryId: normalizeSavedTagIdValue(sp.get("farmTerritoryId")),
  };
}

/** FarmTrackr health cleanup slice for ClientKeep contacts list (`missing`, `readyToPromote`, `farmHealthScope`). */
export type ContactsHealthMissing = "email" | "phone" | "mailing" | "site";

export type ContactsHealthQuery = {
  missing: ContactsHealthMissing | null;
  readyToPromote: boolean;
  /** All farm memberships for this structure visibility (only when no farmAreaId / farmTerritoryId). */
  farmHealthScope: FarmStructureVisibility | null;
};

export const DEFAULT_CONTACTS_HEALTH_QUERY: ContactsHealthQuery = {
  missing: null,
  readyToPromote: false,
  farmHealthScope: null,
};

export function parseContactsHealthQueryFromSearchParams(
  sp: URLSearchParams
): ContactsHealthQuery {
  const missingRaw = sp.get("missing")?.trim().toLowerCase() ?? "";
  const missing: ContactsHealthMissing | null =
    missingRaw === "email" ||
    missingRaw === "phone" ||
    missingRaw === "mailing" ||
    missingRaw === "site"
      ? (missingRaw as ContactsHealthMissing)
      : null;
  const readyToPromote =
    sp.get("readyToPromote") === "1" ||
    sp.get("readyToPromote")?.toLowerCase() === "true";
  const areaId = normalizeSavedTagIdValue(sp.get("farmAreaId"));
  const terrId = normalizeSavedTagIdValue(sp.get("farmTerritoryId"));
  const scopeRaw = sp.get("farmHealthScope");
  const farmHealthScope =
    areaId || terrId
      ? null
      : scopeRaw != null && scopeRaw.trim() !== ""
        ? parseFarmStructureVisibility(scopeRaw)
        : null;
  return { missing, readyToPromote, farmHealthScope };
}

function appendFarmScopeToSearchParams(
  params: URLSearchParams,
  farmScope: ContactsFarmScopeInput
): void {
  if (farmScope.farmAreaId) {
    params.set("farmAreaId", farmScope.farmAreaId);
    return;
  }
  if (farmScope.farmTerritoryId) {
    params.set("farmTerritoryId", farmScope.farmTerritoryId);
  }
}

function appendHealthQueryToSearchParams(
  params: URLSearchParams,
  health: ContactsHealthQuery,
  farmScope: ContactsFarmScopeInput
): void {
  if (health.missing) params.set("missing", health.missing);
  if (health.readyToPromote) params.set("readyToPromote", "1");
  if (!farmScope.farmAreaId && !farmScope.farmTerritoryId && health.farmHealthScope) {
    params.set("farmHealthScope", health.farmHealthScope);
  }
}

/** `followUp=needs` — contacts with at least one pending CRM reminder for the current user. */
export function parseFollowUpNeedsFromSearchParams(
  sp: URLSearchParams
): boolean {
  return sp.get("followUp") === "needs";
}

/**
 * Contacts list ordering: `followups` (default) = overdue then upcoming then none;
 * `recent` = creation time only (legacy).
 */
export type ContactsListSortMode = "followups" | "recent";

export function parseContactsListSortFromSearchParams(
  sp: URLSearchParams
): ContactsListSortMode {
  return sp.get("sort") === "recent" ? "recent" : "followups";
}

/** Path for Next.js router / Link (same as historical buildContactsPageHref). */
export function segmentToHref(
  status: ContactSegmentStatusTab,
  tagId: string | null,
  needsFollowUp = false,
  sortMode: ContactsListSortMode = "followups",
  farmScope: ContactsFarmScopeInput = {
    farmAreaId: null,
    farmTerritoryId: null,
  },
  health: ContactsHealthQuery = DEFAULT_CONTACTS_HEALTH_QUERY
): string {
  const params = new URLSearchParams();
  if (status !== "__all__") params.set("status", status);
  if (tagId) params.set("tagId", tagId);
  if (needsFollowUp) params.set("followUp", "needs");
  if (sortMode === "recent") params.set("sort", "recent");
  appendFarmScopeToSearchParams(params, farmScope);
  appendHealthQueryToSearchParams(params, health, farmScope);
  const q = params.toString();
  return q ? `/contacts/all?${q}` : "/contacts/all";
}

export function buildContactsApiUrl(
  status: ContactSegmentStatusTab,
  tagId: string | null,
  needsFollowUp = false,
  sortMode: ContactsListSortMode = "followups",
  farmScope: ContactsFarmScopeInput = {
    farmAreaId: null,
    farmTerritoryId: null,
  },
  health: ContactsHealthQuery = DEFAULT_CONTACTS_HEALTH_QUERY
): string {
  const params = new URLSearchParams();
  if (status !== "__all__") params.set("status", status);
  if (tagId) params.set("tagId", tagId);
  if (needsFollowUp) params.set("followUp", "needs");
  if (sortMode === "recent") params.set("sort", "recent");
  appendFarmScopeToSearchParams(params, farmScope);
  appendHealthQueryToSearchParams(params, health, farmScope);
  const q = params.toString();
  return q ? `/api/v1/contacts?${q}` : "/api/v1/contacts";
}

/** Saved segment storage: null/omit status means "all statuses". */
export function savedStatusToTab(
  status: string | null | undefined
): ContactSegmentStatusTab {
  const v = normalizeQueryableStatusParam(
    typeof status === "string" ? status : null
  );
  return v ?? "__all__";
}

export function tabToSavedStatus(
  status: ContactSegmentStatusTab
): string | null {
  return status === "__all__" ? null : status;
}

/** True when URL encodes at least one server-side list filter (save-worthy). */
export function hasSegmentFiltersInSearchParams(sp: URLSearchParams): boolean {
  const { status, tagId } = parseSegmentFromSearchParams(sp);
  const h = parseContactsHealthQueryFromSearchParams(sp);
  return (
    status !== "__all__" ||
    tagId !== null ||
    parseFollowUpNeedsFromSearchParams(sp) ||
    h.missing !== null ||
    h.readyToPromote ||
    h.farmHealthScope !== null
  );
}

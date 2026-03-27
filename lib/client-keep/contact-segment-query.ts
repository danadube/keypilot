/**
 * Canonical contact segment query grammar for /contacts and GET /api/v1/contacts.
 * Single source of truth for URL-driven filters (status + tagId only).
 */

/** Values accepted by GET /api/v1/contacts?status= */
export const CONTACT_SEGMENT_STATUS_VALUES = [
  "LEAD",
  "CONTACTED",
  "NURTURING",
  "READY",
  "LOST",
] as const;

export type ContactSegmentStatus =
  (typeof CONTACT_SEGMENT_STATUS_VALUES)[number];

const STATUS_QUERY_SET = new Set<string>(CONTACT_SEGMENT_STATUS_VALUES);

/** Tab state: explicit "all" vs a single CRM status */
export type ContactSegmentStatusTab = ContactSegmentStatus | "__all__";

export const STATUS_TAB_VALUES = [
  { label: "All", value: "__all__" as const },
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
  const raw = sp.get("status")?.toUpperCase();
  if (raw && STATUS_QUERY_SET.has(raw)) {
    return raw as ContactSegmentStatus;
  }
  return "__all__";
}

export function parseTagIdFromSearchParams(sp: URLSearchParams): string | null {
  const tid = sp.get("tagId")?.trim();
  return tid || null;
}

/** Path for Next.js router / Link (same as historical buildContactsPageHref). */
export function segmentToHref(
  status: ContactSegmentStatusTab,
  tagId: string | null
): string {
  const params = new URLSearchParams();
  if (status !== "__all__") params.set("status", status);
  if (tagId) params.set("tagId", tagId);
  const q = params.toString();
  return q ? `/contacts?${q}` : "/contacts";
}

export function buildContactsApiUrl(
  status: ContactSegmentStatusTab,
  tagId: string | null
): string {
  const params = new URLSearchParams();
  if (status !== "__all__") params.set("status", status);
  if (tagId) params.set("tagId", tagId);
  const q = params.toString();
  return q ? `/api/v1/contacts?${q}` : "/api/v1/contacts";
}

/** Saved segment storage: null/omit status means "all statuses". */
export function savedStatusToTab(
  status: string | null | undefined
): ContactSegmentStatusTab {
  if (!status) return "__all__";
  const u = status.toUpperCase();
  return STATUS_QUERY_SET.has(u) ? (u as ContactSegmentStatus) : "__all__";
}

export function tabToSavedStatus(
  status: ContactSegmentStatusTab
): string | null {
  return status === "__all__" ? null : status;
}

/** True when URL encodes at least one server-side list filter (save-worthy). */
export function hasSegmentFiltersInSearchParams(sp: URLSearchParams): boolean {
  const { status, tagId } = parseSegmentFromSearchParams(sp);
  return status !== "__all__" || tagId !== null;
}

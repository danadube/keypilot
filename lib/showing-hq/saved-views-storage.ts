/**
 * Browser-only ShowingHQ saved views (v1). Single key per playbook; surface field
 * discriminates. Per-surface add helpers; load tolerates corrupt rows.
 */

import { normalizeShowingHqListSearchQ } from "./list-search-q";
import {
  normalizeShowingsSourceParam,
  type NormalizedShowingsListView,
  showingsListViewFingerprint,
} from "./showings-view-query";
import {
  normalizeOpenHouseListStatusParam,
  openHousesListViewFingerprint,
  type NormalizedOpenHousesListView,
} from "./open-houses-view-query";
import {
  normalizeVisitorsOpenHouseId,
  normalizeVisitorsSortParam,
  type VisitorsSort,
  visitorsViewFingerprint,
} from "./visitors-view-query";

export const SHOWINGHQ_SAVED_VIEWS_STORAGE_KEY = "kp_showinghq_saved_views_v1";

export const MAX_SHOWINGHQ_SAVED_VIEWS = 50;

export const MAX_SHOWINGHQ_SAVED_VIEW_NAME_LENGTH = 80;

export type ShowingHqSavedViewSurface = "SHOWINGS" | "VISITORS" | "OPEN_HOUSES";

export type ShowingHqSavedViewRecord = {
  id: string;
  name: string;
  surface: ShowingHqSavedViewSurface;
  source?: string | null;
  feedbackOnly?: boolean | null;
  buyerAgentDraftReview?: boolean | null;
  openShowing?: string | null;
  openHouseId?: string | null;
  sort?: string | null;
  status?: string | null;
  /** Canonical list search (Visitors + Showings v1). */
  q?: string | null;
};

export type AddShowingHqSavedViewResult =
  | { ok: true; record: ShowingHqSavedViewRecord }
  | { ok: false; reason: "duplicate" | "empty_name" | "limit" };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isSurface(s: unknown): s is ShowingHqSavedViewSurface {
  return s === "SHOWINGS" || s === "VISITORS" || s === "OPEN_HOUSES";
}

function normalizedVisitorsFields(
  openHouseId: unknown,
  sort: unknown,
  q: unknown
): {
  openHouseId: string | null;
  sort: VisitorsSort;
  q: string | null;
} {
  return {
    openHouseId: normalizeVisitorsOpenHouseId(
      typeof openHouseId === "string" ? openHouseId : null
    ),
    sort: normalizeVisitorsSortParam(typeof sort === "string" ? sort : null),
    q: normalizeShowingHqListSearchQ(
      typeof q === "string" ? q : null
    ),
  };
}

function normalizedShowingsListFields(
  source: unknown,
  feedbackOnly: unknown,
  buyerAgentDraftReview: unknown,
  q: unknown
): NormalizedShowingsListView {
  const src = normalizeShowingsSourceParam(
    typeof source === "string" ? source : null
  );
  const fb = feedbackOnly === true;
  const draftRev = buyerAgentDraftReview === true;
  const qn = normalizeShowingHqListSearchQ(
    typeof q === "string" ? q : null
  );
  return { source: src, feedbackOnly: fb, buyerAgentDraftReview: draftRev, q: qn };
}

function visitorsFingerprintFromRecord(
  rec: ShowingHqSavedViewRecord
): string | null {
  if (rec.surface !== "VISITORS") return null;
  const { openHouseId, sort, q } = normalizedVisitorsFields(
    rec.openHouseId,
    rec.sort,
    rec.q
  );
  return visitorsViewFingerprint({ openHouseId, sort, q });
}

function showingsFingerprintFromRecord(
  rec: ShowingHqSavedViewRecord
): string | null {
  if (rec.surface !== "SHOWINGS") return null;
  const view = normalizedShowingsListFields(
    rec.source,
    rec.feedbackOnly,
    rec.buyerAgentDraftReview,
    rec.q
  );
  return showingsListViewFingerprint(view);
}

function normalizedOpenHousesListFields(
  status: unknown,
  q: unknown
): NormalizedOpenHousesListView {
  return {
    status: normalizeOpenHouseListStatusParam(
      typeof status === "string" ? status : null
    ),
    q: normalizeShowingHqListSearchQ(typeof q === "string" ? q : null),
  };
}

function openHousesFingerprintFromRecord(
  rec: ShowingHqSavedViewRecord
): string | null {
  if (rec.surface !== "OPEN_HOUSES") return null;
  const v = normalizedOpenHousesListFields(rec.status, rec.q);
  return openHousesListViewFingerprint(v);
}

function normalizeRecord(raw: unknown): ShowingHqSavedViewRecord | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!id || !name) return null;
  if (!isSurface(raw.surface)) return null;

  const nameSlice = name.slice(0, MAX_SHOWINGHQ_SAVED_VIEW_NAME_LENGTH);

  if (raw.surface === "VISITORS") {
    const { openHouseId, sort, q } = normalizedVisitorsFields(
      raw.openHouseId,
      raw.sort,
      raw.q
    );
    return {
      id,
      name: nameSlice,
      surface: "VISITORS",
      openHouseId,
      sort,
      q,
    };
  }

  if (raw.surface === "SHOWINGS") {
    const v = normalizedShowingsListFields(
      raw.source,
      raw.feedbackOnly,
      raw.buyerAgentDraftReview,
      raw.q
    );
    return {
      id,
      name: nameSlice,
      surface: "SHOWINGS",
      source: v.source,
      feedbackOnly: v.feedbackOnly ? true : null,
      buyerAgentDraftReview: v.buyerAgentDraftReview ? true : null,
      q: v.q,
    };
  }

  if (raw.surface === "OPEN_HOUSES") {
    const v = normalizedOpenHousesListFields(raw.status, raw.q);
    return {
      id,
      name: nameSlice,
      surface: "OPEN_HOUSES",
      status: v.status,
      q: v.q,
    };
  }

  return null;
}

export function loadSavedViews(): ShowingHqSavedViewRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SHOWINGHQ_SAVED_VIEWS_STORAGE_KEY);
    if (!raw || raw.trim() === "") return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: ShowingHqSavedViewRecord[] = [];
    for (const item of parsed) {
      const rec = normalizeRecord(item);
      if (rec) out.push(rec);
    }
    return out.slice(0, MAX_SHOWINGHQ_SAVED_VIEWS);
  } catch {
    return [];
  }
}

export function persistSavedViews(views: ShowingHqSavedViewRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = views.slice(0, MAX_SHOWINGHQ_SAVED_VIEWS);
    window.localStorage.setItem(
      SHOWINGHQ_SAVED_VIEWS_STORAGE_KEY,
      JSON.stringify(trimmed)
    );
  } catch {
    /* quota / private mode */
  }
}

function newRecordId(explicit?: string): string {
  return (
    explicit?.trim() ||
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`)
  );
}

/** Add a VISITORS saved view; filters normalized; includes canonical `q`. */
export function addSavedVisitorsView(
  rec: Omit<ShowingHqSavedViewRecord, "id" | "surface"> & {
    id?: string;
    surface?: ShowingHqSavedViewSurface;
  }
): AddShowingHqSavedViewResult {
  const name = rec.name.trim().slice(0, MAX_SHOWINGHQ_SAVED_VIEW_NAME_LENGTH);
  if (!name) return { ok: false, reason: "empty_name" };

  const { openHouseId, sort, q } = normalizedVisitorsFields(
    rec.openHouseId,
    rec.sort,
    rec.q
  );
  const nextPartial: ShowingHqSavedViewRecord = {
    id: "",
    name,
    surface: "VISITORS",
    openHouseId,
    sort,
    q,
  };
  const fpNew = visitorsViewFingerprint({ openHouseId, sort, q });

  const list = loadSavedViews();
  if (list.length >= MAX_SHOWINGHQ_SAVED_VIEWS) {
    return { ok: false, reason: "limit" };
  }

  if (
    list.some((row) => {
      if (row.surface !== "VISITORS") return false;
      return visitorsFingerprintFromRecord(row) === fpNew;
    })
  ) {
    return { ok: false, reason: "duplicate" };
  }

  const next: ShowingHqSavedViewRecord = {
    ...nextPartial,
    id: newRecordId(rec.id),
  };
  persistSavedViews([...list, next]);
  return { ok: true, record: next };
}

/** Add SHOWINGS saved view — source, feedbackOnly, and canonical `q`. */
export function addSavedShowingsView(
  rec: Omit<ShowingHqSavedViewRecord, "id" | "surface"> & {
    id?: string;
    surface?: ShowingHqSavedViewSurface;
  }
): AddShowingHqSavedViewResult {
  const name = rec.name.trim().slice(0, MAX_SHOWINGHQ_SAVED_VIEW_NAME_LENGTH);
  if (!name) return { ok: false, reason: "empty_name" };

  const view = normalizedShowingsListFields(
    rec.source,
    rec.feedbackOnly,
    rec.buyerAgentDraftReview,
    rec.q
  );
  const nextPartial: ShowingHqSavedViewRecord = {
    id: "",
    name,
    surface: "SHOWINGS",
    source: view.source,
    feedbackOnly: view.feedbackOnly ? true : null,
    buyerAgentDraftReview: view.buyerAgentDraftReview ? true : null,
    q: view.q,
  };
  const fpNew = showingsListViewFingerprint(view);

  const list = loadSavedViews();
  if (list.length >= MAX_SHOWINGHQ_SAVED_VIEWS) {
    return { ok: false, reason: "limit" };
  }

  if (
    list.some((row) => {
      if (row.surface !== "SHOWINGS") return false;
      return showingsFingerprintFromRecord(row) === fpNew;
    })
  ) {
    return { ok: false, reason: "duplicate" };
  }

  const next: ShowingHqSavedViewRecord = {
    ...nextPartial,
    id: newRecordId(rec.id),
  };
  persistSavedViews([...list, next]);
  return { ok: true, record: next };
}

/** Add OPEN_HOUSES saved view — `status` (URL slice) and canonical `q`. */
export function addSavedOpenHousesView(
  rec: Omit<ShowingHqSavedViewRecord, "id" | "surface"> & {
    id?: string;
    surface?: ShowingHqSavedViewSurface;
  }
): AddShowingHqSavedViewResult {
  const name = rec.name.trim().slice(0, MAX_SHOWINGHQ_SAVED_VIEW_NAME_LENGTH);
  if (!name) return { ok: false, reason: "empty_name" };

  const view = normalizedOpenHousesListFields(rec.status, rec.q);
  const nextPartial: ShowingHqSavedViewRecord = {
    id: "",
    name,
    surface: "OPEN_HOUSES",
    status: view.status,
    q: view.q,
  };
  const fpNew = openHousesListViewFingerprint(view);

  const list = loadSavedViews();
  if (list.length >= MAX_SHOWINGHQ_SAVED_VIEWS) {
    return { ok: false, reason: "limit" };
  }

  if (
    list.some((row) => {
      if (row.surface !== "OPEN_HOUSES") return false;
      return openHousesFingerprintFromRecord(row) === fpNew;
    })
  ) {
    return { ok: false, reason: "duplicate" };
  }

  const next: ShowingHqSavedViewRecord = {
    ...nextPartial,
    id: newRecordId(rec.id),
  };
  persistSavedViews([...list, next]);
  return { ok: true, record: next };
}

export function renameSavedView(id: string, name: string): boolean {
  const trimmed = name.trim().slice(0, MAX_SHOWINGHQ_SAVED_VIEW_NAME_LENGTH);
  if (!trimmed) return false;
  const list = loadSavedViews();
  persistSavedViews(
    list.map((s) => (s.id === id ? { ...s, name: trimmed } : s))
  );
  return true;
}

export function deleteSavedView(id: string): void {
  const list = loadSavedViews();
  persistSavedViews(list.filter((s) => s.id !== id));
}

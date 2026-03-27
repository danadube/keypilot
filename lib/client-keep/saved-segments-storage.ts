/**
 * Browser-only persistence for named contact segments (no API).
 */

import {
  normalizeQueryableStatusParam,
  normalizeSavedTagIdValue,
} from "./contact-segment-query";

export const SAVED_SEGMENTS_STORAGE_KEY = "kp_clientkeep_saved_segments_v1";

export const MAX_SAVED_SEGMENTS = 50;

export const MAX_SAVED_SEGMENT_NAME_LENGTH = 80;

export type SavedSegmentRecord = {
  id: string;
  name: string;
  status?: string | null;
  tagId?: string | null;
};

export type AddSavedSegmentResult =
  | { ok: true; record: SavedSegmentRecord }
  | { ok: false; reason: "duplicate" | "empty_name" | "limit" };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Canonical filter pair for duplicate detection (normalized). */
export function normalizedSegmentFilters(
  status: string | null | undefined,
  tagId: string | null | undefined
): { status: string | null; tagId: string | null } {
  const s =
    status === null || status === undefined
      ? null
      : normalizeQueryableStatusParam(status);
  const t =
    tagId === null || tagId === undefined
      ? null
      : normalizeSavedTagIdValue(tagId);
  return { status: s, tagId: t };
}

function segmentFilterFingerprint(
  status: string | null | undefined,
  tagId: string | null | undefined
): string {
  const { status: s, tagId: t } = normalizedSegmentFilters(status, tagId);
  return JSON.stringify({ s, t });
}

function normalizeRecord(raw: unknown): SavedSegmentRecord | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!id || !name) return null;
  const rawStatus =
    raw.status === null || raw.status === undefined
      ? null
      : typeof raw.status === "string"
        ? raw.status
        : null;
  const rawTagId =
    raw.tagId === null || raw.tagId === undefined
      ? null
      : typeof raw.tagId === "string"
        ? raw.tagId
        : null;
  const { status, tagId } = normalizedSegmentFilters(rawStatus, rawTagId);
  return {
    id,
    name: name.slice(0, MAX_SAVED_SEGMENT_NAME_LENGTH),
    status,
    tagId,
  };
}

export function loadSavedSegments(): SavedSegmentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_SEGMENTS_STORAGE_KEY);
    if (!raw || raw.trim() === "") return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: SavedSegmentRecord[] = [];
    for (const item of parsed) {
      const rec = normalizeRecord(item);
      if (rec) out.push(rec);
    }
    return out.slice(0, MAX_SAVED_SEGMENTS);
  } catch {
    /* malformed JSON or unexpected payload */
    return [];
  }
}

export function persistSavedSegments(segments: SavedSegmentRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = segments.slice(0, MAX_SAVED_SEGMENTS);
    window.localStorage.setItem(
      SAVED_SEGMENTS_STORAGE_KEY,
      JSON.stringify(trimmed)
    );
  } catch {
    /* quota / private mode / stringify edge cases */
  }
}

export function addSavedSegment(
  rec: Omit<SavedSegmentRecord, "id"> & { id?: string }
): AddSavedSegmentResult {
  const name = rec.name.trim().slice(0, MAX_SAVED_SEGMENT_NAME_LENGTH);
  if (!name) return { ok: false, reason: "empty_name" };

  const list = loadSavedSegments();
  if (list.length >= MAX_SAVED_SEGMENTS) {
    return { ok: false, reason: "limit" };
  }

  const { status: normStatus, tagId: normTagId } = normalizedSegmentFilters(
    rec.status,
    rec.tagId
  );
  const newKey = segmentFilterFingerprint(normStatus, normTagId);
  if (
    list.some(
      (s) =>
        segmentFilterFingerprint(s.status, s.tagId) === newKey
    )
  ) {
    return { ok: false, reason: "duplicate" };
  }

  const id =
    rec.id?.trim() ||
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`);

  const next: SavedSegmentRecord = {
    id,
    name,
    status: normStatus,
    tagId: normTagId,
  };
  persistSavedSegments([...list, next]);
  return { ok: true, record: next };
}

export function renameSavedSegment(id: string, name: string): boolean {
  const trimmed = name.trim().slice(0, MAX_SAVED_SEGMENT_NAME_LENGTH);
  if (!trimmed) return false;
  const list = loadSavedSegments();
  persistSavedSegments(
    list.map((s) => (s.id === id ? { ...s, name: trimmed } : s))
  );
  return true;
}

export function deleteSavedSegment(id: string): void {
  const list = loadSavedSegments();
  persistSavedSegments(list.filter((s) => s.id !== id));
}

/**
 * Browser-only persistence for named contact segments (no API).
 */

export const SAVED_SEGMENTS_STORAGE_KEY = "kp_clientkeep_saved_segments_v1";

export const MAX_SAVED_SEGMENTS = 50;

export const MAX_SAVED_SEGMENT_NAME_LENGTH = 80;

export type SavedSegmentRecord = {
  id: string;
  name: string;
  status?: string | null;
  tagId?: string | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeRecord(raw: unknown): SavedSegmentRecord | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!id || !name) return null;
  const status =
    raw.status === null || raw.status === undefined
      ? null
      : typeof raw.status === "string"
        ? raw.status.trim() || null
        : null;
  const tagId =
    raw.tagId === null || raw.tagId === undefined
      ? null
      : typeof raw.tagId === "string"
        ? raw.tagId.trim() || null
        : null;
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
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: SavedSegmentRecord[] = [];
    for (const item of parsed) {
      const rec = normalizeRecord(item);
      if (rec) out.push(rec);
    }
    return out.slice(0, MAX_SAVED_SEGMENTS);
  } catch {
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
    /* quota / private mode */
  }
}

export function addSavedSegment(
  rec: Omit<SavedSegmentRecord, "id"> & { id?: string }
): SavedSegmentRecord | null {
  const list = loadSavedSegments();
  if (list.length >= MAX_SAVED_SEGMENTS) return null;
  const name = rec.name.trim().slice(0, MAX_SAVED_SEGMENT_NAME_LENGTH);
  if (!name) return null;
  const id =
    rec.id?.trim() ||
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`);
  const next: SavedSegmentRecord = {
    id,
    name,
    status: rec.status ?? null,
    tagId: rec.tagId ?? null,
  };
  persistSavedSegments([...list, next]);
  return next;
}

export function renameSavedSegment(id: string, name: string): void {
  const trimmed = name.trim().slice(0, MAX_SAVED_SEGMENT_NAME_LENGTH);
  if (!trimmed) return;
  const list = loadSavedSegments();
  persistSavedSegments(
    list.map((s) => (s.id === id ? { ...s, name: trimmed } : s))
  );
}

export function deleteSavedSegment(id: string): void {
  const list = loadSavedSegments();
  persistSavedSegments(list.filter((s) => s.id !== id));
}

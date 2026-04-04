/**
 * Browser-only named shortcuts for FarmTrackr Lists (territory or farm area scope).
 * Same discipline as ClientKeep saved segments / ShowingHQ saved views v1.
 */

export const FARMTRACKR_SAVED_LIST_SCOPES_KEY = "kp_farmtrackr_saved_list_scopes_v1";

export const MAX_SAVED_LIST_SCOPES = 30;

export const MAX_SAVED_LIST_SCOPE_NAME_LENGTH = 80;

export type SavedListScopeKind = "territory" | "farm_area";

export type SavedListScopeRecord = {
  id: string;
  name: string;
  kind: SavedListScopeKind;
  /** Set when kind === "territory" */
  territoryId: string | null;
  /** Set when kind === "farm_area" */
  farmAreaId: string | null;
  /** Stable display line, e.g. "Territory · Eastside" or "Area · A1 · Eastside" */
  label: string;
};

export type AddSavedListScopeResult =
  | { ok: true; record: SavedListScopeRecord }
  | {
      ok: false;
      reason: "duplicate" | "empty_name" | "limit" | "invalid_scope";
    };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function scopeFingerprint(rec: {
  kind: SavedListScopeKind;
  territoryId: string | null;
  farmAreaId: string | null;
}): string {
  return `${rec.kind}:${rec.territoryId ?? ""}:${rec.farmAreaId ?? ""}`;
}

function normalizeRecord(raw: unknown): SavedListScopeRecord | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const kind =
    raw.kind === "territory" || raw.kind === "farm_area" ? raw.kind : null;
  const territoryId =
    raw.territoryId === null || raw.territoryId === undefined
      ? null
      : typeof raw.territoryId === "string"
        ? raw.territoryId.trim()
        : null;
  const farmAreaId =
    raw.farmAreaId === null || raw.farmAreaId === undefined
      ? null
      : typeof raw.farmAreaId === "string"
        ? raw.farmAreaId.trim()
        : null;
  const label =
    typeof raw.label === "string" && raw.label.trim().length > 0
      ? raw.label.trim().slice(0, 200)
      : name.slice(0, 200);
  if (!id || !name || !kind) return null;
  if (kind === "territory" && (!territoryId || farmAreaId)) return null;
  if (kind === "farm_area" && !farmAreaId) return null;
  return {
    id,
    name: name.slice(0, MAX_SAVED_LIST_SCOPE_NAME_LENGTH),
    kind,
    territoryId,
    farmAreaId,
    label,
  };
}

export function loadSavedListScopes(): SavedListScopeRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FARMTRACKR_SAVED_LIST_SCOPES_KEY);
    if (!raw || raw.trim() === "") return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: SavedListScopeRecord[] = [];
    for (const item of parsed) {
      const rec = normalizeRecord(item);
      if (rec) out.push(rec);
    }
    return out.slice(0, MAX_SAVED_LIST_SCOPES);
  } catch {
    return [];
  }
}

export function persistSavedListScopes(rows: SavedListScopeRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = rows.slice(0, MAX_SAVED_LIST_SCOPES);
    window.localStorage.setItem(
      FARMTRACKR_SAVED_LIST_SCOPES_KEY,
      JSON.stringify(trimmed)
    );
  } catch {
    /* quota / private mode */
  }
}

export function deleteSavedListScopeById(id: string): void {
  const list = loadSavedListScopes().filter((r) => r.id !== id);
  persistSavedListScopes(list);
}

export function addSavedListScope(
  rec: Omit<SavedListScopeRecord, "id"> & { id?: string }
): AddSavedListScopeResult {
  const name = rec.name.trim().slice(0, MAX_SAVED_LIST_SCOPE_NAME_LENGTH);
  if (!name) return { ok: false, reason: "empty_name" };

  if (rec.kind === "territory") {
    if (!rec.territoryId?.trim() || rec.farmAreaId) {
      return { ok: false, reason: "invalid_scope" };
    }
  } else {
    if (!rec.farmAreaId?.trim()) {
      return { ok: false, reason: "invalid_scope" };
    }
  }

  const list = loadSavedListScopes();
  if (list.length >= MAX_SAVED_LIST_SCOPES) {
    return { ok: false, reason: "limit" };
  }

  const next: SavedListScopeRecord = {
    id:
      rec.id?.trim() ||
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    name,
    kind: rec.kind,
    territoryId: rec.kind === "territory" ? rec.territoryId!.trim() : null,
    farmAreaId: rec.kind === "farm_area" ? rec.farmAreaId!.trim() : null,
    label: rec.label.trim().slice(0, 200) || name,
  };

  const fp = scopeFingerprint(next);
  if (list.some((r) => scopeFingerprint(r) === fp)) {
    return { ok: false, reason: "duplicate" };
  }

  persistSavedListScopes([...list, next]);
  return { ok: true, record: next };
}

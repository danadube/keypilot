/**
 * Browser-only TaskPilot saved work views (v1). Stores named filter presets as query strings.
 */

export const TASKPILOT_SAVED_VIEWS_STORAGE_KEY = "kp_taskpilot_saved_views_v1";

export const MAX_TASKPILOT_SAVED_VIEWS = 30;

export const MAX_TASKPILOT_SAVED_VIEW_NAME_LENGTH = 64;

export type TaskPilotSavedViewRecord = {
  id: string;
  name: string;
  /** Query string without leading ? */
  query: string;
};

export type AddTaskPilotSavedViewResult =
  | { ok: true; record: TaskPilotSavedViewRecord }
  | { ok: false; reason: "duplicate" | "empty_name" | "limit" };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeQuery(q: string): string {
  const trimmed = q.trim().replace(/^\?/, "");
  const params = new URLSearchParams(trimmed);
  params.sort();
  return params.toString();
}

export function loadTaskPilotSavedViews(): TaskPilotSavedViewRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TASKPILOT_SAVED_VIEWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: TaskPilotSavedViewRecord[] = [];
    for (const row of parsed) {
      if (!isRecord(row)) continue;
      const id = typeof row.id === "string" ? row.id : "";
      const name = typeof row.name === "string" ? row.name.trim() : "";
      const query = typeof row.query === "string" ? row.query.trim().replace(/^\?/, "") : "";
      if (!id || !name || !query) continue;
      if (name.length > MAX_TASKPILOT_SAVED_VIEW_NAME_LENGTH) continue;
      out.push({ id, name, query });
    }
    return out;
  } catch {
    return [];
  }
}

function persist(views: TaskPilotSavedViewRecord[]) {
  window.localStorage.setItem(TASKPILOT_SAVED_VIEWS_STORAGE_KEY, JSON.stringify(views));
}

export function addTaskPilotSavedView(name: string, query: string): AddTaskPilotSavedViewResult {
  const trimmedName = name.trim();
  if (!trimmedName) return { ok: false, reason: "empty_name" };
  if (trimmedName.length > MAX_TASKPILOT_SAVED_VIEW_NAME_LENGTH) {
    return { ok: false, reason: "empty_name" };
  }
  const qNorm = normalizeQuery(query);
  if (!qNorm) return { ok: false, reason: "empty_name" };

  const existing = loadTaskPilotSavedViews();
  if (existing.some((v) => normalizeQuery(v.query) === qNorm)) {
    return { ok: false, reason: "duplicate" };
  }
  if (existing.length >= MAX_TASKPILOT_SAVED_VIEWS) {
    return { ok: false, reason: "limit" };
  }

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `tp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const record: TaskPilotSavedViewRecord = {
    id,
    name: trimmedName,
    query: qNorm,
  };
  persist([...existing, record]);
  return { ok: true, record };
}

export function removeTaskPilotSavedView(id: string) {
  const existing = loadTaskPilotSavedViews();
  persist(existing.filter((v) => v.id !== id));
}

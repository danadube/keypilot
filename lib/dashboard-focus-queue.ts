/**
 * Client-only Focus queue for /dashboard. Persisted in localStorage.
 */

export type FocusItemType = "followups" | "showings" | "contacts" | "pipeline";

export type FocusPersistedItem = {
  id: string;
  type: FocusItemType;
  label: string;
  count?: number;
  dismissed?: boolean;
  completed?: boolean;
  /** Count when user hid the item; show again when candidate count differs */
  frozenCount?: number;
  /** Pipeline only: metrics when user hid; show again when any differ */
  frozenSignals?: { overdue: number; showings: number; contacts: number };
};

export type FocusPersistedState = {
  items: FocusPersistedItem[];
};

export type FocusDisplayItem = {
  id: string;
  type: FocusItemType;
  label: string;
  count?: number;
  subtext?: string;
  href: string;
};

export const FOCUS_STORAGE_KEY = "kp_focus_state_v1";

export type FocusSignals = {
  overdue: number;
  showings: number;
  contacts: number;
};

export function loadFocusState(): FocusPersistedState {
  if (typeof window === "undefined") return { items: [] };
  try {
    const raw = localStorage.getItem(FOCUS_STORAGE_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as FocusPersistedState).items)) {
      return { items: [] };
    }
    return { items: (parsed as FocusPersistedState).items };
  } catch {
    return { items: [] };
  }
}

export function saveFocusState(state: FocusPersistedState): void {
  try {
    localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}

export function buildFocusCandidates(input: {
  loading: boolean;
  overdueFollowUpCount: number;
  showingsToday: number;
  contactsAttention: number;
}): FocusDisplayItem[] | null {
  if (input.loading) return null;
  const out: FocusDisplayItem[] = [];
  if (input.overdueFollowUpCount > 0) {
    out.push({
      id: "followups",
      type: "followups",
      label: `${input.overdueFollowUpCount} overdue follow-up${input.overdueFollowUpCount === 1 ? "" : "s"}`,
      count: input.overdueFollowUpCount,
      subtext: "Work the ShowingHQ queue",
      href: "/showing-hq/follow-ups",
    });
  }
  if (input.showingsToday > 0) {
    out.push({
      id: "showings",
      type: "showings",
      label: `${input.showingsToday} showing${input.showingsToday === 1 ? "" : "s"} today`,
      count: input.showingsToday,
      subtext: "Today’s schedule",
      href: "/showing-hq/showings",
    });
  }
  if (input.contactsAttention > 0) {
    out.push({
      id: "contacts",
      type: "contacts",
      label: `${input.contactsAttention} contact${input.contactsAttention === 1 ? "" : "s"} need follow-up`,
      count: input.contactsAttention,
      subtext: "ClientKeep / contacts",
      href: "/contacts",
    });
  }
  if (out.length === 0) {
    out.push({
      id: "pipeline",
      type: "pipeline",
      label: "Review pipeline",
      subtext: "Nothing urgent — plan ahead",
      href: "/transactions/pipeline",
    });
  }
  return out.slice(0, 3);
}

function findEntry(items: FocusPersistedItem[], id: string): FocusPersistedItem | undefined {
  return items.find((i) => i.id === id);
}

export function shouldShowFocusItem(
  candidate: FocusDisplayItem,
  entry: FocusPersistedItem | undefined,
  signals: FocusSignals
): boolean {
  if (!entry || (!entry.dismissed && !entry.completed)) return true;
  if (candidate.type === "pipeline") {
    const f = entry.frozenSignals;
    if (!f) return true;
    return (
      f.overdue !== signals.overdue ||
      f.showings !== signals.showings ||
      f.contacts !== signals.contacts
    );
  }
  const n = candidate.count ?? 0;
  return entry.frozenCount !== n;
}

/** Drop stored rows for ids not in current candidates; clear hide flags when metrics invalidate hide. */
export function reconcileFocusStorage(
  candidates: FocusDisplayItem[],
  items: FocusPersistedItem[],
  signals: FocusSignals
): FocusPersistedItem[] {
  const allowed = new Set(candidates.map((c) => c.id));
  let next = items.filter((i) => allowed.has(i.id));
  for (const c of candidates) {
    const e = findEntry(next, c.id);
    if (!e) continue;
    if (shouldShowFocusItem(c, e, signals) && (e.dismissed || e.completed)) {
      next = next.filter((i) => i.id !== c.id);
    }
  }
  return next;
}

export function upsertFocusHide(
  items: FocusPersistedItem[],
  candidate: FocusDisplayItem,
  kind: "dismissed" | "completed",
  signals: FocusSignals
): FocusPersistedItem[] {
  const rest = items.filter((i) => i.id !== candidate.id);
  const row: FocusPersistedItem = {
    id: candidate.id,
    type: candidate.type,
    label: candidate.label,
    count: candidate.count,
    dismissed: kind === "dismissed",
    completed: kind === "completed",
    frozenCount: candidate.type === "pipeline" ? undefined : candidate.count,
    frozenSignals: candidate.type === "pipeline" ? { ...signals } : undefined,
  };
  return [...rest, row];
}

export function filterVisibleFocusCandidates(
  candidates: FocusDisplayItem[],
  items: FocusPersistedItem[],
  signals: FocusSignals
): FocusDisplayItem[] {
  return candidates.filter((c) => shouldShowFocusItem(c, findEntry(items, c.id), signals));
}

export function focusPersistedListsEqual(a: FocusPersistedItem[], b: FocusPersistedItem[]): boolean {
  if (a.length !== b.length) return false;
  const sortKey = (x: FocusPersistedItem) =>
    `${x.id}|${x.dismissed ? 1 : 0}|${x.completed ? 1 : 0}|${x.frozenCount ?? ""}|${x.frozenSignals ? `${x.frozenSignals.overdue},${x.frozenSignals.showings},${x.frozenSignals.contacts}` : ""}`;
  const sa = [...a].map(sortKey).sort().join(";");
  const sb = [...b].map(sortKey).sort().join(";");
  return sa === sb;
}

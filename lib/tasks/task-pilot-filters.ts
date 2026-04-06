import type { SerializedTask } from "@/lib/tasks/task-serialize";
import type { TaskPilotPayload } from "@/lib/tasks/task-pilot-payload-mutate";

/**
 * URL query grammar for /task-pilot (shareable / bookmarkable).
 *
 * - status=all|open|completed  — default: all (omit param)
 * - due=overdue|today|upcoming|none — open tasks only; omit = no due slice
 * - contact=1 — task has linked contact
 * - property=1 — task has linked property
 * - priority=LOW|MEDIUM|HIGH — omit = any priority
 *
 * Other params (e.g. new=1) are ignored by the parser and should be preserved
 * by callers when replacing the query string.
 */
export type TaskPilotStatusFilter = "all" | "open" | "completed";
export type TaskPilotDueFilter = "overdue" | "today" | "upcoming" | "none";

export type TaskPilotFilters = {
  status: TaskPilotStatusFilter;
  /** When null, no due-slice filter. */
  due: TaskPilotDueFilter | null;
  contactLinked: boolean;
  propertyLinked: boolean;
  priority: SerializedTask["priority"] | null;
};

export const DEFAULT_TASK_PILOT_FILTERS: TaskPilotFilters = {
  status: "all",
  due: null,
  contactLinked: false,
  propertyLinked: false,
  priority: null,
};

export type TaskPilotRowBucket = "overdue" | "dueToday" | "upcoming" | "completed";

type TaggedTask = {
  task: SerializedTask;
  rowBucket: TaskPilotRowBucket;
};

function flattenPayload(p: TaskPilotPayload): TaggedTask[] {
  return [
    ...p.overdue.map((task) => ({ task, rowBucket: "overdue" as const })),
    ...p.dueToday.map((task) => ({ task, rowBucket: "dueToday" as const })),
    ...p.upcoming.map((task) => ({ task, rowBucket: "upcoming" as const })),
    ...p.completed.map((task) => ({ task, rowBucket: "completed" as const })),
  ];
}

export function getTaskPilotTodayBounds(now: Date) {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  return { todayStart, todayEnd };
}

function isOpen(t: SerializedTask) {
  return t.status === "OPEN";
}

/** Upcoming with a due datetime strictly after local today. */
function isFutureDated(task: SerializedTask, todayEnd: Date): boolean {
  if (!task.dueAt) return false;
  const d = new Date(task.dueAt);
  if (Number.isNaN(d.getTime())) return false;
  return d >= todayEnd;
}

function hasNoDue(task: SerializedTask): boolean {
  if (!task.dueAt) return true;
  const d = new Date(task.dueAt);
  return Number.isNaN(d.getTime());
}

function passesDueFilter(
  tag: TaggedTask,
  due: TaskPilotDueFilter | null,
  bounds: ReturnType<typeof getTaskPilotTodayBounds>
): boolean {
  if (!due) return true;
  if (!isOpen(tag.task)) return true;
  switch (due) {
    case "overdue":
      return tag.rowBucket === "overdue";
    case "today":
      return tag.rowBucket === "dueToday";
    case "upcoming":
      return tag.rowBucket === "upcoming" && isFutureDated(tag.task, bounds.todayEnd);
    case "none":
      return tag.rowBucket === "upcoming" && hasNoDue(tag.task);
    default:
      return true;
  }
}

function passesStatusFilter(task: SerializedTask, status: TaskPilotStatusFilter): boolean {
  if (status === "all") return true;
  if (status === "open") return task.status === "OPEN";
  return task.status === "COMPLETED";
}

function passesLinkAndPriority(task: SerializedTask, f: TaskPilotFilters): boolean {
  if (f.contactLinked && !task.contact) return false;
  if (f.propertyLinked && !task.property) return false;
  if (f.priority && task.priority !== f.priority) return false;
  return true;
}

export type TaskPilotDisplayModel = {
  overdue: SerializedTask[];
  dueToday: SerializedTask[];
  upcoming: SerializedTask[];
  completed: SerializedTask[];
  /** Today + upcoming sections */
  showOpenSections: boolean;
  /** Completed list / details block */
  showCompletedSection: boolean;
};

export function applyTaskPilotDisplayFilters(
  payload: TaskPilotPayload,
  filters: TaskPilotFilters,
  now: Date
): TaskPilotDisplayModel {
  const bounds = getTaskPilotTodayBounds(now);
  const tagged = flattenPayload(payload);
  const next: TaskPilotDisplayModel = {
    overdue: [],
    dueToday: [],
    upcoming: [],
    completed: [],
    showOpenSections: filters.status !== "completed",
    showCompletedSection:
      filters.status === "completed" ||
      (filters.status === "all" && filters.due === null),
  };

  for (const tag of tagged) {
    if (!passesStatusFilter(tag.task, filters.status)) continue;
    if (!passesDueFilter(tag, filters.due, bounds)) continue;
    if (!passesLinkAndPriority(tag.task, filters)) continue;

    switch (tag.rowBucket) {
      case "overdue":
        next.overdue.push(tag.task);
        break;
      case "dueToday":
        next.dueToday.push(tag.task);
        break;
      case "upcoming":
        next.upcoming.push(tag.task);
        break;
      case "completed":
        next.completed.push(tag.task);
        break;
      default:
        break;
    }
  }

  return next;
}

export function parseTaskPilotFilters(params: URLSearchParams): TaskPilotFilters {
  const statusRaw = params.get("status")?.trim().toLowerCase() ?? "";
  let status: TaskPilotStatusFilter = "all";
  if (statusRaw === "open") status = "open";
  else if (statusRaw === "completed") status = "completed";
  else if (statusRaw === "all" || statusRaw === "") status = "all";
  else status = "all";

  const dueRaw = params.get("due")?.trim().toLowerCase() ?? "";
  let due: TaskPilotDueFilter | null = null;
  if (dueRaw === "overdue") due = "overdue";
  else if (dueRaw === "today") due = "today";
  else if (dueRaw === "upcoming") due = "upcoming";
  else if (dueRaw === "none") due = "none";

  const contactLinked = params.get("contact") === "1";
  const propertyLinked = params.get("property") === "1";

  const pr = params.get("priority")?.trim().toUpperCase() ?? "";
  let priority: SerializedTask["priority"] | null = null;
  if (pr === "LOW" || pr === "MEDIUM" || pr === "HIGH") {
    priority = pr as SerializedTask["priority"];
  }

  return { status, due, contactLinked, propertyLinked, priority };
}

export function filtersToSearchParams(f: TaskPilotFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.status !== "all") p.set("status", f.status);
  if (f.due) p.set("due", f.due);
  if (f.contactLinked) p.set("contact", "1");
  if (f.propertyLinked) p.set("property", "1");
  if (f.priority) p.set("priority", f.priority);
  return p;
}

export function taskPilotFiltersQueryString(f: TaskPilotFilters): string {
  const p = filtersToSearchParams(f);
  const s = p.toString();
  return s;
}

export function isNonDefaultTaskPilotFilters(f: TaskPilotFilters): boolean {
  return (
    f.status !== DEFAULT_TASK_PILOT_FILTERS.status ||
    f.due !== DEFAULT_TASK_PILOT_FILTERS.due ||
    f.contactLinked !== DEFAULT_TASK_PILOT_FILTERS.contactLinked ||
    f.propertyLinked !== DEFAULT_TASK_PILOT_FILTERS.propertyLinked ||
    f.priority !== DEFAULT_TASK_PILOT_FILTERS.priority
  );
}

/** Merge filter query with preserved keys (e.g. new=1). */
export function countDisplayTasks(m: TaskPilotDisplayModel): number {
  return m.overdue.length + m.dueToday.length + m.upcoming.length + m.completed.length;
}

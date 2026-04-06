import type { SerializedTask } from "./task-serialize";
import { bucketOpenTasksByDue } from "./task-buckets";

export type TaskPilotPayload = {
  counts: {
    openOverdue: number;
    openDueToday: number;
    openUpcoming: number;
    completedShown: number;
  };
  overdue: SerializedTask[];
  dueToday: SerializedTask[];
  upcoming: SerializedTask[];
  completed: SerializedTask[];
};

function getTodayBounds() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  return { todayStart, todayEnd };
}

function removeTaskById(
  payload: TaskPilotPayload,
  id: string
): { task: SerializedTask | undefined; base: TaskPilotPayload } {
  const lists: SerializedTask[][] = [
    payload.overdue,
    payload.dueToday,
    payload.upcoming,
    payload.completed,
  ];
  let found: SerializedTask | undefined;
  for (const list of lists) {
    const hit = list.find((t) => t.id === id);
    if (hit) {
      found = hit;
      break;
    }
  }
  const filter = (arr: SerializedTask[]) => arr.filter((t) => t.id !== id);
  const base: TaskPilotPayload = {
    ...payload,
    overdue: filter(payload.overdue),
    dueToday: filter(payload.dueToday),
    upcoming: filter(payload.upcoming),
    completed: filter(payload.completed),
  };
  return { task: found, base };
}

function recalcCounts(p: TaskPilotPayload): TaskPilotPayload {
  return {
    ...p,
    counts: {
      openOverdue: p.overdue.length,
      openDueToday: p.dueToday.length,
      openUpcoming: p.upcoming.length,
      completedShown: p.completed.length,
    },
  };
}

export function optimisticToggleStatus(
  payload: TaskPilotPayload,
  taskId: string,
  nextCompleted: boolean
): TaskPilotPayload | null {
  const { task, base } = removeTaskById(payload, taskId);
  if (!task) return null;
  const { todayStart, todayEnd } = getTodayBounds();
  if (nextCompleted) {
    const updated: SerializedTask = {
      ...task,
      status: "COMPLETED",
      completedAt: new Date().toISOString(),
    };
    return recalcCounts({
      ...base,
      completed: [updated, ...base.completed],
    });
  }
  const updated: SerializedTask = {
    ...task,
    status: "OPEN",
    completedAt: null,
  };
  const { overdue, dueToday, upcoming } = bucketOpenTasksByDue([updated], todayStart, todayEnd);
  return recalcCounts({
    ...base,
    overdue: [...base.overdue, ...overdue],
    dueToday: [...base.dueToday, ...dueToday],
    upcoming: [...base.upcoming, ...upcoming],
  });
}

export function optimisticSetPriority(
  payload: TaskPilotPayload,
  taskId: string,
  priority: SerializedTask["priority"]
): TaskPilotPayload | null {
  const map = (t: SerializedTask) => (t.id === taskId ? { ...t, priority } : t);
  const next: TaskPilotPayload = {
    ...payload,
    overdue: payload.overdue.map(map),
    dueToday: payload.dueToday.map(map),
    upcoming: payload.upcoming.map(map),
    completed: payload.completed.map(map),
  };
  if (![...payload.overdue, ...payload.dueToday, ...payload.upcoming, ...payload.completed].some((t) => t.id === taskId)) {
    return null;
  }
  return recalcCounts(next);
}

export function optimisticSetDueAt(
  payload: TaskPilotPayload,
  taskId: string,
  dueAt: string | null
): TaskPilotPayload | null {
  const { task, base } = removeTaskById(payload, taskId);
  if (!task) return null;
  const updated: SerializedTask = { ...task, dueAt };
  if (updated.status === "COMPLETED") {
    return recalcCounts({
      ...base,
      completed: [updated, ...base.completed],
    });
  }
  const { todayStart, todayEnd } = getTodayBounds();
  const { overdue, dueToday, upcoming } = bucketOpenTasksByDue([updated], todayStart, todayEnd);
  return recalcCounts({
    ...base,
    overdue: [...base.overdue, ...overdue],
    dueToday: [...base.dueToday, ...dueToday],
    upcoming: [...base.upcoming, ...upcoming],
  });
}

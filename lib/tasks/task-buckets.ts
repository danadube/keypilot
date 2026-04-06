import type { SerializedTask } from "./task-serialize";

export function bucketOpenTasksByDue(
  open: SerializedTask[],
  todayStart: Date,
  todayEnd: Date
) {
  const overdue: SerializedTask[] = [];
  const dueToday: SerializedTask[] = [];
  const upcoming: SerializedTask[] = [];

  for (const t of open) {
    if (!t.dueAt) {
      upcoming.push(t);
      continue;
    }
    const d = new Date(t.dueAt);
    if (Number.isNaN(d.getTime())) {
      upcoming.push(t);
      continue;
    }
    if (d < todayStart) overdue.push(t);
    else if (d >= todayStart && d < todayEnd) dueToday.push(t);
    else upcoming.push(t);
  }

  return { overdue, dueToday, upcoming };
}

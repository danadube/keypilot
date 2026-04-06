import {
  applyTaskPilotDisplayFilters,
  DEFAULT_TASK_PILOT_FILTERS,
  filtersToSearchParams,
  parseTaskPilotFilters,
} from "@/lib/tasks/task-pilot-filters";
import type { TaskPilotPayload } from "@/lib/tasks/task-pilot-payload-mutate";

function basePayload(overrides: Partial<TaskPilotPayload> = {}): TaskPilotPayload {
  return {
    counts: { openOverdue: 0, openDueToday: 0, openUpcoming: 0, completedShown: 0 },
    overdue: [],
    dueToday: [],
    upcoming: [],
    completed: [],
    ...overrides,
  };
}

const now = new Date("2026-04-06T12:00:00.000Z");

describe("task-pilot-filters", () => {
  it("parseTaskPilotFilters reads status due contact property priority", () => {
    const p = new URLSearchParams(
      "status=open&due=overdue&contact=1&property=1&priority=HIGH"
    );
    expect(parseTaskPilotFilters(p)).toEqual({
      status: "open",
      due: "overdue",
      contactLinked: true,
      propertyLinked: true,
      priority: "HIGH",
    });
  });

  it("filtersToSearchParams omits defaults", () => {
    expect(filtersToSearchParams(DEFAULT_TASK_PILOT_FILTERS).toString()).toBe("");
  });

  it("applyTaskPilotDisplayFilters keeps overdue in overdue bucket", () => {
    const t = {
      id: "1",
      userId: "u",
      title: "A",
      description: null,
      status: "OPEN" as const,
      dueAt: "2026-04-01T12:00:00.000Z",
      priority: "MEDIUM" as const,
      contactId: null,
      propertyId: null,
      createdAt: "2026-04-01T00:00:00.000Z",
      completedAt: null,
      contact: null,
      property: null,
    };
    const payload = basePayload({ overdue: [t] });
    const m = applyTaskPilotDisplayFilters(
      payload,
      { ...DEFAULT_TASK_PILOT_FILTERS, due: "overdue" },
      now
    );
    expect(m.overdue).toHaveLength(1);
    expect(m.dueToday).toHaveLength(0);
    expect(m.showCompletedSection).toBe(false);
  });

  it("status completed hides open sections", () => {
    const open = {
      id: "1",
      userId: "u",
      title: "A",
      description: null,
      status: "OPEN" as const,
      dueAt: null,
      priority: "MEDIUM" as const,
      contactId: null,
      propertyId: null,
      createdAt: "2026-04-01T00:00:00.000Z",
      completedAt: null,
      contact: null,
      property: null,
    };
    const done = { ...open, id: "2", status: "COMPLETED" as const, completedAt: "2026-04-05T00:00:00.000Z" };
    const payload = basePayload({ upcoming: [open], completed: [done] });
    const m = applyTaskPilotDisplayFilters(
      payload,
      { ...DEFAULT_TASK_PILOT_FILTERS, status: "completed" },
      now
    );
    expect(m.showOpenSections).toBe(false);
    expect(m.showCompletedSection).toBe(true);
    expect(m.completed).toHaveLength(1);
  });
});

import {
  buildTaskCompletionActivityTitle,
  buildTaskCreatedActivityTitle,
  buildTaskReopenedActivityTitle,
  recordTaskPilotCompletionUserActivity,
  recordTaskPilotCreatedUserActivity,
  recordTaskPilotReopenedUserActivity,
} from "../record-task-completion-user-activity";
import * as foundation from "@/lib/activity-foundation";

jest.mock("@/lib/activity-foundation", () => ({
  ...jest.requireActual("@/lib/activity-foundation"),
  createUserActivity: jest.fn(),
}));

describe("buildTaskCompletionActivityTitle", () => {
  it("keeps short titles intact", () => {
    expect(buildTaskCompletionActivityTitle("Call agent")).toBe("Task completed — Call agent");
  });

  it("never exceeds 500 characters when task title is max length", () => {
    const long = "a".repeat(500);
    const title = buildTaskCompletionActivityTitle(long);
    expect(title.length).toBe(500);
    expect(title.startsWith("Task completed — ")).toBe(true);
  });
});

describe("buildTaskCreatedActivityTitle", () => {
  it("prefixes short titles", () => {
    expect(buildTaskCreatedActivityTitle("Follow up")).toBe("Task created — Follow up");
  });
});

describe("buildTaskReopenedActivityTitle", () => {
  it("prefixes short titles", () => {
    expect(buildTaskReopenedActivityTitle("Prep docs")).toBe("Task reopened — Prep docs");
  });
});

describe("recordTaskPilotCreatedUserActivity", () => {
  const createUserActivity = foundation.createUserActivity as jest.Mock;

  beforeEach(() => {
    createUserActivity.mockReset();
    createUserActivity.mockResolvedValue({ id: "ua-new" });
  });

  it("creates a TASK UserActivity for new Task Pilot tasks", async () => {
    const tx = {} as foundation.ActivityTx;
    await recordTaskPilotCreatedUserActivity(tx, {
      userId: "user-1",
      taskTitle: "Send CMA",
      propertyId: null,
      contactId: "c-1",
    });
    expect(createUserActivity).toHaveBeenCalledWith(tx, {
      userId: "user-1",
      type: "TASK",
      title: "Task created — Send CMA",
      description: null,
      propertyId: undefined,
      contactId: "c-1",
    });
  });
});

describe("recordTaskPilotReopenedUserActivity", () => {
  const createUserActivity = foundation.createUserActivity as jest.Mock;

  beforeEach(() => {
    createUserActivity.mockReset();
    createUserActivity.mockResolvedValue({ id: "ua-reopen" });
  });

  it("creates a TASK UserActivity when a task is reopened", async () => {
    const tx = {} as foundation.ActivityTx;
    await recordTaskPilotReopenedUserActivity(tx, {
      userId: "user-1",
      taskTitle: "Old task",
      propertyId: "p-1",
      contactId: null,
    });
    expect(createUserActivity).toHaveBeenCalledWith(tx, {
      userId: "user-1",
      type: "TASK",
      title: "Task reopened — Old task",
      description: null,
      propertyId: "p-1",
      contactId: undefined,
    });
  });
});

describe("recordTaskPilotCompletionUserActivity", () => {
  const createUserActivity = foundation.createUserActivity as jest.Mock;

  beforeEach(() => {
    createUserActivity.mockReset();
    createUserActivity.mockResolvedValue({ id: "ua-1" });
  });

  it("creates a TASK UserActivity with title and links", async () => {
    const tx = {} as foundation.ActivityTx;
    await recordTaskPilotCompletionUserActivity(tx, {
      userId: "user-1",
      taskTitle: "Call listing agent",
      propertyId: "prop-1",
      contactId: null,
    });
    expect(createUserActivity).toHaveBeenCalledWith(tx, {
      userId: "user-1",
      type: "TASK",
      title: "Task completed — Call listing agent",
      description: null,
      propertyId: "prop-1",
      contactId: undefined,
    });
  });
});

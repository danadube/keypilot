import { recordTaskPilotCompletionUserActivity } from "../record-task-completion-user-activity";
import * as foundation from "@/lib/activity-foundation";

jest.mock("@/lib/activity-foundation", () => ({
  ...jest.requireActual("@/lib/activity-foundation"),
  createUserActivity: jest.fn(),
}));

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

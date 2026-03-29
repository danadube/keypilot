/**
 * Canonical URLs for ShowingHQ workflows (prep / feedback / details).
 * Use from dashboard, API follow-up rows, and in-app navigation.
 */

import type { ShowingAttentionState } from "@/lib/showing-hq/showing-attention";

export const SHOWING_HQ_WORKFLOW_TABS = ["prep", "feedback", "details"] as const;

export type ShowingHqWorkflowTab = (typeof SHOWING_HQ_WORKFLOW_TABS)[number];

export function normalizeShowingHqWorkflowTab(
  raw: string | null | undefined
): ShowingHqWorkflowTab {
  if (raw === "prep" || raw === "feedback" || raw === "details") return raw;
  return "prep";
}

export function showingWorkflowTabHref(
  id: string,
  tab: ShowingHqWorkflowTab
): string {
  return `/showing-hq/showings/${id}?tab=${tab}`;
}

export function openHouseWorkflowTabHref(
  id: string,
  tab: ShowingHqWorkflowTab
): string {
  return `/showing-hq/open-houses/${id}?tab=${tab}`;
}

/**
 * Maps attention queue rows to the correct surface + tab.
 * Prep-required → prep tab. Feedback / follow-up (showing) → feedback tab or queues.
 * Report / open-house follow-ups use module routes.
 */
export function workflowHrefForAttention(args: {
  kind: "showing" | "open_house";
  id: string;
  attention: Pick<ShowingAttentionState, "label" | "action">;
}): string {
  const { kind, id, attention } = args;
  const { label, action } = attention;

  if (label === "Prep required") {
    return kind === "open_house"
      ? openHouseWorkflowTabHref(id, "prep")
      : showingWorkflowTabHref(id, "prep");
  }

  if (label === "Showing soon" || label === "Today") {
    return kind === "open_house"
      ? openHouseWorkflowTabHref(id, "details")
      : showingWorkflowTabHref(id, "details");
  }

  if (label === "Feedback needed") {
    if (action === "review") return "/showing-hq/feedback-requests";
    return showingWorkflowTabHref(id, "feedback");
  }

  if (label === "Follow-up required") {
    if (kind === "open_house") return `/open-houses/${id}/follow-ups`;
    if (action === "review") return "/showing-hq/feedback-requests";
    return showingWorkflowTabHref(id, "feedback");
  }

  return kind === "open_house"
    ? openHouseWorkflowTabHref(id, "details")
    : showingWorkflowTabHref(id, "details");
}

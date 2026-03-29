/**
 * Consistent labels and fallbacks for mutations (saves, status, redirects).
 * Keep copy short, plain, and operational — no toast framework required.
 */

export const AF = {
  saving: "Saving…",
  saved: "Saved",
  creating: "Creating…",
  scheduling: "Scheduling…",
  clearing: "Clearing…",
  completing: "Completing…",
  reopening: "Reopening…",
  updating: "Updating…",
  sending: "Sending…",
  regenerating: "Regenerating…",
  couldntSave: "Couldn't save changes",
  couldntCreate: "Couldn't create this. Check the form and try again.",
  couldntCreateFollowUp: "Couldn't save the follow-up.",
  couldntUpdateStatus: "Couldn't update status. Try again.",
  tryAgain: "Try again",
  /** Post-redirect banner (showings list) */
  showingScheduled:
    "Showing scheduled. Find it in the list below, or open it from ShowingHQ anytime.",
  /** Post-redirect banner (open house workspace) */
  openHouseCreated:
    "Open house created. Review details, sign-in link, and prep on this page.",
  openHouseUpdated: "Open house updated.",
  statusUpdated: "Status updated.",
  debriefSaved: "Debrief saved.",
  debriefCleared: "Debrief cleared.",
  showingDetailsSaved: "Showing details saved.",
} as const;

/** One-shot query params — strip after read so URLs stay shareable. */
export const FLASH_QUERY = {
  showingCreated: "showing_created",
  openHouseCreated: "oh_created",
} as const;

export function afError(err: unknown, fallback: string): string {
  if (typeof err === "string" && err.trim()) return err.trim();
  if (err instanceof Error && err.message.trim()) return err.message.trim();
  return fallback;
}

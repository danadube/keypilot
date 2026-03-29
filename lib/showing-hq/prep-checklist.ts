/**
 * Prep checklists for open houses and private showings.
 * Completeness = derived from columns when no flag override; explicit true/false in
 * prepChecklistFlags overrides derived display for manual toggles.
 */

export type PrepChecklistItem = {
  id: string;
  /** Key stored in prepChecklistFlags JSON */
  flagKey: string;
  label: string;
  /** Short label for queue copy, e.g. "flyer", "email" */
  shortLabel: string;
  complete: boolean;
  /** All rows are toggleable when the panel passes onToggle */
  userToggleable: boolean;
};

export type OpenHousePrepInput = {
  flyerUrl?: string | null;
  flyerOverrideUrl?: string | null;
  propertyFlyerUrl?: string | null;
  qrSlug?: string | null;
  notes?: string | null;
  hostNotes?: string | null;
  hostAgentId?: string | null;
  /** Count of hosts in HOST_AGENT or ASSISTANT roles (excludes listing-only) */
  nonListingHostCount?: number;
  prepChecklistFlags?: Record<string, unknown> | null;
};

export type ShowingPrepInput = {
  buyerAgentName?: string | null;
  buyerAgentEmail?: string | null;
  notes?: string | null;
  feedbackRequired: boolean;
  feedbackDraftGeneratedAt?: Date | null;
  pendingFeedbackFormCount?: number;
  prepChecklistFlags?: Record<string, unknown> | null;
};

function readFlag(flags: Record<string, unknown> | null | undefined, key: string): boolean {
  if (!flags || typeof flags !== "object") return false;
  return flags[key] === true;
}

/** Tri-state: explicit true/false wins; otherwise derived default. */
export function prepItemComplete(
  flags: Record<string, unknown> | null | undefined,
  flagKey: string,
  derived: boolean
): boolean {
  if (!flags || typeof flags !== "object") return derived;
  const v = flags[flagKey];
  if (v === true) return true;
  if (v === false) return false;
  return derived;
}

export function buildOpenHousePrepChecklist(input: OpenHousePrepInput): PrepChecklistItem[] {
  const flags = input.prepChecklistFlags ?? null;
  const hasFlyer = Boolean(
    input.flyerUrl?.trim() ||
      input.flyerOverrideUrl?.trim() ||
      input.propertyFlyerUrl?.trim()
  );
  const qrFromSlug = Boolean(input.qrSlug?.trim());
  const hostFromRoster =
    Boolean(input.hostAgentId?.trim()) ||
    (input.nonListingHostCount != null && input.nonListingHostCount > 0);
  /** Roster + legacy manual `hostConfirmed` flag (pre–hostAssigned key). */
  const hostDerived = hostFromRoster || readFlag(flags, "hostConfirmed");
  const hasNotes = Boolean(input.notes?.trim() || input.hostNotes?.trim());

  return [
    {
      id: "flyer",
      flagKey: "flyerUploaded",
      label: "Flyer uploaded",
      shortLabel: "flyer",
      complete: prepItemComplete(flags, "flyerUploaded", hasFlyer),
      userToggleable: true,
    },
    {
      id: "sign_in",
      flagKey: "qrReady",
      label: "QR ready",
      shortLabel: "QR",
      complete: prepItemComplete(flags, "qrReady", qrFromSlug),
      userToggleable: true,
    },
    {
      id: "host",
      flagKey: "hostAssigned",
      label: "Host assigned",
      shortLabel: "host",
      complete: prepItemComplete(flags, "hostAssigned", hostDerived),
      userToggleable: true,
    },
    {
      id: "signs",
      flagKey: "signsMaterialsReady",
      label: "Signs / materials ready",
      shortLabel: "signs",
      complete: prepItemComplete(flags, "signsMaterialsReady", false),
      userToggleable: true,
    },
    {
      id: "notes",
      flagKey: "notesReady",
      label: "Notes / instructions",
      shortLabel: "notes",
      complete: prepItemComplete(flags, "notesReady", hasNotes),
      userToggleable: true,
    },
  ];
}

export function buildShowingPrepChecklist(input: ShowingPrepInput): PrepChecklistItem[] {
  const flags = input.prepChecklistFlags ?? null;
  const hasName = Boolean(input.buyerAgentName?.trim());
  const hasEmail = Boolean(input.buyerAgentEmail?.trim());
  const hasNotes = Boolean(input.notes?.trim());
  const formOrDraftReady =
    (input.pendingFeedbackFormCount ?? 0) > 0 || input.feedbackDraftGeneratedAt != null;
  const followUpDerived =
    !input.feedbackRequired || formOrDraftReady;

  return [
    {
      id: "agent_name",
      flagKey: "buyerAgentNameReady",
      label: "Buyer agent name",
      shortLabel: "agent name",
      complete: prepItemComplete(flags, "buyerAgentNameReady", hasName),
      userToggleable: true,
    },
    {
      id: "agent_email",
      flagKey: "buyerAgentEmailReady",
      label: "Buyer agent email",
      shortLabel: "email",
      complete: prepItemComplete(flags, "buyerAgentEmailReady", hasEmail),
      userToggleable: true,
    },
    {
      id: "notes",
      flagKey: "notesReady",
      label: "Notes / instructions",
      shortLabel: "notes",
      complete: prepItemComplete(flags, "notesReady", hasNotes),
      userToggleable: true,
    },
    {
      id: "follow_up",
      flagKey: "followUpPathReady",
      label: "Follow-up path ready",
      shortLabel: "follow-up",
      complete: prepItemComplete(flags, "followUpPathReady", followUpDerived),
      userToggleable: true,
    },
  ];
}

export function missingPrepShortLabels(items: PrepChecklistItem[]): string[] {
  return items.filter((i) => !i.complete).map((i) => i.shortLabel);
}

export function formatMissingPrepSummary(labels: string[], maxLabels = 4): string {
  if (labels.length === 0) return "";
  const shown = labels.slice(0, maxLabels);
  const more = labels.length > maxLabels ? "…" : "";
  return `Missing: ${shown.join(", ")}${more}`;
}

/** Human guidance for dashboard / queues (not technical "Missing: …" lists). */
export function formatMissingPrepGuidance(items: PrepChecklistItem[]): string {
  const incomplete = items.filter((i) => !i.complete);
  if (incomplete.length === 0) return "";
  const ids = new Set(incomplete.map((i) => i.id));
  const phrases: string[] = [];
  if (ids.has("agent_name") || ids.has("agent_email")) {
    phrases.push("buyer agent details");
  }
  if (ids.has("notes")) phrases.push("showing notes");
  if (ids.has("follow_up")) phrases.push("your follow-up plan");
  if (ids.has("flyer")) phrases.push("a listing flyer");
  if (ids.has("sign_in")) phrases.push("QR sign-in");
  if (ids.has("host")) phrases.push("a confirmed host");
  if (ids.has("signs")) phrases.push("signs and materials");
  if (phrases.length === 0) return "Complete the remaining prep items to move forward.";
  if (phrases.length === 1) return `Add ${phrases[0]} so you're ready for this event.`;
  if (phrases.length === 2) return `Add ${phrases[0]} and ${phrases[1]} so you're ready for this event.`;
  const last = phrases.pop()!;
  return `Add ${phrases.join(", ")}, and ${last} so you're ready for this event.`;
}

export function openHousePrepIncomplete(input: OpenHousePrepInput): boolean {
  return buildOpenHousePrepChecklist(input).some((i) => !i.complete);
}

export function showingPrepIncomplete(input: ShowingPrepInput): boolean {
  return buildShowingPrepChecklist(input).some((i) => !i.complete);
}

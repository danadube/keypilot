/**
 * Lightweight prep checklists for open houses and private showings.
 * Prefer deriving completeness from existing columns; JSON flags only when needed.
 */

export type PrepChecklistItem = {
  id: string;
  label: string;
  /** Short label for queue copy, e.g. "flyer", "email" */
  shortLabel: string;
  complete: boolean;
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
  const v = flags[key];
  return v === true;
}

export function buildOpenHousePrepChecklist(input: OpenHousePrepInput): PrepChecklistItem[] {
  const flags = input.prepChecklistFlags ?? null;
  const hasFlyer = Boolean(
    input.flyerUrl?.trim() ||
      input.flyerOverrideUrl?.trim() ||
      input.propertyFlyerUrl?.trim()
  );
  const qrReady = Boolean(input.qrSlug?.trim());
  const hostDerived =
    Boolean(input.hostAgentId?.trim()) ||
    (input.nonListingHostCount != null && input.nonListingHostCount > 0);
  const hostConfirmed = hostDerived || readFlag(flags, "hostConfirmed");
  const signsReady = readFlag(flags, "signsMaterialsReady");
  const hasNotes = Boolean(input.notes?.trim() || input.hostNotes?.trim());

  return [
    {
      id: "flyer",
      label: "Flyer uploaded",
      shortLabel: "flyer",
      complete: hasFlyer,
      userToggleable: false,
    },
    {
      id: "sign_in",
      label: "Sign-in page / QR ready",
      shortLabel: "QR",
      complete: qrReady,
      userToggleable: false,
    },
    {
      id: "host",
      label: "Host confirmed",
      shortLabel: "host",
      complete: hostConfirmed,
      userToggleable: !hostDerived,
    },
    {
      id: "signs",
      label: "Signs / materials ready",
      shortLabel: "signs",
      complete: signsReady,
      userToggleable: true,
    },
    {
      id: "notes",
      label: "Notes / instructions complete",
      shortLabel: "notes",
      complete: hasNotes,
      userToggleable: false,
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
  const followUpReady =
    !input.feedbackRequired ||
    readFlag(flags, "followUpPathReady") ||
    formOrDraftReady;

  return [
    {
      id: "agent_name",
      label: "Buyer agent name",
      shortLabel: "agent name",
      complete: hasName,
      userToggleable: false,
    },
    {
      id: "agent_email",
      label: "Buyer agent email",
      shortLabel: "email",
      complete: hasEmail,
      userToggleable: false,
    },
    {
      id: "notes",
      label: "Notes / instructions",
      shortLabel: "notes",
      complete: hasNotes,
      userToggleable: false,
    },
    {
      id: "follow_up",
      label: "Follow-up path ready",
      shortLabel: "follow-up",
      complete: followUpReady,
      userToggleable: input.feedbackRequired && !formOrDraftReady,
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

export function openHousePrepIncomplete(input: OpenHousePrepInput): boolean {
  return buildOpenHousePrepChecklist(input).some((i) => !i.complete);
}

export function showingPrepIncomplete(input: ShowingPrepInput): boolean {
  return buildShowingPrepChecklist(input).some((i) => !i.complete);
}

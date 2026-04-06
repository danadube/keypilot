/**
 * Global UI copy primitives (Pass 1 — language system lock).
 *
 * Rules:
 * - Navigation into a working surface → use `actions.open` ("Open"); do not add new "View" for that pattern.
 * - Load failures → `errors.load(thing)` → "Could not load {thing}." — not "Failed to load" / "Error loading" / "Could not fetch".
 * - List empty states → `empty.noneYet(thing)` → "No {thing} yet."
 * - Generic empty panels → `empty.nothingHere`
 *
 * See `docs/CONTENT_STYLE_GUIDE.md` for full guidance. Prefer importing from here for new strings.
 */
export const UI_COPY = {
  /** Upgrade / ModuleGate surfaces — keep to one line per module where possible. */
  gates: {
    clientKeep:
      "Organize contacts with tags, segments, activity, and follow-ups.",
  },

  actions: {
    open: "Open",
    create: "Create",
    save: "Save",
    review: "Review",
    delete: "Delete",
  },

  /** FarmTrackr — short labels for badges and list scopes */
  farmTrackr: {
    farmAreaEmpty: "Empty",
    farmAreaActive: "Active",
    loadingFarmStructure: "Loading farm structure…",
    loadingLists: "Loading…",
    listsBlurb:
      "CSV and labels need a full mailing address on the contact (deduped per scope). Save a shortcut to jump to a territory or area row.",
    lastActivityPlaceholder: "Last activity — not tracked yet",
    savedListScopes: "Saved scopes",
    saveScope: "Save scope",
    scopeKindTerritory: "Territory",
    scopeKindArea: "Farm area",
    performanceBlurb:
      "Structure, mailing-ready totals, and per-farm contact completeness — operational signals, not campaign analytics.",
    performanceHealthNote:
      "Health uses the same contacts you see in each area’s member panel (your CRM access rules).",
    mailingReadySumNote: "Sum of territory mail-ready counts (deduped per territory).",
    totalMembersNote: "Assignment rows; same contact in multiple areas counts more than once.",
  },

  errors: {
    load: (thing: string) => `Could not load ${thing}.`,
    generic: "Something went wrong.",
    retry: "Try again",
  },

  empty: {
    noneYet: (thing: string) => `No ${thing} yet.`,
    nothingHere: "Nothing here yet.",
  },
} as const;

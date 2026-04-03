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
  actions: {
    open: "Open",
    create: "Create",
    save: "Save",
    review: "Review",
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

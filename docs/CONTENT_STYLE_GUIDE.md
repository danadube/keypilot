# Content style guide (KeyPilot dashboard)

Practical rules for in-app UI copy. Enforce when adding or editing user-facing strings in the Next.js app.

**Canonical primitives:** `lib/ui-copy.ts` → `UI_COPY`. Pass 1 wires shared components; Pass 2 aligns remaining pages.

---

## Locked rules (Pass 1)

| Area | Rule |
|------|------|
| **Navigation CTAs** | Use **Open** (`UI_COPY.actions.open`) to enter a working surface. Do **not** add new **View** for that pattern. |
| **Load errors** | `UI_COPY.errors.load(thing)` → **Could not load {thing}.** — not “Failed to load”, “Error loading”, or “Could not fetch”. |
| **Retry** | `UI_COPY.errors.retry` → **Try again** |
| **List empty** | `UI_COPY.empty.noneYet(thing)` → **No {thing} yet.** |
| **Generic empty panel** | `UI_COPY.empty.nothingHere` → **Nothing here yet.** |

---

## 1. Module naming

- Use names from `lib/modules.ts` / `lib/upgrade-modules.ts`: **ShowingHQ**, **ClientKeep**, **PropertyVault**, **FarmTrackr**, **Transactions**, **MarketPilot**, **SellerPulse**, **TaskPilot**, **Insight**, **KeyPilot**.
- Keep **Transactions** and **Deals** distinct in copy.
- **Private showing** ≠ **open house** — never conflate.

---

## 2. Shell header vs in-page titles

- Workspace shell: **module name only** in the main header; tabs carry section identity; page body carries list/entity context.

---

## 3. Tabs and navigation labels

- Short nouns, sentence case except proper nouns (ShowingHQ).

---

## 4. Other CTAs

- **Create** / **Add** for new entities (`UI_COPY.actions.create` where it matches).
- **Save**, **Send**, **Delete**, **Apply**, **Import** for committing actions — not vague “Submit” unless true form submit.
- **Review** when the primary action is triage (`UI_COPY.actions.review`).

---

## 5. Helper and context copy

- Prefer one line: current state or next step. Avoid stacking long explanatory strips on every child route.

---

## 6. Time-scoped empty copy

- **Nothing scheduled**, **Nothing overdue**, etc. remain valid for calendar/today buckets (different from list `noneYet`).

---

## 7. Success and loading

- Success: past tense + specificity (“Tag created”).
- Loading: **Loading…** or **Loading {thing}…** when multiple loaders compete.

---

## 8. Glossary (selected)

| Concept | Wording |
|---------|---------|
| ShowingHQ filter shortcuts | **Saved views** |
| ClientKeep URL shortcuts | **Saved segments** / **Your saved segments** |
| Sidebar tool | **Activity** → `/showing-hq/activity` |

---

## Checklist (before merge)

- [ ] New navigation-into-surface CTAs use **Open** / `UI_COPY.actions.open`.
- [ ] New load failures use `UI_COPY.errors.load(thing)` or identical wording.
- [ ] New list empties use `UI_COPY.empty.noneYet` or identical pattern.
- [ ] Module names match `lib/modules.ts`.

---

*Update when `UI_COPY` expands (Pass 2+).*

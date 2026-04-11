# Content style guide (KeyPilot dashboard)

Practical rules for in-app UI copy. Enforce when adding or editing user-facing strings in the Next.js app (not legal/marketing site).

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

- Use **canonical product names** exactly as in `lib/modules.ts` / `lib/upgrade-modules.ts`: **ShowingHQ**, **ClientKeep**, **PropertyVault**, **FarmTrackr**, **Transactions**, **MarketPilot**, **SellerPulse**, **TaskPilot**, **Insight**, **KeyPilot** (platform).
- Keep **Transactions** and **Deals** distinct in copy. Do **not** mix “Deal desk”, “DealDesk”, and **Transactions** in UI unless product explicitly rebrands; the sidebar and shell use **Transactions** and **Deals** as separate routes—keep labels distinct.
- **Private showing** ≠ **open house** — never conflate. Say “showing” / “private showing” vs “open house” / “open house event” consistently.

---

## 2. Shell header vs in-page titles

- **Workspace shell** (`DashboardShell` + workspace chrome, **PageHeader** where used): header area shows **module name** and primary actions—not duplicate page titles. Tabs and **Actions** carry section identity; **page body** carries list/entity context (property address, table headers, heroes).
- Do not put redundant page names in the shell when the tab or body already establishes context.

---

## 3. Tabs and navigation labels

- **Short, scannable nouns**: “Showings”, “Open Houses”, “Visitors”, “Feedback”, “Contacts”, “Segments”, “Follow-ups”.
- **Sentence case** unless a proper noun (ShowingHQ).
- Avoid duplicating the module name in the tab unless disambiguation is required.

---

## 4. CTA labels (buttons and links)

Use one verb family per intent; prefer the shortest clear label. Prefer **`UI_COPY`** helpers where they exist.

| Intent | Preferred patterns | Avoid mixing |
|--------|-------------------|--------------|
| Navigate to a list/workspace | **Open** contacts, **Open** follow-up drafts, **Open** workspace | Same action sometimes “View …” |
| Navigate to read-only detail | **View** contact, **View** email drafts | Using “Open” for the same pattern |
| Create net-new entity | **Create** tag, **Add** property, **New** … (if space-constrained) | “Add” vs “Create” for the same entity type in one flow |
| Secondary navigation | **Manage** follow-ups, **Manage** tags | “Go to” / “See” unless tone is intentionally casual |

**Rule:** Pick **Open** *or* **View** for “go to this area” and document the choice per surface; don’t alternate in the same module without reason.

**Primary actions** that commit data: **Save**, **Send**, **Delete**, **Apply**, **Import** — not vague **Submit** unless it’s a true form submit. **Review** when the primary action is triage (`UI_COPY.actions.review`).

---

## 5. Helper text and context strips

- **Operational** (what to do next, one line): prefer **imperative + outcome**. Example: “Add a property to start open houses and capturing visitors.”
- **Explanatory** (how the product works): keep **one sentence**; move detail to docs or tooltips if it grows beyond two short sentences.
- **Context strips:** assume the user is busy; lead with the **current state** or **next action**, not platform philosophy.
- **Internal / power-user tools** (e.g. Supra inbox): still use clear steps; label experimental workflows explicitly (“Paste…”, “when useful”).
- Prefer one line: current state or next step. Avoid stacking long explanatory strips on every child route.

---

## 6. Empty states

- **Structure:** short headline + optional one-line hint + one primary CTA when action is obvious.
- **Headline patterns:** **No {entity} yet** for lists the user is expected to populate (align with `UI_COPY.empty.noneYet`). **Nothing {scoped}** for time-bounded or filtered buckets (today’s schedule, “nothing overdue”) — OK to keep; different from list `noneYet`.
- **Avoid** mixing **“No X yet”** and **“Nothing here yet”** on the same entity type across pages; pick one voice per entity family.
- **Periods:** use consistently within a surface (either fragments or full sentences—not random).

---

## 7. Errors

- **User-visible fetch failures:** align with `UI_COPY.errors.load` where applicable; otherwise prefer **“Couldn’t load {thing}”** or **“Couldn’t {verb} {thing}”** (contractions OK for tone). Standardize one pattern app-wide per future pass.
- **Actions:** **Try again** (button) is fine; pair with a short message above.
- **404 / not found:** entity-first—“Open house not found”, “Contact not found”—not generic “Not found” when the entity is known.

---

## 8. Success and loading

- Success: **past tense + specificity** (“Tag created”, “Reminder saved.”).
- Loading: **Loading…** or **Loading {thing}…** when multiple loaders compete.
- **Progress:** use **…** for in-flight button labels (“Saving…”, “Deleting…”) matching existing patterns.

---

## 9. Tone: operational vs explanatory

| Use operational | Use explanatory (sparingly) |
|-----------------|----------------------------|
| Buttons, empty states, errors, toasts | First-time module gates, upgrade cards |
| Tab hints one line | Long `valueProposition` strings repeated on every ClientKeep subpage |
| Sidebar labels | Context strips when state is complex |

**Upgrade / ModuleGate:** marketing-leaning copy is OK; avoid repeating the same **valueProposition** paragraph on every child route—prefer module-level or link to Settings/Modules.

---

## 10. Short labels vs descriptive copy

- **Navigation (sidebar, tabs):** max ~3 words; no trailing explanations.
- **Buttons:** 1–3 words; use `aria-label` if icon-only.
- **Table actions:** “Rename”, “Delete”, “View contacts”—parallel structure within the table.
- **Descriptive copy** belongs in: subheads under `h1`, card descriptions, empty state body—not in the shell title.

---

## 11. Glossary (selected)

| Concept | Preferred UI wording | Notes |
|---------|----------------------|-------|
| Saved filter shortcuts | **Saved views** (ShowingHQ); in ClientKeep use **saved segments** / **Your saved segments**—don’t call both “saved views” without context |
| Email follow-up queue | **Follow-ups**, **email drafts**, **follow-up drafts**—pick primary term per surface |
| ShowingHQ activity log | **Activity** → `/showing-hq/activity` (sidebar Tools) |
| Property list | **Properties** in PropertyVault context |

---

## 12. Consistency checklist (before merge)

- [ ] New navigation-into-surface CTAs use **Open** / `UI_COPY.actions.open`.
- [ ] New load failures use `UI_COPY.errors.load(thing)` or identical wording.
- [ ] New list empties use `UI_COPY.empty.noneYet` or identical pattern.
- [ ] Module names match `lib/modules.ts`.
- [ ] No shell title duplication of tab label for workspace routes.
- [ ] CTAs use one verb family per action type on that page.
- [ ] Empty state matches entity + voice rules above.
- [ ] “Open house” vs “showing” used correctly.

---

*Update when `UI_COPY` expands (Pass 2+) or when product renames modules or workspace rules change.*

# Content style guide (KeyPilot dashboard)

Practical rules for in-app UI copy. Enforce these when adding or editing user-facing strings in the Next.js app (not legal/marketing site).

---

## 1. Module naming

- Use **canonical product names** exactly as in `lib/modules.ts` / `lib/upgrade-modules.ts`: **ShowingHQ**, **ClientKeep**, **PropertyVault**, **FarmTrackr**, **Transactions**, **MarketPilot**, **SellerPulse**, **TaskPilot**, **Insight**, **KeyPilot** (platform).
- **Do not** mix “Deal desk”, “DealDesk”, and **Transactions** in UI unless product explicitly rebrands; today the sidebar and shell use **Transactions** and **Deals** as separate routes—keep labels distinct.
- **Private showing** vs **open house**: never conflate in copy. Say “showing” / “private showing” vs “open house” / “open house event” consistently.

---

## 2. Shell header vs in-page titles

- **Workspace shell** (`DashboardShell` + workspace chrome): header shows **module name only** (e.g. two-tone ShowingHQ / ClientKeep). Do not put page names (Contacts, Segments, All Open Houses) in the main shell title.
- **Tabs** carry primary section identity (ShowingHQ tabs, ClientKeep tabs).
- **Page body** carries list/entity context (property address, “Tags”, table headers, heroes).

---

## 3. Tabs and navigation labels

- **Short, scannable nouns**: “Showings”, “Open Houses”, “Visitors”, “Feedback”, “Contacts”, “Segments”, “Follow-ups”.
- **Sentence case** unless a proper noun (ShowingHQ).
- Avoid duplicating the module name in the tab unless disambiguation is required.

---

## 4. CTA labels (buttons and links)

Use one verb family per intent; prefer the shortest clear label.

| Intent | Preferred patterns | Avoid mixing |
|--------|-------------------|--------------|
| Navigate to a list/workspace | **Open** contacts, **Open** follow-up drafts, **Open** workspace | Same action sometimes “View …” |
| Navigate to read-only detail | **View** contact, **View** email drafts | Using “Open” for the same pattern |
| Create net-new entity | **Create** tag, **Add** property, **New** … (if space-constrained) | “Add” vs “Create” for the same entity type in one flow |
| Secondary navigation | **Manage** follow-ups, **Manage** tags | “Go to” / “See” unless tone is intentionally casual |

**Rule:** Pick **Open** *or* **View** for “go to this area” and document the choice per surface; don’t alternate in the same module without reason.

**Primary actions** that commit data: use specific verbs—**Save**, **Send**, **Delete**, **Apply**, **Import**—not “Submit” unless it’s a true form submit.

---

## 5. Helper text and context strips

- **Operational** (what to do next, one line): prefer **imperative + outcome**. Example: “Add a property to start open houses and capturing visitors.”
- **Explanatory** (how the product works): keep **one sentence**; move detail to docs or tooltips if it grows beyond two short sentences.
- **DashboardContextStrip**-style copy: assume the user is busy; lead with the **current state** or **next action**, not platform philosophy.
- **Internal / power-user tools** (e.g. Supra inbox): still use clear steps; label experimental workflows explicitly (“Paste…”, “when useful”).

---

## 6. Empty states

- **Structure:** short headline + optional one-line hint + one primary CTA when action is obvious.
- **Headline patterns:**  
  - **“No {entity} yet”** for lists the user is expected to populate (contacts, tags).  
  - **“Nothing {scoped}”** for time-bounded or filtered buckets (today’s schedule, “nothing overdue”)—OK to keep.
- **Avoid** mixing **“No X yet”** and **“Nothing here yet”** on the same entity type across pages; pick one voice per entity family.
- **Periods:** use consistently within a surface (either fragments or full sentences—not random).

---

## 7. Errors

- **User-visible fetch failures:** prefer **“Couldn’t load {thing}”** or **“Couldn’t {verb} {thing}”** (contractions OK for tone).  
- **Reserve** “Failed to load” for logs or if matching API error style—but **standardize** one pattern app-wide per future pass.
- **Actions:** **Try again** (button) is fine; pair with a short message above.
- **404 / not found:** entity-first—“Open house not found”, “Contact not found”—not generic “Not found” when the entity is known.

---

## 8. Success and status

- Use **past tense + specificity**: “Tag created”, “Reminder saved.”
- **Loading:** “Loading…” is acceptable; prefer **“Loading {thing}…”** when multiple loaders on a page.
- **Progress:** use **…** for in-flight button labels (“Saving…”, “Deleting…”) matching existing patterns.

---

## 9. Tone: operational vs explanatory

| Use operational | Use explanatory (sparingly) |
|-----------------|----------------------------|
| Buttons, empty states, errors, toasts | First-time module gates, upgrade cards |
| Tab hints one line | Long `valueProposition` strings repeated on every ClientKeep subpage |
| Sidebar labels | `DashboardContextStrip` when state is complex |

**Upgrade / ModuleGate:** marketing-leaning copy is OK; avoid repeating the same **valueProposition** paragraph on every child route—prefer module-level or link to Settings/Modules.

---

## 10. Short labels vs descriptive copy

- **Navigation (sidebar, tabs):** max ~3 words; no trailing explanations.
- **Buttons:** 1–3 words; use `aria-label` if icon-only.
- **Table actions:** “Rename”, “Delete”, “View contacts”—parallel structure within the table.
- **Descriptive copy** belongs in: subheads under `h1`, card descriptions, empty state body—not in the shell title.

---

## 11. Repeated concepts (glossary)

| Concept | Preferred UI wording | Notes |
|---------|----------------------|--------|
| Saved filter shortcuts | **Saved views** (ShowingHQ chrome); segments are **saved segments** / **Your saved segments** in ClientKeep—don’t call both “saved views” without context |
| Email follow-up queue | **Follow-ups**, **email drafts**, **follow-up drafts**—pick primary term per surface |
| ShowingHQ activity log | **Activity** (sidebar Tools); not a primary tab label unless product changes |
| Property list | **Properties** in PropertyVault context; shell may show **Properties** for `/properties` routes |

---

## 12. Consistency checklist (before merge)

- [ ] Module/product names match `lib/modules.ts`.
- [ ] No shell title duplication of tab label for workspace routes.
- [ ] CTAs use one verb family per action type on that page.
- [ ] Empty state matches entity + voice rules above.
- [ ] Errors use the chosen standard phrase family.
- [ ] “Open house” vs “showing” used correctly.

---

*Last updated: UI copy audit branch. Update when product renames modules or workspace rules change.*

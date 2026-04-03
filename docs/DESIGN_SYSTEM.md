# KeyPilot design system

Source of truth for dashboard UI: layout, typography, color, components, and behavioral rules.  
Stack reference: Next.js App Router, Tailwind CSS, shadcn/ui patterns, Clerk auth shell.

---

## 1. App shell

### Structure

- **Sidebar (module rail):** Fixed left column, full viewport height, branded module navigation. Uses section labels (e.g. OVERVIEW, WORK, SYSTEM) to group items. Active route uses accent treatment consistent with `kp-gold` / module rules.
- **Main column:** Flex column — **top bar (header)** + **scrollable content**.
- **Header:** Sticky or visually pinned at the top of the main column (`z-index` above content). Height must stay consistent app-wide (see `shellTopRowHeightClass` in code) and **match the sidebar header row** pixel-for-pixel (see §2). Do not let page heroes push the global header off-screen without an explicit product decision.

### Sticky behavior

- **Global header:** Remains visible while the user scrolls the **page body** below it.
- **Workspace chrome** (e.g. module-specific tab bars below the global header): May stick below the global bar when specified for that module; avoid double-sticky bars that consume excessive vertical space on laptop viewports.
- **Sidebar:** Does not scroll with page content; it is part of the shell, not the document.

### Content area

- Use `min-h-0` + flex patterns so nested scroll regions (tables, split panes) scroll inside the content frame, not the entire window unexpectedly.
- Default page background: `bg-kp-bg`. Cards and panels: `bg-kp-surface` with `border-kp-outline`.

---

## 2. Frame alignment and header system

This section locks **visual alignment** between the sidebar and main column and defines **title, date, and hero** responsibilities so the shell reads as one frame.

### Top rail height (strict)

- **Same height:** The **sidebar header row** (brand / logo strip) and the **main-column top header** MUST use the **identical** vertical height app-wide — one shared token or class (e.g. `shellTopRowHeightClass` in code).  
- **Do not** tune `py-*`, `min-h-*`, or line-height independently on one side; misalignment between rails is a design defect.

### Sidebar internal structure

- **Fixed top:** Logo / KeyPilot mark. Does not scroll with navigation.  
- **Scrollable middle:** Module switcher and section-grouped nav (OVERVIEW, WORK, SYSTEM, etc.). This region owns vertical scroll when items exceed the viewport.  
- **Fixed bottom:** **Settings** (and other persistent system entries). Stays pinned; does not scroll away with the middle list.

### Logo sizing and prominence

- **Sizing:** Fit the mark within the shared header height without crowding adjacent controls. Typical visual band: mark height roughly `h-7`–`h-9` (adjust for asset aspect ratio).  
- **Prominence:** The logo is **identity**, not ornament — **one** primary mark in the sidebar top; do not duplicate a second logo in the main header.  
- **Behavior:** Logo links to Home (or the org default landing) unless product explicitly routes elsewhere.

### Two-tone module title (shell)

- **Pattern:** For compound **module** names in the shell header, use **two tones**: first segment in **`text-kp-on-surface`** (semibold), second segment in **`text-kp-teal`** (the branded suffix).  
- **Examples:** Showing**HQ**, Property**Vault**, Client**Keep**, Deal**Desk**, Market**Pilot** — accent the part that belongs to the product wordmark, not random words in a sentence title.  
- **Plain page titles** (non-module) may stay single-color unless marketing asks for the same treatment.

### Header hierarchy

- **Dominant:** Module or shell context title — largest type in the bar, semibold, `text-kp-on-surface`.  
- **Secondary:** Date, time, or one-line context — always **visually subordinate**: smaller size (`text-[11px]`–`text-xs`), `text-kp-on-surface-muted` or `text-kp-on-surface-variant`, lighter weight than the title. Never same size/weight as the primary line.

### Consistent date / time (shell)

- **Shell secondary line:** Use **one** canonical pattern: long weekday + calendar date, e.g. **`Weekday, Month D, YYYY`** (`Friday, March 27, 2026`). Prefer **user locale** when rendered client-side to avoid SSR timezone drift (see also §4 Header rules for tables and metadata).

### Hero vs shell (strict)

- **No duplicate module title:** If the app shell header already shows the **module** name (e.g. two-tone ShowingHQ), the **hero must not repeat** that module title. The hero carries **page**, **list**, or **entity** context only (e.g. “All Open Houses”, “123 Main St”, “Schedule showing”).  
- **Exception:** Rare marketing or onboarding layouts approved outside the standard shell — document in the feature spec.

---

## 3. Module naming (canonical)

Use these **customer-facing** names in UI copy, headers, and marketing. Route prefixes may differ until fully aligned.

| Canonical name   | Role (summary)                          | Notes |
|-----------------|------------------------------------------|-------|
| **ShowingHQ**   | Showings, open houses, visitors, prep    | Do not conflate private showings with open houses in copy. |
| **PropertyVault** | Listings / property inventory        | |
| **ClientKeep**  | CRM, contacts, follow-ups, comms         | |
| **DealDesk**    | Pipeline, deals, commissions, closings | Transaction-focused workspace; may appear alongside or instead of generic “Deals” in nav until routes unify. |
| **FarmTrackr**  | Territories, farming, lists              | |
| **TaskPilot**   | Tasks and execution                    | |
| **MarketPilot** | Campaigns / outbound marketing         | |
| **SellerPulse** | Seller-facing reporting / pulse        | |
| **Insight**     | Analytics / performance summaries      | |
| **Home**        | Cross-module home / command center     | |
| **Settings**    | Account, modules, integrations         | |

**Rules**

- **CamelCase product names** in UI: `ShowingHQ`, not `Showing HQ` in titles; subtitles may use plain language (“Showings and open houses”).
- **DealDesk** is the preferred module label for the **deal / transaction** domain in new UI; avoid introducing a third label (“Transactions”, “Deals”, “Deal desk”) on the same surface without a migration plan.

---

## 4. Header rules

### Two-tone title

- **Primary line:** Module or page title — `text-kp-on-surface`, semibold, dominant size for the bar (e.g. `text-lg`–`text-xl` depending on breakpoint). For **compound module names** in the shell, apply the **second-word `kp-teal`** pattern per §2.
- **Secondary line (optional):** Context or date — smaller, muted: `text-[11px]`–`text-xs`, `text-kp-on-surface-muted` or `text-kp-on-surface-variant`. Use the **same long date convention** as §2 for shell “today” lines; client-only if needed to avoid SSR/client timezone mismatch.

### Date / time format

- **Shell / “today” lines:** `en-US` long form is acceptable as default: `Weekday, Month D, YYYY` (e.g. `Friday, March 27, 2026`).
- **Timestamps in tables/metadata:** Prefer short, scannable forms: `MMM D, YYYY` or `MM/DD/YYYY` with optional time `h:mm a` when time matters. Use **consistent timezone policy** (user local vs org default) per surface; document per feature if not global.
- **Relative time** (“2h ago”): Use for activity feeds only; pair with tooltip or secondary line for absolute time when precision matters.

### Actions in header

- Primary actions: right side of header, aligned with tiered button components (`kpBtnPrimary` / `kpBtnSecondary`).
- Destructive or rare actions: secondary placement or overflow menu; never as the only primary gold button.

---

## 5. Hero system

The **hero** is the first structured block below the global header (and below workspace tabs when present).

### Anatomy

1. **Title row:** **Page-, list-, or entity-specific** title only. **Strict:** Do **not** repeat the **module** title shown in the shell header (see §2). When the shell already shows “ShowingHQ”, the hero shows the concrete surface (e.g. property address, list name, form name).
2. **Context line:** One line of state — filters, selection count, record metadata, or last updated. Style: `text-sm` `text-kp-on-surface-variant`.
3. **Tabs (optional):** See §6 — belong in hero or immediately below it, not duplicated in sidebar for the same concern.
4. **Actions:** Primary CTA right; secondary actions as outline buttons or grouped menu.

### Tabs inside hero

- Use when switching **views of the same record or list** (e.g. detail sub-views).
- Keep tab count low (ideally ≤5 visible); overflow becomes a menu.

### Spacing

- Comfortable vertical rhythm: `gap-4` between hero blocks; `mb-4` or `mb-6` before main content.

---

## 6. Tabs system

### Visual language

- **Active tab:** Bottom border or underline in `border-kp-gold`, label `text-kp-gold`.
- **Inactive:** `text-kp-on-surface-variant`, hover `text-kp-on-surface` and subtle border hover.
- **Implement as links** (`<Link>`) when tabs are routes — supports prefetch, shareable URLs, and accessibility (`role="tablist"` / `role="tab"` where appropriate).

### Workspace tabs vs page tabs

- **Workspace tabs** (module level): Span multiple routes under one module (e.g. Showings | Open Houses | Visitors). Live in module workspace chrome.
- **Page tabs** (entity level): Only the current page/record. Do not mirror workspace tabs in the sidebar.

---

## 7. Layout structure (vertical stack)

Standard dashboard page:

```
[ App shell: sidebar | [ header ]
                      [ optional: workspace tab bar ]
                      [ hero: title + context + actions ]
                      [ main content: cards, tables, forms ]
                    ]
```

Rules:

- **One** primary `h1` per view (may be visually styled as large text; screen readers first).
- Do not place a second full-width “header” that competes with the global bar without design review.
- **Filters:** Prefer a single filter row below hero or integrated in hero actions; avoid filter bars on every card fragment.

---

## 8. Typography scale

| Role              | Tailwind / token direction        | Usage |
|-------------------|-----------------------------------|--------|
| Display / module  | `font-headline`, `text-2xl`–`text-3xl` | Marketing moments, rare. |
| Page title        | `text-xl`–`text-2xl`, semibold, `text-kp-on-surface` | Hero. |
| Section title     | `text-base`–`text-lg`, semibold   | Card headers, panel titles. |
| Body              | `text-sm`–`text-base`, `text-kp-on-surface` | Default reading. |
| Secondary / label | `text-xs`–`text-sm`, `text-kp-on-surface-variant` | Field labels, hints. |
| Metadata / table header | `text-xs`, `text-kp-on-surface-muted` | Columns, timestamps. |
| Micro / shell     | `text-[11px]`, `tabular-nums` where needed | Shell date line, KPI micro copy. |

**Font families**

- **Body / UI:** Inter (`font-sans`).
- **Headlines (editorial emphasis):** Newsreader (`font-headline`) — use sparingly for product personality, not dense tables.

---

## 9. Spacing system

Use a **4px grid**; prefer these steps only:

| Token | px  | Use |
|-------|-----|-----|
| 1     | 4   | Tight icon gaps, inline tweaks. |
| 2     | 8   | Default inline/stack gap for dense UI. |
| 3     | 12  | Compact card padding, form field spacing. |
| 4     | 16  | Standard card padding, section gap. |
| 6     | 24  | Section separation, hero padding. |
| 8     | 32  | Major section breaks. |
| 12    | 48  | Page-level breathing room, empty states. |

**Rules**

- Prefer `gap-*` in flex/grid over ad-hoc margins.
- Do not use arbitrary `px` values except for one-off optical alignment (document in code comment if unavoidable).

---

## 10. Color system

KeyPilot uses a **dark operational** palette. All semantic UI should map to **`kp-*` tokens** (see `tailwind.config.ts`).

### Surfaces

| Token | Usage |
|-------|--------|
| `kp-bg` | App background. |
| `kp-surface` | Default cards, panels. |
| `kp-surface-high` | Raised rows, inputs, secondary panels. |
| `kp-surface-higher` | Modals, popovers, menus. |

### Text

| Token | Usage |
|-------|--------|
| `kp-on-surface` | Primary text. |
| `kp-on-surface-variant` | Secondary labels, descriptions. |
| `kp-on-surface-muted` | Table headers, dense metadata. |
| `kp-on-surface-placeholder` | Input placeholders only. |
| `kp-on-surface-disabled` | Disabled states. |

### Accents

| Token | Usage |
|-------|--------|
| `kp-gold` | Primary actions, active nav/tab emphasis. |
| `kp-gold-bright` | Hover on gold elements. |
| `kp-gold-muted` | Subtle gold-tint backgrounds. |
| `kp-teal` | Module links, positive emphasis, interactive accents. |
| `kp-teal-muted` | Teal-tint backgrounds. |
| `kp-chart-teal` | Charts only. |

### Borders

| Token | Usage |
|-------|--------|
| `kp-outline` | Default borders, dividers. |
| `kp-outline-variant` | Softer separators. |

**Accessibility**

- Ensure contrast for text on surfaces; gold on dark is for **accents and large text**; body copy on gold-tint backgrounds should use `kp-on-surface` or dark enough overrides.

---

## 11. Component standards

### Buttons

- **Primary:** Gold fill (`kpBtnPrimary` pattern) — one per region.
- **Secondary:** Outline / surface-high (`kpBtnSecondary`).
- **Tertiary / ghost:** Text or minimal border for low-priority actions.
- **Destructive:** Distinct color treatment (red family) — never use gold for delete.

### Cards

- `rounded-xl` or `rounded-lg`, `border border-kp-outline`, `bg-kp-surface`, padding `p-4`–`p-6`.
- Card title row: flex, title left, actions right.

### Tables

- Header row: `bg-kp-surface-high`, `text-kp-on-surface-muted`, `text-xs`, uppercase optional for column headers.
- Row hover: `hover:bg-kp-surface-high`.
- Zebra striping only if it improves scanability; default is flat with hover.

### Forms

- Labels: `text-sm` `text-kp-on-surface-variant`.
- Inputs: `bg-kp-surface-high`, `border-kp-outline`, focus ring consistent with shadcn focus visible.
- Errors: inline below field; don’t rely on color alone.

### Badges

- Small, `rounded-md` or `rounded-full` for status pills.
- Use semantic pairing: neutral for draft, teal/gold variants for active/success, distinct hue for warning/error.

---

## 12. Behavior rules

### Tabs vs sidebar

- **Sidebar:** Module navigation, cross-page IA, settings entry.
- **Tabs:** Within a module or page for **peer views** of the same context.
- **Never** duplicate the same navigation in both places.

### Empty states

- Illustration or icon optional; **always** include: short headline, one line of guidance, **primary CTA** when an action exists.
- Use `kp-on-surface-variant` for body; keep vertical padding generous (`py-12`–`py-16`).

### Modals

- Use `kp-surface-higher` for modal surface; backdrop darkened.
- Title + short description; primary action right; dismiss explicit (X + cancel).
- Trap focus; return focus on close.

### Loading

- Prefer skeletons inside cards/tables for **structure preservation**; spinners only for small inline actions.

### Toasts / banners

- Success: subtle; errors: persistent until dismissed for blocking issues.

---

## 13. “Do NOT” rules (anti-patterns)

1. **Do not** invent new grays or hex colors outside `kp-*` for dashboard UI.
2. **Do not** use **gold** for body text blocks or long paragraphs.
3. **Do not** mix **sidebar module nav** with a second redundant vertical nav for the same routes.
4. **Do not** label open houses as “showings” or vice versa in user-facing copy.
5. **Do not** add **full-width** rainbow or gradient headers in operational dashboards; keep chrome restrained.
6. **Do not** use **Inter** for every headline when `font-headline` is specified for that surface; don’t use Newsreader in data-dense tables.
7. **Do not** ship **SSR-only** dates that must match the user’s local calendar without a client hydration strategy (timezone bugs).
8. **Do not** place **more than one** primary gold button in a single hero or card footer.
9. **Do not** use `text-kp-on-surface-placeholder` for real labels (placeholders only).
10. **Do not** bypass the app shell for **authenticated** dashboard routes (public/token pages follow separate public layout rules).
11. **Do not** repeat the **module** title in the **hero** when the shell header already shows it (see §2).
12. **Do not** use **different header row heights** for the sidebar brand strip vs the main-column header (see §2).

---

## 14. Public / token surfaces

Authenticated shell rules above **do not** apply to visitor-facing token routes (e.g. feedback by token, host invite). Those pages should feel like **property/event context**, not admin chrome: minimal header, no module sidebar, no Clerk-gated assumptions in layout.

---

*Last updated: design tokens and patterns reflect `tailwind.config.ts` and dashboard shell conventions. Update this doc when tokens or module names change.*

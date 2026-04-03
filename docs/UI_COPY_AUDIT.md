# UI copy audit (KeyPilot dashboard)

Methodical pass over major surfaces **as implemented in the repo** (static review of routes, shared components, and representative pages). **No code changes** in the audit PR—this document drives future copy passes only.

**Audit date:** 2026-04-03  
**Scope:** Authenticated dashboard, sidebar/shell, module hubs, list/empty/error patterns.

---

## 1. Where copy is already strong / consistent

- **Workspace module headers:** ShowingHQ and ClientKeep use **module-only** shell titles; section identity lives in **tabs**—aligned with `docs/DESIGN_SYSTEM.md` intent.
- **ShowingHQ tabs:** Short, parallel nouns—Showings, Open Houses, Visitors, Feedback.
- **ClientKeep tabs:** Contacts, Segments, Follow-ups—consistent length and tone.
- **Upgrade modules** (`lib/upgrade-modules.ts`): Clear headline + description + benefits + CTA; **FarmTrackr** uses “Unlock” vs others “Add”—intentional tier signal (document in style guide if kept).
- **PropertyVault overview:** Snapshot strip + **Add property** CTA + stat cards—scannable.
- **Transactions list:** Status tabs use plain language (“Under contract”, “In escrow”, “Fallen apart”) consistent with domain.
- **Tools rail:** Tasks, Activity, Performance—short labels.

---

## 2. Inconsistencies and overly explanatory copy

### 2.1 ClientKeep

- **Repeated `valueProposition`:** Same long string on multiple `ModuleGate` pages (“Full CRM for contacts, leads, tags…”)—feels heavy when every sub-route repeats it (tags, segments, follow-ups, communications).
- **Tags page:** Mix of **Create tag**, **View contacts**, **Open contacts**—similar navigation goals, different verbs (see style guide: Open vs View).
- **DashboardContextStrip** on tags: explanatory (“scoped to your account…”)—acceptable once; ensure other ClientKeep pages don’t stack similar strips without need.

### 2.2 ShowingHQ

- **Workspace chrome helper:** “Switch areas. Saved views keep filters.”—terse, good; **Saved views** vs ClientKeep **segments** language differs by design but can confuse power users—document in glossary (done in style guide).
- **Supra inbox** (`app/(dashboard)/showing-hq/supra-inbox/page.tsx`): Long **DashboardContextStrip**—appropriate for internal workflow but dense; consider breaking into bullets in UI later.
- **Open house detail / visitor flows:** **Open workspace** appears multiple times—good brand alignment; paired with **View contact**, **View email drafts**—Open/View split (same as ClientKeep).

### 2.3 PropertyVault / Properties

- Shell title **Properties** for `/properties` while module brand is **PropertyVault**—by design for list context, but worth a single product rule (shell vs hero naming).

### 2.4 FarmTrackr

- Large hub page (`app/(dashboard)/farm-trackr/page.tsx`): Many **operational** labels (import mapping, territories)—generally clear; risk of **lengthy inline help** as features grow; prefer progressive disclosure in future passes.
- **Upgrade CTA:** “Unlock FarmTrackr” vs “Add ClientKeep”—consistent with upgrade config, not inconsistent per se.

### 2.5 Transactions / Deals

- **Transactions** module in sidebar vs **`/deals`** route**—**Deals** in shell (`getPageTitle`)—users see two related concepts; copy should clarify relationship on those pages’ heroes (future pass).
- **Metadata** (`transactions/page.tsx`): “Transaction pipeline and commission tracking”—clear; ensure in-page `h1`/hero matches.

### 2.6 Sidebar / shell / headers

- **Platform** vs **Tools** vs **System** section labels—consistent uppercase micro-labels.
- **Insight** child **Performance Dashboard** vs Tools **Performance**—two labels for similar idea; consider aligning (“Performance” + context in `aria-label` if needed).

### 2.7 Empty states

- **“No X yet”** pattern: tags, contacts, segments—good family.
- **“Nothing scheduled” / “Nothing overdue” / “Nothing on the calendar today”**—good for time buckets.
- **“Nothing here yet”** (follow-ups completed section)—slightly different voice than “No drafts waiting”; acceptable if scoped to “done” archive, but document as intentional.

### 2.8 Errors

- Mix of **Failed to load**, **Failed to load {thing}**, **Could not {verb}**, **Try again**—same failure type, different phrasing across files (tags, contacts, transactions, showing forms).

### 2.9 Buttons / CTAs

- **Communications hub** cards: **Open** prefix used consistently for CTAs—good.
- **Add property** vs **Create tag** vs **New** menu items—entity naming differs; acceptable if “Add” = platform object and “Create” = lightweight entity.

---

## 3. Repeated wording problems

| Pattern | Examples | Issue |
|---------|----------|--------|
| Open vs View | Open contacts / View contacts / View email drafts | Same user goal, different verbs |
| Failed vs Could not | Failed to load tags / Could not create tag | Inconsistent error family |
| Nothing vs No | Nothing scheduled / No tags yet | Both OK—scope by list vs calendar |
| valueProposition duplication | Same CRM paragraph on many ClientKeep gates | Noise on deep links |
| “Open house” overload | “Open house” event vs “Open” CTA vs “Open workspace” | “Open” as verb vs noun phrase—usually clear in context; watch new features |

---

## 4. Naming inconsistencies

| Topic | Observation |
|-------|-------------|
| Module vs route title | PropertyVault module vs **Properties** shell title on `/properties` |
| Deals vs Transactions | Sidebar **Transactions**; **Deals** is separate top-level route in shell |
| Insight Performance | **Performance Dashboard** (sidebar child) vs **Performance** (Tools) |
| Follow-up language | Follow-ups tab, follow-up drafts, email drafts—related but not always cross-linked in copy |

---

## 5. Priority cleanup areas by module

| Module | Priority | Notes |
|--------|----------|--------|
| **ClientKeep** | **High** | Gate copy repetition; Open/View CTAs; tags helper strip |
| **Cross-cutting errors** | **High** | Standardize fetch/create/delete error strings |
| **ShowingHQ** | Medium | Supra strip length; Open/View alignment with ClientKeep |
| **Transactions + Deals** | Medium | Clarify relationship in heroes and empty states |
| **PropertyVault** | Low | Shell vs “PropertyVault” naming rule only |
| **FarmTrackr** | Low | Inline help length as features accrete |
| **Insight / Tools** | Low | Performance naming alignment |

---

## 6. Recommended next copy passes (ordered)

1. **Error and retry copy standardization** — Pick one family (“Couldn’t load…”, “Try again”) and apply across `fetch` error handlers and shared `ErrorMessage` usage; no logic changes, strings only.
2. **ClientKeep ModuleGate + CTA verbs** — Deduplicate or shorten repeated `valueProposition`; align **Open** vs **View** for navigation CTAs on tags, communications hub, and related links.
3. **Empty-state voice sheet** — For lists vs time-based buckets, document allowed patterns and align **“Nothing here yet”** vs **“No X yet”** where they refer to the same mental model.

---

## 7. Files / areas sampled (non-exhaustive)

- `components/layout/ModuleSidebar.tsx`, `components/dashboard/DashboardShell.tsx`
- `components/modules/showing-hq/showing-hq-tabs.tsx`, `showing-hq-dashboard.tsx`, `follow-ups-view.tsx`, `showing-hq-dashboard-action-sections.tsx`
- `components/modules/client-keep/client-keep-tabs.tsx`
- `app/(dashboard)/client-keep/tags/page.tsx`, `segments/page.tsx`, `communications/page.tsx`, `follow-ups/page.tsx`
- `app/(dashboard)/property-vault/page.tsx`
- `app/(dashboard)/farm-trackr/page.tsx` (head + patterns)
- `app/(dashboard)/transactions/page.tsx`, `components/modules/transactions/transactions-list-view.tsx`
- `lib/modules.ts`, `lib/upgrade-modules.ts`, `components/shared/ModuleGate.tsx`

---

*This audit is a snapshot; re-run when large modules ship or navigation architecture changes.*

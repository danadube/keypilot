# Feature playbook template — KeyPilot

**When to use this template**

Use this for **modular SaaS features** that should ship **independently**: bounded scope, clear user value, and intentional deferral of heavy backend work. It fits especially well when:

- **URL / query-string state** is (or should be) the source of truth for “what the user is looking at.”
- **v1** can ship with **minimal or no** Prisma schema changes.
- **RLS** and **tenant isolation** must stay correct; new data paths should be **designed before** wide DB writes.
- You want to **record why v1 is small** so future contributors **do not** default to DB, sharing, teams, or permissions prematurely.

Skip or shorten sections that do not apply (e.g. no QA for pure docs). For **large migrations** or **new core entities**, pair this with an ADR and/or a technical design doc.

---

## Recommended section structure

| Order | Section | Purpose |
|------|---------|--------|
| 0 | Title + module | Identify feature and owning surface (e.g. ShowingHQ, ClientKeep). |
| 1 | Changelog summary | External-facing bullets; honest limits. |
| 2 | Internal release note | Expectations, entry points, support risks. |
| 3 | Architecture & constraints | Stack touchpoints, URL grammar, RLS, Prisma. |
| 4 | Non-goals (v1) | Explicit “we are not building yet.” |
| 5 | Why v1 scope is intentionally limited | Anti–overbuild rationale. |
| 6 | QA checklist (preview / regression) | Shippable bar; edge cases. |
| 7 | Merge & release guidance | Preview → merge → comms. |
| 8 | Future v2+ backlog stub | Ticket-ready; start only when justified. |
| 9 | Optional: platform pattern | If this establishes a reusable pattern across modules. |

---

Copy everything below the line into `docs/<module>/<feature>-v1-playbook.md` and replace placeholders.

---

# [Feature name] — [Module] v1 (internal)

> **Replace:** Title. Example: `Saved segments — ClientKeep v1 (internal)`.

## Changelog summary

> **Guidance:** 3–8 bullets. User-visible behavior first. Call out **storage** (DB vs browser vs none), **sync**, and **breaking** expectations. If **no schema/RLS** change, say so explicitly.

**[Module]: [Feature] (v1)**

- …
- …

---

## Internal release note

> **Guidance:** 1–3 short paragraphs. **Who** it’s for, **how** to access it (routes, entry points). Set **support** expectations (data loss, edge cases). One line on **strategic intent** if v1 validates demand before bigger investment.

**[Module]: [Feature] ([persistence model: e.g. browser-only])**

…

**Entry points:** …

…

**Optional one-liner:** *This release [validates X / reduces Y] before investing in [Z].*

---

## Architecture & constraints

> **Guidance:** Keeps engineering aligned. List **only** what this feature touches.

**Canonical state**

- **URL / query grammar:** *Which params? Link to shared helper (e.g. `lib/...`) if any.*
- **Client-only state** (if any): *e.g. search text not persisted — spell out to avoid bugs.*

**Backend**

- **API routes:** `/api/v1/...` — *read/write; Zod validation.*
- **Prisma:** *Models touched; or “none for v1.”*
- **RLS:** *Policies relied on; or “unchanged.” Never bypass with unsafe patterns.*

**Auth**

- **Clerk → app user:** *How `userId` is resolved; public vs protected routes.*

**Stack guardrails**

- Next.js App Router; no unnecessary new frameworks.
- **Independent shippability:** *This PR should not require unrelated module rewrites.*

---

## Non-goals (v1)

> **Guidance:** Bullet list. The most effective anti–overbuild section. Be explicit.

- **Not in v1:** e.g. server persistence, cross-device sync, sharing, teams, admin tooling, analytics, …
- **Not changing:** e.g. RLS policy X, global nav IA, other modules, …

---

## Why ship a limited v1 first

> **Guidance:** 1 short subsection. Contrast **common mistake** (jump to DB, sharing, permissions) vs **this approach** (validate behavior, URL parity, defer complexity). Tie to **KeyPilot** modular product evolution.

**Common mistake:** …

**This v1:** …

---

## QA checklist (preview / regression)

> **Guidance:** Group checks by theme. Include **visibility** (when UI appears), **happy path**, **edge cases** (null vs sentinel, stale IDs, duplicates, limits), **cross-tab** if browser storage, **regression** on untouched APIs. Mark N/A sections.

**Access & surfaces**

- [ ] …

**Core behavior**

- [ ] …

**Edge cases**

- [ ] … *e.g. grammar edge: param A without param B*

**Persistence & lifecycle** *(if applicable)*

- [ ] …

**Regression**

- [ ] Existing routes/APIs still behave: …

---

## Merge & release guidance

### 1. Preview

> **Guidance:** Point to checklist; list 2–5 areas to stress-test.

Run the **QA checklist**. Pay extra attention to: …

### 2. Merge

> **Guidance:** Conditions for merge; “no expansion” if freeze intended.

If preview passes, merge **as-is** / *with only:* …

### 3. Communicate

> **Guidance:** Map doc sections to audiences.

| Audience | Source in this doc |
|----------|-------------------|
| External changelog | Changelog summary (trim) |
| Internal / team | Internal release note + rationale |
| Support | Limits, failure modes, “what to tell users” |

---

## Backlog — [Feature] v2 *(do not build until justified)*

> **Guidance:** Paste into tracking tool as one ticket. **Exit criteria** to start work (usage, revenue, incident volume, product commitment).

**Title:** [Feature] v2 — [short label, e.g. server persistence]

**Description (stub):**

- **Schema / data model:** …
- **RLS:** …
- **Migration / import:** … *e.g. from localStorage key `...`*
- **Lifecycle / edge cases:** … *e.g. deleted FKs, renamed entities*
- **Parity:** *URL grammar + API validation stay aligned (shared helpers).*

**Exit criteria to start v2:** …

---

## Optional: Platform pattern note

> **Guidance:** Only if this feature defines something reusable (e.g. “saved views”, “URL bookmark layer”). Warn against premature abstraction; reference module boundaries.

*Example: Same **URL → optional local → optional DB** ladder might apply to [other surfaces] once each has a **stable query grammar**. Do not build a single mega-framework until two modules prove the pattern.*

---

## Document metadata *(optional)*

| Field | Value |
|-------|--------|
| **Owner** | |
| **Related ADRs / designs** | |
| **Feature branch / PR** | |
| **Supersedes** | |

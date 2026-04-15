# KeyPilot Master Roadmap

**Last updated:** April 15, 2026

## How this file fits with other roadmaps

| Document | Use it for |
|----------|------------|
| **This file** (`KEYPILOT_MASTER_ROADMAP.md`) | **Shipped vs upcoming product work** — **Completed / Shipped**, **NOW**, **NEXT**, priorities, and progress logging. |
| [`docs/platform/keypilot-roadmap-v2.md`](../platform/keypilot-roadmap-v2.md) | **Multi-quarter OS / strategy thesis** — sequencing and positioning when the question is bigger than the current sprint. |
| [`docs/ai-context/ROADMAP.md`](../ai-context/ROADMAP.md) | **Historical phased outline** for AI sessions; cross-check v2 and this master file before treating phase names as current. |

There is no contradiction: **this file wins for “what should we build next week”**; **v2 wins for “how does this quarter fit the five-year OS story”**; **ai-context/ROADMAP** is retained for continuity, not for naming current milestones.

---

## Maintenance Rules

- This file is the **single source of truth** for **product progress, shipped scope, and near-term priorities** in the KeyPilot repo.
- It **must** be reviewed and updated **on every merge to `main`** (and as part of each PR that targets `main`).
- When a feature ships:
  - Add it under **Completed / Shipped** (with enough context to remember what it did).
  - Remove or update related bullets in **NOW**, **NEXT**, **AFTER THAT**, **LATER**, or **IDEAS** so nothing contradicts reality.
- When you discover a new issue, gap, or idea:
  - File it under **NOW**, **NEXT**, **AFTER THAT**, **LATER**, or **IDEAS** according to priority.
- **Do not** let this document drift from the actual product—stale roadmaps are worse than none.

---

## Purpose

This document is the single place to record:

- What has been built (**Completed / Shipped**)
- What is most urgent (**NOW**, **NEXT**)
- What comes after (**AFTER THAT**, **LATER**)
- Ideas, tech debt, and open product decisions

It is both a **progress log** and a **prioritized roadmap**.

---

## Completed / Shipped

### Core architecture & platform

#### Dashboard shell & navigation

- Unified `DashboardShell` across dashboard routes
- Consistent header:
  - Avatar + name
  - Settings / Integrations / Logout
  - **+ New** button (context-aware for ShowingHQ + Open Houses)
- Improved spacing, max-width layout, and alignment
- Fixed inconsistent header rendering across nested routes

### ShowingHQ (core module)

#### ShowingHQ home (operating screen)

- Command-strip layout (heavy hero cards removed)
- Structured sections:
  - **What needs attention** (primary queue)
  - **Today** (calendar context)
  - **Up next** (secondary awareness)
- Priority grouping (now / waiting / upcoming)
- Human-readable task language
- Context-aware CTAs
- Sorting improved for urgency + time
- Reduced duplication between queue and Today
- Passive sections de-emphasized

#### ShowingHQ routing & structure

- `/showing-hq` established as operational center
- Entity workflows:
  - `/showing-hq/showings/[id]?tab=...`
  - `/showing-hq/open-houses/[id]?tab=...`
- Tabs standardized: **Prep**, **Feedback**, **Details**

### Open houses (major refactor)

#### Canonical workspace

- `/open-houses/[id]` redirects to **`/showing-hq/open-houses/[id]`**
- Single source of truth for open house workflow

#### Open house workspace (ShowingHQ)

- Unified layout: header (event context), tabs (Prep / Feedback / Details), quick actions strip
- Removed legacy “at a glance” split layout
- Editable schedule + notes
- Sticky save bar
- Prep checklist integration

#### Prep checklist system

- JSON-backed checklist flags (open houses + showings)
- Derived + manual override support
- UI: interactive toggles, progress indicators, human-readable “missing prep” guidance
- Integrated into: dashboard queue, detail pages, workflow tabs

#### Feedback system (major upgrade)

- Removed modal-only feedback flow; full-page feedback workflow
- Tabs: feedback, email + web form support
- Email ingestion: Gmail reply parsing, matching replies to showings
- Seller feedback integration
- Clear distinction between email replies and web form submissions

#### Supra / Gmail automation

- Gmail integration: import runs, deduplication, status tracking
- Supra queue processing
- Related settings surfaced under **`/settings/integrations`**

### Host console (open house execution)

#### New host console

- `/open-houses/[id]/sign-in` is the **Host Console** (agent-facing)
- Replaced incorrect “host sign-in” mental model

#### Host console features

- Event states: **Scheduled**, **Live**, **Complete**
- Primary action: **Start Open House** (when scheduled)
- Action hierarchy:
  - **Primary:** open visitor sign-in, copy link
  - **Secondary:** tablet mode, print QR, invite co-host
- Live stats: visitors, follow-ups, seller report status
- Time-aware UI: countdown / elapsed, status colors, live pulse

#### Visitor / tablet separation

- Public visitor sign-in: **`/oh/[slug]`**
- Tablet mode: **`/open-houses/[id]/sign-in/tablet`**
- Clear separation from agent workflow

#### Open house support surfaces

- Shared frame: **`OpenHouseSupportPageFrame`**
- Consistent back links, layout, context headers
- Applied to: visitors, follow-ups, seller reports, sign-in, print pages

### UI / UX

- Removed duplicate headers and conflicting page titles
- Standardized card styles, button language, section hierarchy
- Context-aware CTAs and dynamic row language
- Improved spacing and density
- Fixed avatar/header inconsistencies, sidebar alignment, command strip duplication

### Backend & data

#### Prisma & RLS

- Migrated routes to `withRLSContext`
- RLS policies (e.g. `supra_gmail_import_settings`)
- User scoping; avoid `prismaAdmin` leaks in user routes

#### Email reply ingestion

- Gmail API integration
- Matching logic (email, subject, address, time windows)
- Stored: raw reply, parsed content, metadata

#### Validation & API

- Safe PATCH handling, null-safe JSON updates
- Fixed `prepChecklistFlags` null spread issue
- Integration tests and schema validation improvements

---

## NOW (Critical / Immediate)

### 1. Token-based public access (critical)

- **Verify** `/host/[token]` and `/feedback/[token]` work **without** Clerk authentication for intended users.
- **Update middleware** (or document intentional auth) if gaps are confirmed.

---

## NEXT (High Priority)

### 2. Agent invite → scoped access

- Secure deep links to the right surface (e.g. host console)
- Restrict to a single open house and limited capability
- Prevent accidental access to the full app for invited roles

### 3. Follow-ups model (major)

- Resolve **global** vs **per-open-house** follow-ups.
- Choose: **one unified queue** OR **clearly scoped systems** with explicit IA.
- Align UI, copy, and navigation to that decision.

### 4. ShowingHQ home (flagship)

- Strengthen “what needs attention”: priority clarity, action language.
- Ensure it clearly feels like the **starting point** for daily work.

---

## AFTER THAT

### 5. Deals navigation gap

- Add **Deals** to the Transactions sidebar (or equivalent discovery).

### 6. ClientKeep sidebar

- Expand sidebar entries **or** formally document the minimal model and how users discover tabs.

### 7. Open house editing (important)

- Make key fields editable in workspace: date/time, notes, hosts, flyer, status.
- Prefer inline editing where it speeds workflow.

---

## LATER

8. **PropertyVault vs properties** alignment (orientation and IA).

9. **Open houses list** consolidation under ShowingHQ (or stronger “manager vs workspace” framing).

10. **Module naming** consistency across shell, sidebar, and marketing language.

11. **Placeholder modules** cleanup (coming-soon vs hidden vs gated).

---

## IDEAS

- Command palette
- Role-based UI
- Offline tablet mode
- Notification center
- Event readiness score
- Smart priority engine

---

## Tech debt

- Route → module mapping fallback (`getModuleFromPath`) for unknown URLs
- ESLint `exhaustive-deps` warnings
- Duplicate UI component systems (consolidate over time)
- Public route catalog documented and kept in sync with `middleware.ts`

---

## Open questions

- Should `/host/*` and `/feedback/*` be fully public?
- Global vs scoped follow-ups—final decision?
- Should `/open-houses` (list) eventually move entirely under ShowingHQ?
- How should **Deals** be positioned relative to **Transactions** in the product story?
- Is ClientKeep’s minimal module sidebar intentional long-term?

---

## Summary

### Top priorities

1. Fix / validate **token-based access** for host and feedback links.
2. Implement **scoped agent invite** flow with correct surfaces and permissions.
3. **Unify or clearly separate** the follow-ups model end-to-end.
4. Keep strengthening **ShowingHQ home** as the daily command center.

### Product direction

KeyPilot has moved from fragmented tools toward **unified workflows** (ShowingHQ as center of gravity, canonical open house workspace, host console, aligned support surfaces).

**Next phase:** cohesion, clarity, and **real-world usability** (invites, token flows, queue clarity, and fewer competing mental models).

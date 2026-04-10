# Transactions module — v1 product and engineering spec

**Status:** Draft for implementation planning  
**Module:** Transactions  
**Audience:** Product, engineering, QA

This document defines **Transactions v1** for KeyPilot: scope, object model, UX surfaces, security posture, and success criteria. It aligns with [`docs/platform/keypilot-roadmap-v2.md`](../platform/keypilot-roadmap-v2.md) as the strategic source of truth. Customer-facing milestone framing lives in `/roadmap` and `lib/roadmap/keypilot-roadmap-data.ts`. [`docs/ai-context/ROADMAP.md`](../ai-context/ROADMAP.md) is historical and supplementary only.

---

## Overview

**Transactions** is KeyPilot’s operational transaction management layer. It is not accounting software, a general ledger, or a payout engine. It exists so agents and small teams can **see deal progress, key dates, required work, and high-level economics** in one place—without replacing their brokerage’s financial systems.

Transactions sits alongside **Pipeline** (stage-oriented deal flow) and **TaskPilot** (global accountable work). v1 emphasizes **action-first surfaces**, a **unified buyer/seller model**, **fixed stages**, **structured checklists** with optional links into TaskPilot, and **signals** that will feed **Command Center** (closing pressure, missing checklist items).

---

## Why this exists

Real estate deals fail or stall from **dropped follow-ups, unclear ownership, and invisible dates**—not from missing a CRM field. Spreadsheets and inbox threads do not answer “what needs attention on this deal today?” at a glance.

Transactions v1 closes that gap by:

- Giving every in-flight deal a **single operational home** in KeyPilot (identity, timeline, checklist, key dates, rough commission picture).
- Making **next actions** obvious: complete checklist items, advance stage, or spawn a TaskPilot task when work leaves the checklist.
- Producing **machine-readable signals** (dates, completion gaps) for Command Center without pretending to be back-office accounting.

---

## Product principles

Transactions v1 inherits KeyPilot OS principles from the roadmap and applies them concretely:

| Principle | Transactions v1 expression |
|-----------|------------------------------|
| **Action > Data** | List and detail surfaces prioritize “do this next” over exhaustive fields; empty states drive creation and triage. |
| **Timeline > Tabs** | Center column leads with **timeline + milestones**; checklist is work, not a separate product silo. |
| **What should I do next?** | Attention badges on list rows; checklist completion and due proximity on detail; optional task creation from checklist rows. |
| **Fast workflows** | Create/edit are short forms with progressive disclosure; stage changes are one primary path, not buried settings. |
| **Premium UX** | Three-column detail layout (identity / work / context), consistent with Client HQ–style operational density—not a bare table CRUD app. |

---

## V1 scope

- **Unified transaction model** for buyer and seller sides, distinguished by `transactionType`: `BUY` | `SELL`.
- **Fixed lifecycle stages** (v1): Active, Under Contract, Pending, Closed (customization deferred).
- **Core associations:** client/contact, property (address-first), optional links to pipeline/deal concepts where the product already supports them (implementation follows existing Deal/Pipeline patterns—no parallel truth).
- **Structured checklist** per transaction: ordered items, completion state, optional due dates, notes as needed for v1.
- **TaskPilot integration:** checklist items may **create linked tasks**; TaskPilot remains the system of record for tasks; Transactions does not duplicate task execution UI.
- **High-level commission fields:** base commission, agent split %, brokerage split %, optional referral fee (no allocation engine, no trust accounting).
- **Activity/timeline:** transaction-scoped activity consistent with platform patterns (notes, stage changes, checklist completions, linked task events where available).
- **Command Center signals (v1):** “closing date approaching” and “missing checklist items” exposed in a way consumable by Command Center or shared attention components (exact wiring follows Command Center schedule).
- **Tenant-safe data access:** all reads/writes respect RLS; no `prismaAdmin` shortcuts in user flows.

---

## Non-goals

- **Trust accounting**, escrow ledgers, or bank reconciliation.
- **Invoicing**, billing, or merchant-of-record flows.
- **Payout / disbursement engine** or multi-party settlement logic.
- **Full back-office accounting** or tax reporting.
- **Advanced split engine** (caps, team splits, sliding scales, brokerage-specific rules).
- **Heavy document management** (versioning, compliance packets, e-sign as primary surface)—may link out or defer to future Transactions & Forms roadmap items.
- **Automation builder** in v1 (triggers, drip, cross-module rules).
- **Schema sprawl:** no speculative tables/fields “for later” without a named phase.
- **Unsafe patterns:** bypassing RLS, using elevated Prisma clients in authenticated routes, or cross-tenant reads for convenience.

---

## Core object model

Conceptual relationships (Prisma remains source of truth; names may map to existing `Transaction`, `Deal`, `Contact`, `Property`, `Task`, `Activity` models as implemented).

### Transaction

The primary aggregate. Represents one deal thread in KeyPilot: who, what property, buy vs sell, stage, key dates, rough economics, checklist, and timeline.

### Contact / client linkage

Each transaction links to at least one **primary client/contact** (ClientKeep). Additional participants (co-client, attorney) may be v1 optional or phase-2 depending on schema; v1 must not block on perfect party modeling.

### Property linkage

Link to a **Property** record when one exists; otherwise capture **display address** fields sufficient for operational clarity (align with existing property/contact patterns—avoid orphan duplicates when MLS/property sync exists).

### Checklist items

**Child records** (or normalized checklist rows) owned by the transaction. They are **structured operational steps**, not free-floating tasks. Completion is tracked here first.

### Linked tasks

When a checklist item needs accountable work outside the checklist (follow-up, third party, multi-step work), the user may **create a TaskPilot task** linked to that checklist item (and typically to the same contact/property). The checklist row remains the **deal-specific definition of done**; TaskPilot holds **assignee, due date, and global task UX**.

### Timeline / activity

**Activity** entries (and/or unified timeline events) attach to the transaction for auditability: stage changes, checklist completions, notes, commission field updates (sensitive copy should stay minimal), and references to linked tasks when the platform emits those events.

**Why this separation works:** Checklist = “what the deal requires.” TaskPilot = “who does what by when across the OS.” Linking avoids two competing task lists while keeping TaskPilot global.

---

## Core fields

### Required baseline (v1)

| Field | Intent |
|-------|--------|
| **Client / contact** | Primary party for the deal (FK to contact). |
| **Property address** | At minimum structured or single-line address for scanning lists; property FK when available. |
| **transactionType** | `BUY` or `SELL`. |
| **Price** | Contract or target price per product rules (document assumption in UI helper text if ambiguous). |
| **Commission (high level)** | Base commission amount or rate per chosen product convention—single coherent approach in v1, not multiple competing fields. |
| **Close date** | Target or actual close; drives “approaching” signals. |
| **Status / stage** | One of the fixed v1 stages (see below). |

### Optional / secondary (v1)

- Referral fee (amount or simple flag + amount—pick one convention in implementation).
- Agent split %, brokerage split % (percent fields; no derived payout).
- Contract / acceptance dates if distinct from close (if schema already supports; otherwise defer to phase 2).
- Internal notes (short; not a document vault).
- Tags or labels only if shared primitives already exist—avoid one-off taxonomy.

---

## Stages and lifecycle

**v1 stages (fixed):**

1. **Active** — Pre-contract pursuit; offer possible.
2. **Under Contract** — Mutual acceptance / executory period (wording in UI should match brokerage-neutral language).
3. **Pending** — Late-stage conditions clearing toward close (use if product needs tri-state before closed; if redundant with Under Contract in some markets, still keep enum stable—copy can clarify).
4. **Closed** — Terminal success state.

**Rules:**

- Transitions are **forward-permitted** according to product rules; backward transitions (error correction) may be allowed with confirm pattern—exact rules in implementation ticket.
- **Customization** of stage names and order is **explicitly out of scope for v1**; store as enum or controlled vocabulary so migration to configurable stages is possible later.

---

## Checklist architecture

### Structured checklist items

- Checklist items belong to a **single transaction**, have a **stable order**, and support **complete / incomplete** state.
- Optional: **due date** per item for lightweight operational pressure (not a replacement for TaskPilot SLAs).

### Creating linked TaskPilot tasks

- From a checklist row, user action: **“Create task”** (or equivalent). Creates a task with links to contact/property/transaction as supported by TaskPilot.
- Checklist item stores a **reference to the created task** when linkage is supported; if task is completed in TaskPilot, checklist may auto-complete or surface “confirm complete”—product choice in implementation (avoid silent double-truth; prefer explicit completion on checklist or a clear sync rule).

### Avoiding duplication with TaskPilot

- **Do not** mirror TaskPilot’s full feature set inside Transactions.
- **Do** use the checklist for **deal-specific, repeatable steps** and TaskPilot for **work assignment and cross-deal workload**.
- Copy should teach users: checklist = **deal requirements**; tasks = **work queue**.

---

## Core workflows

### Create transaction

Fast create: required fields only; optional economics and dates collapsible; land user on **detail** with checklist template or empty checklist prompt.

### Review transaction

Open detail: immediately see **stage**, **close date**, **checklist progress**, and **recent timeline** entries.

### Update stage

Primary control in detail (and quick action from list where safe). Log stage change to timeline; refresh Command Center–relevant signals.

### Complete checklist items

Inline completion; optional note; emits timeline event; clears “missing item” signal when all required items for a bucket are done (define “required” vs optional items if both exist in v1—default all items required unless marked optional in UI).

### Create task from checklist item

User initiates; prefilled title from checklist label; user adjusts assignee/due in TaskPilot create flow; return path to transaction preserved.

### Identify at-risk transaction

Heuristics v1: **close within N days** with incomplete checklist; optionally **stage stuck** beyond threshold (phase 2 if not trivial). Surface on list and/or Command Center feed.

### Prepare Command Center signals

Emit stable identifiers or shared selectors for: **closingSoon(transactionId, closeDate, window)** and **incompleteChecklist(transactionId, counts)**. Implementation may be shared hooks or server aggregations—spec stays API-agnostic.

---

## Screens

### Transactions list

**Purpose:** Triage and motion—not a passive archive.

**Must include:**

- **Filters** canonical in URL (stage, type, attention-only, date window). Shareable and restorable.
- **Row signals:** stage chip, close date, type (Buy/Sell), **attention** (e.g. overdue checklist, close soon).
- **Quick actions:** open detail, change stage where safe, add task (if global pattern exists).
- **Empty / zero:** drive to create; explain value in one line.

### Transaction detail

**Layout:**

- **Left — Identity and summary:** client, property, type, price, stage, close date, high-level commission summary (read-friendly).
- **Center — Work area:** timeline first or co-equal with checklist (product decision: default tab/section is **work**—checklist + milestones + timeline in one scroll if possible).
- **Right — Context:** contacts, property card/link, related TaskPilot tasks, **signals** (closing soon, checklist gaps).

Use existing KeyPilot **premium operational** density: clear hierarchy, not a wall of fields.

### Create/edit flow

Modal or dedicated lightweight page; **progressive disclosure** for splits and referral. Save keeps user in context (detail or list) per existing patterns. Validation messages short and specific.

---

## URL and state rules

- **List filters and sort** belong in **search params** where the app already does so for other modules; avoid duplicating filter state only in React state.
- **Deep links** to a transaction detail should be stable: `/transactions/[id]` (exact path follows app routing conventions).
- **Avoid drift:** opening the same filtered list URL in a new tab should reproduce the same rows.
- **Prefer existing primitives** (saved views, segments) only when shared infrastructure exists; v1 may ship without saved views if not ready—do not invent a parallel system in module-local storage.

---

## Data and API considerations

High-level alignment with the stack:

- **Next.js Route Handlers** under `app/api/v1/...` for JSON APIs; **Zod** validation on inputs; **Clerk** auth on private routes.
- **SWR** (or existing data hooks) for list/detail with **revalidation** on mutation; optimistic updates only where patterns already exist and edge cases are bounded.
- **Pagination** for transaction lists; **cursor or offset** per existing list standards.
- **Modular services** in `lib/`: transaction service functions called by route handlers, not fat handlers.
- **No DB access from client components** beyond established hook patterns.

---

## RLS and security considerations

- **RLS is mandatory** for tenant-scoped data. Use `withRLSContext` (or current equivalent) for authenticated user flows—see [`docs/RLS_ARCHITECTURE.md`](../RLS_ARCHITECTURE.md).
- **Never** use `prismaAdmin` (or BYPASSRLS roles) to “simplify” user routes.
- **Transactions must remain tenant-safe:** ownership via `userId` or organization model per current KeyPilot multi-tenant rules; no cross-user reads.
- **Linkages** (contact, property, task) must respect **access boundaries**: if a linked entity is not visible to the user, API should fail closed or redact consistently—no leaking via join shortcuts.
- **Audit-sensitive fields** (commission) should avoid verbose exposure in activity logs if that increases misuse risk; log factual changes without unnecessary narrative.

---

## Tiering

Per roadmap-style entitlements (`FOUNDATION` vs `CONTROL`):

- **Transactions** supports the **financial control / deal operations** story and aligns with **CONTROL** positioning in the illustrative module matrix, while **FOUNDATION** may include a subset (e.g. limited transaction count or read-only—exact entitlement follows [`docs/decisions/ADR-0002-single-app-product-tier-gating.md`](../decisions/ADR-0002-single-app-product-tier-gating.md) and live billing schema).

Product copy should not promise accounting features; tier messaging should emphasize **deal oversight and execution**, not ledger features.

---

## Command Center tie-ins

v1 should **produce**, not only display internally:

- **Closing date approaching:** configurable threshold (e.g. 7 / 14 days) with stable signal payload.
- **Missing checklist items:** count of incomplete required items; optionally list top N labels for preview.

Future Command Center work can subscribe to the same signal sources without reshaping Transactions.

---

## Success criteria

**Product**

- Users can create a transaction in under **two minutes** for the happy path.
- List view answers **“what needs attention?”** without opening each row.
- Checklist + TaskPilot link covers **“I need someone to do something”** without duplicate task systems.

**Engineering**

- All transaction APIs pass auth + validation and use **RLS-enforced** DB access.
- No new bypass patterns; DB migrations reviewed for policy coverage.
- List/detail pages meet baseline performance with pagination and lean payloads.

**Quality**

- QA checklist (below) passes for release.

---

## Dependencies

| Area | Dependency |
|------|--------------|
| **TaskPilot** | Task creation API and linking model for checklist-derived tasks. |
| **ClientKeep / Client HQ** | Contact resolution, primary client display, deep links. |
| **Pipeline** | Optional association or conversion from deal → transaction; avoid duplicate conflicting stage semantics—coordinate naming in integration tickets. |
| **Command Center** | Consumes signals; Transactions should not hard-code Command Center UI inside module routes. |
| **PropertyVault** | Property linkage when listing/property records exist. |

---

## QA checklist

### Product

- [ ] Create, edit, and archive/close flows match v1 scope (no accounting features exposed).
- [ ] Buy vs Sell is obvious on list and detail.
- [ ] Fixed stages behave consistently; Closed is terminal unless product allows reopen with confirm.
- [ ] Checklist completion updates timeline and attention signals.
- [ ] Task creation from checklist pre-fills context and returns user to transaction without data loss.
- [ ] Command Center signals (if wired) match detail state (close window, checklist counts).

### Engineering

- [ ] Private routes require Clerk session; unauthenticated access rejected.
- [ ] APIs validate input with Zod; malformed requests do not touch DB.
- [ ] All Prisma operations in user context use RLS path; grep review for forbidden clients in route code.
- [ ] RLS policies exist for any new tables/columns; migrations applied and tested in staging.
- [ ] Pagination works; no unbounded list queries.
- [ ] SWR/cache revalidates after mutations; no stale detail after stage change.

### Security

- [ ] User A cannot read or mutate user B’s transactions (spot-check with two accounts).
- [ ] Linked contact/property respects visibility rules.
- [ ] No secrets or service-role keys in client bundles.

---

## Open questions

- **Stage semantics:** Market-specific naming for “Under Contract” vs “Pending”—single US-neutral copy vs locale later?
- **Checklist templates:** Per user, per org, or global defaults in v1?
- **Deal ↔ Transaction:** Mandatory link to Pipeline deal or optional parallel record?
- **Price field:** One “contract price” vs separate list/contract—single field for v1?
- **Task ↔ checklist sync:** Auto-complete checklist when task completes, or manual confirmation only?

These should not block v1 scaffolding if defaults are documented in implementation tickets.

---

## Phase 2 follow-ups

- **Customizable stages** and pipeline alignment per team.
- **Richer commission modeling** (team splits, caps) without becoming accounting.
- **Automation hooks** (stage transitions trigger tasks or messages).
- **Deeper reporting** (conversion, cycle time, GCI rollups).
- **Document workflows** and e-sign status surfacing (coordination with Transactions & Forms roadmap).
- **Risk scoring** and predictive Command Center (roadmap Phase 10 alignment).

---

## Related documents

- [`docs/platform/keypilot-roadmap-v2.md`](../platform/keypilot-roadmap-v2.md)
- [`docs/RLS_ARCHITECTURE.md`](../RLS_ARCHITECTURE.md)
- [`docs/CONTENT_STYLE_GUIDE.md`](../CONTENT_STYLE_GUIDE.md) (module naming: Transactions vs Deals)

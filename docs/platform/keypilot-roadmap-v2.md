# KeyPilot Roadmap v2

**Strategic source of truth** for **multi-quarter / OS-level** product and engineering planning (KeyPilot as a real estate operating system). Use this when deciding **sequencing and positioning** across modules—not for week-to-week shipped vs not-shipped detail.

**How this relates to other docs:**

| Document | Role |
|----------|------|
| **This file (v2)** | Long-horizon **thesis and phased OS plan** (Cursor- and exec-friendly). |
| [`docs/product/KEYPILOT_MASTER_ROADMAP.md`](../product/KEYPILOT_MASTER_ROADMAP.md) | **Near-term truth** — what shipped, **NOW / NEXT**, tech debt tied to releases. **Prefer this for sprint-level work.** |
| In-app **`/roadmap`** | Customer-facing milestone view (product marketing / narrative). |
| [`docs/ai-context/ROADMAP.md`](../ai-context/ROADMAP.md) | **Historical** phase labels for long-running AI context; **not** the live priority list. |

**Scope:** Post RealOffice360 analysis — Cursor- and dev-friendly phased plan.

---

## Product positioning

KeyPilot is not a CRM.

KeyPilot is:

> **The real estate operating system — where every client has a live command center.**

---

## Core principles

- Action over data
- Timeline over tabs
- Communication unified (text + email + call)
- Every screen answers: **What should I do next?**
- Fast, low-friction workflows (two clicks max where possible)

---

## RealOffice360 learnings (adopted and adapted)

### Adopted (directly)

- Clean sidebar + module navigation
- Simple pricing (two tiers)
- Google import flow (multi-account, tag mapping)
- Settings structure (Profile, Pipeline, Integrations)
- Action dropdown pattern
- Command-style dashboard widgets
- Voice-to-text input

### Adapted (improved)

| Source idea | KeyPilot direction |
|-------------|-------------------|
| Contact page | **Client HQ** |
| Timeline | **Unified conversation** |
| Dashboard | **Command Center** |
| Transactions | **Financial control layer** |
| Voice | **Structured intelligence (AI parsing)** |
| Import | **Smart mapping + cleanup** |

---

## Phase 0 — Foundation

**Goal:** Establish system architecture and entitlement model.

### 0.1 Core stack

- Next.js 14 (App Router)
- Supabase (DB + RLS)
- Prisma
- Clerk (auth)

### 0.2 Core models

User, Contact, Deal, Task, Activity, Property, Transaction (conceptual — align with Prisma as source of truth in repo).

### 0.3 Product tiers

Illustrative entitlement shape (implement per actual schema / billing):

```ts
productTier: "FOUNDATION" | "CONTROL";

moduleAccess: {
  contacts: boolean;
  pipeline: boolean;
  transactions: boolean;
  showingHQ: boolean;
  automation: boolean;
  voice: boolean;
  texting: boolean;
};
```

### 0.4 Branch (reference)

`feature/foundation-core`

---

## Phase 1 — Core system (Foundation tier)

**Goal:** Replace baseline CRM functionality.

### 1.1 Contacts → ClientKeep

Replace the traditional contact page with **Client HQ** (core screen).

**Layout (conceptual)**

- **Left:** Identity, status, actions (Text / Call / Email / Task)
- **Center:** Unified timeline (messages + activity)
- **Right:** Deal context, property, alerts, automations

### 1.2 Unified timeline system

Single feed combining:

- Text messages
- Emails
- Calls
- Notes
- Tasks
- Showings

### 1.3 Pipeline

- Deal stages
- Buy / sell pipelines
- Stage transitions

### 1.4 Transactions (core)

**Purpose:** Track deals → revenue.

**Features**

- Transaction list and detail
- Commission tracking
- Deal → transaction conversion

**Data shape (illustrative)**

```text
Transaction {
  contactId
  propertyId
  dealType
  status
  contractDate
  closeDate
  price
  commissionGross
  commissionNet
}
```

### 1.5 Tasks

- Task creation
- Due dates
- Contact linking

### 1.6 Google import

**Flow**

1. Connect Google (any account)
2. Select contacts
3. Select tags
4. Map to groups
5. Import

**Enhancements**

- Preview before import
- Tag → group mapping
- Save import presets (later)

---

## Phase 1.5 — Pricing and entitlements

**Pricing model (illustrative ranges)**

| Tier | Price (indicative) | Includes |
|------|---------------------|----------|
| **FOUNDATION** | $15–19/mo | Contacts, Pipeline, Tasks, Import, Notes |
| **CONTROL** | $29–49/mo | ShowingHQ, Automation, Voice intelligence, Texting, Command Center, Smart actions |

**Trial:** 14-day trial, no credit card required (product decision).

---

## Phase 1.6 — User preferences

**Startup page selection**

User can choose:

- Command Center
- Dashboard
- Calendar
- Contacts
- Pipeline

**Option:** Last visited page.

---

## Phase 2 — Command Center

**Dashboard evolution:** Replace a static dashboard with **Command Center**.

**Sections**

- Follow-ups
- Tasks
- Deals needing attention
- Upcoming events
- Alerts

**Enhancements**

- Priority sorting
- Click → drill down
- Inline preview
- Quick actions

---

## Phase 3 — Client intelligence

**Insight fields**

- Needs, urgency, motivation, expectations, resources, authority

**Voice input**

- **V1:** Speech → text
- **V2:** Auto-structure into fields

**Timeline integration:** Voice entries logged as `[VOICE NOTE]` (or equivalent product convention).

---

## Phase 4 — Communication system

**Email**

- Templates
- Gmail integration

**Texting**

- **V1:** Twilio number; intro message to reduce confusion
- **V2:** Agent number support

**Unified conversation:** Merge text, email, and call into a single **conversation thread**.

---

## Phase 5 — Automation

- Drip campaigns (follow-ups, birthdays, anniversaries)
- Smart triggers (e.g. no reply → follow-up; showing complete → feedback request)

---

## Phase 6 — Action system

**Global actions dropdown**

- Import, Export, Labels, Reports, Settings

**Floating action button**

- Add contact, add deal, add task

---

## Phase 7 — Settings

**Structure**

- Profile, Subscription, Email, Contacts, Pipeline, Notifications, Integrations

**Integrations**

- Google, Mailchimp, Zapier, API keys

---

## Phase 8 — ShowingHQ

**Core differentiator**

- Showing tracking
- Feedback collection
- Daily operating screen

(Align module boundaries with existing KeyPilot: private showings vs open houses.)

---

## Phase 9 — UX polish

**Adopt**

- Simple onboarding, clear descriptions, low-friction UI

**Improve**

- Premium visual system
- Consistent spacing and hierarchy

---

## Phase 10 — AI / OS layer

- Smart suggestions (“Follow up with X”, “Deal at risk”)
- Predictive Command Center
- Full automation engine

---

## Priority order

**First (now)**

- Contacts (Client HQ)
- Pipeline
- Transactions
- Google import
- Command Center (basic)

**Second**

- Voice input
- Actions system
- Settings system

**Third**

- Texting
- Automation
- ShowingHQ expansion

---

## Closing note

KeyPilot is not building “a better CRM” in the abstract. The bet is a **system that captures, understands, and acts on relationships in real time** — with module boundaries and data integrity enforced in product and schema.

---

## Related docs

- [`docs/ai-context/ROADMAP.md`](../ai-context/ROADMAP.md) — historical phase labels (Open House MVP → automation) for AI and long-tenure context
- In-app **Roadmap** (`/roadmap`) — milestone chips and customer-facing sequencing

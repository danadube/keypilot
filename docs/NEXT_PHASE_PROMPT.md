# Next phase prompt

**Quick prompt:** Type **`next`** in Cursor to auto-advance to the next logical engineering task.

**Before acting:** Read **[`docs/product/KEYPILOT_MASTER_ROADMAP.md`](product/KEYPILOT_MASTER_ROADMAP.md)** (priorities + shipped vs upcoming) and **[`docs/project-context.md`](project-context.md)** (product rules). Use **[Documentation hierarchy](#documentation-hierarchy)** so AI and humans agree which file wins.

---

## What exists today (do not greenfield)

KeyPilot is a **ShowingHQ-first** production app: **Next.js 14 (App Router)**, **TypeScript**, **Clerk**, **Prisma + PostgreSQL (Supabase)**, **REST** under `/api/v1`, **Vercel**. Zod on API inputs and Prisma as the DB access layer are established patterns.

**Representative shipped surfaces** (non-exhaustive):

| Area | Notes |
|------|--------|
| **ShowingHQ** | `/showing-hq` — showings, open-house workspace, visitors, Supra queue, follow-ups, templates, saved views, feedback, activity. |
| **Open houses** | Public `/oh/[slug]`; host/feedback/flyer token flows; dashboard open-house list and detail. **Private showings ≠ open houses** (see `project-context.md`). |
| **PropertyVault** | `/properties`, `/property-vault/overview`, media/documents. |
| **ClientKeep** | `/contacts`, `/client-keep/*` — CRM surfaces; tier-gated fields and behaviors. |
| **Transactions (TransactionHQ)** | `/transactions/*` — pipeline, detail, commissions, checklist, imports. CRM **deals** remain at `/deals` and link into this layer where modeled. |
| **FarmTrackr** | `/farm-trackr` — territories, areas, imports, memberships, mailing/labels (respect API tier gates). |
| **TaskPilot** | `/task-pilot` — task workspace backed by `/api/v1/tasks`. |
| **Calendar / command center** | Calendar APIs and dashboard scheduling surfaces (not necessarily a standalone top-level “Calendar” product). |
| **Daily briefing** | Settings + APIs + cron paths for scheduled email. |
| **Settings** | Account, connections, automation, AI, modules, branding, integrations, daily briefing. |

If a prompt says to “build the MVP” for any of the above, **extend the existing implementation** instead of generating parallel scaffold trees.

---

## How to choose work

1. **`docs/product/KEYPILOT_MASTER_ROADMAP.md`** — **NOW / NEXT / AFTER THAT** and **Completed / Shipped**: default source for **what to do next**.
2. **`docs/APP_STATE_AUDIT.md`** — **Module maturity** and known gaps; re-stamp after large merges to `main`.
3. **`docs/platform/keypilot-roadmap-v2.md`** — **Multi-quarter OS thesis** when the question is strategic sequencing, not this week’s bug list.

---

## Example `next` prompts (adapt to roadmap)

**Bug fix / polish**

> Fix [issue] in [area]. Preserve ShowingHQ vs open house boundaries per `docs/project-context.md`. Add or adjust tests if behavior is user-visible.

**Roadmap-driven feature**

> Implement the top item under **NOW** in `docs/product/KEYPILOT_MASTER_ROADMAP.md` (quote the bullet). Follow existing API + UI patterns; do not bypass Prisma.

**Tech debt**

> Address the listed item in the master roadmap tech-debt / **AFTER THAT** section for [area], without unrelated refactors.

**Database / Prisma (only when roadmap or ticket explicitly requires it)**

> Follow `docs/platform/database-migrations.md`. Any schema migration must be deployable with **`npx prisma migrate deploy`** on each environment after review.

---

## Documentation hierarchy

| Document | Role |
|----------|------|
| [`docs/product/KEYPILOT_MASTER_ROADMAP.md`](product/KEYPILOT_MASTER_ROADMAP.md) | **Product progress and priorities** — what shipped, what is **NOW / NEXT**. |
| [`docs/platform/keypilot-roadmap-v2.md`](platform/keypilot-roadmap-v2.md) | **Strategic OS roadmap** — phased thesis for the platform as an operating system. |
| [`docs/ai-context/ROADMAP.md`](ai-context/ROADMAP.md) | **Historical** phased outline; useful for long-running context; **cross-check v2 + master roadmap** for direction. |
| [`docs/project-context.md`](project-context.md) | **Canonical product-rules brief** (modules, showings vs open houses, UX posture). |
| [`docs/ai-context/CURRENT_STATE.md`](ai-context/CURRENT_STATE.md) | **Snapshot** of stack + tests + pointers; refresh when onboarding narrative drifts. |
| [`docs/APP_STATE_AUDIT.md`](APP_STATE_AUDIT.md) | **Maturity / gap audit** by module; refresh after material merges. |

---

## Obsolete starter prompts (do not use)

- ~~“Generate the Open House MVP from scratch”~~ — shipped long ago; evolve existing `app/` + `components/` + `lib/` + APIs.
- ~~“Generate the Prisma schema from project documents only”~~ — schema exists; only change schema with intentional migrations and deploy discipline.

---

## Legacy section (intentionally retained heading)

Older versions of this file listed “Phase 3 DealForge” as the next build phase. **TransactionHQ** and related surfaces are already in the codebase; future transaction work should follow **KEYPILOT_MASTER_ROADMAP** and **`docs/transactions/transactions-v1-spec.md`**, not legacy codenames alone.

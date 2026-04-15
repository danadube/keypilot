
# KeyPilot — current development state

> **Snapshot — April 2026:** High-level **stack + test + pointers** for onboarding. **Priorities** → [`docs/product/KEYPILOT_MASTER_ROADMAP.md`](../product/KEYPILOT_MASTER_ROADMAP.md). **Module maturity / gaps** → [`docs/APP_STATE_AUDIT.md`](../APP_STATE_AUDIT.md). **Product rules** → [`docs/project-context.md`](../project-context.md). Re-stamp this file when the onboarding narrative or Jest counts materially change.

---

## Product phase (narrative)

**ShowingHQ-first** real estate operations platform: private **showings** and **open houses** are distinct workflows. **ClientKeep**, **PropertyVault**, **Transactions (TransactionHQ)**, **FarmTrackr**, and **TaskPilot** are in various stages of maturity (see **APP_STATE_AUDIT**). **MarketPilot**, **SellerPulse**, and **Insight** remain scaffold or gated unless the master roadmap promotes them.

Legacy doc names (e.g. “DealForge”) appear only in **historical** AI context files — use **TransactionHQ** and the transactions spec for deal/transaction language today.

---

## Stack

- **Framework:** Next.js 14 (App Router), React 18, TypeScript, Tailwind, shadcn-style UI components  
- **Auth:** Clerk (middleware + webhooks → `users` table)  
- **Data:** PostgreSQL (Supabase) + Prisma; RLS-aware access patterns per `docs/RLS_ARCHITECTURE.md` and `npm run check:prisma` allowlist  
- **API:** REST route handlers under `app/api/v1/` with Zod validation  
- **Deploy:** Vercel; cron routes for scheduled jobs where applicable  

---

## Engineering hygiene (representative)

- **Unit + integration tests:** Jest (`npm run test`, `npm run test:integration`); counts drift — run locally for current numbers.  
- **Local CI guardrail:** `npm run ci:local` (lint, typecheck, Prisma checks, tests, production build) — also wired to **pre-push** in this repo.  
- **DB safety:** `npm run validate:db-safety` — see `docs/platform/db-safety-validator.md`.  

---

## Completed (durable facts — non-exhaustive)

- Prisma schema as source of truth for domain models; Clerk user sync  
- ShowingHQ surfaces: showings, open houses (including public `/oh/[slug]`), visitors, follow-ups, Supra queue, templates, saved views  
- PropertyVault / properties, media, documents  
- ClientKeep / contacts CRM baseline; tier-gated behavior per product tier docs  
- Transactions: list, detail, pipeline, commissions, checklist, imports; linkage to CRM deals where modeled  
- FarmTrackr: territories, areas, imports, memberships, mailing/labels (respect tier/API gates)  
- TaskPilot: `/task-pilot` + tasks API  
- Settings: connections, automation, AI, modules, branding, daily briefing, account  

---

## In progress

- None fixed in this doc — see **KEYPILOT_MASTER_ROADMAP** **NOW** section.

---

## Near-term engineering themes (from audits / roadmap — not a task list)

- Close **`withRLSContext`** migration debt on remaining API routes (`npm run check:prisma` pending list).  
- ClientKeep IA: many child routes exist; sidebar vs hub discoverability (see **APP_STATE_AUDIT**).  
- FarmTrackr: stub subroutes for farms/lists/performance until product defines those surfaces.  

---

## Notes

- **No Prisma schema changes** are implied by this snapshot document. If a feature adds migrations, deployment still requires **`npx prisma migrate deploy`** per environment after review (`docs/platform/database-migrations.md`).  
- For **Cursor `next`** automation, use **`docs/NEXT_PHASE_PROMPT.md`** after reading the master roadmap.

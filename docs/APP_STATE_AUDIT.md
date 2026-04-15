# KeyPilot app state audit

> **Document status — April 2026:** This audit was originally captured with **`main` at `6373cbb`**. The **executive summary and module table** were refreshed for documentation accuracy (e.g. **TaskPilot** is a live gated module, not a blank stub). **§4 Branch triage** lists **`origin/*` names as of the original audit** — they go stale quickly; always run `git fetch` and inspect `git branch -r` / merge ancestry before acting on merge advice.

**Generated (original):** inspection of `main` at **`6373cbb`** (post-merge: navigation integrity, bulk farm memberships, FarmTrackr mailing/labels, transaction linking clarity).  
**Method:** `app/(dashboard)` route inventory, `lib/modules.ts`, representative page/components, `git` comparison of **`origin/*` branches** that are **not** ancestors of `main`. No product code changes in the audit commit.

---

## 1. Executive summary

**Where KeyPilot is now:** A ShowingHQ-first Next.js 14 app (Clerk, Prisma/Postgres, REST under `/api/v1`) with **solid private showings + open houses (public sign-in)**, **properties**, **contacts/deals**, **transactions + commissions + statement import**, **follow-ups**, **FarmTrackr** (territories, areas, CSV/Sheets import, **bulk membership** actions, **mailing list CSV + Avery 5160 label sheet**), and **TaskPilot** (`/task-pilot` task workspace + `/api/v1/tasks`). **Navigation** in `lib/modules.ts` matches **real routes** (FarmTrackr is **`available: true`** when tier allows; scaffold modules stay gated with no misleading child links).

**Biggest strengths**

- **ShowingHQ depth:** dashboard, showings, Supra inbox, visitors, templates, saved views, feedback, follow-ups, open-house workspace.
- **Transactions:** list/detail, pipeline, commissions, **PDF statement import** (parse + commit), **explicit property ↔ optional CRM deal ↔ contact-via-deal** in list, detail, and create (manual + import).
- **FarmTrackr (overview):** full territory/area CRUD, import preview/apply, expandable **per-area member panel** with bulk add / archive-from-area / move, **mailing exports** gated to CRM tier on API.
- **Engineering hygiene:** Zod on APIs, `ci:local` guardrails, Prisma as source of truth; farm mailing covered by unit tests in `lib/__tests__/farm-mailing-labels.test.ts`.

**Biggest risks**

- **RLS debt:** many routes still listed as pending `withRLSContext` migration in `check:prisma` — operational and security posture until closed.
- **Production DB:** farm + contact mailing migrations must be applied where not yet deployed (`prisma migrate deploy` discipline).
- **Large unmerged branches** (e.g. **transactions commission engine**, **farm segmentation**) can diverge quickly from `main`; need rebase-before-merge discipline.

**Biggest gaps**

- **TaskPilot:** usable task list and APIs; **deeper** cross-module task + calendar unification is still roadmap (see master roadmap).
- **MarketPilot / SellerPulse / Insight:** scaffold or placeholder; not positioned as primary workflows.
- **FarmTrackr maps:** no dedicated map UI; `/farm-trackr/farms`, `/lists`, `/performance` remain **stubs** (intentional; not in sidebar).
- **Calendar:** not a top-level module; home widget + `/api/v1/calendar/events` — no full calendar app surface.
- **ClientKeep sidebar** in config is minimal (Overview + Settings); **tags / activity / communications / segments** pages exist but are **not** all linked from `MODULES["client-keep"].sidebar` (reachable from overview UI and direct URLs).

---

## 2. Module / area status (classification)

| Area | Classification | Notes (main) |
|------|----------------|--------------|
| **Home `/`** | Partial but usable | `DashboardLanding` **redirects** ShowingHQ-tier users to `/showing-hq`; others get `HomePage` + calendar-style widget. |
| **ShowingHQ** | Complete / usable | Dashboard, showings CRUD, Supra inbox, visitors, templates, analytics, feedback, follow-ups (+ drafts), saved views, OH workspace routes. |
| **Open houses** | Complete / usable | `/open-houses/*` including public sign-in, visitors, report, follow-ups. Distinct from private showings. |
| **PropertyVault** | Partial but usable | `/property-vault` overview + `/properties` list/detail/documents/media/new. |
| **ClientKeep + contacts** | Partial but usable | `/client-keep` overview; `/contacts`, `/contacts/[id]` (incl. mailing fields for FarmTrackr); segments, activity, tags, communications, follow-ups routes — **tier-gated** for full CRM. |
| **Deals** | Partial but usable | `/deals`, `/deals/[id]`; pathname maps to **transactions** module in `getModuleFromPath`. |
| **Transactions + commissions** | Complete / usable | List (property + deal/contact affordances), detail (**Record links** + link/unlink deal), pipeline, commissions, **create modal** (manual + import) with optional deal picker. |
| **FarmTrackr** | Partial but usable | **`/farm-trackr`** is the real surface: territories/areas, import, members bulk panel, mailing CSV + print labels. Subroutes **stub only** (see §5). |
| **TaskPilot** | Partial but usable | `/task-pilot` — task workspace + `/api/v1/tasks`; **`available: true`** in `lib/modules.ts` when module access allows; not yet a full “task OS” across every surface. |
| **MarketPilot** | Scaffold only | Pages exist; `available: false`. |
| **SellerPulse** | Scaffold only | Overview page; `available: false`. |
| **Insight** | Scaffold only | `/insight`, `/insight/performance`; `available: false`. |
| **Calendar** | Partial | API + home widget; no dedicated module nav. |
| **Settings / integrations** | Complete / usable | Account, connections, automation, AI, modules, branding, integrations; root `/settings` redirects to account. |
| **Public / auth** | Complete / usable | `/oh/[slug]`, host/feedback/flyer tokens, Clerk sign-in/up; middleware public routes. |

---

## 3. Punch list (prioritized buckets)

### Complete on `main` (shipped)

- Navigation integrity: sidebar matches routes; FarmTrackr enabled in module config; misleading nested sidebar links removed for modules that are scaffold or gated.
- FarmTrackr: territories, areas, CSV/Sheets import, bulk membership (add / remove from area / move), mailing list + Avery 5160 HTML export (CRM tier on API).
- Contact mailing address fields + validation (supports mailing exports).
- Transactions: deal linking model surfaced consistently (list, detail, create manual + import).
- ShowingHQ, open houses, properties, contacts, deals, commissions baseline, statement import path.
- **App state audit:** this file (`docs/APP_STATE_AUDIT.md`) merged from `feature/roadmap-state-refresh`; obsolete **`feature/app-state-audit`** branch removed from remote.

### Complete on branch, pending merge

- *(None for audit/docs — next work is feature branches below.)*

### Partial / needs follow-up

- RLS migration coverage across API routes (tracked by `check:prisma` allowlist).
- ClientKeep IA: sidebar vs many existing child routes — consider surfacing key links in `MODULES` or ClientKeep hub.
- FarmTrackr: stub subroutes remain until maps/lists/performance are real products.
- TaskPilot / MarketPilot / SellerPulse / Insight: decide promotion vs hide until MVP.

### Pinned for later (not next unless promoted)

- App dashboard v2 (rich home for power users).
- Sidebar attention / notification system.
- FarmTrackr maps and dedicated farms/lists/performance experiences.
- Full calendar module.
- See **§8 Pinned ideas**.

### Obsolete / should close or avoid

- ~~**`feature/app-state-audit`**~~ — **closed** (superseded audit doc is on `main`).
- Any local branch whose tip is already an ancestor of `main` — safe to delete locally after `git fetch --prune`.

### Ideas only (not in repo as committed scope)

- “DealForge” / legacy doc names — treat as directional only unless backed by a spec branch.

---

## 4. Branch triage (`origin/*` not merged into `main`)

Branches verified with: `git merge-base --is-ancestor origin/<branch> main` → **not** ancestor.

| Branch | Unique work vs `main` (summary) | Recommended action |
|--------|----------------------------------|--------------------|
| **feature/clientkeep-contact-detail** | Large contacts list + follow-ups UX (`contacts-list-view`, segment query tests, etc.) | **Rebase** onto `main`, then **review** for merge (high touch). |
| **feature/clientkeep-transactions-clarity** | ShowingHQ tabs + small transaction list/detail tweaks; may **overlap** merged transaction-linking | **Rebase** and **diff review**; merge only if deltas still add value; else **close**. |
| **feature/farm-segmentation-foundation** | Prisma + SQL migrations (segmentation / RLS-related) | **Review later** — schema-heavy; plan migration ordering with ops. |
| **feature/schedule-showing-workflow-ux** | New showing form + scheduled banner | **Rebase** → candidate **merge** when QA-ready (focused UX win). |
| **feature/showing-hq-command-center** | Dashboard section hierarchy tweaks | **Rebase** → candidate **merge** (small surface area). |
| **feature/showinghq-workspace-ui** | ShowingHQ layout/tabs + PropertyVault listing IA | **Rebase** → **review** (possible overlap with other UI branches). |
| **feature/token-public-flows** | Public token routes, middleware, feedback/host UX | **Review** → merge when ready for hardened public flows. |
| **feature/transactions-commission-engine** | Large commission engine + multiple migrations + many files | **Rebase** → **structured review / merge** as a deliberate release (highest complexity). |

**Does not appear as unmerged on `origin` (examples merged or absent):** bulk farm membership, farmtrackr mailing-labels, transaction-linking-clarity, navigation fix branches — already on `main`.

---

## 5. Orphaned / unlinked routes

| Route / pattern | Status | Recommendation |
|-----------------|--------|----------------|
| `/styleguide` | Exists; dev-oriented | **Keep**; not for end-user nav. |
| `/farm-trackr/farms`, `/lists`, `/performance` | **Stub** (`FarmTrackrStubPage`) | **Acceptable stub**; **not** in sidebar (avoids false promises). Direct URL explains “use overview”. |
| `/client-keep/activity`, `/tags`, `/communications`, `/segments`, `/follow-ups` | Live pages; **not** all in `MODULES.client-keep.sidebar` | **Keep** routes; **improve discoverability** via overview links or sidebar when prioritized. |
| `/showing-hq/open-houses` vs `/open-houses` | Both exist | **Acceptable** dual entry; document mentally as “OH hub” vs global OH list — consider future consolidation (pinned cleanup). |
| `/deals` | Live; module routing under “transactions” | **By design**; ensure **New → Deal** and transaction copy stay aligned. |
| **SellerPulse / Insight** | Scaffold or gated | **No false sidebar children** on `main` today — good. **TaskPilot** is promoted as a real overview route when enabled. |
| **Insight** | No top-nav when `available: false` | **Acceptable** until product promotes module. |

---

## 6. Pinned / later (explicitly not “next”)

These are **not** committed as the immediate roadmap unless explicitly promoted:

- **App dashboard v2** — richer `/` or post-login hub beyond ShowingHQ redirect + basic home.
- **Sidebar attention system** — badges, actionable queue across modules.
- **FarmTrackr maps** — geographic visualization; replaces stub narrative.
- **Dedicated FarmTrackr sub-apps** — farms/lists/performance as real pages, not stubs.
- **Full Calendar module** — beyond API + home widget.
- **TaskPilot** deeper calendar integration and cross-module task surfaces (beyond current `/task-pilot` + tasks API).
- **MarketPilot / SellerPulse / Insight** MVPs.

---

## 7. Recommended next 3 moves (practical)

1. ~~**Land this audit**~~ **Done** — `docs/APP_STATE_AUDIT.md` is on `main`; `feature/roadmap-state-refresh` and obsolete `feature/app-state-audit` remotes deleted.

2. **Pick one ShowingHQ UX branch** — Rebase **`feature/showing-hq-command-center`** or **`feature/schedule-showing-workflow-ux`**, run `ci:local`, merge if clean.  
   *Reason:* smaller scope than commission engine; improves daily operating screen.

3. **Triage `feature/clientkeep-transactions-clarity` vs `main`** — After rebase, if diff is mostly superseded by transaction linking on `main`, **close**; otherwise merge remaining deltas. In parallel, schedule **`feature/transactions-commission-engine`** for a dedicated review (migrations + wide API surface).  
   *Reason:* avoid duplicate/conflicting transaction UI; sequence big engine work deliberately.

---

## 8. Branch cleanup recommendations

| Category | Guidance |
|----------|----------|
| **Safe to delete (remote)** | ~~`feature/app-state-audit`~~ **deleted**; `feature/roadmap-state-refresh` **deleted** after merge to `main`. |
| **Keep until merged / reviewed** | `feature/transactions-commission-engine`, `feature/farm-segmentation-foundation`, `feature/token-public-flows`, `feature/clientkeep-contact-detail`, `feature/showinghq-workspace-ui`. |
| **Rebase then merge or close** | `feature/clientkeep-transactions-clarity`, `feature/showinghq-workspace-ui`, `feature/showing-hq-command-center`, `feature/schedule-showing-workflow-ux`. |
| **Local cleanup** | Run `git fetch --prune`; delete local tracking branches whose upstream is gone or whose tip is merged (`git branch --merged main`). |

---

## 9. Maintenance

- Refresh this document after **material merges** (new module, major nav change, or branch landscape shift). **Re-stamp** the callout at the top of this file when the executive summary or module table changes materially.
- Prefer **one** app-state audit path: **`docs/APP_STATE_AUDIT.md`** (avoid parallel stale copies on long-lived branches).
- Pair with **[`docs/ai-context/CURRENT_STATE.md`](ai-context/CURRENT_STATE.md)** for a lighter “stack + tests” snapshot for onboarding.

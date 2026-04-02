# Unexpected merge — QA pass on current `main`

**Audit branch:** `fix/unexpected-merge-qa`  
**`main` tip at verification:** `f49bef1` (`fix: restore contact detail parity with main`)  
**Historical bundle range (context only):** `29097af`..`21cb44c` (fast-forward of `feature/showinghq-dashboard-diagnostics`)

**Is `21cb44c` still relevant?** Yes, as **history**: `git merge-base --is-ancestor 21cb44c HEAD` is true — the bundle is on every descendant of `main`. **Product behavior on this audit must be judged at `f49bef1`**, not at `21cb44c`.

**Later `main` work that touched the same areas (examples from `git log 21cb44c..HEAD`):**

- `efd6e31` — ShowingHQ home command-center hierarchy (dashboard UX)
- `454e253`, `c4f58b7`, `af0cfd8`, `f49bef1` — ClientKeep contacts / contact detail / contacts list “daily action hub”
- `30595e0` — Navigation aligned with app state (`fix: align navigation with actual app state`)
- Plus merges: transactions clarity, FarmTrackr, local CI guardrails, etc.

These commits **supersede or extend** parts of the original bundle; the audit below reflects **current** code.

---

## 1. What was unintentionally bundled (original merge)

Rough workstreams in `29097af..21cb44c`:

- ShowingHQ dashboard route hardening / “staged” diagnostics & partial-render behavior
- ClientKeep saved segments (URL grammar + localStorage)
- ShowingHQ Saved Views v1 + canonical `q` (Visitors, Showings, hub, APIs)
- `contacts-list-view` integration with segment query helpers
- `lib/modules.ts` and docs (playbooks, specs)

Branch name suggested “dashboard diagnostics” only; **scope was wider**.

---

## 2. What this QA pass checked (at `f49bef1`)

| Area | Method | Result |
|------|--------|--------|
| **ShowingHQ dashboard API** | Read `app/api/v1/showing-hq/dashboard/route.ts`; consumers `showing-hq-dashboard.tsx`, `SupraGmailIntegrationsCard.tsx` | Handler documents partial-render / `slice_nonfatal`; UI uses `json.data` with fallibles. Settings card only needs `connections`, `supraInboxSummary` — **optional chaining, no brittle contract**. **No blocker.** |
| **Saved Views + `q`** | Grep/list routes; spot-check hub copy, list components | Hub describes Visitors / Showings / Open Houses + `q`; lists link to `/showing-hq/saved-views`. **No blocker.** |
| **ClientKeep saved segments** | Grep `/client-keep/segments`; contacts list imports `contact-segment-query` + `saved-segments-storage` | Tabs + overview link segments; list uses same helpers. **No blocker.** |
| **Contacts list** | Grep `href=\`/contacts/` in `contacts-list-view.tsx` | Detail and schedule deep links use `/contacts/{id}`. **No blocker.** |
| **Navigation / `lib/modules.ts`** | Read ShowingHQ + ClientKeep sidebar | ShowingHQ sidebar is **minimal** (Dashboard, Showings, Open Houses, Inbox); Visitors / Saved views / Follow-ups are reached via **command center & list links** (e.g. `TodayCommandCenter` → visitors). **Discovery gap is product/IA, not a regression** from this pass; later `30595e0` addressed global nav alignment. **No blocker.** |

---

## 3. Verdict on keeping the merge

**Still safe to keep.** No contract break found between dashboard API and current consumers; Saved Views / `q` / segments / contacts paths are coherent on latest `main`. Risks called out in the earlier audit are **mitigated or evolved** by subsequent commits (command center, nav fix, contacts overhaul).

---

## 4. Cleanup / fixes from this pass

- **Code:** none  
- **Docs:** this file only  

---

## 5. Follow-up (optional, not blocking)

- Manual smoke: ShowingHQ home, Saved views hub, Visitors/Showings with `?q=`, ClientKeep segments save/load, contacts row → detail.
- Product: optional IA pass (sidebar entries for Visitors / Saved views) if you want parity with command-center links.

---

## 6. Migrations / DB (this pass)

**Changes in this commit:** documentation only.  
**`npx prisma migrate deploy`:** **not required** because of this audit commit.  
(Ensure production pipeline matches whatever migrations already existed on `main` before this doc — unchanged by this PR.)

---

## 7. Validation run on `fix/unexpected-merge-qa`

- `npm run build` — **passed**
- `npm run ci:local` — **passed** (typecheck, lint warnings only as on `main`, 50 test suites, 345 tests)

---

## 8. Decision

**Outcome: A** — Unexpected merge remains **safe to keep**; **no product code cleanup** was required on this pass; documentation records verification on **current** `main`.

**Next step:** Merge `fix/unexpected-merge-qa` (or cherry-pick the doc commit) to `main`, then proceed with normal roadmap work — **no revert** unless future smoke finds a real regression.

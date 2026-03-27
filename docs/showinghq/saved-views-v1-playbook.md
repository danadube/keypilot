# Saved Views — ShowingHQ v1 (feature playbook)

**Status:** Design / implementation guide  
**Audience:** Product + engineering  
**Aligns with:** `docs/platform/saved-views-spec.md`, `docs/templates/feature-playbook-template.md`  
**Reference implementation:** ClientKeep saved segments (`lib/client-keep/contact-segment-query.ts`, `lib/client-keep/saved-segments-storage.ts`)

**Scope:** ShowingHQ **list surfaces** only — private **showings**, **open-house visitors**, and (optional P1) **open houses** catalog. **No** Postgres schema, **no** RLS policy changes, **no** shared cross-module framework in v1.

---

## Changelog summary (target)

**ShowingHQ: Saved views (v1)**

- Save **named shortcuts** to list filters on ShowingHQ surfaces using **URL query parameters** that match existing list APIs.
- **Surfaces (v1):** Private showings (`/showing-hq/showings`), open-house visitors (`/showing-hq/visitors`); optional: open houses (`/open-houses`) with **status** filter only.
- Shortcuts stored in **browser localStorage** (`kp_showinghq_saved_views_v1`): **this device/browser**, not synced.
- **Duplicates** blocked by **normalized fingerprint** per surface (`surface` + filter fields).
- **Search text** (`q` on visitors) and **client-only showings search** are **not** saved (same rule as ClientKeep).
- **No** database or RLS changes for v1.

---

## Internal release note

**ShowingHQ: Saved views v1 (browser-only)**

Agents can bookmark repeatable **list filters** for private showings and open-house visitors (and optionally the open-houses list) the same way we handled ClientKeep segments: **URL-first**, then **localStorage** for names.

**Entry points:** Each surface gains **Save view** when the **URL** encodes at least one saveable filter (see grammars below). Manage shortcuts from a **ShowingHQ → Saved views** hub (or equivalent compact entry — implementation choice) listing **Open / Rename / Delete**.

**Expectations:** Not synced across devices; clearing site data removes shortcuts; if an **open house** or **event** is deleted, a visitors shortcut pointing at that `openHouseId` may error — clear filters or delete the shortcut (mirror ClientKeep stale-tag messaging).

**Strategic fit:** Validates Saved Views in a second module before account-level persistence (`docs/platform/saved-views-spec.md` §4).

---

## Architecture & constraints

### Surfaces and base paths

| Surface | Base path | List API |
|---------|-----------|----------|
| Private showings | `/showing-hq/showings` | `GET /api/v1/showing-hq/showings` |
| Open-house visitors | `/showing-hq/visitors` | `GET /api/v1/showing-hq/visitors` |
| Open houses (optional P1) | `/open-houses` | `GET /api/v1/open-houses` |

All list APIs already enforce **host / owner** scoping via `getCurrentUser()` and Prisma `where` clauses — **RLS-safe by existing application logic**. v1 does **not** introduce new `prismaAdmin` call patterns.

### Canonical state (URL grammar)

**R5 (platform spec):** Only params that exist in the **URL** may be saved. Implementation must **sync** filters from UI controls to `router.replace` / `<Link>` / `useSearchParams`, then build `fetch()` URLs from the same helper as the browser address bar.

---

## ShowingHQ query grammar (v1)

### Shared conventions

- **Serialization:** `URLSearchParams`; omit keys when value is “unset” / default where noted.
- **Normalization:** trim strings; enums **uppercase** where they match Prisma/API; unknown enum → treat as unset (same spirit as `contact-segment-query`).
- **Fingerprints:** `JSON.stringify` of `{ surface, ...normalizedFields }` with **stable key order** (e.g. sorted keys) or a dedicated `fingerprint()` function per surface.

---

### Surface A — Private showings (`SHOWINGS`)

**Base:** `/showing-hq/showings`

| Param | Type | Normalization | API mapping |
|-------|------|---------------|-------------|
| `source` | enum? | `MANUAL` \| `SUPRA_SCRAPE`; invalid/empty → omit | `GET …/showings?source=` |
| `feedbackOnly` | flag | presence of `feedbackOnly=true` only; else omit | `GET …/showings?feedbackOnly=true` |
| `openShowing` | string? | non-empty trimmed UUID/string = expanded row / deep link | Already on page as `searchParams.openShowing`; optional in saved views |

**Defaults:** no `source` → all sources; no `feedbackOnly` → false; no `openShowing` → no row forced open.

**Save visibility:** Show **Save view** when at least one of `source`, `feedbackOnly=true`, or `openShowing` is present in the URL **or** when product chooses to treat “feedback only” toggles as URL-backed (implementation must write URL before save).

**Not in v1 grammar (API does not support — do not save):**

- Date range (`from` / `to`) on scheduled time  
- `propertyId` filter  
- Generic “status” for showings (different model than open-house `OpenHouseStatus`)

*Deferred to a future API + grammar version bump.*

---

### Surface B — Open-house visitors (`VISITORS`)

**Base:** `/showing-hq/visitors`

| Param | Type | Normalization | API mapping |
|-------|------|---------------|-------------|
| `openHouseId` | string? | trim; must be UUID the user could select; `"all"` / empty → omit | `GET …/visitors?openHouseId=` |
| `sort` | enum | `date-desc` (default), `date-asc`, `name-asc`, `name-desc`; invalid → `date-desc` | `GET …/visitors?sort=` |

**Excluded from saved views:** `q` (search). It is API-backed but **not** required to live in the URL for v1; **do not** persist `q` until Product promotes search to the query string (platform spec R5). Same pattern as ClientKeep search.

**Save visibility:** Show **Save view** when `openHouseId` is set **or** when `sort` differs from default `date-desc` (product decision: if only default sort, URL may be bare — then hide save; prefer syncing `sort` only when user changes select).

---

### Surface C — Open houses catalog (`OPEN_HOUSES`, optional P1)

**Base:** `/open-houses`

| Param | Type | Normalization | API mapping |
|-------|------|---------------|-------------|
| `status` | enum? | `DRAFT` \| `SCHEDULED` \| `ACTIVE` \| `COMPLETED` \| `CANCELLED`; invalid → omit | `GET /api/v1/open-houses?status=` |

**Prerequisite:** List UI must call API with `status` when param present (today UI may fetch unfiltered — wire before or with saved views).

---

## API and client parity

1. **Single helper module per surface** (recommended paths):
   - `lib/showing-hq/showings-view-query.ts` — `parseShowingsViewFromSearchParams`, `showingsViewToHref`, `buildShowingsListApiUrl`, `normalizedShowingsViewFingerprint`, etc.
   - `lib/showing-hq/visitors-view-query.ts` — same for visitors.
   - `lib/showing-hq/open-houses-view-query.ts` — optional P1.

2. **List components** (`ShowingsListView`, `VisitorsListView`, `OpenHousesListView`) must:
   - Read initial state from `useSearchParams` (or page `searchParams` + client sync).  
   - On filter change, `router.replace(href, { scroll: false })`.  
   - `fetch()` using **`build*ApiUrl`** from the same module as `*ToHref`.

3. **APIs** — Prefer **Zod** query validation in route handlers when touching this work; at minimum, **mirror** current manual checks (`trim`, enum allowlists) so invalid URLs cannot diverge from server behavior.

4. **No new tables** — responses unchanged in shape; only query strings align.

---

## localStorage (v1)

**Key:** `kp_showinghq_saved_views_v1`

**Record shape:**

```ts
type ShowingHqSavedViewSurface = "SHOWINGS" | "VISITORS" | "OPEN_HOUSES";

type ShowingHqSavedViewRecord = {
  id: string;
  name: string;
  surface: ShowingHqSavedViewSurface;
  // Normalized — omit or null for “unset” per surface rules
  source?: string | null;
  feedbackOnly?: boolean | null; // true | null
  openShowing?: string | null;
  openHouseId?: string | null;
  sort?: string | null;
  status?: string | null; // OPEN_HOUSES only
};
```

**Rules:**

- **Max records:** e.g. 50 (match ClientKeep).  
- **Max name length:** e.g. 80.  
- **Load:** tolerate invalid JSON, non-array, malformed rows — drop bad entries.  
- **Dedupe:** after normalizing fields for `surface`, reject add if fingerprint matches an existing row.  
- **Rename / delete:** same UX patterns as ClientKeep Segments (confirm delete optional but recommended).

**Optional:** split keys per surface (`kp_showinghq_showings_saved_views_v1`, …) if you prefer isolation; platform spec allows either if conventions are documented. Single key keeps one “Saved views” hub simpler.

---

## UX (v1)

| Action | Behavior |
|--------|----------|
| **Save view** | Shown only when URL encodes at least one **saveable** param for that surface (per grammar). Modal: name input, copy that persistence is **this browser only**; **no** `q` / client-only search. |
| **List** | New hub route e.g. `/showing-hq/saved-views` **or** section on ShowingHQ dashboard — list by name, show surface + human-readable filter summary. |
| **Open** | `Link` / `router.push` to `*ToHref(...)`. |
| **Rename / Delete** | Inline or modal; delete confirmation recommended. |
| **Cross-tab** | `storage` event on `kp_showinghq_saved_views_v1` + `window` `focus` refresh (same as ClientKeep). |
| **Stale references** | Footer note if any saved view uses `openHouseId` (visitors) or `openShowing` (deleted showing): recovery path = clear filters on target page or delete shortcut. |

---

## Non-goals (v1)

- **Postgres** persistence, sync, sharing, teams.  
- **Date range** / **propertyId** filters for showings until APIs exist.  
- Saving **visitor search (`q`)** or **showings client search** without URL promotion.  
- **Supra inbox**, **feedback-requests**, **analytics** sub-surfaces — separate grammars later.  
- **Global** `SavedView` React SDK — module-local helpers only.  
- **RLS** or **schema** migrations.

---

## Why a limited v1 first

Second-module proof of `docs/platform/saved-views-spec.md`: **prove** URL + localStorage + hub UX for **time-based / event** data without betting on a cross-app framework. Showings/visitors APIs already expose small filter sets — **ship parity** before expanding grammar.

---

## QA checklist (preview / regression)

**Showings**

- [ ] URL drives `source` / `feedbackOnly` / optional `openShowing`; fetch matches `GET /api/v1/showing-hq/showings?…`.  
- [ ] **Save view** only when URL has saveable params (per product rule for defaults).  
- [ ] Saved Open restores list + expanded row when `openShowing` invalid → sensible error / collapse (define minimal behavior).  
- [ ] Duplicate surface + filters blocked; max list enforced.

**Visitors**

- [ ] URL drives `openHouseId` / `sort`; fetch matches visitors API; **no** `q` in saved record.  
- [ ] Default-only URL → save hidden or consistent.  
- [ ] Deleted open house → error message + clear path (align with ClientKeep tag 404 messaging).

**Open houses (if P1)**

- [ ] `status` in URL ↔ API.

**General**

- [ ] localStorage corrupt → empty list, no throw.  
- [ ] Cross-tab refresh.  
- [ ] Copy: **browser only**.  
- [ ] No regression: unauthenticated access unchanged; no new `prismaAdmin` leaks.

---

## Merge & release guidance

1. **Preview** — Run QA; stress stale IDs and duplicate messaging.  
2. **Merge** — When checklist green; **no** schema deploy.  
3. **Communicate** — Trim changelog for external note; internal = this playbook + `saved-views-spec` pointer.

---

## Backlog — ShowingHQ Saved Views v2 *(do not build until justified)*

- **Table** `saved_views` or module-prefixed rows: `userId`, `surface`, `name`, `filterFingerprint`, JSONB `filters`, timestamps.  
- **Unique** `(userId, filterFingerprint)` or hash column.  
- **RLS** tenant isolation.  
- **Import** from `kp_showinghq_saved_views_v1`.  
- **Grammar parity** — reuse same `lib/showing-hq/*-view-query.ts` for href + API validation.

**Exit criteria:** Usage metrics, support volume, or product commitment.

---

## Appendix — Platform registry (update when v1 ships)

| Module | Surface | Base path | Grammar helper | Storage key (v1) |
|--------|---------|-----------|----------------|------------------|
| ShowingHQ | Private showings | `/showing-hq/showings` | `lib/showing-hq/showings-view-query.ts` | `kp_showinghq_saved_views_v1` |
| ShowingHQ | Visitors | `/showing-hq/visitors` | `lib/showing-hq/visitors-view-query.ts` | *(same key, `surface` field)* |
| ShowingHQ | Open houses | `/open-houses` | `lib/showing-hq/open-houses-view-query.ts` (TBD, P1) | *(same)* |

---

## Summary

ShowingHQ Saved Views v1 adds **named, URL-aligned list shortcuts** for **showings** and **visitors** (and optionally **open houses** `status`), **localStorage-only**, **deduped**, **API-parity** via small per-surface query helpers — **no** DB/RLS churn, **no** premature platform framework, consistent with ClientKeep and `docs/platform/saved-views-spec.md`.

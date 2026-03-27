# Open houses saved views — ShowingHQ v1 (internal)

## Changelog summary

**ShowingHQ: Open Houses saved views (v1)**

- Named shortcuts for **Open Houses** list filters: **`status`** (URL, matches open house lifecycle) and **`q`** (list search).
- Base path **`/open-houses`**. Manage shortcuts from **ShowingHQ → Saved views** (`/showing-hq/saved-views`) with Visitors and Showings rows.
- **localStorage** only (`kp_showinghq_saved_views_v1`, `surface: OPEN_HOUSES`) — this browser, not synced.
- **No** Prisma schema changes, **no** RLS changes; **GET** `/api/v1/open-houses` gains optional **`q`** (Zod-validated query) for API parity with list search.

---

## Internal release note

**ShowingHQ: Open houses saved views (browser-only)**

Agents use **Open Houses** (`/open-houses`) for public events. Saved views let them bookmark a **status tab** (e.g. Live) plus **search** in the address bar, then reopen from **Saved views**. List fetch uses **`q`** on the API; **`status`** is applied on the client so tab counts stay accurate across statuses.

**Entry points:** `/open-houses` (Save view when URL has saveable filters); `/showing-hq/saved-views` (Open, rename, delete, copy link).

**Optional one-liner:** *Validates the same URL → localStorage pattern as Visitors/Showings without a shared framework.*

---

## Architecture & constraints

**Canonical state**

- **URL / query grammar:** `lib/showing-hq/open-houses-view-query.ts` — `status` (optional `OpenHouseStatus`), `q` (optional list search).
- **List fetch:** `buildOpenHousesListFetchApiUrl` passes **`q` only**; **`status`** is client-side after load for tab badge consistency.

**Query grammar vs list fetch**

- **`status`** is **URL-backed** (tabs, bookmarks, saved views) but **not** sent on the open-houses **list** request; **`q`** is the **only** server-side filter for that fetch.
- **`status`** is applied **client-side** to the returned rows. Tab and metric **counts** are derived from the **`q`-filtered** dataset (still containing every status present in that result).
- **Why:** Sending **`status`** to the API would drop rows in other statuses and break **tab counts** (Live / Upcoming / Completed / All). This is a deliberate **exception to strict URL ↔ API parity** for **`status`**; **`q`** remains fully API-aligned. Direct **`GET /api/v1/open-houses?status=…`** remains valid for other callers.

**Backend**

- **API:** `GET /api/v1/open-houses` — `OpenHousesListGetQuerySchema` (`status`, `q`); search mirrors ShowingHQ showings multi-term `AND` pattern on title, notes, agent fields, property address fields.
- **Prisma:** No new models.
- **RLS:** Unchanged.

**Auth**

- Protected dashboard + existing GET auth.

**Stack guardrails**

- Next.js App Router; module-local helpers only.

---

## Non-goals (v1)

- Server persistence, cross-device sync, sharing.
- Passing **`status`** on the list-fetch URL (optimization / alternate UX).
- Replacing **`/open-houses`** with a `/showing-hq/...` path (current product route stays canonical).

---

## Why ship a limited v1 first

**Common mistake:** Adding a global saved-view service or DB table before the URL grammar is used in production.

**This v1:** Ships **grammar + storage + hub** for open houses the same way as visitors/showings so demand is proven before Postgres v2.

---

## QA checklist (preview / regression)

**Access & surfaces**

- [ ] `/open-houses` loads; tabs and search sync to URL.
- [ ] `/showing-hq/saved-views` lists Open houses shortcuts with correct summary.

**Core behavior**

- [ ] Save view with **status only**, **q only**, and **both**; Open restores table + URL.
- [ ] **Counts** (tabs/metrics) reflect the **`q`-filtered** dataset from the API; the **table** reflects the **`status`-filtered** subset of that dataset.
- [ ] Duplicate save blocked; 50-view limit behavior matches other surfaces.

**Edge cases**

- [ ] Invalid **`status=`** stripped from URL.
- [ ] **DRAFT** / **CANCELLED** in URL: list filters correctly; tab highlight falls back to “All”.

**Persistence & lifecycle**

- [ ] Rename/delete/copy link for OPEN_HOUSES rows.

**Regression**

- [ ] `GET /api/v1/open-houses` without query params still returns full list for other callers.
- [ ] Sign-in picker and other consumers of the list API still work.

---

## Merge & release guidance

Run the QA checklist. Stress **URL replace** + **debounced `q`** + **saved hub** links.

---

## Backlog — Open houses saved views v2 *(do not build until justified)*

**Title:** Open houses saved views v2 — server persistence

- **Schema / data model:** User-scoped rows; `filterFingerprint`; filters JSON matching grammar.
- **Migration / import:** From `kp_showinghq_saved_views_v1` (`surface: OPEN_HOUSES`).
- **Parity:** Same helpers as v1 URL + Zod.

**Exit criteria to start v2:** Account sync or support burden justifies DB.

---

## Document metadata

| Field | Value |
|-------|-------|
| **Aligns with** | `docs/platform/saved-views-spec.md`, `docs/templates/feature-playbook-template.md` |

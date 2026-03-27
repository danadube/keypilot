# ShowingHQ Saved Views v1 — Implementation plan (no code)

**Source:** `docs/showinghq/saved-views-v1-playbook.md`  
**Constraints:** Schema-free, RLS-safe (existing APIs only), URL-first, no DB, no shared frameworks, no speculative filters.

---

## 1. Recommended rollout order

| Order | Surface | Rationale |
|-------|---------|-----------|
| **1** | **Visitors** (`/showing-hq/visitors`) | Smallest lift: `GET /api/v1/showing-hq/visitors` already accepts `openHouseId` + `sort` in the query string from the client. Work is mainly **syncing the UI filter controls to the URL** and reusing the same params for `fetch` + save. |
| **2** | **Private showings** (`/showing-hq/showings`) | API already supports `source` + `feedbackOnly`, but the list **never sends them** today. Requires **URL wiring** + **fetch parity** + (if product adds filters) **UI controls** backed by query params. Higher touch than visitors. |
| **3** | **Open houses** (`/open-houses`, optional) | API supports `?status=`; list UI **does not** pass it yet. Saving views **depends on** wiring status filter to URL + fetch first; ship as a **separate increment** after Visitors (and ideally after Showings) to keep each PR reviewable. |

**Hub placement**

- **Option A (recommended):** Ship a minimal **Saved views** hub with **Visitors-only** rows in increment 1; extend hub to multi-surface as Showings and Open houses land.  
- **Option B:** Defer hub to increment 2 and use **Save + toast “Saved — open from …”** with link to a temporary list-only page — worse UX; prefer Option A with a thin hub.

---

## 2. Canonical vs saveable vs transient (by surface)

### Visitors (`VISITORS`)

| Param | Canonical for API? | In URL for v1? | Saveable in v1? | Notes |
|-------|---------------------|----------------|-----------------|--------|
| `openHouseId` | Yes | **Target: yes** | **Yes** | Reproducible list slice. Stale if event deleted — handle like ClientKeep stale tag. |
| `sort` | Yes | **Target: yes** | **Yes** | Normalize default to `date-desc`; omit from URL when default to reduce noise **or** always serialize — pick one rule and document in helper. |
| `q` | Yes (API) | Not in v1 URL | **No** | **Transient for v1** (client/search debounce). Promoting `q` to URL is a separate product/tech task. |

**Transient UI (never save):** loading spinners, selected row highlight if any, draft modal state.

---

### Private showings (`SHOWINGS`)

| Param | Canonical for API? | In URL for v1? | Saveable in v1? | Notes |
|-------|---------------------|----------------|-----------------|--------|
| `source` | Yes | **Target: yes** | **Yes** | `MANUAL` \| `SUPRA_SCRAPE` only; invalid → omit. |
| `feedbackOnly` | Yes (`true` only) | **Target: yes** | **Yes** | Serialize as `feedbackOnly=true` or omit. |
| Client search | N/A | **No** | **No** | **Pure transient** (`matchesSearch` local) — same rule as ClientKeep search. |

**`openShowing` (expanded / deep-link row)**

| Question | Recommendation |
|----------|----------------|
| Reproducible? | Partially: restores **which showing id** is emphasized in UI; **not** a list filter. |
| **Include in Saved Views v1?** | **Exclude.** Saves should mean **“this filtered list”**, not **“this list + this drawer open”**. Keeps dedupe/fingerprints stable, avoids clutter from id-specific bookmarks, reduces stale-id UX (`openShowing` id deleted ≠ same as tag filter). |
| Deep links | Users can still **bookmark** `/showing-hq/showings?openShowing=…` manually; hub can document that Saved views are **filter shortcuts** only. |
| **v2 reconsideration** | Optional “Open showing XYZ” as a second record type with different `surface` subtype — **out of v1 scope.** |

---

### Open houses (`OPEN_HOUSES`)

| Param | Canonical for API? | In URL for v1? | Saveable in v1? | Notes |
|-------|---------------------|----------------|-----------------|--------|
| `status` | Yes | **Target: yes** (after UI wiring) | **Yes** | Prisma enum set; invalid → omit. |

**Transient:** client-only filters not in API, card expand state, etc.

---

## 3. Risks per surface

| Surface | Risk | Mitigation |
|---------|------|------------|
| **Visitors** | Stale `openHouseId` after event delete | Error from API + copy to clear filter / delete shortcut (playbook); optional friendly message in list error path. |
| **Visitors** | `sort` default vs omitted URL | Pick one convention in `visitors-view-query`; tests for fingerprint dedupe. |
| **Showings** | New URL params without UI | Product needs visible toggles/chips for `source` / `feedbackOnly` that write the URL — avoid “hidden” save-only params. |
| **Showings** | Users expect date/property filters | Document **non-goals** in release note; defer until API exists. |
| **Open houses** | `status` wiring missed in list | Ship **fetch + URL** change before Save button; QA `GET` with each enum. |
| **All** | localStorage quota / private mode | Same as ClientKeep: try/catch persist; graceful empty state. |

---

## 4. Implementation tasks by file area

*Paths are suggestive; adjust to match repo conventions after increment 1.*

### Slice 1 — Visitors only

| Area | Tasks |
|------|--------|
| **`lib/showing-hq/visitors-view-query.ts` (new)** | Parse/normalize `openHouseId`, `sort`; `visitorsViewToHref`, `buildVisitorsListApiUrl`, `hasVisitorsViewInSearchParams` (save visibility), `visitorsViewFingerprint`, defaults for `sort`. |
| **`lib/showing-hq/saved-views-storage.ts` (new)** | Mirror ClientKeep: key `kp_showinghq_saved_views_v1`, `surface: VISITORS`, CRUD, dedupe, max count, corrupt JSON fallback. Unit tests. |
| **`app/(dashboard)/showing-hq/visitors/page.tsx`** | Pass `searchParams` into client view **or** make list a child with `Suspense` + `useSearchParams` inside `VisitorsListView`. |
| **`components/modules/showing-hq/visitors-list-view.tsx`** | Initialize state from URL; on filter/sort change `router.replace`; build `fetch` via `buildVisitorsListApiUrl`; **Save view** button + modal when `hasVisitorsViewInSearchParams`; **do not** save `q`. |
| **`app/(dashboard)/showing-hq/saved-views/page.tsx` (new)** | Hub: list VISITORS records, Open / Rename / Delete, browser-only copy, `storage` + focus refresh. |
| **`lib/modules.ts` or ShowingHQ nav** | Link to **Saved views** (sidebar or dashboard strip). |
| **`docs/showinghq/saved-views-v1-playbook.md`** | Appendix “TBD” → real helper path when merged. |

### Slice 2 — Showings

| Area | Tasks |
|------|--------|
| **`lib/showing-hq/showings-view-query.ts` (new)** | `source`, `feedbackOnly` only (**no** `openShowing` in fingerprint for Saved views). `showingsViewToHref`, `buildShowingsListApiUrl`, save visibility helper. |
| **`lib/showing-hq/saved-views-storage.ts`** | Extend record shape + fingerprint for `SHOWINGS`; dedupe per surface. |
| **`components/modules/showing-hq/showings-list-view.tsx`** | URL-driven `source`/`feedbackOnly`; `useShowings` accepts params or inline fetch with helper; UI controls write URL; **Save view** + modal. Keep **`openShowing`** from page props for deep link but **strip from saved payload**. |
| **`app/(dashboard)/showing-hq/showings/page.tsx`** | Ensure `searchParams` include new keys alongside `openShowing`. |
| **Hub** | Render SHOWINGS rows + Open links. |

### Slice 3 — Open houses (optional)

| Area | Tasks |
|------|--------|
| **`lib/showing-hq/open-houses-view-query.ts` (new)** | `status` only. |
| **`components/modules/open-houses/open-houses-list-view.tsx`** | URL sync + fetch `?status=` when present. |
| **`app/(dashboard)/open-houses/page.tsx`** | Forward `searchParams` if using server page pattern. |
| **Storage + hub** | `surface: OPEN_HOUSES`, tests, hub rows. |

### Cross-cutting (any slice)

- **Tests:** Jest for query helpers + storage (pattern: `lib/client-keep/__tests__/*`).  
- **Playbook QA checklist:** Run per slice before merge.  
- **No** `prisma/schema.prisma`, **nonew** RLS SQL.

---

## 5. Suggested branch plan (incremental delivery)

| Branch / phase | Contains | Merge criteria |
|------------------|----------|----------------|
| `feature/showinghq-saved-views-visitors` | Visitors URL + helper + storage + hub (visitors-only) + tests + nav link | QA checklist Visitors + hub; build green. |
| `feature/showinghq-saved-views-showings` | Showings query module + list URL/fetch + save UI + hub rows | QA Showings; no `openShowing` in saved records. |
| `feature/showinghq-saved-views-open-houses` *(optional)* | Open houses status URL + fetch + save + hub | QA open houses status + regression on unfiltered list. |

**Alternatives**

- Single long-lived `feature/showinghq-saved-views-v1` with **three sequential commits** (rebase/squash policy per team).  
- Merge Visitors to `main` first so production always has a **smaller** first slice (recommended for preview risk).

**After each merge:** Update `docs/platform/saved-views-spec.md` appendix table with shipped helper paths.

---

## 6. Decision log

| Decision | Choice |
|----------|--------|
| Rollout order | **Visitors → Showings → Open houses (optional)** |
| `openShowing` in saved views | **Exclude** — list filters only; manual bookmark still works |
| `q` on visitors | **Exclude** until promoted to URL |
| Showings client search | **Exclude** |
| DB / frameworks | **None** in v1 |

---

## Summary

Ship **Visitors** first (API-query alignment already exists). Add **Showings** once `source`/`feedbackOnly` are URL-backed and fetched. Add **Open houses** only after `status` is wired. **Do not** persist `openShowing` in Saved views v1—treat it as **transient navigation/deep-link state**, not a reproducible **saved view**. Keep each slice independently mergeable and schema-free.

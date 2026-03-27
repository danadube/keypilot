# ShowingHQ — Saved Views v1 (internal)

Ship scope: **Visitors** and **Showings** list surfaces. Open Houses remains out of scope for v1.

---

## Changelog entry

**ShowingHQ — Saved views (v1)**

- **Visitors** (`/showing-hq/visitors`): Save named list shortcuts for **`openHouseId`**, **`sort`**, and **`q`** (search). **`q`** is **canonical and URL-backed**; saved views include **normalized** search.
- **Showings** (`/showing-hq/showings`): Save shortcuts for **`source`** (`MANUAL` / `SUPRA_SCRAPE`), **`feedbackOnly=true`**, and **`q`**. List fetch matches the URL. **`openShowing`** remains a one-shot deep link — **not** saved, **not** fingerprinted, and **Save view** does **not** appear for `openShowing`-only URLs.
- Post-merge details and next steps: **`docs/showinghq/saved-views-search-url-follow-up.md`**.
- Manage shortcuts from **ShowingHQ → Saved views** (`/showing-hq/saved-views`): Open, rename, delete, copy link (browser-only clipboard); duplicates blocked by normalized fingerprints per surface.
- Persistence: **localStorage** only (`kp_showinghq_saved_views_v1`); **this device/browser**, not synced; cleared with site data.
- **Showings** summary metrics reflect the **filtered** dataset; total row subtitle calls out **“Matches current URL filters”** when list filters are active.
- No Postgres, Prisma schema, or RLS changes.

---

## Internal release note

**ShowingHQ: Saved views v1 (browser-only)**

Agents get labeled bookmarks that reopen the same **URL-backed** list filters on **Visitors** and **All Showings**, **including search (`q`)**—normalized and stored in the shortcut. Filters are whatever the address bar encodes for each surface (see playbook). Nothing is written to the database; shortcuts live in **localStorage** on that browser only.

**Entry points:** **Save view** on each list when the URL includes any saveable list grammar **(including canonical `q`)**, and **Saved views** in the ShowingHQ sidebar. The hub lists both Visitors and Showings rows with Open / Rename / Delete / Copy link.

Set expectations internally: **not synced**, lost if site data is cleared or on another device, and **visitor** shortcuts tied to an `openHouseId` may show an empty list if that open house was removed. **Showings** shortcuts restore **list filters and search (`q`)**, not which row’s edit modal was open (`openShowing` is intentionally excluded from Saved Views).

Grammar and constraints: `docs/showinghq/saved-views-v1-playbook.md` and `docs/platform/saved-views-spec.md`. Search **`q`** completion and API parity notes: `docs/showinghq/saved-views-search-url-follow-up.md`.

---

## Regression QA checklist — Showings surface

**URL & fetch**

- [ ] Default URL (`/showing-hq/showings`) loads unfiltered list; `GET` has no `source` / `feedbackOnly` / **`q`** unless set.
- [ ] **Source** (All / Manual / Supra) updates the URL via `router.replace` and refetches with matching query string.
- [ ] **Feedback requested only** toggles `feedbackOnly=true` in URL and API when on; omitted when off.
- [ ] Invalid `source=` value in URL is normalized away (address bar matches effective fetch).
- [ ] Deep link **`openShowing`**: opens edit when id exists in loaded list; strips `openShowing` while **preserving** `source` / `feedbackOnly` / **`q`**; no modal when id missing / not in list.

**Save view**

- [ ] **Save view** visible when **`source`** is set, **`feedbackOnly=true`**, or **`q`** is set — **hidden** when URL has **only** `openShowing` (no list filters / search).
- [ ] Modal states **`openShowing`** is not saved; **`q`** and other list params are saved (normalized).
- [ ] Empty name blocked; duplicate **same normalized** fingerprint (including **`q`**) blocked with clear message; limit message at cap.

**Hub**

- [ ] **Showings** row **Open** lands on correct `?source=` / `?feedbackOnly=` / **`q=`** combination when saved.
- [ ] Rename / delete / copy link behave as on Visitors; cross-tab refresh via `storage` + focus.

**Metrics**

- [ ] With filters active, **Total showings** count matches filtered rows; subtitle **“Matches current URL filters”** (not “All time”).
- [ ] Unfiltered list: subtitle **“All time”** when data present.

**Regression**

- [ ] Schedule showing, Supra Inbox, Feedback Requests links unchanged.
- [ ] **Search (`q`):** URL, API, and saved payloads aligned (server-filtered lists); clear filters clears **`q`**.

---

## Deferred follow-ups

- See **`docs/showinghq/saved-views-search-url-follow-up.md`** for shipped search-to-URL scope and recommended next slice.
- **Open houses list (optional P1):** Saved Views for `/open-houses` **`status`** only after the list UI passes `status` in URL and fetch consistently.
- **Optional product pass:** **Unfiltered** totals on the Showings page while filters are active would require a separate unfiltered fetch or UI treatment; current behavior is honest filtered metrics only.

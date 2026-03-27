# Post-merge follow-up — ShowingHQ Saved Views v1 + search-to-URL

**Summary:** Saved Views v1 (Visitors + Showings) is complete with **canonical `q`**: list search lives in the URL, is normalized consistently, and is included in local shortcuts—not as a separate client-only layer.

---

## 1. What shipped

- **Visitors** and **Showings**: optional **`q`** in the address bar; debounced `router.replace`; clear filters clears **`q`** and input; fetch uses the same canonical view as the page (`visitors-view-query` / `showings-view-query` + `list-search-q`).
- **Saved views (v1)**: browser-only storage records include **normalized `q`**; hub links and summaries surface search; dedupe fingerprints include **`q`** after normalization.
- **`openShowing`**: still **deep-link-only**—never stored, never in fingerprints; list navigation preserves it while adjusting filters/`q`, then strips it after the one-shot handoff (existing behavior, hardened so draft search is not dropped when the deep link clears).
- **API parity pass**: Visitors `GET` uses **`normalizeShowingHqListSearchQ`**; list API query param **order** matches page grammar (`openHouseId` → `sort` → `q` on Visitors; `source` → `feedbackOnly` → `q` on Showings).

---

## 2. Intentionally deferred

- **Persisted saved views** (Postgres / cross-device sync).
- **Open Houses** list saved views (same v1 pattern as Visitors/Showings).
- **Full-text / language-aware** search beyond `contains`/token splitting on the server.

---

## 3. Known non-goals

- **RLS / Prisma schema** changes for this slice.
- Saving **`openShowing`** or any “which row is open” UI state.
- **Guaranteeing** identical multi-token **search semantics** across Visitors vs Showings APIs (today: behavior may differ at the SQL clause level; see next slice).

---

## 4. Recommended next slice (pick one)

| Option | Rationale |
|--------|-----------|
| **Open Houses Saved Views v1** | Extends the same URL-first + localStorage pattern to the third ShowingHQ list surface; grammar and hub already established. |
| **Token-semantics alignment (Visitors vs Showings `q`)** | Product/engineering clarity: define whether multi-word `q` is **AND** vs **OR** across tokens (and fields), then align both route handlers and tests so UX matches mental model. |

**Reference:** `docs/showinghq/saved-views-v1-playbook.md`, `docs/platform/saved-views-spec.md`.

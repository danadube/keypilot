# ClientKeep — Saved segments v1 (internal)

## Changelog summary

**ClientKeep — Saved segments (v1)**

- Save named shortcuts to the Contacts list using the same URL rules as today: optional **status** (`?status=`) and optional **tag** (`?tagId=`).
- **Save segment** appears on Contacts when a **status** and/or **tag** filter is present in the **URL**; manage, rename, delete, and open shortcuts from **ClientKeep → Segments**.
- Shortcuts are stored in **browser localStorage only** (`kp_clientkeep_saved_segments_v1`): **this device/browser**, not synced, cleared if site data is cleared.
- **Duplicates** are blocked for the same **normalized** status + tag pair.
- **Tag-based** shortcuts can **break** if the tag is removed (Contacts may show an error; clear filters or delete the shortcut).
- No database or RLS changes.

---

## Internal release note

**ClientKeep: Saved segments v1 (browser-only)**

We’re shipping a lightweight “bookmark with a label” for contact views. Filters are exactly what the URL already supports: CRM **status** and a single **tag**. Nothing is written to Postgres; persistence is **localStorage** on the user’s browser.

**Entry points:** **Contacts** (save when **status** and/or **tagId** is in the **URL**—not client-only search) and **Segments** (presets, tag list, and “Your saved segments”).

Set expectations in support and docs: **not synced**, **lost if they clear site data or use another browser**, and **tag deletes** can invalidate saved links. Good for preview and power users; a future **v2** can move shortcuts to the account if we need cross-device or backup.

**This release validates demand for saved views before investing in account-level persistence.**

---

## QA checklist (regression)

**Access & surfaces**

- [ ] ClientKeep unlocked (module + CRM as needed): **Segments** and **Contacts** behave as before.
- [ ] **Save segment** visible only when the URL includes a valid **status** and/or **tagId** (not for plain `/contacts`).
- [ ] **Save segment** hidden when only client-side **search** is used (no matching query params).

**Save**

- [ ] Save with **status only**, **tag only**, **status + tag** → row appears under **Your saved segments** with correct **Open** URL.
- [ ] **Edge:** `/contacts?tagId=…` only (no `status` / effective “all statuses”) → save stores **tagId** only and **`status` null**; reopening shows tag filter only, **no** misleading stored “all” sentinel beyond what the URL grammar allows.
- [ ] Empty name blocked; name respects max length.
- [ ] Duplicate **same normalized filters** → clear error; changing **name only** does not bypass duplicate.
- [ ] At **max count**, save fails with limit message.

**Segments page**

- [ ] **Open** navigates to `/contacts?…` and list matches API.
- [ ] **Rename**: valid name persists; whitespace-only shows hint / does not save.
- [ ] **Delete**: confirm appears; row removed; localStorage updates.
- [ ] **Cross-tab:** change list in tab A → tab B on Segments updates on focus or `storage` event.

**Stale tag**

- [ ] Open shortcut whose **tagId** no longer exists → error path is understandable; **Clear filters** / remove shortcut works.

**Browser-only**

- [ ] New browser / incognito → no saved rows unless re-saved.
- [ ] Copy explains **this browser only** (Contacts modal + Segments).

**Regression**

- [ ] Status tabs and tag chip on Contacts still sync URL and refetch.
- [ ] `GET /api/v1/contacts` unchanged for unfiltered and filtered requests.

---

## Future improvements (DB-backed v2)

- Persist segments per **`users.id`** (or Clerk linkage) with **display name** and normalized **`normalizedStatus`** / **`normalizedTagId`** (or equivalent).
- Enforce uniqueness with a **unique constraint on `(userId, normalizedStatus, normalizedTagId)`** using **COALESCE sentinels** or a **deterministic hash column** so nullable combinations stay unique in Postgres (same idea as today’s fingerprints).
- **Migration:** optional one-time import from localStorage or merge on first login.
- **Tag lifecycle:** show labels; on tag delete, flag or auto-disable shortcuts instead of opaque failures.
- **Sync** across devices; survive cache clears; optional sharing later.
- **Preserve URL grammar parity** by continuing to use **`lib/client-keep/contact-segment-query`** (or its successor) for **both** client navigation and **API** validation so v2 cannot drift from `/contacts` behavior.

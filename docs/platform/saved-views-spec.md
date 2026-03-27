# Saved Views — Platform design (KeyPilot)

**Status:** Spec (incremental; no mandatory framework)  
**Audience:** Product + engineering  
**Related:** `docs/templates/feature-playbook-template.md`, `docs/client-keep/saved-segments-v1-release.md`

This document defines **Saved Views**: a cross-module **pattern** for named shortcuts to list/surface state. It does **not** mandate a shared npm package or global service in v1—only **discipline** so each module can evolve **URL → local → DB** without drift or overbuild.

---

## 1. Definition — what qualifies as a “view”

A **Saved View** is a **named, user-created shortcut** that restores a **reproducible** slice of product state for a **single KeyPilot module** (or a single top-level surface within a module), such that:

1. **Canonical definition** — The view is fully described by a **documented set of parameters** that the app already understands (typically **URL query parameters** on a known base path, or an equivalent ordered map of keys/values).
2. **Server-truth alignment** — The same parameter set can be sent to **existing** (or minimally extended) APIs and produce the **same** list/dataset semantics as navigating manually (no “phantom filters” only the client understands).
3. **User scope** — In v1, persistence is **per browser** (localStorage). In v2, persistence is **per account** (Postgres), still **not** cross-user unless explicitly designed (sharing is out of scope here).
4. **Not a dashboard tile** — A view is not an arbitrary widget layout; it is **filter/navigation state** applied to an already-defined screen.

**Examples that qualify (when grammar exists):** ClientKeep contacts with `status` + `tagId`; ShowingHQ list with date range + status filters; Transactions pipeline with stage filter—**only after** those params are stable and API-backed.

**Examples that do not qualify yet:** Client-only search text with no query param; ad-hoc sort in memory only; multi-step wizard state; permissions-dependent “views” without a stable grammar.

---

## 2. Stable query grammar — requirements (per module)

Each module that adopts Saved Views MUST define a **module view grammar**: a contract for how state serializes to the URL (and optionally to storage).

**R1 — Documented** — The grammar is written down (module playbook or this spec’s appendix table as modules onboard). Parameter names, allowed values, normalization (trim, case, enums), and defaults are explicit.

**R2 — Normalized** — Two URLs that mean the same thing MUST normalize to the same **fingerprint** (for dedupe and v2 uniqueness). Prefer **one shared helper** per surface (e.g. `lib/<area>/...-query.ts`) used by **list UI, router, and API validation**.

**R3 — API parity** — `GET` (or list) handlers accept the same logical filters the URL encodes; validation via **Zod** (or equivalent) at the API boundary. No “save in UI” that the API cannot reproduce.

**R4 — Bounded** — v1 grammars should stay **small** (handful of params). New params require an explicit **version bump** of the grammar doc, not silent growth.

**R5 — Explicit non-persistence** — Any filter that exists only in React state and **not** in the URL is **out of scope** for Saved Views v1 unless the module first promotes it to query params.

---

## 3. localStorage v1 pattern — how implementations should look

**Storage key** — Namespaced and versioned, e.g. `kp_<module>_<surface>_saved_views_v1` or existing convention (`kp_clientkeep_saved_segments_v1`). Avoid generic keys.

**Record shape (logical)** — Keep flat and JSON-serializable:

- `id` — client-generated UUID or equivalent  
- `name` — display label, max length capped  
- **Filter fields** — same names/types as **normalized** grammar (e.g. `status`, `tagId`), using `null`/omit for “unset,” not ad-hoc sentinels  
- Optional: `createdAt` later for v2 migration ordering  

**UX** — Save only when **canonical** filters are present in the URL (or equivalent); never persist client-only search. **Duplicate** detection by **normalized fingerprint** of filter fields. **Browser-only** copy in UI.

**Code** — Prefer:

- One **parse** + **serialize** + **href builder** module per surface  
- Storage helpers: load (tolerant parse), persist, add/rename/delete; max count; no throws to UI  
- **Tests** for grammar and storage guards (as in ClientKeep saved segments)

**Cross-module consistency** — Same **ideas**, not necessarily one shared code package: key naming pattern, record shape **pattern**, fingerprint rule, QA playbook section.

---

## 4. Future DB-backed model (v2) — compatible with URL grammar

**Goal:** Account-level Saved Views that **round-trip** through the same grammar as v1 URLs.

**Logical model (conceptual)** — Table roughly:

| Column | Notes |
|--------|--------|
| `id` | UUID PK |
| `userId` | FK to app user (Prisma `users.id`); RLS tenant key |
| `module` | Enum or string: e.g. `CLIENT_KEEP_CONTACTS` |
| `surfaceBasePath` | e.g. `/contacts` (or stable identifier) |
| `name` | User label |
| `normalizedStatus` / `normalizedTagId` / … | Columns OR single `filters` JSONB with **schema** matching grammar |
| `filterFingerprint` | Deterministic hash or generated column for **unique** `(userId, module, fingerprint)` |
| `createdAt`, `updatedAt` | Standard |

**Uniqueness** — Use **`(userId, filterFingerprint)`** or **`(userId, module, filterFingerprint)`** with fingerprint built from **normalized** grammar (avoids Postgres nullable unique pitfalls; same approach as v1 JSON fingerprint).

**RLS** — Policies: user may only **read/write** rows where `userId = current_user()`. No cross-tenant leakage. Writes go through **Prisma** + existing auth; no ad-hoc `prismaAdmin` for user data without review.

**API** — CRUD under `/api/v1/...` with Zod; responses include enough to build `href` via **shared** grammar helpers.

**Migration from localStorage** — Optional one-shot “Import browser shortcuts” using v1 key(s); merge or replace policy documented in module playbook.

**Parity rule** — Server accepts **only** filter combinations that **URL + Zod** already allow; **no** second shadow grammar.

---

## 5. Constraints — avoid overengineering

**Do not (platform-wide):**

- Build a **global Saved View engine** before **two modules** prove the pattern with real users.  
- Force **one** React context or **one** mega-hook for all modules.  
- Add **sharing**, **teams**, **org-wide defaults**, or **admin templates** in v1/v2 without a separate product decision.  
- Persist **client-only** filters by stuffing opaque blobs into DB without grammar docs.  
- Bypass **RLS** or **Zod** for convenience.

**Do:**

- Ship **module-local** v1 with playbook + tests.  
- Extract **shared utilities** only when duplication is **proven** (second module copies the same helpers).  
- Keep **ShowingHQ** vs **ClientKeep** vs **Transactions** **concept boundaries** (e.g. do not merge “showing” and “open house” semantics into one generic view type).

**Incremental evolution:**

1. Module defines grammar + URL sync.  
2. Module ships localStorage Saved Views v1 + playbook.  
3. If usage warrants: DB v2 **for that module** first; then generalize DDL/conventions if patterns repeat.

---

## 6. Cross-module considerations

| Topic | Guidance |
|-------|----------|
| **Naming** | “Saved segment”, “Saved filter”, “Saved view” — pick **one** customer-facing term per surface if possible; internal code may stay `saved-segments` historically. |
| **Modules** | Each module owns its grammar doc and storage key. Platform spec defines **rules**, not every param. |
| **Nav** | Deep links must use **module routes** already exposed to users; no hidden internal-only URLs. |
| **Entitlements** | Save/open must respect **module gate** + **product tier** (e.g. CRM); v1 may hide save if API would 403. |
| **Analytics** | Optional later; not required for pattern adoption. |

**Appendix (living):** As modules adopt Saved Views, add a row:

| Module | Surface | Base path | Grammar doc / helper | Storage key (v1) |
|--------|---------|-----------|----------------------|------------------|
| ClientKeep | Contacts | `/contacts` | `lib/client-keep/contact-segment-query.ts` | `kp_clientkeep_saved_segments_v1` |
| ShowingHQ | Visitors | `/showing-hq/visitors` | `lib/showing-hq/visitors-view-query.ts` | `kp_showinghq_saved_views_v1` |
| ShowingHQ | Private showings | `/showing-hq/showings` | `lib/showing-hq/showings-view-query.ts` | `kp_showinghq_saved_views_v1` |
| ShowingHQ | Open houses | `/open-houses` | `lib/showing-hq/open-houses-view-query.ts` | `kp_showinghq_saved_views_v1` |
| *TBD* | *TBD* | *TBD* | *TBD* | *TBD* |

---

## 7. Non-goals

- **Cross-module “super views”** (one saved link opening multiple modules).  
- **Real-time collaborative** editing of shared views.  
- **Role-based view libraries** at platform level (v2+ product).  
- **Replacing** module-specific dashboards with a generic BI tool.  
- **Mandatory adoption** — modules opt in when grammar is stable.

---

## Summary

**Saved Views** in KeyPilot mean **named shortcuts** to **URL-aligned**, **API-validated** filter state, shipped **per module** as **URL → localStorage (v1) → optional Postgres (v2)**, with **shared discipline** and **minimal shared code** until the pattern proves out twice. This spec is the **guardrail**; feature playbooks are the **per-ship record**.

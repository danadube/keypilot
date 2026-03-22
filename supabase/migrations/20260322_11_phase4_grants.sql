-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 4 — Grants for activities and usage_events
-- ═══════════════════════════════════════════════════════════════════════════
--
-- TABLES
--
--   activities    Event log table. No direct userId column.
--                 Ownership is derived from linked resources:
--                   openHouseId → open_houses (multi-role: host/listing/hostAgent)
--                   contactId   → contacts (2-hop via open_house_visitors → open_houses)
--                   propertyId  → properties (createdByUserId)
--                 keypilot_app gets SELECT ONLY. All writes are performed by
--                 routes running as postgres (BYPASSRLS) and must remain so.
--                 No INSERT/UPDATE/DELETE grant — enforcement stays at app layer.
--
--   usage_events  Internal analytics event log. Direct userId ownership.
--                 keypilot_app gets SELECT + INSERT.
--                 No UPDATE or DELETE — usage events are append-only by design.
--                 The analytics/summary route reads cross-user data via postgres
--                 (BYPASSRLS) and is unaffected by these policies.
--
-- WHY NOT GRANT INSERT ON activities?
--
--   All current activity write sites use plain prisma (postgres role, BYPASSRLS):
--     - Public visitor-signin route (no auth context available)
--     - 6 Clerk-authenticated routes that create activities as a side effect
--       of their primary action (open house create, send, notes, etc.)
--   Granting INSERT + enabling RLS on activities would silently block those
--   writes if any route migrates to withRLSContext without an INSERT policy.
--   Safest approach: SELECT grant only, keep writes in BYPASSRLS permanently
--   until each write route is explicitly migrated with a validated INSERT policy.
--
-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
--
--   REVOKE SELECT          ON public."activities"   FROM keypilot_app;
--   REVOKE SELECT, INSERT  ON public."usage_events" FROM keypilot_app;
--
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- activities: SELECT only — writes remain BYPASSRLS (see design note above)
grant select
  on public."activities"
  to keypilot_app;

-- usage_events: SELECT + INSERT — append-only; no UPDATE or DELETE granted
grant select, insert
  on public."usage_events"
  to keypilot_app;

commit;

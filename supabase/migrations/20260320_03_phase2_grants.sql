-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 2 — keypilot_app grants for core ShowingHQ tables
-- ═══════════════════════════════════════════════════════════════════════════
--
-- TABLES ADDED HERE
--
--   properties         Direct single-user ownership (createdByUserId)
--   showings           Direct single-user ownership (hostUserId)
--   open_houses        Multi-role ownership (hostUserId | listingAgentId | hostAgentId)
--   open_house_visitors Transitive ownership via open_houses
--   contacts           Transitive ownership via open_house_visitors → open_houses
--                      NOTE: contacts has no createdByUserId; public visitor-signin
--                      (runs as postgres, BYPASSRLS) creates contacts. keypilot_app
--                      receives no INSERT grant — contact creation stays in postgres.
--   follow_up_drafts   Transitive ownership via open_houses
--                      Auto-created by visitor-signin (postgres), but agents can also
--                      create drafts from authenticated routes.
--   seller_reports     Transitive via open_houses + generatedByUserId
--                      No UPDATE route exists; only INSERT (generate) and DELETE.
--
-- GRANT REASONING
--
--   All grants are minimal for Phase 2 authenticated routes:
--     contacts: no INSERT (created exclusively by postgres in visitor-signin path)
--     seller_reports: no UPDATE (no update route; regenerate = DELETE + INSERT)
--
-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
--
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON public."properties"          FROM keypilot_app;
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON public."showings"            FROM keypilot_app;
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON public."open_houses"         FROM keypilot_app;
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON public."open_house_visitors" FROM keypilot_app;
--   REVOKE SELECT,         UPDATE, DELETE ON public."contacts"            FROM keypilot_app;
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON public."follow_up_drafts"    FROM keypilot_app;
--   REVOKE SELECT, INSERT,         DELETE ON public."seller_reports"      FROM keypilot_app;
--
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- properties: full CRUD — agent manages their own property listings
grant select, insert, update, delete
  on public."properties"
  to keypilot_app;

-- showings: full CRUD — agent manages their own showings
grant select, insert, update, delete
  on public."showings"
  to keypilot_app;

-- open_houses: full CRUD — agent manages their own open house events
grant select, insert, update, delete
  on public."open_houses"
  to keypilot_app;

-- open_house_visitors: full CRUD — agent manages visitor records for their OHs
--   INSERT also needed for authenticated "manual add visitor" flows.
--   Public visitor-signin runs as postgres (BYPASSRLS) — not this role.
grant select, insert, update, delete
  on public."open_house_visitors"
  to keypilot_app;

-- contacts: SELECT, UPDATE, DELETE only.
--   No INSERT — contacts are created exclusively by the postgres visitor-signin path.
--   If a future authenticated "create contact" route is added, revisit this grant.
grant select, update, delete
  on public."contacts"
  to keypilot_app;

-- follow_up_drafts: full CRUD — agent reviews and sends follow-up drafts
grant select, insert, update, delete
  on public."follow_up_drafts"
  to keypilot_app;

-- seller_reports: SELECT, INSERT, DELETE — no UPDATE route; reports are regenerated
grant select, insert, delete
  on public."seller_reports"
  to keypilot_app;

commit;

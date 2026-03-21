-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 2a — RLS for direct single-owner tables: properties, showings
-- ═══════════════════════════════════════════════════════════════════════════
--
-- OWNERSHIP MODEL
--
--   properties:  createdByUserId = the agent who created the listing
--   showings:    hostUserId      = the agent who scheduled the showing
--
-- DESIGN NOTES
--
--   These are the simplest Phase 2 tables: one field, one owner, same pattern
--   as Phase 1 (connections, user_profiles). No multi-role or transitive chains.
--
--   Public routes that access properties/showings run as postgres (BYPASSRLS):
--     - No public unauthenticated routes touch properties directly.
--     - Showings are accessed by feedback routes (by-token) as postgres.
--
-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
--
--   ALTER TABLE public."properties" DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public."showings"   DISABLE ROW LEVEL SECURITY;
--
--   DROP POLICY IF EXISTS properties_select_own  ON public."properties";
--   DROP POLICY IF EXISTS properties_insert_own  ON public."properties";
--   DROP POLICY IF EXISTS properties_update_own  ON public."properties";
--   DROP POLICY IF EXISTS properties_delete_own  ON public."properties";
--
--   DROP POLICY IF EXISTS showings_select_own  ON public."showings";
--   DROP POLICY IF EXISTS showings_insert_own  ON public."showings";
--   DROP POLICY IF EXISTS showings_update_own  ON public."showings";
--   DROP POLICY IF EXISTS showings_delete_own  ON public."showings";
--
-- ─── VALIDATION ──────────────────────────────────────────────────────────────
--
--   SELECT tablename, relrowsecurity, COUNT(policyname) AS policy_count
--   FROM pg_policies p
--   JOIN pg_class c ON c.relname = p.tablename
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE p.schemaname = 'public'
--     AND p.tablename IN ('properties', 'showings')
--     AND n.nspname = 'public'
--   GROUP BY tablename, relrowsecurity ORDER BY tablename;
--
--   Expected:
--     properties  | true | 4
--     showings    | true | 4
--
--   Run scripts/validate-rls-phase2.sql for full cross-user isolation proof.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) properties
-- ─────────────────────────────────────────────────────────────────────────────

alter table public."properties" enable row level security;

drop policy if exists properties_select_own on public."properties";
drop policy if exists properties_insert_own on public."properties";
drop policy if exists properties_update_own on public."properties";
drop policy if exists properties_delete_own on public."properties";

create policy properties_select_own
  on public."properties" for select to keypilot_app
  using ("createdByUserId" = app.current_user_id());

create policy properties_insert_own
  on public."properties" for insert to keypilot_app
  with check ("createdByUserId" = app.current_user_id());

create policy properties_update_own
  on public."properties" for update to keypilot_app
  using  ("createdByUserId" = app.current_user_id())
  with check ("createdByUserId" = app.current_user_id());

create policy properties_delete_own
  on public."properties" for delete to keypilot_app
  using ("createdByUserId" = app.current_user_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) showings
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Feedback routes (feedback/by-token, feedback/submit) run as postgres
-- (BYPASSRLS) and are unaffected by these policies.

alter table public."showings" enable row level security;

drop policy if exists showings_select_own on public."showings";
drop policy if exists showings_insert_own on public."showings";
drop policy if exists showings_update_own on public."showings";
drop policy if exists showings_delete_own on public."showings";

create policy showings_select_own
  on public."showings" for select to keypilot_app
  using ("hostUserId" = app.current_user_id());

create policy showings_insert_own
  on public."showings" for insert to keypilot_app
  with check ("hostUserId" = app.current_user_id());

create policy showings_update_own
  on public."showings" for update to keypilot_app
  using  ("hostUserId" = app.current_user_id())
  with check ("hostUserId" = app.current_user_id());

create policy showings_delete_own
  on public."showings" for delete to keypilot_app
  using ("hostUserId" = app.current_user_id());

commit;

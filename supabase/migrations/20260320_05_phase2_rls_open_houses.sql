-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 2b — RLS for open_houses (multi-role ownership)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- OWNERSHIP MODEL
--
--   open_houses has three possible owner fields:
--     hostUserId      — always set; the agent who created and manages the event
--     listingAgentId  — optional; the property's listing agent
--     hostAgentId     — optional; an agent sitting the open house on behalf of the host
--
--   Current app behavior: all three roles have equal READ and WRITE access.
--   This migration matches that behavior.
--
-- ⚠️  DESIGN ASSUMPTION — confirm before applying to production:
--
--   This migration grants all three roles (hostUserId, listingAgentId, hostAgentId)
--   full SELECT + UPDATE access. Only hostUserId can DELETE (creator-only delete).
--   INSERT requires hostUserId = current_user_id (you create as yourself).
--
--   If the intent is read-only access for listingAgentId / hostAgentId (guests
--   cannot edit), split the policies:
--     - Replace combined select/update policy with two separate policies:
--       one for SELECT (all 3), one for UPDATE (hostUserId only).
--
-- PUBLIC ROUTES (run as postgres, BYPASSRLS — not affected by these policies):
--   GET /api/v1/open-houses/by-slug/[slug]  — visitor sign-in QR page
--
-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
--
--   ALTER TABLE public."open_houses" DISABLE ROW LEVEL SECURITY;
--
--   DROP POLICY IF EXISTS open_houses_select_participant ON public."open_houses";
--   DROP POLICY IF EXISTS open_houses_insert_own         ON public."open_houses";
--   DROP POLICY IF EXISTS open_houses_update_participant ON public."open_houses";
--   DROP POLICY IF EXISTS open_houses_delete_own         ON public."open_houses";
--
-- ─── VALIDATION ──────────────────────────────────────────────────────────────
--
--   SELECT tablename, relrowsecurity, COUNT(policyname) AS policy_count
--   FROM pg_policies p
--   JOIN pg_class c ON c.relname = p.tablename
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE p.schemaname = 'public'
--     AND p.tablename = 'open_houses' AND n.nspname = 'public'
--   GROUP BY tablename, relrowsecurity;
--
--   Expected: open_houses | true | 4
--
--   Run scripts/validate-rls-phase2.sql for cross-user isolation proof.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

alter table public."open_houses" enable row level security;

drop policy if exists open_houses_select_participant on public."open_houses";
drop policy if exists open_houses_insert_own         on public."open_houses";
drop policy if exists open_houses_update_participant on public."open_houses";
drop policy if exists open_houses_delete_own         on public."open_houses";

-- SELECT: any of the three roles can see the open house
create policy open_houses_select_participant
  on public."open_houses" for select to keypilot_app
  using (
    "hostUserId"     = app.current_user_id() or
    "listingAgentId" = app.current_user_id() or
    "hostAgentId"    = app.current_user_id()
  );

-- INSERT: only as host (you are the event creator)
create policy open_houses_insert_own
  on public."open_houses" for insert to keypilot_app
  with check ("hostUserId" = app.current_user_id());

-- UPDATE: all three roles can edit (matches current app behavior)
-- ⚠️  If guests (listingAgentId, hostAgentId) should be read-only, change
--     this policy to: using ("hostUserId" = app.current_user_id())
create policy open_houses_update_participant
  on public."open_houses" for update to keypilot_app
  using (
    "hostUserId"     = app.current_user_id() or
    "listingAgentId" = app.current_user_id() or
    "hostAgentId"    = app.current_user_id()
  )
  with check (
    "hostUserId"     = app.current_user_id() or
    "listingAgentId" = app.current_user_id() or
    "hostAgentId"    = app.current_user_id()
  );

-- DELETE: host only (creator controls lifecycle)
create policy open_houses_delete_own
  on public."open_houses" for delete to keypilot_app
  using ("hostUserId" = app.current_user_id());

commit;

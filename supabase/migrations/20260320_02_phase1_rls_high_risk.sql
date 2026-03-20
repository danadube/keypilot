-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 1b — RLS policies for highest-risk tables
-- ═══════════════════════════════════════════════════════════════════════════
--
-- TABLES HARDENED HERE
--
--   connections        accessToken + refreshToken in plaintext — highest risk
--   feedback_requests  token column used for public form authentication
--   users              auth identity: email, clerkId, role, productTier
--   user_profiles      PII: phone, brokerage name, headshot URL, logo URL
--
-- SECURITY MODEL
--
--   Policies target `keypilot_app` ONLY (not `anon`, `authenticated`, or `public`).
--   `postgres` (rolbypassrls = true) is unaffected — all existing Prisma routes
--   that have not yet been updated to withRLSContext continue to work unchanged.
--
--   Public routes (e.g. feedback form by token, visitor sign-in) run as postgres
--   and bypass RLS entirely. They are protected by app-level logic and are
--   outside the scope of these policies.
--
--   Authenticated routes that use withRLSContext switch to keypilot_app.
--   These policies then enforce that the queried rows belong to the caller.
--
-- POLICY IDENTITY FUNCTION
--
--   All policies use app.current_user_id() instead of auth.uid().
--   auth.uid() is Supabase-specific and returns NULL for Prisma/Clerk traffic.
--   app.current_user_id() reads a transaction-local GUC set by withRLSContext.
--
-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
--
--   Run these statements in order to completely undo this migration:
--
--   ALTER TABLE public."connections"       DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public."feedback_requests" DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public."users"             DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public."user_profiles"     DISABLE ROW LEVEL SECURITY;
--
--   DROP POLICY IF EXISTS connections_select_own       ON public."connections";
--   DROP POLICY IF EXISTS connections_insert_own       ON public."connections";
--   DROP POLICY IF EXISTS connections_update_own       ON public."connections";
--   DROP POLICY IF EXISTS connections_delete_own       ON public."connections";
--
--   DROP POLICY IF EXISTS feedback_requests_select_host ON public."feedback_requests";
--   DROP POLICY IF EXISTS feedback_requests_insert_host ON public."feedback_requests";
--   DROP POLICY IF EXISTS feedback_requests_update_host ON public."feedback_requests";
--   DROP POLICY IF EXISTS feedback_requests_delete_host ON public."feedback_requests";
--
--   DROP POLICY IF EXISTS users_select_own  ON public."users";
--   DROP POLICY IF EXISTS users_update_own  ON public."users";
--
--   DROP POLICY IF EXISTS user_profiles_select_own  ON public."user_profiles";
--   DROP POLICY IF EXISTS user_profiles_insert_own  ON public."user_profiles";
--   DROP POLICY IF EXISTS user_profiles_update_own  ON public."user_profiles";
--   DROP POLICY IF EXISTS user_profiles_delete_own  ON public."user_profiles";
--
-- ─── VALIDATION ──────────────────────────────────────────────────────────────
--
--   -- Confirm RLS is enabled and policies exist
--   SELECT tablename, relrowsecurity, COUNT(policyname) AS policy_count
--   FROM pg_policies p
--   JOIN pg_class c ON c.relname = p.tablename
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE p.schemaname = 'public'
--     AND p.tablename IN ('connections','feedback_requests','users','user_profiles')
--     AND n.nspname = 'public'
--   GROUP BY tablename, relrowsecurity
--   ORDER BY tablename;
--
--   Expected output:
--     connections        | true | 4
--     feedback_requests  | true | 4
--     users              | true | 2
--     user_profiles      | true | 4
--
--   Run scripts/validate-rls-phase1.sql for full cross-user isolation proof.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) connections  (OAuth tokens — highest sensitivity)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public."connections" enable row level security;

drop policy if exists connections_select_own on public."connections";
drop policy if exists connections_insert_own on public."connections";
drop policy if exists connections_update_own on public."connections";
drop policy if exists connections_delete_own on public."connections";

create policy connections_select_own
  on public."connections"
  for select to keypilot_app
  using ("userId" = app.current_user_id());

create policy connections_insert_own
  on public."connections"
  for insert to keypilot_app
  with check ("userId" = app.current_user_id());

create policy connections_update_own
  on public."connections"
  for update to keypilot_app
  using  ("userId" = app.current_user_id())
  with check ("userId" = app.current_user_id());

create policy connections_delete_own
  on public."connections"
  for delete to keypilot_app
  using ("userId" = app.current_user_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) feedback_requests  (contains token column for public form authentication)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Public form routes (feedback/by-token, feedback/submit) run as postgres
-- (BYPASSRLS) and are unaffected by these policies.

alter table public."feedback_requests" enable row level security;

drop policy if exists feedback_requests_select_host on public."feedback_requests";
drop policy if exists feedback_requests_insert_host on public."feedback_requests";
drop policy if exists feedback_requests_update_host on public."feedback_requests";
drop policy if exists feedback_requests_delete_host on public."feedback_requests";

create policy feedback_requests_select_host
  on public."feedback_requests"
  for select to keypilot_app
  using ("hostUserId" = app.current_user_id());

create policy feedback_requests_insert_host
  on public."feedback_requests"
  for insert to keypilot_app
  with check ("hostUserId" = app.current_user_id());

create policy feedback_requests_update_host
  on public."feedback_requests"
  for update to keypilot_app
  using  ("hostUserId" = app.current_user_id())
  with check ("hostUserId" = app.current_user_id());

create policy feedback_requests_delete_host
  on public."feedback_requests"
  for delete to keypilot_app
  using ("hostUserId" = app.current_user_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) users  (auth identity: email, clerkId, role, productTier, moduleAccess)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- INSERT: omitted intentionally. User rows are created by the Clerk webhook
--         route, which runs as postgres (BYPASSRLS) and never needs this policy.
-- DELETE: omitted intentionally. App code never deletes user rows.

alter table public."users" enable row level security;

drop policy if exists users_select_own on public."users";
drop policy if exists users_update_own on public."users";

create policy users_select_own
  on public."users"
  for select to keypilot_app
  using ("id" = app.current_user_id());

create policy users_update_own
  on public."users"
  for update to keypilot_app
  using  ("id" = app.current_user_id())
  with check ("id" = app.current_user_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) user_profiles  (PII: phone, brokerage, headshot URL, logo URL)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public."user_profiles" enable row level security;

drop policy if exists user_profiles_select_own on public."user_profiles";
drop policy if exists user_profiles_insert_own on public."user_profiles";
drop policy if exists user_profiles_update_own on public."user_profiles";
drop policy if exists user_profiles_delete_own on public."user_profiles";

create policy user_profiles_select_own
  on public."user_profiles"
  for select to keypilot_app
  using ("userId" = app.current_user_id());

create policy user_profiles_insert_own
  on public."user_profiles"
  for insert to keypilot_app
  with check ("userId" = app.current_user_id());

create policy user_profiles_update_own
  on public."user_profiles"
  for update to keypilot_app
  using  ("userId" = app.current_user_id())
  with check ("userId" = app.current_user_id());

create policy user_profiles_delete_own
  on public."user_profiles"
  for delete to keypilot_app
  using ("userId" = app.current_user_id());

commit;

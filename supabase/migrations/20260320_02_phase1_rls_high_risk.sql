-- Phase 1b — RLS policies for highest-risk tables
--
-- Tables hardened in this migration:
--   connections      — stores OAuth accessToken + refreshToken in plaintext
--   feedback_requests — stores token column used for public form auth
--   users            — auth identity (email, clerkId, role, productTier)
--   user_profiles    — PII: phone, brokerage, headshot URL
--
-- Security model:
--   - Policies target `keypilot_app` role ONLY (not `anon` or `authenticated`).
--   - `postgres` (BYPASSRLS=true) is unaffected; existing routes keep working.
--   - Public routes (feedback form by token) run as `postgres` and bypass RLS.
--   - Authenticated routes using withRLSContext switch to keypilot_app and
--     RLS is enforced for them.
--
-- Key difference from the old Supabase migration (20260318_rls_deny_by_default_keypilot.sql):
--   - Does NOT use auth.uid() (Supabase-specific, returns null for Prisma/Clerk traffic)
--   - Uses app.current_user_id() — set by Prisma withRLSContext per-transaction
--   - Policies are for keypilot_app, not `authenticated`
--
-- Rollback (undo this migration):
--   ALTER TABLE public."connections"       DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public."feedback_requests" DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public."users"             DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public."user_profiles"     DISABLE ROW LEVEL SECURITY;
--   -- All DROP POLICY statements are emitted before each CREATE POLICY below;
--   -- re-running after ALTER TABLE DISABLE removes policy metadata too.
--
-- Validation (run after applying):
--   SELECT tablename, policyname, roles, cmd
--   FROM pg_policies
--   WHERE schemaname = 'public'
--     AND tablename IN ('connections','feedback_requests','users','user_profiles')
--   ORDER BY tablename, policyname;
--   -- Expected: 4 policies per table (select/insert/update/delete) for connections,
--   --           4 for feedback_requests, 2 for users (no insert — created by webhook),
--   --           4 for user_profiles.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) connections  (OAuth tokens — highest sensitivity)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public."connections" enable row level security;

drop policy if exists connections_select_own    on public."connections";
drop policy if exists connections_insert_own    on public."connections";
drop policy if exists connections_update_own    on public."connections";
drop policy if exists connections_delete_own    on public."connections";

-- An agent may only see their own connection records.
-- accessToken/refreshToken columns are included — filtered to owner only.
create policy connections_select_own
  on public."connections"
  for select to keypilot_app
  using ("userId" = app.current_user_id());

-- Insert: agent can only create connections for themselves.
create policy connections_insert_own
  on public."connections"
  for insert to keypilot_app
  with check ("userId" = app.current_user_id());

-- Update: agent can only modify their own connections.
create policy connections_update_own
  on public."connections"
  for update to keypilot_app
  using  ("userId" = app.current_user_id())
  with check ("userId" = app.current_user_id());

-- Delete: agent can only disconnect their own accounts.
create policy connections_delete_own
  on public."connections"
  for delete to keypilot_app
  using ("userId" = app.current_user_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) feedback_requests  (contains `token` column used for public form auth)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Note: public form routes (feedback/by-token, feedback/submit) run as postgres
-- (BYPASSRLS) and are NOT affected by these policies.

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
-- 3) users  (auth identity — email, clerkId, role, productTier, moduleAccess)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- No INSERT policy: user rows are created by the Clerk webhook route which runs
-- as postgres (BYPASSRLS). app code never inserts directly.
-- No DELETE policy: users are never deleted via app logic.

alter table public."users" enable row level security;

drop policy if exists users_select_own on public."users";
drop policy if exists users_update_own on public."users";

-- An agent may only read their own user row.
create policy users_select_own
  on public."users"
  for select to keypilot_app
  using ("id" = app.current_user_id());

-- An agent may only update their own user row (e.g. name, email sync).
create policy users_update_own
  on public."users"
  for update to keypilot_app
  using  ("id" = app.current_user_id())
  with check ("id" = app.current_user_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) user_profiles  (branding PII: phone, brokerage, headshot URL, logo URL)
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

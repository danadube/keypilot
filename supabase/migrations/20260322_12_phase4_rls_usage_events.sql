-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 4a — RLS for usage_events (direct userId ownership)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- OWNERSHIP MODEL
--
--   usage_events has a direct userId FK. Ownership is simple and unambiguous:
--   you own the events you created. No sharing, no multi-role, no cascade.
--
-- WRITE PATH (unaffected by these policies)
--
--   All writes go through trackUsageEvent() (lib/track-usage.ts), which uses
--   plain prisma (postgres role, BYPASSRLS). The analytics/track POST route
--   calls trackUsageEvent with userId = getCurrentUser().id, so it correctly
--   scopes writes to the authenticated user without needing RLS enforcement.
--
--   If a future route writes usage events via keypilot_app context, the INSERT
--   policy below (WITH CHECK "userId" = current_user_id()) will enforce that
--   the event's userId matches the authenticated caller. Defense-in-depth.
--
-- READ PATH
--
--   GET /api/v1/analytics/summary reads ALL users' events for aggregate counts.
--   That route uses plain prisma (postgres role, BYPASSRLS) deliberately and
--   is unaffected by these policies. No change to that route is needed or made.
--
--   Per-user event reads (if added in future) will be RLS-scoped automatically.
--
-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
--
--   ALTER TABLE public."usage_events" DISABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS usage_events_select_own ON public."usage_events";
--   DROP POLICY IF EXISTS usage_events_insert_own ON public."usage_events";
--
-- ─── VALIDATION ──────────────────────────────────────────────────────────────
--
--   SELECT tablename, relrowsecurity, COUNT(policyname) AS policy_count
--   FROM pg_policies p
--   JOIN pg_class c ON c.relname = p.tablename
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE p.schemaname = 'public' AND p.tablename = 'usage_events'
--     AND n.nspname = 'public'
--   GROUP BY tablename, relrowsecurity;
--
--   Expected: usage_events | true | 2
--
-- ═══════════════════════════════════════════════════════════════════════════

begin;

alter table public."usage_events" enable row level security;

drop policy if exists usage_events_select_own on public."usage_events";
drop policy if exists usage_events_insert_own on public."usage_events";

-- SELECT: you can only read your own usage events
create policy usage_events_select_own
  on public."usage_events" for select to keypilot_app
  using ("userId" = app.current_user_id());

-- INSERT: you can only create events attributed to yourself
-- Defense-in-depth: trackUsageEvent() already enforces this at app layer.
create policy usage_events_insert_own
  on public."usage_events" for insert to keypilot_app
  with check ("userId" = app.current_user_id());

-- No UPDATE or DELETE policies. Usage events are append-only.
-- No UPDATE/DELETE grants were issued in migration 11.

commit;

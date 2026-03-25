-- ═══════════════════════════════════════════════════════════════════════════
-- User CRM activities + templates + audit log — keypilot_app grants + RLS
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Prisma tables (see prisma/migrations/20260325100000_user_activities_foundation/):
--   user_activities, activity_templates, activity_logs
--
-- OWNERSHIP MODEL
--
--   user_activities / activity_templates: direct "userId" (same pattern as
--   deals, follow_up_reminders, supra_queue_items / hostUserId — Phase 3a / Supra).
--   Optional "propertyId" / "contactId" are for integrity and UX only; RLS does
--   not grant access via linked property/contact (matches deal.contactId design).
--
--   activity_logs: no userId column — transitive via "activityId" → user_activities.
--   Uses EXISTS + RLS cascade on parent (same idea as contact_tags → tags, Phase 3b).
--   Append-only under keypilot_app: SELECT + INSERT only (no UPDATE/DELETE grants).
--
-- API routes today still use prismaAdmin (BYPASSRLS); policies apply when queries
-- run as keypilot_app via withRLSContext.
--
-- ─── ROLLBACK (manual) ─────────────────────────────────────────────────────
--
--   REVOKE ALL ON public.user_activities    FROM keypilot_app;
--   REVOKE ALL ON public.activity_templates FROM keypilot_app;
--   REVOKE SELECT, INSERT ON public.activity_logs FROM keypilot_app;
--
--   DROP POLICY IF EXISTS user_activities_select_own    ON public.user_activities;
--   DROP POLICY IF EXISTS user_activities_insert_own    ON public.user_activities;
--   DROP POLICY IF EXISTS user_activities_update_own    ON public.user_activities;
--   DROP POLICY IF EXISTS user_activities_delete_own    ON public.user_activities;
--
--   DROP POLICY IF EXISTS activity_templates_select_own ON public.activity_templates;
--   DROP POLICY IF EXISTS activity_templates_insert_own ON public.activity_templates;
--   DROP POLICY IF EXISTS activity_templates_update_own ON public.activity_templates;
--   DROP POLICY IF EXISTS activity_templates_delete_own ON public.activity_templates;
--
--   DROP POLICY IF EXISTS activity_logs_select_via_activity ON public.activity_logs;
--   DROP POLICY IF EXISTS activity_logs_insert_via_activity ON public.activity_logs;
--
--   ALTER TABLE public.user_activities    DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.activity_templates DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.activity_logs      DISABLE ROW LEVEL SECURITY;
--
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─── Grants ────────────────────────────────────────────────────────────────

grant select, insert, update, delete
  on public.user_activities
  to keypilot_app;

grant select, insert, update, delete
  on public.activity_templates
  to keypilot_app;

grant select, insert
  on public.activity_logs
  to keypilot_app;

-- ─── user_activities — single-owner CRUD (Phase 3a pattern) ─────────────────

alter table public.user_activities enable row level security;

drop policy if exists user_activities_select_own on public.user_activities;
drop policy if exists user_activities_insert_own on public.user_activities;
drop policy if exists user_activities_update_own on public.user_activities;
drop policy if exists user_activities_delete_own on public.user_activities;

create policy user_activities_select_own
  on public.user_activities for select to keypilot_app
  using ("userId" = app.current_user_id());

create policy user_activities_insert_own
  on public.user_activities for insert to keypilot_app
  with check ("userId" = app.current_user_id());

create policy user_activities_update_own
  on public.user_activities for update to keypilot_app
  using ("userId" = app.current_user_id())
  with check ("userId" = app.current_user_id());

create policy user_activities_delete_own
  on public.user_activities for delete to keypilot_app
  using ("userId" = app.current_user_id());

-- ─── activity_templates — single-owner CRUD ────────────────────────────────

alter table public.activity_templates enable row level security;

drop policy if exists activity_templates_select_own on public.activity_templates;
drop policy if exists activity_templates_insert_own on public.activity_templates;
drop policy if exists activity_templates_update_own on public.activity_templates;
drop policy if exists activity_templates_delete_own on public.activity_templates;

create policy activity_templates_select_own
  on public.activity_templates for select to keypilot_app
  using ("userId" = app.current_user_id());

create policy activity_templates_insert_own
  on public.activity_templates for insert to keypilot_app
  with check ("userId" = app.current_user_id());

create policy activity_templates_update_own
  on public.activity_templates for update to keypilot_app
  using ("userId" = app.current_user_id())
  with check ("userId" = app.current_user_id());

create policy activity_templates_delete_own
  on public.activity_templates for delete to keypilot_app
  using ("userId" = app.current_user_id());

-- ─── activity_logs — transitive via user_activities; append-only ───────────
--
-- "activityId" in EXISTS refers to activity_logs."activityId" (outer row).

alter table public.activity_logs enable row level security;

drop policy if exists activity_logs_select_via_activity on public.activity_logs;
drop policy if exists activity_logs_insert_via_activity on public.activity_logs;

create policy activity_logs_select_via_activity
  on public.activity_logs for select to keypilot_app
  using (
    exists (
      select 1
      from public.user_activities lua
      where lua.id = "activityId"
    )
  );

create policy activity_logs_insert_via_activity
  on public.activity_logs for insert to keypilot_app
  with check (
    exists (
      select 1
      from public.user_activities lua
      where lua.id = "activityId"
    )
  );

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 3a — RLS for direct single-owner tables
-- ═══════════════════════════════════════════════════════════════════════════
--
-- TABLES
--
--   deals                  userId = the agent who created the deal
--   transactions           userId = the agent managing the transaction
--   tags                   userId = the agent who created the tag
--   follow_up_reminders    userId = the agent who owns the reminder
--
-- OWNERSHIP MODEL
--
--   All four tables follow the same single-owner pattern as Phase 1/2a:
--   one direct userId column, standard 4-policy CRUD set.
--
-- DESIGN NOTES
--
--   deals: contactId and propertyId FKs are used for data integrity only.
--     The agent may link deals to any contact or property accessible to them
--     (enforced at app layer); RLS here is scoped to deal ownership only.
--
--   transactions: commissions are a child table — covered in Phase 3b.
--
--   tags: contact_tags (the junction table) are covered in Phase 3b via
--     transitive ownership through tags.userId.
--
--   follow_up_reminders: contactId FK is for data integrity; reminder
--     ownership is direct via userId.
--
-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
--
--   ALTER TABLE public."deals"               DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public."transactions"        DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public."tags"                DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public."follow_up_reminders" DISABLE ROW LEVEL SECURITY;
--
--   DROP POLICY IF EXISTS deals_select_own  ON public."deals";
--   DROP POLICY IF EXISTS deals_insert_own  ON public."deals";
--   DROP POLICY IF EXISTS deals_update_own  ON public."deals";
--   DROP POLICY IF EXISTS deals_delete_own  ON public."deals";
--
--   DROP POLICY IF EXISTS txn_select_own  ON public."transactions";
--   DROP POLICY IF EXISTS txn_insert_own  ON public."transactions";
--   DROP POLICY IF EXISTS txn_update_own  ON public."transactions";
--   DROP POLICY IF EXISTS txn_delete_own  ON public."transactions";
--
--   DROP POLICY IF EXISTS tags_select_own  ON public."tags";
--   DROP POLICY IF EXISTS tags_insert_own  ON public."tags";
--   DROP POLICY IF EXISTS tags_update_own  ON public."tags";
--   DROP POLICY IF EXISTS tags_delete_own  ON public."tags";
--
--   DROP POLICY IF EXISTS reminders_select_own  ON public."follow_up_reminders";
--   DROP POLICY IF EXISTS reminders_insert_own  ON public."follow_up_reminders";
--   DROP POLICY IF EXISTS reminders_update_own  ON public."follow_up_reminders";
--   DROP POLICY IF EXISTS reminders_delete_own  ON public."follow_up_reminders";
--
-- ─── VALIDATION ──────────────────────────────────────────────────────────────
--
--   SELECT tablename, relrowsecurity, COUNT(policyname) AS policy_count
--   FROM pg_policies p
--   JOIN pg_class c ON c.relname = p.tablename
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE p.schemaname = 'public'
--     AND p.tablename IN ('deals','transactions','tags','follow_up_reminders')
--     AND n.nspname = 'public'
--   GROUP BY tablename, relrowsecurity ORDER BY tablename;
--
--   Expected:
--     deals                | true | 4
--     follow_up_reminders  | true | 4
--     tags                 | true | 4
--     transactions         | true | 4
--
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) deals
-- ─────────────────────────────────────────────────────────────────────────────

alter table public."deals" enable row level security;

drop policy if exists deals_select_own on public."deals";
drop policy if exists deals_insert_own on public."deals";
drop policy if exists deals_update_own on public."deals";
drop policy if exists deals_delete_own on public."deals";

create policy deals_select_own
  on public."deals" for select to keypilot_app
  using ("userId" = app.current_user_id());

create policy deals_insert_own
  on public."deals" for insert to keypilot_app
  with check ("userId" = app.current_user_id());

create policy deals_update_own
  on public."deals" for update to keypilot_app
  using  ("userId" = app.current_user_id())
  with check ("userId" = app.current_user_id());

create policy deals_delete_own
  on public."deals" for delete to keypilot_app
  using ("userId" = app.current_user_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) transactions
-- ─────────────────────────────────────────────────────────────────────────────

alter table public."transactions" enable row level security;

drop policy if exists txn_select_own on public."transactions";
drop policy if exists txn_insert_own on public."transactions";
drop policy if exists txn_update_own on public."transactions";
drop policy if exists txn_delete_own on public."transactions";

create policy txn_select_own
  on public."transactions" for select to keypilot_app
  using ("userId" = app.current_user_id());

create policy txn_insert_own
  on public."transactions" for insert to keypilot_app
  with check ("userId" = app.current_user_id());

create policy txn_update_own
  on public."transactions" for update to keypilot_app
  using  ("userId" = app.current_user_id())
  with check ("userId" = app.current_user_id());

create policy txn_delete_own
  on public."transactions" for delete to keypilot_app
  using ("userId" = app.current_user_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) tags
-- ─────────────────────────────────────────────────────────────────────────────

alter table public."tags" enable row level security;

drop policy if exists tags_select_own on public."tags";
drop policy if exists tags_insert_own on public."tags";
drop policy if exists tags_update_own on public."tags";
drop policy if exists tags_delete_own on public."tags";

create policy tags_select_own
  on public."tags" for select to keypilot_app
  using ("userId" = app.current_user_id());

create policy tags_insert_own
  on public."tags" for insert to keypilot_app
  with check ("userId" = app.current_user_id());

create policy tags_update_own
  on public."tags" for update to keypilot_app
  using  ("userId" = app.current_user_id())
  with check ("userId" = app.current_user_id());

create policy tags_delete_own
  on public."tags" for delete to keypilot_app
  using ("userId" = app.current_user_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) follow_up_reminders
-- ─────────────────────────────────────────────────────────────────────────────

alter table public."follow_up_reminders" enable row level security;

drop policy if exists reminders_select_own on public."follow_up_reminders";
drop policy if exists reminders_insert_own on public."follow_up_reminders";
drop policy if exists reminders_update_own on public."follow_up_reminders";
drop policy if exists reminders_delete_own on public."follow_up_reminders";

create policy reminders_select_own
  on public."follow_up_reminders" for select to keypilot_app
  using ("userId" = app.current_user_id());

create policy reminders_insert_own
  on public."follow_up_reminders" for insert to keypilot_app
  with check ("userId" = app.current_user_id());

create policy reminders_update_own
  on public."follow_up_reminders" for update to keypilot_app
  using  ("userId" = app.current_user_id())
  with check ("userId" = app.current_user_id());

create policy reminders_delete_own
  on public."follow_up_reminders" for delete to keypilot_app
  using ("userId" = app.current_user_id());

commit;

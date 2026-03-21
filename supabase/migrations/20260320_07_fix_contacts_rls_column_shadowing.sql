-- ═══════════════════════════════════════════════════════════════════════════
-- Fix: contacts RLS column shadowing bug
-- ═══════════════════════════════════════════════════════════════════════════
--
-- BUG
--   Migration 06 created the contacts policies using:
--     using (exists (select 1 from open_house_visitors ohv where ohv."contactId" = id))
--
--   Postgres resolved the unqualified `id` as `ohv.id` (the alias's primary key,
--   which was in scope inside the EXISTS subquery) instead of `contacts.id`.
--   The compiled policy qual was: ohv."contactId" = ohv.id — a self-comparison
--   that is always false, making all contacts invisible to keypilot_app.
--
-- FIX
--   Rewrite using IN (SELECT ...) so that `id` is evaluated in the USING-clause
--   scope (= contacts.id), where no subquery alias can shadow it.
--
-- LESSON
--   When writing RLS policies with EXISTS subqueries that reference the protected
--   table's columns, always verify pg_policies.qual to confirm the compiled
--   expression resolves column references as intended. Use IN (SELECT ...) when
--   the outer table has an `id` column and any subquery alias might shadow it.
--
-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
--
--   Run the three DROP POLICY + three CREATE POLICY statements from migration 06
--   (with the buggy EXISTS form) to revert to the broken state — do not do this.
--
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists contacts_select_own on public."contacts";
drop policy if exists contacts_update_own on public."contacts";
drop policy if exists contacts_delete_own on public."contacts";

create policy contacts_select_own
  on public."contacts" for select to keypilot_app
  using (
    id in (
      select "contactId" from public."open_house_visitors"
    )
  );

create policy contacts_update_own
  on public."contacts" for update to keypilot_app
  using (
    id in (
      select "contactId" from public."open_house_visitors"
    )
  )
  with check (
    id in (
      select "contactId" from public."open_house_visitors"
    )
  );

create policy contacts_delete_own
  on public."contacts" for delete to keypilot_app
  using (
    id in (
      select "contactId" from public."open_house_visitors"
    )
  );

-- Phase 1a — keypilot_app role + app schema + context helper
--
-- Creates:
--   1. keypilot_app   — non-BYPASSRLS DB role; all normal Prisma app traffic will
--                       eventually run under this role via SET LOCAL ROLE inside
--                       transactions. RLS policies are written for this role.
--                       Does NOT have LOGIN — connections still use `postgres`,
--                       which switches to keypilot_app per-transaction via withRLSContext.
--
--   2. app schema     — Namespace for DB-side utility functions (not user data).
--
--   3. app.current_user_id() — Reads the transaction-local setting injected by
--                       the Prisma withRLSContext helper. Returns the User.id UUID
--                       (NOT the Clerk string ID) currently executing the request.
--                       Returns NULL if no context is set (background jobs, public routes).
--
-- Why no LOGIN on keypilot_app:
--   Avoids a second DATABASE_URL / credential rotation. postgres connects as usual
--   and uses SET LOCAL ROLE keypilot_app inside each transaction. This is safe with
--   PgBouncer in transaction-pooling mode because SET LOCAL reverts on transaction end.
--
-- Rollback (undo this migration):
--   DROP FUNCTION IF EXISTS app.current_user_id();
--   DROP SCHEMA IF EXISTS app;
--   REVOKE keypilot_app FROM postgres;
--   DROP ROLE IF EXISTS keypilot_app;
--
-- Validation:
--   SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'keypilot_app';
--   -- Expected: row present, rolbypassrls = false
--
--   SELECT routine_schema, routine_name FROM information_schema.routines
--   WHERE routine_schema = 'app' AND routine_name = 'current_user_id';
--   -- Expected: one row

begin;

-- ─── 1. keypilot_app role ─────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'keypilot_app') then
    create role keypilot_app;
  end if;
end
$$;

-- Allow postgres to SET ROLE keypilot_app inside transactions.
grant keypilot_app to postgres;

-- ─── 2. app schema ────────────────────────────────────────────────────────────

create schema if not exists app;

-- keypilot_app needs USAGE to resolve app.* functions in policy expressions.
grant usage on schema app to keypilot_app;

-- ─── 3. app.current_user_id() ─────────────────────────────────────────────────
--
-- Reads 'app.current_user_id' from the current transaction's GUC (Grand Unified
-- Configuration) state. withRLSContext sets this via:
--   SELECT set_config('app.current_user_id', $userId, true)  -- is_local=true
-- The true flag makes it transaction-scoped: resets automatically on COMMIT/ROLLBACK.

create or replace function app.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid
$$;

grant execute on function app.current_user_id() to keypilot_app;

-- ─── 4. Table grants for keypilot_app ─────────────────────────────────────────
--
-- keypilot_app needs DML grants on all tables it will access under RLS.
-- postgres already owns all tables; keypilot_app needs explicit grants.

grant select, insert, update, delete
  on all tables in schema public
  to keypilot_app;

grant usage, select
  on all sequences in schema public
  to keypilot_app;

-- Ensure future tables created by Prisma db push also get the grants.
alter default privileges
  in schema public
  grant select, insert, update, delete on tables to keypilot_app;

alter default privileges
  in schema public
  grant usage, select on sequences to keypilot_app;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 1a — keypilot_app role + app schema + app.current_user_id()
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WHAT THIS CREATES
--
--   1. keypilot_app role
--      Non-BYPASSRLS DB role. RLS policies in this project target this role.
--      Has no LOGIN — it is NOT a connection user.
--      postgres connects as usual, then uses SET LOCAL ROLE keypilot_app
--      inside each withRLSContext transaction.
--      SET LOCAL is transaction-scoped: reverts automatically on commit/rollback.
--      Safe with PgBouncer in transaction-pooling mode.
--
--   2. app schema
--      Namespace for DB-side utility functions. Not used for user data.
--
--   3. app.current_user_id()
--      Reads the 'app.current_user_id' GUC set by the Prisma withRLSContext
--      helper. The helper uses set_config(..., true) (is_local = true), making
--      the value transaction-scoped. Returns the User.id UUID — NOT the Clerk
--      string ID. Returns NULL when no context is active.
--
-- MINIMUM GRANTS — Phase 1 only
--   Grants are limited to the four tables with Phase 1 RLS policies.
--   Phase 2+ migrations add grants for their respective tables.
--   This follows least-privilege: keypilot_app cannot touch any table it does
--   not currently need to access.
--
--   Table              Grants                  Rationale
--   connections        SELECT INSERT UPDATE DELETE  OAuth tokens; full CRUD by app
--   feedback_requests  SELECT INSERT UPDATE DELETE  Showing feedback; full CRUD
--   users              SELECT UPDATE               Created by Clerk webhook (postgres);
--                                                   never deleted via app code
--   user_profiles      SELECT INSERT UPDATE DELETE  Agent branding; full CRUD
--
--   No sequence grants: all PKs are gen_random_uuid() — no SERIAL columns.
--
-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
--
--   Step 1 — remove grants (must precede role drop)
--     REVOKE SELECT, INSERT, UPDATE, DELETE ON public."connections"       FROM keypilot_app;
--     REVOKE SELECT, INSERT, UPDATE, DELETE ON public."feedback_requests" FROM keypilot_app;
--     REVOKE SELECT, UPDATE                 ON public."users"             FROM keypilot_app;
--     REVOKE SELECT, INSERT, UPDATE, DELETE ON public."user_profiles"     FROM keypilot_app;
--     REVOKE EXECUTE ON FUNCTION app.current_user_id()                   FROM keypilot_app;
--     REVOKE USAGE   ON SCHEMA app                                        FROM keypilot_app;
--
--   Step 2 — remove schema objects
--     DROP FUNCTION IF EXISTS app.current_user_id();
--     DROP SCHEMA   IF EXISTS app;
--
--   Step 3 — remove role
--     REVOKE keypilot_app FROM postgres;
--     DROP ROLE IF EXISTS keypilot_app;
--
--   NOTE: If Phase 1b (rls_high_risk) has been applied, drop its policies first,
--   then disable RLS on the four tables, before running this rollback.
--
-- ─── VALIDATION ──────────────────────────────────────────────────────────────
--
--   -- Role exists and has no BYPASSRLS
--   SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'keypilot_app';
--   -- Expected: one row, rolbypassrls = false
--
--   -- postgres can SET ROLE to keypilot_app (membership check)
--   SELECT pg_has_role('postgres', 'keypilot_app', 'MEMBER');
--   -- Expected: true
--
--   -- Function exists
--   SELECT routine_schema, routine_name
--   FROM information_schema.routines
--   WHERE routine_schema = 'app' AND routine_name = 'current_user_id';
--   -- Expected: one row
--
--   -- Function returns NULL when no context is set
--   SELECT app.current_user_id() IS NULL AS no_context_is_null;
--   -- Expected: true
--
--   -- Grants on Phase 1 tables
--   SELECT grantee, table_name, privilege_type
--   FROM information_schema.role_table_grants
--   WHERE grantee = 'keypilot_app'
--     AND table_name IN ('connections','feedback_requests','users','user_profiles')
--   ORDER BY table_name, privilege_type;
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─── 1. keypilot_app role ─────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'keypilot_app') then
    create role keypilot_app;
  end if;
end
$$;

-- Allow postgres to execute SET LOCAL ROLE keypilot_app inside transactions.
grant keypilot_app to postgres;

-- ─── 2. app schema ────────────────────────────────────────────────────────────

create schema if not exists app;

-- keypilot_app must have USAGE to resolve app.* identifiers in policy expressions.
grant usage on schema app to keypilot_app;

-- ─── 3. app.current_user_id() ─────────────────────────────────────────────────

create or replace function app.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid
$$;

grant execute on function app.current_user_id() to keypilot_app;

-- ─── 4. Minimum table grants for Phase 1 ─────────────────────────────────────
--
-- Only the four tables covered by Phase 1b RLS policies receive grants.
-- Phase 2+ migrations will add grants for their respective tables.

-- connections: full CRUD — OAuth access/refresh tokens, agents manage their accounts
grant select, insert, update, delete
  on public."connections"
  to keypilot_app;

-- feedback_requests: full CRUD — showing feedback lifecycle
grant select, insert, update, delete
  on public."feedback_requests"
  to keypilot_app;

-- users: read + update only.
--   INSERT is handled by the Clerk webhook route (runs as postgres, BYPASSRLS).
--   DELETE is never performed by app code.
grant select, update
  on public."users"
  to keypilot_app;

-- user_profiles: full CRUD — agent branding PII, managed by the agent
grant select, insert, update, delete
  on public."user_profiles"
  to keypilot_app;

commit;

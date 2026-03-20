-- ═══════════════════════════════════════════════════════════════════════════
-- RLS Phase 1 — Cross-User Isolation Validation
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WHAT THIS TESTS
--   Proves DB-level per-user isolation for the four Phase 1 tables:
--     - connections
--     - feedback_requests
--     - users
--     - user_profiles
--
-- PREREQUISITES
--   All three Phase 1 migrations must be applied before running this script:
--     20260320_00_phase0a_disable_partial_rls.sql
--     20260320_01_phase1_role_and_schema.sql
--     20260320_02_phase1_rls_high_risk.sql
--
-- HOW TO RUN
--   Supabase SQL editor: paste entire file, click Run.
--   psql:  psql "$DIRECT_URL" -f scripts/validate-rls-phase1.sql
--
-- OUTPUT
--   A series of NOTICE lines (PASS / FAIL) followed by a summary.
--   All test data is inside a single transaction that is always ROLLED BACK.
--   Nothing is written to the database.
--
-- TEST COVERAGE
--
--   Block 1 — User A reads only their own rows (4 tables × 2 assertions = 8)
--   Block 2 — User B reads only their own rows (4 tables × 2 assertions = 8)
--   Block 3 — Cross-user writes are rejected  (3 write isolation checks)
--   Block 4 — Empty context sees zero rows    (2 deny-all checks)
--
--   Total: 21 assertions. All must PASS before Phase 1 is considered complete.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

do $$
declare
  -- Deterministic test user IDs for easy debugging
  uid_a        uuid := gen_random_uuid();
  uid_b        uuid := gen_random_uuid();

  -- Supporting FK chain for feedback_requests
  prop_a       uuid := gen_random_uuid();
  prop_b       uuid := gen_random_uuid();
  show_a       uuid := gen_random_uuid();
  show_b       uuid := gen_random_uuid();

  n            int;
  pass_count   int := 0;
  fail_count   int := 0;

begin

  -- ═══════════════════════════════════════════════════════════════════
  -- SETUP — insert test data as postgres (rolbypassrls = true)
  -- ═══════════════════════════════════════════════════════════════════

  insert into public."users" (id, "clerkId", name, email, role, "productTier")
  values
    (uid_a, 'ck_rlstest_a_' || uid_a::text, 'RLS Test A', 'rls-a+' || uid_a::text || '@test.invalid', 'agent', 'OPEN_HOUSE'),
    (uid_b, 'ck_rlstest_b_' || uid_b::text, 'RLS Test B', 'rls-b+' || uid_b::text || '@test.invalid', 'agent', 'OPEN_HOUSE');

  insert into public."user_profiles" (id, "userId")
  values (gen_random_uuid(), uid_a), (gen_random_uuid(), uid_b);

  insert into public."connections" (id, "userId", provider, service, status)
  values
    (gen_random_uuid(), uid_a, 'GOOGLE', 'GMAIL', 'CONNECTED'),
    (gen_random_uuid(), uid_b, 'GOOGLE', 'GMAIL', 'CONNECTED');

  -- FK chain: property → showing → feedback_request
  insert into public."properties" (id, "createdByUserId", address1, city, state, zip)
  values
    (prop_a, uid_a, '1 RLS Test Ave', 'Testville', 'CA', '00001'),
    (prop_b, uid_b, '2 RLS Test Ave', 'Testville', 'CA', '00002');

  insert into public."showings" (id, "propertyId", "hostUserId", "scheduledAt", source)
  values
    (show_a, prop_a, uid_a, now() + interval '1 day', 'MANUAL'),
    (show_b, prop_b, uid_b, now() + interval '1 day', 'MANUAL');

  insert into public."feedback_requests" (id, "showingId", "propertyId", "hostUserId", token, status)
  values
    (gen_random_uuid(), show_a, prop_a, uid_a, 'rlstest-tok-a-' || uid_a::text, 'PENDING'),
    (gen_random_uuid(), show_b, prop_b, uid_b, 'rlstest-tok-b-' || uid_b::text, 'PENDING');

  raise notice '';
  raise notice '══════════════════════════════════════════════════════════';
  raise notice ' KeyPilot RLS Phase 1 — Cross-User Isolation Validation  ';
  raise notice '══════════════════════════════════════════════════════════';

  -- ═══════════════════════════════════════════════════════════════════
  -- BLOCK 1 — User A: sees own rows, cannot see User B rows
  -- ═══════════════════════════════════════════════════════════════════

  raise notice '';
  raise notice '─── Block 1: User A context ───────────────────────────────';

  perform set_config('app.current_user_id', uid_a::text, true);
  set local role keypilot_app;

  -- connections
  select count(*) into n from public."connections" where "userId" = uid_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  connections       user_a sees own row (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  connections       user_a sees % own rows (expected 1)', n;
  end if;

  select count(*) into n from public."connections" where "userId" = uid_b;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  connections       user_a sees 0 rows owned by user_b';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  connections       user_a sees % rows owned by user_b (expected 0)', n;
  end if;

  -- users
  select count(*) into n from public."users" where id = uid_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  users             user_a sees own row (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  users             user_a own row not visible (expected 1, got %)', n;
  end if;

  select count(*) into n from public."users" where id = uid_b;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  users             user_a cannot see user_b row';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  users             user_a sees user_b row (expected 0, got %)', n;
  end if;

  -- user_profiles
  select count(*) into n from public."user_profiles" where "userId" = uid_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  user_profiles     user_a sees own profile (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  user_profiles     user_a profile not visible (expected 1, got %)', n;
  end if;

  select count(*) into n from public."user_profiles" where "userId" = uid_b;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  user_profiles     user_a cannot see user_b profile';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  user_profiles     user_a sees user_b profile (expected 0, got %)', n;
  end if;

  -- feedback_requests
  select count(*) into n from public."feedback_requests" where "hostUserId" = uid_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  feedback_requests user_a sees own row (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  feedback_requests user_a own row not visible (expected 1, got %)', n;
  end if;

  select count(*) into n from public."feedback_requests" where "hostUserId" = uid_b;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  feedback_requests user_a cannot see user_b row';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  feedback_requests user_a sees user_b row (expected 0, got %)', n;
  end if;

  reset role;

  -- ═══════════════════════════════════════════════════════════════════
  -- BLOCK 2 — User B: sees own rows, cannot see User A rows
  -- ═══════════════════════════════════════════════════════════════════

  raise notice '';
  raise notice '─── Block 2: User B context ───────────────────────────────';

  perform set_config('app.current_user_id', uid_b::text, true);
  set local role keypilot_app;

  select count(*) into n from public."connections" where "userId" = uid_b;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  connections       user_b sees own row (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  connections       user_b sees % own rows (expected 1)', n;
  end if;

  select count(*) into n from public."connections" where "userId" = uid_a;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  connections       user_b sees 0 rows owned by user_a';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  connections       user_b sees % rows owned by user_a (expected 0)', n;
  end if;

  select count(*) into n from public."users" where id = uid_b;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  users             user_b sees own row (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  users             user_b own row not visible (expected 1, got %)', n;
  end if;

  select count(*) into n from public."users" where id = uid_a;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  users             user_b cannot see user_a row';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  users             user_b sees user_a row (expected 0, got %)', n;
  end if;

  select count(*) into n from public."user_profiles" where "userId" = uid_b;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  user_profiles     user_b sees own profile (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  user_profiles     user_b profile not visible (expected 1, got %)', n;
  end if;

  select count(*) into n from public."user_profiles" where "userId" = uid_a;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  user_profiles     user_b cannot see user_a profile';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  user_profiles     user_b sees user_a profile (expected 0, got %)', n;
  end if;

  select count(*) into n from public."feedback_requests" where "hostUserId" = uid_b;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  feedback_requests user_b sees own row (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  feedback_requests user_b own row not visible (expected 1, got %)', n;
  end if;

  select count(*) into n from public."feedback_requests" where "hostUserId" = uid_a;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  feedback_requests user_b cannot see user_a row';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  feedback_requests user_b sees user_a row (expected 0, got %)', n;
  end if;

  reset role;

  -- ═══════════════════════════════════════════════════════════════════
  -- BLOCK 3 — Write isolation: cross-user mutations must be rejected
  --
  -- PL/pgSQL note: SET LOCAL ROLE is set BEFORE each inner BEGIN block.
  -- Inner BEGIN...EXCEPTION creates an implicit savepoint AFTER the SET LOCAL.
  -- Rolling back to that savepoint on exception does NOT revert SET LOCAL ROLE,
  -- because SET LOCAL was established before the savepoint was created.
  -- Each test ends with RESET ROLE to restore postgres for the next setup step.
  -- ═══════════════════════════════════════════════════════════════════

  raise notice '';
  raise notice '─── Block 3: Write isolation ──────────────────────────────';

  -- Test 3a: user_a cannot INSERT a connection owned by user_b
  perform set_config('app.current_user_id', uid_a::text, true);
  set local role keypilot_app;
  begin
    insert into public."connections" (id, "userId", provider, service, status)
      values (gen_random_uuid(), uid_b, 'GOOGLE', 'GOOGLE_CALENDAR', 'CONNECTED');
    fail_count := fail_count + 1;
    raise warning 'FAIL  connections       cross-user INSERT was permitted (WITH CHECK did not fire)';
  exception when others then
    pass_count := pass_count + 1;
    raise notice 'PASS  connections       cross-user INSERT correctly rejected';
  end;
  reset role;

  -- Test 3b: user_a cannot INSERT a user_profile owned by user_b
  perform set_config('app.current_user_id', uid_a::text, true);
  set local role keypilot_app;
  begin
    insert into public."user_profiles" (id, "userId")
      values (gen_random_uuid(), uid_b);
    fail_count := fail_count + 1;
    raise warning 'FAIL  user_profiles     cross-user INSERT was permitted';
  exception when others then
    pass_count := pass_count + 1;
    raise notice 'PASS  user_profiles     cross-user INSERT correctly rejected';
  end;
  reset role;

  -- Test 3c: user_a cannot UPDATE user_b's users row
  -- UPDATE with a non-matching USING policy silently affects 0 rows (no error).
  -- GET DIAGNOSTICS captures the row count.
  perform set_config('app.current_user_id', uid_a::text, true);
  set local role keypilot_app;
  update public."users" set name = 'Tampered' where id = uid_b;
  get diagnostics n = row_count;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  users             cross-user UPDATE silently affects 0 rows';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  users             cross-user UPDATE affected % rows (expected 0)', n;
  end if;
  reset role;

  -- ═══════════════════════════════════════════════════════════════════
  -- BLOCK 4 — Null context: empty current_user_id → deny-all
  --
  -- app.current_user_id() returns NULL when the GUC is '' or unset.
  -- NULL = NULL is never TRUE, so all USING/WITH CHECK clauses fail → 0 rows.
  -- ═══════════════════════════════════════════════════════════════════

  raise notice '';
  raise notice '─── Block 4: Null context (no current_user_id set) ────────';

  perform set_config('app.current_user_id', '', true);  -- empty string → NULL uuid
  set local role keypilot_app;

  select count(*) into n from public."connections" where "userId" in (uid_a, uid_b);
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  connections       empty context → 0 rows visible (deny-all)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  connections       empty context sees % rows (expected 0)', n;
  end if;

  select count(*) into n from public."users" where id in (uid_a, uid_b);
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  users             empty context → 0 rows visible (deny-all)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  users             empty context sees % rows (expected 0)', n;
  end if;

  reset role;

  -- ═══════════════════════════════════════════════════════════════════
  -- SUMMARY
  -- ═══════════════════════════════════════════════════════════════════

  raise notice '';
  raise notice '══════════════════════════════════════════════════════════';
  if fail_count = 0 then
    raise notice '  ✓  ALL % TESTS PASSED — Phase 1 isolation verified', pass_count;
  else
    raise warning '  ✗  % passed, % FAILED — review FAIL lines above', pass_count, fail_count;
  end if;
  raise notice '══════════════════════════════════════════════════════════';
  raise notice '';
  raise notice 'NOTE: This transaction is always rolled back.';
  raise notice '      No test data was written to the database.';

end $$;

rollback;  -- always; test data is never committed

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS Phase 2 — Cross-User Isolation Validation
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WHAT THIS TESTS
--   Proves DB-level per-user isolation for all Phase 2 tables:
--
--   Phase 2a — direct ownership:
--     properties           createdByUserId = current user
--     showings             hostUserId      = current user
--
--   Phase 2b — multi-role ownership:
--     open_houses          hostUserId OR listingAgentId OR hostAgentId
--
--   Phase 2c — transitive via open_houses (1-hop):
--     open_house_visitors  openHouseId → open_houses (RLS-filtered EXISTS)
--     follow_up_drafts     openHouseId → open_houses (RLS-filtered EXISTS)
--     seller_reports       openHouseId → open_houses (RLS-filtered EXISTS)
--
--   Phase 2c — transitive via open_house_visitors (2-hop):
--     contacts             id IN (SELECT contactId FROM open_house_visitors)
--                          which itself cascades through open_houses RLS
--
-- PREREQUISITES
--   All Phase 1 and Phase 2 migrations must be applied before running:
--     20260320_00_phase0a_disable_partial_rls.sql
--     20260320_01_phase1_role_and_schema.sql
--     20260320_02_phase1_rls_high_risk.sql
--     20260320_03_phase2_grants.sql
--     20260320_04_phase2_rls_simple.sql
--     20260320_05_phase2_rls_open_houses.sql
--     20260320_06_phase2_rls_transitive.sql
--     20260320_07_fix_contacts_rls_column_shadowing.sql
--
-- HOW TO RUN
--   Supabase SQL editor: paste entire file, click Run.
--   psql:  psql "$DIRECT_URL" -f scripts/validate-rls-phase2.sql
--
-- OUTPUT
--   A series of NOTICE lines (PASS / FAIL) followed by a summary.
--   All test data is inside a single transaction that is always ROLLED BACK.
--   Nothing is written to the database.
--
-- ACTORS
--
--   uid_a    host user — creates property, showing, open house (hostUserId),
--            and all transitive data (visitors, drafts, reports, contacts)
--   uid_b    listing agent — set as listingAgentId on uid_a's open house;
--            also owns a separate property of their own
--   uid_other completely unrelated user — should see nothing belonging to uid_a or uid_b
--
-- TEST COVERAGE
--
--   Block 1 — User A (host): reads own rows for all 7 tables          (9 assertions)
--   Block 2 — User B (listing agent): multi-role cascade              (8 assertions)
--             sees OH + transitive tables, cannot see properties/showings
--   Block 3 — Unrelated user: sees nothing                            (4 assertions)
--   Block 4 — Write isolation: cross-user mutations rejected           (3 assertions)
--   Block 5 — Empty context: deny-all                                 (2 assertions)
--
--   Total: 26 assertions. All must PASS.
--
-- DESIGN NOTES
--
--   contacts_select_own uses `id IN (SELECT "contactId" FROM open_house_visitors)`
--   NOT `EXISTS(ohv WHERE ohv."contactId" = id)`.
--   The EXISTS form causes Postgres to resolve unqualified `id` as the subquery
--   alias's column — always false (column-shadowing bug).
--   The IN form correctly resolves `id` from the outer contacts table.
--   This is the fix applied in 20260320_07_fix_contacts_rls_column_shadowing.sql.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

do $$
declare
  uid_a      text := gen_random_uuid()::text;
  uid_b      text := gen_random_uuid()::text;
  uid_other  text := gen_random_uuid()::text;

  prop_a     text := gen_random_uuid()::text;
  prop_b     text := gen_random_uuid()::text;
  show_a     text := gen_random_uuid()::text;
  oh_a       text := gen_random_uuid()::text;
  contact_a  text := gen_random_uuid()::text;
  visitor_a  text := gen_random_uuid()::text;
  draft_a    text := gen_random_uuid()::text;
  report_a   text := gen_random_uuid()::text;

  n            int;
  pass_count   int := 0;
  fail_count   int := 0;

begin

  -- ═══════════════════════════════════════════════════════════════════
  -- SETUP — insert test data as postgres (rolbypassrls = true)
  -- ═══════════════════════════════════════════════════════════════════

  insert into public."users" (id, "clerkId", name, email, role, "productTier", "updatedAt")
  values
    (uid_a,     'ck_p2test_a_'     || uid_a,     'P2 Test A',     'p2-a+'     || uid_a     || '@test.invalid', 'agent', 'OPEN_HOUSE', now()),
    (uid_b,     'ck_p2test_b_'     || uid_b,     'P2 Test B',     'p2-b+'     || uid_b     || '@test.invalid', 'agent', 'OPEN_HOUSE', now()),
    (uid_other, 'ck_p2test_other_' || uid_other, 'P2 Test Other', 'p2-other+' || uid_other || '@test.invalid', 'agent', 'OPEN_HOUSE', now());

  -- properties: uid_a owns prop_a, uid_b owns prop_b
  insert into public."properties" (id, "createdByUserId", address1, city, state, zip, "updatedAt")
  values
    (prop_a, uid_a, '10 Phase2 Test Ave', 'Testville', 'CA', '90001', now()),
    (prop_b, uid_b, '20 Phase2 Test Ave', 'Testville', 'CA', '90002', now());

  -- showing: uid_a is the host
  insert into public."showings" (id, "propertyId", "hostUserId", "scheduledAt", "updatedAt")
  values (show_a, prop_a, uid_a, now() + interval '1 day', now());

  -- open house: uid_a is host, uid_b is listing agent
  insert into public."open_houses" (
    id, "propertyId", "hostUserId", "listingAgentId",
    title, "startAt", "endAt", "qrSlug", status, "updatedAt"
  ) values (
    oh_a, prop_a, uid_a, uid_b,
    'P2 RLS Test OH', now() + interval '1 day', now() + interval '2 days',
    'p2-rls-test-slug-' || oh_a, 'SCHEDULED', now()
  );

  -- contact (no owner field — owned transitively via visitors)
  insert into public."contacts" (id, "firstName", "lastName", "updatedAt")
  values (contact_a, 'RLS', 'TestContact', now());

  -- visitor: links contact_a to oh_a (gives uid_a and uid_b access to contact via cascade)
  insert into public."open_house_visitors" (
    id, "openHouseId", "contactId", "signInMethod", "submittedAt"
  ) values (
    visitor_a, oh_a, contact_a, 'TABLET', now()
  );

  -- follow_up_draft: attached to oh_a
  insert into public."follow_up_drafts" (
    id, "contactId", "openHouseId", subject, body, status, "updatedAt"
  ) values (
    draft_a, contact_a, oh_a, 'P2 RLS Test Subject', 'P2 RLS Test Body', 'DRAFT', now()
  );

  -- seller_report: attached to oh_a
  insert into public."seller_reports" (
    id, "openHouseId", "generatedByUserId", "reportJson"
  ) values (
    report_a, oh_a, uid_a, '{"rls":"test"}'::jsonb
  );

  raise notice '';
  raise notice '══════════════════════════════════════════════════════════════';
  raise notice ' KeyPilot RLS Phase 2 — Cross-User Isolation Validation      ';
  raise notice '══════════════════════════════════════════════════════════════';

  -- ═══════════════════════════════════════════════════════════════════
  -- BLOCK 1 — User A (host): sees all own rows
  -- ═══════════════════════════════════════════════════════════════════

  raise notice '';
  raise notice '─── Block 1: User A (host) ────────────────────────────────────';

  perform set_config('app.current_user_id', uid_a, true);
  set local role keypilot_app;

  -- 1.1 properties — direct owner
  select count(*) into n from public."properties" where id = prop_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B1.1  properties          user_a sees own property (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B1.1  properties          user_a cannot see own property (expected 1, got %)', n;
  end if;

  -- 1.2 properties — cannot see uid_b's property
  select count(*) into n from public."properties" where id = prop_b;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B1.2  properties          user_a cannot see user_b property (count=0)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B1.2  properties          user_a sees user_b property (expected 0, got %)', n;
  end if;

  -- 1.3 showings — direct owner
  select count(*) into n from public."showings" where id = show_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B1.3  showings            user_a sees own showing (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B1.3  showings            user_a cannot see own showing (expected 1, got %)', n;
  end if;

  -- 1.4 open_houses — host
  select count(*) into n from public."open_houses" where id = oh_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B1.4  open_houses         user_a sees own OH (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B1.4  open_houses         user_a cannot see own OH (expected 1, got %)', n;
  end if;

  -- 1.5 open_house_visitors — cascade via OH
  select count(*) into n from public."open_house_visitors" where id = visitor_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B1.5  open_house_visitors user_a sees visitor (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B1.5  open_house_visitors user_a cannot see visitor (expected 1, got %)', n;
  end if;

  -- 1.6 follow_up_drafts — cascade via OH
  select count(*) into n from public."follow_up_drafts" where id = draft_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B1.6  follow_up_drafts    user_a sees draft (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B1.6  follow_up_drafts    user_a cannot see draft (expected 1, got %)', n;
  end if;

  -- 1.7 seller_reports — cascade via OH
  select count(*) into n from public."seller_reports" where id = report_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B1.7  seller_reports      user_a sees report (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B1.7  seller_reports      user_a cannot see report (expected 1, got %)', n;
  end if;

  -- 1.8 contacts — 2-hop cascade: contact_a → visitor_a → oh_a → user_a
  select count(*) into n from public."contacts" where id = contact_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B1.8  contacts            user_a sees contact via 2-hop cascade (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B1.8  contacts            user_a cannot see contact (expected 1, got %)', n;
  end if;

  -- 1.9 contacts column-shadowing guard — verifies the IN fix is in place
  -- If EXISTS alias shadowing bug is present, contacts returns 0; IN fix returns 1.
  -- (Same check as 1.8 but explicitly calls out the shadowing fix.)
  select count(*) into n
  from public."contacts"
  where id in (select "contactId" from public."open_house_visitors");
  if n >= 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B1.9  contacts            IN subquery (shadowing fix) returns >= 1 row';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B1.9  contacts            IN subquery returns 0 — shadowing bug may be active';
  end if;

  reset role;

  -- ═══════════════════════════════════════════════════════════════════
  -- BLOCK 2 — User B (listing agent): multi-role cascade
  --
  --   uid_b is listingAgentId on oh_a.
  --   uid_b should see: oh_a + all transitive tables (visitors, drafts, reports, contacts).
  --   uid_b should NOT see: prop_a (createdByUserId = uid_a) or show_a (hostUserId = uid_a).
  --   uid_b should see: prop_b (their own property).
  -- ═══════════════════════════════════════════════════════════════════

  raise notice '';
  raise notice '─── Block 2: User B (listing agent) ──────────────────────────';

  perform set_config('app.current_user_id', uid_b, true);
  set local role keypilot_app;

  -- 2.1 properties — uid_b cannot see uid_a's property
  select count(*) into n from public."properties" where id = prop_a;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B2.1  properties          user_b cannot see user_a property (count=0)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B2.1  properties          user_b sees user_a property (expected 0, got %)', n;
  end if;

  -- 2.2 properties — uid_b sees their own property
  select count(*) into n from public."properties" where id = prop_b;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B2.2  properties          user_b sees own property (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B2.2  properties          user_b cannot see own property (expected 1, got %)', n;
  end if;

  -- 2.3 showings — uid_b cannot see uid_a's showing
  select count(*) into n from public."showings" where id = show_a;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B2.3  showings            user_b cannot see user_a showing (count=0)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B2.3  showings            user_b sees user_a showing (expected 0, got %)', n;
  end if;

  -- 2.4 open_houses — uid_b can see oh_a (is listingAgentId)
  select count(*) into n from public."open_houses" where id = oh_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B2.4  open_houses         user_b sees OH as listingAgentId (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B2.4  open_houses         user_b cannot see OH as listingAgentId (expected 1, got %)', n;
  end if;

  -- 2.5 open_house_visitors — cascade: uid_b sees visitor via OH access
  select count(*) into n from public."open_house_visitors" where id = visitor_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B2.5  open_house_visitors user_b sees visitor via OH cascade (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B2.5  open_house_visitors user_b cannot see visitor (expected 1, got %)', n;
  end if;

  -- 2.6 follow_up_drafts — cascade: uid_b sees draft via OH access
  select count(*) into n from public."follow_up_drafts" where id = draft_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B2.6  follow_up_drafts    user_b sees draft via OH cascade (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B2.6  follow_up_drafts    user_b cannot see draft (expected 1, got %)', n;
  end if;

  -- 2.7 seller_reports — cascade: uid_b sees report via OH access
  select count(*) into n from public."seller_reports" where id = report_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B2.7  seller_reports      user_b sees report via OH cascade (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B2.7  seller_reports      user_b cannot see report (expected 1, got %)', n;
  end if;

  -- 2.8 contacts — 2-hop: uid_b sees contact via visitor → oh_a (uid_b is listingAgentId)
  select count(*) into n from public."contacts" where id = contact_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B2.8  contacts            user_b sees contact via 2-hop cascade (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B2.8  contacts            user_b cannot see contact (expected 1, got %)', n;
  end if;

  reset role;

  -- ═══════════════════════════════════════════════════════════════════
  -- BLOCK 3 — Unrelated user: sees nothing
  -- ═══════════════════════════════════════════════════════════════════

  raise notice '';
  raise notice '─── Block 3: Unrelated user sees nothing ──────────────────────';

  perform set_config('app.current_user_id', uid_other, true);
  set local role keypilot_app;

  select count(*) into n from public."properties" where id in (prop_a, prop_b);
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B3.1  properties          unrelated user sees 0 properties (count=0)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B3.1  properties          unrelated user sees % properties (expected 0)', n;
  end if;

  select count(*) into n from public."open_houses" where id = oh_a;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B3.2  open_houses         unrelated user sees 0 OHs (count=0)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B3.2  open_houses         unrelated user sees % OHs (expected 0)', n;
  end if;

  select count(*) into n from public."open_house_visitors" where "openHouseId" = oh_a;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B3.3  open_house_visitors unrelated user sees 0 visitors (count=0)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B3.3  open_house_visitors unrelated user sees % visitors (expected 0)', n;
  end if;

  select count(*) into n from public."contacts" where id = contact_a;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B3.4  contacts            unrelated user sees 0 contacts (count=0)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B3.4  contacts            unrelated user sees % contacts (expected 0)', n;
  end if;

  reset role;

  -- ═══════════════════════════════════════════════════════════════════
  -- BLOCK 4 — Write isolation: cross-user mutations must be rejected
  --
  -- PL/pgSQL note: SET LOCAL ROLE is set BEFORE each inner BEGIN block.
  -- Inner BEGIN…EXCEPTION creates an implicit savepoint AFTER the SET LOCAL.
  -- Rolling back to that savepoint on exception does NOT revert SET LOCAL ROLE,
  -- because SET LOCAL was established before the savepoint was created.
  -- Each test ends with RESET ROLE to restore postgres for the next setup step.
  -- ═══════════════════════════════════════════════════════════════════

  raise notice '';
  raise notice '─── Block 4: Write isolation ───────────────────────────────────';

  -- 4.1: uid_other cannot INSERT a property with createdByUserId = uid_a
  perform set_config('app.current_user_id', uid_other, true);
  set local role keypilot_app;
  begin
    insert into public."properties" (id, "createdByUserId", address1, city, state, zip, "updatedAt")
    values (gen_random_uuid()::text, uid_a, '99 Hacked Ave', 'Testville', 'CA', '00000', now());
    fail_count := fail_count + 1;
    raise warning 'FAIL  B4.1  properties          cross-user INSERT permitted (WITH CHECK did not fire)';
  exception when others then
    pass_count := pass_count + 1;
    raise notice 'PASS  B4.1  properties          cross-user INSERT correctly rejected';
  end;
  reset role;

  -- 4.2: uid_other cannot UPDATE uid_a's property (silent 0-row UPDATE)
  perform set_config('app.current_user_id', uid_other, true);
  set local role keypilot_app;
  update public."properties" set address1 = 'Tampered' where id = prop_a;
  get diagnostics n = row_count;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B4.2  properties          cross-user UPDATE silently affects 0 rows';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B4.2  properties          cross-user UPDATE affected % rows (expected 0)', n;
  end if;
  reset role;

  -- 4.3: uid_other cannot INSERT a visitor for oh_a (no access to the open house)
  perform set_config('app.current_user_id', uid_other, true);
  set local role keypilot_app;
  begin
    insert into public."open_house_visitors" (
      id, "openHouseId", "contactId", "signInMethod", "submittedAt"
    ) values (
      gen_random_uuid()::text, oh_a, contact_a, 'TABLET', now()
    );
    fail_count := fail_count + 1;
    raise warning 'FAIL  B4.3  open_house_visitors cross-user INSERT permitted (WITH CHECK did not fire)';
  exception when others then
    pass_count := pass_count + 1;
    raise notice 'PASS  B4.3  open_house_visitors cross-user INSERT correctly rejected';
  end;
  reset role;

  -- ═══════════════════════════════════════════════════════════════════
  -- BLOCK 5 — Empty context: app.current_user_id = '' → deny-all
  --
  -- app.current_user_id() returns NULL when the GUC is '' or unset.
  -- NULL = NULL is never TRUE, so all USING/WITH CHECK clauses fail → 0 rows.
  -- ═══════════════════════════════════════════════════════════════════

  raise notice '';
  raise notice '─── Block 5: Empty context (no current_user_id) ───────────────';

  perform set_config('app.current_user_id', '', true);
  set local role keypilot_app;

  select count(*) into n from public."open_houses" where id = oh_a;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B5.1  open_houses         empty context → 0 rows (deny-all)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B5.1  open_houses         empty context sees % rows (expected 0)', n;
  end if;

  select count(*) into n from public."contacts" where id = contact_a;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  B5.2  contacts            empty context → 0 rows (deny-all)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  B5.2  contacts            empty context sees % rows (expected 0)', n;
  end if;

  reset role;

  -- ═══════════════════════════════════════════════════════════════════
  -- SUMMARY
  -- ═══════════════════════════════════════════════════════════════════

  raise notice '';
  raise notice '══════════════════════════════════════════════════════════════';
  if fail_count = 0 then
    raise notice '  ✓  ALL % TESTS PASSED — Phase 2 isolation verified', pass_count;
  else
    raise warning '  ✗  % passed, % FAILED — review FAIL lines above', pass_count, fail_count;
  end if;
  raise notice '══════════════════════════════════════════════════════════════';
  raise notice '';
  raise notice 'NOTE: This transaction is always rolled back.';
  raise notice '      No test data was written to the database.';

end $$;

rollback;  -- always; test data is never committed

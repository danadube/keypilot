-- ═══════════════════════════════════════════════════════════════════════════
-- RLS Phase 3 — Cross-User Isolation Validation
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WHAT THIS TESTS
--   Proves DB-level per-user isolation for the eight Phase 3 tables:
--     Direct ownership:   deals, transactions, tags, follow_up_reminders
--     Transitive:         commissions, contact_tags,
--                         open_house_hosts, open_house_host_invites
--
-- PREREQUISITES
--   All Phase 1, 2, and 3 migrations must be applied before running:
--     20260320_00 … 20260320_07  (Phase 0a, 1, 2)
--     20260320_08_phase3_grants.sql
--     20260320_09_phase3_rls_direct.sql
--     20260320_10_phase3_rls_transitive.sql
--
-- HOW TO RUN
--   Supabase SQL editor: paste entire file, click Run.
--   psql:  psql "$DIRECT_URL" -f scripts/validate-rls-phase3.sql
--
-- OUTPUT
--   A series of NOTICE lines (PASS / FAIL) followed by a summary.
--   All test data is inside a single transaction that is always ROLLED BACK.
--   Nothing is written to the database.
--
-- ACTORS
--
--   uid_owner  User A — owns all test data (deals, txns, tags, reminders, OH)
--   uid_agent  User B — named agentId on one commission row; entered in
--                       open_house_hosts for uid_owner's OH, but NOT set in
--                       the denormalized open_houses.hostAgentId column.
--   uid_other  User C — completely unrelated; should see nothing.
--
-- SPECIAL COVERAGE
--
--   commissions dual-path SELECT
--     Transaction owner sees ALL commission rows on their transaction.
--     Named agentId sees ONLY their own commission row (secondary path).
--     Named agentId cannot UPDATE or DELETE any commission row.
--
--   open_house_hosts cascade gap (⚠️ ambiguity — see POLICY AMBIGUITIES below)
--     uid_agent is stored in open_house_hosts but NOT in open_houses.hostAgentId.
--     Block 2 verifies: uid_agent sees 0 host records despite being in the table.
--     This documents the known RLS-vs-junction-table design gap.
--
--   open_house_host_invites token safety
--     Invite tokens are issued as public URL slugs and consumed by
--     postgres (BYPASSRLS) on the unauthenticated accept route.
--     Via keypilot_app, an invite is visible only if the agent can see
--     the parent open house. Block 5 verifies that uid_agent and uid_other
--     cannot fetch the invite even with the exact token value.
--
-- POLICY AMBIGUITIES (discovered during validation design)
--
--   1. open_house_hosts / open_house_host_invites — cascade gap
--
--      open_houses RLS grants SELECT to hostUserId, listingAgentId, hostAgentId
--      — three COLUMNS on the open_houses row. The open_house_hosts JUNCTION TABLE
--      stores multi-host records with a userId + role, but the RLS on open_houses
--      does NOT consult the junction table.
--
--      Consequence: an agent added via open_house_hosts with role HOST_AGENT or
--      LISTING_AGENT is STILL invisible to open_houses RLS unless the corresponding
--      denormalized column (hostAgentId / listingAgentId) is ALSO set on the row.
--      An ASSISTANT role agent has no denormalized column at all — they can never
--      see the open house via keypilot_app unless the policy is changed.
--
--      Resolution options (choose before applying to production):
--        A. Keep denormalized columns as the RLS authority. App code must keep
--           listingAgentId/hostAgentId in sync whenever open_house_hosts changes.
--        B. Replace/augment open_houses SELECT policy to also check:
--             exists (
--               select 1 from public."open_house_hosts" ohh
--               where ohh."openHouseId" = open_houses.id
--                 and ohh."userId" = app.current_user_id()
--             )
--           Note: open_house_hosts must not itself require open_houses SELECT
--           to avoid circular RLS dependency (will recurse infinitely).
--           This requires changing the open_house_hosts policies to use a
--           direct userId check instead of the open_houses EXISTS cascade.
--
--   2. commissions agentId vs NULL context
--
--      The SELECT policy is:
--        exists(txn) OR "agentId" = app.current_user_id()
--      When current_user_id() returns NULL, NULL = NULL is never TRUE, so
--      the agentId path also denies correctly. ✓ No change needed.
--
--   3. contact_tags — shared contact scenario
--
--      contact_tags ownership chains through tags.userId. If two agents tag
--      the same contact using their own independent tags, each sees only their
--      own contact_tag rows (correct isolation). There is no cross-agent leakage.
--      However, if a future "shared tag" feature is added, this policy must be
--      revisited to avoid accidentally denying access.
--
--   4. deals contactId / propertyId FK scope
--
--      The deals SELECT policy only checks userId — not contactId or propertyId.
--      An agent could theoretically link a deal to a contact or property they
--      cannot otherwise see (enforced at app layer by route validation, not here).
--      The RLS isolates deal visibility by owner; the FK associations are
--      enforced at app layer. This is intentional and matches the design doc.
--
-- EXPECTED TOTAL
--   37 assertions. All must PASS before Phase 3 is considered complete.
--
--   Block 1  uid_owner reads own data          9 assertions
--   Block 2  uid_agent has limited read         9 assertions
--   Block 3  uid_other sees nothing             8 assertions
--   Block 4  Write isolation                    7 assertions
--   Block 5  Token safety (host invites)        2 assertions
--   Block 6  Empty context deny-all             2 assertions
-- ═══════════════════════════════════════════════════════════════════════════

begin;

do $$
declare
  -- ── actors ────────────────────────────────────────────────────────────────
  uid_owner   text := gen_random_uuid()::text;   -- owns all data
  uid_agent   text := gen_random_uuid()::text;   -- commission recipient + OH host entry
  uid_other   text := gen_random_uuid()::text;   -- completely unrelated

  -- ── data IDs ──────────────────────────────────────────────────────────────
  prop_a       text := gen_random_uuid()::text;
  oh_a         text := gen_random_uuid()::text;
  contact_a    text := gen_random_uuid()::text;
  deal_a       text := gen_random_uuid()::text;
  txn_a        text := gen_random_uuid()::text;
  comm_owner   text := gen_random_uuid()::text;  -- agentId = uid_owner
  comm_agent   text := gen_random_uuid()::text;  -- agentId = uid_agent
  tag_a        text := gen_random_uuid()::text;
  ctag_a       text := gen_random_uuid()::text;
  reminder_a   text := gen_random_uuid()::text;
  oh_host_a    text := gen_random_uuid()::text;
  oh_invite_a  text := gen_random_uuid()::text;
  invite_token text := 'rlstest-host-invite-' || gen_random_uuid()::text;

  n            int;
  pass_count   int := 0;
  fail_count   int := 0;

begin

  -- ═══════════════════════════════════════════════════════════════════════
  -- SETUP — insert as postgres (BYPASSRLS); all rolled back at end
  -- ═══════════════════════════════════════════════════════════════════════

  -- users
  insert into public."users" (id, "clerkId", name, email, role, "productTier", "updatedAt")
  values
    (uid_owner, 'ck_p3rls_owner_' || uid_owner, 'RLS3 Owner', 'rls3-owner+' || uid_owner || '@test.invalid', 'agent', 'OPEN_HOUSE', now()),
    (uid_agent, 'ck_p3rls_agent_' || uid_agent, 'RLS3 Agent', 'rls3-agent+' || uid_agent || '@test.invalid', 'agent', 'OPEN_HOUSE', now()),
    (uid_other, 'ck_p3rls_other_' || uid_other, 'RLS3 Other', 'rls3-other+' || uid_other || '@test.invalid', 'agent', 'OPEN_HOUSE', now());

  -- property (needed by open_house, transaction, deal FKs)
  insert into public."properties" (id, "createdByUserId", address1, city, state, zip, "updatedAt")
  values (prop_a, uid_owner, '1 Phase3 RLS Ave', 'Testville', 'CA', '00003', now());

  -- open house (hostUserId=uid_owner; listingAgentId/hostAgentId deliberately NULL)
  -- uid_agent will be in open_house_hosts but NOT in the denormalized columns.
  insert into public."open_houses" (id, "propertyId", "hostUserId", title, "startAt", "endAt", "qrSlug", "updatedAt")
  values (oh_a, prop_a, uid_owner, 'RLS3 Test OH', now() + interval '1 day', now() + interval '1 day 2 hours', 'rls3-oh-slug-' || oh_a, now());

  -- contact (no owner; inserted by postgres as in real app)
  insert into public."contacts" (id, "firstName", "lastName", "updatedAt")
  values (contact_a, 'RLS3', 'TestContact', now());

  -- deal
  insert into public."deals" (id, "contactId", "propertyId", "userId", "updatedAt")
  values (deal_a, contact_a, prop_a, uid_owner, now());

  -- transaction
  insert into public."transactions" (id, "propertyId", "userId", "updatedAt")
  values (txn_a, prop_a, uid_owner, now());

  -- commissions: two rows on the same transaction
  --   comm_owner: agentId=uid_owner (owner's own split)
  --   comm_agent: agentId=uid_agent (named recipient — secondary SELECT access)
  insert into public."commissions" (id, "transactionId", "agentId", role, amount)
  values
    (comm_owner, txn_a, uid_owner, 'LISTING_AGENT', 5000.00),
    (comm_agent, txn_a, uid_agent, 'BUYER_AGENT',   2500.00);

  -- tag
  insert into public."tags" (id, name, "userId")
  values (tag_a, 'rlstest-tag', uid_owner);

  -- contact_tag
  insert into public."contact_tags" (id, "contactId", "tagId")
  values (ctag_a, contact_a, tag_a);

  -- follow_up_reminder
  insert into public."follow_up_reminders" (id, "contactId", "userId", "dueAt", body, "updatedAt")
  values (reminder_a, contact_a, uid_owner, now() + interval '3 days', 'RLS3 test reminder', now());

  -- open_house_hosts: uid_agent is a HOST_AGENT entry — but NOT in open_houses.hostAgentId
  -- This deliberately tests the cascade gap (ambiguity #1 in POLICY AMBIGUITIES).
  insert into public."open_house_hosts" (id, "openHouseId", "userId", role)
  values (oh_host_a, oh_a, uid_agent, 'HOST_AGENT');

  -- open_house_host_invite (token-safety test subject)
  insert into public."open_house_host_invites" (id, "openHouseId", email, role, token, "expiresAt", "invitedById")
  values (oh_invite_a, oh_a, 'invited-p3rls@test.invalid', 'HOST_AGENT', invite_token, now() + interval '7 days', uid_owner);

  raise notice '';
  raise notice '══════════════════════════════════════════════════════════════';
  raise notice ' KeyPilot RLS Phase 3 — Cross-User Isolation Validation      ';
  raise notice '══════════════════════════════════════════════════════════════';

  -- ═══════════════════════════════════════════════════════════════════════
  -- BLOCK 1 — uid_owner reads all their data
  -- ═══════════════════════════════════════════════════════════════════════

  raise notice '';
  raise notice '─── Block 1: uid_owner reads own data ─────────────────────────';

  perform set_config('app.current_user_id', uid_owner, true);
  set local role keypilot_app;

  -- 1.1  deals
  select count(*) into n from public."deals" where id = deal_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  deals                  owner sees own deal (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  deals                  owner sees % deals (expected 1)', n;
  end if;

  -- 1.2  transactions
  select count(*) into n from public."transactions" where id = txn_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  transactions            owner sees own txn (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  transactions            owner sees % txns (expected 1)', n;
  end if;

  -- 1.3  commissions — owner sees BOTH rows (transaction ownership path)
  select count(*) into n from public."commissions" where "transactionId" = txn_a;
  if n = 2 then
    pass_count := pass_count + 1;
    raise notice 'PASS  commissions (total)     owner sees both commission rows (count=2)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  commissions (total)     owner sees % rows (expected 2)', n;
  end if;

  -- 1.4  commissions — owner can see the agentId=uid_agent split row specifically
  select count(*) into n from public."commissions" where id = comm_agent;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  commissions (agent row) owner can see agentId=uid_agent commission';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  commissions (agent row) owner cannot see agentId=uid_agent commission (expected 1, got %)', n;
  end if;

  -- 1.5  tags
  select count(*) into n from public."tags" where id = tag_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  tags                    owner sees own tag (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  tags                    owner sees % tags (expected 1)', n;
  end if;

  -- 1.6  contact_tags (via tags RLS cascade)
  select count(*) into n from public."contact_tags" where id = ctag_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  contact_tags             owner sees own contact_tag (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  contact_tags             owner sees % contact_tags (expected 1)', n;
  end if;

  -- 1.7  follow_up_reminders
  select count(*) into n from public."follow_up_reminders" where id = reminder_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  follow_up_reminders      owner sees own reminder (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  follow_up_reminders      owner sees % reminders (expected 1)', n;
  end if;

  -- 1.8  open_house_hosts (uid_agent's entry on owner's OH)
  select count(*) into n from public."open_house_hosts" where id = oh_host_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  open_house_hosts         owner sees uid_agent host entry (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  open_house_hosts         owner sees % host entries (expected 1)', n;
  end if;

  -- 1.9  open_house_host_invites
  select count(*) into n from public."open_house_host_invites" where id = oh_invite_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  open_house_host_invites  owner sees own invite (count=1)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  open_house_host_invites  owner sees % invites (expected 1)', n;
  end if;

  reset role;

  -- ═══════════════════════════════════════════════════════════════════════
  -- BLOCK 2 — uid_agent has limited read access
  --
  --   uid_agent:
  --     ✓ can read their OWN commission row (agentId = uid_agent)
  --     ✗ cannot read the owner's commission row (agentId = uid_owner)
  --     ✗ cannot read open_house_hosts — despite being in the table, they
  --       cannot see the parent open house (open_houses.hostAgentId = NULL)
  --       This validates the cascade gap documented in POLICY AMBIGUITIES #1.
  -- ═══════════════════════════════════════════════════════════════════════

  raise notice '';
  raise notice '─── Block 2: uid_agent limited read (commission recipient) ─────';
  raise notice '    ⚠  open_house_hosts:0 expected — cascade gap test (see POLICY AMBIGUITIES #1)';

  perform set_config('app.current_user_id', uid_agent, true);
  set local role keypilot_app;

  -- 2.1  deals: none owned
  select count(*) into n from public."deals" where "userId" = uid_owner;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  deals                  uid_agent sees 0 deals (not their data)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  deals                  uid_agent sees % deals (expected 0)', n;
  end if;

  -- 2.2  transactions: none owned
  select count(*) into n from public."transactions" where "userId" = uid_owner;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  transactions            uid_agent sees 0 txns (not their data)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  transactions            uid_agent sees % txns (expected 0)', n;
  end if;

  -- 2.3  commissions: sees ONLY their own agentId row
  select count(*) into n from public."commissions" where "transactionId" = txn_a;
  if n = 1 then
    pass_count := pass_count + 1;
    raise notice 'PASS  commissions (total)     uid_agent sees exactly 1 commission row (own agentId)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  commissions (total)     uid_agent sees % rows (expected 1)', n;
  end if;

  -- 2.4  commissions: cannot see the owner's commission row
  select count(*) into n from public."commissions" where id = comm_owner;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  commissions (owner row) uid_agent cannot see agentId=uid_owner row';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  commissions (owner row) uid_agent sees agentId=uid_owner row (expected 0, got %)', n;
  end if;

  -- 2.5  tags: none owned
  select count(*) into n from public."tags" where id = tag_a;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  tags                    uid_agent sees 0 tags';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  tags                    uid_agent sees % tags (expected 0)', n;
  end if;

  -- 2.6  contact_tags: none (no accessible tags)
  select count(*) into n from public."contact_tags" where id = ctag_a;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  contact_tags             uid_agent sees 0 contact_tags';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  contact_tags             uid_agent sees % contact_tags (expected 0)', n;
  end if;

  -- 2.7  follow_up_reminders: none owned
  select count(*) into n from public."follow_up_reminders" where id = reminder_a;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  follow_up_reminders      uid_agent sees 0 reminders';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  follow_up_reminders      uid_agent sees % reminders (expected 0)', n;
  end if;

  -- 2.8  open_house_hosts: 0 — uid_agent is IN the table (role=HOST_AGENT) but
  --      cannot see the parent open house (open_houses.hostAgentId is NULL).
  --      ⚠ If this returns 1, the cascade gap was unintentionally closed; investigate.
  select count(*) into n from public."open_house_hosts" where id = oh_host_a;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  open_house_hosts         uid_agent sees 0 (in table but OH hidden — cascade gap confirmed)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  open_house_hosts         uid_agent sees % entries (expected 0 — cascade gap violated)', n;
  end if;

  -- 2.9  open_house_host_invites: 0 — cannot see parent OH
  select count(*) into n from public."open_house_host_invites" where id = oh_invite_a;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  open_house_host_invites  uid_agent sees 0 invites (parent OH hidden)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  open_house_host_invites  uid_agent sees % invites (expected 0)', n;
  end if;

  reset role;

  -- ═══════════════════════════════════════════════════════════════════════
  -- BLOCK 3 — uid_other sees nothing
  -- ═══════════════════════════════════════════════════════════════════════

  raise notice '';
  raise notice '─── Block 3: uid_other sees nothing ───────────────────────────';

  perform set_config('app.current_user_id', uid_other, true);
  set local role keypilot_app;

  select count(*) into n from public."deals" where id = deal_a;
  if n = 0 then pass_count := pass_count + 1; raise notice 'PASS  deals                  uid_other sees 0';
  else fail_count := fail_count + 1; raise warning 'FAIL  deals                  uid_other sees % (expected 0)', n; end if;

  select count(*) into n from public."transactions" where id = txn_a;
  if n = 0 then pass_count := pass_count + 1; raise notice 'PASS  transactions            uid_other sees 0';
  else fail_count := fail_count + 1; raise warning 'FAIL  transactions            uid_other sees % (expected 0)', n; end if;

  -- uid_other is not named as agentId on any row → should see 0 commissions
  select count(*) into n from public."commissions" where "transactionId" = txn_a;
  if n = 0 then pass_count := pass_count + 1; raise notice 'PASS  commissions             uid_other sees 0';
  else fail_count := fail_count + 1; raise warning 'FAIL  commissions             uid_other sees % (expected 0)', n; end if;

  select count(*) into n from public."tags" where id = tag_a;
  if n = 0 then pass_count := pass_count + 1; raise notice 'PASS  tags                    uid_other sees 0';
  else fail_count := fail_count + 1; raise warning 'FAIL  tags                    uid_other sees % (expected 0)', n; end if;

  select count(*) into n from public."contact_tags" where id = ctag_a;
  if n = 0 then pass_count := pass_count + 1; raise notice 'PASS  contact_tags             uid_other sees 0';
  else fail_count := fail_count + 1; raise warning 'FAIL  contact_tags             uid_other sees % (expected 0)', n; end if;

  select count(*) into n from public."follow_up_reminders" where id = reminder_a;
  if n = 0 then pass_count := pass_count + 1; raise notice 'PASS  follow_up_reminders      uid_other sees 0';
  else fail_count := fail_count + 1; raise warning 'FAIL  follow_up_reminders      uid_other sees % (expected 0)', n; end if;

  select count(*) into n from public."open_house_hosts" where id = oh_host_a;
  if n = 0 then pass_count := pass_count + 1; raise notice 'PASS  open_house_hosts         uid_other sees 0';
  else fail_count := fail_count + 1; raise warning 'FAIL  open_house_hosts         uid_other sees % (expected 0)', n; end if;

  select count(*) into n from public."open_house_host_invites" where id = oh_invite_a;
  if n = 0 then pass_count := pass_count + 1; raise notice 'PASS  open_house_host_invites  uid_other sees 0';
  else fail_count := fail_count + 1; raise warning 'FAIL  open_house_host_invites  uid_other sees % (expected 0)', n; end if;

  reset role;

  -- ═══════════════════════════════════════════════════════════════════════
  -- BLOCK 4 — Write isolation
  --
  -- WITH CHECK rejections throw an exception → captured by inner BEGIN/EXCEPTION.
  -- Silent denials (USING without match) affect 0 rows → checked with GET DIAGNOSTICS.
  --
  -- PL/pgSQL note: SET LOCAL ROLE is set BEFORE each inner BEGIN block.
  -- Inner BEGIN...EXCEPTION creates an implicit savepoint AFTER the SET LOCAL.
  -- Rolling back to the savepoint on exception does NOT revert SET LOCAL ROLE
  -- (SET LOCAL was established before the savepoint). Reset role after each test.
  -- ═══════════════════════════════════════════════════════════════════════

  raise notice '';
  raise notice '─── Block 4: Write isolation ───────────────────────────────────';

  -- 4.1  uid_agent cannot INSERT a deal with userId=uid_owner
  perform set_config('app.current_user_id', uid_agent, true);
  set local role keypilot_app;
  begin
    insert into public."deals" (id, "contactId", "propertyId", "userId", "updatedAt")
    values (gen_random_uuid()::text, contact_a, prop_a, uid_owner, now());
    fail_count := fail_count + 1;
    raise warning 'FAIL  deals INSERT            cross-user INSERT permitted (WITH CHECK did not fire)';
  exception when others then
    pass_count := pass_count + 1;
    raise notice 'PASS  deals INSERT            cross-user INSERT correctly rejected';
  end;
  reset role;

  -- 4.2  uid_agent cannot INSERT a transaction with userId=uid_owner
  perform set_config('app.current_user_id', uid_agent, true);
  set local role keypilot_app;
  begin
    insert into public."transactions" (id, "propertyId", "userId", "updatedAt")
    values (gen_random_uuid()::text, prop_a, uid_owner, now());
    fail_count := fail_count + 1;
    raise warning 'FAIL  transactions INSERT     cross-user INSERT permitted';
  exception when others then
    pass_count := pass_count + 1;
    raise notice 'PASS  transactions INSERT     cross-user INSERT correctly rejected';
  end;
  reset role;

  -- 4.3  uid_agent cannot UPDATE comm_owner (agentId=uid_owner) — USING excludes it
  --      The commission's USING checks EXISTS on transactions. uid_agent does not own
  --      the transaction → transactions RLS returns 0 rows → EXISTS is false → 0 updated.
  --      The agentId path applies only to SELECT, not UPDATE. (Silent deny.)
  perform set_config('app.current_user_id', uid_agent, true);
  set local role keypilot_app;
  update public."commissions" set notes = 'tampered' where id = comm_owner;
  get diagnostics n = row_count;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  commissions UPDATE      uid_agent UPDATE of owner commission row → 0 rows (silent deny)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  commissions UPDATE      uid_agent UPDATE affected % rows (expected 0)', n;
  end if;
  reset role;

  -- 4.4  uid_agent cannot DELETE comm_agent (their own agentId row)
  --      DELETE policy only checks EXISTS on transactions (no agentId exception).
  --      uid_agent doesn't own the transaction → EXISTS is false → 0 deleted.
  --      This confirms the agentId path is SELECT-only — recipients cannot self-delete.
  perform set_config('app.current_user_id', uid_agent, true);
  set local role keypilot_app;
  delete from public."commissions" where id = comm_agent;
  get diagnostics n = row_count;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  commissions DELETE      uid_agent DELETE of own commission row → 0 rows (agentId ≠ owner)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  commissions DELETE      uid_agent deleted their own commission row (expected 0, got %)', n;
  end if;
  reset role;

  -- 4.5  uid_agent cannot INSERT a tag with userId=uid_owner
  perform set_config('app.current_user_id', uid_agent, true);
  set local role keypilot_app;
  begin
    insert into public."tags" (id, name, "userId")
    values (gen_random_uuid()::text, 'rlstest-stolen-tag', uid_owner);
    fail_count := fail_count + 1;
    raise warning 'FAIL  tags INSERT             cross-user INSERT permitted';
  exception when others then
    pass_count := pass_count + 1;
    raise notice 'PASS  tags INSERT             cross-user INSERT correctly rejected';
  end;
  reset role;

  -- 4.6  uid_agent cannot INSERT a contact_tag using uid_owner's tag
  --      WITH CHECK: EXISTS on tags is RLS-filtered → tags.userId=uid_owner invisible
  --      to uid_agent → EXISTS returns false → INSERT rejected.
  perform set_config('app.current_user_id', uid_agent, true);
  set local role keypilot_app;
  begin
    insert into public."contact_tags" (id, "contactId", "tagId")
    values (gen_random_uuid()::text, contact_a, tag_a);
    fail_count := fail_count + 1;
    raise warning 'FAIL  contact_tags INSERT     uid_agent INSERT with owner tag permitted';
  exception when others then
    pass_count := pass_count + 1;
    raise notice 'PASS  contact_tags INSERT     uid_agent INSERT with owner tag correctly rejected';
  end;
  reset role;

  -- 4.7  uid_agent cannot INSERT a follow_up_reminder with userId=uid_owner
  perform set_config('app.current_user_id', uid_agent, true);
  set local role keypilot_app;
  begin
    insert into public."follow_up_reminders" (id, "contactId", "userId", "dueAt", body, "updatedAt")
    values (gen_random_uuid()::text, contact_a, uid_owner, now() + interval '1 day', 'tampered reminder', now());
    fail_count := fail_count + 1;
    raise warning 'FAIL  follow_up_reminders INSERT  cross-user INSERT permitted';
  exception when others then
    pass_count := pass_count + 1;
    raise notice 'PASS  follow_up_reminders INSERT  cross-user INSERT correctly rejected';
  end;
  reset role;

  -- ═══════════════════════════════════════════════════════════════════════
  -- BLOCK 5 — Token safety: open_house_host_invites
  --
  -- The invite token is a public URL slug (used by unauthenticated accept routes
  -- running as postgres/BYPASSRLS). Via keypilot_app, the invite is only accessible
  -- if the agent can see the parent open house.
  --
  -- uid_agent: is in open_house_hosts but hostAgentId=NULL → cannot see OH → cannot see invite
  -- uid_other: completely unrelated → cannot see OH → cannot see invite
  -- Both should return 0 rows even when filtering by the exact token value.
  -- ═══════════════════════════════════════════════════════════════════════

  raise notice '';
  raise notice '─── Block 5: Token safety (open_house_host_invites) ────────────';

  -- 5.1  uid_agent: knows the token, but cannot read it via keypilot_app
  perform set_config('app.current_user_id', uid_agent, true);
  set local role keypilot_app;
  select count(*) into n from public."open_house_host_invites" where token = invite_token;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  invite token safety     uid_agent cannot fetch invite by token (count=0)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  invite token safety     uid_agent fetched invite by token (expected 0, got %)', n;
  end if;
  reset role;

  -- 5.2  uid_other: completely unrelated; token yields 0 rows
  perform set_config('app.current_user_id', uid_other, true);
  set local role keypilot_app;
  select count(*) into n from public."open_house_host_invites" where token = invite_token;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  invite token safety     uid_other cannot fetch invite by token (count=0)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  invite token safety     uid_other fetched invite by token (expected 0, got %)', n;
  end if;
  reset role;

  -- ═══════════════════════════════════════════════════════════════════════
  -- BLOCK 6 — Empty context: no current_user_id → deny-all
  --
  -- app.current_user_id() returns NULL when GUC is '' or unset.
  -- - Direct policies: "userId" = NULL → always false → 0 rows.
  -- - agentId path in commissions: "agentId" = NULL → always false → 0 rows.
  -- ═══════════════════════════════════════════════════════════════════════

  raise notice '';
  raise notice '─── Block 6: Empty context (no current_user_id) ────────────────';

  perform set_config('app.current_user_id', '', true);  -- '' → nullif → NULL
  set local role keypilot_app;

  -- 6.1  deals: NULL context → 0
  select count(*) into n from public."deals" where id = deal_a;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  deals                  empty context → 0 (deny-all)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  deals                  empty context sees % rows (expected 0)', n;
  end if;

  -- 6.2  commissions: both the EXISTS path and agentId path must deny
  --      EXISTS(txn) → txn RLS: "userId" = NULL → false
  --      "agentId" = NULL → false
  --      Combined OR → false → 0 rows
  select count(*) into n from public."commissions" where "transactionId" = txn_a;
  if n = 0 then
    pass_count := pass_count + 1;
    raise notice 'PASS  commissions             empty context → 0 (both paths deny, agentId=NULL safe)';
  else
    fail_count := fail_count + 1;
    raise warning 'FAIL  commissions             empty context sees % rows (expected 0)', n;
  end if;

  reset role;

  -- ═══════════════════════════════════════════════════════════════════════
  -- SUMMARY
  -- ═══════════════════════════════════════════════════════════════════════

  raise notice '';
  raise notice '══════════════════════════════════════════════════════════════';
  if fail_count = 0 then
    raise notice '  ✓  ALL % TESTS PASSED — Phase 3 isolation verified', pass_count;
  else
    raise warning '  ✗  % passed, % FAILED — review FAIL lines above', pass_count, fail_count;
  end if;
  raise notice '══════════════════════════════════════════════════════════════';
  raise notice '';
  raise notice 'POLICY AMBIGUITIES REQUIRING DECISION BEFORE PRODUCTION APPLY:';
  raise notice '';
  raise notice '  #1  open_house_hosts cascade gap';
  raise notice '      Agents in open_house_hosts cannot see the parent open house';
  raise notice '      unless they are ALSO set in open_houses.listingAgentId or';
  raise notice '      open_houses.hostAgentId. ASSISTANT role has no column at all.';
  raise notice '      Block 2 test 2.8 intentionally verifies this returns 0.';
  raise notice '      Resolve before migrating any routes that rely on OH host access.';
  raise notice '      Options: A) keep denorm columns as auth source (app must sync)';
  raise notice '               B) add junction-table EXISTS clause to open_houses';
  raise notice '                  SELECT policy (breaks transitive cascade — requires';
  raise notice '                  direct userId check on open_house_hosts instead).';
  raise notice '';
  raise notice '  #2  commissions agentId — SELECT only, no write';
  raise notice '      Named split recipients can read their commission row.';
  raise notice '      They cannot UPDATE or DELETE it (test 4.3, 4.4 confirmed).';
  raise notice '      This is intentional. Document in API spec.';
  raise notice '';
  raise notice '  #3  deals contactId/propertyId FK scope';
  raise notice '      Deal RLS is scoped to userId only. App layer must validate';
  raise notice '      that contactId/propertyId belong to the creating agent.';
  raise notice '';
  raise notice 'NOTE: This transaction is always rolled back.';
  raise notice '      No test data was written to the database.';

end $$;

rollback;  -- always; test data is never committed

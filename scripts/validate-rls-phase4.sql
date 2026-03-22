-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 4 RLS Validation — activities + usage_events
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Actors:
--   uid_a     — owns an open house, a property, and a contact (via visitor)
--   uid_b     — listingAgentId on uid_a's open house (sees OH + contact cascade)
--   uid_other — unrelated agent (sees nothing)
--
-- Schema notes (verified against preview):
--   activities:   activityType (enum), body (text NOT NULL), occurredAt (NOT NULL),
--                 openHouseId, contactId, propertyId, createdAt. No updatedAt.
--   usage_events: userId, eventName (text NOT NULL), metadata (jsonb), createdAt.
--   open_house_visitors: id (text NOT NULL), signInMethod, submittedAt required.
--   open_houses: title, startAt, endAt, qrSlug, status required.
--
-- All test data is inserted inside the DO block and auto-rolls back on RAISE EXCEPTION.
-- Results are surfaced via RAISE EXCEPTION (execute_sql returns errors, not NOTICE).
--
-- Expected: 21/21 PASS
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  uid_a     uuid := gen_random_uuid();
  uid_b     uuid := gen_random_uuid();
  uid_other uuid := gen_random_uuid();

  prop_id    text := gen_random_uuid()::text;
  oh_id      text := gen_random_uuid()::text;
  contact_id text := gen_random_uuid()::text;
  visitor_id text := gen_random_uuid()::text;

  act_oh_id      text := gen_random_uuid()::text;  -- OH path only
  act_contact_id text := gen_random_uuid()::text;  -- contact path only
  act_prop_id    text := gen_random_uuid()::text;  -- property path only
  act_all_id     text := gen_random_uuid()::text;  -- all three FKs

  ue_a_id text := gen_random_uuid()::text;
  ue_b_id text := gen_random_uuid()::text;

  cnt     int;
  results text := '';
  pass    int := 0;
  fail    int := 0;
begin

  -- ── Seed ───────────────────────────────────────────────────────────────

  insert into public."users" (id, "clerkId", name, email, role, "productTier", "updatedAt") values
    (uid_a,     'ck_p4a_'||uid_a,     'P4 A',     'p4a+'||uid_a||'@test.invalid',     'agent', 'OPEN_HOUSE', now()),
    (uid_b,     'ck_p4b_'||uid_b,     'P4 B',     'p4b+'||uid_b||'@test.invalid',     'agent', 'OPEN_HOUSE', now()),
    (uid_other, 'ck_p4o_'||uid_other, 'P4 Other', 'p4o+'||uid_other||'@test.invalid', 'agent', 'OPEN_HOUSE', now());

  insert into public."properties" (id, "createdByUserId", address1, city, state, zip, "updatedAt")
  values (prop_id, uid_a, '4 Phase Ave', 'Testville', 'TX', '00004', now());

  insert into public."open_houses" (
    id, "propertyId", "hostUserId", "listingAgentId",
    title, "startAt", "endAt", "qrSlug", status, "updatedAt"
  ) values (
    oh_id, prop_id, uid_a, uid_b,
    'P4 RLS Test OH', now() + interval '7 days', now() + interval '8 days',
    'p4-rls-test-' || oh_id, 'SCHEDULED', now()
  );

  insert into public."contacts" (id, "firstName", "lastName", "createdAt", "updatedAt")
  values (contact_id, 'Phase', 'Four', now(), now());

  insert into public."open_house_visitors" (
    id, "openHouseId", "contactId", "signInMethod", "submittedAt"
  ) values (visitor_id, oh_id, contact_id, 'TABLET', now());

  -- activities: activityType (enum), body (NOT NULL), occurredAt (NOT NULL)
  insert into public."activities" (id, "activityType", body, "occurredAt", "openHouseId", "contactId", "propertyId", "createdAt") values
    (act_oh_id,      'OPEN_HOUSE_CREATED', 'test', now(), oh_id, null,       null,    now()),
    (act_contact_id, 'NOTE_ADDED',         'test', now(), null,  contact_id, null,    now()),
    (act_prop_id,    'OPEN_HOUSE_CREATED', 'test', now(), null,  null,       prop_id, now()),
    (act_all_id,     'VISITOR_SIGNED_IN',  'test', now(), oh_id, contact_id, prop_id, now());

  -- usage_events: eventName (NOT NULL)
  insert into public."usage_events" (id, "userId", "eventName", "createdAt") values
    (ue_a_id, uid_a, 'OPEN_HOUSE_CREATED', now()),
    (ue_b_id, uid_b, 'OPEN_HOUSE_VIEWED',  now());

  -- ── Block 1: uid_a (host + property owner) ─────────────────────────────
  results := results || E'\nBlock 1 — uid_a (host + property owner)\n';
  perform set_config('app.current_user_id', uid_a::text, true);
  set local role keypilot_app;

  select count(*) into cnt from public."activities" where id = act_oh_id;
  if cnt=1 then results:=results||'  PASS  B1.1 uid_a sees OH-linked activity'||E'\n'; pass:=pass+1;
  else results:=results||'  FAIL  B1.1 uid_a sees OH-linked activity (got '||cnt||')'||E'\n'; fail:=fail+1; end if;

  select count(*) into cnt from public."activities" where id = act_contact_id;
  if cnt=1 then results:=results||'  PASS  B1.2 uid_a sees contact-linked activity'||E'\n'; pass:=pass+1;
  else results:=results||'  FAIL  B1.2 uid_a sees contact-linked activity (got '||cnt||')'||E'\n'; fail:=fail+1; end if;

  select count(*) into cnt from public."activities" where id = act_prop_id;
  if cnt=1 then results:=results||'  PASS  B1.3 uid_a sees property-linked activity'||E'\n'; pass:=pass+1;
  else results:=results||'  FAIL  B1.3 uid_a sees property-linked activity (got '||cnt||')'||E'\n'; fail:=fail+1; end if;

  select count(*) into cnt from public."activities" where id = act_all_id;
  if cnt=1 then results:=results||'  PASS  B1.4 uid_a sees all-FK activity'||E'\n'; pass:=pass+1;
  else results:=results||'  FAIL  B1.4 uid_a sees all-FK activity (got '||cnt||')'||E'\n'; fail:=fail+1; end if;

  select count(*) into cnt from public."activities";
  if cnt=4 then results:=results||'  PASS  B1.5 uid_a total activities = 4'||E'\n'; pass:=pass+1;
  else results:=results||'  FAIL  B1.5 uid_a total activities (got '||cnt||')'||E'\n'; fail:=fail+1; end if;

  select count(*) into cnt from public."usage_events" where id = ue_a_id;
  if cnt=1 then results:=results||'  PASS  B1.6 uid_a sees own usage_event'||E'\n'; pass:=pass+1;
  else results:=results||'  FAIL  B1.6 uid_a sees own usage_event (got '||cnt||')'||E'\n'; fail:=fail+1; end if;

  select count(*) into cnt from public."usage_events" where id = ue_b_id;
  if cnt=0 then results:=results||'  PASS  B1.7 uid_a blocked from uid_b usage_event'||E'\n'; pass:=pass+1;
  else results:=results||'  FAIL  B1.7 uid_a blocked from uid_b usage_event (got '||cnt||')'||E'\n'; fail:=fail+1; end if;

  select count(*) into cnt from public."usage_events";
  if cnt=1 then results:=results||'  PASS  B1.8 uid_a total usage_events = 1'||E'\n'; pass:=pass+1;
  else results:=results||'  FAIL  B1.8 uid_a total usage_events (got '||cnt||')'||E'\n'; fail:=fail+1; end if;

  set local role postgres;

  -- ── Block 2: uid_b (listingAgent — cascade through OH) ──────────────────
  results := results || E'\nBlock 2 — uid_b (listingAgent)\n';
  perform set_config('app.current_user_id', uid_b::text, true);
  set local role keypilot_app;

  select count(*) into cnt from public."activities" where id = act_oh_id;
  if cnt=1 then results:=results||'  PASS  B2.1 uid_b sees OH-linked activity'||E'\n'; pass:=pass+1;
  else results:=results||'  FAIL  B2.1 uid_b sees OH-linked activity (got '||cnt||')'||E'\n'; fail:=fail+1; end if;

  select count(*) into cnt from public."activities" where id = act_contact_id;
  if cnt=1 then results:=results||'  PASS  B2.2 uid_b sees contact-linked activity (cascade)'||E'\n'; pass:=pass+1;
  else results:=results||'  FAIL  B2.2 uid_b sees contact-linked activity (got '||cnt||')'||E'\n'; fail:=fail+1; end if;

  -- property-only activity NOT visible: properties RLS is createdByUserId = uid_a only
  select count(*) into cnt from public."activities" where id = act_prop_id;
  if cnt=0 then results:=results||'  PASS  B2.3 uid_b blocked from property-only activity'||E'\n'; pass:=pass+1;
  else results:=results||'  FAIL  B2.3 uid_b blocked from property-only activity (got '||cnt||')'||E'\n'; fail:=fail+1; end if;

  -- all-FK activity visible via OH path even though property path fails
  select count(*) into cnt from public."activities" where id = act_all_id;
  if cnt=1 then results:=results||'  PASS  B2.4 uid_b sees all-FK activity (OH path resolves)'||E'\n'; pass:=pass+1;
  else results:=results||'  FAIL  B2.4 uid_b sees all-FK activity (got '||cnt||')'||E'\n'; fail:=fail+1; end if;

  -- 3 visible: OH, contact, all-FK; property-only excluded
  select count(*) into cnt from public."activities";
  if cnt=3 then results:=results||'  PASS  B2.5 uid_b total activities = 3'||E'\n'; pass:=pass+1;
  else results:=results||'  FAIL  B2.5 uid_b total activities (got '||cnt||')'||E'\n'; fail:=fail+1; end if;

  select count(*) into cnt from public."usage_events" where id = ue_b_id;
  if cnt=1 then results:=results||'  PASS  B2.6 uid_b sees own usage_event'||E'\n'; pass:=pass+1;
  else results:=results||'  FAIL  B2.6 uid_b sees own usage_event (got '||cnt||')'||E'\n'; fail:=fail+1; end if;

  select count(*) into cnt from public."usage_events" where id = ue_a_id;
  if cnt=0 then results:=results||'  PASS  B2.7 uid_b blocked from uid_a usage_event'||E'\n'; pass:=pass+1;
  else results:=results||'  FAIL  B2.7 uid_b blocked from uid_a usage_event (got '||cnt||')'||E'\n'; fail:=fail+1; end if;

  set local role postgres;

  -- ── Block 3: uid_other (unrelated) ──────────────────────────────────────
  results := results || E'\nBlock 3 — uid_other (unrelated)\n';
  perform set_config('app.current_user_id', uid_other::text, true);
  set local role keypilot_app;

  select count(*) into cnt from public."activities";
  if cnt=0 then results:=results||'  PASS  B3.1 uid_other total activities = 0'||E'\n'; pass:=pass+1;
  else results:=results||'  FAIL  B3.1 uid_other total activities (got '||cnt||')'||E'\n'; fail:=fail+1; end if;

  select count(*) into cnt from public."usage_events";
  if cnt=0 then results:=results||'  PASS  B3.2 uid_other total usage_events = 0'||E'\n'; pass:=pass+1;
  else results:=results||'  FAIL  B3.2 uid_other total usage_events (got '||cnt||')'||E'\n'; fail:=fail+1; end if;

  set local role postgres;

  -- ── Block 4: usage_events INSERT policy ─────────────────────────────────
  results := results || E'\nBlock 4 — usage_events INSERT policy\n';
  perform set_config('app.current_user_id', uid_a::text, true);
  set local role keypilot_app;

  begin
    insert into public."usage_events" (id, "userId", "eventName", "createdAt")
    values (gen_random_uuid()::text, uid_a, 'SETTINGS_VIEWED', now());
    results:=results||'  PASS  B4.1 uid_a can insert own usage_event'||E'\n'; pass:=pass+1;
  exception when others then
    results:=results||'  FAIL  B4.1 uid_a can insert own usage_event: '||sqlerrm||E'\n'; fail:=fail+1;
  end;

  begin
    insert into public."usage_events" (id, "userId", "eventName", "createdAt")
    values (gen_random_uuid()::text, uid_b, 'SETTINGS_VIEWED', now());
    results:=results||'  FAIL  B4.2 uid_a blocked from inserting uid_b usage_event (no error)'||E'\n'; fail:=fail+1;
  exception when others then
    results:=results||'  PASS  B4.2 uid_a blocked from inserting uid_b usage_event'||E'\n'; pass:=pass+1;
  end;

  set local role postgres;

  -- ── Block 5: empty current_user_id deny-all ─────────────────────────────
  results := results || E'\nBlock 5 — empty current_user_id\n';
  perform set_config('app.current_user_id', '', true);
  set local role keypilot_app;

  select count(*) into cnt from public."activities";
  if cnt=0 then results:=results||'  PASS  B5.1 empty context — activities = 0'||E'\n'; pass:=pass+1;
  else results:=results||'  FAIL  B5.1 empty context — activities (got '||cnt||')'||E'\n'; fail:=fail+1; end if;

  select count(*) into cnt from public."usage_events";
  if cnt=0 then results:=results||'  PASS  B5.2 empty context — usage_events = 0'||E'\n'; pass:=pass+1;
  else results:=results||'  FAIL  B5.2 empty context — usage_events (got '||cnt||')'||E'\n'; fail:=fail+1; end if;

  set local role postgres;

  -- ── Summary ─────────────────────────────────────────────────────────────
  raise exception E'\n═══ Phase 4 RLS Validation ═══\n%\n%/%  assertions passed',
    results, pass, (pass + fail);

end;
$$ language plpgsql;

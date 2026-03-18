-- KeyPilot — Public RLS Hardening (deny-by-default)
-- Purpose: prevent PostgREST exposure of PII/tokens when RLS is not enabled.
-- Notes:
-- - This migration enables RLS on selected public tables and adds ownership-scoped policies.
-- - Policies are added only for `authenticated` role. No `anon` policies are created (deny-by-default).
-- - Backend/API uses Prisma (not PostgREST). Supabase service-role / privileged DB users should continue to bypass RLS.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) user/profile
-- ─────────────────────────────────────────────────────────────────────────────
alter table public."user_profiles" enable row level security;
alter table public."users" enable row level security;

-- user_profiles: own row only
drop policy if exists user_profiles_select_own on public."user_profiles";
create policy user_profiles_select_own
on public."user_profiles"
for select to authenticated
using ("userId" = auth.uid());

drop policy if exists user_profiles_update_own on public."user_profiles";
create policy user_profiles_update_own
on public."user_profiles"
for update to authenticated
using ("userId" = auth.uid())
with check ("userId" = auth.uid());

drop policy if exists user_profiles_insert_own on public."user_profiles";
create policy user_profiles_insert_own
on public."user_profiles"
for insert to authenticated
with check ("userId" = auth.uid());

drop policy if exists user_profiles_delete_own on public."user_profiles";
create policy user_profiles_delete_own
on public."user_profiles"
for delete to authenticated
using ("userId" = auth.uid());

-- users: own row only (id OR clerkId match auth.uid)
drop policy if exists users_select_own on public."users";
create policy users_select_own
on public."users"
for select to authenticated
using ("id" = auth.uid() OR "clerkId" = auth.uid());

drop policy if exists users_update_own on public."users";
create policy users_update_own
on public."users"
for update to authenticated
using ("id" = auth.uid() OR "clerkId" = auth.uid())
with check ("id" = auth.uid() OR "clerkId" = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) property
-- ─────────────────────────────────────────────────────────────────────────────
alter table public."properties" enable row level security;

-- properties: createdByUserId ownership only, soft-delete filtered
drop policy if exists properties_select_own on public."properties";
create policy properties_select_own
on public."properties"
for select to authenticated
using ("createdByUserId" = auth.uid() and "deletedAt" is null);

drop policy if exists properties_write_own on public."properties";
create policy properties_write_own
on public."properties"
for update to authenticated
using ("createdByUserId" = auth.uid() and "deletedAt" is null)
with check ("createdByUserId" = auth.uid());

drop policy if exists properties_insert_own on public."properties";
create policy properties_insert_own
on public."properties"
for insert to authenticated
with check ("createdByUserId" = auth.uid());

drop policy if exists properties_delete_own on public."properties";
create policy properties_delete_own
on public."properties"
for delete to authenticated
using ("createdByUserId" = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) event (open_houses + showings)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public."open_houses" enable row level security;
alter table public."showings" enable row level security;

-- open_houses: hostUserId ownership only, soft-delete filtered
drop policy if exists open_houses_select_host on public."open_houses";
create policy open_houses_select_host
on public."open_houses"
for select to authenticated
using ("hostUserId" = auth.uid() and "deletedAt" is null);

drop policy if exists open_houses_write_host on public."open_houses";
create policy open_houses_write_host
on public."open_houses"
for update to authenticated
using ("hostUserId" = auth.uid() and "deletedAt" is null)
with check ("hostUserId" = auth.uid());

drop policy if exists open_houses_insert_host on public."open_houses";
create policy open_houses_insert_host
on public."open_houses"
for insert to authenticated
with check ("hostUserId" = auth.uid());

drop policy if exists open_houses_delete_host on public."open_houses";
create policy open_houses_delete_host
on public."open_houses"
for delete to authenticated
using ("hostUserId" = auth.uid());

-- showings: hostUserId ownership only, soft-delete filtered
drop policy if exists showings_select_host on public."showings";
create policy showings_select_host
on public."showings"
for select to authenticated
using ("hostUserId" = auth.uid() and "deletedAt" is null);

drop policy if exists showings_write_host on public."showings";
create policy showings_write_host
on public."showings"
for update to authenticated
using ("hostUserId" = auth.uid() and "deletedAt" is null)
with check ("hostUserId" = auth.uid());

drop policy if exists showings_insert_host on public."showings";
create policy showings_insert_host
on public."showings"
for insert to authenticated
with check ("hostUserId" = auth.uid());

drop policy if exists showings_delete_host on public."showings";
create policy showings_delete_host
on public."showings"
for delete to authenticated
using ("hostUserId" = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) visitor/contact + related ownership through open_houses
-- ─────────────────────────────────────────────────────────────────────────────
alter table public."open_house_visitors" enable row level security;
alter table public."follow_up_drafts" enable row level security;
alter table public."contacts" enable row level security;

-- open_house_visitors: only via ownership of related open_house
drop policy if exists open_house_visitors_select_host on public."open_house_visitors";
create policy open_house_visitors_select_host
on public."open_house_visitors"
for select to authenticated
using (
  exists (
    select 1
    from public."open_houses" oh
    where oh."id" = public."open_house_visitors"."openHouseId"
      and oh."hostUserId" = auth.uid()
      and oh."deletedAt" is null
  )
);

drop policy if exists open_house_visitors_write_host on public."open_house_visitors";
create policy open_house_visitors_write_host
on public."open_house_visitors"
for update to authenticated
using (
  exists (
    select 1
    from public."open_houses" oh
    where oh."id" = public."open_house_visitors"."openHouseId"
      and oh."hostUserId" = auth.uid()
      and oh."deletedAt" is null
  )
)
with check (
  exists (
    select 1
    from public."open_houses" oh
    where oh."id" = public."open_house_visitors"."openHouseId"
      and oh."hostUserId" = auth.uid()
      and oh."deletedAt" is null
  )
);

drop policy if exists open_house_visitors_insert_host on public."open_house_visitors";
create policy open_house_visitors_insert_host
on public."open_house_visitors"
for insert to authenticated
with check (
  exists (
    select 1
    from public."open_houses" oh
    where oh."id" = public."open_house_visitors"."openHouseId"
      and oh."hostUserId" = auth.uid()
      and oh."deletedAt" is null
  )
);

-- follow_up_drafts: only via ownership of related open_house
drop policy if exists follow_up_drafts_select_host on public."follow_up_drafts";
create policy follow_up_drafts_select_host
on public."follow_up_drafts"
for select to authenticated
using (
  "deletedAt" is null and exists (
    select 1
    from public."open_houses" oh
    where oh."id" = public."follow_up_drafts"."openHouseId"
      and oh."hostUserId" = auth.uid()
      and oh."deletedAt" is null
  )
);

drop policy if exists follow_up_drafts_write_host on public."follow_up_drafts";
create policy follow_up_drafts_write_host
on public."follow_up_drafts"
for update to authenticated
using (
  "deletedAt" is null and exists (
    select 1
    from public."open_houses" oh
    where oh."id" = public."follow_up_drafts"."openHouseId"
      and oh."hostUserId" = auth.uid()
      and oh."deletedAt" is null
  )
)
with check (
  exists (
    select 1
    from public."open_houses" oh
    where oh."id" = public."follow_up_drafts"."openHouseId"
      and oh."hostUserId" = auth.uid()
      and oh."deletedAt" is null
  )
);

drop policy if exists follow_up_drafts_insert_host on public."follow_up_drafts";
create policy follow_up_drafts_insert_host
on public."follow_up_drafts"
for insert to authenticated
with check (
  "deletedAt" is null and exists (
    select 1
    from public."open_houses" oh
    where oh."id" = public."follow_up_drafts"."openHouseId"
      and oh."hostUserId" = auth.uid()
      and oh."deletedAt" is null
  )
);

drop policy if exists follow_up_drafts_delete_host on public."follow_up_drafts";
create policy follow_up_drafts_delete_host
on public."follow_up_drafts"
for delete to authenticated
using (
  exists (
    select 1
    from public."open_houses" oh
    where oh."id" = public."follow_up_drafts"."openHouseId"
      and oh."hostUserId" = auth.uid()
      and oh."deletedAt" is null
  )
);

-- contacts: assigned/owned contacts only
-- (plus allow read via your open_house_visitors/follow_up_drafts relations so hosts can see context)
drop policy if exists contacts_select_owned on public."contacts";
create policy contacts_select_owned
on public."contacts"
for select to authenticated
using (
  (
    "assignedToUserId" = auth.uid()
  )
  or (
    exists (
      select 1
      from public."open_house_visitors" ohv
      join public."open_houses" oh on oh."id" = ohv."openHouseId"
      where ohv."contactId" = public."contacts"."id"
        and oh."hostUserId" = auth.uid()
        and oh."deletedAt" is null
    )
  )
  or (
    exists (
      select 1
      from public."follow_up_drafts" fud
      join public."open_houses" oh on oh."id" = fud."openHouseId"
      where fud."contactId" = public."contacts"."id"
        and fud."deletedAt" is null
        and oh."hostUserId" = auth.uid()
        and oh."deletedAt" is null
    )
  )
)
;

drop policy if exists contacts_write_assigned on public."contacts";
create policy contacts_write_assigned
on public."contacts"
for update to authenticated
using (
  "deletedAt" is null and "assignedToUserId" = auth.uid()
)
with check (
  "assignedToUserId" = auth.uid()
);

drop policy if exists contacts_insert_assigned on public."contacts";
create policy contacts_insert_assigned
on public."contacts"
for insert to authenticated
with check (
  "deletedAt" is null and "assignedToUserId" = auth.uid()
);

drop policy if exists contacts_delete_assigned on public."contacts";
create policy contacts_delete_assigned
on public."contacts"
for delete to authenticated
using (
  "assignedToUserId" = auth.uid()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) reporting + token flows
-- ─────────────────────────────────────────────────────────────────────────────
alter table public."feedback_requests" enable row level security;
alter table public."open_house_host_invites" enable row level security;
alter table public."seller_reports" enable row level security;

-- feedback_requests: hostUserId ownership only (token column not accessible to anon)
drop policy if exists feedback_requests_select_host on public."feedback_requests";
create policy feedback_requests_select_host
on public."feedback_requests"
for select to authenticated
using (
  "hostUserId" = auth.uid()
);

drop policy if exists feedback_requests_write_host on public."feedback_requests";
create policy feedback_requests_write_host
on public."feedback_requests"
for update to authenticated
using ("hostUserId" = auth.uid())
with check ("hostUserId" = auth.uid());

drop policy if exists feedback_requests_insert_host on public."feedback_requests";
create policy feedback_requests_insert_host
on public."feedback_requests"
for insert to authenticated
with check ("hostUserId" = auth.uid());

drop policy if exists feedback_requests_delete_host on public."feedback_requests";
create policy feedback_requests_delete_host
on public."feedback_requests"
for delete to authenticated
using ("hostUserId" = auth.uid());

-- open_house_host_invites: ownership via related open_house
drop policy if exists open_house_host_invites_select_host on public."open_house_host_invites";
create policy open_house_host_invites_select_host
on public."open_house_host_invites"
for select to authenticated
using (
  exists (
    select 1
    from public."open_houses" oh
    where oh."id" = public."open_house_host_invites"."openHouseId"
      and oh."hostUserId" = auth.uid()
      and oh."deletedAt" is null
  )
);

drop policy if exists open_house_host_invites_write_host on public."open_house_host_invites";
create policy open_house_host_invites_write_host
on public."open_house_host_invites"
for update to authenticated
using (
  exists (
    select 1
    from public."open_houses" oh
    where oh."id" = public."open_house_host_invites"."openHouseId"
      and oh."hostUserId" = auth.uid()
      and oh."deletedAt" is null
  )
)
with check (
  exists (
    select 1
    from public."open_houses" oh
    where oh."id" = public."open_house_host_invites"."openHouseId"
      and oh."hostUserId" = auth.uid()
      and oh."deletedAt" is null
  )
);

drop policy if exists open_house_host_invites_insert_host on public."open_house_host_invites";
create policy open_house_host_invites_insert_host
on public."open_house_host_invites"
for insert to authenticated
with check (
  exists (
    select 1
    from public."open_houses" oh
    where oh."id" = public."open_house_host_invites"."openHouseId"
      and oh."hostUserId" = auth.uid()
      and oh."deletedAt" is null
  )
);

drop policy if exists open_house_host_invites_delete_host on public."open_house_host_invites";
create policy open_house_host_invites_delete_host
on public."open_house_host_invites"
for delete to authenticated
using (
  exists (
    select 1
    from public."open_houses" oh
    where oh."id" = public."open_house_host_invites"."openHouseId"
      and oh."hostUserId" = auth.uid()
      and oh."deletedAt" is null
  )
);

-- seller_reports: generatedByUserId ownership only
drop policy if exists seller_reports_select_own on public."seller_reports";
create policy seller_reports_select_own
on public."seller_reports"
for select to authenticated
using ("generatedByUserId" = auth.uid());

drop policy if exists seller_reports_write_own on public."seller_reports";
create policy seller_reports_write_own
on public."seller_reports"
for update to authenticated
using ("generatedByUserId" = auth.uid())
with check ("generatedByUserId" = auth.uid());

drop policy if exists seller_reports_insert_own on public."seller_reports";
create policy seller_reports_insert_own
on public."seller_reports"
for insert to authenticated
with check ("generatedByUserId" = auth.uid());

drop policy if exists seller_reports_delete_own on public."seller_reports";
create policy seller_reports_delete_own
on public."seller_reports"
for delete to authenticated
using ("generatedByUserId" = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) transactions + commissions + deals
-- ─────────────────────────────────────────────────────────────────────────────
alter table public."deals" enable row level security;
alter table public."transactions" enable row level security;
alter table public."commissions" enable row level security;

-- deals: userId ownership only
drop policy if exists deals_select_own on public."deals";
create policy deals_select_own
on public."deals"
for select to authenticated
using ("userId" = auth.uid());

drop policy if exists deals_write_own on public."deals";
create policy deals_write_own
on public."deals"
for update to authenticated
using ("userId" = auth.uid())
with check ("userId" = auth.uid());

drop policy if exists deals_insert_own on public."deals";
create policy deals_insert_own
on public."deals"
for insert to authenticated
with check ("userId" = auth.uid());

drop policy if exists deals_delete_own on public."deals";
create policy deals_delete_own
on public."deals"
for delete to authenticated
using ("userId" = auth.uid());

-- transactions: userId ownership only
drop policy if exists transactions_select_own on public."transactions";
create policy transactions_select_own
on public."transactions"
for select to authenticated
using ("userId" = auth.uid());

drop policy if exists transactions_write_own on public."transactions";
create policy transactions_write_own
on public."transactions"
for update to authenticated
using ("userId" = auth.uid())
with check ("userId" = auth.uid());

drop policy if exists transactions_insert_own on public."transactions";
create policy transactions_insert_own
on public."transactions"
for insert to authenticated
with check ("userId" = auth.uid());

drop policy if exists transactions_delete_own on public."transactions";
create policy transactions_delete_own
on public."transactions"
for delete to authenticated
using ("userId" = auth.uid());

-- commissions: via transaction ownership
drop policy if exists commissions_select_own on public."commissions";
create policy commissions_select_own
on public."commissions"
for select to authenticated
using (
  exists (
    select 1
    from public."transactions" t
    where t."id" = public."commissions"."transactionId"
      and t."userId" = auth.uid()
  )
);

drop policy if exists commissions_write_own on public."commissions";
create policy commissions_write_own
on public."commissions"
for update to authenticated
using (
  exists (
    select 1
    from public."transactions" t
    where t."id" = public."commissions"."transactionId"
      and t."userId" = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public."transactions" t
    where t."id" = public."commissions"."transactionId"
      and t."userId" = auth.uid()
  )
);

drop policy if exists commissions_insert_own on public."commissions";
create policy commissions_insert_own
on public."commissions"
for insert to authenticated
with check (
  exists (
    select 1
    from public."transactions" t
    where t."id" = public."commissions"."transactionId"
      and t."userId" = auth.uid()
  )
);

drop policy if exists commissions_delete_own on public."commissions";
create policy commissions_delete_own
on public."commissions"
for delete to authenticated
using (
  exists (
    select 1
    from public."transactions" t
    where t."id" = public."commissions"."transactionId"
      and t."userId" = auth.uid()
  )
);

commit;


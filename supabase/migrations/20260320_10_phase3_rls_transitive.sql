-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 3b — RLS for transitive-ownership tables
-- ═══════════════════════════════════════════════════════════════════════════
--
-- TABLES
--
--   commissions            Transitive via transactions (transactionId → userId)
--                          Secondary SELECT path: agentId = current user (split)
--   contact_tags           Transitive via tags (tagId → userId)
--   open_house_hosts       Transitive via open_houses (openHouseId)
--   open_house_host_invites Transitive via open_houses (openHouseId)
--
-- PATTERN: RLS CASCADE
--
--   Tables use EXISTS subqueries on their parent (transactions, tags, open_houses).
--   Because those parent tables have RLS enabled, the EXISTS subquery is itself
--   filtered — Postgres applies RLS recursively. No redundant owner checks needed.
--
-- DESIGN NOTES — commissions
--
--   Two SELECT access paths:
--     1. Transaction owner: you own the transaction → see all its commissions
--     2. Named agent: your userId is the agentId on the commission row (split recipient)
--   Only the transaction owner can INSERT/UPDATE/DELETE commission rows.
--   agentId (the split recipient) has read-only access to their own commission row.
--
-- DESIGN NOTES — contact_tags
--
--   Ownership: the agent who owns the tag (tags.userId) owns the contact_tag.
--   "tagId" in the EXISTS is resolved as the outer table's column (contact_tags."tagId"),
--   which is safe because "tagId" does not exist on the tags alias — no shadowing risk.
--
-- DESIGN NOTES — open_house_hosts / open_house_host_invites
--
--   SELECT: anyone who can access the open house (multi-role cascade from Phase 2b).
--   INSERT/UPDATE/DELETE: only agents who can write to the open house.
--     open_houses RLS (Phase 2b) already filters to hostUserId, listingAgentId,
--     hostAgentId — so the EXISTS write check inherits that automatically.
--   open_house_hosts has no UPDATE grant (add/remove only — no UPDATE route exists).
--
-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
--
--   ALTER TABLE public."commissions"             DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public."contact_tags"            DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public."open_house_hosts"        DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public."open_house_host_invites" DISABLE ROW LEVEL SECURITY;
--
--   DROP POLICY IF EXISTS commissions_select_own    ON public."commissions";
--   DROP POLICY IF EXISTS commissions_insert_own    ON public."commissions";
--   DROP POLICY IF EXISTS commissions_update_own    ON public."commissions";
--   DROP POLICY IF EXISTS commissions_delete_own    ON public."commissions";
--
--   DROP POLICY IF EXISTS ctags_select_own  ON public."contact_tags";
--   DROP POLICY IF EXISTS ctags_insert_own  ON public."contact_tags";
--   DROP POLICY IF EXISTS ctags_update_own  ON public."contact_tags";
--   DROP POLICY IF EXISTS ctags_delete_own  ON public."contact_tags";
--
--   DROP POLICY IF EXISTS oh_hosts_select_own  ON public."open_house_hosts";
--   DROP POLICY IF EXISTS oh_hosts_insert_own  ON public."open_house_hosts";
--   DROP POLICY IF EXISTS oh_hosts_delete_own  ON public."open_house_hosts";
--
--   DROP POLICY IF EXISTS oh_invites_select_own  ON public."open_house_host_invites";
--   DROP POLICY IF EXISTS oh_invites_insert_own  ON public."open_house_host_invites";
--   DROP POLICY IF EXISTS oh_invites_update_own  ON public."open_house_host_invites";
--   DROP POLICY IF EXISTS oh_invites_delete_own  ON public."open_house_host_invites";
--
-- ─── VALIDATION ──────────────────────────────────────────────────────────────
--
--   SELECT tablename, relrowsecurity, COUNT(policyname) AS policy_count
--   FROM pg_policies p
--   JOIN pg_class c ON c.relname = p.tablename
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE p.schemaname = 'public'
--     AND p.tablename IN (
--       'commissions','contact_tags','open_house_hosts','open_house_host_invites'
--     )
--     AND n.nspname = 'public'
--   GROUP BY tablename, relrowsecurity ORDER BY tablename;
--
--   Expected:
--     commissions              | true | 4
--     contact_tags             | true | 4
--     open_house_host_invites  | true | 4
--     open_house_hosts         | true | 3   (no UPDATE policy — no UPDATE grant)
--
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) commissions  — transitive via transactions; secondary SELECT via agentId
-- ─────────────────────────────────────────────────────────────────────────────

alter table public."commissions" enable row level security;

drop policy if exists commissions_select_own on public."commissions";
drop policy if exists commissions_insert_own on public."commissions";
drop policy if exists commissions_update_own on public."commissions";
drop policy if exists commissions_delete_own on public."commissions";

-- SELECT: transaction owner OR the named split recipient (agentId)
create policy commissions_select_own
  on public."commissions" for select to keypilot_app
  using (
    exists (
      select 1 from public."transactions" t
      where t.id = "transactionId"
    )
    or "agentId" = app.current_user_id()
  );

-- INSERT/UPDATE/DELETE: transaction owner only (via transactions RLS cascade)
create policy commissions_insert_own
  on public."commissions" for insert to keypilot_app
  with check (
    exists (
      select 1 from public."transactions" t
      where t.id = "transactionId"
    )
  );

create policy commissions_update_own
  on public."commissions" for update to keypilot_app
  using (
    exists (
      select 1 from public."transactions" t
      where t.id = "transactionId"
    )
  )
  with check (
    exists (
      select 1 from public."transactions" t
      where t.id = "transactionId"
    )
  );

create policy commissions_delete_own
  on public."commissions" for delete to keypilot_app
  using (
    exists (
      select 1 from public."transactions" t
      where t.id = "transactionId"
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) contact_tags  — transitive via tags (tagId → tags.userId)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- "tagId" in the EXISTS is the outer table's column (contact_tags."tagId").
-- No column shadowing risk: "tagId" does not exist on the tags alias.

alter table public."contact_tags" enable row level security;

drop policy if exists ctags_select_own on public."contact_tags";
drop policy if exists ctags_insert_own on public."contact_tags";
drop policy if exists ctags_update_own on public."contact_tags";
drop policy if exists ctags_delete_own on public."contact_tags";

create policy ctags_select_own
  on public."contact_tags" for select to keypilot_app
  using (
    exists (
      select 1 from public."tags" t
      where t.id = "tagId"
    )
  );

create policy ctags_insert_own
  on public."contact_tags" for insert to keypilot_app
  with check (
    exists (
      select 1 from public."tags" t
      where t.id = "tagId"
    )
  );

create policy ctags_update_own
  on public."contact_tags" for update to keypilot_app
  using (
    exists (
      select 1 from public."tags" t
      where t.id = "tagId"
    )
  )
  with check (
    exists (
      select 1 from public."tags" t
      where t.id = "tagId"
    )
  );

create policy ctags_delete_own
  on public."contact_tags" for delete to keypilot_app
  using (
    exists (
      select 1 from public."tags" t
      where t.id = "tagId"
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) open_house_hosts  — transitive via open_houses; no UPDATE (add/remove only)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- SELECT inherits the multi-role access from open_houses RLS (Phase 2b):
-- hostUserId, listingAgentId, or hostAgentId on the parent OH.
-- INSERT/DELETE: same — write-capable via open_houses RLS cascade.

alter table public."open_house_hosts" enable row level security;

drop policy if exists oh_hosts_select_own on public."open_house_hosts";
drop policy if exists oh_hosts_insert_own on public."open_house_hosts";
drop policy if exists oh_hosts_delete_own on public."open_house_hosts";

create policy oh_hosts_select_own
  on public."open_house_hosts" for select to keypilot_app
  using (
    exists (
      select 1 from public."open_houses" oh
      where oh.id = "openHouseId"
    )
  );

create policy oh_hosts_insert_own
  on public."open_house_hosts" for insert to keypilot_app
  with check (
    exists (
      select 1 from public."open_houses" oh
      where oh.id = "openHouseId"
    )
  );

create policy oh_hosts_delete_own
  on public."open_house_hosts" for delete to keypilot_app
  using (
    exists (
      select 1 from public."open_houses" oh
      where oh.id = "openHouseId"
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) open_house_host_invites  — transitive via open_houses
-- ─────────────────────────────────────────────────────────────────────────────

alter table public."open_house_host_invites" enable row level security;

drop policy if exists oh_invites_select_own on public."open_house_host_invites";
drop policy if exists oh_invites_insert_own on public."open_house_host_invites";
drop policy if exists oh_invites_update_own on public."open_house_host_invites";
drop policy if exists oh_invites_delete_own on public."open_house_host_invites";

create policy oh_invites_select_own
  on public."open_house_host_invites" for select to keypilot_app
  using (
    exists (
      select 1 from public."open_houses" oh
      where oh.id = "openHouseId"
    )
  );

create policy oh_invites_insert_own
  on public."open_house_host_invites" for insert to keypilot_app
  with check (
    exists (
      select 1 from public."open_houses" oh
      where oh.id = "openHouseId"
    )
  );

create policy oh_invites_update_own
  on public."open_house_host_invites" for update to keypilot_app
  using (
    exists (
      select 1 from public."open_houses" oh
      where oh.id = "openHouseId"
    )
  )
  with check (
    exists (
      select 1 from public."open_houses" oh
      where oh.id = "openHouseId"
    )
  );

create policy oh_invites_delete_own
  on public."open_house_host_invites" for delete to keypilot_app
  using (
    exists (
      select 1 from public."open_houses" oh
      where oh.id = "openHouseId"
    )
  );

commit;

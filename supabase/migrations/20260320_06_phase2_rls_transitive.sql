-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 2c — RLS for transitive-ownership tables
-- ═══════════════════════════════════════════════════════════════════════════
--
-- TABLES
--
--   open_house_visitors  Ownership via open_houses (openHouseId FK)
--   follow_up_drafts     Ownership via open_houses (openHouseId FK)
--   seller_reports       Ownership via open_houses (openHouseId FK)
--   contacts             Ownership via open_house_visitors (contactId FK, 2 hops)
--
-- PATTERN: RLS CASCADE
--
--   All policies use EXISTS subqueries on the parent table. Because open_houses
--   also has RLS enabled (Phase 2b), the EXISTS subquery is itself filtered by
--   the caller's access rights — Postgres applies RLS recursively on subqueries.
--
--   Result: a visitor row is visible iff the caller can see its parent open house,
--   which requires being hostUserId / listingAgentId / hostAgentId on that OH.
--   No redundant OR conditions needed here.
--
-- ⚠️  DESIGN ASSUMPTION — contacts ownership:
--
--   Contacts have NO createdByUserId or direct owner field. Visibility is derived
--   from: "this agent had at least one visitor from this contact at one of their OHs."
--
--   This means if contact John Doe visited Agent A and Agent B's open houses,
--   BOTH agents see the same contact record (including all notes). The contacts
--   table is effectively shared-mutable state between agents who share visitors.
--
--   Current app code matches this behavior (scoped by visitor → OH chain).
--   This is flagged for data model redesign in a future iteration (add
--   createdByUserId to contacts, or move notes/tags to per-agent association table).
--
-- ⚠️  DESIGN ASSUMPTION — contacts INSERT:
--
--   keypilot_app receives no INSERT grant on contacts (see Phase 2 grants migration).
--   Contacts are created exclusively by the public visitor-signin route running as
--   postgres (BYPASSRLS). No INSERT policy is defined here.
--
--   If a future authenticated "create contact" route is added, add:
--     grant insert on public."contacts" to keypilot_app;
--     create policy contacts_insert_own on public."contacts" for insert to keypilot_app
--       with check (true);  -- or with assignedToUserId check if that field is used
--
-- PUBLIC ROUTES (run as postgres, BYPASSRLS — not affected):
--   POST /api/v1/visitor-signin  — creates visitors, contacts, follow_up_drafts
--   GET  /api/v1/flyer/[token]   — updates flyerLinkClickedAt on open_house_visitors
--
-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
--
--   ALTER TABLE public."open_house_visitors" DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public."follow_up_drafts"    DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public."seller_reports"      DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public."contacts"            DISABLE ROW LEVEL SECURITY;
--
--   DROP POLICY IF EXISTS visitors_select_own   ON public."open_house_visitors";
--   DROP POLICY IF EXISTS visitors_insert_own   ON public."open_house_visitors";
--   DROP POLICY IF EXISTS visitors_update_own   ON public."open_house_visitors";
--   DROP POLICY IF EXISTS visitors_delete_own   ON public."open_house_visitors";
--
--   DROP POLICY IF EXISTS drafts_select_own   ON public."follow_up_drafts";
--   DROP POLICY IF EXISTS drafts_insert_own   ON public."follow_up_drafts";
--   DROP POLICY IF EXISTS drafts_update_own   ON public."follow_up_drafts";
--   DROP POLICY IF EXISTS drafts_delete_own   ON public."follow_up_drafts";
--
--   DROP POLICY IF EXISTS reports_select_own   ON public."seller_reports";
--   DROP POLICY IF EXISTS reports_insert_own   ON public."seller_reports";
--   DROP POLICY IF EXISTS reports_delete_own   ON public."seller_reports";
--
--   DROP POLICY IF EXISTS contacts_select_own   ON public."contacts";
--   DROP POLICY IF EXISTS contacts_update_own   ON public."contacts";
--   DROP POLICY IF EXISTS contacts_delete_own   ON public."contacts";
--
-- ─── VALIDATION ──────────────────────────────────────────────────────────────
--
--   SELECT tablename, relrowsecurity, COUNT(policyname) AS policy_count
--   FROM pg_policies p
--   JOIN pg_class c ON c.relname = p.tablename
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE p.schemaname = 'public'
--     AND p.tablename IN ('open_house_visitors','follow_up_drafts','seller_reports','contacts')
--     AND n.nspname = 'public'
--   GROUP BY tablename, relrowsecurity ORDER BY tablename;
--
--   Expected:
--     contacts             | true | 3   (no INSERT policy)
--     follow_up_drafts     | true | 4
--     open_house_visitors  | true | 4
--     seller_reports       | true | 3   (no UPDATE policy)
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) open_house_visitors  — ownership via open_houses
-- ─────────────────────────────────────────────────────────────────────────────

alter table public."open_house_visitors" enable row level security;

drop policy if exists visitors_select_own on public."open_house_visitors";
drop policy if exists visitors_insert_own on public."open_house_visitors";
drop policy if exists visitors_update_own on public."open_house_visitors";
drop policy if exists visitors_delete_own on public."open_house_visitors";

-- The EXISTS subquery on open_houses is filtered by open_houses' own RLS policy,
-- so this policy automatically inherits the multi-role access of open_houses.
create policy visitors_select_own
  on public."open_house_visitors" for select to keypilot_app
  using (
    exists (
      select 1 from public."open_houses" oh
      where oh.id = "openHouseId"
    )
  );

create policy visitors_insert_own
  on public."open_house_visitors" for insert to keypilot_app
  with check (
    exists (
      select 1 from public."open_houses" oh
      where oh.id = "openHouseId"
    )
  );

create policy visitors_update_own
  on public."open_house_visitors" for update to keypilot_app
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

create policy visitors_delete_own
  on public."open_house_visitors" for delete to keypilot_app
  using (
    exists (
      select 1 from public."open_houses" oh
      where oh.id = "openHouseId"
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) follow_up_drafts  — ownership via open_houses
-- ─────────────────────────────────────────────────────────────────────────────

alter table public."follow_up_drafts" enable row level security;

drop policy if exists drafts_select_own on public."follow_up_drafts";
drop policy if exists drafts_insert_own on public."follow_up_drafts";
drop policy if exists drafts_update_own on public."follow_up_drafts";
drop policy if exists drafts_delete_own on public."follow_up_drafts";

create policy drafts_select_own
  on public."follow_up_drafts" for select to keypilot_app
  using (
    exists (
      select 1 from public."open_houses" oh
      where oh.id = "openHouseId"
    )
  );

create policy drafts_insert_own
  on public."follow_up_drafts" for insert to keypilot_app
  with check (
    exists (
      select 1 from public."open_houses" oh
      where oh.id = "openHouseId"
    )
  );

create policy drafts_update_own
  on public."follow_up_drafts" for update to keypilot_app
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

create policy drafts_delete_own
  on public."follow_up_drafts" for delete to keypilot_app
  using (
    exists (
      select 1 from public."open_houses" oh
      where oh.id = "openHouseId"
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) seller_reports  — ownership via open_houses; no UPDATE policy (no route)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public."seller_reports" enable row level security;

drop policy if exists reports_select_own on public."seller_reports";
drop policy if exists reports_insert_own on public."seller_reports";
drop policy if exists reports_delete_own on public."seller_reports";

create policy reports_select_own
  on public."seller_reports" for select to keypilot_app
  using (
    exists (
      select 1 from public."open_houses" oh
      where oh.id = "openHouseId"
    )
  );

create policy reports_insert_own
  on public."seller_reports" for insert to keypilot_app
  with check (
    exists (
      select 1 from public."open_houses" oh
      where oh.id = "openHouseId"
    )
  );

create policy reports_delete_own
  on public."seller_reports" for delete to keypilot_app
  using (
    exists (
      select 1 from public."open_houses" oh
      where oh.id = "openHouseId"
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) contacts  — ownership via open_house_visitors (2-hop cascade)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Contacts are visible to a user if they have at least one visitor record linking
-- to this contact from one of their accessible open houses.
--
-- Chain: contacts.id ← open_house_visitors.contactId
--                      open_house_visitors.openHouseId → open_houses (RLS-filtered)
--
-- Performance note: this is a 2-level EXISTS with index lookups on both FKs.
-- Indexes on open_house_visitors(contactId) and open_house_visitors(openHouseId)
-- and open_houses(hostUserId/listingAgentId/hostAgentId) must be maintained.

alter table public."contacts" enable row level security;

drop policy if exists contacts_select_own on public."contacts";
drop policy if exists contacts_update_own on public."contacts";
drop policy if exists contacts_delete_own on public."contacts";

create policy contacts_select_own
  on public."contacts" for select to keypilot_app
  using (
    exists (
      select 1 from public."open_house_visitors" ohv
      where ohv."contactId" = id
    )
  );

create policy contacts_update_own
  on public."contacts" for update to keypilot_app
  using (
    exists (
      select 1 from public."open_house_visitors" ohv
      where ohv."contactId" = id
    )
  )
  with check (
    exists (
      select 1 from public."open_house_visitors" ohv
      where ohv."contactId" = id
    )
  );

create policy contacts_delete_own
  on public."contacts" for delete to keypilot_app
  using (
    exists (
      select 1 from public."open_house_visitors" ohv
      where ohv."contactId" = id
    )
  );

commit;

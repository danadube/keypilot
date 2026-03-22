-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 4b — RLS for activities (OR-based multi-path SELECT)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- OWNERSHIP MODEL — OR across linked resources
--
--   activities has no userId column. Visibility is derived from whichever
--   resource(s) the activity is linked to. The rule is deliberately inclusive:
--
--     IF any linked resource is visible to the current user → the activity is visible.
--
--   Three possible ownership paths — any one is sufficient:
--
--   1. openHouseId → open_houses
--        Inherits open_houses RLS (Phase 2b): visible if the agent is
--        hostUserId, listingAgentId, or hostAgentId on the open house.
--        Covers: OPEN_HOUSE_CREATED, VISITOR_SIGNED_IN, FOLLOW_UP_DRAFT_CREATED,
--                EMAIL_SENT, SELLER_REPORT_GENERATED.
--
--   2. contactId → contacts (2-hop cascade)
--        Inherits contacts RLS (Phase 2c): visible if the contact has at least
--        one open_house_visitor record linking to an open house the agent can access.
--        Contacts are shared across agents who co-hosted or share a visitor —
--        this is a known design property (see Phase 2 migration notes).
--        Covers: NOTE_ADDED, CALL_LOGGED, EMAIL_LOGGED, and any contactId-linked type.
--
--   3. propertyId → properties
--        Inherits properties RLS (Phase 2a): visible if createdByUserId = agent.
--        Covers: VISITOR_SIGNED_IN (which sets all three FKs).
--        Also provides a future path for property-scoped activity types.
--
--   Activities with multiple FKs set (e.g. VISITOR_SIGNED_IN has all three) are
--   visible if ANY of the paths resolves. Each NULL FK path is skipped (the
--   IS NOT NULL guard ensures a NULL openHouseId never accidentally matches via
--   a row in open_houses).
--
-- WRITE PATH (intentionally excluded from RLS)
--
--   keypilot_app has SELECT grant only on activities (migration 11). All writes
--   are performed by routes running as postgres (BYPASSRLS):
--     - Public visitor-signin route (no Clerk auth; creates VISITOR_SIGNED_IN)
--     - Clerk-authenticated routes that use plain prisma for activity side effects:
--         open-houses/route.ts         OPEN_HOUSE_CREATED
--         follow-ups/generate          FOLLOW_UP_DRAFT_CREATED
--         open-houses/[id]/report      SELLER_REPORT_GENERATED
--         contacts/[id]/notes          NOTE_ADDED
--         contacts/[id]/communications CALL_LOGGED / EMAIL_LOGGED / EMAIL_SENT
--         follow-up-drafts/[id]/send   EMAIL_SENT
--   These routes are NOT changed in this migration. Write behavior is unchanged.
--
-- ROUTE IMPACT
--
--   One read route migrated:
--     GET /api/v1/contacts/[id]/activities
--     Before: plain prisma + app-layer canAccessContact guard
--     After:  withRLSContext → contacts RLS enforces access automatically
--             (contactId IN (SELECT id FROM contacts) — same logic, DB-enforced)
--
-- KNOWN AMBIGUITY — shared contacts
--
--   contacts RLS (Phase 2c) makes a contact visible to any agent whose open house
--   the contact visited. A NOTE_ADDED activity for contact John is therefore
--   visible to all agents who share John as a visitor. This matches the existing
--   contact visibility model and is not introduced by this migration.
--
-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
--
--   ALTER TABLE public."activities" DISABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS activities_select_own ON public."activities";
--
-- ─── VALIDATION ──────────────────────────────────────────────────────────────
--
--   SELECT tablename, relrowsecurity, COUNT(policyname) AS policy_count
--   FROM pg_policies p
--   JOIN pg_class c ON c.relname = p.tablename
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE p.schemaname = 'public' AND p.tablename = 'activities'
--     AND n.nspname = 'public'
--   GROUP BY tablename, relrowsecurity;
--
--   Expected: activities | true | 1
--
-- ═══════════════════════════════════════════════════════════════════════════

begin;

alter table public."activities" enable row level security;

drop policy if exists activities_select_own on public."activities";

-- SELECT: visible if the agent can access ANY of the activity's linked resources.
--
-- Each path is guarded by IS NOT NULL so that a NULL FK never accidentally
-- matches. Postgres applies RLS recursively on each parent table's EXISTS/IN
-- subquery (open_houses, contacts, properties all have RLS from Phases 2a/2b/2c).
--
-- OR is intentional: an activity with both openHouseId and contactId set is
-- visible to any agent who can access either resource.
create policy activities_select_own
  on public."activities" for select to keypilot_app
  using (
    -- Path 1: linked to an open house the agent can access (host/listing/hostAgent)
    (
      "openHouseId" is not null
      and exists (
        select 1 from public."open_houses" oh
        where oh.id = "openHouseId"
      )
    )
    -- Path 2: linked to a contact the agent can access (2-hop via visitors → OH)
    or (
      "contactId" is not null
      and "contactId" in (
        select id from public."contacts"
      )
    )
    -- Path 3: linked to a property the agent owns (createdByUserId)
    or (
      "propertyId" is not null
      and exists (
        select 1 from public."properties" p
        where p.id = "propertyId"
      )
    )
  );

-- No INSERT, UPDATE, or DELETE policies.
-- keypilot_app has SELECT grant only — write access is not granted.

commit;

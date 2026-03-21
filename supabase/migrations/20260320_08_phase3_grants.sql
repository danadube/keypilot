-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 3 — keypilot_app grants for DealForge + supporting tables
-- ═══════════════════════════════════════════════════════════════════════════
--
-- TABLES ADDED HERE
--
--   deals                  Direct single-user ownership (userId)
--   transactions           Direct single-user ownership (userId)
--   commissions            Transitive via transactions (transactionId → userId)
--                          Also readable by the named agentId (split recipient)
--   tags                   Direct single-user ownership (userId)
--   contact_tags           Transitive via tags (tagId → userId)
--   follow_up_reminders    Direct single-user ownership (userId)
--   open_house_hosts       Transitive via open_houses (openHouseId)
--   open_house_host_invites Transitive via open_houses (openHouseId)
--
-- DEFERRED (Phase 4)
--
--   activities             No direct userId; multi-path transitive (contactId,
--                          propertyId, openHouseId). Needs its own analysis.
--   usage_events           Internal analytics; userId-scoped but low priority.
--
-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
--
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON public."deals"                    FROM keypilot_app;
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON public."transactions"             FROM keypilot_app;
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON public."commissions"              FROM keypilot_app;
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON public."tags"                     FROM keypilot_app;
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON public."contact_tags"             FROM keypilot_app;
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON public."follow_up_reminders"      FROM keypilot_app;
--   REVOKE SELECT, INSERT,         DELETE ON public."open_house_hosts"         FROM keypilot_app;
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON public."open_house_host_invites"  FROM keypilot_app;
--
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- deals: full CRUD — agent manages their own deal pipeline
grant select, insert, update, delete
  on public."deals"
  to keypilot_app;

-- transactions: full CRUD — agent manages their own transactions
grant select, insert, update, delete
  on public."transactions"
  to keypilot_app;

-- commissions: full CRUD — transaction owner manages splits; agentId may view
grant select, insert, update, delete
  on public."commissions"
  to keypilot_app;

-- tags: full CRUD — agent creates and manages their own contact tags
grant select, insert, update, delete
  on public."tags"
  to keypilot_app;

-- contact_tags: full CRUD — agent applies their own tags to contacts
grant select, insert, update, delete
  on public."contact_tags"
  to keypilot_app;

-- follow_up_reminders: full CRUD — agent manages their own reminders
grant select, insert, update, delete
  on public."follow_up_reminders"
  to keypilot_app;

-- open_house_hosts: SELECT + INSERT + DELETE (no UPDATE — add/remove only)
grant select, insert, delete
  on public."open_house_hosts"
  to keypilot_app;

-- open_house_host_invites: full CRUD — agent manages invites for their OHs
grant select, insert, update, delete
  on public."open_house_host_invites"
  to keypilot_app;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- Supra review queue — table + keypilot_app grants + RLS (hostUserId ownership)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Keeps preview / Supabase-managed databases aligned with Prisma schema.
-- Prisma migration: prisma/migrations/20260323203000_supra_queue_items/
--
-- API routes currently use prismaAdmin (BYPASSRLS), same as other ShowingHQ
-- pending-migration routes; RLS is enforced when queries run as keypilot_app.
--
-- ─── ROLLBACK (manual) ───────────────────────────────────────────────────────
--   DROP POLICY IF EXISTS supra_queue_items_select_own ON public.supra_queue_items;
--   DROP POLICY IF EXISTS supra_queue_items_insert_own ON public.supra_queue_items;
--   DROP POLICY IF EXISTS supra_queue_items_update_own ON public.supra_queue_items;
--   DROP POLICY IF EXISTS supra_queue_items_delete_own ON public.supra_queue_items;
--   ALTER TABLE public.supra_queue_items DISABLE ROW LEVEL SECURITY;
--   REVOKE ALL ON public.supra_queue_items FROM keypilot_app;
--   DROP TABLE IF EXISTS public.supra_queue_items CASCADE;
--   DROP TYPE IF EXISTS "SupraProposedAction";
--   DROP TYPE IF EXISTS "SupraShowingMatchStatus";
--   DROP TYPE IF EXISTS "SupraPropertyMatchStatus";
--   DROP TYPE IF EXISTS "SupraParseConfidence";
--   DROP TYPE IF EXISTS "SupraQueueState";
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- Idempotent enum creation (safe if Prisma migrate already created them)
do $$ begin
  create type "SupraQueueState" as enum (
    'INGESTED',
    'PARSED',
    'NEEDS_REVIEW',
    'READY_TO_APPLY',
    'APPLIED',
    'FAILED_PARSE',
    'DISMISSED',
    'DUPLICATE'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type "SupraParseConfidence" as enum ('HIGH', 'MEDIUM', 'LOW');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type "SupraPropertyMatchStatus" as enum (
    'UNSET',
    'NO_MATCH',
    'MATCHED',
    'AMBIGUOUS',
    'POSSIBLE_DUPLICATE'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type "SupraShowingMatchStatus" as enum (
    'UNSET',
    'NO_SHOWING',
    'MATCHED',
    'AMBIGUOUS',
    'POSSIBLE_DUPLICATE'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type "SupraProposedAction" as enum (
    'UNKNOWN',
    'CREATE_SHOWING',
    'UPDATE_SHOWING',
    'CREATE_PROPERTY_AND_SHOWING',
    'DISMISS',
    'NEEDS_MANUAL_REVIEW'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.supra_queue_items (
  id text not null,
  "hostUserId" text not null,
  source text not null default 'supra',
  "externalMessageId" text not null,
  subject text not null,
  "receivedAt" timestamp(3) not null,
  "rawBodyText" text not null,
  sender text,
  "parsedAddress1" text,
  "parsedCity" text,
  "parsedState" text,
  "parsedZip" text,
  "parsedScheduledAt" timestamp(3),
  "parsedEventKind" text,
  "parsedStatus" text,
  "parsedAgentName" text,
  "parsedAgentEmail" text,
  "parseConfidence" "SupraParseConfidence" not null default 'LOW'::"SupraParseConfidence",
  "proposedAction" "SupraProposedAction" not null default 'UNKNOWN'::"SupraProposedAction",
  "matchedPropertyId" text,
  "matchedShowingId" text,
  "propertyMatchStatus" "SupraPropertyMatchStatus" not null default 'UNSET'::"SupraPropertyMatchStatus",
  "showingMatchStatus" "SupraShowingMatchStatus" not null default 'UNSET'::"SupraShowingMatchStatus",
  "queueState" "SupraQueueState" not null default 'INGESTED'::"SupraQueueState",
  "reviewedAt" timestamp(3),
  "reviewedByUserId" text,
  "resolutionNotes" text,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null,
  constraint supra_queue_items_pkey primary key (id)
);

create unique index if not exists supra_queue_items_hostuserid_externalmessageid_key
  on public.supra_queue_items ("hostUserId", "externalMessageId");

create index if not exists supra_queue_items_hostuserid_queuestate_idx
  on public.supra_queue_items ("hostUserId", "queueState");

create index if not exists supra_queue_items_hostuserid_receivedat_idx
  on public.supra_queue_items ("hostUserId", "receivedAt");

do $$ begin
  alter table public.supra_queue_items
    add constraint supra_queue_items_hostuserid_fkey
    foreign key ("hostUserId") references public.users (id)
    on delete cascade on update cascade;
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter table public.supra_queue_items
    add constraint supra_queue_items_matchedpropertyid_fkey
    foreign key ("matchedPropertyId") references public.properties (id)
    on delete set null on update cascade;
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter table public.supra_queue_items
    add constraint supra_queue_items_matchedshowingid_fkey
    foreign key ("matchedShowingId") references public.showings (id)
    on delete set null on update cascade;
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter table public.supra_queue_items
    add constraint supra_queue_items_reviewedbyuserid_fkey
    foreign key ("reviewedByUserId") references public.users (id)
    on delete set null on update cascade;
exception
  when duplicate_object then null;
end $$;

grant select, insert, update, delete
  on public.supra_queue_items
  to keypilot_app;

alter table public.supra_queue_items enable row level security;

drop policy if exists supra_queue_items_select_own on public.supra_queue_items;
drop policy if exists supra_queue_items_insert_own on public.supra_queue_items;
drop policy if exists supra_queue_items_update_own on public.supra_queue_items;
drop policy if exists supra_queue_items_delete_own on public.supra_queue_items;

create policy supra_queue_items_select_own
  on public.supra_queue_items for select to keypilot_app
  using ("hostUserId" = app.current_user_id());

create policy supra_queue_items_insert_own
  on public.supra_queue_items for insert to keypilot_app
  with check ("hostUserId" = app.current_user_id());

create policy supra_queue_items_update_own
  on public.supra_queue_items for update to keypilot_app
  using ("hostUserId" = app.current_user_id())
  with check ("hostUserId" = app.current_user_id());

create policy supra_queue_items_delete_own
  on public.supra_queue_items for delete to keypilot_app
  using ("hostUserId" = app.current_user_id());

commit;

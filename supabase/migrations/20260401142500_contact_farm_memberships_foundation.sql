begin;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'ContactFarmMembershipStatus'
      and n.nspname = 'public'
  ) then
    create type "ContactFarmMembershipStatus" as enum ('ACTIVE', 'ARCHIVED');
  end if;
end
$$;

create table if not exists public."farm_territories" (
  "id" text not null,
  "userId" text not null,
  "name" text not null,
  "description" text,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null,
  "deletedAt" timestamp(3),
  constraint "farm_territories_pkey" primary key ("id")
);

create table if not exists public."farm_areas" (
  "id" text not null,
  "userId" text not null,
  "territoryId" text not null,
  "name" text not null,
  "description" text,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null,
  "deletedAt" timestamp(3),
  constraint "farm_areas_pkey" primary key ("id")
);

create table if not exists public."contact_farm_memberships" (
  "id" text not null,
  "userId" text not null,
  "contactId" text not null,
  "farmAreaId" text not null,
  "status" "ContactFarmMembershipStatus" not null default 'ACTIVE',
  "notes" text,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null,
  "archivedAt" timestamp(3),
  constraint "contact_farm_memberships_pkey" primary key ("id")
);

create unique index if not exists "contact_farm_memberships_contactId_farmAreaId_key"
  on public."contact_farm_memberships" ("contactId", "farmAreaId");
create index if not exists "farm_territories_userId_deletedAt_idx"
  on public."farm_territories" ("userId", "deletedAt");
create index if not exists "farm_areas_userId_deletedAt_idx"
  on public."farm_areas" ("userId", "deletedAt");
create index if not exists "farm_areas_territoryId_deletedAt_idx"
  on public."farm_areas" ("territoryId", "deletedAt");
create index if not exists "contact_farm_memberships_userId_status_idx"
  on public."contact_farm_memberships" ("userId", "status");
create index if not exists "contact_farm_memberships_contactId_status_idx"
  on public."contact_farm_memberships" ("contactId", "status");
create index if not exists "contact_farm_memberships_farmAreaId_status_idx"
  on public."contact_farm_memberships" ("farmAreaId", "status");

do $$
begin
  alter table public."farm_territories"
    add constraint "farm_territories_userId_fkey"
    foreign key ("userId") references public."users"("id")
    on delete cascade on update cascade;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public."farm_areas"
    add constraint "farm_areas_userId_fkey"
    foreign key ("userId") references public."users"("id")
    on delete cascade on update cascade;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public."farm_areas"
    add constraint "farm_areas_territoryId_fkey"
    foreign key ("territoryId") references public."farm_territories"("id")
    on delete cascade on update cascade;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public."contact_farm_memberships"
    add constraint "contact_farm_memberships_userId_fkey"
    foreign key ("userId") references public."users"("id")
    on delete cascade on update cascade;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public."contact_farm_memberships"
    add constraint "contact_farm_memberships_contactId_fkey"
    foreign key ("contactId") references public."contacts"("id")
    on delete cascade on update cascade;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public."contact_farm_memberships"
    add constraint "contact_farm_memberships_farmAreaId_fkey"
    foreign key ("farmAreaId") references public."farm_areas"("id")
    on delete cascade on update cascade;
exception
  when duplicate_object then null;
end
$$;

commit;

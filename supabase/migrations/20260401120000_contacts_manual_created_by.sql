-- Manual dashboard contacts (+ New → New Contact): ownership via createdByUserId + RLS.

begin;

alter table public."contacts"
  add column if not exists "createdByUserId" uuid references public."users"(id) on delete set null;

create index if not exists contacts_created_by_user_id_idx
  on public."contacts" ("createdByUserId");

grant insert on public."contacts" to keypilot_app;

drop policy if exists contacts_select_own on public."contacts";
drop policy if exists contacts_update_own on public."contacts";
drop policy if exists contacts_delete_own on public."contacts";
drop policy if exists contacts_insert_manual on public."contacts";

create policy contacts_select_own
  on public."contacts" for select to keypilot_app
  using (
    id in (select "contactId" from public."open_house_visitors")
    or (
      "createdByUserId" is not null
      and "createdByUserId" = app.current_user_id()
    )
  );

create policy contacts_update_own
  on public."contacts" for update to keypilot_app
  using (
    id in (select "contactId" from public."open_house_visitors")
    or (
      "createdByUserId" is not null
      and "createdByUserId" = app.current_user_id()
    )
  )
  with check (
    id in (select "contactId" from public."open_house_visitors")
    or (
      "createdByUserId" is not null
      and "createdByUserId" = app.current_user_id()
    )
  );

create policy contacts_delete_own
  on public."contacts" for delete to keypilot_app
  using (
    id in (select "contactId" from public."open_house_visitors")
    or (
      "createdByUserId" is not null
      and "createdByUserId" = app.current_user_id()
    )
  );

create policy contacts_insert_manual
  on public."contacts" for insert to keypilot_app
  with check (
    "createdByUserId" is not null
    and "createdByUserId" = app.current_user_id()
  );

commit;

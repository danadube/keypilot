-- Allow agents to read/update/delete contacts assigned to them (manual / dashboard create),
-- in addition to the existing open_house_visitors path. Cascades to activities RLS via
-- contacts SELECT and keeps parity with lib/contacts/contact-access.ts.

begin;

drop policy if exists contacts_select_own on public."contacts";
drop policy if exists contacts_update_own on public."contacts";
drop policy if exists contacts_delete_own on public."contacts";

create policy contacts_select_own
  on public."contacts" for select to keypilot_app
  using (
    id in (
      select "contactId" from public."open_house_visitors"
    )
    or "assignedToUserId" = app.current_user_id()
  );

create policy contacts_update_own
  on public."contacts" for update to keypilot_app
  using (
    id in (
      select "contactId" from public."open_house_visitors"
    )
    or "assignedToUserId" = app.current_user_id()
  )
  with check (
    id in (
      select "contactId" from public."open_house_visitors"
    )
    or "assignedToUserId" = app.current_user_id()
  );

create policy contacts_delete_own
  on public."contacts" for delete to keypilot_app
  using (
    id in (
      select "contactId" from public."open_house_visitors"
    )
    or "assignedToUserId" = app.current_user_id()
  );

commit;

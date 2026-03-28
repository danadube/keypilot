-- supra_gmail_import_settings — keypilot_app grants + RLS (userId ownership)
--
-- Table is created by Prisma (`prisma/migrations/*_supra_gmail_import_settings/`).
-- Apply this after the table exists so authenticated routes can use withRLSContext.

begin;

grant select, insert, update, delete
  on public.supra_gmail_import_settings
  to keypilot_app;

alter table public.supra_gmail_import_settings enable row level security;

drop policy if exists supra_gmail_import_settings_select_own on public.supra_gmail_import_settings;
drop policy if exists supra_gmail_import_settings_insert_own on public.supra_gmail_import_settings;
drop policy if exists supra_gmail_import_settings_update_own on public.supra_gmail_import_settings;
drop policy if exists supra_gmail_import_settings_delete_own on public.supra_gmail_import_settings;

create policy supra_gmail_import_settings_select_own
  on public.supra_gmail_import_settings for select to keypilot_app
  using ("userId" = app.current_user_id());

create policy supra_gmail_import_settings_insert_own
  on public.supra_gmail_import_settings for insert to keypilot_app
  with check ("userId" = app.current_user_id());

create policy supra_gmail_import_settings_update_own
  on public.supra_gmail_import_settings for update to keypilot_app
  using ("userId" = app.current_user_id())
  with check ("userId" = app.current_user_id());

create policy supra_gmail_import_settings_delete_own
  on public.supra_gmail_import_settings for delete to keypilot_app
  using ("userId" = app.current_user_id());

commit;

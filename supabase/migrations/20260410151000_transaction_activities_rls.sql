-- Transaction activities — keypilot_app RLS (withRLSContext). Mirrors prisma/migrations/20260410150100_transaction_activities_rls_keypilot_app.

begin;

alter table public."transaction_activities" enable row level security;

drop policy if exists txn_activities_select_own on public."transaction_activities";
drop policy if exists txn_activities_insert_own on public."transaction_activities";
drop policy if exists txn_activities_update_own on public."transaction_activities";
drop policy if exists txn_activities_delete_own on public."transaction_activities";

create policy txn_activities_select_own
  on public."transaction_activities" for select to keypilot_app
  using (
    exists (
      select 1 from public."transactions" t
      where t.id = "transactionId"
      and t."userId" = app.current_user_id()
    )
  );

create policy txn_activities_insert_own
  on public."transaction_activities" for insert to keypilot_app
  with check (
    exists (
      select 1 from public."transactions" t
      where t.id = "transactionId"
      and t."userId" = app.current_user_id()
    )
    and "actorUserId" = app.current_user_id()
  );

-- Append-only under app role: no UPDATE/DELETE for keypilot_app

grant select, insert
  on public."transaction_activities"
  to keypilot_app;

commit;

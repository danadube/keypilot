-- Transactions lifecycle: soft-archive support.

begin;

alter table public."transactions"
  add column if not exists "deletedAt" timestamp(3);

create index if not exists "transactions_userId_deletedAt_idx"
  on public."transactions" ("userId", "deletedAt");

commit;

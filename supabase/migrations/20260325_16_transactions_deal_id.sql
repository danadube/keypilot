-- ═══════════════════════════════════════════════════════════════════════════
-- Transaction ↔ Deal v1 bridge — nullable dealId on transactions
-- ═══════════════════════════════════════════════════════════════════════════
-- Prisma: prisma/migrations/20260325130000_transaction_deal_link/
-- One transaction may reference one deal; each deal links to at most one transaction
-- (unique index on dealId; multiple NULLs allowed).
-- RLS: unchanged — transactions remain anchored on transactions.userId.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public."transactions" add column if not exists "dealId" text null;

alter table public."transactions" drop constraint if exists "transactions_dealId_fkey";

alter table public."transactions"
  add constraint "transactions_dealId_fkey"
  foreign key ("dealId") references public."deals"(id)
  on update cascade
  on delete set null;

create unique index if not exists "transactions_dealId_key" on public."transactions" ("dealId");

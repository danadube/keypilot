-- Extend transaction import sessions with brokerage/profile metadata.

begin;

alter table public."transaction_import_sessions"
  add column if not exists "detectedBrokerage" text,
  add column if not exists "selectedBrokerage" text,
  add column if not exists "parserProfile" text not null default 'generic',
  add column if not exists "parserProfileVersion" text not null default 'v1';

commit;

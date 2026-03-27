-- Optional CRM link: at most one transaction per deal (dealId unique, nullable).

ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "dealId" TEXT;

DO $migration$
BEGIN
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

CREATE UNIQUE INDEX IF NOT EXISTS "transactions_dealId_key" ON "transactions"("dealId");

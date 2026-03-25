-- Optional CRM link: at most one transaction per deal (dealId unique, nullable).
ALTER TABLE "transactions" ADD COLUMN "dealId" TEXT;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "transactions_dealId_key" ON "transactions"("dealId");

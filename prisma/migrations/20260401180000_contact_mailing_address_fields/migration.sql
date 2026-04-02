-- Optional mailing address on contacts (FarmTrackr CSV / Avery label exports).

ALTER TABLE "contacts" ADD COLUMN "mailingStreet1" TEXT;
ALTER TABLE "contacts" ADD COLUMN "mailingStreet2" TEXT;
ALTER TABLE "contacts" ADD COLUMN "mailingCity" TEXT;
ALTER TABLE "contacts" ADD COLUMN "mailingState" TEXT;
ALTER TABLE "contacts" ADD COLUMN "mailingZip" TEXT;

-- Site (property) address and alternate emails/phones for FarmTrackr / ClientKeep.

ALTER TABLE "contacts" ADD COLUMN "siteStreet1" TEXT;
ALTER TABLE "contacts" ADD COLUMN "siteStreet2" TEXT;
ALTER TABLE "contacts" ADD COLUMN "siteCity" TEXT;
ALTER TABLE "contacts" ADD COLUMN "siteState" TEXT;
ALTER TABLE "contacts" ADD COLUMN "siteZip" TEXT;
ALTER TABLE "contacts" ADD COLUMN "email2" TEXT;
ALTER TABLE "contacts" ADD COLUMN "email3" TEXT;
ALTER TABLE "contacts" ADD COLUMN "email4" TEXT;
ALTER TABLE "contacts" ADD COLUMN "phone2" TEXT;

CREATE INDEX "contacts_email2_idx" ON "contacts"("email2");
CREATE INDEX "contacts_phone2_idx" ON "contacts"("phone2");

-- AlterTable
ALTER TABLE "properties" ADD COLUMN "primaryLinkedContactId" TEXT;

-- CreateIndex
CREATE INDEX "properties_primaryLinkedContactId_idx" ON "properties"("primaryLinkedContactId");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_primaryLinkedContactId_fkey" FOREIGN KEY ("primaryLinkedContactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

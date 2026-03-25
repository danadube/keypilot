-- Supra end-of-showing: persist "that began" time for conservative auto-link to existing showings
ALTER TABLE "supra_queue_items" ADD COLUMN "parsedShowingBeganAt" TIMESTAMP(3);

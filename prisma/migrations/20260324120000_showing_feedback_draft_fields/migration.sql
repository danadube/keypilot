-- Buyer-agent feedback email draft fields (Supra apply v1; nullable until generated)

ALTER TABLE "showings" ADD COLUMN IF NOT EXISTS "feedbackDraftSubject" TEXT;
ALTER TABLE "showings" ADD COLUMN IF NOT EXISTS "feedbackDraftBody" TEXT;
ALTER TABLE "showings" ADD COLUMN IF NOT EXISTS "feedbackDraftGeneratedAt" TIMESTAMP(3);

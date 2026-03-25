-- Buyer-agent feedback email draft fields (Supra apply v1; nullable until generated)

ALTER TABLE "showings"
ADD COLUMN "feedbackDraftSubject" TEXT,
ADD COLUMN "feedbackDraftBody" TEXT,
ADD COLUMN "feedbackDraftGeneratedAt" TIMESTAMP(3);

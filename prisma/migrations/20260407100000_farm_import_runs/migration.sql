-- FarmTrackr import history (audit) — one row per apply attempt.

CREATE TYPE "FarmImportSourceType" AS ENUM ('CSV', 'XLSX');

CREATE TYPE "FarmImportRunStatus" AS ENUM ('COMPLETED', 'FAILED');

CREATE TABLE "farm_import_runs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "sourceType" "FarmImportSourceType" NOT NULL,
    "fileName" TEXT,
    "totalRows" INTEGER NOT NULL,
    "createdCount" INTEGER NOT NULL,
    "updatedCount" INTEGER NOT NULL,
    "skippedCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "FarmImportRunStatus" NOT NULL,
    "errorSummary" VARCHAR(500),

    CONSTRAINT "farm_import_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "farm_import_runs_userId_createdAt_idx" ON "farm_import_runs"("userId", "createdAt");

ALTER TABLE "farm_import_runs" ADD CONSTRAINT "farm_import_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS for keypilot_app (same pattern as farm_territories / farm_areas).
ALTER TABLE public."farm_import_runs" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS farm_import_runs_select_own ON public."farm_import_runs";
DROP POLICY IF EXISTS farm_import_runs_insert_own ON public."farm_import_runs";
DROP POLICY IF EXISTS farm_import_runs_update_own ON public."farm_import_runs";
DROP POLICY IF EXISTS farm_import_runs_delete_own ON public."farm_import_runs";

CREATE POLICY farm_import_runs_select_own
  ON public."farm_import_runs" FOR SELECT TO keypilot_app
  USING ("userId" = app.current_user_id());

CREATE POLICY farm_import_runs_insert_own
  ON public."farm_import_runs" FOR INSERT TO keypilot_app
  WITH CHECK ("userId" = app.current_user_id());

CREATE POLICY farm_import_runs_update_own
  ON public."farm_import_runs" FOR UPDATE TO keypilot_app
  USING ("userId" = app.current_user_id())
  WITH CHECK ("userId" = app.current_user_id());

CREATE POLICY farm_import_runs_delete_own
  ON public."farm_import_runs" FOR DELETE TO keypilot_app
  USING ("userId" = app.current_user_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public."farm_import_runs" TO keypilot_app;

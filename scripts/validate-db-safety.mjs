#!/usr/bin/env node
/**
 * Lightweight DB safety checks for diffs (CI + local).
 * See docs/platform/db-safety-validator.md
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");

const RE_ADDED_MIGRATION = /^prisma\/migrations\/[^/]+\/migration\.sql$/;
const RE_SUPABASE_SQL = /^supabase\/migrations\/.+\.sql$/;
const RE_CREATE_TABLE = /\bCREATE\s+TABLE\b/i;
const RE_ENABLE_RLS = /\bENABLE\s+ROW\s+LEVEL\s+SECURITY\b/i;
const RE_CREATE_POLICY = /\bCREATE\s+POLICY\b/i;
const RE_GRANT = /\bGRANT\s+/i;

const CRITICAL_PATH_PREFIXES = [
  "app/api/v1/showing-hq/",
  "components/showing-hq/",
  "app/api/v1/open-houses/",
];

/** @param {string} cmd */
function sh(cmd) {
  return execSync(cmd, {
    encoding: "utf8",
    cwd: REPO_ROOT,
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

/**
 * @returns {{ base: string, head: string, diffStrategy: string }}
 */
function resolveBaseHead() {
  const nullSha = /^0{40}$/;
  const envBaseRaw = (process.env.DB_SAFETY_BASE || process.env.BASE_SHA || "").trim();
  const envHeadRaw = (process.env.DB_SAFETY_HEAD || process.env.HEAD_SHA || "").trim();

  const head =
    envHeadRaw && !nullSha.test(envHeadRaw)
      ? envHeadRaw
      : sh("git rev-parse HEAD");
  const headSource =
    envHeadRaw && !nullSha.test(envHeadRaw)
      ? "HEAD_SHA or DB_SAFETY_HEAD"
      : "git rev-parse HEAD (no non-empty HEAD_SHA)";

  let base = envBaseRaw;
  /** @type {string} */
  let diffStrategy;

  if (base && !nullSha.test(base)) {
    diffStrategy = `env-provided SHA range (base from BASE_SHA/DB_SAFETY_BASE; head from ${headSource})`;
  } else {
    let mergeRef = "";
    base = "";
    for (const ref of ["origin/main", "origin/master", "main", "master"]) {
      try {
        base = sh(`git merge-base ${ref} HEAD`);
        mergeRef = ref;
        break;
      } catch {
        /* try next */
      }
    }
    if (envBaseRaw && nullSha.test(envBaseRaw)) {
      diffStrategy = `push fallback: zero BASE_SHA → merge-base with ${mergeRef} (typical new-branch push; compares merge-base..HEAD)`;
    } else if (envBaseRaw) {
      diffStrategy = `merge-base fallback: BASE_SHA unusable → merge-base with ${mergeRef}`;
    } else {
      diffStrategy = `merge-base fallback: no BASE_SHA in environment → merge-base with ${mergeRef}`;
    }
  }

  if (!base || nullSha.test(base)) {
    console.error(
      "DB safety: ERR — Could not resolve base commit. Set DB_SAFETY_BASE or BASE_SHA (e.g. github.event.pull_request.base.sha)."
    );
    process.exit(1);
  }
  return { base, head, diffStrategy };
}

/**
 * @param {string} base
 * @param {string} head
 * @param {string} filter --diff-filter=X
 */
function gitDiffNames(base, head, filter = "") {
  const flag = filter ? ` --diff-filter=${filter}` : "";
  try {
    const out = sh(`git diff${flag} --name-only ${base} ${head}`);
    return out ? out.split("\n").filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * @param {string} path
 */
function readRepoFile(path) {
  const full = join(REPO_ROOT, path);
  if (!existsSync(full)) return "";
  try {
    return readFileSync(full, "utf8");
  } catch {
    return "";
  }
}

function main() {
  const { base, head, diffStrategy } = resolveBaseHead();

  console.log("=== DB Safety Validator ===");
  console.log(`Base SHA:  ${base}`);
  console.log(`Head SHA:  ${head}`);
  console.log(`Diff strategy: ${diffStrategy}`);
  console.log("---");

  const changed = gitDiffNames(base, head, "");
  const added = gitDiffNames(base, head, "A");

  if (changed.length === 0) {
    console.log("No changed files in range — OK.");
    process.exit(0);
  }

  const schemaChanged = changed.includes("prisma/schema.prisma");
  const newMigrationSqlFiles = added.filter((f) => RE_ADDED_MIGRATION.test(f));

  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];

  if (schemaChanged && newMigrationSqlFiles.length === 0) {
    errors.push(
      "FAIL: prisma/schema.prisma changed but no new prisma/migrations/<name>/migration.sql was added in this diff.\n" +
        "   Fix: run `npx prisma migrate dev` (or create a migration) and commit the new migration folder."
    );
  }

  let aggregateNewSql = "";
  let hasCreateTable = false;
  for (const rel of newMigrationSqlFiles) {
    const text = readRepoFile(rel);
    aggregateNewSql += `\n${text}`;
    if (RE_CREATE_TABLE.test(text)) hasCreateTable = true;
  }

  if (hasCreateTable) {
    const missing = [];
    if (!RE_ENABLE_RLS.test(aggregateNewSql)) missing.push("ENABLE ROW LEVEL SECURITY");
    if (!RE_CREATE_POLICY.test(aggregateNewSql)) missing.push("CREATE POLICY");
    if (!RE_GRANT.test(aggregateNewSql)) missing.push("GRANT");
    if (missing.length > 0) {
      errors.push(
        "FAIL: New Prisma migration(s) contain CREATE TABLE but are missing runtime markers for keypilot_app:\n" +
          `   Missing (across all new migration.sql files in this diff): ${missing.join(", ")}\n` +
          "   Fix: In the same PR, add RLS + policies + GRANT on the new table(s). See docs/platform/database-migrations.md and docs/templates/prisma-rls-migration-template.sql"
      );
    }
  }

  if (newMigrationSqlFiles.length > 0 && !schemaChanged) {
    warnings.push(
      "WARN: New prisma/migrations/*/migration.sql was added, but prisma/schema.prisma did not change in this diff.\n" +
        "   Often intentional (RLS/GRANT-only migration or SQL-only fix). Confirm this migration belongs in the PR and that `prisma migrate deploy` matches your intent."
    );
  }

  const supabaseChanged = changed.some((f) => RE_SUPABASE_SQL.test(f));
  if (supabaseChanged && newMigrationSqlFiles.length === 0) {
    warnings.push(
      "WARN: supabase/migrations/*.sql changed but no new prisma/migrations/*/migration.sql was added.\n" +
        "   If this change affects runtime (RLS, GRANTs), duplicate it in a Prisma migration so `npx prisma migrate deploy` is sufficient."
    );
  }

  const dbTouched =
    schemaChanged ||
    changed.some((f) => f.startsWith("prisma/migrations/")) ||
    changed.some((f) => RE_SUPABASE_SQL.test(f));

  const criticalTouched = changed.some((f) =>
    CRITICAL_PATH_PREFIXES.some((p) => f.startsWith(p))
  );

  if (dbTouched && criticalTouched) {
    warnings.push(
      "WARN: DB-related changes also touched ShowingHQ / open-house critical surfaces (API or UI under showing-hq or open-houses).\n" +
        "   Action: verify graceful fallback on command-center flows — additive DB-backed sections should use try/catch + logged errors + safe empty state so a failing subquery does not take down the whole page (see docs/platform/database-migrations.md)."
    );
  }

  for (const w of warnings) {
    console.log("");
    console.log(w);
  }

  if (errors.length > 0) {
    console.log("");
    for (const e of errors) {
      console.error(e);
    }
    console.log("");
    console.error(`DB safety: ${errors.length} error(s) — exiting with code 1.`);
    process.exit(1);
  }

  if (warnings.length === 0) {
    console.log("No blocking issues. No warnings.");
  } else {
    console.log("");
    console.log(`DB safety: OK (${warnings.length} warning(s) — review above).`);
  }
  process.exit(0);
}

main();

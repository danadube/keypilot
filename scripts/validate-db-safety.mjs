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

function resolveBaseHead() {
  let base = process.env.DB_SAFETY_BASE || process.env.BASE_SHA;
  let head =
    process.env.DB_SAFETY_HEAD ||
    process.env.HEAD_SHA ||
    sh("git rev-parse HEAD");

  const nullSha = /^0{40}$/;
  if (!base || nullSha.test(base)) {
    for (const ref of ["origin/main", "origin/master", "main", "master"]) {
      try {
        base = sh(`git merge-base ${ref} HEAD`);
        break;
      } catch {
        /* try next */
      }
    }
  }
  if (!base || nullSha.test(base)) {
    console.error(
      "DB safety: ERR — Could not resolve base commit. Set DB_SAFETY_BASE or BASE_SHA (e.g. github.event.pull_request.base.sha)."
    );
    process.exit(1);
  }
  return { base, head };
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
  const { base, head } = resolveBaseHead();

  console.log("=== DB Safety Validator ===");
  console.log(`Compare: ${base.slice(0, 7)}..${head.slice(0, 7)}`);

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
      "WARN: Database-related paths and ShowingHQ / open-houses API or UI changed in the same diff.\n" +
        "   Double-check: preview deploy ran `prisma migrate deploy`; smoke-test ShowingHQ and open house workspace."
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

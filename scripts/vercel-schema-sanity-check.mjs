#!/usr/bin/env node
/**
 * Post-migrate verification for Vercel (and optional local use with a real DATABASE_URL).
 * Ensures critical TransactionHQ tables/columns exist so Prisma does not hit P2022 at runtime.
 *
 * Runs after `prisma migrate deploy` on Vercel — see scripts/vercel-prisma-migrate-deploy.mjs.
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { config as loadEnv } from "dotenv";

const __root = join(dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(join(__root, ".env.local"))) {
  loadEnv({ path: join(__root, ".env.local") });
}
loadEnv({ path: join(__root, ".env") });

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlFile = join(__dirname, "vercel-schema-sanity-check.sql");

function databaseUrlLooksReal() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
  if (!url.trim()) return false;
  if (/dummy|placeholder/i.test(url)) return false;
  // prisma.config fallback for generate-only environments
  if (url.includes("localhost:5432/dummy")) return false;
  return true;
}

function main() {
  const onVercel = process.env.VERCEL === "1";

  if (!databaseUrlLooksReal()) {
    if (onVercel) {
      console.error(
        "[schema-sanity] FATAL: DIRECT_URL or DATABASE_URL must be set to a real Postgres URL on Vercel."
      );
      process.exit(1);
    }
    console.log("[schema-sanity] Skip: no real DIRECT_URL / DATABASE_URL (local/CI placeholder).");
    process.exit(0);
  }

  console.log("[schema-sanity] Verifying TransactionHQ critical schema (SQL checks)…");
  const result = spawnSync(
    "npx",
    ["prisma", "db", "execute", "--schema", "prisma/schema.prisma", "--file", sqlFile],
    {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
      cwd: join(__dirname, ".."),
    }
  );
  const code = result.status ?? 1;
  if (code !== 0) {
    console.error(
      "[schema-sanity] Failed. Fix database drift (migrate against DIRECT_URL), then redeploy. " +
        "See docs/platform/database-migrations.md (schema sanity check)."
    );
  } else {
    console.log("[schema-sanity] OK — required TransactionHQ schema present.");
  }
  process.exit(code);
}

main();

#!/usr/bin/env node
/**
 * Run `prisma migrate deploy` only on Vercel builds so preview/production DBs
 * stay aligned with committed migrations. Skips elsewhere (local build, GitHub CI)
 * where DATABASE_URL may be a placeholder or migrate should not run.
 *
 * Vercel sets VERCEL=1 during build — see https://vercel.com/docs/projects/environment-variables/system-environment-variables
 */
import { spawnSync } from "node:child_process";

if (process.env.VERCEL === "1") {
  console.log("[build] Vercel: applying pending Prisma migrations (prisma migrate deploy)…");
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  process.exit(result.status ?? 1);
}

console.log("[build] Skipping prisma migrate deploy (not a Vercel build).");

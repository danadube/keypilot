#!/usr/bin/env node
/**
 * Prisma Safety Check
 *
 * Scans TypeScript source files for two classes of problem:
 *
 * ERROR (exits 1):
 *   Any file that imports { prisma } from "@/lib/db" or "./db".
 *   `prisma` is a deprecated alias for `prismaAdmin`. All files should
 *   use `prismaAdmin` explicitly. lib/db.ts itself is exempt.
 *
 * WARNING (exits 0 but prints):
 *   Route files that import getCurrentUser (auth-gated) AND prismaAdmin
 *   but do NOT import withRLSContext. These routes authenticate a user
 *   but bypass RLS for all DB queries — they are candidates for migration.
 *   This does not fail CI because some routes are intentionally BYPASSRLS
 *   (analytics/summary, auth/webhook, etc.).
 *
 * Usage:
 *   node scripts/check-prisma-usage.js
 *   npm run check:prisma
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SCAN_DIRS = ["app", "lib"];
const EXEMPT_FILES = [
  path.join(ROOT, "lib", "db.ts"), // exports both names — exempt
];

// ── File collection ───────────────────────────────────────────────────────────

function collectTsFiles(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];

  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(abs, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") return [];
      return collectTsFiles(path.relative(ROOT, fullPath));
    }
    return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")
      ? [fullPath]
      : [];
  });
}

const files = SCAN_DIRS.flatMap(collectTsFiles);

// ── Checks ────────────────────────────────────────────────────────────────────

const errors = [];
const warnings = [];

for (const file of files) {
  if (EXEMPT_FILES.includes(file)) continue;

  const rel = path.relative(ROOT, file);
  const content = fs.readFileSync(file, "utf8");

  // ERROR: deprecated `prisma` alias import
  if (
    /import\s*\{[^}]*\bprisma\b[^}]*\}\s*from\s*["'](?:@\/lib\/db|\.\/db|\.\.\/.*db)["']/.test(
      content
    )
  ) {
    // Exclude if it also contains 'prismaAdmin' in the same import (could be
    // destructuring both, which is unusual but not wrong)
    const importMatch = content.match(
      /import\s*\{([^}]*)\}\s*from\s*["'](?:@\/lib\/db|\.\/db|\.\.\/.*db)["']/g
    );
    if (importMatch) {
      for (const imp of importMatch) {
        if (/\bprisma\b/.test(imp) && !/\bprismaAdmin\b/.test(imp)) {
          errors.push(
            `  ${rel}\n    ↳ imports deprecated { prisma } — replace with { prismaAdmin }`
          );
        }
      }
    }
  }

  // WARNING: auth-gated route using prismaAdmin without withRLSContext
  const isRoute = file.includes(`${path.sep}api${path.sep}`) && file.endsWith("route.ts");
  if (isRoute) {
    const hasAuth = content.includes("getCurrentUser");
    const hasPrismaAdmin = content.includes("prismaAdmin");
    const hasRLS = content.includes("withRLSContext");

    if (hasAuth && hasPrismaAdmin && !hasRLS) {
      warnings.push(
        `  ${rel}\n    ↳ uses getCurrentUser + prismaAdmin but no withRLSContext — review for RLS migration`
      );
    }
  }
}

// ── Output ────────────────────────────────────────────────────────────────────

let exitCode = 0;

if (errors.length) {
  console.error(`\n❌ Prisma safety check — ${errors.length} error(s):\n`);
  errors.forEach((e) => console.error(e));
  exitCode = 1;
}

if (warnings.length) {
  console.warn(
    `\n⚠️  Prisma safety check — ${warnings.length} route(s) using BYPASSRLS without withRLSContext:\n`
  );
  warnings.forEach((w) => console.warn(w));
  console.warn(
    "\n   These may be intentional (public routes, analytics, auth webhooks)."
  );
  console.warn(
    "   Review each and migrate to withRLSContext if it handles user-scoped data.\n"
  );
}

if (!errors.length && !warnings.length) {
  console.log("✅ Prisma usage safe — no deprecated imports, no unguarded auth routes");
}

if (errors.length === 0 && warnings.length > 0) {
  console.log("✅ No errors (warnings are advisory — see above)");
}

process.exit(exitCode);

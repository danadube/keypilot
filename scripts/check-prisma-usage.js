#!/usr/bin/env node
/**
 * Prisma Safety Check
 *
 * Scans TypeScript source files for three classes of problem:
 *
 * ERROR (exits 1) — deprecated `prisma` alias import:
 *   Any file that imports { prisma } from "@/lib/db" or "./db".
 *   `prisma` is a deprecated alias for `prismaAdmin`. lib/db.ts is exempt.
 *
 * ERROR (exits 1) — unapproved BYPASSRLS route:
 *   A route inside /app/api/ that calls getCurrentUser (auth-gated) AND uses
 *   prismaAdmin but does NOT use withRLSContext, AND is NOT on the allowlist
 *   below. Every authenticated route must either use withRLSContext or be
 *   explicitly listed here as intentionally BYPASSRLS or pending migration.
 *
 * INFO (exits 0) — acknowledged allowlist routes:
 *   Routes on the allowlist are printed as a reminder but do not fail CI.
 *   "intentional" routes are permanently BYPASSRLS by design.
 *   "pendingMigration" routes are not yet migrated and are acknowledged debt.
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

// ── BYPASSRLS Allowlist ───────────────────────────────────────────────────────
//
// Routes that are authenticated (call getCurrentUser) but intentionally use
// prismaAdmin without withRLSContext. Every entry must have a reason comment.
//
// intentional: permanently BYPASSRLS by design — do not migrate these.
// pendingMigration: not yet migrated — acknowledged debt, not a new violation.
//
// When you migrate a route to withRLSContext, REMOVE it from this list.
// Any NEW authenticated route not on this list that uses prismaAdmin will FAIL.

const BYPASSRLS_ALLOWLIST = {
  intentional: new Set([
    // Cross-user aggregation — counts all users' events, must bypass RLS
    "app/api/v1/analytics/summary/route.ts",
    // OAuth callback — exchanges auth code, runs before user session is set
    "app/api/v1/auth/google/callback/route.ts",
  ]),

  pendingMigration: new Set([
    // ── AI ─────────────────────────────────────────────────────────────────
    "app/api/v1/ai/home-briefing/route.ts",
    // ── Contacts ───────────────────────────────────────────────────────────
    "app/api/v1/contacts/[id]/route.ts",
    "app/api/v1/contacts/route.ts",
    // ── Farm ───────────────────────────────────────────────────────────────
    "app/api/v1/farm-areas/[id]/route.ts",
    "app/api/v1/farm-areas/[id]/members/bulk/route.ts",
    "app/api/v1/farm-areas/[id]/members/route.ts",
    "app/api/v1/farm-areas/route.ts",
    "app/api/v1/farm/performance-health/route.ts",
    "app/api/v1/farm-imports/apply/route.ts",
    "app/api/v1/farm-imports/preview/route.ts",
    "app/api/v1/farm-territories/[id]/route.ts",
    "app/api/v1/farm-territories/route.ts",
    // ── Dashboard ──────────────────────────────────────────────────────────
    "app/api/v1/dashboard/stats/route.ts",
    // ── Follow-up drafts ───────────────────────────────────────────────────
    "app/api/v1/follow-up-drafts/[id]/route.ts",
    "app/api/v1/follow-up-drafts/[id]/send/route.ts",
    "app/api/v1/follow-up-drafts/[id]/status/route.ts",
    // ── Open houses ────────────────────────────────────────────────────────
    "app/api/v1/open-houses/[id]/flyer/route.ts",
    "app/api/v1/open-houses/[id]/follow-ups/generate/route.ts",
    "app/api/v1/open-houses/[id]/follow-ups/route.ts",
    "app/api/v1/open-houses/[id]/regenerate-qr/route.ts",
    "app/api/v1/open-houses/[id]/report/route.ts",
    "app/api/v1/open-houses/[id]/route.ts",
    "app/api/v1/open-houses/[id]/visitors/route.ts",
    "app/api/v1/open-houses/route.ts",
    // ── Properties ─────────────────────────────────────────────────────────
    "app/api/v1/properties/[id]/flyer/route.ts",
    "app/api/v1/properties/[id]/photo/route.ts",
    "app/api/v1/properties/[id]/primary-contact/route.ts",
    "app/api/v1/properties/[id]/route.ts",
    "app/api/v1/properties/route.ts",
    // ── ShowingHQ ──────────────────────────────────────────────────────────
    "app/api/v1/showing-hq/dashboard/route.ts",
    "app/api/v1/showing-hq/feedback-requests/route.ts",
    "app/api/v1/showing-hq/follow-ups/route.ts",
    "app/api/v1/showing-hq/properties/[propertyId]/feedback-summary/route.ts",
    "app/api/v1/showing-hq/properties/[propertyId]/seller-report/route.ts",
    "app/api/v1/showing-hq/properties/suggest/route.ts",
    "app/api/v1/showing-hq/showings/[id]/route.ts",
    "app/api/v1/showing-hq/showings/route.ts",
    "app/api/v1/showing-hq/showings/suggest/route.ts",
    "app/api/v1/showing-hq/supra-queue/[id]/apply/route.ts",
    "app/api/v1/showing-hq/supra-queue/[id]/parse-debug/route.ts",
    "app/api/v1/showing-hq/supra-queue/[id]/parse-draft/route.ts",
    "app/api/v1/showing-hq/supra-queue/[id]/route.ts",
    "app/api/v1/showing-hq/supra-queue/clear/route.ts",
    "app/api/v1/showing-hq/supra-queue/import-gmail/route.ts",
    "app/api/v1/showing-hq/supra-queue/manual-paste/route.ts",
    "app/api/v1/showing-hq/supra-queue/route.ts",
    "app/api/v1/showing-hq/visitors/[visitorId]/resend-flyer/route.ts",
    "app/api/v1/showing-hq/visitors/[visitorId]/route.ts",
    "app/api/v1/showing-hq/visitors/route.ts",
  ]),
};

// Normalize to forward slashes for cross-platform Set lookups
function normalizeRel(rel) {
  return rel.split(path.sep).join("/");
}

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
const allowlistHits = { intentional: [], pendingMigration: [] };

for (const file of files) {
  if (EXEMPT_FILES.includes(file)) continue;

  const rel = path.relative(ROOT, file);
  const relNorm = normalizeRel(rel);
  const content = fs.readFileSync(file, "utf8");

  // ── Check 1: deprecated `prisma` alias import ─────────────────────────────
  if (
    /import\s*\{[^}]*\bprisma\b[^}]*\}\s*from\s*["'](?:@\/lib\/db|\.\/db|\.\.\/.*db)["']/.test(
      content
    )
  ) {
    const importMatch = content.match(
      /import\s*\{([^}]*)\}\s*from\s*["'](?:@\/lib\/db|\.\/db|\.\.\/.*db)["']/g
    );
    if (importMatch) {
      for (const imp of importMatch) {
        if (/\bprisma\b/.test(imp) && !/\bprismaAdmin\b/.test(imp)) {
          errors.push({
            type: "deprecated-import",
            file: rel,
            message: "imports deprecated { prisma } — replace with { prismaAdmin }",
          });
        }
      }
    }
  }

  // ── Check 2: authenticated route using prismaAdmin without withRLSContext ──
  const isRoute =
    file.includes(`${path.sep}api${path.sep}`) && file.endsWith("route.ts");
  if (isRoute) {
    const hasAuth =
      content.includes("getCurrentUser") ||
      content.includes("auth(") ||
      content.includes("currentUser");
    const hasPrismaAdmin = content.includes("prismaAdmin");
    const hasRLS = content.includes("withRLSContext");

    if (hasAuth && hasPrismaAdmin && !hasRLS) {
      if (BYPASSRLS_ALLOWLIST.intentional.has(relNorm)) {
        allowlistHits.intentional.push(rel);
      } else if (BYPASSRLS_ALLOWLIST.pendingMigration.has(relNorm)) {
        allowlistHits.pendingMigration.push(rel);
      } else {
        // Not on any allowlist — hard failure
        errors.push({
          type: "unapproved-bypassrls",
          file: rel,
          message:
            "authenticated route uses prismaAdmin without withRLSContext — " +
            "add withRLSContext or add to BYPASSRLS_ALLOWLIST in scripts/check-prisma-usage.js",
        });
      }
    }
  }
}

// ── Output ────────────────────────────────────────────────────────────────────

let exitCode = 0;

// Group errors by type for readable output
const deprecatedImportErrors = errors.filter((e) => e.type === "deprecated-import");
const unapprovedBypassErrors = errors.filter((e) => e.type === "unapproved-bypassrls");

if (deprecatedImportErrors.length) {
  console.error(
    `\n❌ Prisma safety check — ${deprecatedImportErrors.length} deprecated import(s):\n`
  );
  deprecatedImportErrors.forEach((e) =>
    console.error(`  ${e.file}\n    ↳ ${e.message}`)
  );
  exitCode = 1;
}

if (unapprovedBypassErrors.length) {
  console.error(
    `\n❌ Prisma safety check — ${unapprovedBypassErrors.length} unapproved BYPASSRLS route(s):\n`
  );
  unapprovedBypassErrors.forEach((e) =>
    console.error(`  ${e.file}\n    ↳ ${e.message}`)
  );
  console.error(
    "\n   Fix: wrap DB queries in withRLSContext, OR add the route to\n" +
    "   BYPASSRLS_ALLOWLIST in scripts/check-prisma-usage.js with a reason.\n"
  );
  exitCode = 1;
}

if (allowlistHits.intentional.length) {
  console.log(
    `\nℹ️  Intentionally BYPASSRLS (${allowlistHits.intentional.length} route(s)) — by design, do not migrate:\n`
  );
  allowlistHits.intentional.forEach((f) => console.log(`  ${f}`));
}

if (allowlistHits.pendingMigration.length) {
  console.log(
    `\nℹ️  Pending RLS migration (${allowlistHits.pendingMigration.length} route(s)) — acknowledged debt:\n`
  );
  allowlistHits.pendingMigration.forEach((f) => console.log(`  ${f}`));
  console.log(
    "\n   Migrate these to withRLSContext and remove from the allowlist when done.\n"
  );
}

if (errors.length === 0) {
  console.log(
    "\n✅ Prisma safety check passed — no deprecated imports, no unapproved BYPASSRLS routes\n"
  );
}

process.exit(exitCode);

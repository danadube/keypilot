#!/usr/bin/env node
/**
 * Run prisma db push using DIRECT_URL to avoid PgBouncer "prepared statement" errors.
 * Use this if `npm run db:push` fails with that error.
 * Requires: DIRECT_URL in .env or .env.local (Session mode, port 5432)
 */
require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.local" });

const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  console.error("Error: DIRECT_URL is not set in .env or .env.local");
  console.error("Get it from Supabase → Settings → Database → Session mode (port 5432)");
  process.exit(1);
}

process.env.DATABASE_URL = directUrl;
const { execSync } = require("child_process");
execSync("npx prisma db push", { stdio: "inherit" });
